/**
 * Chat Projector — session-level BFF that consumes raw ellamaka events
 * and projects a normalized chat view (messages + status) for the frontend.
 *
 * Each projector instance is bound to one ellamaka session and maintains:
 * - `messages`: assistant text visible to the student (no reasoning, no tool details)
 * - `status`: human-readable agent status string
 * - Internal part state for correct delta accumulation
 *
 * The projector exposes a snapshot of current state and emits normalized
 * SSE events that the frontend subscribes to.
 */

import { logger } from "../utils/logger";
import type { EllamakaClient, StreamEvent } from "./ellamaka-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectedMessage {
  id: string;
  role: "assistant" | "student";
  text: string;
}

export interface ChatSnapshot {
  messages: ProjectedMessage[];
  status: string;
}

export type NormalizedEvent =
  | { type: "status"; status: string | null }
  | { type: "message_delta"; message_id: string; text: string }
  | { type: "student_echo"; message_id: string; text: string };

type EventListener = (event: NormalizedEvent) => void;

// ---------------------------------------------------------------------------
// Internal: status mapping
// ---------------------------------------------------------------------------

function mapAgentStatus(event: StreamEvent): string | null | undefined {
  if (event.partType === "reasoning") return undefined;
  if (event.partType === "step-start") return "AI 正在思考...";
  if (event.partType === "step-finish") return null;
  if (event.partType !== "tool") return undefined;
  if (event.toolStatus === "completed" || event.toolStatus === "error") return null;
  if (event.toolStatus !== "pending" && event.toolStatus !== "running") return undefined;
  if (event.tool === "get_question_candidates") return "AI 正在挑选题目...";
  if (event.tool === "select_next_question") return "AI 正在锁定下一题...";
  if (event.tool === "update_evaluation") return "AI 正在整理测评结果...";
  return "AI 正在处理中...";
}

// ---------------------------------------------------------------------------
// ChatProjector
// ---------------------------------------------------------------------------

export class ChatProjector {
  private assessmentSessionId: string;
  private ellamakaSessionId: string;
  private readonly client: EllamakaClient;

  /** Projected state */
  private messages: ProjectedMessage[] = [];
  private status = "";

  /** Part-level text accumulation — partID → full text */
  private readonly partTexts = new Map<string, string>();
  /** Track partID → messageID mapping for reassembly */
  private readonly partMessageMap = new Map<string, string>();
  /** Track messageID → role from message.updated events */
  private readonly messageRoles = new Map<string, string>();

  /** Listeners for normalized events */
  private readonly listeners = new Set<EventListener>();

  /** Abort controller for the background ellamaka stream consumer */
  private abortController: AbortController | null = null;
  private started = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    assessmentSessionId: string,
    ellamakaSessionId: string,
    client: EllamakaClient,
  ) {
    this.assessmentSessionId = assessmentSessionId;
    this.ellamakaSessionId = ellamakaSessionId;
    this.client = client;
  }

  // ----- Public API -----

  /** Start consuming ellamaka events in the background */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.runConsumer();
  }

  /** Stop the projector and clean up resources */
  stop(): void {
    this.started = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.listeners.clear();
    logger.debug(
      { assessment_session_id: this.assessmentSessionId },
      "Chat projector stopped",
    );
  }

  /** Get current projected state as a snapshot */
  getSnapshot(): ChatSnapshot {
    return {
      messages: this.messages.map((m) => ({ ...m })),
      status: this.status,
    };
  }

  getEllamakaSessionId(): string {
    return this.ellamakaSessionId;
  }

  /** Register a listener for normalized events. Returns unsubscribe fn */
  addListener(fn: EventListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Push a student message into the projected state */
  addStudentMessage(text: string, id?: string): void {
    const msgId = id ?? `student-${Date.now()}`;
    this.messages.push({ id: msgId, role: "student", text });
    this.emit({ type: "student_echo", message_id: msgId, text });
  }

  // ----- Private: event consumption -----

  private emit(event: NormalizedEvent): void {
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch {
        // listener error — skip
      }
    }
  }

  private runConsumer(): void {
    if (!this.started) return;
    this.abortController = new AbortController();

    (async () => {
      try {
        for await (const event of this.client.streamEvents(
          this.ellamakaSessionId,
          this.abortController!.signal,
        )) {
          this.processEvent(event);
        }
      } catch (err) {
        if (!this.started) return;
        logger.warn(
          { err, assessment_session_id: this.assessmentSessionId },
          "Projector consumer error, reconnecting",
        );
      }

      // Generator ended — schedule reconnect if still started
      if (this.started) {
        this.restartTimer = setTimeout(() => this.runConsumer(), 3000);
      }
    })();
  }

  private processEvent(event: StreamEvent): void {
    // 1. Status mapping
    const statusResult = mapAgentStatus(event);
    if (statusResult !== undefined) {
      const newStatus = statusResult ?? "";
      if (newStatus !== this.status) {
        this.status = newStatus;
        this.emit({ type: "status", status: statusResult });
      }
    }

    // 2. Track message roles from message.updated events
    if (event.type === "message.updated" && event.role && event.messageID) {
      this.messageRoles.set(event.messageID, event.role);
      return;
    }

    const partID = event.partID ?? "";
    const messageID = event.messageID ?? "";
    const messageRole = this.messageRoles.get(messageID);

    // 3. Authoritative visibility filter:
    // - assistant messages only
    // - text parts only
    // - skip synthetic/ignored parts and all user/system messages
    const isVisibleAssistantText =
      event.type === "message.part.updated" &&
      event.partType === "text" &&
      !!event.text &&
      messageRole === "assistant" &&
      !event.synthetic &&
      !event.ignored;

    if (!isVisibleAssistantText || !partID || !messageID) {
      return;
    }

    this.partMessageMap.set(partID, messageID);
    this.partTexts.set(partID, event.text ?? "");

    this.ensureMessage(messageID);
    this.updateMessageText(messageID);

    const msg = this.messages.find((m) => m.id === messageID);
    this.emit({ type: "message_delta", message_id: messageID, text: msg?.text ?? "" });
  }

  /** Ensure a projected message entry exists for the given messageID */
  private ensureMessage(messageID: string): void {
    if (!messageID) return;
    if (!this.messages.find((m) => m.id === messageID)) {
      this.messages.push({ id: messageID, role: "assistant", text: "" });
    }
  }

  /** Recompute the full text of a projected message from all its parts (in order) */
  private updateMessageText(messageID: string): void {
    const msg = this.messages.find((m) => m.id === messageID);
    if (!msg) return;

    // Collect all part texts belonging to this message, preserving order
    const partsForMessage: string[] = [];
    for (const [pid, mid] of this.partMessageMap) {
      if (mid === messageID) {
        const txt = this.partTexts.get(pid);
        if (txt) partsForMessage.push(txt);
      }
    }
    msg.text = partsForMessage.join("");
  }
}

// ---------------------------------------------------------------------------
// ChatProjectorStore — singleton managing all active projectors
// ---------------------------------------------------------------------------

export class ChatProjectorStore {
  private readonly projectors = new Map<string, ChatProjector>();
  private readonly client: EllamakaClient;

  constructor(client: EllamakaClient) {
    this.client = client;
  }

  /**
   * Get existing projector or create a new one for the given session.
   * If creating, starts consuming events immediately.
   */
  getOrCreate(
    assessmentSessionId: string,
    ellamakaSessionId: string,
  ): ChatProjector {
    const existing = this.projectors.get(assessmentSessionId);
    if (existing) {
      if (existing.getEllamakaSessionId() === ellamakaSessionId) {
        return existing;
      }
      // Ellamaka session changed (e.g., resume) — destroy old projector
      existing.stop();
      this.projectors.delete(assessmentSessionId);
      logger.info(
        { assessment_session_id: assessmentSessionId, old_ellamaka_session_id: existing.getEllamakaSessionId(), new_ellamaka_session_id: ellamakaSessionId },
        "Chat projector destroyed (ellamaka session changed)",
      );
    }

    const projector = new ChatProjector(
      assessmentSessionId,
      ellamakaSessionId,
      this.client,
    );
    this.projectors.set(assessmentSessionId, projector);
    projector.start();

    logger.info(
      { assessment_session_id: assessmentSessionId, ellamaka_session_id: ellamakaSessionId },
      "Chat projector created and started",
    );
    return projector;
  }

  /** Get existing projector (without creating) */
  get(assessmentSessionId: string): ChatProjector | undefined {
    return this.projectors.get(assessmentSessionId);
  }

  /** Destroy projector for a session */
  destroy(assessmentSessionId: string): void {
    const projector = this.projectors.get(assessmentSessionId);
    if (projector) {
      projector.stop();
      this.projectors.delete(assessmentSessionId);
    }
  }
}

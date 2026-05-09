import { logger } from "../utils/logger";

const DEFAULT_ELLAMAKA_URL = "http://localhost:4141";
const ELLAMAKA_DIRECTORY = process.env.ELLAMAKA_DIRECTORY || "default";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface StreamEvent {
  sessionID: string;
  type?: string; // "message.part.delta", "message.part.updated", etc.
  messageID?: string;
  partID?: string;
  partType?: string;
  field?: string; // "text", "tool_call", etc.
  tool?: string;
  toolStatus?: string;
  toolTitle?: string;
  delta?: string;
  text?: string;
  role?: string; // "user" | "assistant" — from message.updated events
  synthetic?: boolean;
  ignored?: boolean;
  [key: string]: unknown;
}

export class EllamakaClient {
  private baseUrl: string;
  private directory: string;

  constructor(baseUrl: string = DEFAULT_ELLAMAKA_URL, directory: string = ELLAMAKA_DIRECTORY) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.directory = directory;
  }

  /**
   * Create a new session with specified agent
   * POST /session?directory={dir}
   */
  async createSession(title: string, agent: string = "assessor"): Promise<{ id: string }> {
    const url = `${this.baseUrl}/session?directory=${encodeURIComponent(this.directory)}`;
    const res = await this.fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, agent }),
    });
    const data = await res.json();
    logger.info({ ellamaka_session_id: data.id, title, agent }, "Ellamaka session created");
    return { id: data.id };
  }

  /**
   * Send async prompt to session with optional system prompt override
   * POST /session/{sessionId}/prompt_async?directory={dir}
   * Returns 204 No Content (fire and forget)
   */
  async promptAsync(
    sessionId: string,
    parts: Array<{ type: "text"; text: string }>,
    system?: string
  ): Promise<void> {
    const url = `${this.baseUrl}/session/${sessionId}/prompt_async?directory=${encodeURIComponent(this.directory)}`;
    const body: Record<string, unknown> = { parts };
    if (system) body.system = system;
    await this.fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    logger.debug({ ellamaka_session_id: sessionId }, "Prompt sent to ellamaka session");
  }

  /**
   * Stream SSE events from /global/event, filtered by directory + sessionId
   *
   * Uses /global/event (NOT /event?directory=) because the instance-level
   * /event route uses Bus.subscribeAll via runSync which creates an isolated
   * Bus runtime with its own PubSub — events published by session processing
   * never reach this subscriber.
   *
   * /global/event returns events wrapped as:
   *   { directory, project?, workspace?, payload: { type, properties: { sessionID, ... } } }
   *
   * @param sessionId - ellamaka session ID to filter events
   * @param signal - optional AbortSignal to cancel the stream (e.g., client disconnect)
   */
  async *streamEvents(sessionId: string, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    const url = `${this.baseUrl}/global/event`;
    const partInfoById = new Map<string, Pick<StreamEvent, "partType" | "tool" | "toolStatus" | "toolTitle" | "synthetic" | "ignored">>();
    logger.debug({ ellamaka_url: url, session_id: sessionId, directory: this.directory }, "Connecting to ellamaka global event stream");
    const res = await fetch(url, {
      headers: { Accept: "text/event-stream" },
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Failed to connect to ellamaka global event stream: ${res.status}`);
    }

    logger.debug({ status: res.status, content_type: res.headers.get("content-type") }, "SSE response received");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lineCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        lineCount++;
        if (lineCount <= 5 && line.trim()) {
          logger.debug({ line, count: lineCount }, "SSE raw line");
        }
        if (line.startsWith("data: ")) {
          try {
            const wrapper = JSON.parse(line.slice(6));
            // Skip events from other directories
            if (wrapper.directory !== this.directory) continue;
            const event = wrapper.payload;
            if (!event) continue;
            // Skip sync and heartbeat events
            if (event.type === "sync" || event.type === "server.heartbeat" || event.type === "server.connected") continue;
            const props = event.properties;
            if (!props) continue;
            // Filter by session
            if (props.sessionID !== sessionId) continue;
            if (event.type === "message.part.removed" && props.partID) {
              partInfoById.delete(props.partID);
              continue;
            }
            const part = props.part as
              | {
                  id?: string;
                  messageID?: string;
                  type?: string;
                  text?: string;
                  synthetic?: boolean;
                  ignored?: boolean;
                  tool?: string;
                  state?: { status?: string; title?: string };
                }
              | undefined;
            if (part?.id) {
              partInfoById.set(part.id, {
                partType: part.type,
                synthetic: part.synthetic,
                ignored: part.ignored,
                tool: part.tool,
                toolStatus: part.state?.status,
                toolTitle: part.state?.title,
              });
            }
            const cached = props.partID ? partInfoById.get(props.partID) : undefined;
            const partType = part?.type ?? cached?.partType;
            // Delta events are noisy (100s/sec for reasoning) — demote to trace.
            // Structured events (part.updated, message.updated, session.status) stay at debug.
            if (event.type === "message.part.delta") {
              logger.trace(
                { event_type: event.type, event_field: props.field, event_part_type: partType, filter_session: sessionId },
                "SSE delta",
              );
            } else {
              logger.debug(
                { event_type: event.type, event_field: props.field, event_part_type: partType, filter_session: sessionId },
                "SSE event matched",
              );
            }
            // Flatten to StreamEvent shape
            // OpenCode message.updated uses properties.info, not properties.message.
            const info = props.info as { id?: string; role?: string } | undefined;
            yield {
              sessionID: props.sessionID,
              type: event.type,
              messageID: props.messageID ?? part?.messageID ?? info?.id,
              partID: props.partID ?? part?.id,
              partType: part?.type ?? cached?.partType,
              field: props.field,
              tool: part?.tool ?? cached?.tool,
              toolStatus: part?.state?.status ?? cached?.toolStatus,
              toolTitle: part?.state?.title ?? cached?.toolTitle,
              delta: props.delta,
              text: props.text ?? part?.text,
              role: info?.role,
              synthetic: part?.synthetic ?? cached?.synthetic,
              ignored: part?.ignored ?? cached?.ignored,
            };
          } catch {
            /* skip malformed lines */
          }
        }
      }
    }
    logger.debug({ total_lines: lineCount }, "SSE stream ended");
  }

  /**
   * Fetch with exponential backoff retry
   * 3 retries with delays: 1000ms, 2000ms, 4000ms
   */
  private async fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, options);
        if (res.ok || attempt === retries) return res;
        logger.warn({ url, status: res.status, attempt }, "Ellamaka request failed, retrying");
      } catch (err) {
        if (attempt === retries) throw err;
        logger.warn({ url, attempt, err }, "Ellamaka request error, retrying");
      }
      // Exponential backoff: 1000ms, 2000ms, 4000ms
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
    }
    throw new Error(`Ellamaka request failed after ${retries} retries`);
  }
}

/**
 * Factory function to create EllamakaClient instance
 */
export function createEllamakaClient(): EllamakaClient {
  const baseUrl = process.env.ELLAMAKA_URL || DEFAULT_ELLAMAKA_URL;
  const directory = process.env.ELLAMAKA_DIRECTORY || "default";
  return new EllamakaClient(baseUrl, directory);
}

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
  field?: string; // "text", "tool_call", etc.
  delta?: string;
  text?: string;
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
   * Stream SSE events filtered by sessionId
   * GET /event?directory={dir}
   */
  async *streamEvents(sessionId: string): AsyncGenerator<StreamEvent> {
    const url = `${this.baseUrl}/event?directory=${encodeURIComponent(this.directory)}`;
    const res = await fetch(url, {
      headers: { Accept: "text/event-stream" },
      signal: AbortSignal.timeout(120_000), // 2min timeout, per RESEARCH §1.2
    });

    if (!res.ok || !res.body) {
      throw new Error(`Failed to connect to ellamaka event stream: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6));
            // Filter: only forward events for this session
            if (event.sessionID === sessionId) {
              yield event;
            }
          } catch {
            /* skip malformed events */
          }
        }
      }
    }
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
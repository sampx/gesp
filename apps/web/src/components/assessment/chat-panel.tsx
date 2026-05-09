"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, X, Send, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { useAssessmentChat } from "@/components/assessment/chat-panel-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectedMessage {
  id: string;
  role: "assistant" | "student";
  text: string;
}

interface ChatSnapshot {
  messages: ProjectedMessage[];
  status: string;
}

type NormalizedEvent =
  | { type: "snapshot"; messages: ProjectedMessage[]; status: string }
  | { type: "status"; status: string | null }
  | { type: "message_delta"; message_id: string; text: string }
  | { type: "student_echo"; message_id: string; text: string };

interface ChatMessage {
  id: string;
  role: "assistant" | "student";
  text: string;
}

interface ChatPanelProps {
  token: string;
}

async function fetchChatState(token: string): Promise<ChatSnapshot | null> {
  try {
    const res = await fetch(`/api/assessment/${token}/chat-state`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

async function sendChatMessage(token: string, text: string, messageId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/assessment/${token}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, message_id: messageId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatPanel({ token }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusText, setStatusText] = useState<string>("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const openRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use shared context for open/unread state (controlled by navbar toggle)
  const chat = useAssessmentChat();
  const open = chat.open;

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Initial snapshot fetch + SSE subscription
  useEffect(() => {
    if (!token) return;

    let es: EventSource | null = null;

    (async () => {
      // 1. Fetch initial snapshot
      const snapshot = await fetchChatState(token);
        if (snapshot) {
          setMessages(
            snapshot.messages.map((m) => ({
              id: m.id,
              role: m.role,
              text: m.text,
            })),
          );
        setStatusText(snapshot.status);
        setLoading(false);
      }

      // 2. Subscribe to normalized stream
      es = new EventSource(`/api/assessment/${token}/stream`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NormalizedEvent;

          if (data.type === "snapshot") {
            // Initial snapshot from SSE (may be redundant with fetchChatState)
            setMessages(
              data.messages.map((m) => ({
                id: m.id,
                role: m.role,
                text: m.text,
              })),
            );
            setStatusText(data.status);
            setLoading(false);
            return;
          }

          if (data.type === "status") {
            setStatusText(data.status ?? "");
            return;
          }

          if (data.type === "message_delta") {
            setStatusText("");
              const { message_id, text } = data;
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === message_id);
                if (idx >= 0) {
                  // Replace — the projector sends complete text each time.
                  // This makes duplicate events harmless (idempotent).
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], text };
                  return updated;
                }
                // New message
                return [...prev, { id: message_id, role: "assistant", text }];
              });
            if (!openRef.current) chat.incrementUnread();
            return;
          }

          if (data.type === "student_echo") {
            // Echo of student message (already added locally)
            // Ignore — we add student messages immediately on send
            return;
          }
        } catch {
          /* ignore malformed SSE data */
        }
      };

      es.onerror = () => {
        /* EventSource auto-reconnects */
      };
    })();

    return () => {
      if (es) es.close();
    };
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, statusText]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Generate shared ID so frontend & backend use the same message identity.
    // This prevents duplication when the snapshot includes this message later.
    const studentId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages((prev) => [...prev, { id: studentId, role: "student", text }]);
    setInput("");
    setSending(true);

    await sendChatMessage(token, text, studentId);
    setSending(false);
  }, [input, sending, token]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <>
      {/* Chat panel overlay — right side */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-background border-l z-40 flex min-h-0 flex-col shadow-xl">
          <div className="h-14 flex items-center justify-between px-4 border-b shrink-0">
            <span className="font-semibold text-sm">AI 测评顾问</span>
            <Button variant="ghost" size="icon" onClick={() => chat.setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4">
              {loading && messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  加载中...
                </p>
              )}
              {!loading && messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  AI 顾问会在这里给你鼓励和提示哦~
                </p>
              )}
              {messages.map((msg, i) => {
                const isStudent = msg.role === "student";
                return (
                  <div
                    key={msg.id || i}
                    className={`flex gap-2 ${isStudent ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div className={`shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center text-xs ${
                      isStudent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/15 text-muted-foreground"
                    }`}>
                      {isStudent ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>
                    {/* Bubble */}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isStudent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted [&_p]:my-0.5 [&_ul]:pl-3 [&_ol]:pl-3 [&_code]:bg-muted-foreground/15 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted-foreground/10 [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-xs [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/20 [&_blockquote]:pl-2 [&_blockquote]:italic"
                      }`}
                    >
                      {isStudent ? (
                        msg.text
                      ) : (
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Status below last message */}
              {statusText && (
                <div className="flex justify-start gap-2">
                  <div className="shrink-0 mt-0.5 h-7 w-7 rounded-full bg-muted-foreground/15 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm text-muted-foreground bg-muted/60 italic">
                    {statusText}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="p-3 border-t shrink-0 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息与 AI 顾问交流..."
              className="text-sm flex-1"
              disabled={sending}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSend}
              disabled={sending || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

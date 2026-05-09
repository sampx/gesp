"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, X, Send } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  role: "agent" | "student";
  text: string;
}

interface ChatPanelProps {
  token: string;
}

export function ChatPanel({ token }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/assessment/${token}/stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "agent_text" && data.text) {
          setMessages(prev => [...prev, { role: "agent", text: data.text }]);
          if (!open) setUnread(u => u + 1);
        }
      } catch { /* ignore malformed SSE data */ }
    };
    es.onerror = () => { /* EventSource auto-reconnects */ };
    return () => es.close();
  }, [token]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <>
      {/* Floating toggle button — bottom-right */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        onClick={() => { setOpen(!open); setUnread(0); }}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </Button>
      {unread > 0 && !open && (
        <Badge className="fixed bottom-16 right-5 z-50 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
          {unread}
        </Badge>
      )}

      {/* Chat panel overlay — right side */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-background border-l z-40 flex flex-col shadow-xl">
          <div className="h-14 flex items-center justify-between px-4 border-b shrink-0">
            <span className="font-semibold text-sm">AI 测评顾问</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div ref={scrollRef} className="space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">AI 顾问会在这里给你鼓励和提示哦~</p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "student" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-3 border-t shrink-0">
            <Input 
              placeholder="输入消息与 AI 顾问交流..." 
              className="text-sm" 
            />
            <Button size="icon" variant="ghost"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </>
  );
}
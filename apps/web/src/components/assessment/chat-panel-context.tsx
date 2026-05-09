"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ChatPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  unread: number;
  incrementUnread: () => void;
  clearUnread: () => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const incrementUnread = useCallback(() => {
    setUnread((u) => u + 1);
  }, []);

  const clearUnread = useCallback(() => {
    setUnread(0);
  }, []);

  return (
    <ChatPanelContext.Provider value={{ open, setOpen, unread, incrementUnread, clearUnread }}>
      {children}
    </ChatPanelContext.Provider>
  );
}

export function useAssessmentChat() {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) {
    // Return a no-op context when used outside provider (non-assessment pages)
    return {
      open: false,
      setOpen: () => {},
      unread: 0,
      incrementUnread: () => {},
      clearUnread: () => {},
    };
  }
  return ctx;
}

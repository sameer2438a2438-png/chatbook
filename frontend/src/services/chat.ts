import type { ChatMessage, ChatSession, HistoryResponse } from "../types";
import { api } from "./api";

export async function getHistory(): Promise<HistoryResponse> {
  const { data } = await api.get<HistoryResponse>("/history");
  return data;
}

export async function getSession(id: number): Promise<ChatSession> {
  const { data } = await api.get<ChatSession>(`/history/${id}`);
  return data;
}

export async function deleteSession(id: number): Promise<void> {
  await api.delete(`/history/${id}`);
}

export async function clearHistory(): Promise<void> {
  await api.delete("/history");
}

export type StreamHandlers = {
  onSession?: (id: number, title: string) => void;
  onToken: (content: string) => void;
  onCitations?: (citations: ChatMessage["citations"]) => void;
  onSuggestions?: (items: string[]) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
};

export async function streamChat(
  message: string,
  sessionId: number | null,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const token = localStorage.getItem("chatbook_token");
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal,
  });

  if (!res.ok || !res.body) {
    let detail = `Chat request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    handlers.onError?.(detail);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const raw of events) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        let event: any;
        try {
          event = JSON.parse(json);
        } catch {
          continue;
        }
        switch (event.type) {
          case "session":
            handlers.onSession?.(event.session_id, event.title);
            break;
          case "token":
            handlers.onToken(event.content);
            break;
          case "citations":
            handlers.onCitations?.(event.citations ?? []);
            break;
          case "suggestions":
            handlers.onSuggestions?.(event.items ?? []);
            break;
          case "error":
            handlers.onError?.(event.message);
            break;
          case "done":
            handlers.onDone?.();
            break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

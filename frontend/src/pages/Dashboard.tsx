import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import type { ChatMessage, ChatSession } from "../types";
import * as chatService from "../services/chat";
import { errorMessage } from "../services/api";
import { useToasts } from "../hooks/useToasts";
import { useBooks } from "../hooks/useBooks";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import UploadModal from "../components/UploadModal";

let localId = 0;
const nextId = () => --localId;

export default function Dashboard() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { push } = useToasts();
  const { books, loading: booksLoading, search, setSearch, load: loadBooks, addBook, removeBook } = useBooks();

  const loadHistory = useCallback(async () => {
    try {
      const history = await chatService.getHistory();
      setSessions(history.sessions);
    } catch (err) {
      push(errorMessage(err), "error");
    }
  }, [push]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const selectSession = useCallback(async (id: number | null) => {
    abortRef.current?.abort();
    setStreaming(false);
    setSuggestions([]);
    setActiveSessionId(id);
    if (id === null) {
      setMessages([]);
      return;
    }
    try {
      const session = await chatService.getSession(id);
      setMessages(session.messages);
    } catch (err) {
      push(errorMessage(err), "error");
    }
  }, [push]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming || !text.trim()) return;
      setSuggestions([]);

      const userMessage: ChatMessage = {
        id: nextId(),
        session_id: activeSessionId ?? 0,
        role: "user",
        content: text,
        citations: [],
        created_at: new Date().toISOString(),
      };
      const assistantMessage: ChatMessage = {
        id: nextId(),
        session_id: activeSessionId ?? 0,
        role: "assistant",
        content: "",
        citations: [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await chatService.streamChat(
        text,
        activeSessionId,
        {
        onSession: (id, _title) => {
          setActiveSessionId(id);
          setMessages((prev) =>
            prev.map((m) => (m.id === userMessage.id || m.id === assistantMessage.id ? { ...m, session_id: id } : m))
          );
        },
        onToken: (content) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.id === assistantMessage.id) {
              next[next.length - 1] = { ...last, content: last.content + content };
            }
            return next;
          });
        },
        onCitations: (citations) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.id === assistantMessage.id) {
              next[next.length - 1] = { ...last, citations };
            }
            return next;
          });
        },
        onSuggestions: (items) => setSuggestions(items),
        onDone: () => {
          setStreaming(false);
          loadHistory();
        },
        onError: (message) => {
          setStreaming(false);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.id === assistantMessage.id && last.content === "") {
              next[next.length - 1] = { ...last, content: `⚠️ ${message}` };
            }
            return next;
          });
          push(message, "error");
        },
        },
        controller.signal
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setStreaming(false);
      push(errorMessage(err), "error");
    }
  },
  [activeSessionId, loadHistory, push, streaming]
);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const deleteSession = useCallback(
    async (id: number) => {
      try {
        await chatService.deleteSession(id);
        if (activeSessionId === id) {
          setActiveSessionId(null);
          setMessages([]);
        }
        loadHistory();
        push("Conversation deleted.", "success");
      } catch {
        push("Failed to delete the conversation.", "error");
      }
    },
    [activeSessionId, loadHistory, push]
  );

  const clearAll = useCallback(async () => {
    try {
      await chatService.clearHistory();
      setActiveSessionId(null);
      setMessages([]);
      setSessions([]);
      push("All history cleared.", "success");
    } catch {
      push("Failed to clear history.", "error");
    }
  }, [push]);

  const handleSearch = useCallback(
    (term: string) => {
      setSearch(term);
      loadBooks(term);
    },
    [setSearch, loadBooks]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className={`${sidebarOpen ? "block" : "hidden"} lg:block`}>
        <div className="fixed inset-y-0 left-0 z-30 w-72 lg:static lg:z-auto lg:w-72">
          <Sidebar
            books={books}
            booksLoading={booksLoading}
            search={search}
            onSearch={handleSearch}
            onDeleteBook={removeBook}
            onUpload={() => setUploadOpen(true)}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={(id) => {
              selectSession(id);
              setSidebarOpen(false);
            }}
            onDeleteSession={deleteSession}
            onClearAll={clearAll}
          />
        </div>
      </div>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="absolute left-3 top-3 z-20 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 lg:hidden dark:border-slate-700 dark:bg-slate-900"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <ChatWindow
          messages={messages}
          streaming={streaming}
          suggestions={suggestions}
          onSend={sendMessage}
          onStop={stopStreaming}
        />
      </main>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={addBook} />
    </div>
  );
}

import { LogOut, MessageSquare, Moon, Plus, Sun, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { ChatSession } from "../types";
import BookList from "./BookList";
import type { Book } from "../types";

interface SidebarProps {
  books: Book[];
  booksLoading: boolean;
  search: string;
  onSearch: (term: string) => void;
  onDeleteBook: (id: number) => void;
  onUpload: () => void;
  sessions: ChatSession[];
  activeSessionId: number | null;
  onSelectSession: (id: number | null) => void;
  onDeleteSession: (id: number) => void;
  onClearAll: () => void;
}

export default function Sidebar({
  books,
  booksLoading,
  search,
  onSearch,
  onDeleteBook,
  onUpload,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAll,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-brand-600 dark:text-brand-400">ChatBook</h1>
          <p className="text-xs text-slate-400">Answers from your books only</p>
        </div>
        <button
          onClick={toggle}
          title="Toggle dark mode"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-3 pb-1">
          <button
            onClick={() => onSelectSession(null)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              activeSessionId === null
                ? "bg-brand-600 text-white"
                : "text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>

        <div className="px-3 py-1">
          <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">History</p>
          {sessions.length === 0 ? (
            <p className="px-1 py-2 text-xs text-slate-400">No conversations yet.</p>
          ) : (
            <ul className="space-y-1">
              {sessions.slice(0, 12).map((s) => (
                <li key={s.id} className="group flex items-center">
                  <button
                    onClick={() => onSelectSession(s.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      activeSessionId === s.id
                        ? "bg-brand-600 text-white"
                        : "text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </button>
                  <button
                    onClick={() => onDeleteSession(s.id)}
                    title="Delete conversation"
                    className="ml-1 rounded p-1 text-slate-400 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {sessions.length > 0 && (
            <button
              onClick={onClearAll}
              className="mt-2 flex items-center gap-1 px-1 text-xs text-slate-400 transition hover:text-rose-500"
            >
              <Trash2 className="h-3 w-3" /> Clear all history
            </button>
          )}
        </div>

        <div className="px-3 pb-1">
          <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Books</p>
        </div>
        <BookList
          books={books}
          loading={booksLoading}
          search={search}
          onSearch={onSearch}
          onDelete={onDeleteBook}
          onUpload={onUpload}
        />
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{user?.username}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          title="Log out"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

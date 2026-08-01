import { BookOpen, FileText, Loader2, Search, Trash2 } from "lucide-react";
import type { Book } from "../types";

interface BookListProps {
  books: Book[];
  loading: boolean;
  search: string;
  onSearch: (term: string) => void;
  onDelete: (id: number) => void;
  onUpload: () => void;
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function BookList({ books, loading, search, onSearch, onDelete, onUpload }: BookListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <button onClick={onUpload} className="btn-primary w-full">
          <BookOpen className="h-4 w-4" /> Upload PDF
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search books…"
            className="input py-2 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {loading && (
          <div className="flex justify-center py-6 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && books.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-400">
            No books yet.
            <br />
            Upload a PDF to start chatting about it.
          </p>
        )}

        <ul className="space-y-2">
          {books.map((book) => (
            <li
              key={book.id}
              className="group rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100" title={book.title}>
                    {book.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <FileText className="h-3 w-3" />
                    {book.page_count} pages · {book.chunk_count} chunks · {formatSize(book.size_bytes)}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(book.id)}
                  title="Delete book"
                  className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

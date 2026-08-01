import { useCallback, useEffect, useState } from "react";
import type { Book } from "../types";
import * as booksService from "../services/books";
import { useToasts } from "./useToasts";

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { push } = useToasts();

  const load = useCallback(
    async (term = search) => {
      setLoading(true);
      try {
        setBooks(await booksService.listBooks(term || undefined));
      } catch (err) {
        push("Failed to load books.", "error");
      } finally {
        setLoading(false);
      }
    },
    [search, push]
  );

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addBook = useCallback(
    (book: Book) => {
      setBooks((prev) => [book, ...prev.filter((b) => b.id !== book.id)]);
      push(`Book "${book.title}" uploaded successfully.`, "success");
    },
    [push]
  );

  const removeBook = useCallback(
    async (id: number) => {
      const book = books.find((b) => b.id === id);
      try {
        await booksService.deleteBook(id);
        setBooks((prev) => prev.filter((b) => b.id !== id));
        push(`Deleted "${book?.title ?? "book"}".`, "success");
      } catch {
        push("Failed to delete the book.", "error");
      }
    },
    [books, push]
  );

  return { books, loading, search, setSearch, load, addBook, removeBook };
}

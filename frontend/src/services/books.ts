import type { Book } from "../types";
import { api } from "./api";

export async function uploadBook(file: File, title: string): Promise<Book> {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title || file.name.replace(/\.pdf$/i, ""));
  const { data } = await api.post<Book>("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return data;
}

export async function listBooks(search?: string): Promise<Book[]> {
  const { data } = await api.get<Book[]>("/books", { params: search ? { search } : {} });
  return data;
}

export async function deleteBook(id: number): Promise<void> {
  await api.delete(`/books/${id}`);
}

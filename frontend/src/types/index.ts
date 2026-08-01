export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Book {
  id: number;
  title: string;
  filename: string;
  page_count: number;
  size_bytes: number;
  chunk_count: number;
  created_at: string;
}

export interface Citation {
  index: number;
  book_id: number;
  book_title: string;
  page: number;
  excerpt: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  messages: ChatMessage[];
}

export interface HistoryResponse {
  sessions: ChatSession[];
}

export type ChatEvent =
  | { type: "session"; session_id: number; title: string }
  | { type: "token"; content: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "suggestions"; items: string[] }
  | { type: "error"; message: string }
  | { type: "done" };

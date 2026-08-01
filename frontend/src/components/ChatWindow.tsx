import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen, MessageCircle } from "lucide-react";
import type { ChatMessage } from "../types";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";

interface ChatWindowProps {
  messages: ChatMessage[];
  streaming: boolean;
  suggestions: string[];
  onSend: (message: string) => void;
  onStop: () => void;
}

export default function ChatWindow({ messages, streaming, suggestions, onSend, onStop }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-md px-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/30">
                <BookOpen className="h-8 w-8 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                Ask anything about your design books
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Upload PDFs of UI/UX books, then ask questions. ChatBook answers using only the content of your books,
                citing the source book and page.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <MessageCircle className="h-4 w-4" />
                Try: “What are the key principles of visual hierarchy?”
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <ChatInput disabled={streaming} streaming={streaming} onSend={onSend} onStop={onStop} suggestions={suggestions} />
    </div>
  );
}

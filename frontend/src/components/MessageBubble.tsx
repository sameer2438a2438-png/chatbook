import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, Copy, Volume2 } from "lucide-react";
import type { ChatMessage } from "../types";
import Markdown from "./Markdown";

export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`>[\]]/g, " "));
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const toggleSpeak = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      speak(message.content);
      setSpeaking(true);
      const finish = () => {
        setSpeaking(false);
        window.speechSynthesis.removeEventListener("end", finish);
      };
      window.speechSynthesis.addEventListener("end", finish);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:max-w-[75%] ${
          isUser
            ? "rounded-br-md bg-brand-600 text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <Markdown>{message.content}</Markdown>

            {message.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200 pt-3 dark:border-slate-700">
                <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                  <BookOpen className="h-3.5 w-3.5" /> Sources:
                </span>
                {message.citations.map((c) => (
                  <span
                    key={c.index}
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  >
                    {c.book_title} · p.{c.page}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2 flex items-center gap-2 opacity-60">
              <button
                onClick={copy}
                title="Copy response"
                className="flex items-center gap-1 rounded p-1 text-xs text-slate-500 transition hover:text-brand-600 dark:text-slate-400"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={toggleSpeak}
                title={speaking ? "Stop reading" : "Read aloud"}
                className="flex items-center gap-1 rounded p-1 text-xs text-slate-500 transition hover:text-brand-600 dark:text-slate-400"
              >
                <Volume2 className={`h-3.5 w-3.5 ${speaking ? "text-brand-600" : ""}`} />
                {speaking ? "Stop" : "Listen"}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

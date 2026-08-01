import { useRef, useState } from "react";
import { ArrowUp, Mic, Square, Sparkles } from "lucide-react";

interface ChatInputProps {
  disabled: boolean;
  streaming: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  suggestions?: string[];
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
  }
  interface SpeechRecognitionEvent {
    results: { length: number; item: (i: number) => { 0: { transcript: string } } }[];
  }
  interface SpeechRecognitionErrorEvent {
    error: unknown;
  }
}

export default function ChatInput({ disabled, streaming, onSend, onStop, suggestions }: ChatInputProps) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const submit = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = window.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (event: SpeechRecognitionEvent) => {
      const items = Array.from(event.results);
      const transcript = items.map((r) => r.item(0)[0].transcript).join(" ");
      setText(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      {suggestions && suggestions.length > 0 && (
        <div className="mx-auto mb-2 flex max-w-3xl flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              disabled={disabled}
              className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700 transition hover:bg-brand-100 disabled:opacity-50 dark:border-brand-900 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
            >
              <Sparkles className="h-3 w-3" />
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="relative flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about your books… (Shift+Enter for new line)"
            className="input max-h-40 resize-none py-3 pr-11"
          />
          <button
            onClick={toggleMic}
            title={listening ? "Stop listening" : "Speak your question"}
            className={`absolute bottom-2.5 right-2.5 rounded-lg p-1.5 transition ${
              listening
                ? "bg-rose-500 text-white"
                : "text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
            }`}
          >
            <Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
          </button>
        </div>
        <button
          onClick={streaming ? onStop : submit}
          disabled={disabled && !streaming}
          title={streaming ? "Stop generating" : "Send"}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            streaming
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "bg-brand-600 text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          }`}
        >
          {streaming ? <Square className="h-4 w-4" /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

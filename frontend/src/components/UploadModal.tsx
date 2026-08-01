import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileUp, UploadCloud, X } from "lucide-react";
import * as booksService from "../services/books";
import { errorMessage } from "../services/api";
import { useToasts } from "../hooks/useToasts";
import Spinner from "./Spinner";
import type { Book } from "../types";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (book: Book) => void;
}

export default function UploadModal({ open, onClose, onUploaded }: UploadModalProps) {
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { push } = useToasts();

  const pick = useCallback((candidate: File | null | undefined) => {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".pdf")) {
      push("Only PDF files are supported.", "error");
      return;
    }
    setFile(candidate);
    setTitle(candidate.name.replace(/\.pdf$/i, ""));
  }, [push]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const book = await booksService.uploadBook(file, title);
      onUploaded(book);
      onClose();
      setFile(null);
      setTitle("");
    } catch (err) {
      push(errorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !uploading && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <UploadCloud className="h-5 w-5 text-brand-600" /> Upload a book
              </h2>
              <button
                onClick={onClose}
                disabled={uploading}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragging
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                  : "border-slate-300 dark:border-slate-700"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
              />
              {file ? (
                <>
                  <FileUp className="h-8 w-8 text-brand-600" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 text-slate-400" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Drag & drop a PDF here, or <span className="font-semibold text-brand-600">browse</span>
                  </p>
                  <p className="text-xs text-slate-400">PDFs only · up to 100 MB</p>
                </>
              )}
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-600 dark:text-slate-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Designing Interfaces"
              className="input mt-1"
            />

            <div className="mt-5 flex gap-2">
              <button onClick={onClose} disabled={uploading} className="btn-ghost flex-1">
                Cancel
              </button>
              <button onClick={submit} disabled={!file || uploading} className="btn-primary flex-1">
                {uploading ? (
                  <>
                    <Spinner className="h-4 w-4" /> Processing…
                  </>
                ) : (
                  "Upload & index"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useToasts } from "../hooks/useToasts";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: "text-emerald-500",
  error: "text-rose-500",
  info: "text-brand-500",
};

export default function Toasts() {
  const { toasts, dismiss } = useToasts();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind];
          return (
            <motion.button
              key={toast.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              onClick={() => dismiss(toast.id)}
              className="pointer-events-auto flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${COLORS[toast.kind]}`} />
              <span className="text-slate-700 dark:text-slate-200">{toast.message}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

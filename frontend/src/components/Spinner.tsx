import { motion } from "framer-motion";

export default function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <motion.div
      className={`inline-block rounded-full border-2 border-current border-t-transparent ${className}`}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      role="status"
      aria-label="Loading"
    />
  );
}

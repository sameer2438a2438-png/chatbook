import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-slate max-w-none dark:prose-invert dark:prose-slate">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline dark:text-brand-400" />
          ),
          code: (props) => (
            <code
              {...props}
              className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-rose-600 dark:bg-slate-800 dark:text-rose-400"
            />
          ),
          pre: (props) => (
            <pre
              {...props}
              className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 dark:bg-black"
            />
          ),
          blockquote: (props) => (
            <blockquote {...props} className="border-l-4 border-brand-300 pl-3 italic text-slate-500 dark:border-brand-700" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

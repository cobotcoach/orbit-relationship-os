import { ReactNode } from "react";
import ReactMarkdown from "react-markdown";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        components={{
          h2: ({ children }) => <h2 className="text-base font-semibold mt-4 mb-2 text-primary">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
          p: ({ children }) => <p className="text-sm leading-relaxed text-foreground/90 my-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2 text-sm">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2 text-sm">{children}</ol>,
          li: ({ children }) => <li className="text-sm text-foreground/90">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          code: ({ children }) => <code className="text-xs bg-muted px-1 py-0.5 rounded">{children}</code>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "urgent" | "warning" | "success" | "muted" }) {
  const map: Record<string, string> = {
    default: "bg-secondary text-secondary-foreground",
    urgent: "bg-[color:var(--urgent)]/15 text-[color:var(--urgent)] border border-[color:var(--urgent)]/30",
    warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border border-[color:var(--warning)]/30",
    success: "bg-primary/15 text-primary border border-primary/30",
    muted: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${map[tone]}`}>{children}</span>;
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      {icon && <div className="flex justify-center mb-2 opacity-60">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs mt-1 opacity-75">{hint}</p>}
    </div>
  );
}

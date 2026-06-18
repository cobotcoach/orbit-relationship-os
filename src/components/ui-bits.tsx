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
    <section className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
        <div className="flex-1 h-px bg-border" />
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({
  children,
  variant = "default",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "default" | "elevated" | "warning";
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const map: Record<string, string> = {
    default: "bg-surface-1 border border-border/50 shadow-sm",
    elevated: "bg-surface-2 border border-primary/20 shadow-md shadow-primary/5",
    warning: "bg-surface-1 border border-[color:var(--urgent)]/30",
  };
  return (
    <div {...rest} className={`rounded-2xl p-5 ${map[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "urgent" | "warning" | "success" | "muted" | "secondary" }) {
  const map: Record<string, string> = {
    default: "bg-surface-2 text-foreground border border-border",
    secondary: "bg-[color:var(--secondary)]/15 text-[color:var(--secondary)] border border-[color:var(--secondary)]/30",
    urgent: "bg-[color:var(--urgent)]/15 text-[color:var(--urgent)] border border-[color:var(--urgent)]/30",
    warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border border-[color:var(--warning)]/30",
    success: "bg-primary/15 text-primary border border-primary/30",
    muted: "bg-muted text-muted-foreground border border-border/50",
  };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${map[tone]}`}>{children}</span>;
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      {icon && <div className="flex justify-center mb-3 opacity-60">{icon}</div>}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint && <p className="text-xs mt-1.5">{hint}</p>}
    </div>
  );
}

import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { ModeIdentityBar, useMode } from "@/lib/mode-context";
import { CaptureSheet } from "./CaptureSheet";

export function Shell({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  const { captureOpen, closeCapture, activeMode } = useMode();
  return (
    <div className="min-h-screen bg-background pb-28 md:pb-6 md:pl-20 xl:pl-64">
      <SideNav />
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div
          className="mx-auto max-w-4xl px-5 md:px-8 flex items-center justify-between gap-4"
          style={{ minHeight: 56, paddingTop: "max(0.5rem,env(safe-area-inset-top))" }}
        >
          <div className="min-w-0 py-2">
            <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        <div className="md:[--mode-bar-h:48px]">
          <ModeIdentityBar />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 md:px-8 py-6">{children}</main>
      <BottomNav />
      {captureOpen && <CaptureSheet onClose={closeCapture} defaultMode={activeMode} />}
    </div>
  );
}

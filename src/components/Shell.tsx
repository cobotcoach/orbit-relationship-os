import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { ModeToggle, useMode } from "@/lib/mode-context";
import { CaptureSheet } from "./CaptureSheet";

export function Shell({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  const { captureOpen, closeCapture, activeMode } = useMode();
  return (
    <div className="min-h-screen bg-background pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-6 md:pl-20 xl:pl-64">
      <SideNav />
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div
          className="mx-auto max-w-5xl px-4 md:px-8 flex items-center justify-between gap-3"
          style={{ minHeight: 60, paddingTop: "max(0.5rem,env(safe-area-inset-top))", paddingBottom: "0.5rem" }}
        >
          <div className="min-w-0 py-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <ModeToggle className="hidden sm:inline-flex" />
            {action}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 md:px-8 py-5">{children}</main>
      <BottomNav />
      {captureOpen && <CaptureSheet onClose={closeCapture} defaultMode={activeMode} />}
    </div>
  );
}

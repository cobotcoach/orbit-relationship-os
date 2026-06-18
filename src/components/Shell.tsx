import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { ModeSwitcher } from "@/lib/mode-context";

export function Shell({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6 md:pl-16 xl:pl-56">
      <SideNav />
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="mx-auto max-w-5xl px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
            {action}
          </div>
          <div className="mt-2">
            <ModeSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}

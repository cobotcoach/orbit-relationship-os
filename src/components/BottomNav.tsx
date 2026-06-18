import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Target, Lightbulb, Plus, MoreHorizontal, Users, TrendingUp, MessagesSquare, Wrench, Inbox, Radio, Upload, ClipboardList, Rocket, X, Crosshair } from "lucide-react";
import { useMode } from "@/lib/mode-context";

const primary = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/focus", label: "Focus", icon: Target, exact: false },
  { to: "/ideas", label: "Ideas", icon: Lightbulb, exact: false },
] as const;

const baseMoreItems = [
  { to: "/cobot-coach", label: "Cobot Coach", icon: Rocket },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/pipeline", label: "Pipeline", icon: TrendingUp },
  { to: "/topics", label: "Topics", icon: MessagesSquare },
  { to: "/operations", label: "Operations", icon: Wrench },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/intel", label: "Intel", icon: Radio },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/log", label: "Capture Log", icon: ClipboardList },
  { to: "/import", label: "Import", icon: Upload },
] as const;

export function BottomNav() {
  const { openCapture, activeMode } = useMode();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreItems = activeMode === "cobot_coach"
    ? [{ to: "/mission" as const, label: "Mission Control", icon: Crosshair }, ...baseMoreItems]
    : baseMoreItems;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border tap"
        style={{ height: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-xl grid grid-cols-5 items-end px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 h-full">
          <NavItem item={primary[0]} />
          <NavItem item={primary[1]} />
          <div className="flex justify-center">
            <button
              onClick={openCapture}
              aria-label="Capture idea"
              className="-mt-8 h-[60px] w-[60px] rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform border-4 border-background"
              style={{ boxShadow: "0 8px 24px oklch(0.84 0.20 165 / 0.45)" }}
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>
          <NavItem item={primary[2]} />
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
          >
            <MoreHorizontal className="h-6 w-6" strokeWidth={2} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-[55] bg-background/70 backdrop-blur-sm flex items-end animate-in fade-in duration-150"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="w-full bg-surface-1 border-t border-border rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1.5 w-12 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="text-base font-bold">More</h2>
              <button onClick={() => setMoreOpen(false)} className="text-muted-foreground p-1"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex flex-col divide-y divide-border/50 px-2">
              {moreItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-4 px-3 py-4 text-base font-medium text-foreground active:bg-surface-2 rounded-lg"
                  activeProps={{ className: "text-primary" }}
                >
                  <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={2} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({ item }: { item: { to: string; label: string; icon: typeof Home; exact: boolean } }) {
  const { to, label, icon: Icon, exact } = item;
  return (
    <Link
      to={to}
      className="relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors"
      activeOptions={{ exact }}
      activeProps={{ className: "!text-primary [&_.active-dot]:opacity-100" }}
    >
      <span className="active-dot absolute top-0.5 h-1 w-1 rounded-full bg-primary opacity-0 transition-opacity" />
      <Icon className="h-6 w-6" strokeWidth={2} />
      <span>{label}</span>
    </Link>
  );
}

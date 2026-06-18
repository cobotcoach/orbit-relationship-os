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
  const { openCapture } = useMode();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border tap">
        <div className="mx-auto max-w-xl grid grid-cols-5 items-end px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
          {/* Home */}
          <NavItem item={primary[0]} />
          {/* Focus */}
          <NavItem item={primary[1]} />
          {/* Capture (centre, elevated) */}
          <div className="flex justify-center">
            <button
              onClick={openCapture}
              aria-label="Capture idea"
              className="-mt-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform border-4 border-background"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
          {/* Ideas */}
          <NavItem item={primary[2]} />
          {/* More */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-[55] bg-background/70 backdrop-blur-sm flex items-end"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="w-full bg-card border-t border-border rounded-t-2xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <h2 className="text-sm font-semibold">More</h2>
              <button onClick={() => setMoreOpen(false)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 divide-y divide-border">
              {moreItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-2 py-3 text-sm font-medium text-foreground active:bg-muted/60"
                  activeProps={{ className: "text-primary" }}
                >
                  <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
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
      className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors"
      activeOptions={{ exact }}
      activeProps={{ className: "text-primary" }}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
      <span>{label}</span>
    </Link>
  );
}

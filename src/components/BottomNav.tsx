import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crosshair, Zap, Lightbulb, Plus, MoreHorizontal, Users, Radio, ClipboardList, Upload, X } from "lucide-react";
import { useMode } from "@/lib/mode-context";

const primary = [
  { to: "/mission", label: "Mission", icon: Crosshair },
  { to: "/focus",   label: "Actions", icon: Zap },
  { to: "/ideas",   label: "Ideas",   icon: Lightbulb },
] as const;

const moreItems = [
  { to: "/contacts", label: "Partners",    icon: Users },
  { to: "/intel",    label: "Intel",       icon: Radio },
  { to: "/log",      label: "Capture Log", icon: ClipboardList },
  { to: "/upload",   label: "Upload",      icon: Upload },
] as const;

export function BottomNav() {
  const { openCapture } = useMode();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border tap"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        <div className="mx-auto max-w-xl grid grid-cols-5 items-end px-2 pt-1 gap-1">
          <NavItem {...primary[0]} />
          <NavItem {...primary[1]} />
          <div className="flex justify-center">
            <button
              onClick={openCapture}
              aria-label="Capture"
              className="-mt-7 h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-4 border-background"
              style={{ boxShadow: "0 10px 28px rgba(245,158,11,0.45)" }}
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>
          <NavItem {...primary[2]} />
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground min-h-[48px]"
          >
            <MoreHorizontal className="h-6 w-6" />
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
            className="w-full bg-surface-1 border-t border-border rounded-t-3xl"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1.5 w-12 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="text-base font-bold">More</h2>
              <button onClick={() => setMoreOpen(false)} className="text-muted-foreground p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex flex-col divide-y divide-border/50 px-2">
              {moreItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-4 px-3 py-4 text-base font-medium text-foreground active:bg-surface-2 rounded-lg min-h-[56px]"
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

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Crosshair }) {
  return (
    <Link
      to={to}
      className="relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground min-h-[48px]"
      activeProps={{ className: "!text-primary" }}
    >
      <Icon className="h-6 w-6" strokeWidth={2} />
      <span>{label}</span>
    </Link>
  );
}

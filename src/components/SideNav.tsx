import { Link } from "@tanstack/react-router";
import { Home, Users, TrendingUp, MessagesSquare, Wrench, Inbox, Radio, Lightbulb, Target, Upload, ClipboardList, Rocket, Crosshair } from "lucide-react";
import { useMode } from "@/lib/mode-context";

type Item = { to: string; label: string; icon: typeof Home };

const topItems: Item[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/focus", label: "Focus", icon: Target },
];

const workItems: Item[] = [
  { to: "/cobot-coach", label: "Cobot Coach", icon: Rocket },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/pipeline", label: "Pipeline", icon: TrendingUp },
  { to: "/topics", label: "Topics", icon: MessagesSquare },
];

const captureItems: Item[] = [
  { to: "/ideas", label: "Ideas", icon: Lightbulb },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/intel", label: "Intel", icon: Radio },
];

const manageItems: Item[] = [
  { to: "/operations", label: "Ops", icon: Wrench },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/log", label: "Log", icon: ClipboardList },
  { to: "/import", label: "Import", icon: Upload },
];

function NavGroup({ label, items }: { label?: string; items: Item[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <div className="hidden xl:block px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
          {label}
        </div>
      )}
      {!label || true ? null : null}
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          title={label}
          className="group relative flex items-center gap-3 px-4 xl:px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors border-l-2 border-transparent"
          activeOptions={{ exact: to === "/" }}
          activeProps={{ className: "!border-primary !text-primary bg-primary/10" }}
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
          <span className="hidden xl:inline truncate">{label}</span>
        </Link>
      ))}
    </div>
  );
}

export function SideNav() {
  const { activeMode } = useMode();
  const top = activeMode === "cobot_coach"
    ? [...topItems, { to: "/mission" as const, label: "Mission", icon: Crosshair }]
    : topItems;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col glass border-r border-border w-20 xl:w-64 py-5">
      <div className="px-5 mb-6 flex items-center">
        <span className="xl:hidden text-2xl font-bold text-primary font-display">O</span>
        <span className="hidden xl:inline text-2xl font-bold text-primary font-display tracking-tight">ORBIT</span>
      </div>
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        <NavGroup items={top} />
        <div className="mx-4 xl:mx-5 my-2 h-px bg-border xl:hidden" />
        <NavGroup label="Work" items={workItems} />
        <div className="mx-4 xl:mx-5 my-2 h-px bg-border xl:hidden" />
        <NavGroup label="Capture" items={captureItems} />
        <div className="mx-4 xl:mx-5 my-2 h-px bg-border xl:hidden" />
        <NavGroup label="Manage" items={manageItems} />
      </nav>
      <div className="px-4 xl:px-5 pt-4 mt-2 border-t border-border flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">R</div>
        <span className="hidden xl:inline text-sm font-medium text-foreground">Richard</span>
      </div>
    </aside>
  );
}

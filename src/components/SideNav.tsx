import { Link } from "@tanstack/react-router";
import { Home, Users, TrendingUp, MessagesSquare, Wrench, Inbox, Radio, Lightbulb, Target, Upload, ClipboardList, Rocket, Crosshair } from "lucide-react";
import { useMode } from "@/lib/mode-context";

const baseItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/focus", label: "Focus", icon: Target },
  { to: "/cobot-coach", label: "Cobot Coach", icon: Rocket },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/pipeline", label: "Pipeline", icon: TrendingUp },
  { to: "/topics", label: "Topics", icon: MessagesSquare },
  { to: "/ideas", label: "Ideas", icon: Lightbulb },
  { to: "/operations", label: "Ops", icon: Wrench },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/intel", label: "Intel", icon: Radio },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/log", label: "Log", icon: ClipboardList },
] as const;

export function SideNav() {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col glass border-r border-border w-16 xl:w-56 py-4">
      <div className="px-3 xl:px-4 mb-4">
        <h1 className="text-base font-bold tracking-tight truncate">
          <span className="xl:hidden">O</span>
          <span className="hidden xl:inline">ORBIT</span>
        </h1>
      </div>
      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            title={label}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
            activeOptions={{ exact: to === "/" }}
            activeProps={{ className: "bg-primary/15 text-primary" }}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="hidden xl:inline truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

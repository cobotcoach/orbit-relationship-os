import { Link } from "@tanstack/react-router";
import { Crosshair, Zap, Lightbulb, Users, Radio, ClipboardList } from "lucide-react";

const items = [
  { to: "/mission",  label: "Mission Control",  icon: Crosshair },
  { to: "/focus",    label: "Today's Actions",  icon: Zap },
  { to: "/ideas",    label: "Ideas",            icon: Lightbulb },
  { to: "/contacts", label: "Partners",         icon: Users },
  { to: "/intel",    label: "Intel",            icon: Radio },
  { to: "/log",      label: "Capture Log",      icon: ClipboardList },
] as const;

export function SideNav() {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col glass border-r border-border w-20 xl:w-64 py-5">
      <Link to="/mission" className="px-5 mb-7 flex items-center gap-2">
        <span className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-lg">O</span>
        <span className="hidden xl:inline text-xl font-bold font-display tracking-tight">ORBIT</span>
      </Link>
      <nav className="flex-1 flex flex-col gap-0.5">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            title={label}
            className="group relative flex items-center gap-3 px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors border-l-2 border-transparent"
            activeProps={{ className: "!border-primary !text-primary bg-primary/10" }}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="hidden xl:inline truncate">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-4 xl:px-5 pt-4 mt-2 border-t border-border flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">R</div>
        <span className="hidden xl:inline text-sm font-medium">Richard</span>
      </div>
    </aside>
  );
}

import { Link } from "@tanstack/react-router";
import { Home, Users, TrendingUp, CheckSquare, Wrench, Inbox, Radio } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/pipeline", label: "Pipeline", icon: TrendingUp },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/operations", label: "Ops", icon: Wrench },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/intel", label: "Intel", icon: Radio },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border tap">
      <div className="mx-auto max-w-xl grid grid-cols-7 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors"
            activeOptions={{ exact: to === "/" }}
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

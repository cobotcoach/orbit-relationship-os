import { Link } from "@tanstack/react-router";
import { AlertCircle, ChevronRight } from "lucide-react";
import { Contact } from "@/lib/types";
import { HealthBar } from "./HealthBar";
import { lastContactLabel, typeLabel } from "@/lib/format";

export function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Link
      to="/contacts/$id"
      params={{ id: contact.id }}
      className="block rounded-xl bg-card border border-border p-3 tap active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {contact.urgent && (
              <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "var(--urgent)" }} />
            )}
            <h3 className="font-semibold truncate">{contact.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {contact.company ?? "—"}{contact.role ? ` · ${contact.role}` : ""}
          </p>
          <div className="mt-2">
            <HealthBar score={contact.health_score} showLabel />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
            <span>{typeLabel(contact.type)}</span>
            <span>{lastContactLabel(contact.last_contact_date)}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
      </div>
    </Link>
  );
}

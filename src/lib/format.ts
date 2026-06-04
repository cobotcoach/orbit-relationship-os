export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function lastContactLabel(iso: string | null): string {
  const d = daysSince(iso);
  if (d === null) return "Never contacted";
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function healthColor(score: number): string {
  if (score >= 75) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--urgent)";
}

export function gbp(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

export function folderLabel(type: string, folder: string): string {
  const map: Record<string, string> = {
    active: "Active", lapsed: "Lapsed",
    onboarding_1: "Onboarding · 1", onboarding_2: "Onboarding · 2",
    onboarding_3: "Onboarding · 3", onboarding_4: "Onboarding · 4",
    enterprise: "Enterprise", sme: "SME",
    hot: "Hot", warm: "Warm", cold: "Cold", default: "All",
  };
  return map[folder] ?? folder;
}

export function typeLabel(t: string): string {
  const map: Record<string, string> = {
    channel_partner: "Channel Partner",
    end_user: "End User",
    prospect: "Prospect",
    ecosystem_partner: "Ecosystem",
    distributor: "Distributor",
    internal: "Internal",
  };
  return map[t] ?? t;
}

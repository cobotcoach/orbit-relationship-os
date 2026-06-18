import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill } from "@/components/ui-bits";
import { useMode } from "@/lib/mode-context";
import { reclassifyIdea } from "@/lib/ingest.functions";
import type { Idea } from "@/lib/types";

const BUCKET_TAGS = ["monetisation", "sales", "content", "build", "launch", "product"] as const;
const AUTO_RETAG_INTERVAL_MS = 24 * 60 * 60 * 1000;

function ideaHasBucketTag(idea: Idea): boolean {
  const t = (idea.tags ?? []).map(x => x.toLowerCase());
  return BUCKET_TAGS.some(b => t.includes(b));
}

export const Route = createFileRoute("/cobot-coach")({
  head: () => ({ meta: [{ title: "ORBIT — Cobot Coach" }] }),
  component: CobotCoachPage,
});

// ---------- localStorage hook ----------
function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }, [key, val]);
  return [val, setVal];
}

const PPMA_DATE = new Date("2026-09-01T00:00:00Z");
function daysUntil(d: Date) {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

function hasTag(idea: Idea, ...tags: string[]) {
  const t = idea.tags?.map(x => x.toLowerCase()) ?? [];
  const title = (idea.title ?? "").toLowerCase();
  const summary = (idea.summary ?? "").toLowerCase();
  return tags.some(tag => {
    const lc = tag.toLowerCase();
    return t.includes(lc) || title.includes(lc) || summary.includes(lc);
  });
}

function CardShell({ emoji, title, href, children }: { emoji: string; title: string; href?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2"><span className="text-lg">{emoji}</span>{title}</h2>
        {href && (
          <Link to="/ideas" className="text-[11px] text-primary hover:underline">View ideas →</Link>
        )}
      </div>
      {children}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-xl font-bold mt-1 leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

// ---------- cycling pills ----------
const TARGET_STATUSES = ["Not contacted", "Approached", "Interested", "Committed"] as const;
type TargetStatus = typeof TARGET_STATUSES[number];
const GRANT_STATUSES = ["Not started", "In progress", "Submitted", "Awarded"] as const;
type GrantStatus = typeof GRANT_STATUSES[number];

function statusTone(s: string): "muted" | "warning" | "success" | "default" {
  if (s === "Awarded" || s === "Committed") return "success";
  if (s === "Submitted" || s === "Interested") return "default";
  if (s === "In progress" || s === "Approached") return "warning";
  return "muted";
}

function cycle<T extends readonly string[]>(arr: T, current: string): T[number] {
  const i = arr.indexOf(current as T[number]);
  return arr[(i + 1) % arr.length];
}

function CobotCoachPage() {
  const { activeMode, setMode } = useMode();
  const { data: ideas = [] } = useQuery({ queryKey: ["ideas"], queryFn: db.ideas.list });

  const cobotIdeas = useMemo(() => ideas.filter(i => i.mode === "cobot_coach"), [ideas]);
  const wildIdeas = useMemo(() => ideas.filter(i => i.mode === "wild"), [ideas]);

  const byTag = (i: Idea, tag: string) => hasTag(i, tag);
  const lastWithTag = (tag: string) => cobotIdeas.find(i => byTag(i, tag));
  const countWithTag = (tag: string) => cobotIdeas.filter(i => byTag(i, tag)).length;

  // persisted state
  const [foundingPartners, setFoundingPartners] = useLocalStorage<number>("cc.foundingPartners", 0);
  const [milestones, setMilestones] = useLocalStorage<Record<string, boolean>>("cc.milestones", {
    "Demo cell built": false,
    "CR3A demo running": false,
    "Website live": false,
  });
  const [videosPlanned, setVideosPlanned] = useLocalStorage<number>("cc.videosPlanned", 0);
  const [targets, setTargets] = useLocalStorage<Record<string, TargetStatus>>("cc.targets", {
    "JTR Automation — Jamie Ross": "Not contacted",
    "Labman": "Not contacted",
    "Astech Projects": "Not contacted",
  });
  const [grants, setGrants] = useLocalStorage<Record<string, GrantStatus>>("cc.grants", {
    "Made Smarter": "Not started",
    "UKSPF": "Not started",
    "Innovate UK": "Not started",
  });

  const daysToPPMA = daysUntil(PPMA_DATE);
  const topEnergy = [...cobotIdeas].sort((a, b) => b.energy_score - a.energy_score)[0];
  const topWild = [...wildIdeas].sort((a, b) => b.energy_score - a.energy_score)[0];

  // ---------- auto re-tag ----------
  const qc = useQueryClient();
  const retag = useServerFn(reclassifyIdea);
  const [retagQueue, setRetagQueue] = useState<string[]>([]);
  const [retagRemaining, setRetagRemaining] = useState(0);
  const [lastAutoRetagged, setLastAutoRetagged] = useLocalStorage<number>("cc.lastAutoRetagged", 0);
  const processingRef = useRef(false);
  const autoTriggeredRef = useRef(false);

  const enqueueRetag = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setRetagQueue(prev => {
      const seen = new Set(prev);
      const next = [...prev];
      for (const id of ids) if (!seen.has(id)) { next.push(id); seen.add(id); }
      return next;
    });
    setRetagRemaining(r => r + ids.length);
  }, []);

  // Auto-trigger once per 24h on load
  useEffect(() => {
    if (activeMode !== "cobot_coach") return;
    if (autoTriggeredRef.current) return;
    if (cobotIdeas.length === 0) return;
    const sinceLast = Date.now() - (lastAutoRetagged || 0);
    if (sinceLast < AUTO_RETAG_INTERVAL_MS) return;
    autoTriggeredRef.current = true;
    const needsRetag = cobotIdeas.filter(i => !ideaHasBucketTag(i) && (i.raw_text?.trim().length ?? 0) > 0).map(i => i.id);
    if (needsRetag.length > 0) enqueueRetag(needsRetag);
    setLastAutoRetagged(Date.now());
  }, [activeMode, cobotIdeas, enqueueRetag, lastAutoRetagged, setLastAutoRetagged]);

  // Process queue sequentially with 500ms gap
  useEffect(() => {
    if (processingRef.current) return;
    if (retagQueue.length === 0) return;
    processingRef.current = true;
    let cancelled = false;
    (async () => {
      while (!cancelled) {
        let nextId: string | undefined;
        setRetagQueue(prev => {
          if (prev.length === 0) return prev;
          nextId = prev[0];
          return prev.slice(1);
        });
        if (!nextId) break;
        try { await retag({ data: { id: nextId } }); } catch { /* ignore individual failures */ }
        setRetagRemaining(r => Math.max(0, r - 1));
        await new Promise(res => setTimeout(res, 500));
      }
      processingRef.current = false;
      await qc.invalidateQueries({ queryKey: ["ideas"] });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retagQueue.length > 0]);

  const handleManualRetagAll = () => {
    const ids = cobotIdeas.filter(i => (i.raw_text?.trim().length ?? 0) > 0).map(i => i.id);
    enqueueRetag(ids);
  };

  if (activeMode !== "cobot_coach") {
    return (
      <Shell title="Cobot Coach Command Centre" subtitle="Mode-specific dashboard">
        <div className="rounded-2xl bg-card border border-border p-8 text-center space-y-3">
          <div className="text-4xl">🟠</div>
          <p className="text-sm font-medium">Switch to Cobot Coach mode to view this page</p>
          <button
            onClick={() => setMode("cobot_coach")}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Switch to Cobot Coach
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Cobot Coach Command Centre" subtitle="One screen, every lever">
      {/* Stat bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <StatTile label="Ideas captured" value={cobotIdeas.length} />
        <StatTile label="Days to PPMA" value={daysToPPMA} sub="1 Sep 2026 · NEC" />
        <StatTile label="Founding partners" value={`${foundingPartners} / 20`} />
        <StatTile label="Top energy idea" value={topEnergy?.energy_score ?? "—"} sub={topEnergy?.title ?? "No ideas yet"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Monetisation */}
        <CardShell emoji="💰" title="Monetisation" href="/ideas">
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-bold">{countWithTag("monetisation")}</div>
            <div className="text-xs text-muted-foreground">ideas</div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            Last: {lastWithTag("monetisation")?.title ?? "—"}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Founding Partners</span>
              <span className="text-xs tabular-nums">{foundingPartners} / 20 committed</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (foundingPartners / 20) * 100)}%` }} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFoundingPartners(Math.max(0, foundingPartners - 1))} className="h-7 w-7 rounded-md border border-border text-sm">−</button>
              <button onClick={() => setFoundingPartners(foundingPartners + 1)} className="h-7 w-7 rounded-md border border-border text-sm">+</button>
              <button
                onClick={() => {
                  const v = prompt("Founding partners committed:", String(foundingPartners));
                  if (v !== null) {
                    const n = parseInt(v, 10);
                    if (!isNaN(n) && n >= 0) setFoundingPartners(n);
                  }
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
              >
                Edit
              </button>
            </div>
          </div>
        </CardShell>

        {/* Build */}
        <CardShell emoji="🏗️" title="Build" href="/ideas">
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-bold">{countWithTag("build")}</div>
            <div className="text-xs text-muted-foreground">ideas</div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            Last: {lastWithTag("build")?.title ?? "—"}
          </p>
          <ul className="space-y-1.5">
            {Object.keys(milestones).map(m => (
              <li key={m}>
                <button
                  onClick={() => setMilestones({ ...milestones, [m]: !milestones[m] })}
                  className="flex items-center gap-2 w-full text-left text-sm py-1"
                >
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded border ${milestones[m] ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                    {milestones[m] ? "✓" : ""}
                  </span>
                  <span className={milestones[m] ? "line-through text-muted-foreground" : ""}>{m}</span>
                </button>
              </li>
            ))}
          </ul>
        </CardShell>

        {/* Content */}
        <CardShell emoji="📣" title="Content" href="/ideas">
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-bold">{countWithTag("content")}</div>
            <div className="text-xs text-muted-foreground">ideas</div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            Last: {lastWithTag("content")?.title ?? "—"}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
            <span className="text-xs font-semibold">Videos planned</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setVideosPlanned(Math.max(0, videosPlanned - 1))} className="h-7 w-7 rounded-md border border-border text-sm">−</button>
              <span className="text-sm tabular-nums w-12 text-center">{videosPlanned} / 5</span>
              <button onClick={() => setVideosPlanned(videosPlanned + 1)} className="h-7 w-7 rounded-md border border-border text-sm">+</button>
            </div>
          </div>
        </CardShell>

        {/* Sales */}
        <CardShell emoji="🤝" title="Sales" href="/ideas">
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-bold">{countWithTag("sales")}</div>
            <div className="text-xs text-muted-foreground">ideas</div>
          </div>
          <ul className="space-y-1.5">
            {Object.keys(targets).map(name => (
              <li key={name} className="flex items-center justify-between gap-2 py-1">
                <span className="text-sm truncate">{name}</span>
                <button onClick={() => setTargets({ ...targets, [name]: cycle(TARGET_STATUSES, targets[name]) as TargetStatus })}>
                  <Pill tone={statusTone(targets[name])}>{targets[name]}</Pill>
                </button>
              </li>
            ))}
          </ul>
        </CardShell>

        {/* Launch */}
        <CardShell emoji="🚀" title="Launch">
          <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
            <span className="text-xs font-semibold">PPMA NEC · 1 Sep 2026</span>
            <span className="text-lg font-bold tabular-nums">{daysToPPMA}d</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Grants</div>
            <ul className="space-y-1.5">
              {Object.keys(grants).map(g => (
                <li key={g} className="flex items-center justify-between gap-2 py-1">
                  <span className="text-sm">{g}</span>
                  <button onClick={() => setGrants({ ...grants, [g]: cycle(GRANT_STATUSES, grants[g]) as GrantStatus })}>
                    <Pill tone={statusTone(grants[g])}>{grants[g]}</Pill>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </CardShell>

        {/* Product Ideas */}
        <CardShell emoji="🔬" title="Product Ideas" href="/ideas">
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-bold">{cobotIdeas.filter(i => byTag(i, "product")).length + wildIdeas.length}</div>
            <div className="text-xs text-muted-foreground">product + wild ideas</div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            Last wild: {wildIdeas[0]?.title ?? "—"}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
            <span className="text-xs font-semibold truncate mr-2">{topWild?.title ?? "No wild ideas"}</span>
            <span className="text-sm tabular-nums">⚡ {topWild?.energy_score ?? 0}</span>
          </div>
        </CardShell>
      </div>
    </Shell>
  );
}

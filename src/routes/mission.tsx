import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Plus, Check, X, ChevronDown, ChevronRight, Search, AlertTriangle, Cloud, CloudOff, ExternalLink, ArrowDown, Sparkles, Zap, Target, Wrench, ChevronUp } from "lucide-react";
import { db, mondayISO } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill, Section, EmptyState } from "@/components/ui-bits";
import { AskOrbitPanel } from "@/components/AskOrbitPanel";
import { synthesiseMissionControlSection } from "@/lib/ai.functions";
import { syncSectionToDrive, pullFromDrive } from "@/lib/drive.functions";
import type { BusinessSection, WeeklyCommitment, Decision, Idea, IntelligenceItem, Action, SmartTopic, CaptureLogEntry } from "@/lib/types";

export const Route = createFileRoute("/mission")({
  head: () => ({ meta: [{ title: "Mawson — Mission Control" }] }),
  component: MissionPage,
});

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const LAUNCH_DATE = new Date("2026-07-31T00:00:00Z");
function daysTo(d: Date) {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}
function weekLabel() {
  const m = mondayISO();
  return `Week of ${new Date(m).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}
function confidenceTone(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 5) return "bg-amber-500";
  return "bg-red-500";
}
function statusPillTone(status: string): "success" | "warning" | "urgent" | "muted" {
  if (status === "active") return "success";
  if (status === "blocked") return "urgent";
  if (status === "parked") return "warning";
  return "muted";
}

function MissionPage() {
  const qc = useQueryClient();
  const sections = useQuery({ queryKey: ["mc:sections"], queryFn: db.sections.list });
  const thisWeek = useQuery({ queryKey: ["mc:thisWeek"], queryFn: db.commitments.thisWeek });
  const lastWeek = useQuery({ queryKey: ["mc:lastWeek"], queryFn: db.commitments.lastWeek });
  const decisions = useQuery({ queryKey: ["mc:decisions"], queryFn: () => db.decisions.list() });
  const ideas = useQuery({ queryKey: ["ideas"], queryFn: db.ideas.list });
  const actions = useQuery({ queryKey: ["actions"], queryFn: db.actions.list });
  const intel = useQuery({ queryKey: ["intel"], queryFn: db.intel.list });
  const topics = useQuery({ queryKey: ["topics"], queryFn: db.topics.list });
  const captures = useQuery({ queryKey: ["captures_log"], queryFn: db.log.list });
  const [askOpen, setAskOpen] = useState(false);

  const synthesise = useServerFn(synthesiseMissionControlSection);
  const syncFn = useServerFn(syncSectionToDrive);
  const pullFn = useServerFn(pullFromDrive);
  const [synthRunning, setSynthRunning] = useState<string | null>(null);
  const [synthProgress, setSynthProgress] = useState<{ current: number; total: number } | null>(null);
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const autoRanRef = useRef(false);

  const syncSection = useCallback(async (slug: string): Promise<void> => {
    setSyncingSlug(slug);
    try {
      await syncFn({ data: { slug } });
      qc.invalidateQueries({ queryKey: ["mc:sections"] });
    } catch (e) {
      console.error("Drive sync failed for", slug, e);
    } finally {
      setSyncingSlug(prev => (prev === slug ? null : prev));
    }
  }, [syncFn, qc]);

  const pullSection = useCallback(async (slug: string): Promise<void> => {
    setSyncingSlug(slug);
    try {
      await pullFn({ data: { slug } });
      qc.invalidateQueries({ queryKey: ["mc:sections"] });
    } catch (e) {
      console.error("Drive pull failed for", slug, e);
    } finally {
      setSyncingSlug(prev => (prev === slug ? null : prev));
    }
  }, [pullFn, qc]);

  async function syncAll(list: BusinessSection[]) {
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      setSyncProgress({ current: i + 1, total: list.length, label: s.title });
      setSyncingSlug(s.slug);
      try {
        await syncFn({ data: { slug: s.slug } });
      } catch (e) {
        console.error("Sync failed", s.slug, e);
      }
    }
    setSyncingSlug(null);
    setSyncProgress(null);
    qc.invalidateQueries({ queryKey: ["mc:sections"] });
  }

  const days = daysTo(LAUNCH_DATE);
  const countdownColor = days < 30 ? "text-red-500" : days < 60 ? "text-amber-500" : "text-muted-foreground";

  const cobotIdeas = useMemo(
    () => (ideas.data ?? []).filter(i => i.mode === "cobot_coach"),
    [ideas.data]
  );

  async function runSynthesisFor(sectionsToRun: BusinessSection[]) {
    if (sectionsToRun.length === 0) return;
    setSynthProgress({ current: 0, total: sectionsToRun.length });
    const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
    const fourWeeksAgo = Date.now() - 28 * 86_400_000;
    const recentIdeas = cobotIdeas.filter(i => new Date(i.created_at).getTime() >= thirtyDaysAgo);
    const openActions = (actions.data ?? []).filter(a => a.status !== "done");
    const recentIntel = (intel.data ?? []).filter(i => new Date(i.created_at).getTime() >= thirtyDaysAgo);
    const openTopics = (topics.data ?? []).filter(t => t.status !== "resolved");
    const recentCommits = [...(thisWeek.data ?? []), ...(lastWeek.data ?? [])]
      .filter(c => new Date(c.created_at).getTime() >= fourWeeksAgo);

    for (let i = 0; i < sectionsToRun.length; i++) {
      const sec = sectionsToRun[i];
      setSynthRunning(sec.slug);
      setSynthProgress({ current: i + 1, total: sectionsToRun.length });
      try {
        const ideasForSec = recentIdeas.filter(it => ideaTouchesSection(it, sec.slug));
        const res = await synthesise({
          data: {
            sectionTitle: sec.title,
            sectionSlug: sec.slug,
            ownerSummary: sec.owner_summary,
            blockers: sec.blockers ?? [],
            nextAction: sec.next_action,
            confidence: sec.confidence_score ?? 5,
            ideas: ideasForSec.slice(0, 30).map(i => ({ title: i.title, summary: i.summary, tags: i.tags, energy: i.energy_score })),
            actions: openActions.slice(0, 30).map(a => ({ title: a.title, urgency: a.urgency })),
            intel: recentIntel.slice(0, 20).map(i => ({ summary: i.summary, topics: i.topics })),
            topics: openTopics.slice(0, 20).map(t => ({ title: t.title, status: t.status, next: t.next_action })),
            recentCommitments: recentCommits.map(c => ({ section: c.section_slug, commitment: c.commitment, status: c.status })),
          },
        });
        await db.sections.update(sec.slug, {
          ai_synthesis: res.synthesis,
          ai_synthesised_at: new Date().toISOString(),
        });
        // Trigger Drive sync after synthesis completes for this section
        syncSection(sec.slug).catch(err => console.error("Auto-sync after synthesis failed", err));
      } catch (e) {
        console.error("Synth failed for", sec.slug, e);
      }
    }
    setSynthRunning(null);
    setSynthProgress(null);
    qc.invalidateQueries({ queryKey: ["mc:sections"] });
  }

  // Auto-trigger stale synthesis
  useEffect(() => {
    if (autoRanRef.current) return;
    if (!sections.data || sections.data.length === 0) return;
    if (!ideas.data || !actions.data || !intel.data || !topics.data) return;
    autoRanRef.current = true;
    const stale = sections.data.filter(s => {
      if (!s.ai_synthesised_at) return true;
      return Date.now() - new Date(s.ai_synthesised_at).getTime() > 48 * 3600 * 1000;
    });
    if (stale.length > 0) {
      runSynthesisFor(stale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.data, ideas.data, actions.data, intel.data, topics.data]);

  const lastWeekDone = (lastWeek.data ?? []).filter(c => c.status === "done").length;
  const lastWeekTotal = (lastWeek.data ?? []).length;

  return (
    <Shell
      title="Mission Control"
      subtitle={weekLabel()}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAskOpen(true)}
            className="h-10 px-3.5 rounded-full bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5 active:scale-95"
          >
            <Sparkles className="h-4 w-4" /> Ask Mawson
          </button>
        </div>
      }
    >
      {/* Top strip — launch countdown */}
      <div className="mb-4 rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
        <span className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-base">🟠</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cobot Coach</p>
            <span className={`text-sm font-bold tabular-nums ${countdownColor}`}>{days}d to launch</span>
            <span className="text-[11px] text-muted-foreground">· 31 Jul 2026</span>
          </div>
        </div>
        <button
          onClick={() => runSynthesisFor(sections.data ?? [])}
          disabled={synthRunning !== null}
          aria-label="Synthesise"
          title="Synthesise all sections"
          className="h-9 w-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted-foreground disabled:opacity-50"
        >
          {synthRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      {synthProgress && (
        <div className="mb-3 rounded-xl bg-primary/10 border border-primary/30 px-3 py-2 text-xs text-primary inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Synthesising {synthRunning} ({synthProgress.current}/{synthProgress.total})
        </div>
      )}

      <TodayPanel
        actions={actions.data ?? []}
        commitments={thisWeek.data ?? []}
        sections={sections.data ?? []}
        onChange={() => {
          qc.invalidateQueries({ queryKey: ["actions"] });
          qc.invalidateQueries({ queryKey: ["mc:thisWeek"] });
        }}
      />

      <WeeklyCommitmentsPanel
        thisWeek={thisWeek.data ?? []}
        lastWeekDone={lastWeekDone}
        lastWeekTotal={lastWeekTotal}
        sections={sections.data ?? []}
        onChange={() => qc.invalidateQueries({ queryKey: ["mc:thisWeek"] })}
        syncSection={syncSection}
      />

      <SectionGroupsPanel
        sections={sections.data ?? []}
        decisions={decisions.data ?? []}
        synthRunningSlug={synthRunning}
        syncingSlug={syncingSlug}
        syncSection={syncSection}
        pullSection={pullSection}
        onChange={() => {
          qc.invalidateQueries({ queryKey: ["mc:sections"] });
          qc.invalidateQueries({ queryKey: ["mc:decisions"] });
        }}
      />

      <RecentCapturesPanel captures={captures.data ?? []} />

      <DecisionLogPanel decisions={decisions.data ?? []} sections={sections.data ?? []} />

      <AskOrbitPanel
        open={askOpen}
        onClose={() => setAskOpen(false)}
        sections={sections.data ?? []}
        ideas={ideas.data ?? []}
        intel={intel.data ?? []}
        actions={actions.data ?? []}
        topics={topics.data ?? []}
      />
    </Shell>
  );
}

// ---------------- Today (3 items max) ----------------
function TodayPanel({
  actions, commitments, sections, onChange,
}: {
  actions: Action[];
  commitments: WeeklyCommitment[];
  sections: BusinessSection[];
  onChange: () => void;
}) {
  const urgentRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const topAction = [...actions.filter(a => a.status !== "done" && a.status !== "deferred")]
    .sort((a, b) => (urgentRank[a.urgency] ?? 9) - (urgentRank[b.urgency] ?? 9))[0];
  const topCommit = commitments.find(c => c.status === "pending");
  const topBlocker = [...sections.filter(s => s.status === "blocked")]
    .sort((a, b) => (a.confidence_score ?? 5) - (b.confidence_score ?? 5))[0];

  const items: { key: string; icon: typeof Zap; tone: string; title: string; sub?: string; onDone?: () => void; fix?: string }[] = [];
  if (topAction) items.push({
    key: `act-${topAction.id}`,
    icon: Zap,
    tone: topAction.urgency === "critical" || topAction.urgency === "high" ? "#ef4444" : "#f59e0b",
    title: topAction.title,
    sub: `Most urgent action · ${topAction.urgency}`,
    onDone: async () => {
      await db.actions.update(topAction.id, { status: "done", completed_at: new Date().toISOString() });
      onChange();
    },
    fix: "/focus",
  });
  if (topCommit) {
    const sec = sections.find(s => s.slug === topCommit.section_slug);
    items.push({
      key: `wc-${topCommit.id}`,
      icon: Target,
      tone: "#f59e0b",
      title: topCommit.commitment,
      sub: `This week · ${sec?.title ?? topCommit.section_slug}`,
      onDone: async () => {
        await db.commitments.update(topCommit.id, { status: "done", completed_at: new Date().toISOString() });
        onChange();
      },
    });
  }
  if (topBlocker) items.push({
    key: `blk-${topBlocker.slug}`,
    icon: Wrench,
    tone: "#ef4444",
    title: `Blocker: ${topBlocker.title}`,
    sub: topBlocker.next_action ?? (topBlocker.blockers ?? [])[0] ?? "Needs unblocking",
    fix: "#",
  });

  if (items.length === 0) return null;

  return (
    <Section title="Today">
      <div className="space-y-2">
        {items.slice(0, 3).map(it => {
          const Icon = it.icon;
          return (
            <div key={it.key} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3" style={{ borderLeft: `3px solid ${it.tone}` }}>
              <span className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${it.tone}20`, color: it.tone }}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">{it.title}</p>
                {it.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{it.sub}</p>}
              </div>
              {it.onDone && (
                <button onClick={it.onDone} className="shrink-0 h-9 px-3 rounded-lg bg-success/15 text-success border border-success/30 text-xs font-bold inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Done
                </button>
              )}
              {!it.onDone && it.fix && (
                <button className="shrink-0 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Fix it</button>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ---------------- Recent Captures ----------------
function RecentCapturesPanel({ captures }: { captures: CaptureLogEntry[] }) {
  const [open, setOpen] = useState(false);
  const recent = captures.slice(0, 5);
  return (
    <Section title="Recent captures">
      <div className="rounded-xl bg-card border border-border">
        <button onClick={() => setOpen(o => !o)} className="w-full p-3 flex items-center justify-between text-sm font-medium">
          <span>{recent.length} recent · <Link to="/log" className="text-primary hover:underline" onClick={e => e.stopPropagation()}>View all</Link></span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {open && (
          <div className="border-t border-border divide-y divide-border">
            {recent.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nothing captured yet.</p>}
            {recent.map(c => (
              <div key={c.id} className="p-3">
                <div className="flex items-center gap-2 text-[11px] mb-1">
                  <span className="text-muted-foreground">{c.source}</span>
                  {c.routed_to && <Pill tone="muted">{c.routed_to}</Pill>}
                  <span className="ml-auto text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm line-clamp-2">{c.raw_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

// ---------------- Weekly Commitments ----------------
function WeeklyCommitmentsPanel({
  thisWeek, lastWeekDone, lastWeekTotal, sections, onChange, syncSection,
}: {
  thisWeek: WeeklyCommitment[];
  lastWeekDone: number;
  lastWeekTotal: number;
  sections: BusinessSection[];
  onChange: () => void;
  syncSection: (slug: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [section, setSection] = useState(sections[0]?.slug ?? "monetisation");

  useEffect(() => {
    if (!sections.find(s => s.slug === section) && sections[0]) {
      setSection(sections[0].slug);
    }
  }, [sections, section]);

  async function add() {
    if (!text.trim()) return;
    await db.commitments.insert({ commitment: text.trim(), section_slug: section, status: "pending" });
    setText("");
    onChange();
  }

  async function setStatus(c: WeeklyCommitment, status: "done" | "missed" | "carried") {
    await db.commitments.update(c.id, {
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    });
    onChange();
    // Trigger Drive sync on done/missed
    if (status === "done" || status === "missed") {
      syncSection(c.section_slug).catch(err => console.error("Auto-sync after commitment failed", err));
    }
  }

  return (
    <Section title="This week's commitments">
      <div className="rounded-xl bg-card border border-border divide-y divide-border">
        {thisWeek.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No commitments yet for this week.</div>
        ) : thisWeek.map(c => {
          const sec = sections.find(s => s.slug === c.section_slug);
          return (
            <div key={c.id} className="p-3 flex items-center gap-2">
              <Pill tone="muted">{sec?.emoji} {sec?.title ?? c.section_slug}</Pill>
              <p className={`text-sm flex-1 ${c.status === "done" ? "line-through text-muted-foreground" : ""}`}>{c.commitment}</p>
              {c.status === "pending" ? (
                <div className="flex gap-1">
                  <button onClick={() => setStatus(c, "done")} className="h-7 w-7 rounded-md bg-emerald-500/15 text-emerald-500 flex items-center justify-center" title="Done"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setStatus(c, "missed")} className="h-7 w-7 rounded-md bg-red-500/15 text-red-500 flex items-center justify-center" title="Missed"><X className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setStatus(c, "carried")} className="h-7 px-2 rounded-md bg-secondary text-secondary-foreground text-[10px]" title="Carry">→</button>
                </div>
              ) : (
                <Pill tone={c.status === "done" ? "success" : c.status === "missed" ? "urgent" : "muted"}>{c.status}</Pill>
              )}
            </div>
          );
        })}
        <div className="p-3 flex gap-2">
          <select value={section} onChange={e => setSection(e.target.value)} className="h-8 rounded-md bg-secondary border border-border px-2 text-xs">
            {sections.map(s => <option key={s.slug} value={s.slug}>{s.emoji} {s.title}</option>)}
          </select>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") add(); }}
            placeholder="Add commitment for this week…"
            className="flex-1 h-8 rounded-md bg-secondary border border-border px-2 text-xs"
          />
          <button onClick={add} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add</button>
        </div>
        {lastWeekTotal > 0 && (
          <div className="p-2 text-[11px] text-muted-foreground text-center">
            Last week: {lastWeekDone}/{lastWeekTotal} done
          </div>
        )}
      </div>
    </Section>
  );
}

// ---------------- Section Card ----------------
function SectionCard({
  section, decisions, synthRunning, syncing, onChange, syncSection, pullSection,
}: {
  section: BusinessSection;
  decisions: Decision[];
  synthRunning: boolean;
  syncing: boolean;
  onChange: () => void;
  syncSection: (slug: string) => Promise<void>;
  pullSection: (slug: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showDecisions, setShowDecisions] = useState(false);
  const conf = section.confidence_score ?? 5;

  const synced = section.drive_synced_at;
  const hoursOld = synced ? (Date.now() - new Date(synced).getTime()) / 3_600_000 : null;
  const driveTone =
    syncing ? "text-primary"
    : !synced ? "text-muted-foreground"
    : (hoursOld ?? 0) <= 1 ? "text-emerald-500"
    : (hoursOld ?? 0) <= 24 ? "text-emerald-500"
    : "text-amber-500";
  const DriveIcon = !synced && !syncing ? CloudOff : Cloud;

  return (
    <div className="rounded-xl bg-card border border-border p-3 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <div className="text-2xl">{section.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{section.title}</h3>
            <Pill tone={statusPillTone(section.status)}>{section.status}</Pill>
            {synthRunning && <span className="text-[10px] text-primary inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Updating…</span>}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${confidenceTone(conf)}`} style={{ width: `${(conf / 10) * 100}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{conf}/10</span>
          </div>
        </div>
      </div>

      {section.ai_synthesis ? (
        <p className={`text-xs text-foreground/85 leading-relaxed ${expanded ? "" : "line-clamp-3"} cursor-pointer`} onClick={() => setExpanded(e => !e)}>
          {section.ai_synthesis}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">No synthesis yet — tap Synthesise above.</p>
      )}

      {section.next_action && (
        <p className="text-xs font-semibold text-foreground"> → {section.next_action}</p>
      )}

      {(section.blockers ?? []).length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {(section.blockers ?? []).map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 border border-red-500/30">
              <AlertTriangle className="h-2.5 w-2.5" />{b}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => setShowUpdate(true)} className="text-[11px] px-2 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">Update</button>
        <button onClick={() => setShowDecisions(true)} className="text-[11px] px-2 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
          Decisions ({decisions.length})
        </button>
      </div>

      {/* Drive status row */}
      <div className="mt-1 pt-2 border-t border-border flex items-center gap-2 text-[11px]">
        <button
          onClick={() => syncSection(section.slug)}
          disabled={syncing}
          title={synced ? "Sync to Drive" : "Create Drive doc"}
          className={`inline-flex items-center gap-1 ${driveTone} disabled:opacity-50`}
        >
          {syncing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <DriveIcon className="h-3.5 w-3.5" />}
          <span>{syncing ? "Syncing…" : synced ? `Synced ${timeAgo(synced)}` : "Never synced"}</span>
        </button>
        {section.drive_doc_url && (
          <a
            href={section.drive_doc_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            Open in Drive <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {section.drive_doc_id && (
          <button
            onClick={() => pullSection(section.slug)}
            disabled={syncing}
            title="Pull Drive doc into Mawson"
            className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Pull <ArrowDown className="h-3 w-3" />
          </button>
        )}
      </div>

      {showUpdate && (
        <UpdateDrawer
          section={section}
          onClose={() => setShowUpdate(false)}
          onSaved={() => {
            onChange();
            setShowUpdate(false);
            syncSection(section.slug).catch(err => console.error("Auto-sync after update failed", err));
          }}
        />
      )}
      {showDecisions && (
        <DecisionsDrawer
          section={section}
          decisions={decisions}
          onClose={() => setShowDecisions(false)}
          onSaved={() => {
            onChange();
            syncSection(section.slug).catch(err => console.error("Auto-sync after decision failed", err));
          }}
        />
      )}
    </div>
  );
}

// ---------------- Update Drawer ----------------
function UpdateDrawer({ section, onClose, onSaved }: { section: BusinessSection; onClose: () => void; onSaved: () => void }) {
  const [ownerSummary, setOwnerSummary] = useState(section.owner_summary ?? "");
  const [nextAction, setNextAction] = useState(section.next_action ?? "");
  const [confidence, setConfidence] = useState(section.confidence_score ?? 5);
  const [status, setStatus] = useState(section.status);
  const [blockers, setBlockers] = useState<string[]>(section.blockers ?? []);
  const [newBlocker, setNewBlocker] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await db.sections.update(section.slug, {
        owner_summary: ownerSummary,
        next_action: nextAction,
        confidence_score: confidence,
        status,
        blockers,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm flex items-end md:items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{section.emoji} {section.title}</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Owner summary</label>
            <textarea value={ownerSummary} onChange={e => setOwnerSummary(e.target.value)} rows={4} className="w-full mt-1 rounded-md bg-secondary border border-border p-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Next action</label>
            <input value={nextAction} onChange={e => setNextAction(e.target.value)} className="w-full mt-1 h-9 rounded-md bg-secondary border border-border px-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Confidence: {confidence}/10</label>
            <input type="range" min={1} max={10} value={confidence} onChange={e => setConfidence(Number(e.target.value))} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full mt-1 h-9 rounded-md bg-secondary border border-border px-2 text-sm">
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="parked">Parked</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Blockers</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {blockers.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-red-500/15 text-red-500 border border-red-500/30">
                  {b}
                  <button onClick={() => setBlockers(blockers.filter((_, j) => j !== i))} className="ml-1"><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input value={newBlocker} onChange={e => setNewBlocker(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newBlocker.trim()) { setBlockers([...blockers, newBlocker.trim()]); setNewBlocker(""); } }} placeholder="Add blocker…" className="flex-1 h-8 rounded-md bg-secondary border border-border px-2 text-xs" />
              <button onClick={() => { if (newBlocker.trim()) { setBlockers([...blockers, newBlocker.trim()]); setNewBlocker(""); } }} className="h-8 px-3 rounded-md bg-secondary text-secondary-foreground text-xs"><Plus className="h-3 w-3" /></button>
            </div>
          </div>
          <button onClick={save} disabled={saving} className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Decisions Drawer ----------------
function DecisionsDrawer({ section, decisions, onClose, onSaved }: { section: BusinessSection; decisions: Decision[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [decision, setDecision] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!title.trim() || !decision.trim()) return;
    setSaving(true);
    try {
      await db.decisions.insert({ title, decision, reasoning, alternatives, section_slug: section.slug });
      setTitle(""); setDecision(""); setReasoning(""); setAlternatives("");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm flex items-end md:items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{section.emoji} {section.title} — Decisions</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 mb-4">
          {decisions.length === 0 ? <p className="text-xs text-muted-foreground">No decisions logged yet.</p> : decisions.map(d => (
            <div key={d.id} className="rounded-md bg-secondary p-2">
              <p className="text-xs font-semibold">{d.title}</p>
              <p className="text-xs text-foreground/85 mt-1">{d.decision}</p>
              {d.reasoning && <p className="text-[11px] text-muted-foreground mt-1"><strong>Why:</strong> {d.reasoning}</p>}
              {d.alternatives && <p className="text-[11px] text-muted-foreground"><strong>Alternatives:</strong> {d.alternatives}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(d.made_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Log a decision</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full h-9 rounded-md bg-secondary border border-border px-2 text-sm" />
          <textarea value={decision} onChange={e => setDecision(e.target.value)} placeholder="What was decided" rows={2} className="w-full rounded-md bg-secondary border border-border p-2 text-sm" />
          <textarea value={reasoning} onChange={e => setReasoning(e.target.value)} placeholder="Reasoning (why)" rows={2} className="w-full rounded-md bg-secondary border border-border p-2 text-sm" />
          <textarea value={alternatives} onChange={e => setAlternatives(e.target.value)} placeholder="Alternatives considered" rows={2} className="w-full rounded-md bg-secondary border border-border p-2 text-sm" />
          <button onClick={add} disabled={saving} className="w-full h-9 rounded-md bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
            {saving ? "Saving…" : "Log decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Decision Log Panel ----------------
function DecisionLogPanel({ decisions, sections }: { decisions: Decision[]; sections: BusinessSection[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = decisions.filter(d => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.decision.toLowerCase().includes(q) ||
      (d.reasoning ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Section title="Decision log">
      <div className="rounded-xl bg-card border border-border">
        <button onClick={() => setOpen(o => !o)} className="w-full p-3 flex items-center justify-between text-sm font-medium">
          <span>{decisions.length} decision{decisions.length === 1 ? "" : "s"} logged</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {open && (
          <div className="border-t border-border">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search decisions…" className="w-full h-8 pl-7 pr-2 rounded-md bg-secondary border border-border text-xs" />
              </div>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground text-center">No decisions match.</p>
              ) : filtered.map(d => {
                const sec = sections.find(s => s.slug === d.section_slug);
                const isOpen = expandedId === d.id;
                return (
                  <div key={d.id} className="p-3">
                    <button onClick={() => setExpandedId(isOpen ? null : d.id)} className="w-full text-left flex items-start gap-2">
                      <Pill tone="muted">{sec?.emoji} {sec?.title ?? d.section_slug}</Pill>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{d.title}</p>
                        <p className={`text-xs text-foreground/85 mt-1 ${isOpen ? "" : "line-clamp-1"}`}>{d.decision}</p>
                        {isOpen && d.reasoning && <p className="text-[11px] text-muted-foreground mt-1"><strong>Why:</strong> {d.reasoning}</p>}
                        {isOpen && d.alternatives && <p className="text-[11px] text-muted-foreground"><strong>Alternatives:</strong> {d.alternatives}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(d.made_at).toLocaleDateString()}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

// ---------------- helpers ----------------
function ideaTouchesSection(idea: Idea, slug: string): boolean {
  const tags = (idea.tags ?? []).map(t => t.toLowerCase());
  const haystack = `${idea.title ?? ""} ${idea.summary ?? ""}`.toLowerCase();
  if (tags.includes(slug)) return true;
  return haystack.includes(slug);
}

// ---------------- Section Groups (4 clusters) ----------------
const SECTION_GROUPS: { label: string; tagline: string; slugs: string[] }[] = [
  { label: "Foundation", tagline: "What you are and who for", slugs: ["vision", "market", "brand", "messaging"] },
  { label: "Business", tagline: "How it works commercially", slugs: ["monetisation", "financial", "legal"] },
  { label: "Go To Market", tagline: "How you launch", slugs: ["gtm", "sales", "content"] },
  { label: "Build & Operate", tagline: "What exists and how you're doing", slugs: ["product", "mindset"] },
];

function groupHealth(items: BusinessSection[]): { tone: "green" | "amber" | "red"; label: string } {
  if (items.length === 0) return { tone: "amber", label: "—" };
  if (items.some(s => s.status === "blocked")) return { tone: "red", label: "Blocked" };
  if (items.some(s => (s.confidence_score ?? 5) < 7)) return { tone: "amber", label: "Needs work" };
  return { tone: "green", label: "On track" };
}

function SectionGroupsPanel({
  sections, decisions, synthRunningSlug, syncingSlug, syncSection, pullSection, onChange,
}: {
  sections: BusinessSection[];
  decisions: Decision[];
  synthRunningSlug: string | null;
  syncingSlug: string | null;
  syncSection: (slug: string) => Promise<void>;
  pullSection: (slug: string) => Promise<void>;
  onChange: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SECTION_GROUPS.map(g => [g.label, true]))
  );

  return (
    <Section title="Business sections">
      <div className="space-y-3">
        {SECTION_GROUPS.map(group => {
          const items = group.slugs
            .map(slug => sections.find(s => s.slug === slug))
            .filter((x): x is BusinessSection => Boolean(x));
          const health = groupHealth(items);
          const toneDot =
            health.tone === "green" ? "bg-emerald-500"
            : health.tone === "amber" ? "bg-amber-500"
            : "bg-red-500";
          const open = openGroups[group.label] !== false;
          return (
            <div key={group.label} className="rounded-xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => setOpenGroups(o => ({ ...o, [group.label]: !open }))}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${toneDot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{group.label}</h3>
                    <span className="text-[10px] text-muted-foreground">· {group.tagline}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {items.length} sections · {health.label}
                  </p>
                </div>
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
              {open && (
                <div className="border-t border-border p-3 grid grid-cols-1 lg:grid-cols-2 gap-3 bg-background/40">
                  {items.map(sec => (
                    <SectionCard
                      key={sec.id}
                      section={sec}
                      decisions={decisions.filter(d => d.section_slug === sec.slug)}
                      synthRunning={synthRunningSlug === sec.slug}
                      syncing={syncingSlug === sec.slug}
                      syncSection={syncSection}
                      pullSection={pullSection}
                      onChange={onChange}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// Stuck chat replaced by AskOrbitPanel.

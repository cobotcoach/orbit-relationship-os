import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { IdeaMode } from "./types";
import { IDEA_MODES } from "./types";

type ModeValue = IdeaMode | "all";

interface ModeCtx {
  mode: ModeValue;
  setMode: (m: ModeValue) => void;
  activeMode: IdeaMode | null;
  modeLabel: string;
  modeEmoji: string;
  modeAccent: string;
  captureOpen: boolean;
  openCapture: () => void;
  closeCapture: () => void;
}

const Ctx = createContext<ModeCtx | null>(null);
const STORAGE_KEY = "orbit.activeMode";

const MODE_META: Record<string, { description: string; accent: string; gradient: string; ring: string }> = {
  dobot: {
    description: "Day job. Partners, EMEA, channel.",
    accent: "oklch(0.72 0.18 240)",
    gradient: "linear-gradient(90deg, oklch(0.72 0.18 240 / 0.22), oklch(0.72 0.18 240 / 0.04))",
    ring: "oklch(0.72 0.18 240)",
  },
  cobot_coach: {
    description: "Your business. Build, launch, grow.",
    accent: "oklch(0.78 0.16 60)",
    gradient: "linear-gradient(90deg, oklch(0.78 0.16 60 / 0.22), oklch(0.78 0.16 60 / 0.04))",
    ring: "oklch(0.78 0.16 60)",
  },
  life: {
    description: "Everything else. Personal, home, finances.",
    accent: "oklch(0.78 0.18 150)",
    gradient: "linear-gradient(90deg, oklch(0.78 0.18 150 / 0.22), oklch(0.78 0.18 150 / 0.04))",
    ring: "oklch(0.78 0.18 150)",
  },
  wild: {
    description: "Blue sky. No filter. Just capture.",
    accent: "oklch(0.70 0.20 300)",
    gradient: "linear-gradient(90deg, oklch(0.70 0.20 300 / 0.22), oklch(0.70 0.20 300 / 0.04))",
    ring: "oklch(0.70 0.20 300)",
  },
};

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ModeValue>("dobot");
  const [captureOpen, setCaptureOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "all" || IDEA_MODES.some(m => m.value === stored))) {
        setModeState(stored as ModeValue);
      }
    } catch {/* ignore */}
  }, []);

  const setMode = (m: ModeValue) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {/* ignore */}
  };

  const openCapture = useCallback(() => setCaptureOpen(true), []);
  const closeCapture = useCallback(() => setCaptureOpen(false), []);

  const activeMode = mode === "all" ? null : mode;
  const meta = IDEA_MODES.find(m => m.value === mode);
  const modeLabel = mode === "all" ? "All modes" : meta?.label ?? mode;
  const modeEmoji = mode === "all" ? "✨" : meta?.emoji ?? "";
  const modeAccent = activeMode ? MODE_META[activeMode]?.accent ?? "var(--primary)" : "var(--primary)";

  return (
    <Ctx.Provider value={{ mode, setMode, activeMode, modeLabel, modeEmoji, modeAccent, captureOpen, openCapture, closeCapture }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMode(): ModeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMode must be used within ModeProvider");
  return v;
}

export function ModeIdentityBar() {
  const { mode, modeLabel, modeEmoji, activeMode } = useMode();
  const [open, setOpen] = useState(false);
  if (mode === "all" || !activeMode) return null;
  const meta = MODE_META[activeMode];
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-3 border-b border-border tap transition-colors hover:brightness-110"
        style={{ background: meta?.gradient, height: "var(--mode-bar-h, 40px)" }}
      >
        <span className="text-lg leading-none">{modeEmoji}</span>
        <span className="text-sm md:text-base font-bold tracking-tight" style={{ color: meta?.accent }}>
          {modeLabel}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">tap to switch</span>
      </button>
      {open && <ModeSheet onClose={() => setOpen(false)} />}
    </>
  );
}

export function ModeSheet({ onClose }: { onClose: () => void }) {
  const { mode, setMode } = useMode();
  return (
    <div
      className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-md flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-1 border border-border rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-1">Switch mode</h2>
        <p className="text-sm text-muted-foreground mb-5">Choose what you're working on</p>
        <div className="grid grid-cols-2 gap-3">
          {IDEA_MODES.map(m => {
            const active = mode === m.value;
            const meta = MODE_META[m.value];
            return (
              <button
                key={m.value}
                onClick={() => { setMode(m.value); onClose(); }}
                className="text-left rounded-xl p-4 border transition-all card-hover"
                style={{
                  background: active ? meta?.gradient : "var(--surface-2)",
                  borderColor: active ? meta?.accent : "var(--border)",
                  boxShadow: active ? `0 0 0 1px ${meta?.accent}, 0 8px 24px oklch(0 0 0 / 0.3)` : "none",
                  minHeight: 96,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl leading-none">{m.emoji}</span>
                  <span className="text-base font-bold" style={{ color: active ? meta?.accent : undefined }}>{m.label}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{meta?.description}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => { setMode("all"); onClose(); }}
            className="btn-ghost text-xs"
          >
            ✨ View all modes
          </button>
          <button onClick={onClose} className="btn-ghost text-xs">Close</button>
        </div>
      </div>
    </div>
  );
}

// Legacy compatibility — some pages may still import ModeSwitcher
export function ModeSwitcher() {
  return <ModeIdentityBar />;
}

export function ModeBadge({ className }: { className?: string }) {
  const { modeLabel, modeEmoji } = useMode();
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-surface-2 border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground ${className ?? ""}`}>
      <span>{modeEmoji}</span><span>Viewing: {modeLabel}</span>
    </span>
  );
}

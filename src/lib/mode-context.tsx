import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { IdeaMode } from "./types";

interface ModeCtx {
  mode: IdeaMode;
  setMode: (m: IdeaMode) => void;
  activeMode: IdeaMode;
  modeLabel: string;
  modeEmoji: string;
  modeAccent: string;
  captureOpen: boolean;
  openCapture: () => void;
  closeCapture: () => void;
}

const Ctx = createContext<ModeCtx | null>(null);
const STORAGE_KEY = "mawson.activeMode";

const META: Record<IdeaMode, { label: string; emoji: string; accent: string }> = {
  cobot_coach: { label: "Cobot Coach", emoji: "🩷", accent: "#ec4899" },
  wild:        { label: "Wild Ideas",  emoji: "🟣", accent: "#9333ea" },
};

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<IdeaMode>("cobot_coach");
  const [captureOpen, setCaptureOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "cobot_coach" || stored === "wild") {
        setModeState(stored);
      }
    } catch { /* ignore */ }
  }, []);

  const setMode = (m: IdeaMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  };

  const openCapture  = useCallback(() => setCaptureOpen(true), []);
  const closeCapture = useCallback(() => setCaptureOpen(false), []);

  const meta = META[mode];

  return (
    <Ctx.Provider value={{
      mode, setMode, activeMode: mode,
      modeLabel: meta.label, modeEmoji: meta.emoji, modeAccent: meta.accent,
      captureOpen, openCapture, closeCapture,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMode(): ModeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMode must be used within ModeProvider");
  return v;
}

export function ModeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useMode();
  return (
    <div className={`inline-flex items-center rounded-full bg-surface-2 border border-border p-0.5 ${className}`}>
      {(["cobot_coach", "wild"] as const).map(m => {
        const active = mode === m;
        const meta = META[m];
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              background: active ? meta.accent : "transparent",
              color: active ? "#ffffff" : "var(--muted-fg)",
              minHeight: 32,
            }}
          >
            {meta.emoji} {meta.label}
          </button>
        );
      })}
    </div>
  );
}

// Legacy shims so existing imports compile.
export function ModeIdentityBar() { return null; }
export function ModeSwitcher() { return <ModeToggle />; }
export function ModeBadge({ className = "" }: { className?: string }) {
  const { modeLabel, modeEmoji } = useMode();
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-surface-2 border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground ${className}`}>
      <span>{modeEmoji}</span><span>{modeLabel}</span>
    </span>
  );
}

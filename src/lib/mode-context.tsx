import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { IdeaMode } from "./types";
import { IDEA_MODES } from "./types";

type ModeValue = IdeaMode | "all";

interface ModeCtx {
  mode: ModeValue;
  setMode: (m: ModeValue) => void;
  activeMode: IdeaMode | null; // null when "all"
  modeLabel: string;
}

const Ctx = createContext<ModeCtx | null>(null);

const STORAGE_KEY = "orbit.activeMode";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ModeValue>("dobot");

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

  const activeMode = mode === "all" ? null : mode;
  const modeLabel = mode === "all"
    ? "All modes"
    : IDEA_MODES.find(m => m.value === mode)?.label ?? mode;

  return <Ctx.Provider value={{ mode, setMode, activeMode, modeLabel }}>{children}</Ctx.Provider>;
}

export function useMode(): ModeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMode must be used within ModeProvider");
  return v;
}

export function ModeSwitcher() {
  const { mode, setMode } = useMode();
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 py-1">
      {IDEA_MODES.map(m => {
        const active = mode === m.value;
        return (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            title={m.label}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors min-h-[36px] ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            <span className="text-sm leading-none">{m.emoji}</span>
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
      <button
        onClick={() => setMode("all")}
        className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border min-h-[36px] ${
          mode === "all"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:bg-muted"
        }`}
      >
        All
      </button>
    </div>
  );
}

import { create } from "zustand";

export type Mode = "boot" | "title" | "playing" | "paused" | "won" | "over";
export type RunKind = "week" | "endless";

type Patch = Partial<
  Pick<
    GameUi,
    | "score"
    | "best"
    | "lives"
    | "stamina"
    | "dayT"
    | "hint"
    | "nearCoop"
    | "level"
    | "runKind"
    | "hidden"
    | "spotted"
    | "canHide"
  >
>;

type GameUi = {
  mode: Mode;
  ready: boolean;
  score: number;
  best: number;
  lives: number;
  stamina: number;
  dayT: number;
  muted: boolean;
  hint: string;
  nearCoop: boolean;
  level: number;
  runKind: RunKind;
  hidden: boolean;
  spotted: boolean;
  canHide: boolean;
  setReady: (v: boolean) => void;
  setMode: (m: Mode) => void;
  patch: (p: Patch) => void;
  toggleMute: () => void;
};

const BEST_KEY = "cluckyard-best-v1";

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export function writeBest(score: number) {
  try {
    const best = Math.max(readBest(), score);
    localStorage.setItem(BEST_KEY, String(best));
    return best;
  } catch {
    return score;
  }
}

export const useGameUi = create<GameUi>((set, get) => ({
  mode: "title",
  ready: true,
  score: 0,
  best: 0,
  lives: 3,
  stamina: 1,
  dayT: 0,
  muted: false,
  hint: "",
  nearCoop: false,
  level: 1,
  runKind: "week",
  hidden: false,
  spotted: false,
  canHide: false,
  setReady: (v) => set({ ready: v, best: readBest() }),
  setMode: (mode) => set({ mode }),
  patch: (p) => set(p),
  toggleMute: () => set({ muted: !get().muted }),
}));

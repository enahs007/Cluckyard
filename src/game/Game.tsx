import { useEffect, useRef } from "react";
import { loadAssets, type Assets } from "./assets";
import {
  attachInput,
  clearInjectedKeys,
  pollActions,
  setInjectedKeys,
} from "./input";
import { cameraFollow, createSim, resetSim, stepSim, type Sim } from "./sim";
import { drawHud, drawWorld } from "./render";
import { resumeAudio, setMuted } from "./audio";
import { useGameUi } from "./store";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
      setSteer?: (v: number) => void;
      placeHen?: (x: number, y?: number) => void;
      getX?: () => number;
      getY?: () => number;
      getInCoop?: () => boolean;
      getLevel?: () => number;
    };
  }
}

const FIXED = 1 / 60;
let bootCmd: "play" | "attract" | null = null;

export function startRun() {
  bootCmd = "play";
  useGameUi.getState().setMode("playing");
  useGameUi.getState().patch({ score: 0, lives: 3, stamina: 1, dayT: 0, hint: "", nearCoop: false, level: 1 });
}

export function returnToTitle() {
  bootCmd = "attract";
  useGameUi.getState().setMode("title");
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const muted = useGameUi((s) => s.muted);

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let assets: Assets | null = null;
    const sim: Sim = createSim();
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    let running = true;
    const unbind = attachInput(canvas);

    window.__controlsTest = {
      getYaw: () => (sim.hen.facing === 1 ? 0 : Math.PI),
      getSpeed: () => Math.hypot(sim.hen.vx, sim.hen.vy),
      getX: () => sim.hen.x,
      getY: () => sim.hen.y,
      getInCoop: () => sim.hen.inCoop,
      getLevel: () => sim.level,
      setKeys: (codes: string[]) => {
        if (codes.length === 0) clearInjectedKeys();
        else setInjectedKeys(codes);
      },
      setSteer: (v: number) => {
        if (v > 0.2) setInjectedKeys(["KeyW", "KeyA"]);
        else if (v < -0.2) setInjectedKeys(["KeyW", "KeyD"]);
        else setInjectedKeys(["KeyW"]);
      },
      placeHen: (x: number, y?: number) => {
        sim.hen.x = x;
        if (y != null) sim.hen.y = y;
      },
    };

    const resize = () => {
      const parent = canvas.parentElement ?? document.body;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = parent.clientWidth || window.innerWidth;
      const h = parent.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const vis = () => {
      if (!document.hidden) resumeAudio();
    };
    document.addEventListener("visibilitychange", vis);

    useGameUi.getState().setReady(true);
    void loadAssets().then((a) => {
      assets = a;
      const mode = useGameUi.getState().mode;
      if (mode === "boot" || mode === "title") resetSim(sim, true);
    });

    const loop = (t: number) => {
      if (!running) return;
      const raw = Math.min(0.1, (t - last) / 1000);
      last = t;
      acc += raw;
      if (bootCmd === "play") {
        resetSim(sim, false);
        bootCmd = null;
      } else if (bootCmd === "attract") {
        resetSim(sim, true);
        bootCmd = null;
      }
      const mode = useGameUi.getState().mode;
      sim.running = mode === "playing";
      sim.attract = mode === "title" || mode === "boot";

      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      while (acc >= FIXED) {
        const actions = pollActions();
        if (actions.pausePressed && mode === "playing") useGameUi.getState().setMode("paused");
        else if (actions.pausePressed && mode === "paused") useGameUi.getState().setMode("playing");
        if (mode === "playing" || mode === "title" || mode === "boot" || mode === "paused") {
          if (mode !== "paused") stepSim(sim, actions, FIXED);
        }
        cameraFollow(sim, cssW, cssH, FIXED);
        acc -= FIXED;
      }

      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = "#14110e";
      ctx.fillRect(0, 0, cssW, cssH);
      if (assets) {
        drawWorld(ctx, assets, sim, cssW, cssH);
        drawHud(ctx, sim, cssW, cssH, mode);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", vis);
      unbind();
      delete window.__controlsTest;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ touchAction: "none" }}
    />
  );
}

import { House, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { GameCanvas, returnToTitle, startRun } from "@/game/Game";
import {
  isGameCode,
  releaseTouch,
  setTouchEnter,
  setTouchJump,
  setTouchMove,
  setTouchPeck,
} from "@/game/input";
import { unlockAudio } from "@/game/audio";
import { useGameUi } from "@/game/store";
import { MAX_LEVEL } from "@/game/sim";

type Scheme = "touch" | "keys";

function preferTouch() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  if (navigator.maxTouchPoints > 0 && window.matchMedia("(hover: none)").matches) return true;
  return window.matchMedia("(hover: none)").matches && window.innerWidth < 600;
}

function useControlScheme(): Scheme {
  const [scheme, setScheme] = useState<Scheme>(() => (preferTouch() ? "touch" : "keys"));

  useEffect(() => {
    const onPointer = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") setScheme("touch");
    };
    const onKey = (e: KeyboardEvent) => {
      if (!isGameCode(e.code)) return;
      setScheme("keys");
      releaseTouch();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return scheme;
}

export function GameShell() {
  const mode = useGameUi((s) => s.mode);
  const score = useGameUi((s) => s.score);
  const best = useGameUi((s) => s.best);
  const level = useGameUi((s) => s.level);
  const muted = useGameUi((s) => s.muted);
  const toggleMute = useGameUi((s) => s.toggleMute);
  const scheme = useControlScheme();

  const play = (kind: "week" | "endless" = "week") => {
    unlockAudio();
    startRun(kind);
  };

  return (
    <div className="relative z-0 h-dvh w-full overflow-hidden bg-bg text-fg">
      <GameCanvas />

      {mode === "boot" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70">
          <p className="font-display text-2xl tracking-tight text-fg">Loading the yard</p>
        </div>
      ) : null}

      {mode === "title" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-[max(2.5rem,env(safe-area-inset-bottom))] pointer-events-none">
          <div className="pointer-events-auto mb-auto mt-16 px-6 text-center sm:mt-20">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-muted">A farmyard hen</p>
            <h1 className="mt-2 font-display text-5xl font-medium tracking-tight text-fg sm:text-6xl">Cluckyard</h1>
            <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted sm:text-base">
              Peck grain, hide in a bush or tree, then get home before dusk. New hunters join every five days.
            </p>
          </div>
          <div className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-3 px-6">
            <Button onClick={() => play("week")} className="w-full">
              <Play className="size-4" strokeWidth={2} />
              Five dawns
            </Button>
            <Button variant="ghost" onClick={() => play("endless")} className="w-full">
              Endless yard
            </Button>
            <ControlsCard />
            <p className="text-center text-xs text-subtle">Best {best}</p>
          </div>
        </div>
      ) : null}

      {mode === "paused" ? (
        <Panel
          title="Paused"
          body={
            scheme === "keys"
              ? "Esc to resume. A / D walk, W flap, S peck, E home. Stand still in a bush or tree to hide."
              : "The yard waits. Stick to walk, Flap, Peck, Home at the coop. Hold still in a bush or tree to hide."
          }
          primary="Resume"
          onPrimary={() => useGameUi.getState().setMode("playing")}
          secondary="Yard"
          onSecondary={returnToTitle}
        />
      ) : null}

      {mode === "won" ? (
        <Panel
          title="Five dawns home"
          body={`You roosted every night. Grain ${score} · Best ${best}`}
          primary="Another week"
          onPrimary={() => play("week")}
          secondary="Yard"
          onSecondary={returnToTitle}
        />
      ) : null}

      {mode === "over" ? (
        <Panel
          title="Night on the yard"
          body={`Night fell on day ${level}. Grain ${score} · Best ${best}. Get home before dusk.`}
          primary="Try again"
          onPrimary={() => play(useGameUi.getState().runKind)}
          secondary="Yard"
          onSecondary={returnToTitle}
        />
      ) : null}

      {mode === "playing" ? (
        <>
          <button
            type="button"
            aria-label="Pause"
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-md border border-border bg-surface/80 text-fg backdrop-blur-sm"
            onClick={() => useGameUi.getState().setMode("paused")}
          >
            <Pause className="size-4" strokeWidth={2} />
          </button>
          {scheme === "touch" ? <TouchPad /> : <KeyLegend />}
          <HomePrompt scheme={scheme} />
          <HidePrompt scheme={scheme} />
        </>
      ) : null}

      <button
        type="button"
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute left-4 top-4 z-10 flex size-11 items-center justify-center rounded-md border border-border bg-surface/80 text-fg backdrop-blur-sm"
        onClick={toggleMute}
      >
        {muted ? <VolumeX className="size-4" strokeWidth={2} /> : <Volume2 className="size-4" strokeWidth={2} />}
      </button>
    </div>
  );
}

function ControlsCard() {
  return (
    <div className="w-full rounded-lg border border-border bg-surface/80 px-4 py-3 text-left text-xs leading-relaxed text-muted">
      <p>
        <span className="font-semibold text-fg">PC</span>
        <span className="ml-2">A / D walk · W or Space flap · S peck · E home · Esc pause</span>
      </p>
      <p className="mt-1.5">
        <span className="font-semibold text-fg">Phone</span>
        <span className="ml-2">Stick to walk · Flap · Peck · Home at the coop</span>
      </p>
      <p className="mt-1.5">
        <span className="font-semibold text-fg">Hide</span>
        <span className="ml-2">Stand still in a bush or tree. Hunters lose you until you move.</span>
      </p>
    </div>
  );
}

function KeyLegend() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <p className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-subtle">
        <span>
          <Kbd>A</Kbd> <Kbd>D</Kbd> walk
        </span>
        <span>
          <Kbd>W</Kbd> flap
        </span>
        <span>
          <Kbd>S</Kbd> peck
        </span>
        <span>
          <Kbd>E</Kbd> home
        </span>
        <span>
          <Kbd>Esc</Kbd> pause
        </span>
      </p>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <span className="mx-0.5 inline-flex min-w-5 items-center justify-center rounded-xs border border-border bg-elevated px-1.5 py-0.5 font-sans text-[11px] font-semibold text-fg">
      {children}
    </span>
  );
}

function Panel({
  title,
  body,
  primary,
  onPrimary,
  secondary,
  onSecondary,
}: {
  title: string;
  body: string;
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/55 px-5 pointer-events-auto">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-panel">
        <h2 className="font-display text-3xl font-medium tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={onPrimary} className="w-full">
            {primary}
          </Button>
          <Button variant="ghost" size="md" onClick={onSecondary} className="w-full">
            {secondary}
          </Button>
        </div>
      </div>
    </div>
  );
}

function hold(setter: (v: boolean) => void) {
  return {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setter(true);
    },
    onPointerUp: () => setter(false),
    onPointerCancel: () => setter(false),
  };
}

function TouchPad() {
  return (
    <div
      data-touch="1"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-4 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+1.25rem))] pt-8"
    >
      <div className="pointer-events-auto">
        <TouchStick />
      </div>
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <HomeBtn />
        <div className="flex gap-2">
          <PadBtn label="Peck" onHold={setTouchPeck} />
          <PadBtn label="Flap" wide onHold={setTouchJump} />
        </div>
      </div>
    </div>
  );
}

const STICK_TRAVEL = 38;
const STICK_DEADZONE = 0.16;

function TouchStick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);

  useEffect(() => {
    return () => setTouchMove(0);
  }, []);

  const steer = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const mag = Math.hypot(dx, dy) || 1;
    if (mag > STICK_TRAVEL) {
      dx = (dx / mag) * STICK_TRAVEL;
      dy = (dy / mag) * STICK_TRAVEL;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / STICK_TRAVEL;
    const ny = dy / STICK_TRAVEL;
    const m = Math.hypot(nx, ny);
    if (m < STICK_DEADZONE) {
      setTouchMove(0);
      return;
    }
    const scale = ((m - STICK_DEADZONE) / (1 - STICK_DEADZONE)) / m;
    setTouchMove(Math.max(-1, Math.min(1, nx * scale)));
  };

  const release = (id: number) => {
    if (pid.current !== id && pid.current !== null) return;
    pid.current = null;
    setHeld(false);
    setKnob({ x: 0, y: 0 });
    setTouchMove(0);
  };

  return (
    <div
      ref={baseRef}
      role="slider"
      aria-label="Move"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={Math.round((knob.x / STICK_TRAVEL) * 100) / 100}
      className="relative size-[8.5rem] touch-none select-none rounded-full border border-border bg-surface/75 shadow-panel"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pid.current = e.pointerId;
        setHeld(true);
        steer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        steer(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
    >
      <span className="pointer-events-none absolute inset-5 rounded-full border border-border/80" />
      <span
        className={`pointer-events-none absolute left-1/2 top-1/2 size-14 rounded-full border border-border bg-accent shadow-panel ${held ? "opacity-100" : "opacity-90"}`}
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
        }}
      />
    </div>
  );
}

function HomePrompt({ scheme }: { scheme: Scheme }) {
  const near = useGameUi((s) => s.nearCoop);
  const level = useGameUi((s) => s.level);
  const endless = useGameUi((s) => s.runKind) === "endless";
  if (!near) return null;
  const last = !endless && level >= MAX_LEVEL;
  const action = scheme === "keys" ? "Press E" : "tap Home";
  return (
    <p
      className={`pointer-events-none absolute inset-x-0 z-10 text-center font-display text-xl tracking-tight text-fg ${
        scheme === "touch"
          ? "bottom-[calc(11.5rem+env(safe-area-inset-bottom))]"
          : "bottom-16"
      }`}
    >
      {last ? `${action} — finish the week` : `${action} — start day ${level + 1}`}
    </p>
  );
}

function HidePrompt({ scheme }: { scheme: Scheme }) {
  const hidden = useGameUi((s) => s.hidden);
  const spotted = useGameUi((s) => s.spotted);
  const canHide = useGameUi((s) => s.canHide);
  const near = useGameUi((s) => s.nearCoop);
  if (near || (!hidden && !spotted && !canHide)) return null;
  const text = hidden ? "Hidden — they can't see you" : canHide ? "Hold still to hide" : "Spotted — duck into cover";
  const tone = hidden ? "text-sage" : spotted && !canHide ? "text-danger" : "text-fg";
  return (
    <p
      className={`pointer-events-none absolute inset-x-0 z-10 text-center font-display text-lg tracking-tight ${tone} ${
        scheme === "touch" ? "top-20" : "top-16"
      }`}
    >
      {text}
    </p>
  );
}

function HomeBtn() {
  const near = useGameUi((s) => s.nearCoop);
  return (
    <button
      type="button"
      aria-label="Enter coop"
      className={`flex h-12 min-w-36 items-center justify-center gap-2 rounded-lg border text-sm font-semibold backdrop-blur-sm ${
        near
          ? "border-border bg-accent text-accent-fg shadow-panel"
          : "border-border bg-surface/80 text-muted"
      }`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setTouchEnter(true);
      }}
      onClick={(e) => {
        e.preventDefault();
        setTouchEnter(true);
      }}
    >
      <House className="size-4" strokeWidth={2} />
      Home
    </button>
  );
}

function PadBtn({
  label,
  onHold,
  wide,
}: {
  label: string;
  onHold: (v: boolean) => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      className={`h-16 rounded-lg border border-border bg-surface/80 text-sm font-semibold text-fg backdrop-blur-sm ${wide ? "min-w-24 px-5" : "min-w-16 px-4"}`}
      {...hold(onHold)}
    >
      {label}
    </button>
  );
}

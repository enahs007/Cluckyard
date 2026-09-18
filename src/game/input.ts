export type Actions = {
  moveX: number;
  jump: boolean;
  jumpPressed: boolean;
  peck: boolean;
  peckPressed: boolean;
  pausePressed: boolean;
  enterPressed: boolean;
};

const GAME_CODES = new Set([
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "KeyP",
  "KeyE",
  "KeyH",
  "Space",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Escape",
]);

const keys = new Set<string>();
let injected: Set<string> | null = null;
let touchMoveX = 0;
let touchJump = false;
let touchPeck = false;
let touchEnter = false;
let prevJump = false;
let prevPeck = false;
let prevPause = false;
let prevEnter = false;

function activeKeys(): Set<string> {
  return injected ?? keys;
}

export function attachInput(target: HTMLElement) {
  const down = (e: KeyboardEvent) => {
    if (GAME_CODES.has(e.code)) e.preventDefault();
    keys.add(e.code);
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const clear = () => keys.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) keys.clear();
  });

  const cancel = (e: PointerEvent) => {
    if ((e.target as HTMLElement | null)?.closest("[data-touch]")) return;
  };
  target.addEventListener("pointercancel", cancel);

  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", clear);
  };
}

export function setInjectedKeys(codes: string[]) {
  injected = new Set(codes);
}

export function clearInjectedKeys() {
  injected = null;
}

export function setTouchMove(x: number) {
  touchMoveX = Math.max(-1, Math.min(1, x));
}

export function setTouchJump(v: boolean) {
  touchJump = v;
}

export function setTouchPeck(v: boolean) {
  touchPeck = v;
}

export function setTouchEnter(v: boolean) {
  if (v) touchEnter = true;
}

export function releaseTouch() {
  touchMoveX = 0;
  touchJump = false;
  touchPeck = false;
}

export function isGameCode(code: string) {
  return GAME_CODES.has(code);
}

export function pollActions(): Actions {
  const k = activeKeys();
  let moveX = 0;
  if (k.has("KeyA") || k.has("ArrowLeft")) moveX -= 1;
  if (k.has("KeyD") || k.has("ArrowRight")) moveX += 1;
  if (injected === null && touchMoveX !== 0) {
    moveX = Math.abs(touchMoveX) > Math.abs(moveX) ? touchMoveX : moveX;
  }
  const jump = k.has("Space") || k.has("KeyW") || k.has("ArrowUp") || (injected === null && touchJump);
  const peck = k.has("KeyS") || k.has("ArrowDown") || (injected === null && touchPeck);
  const pause = k.has("Escape") || k.has("KeyP");
  const enter = k.has("KeyE") || k.has("KeyH") || (injected === null && touchEnter);
  const actions: Actions = {
    moveX: Math.max(-1, Math.min(1, moveX)),
    jump,
    jumpPressed: jump && !prevJump,
    peck,
    peckPressed: peck && !prevPeck,
    pausePressed: pause && !prevPause,
    enterPressed: enter && !prevEnter,
  };
  prevJump = jump;
  prevPeck = peck;
  prevPause = pause;
  prevEnter = enter;
  if (touchEnter) touchEnter = false;
  return actions;
}

export function inputProbe() {
  return {
    getYaw: () => 0,
    getSpeed: () => 0,
    setKeys: (codes: string[]) => {
      if (codes.length === 0) clearInjectedKeys();
      else setInjectedKeys(codes);
    },
    setSteer: (v: number) => {
      if (v > 0.2) setInjectedKeys(["KeyW", "KeyA"]);
      else if (v < -0.2) setInjectedKeys(["KeyW", "KeyD"]);
      else setInjectedKeys(["KeyW"]);
    },
  };
}

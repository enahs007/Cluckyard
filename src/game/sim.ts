import type { Actions } from "./input";
import {
  sfxFlap,
  sfxHawk,
  sfxHurt,
  sfxLand,
  sfxPeck,
  sfxPickup,
} from "./audio";
import { useGameUi, writeBest } from "./store";

export const WORLD_W = 4000;
export const WORLD_H = 900;
export const GROUND_Y = 718;
export const DAY_LEN = 88;
export const MAX_LEVEL = 5;

const GRAVITY = 2050;
const FALL_G = 2680;
const GLIDE_G = 620;
const JUMP_V = -560;
const FLAP_UP = 340;
const FLAP_FWD = 70;
const FLAP_PERIOD = 0.086;
const MAX_STAMINA = 1;
const STAMINA_FLAP = 0.092;
const WALK = 235;
const AIR_ACCEL = 320;
const GROUND_ACCEL = 1600;
const FRICTION = 2100;
const TERMINAL = 780;
const COYOTE = 0.11;
const JUMP_BUF = 0.13;
const HEN_HW = 22;
const HEN_H = 50;

export type Kind = "ground" | "roof" | "hay" | "fence";

export type Platform = {
  x: number;
  y: number;
  w: number;
  h: number;
  oneWay: boolean;
  kind: Kind;
};

export type Grain = { x: number; y: number; taken: boolean; bob: number };
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  kind: "dust" | "feather" | "seed";
};

export type Hen = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  stamina: number;
  pitch: number;
  squash: number;
  anim: "idle" | "walk" | "peck" | "hop" | "flap" | "glide" | "land" | "hurt";
  frame: number;
  animT: number;
  coyote: number;
  jumpBuf: number;
  flapCd: number;
  peckT: number;
  landT: number;
  hurtT: number;
  invuln: number;
  inCoop: boolean;
};

export type Fox = {
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  state: "patrol" | "stalk" | "lunge";
  frame: number;
  t: number;
  lungeCd: number;
};

export type Hawk = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  state: "soar" | "dive" | "climb";
  frame: number;
  t: number;
  exposed: number;
};

export type Sim = {
  hen: Hen;
  foxes: Fox[];
  hawk: Hawk;
  plats: Platform[];
  grains: Grain[];
  particles: Particle[];
  score: number;
  lives: number;
  level: number;
  dayLen: number;
  dayT: number;
  trauma: number;
  camX: number;
  camY: number;
  running: boolean;
  attract: boolean;
  pop: { x: number; y: number; t: number; text: string } | null;
  banner: { text: string; sub: string; t: number } | null;
  shakeX: number;
  shakeY: number;
};

const COOP = { x: WORLD_W - 340, y: GROUND_Y - 210, w: 300, h: 210 };

function henBox(h: Hen) {
  return { x: h.x - HEN_HW, y: h.y - HEN_H, w: HEN_HW * 2, h: HEN_H };
}

export function atCoop(h: Hen) {
  return h.x > COOP.x - 40 && h.x < COOP.x + COOP.w - 12 && h.y >= COOP.y && h.y <= GROUND_Y + 4;
}

function dayLenFor(level: number) {
  return [88, 76, 66, 56, 48][Math.max(0, Math.min(MAX_LEVEL, level) - 1)] ?? 48;
}

function foxMul(level: number) {
  return 1 + (level - 1) * 0.14;
}

function spawnFoxes(level: number): Fox[] {
  const foxes: Fox[] = [
    { x: 1380, y: GROUND_Y, vx: -70, facing: -1, state: "patrol", frame: 0, t: 0, lungeCd: 0 },
  ];
  if (level >= 3) {
    foxes.push({ x: 2480, y: GROUND_Y, vx: 80, facing: 1, state: "patrol", frame: 1.2, t: 2.1, lungeCd: 0.4 });
  }
  return foxes;
}

function goHome(sim: Sim) {
  if (!sim.running) return;
  sim.hen.inCoop = true;
  sim.hen.vx = 0;
  sim.hen.vy = 0;
  const remain = Math.max(0, 1 - sim.dayT);
  const bonus = 50 + Math.round(remain * 40);
  sim.score += bonus;
  sim.pop = { x: sim.hen.x, y: sim.hen.y - 42, t: 0.9, text: `+${bonus}` };
  sfxPickup();
  if (sim.level >= MAX_LEVEL) {
    sim.running = false;
    const best = writeBest(sim.score);
    useGameUi.getState().patch({ score: sim.score, best, nearCoop: false, hint: "", level: sim.level });
    useGameUi.getState().setMode("won");
    return;
  }
  const score = sim.score;
  const lives = sim.lives;
  const next = sim.level + 1;
  loadYard(sim, next);
  sim.score = score;
  sim.lives = lives;
  sim.hen.invuln = 1.5;
  sim.banner = { text: `Day ${next}`, sub: next >= MAX_LEVEL ? "Last dawn — get home" : "A harder yard. Get home before dusk.", t: 2.4 };
  useGameUi.getState().patch({
    score,
    lives,
    dayT: 0,
    nearCoop: false,
    hint: "",
    level: next,
    stamina: 1,
  });
}

function aabb(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnHen(): Hen {
  return {
    x: 180,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    stamina: MAX_STAMINA,
    pitch: 0,
    squash: 1,
    anim: "idle",
    frame: 0,
    animT: 0,
    coyote: 0,
    jumpBuf: 0,
    flapCd: 0,
    peckT: 0,
    landT: 0,
    hurtT: 0,
    invuln: 0,
    inCoop: false,
  };
}

export function createLevel(level = 1): Pick<Sim, "plats" | "grains"> {
  const plats: Platform[] = [
    { x: -40, y: GROUND_Y, w: WORLD_W + 80, h: 220, oneWay: false, kind: "ground" },
    { x: COOP.x + 18, y: COOP.y + 18, w: COOP.w - 50, h: 18, oneWay: true, kind: "roof" },
  ];
  const hayX = [760, 1520, 2360, 3180];
  for (const x of hayX) {
    plats.push({ x: x + 18, y: GROUND_Y - 86, w: 108, h: 18, oneWay: true, kind: "hay" });
  }
  const fenceX = [1080, 1960, 2740];
  for (const x of fenceX) {
    plats.push({ x: x + 16, y: GROUND_Y - 118, w: 200, h: 14, oneWay: true, kind: "fence" });
  }

  const grains: Grain[] = [];
  const spots = [420, 640, 900, 1240, 1400, 1680, 1880, 2140, 2500, 2880, 3340, 3520];
  for (let i = 0; i < spots.length; i++) {
    grains.push({ x: spots[i], y: GROUND_Y - 10, taken: false, bob: i * 0.7 });
  }
  grains.push({ x: 860, y: GROUND_Y - 96, taken: false, bob: 1 });
  grains.push({ x: 1620, y: GROUND_Y - 96, taken: false, bob: 2 });
  grains.push({ x: 1180, y: GROUND_Y - 128, taken: false, bob: 3 });
  if (level >= 2) {
    grains.push({ x: 1080, y: GROUND_Y - 10, taken: false, bob: 4 });
    grains.push({ x: 2700, y: GROUND_Y - 10, taken: false, bob: 5 });
  }
  if (level >= 4) {
    grains.push({ x: 1960, y: GROUND_Y - 128, taken: false, bob: 6 });
    grains.push({ x: 3180, y: GROUND_Y - 96, taken: false, bob: 7 });
  }
  return { plats, grains };
}

function loadYard(sim: Sim, level: number) {
  const { plats, grains } = createLevel(level);
  sim.level = level;
  sim.dayLen = dayLenFor(level);
  sim.hen = spawnHen();
  sim.foxes = spawnFoxes(level);
  sim.hawk = { x: 1100, y: 170, vx: 110, vy: 0, facing: 1, state: "soar", frame: 0, t: 0, exposed: 0 };
  sim.plats = plats;
  sim.grains = grains;
  sim.particles = [];
  sim.dayT = 0;
  sim.trauma = 0;
  sim.pop = null;
  sim.camX = 0;
  sim.camY = 80;
  sim.shakeX = 0;
  sim.shakeY = 0;
}

export function createSim(): Sim {
  const { plats, grains } = createLevel(1);
  return {
    hen: spawnHen(),
    foxes: spawnFoxes(1),
    hawk: { x: 900, y: 168, vx: 110, vy: 0, facing: 1, state: "soar", frame: 0, t: 0, exposed: 0 },
    plats,
    grains,
    particles: [],
    score: 0,
    lives: 3,
    level: 1,
    dayLen: dayLenFor(1),
    dayT: 0,
    trauma: 0,
    camX: 0,
    camY: 80,
    running: false,
    attract: true,
    pop: null,
    banner: null,
    shakeX: 0,
    shakeY: 0,
  };
}

export function resetSim(sim: Sim, attract = false) {
  loadYard(sim, 1);
  sim.score = 0;
  sim.lives = 3;
  sim.running = !attract;
  sim.attract = attract;
  sim.banner = attract ? null : { text: "Day 1", sub: "Get home before dusk.", t: 2.2 };
}

function emit(sim: Sim, kind: Particle["kind"], x: number, y: number, n: number, facing = 1) {
  for (let i = 0; i < n; i++) {
    const ang = kind === "feather" ? -1.2 + Math.random() * 2.4 : -Math.PI / 2 + (Math.random() - 0.5);
    const sp = kind === "dust" ? 40 + Math.random() * 70 : 80 + Math.random() * 140;
    sim.particles.push({
      x,
      y,
      vx: Math.cos(ang) * sp * (kind === "dust" ? facing : 1),
      vy: Math.sin(ang) * sp - (kind === "feather" ? 40 : 0),
      life: 1,
      max: 0.35 + Math.random() * 0.45,
      size: kind === "feather" ? 5 + Math.random() * 5 : 2 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 8,
      kind,
    });
  }
}

function resolveHen(sim: Sim, prevBottom: number) {
  const h = sim.hen;
  const box = henBox(h);
  h.grounded = false;
  for (const p of sim.plats) {
    if (!aabb(box, p)) continue;
    if (p.oneWay) {
      if (h.vy < 0) continue;
      if (prevBottom > p.y + 8) continue;
      h.y = p.y;
      h.vy = 0;
      h.grounded = true;
      continue;
    }
    const overlapX = Math.min(box.x + box.w, p.x + p.w) - Math.max(box.x, p.x);
    const overlapY = Math.min(box.y + box.h, p.y + p.h) - Math.max(box.y, p.y);
    if (overlapY <= overlapX + 0.5) {
      if (h.vy >= 0 && box.y + box.h - overlapY <= p.y + 12) {
        h.y = p.y;
        h.vy = 0;
        h.grounded = true;
      } else if (h.vy < 0) {
        h.y = p.y + p.h + HEN_H;
        h.vy = 0;
      }
    } else {
      if (h.x < p.x + p.w / 2) h.x = p.x - HEN_HW;
      else h.x = p.x + p.w + HEN_HW;
      h.vx = 0;
    }
  }
}

function syncUi(sim: Sim, hint = "") {
  const mode = useGameUi.getState().mode;
  if (mode !== "playing" && mode !== "paused") return;
  useGameUi.getState().patch({
    score: sim.score,
    lives: sim.lives,
    stamina: sim.hen.stamina,
    dayT: sim.dayT,
    level: sim.level,
    hint,
  });
}

function catchHen(sim: Sim) {
  if (sim.hen.invuln > 0 || sim.hen.hurtT > 0) return;
  sim.hen.hurtT = 0.7;
  sim.hen.invuln = 1.6;
  sim.hen.anim = "hurt";
  sim.hen.vy = -220;
  sim.hen.vx = -sim.hen.facing * 180;
  sim.lives -= 1;
  sim.trauma = Math.min(1, sim.trauma + 0.55);
  emit(sim, "feather", sim.hen.x, sim.hen.y - 28, 14, sim.hen.facing);
  sfxHurt();
  if (sim.lives <= 0) {
    sim.running = false;
    const best = writeBest(sim.score);
    useGameUi.getState().patch({ lives: 0, score: sim.score, best });
    useGameUi.getState().setMode("over");
  } else {
    syncUi(sim, "Back at the start — try again");
  }
}

export function stepSim(sim: Sim, actions: Actions, dt: number) {
  const h = sim.hen;
  const attract = sim.attract && !sim.running;

  if (sim.pop) {
    sim.pop.t -= dt;
    if (sim.pop.t <= 0) sim.pop = null;
  }

  if (sim.banner) {
    sim.banner.t -= dt;
    if (sim.banner.t <= 0) sim.banner = null;
  }

  let moveX = actions.moveX;
  let jump = actions.jump;
  let jumpPressed = actions.jumpPressed;
  let peck = actions.peck;

  if (attract) {
    h.stamina = MAX_STAMINA;
    const phase = (sim.foxes[0]?.t ?? 0) % 8;
    moveX = phase < 3 ? 0.6 : phase < 5 ? 0 : -0.4;
    jump = phase > 5.2 && phase < 6.4;
    jumpPressed = jump && h.grounded;
    peck = phase > 3.1 && phase < 4.2;
  } else if (sim.running) {
    sim.dayT = Math.min(1, sim.dayT + dt / sim.dayLen);
  }

  if (h.hurtT > 0) {
    h.hurtT -= dt;
    moveX = 0;
    jump = false;
    jumpPressed = false;
    peck = false;
    if (h.hurtT <= 0 && sim.lives > 0) {
      h.x = 180;
      h.y = GROUND_Y;
      h.vx = 0;
      h.vy = 0;
      h.stamina = MAX_STAMINA;
      h.invuln = 1.2;
    }
  }

  h.invuln = Math.max(0, h.invuln - dt);
  h.flapCd = Math.max(0, h.flapCd - dt);
  h.coyote = h.grounded ? COYOTE : Math.max(0, h.coyote - dt);
  if (jumpPressed) h.jumpBuf = JUMP_BUF;
  else h.jumpBuf = Math.max(0, h.jumpBuf - dt);

  if (h.peckT > 0) {
    h.peckT -= dt;
    moveX *= 0.15;
  }

  if (moveX > 0.12) h.facing = 1;
  else if (moveX < -0.12) h.facing = -1;

  const accel = h.grounded ? GROUND_ACCEL : AIR_ACCEL;
  const want = moveX * WALK * (h.grounded ? 1 : 0.92);
  if (Math.abs(want) > 8) {
    if (h.vx < want) h.vx = Math.min(want, h.vx + accel * dt);
    else h.vx = Math.max(want, h.vx - accel * dt);
  } else if (h.grounded) {
    const s = Math.sign(h.vx);
    h.vx -= s * FRICTION * dt;
    if (Math.sign(h.vx) !== s) h.vx = 0;
  } else {
    h.vx *= Math.exp(-0.4 * dt);
  }

  const canHop = (h.grounded || h.coyote > 0) && h.jumpBuf > 0 && h.peckT <= 0 && h.landT <= 0;
  if (canHop) {
    h.vy = JUMP_V;
    h.grounded = false;
    h.coyote = 0;
    h.jumpBuf = 0;
    h.anim = "hop";
    h.squash = 1.18;
    emit(sim, "dust", h.x, h.y, 5, h.facing);
  }

  const airborne = !h.grounded;
  let flapping = false;
  if (airborne && jump && h.stamina > 0.02 && h.hurtT <= 0) {
    if (h.flapCd <= 0) {
      h.vy = Math.min(h.vy, 40) - FLAP_UP;
      h.vx += h.facing * FLAP_FWD;
      h.stamina = Math.max(0, h.stamina - STAMINA_FLAP);
      h.flapCd = FLAP_PERIOD;
      h.anim = "flap";
      flapping = true;
      emit(sim, "feather", h.x, h.y - 30, 1, h.facing);
      if (!attract) sfxFlap();
    } else {
      flapping = h.anim === "flap";
    }
  }

  const gliding = airborne && jump && h.stamina <= 0.02;
  let g = GRAVITY;
  if (airborne) {
    if (flapping) g = GRAVITY * 0.55;
    else if (gliding) g = GLIDE_G;
    else if (h.vy > 0) g = FALL_G;
  }
  h.vy += g * dt;
  if (h.vy > TERMINAL) h.vy = TERMINAL;
  if (gliding) h.vx += h.facing * 18 * dt;

  if (h.grounded) h.stamina = Math.min(MAX_STAMINA, h.stamina + dt * 0.72);
  else if (gliding) h.stamina = Math.min(MAX_STAMINA, h.stamina + dt * 0.04);

  if (h.grounded && peck && h.peckT <= 0 && h.landT <= 0 && Math.abs(h.vx) < 40) {
    h.peckT = 0.42;
    h.anim = "peck";
    h.frame = 0;
    if (!attract) sfxPeck();
  }

  const prevBottom = h.y;
  h.x += h.vx * dt;
  h.y += h.vy * dt;
  if (h.x < 40) {
    h.x = 40;
    h.vx = 0;
  }
  if (h.x > WORLD_W - 40) {
    h.x = WORLD_W - 40;
    h.vx = 0;
  }

  const wasAir = airborne;
  resolveHen(sim, prevBottom);

  if (h.grounded && wasAir && h.vy >= 0) {
    const hard = h.vy > 380;
    h.landT = hard ? 0.28 : 0.18;
    h.squash = hard ? 0.72 : 0.84;
    h.anim = "land";
    h.frame = 0;
    emit(sim, "dust", h.x, h.y, hard ? 8 : 4, h.facing);
    if (!attract) sfxLand(hard);
    if (hard) sim.trauma = Math.min(1, sim.trauma + 0.22);
  }

  if (h.landT > 0) h.landT -= dt;
  h.squash += (1 - h.squash) * (1 - Math.exp(-12 * dt));
  const targetPitch = h.grounded ? 0 : Math.max(-0.5, Math.min(0.62, -h.vy / 820));
  h.pitch += (targetPitch - h.pitch) * (1 - Math.exp(-10 * dt));

  h.inCoop = atCoop(h);
  if (sim.running && !attract) {
    const ui = useGameUi.getState();
    if (ui.mode === "playing" && ui.nearCoop !== h.inCoop) {
      ui.patch({ nearCoop: h.inCoop, hint: h.inCoop ? (sim.level >= MAX_LEVEL ? "Home — finish the week" : "Home — next day") : "" });
    }
    if (actions.enterPressed && h.inCoop && h.hurtT <= 0) goHome(sim);
  }

  if (h.peckT > 0.12 && h.peckT < 0.28) {
    for (const g0 of sim.grains) {
      if (g0.taken) continue;
      if (Math.abs(h.x - g0.x) < 36 && Math.abs(h.y - g0.y) < 40) {
        g0.taken = true;
        sim.score += 10;
        sim.pop = { x: g0.x, y: g0.y - 30, t: 0.7, text: "+10" };
        emit(sim, "seed", g0.x, g0.y, 8);
        if (!attract) sfxPickup();
        syncUi(sim);
      }
    }
  }

  h.animT += dt;
  if (h.hurtT > 0) h.anim = "hurt";
  else if (h.peckT > 0) h.anim = "peck";
  else if (h.landT > 0) h.anim = "land";
  else if (!h.grounded) {
    if (flapping) h.anim = "flap";
    else if (gliding) h.anim = "glide";
    else if (h.vy < -80) h.anim = "hop";
    else h.anim = "glide";
  } else if (Math.abs(h.vx) > 18) h.anim = "walk";
  else h.anim = "idle";

  const fps =
    h.anim === "flap" ? 18 : h.anim === "walk" ? 10 : h.anim === "peck" ? 9 : h.anim === "land" ? 12 : h.anim === "glide" ? 8 : 5;
  h.frame += fps * dt;

  for (const g0 of sim.grains) g0.bob += dt;

  stepFox(sim, dt, attract);
  stepHawk(sim, dt, attract);

  for (const p of sim.particles) {
    p.life -= dt / p.max;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 420 * dt;
    p.rot += p.vr * dt;
  }
  sim.particles = sim.particles.filter((p) => p.life > 0).slice(-80);

  const shake = sim.trauma * sim.trauma;
  sim.shakeX = (Math.random() * 2 - 1) * shake * 14;
  sim.shakeY = (Math.random() * 2 - 1) * shake * 10;
  sim.trauma = Math.max(0, sim.trauma - dt * 1.8);

  if (sim.running && sim.dayT >= 1) {
    if (h.inCoop) goHome(sim);
    else {
      sim.running = false;
      const best = writeBest(sim.score);
      useGameUi.getState().patch({ score: sim.score, best, dayT: 1, nearCoop: false });
      useGameUi.getState().setMode("over");
    }
  }
}

function stepFox(sim: Sim, dt: number, attract: boolean) {
  const mul = foxMul(sim.level);
  for (const f of sim.foxes) stepOneFox(sim, f, dt, attract, mul);
}

function stepOneFox(sim: Sim, f: Fox, dt: number, attract: boolean, mul: number) {
  const h = sim.hen;
  f.t += dt;
  f.lungeCd = Math.max(0, f.lungeCd - dt);
  const dist = h.x - f.x;
  const close = Math.abs(dist) < 240 && h.grounded && !h.inCoop && h.y > GROUND_Y - 20;
  const reach = Math.abs(dist) < 70 && h.grounded && !h.inCoop && Math.abs(h.y - f.y) < 30;

  if (attract) {
    f.state = "patrol";
  } else if (reach && f.lungeCd <= 0) {
    f.state = "lunge";
  } else if (close) {
    f.state = "stalk";
  } else {
    f.state = "patrol";
  }

  if (f.state === "patrol") {
    if (f.x < 480) f.facing = 1;
    if (f.x > COOP.x - 220) f.facing = -1;
    f.vx = f.facing * 78 * mul;
  } else if (f.state === "stalk") {
    f.facing = dist > 0 ? 1 : -1;
    f.vx = f.facing * 150 * mul;
  } else {
    f.facing = dist > 0 ? 1 : -1;
    f.vx = f.facing * 280 * mul;
    f.lungeCd = 0.9;
  }
  f.x += f.vx * dt;
  f.y = GROUND_Y;
  f.frame += (f.state === "lunge" ? 12 : 7) * dt;

  if (!attract && sim.running && reach && h.invuln <= 0) catchHen(sim);
}

function stepHawk(sim: Sim, dt: number, attract: boolean) {
  const k = sim.hawk;
  const h = sim.hen;
  k.t += dt;
  const high = !h.grounded && h.y < GROUND_Y - 150 && !h.inCoop;
  if (high) k.exposed += dt;
  else k.exposed = Math.max(0, k.exposed - dt * 0.6);

  const exposeNeed = Math.max(0.28, 0.85 - (sim.level - 1) * 0.13);
  const diveSp = 420 + (sim.level - 1) * 42;

  if (attract) k.state = "soar";
  else if (k.state === "soar" && k.exposed > exposeNeed && sim.running) {
    k.state = "dive";
    sfxHawk();
  } else if (k.state === "dive" && (h.grounded || h.inCoop || k.y > GROUND_Y - 70)) {
    k.state = "climb";
  } else if (k.state === "climb" && k.y < 180) {
    k.state = "soar";
    k.vy = 0;
  }

  if (k.state === "soar") {
    if (k.x < 200) k.facing = 1;
    if (k.x > WORLD_W - 200) k.facing = -1;
    k.vx = k.facing * (130 + sim.level * 8);
    k.y += Math.sin(k.t * 1.6) * 18 * dt;
    k.vy = 0;
  } else if (k.state === "dive") {
    const dx = h.x - k.x;
    const dy = h.y - 40 - k.y;
    const m = Math.hypot(dx, dy) || 1;
    k.vx = (dx / m) * diveSp;
    k.vy = (dy / m) * diveSp;
    k.facing = k.vx >= 0 ? 1 : -1;
  } else {
    k.vy = -210;
    k.vx *= 0.96;
    k.facing = k.vx >= 0 ? 1 : -1;
  }
  k.x += k.vx * dt;
  k.y += k.vy * dt;
  k.frame += (k.state === "dive" ? 14 : 7) * dt;

  const hit = Math.hypot(k.x - h.x, k.y - (h.y - 28)) < 46;
  if (!attract && sim.running && k.state === "dive" && hit && h.invuln <= 0) catchHen(sim);
}

export function cameraFollow(sim: Sim, viewW: number, viewH: number, dt: number) {
  const h = sim.hen;
  const lookX = h.x + h.facing * 90 + h.vx * 0.12;
  const lookY = h.y - 210;
  const tx = lookX - viewW * 0.45;
  const ty = lookY - viewH * 0.42;
  sim.camX += (tx - sim.camX) * (1 - Math.exp(-4.2 * dt));
  sim.camY += (ty - sim.camY) * (1 - Math.exp(-3.4 * dt));
  sim.camX = Math.max(0, Math.min(WORLD_W - viewW, sim.camX));
  sim.camY = Math.max(0, Math.min(WORLD_H - viewH, sim.camY));
}

export { COOP, henBox };

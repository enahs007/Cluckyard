import { drawSheet, type Assets } from "./assets";
import { COOP, GROUND_Y, MAX_LEVEL, WORLD_W, type Sim } from "./sim";

function henSheet(assets: Assets, anim: Sim["hen"]["anim"]) {
  switch (anim) {
    case "walk":
      return assets.henWalk;
    case "peck":
      return assets.henPeck;
    case "flap":
    case "hop":
    case "hurt":
      return assets.henFly;
    case "glide":
      return assets.henGlide;
    case "land":
      return assets.henLand;
    default:
      return assets.henIdle;
  }
}

export function drawWorld(ctx: CanvasRenderingContext2D, assets: Assets, sim: Sim, w: number, h: number) {
  const camX = sim.camX + sim.shakeX;
  const camY = sim.camY + sim.shakeY;
  const dusk = Math.max(0, (sim.dayT - 0.55) / 0.45);

  ctx.drawImage(assets.sky, 0, 0, w, h);

  const farX = -camX * 0.18;
  ctx.drawImage(assets.far, farX, -camY * 0.12 - 20, assets.far.width * (h / assets.far.height) * 1.15, h * 1.05);
  ctx.drawImage(
    assets.far,
    farX + assets.far.width * (h / assets.far.height) * 1.15 - 2,
    -camY * 0.12 - 20,
    assets.far.width * (h / assets.far.height) * 1.15,
    h * 1.05,
  );

  const midX = -camX * 0.42;
  const midH = h * 0.92;
  ctx.globalAlpha = 0.92;
  ctx.drawImage(assets.mid, midX, h - midH - camY * 0.2 + 40, assets.mid.width * (midH / assets.mid.height), midH);
  ctx.drawImage(
    assets.mid,
    midX + assets.mid.width * (midH / assets.mid.height) - 2,
    h - midH - camY * 0.2 + 40,
    assets.mid.width * (midH / assets.mid.height),
    midH,
  );
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(-camX, -camY);

  const gh = 210;
  const gw = assets.ground.width * (gh / assets.ground.height);
  for (let x = -40; x < WORLD_W + 80; x += gw - 1) {
    ctx.drawImage(assets.ground, x, GROUND_Y - 36, gw, gh);
  }

  ctx.drawImage(assets.coop, COOP.x, COOP.y - 18, COOP.w, COOP.h + 28);
  ctx.save();
  ctx.font = "700 28px Fraunces, Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(20,17,14,0.45)";
  ctx.fillText("Home", COOP.x + COOP.w * 0.52, COOP.y - 22);
  ctx.fillStyle = "#ece6db";
  ctx.fillText("Home", COOP.x + COOP.w * 0.52, COOP.y - 24);
  ctx.restore();

  for (const p of sim.plats) {
    if (p.kind === "hay") ctx.drawImage(assets.hay, p.x - 16, p.y - 70, 140, 120);
    if (p.kind === "fence") ctx.drawImage(assets.fence, p.x - 12, p.y - 8, p.w + 28, 130);
  }

  for (const g of sim.grains) {
    if (g.taken) continue;
    const bob = Math.sin(g.bob * 2.4) * 3;
    ctx.drawImage(assets.grain, g.x - 22, g.y - 28 + bob, 44, 36);
  }

  drawFox(ctx, assets, sim);
  drawHawk(ctx, assets, sim);
  drawHen(ctx, assets, sim);
  drawParticles(ctx, sim);

  if (sim.pop) {
    ctx.globalAlpha = Math.min(1, sim.pop.t * 2);
    ctx.fillStyle = "#f4efe6";
    ctx.font = "600 18px Nunito Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(sim.pop.text, sim.pop.x, sim.pop.y - (0.7 - sim.pop.t) * 28);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  if (dusk > 0) {
    ctx.fillStyle = `rgba(92, 38, 18, ${dusk * 0.38})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawHen(ctx: CanvasRenderingContext2D, assets: Assets, sim: Sim) {
  const hen = sim.hen;
  const sheet = henSheet(assets, hen.anim);
  const dw = 108;
  const dh = 96;
  const blink = hen.invuln > 0 && Math.floor(hen.invuln * 16) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.45;
  ctx.save();
  ctx.translate(hen.x, hen.y);
  ctx.scale(hen.facing, 1);
  ctx.rotate(hen.pitch);
  ctx.scale(2 - hen.squash, hen.squash);
  drawSheet(ctx, sheet, Math.floor(hen.frame), -dw * 0.52, -dh + 6, dw, dh);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFox(ctx: CanvasRenderingContext2D, assets: Assets, sim: Sim) {
  const dw = 150;
  const dh = 92;
  for (const f of sim.foxes) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.facing, 1);
    drawSheet(ctx, assets.fox, Math.floor(f.frame), -dw * 0.45, -dh + 8, dw, dh);
    ctx.restore();
  }
}

function drawHawk(ctx: CanvasRenderingContext2D, assets: Assets, sim: Sim) {
  const k = sim.hawk;
  const dw = 150;
  const dh = 100;
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.scale(k.facing, 1);
  const tilt = k.state === "dive" ? 0.5 : k.state === "climb" ? -0.25 : 0.08;
  ctx.rotate(tilt);
  drawSheet(ctx, assets.hawk, Math.floor(k.frame), -dw * 0.5, -dh * 0.5, dw, dh);
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, sim: Sim) {
  for (const p of sim.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === "feather") {
      ctx.fillStyle = "#a33b24";
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "seed") {
      ctx.fillStyle = "#d6a441";
      ctx.fillRect(-p.size * 0.4, -p.size * 0.4, p.size, p.size * 0.7);
    } else {
      ctx.fillStyle = "#c4b48a";
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawHud(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, mode: string) {
  if (mode !== "playing" && mode !== "paused") return;
  const pad = 18;
  const top = 62;
  ctx.save();
  ctx.font = "600 13px Nunito Sans, sans-serif";
  ctx.fillStyle = "rgba(20,17,14,0.55)";
  roundRect(ctx, pad, top, 210, 76, 14);
  ctx.fill();

  ctx.fillStyle = "#f4efe6";
  ctx.font = "600 12px Nunito Sans, sans-serif";
  ctx.fillText("Wings", pad + 14, top + 22);
  const barX = pad + 58;
  const barY = top + 12;
  const barW = 136;
  ctx.fillStyle = "#3a342c";
  roundRect(ctx, barX, barY, barW, 10, 4);
  ctx.fill();
  ctx.fillStyle = "#ece6db";
  roundRect(ctx, barX, barY, barW * Math.max(0, sim.hen.stamina), 10, 4);
  ctx.fill();

  ctx.fillStyle = "#f4efe6";
  ctx.font = "600 14px Nunito Sans, sans-serif";
  ctx.fillText(`Grain  ${sim.score}`, pad + 14, top + 48);
  ctx.font = "500 12px Nunito Sans, sans-serif";
  ctx.fillStyle = "#b7aea0";
  ctx.fillText(`Day ${sim.level}/${MAX_LEVEL}`, pad + 14, top + 62);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < sim.lives ? "#a33b24" : "#3a342c";
    ctx.beginPath();
    ctx.ellipse(pad + 128 + i * 18, top + 44, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const remain = Math.max(0, 1 - sim.dayT);
  const remainSec = remain * sim.dayLen;
  const mins = Math.floor(remainSec / 60);
  const secs = Math.floor(remainSec % 60);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(20,17,14,0.55)";
  roundRect(ctx, w - pad - 148, top, 148, 40, 14);
  ctx.fill();
  ctx.fillStyle = "#f4efe6";
  ctx.font = "500 13px Nunito Sans, sans-serif";
  ctx.fillText(sim.dayT > 0.78 ? "Dusk — get home" : "Until dusk", w - pad - 14, top + 16);
  ctx.font = "600 16px Nunito Sans, sans-serif";
  ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, w - pad - 14, top + 34);

  if (sim.banner && sim.banner.t > 0) {
    const fade = Math.min(1, sim.banner.t, sim.banner.t > 0.45 ? 1 : sim.banner.t / 0.45);
    ctx.textAlign = "center";
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#f4efe6";
    ctx.font = "600 40px Fraunces, Georgia, serif";
    ctx.fillText(sim.banner.text, w / 2, h * 0.26);
    ctx.font = "500 14px Nunito Sans, sans-serif";
    ctx.fillStyle = "#b7aea0";
    ctx.fillText(sim.banner.sub, w / 2, h * 0.26 + 28);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

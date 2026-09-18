export type Sheet = {
  img: HTMLImageElement;
  cols: number;
  rows: number;
};

export type Assets = {
  henIdle: Sheet;
  henWalk: Sheet;
  henFly: Sheet;
  henPeck: Sheet;
  henGlide: Sheet;
  henLand: Sheet;
  fox: Sheet;
  hawk: Sheet;
  coop: HTMLImageElement;
  hay: HTMLImageElement;
  grain: HTMLImageElement;
  fence: HTMLImageElement;
  sky: HTMLImageElement;
  far: HTMLImageElement;
  mid: HTMLImageElement;
  ground: HTMLImageElement;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function sheet(src: string, cols: number, rows: number): Promise<Sheet> {
  return { img: await loadImage(src), cols, rows };
}

export async function loadAssets(): Promise<Assets> {
  const [
    henIdle,
    henWalk,
    henFly,
    henPeck,
    henGlide,
    henLand,
    fox,
    hawk,
    coop,
    hay,
    grain,
    fence,
    sky,
    far,
    mid,
    ground,
  ] = await Promise.all([
    sheet("/sprites/hen/idle.png", 2, 2),
    sheet("/sprites/hen/walk.png", 3, 2),
    sheet("/sprites/hen/fly.png", 4, 2),
    sheet("/sprites/hen/peck.png", 2, 2),
    sheet("/sprites/hen/glide.png", 2, 2),
    sheet("/sprites/hen/land.png", 2, 2),
    sheet("/sprites/fox/walk.png", 2, 2),
    sheet("/sprites/hawk/soar.png", 2, 2),
    loadImage("/sprites/props/coop.png"),
    loadImage("/sprites/props/hay.png"),
    loadImage("/sprites/props/grain.png"),
    loadImage("/sprites/props/fence.png"),
    loadImage("/map/sky.png"),
    loadImage("/map/far.png"),
    loadImage("/map/mid.png"),
    loadImage("/map/ground.png"),
  ]);
  return {
    henIdle,
    henWalk,
    henFly,
    henPeck,
    henGlide,
    henLand,
    fox,
    hawk,
    coop,
    hay,
    grain,
    fence,
    sky,
    far,
    mid,
    ground,
  };
}

export function drawSheet(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  frame: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const { img, cols, rows } = sheet;
  const cw = img.width / cols;
  const ch = img.height / rows;
  const total = cols * rows;
  const f = ((frame % total) + total) % total;
  const c = f % cols;
  const r = Math.floor(f / cols);
  ctx.drawImage(img, c * cw, r * ch, cw, ch, dx, dy, dw, dh);
}

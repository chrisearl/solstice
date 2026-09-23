import * as THREE from "three";
import type { BodyId, PlanetId } from "./orrery.ts";

export type PlanetTextureTheme = "night" | "davinci";
export type PlanetTextureId = PlanetId | "moon";

const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 256;

/** Saturn ring plane tilt — iconic oblique view. */
export const SATURN_RING_TILT = (26.7 * Math.PI) / 180;
export const SATURN_RING_YAW = 0.35;

const textureCache = new Map<string, THREE.CanvasTexture>();

interface CanvasContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

function createCanvas(): CanvasContext {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create planet texture canvas.");
  return { ctx, width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT };
}

function uv(u: number, v: number, c: CanvasContext): { x: number; y: number } {
  return { x: u * c.width, y: v * c.height };
}

function fillBase(c: CanvasContext, color: string) {
  c.ctx.fillStyle = color;
  c.ctx.fillRect(0, 0, c.width, c.height);
}

function fillFeatureBase(c: CanvasContext) {
  fillBase(c, "#f2e8d4");
}

function drawNightBand(
  c: CanvasContext,
  vCenter: number,
  vHeight: number,
  color: string,
  alpha = 1,
) {
  const { ctx, height, width } = c;
  const y = vCenter * height - (vHeight * height) / 2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, y, width, vHeight * height);
  ctx.globalAlpha = 1;
}

function drawNightBlob(
  c: CanvasContext,
  uCenter: number,
  vCenter: number,
  uRadius: number,
  vRadius: number,
  color: string,
) {
  const center = uv(uCenter, vCenter, c);
  c.ctx.fillStyle = color;
  c.ctx.beginPath();
  c.ctx.ellipse(
    center.x,
    center.y,
    uRadius * c.width,
    vRadius * c.height,
    0,
    0,
    Math.PI * 2,
  );
  c.ctx.fill();
}

function drawFeatureStroke(
  c: CanvasContext,
  stroke: string,
  lineWidth: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const { ctx } = c;
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  draw(ctx);
  ctx.restore();
}

function drawFeatureFill(c: CanvasContext, fill: string, draw: (ctx: CanvasRenderingContext2D) => void) {
  const { ctx } = c;
  ctx.save();
  ctx.fillStyle = fill;
  draw(ctx);
  ctx.restore();
}

function finalizeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function paintMercuryNight(c: CanvasContext) {
  fillBase(c, "#9a9590");
  for (let i = 0; i < 28; i++) {
    const u = (i * 37) % 100 / 100;
    const v = (i * 53) % 100 / 100;
    drawNightBlob(c, u, v, 0.025 + (i % 5) * 0.004, 0.02, "#6f6a66");
  }
}

function paintMercuryDavinci(c: CanvasContext) {
  fillFeatureBase(c);
  for (let i = 0; i < 22; i++) {
    const center = uv((i * 41) % 100 / 100, (i * 59) % 100 / 100, c);
    const r = 4 + (i % 4) * 2;
    drawFeatureStroke(c, "#3a2412", 1.1, (ctx) => {
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}

function paintVenusNight(c: CanvasContext) {
  fillBase(c, "#d8c4a0");
  drawNightBand(c, 0.35, 0.08, "#c9ae82", 0.7);
  drawNightBand(c, 0.55, 0.1, "#e8d5b3", 0.55);
  const { ctx, width, height } = c;
  ctx.strokeStyle = "rgba(180, 150, 110, 0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const y = height * (0.25 + i * 0.12);
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(width * 0.3, y - 18, width * 0.7, y + 18, width, y);
    ctx.stroke();
  }
}

function paintVenusDavinci(c: CanvasContext) {
  fillFeatureBase(c);
  const { width, height } = c;
  for (let i = 0; i < 6; i++) {
    drawFeatureStroke(c, "#3a2412", 1, (ctx) => {
      const y = height * (0.22 + i * 0.11);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.25, y - 14, width * 0.75, y + 14, width, y - 4);
      ctx.stroke();
    });
  }
}

function paintEarthNight(c: CanvasContext) {
  fillBase(c, "#1a4f7a");
  drawNightBlob(c, 0.22, 0.38, 0.11, 0.18, "#3d8a52");
  drawNightBlob(c, 0.3, 0.55, 0.07, 0.14, "#4a9458");
  drawNightBlob(c, 0.52, 0.34, 0.09, 0.12, "#3f8f4c");
  drawNightBlob(c, 0.72, 0.42, 0.08, 0.16, "#458f53");
  drawNightBlob(c, 0.84, 0.58, 0.05, 0.1, "#3d8650");
  drawNightBlob(c, 0.12, 0.72, 0.06, 0.08, "#4a9458");
  drawNightBlob(c, 0.48, 0.78, 0.04, 0.06, "#3d8a52");
}

function paintEarthDavinci(c: CanvasContext) {
  fillFeatureBase(c);
  const continents = [
    { u: 0.22, v: 0.38, ur: 0.11, vr: 0.18 },
    { u: 0.3, v: 0.55, ur: 0.07, vr: 0.14 },
    { u: 0.52, v: 0.34, ur: 0.09, vr: 0.12 },
    { u: 0.72, v: 0.42, ur: 0.08, vr: 0.16 },
    { u: 0.84, v: 0.58, ur: 0.05, vr: 0.1 },
  ];
  for (const land of continents) {
    const center = uv(land.u, land.v, c);
    drawFeatureStroke(c, "#3a2412", 1.4, (ctx) => {
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, land.ur * c.width, land.vr * c.height, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    });
    drawFeatureFill(c, "rgba(58, 36, 18, 0.12)", (ctx) => {
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, land.ur * c.width * 0.85, land.vr * c.height * 0.85, 0.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function paintMarsNight(c: CanvasContext) {
  fillBase(c, "#a63d24");
  drawNightBlob(c, 0.5, 0.08, 0.14, 0.05, "#e8ddd0");
  drawNightBlob(c, 0.5, 0.92, 0.12, 0.04, "#e8ddd0");
  drawNightBand(c, 0.45, 0.04, "#8c3218", 0.5);
  drawNightBand(c, 0.62, 0.05, "#7a2a12", 0.45);
}

function paintMarsDavinci(c: CanvasContext) {
  fillFeatureBase(c);
  drawFeatureStroke(c, "#3a2412", 1.2, (ctx) => {
    const top = uv(0.5, 0.08, c);
    const bottom = uv(0.5, 0.92, c);
    ctx.beginPath();
    ctx.arc(top.x, top.y, 18, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bottom.x, bottom.y, 16, Math.PI, Math.PI * 2);
    ctx.stroke();
  });
  drawNightBand(c, 0.45, 0.035, "rgba(58, 36, 18, 0.25)");
  drawNightBand(c, 0.64, 0.04, "rgba(58, 36, 18, 0.2)");
}

function paintJupiterNight(c: CanvasContext) {
  fillBase(c, "#c9955a");
  const bands = ["#b87f45", "#d4a56a", "#a87238", "#ddb882", "#9c6830"];
  bands.forEach((color, index) => {
    drawNightBand(c, 0.18 + index * 0.14, 0.07, color, 0.85);
  });
  drawNightBlob(c, 0.62, 0.58, 0.07, 0.05, "#b84a38");
}

function paintJupiterDavinci(c: CanvasContext) {
  fillFeatureBase(c);
  for (let i = 0; i < 7; i++) {
    drawFeatureStroke(c, "#3a2412", 1.1, (ctx) => {
      const y = c.height * (0.16 + i * 0.11);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(c.width, y + (i % 2 === 0 ? 3 : -3));
      ctx.stroke();
    });
  }
  const spot = uv(0.62, 0.58, c);
  drawFeatureStroke(c, "#3a2412", 1.3, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, 22, 14, 0.3, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function paintSaturnNight(c: CanvasContext) {
  fillBase(c, "#e2cf94");
  drawNightBand(c, 0.35, 0.06, "#d4bc78", 0.7);
  drawNightBand(c, 0.52, 0.05, "#c9ad66", 0.65);
  drawNightBand(c, 0.68, 0.06, "#dcc486", 0.6);
}

function paintSaturnDavinci(c: CanvasContext) {
  fillFeatureBase(c);
  for (let i = 0; i < 5; i++) {
    drawFeatureStroke(c, "#3a2412", 1, (ctx) => {
      const y = c.height * (0.28 + i * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(c.width, y);
      ctx.stroke();
    });
  }
}

function paintUranusNight(c: CanvasContext) {
  fillBase(c, "#8ec4d4");
  drawNightBand(c, 0.42, 0.08, "#7ab5c8", 0.45);
  drawNightBand(c, 0.58, 0.07, "#9ed0de", 0.35);
}

function paintUranusDavinci(c: CanvasContext) {
  fillFeatureBase(c);
  const { width, height } = c;
  for (let i = 0; i < 8; i++) {
    drawFeatureStroke(c, "rgba(58, 36, 18, 0.55)", 0.9, (ctx) => {
      const x = width * (0.15 + i * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, height * 0.2);
      ctx.lineTo(x + 8, height * 0.8);
      ctx.stroke();
    });
  }
}

function paintNeptuneNight(c: CanvasContext) {
  fillBase(c, "#2f4fa8");
  drawNightBlob(c, 0.38, 0.44, 0.06, 0.04, "#4a6fd0");
  drawNightBand(c, 0.55, 0.05, "#3a5fbe", 0.4);
}

function paintNeptuneDavinci(c: CanvasContext) {
  fillFeatureBase(c);
  const storm = uv(0.38, 0.44, c);
  drawFeatureStroke(c, "#3a2412", 1.2, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(storm.x, storm.y, 20, 14, 0.4, 0, Math.PI * 2);
    ctx.stroke();
  });
  drawFeatureStroke(c, "#3a2412", 0.9, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(storm.x - 26, storm.y);
    ctx.lineTo(storm.x - 40, storm.y - 6);
    ctx.stroke();
  });
}

function paintMoonNight(c: CanvasContext) {
  fillBase(c, "#b8b8b8");
  for (let i = 0; i < 18; i++) {
    drawNightBlob(c, (i * 29) % 100 / 100, (i * 47) % 100 / 100, 0.02, 0.018, "#8a8a8a");
  }
}

function paintMoonDavinci(c: CanvasContext) {
  fillFeatureBase(c);
  for (let i = 0; i < 14; i++) {
    const center = uv((i * 31) % 100 / 100, (i * 43) % 100 / 100, c);
    drawFeatureStroke(c, "#3a2412", 1, (ctx) => {
      ctx.beginPath();
      ctx.arc(center.x, center.y, 3 + (i % 3), 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}

const NIGHT_PAINTERS: Record<PlanetTextureId, (c: CanvasContext) => void> = {
  mercury: paintMercuryNight,
  venus: paintVenusNight,
  earth: paintEarthNight,
  mars: paintMarsNight,
  jupiter: paintJupiterNight,
  saturn: paintSaturnNight,
  uranus: paintUranusNight,
  neptune: paintNeptuneNight,
  moon: paintMoonNight,
};

const DAVINCI_PAINTERS: Record<PlanetTextureId, (c: CanvasContext) => void> = {
  mercury: paintMercuryDavinci,
  venus: paintVenusDavinci,
  earth: paintEarthDavinci,
  mars: paintMarsDavinci,
  jupiter: paintJupiterDavinci,
  saturn: paintSaturnDavinci,
  uranus: paintUranusDavinci,
  neptune: paintNeptuneDavinci,
  moon: paintMoonDavinci,
};

function createPlanetTexture(id: PlanetTextureId, theme: PlanetTextureTheme): THREE.CanvasTexture {
  const canvasContext = createCanvas();
  if (theme === "night") {
    NIGHT_PAINTERS[id](canvasContext);
  } else {
    DAVINCI_PAINTERS[id](canvasContext);
  }
  return finalizeTexture(canvasContext.ctx.canvas);
}

export function getPlanetTexture(id: PlanetTextureId, theme: PlanetTextureTheme): THREE.CanvasTexture {
  const key = `${theme}:${id}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const texture = createPlanetTexture(id, theme);
  textureCache.set(key, texture);
  return texture;
}

export function planetTextureId(bodyId: BodyId): PlanetTextureId | null {
  if (bodyId === "sun") return null;
  return bodyId;
}

const ringTextureCache = new Map<PlanetTextureTheme, THREE.CanvasTexture>();

function createRingTexture(theme: PlanetTextureTheme): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create Saturn ring texture.");

  if (theme === "night") {
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, "#c8b476");
    gradient.addColorStop(0.2, "#ddd0a0");
    gradient.addColorStop(0.45, "#b8a468");
    gradient.addColorStop(0.55, "#2a2418");
    gradient.addColorStop(0.58, "#d8cc98");
    gradient.addColorStop(0.78, "#c4b078");
    gradient.addColorStop(1, "#b09e62");
    ctx.fillStyle = gradient;
  } else {
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, "#3a2412");
    gradient.addColorStop(0.25, "#5a3d22");
    gradient.addColorStop(0.48, "#2b190d");
    gradient.addColorStop(0.52, "rgba(223, 205, 173, 0)");
    gradient.addColorStop(0.56, "#4a3018");
    gradient.addColorStop(1, "#3a2412");
    ctx.fillStyle = gradient;
  }
  ctx.fillRect(0, 0, size, 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function getSaturnRingTexture(theme: PlanetTextureTheme): THREE.CanvasTexture {
  const cached = ringTextureCache.get(theme);
  if (cached) return cached;
  const texture = createRingTexture(theme);
  ringTextureCache.set(theme, texture);
  return texture;
}

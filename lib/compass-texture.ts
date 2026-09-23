import * as THREE from "three";
import { HORIZON_RATIO } from "@/lib/solar";

/**
 * Etched compass rose for the horizon disc.
 * Canvas north is the top of the image, which maps to world +Z.
 */
export function createCompassTexture(): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not draw the compass rose.");
  }

  const center = size / 2;
  const radius = center - 12;

  ctx.clearRect(0, 0, size, size);

  const fill = ctx.createRadialGradient(center, center, radius * 0.1, center, center, radius);
  fill.addColorStop(0, "#1a2130");
  fill.addColorStop(0.55, "#121722");
  fill.addColorStop(1, "#0b0e14");
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();

  const pointAt = (bearing: number, distance: number) => {
    const angle = (bearing * Math.PI) / 180;
    return {
      x: center + Math.sin(angle) * distance,
      y: center - Math.cos(angle) * distance,
    };
  };

  const strokeRing = (scale: number, color: string, width: number) => {
    ctx.beginPath();
    ctx.arc(center, center, radius * scale, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  for (const scale of [0.28, 0.5, 0.72]) {
    strokeRing(scale * HORIZON_RATIO, "rgba(196, 206, 220, 0.16)", 2);
  }
  strokeRing(HORIZON_RATIO, "rgba(232, 224, 208, 0.55)", 4);
  strokeRing(0.985, "rgba(186, 198, 214, 0.28)", 3);

  const crossExtent = radius * 0.12;
  ctx.beginPath();
  ctx.moveTo(center, center - crossExtent);
  ctx.lineTo(center, center + crossExtent);
  ctx.moveTo(center - crossExtent, center);
  ctx.lineTo(center + crossExtent, center);
  ctx.strokeStyle = "rgba(186, 198, 214, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const innerFleurRadius = radius * 0.28 * HORIZON_RATIO;
  for (const bearing of [45, 135, 225, 315]) {
    const pos = pointAt(bearing, innerFleurRadius);
    const size = radius * 0.008;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - size);
    ctx.lineTo(pos.x + size, pos.y);
    ctx.lineTo(pos.x, pos.y + size);
    ctx.lineTo(pos.x - size, pos.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(196, 206, 220, 0.35)";
    ctx.fill();
  }

  for (let bearing = 0; bearing < 360; bearing += 10) {
    if (bearing % 30 === 0) continue;
    const mid = bearing % 30 === 10 || bearing % 30 === 20;
    const tickLen = radius * (mid ? 0.014 : 0.009);
    const ringR = radius * HORIZON_RATIO;
    const inner = pointAt(bearing, ringR - tickLen);
    const outer = pointAt(bearing, ringR + tickLen);
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.strokeStyle = mid ? "rgba(196, 206, 220, 0.32)" : "rgba(186, 198, 214, 0.18)";
    ctx.lineWidth = mid ? 2 : 1;
    ctx.stroke();
  }

  for (let bearing = 0; bearing < 360; bearing += 30) {
    const inner = pointAt(bearing, radius * 0.04);
    const outer = pointAt(bearing, radius * HORIZON_RATIO);
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.strokeStyle =
      bearing % 90 === 0 ? "rgba(220, 214, 200, 0.2)" : "rgba(186, 198, 214, 0.08)";
    ctx.lineWidth = bearing % 90 === 0 ? 2 : 1;
    ctx.stroke();
  }

  for (let bearing = 0; bearing < 360; bearing += 5) {
    const major = bearing % 30 === 0;
    const mid = bearing % 10 === 0;
    const inner = pointAt(bearing, radius * (major ? 0.9 : mid ? 0.935 : 0.955));
    const outer = pointAt(bearing, radius * 0.985);
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.strokeStyle = major
      ? "rgba(236, 230, 218, 0.8)"
      : "rgba(196, 206, 220, 0.28)";
    ctx.lineWidth = major ? 4 : mid ? 2.5 : 1.5;
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(244, 239, 230, 0.92)";

  const cardinals: Array<[number, string, number]> = [
    [0, "N", 78],
    [90, "E", 72],
    [180, "S", 72],
    [270, "W", 72],
  ];
  for (const [bearing, label, fontSize] of cardinals) {
    const pos = pointAt(bearing, radius * 0.84);
    ctx.font = `600 ${fontSize}px ui-sans-serif, sans-serif`;
    ctx.fillStyle = bearing === 0 ? "rgba(255, 214, 140, 0.95)" : "rgba(236, 231, 220, 0.88)";
    ctx.fillText(label, pos.x, pos.y);
  }

  ctx.font = "500 34px ui-sans-serif, sans-serif";
  ctx.fillStyle = "rgba(196, 206, 220, 0.55)";
  for (const [bearing, label] of [
    [45, "NE"],
    [135, "SE"],
    [225, "SW"],
    [315, "NW"],
  ] as const) {
    const pos = pointAt(bearing, radius * 0.8);
    ctx.fillText(label, pos.x, pos.y);
  }

  ctx.font = "500 26px ui-sans-serif, sans-serif";
  ctx.fillStyle = "rgba(186, 196, 210, 0.45)";
  for (let bearing = 0; bearing < 360; bearing += 30) {
    if (bearing % 90 === 0) continue;
    const pos = pointAt(bearing, radius * 0.7);
    ctx.fillText(String(bearing), pos.x, pos.y);
  }

  const north = pointAt(0, radius * 0.945);
  ctx.beginPath();
  ctx.moveTo(north.x, north.y - 28);
  ctx.lineTo(north.x - 16, north.y + 18);
  ctx.lineTo(north.x + 16, north.y + 18);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 186, 72, 0.9)";
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

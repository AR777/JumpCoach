import type { PosePoint } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function percentile(values: number[], p: number): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const index = clamp(p, 0, 1) * (sorted.length - 1);
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low]!;
  return lerp(sorted[low]!, sorted[high]!, index - low);
}

/** Interior angle at `b`, in degrees, from 0 to 180. A straight knee is 180. */
export function jointAngleDeg(a: PosePoint, b: PosePoint, c: PosePoint): number | null {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (mag < 1e-8) return null;
  const cos = clamp((v1x * v2x + v1y * v2y) / mag, -1, 1);
  return rad2deg(Math.acos(cos));
}

/**
 * Trunk angle from vertical. Positive means the shoulders are ahead of the hips
 * (forward lean, in the run direction).
 */
export function trunkLeanDeg(hip: PosePoint, shoulder: PosePoint): number | null {
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y;
  if (Math.hypot(dx, dy) < 1e-8) return null;
  return rad2deg(Math.atan2(dx, dy));
}

/** 0 = thigh horizontal and forward. Positive = knee above that line. */
export function thighAboveHorizontalDeg(hip: PosePoint, knee: PosePoint): number | null {
  const dx = knee.x - hip.x;
  const dy = knee.y - hip.y;
  if (Math.hypot(dx, dy) < 1e-8) return null;
  return rad2deg(Math.atan2(dy, dx));
}

/** Hip-to-ankle distance that produces a given interior knee angle. */
export function distanceForKnee(kneeDeg: number, thigh: number, shank: number): number {
  const knee = deg2rad(clamp(kneeDeg, 20, 180));
  const d2 = thigh * thigh + shank * shank - 2 * thigh * shank * Math.cos(knee);
  return Math.sqrt(Math.max(0.04, d2));
}

export function scoreAgainstRange(
  value: number,
  min: number,
  max: number,
  tolerance: number,
): number {
  if (!Number.isFinite(value)) return 0;
  if (value >= min && value <= max) return 100;
  const distance = value < min ? min - value : value - max;
  if (tolerance <= 0) return 0;
  return clamp(100 * (1 - distance / tolerance), 0, 100);
}

export function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

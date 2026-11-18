import type { LandmarkName, PoseFrame, PosePoint, Side } from "./types";

const MIN_CONFIDENCE = 0.2;

export function readPoint(frame: PoseFrame, name: LandmarkName): PosePoint | null {
  const point = frame.points?.[name];
  if (!point || point.c < MIN_CONFIDENCE) return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return point;
}

export function midpoint(a: PosePoint, b: PosePoint): PosePoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, c: Math.min(a.c, b.c) };
}

export function hipCenter(frame: PoseFrame): PosePoint | null {
  const left = readPoint(frame, "left_hip");
  const right = readPoint(frame, "right_hip");
  if (left && right) return midpoint(left, right);
  return left ?? right;
}

export function shoulderCenter(frame: PoseFrame): PosePoint | null {
  const left = readPoint(frame, "left_shoulder");
  const right = readPoint(frame, "right_shoulder");
  if (left && right) return midpoint(left, right);
  return left ?? right;
}

export function lowerAnkle(frame: PoseFrame): { side: Side; point: PosePoint } | null {
  const left = readPoint(frame, "left_ankle");
  const right = readPoint(frame, "right_ankle");
  if (!left && !right) return null;
  if (left && right) return left.y <= right.y ? { side: "left", point: left } : { side: "right", point: right };
  return left ? { side: "left", point: left } : { side: "right", point: right! };
}

/** Flip x when the hips travel backward, so +x is the run direction. */
export function normalizeRunDirection(frames: PoseFrame[]): { frames: PoseFrame[]; mirrored: boolean } {
  const hips = frames
    .map((frame) => hipCenter(frame))
    .filter((point): point is PosePoint => point != null);
  if (hips.length < 2) return { frames, mirrored: false };
  const delta = hips[hips.length - 1]!.x - hips[0]!.x;
  if (delta >= 0) return { frames, mirrored: false };
  return {
    mirrored: true,
    frames: frames.map((frame) => {
      if (!frame.points) return frame;
      const points: NonNullable<PoseFrame["points"]> = {};
      for (const [name, point] of Object.entries(frame.points)) {
        if (!point) continue;
        points[name as LandmarkName] = { ...point, x: -point.x };
      }
      return { ...frame, points };
    }),
  };
}

export function otherSide(side: Side): Side {
  return side === "left" ? "right" : "left";
}

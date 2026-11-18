import { METRICS } from "./config/ranges";
import { hipCenter, lowerAnkle, otherSide, readPoint, shoulderCenter } from "./geometry";
import { jointAngleDeg, rad2deg, scoreAgainstRange, thighAboveHorizontalDeg, trunkLeanDeg } from "./math";
import type { MetricResult, PhaseMarks, PoseFrame, PosePoint, Side } from "./types";

function at(frames: PoseFrame[], index: number): PoseFrame | null {
  if (index < 0 || index >= frames.length) return null;
  return frames[index] ?? null;
}

function timeOf(frames: PoseFrame[], index: number): number | null {
  return at(frames, index)?.timeSec ?? null;
}

function sidePoint(frame: PoseFrame, side: Side, joint: "hip" | "knee" | "ankle"): PosePoint | null {
  return readPoint(frame, `${side}_${joint}`);
}

function takeoffSide(frames: PoseFrame[], marks: PhaseMarks, hinted: Side | null): Side | null {
  if (hinted) return hinted;
  const frame = at(frames, marks.plant);
  return frame ? (lowerAnkle(frame)?.side ?? null) : null;
}

function measure(
  id: MetricResult["id"],
  frames: PoseFrame[],
  marks: PhaseMarks,
  side: Side | null,
): { value: number | null; reason?: string } {
  const plant = at(frames, marks.plant);
  const toe = at(frames, marks.toeOff);
  const pen = at(frames, marks.penultimate);
  const flight = at(frames, marks.flight);
  const landing = at(frames, marks.landing);
  const dt = (a: number, b: number) => {
    const start = timeOf(frames, a);
    const end = timeOf(frames, b);
    if (start == null || end == null || end <= start) return null;
    return end - start;
  };

  switch (id) {
    case "contact_time":
      return { value: dt(marks.plant, marks.toeOff), reason: "Plant and toe-off need to be different frames." };
    case "flight_time":
      return { value: dt(marks.toeOff, marks.landing), reason: "Toe-off and landing need to be different frames." };
    case "penultimate_gap":
      return {
        value: dt(marks.penultimate, marks.plant),
        reason: "The penultimate mark has to sit before the plant.",
      };
    default:
      break;
  }

  if (!side || !plant || !toe || !landing) {
    return { value: null, reason: "Joint angles need a pose on the key frames." };
  }
  const swing = otherSide(side);

  if (id === "hip_drop") {
    if (!pen) return { value: null, reason: "The penultimate frame is missing." };
    const penHip = hipCenter(pen)?.y;
    const earlier: number[] = [];
    for (let index = 0; index < marks.penultimate - 1; index += 1) {
      const y = hipCenter(frames[index]!)?.y;
      if (y != null) earlier.push(y);
    }
    if (penHip == null || earlier.length < 3) {
      return { value: null, reason: "Not enough approach frames to compare hip height." };
    }
    const sorted = earlier.slice().sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)]!;
    if (mid <= 0.05) return { value: null, reason: "Hip height is too small to turn into a percent." };
    return { value: ((mid - penHip) / mid) * 100 };
  }

  if (id === "knee_plant" || id === "knee_toeoff") {
    const frame = id === "knee_plant" ? plant : toe;
    const hip = sidePoint(frame, side, "hip");
    const knee = sidePoint(frame, side, "knee");
    const ankle = sidePoint(frame, side, "ankle");
    if (!hip || !knee || !ankle) return { value: null, reason: "The takeoff leg is missing on that frame." };
    return { value: jointAngleDeg(hip, knee, ankle) };
  }

  if (id === "trunk_plant" || id === "trunk_toeoff" || id === "trunk_flight" || id === "landing_trunk") {
    const frame =
      id === "trunk_plant" ? plant : id === "trunk_toeoff" ? toe : id === "trunk_flight" ? flight : landing;
    if (!frame) return { value: null, reason: "That frame is missing." };
    const hip = hipCenter(frame);
    const shoulder = shoulderCenter(frame);
    if (!hip || !shoulder) return { value: null, reason: "Trunk joints are missing on that frame." };
    return { value: trunkLeanDeg(hip, shoulder) };
  }

  if (id === "hip_extension") {
    const hip = sidePoint(toe, side, "hip");
    const knee = sidePoint(toe, side, "knee");
    const shoulder = shoulderCenter(toe);
    if (!hip || !knee || !shoulder) return { value: null, reason: "Hip extension needs the shoulder, hip, and knee." };
    return { value: jointAngleDeg(shoulder, hip, knee) };
  }

  if (id === "knee_drive") {
    const hip = sidePoint(toe, swing, "hip");
    const knee = sidePoint(toe, swing, "knee");
    if (!hip || !knee) return { value: null, reason: "The free leg is missing at toe-off." };
    return { value: thighAboveHorizontalDeg(hip, knee) };
  }

  if (id === "takeoff_angle") {
    const dtFrame = Math.max(0.08, 0.1);
    let next = marks.toeOff;
    while (next < frames.length - 1 && (frames[next]?.timeSec ?? 0) - (toe.timeSec ?? 0) < dtFrame) next += 1;
    if (next === marks.toeOff) next = Math.min(frames.length - 1, marks.toeOff + 1);
    const start = hipCenter(toe);
    const later = hipCenter(frames[next]!);
    if (!start || !later) return { value: null, reason: "Hip travel after toe-off is missing." };
    const dx = later.x - start.x;
    const dy = later.y - start.y;
    if (Math.hypot(dx, dy) < 1e-4) return { value: null, reason: "The hip does not move after toe-off." };
    return { value: rad2deg(Math.atan2(dy, dx)) };
  }

  if (id === "landing_knee" || id === "feet_ahead") {
    const left = sidePoint(landing, "left", "ankle");
    const right = sidePoint(landing, "right", "ankle");
    const leadSide: Side | null =
      left && right ? (left.x >= right.x ? "left" : "right") : left ? "left" : right ? "right" : null;
    if (!leadSide) return { value: null, reason: "Landing ankles are missing." };
    const hip = sidePoint(landing, leadSide, "hip");
    const knee = sidePoint(landing, leadSide, "knee");
    const ankle = sidePoint(landing, leadSide, "ankle");
    if (!hip || !knee || !ankle) return { value: null, reason: "The lead leg is incomplete at landing." };
    if (id === "landing_knee") return { value: jointAngleDeg(hip, knee, ankle) };
    const leg = Math.hypot(ankle.x - hip.x, ankle.y - hip.y);
    if (leg < 1e-4) return { value: null, reason: "The landing leg has no length." };
    return { value: (ankle.x - hip.x) / leg };
  }

  return { value: null, reason: "This measure is not implemented." };
}

export function measureMetrics(
  frames: PoseFrame[],
  marks: PhaseMarks,
  hintedSide: Side | null,
): MetricResult[] {
  const side = takeoffSide(frames, marks, hintedSide);
  const hasPose = frames.some((frame) => frame.points != null);
  return METRICS.map((definition) => {
    if (definition.requiresPose && !hasPose) {
      return {
        ...definition,
        value: null,
        score: null,
        unavailableReason: "No pose on this clip yet. Marker times are still scored.",
      };
    }
    const reading = measure(definition.id, frames, marks, side);
    const value = reading.value != null && Number.isFinite(reading.value) ? reading.value : null;
    return {
      ...definition,
      value,
      score:
        value == null
          ? null
          : scoreAgainstRange(value, definition.idealMin, definition.idealMax, definition.tolerance),
      unavailableReason: value == null ? reading.reason : undefined,
    };
  });
}

export type FrameReadout = {
  knee: number | null;
  trunk: number | null;
  takeoffSide: Side | null;
};

export function frameReadout(frame: PoseFrame | null, side: Side | null): FrameReadout {
  if (!frame || !frame.points) return { knee: null, trunk: null, takeoffSide: side };
  const resolved = side ?? lowerAnkle(frame)?.side ?? null;
  const hip = hipCenter(frame);
  const shoulder = shoulderCenter(frame);
  const trunk = hip && shoulder ? trunkLeanDeg(hip, shoulder) : null;
  if (!resolved) return { knee: null, trunk, takeoffSide: null };
  const kneeHip = sidePoint(frame, resolved, "hip");
  const knee = sidePoint(frame, resolved, "knee");
  const ankle = sidePoint(frame, resolved, "ankle");
  return {
    knee: kneeHip && knee && ankle ? jointAngleDeg(kneeHip, knee, ankle) : null,
    trunk,
    takeoffSide: resolved,
  };
}

import { hipCenter, lowerAnkle, normalizeRunDirection } from "./geometry";
import { clamp, median } from "./math";
import type { FrameSpan, PhaseDetection, PhaseId, PhaseMarks, PoseFrame, Side } from "./types";

const MIN_SPAN = 2;

export function clampMarks(marks: PhaseMarks, frameCount: number): PhaseMarks {
  const last = Math.max(0, frameCount - 1);
  let penultimate = clamp(Math.round(marks.penultimate), 0, last);
  let plant = clamp(Math.round(marks.plant), 0, last);
  let toeOff = clamp(Math.round(marks.toeOff), 0, last);
  let landing = clamp(Math.round(marks.landing), 0, last);

  if (plant <= penultimate) plant = Math.min(last, penultimate + 1);
  if (toeOff <= plant) toeOff = Math.min(last, plant + 1);
  if (landing <= toeOff) landing = Math.min(last, toeOff + 1);
  if (landing <= toeOff) {
    landing = last;
    toeOff = Math.max(0, landing - 1);
    plant = Math.max(0, toeOff - 1);
    penultimate = Math.max(0, plant - 1);
  }

  let flight = clamp(Math.round(marks.flight), 0, last);
  if (flight <= toeOff || flight >= landing) {
    flight = Math.round((toeOff + landing) / 2);
  }
  if (flight <= toeOff) flight = Math.min(last, toeOff + 1);
  if (flight >= landing) flight = Math.max(0, landing - 1);
  if (flight <= toeOff || flight >= landing) {
    flight = toeOff < landing ? toeOff : landing;
  }

  return { penultimate, plant, toeOff, flight, landing };
}

export function guessMarks(frameCount: number): PhaseMarks {
  const at = (portion: number) => Math.round(portion * Math.max(0, frameCount - 1));
  return clampMarks(
    {
      penultimate: at(0.5),
      plant: at(0.6),
      toeOff: at(0.66),
      flight: at(0.76),
      landing: at(0.88),
    },
    frameCount,
  );
}

export function setMark(marks: PhaseMarks, phase: PhaseId, frame: number, frameCount: number): PhaseMarks {
  return clampMarks({ ...marks, [phase]: frame }, frameCount);
}

function contactSpans(flags: boolean[]): FrameSpan[] {
  const spans: FrameSpan[] = [];
  let start: number | null = null;
  for (let index = 0; index <= flags.length; index += 1) {
    const on = index < flags.length && flags[index];
    if (on && start == null) start = index;
    if (!on && start != null) {
      const end = index - 1;
      if (end - start + 1 >= MIN_SPAN) spans.push({ start, end });
      start = null;
    }
  }
  const merged: FrameSpan[] = [];
  for (const span of spans) {
    const previous = merged[merged.length - 1];
    if (previous && span.start - previous.end <= 2) {
      previous.end = span.end;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

function hipY(frame: PoseFrame): number | null {
  return hipCenter(frame)?.y ?? null;
}

export function detectPhases(input: PoseFrame[]): PhaseDetection {
  const { frames, mirrored } = normalizeRunDirection(input);
  const notes: string[] = [];
  if (mirrored) notes.push("Run direction was flipped so forward is to the right of the sheet.");

  const ankleYs = frames.map((frame) => lowerAnkle(frame)?.point.y ?? null);
  const known = ankleYs.filter((value): value is number => value != null).sort((a, b) => a - b);
  const ground = known[Math.floor(known.length * 0.1)] ?? 0;
  const torsoLengths: number[] = [];
  for (const frame of frames) {
    const hip = hipCenter(frame);
    const leftShoulder = frame.points?.left_shoulder;
    const rightShoulder = frame.points?.right_shoulder;
    const shoulderY =
      leftShoulder && rightShoulder
        ? (leftShoulder.y + rightShoulder.y) / 2
        : (leftShoulder?.y ?? rightShoulder?.y);
    if (hip && shoulderY != null && (leftShoulder?.c ?? 0) >= 0.2) {
      torsoLengths.push(Math.abs(shoulderY - hip.y));
    }
  }
  const torso = median(torsoLengths) ?? 0.5;
  const tolerance = Math.max(0.08, torso * 0.14);
  const contacts = ankleYs.map((y) => y != null && y <= ground + tolerance);
  const spans = contactSpans(contacts);

  type Candidate = { before: number; duration: number; rise: number; start: number; end: number };
  const candidates: Candidate[] = [];
  for (let index = 0; index < spans.length - 1; index += 1) {
    const start = spans[index]!.end + 1;
    const end = spans[index + 1]!.start - 1;
    if (end < start) continue;
    const hips: number[] = [];
    for (let frame = start; frame <= end; frame += 1) {
      const y = hipY(frames[frame]!);
      if (y != null) hips.push(y);
    }
    const startHip = hipY(frames[start]!) ?? hips[0] ?? 0;
    const peak = hips.length ? Math.max(...hips) : startHip;
    const dt = Math.max(1e-3, (frames[1]?.timeSec ?? 1) - (frames[0]?.timeSec ?? 0));
    candidates.push({
      before: index,
      duration: (end - start + 1) * dt,
      rise: peak - startHip,
      start,
      end,
    });
  }

  const ranked = candidates
    .filter((candidate) => candidate.duration >= 0.28)
    .sort((a, b) => b.duration + b.rise - (a.duration + a.rise));
  const chosen = ranked[0] ?? candidates.sort((a, b) => b.duration - a.duration)[0];

  if (!chosen || spans.length < 2) {
    notes.push("No clear flight between two ground contacts. Markers are a starting guess.");
    return {
      marks: guessMarks(frames.length),
      takeoffSide: null,
      spans: { penultimate: null, takeoff: null, flight: null, landing: null },
      confidence: 0.2,
      notes,
      mirrored,
    };
  }

  const takeoff = spans[chosen.before] ?? null;
  const landing = spans[chosen.before + 1] ?? null;
  const penultimate = chosen.before > 0 ? (spans[chosen.before - 1] ?? null) : null;
  const flightSpan = { start: chosen.start, end: chosen.end };

  const lowestHipFrame = (span: FrameSpan): number => {
    let best = span.start;
    let bestY = Number.POSITIVE_INFINITY;
    for (let index = span.start; index <= span.end; index += 1) {
      const y = hipY(frames[index]!);
      if (y != null && y < bestY) {
        bestY = y;
        best = index;
      }
    }
    return best;
  };

  const highestHipFrame = (span: FrameSpan): number => {
    let best = span.start;
    let bestY = Number.NEGATIVE_INFINITY;
    for (let index = span.start; index <= span.end; index += 1) {
      const y = hipY(frames[index]!);
      if (y != null && y > bestY) {
        bestY = y;
        best = index;
      }
    }
    return best;
  };

  const plant = takeoff?.start ?? 0;
  const toeOff = takeoff?.end ?? plant;
  const marks = clampMarks(
    {
      penultimate: penultimate ? lowestHipFrame(penultimate) : Math.max(0, plant - 3),
      plant,
      toeOff,
      flight: highestHipFrame(flightSpan),
      landing: landing?.start ?? Math.min(frames.length - 1, flightSpan.end + 1),
    },
    frames.length,
  );

  const takeoffSide: Side | null = lowerAnkle(frames[marks.plant]!)?.side ?? null;
  let confidence = 0.55;
  if (penultimate && takeoff && landing && chosen.duration >= 0.35 && chosen.rise > 0.03) confidence = 0.92;
  else if (takeoff && landing) confidence = 0.74;
  if (!penultimate) notes.push("The penultimate contact was hard to separate from the approach.");

  return {
    marks,
    takeoffSide,
    spans: { penultimate, takeoff, flight: flightSpan, landing },
    confidence,
    notes,
    mirrored,
  };
}

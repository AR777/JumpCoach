import { deg2rad, distanceForKnee, lerp } from "../math";
import type { LandmarkName, PoseFrame, PosePoint, Side } from "../types";

const THIGH = 0.46;
const SHANK = 0.44;
const TORSO = 0.58;
const GROUND = 0.04;

export type Recipe = {
  id: string;
  title: string;
  lesson: string;
  blurb: string;
  approachKnee: number;
  penKnee: number;
  /** Peak foot lead during the penultimate, in body units. Larger lowers the hip. */
  penFootLead: number;
  plantKnee: number;
  toeOffKnee: number;
  plantLead: number;
  toeOffLead: number;
  trunkPlant: number;
  trunkToeOff: number;
  trunkFlight: number;
  trunkLanding: number;
  /** Thigh angle from straight down. 90 is horizontal and forward. */
  swingThigh: number;
  swingKnee: number;
  takeoffAngle: number;
  landingKnee: number;
  landingLead: number;
  takeoffDur: number;
  flightDur: number;
};

export type Timeline = {
  fps: number;
  approachEnd: number;
  penStart: number;
  penEnd: number;
  gapEnd: number;
  takeoffEnd: number;
  flightEnd: number;
  total: number;
  vx: number;
};

const FPS = 30;
const STEP = 0.3;
const APPROACH_STEPS = 4;

export function buildTimeline(recipe: Recipe): Timeline {
  const approachEnd = APPROACH_STEPS * STEP;
  const penStart = approachEnd;
  const penEnd = penStart + 0.2;
  const gapEnd = penEnd + 0.12;
  const takeoffEnd = gapEnd + recipe.takeoffDur;
  const flightEnd = takeoffEnd + recipe.flightDur;
  const total = flightEnd + 0.42;
  return {
    fps: FPS,
    approachEnd,
    penStart,
    penEnd,
    gapEnd,
    takeoffEnd,
    flightEnd,
    total,
    vx: 1.85,
  };
}

function pt(x: number, y: number): PosePoint {
  return { x, y, c: 1 };
}

function smooth(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}

function supportHipY(kneeDeg: number, footLead: number): number {
  const d = distanceForKnee(kneeDeg, THIGH, SHANK);
  const lead = Math.min(d - 0.03, Math.max(-d + 0.03, footLead));
  return GROUND + Math.sqrt(Math.max(0.01, d * d - lead * lead));
}

function stanceLeg(hipX: number, hipY: number, footLead: number, kneeDeg: number): { knee: PosePoint; ankle: PosePoint } {
  const d = distanceForKnee(kneeDeg, THIGH, SHANK);
  const lead = Math.min(d - 0.03, Math.max(-d + 0.03, footLead));
  const ankle = pt(hipX + lead, GROUND);
  const hip = pt(hipX, hipY);
  return { knee: ikKnee(hip, ankle), ankle };
}

function ikKnee(hip: PosePoint, ankle: PosePoint): PosePoint {
  const raw = Math.hypot(ankle.x - hip.x, ankle.y - hip.y) || 1;
  const dirx = (ankle.x - hip.x) / raw;
  const diry = (ankle.y - hip.y) / raw;
  const max = THIGH + SHANK - 0.0001;
  const min = Math.abs(THIGH - SHANK) + 0.0001;
  const d = Math.min(max, Math.max(min, raw));
  const along = (THIGH * THIGH - SHANK * SHANK + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, THIGH * THIGH - along * along));
  const baseX = hip.x + dirx * along;
  const baseY = hip.y + diry * along;
  const up = pt(baseX - diry * height, baseY + dirx * height);
  const down = pt(baseX + diry * height, baseY - dirx * height);
  return up.y >= down.y ? up : down;
}

function placeSwing(hip: PosePoint, thighFromDownDeg: number, kneeDeg: number): { knee: PosePoint; ankle: PosePoint } {
  const candidates = [1, -1].map((bend) => {
    const theta = deg2rad(thighFromDownDeg);
    const knee = pt(hip.x + Math.sin(theta) * THIGH, hip.y - Math.cos(theta) * THIGH);
    const vx = Math.sin(theta);
    const vy = -Math.cos(theta);
    const flex = deg2rad(bend * (180 - kneeDeg));
    const cos = Math.cos(flex);
    const sin = Math.sin(flex);
    const ankle = pt(knee.x + (vx * cos - vy * sin) * SHANK, knee.y + (vx * sin + vy * cos) * SHANK);
    return { knee, ankle };
  });
  return candidates.sort((a, b) => a.ankle.y - b.ankle.y)[0]!;
}

function placeArm(shoulder: PosePoint, fromDownDeg: number): { elbow: PosePoint; wrist: PosePoint } {
  const theta = deg2rad(fromDownDeg);
  const elbow = pt(shoulder.x + Math.sin(theta) * 0.28, shoulder.y - Math.cos(theta) * 0.28);
  const wristTheta = deg2rad(fromDownDeg + 35);
  const wrist = pt(elbow.x + Math.sin(wristTheta) * 0.24, elbow.y - Math.cos(wristTheta) * 0.24);
  return { elbow, wrist };
}

type Body = {
  hipY: number;
  trunk: number;
  support: Side | null;
  left: { knee: PosePoint; ankle: PosePoint };
  right: { knee: PosePoint; ankle: PosePoint };
  leftArm: number;
  rightArm: number;
};

function supportBody(
  midX: number,
  side: Side,
  kneeDeg: number,
  footLead: number,
  trunk: number,
  swingThigh: number,
  swingKnee: number,
): Body {
  const hipX = midX + (side === "left" ? -0.045 : 0.045);
  const hipY = supportHipY(kneeDeg, footLead);
  const support = stanceLeg(hipX, hipY, footLead, kneeDeg);
  const swingHip = pt(midX + (side === "left" ? 0.045 : -0.045), hipY);
  const swing = placeSwing(swingHip, swingThigh, swingKnee);
  const left = side === "left" ? support : swing;
  const right = side === "right" ? support : swing;
  return {
    hipY,
    trunk,
    support: side,
    left,
    right,
    leftArm: side === "right" ? 130 : 40,
    rightArm: side === "left" ? 130 : 40,
  };
}

function airBody(
  midX: number,
  hipY: number,
  trunk: number,
  leftThigh: number,
  rightThigh: number,
  knee: number,
): Body {
  const left = placeSwing(pt(midX - 0.045, hipY), leftThigh, knee);
  const right = placeSwing(pt(midX + 0.045, hipY), rightThigh, knee);
  return {
    hipY,
    trunk,
    support: null,
    left,
    right,
    leftArm: 80,
    rightArm: 80,
  };
}

function flightHipY(recipe: Recipe, timeline: Timeline, t: number, toeOffHipY: number, landingHipY: number): number {
  const start = timeline.takeoffEnd;
  const duration = recipe.flightDur;
  const elapsed = t - start;
  const angle = deg2rad(recipe.takeoffAngle);
  const vx = timeline.vx;
  const numerator = landingHipY - toeOffHipY - vx * Math.tan(angle) * duration;
  const denominator = duration * (0.1 - duration);
  const g = denominator === 0 ? 3 : Math.max(0.8, (2 * numerator) / denominator);
  const vy = vx * Math.tan(angle) + 0.5 * g * 0.1;
  return toeOffHipY + vy * elapsed - 0.5 * g * elapsed * elapsed;
}

function bodyAt(t: number, recipe: Recipe, timeline: Timeline): Body {
  const midX = timeline.vx * t;
  const toeOffHipY = supportHipY(recipe.toeOffKnee, recipe.toeOffLead);
  const landingHipY = supportHipY(recipe.landingKnee, recipe.landingLead);

  if (t < timeline.approachEnd) {
    const stepIndex = Math.min(APPROACH_STEPS - 1, Math.floor(t / STEP));
    const local = (t - stepIndex * STEP) / STEP;
    const side: Side = stepIndex % 2 === 0 ? "right" : "left";
    if (local < 0.62) {
      const u = local / 0.62;
      return supportBody(
        midX,
        side,
        recipe.approachKnee,
        lerp(0.2, -0.04, u),
        8,
        lerp(-15, 70, u),
        lerp(150, 90, u),
      );
    }
    const u = (local - 0.62) / 0.38;
    const hipY = supportHipY(recipe.approachKnee, -0.04) + Math.sin(Math.PI * u) * 0.06;
    return airBody(midX, hipY, 7, lerp(20, 50, u), lerp(-30, 10, u), 95);
  }

  if (t < timeline.penEnd) {
    const u = (t - timeline.penStart) / (timeline.penEnd - timeline.penStart);
    const lead = recipe.penFootLead * Math.sin(Math.PI * u) * 0.9 + 0.06;
    return supportBody(midX, "right", recipe.penKnee, lead, 6, lerp(20, 60, u), 100);
  }

  if (t < timeline.gapEnd) {
    const u = (t - timeline.penEnd) / (timeline.gapEnd - timeline.penEnd);
    const hipY = supportHipY(recipe.penKnee, 0.08) + Math.sin(Math.PI * u) * 0.05;
    return airBody(midX, hipY, 5, lerp(25, 45, u), lerp(-10, 15, u), 100);
  }

  if (t < timeline.takeoffEnd) {
    const u = smooth((t - timeline.gapEnd) / recipe.takeoffDur);
    return supportBody(
      midX,
      "left",
      lerp(recipe.plantKnee, recipe.toeOffKnee, u),
      lerp(recipe.plantLead, recipe.toeOffLead, u),
      lerp(recipe.trunkPlant, recipe.trunkToeOff, u),
      lerp(50, recipe.swingThigh, u),
      lerp(110, recipe.swingKnee, u),
    );
  }

  if (t < timeline.flightEnd) {
    const u = (t - timeline.takeoffEnd) / recipe.flightDur;
    const hipY = flightHipY(recipe, timeline, t, toeOffHipY, landingHipY);
    const tuck = u < 0.72;
    return airBody(
      midX,
      hipY,
      recipe.trunkFlight,
      tuck ? 78 : lerp(78, 115, (u - 0.72) / 0.28),
      tuck ? 70 : lerp(70, 108, (u - 0.72) / 0.28),
      tuck ? 80 : lerp(80, recipe.landingKnee, (u - 0.72) / 0.28),
    );
  }

  const u = smooth((t - timeline.flightEnd) / (timeline.total - timeline.flightEnd));
  const hipY = landingHipY;
  const leftHipX = midX - 0.045;
  const rightHipX = midX + 0.045;
  const knee = lerp(recipe.landingKnee, recipe.landingKnee - 28, u);
  return {
    hipY,
    trunk: recipe.trunkLanding,
    support: "left",
    left: stanceLeg(leftHipX, hipY, recipe.landingLead, knee),
    right: stanceLeg(rightHipX, hipY, recipe.landingLead - 0.05, knee),
    leftArm: 150,
    rightArm: 150,
  };
}

function frameAt(index: number, recipe: Recipe, timeline: Timeline): PoseFrame {
  const timeSec = index / timeline.fps;
  const body = bodyAt(timeSec, recipe, timeline);
  const midX = timeline.vx * timeSec;
  const leftHip = pt(midX - 0.045, body.hipY);
  const rightHip = pt(midX + 0.045, body.hipY);
  const hipMid = pt(midX, body.hipY);
  const angle = deg2rad(body.trunk);
  const shoulderMid = pt(hipMid.x + Math.sin(angle) * TORSO, hipMid.y + Math.cos(angle) * TORSO);
  const leftShoulder = pt(shoulderMid.x - 0.07, shoulderMid.y);
  const rightShoulder = pt(shoulderMid.x + 0.07, shoulderMid.y);
  const head = TORSO * 0.34;
  const mag = Math.hypot(shoulderMid.x - hipMid.x, shoulderMid.y - hipMid.y) || 1;
  const nose = pt(
    shoulderMid.x + ((shoulderMid.x - hipMid.x) / mag) * head,
    shoulderMid.y + ((shoulderMid.y - hipMid.y) / mag) * head,
  );
  const leftArm = placeArm(leftShoulder, body.leftArm);
  const rightArm = placeArm(rightShoulder, body.rightArm);
  const points: Record<LandmarkName, PosePoint> = {
    nose,
    left_eye: pt(nose.x - 0.03, nose.y + 0.02),
    right_eye: pt(nose.x + 0.03, nose.y + 0.02),
    left_ear: pt(nose.x - 0.05, nose.y - 0.02),
    right_ear: pt(nose.x + 0.05, nose.y - 0.02),
    left_shoulder: leftShoulder,
    right_shoulder: rightShoulder,
    left_elbow: leftArm.elbow,
    right_elbow: rightArm.elbow,
    left_wrist: leftArm.wrist,
    right_wrist: rightArm.wrist,
    left_hip: leftHip,
    right_hip: rightHip,
    left_knee: body.left.knee,
    right_knee: body.right.knee,
    left_ankle: body.left.ankle,
    right_ankle: body.right.ankle,
  };
  return { index, timeSec, points };
}

export function synthesize(recipe: Recipe): { frames: PoseFrame[]; timeline: Timeline } {
  const timeline = buildTimeline(recipe);
  const count = Math.round(timeline.total * timeline.fps) + 1;
  const frames = Array.from({ length: count }, (_, index) => frameAt(index, recipe, timeline));
  return { frames, timeline };
}

export function emptyFrames(durationSec: number, fps = 30): PoseFrame[] {
  const count = Math.max(8, Math.round(durationSec * fps));
  return Array.from({ length: count }, (_, index) => ({
    index,
    timeSec: index / fps,
    points: null,
  }));
}

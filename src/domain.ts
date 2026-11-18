import { analyzePose, evaluate } from "./analysis/evaluate";
import { clampMarks, guessMarks } from "./analysis/phases";
import { recipeById } from "./analysis/sample/recipes";
import { emptyFrames, synthesize } from "./analysis/sample/synthesize";
import type { AnalysisSource, Evaluation, Fidelity, PhaseMarks, PoseFrame, Side } from "./analysis/types";
import { formatWhen } from "./format";
import { uid } from "./ids";

export type Athlete = {
  id: string;
  name: string;
  note: string;
  createdAt: string;
};

export type Analysis = {
  id: string;
  athleteId: string;
  createdAt: string;
  title: string;
  source: AnalysisSource;
  fidelity: Fidelity;
  recipeId?: string;
  videoUri?: string | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  frames: PoseFrame[];
  marks: PhaseMarks;
  takeoffSide: Side | null;
  detectionConfidence: number;
  detectionNotes: string[];
  marksAdjusted: boolean;
  evaluation: Evaluation;
};

export function buildSampleAnalysis(athleteId: string, recipeId: string, createdAt = new Date().toISOString()): Analysis {
  const recipe = recipeById(recipeId);
  if (!recipe) throw new Error(`Unknown sample ${recipeId}`);
  const { frames } = synthesize(recipe);
  const { detection, evaluation } = analyzePose(frames);
  return {
    id: uid("jump"),
    athleteId,
    createdAt,
    title: recipe.title,
    source: "sample",
    fidelity: "sample",
    recipeId,
    videoUri: null,
    frames,
    marks: detection.marks,
    takeoffSide: detection.takeoffSide,
    detectionConfidence: detection.confidence,
    detectionNotes: detection.notes,
    marksAdjusted: false,
    evaluation,
  };
}

export function buildMarkerAnalysis(input: {
  athleteId: string;
  source: "camera" | "library";
  videoUri: string;
  durationSec: number;
  videoWidth?: number | null;
  videoHeight?: number | null;
  id?: string;
}): Analysis {
  const duration = input.durationSec > 0.4 ? input.durationSec : 6;
  const frames = emptyFrames(duration, 30);
  const marks = guessMarks(frames.length);
  return {
    id: input.id ?? uid("jump"),
    athleteId: input.athleteId,
    createdAt: new Date().toISOString(),
    title: `Jump · ${formatWhen(new Date().toISOString())}`,
    source: input.source,
    fidelity: "markers",
    videoUri: input.videoUri,
    videoWidth: input.videoWidth ?? null,
    videoHeight: input.videoHeight ?? null,
    frames,
    marks,
    takeoffSide: null,
    detectionConfidence: 0.25,
    detectionNotes: ["Markers are a first guess. Drag them onto the plant, toe-off, and landing."],
    marksAdjusted: false,
    evaluation: evaluate(frames, marks, null),
  };
}

export function applyPose(analysis: Analysis, frames: PoseFrame[]): Analysis {
  const { detection, evaluation } = analyzePose(frames);
  return {
    ...analysis,
    fidelity: "movenet",
    frames,
    marks: detection.marks,
    takeoffSide: detection.takeoffSide,
    detectionConfidence: detection.confidence,
    detectionNotes: detection.notes,
    marksAdjusted: false,
    evaluation,
  };
}

export function applyMarks(analysis: Analysis, marks: PhaseMarks, marksAdjusted: boolean): Analysis {
  return {
    ...analysis,
    marks,
    marksAdjusted,
    evaluation: evaluate(analysis.frames, marks, analysis.takeoffSide),
  };
}

export function retimedMarkers(analysis: Analysis, durationSec: number): Analysis {
  const frames = emptyFrames(durationSec, 30);
  const oldCount = Math.max(2, analysis.frames.length);
  const scale = (index: number) => Math.round((index / (oldCount - 1)) * (frames.length - 1));
  const marks = clampMarks(
    {
      penultimate: scale(analysis.marks.penultimate),
      plant: scale(analysis.marks.plant),
      toeOff: scale(analysis.marks.toeOff),
      flight: scale(analysis.marks.flight),
      landing: scale(analysis.marks.landing),
    },
    frames.length,
  );
  return applyMarks({ ...analysis, frames }, marks, false);
}

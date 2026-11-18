import { buildCoaching } from "./coaching";
import { measureMetrics } from "./metrics";
import { detectPhases } from "./phases";
import { scoreEvaluation } from "./scoring";
import type { Evaluation, PhaseMarks, PoseFrame, Side } from "./types";

export function evaluate(frames: PoseFrame[], marks: PhaseMarks, hintedSide: Side | null = null): Evaluation {
  const metrics = measureMetrics(frames, marks, hintedSide);
  const scored = scoreEvaluation(metrics);
  const warnings: string[] = [];
  if (scored.scoreKind === "rhythm") {
    warnings.push("This sheet scores the rhythm of the markers. Joint angles appear once a pose is available.");
  }
  const missing = metrics.filter((metric) => metric.requiresPose && metric.value == null).length;
  if (scored.scoreKind === "technique" && missing > 0) {
    warnings.push(`${missing} pose measures could not be read on the chosen frames.`);
  }
  return {
    metrics,
    ...scored,
    coaching: buildCoaching(metrics),
    warnings,
  };
}

export function analyzePose(frames: PoseFrame[]): { detection: ReturnType<typeof detectPhases>; evaluation: Evaluation } {
  const detection = detectPhases(frames);
  const evaluation = evaluate(frames, detection.marks, detection.takeoffSide);
  return { detection, evaluation };
}

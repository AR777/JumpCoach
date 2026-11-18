import { PHASE_WEIGHTS } from "./config/ranges";
import { roundScore } from "./math";
import type { Evaluation, MetricResult, PhaseId } from "./types";
import { PHASES } from "./types";

const TIMING_IDS = new Set(["contact_time", "flight_time", "penultimate_gap"]);

export function scoreEvaluation(metrics: MetricResult[]): Pick<Evaluation, "phaseScores" | "overall" | "scoreKind"> {
  const phaseScores = {} as Record<PhaseId, number | null>;
  for (const phase of PHASES) {
    const rows = metrics.filter((metric) => metric.phase === phase && metric.score != null);
    const weight = rows.reduce((sum, metric) => sum + metric.weight, 0);
    phaseScores[phase] =
      weight <= 0 ? null : roundScore(rows.reduce((sum, metric) => sum + metric.score! * metric.weight, 0) / weight);
  }

  let weighted = 0;
  let totalWeight = 0;
  for (const phase of PHASES) {
    const score = phaseScores[phase];
    if (score == null) continue;
    weighted += score * PHASE_WEIGHTS[phase];
    totalWeight += PHASE_WEIGHTS[phase];
  }
  const overall = totalWeight <= 0 ? 0 : roundScore(weighted / totalWeight);
  const angleCount = metrics.filter((metric) => metric.value != null && !TIMING_IDS.has(metric.id)).length;
  return {
    phaseScores,
    overall,
    scoreKind: angleCount >= 4 ? "technique" : "rhythm",
  };
}

import { METRIC_BY_ID } from "./config/ranges";
import type { CoachingItem, CoachingReport, MetricResult } from "./types";

function formatValue(metric: MetricResult): string {
  if (metric.value == null) return "no reading";
  if (metric.unit === "s") return `${metric.value.toFixed(2)}s`;
  if (metric.unit === "%") return `${metric.value.toFixed(0)}%`;
  if (metric.unit === "ratio") return metric.value.toFixed(2);
  return `${Math.round(metric.value)}${metric.unit === "°" ? "°" : ` ${metric.unit}`}`;
}

export function buildCoaching(metrics: MetricResult[]): CoachingReport {
  const scored = metrics.filter((metric) => metric.score != null);
  const ranked = scored.slice().sort((a, b) => {
    if (b.score! !== a.score!) return b.score! - a.score!;
    return b.impact - a.impact;
  });
  const keptMetric = ranked[0] ?? metrics[0];
  if (!keptMetric) {
    throw new Error("Coaching needs at least one metric definition.");
  }
  const keptDef = METRIC_BY_ID[keptMetric.id];
  const keptScore = keptMetric.score ?? 0;
  const honest =
    keptScore < 70
      ? `This was the strongest part of the jump, and it still has room. ${keptDef.keptBody}`
      : keptDef.keptBody;

  const fixes = scored
    .filter((metric) => metric.id !== keptMetric.id)
    .slice()
    .sort((a, b) => b.impact * (100 - b.score!) - a.impact * (100 - a.score!))
    .slice(0, 2)
    .map<CoachingItem>((metric) => {
      const definition = METRIC_BY_ID[metric.id];
      return {
        metricId: metric.id,
        title: definition.fixTitle,
        body: `${definition.fixBody} Reading: ${formatValue(metric)}. Window: ${metric.idealMin}–${metric.idealMax} ${metric.unit}.`,
        drill: definition.drill,
        dose: definition.dose,
        how: definition.how,
        kind: (metric.score ?? 0) >= 85 ? "sharpen" : "fix",
      };
    });

  if (fixes.length < 2) {
    fixes.push({
      metricId: keptMetric.id,
      title: "Repeat it before you add speed",
      body: "Hold the part that already works for another session, then add two strides. One change at a time.",
      drill: "Approach run-throughs",
      dose: "4 x 20m",
      how: "Film the side again. Keep the cue that scored, and do not add a second cue in the same session.",
      kind: "sharpen",
    });
  }

  return {
    kept: {
      metricId: keptMetric.id,
      title: keptDef.keptTitle,
      body: `${honest} Reading: ${formatValue(keptMetric)}.`,
    },
    fixes: fixes.slice(0, 2),
  };
}

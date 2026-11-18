import { describe, expect, it } from "vitest";
import { METRIC_BY_ID } from "../src/analysis/config/ranges";
import { analyzePose, evaluate } from "../src/analysis/evaluate";
import { setMark } from "../src/analysis/phases";
import { RECIPES } from "../src/analysis/sample/recipes";
import { buildTimeline, synthesize } from "../src/analysis/sample/synthesize";

function metric(id: string, evaluation: ReturnType<typeof evaluate>) {
  return evaluation.metrics.find((row) => row.id === id);
}

describe("synthetic jumps", () => {
  const balanced = synthesize(RECIPES[0]!);
  const analyzed = analyzePose(balanced.frames);

  it("places the balanced phases on the timeline that generated them", () => {
    const timeline = buildTimeline(RECIPES[0]!);
    const time = (index: number) => balanced.frames[index]!.timeSec;
    const { marks, takeoffSide, confidence } = analyzed.detection;
    expect(confidence).toBeGreaterThan(0.7);
    expect(takeoffSide).toBe("left");
    expect(time(marks.penultimate)).toBeGreaterThanOrEqual(timeline.penStart - 0.02);
    expect(time(marks.penultimate)).toBeLessThanOrEqual(timeline.penEnd + 0.02);
    expect(time(marks.plant)).toBeGreaterThanOrEqual(timeline.gapEnd - 0.05);
    expect(time(marks.plant)).toBeLessThanOrEqual(timeline.gapEnd + 0.08);
    expect(time(marks.toeOff)).toBeGreaterThanOrEqual(timeline.takeoffEnd - 0.08);
    expect(time(marks.toeOff)).toBeLessThanOrEqual(timeline.takeoffEnd + 0.05);
    expect(time(marks.landing)).toBeGreaterThanOrEqual(timeline.flightEnd - 0.08);
    expect(time(marks.flight)).toBeGreaterThan(time(marks.toeOff));
    expect(time(marks.flight)).toBeLessThan(time(marks.landing));
  });

  it("scores the balanced jump as technique and above the fault patterns", () => {
    expect(analyzed.evaluation.scoreKind).toBe("technique");
    expect(analyzed.evaluation.overall).toBeGreaterThan(75);
    for (const recipe of RECIPES.slice(1)) {
      const fault = analyzePose(synthesize(recipe).frames).evaluation.overall;
      expect(analyzed.evaluation.overall).toBeGreaterThan(fault + 8);
    }
  });

  it("flags the intended fault on each sample", () => {
    const flat = analyzePose(synthesize(RECIPES.find((recipe) => recipe.id === "flat")!).frames);
    const soft = analyzePose(synthesize(RECIPES.find((recipe) => recipe.id === "soft-knee")!).frames);
    const nodrop = analyzePose(synthesize(RECIPES.find((recipe) => recipe.id === "no-drop")!).frames);
    expect(metric("takeoff_angle", flat.evaluation)!.score!).toBeLessThan(55);
    expect(metric("knee_drive", flat.evaluation)!.score!).toBeLessThan(60);
    expect(metric("knee_plant", soft.evaluation)!.score!).toBeLessThan(50);
    expect(metric("contact_time", soft.evaluation)!.score!).toBeLessThan(70);
    expect(metric("hip_drop", nodrop.evaluation)!.score!).toBeLessThan(45);
  });

  it("uses the drill written in the range config", () => {
    const fix = analyzed.evaluation.coaching.fixes[0]!;
    const definition = METRIC_BY_ID[fix.metricId];
    if (fix.drill === "Approach run-throughs") {
      expect(fix.dose).toBe("4 x 20m");
    } else {
      expect(fix.drill).toBe(definition.drill);
      expect(fix.dose).toBe(definition.dose);
    }
    expect(analyzed.evaluation.coaching.fixes).toHaveLength(2);
    expect(analyzed.evaluation.coaching.kept.metricId).not.toBe(analyzed.evaluation.coaching.fixes[0]!.metricId);
  });

  it("changes the board-contact score when the toe-off marker moves", () => {
    const before = metric("contact_time", analyzed.evaluation)!.score!;
    const shifted = setMark(
      analyzed.detection.marks,
      "toeOff",
      analyzed.detection.marks.plant + 12,
      balanced.frames.length,
    );
    const after = evaluate(balanced.frames, shifted, analyzed.detection.takeoffSide);
    expect(metric("contact_time", after)!.value!).toBeGreaterThan(metric("contact_time", analyzed.evaluation)!.value!);
    expect(metric("contact_time", after)!.score!).toBeLessThan(before);
  });
});

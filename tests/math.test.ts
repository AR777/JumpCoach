import { describe, expect, it } from "vitest";
import { jointAngleDeg, scoreAgainstRange, thighAboveHorizontalDeg, trunkLeanDeg } from "../src/analysis/math";

const point = (x: number, y: number) => ({ x, y, c: 1 });

describe("angle math", () => {
  it("reads a straight knee as 180° and a right angle as 90°", () => {
    const straight = jointAngleDeg(point(0, 1), point(0, 0), point(0, -1));
    const flexed = jointAngleDeg(point(0, 1), point(0, 0), point(1, 0));
    expect(straight).toBeCloseTo(180, 5);
    expect(flexed).toBeCloseTo(90, 5);
  });

  it("signs trunk lean from vertical", () => {
    expect(trunkLeanDeg(point(0, 0), point(0, 1))).toBeCloseTo(0, 5);
    const forward = trunkLeanDeg(point(0, 0), point(1, 1));
    expect(forward).toBeCloseTo(45, 5);
    const back = trunkLeanDeg(point(0, 0), point(-1, 1));
    expect(back).toBeCloseTo(-45, 5);
  });

  it("measures the free thigh against horizontal", () => {
    expect(thighAboveHorizontalDeg(point(0, 1), point(1, 1))).toBeCloseTo(0, 5);
    expect(thighAboveHorizontalDeg(point(0, 1), point(1, 2))).toBeGreaterThan(0);
    expect(thighAboveHorizontalDeg(point(0, 1), point(1, 0))).toBeLessThan(0);
  });

  it("scores the middle of a window at 100 and falls off outside it", () => {
    expect(scoreAgainstRange(20, 16, 24, 10)).toBe(100);
    expect(scoreAgainstRange(16, 16, 24, 10)).toBe(100);
    expect(scoreAgainstRange(6, 16, 24, 10)).toBeCloseTo(0, 5);
    expect(scoreAgainstRange(11, 16, 24, 10)).toBeCloseTo(50, 5);
  });
});

import { describe, expect, it } from "vitest";
import { clampMarks, detectPhases, setMark } from "../src/analysis/phases";
import type { PoseFrame, PosePoint } from "../src/analysis/types";

function frame(index: number, ankleY: number, hipY: number, hipX: number): PoseFrame {
  const point = (x: number, y: number): PosePoint => ({ x, y, c: 1 });
  return {
    index,
    timeSec: index / 30,
    points: {
      nose: point(hipX, hipY + 0.8),
      left_eye: point(hipX, hipY + 0.82),
      right_eye: point(hipX, hipY + 0.82),
      left_ear: point(hipX, hipY + 0.78),
      right_ear: point(hipX, hipY + 0.78),
      left_shoulder: point(hipX, hipY + 0.55),
      right_shoulder: point(hipX + 0.02, hipY + 0.55),
      left_elbow: point(hipX, hipY + 0.3),
      right_elbow: point(hipX, hipY + 0.3),
      left_wrist: point(hipX, hipY + 0.1),
      right_wrist: point(hipX, hipY + 0.1),
      left_hip: point(hipX, hipY),
      right_hip: point(hipX + 0.02, hipY),
      left_knee: point(hipX, hipY - 0.3),
      right_knee: point(hipX, hipY - 0.2),
      left_ankle: point(hipX, ankleY),
      right_ankle: point(hipX + 0.05, ankleY + 0.3),
    },
  };
}

describe("phase detection", () => {
  it("finds the long flight between two contacts", () => {
    const frames: PoseFrame[] = [];
    for (let index = 0; index < 20; index += 1) frames.push(frame(index, 0.04, 0.9, index * 0.05));
    for (let index = 20; index < 28; index += 1) frames.push(frame(index, 0.7, 1.2 + (index - 20) * 0.02, index * 0.05));
    for (let index = 28; index < 40; index += 1) frames.push(frame(index, 0.04, 0.7, index * 0.05));
    const detection = detectPhases(frames);
    expect(detection.confidence).toBeGreaterThan(0.5);
    expect(detection.marks.plant).toBeLessThan(20);
    expect(detection.marks.toeOff).toBeGreaterThanOrEqual(15);
    expect(detection.marks.toeOff).toBeLessThan(20);
    expect(detection.marks.landing).toBe(28);
    expect(detection.marks.flight).toBeGreaterThan(detection.marks.toeOff);
    expect(detection.marks.flight).toBeLessThan(detection.marks.landing);
    expect(detection.takeoffSide).toBe("left");
  });

  it("falls back to guessed markers when the feet never leave the ground", () => {
    const frames = Array.from({ length: 30 }, (_, index) => frame(index, 0.04, 0.9, index * 0.04));
    const detection = detectPhases(frames);
    expect(detection.confidence).toBeLessThan(0.4);
    expect(detection.notes.some((note) => note.includes("starting guess"))).toBe(true);
  });

  it("keeps markers in order when a phase is dragged", () => {
    const marks = clampMarks(
      { penultimate: 10, plant: 20, toeOff: 24, flight: 30, landing: 40 },
      50,
    );
    const moved = setMark(marks, "plant", 35, 50);
    expect(moved.penultimate).toBeLessThan(moved.plant);
    expect(moved.plant).toBeLessThan(moved.toeOff);
    expect(moved.toeOff).toBeLessThan(moved.landing);
    expect(moved.flight).toBeGreaterThan(moved.toeOff);
    expect(moved.flight).toBeLessThan(moved.landing);
  });
});

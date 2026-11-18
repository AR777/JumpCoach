/** Body landmarks shared with MoveNet's 17-point layout. */
export const LANDMARKS = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
] as const;

export type LandmarkName = (typeof LANDMARKS)[number];

export type Side = "left" | "right";

/** Image-independent plane: +x is the run direction after normalization, +y is up. */
export type PosePoint = {
  x: number;
  y: number;
  /** 0–1 confidence. Synthetic poses use 1. */
  c: number;
};

export type PoseFrame = {
  index: number;
  timeSec: number;
  points: Partial<Record<LandmarkName, PosePoint>> | null;
};

export const PHASES = ["penultimate", "plant", "toeOff", "flight", "landing"] as const;
export type PhaseId = (typeof PHASES)[number];

export type PhaseMarks = Record<PhaseId, number>;

export type FrameSpan = { start: number; end: number };

export type PhaseDetection = {
  marks: PhaseMarks;
  takeoffSide: Side | null;
  spans: {
    penultimate: FrameSpan | null;
    takeoff: FrameSpan | null;
    flight: FrameSpan | null;
    landing: FrameSpan | null;
  };
  confidence: number;
  notes: string[];
  mirrored: boolean;
};

export type MetricId =
  | "hip_drop"
  | "penultimate_gap"
  | "knee_plant"
  | "trunk_plant"
  | "contact_time"
  | "knee_toeoff"
  | "hip_extension"
  | "trunk_toeoff"
  | "takeoff_angle"
  | "knee_drive"
  | "trunk_flight"
  | "flight_time"
  | "landing_knee"
  | "landing_trunk"
  | "feet_ahead";

export type MetricResult = {
  id: MetricId;
  label: string;
  phase: PhaseId;
  value: number | null;
  unit: string;
  idealMin: number;
  idealMax: number;
  tolerance: number;
  score: number | null;
  weight: number;
  impact: number;
  source: string;
  requiresPose: boolean;
  unavailableReason?: string;
};

export type CoachingItem = {
  metricId: MetricId;
  title: string;
  body: string;
  drill: string;
  dose: string;
  how: string;
  kind: "fix" | "sharpen";
};

export type CoachingReport = {
  kept: {
    metricId: MetricId;
    title: string;
    body: string;
  };
  fixes: [CoachingItem, CoachingItem] | CoachingItem[];
};

export type Evaluation = {
  metrics: MetricResult[];
  phaseScores: Record<PhaseId, number | null>;
  overall: number;
  /** Technique uses joint angles. Rhythm uses only the times between markers. */
  scoreKind: "technique" | "rhythm";
  coaching: CoachingReport;
  warnings: string[];
};

export type Fidelity = "sample" | "movenet" | "markers";

export type AnalysisSource = "sample" | "camera" | "library";

import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";
import type { LandmarkName, PhaseMarks, PoseFrame } from "../analysis/types";
import { PHASE_LABEL } from "../analysis/config/ranges";
import { colors, fonts } from "../theme";

const BONES: Array<[LandmarkName, LandmarkName]> = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["nose", "left_shoulder"],
  ["nose", "right_shoulder"],
];

export function SkeletonStage({
  frames,
  index,
  phase,
}: {
  frames: PoseFrame[];
  index: number;
  phase?: keyof PhaseMarks;
}) {
  const bounds = boundsOf(frames);
  const frame = frames[index];
  const width = 340;
  const height = 280;
  const pad = 18;
  const mapX = (x: number) => pad + ((x - bounds.minX) / bounds.spanX) * (width - pad * 2);
  const mapY = (y: number) => height - pad - ((y - bounds.minY) / bounds.spanY) * (height - pad * 2);
  const groundY = mapY(bounds.ground);

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={0} width={width} height={height} fill={colors.stadium} />
        <Line x1={16} y1={groundY} x2={width - 16} y2={groundY} stroke={colors.stadiumLine} strokeWidth={2} />
        {frame?.points
          ? BONES.map(([a, b]) => {
              const start = frame.points?.[a];
              const end = frame.points?.[b];
              if (!start || !end || start.c < 0.15 || end.c < 0.15) return null;
              const takeoff = a.startsWith("left_") || b.startsWith("left_");
              return (
                <Line
                  key={`${a}-${b}`}
                  x1={mapX(start.x)}
                  y1={mapY(start.y)}
                  x2={mapX(end.x)}
                  y2={mapY(end.y)}
                  stroke={takeoff ? "#F0B8A4" : "#F4EFE6"}
                  strokeWidth={takeoff ? 4 : 3}
                  strokeLinecap="round"
                />
              );
            })
          : null}
        {frame?.points
          ? (Object.entries(frame.points) as Array<[string, { x: number; y: number; c: number }]>).map(
              ([name, point]) => {
                if (!point || point.c < 0.15 || name.includes("eye") || name.includes("ear")) return null;
                return <Circle key={name} cx={mapX(point.x)} cy={mapY(point.y)} r={3.5} fill={colors.gold} />;
              },
            )
          : null}
      </Svg>
      <Text style={styles.caption}>{phase ? PHASE_LABEL[phase] : "Side view"}</Text>
    </View>
  );
}

function boundsOf(frames: PoseFrame[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let ground = Infinity;
  for (const frame of frames) {
    if (!frame.points) continue;
    for (const point of Object.values(frame.points)) {
      if (!point) continue;
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    const ankles = [frame.points.left_ankle, frame.points.right_ankle].filter(Boolean);
    for (const ankle of ankles) {
      if (ankle) ground = Math.min(ground, ankle.y);
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1, spanX: 1, spanY: 1, ground: 0 };
  }
  const padX = (maxX - minX) * 0.12 || 0.4;
  const padY = (maxY - minY) * 0.12 || 0.4;
  minX -= padX;
  maxX += padX;
  minY = Math.min(minY, Number.isFinite(ground) ? ground : minY) - padY * 0.3;
  maxY += padY;
  return {
    minX,
    maxX,
    minY,
    maxY,
    spanX: Math.max(0.2, maxX - minX),
    spanY: Math.max(0.2, maxY - minY),
    ground: Number.isFinite(ground) ? ground : minY,
  };
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 18, overflow: "hidden", backgroundColor: colors.stadium },
  caption: {
    position: "absolute",
    left: 12,
    top: 10,
    color: "#F4EFE6",
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});

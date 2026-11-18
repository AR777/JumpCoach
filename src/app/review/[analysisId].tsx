import Slider from "@react-native-community/slider";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { PHASE_LABEL } from "../../analysis/config/ranges";
import { frameReadout } from "../../analysis/metrics";
import { setMark } from "../../analysis/phases";
import { evaluate } from "../../analysis/evaluate";
import type { PhaseId } from "../../analysis/types";
import { PHASES } from "../../analysis/types";
import { JumpVideo } from "../../components/JumpVideo";
import { SkeletonStage } from "../../components/SkeletonStage";
import { BackLink, Body, Button, Screen, Title } from "../../components/ui";
import { applyMarks, applyPose, retimedMarkers } from "../../domain";
import { formatClock } from "../../format";
import { estimateVideoPose } from "../../pose/videoPose";
import { useAppState } from "../../state/AppState";
import { colors, fonts } from "../../theme";

export default function ReviewScreen() {
  const { analysisId } = useLocalSearchParams<{ analysisId: string }>();
  const { analyses, updateAnalysis } = useAppState();
  const stored = analyses.find((item) => item.id === analysisId);
  const [frame, setFrame] = useState(stored?.marks.plant ?? 0);
  const [phase, setPhase] = useState<PhaseId>("plant");
  const [marks, setMarks] = useState(stored?.marks);
  const [adjusted, setAdjusted] = useState(stored?.marksAdjusted ?? false);
  const [playing, setPlaying] = useState(false);
  const [poseNote, setPoseNote] = useState<string | null>(null);
  const [poseBusy, setPoseBusy] = useState(false);
  const [poseProgress, setPoseProgress] = useState("");

  useEffect(() => {
    if (!stored) return;
    setMarks(stored.marks);
    setAdjusted(stored.marksAdjusted);
    setFrame(stored.marks.plant);
  }, [stored?.id]);

  const live = useMemo(() => {
    if (!stored || !marks) return null;
    return evaluate(stored.frames, marks, stored.takeoffSide);
  }, [marks, stored]);

  if (!stored || !marks || !live) {
    return (
      <Screen>
        <BackLink label="Back" onPress={() => router.back()} />
        <Title>Missing jump</Title>
        <Body dim>This analysis is not on the phone.</Body>
      </Screen>
    );
  }

  const current = stored.frames[frame];
  const readout = frameReadout(current ?? null, stored.takeoffSide);
  const hasPose = stored.frames.some((item) => item.points);

  function commit(nextMarks = marks, nextAdjusted = adjusted) {
    if (!nextMarks) return;
    updateAnalysis(applyMarks(stored!, nextMarks, nextAdjusted));
  }

  function movePhase(nextFrame: number) {
    const next = setMark(marks!, phase, nextFrame, stored!.frames.length);
    setMarks(next);
    setAdjusted(true);
    setFrame(next[phase]);
    setPlaying(false);
  }

  return (
    <Screen
      footer={
        <Button
          label="Coaching sheet"
          onPress={() => {
            commit(marks, adjusted);
            router.push(`/result/${stored.id}`);
          }}
        />
      }
    >
      <BackLink label="Athlete" onPress={() => router.back()} />
      <Title>{stored.title}</Title>
      <Body dim>{banner(stored.fidelity)}</Body>
      {stored.videoUri ? (
        <JumpVideo
          uri={stored.videoUri}
          timeSec={current?.timeSec ?? 0}
          playing={playing}
          onTime={(seconds) => {
            const index = nearestFrame(stored.frames, seconds);
            setFrame(index);
          }}
          onDuration={(duration) => {
            if (stored.fidelity !== "markers" || adjusted) return;
            const last = stored.frames[stored.frames.length - 1]?.timeSec ?? 0;
            if (Math.abs(last - duration) < 0.4) return;
            const next = retimedMarkers(stored, duration);
            updateAnalysis(next);
            setMarks(next.marks);
          }}
        />
      ) : null}
      {hasPose ? <SkeletonStage frames={stored.frames} index={frame} phase={phase} /> : null}
      <View style={styles.scoreRow}>
        <Text style={styles.score}>{live.overall}</Text>
        <Text style={styles.scoreKind}>{live.scoreKind === "technique" ? "Technique" : "Rhythm"}</Text>
        {stored.videoUri ? (
          <Pressable onPress={() => setPlaying((value) => !value)}>
            <Text style={styles.play}>{playing ? "Pause" : "Play"}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.time}>
        Frame {frame + 1} / {stored.frames.length} · {formatClock(current?.timeSec ?? 0)}
      </Text>
      <Slider
        minimumValue={0}
        maximumValue={Math.max(0, stored.frames.length - 1)}
        step={1}
        value={frame}
        onSlidingStart={() => setPlaying(false)}
        onValueChange={(value) => setFrame(Math.round(value))}
        minimumTrackTintColor={colors.clay}
        maximumTrackTintColor={colors.line}
        thumbTintColor={colors.ink}
      />
      <View style={styles.phases}>
        {PHASES.map((item) => (
          <Pressable key={item} onPress={() => { setPhase(item); setFrame(marks[item]); setPlaying(false); }} style={[styles.chip, phase === item && styles.chipOn]}>
            <Text style={[styles.chipText, phase === item && styles.chipTextOn]}>{PHASE_LABEL[item]}</Text>
            <Text style={[styles.chipTime, phase === item && styles.chipTextOn]}>{formatClock(stored.frames[marks[item]]?.timeSec ?? 0)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.nudge}>
        <Button label="−1 frame" tone="paper" onPress={() => movePhase(frame - 1)} />
        <Button label="Use this frame" tone="ink" onPress={() => movePhase(frame)} />
        <Button label="+1 frame" tone="paper" onPress={() => movePhase(frame + 1)} />
      </View>
      <Text style={styles.readout}>
        {readout.knee == null
          ? "No joints on this frame."
          : `Knee ${Math.round(readout.knee)}° · trunk ${readout.trunk == null ? "—" : `${Math.round(readout.trunk)}°`}`}
      </Text>
      {stored.detectionNotes.map((note) => (
        <Body key={note} dim>
          {note}
        </Body>
      ))}
      {stored.videoUri && Platform.OS === "web" ? (
        <Button
          label={poseBusy ? `Reading joints ${poseProgress}` : "Read joints with MoveNet"}
          tone="field"
          disabled={poseBusy}
          onPress={() => {
            setPoseBusy(true);
            setPoseNote(null);
            void estimateVideoPose(stored.videoUri!, (done, total) => setPoseProgress(`${done}/${total}`))
              .then((result) => {
                if (!result.ok) {
                  setPoseNote(result.reason);
                  return;
                }
                const next = applyPose(stored, result.frames);
                updateAnalysis(next);
                setMarks(next.marks);
                setAdjusted(false);
                setFrame(next.marks.plant);
                setPoseNote("Joints are in. The skeleton and the technique score now follow this clip.");
              })
              .finally(() => setPoseBusy(false));
          }}
        />
      ) : null}
      {stored.videoUri && Platform.OS !== "web" ? (
        <Body dim>
          Expo Go on a phone saves the clip and scores the rhythm of the markers. MoveNet runs in the browser build of
          this project. A dev build can host the same estimator on device later.
        </Body>
      ) : null}
      {poseNote ? <Body>{poseNote}</Body> : null}
    </Screen>
  );
}

function nearestFrame(frames: { timeSec: number }[], seconds: number) {
  let best = 0;
  let bestGap = Infinity;
  frames.forEach((item, index) => {
    const gap = Math.abs(item.timeSec - seconds);
    if (gap < bestGap) {
      bestGap = gap;
      best = index;
    }
  });
  return best;
}

function banner(fidelity: string) {
  if (fidelity === "sample") return "Sample skeleton. The joints are a coaching model, and every angle is measured from them.";
  if (fidelity === "movenet") return "MoveNet read the joints in the browser. Nudge a marker if a phase landed on the wrong frame.";
  return "Rhythm comes from the markers. Move them onto the real plant, toe-off, and landing before you trust the times.";
}

const styles = StyleSheet.create({
  scoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  score: { fontFamily: fonts.display, fontSize: 48, lineHeight: 52, color: colors.ink },
  scoreKind: { fontFamily: fonts.bodySemi, color: colors.inkSoft, marginBottom: 8 },
  play: { fontFamily: fonts.bodySemi, color: colors.clay, marginBottom: 8, marginLeft: "auto" },
  time: { fontFamily: fonts.body, color: colors.inkSoft },
  phases: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.paper, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 13 },
  chipTime: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 12 },
  chipTextOn: { color: colors.white },
  nudge: { gap: 8 },
  readout: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 15 },
});

import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PHASE_LABEL } from "../../analysis/config/ranges";
import { PHASES } from "../../analysis/types";
import { BackLink, Body, Button, Card, Screen, TextButton, Title } from "../../components/ui";
import { useAppState } from "../../state/AppState";
import { colors, fonts } from "../../theme";

export default function ResultScreen() {
  const { analysisId } = useLocalSearchParams<{ analysisId: string }>();
  const { analyses } = useAppState();
  const analysis = analyses.find((item) => item.id === analysisId);
  if (!analysis) {
    return (
      <Screen>
        <BackLink label="Back" onPress={() => router.back()} />
        <Title>Missing sheet</Title>
      </Screen>
    );
  }
  const { evaluation } = analysis;
  const previous = analyses
    .filter((item) => item.athleteId === analysis.athleteId && item.id !== analysis.id && item.createdAt < analysis.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <Screen>
      <BackLink label="Frames" onPress={() => router.push(`/review/${analysis.id}`)} />
      <Text style={styles.kind}>{evaluation.scoreKind === "technique" ? "Technique score" : "Rhythm score"}</Text>
      <Text style={styles.score}>{evaluation.overall}</Text>
      <Body dim>Out of 100. {analysis.title}.</Body>
      {evaluation.warnings.map((warning) => (
        <Body key={warning} dim>
          {warning}
        </Body>
      ))}
      <View style={styles.phases}>
        {PHASES.map((phase) => (
          <View key={phase} style={styles.phase}>
            <Text style={styles.phaseScore}>{evaluation.phaseScores[phase] ?? "—"}</Text>
            <Text style={styles.phaseLabel}>{PHASE_LABEL[phase]}</Text>
          </View>
        ))}
      </View>
      <Card>
        <Text style={styles.kicker}>What held up</Text>
        <Text style={styles.cardTitle}>{evaluation.coaching.kept.title}</Text>
        <Body>{evaluation.coaching.kept.body}</Body>
      </Card>
      {evaluation.coaching.fixes.map((fix, index) => (
        <Card key={`${fix.metricId}-${index}`}>
          <Text style={styles.kicker}>{fix.kind === "sharpen" ? `Sharpen ${index + 1}` : `Fix ${index + 1}`}</Text>
          <Text style={styles.cardTitle}>{fix.title}</Text>
          <Body>{fix.body}</Body>
          <Text style={styles.drill}>
            {fix.drill} · {fix.dose}
          </Text>
          <Body dim>{fix.how}</Body>
        </Card>
      ))}
      <Text style={styles.section}>Measures</Text>
      {evaluation.metrics.map((metric) => (
        <View key={metric.id} style={styles.metric}>
          <View style={styles.metricHead}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>
              {metric.value == null
                ? "—"
                : metric.unit === "s"
                  ? `${metric.value.toFixed(2)}s`
                  : metric.unit === "%"
                    ? `${metric.value.toFixed(0)}%`
                    : metric.unit === "ratio"
                      ? metric.value.toFixed(2)
                      : `${Math.round(metric.value)}${metric.unit === "°" ? "°" : ""}`}
            </Text>
          </View>
          <Text style={styles.metricMeta}>
            Window {metric.idealMin}–{metric.idealMax} {metric.unit}
            {metric.score != null ? ` · ${Math.round(metric.score)}` : ""}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${metric.score ?? 0}%` }]} />
          </View>
          {metric.unavailableReason ? <Text style={styles.metricMeta}>{metric.unavailableReason}</Text> : null}
          <Text style={styles.source}>{metric.source}</Text>
        </View>
      ))}
      <Button label="Back to frames" tone="paper" onPress={() => router.push(`/review/${analysis.id}`)} />
      {previous ? (
        <Button
          label="Compare with the previous jump"
          tone="ink"
          onPress={() => router.push(`/compare?a=${previous.id}&b=${analysis.id}`)}
        />
      ) : null}
      <TextButton label="Athlete" onPress={() => router.push(`/athlete/${analysis.athleteId}`)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kind: { fontFamily: fonts.bodySemi, color: colors.clay, letterSpacing: 1, textTransform: "uppercase", fontSize: 12 },
  score: { fontFamily: fonts.display, fontSize: 88, lineHeight: 92, color: colors.ink },
  phases: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  phase: { backgroundColor: colors.paper, borderRadius: 12, padding: 10, minWidth: 90, borderWidth: 1, borderColor: colors.line },
  phaseScore: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  phaseLabel: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 12 },
  kicker: { fontFamily: fonts.bodySemi, color: colors.clay, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.ink },
  drill: { fontFamily: fonts.bodySemi, color: colors.field, fontSize: 15 },
  section: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, marginTop: 6 },
  metric: { gap: 4, paddingBottom: 8 },
  metricHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  metricLabel: { fontFamily: fonts.bodyMedium, color: colors.ink, flex: 1 },
  metricValue: { fontFamily: fonts.bodySemi, color: colors.ink },
  metricMeta: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 12 },
  track: { height: 6, backgroundColor: colors.sandDeep, borderRadius: 99, overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.field },
  source: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
});

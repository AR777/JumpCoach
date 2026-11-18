import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BackLink, Body, Screen, Title } from "../components/ui";
import { formatWhen } from "../format";
import { useAppState } from "../state/AppState";
import { colors, fonts } from "../theme";

export default function CompareScreen() {
  const params = useLocalSearchParams<{ a?: string; b?: string }>();
  const { analyses, athletes } = useAppState();
  const left = analyses.find((item) => item.id === params.a);
  const right = analyses.find((item) => item.id === params.b);
  if (!left || !right) {
    return (
      <Screen>
        <BackLink label="Back" onPress={() => router.back()} />
        <Title>Pick two jumps</Title>
        <Body dim>Open an athlete and choose Compare, then two sessions.</Body>
      </Screen>
    );
  }
  const name = (athleteId: string) => athletes.find((athlete) => athlete.id === athleteId)?.name ?? "Athlete";
  const ids = new Set([...left.evaluation.metrics, ...right.evaluation.metrics].map((metric) => metric.id));

  return (
    <Screen>
      <BackLink label="Back" onPress={() => router.back()} />
      <Title>Side by side</Title>
      <View style={styles.head}>
        <ColumnHead
          who={name(left.athleteId)}
          title={left.title}
          when={formatWhen(left.createdAt)}
          score={left.evaluation.overall}
        />
        <ColumnHead
          who={name(right.athleteId)}
          title={right.title}
          when={formatWhen(right.createdAt)}
          score={right.evaluation.overall}
        />
      </View>
      <Text style={styles.delta}>
        {right.evaluation.overall - left.evaluation.overall >= 0 ? "+" : ""}
        {right.evaluation.overall - left.evaluation.overall} on the right-hand jump
      </Text>
      {[...ids].map((id) => {
        const a = left.evaluation.metrics.find((metric) => metric.id === id);
        const b = right.evaluation.metrics.find((metric) => metric.id === id);
        if (!a || !b) return null;
        const delta = a.score != null && b.score != null ? Math.round(b.score - a.score) : null;
        return (
          <View key={id} style={styles.row}>
            <Text style={styles.label}>{a.label}</Text>
            <Text style={styles.nums}>
              {fmt(a.value, a.unit)} → {fmt(b.value, b.unit)}
              {delta == null ? "" : `  (${delta >= 0 ? "+" : ""}${delta})`}
            </Text>
          </View>
        );
      })}
    </Screen>
  );
}

function ColumnHead({ who, title, when, score }: { who: string; title: string; when: string; score: number }) {
  return (
    <View style={styles.col}>
      <Text style={styles.who}>{who}</Text>
      <Text style={styles.score}>{score}</Text>
      <Text style={styles.meta}>
        {title} · {when}
      </Text>
    </View>
  );
}

function fmt(value: number | null, unit: string) {
  if (value == null) return "—";
  if (unit === "s") return `${value.toFixed(2)}s`;
  if (unit === "%") return `${value.toFixed(0)}%`;
  if (unit === "ratio") return value.toFixed(2);
  return `${Math.round(value)}°`;
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: 12 },
  col: { flex: 1, backgroundColor: colors.paper, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line },
  who: { fontFamily: fonts.bodySemi, color: colors.inkSoft, fontSize: 12 },
  score: { fontFamily: fonts.display, fontSize: 42, color: colors.ink },
  meta: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 12 },
  delta: { fontFamily: fonts.bodySemi, color: colors.field },
  row: { gap: 2, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  label: { fontFamily: fonts.bodyMedium, color: colors.ink },
  nums: { fontFamily: fonts.body, color: colors.inkSoft },
});

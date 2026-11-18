import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Eyebrow, Field, Screen, Sheet, Title } from "../components/ui";
import { formatWhen, scoreTone } from "../format";
import { useAppState } from "../state/AppState";
import { colors, fonts } from "../theme";

export default function HomeScreen() {
  const { ready, error, athletes, analyses, addAthlete, loadSampleGroup } = useAppState();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const recent = analyses
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  return (
    <Screen>
      <Eyebrow>Long jump</Eyebrow>
      <Title>JumpCoach</Title>
      <Body dim>A coaching notebook for the long jump. Free, and it stays on this phone.</Body>
      {error ? <Body>{error}</Body> : null}
      {!ready ? <Body dim>Opening the team sheet…</Body> : null}
      {ready && athletes.length === 0 ? (
        <Card>
          <Text style={styles.cardTitle}>No athletes yet</Text>
          <Body dim>Add someone you coach, or load a sample group to see a full technique sheet.</Body>
        </Card>
      ) : null}
      <Button
        label="Add an athlete"
        onPress={() => setOpen(true)}
        disabled={!ready}
      />
      <Button
        label="Load a sample group"
        tone="paper"
        disabled={!ready}
        onPress={() => {
          const athlete = loadSampleGroup();
          router.push(`/athlete/${athlete.id}`);
        }}
      />
      {athletes.map((athlete) => {
        const jumps = analyses
          .filter((analysis) => analysis.athleteId === athlete.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const latest = jumps[jumps.length - 1];
        return (
          <Pressable key={athlete.id} accessibilityRole="button" onPress={() => router.push(`/athlete/${athlete.id}`)}>
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{athlete.name}</Text>
                  <Text style={styles.meta}>
                    {athlete.note || "No note"} · {jumps.length} jump{jumps.length === 1 ? "" : "s"}
                  </Text>
                </View>
                <Text style={[styles.score, toneStyle(latest ? scoreTone(latest.evaluation.overall) : "mid")]}>
                  {latest ? latest.evaluation.overall : "—"}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
      {recent.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.section}>Recent jumps</Text>
          {recent.map((analysis) => {
            const athlete = athletes.find((item) => item.id === analysis.athleteId);
            return (
              <Pressable key={analysis.id} onPress={() => router.push(`/result/${analysis.id}`)}>
                <Text style={styles.recent}>
                  {athlete?.name ?? "Athlete"} · {analysis.title} · {analysis.evaluation.overall} ·{" "}
                  {formatWhen(analysis.createdAt)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Sheet visible={open} title="New athlete" onClose={() => setOpen(false)}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Jordan Hale" autoFocus />
        <Field label="Note" value={note} onChangeText={setNote} placeholder="U18 · PB 5.40m" />
        <Button
          label="Save athlete"
          disabled={name.trim().length === 0}
          onPress={() => {
            const athlete = addAthlete(name, note);
            setName("");
            setNote("");
            setOpen(false);
            router.push(`/athlete/${athlete.id}`);
          }}
        />
      </Sheet>
    </Screen>
  );
}

function toneStyle(tone: "good" | "mid" | "low") {
  if (tone === "good") return { color: colors.field };
  if (tone === "mid") return { color: colors.gold };
  return { color: colors.clay };
}

const styles = StyleSheet.create({
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.ink },
  meta: { fontFamily: fonts.body, color: colors.inkSoft, marginTop: 2 },
  score: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40 },
  section: { fontFamily: fonts.bodySemi, color: colors.ink, marginTop: 8 },
  recent: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 14 },
});

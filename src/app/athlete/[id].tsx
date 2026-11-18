import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { RECIPES } from "../../analysis/sample/recipes";
import { BackLink, Body, Button, Card, Field, Screen, Sheet, TextButton, Title } from "../../components/ui";
import { buildSampleAnalysis } from "../../domain";
import { formatWhen } from "../../format";
import { useAppState } from "../../state/AppState";
import { colors, fonts } from "../../theme";

export default function AthleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { athletes, analyses, updateAthlete, deleteAthlete, addAnalysis, deleteAnalysis } = useAppState();
  const athlete = athletes.find((item) => item.id === id);
  const jumps = useMemo(
    () =>
      analyses
        .filter((analysis) => analysis.athleteId === id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [analyses, id],
  );
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(athlete?.name ?? "");
  const [note, setNote] = useState(athlete?.note ?? "");
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  if (!athlete) {
    return (
      <Screen>
        <BackLink label="Team sheet" onPress={() => router.back()} />
        <Title>Missing athlete</Title>
        <Body dim>That name is not on the sheet stored on this phone.</Body>
      </Screen>
    );
  }

  function togglePick(analysisId: string) {
    setPicked((current) => {
      if (current.includes(analysisId)) return current.filter((item) => item !== analysisId);
      if (current.length >= 2) return [current[1]!, analysisId];
      return [...current, analysisId];
    });
  }

  return (
    <Screen>
      <BackLink label="Team sheet" onPress={() => router.back()} />
      <Title>{athlete.name}</Title>
      <Body dim>{athlete.note || "No note yet."}</Body>
      <View style={styles.links}>
        <TextButton
          label="Edit"
          onPress={() => {
            setName(athlete.name);
            setNote(athlete.note);
            setEditing(true);
          }}
        />
        <TextButton
          label="Delete athlete"
          onPress={() => {
            deleteAthlete(athlete.id);
            router.replace("/");
          }}
        />
      </View>
      <Card>
        <Text style={styles.cardTitle}>Score trend</Text>
        {jumps.length < 2 ? (
          <Body dim>Two jumps will draw a line. One session is just a point.</Body>
        ) : (
          <Trend scores={jumps.map((jump) => jump.evaluation.overall)} />
        )}
      </Card>
      <Button label="Film a jump" onPress={() => router.push(`/capture/${athlete.id}`)} />
      <Button label="Study a sample" tone="paper" onPress={() => setSamplesOpen(true)} />
      <View style={styles.links}>
        <Text style={styles.cardTitle}>Jumps</Text>
        {jumps.length > 1 ? (
          <TextButton
            label={compareMode ? "Cancel compare" : "Compare"}
            onPress={() => {
              setCompareMode((value) => !value);
              setPicked([]);
            }}
          />
        ) : null}
      </View>
      {jumps.length === 0 ? <Body dim>No jumps saved for this athlete.</Body> : null}
      {jumps
        .slice()
        .reverse()
        .map((jump) => {
          const selected = picked.includes(jump.id);
          return (
            <Card key={jump.id} style={selected ? styles.selected : undefined}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (compareMode) togglePick(jump.id);
                  else router.push(`/result/${jump.id}`);
                }}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jumpTitle}>{jump.title}</Text>
                    <Text style={styles.meta}>
                      {formatWhen(jump.createdAt)} · {labelFor(jump.fidelity)} · {jump.evaluation.scoreKind}
                    </Text>
                  </View>
                  <Text style={styles.score}>{jump.evaluation.overall}</Text>
                </View>
              </Pressable>
              {!compareMode ? <TextButton label="Delete jump" onPress={() => deleteAnalysis(jump.id)} /> : null}
            </Card>
          );
        })}
      {compareMode ? (
        <Button
          label="Open comparison"
          disabled={picked.length !== 2}
          onPress={() => router.push(`/compare?a=${picked[0]}&b=${picked[1]}`)}
        />
      ) : null}
      <Sheet visible={editing} title="Edit athlete" onClose={() => setEditing(false)}>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Note" value={note} onChangeText={setNote} />
        <Button
          label="Save"
          disabled={name.trim().length === 0}
          onPress={() => {
            updateAthlete(athlete.id, { name: name.trim(), note: note.trim() });
            setEditing(false);
          }}
        />
      </Sheet>
      <Sheet visible={samplesOpen} title="Sample jumps" onClose={() => setSamplesOpen(false)}>
        <Body dim>These skeletons are generated models, not a filmed athlete. The angles and scores are real math.</Body>
        {RECIPES.map((recipe) => (
          <Pressable
            key={recipe.id}
            onPress={() => {
              const analysis = buildSampleAnalysis(athlete.id, recipe.id);
              addAnalysis(analysis);
              setSamplesOpen(false);
              router.push(`/review/${analysis.id}`);
            }}
          >
            <Card>
              <Text style={styles.jumpTitle}>{recipe.title}</Text>
              <Text style={styles.meta}>{recipe.blurb}</Text>
            </Card>
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}

function labelFor(fidelity: string) {
  if (fidelity === "sample") return "Sample skeleton";
  if (fidelity === "movenet") return "MoveNet";
  return "Your video";
}

function Trend({ scores }: { scores: number[] }) {
  const width = 300;
  const height = 88;
  const points = scores
    .map((score, index) => {
      const x = scores.length === 1 ? width / 2 : (index / (scores.length - 1)) * (width - 16) + 8;
      const y = height - 10 - (score / 100) * (height - 20);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline points={points} fill="none" stroke={colors.clay} strokeWidth={3} strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  jumpTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.body, color: colors.inkSoft, marginTop: 2 },
  score: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  selected: { borderColor: colors.clay },
});

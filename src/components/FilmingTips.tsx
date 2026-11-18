import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

const TIPS = [
  ["Side-on", "Stand square to the runway. A diagonal hides the knee and the trunk."],
  ["Board height", "Put the lens about level with the takeoff board, not up in the stands."],
  ["Whole jump", "Approach, board, flight, and the landing in the sand all stay in frame."],
  ["Hold still", "Brace on a rail or a tripod. Panning makes every angle lie."],
  ["Daylight, 60 fps", "Use the fastest frame rate the phone offers. Blur hides the plant."],
  ["One athlete", "Full body, and nobody walking through behind the board."],
];

export function FilmingTips() {
  return (
    <View style={styles.wrap}>
      {TIPS.map(([title, body]) => (
        <View key={title} style={styles.row}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { gap: 2 },
  title: { fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 15 },
  body: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
});

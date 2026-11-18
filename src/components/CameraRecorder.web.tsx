import { StyleSheet, Text } from "react-native";
import { colors, fonts } from "../theme";

export function CameraRecorder(_props: { onRecorded: (uri: string) => void }) {
  return (
    <Text style={styles.note}>
      Recording needs the Expo Go app on a phone. In this browser, import a video you already filmed, or study a sample
      jump from the athlete page.
    </Text>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 15, lineHeight: 22 },
});

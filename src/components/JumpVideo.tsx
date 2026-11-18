import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

export function JumpVideo({
  uri,
  timeSec,
  playing,
  onTime,
  onDuration,
}: {
  uri: string;
  timeSec: number;
  playing: boolean;
  onTime: (seconds: number) => void;
  onDuration: (seconds: number) => void;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.pause();
    instance.timeUpdateEventInterval = 0.05;
    instance.muted = true;
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    if (player.playing) onTime(currentTime);
  });

  useEventListener(player, "sourceLoad", ({ duration }) => {
    if (duration > 0) onDuration(duration);
  });

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  useEffect(() => {
    if (playing) return;
    if (Math.abs((player.currentTime ?? 0) - timeSec) > 0.08) {
      player.currentTime = timeSec;
    }
  }, [playing, player, timeSec]);

  return (
    <View style={styles.wrap}>
      <VideoView player={player} style={styles.video} nativeControls={false} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 18, overflow: "hidden", backgroundColor: colors.stadium },
  video: { width: "100%", height: 240 },
});

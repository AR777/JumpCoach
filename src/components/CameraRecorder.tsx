import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { Button } from "./ui";

export function CameraRecorder({ onRecorded }: { onRecorded: (uri: string) => void }) {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  if (!cameraPermission || !micPermission) {
    return <Text style={styles.note}>Checking the camera…</Text>;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.block}>
        <Text style={styles.note}>
          JumpCoach needs the camera to film the jump. The microphone permission is only there because some phones will
          not start a video recording without it. The clip is muted.
        </Text>
        <Button
          label="Allow camera"
          onPress={() => {
            void requestCamera();
            void requestMic();
          }}
        />
      </View>
    );
  }

  async function toggle() {
    if (recording) {
      cameraRef.current?.stopRecording();
      return;
    }
    setMessage(null);
    setRecording(true);
    setSeconds(0);
    try {
      const video = await cameraRef.current?.recordAsync({ maxDuration: 12 });
      if (video?.uri) onRecorded(video.uri);
      else setMessage("The recording did not return a file.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recording failed.");
    } finally {
      setRecording(false);
    }
  }

  return (
    <View style={styles.block}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="video"
        mute
        videoQuality="720p"
        onCameraReady={() => setReady(true)}
        onRecordingProgress={(event) => setSeconds(event.duration)}
      />
      <Button
        label={recording ? `Stop · ${seconds.toFixed(1)}s` : ready ? "Record up to 12s" : "Starting camera"}
        onPress={() => void toggle()}
        disabled={!ready}
        tone="clay"
      />
      {message ? <Text style={styles.note}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  camera: { height: 320, borderRadius: 18, overflow: "hidden", backgroundColor: colors.stadium },
  note: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
});

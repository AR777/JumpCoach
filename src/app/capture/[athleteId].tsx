import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { CameraRecorder } from "../../components/CameraRecorder";
import { FilmingTips } from "../../components/FilmingTips";
import { BackLink, Body, Button, Card, Screen, Title } from "../../components/ui";
import { buildMarkerAnalysis } from "../../domain";
import { persistJumpVideo } from "../../media/persistVideo";
import { useAppState } from "../../state/AppState";
import { uid } from "../../ids";

export default function CaptureScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { athletes, addAnalysis } = useAppState();
  const athlete = athletes.find((item) => item.id === athleteId);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveClip(uri: string, source: "camera" | "library", durationMs?: number | null, width?: number, height?: number) {
    if (!athleteId) return;
    setBusy(true);
    setMessage(null);
    try {
      const id = uid("jump");
      const stored = await persistJumpVideo(uri, id);
      const analysis = buildMarkerAnalysis({
        id,
        athleteId,
        source,
        videoUri: stored,
        durationSec: durationMs ? durationMs / 1000 : 0,
        videoWidth: width,
        videoHeight: height,
      });
      addAnalysis(analysis);
      router.replace(`/review/${analysis.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The video could not be saved.");
      setBusy(false);
    }
  }

  async function importVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Photo library access is off, so a saved jump cannot be opened.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await saveClip(asset.uri, "library", asset.duration, asset.width, asset.height);
  }

  if (!athlete) {
    return (
      <Screen>
        <BackLink label="Back" onPress={() => router.back()} />
        <Title>Missing athlete</Title>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink label={athlete.name} onPress={() => router.back()} />
      <Title>Film the jump</Title>
      <Body dim>Side-on, still camera, whole approach through the pit. Then set the key frames on the next screen.</Body>
      <Card>
        <FilmingTips />
      </Card>
      <CameraRecorder onRecorded={(uri) => void saveClip(uri, "camera")} />
      <Button label={busy ? "Saving the clip…" : "Import a video"} tone="ink" disabled={busy} onPress={() => void importVideo()} />
      {message ? <Body>{message}</Body> : null}
    </Screen>
  );
}

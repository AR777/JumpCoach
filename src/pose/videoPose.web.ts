import type { PoseDetector } from "@tensorflow-models/pose-detection";
import type { LandmarkName, PoseFrame, PosePoint } from "../analysis/types";
import { LANDMARKS } from "../analysis/types";
import type { PoseEstimate } from "./videoPose";

const NAMES = new Set<string>(LANDMARKS);

let detectorPromise: Promise<PoseDetector> | null = null;

async function loadDetector(): Promise<PoseDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const tf = await import("@tensorflow/tfjs-core");
      await import("@tensorflow/tfjs-backend-webgl");
      const pose = await import("@tensorflow-models/pose-detection");
      await tf.ready();
      await tf.setBackend("webgl");
      return pose.createDetector(pose.SupportedModels.MoveNet, {
        modelType: pose.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      });
    })();
  }
  const ready = detectorPromise;
  return ready;
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    const onSeeked = () => {
      finish();
      resolve();
    };
    const onError = () => {
      finish();
      reject(new Error("The browser could not seek inside that video."));
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    if (Math.abs(video.currentTime - time) < 0.001) {
      finish();
      resolve();
      return;
    }
    video.currentTime = time;
  });
}

export async function estimateVideoPose(
  uri: string,
  onProgress?: (done: number, total: number) => void,
): Promise<PoseEstimate> {
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = uri;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("The browser could not open that video."));
    });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      return { ok: false, reason: "That video has no duration, so frames could not be sampled." };
    }
    const total = Math.min(48, Math.max(12, Math.round(Math.min(duration, 8) * 8)));
    const span = Math.min(duration, 8);
    const width = 320;
    const height = Math.max(180, Math.round((width * video.videoHeight) / Math.max(1, video.videoWidth)));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { ok: false, reason: "Could not draw video frames." };
    const detector = await loadDetector();
    const frames: PoseFrame[] = [];
    let usable = 0;
    for (let index = 0; index < total; index += 1) {
      const time = ((index + 0.5) * span) / total;
      await seek(video, Math.min(duration - 0.05, time));
      context.drawImage(video, 0, 0, width, height);
      const poses = await detector.estimatePoses(canvas, undefined, time * 1000);
      const keypoints = poses[0]?.keypoints ?? [];
      const points: Partial<Record<LandmarkName, PosePoint>> = {};
      for (const keypoint of keypoints) {
        if (!keypoint.name || !NAMES.has(keypoint.name)) continue;
        points[keypoint.name as LandmarkName] = {
          x: keypoint.x,
          y: height - keypoint.y,
          c: keypoint.score ?? 0,
        };
      }
      const hip = points.left_hip ?? points.right_hip;
      if ((hip?.c ?? 0) > 0.25) usable += 1;
      frames.push({ index, timeSec: time, points });
      onProgress?.(index + 1, total);
    }
    if (usable < total * 0.35) {
      return {
        ok: false,
        reason: "MoveNet could not see a full body in enough frames. Check the side-on setup, or set the markers yourself.",
      };
    }
    return { ok: true, frames, width, height };
  } catch (error) {
    detectorPromise = null;
    const message = error instanceof Error ? error.message : "MoveNet failed.";
    return { ok: false, reason: message };
  }
}

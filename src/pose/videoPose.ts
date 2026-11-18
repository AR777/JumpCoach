import type { PoseFrame } from "../analysis/types";

export type PoseEstimate =
  | { ok: true; frames: PoseFrame[]; width: number; height: number }
  | { ok: false; reason: string };

/**
 * Native Expo Go builds do not include a pose runtime. The browser build
 * replaces this file with MoveNet. Callers should keep the marker sheet when
 * this returns ok: false.
 */
export async function estimateVideoPose(
  _uri: string,
  _onProgress?: (done: number, total: number) => void,
): Promise<PoseEstimate> {
  return {
    ok: false,
    reason:
      "On-device pose is not in the Expo Go build. Mark the phases for a rhythm sheet, or open this project in a browser to run MoveNet on the clip.",
  };
}

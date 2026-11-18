# JumpCoach

Source: https://github.com/AR777/JumpCoach

JumpCoach is a free long-jump coaching notebook for iOS and Android. Film a jump, or open a sample, then scrub the key frames, read a technique score out of 100, and leave with two drills.

It is an original app. The ranges and drills live in one config file you can edit.

## Try it

Install dependencies, then start Expo:

```bash
npm install
npx expo start
```

- **Phone:** install Expo Go for the SDK this project uses (Expo SDK 58). Scan the QR code. Camera recording works on a device. The simulator has no useful camera.
- **iOS simulator:** `npx expo start --ios` on a Mac, then use Import or a sample jump.
- **Android emulator:** `npx expo start --android`, same idea.
- **Browser:** `npx expo start --web`. Import a side-on clip and press **Read joints with MoveNet**, or load a sample group. Recording is phone-only.

The first time MoveNet runs in the browser it downloads the Lightning model from TF Hub. That needs a network connection.

## What you can do

1. Keep several athletes on one phone. Nothing is uploaded. There is no account and no paywall.
2. Record a jump (up to 12 seconds, muted) or import a video. The filming card covers the setup: side-on, lens near board height, whole approach through the pit, a still camera, 60 fps if the phone has it.
3. Scrub frame by frame. Move the penultimate, plant, toe-off, flight, and landing markers if the guess is wrong. The sheet recomputes.
4. Read an overall score and a score for each phase. Sample jumps and MoveNet clips score joint angles. A phone video without a pose model scores the rhythm of the markers you set.
5. Get one thing that held up, and two fixes ranked by how far they sit from the window and how much they matter. Each fix names a drill and a dose, such as `6 x 30m`.
6. Come back later. Scores stay on the athlete, with a small trend, and you can put two jumps side by side.

**Load a sample group** on the team sheet creates Alex Rivera with four sessions so you can see the whole path without a video.

## How the analysis works

The coaching math does not know about React Native. It takes a list of frames. Each frame has a time and 17 landmarks in the same layout as MoveNet. Coordinates are a plane where **+x is the run direction** and **+y is up**. If the hips travel the other way, the sequence is mirrored before anything is measured.

Phases come from the feet:

- A frame is “on the ground” when the lower ankle is close to the lowest ankle heights in the clip.
- Contacts are grouped into spans.
- The flight is the airborne gap that is long enough to be the jump, not the little gap between approach steps.
- Plant and toe-off are the ends of the contact before that flight. Landing is the next contact. The penultimate mark is the lowest hip in the contact before the plant.

Measures, all defined in [`src/analysis/config/ranges.ts`](src/analysis/config/ranges.ts):

| Measure | What it is |
| --- | --- |
| Hip drop | Percent the hip is lower at the penultimate mark than the median hip earlier in the clip. This percent is JumpCoach's own 2D measure. |
| Knee angles | Interior angle at the knee. Straight is 180°. |
| Hip extension | Shoulder–hip–knee of the takeoff leg at toe-off. |
| Trunk lean | Degrees from vertical. Positive means the shoulders are ahead of the hips. |
| Takeoff angle | Direction of hip travel in the first tenth of a second after toe-off. |
| Free-knee drive | Swing thigh relative to horizontal. 0° is parallel to the ground and forward. |
| Feet ahead | How far the lead ankle sits in front of the hip, divided by that leg's length. |
| Contact, gap, flight time | Seconds between the markers. These do not need a pose. |

A value inside its window scores 100. Outside, the score falls to 0 across the tolerance written next to the window. Phase scores are weighted averages of the measures in that phase. The overall score weights the phases (takeoff heaviest). Windows cite Hay (1986), Lees, Graham-Smith and Fowler (1994), Graham-Smith and Lees (2005), Linthorne, Guzman and Bridgett (2005), and the usual World Athletics coaching picture. Where a number was invented for a phone camera, the note in the config says so.

Coaching picks the strongest scored measure as the thing that held up, then the two measures with the most `impact × (100 − score)` as the work. Copy and doses live next to the windows, so changing a range does not leave the words behind.

Sample jumps are built with a small kinematic model in [`src/analysis/sample/synthesize.ts`](src/analysis/sample/synthesize.ts). Four recipes ship: a balanced takeoff, a flat leave, a soft plant, and a penultimate that never drops. Tests in `tests/` check the angle math, the phase detector, the score curve, and that those recipes land on the phases and faults they were built to show.

## Pose engines

`estimateVideoPose()` is the only vision entry point.

| Build | What runs |
| --- | --- |
| Sample jumps | The kinematic model. No camera model. This is the reliable path in Expo Go. |
| iOS / Android, Expo Go | The clip is saved on the phone. You set the five markers. The score is a **rhythm** score from those times. A full-body pose model is not bundled, because Expo Go cannot load an arbitrary native vision runtime. |
| Web | **MoveNet SinglePose Lightning** through TensorFlow.js (WebGL). Frames are sampled (about 8 per second, capped) and drawn to a canvas. Joints are converted to the same y-up frame the rest of the app uses, then the normal phase detector and scorer run. |

That split is deliberate. The analysis stays testable without a model, and a later on-device engine only has to return `PoseFrame[]`.

## Tests

```bash
npm test
npx tsc --noEmit
```

`npm test` runs Vitest on the analysis package only. It does not need a phone.

## Limitations

- One side-on camera. It cannot see a foul, a true center-of-mass velocity, or which flight style you meant. Takeoff angle is hip travel, not a force-plate vector.
- Marker rhythm on a phone is only as good as the frames you choose. The first guess is a percentage of the clip.
- MoveNet in the browser is sensitive to clutter, baggy kit, and a camera that is not square to the runway. Low-confidence frames are kept but can pull a phase onto the wrong step. Nudge the marker.
- Videos picked in the browser are not copied into durable storage. Reload the tab and the file may be gone. The score and the joints from a finished MoveNet pass are still saved. On a phone, the file is copied into the app documents folder.
- History is local AsyncStorage. Uninstalling the app clears it. There is no account sync.

## Next

- Ship a dev build with an on-device pose runtime (MediaPipe Pose or MoveNet via a vision-camera frame processor, or TFLite) so Expo Go is no longer the limit.
- Optional cloud pass for a longer clip, still with the same `PoseFrame` contract.
- Accounts and a coach login, only after the local sheet is worth sharing.
- Store listing: Expo Build (`eas build`) and Expo Submit for the App Store and Play Store. The app stays free.

## Project map

```
src/app            screens
src/analysis       angles, phases, scoring, coaching, ranges
src/analysis/sample  kinematic jumps
src/pose           MoveNet on web, honest fallback on device
src/storage        AsyncStorage
tests              unit tests and synthetic fixtures
```

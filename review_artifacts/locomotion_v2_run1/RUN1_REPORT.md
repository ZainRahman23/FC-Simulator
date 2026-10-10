# Locomotion V2 / RUN-1: morning report (draft, updated through the night)

## 1. Watch it

```
cd "$HOME/Downloads/FC Simulator worktrees/locomotion-v2-run1"
python3 -m http.server 8317 --bind 127.0.0.1
```

Then open **http://127.0.0.1:8317/sandbox/visual/run1.html**.

- **What you see.** The page autoplays RUN-1 and Locomotion V1 side by side.
  - The large view is the actual gameplay camera, CAMERA_V1.
  - On the right are close side views of RUN-1 (top) and V1 (bottom).
- **Speed.** 1× / 0.5× / 0.25× / 0.1×, plus a frame step.
- **Show.** RUN-1 only / both / V1 only. V1 can be the V1.3 presentation or V1 + LC-1.
- **Run.** Across, toward the camera, away, or diagonal, at 3.0 / 4.2 / 5.5 / 7.0 / 7.8 m/s or the 3 → 7.8 → 3 m/s ramp.
- **Game zoom.** 1× is the true game scale. Zooming in keeps the same camera and centres the runner.
- **Overlays.** Skeleton, contacts, pelvis / COM, foot trails.
- **Close views.** Choose the subject and angle (side, front, rear, front-¾, rear-¾, top).
- **⤓ State.** Exports the continuous RUN-1 state at the current time.
- **Keys.** Space, R, 1–4, `.`, S, C.

(The rest of this report is filled in at the end of the night.)

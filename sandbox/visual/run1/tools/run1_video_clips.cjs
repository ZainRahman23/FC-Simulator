// run1/tools/run1_video_clips.cjs — the ARCHIVAL CLIP definitions shared by run1_video.cjs (capture) and run1_video_verify.cjs (independent replay).
// A clip = which viewer lanes (an existing viewer preset, or a lane list injected at capture time — the viewer source is never edited), the time
// window, and the viewport layout in CSS px (rendered at device-pixel-ratio 2). Layouts reuse the viewer's own viewport kinds: "game" = the gameplay
// camera (CAMERA_V1 rail camera, rv1GameCam) and "A" / "B" = close views (rv1CloseCam, angles from RV1_ANGLES). Nothing here changes a camera.
"use strict";
const W = 1470, H = 651;                                         // the user's reference recording: 2940 × 1302 px at 2× = 1470 × 651 CSS px
// the viewer's own wide-screen layout (rv1Layout, W / H > 1.35): gameplay camera 64 % wide on the left, two close views stacked on the right
const gw = Math.round(W * 0.64), cw = W - gw - 4, ch = Math.floor((H - 4) / 2);
const WIDE = { game: { id: "game", x: 0, y: 0, w: gw, h: H }, A: { id: "A", x: gw + 4, y: 0, w: cw, h: ch }, B: { id: "B", x: gw + 4, y: ch + 4, w: cw, h: H - ch - 4 } };
// 2 × 2 grid of close views (two render passes per frame, each fills two cells)
const cx = Math.floor((W - 4) / 2), cy = Math.floor((H - 4) / 2);
const CELL = [{ x: 0, y: 0 }, { x: cx + 4, y: 0 }, { x: 0, y: cy + 4 }, { x: cx + 4, y: cy + 4 }].map(c => ({ x: c.x, y: c.y, w: cx, h: cy }));
const cell = (id, i) => Object.assign({ id }, CELL[i]);

const CLIPS = {
  ladder: {
    file: "LOCOMOTION_V2_FINAL_LADDER",
    title: "Final straight-line locomotion ladder (RUN-1.3): LOW 3.0 · JOG 5.5 · FAST RUN 7.8 · ALL-OUT 9.5 m/s",
    preset: "ladder",                                              // the viewer's own default preset (run1_viewer.js RV1_PRESETS.ladder), unchanged
    t0: 1.0, t1: 8.0, fps: 60, zoom: 1, dir: "across", v1Mode: "v13",
    passes: [{ views: [WIDE.game, WIDE.A, WIDE.B], viewA: "L3:front34", viewB: "L2:front34" }],
    // static labels: one legend line per lane at the lane's (constant) screen row on the left edge of the gameplay view, and a title per view
    lanes: { L0: "LOW · 3.0 m/s", L1: "JOG · 5.5 m/s", L2: "FAST RUN · 7.8 m/s", L3: "ALL-OUT · 9.5 m/s" },
    viewTitles: { game: "Touchline · Locomotion V2 · RUN-1.3 straight-line ladder · gameplay camera (CAMERA_V1) 1× · real time", A: "ALL-OUT · 9.5 m/s · front ¾", B: "FAST RUN · 7.8 m/s · front ¾" },
  },
  history: {
    file: "LOCOMOTION_V2_VERSION_HISTORY",
    title: "Running presentation history at the same commanded 5.5 m/s: V1 → RUN-1.0 → RUN-1.1 → RUN-1.2 (= final RUN-1.3 at this speed)",
    // injected at capture time (not in the viewer source): the four genuinely distinct implementations at 5.5 m/s. RUN-1.3 is bit-identical to
    // RUN-1.2 at every speed ≤ 8.0 m/s (allout/final/frozen_and_identity.txt), so ONE lane shows both, run on the final code (run1_gait.js)
    inject: { label: "Version history at 5.5 m/s (archival capture)", lanes: [{ eng: "v1", v: 5.5, tag: "5.5" }, { eng: "orig", v: 5.5, tag: "5.5" }, { eng: "v11", v: 5.5, tag: "5.5" }, { eng: "run1", v: 5.5, tag: "5.5" }] },
    preset: "history",
    t0: 1.0, t1: 8.0, fps: 60, zoom: 1, dir: "across", v1Mode: "v13",
    passes: [{ views: [cell("A", 0), cell("B", 1)], viewA: "L0:side", viewB: "L1:side" }, { views: [cell("A", 2), cell("B", 3)], viewA: "L2:side", viewB: "L3:side" }],
    cellTitles: ["V1 · Locomotion V1 (unmodified runtime, V1.3 presentation)", "RUN-1.0 · the original RUN-1 (frozen, 3caa5d58)", "RUN-1.1 · the effort pass (frozen, 83a457db)", "RUN-1.2 = RUN-1.3 final · speed regimes (identical at 5.5 m/s)"],
    caption: "same commanded speed 5.5 m/s · same close side camera · real time, 60 fps",
  },
};
module.exports = { CLIPS, W, H };

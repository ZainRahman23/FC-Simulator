# IFM-1 slow-motion review: what it is and how it was verified

**Scope.** This is visualisation only, added after the IFM-1 results (f22a9141). Nothing in IFM-1 was re-run, modified, tuned, amplified or interpolated. No visual-value verdict is made, and every cell stays **VISUAL_PENDING**. The preregistered labels are copied exactly from `evidence/run3/IFM1_EVAL.json`.

## What is rendered

**Cases** (C0 | N for each):

| case | what is hit | state |
|---|---|---|
| SH | left deltoid | S-FLAT |
| PL | planted left shank | S-FLAT |
| TP | toe-pad left shank | S-TOE |
| SW | swing right shank | S-FLAT |

- SW is labelled **MECHANICALLY INVALID — DIAGNOSTIC ONLY** on every frame: its native-contact integrity check failed at step 1.
- Both bodies are rendered: R0, and RH1 (RH1's verdict C is unchanged).

**Frames (61 per case):**
- 24 frames of frozen RUN-1 lead-in: τ = −100 … −4.17 ms, every 1/240 s, taken from the committed lead-in.
- Then **every recorded step** n = 0 … 36:
  - n = 0 is the fixture's entry write;
  - n ≥ 1 is the record after step n.
- No intermediate state is synthesised.

**Speeds** (the same frames in both):
- **0.25×:** one record step per video frame at 60 fps.
- **0.1×:** one record step per video frame at 24 fps.

**Camera:** the frozen RUN-1 viewer page and character renderer, with CAMERA_V1 at the viewer's own gameplay zoom of **8×**.
- The camera pose and perspective are unchanged. The viewer's clip-space offset centres the subject, so each image is an exact 8× magnified crop of the 1280×720 gameplay projection.
- Each panel is 560×620 px. The character is about 236 px tall, against about 30 px at gameplay zoom 1.
- Both panels use the same camera on every frame (checked).

**Pose rule:** the bound render rule MC-1 §2(4), unchanged. The rendered poses are the committed `evidence/run3/render/clipdata/`.

**CLEAN vs DIAGNOSTIC:** both are composed from the **same** per-frame character renders.
- **CLEAN:**
  - The diagnostic impactor is drawn through the contact step (n ≤ 1) and hidden afterwards.
  - It is drawn after the character, with depth testing, so hiding it changes only the pixels the sphere covered.
- **DIAGNOSTIC:** adds overlays, all read or computed directly from recorded states:
  - rendered rig skeleton and joints;
  - N joint colour = |N − C0| rendered-joint distance;
  - the C0 skeleton drawn on the N panel;
  - struck-body colliders;
  - the recorded contact point, normal (a line, not an arrow) and per-step impulse;
  - per-foot recorded turf normal impulse (RUN-1's own stance flags during the lead-in);
  - pelvis joint;
  - whole-body COM from V2 masses.
- No motion arrows are drawn.

**Contact marker.** The contact step is n = 1 (τ 0 → 4.17 ms): the gap is 0.5 mm, closing at 3.0 m/s. A ring marks the recorded contact point on that frame only. Elapsed time is shown as τ since the contact step began.

**Validity bands:**
- RUN-1 lead-in;
- entry;
- primary 0–50 ms;
- secondary with the control still valid;
- outside the control-valid window: C0's SnapshotTone reference leaves the anatomical range at 66.7 ms (S-FLAT) and 87.5 ms (S-TOE);
- after N's own secondary failure: PL, 120.8 ms;
- SW: invalid for every physical frame.

## Verification (`SLOWMO_VERIFICATION.json`, from `ifm1/render/slowmo/ifm1_slowmo_verify.mjs`) — ALL PASS

| check | result |
|---|---|
| **V1** The committed rendered-pose clip data are reproduced by the committed `ifm1_clip_prep.mjs` from the committed `evidence/run3/records/` | 26 / 26 files byte-identical |
| **V2** Each rendered frame's mapped rig bones carry the recorded V2 body rotations (q_bone · Z0 = q_body); the pelvis joint sits at the recorded pelvis origin; the impactor at its recorded position. n = 0 is checked against the fixture entry write | max 1.3e-6 rad (the 1e-6 rounding of the stored matrices), pelvis ≤ 0.81 µm, impactor ≤ 0.78 µm; 8 case/body pairs × 37 steps × 2 modes |
| **V3** The skin matrices actually uploaded by the capture page equal the committed clip data, per panel and per frame | 8 / 8 pairs, every frame |
| **V4** Lead-in and entry: left and right character pixels identical; one camera for both panels on every frame | all pairs; the first differing frame is step 1 in every case |
| **V5** Each MP4 holds exactly one sample per frame at 1/60 s (0.25×) or 1/24 s (0.1×) | 32 / 32 (H.264 High) |

**Also checked:** re-evaluating the frozen RUN-1 for the lead-in stance flags reproduces the committed lead-in skin within 4.2e-6. That is one float32 ulp at a translation of about 49 m. The rendered lead-in uses the committed values.

## Files

| file | contents |
|---|---|
| `SLOWMO_REVIEW.html` | the four-case page: play / pause / scrub, ±1 frame, entry / contact / +50 ms jumps, 0.25× / 0.1×, R0 / RH1, CLEAN / DIAGNOSTIC. C0 and N are one composite frame |
| `video/<case>_<body>_<CLEAN|DIAG>_<0.25x|0.10x>.mp4` | 32 standalone videos |
| `slowmo_frames.json` | per-frame metadata for the page |
| `slowmo_capture.json` | per-frame uploaded-skin hashes, panel pixel differences, same-camera flags |
| `slowmo_meta.json` | rig bones |
| lossless PNG frames (976) | kept outside Git; see `frames.OUTSIDE_GIT.md` |

**Tools** (`ifm1/render/slowmo/`, sha256):

| tool | sha256 |
|---|---|
| `ifm1_slowmo_prep.mjs` | fbfea6db8c04c7d7eacde88fff5d9dc122bd36455ff2483676957e868b2cefb4 |
| `ifm1_slowmo_capture.cjs` | 21d93eb768f1266cdcade5635550881889d8a7d7dc6dbe362ad3d6a243106f79 |
| `ifm1_slowmo_verify.mjs` | f697885b333bb0f5449f164166795ce3b8b0706269ba67284887935dbba59ab8 |
| `ifm1_slowmo_frames.mjs` | dfa8cf48726a92e5d4e83eefa9c8b3656cd518df2b13a81a2205385529720f4f |

**Encoder:** `mp4-muxer` 5.2.2 (MIT; build/mp4-muxer.js sha256 cc4d30bd…), installed in scratch and not committed. Encoding uses WebCodecs H.264 software in HeadlessChrome 154.

**Frozen viewer and character files:** byte-identical to the tag (`evidence/run3/render/IFM1_RENDER_MANIFEST.json`).

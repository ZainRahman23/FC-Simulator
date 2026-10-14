// SLIDE-PHYS-2 Phase 2 fixture definitions (isolated bent-leg slide). Angles: V2 anatomical degrees (hip flex + forward, abd + out, rot − external;
// knee flex +; ankle df + dorsiflexion; lumbar flex + forward; shoulder flex + forward, abd + out). Pelvis: pitch + = anterior tilt (− sits back),
// roll + = toward the LEFT (fold) side. Left = fold / trailing leg, right = tackling leg (as SP1). t = 0 at the touchdown (fixture start).
// Every fixture is preserved here even when rejected; the log says why.
const TR = (o) => o;
// F1 — kneeling-lunge touchdown (OBSERVED in the reference at ≈ 4.667 s: trailing shin flat on the turf, trunk upright, front leg bent forward),
// then the trailing leg yields and folds laterally so the pelvis lowers onto the lateral thigh / hip; the tackling leg stays up, then extends.
export const F1 = { id: "F1", note: "kneeling-lunge touchdown on the trailing shin; trailing leg yields and folds laterally; tackling leg held up then extended",
  entry: { vRoot: [0, -1.0, 4.8], pelvis: { pitchDeg: -5, rollDeg: 8, yawDeg: 0 },
    anat: { lumbar: { flex: 0 }, thoracic: { flex: 0 }, neck: { flex: -5 }, hip_L: { flex: 0, abd: 5, rot: -10 }, knee_L: { flex: 92 }, ankle_L: { df: -38 },
      hip_R: { flex: 85, abd: 5, rot: 0 }, knee_R: { flex: 45 }, ankle_R: { df: 10 }, shoulder_L: { flex: -30, abd: 30 }, elbow_L: { flex: 20 }, shoulder_R: { flex: 60, abd: 20 }, elbow_R: { flex: 60 } } },
  tracks: TR({ "hip_L.flex": [[0, 0], [0.15, 20], [0.35, 50], [1.5, 45]], "hip_L.abd": [[0, 5], [0.15, 25], [1.5, 20]], "hip_L.rot": [[0, -10], [0.15, -40], [1.5, -35]],
    "knee_L.flex": [[0, 92], [0.15, 120], [1.5, 125]], "ankle_L.df": [[0, -38], [1.5, -35]],
    "hip_R.flex": [[0, 85], [0.3, 85], [0.6, 70], [1.5, 60]], "hip_R.abd": [[0, 5], [1.5, 5]], "hip_R.rot": [[0, 0], [1.5, 0]], "knee_R.flex": [[0, 45], [0.15, 45], [0.4, 15], [1.5, 10]], "ankle_R.df": [[0, 10], [1.5, 10]],
    "lumbar.flex": [[0, 0], [0.4, -10], [1.5, -5]], "lumbar.lat": [[0, 0], [0.3, 8], [1.5, 6]], "thoracic.flex": [[0, 0], [1.5, 0]], "neck.flex": [[0, -5], [0.4, 20], [1.5, 25]],
    "shoulder_L.flex": [[0, -30], [0.3, -50], [1.5, -45]], "shoulder_L.abd": [[0, 30], [0.3, 45], [1.5, 40]], "elbow_L.flex": [[0, 20], [1.5, 15]],
    "shoulder_R.flex": [[0, 60], [0.3, 90], [1.5, 70]], "shoulder_R.abd": [[0, 20], [1.5, 20]], "elbow_R.flex": [[0, 60], [0.3, 40], [1.5, 40]] }) };
export const FIXTURES = { F1 };
// F1 RESULT (rejected): pitched forward onto the face (belly −0.82, head 0.56 s) — friction under the knee, COM ≈ 0.55 m above it: ≈ 200 N·m forward
// torque; the tackling boot also touched at 0.10 s. Lesson: an upright kneel-glide needs backward angular momentum from the commit and a quick
// transfer of support AHEAD of the COM (sit back onto the hip / thigh so the centre of pressure leads the COM by ≈ μ·h).
// F2 — F1 + backward body pitch at touchdown (the commit's plant ahead of the COM gives the body a backward rotation: physically valid, the full
// tackle must produce it), a lower touchdown with the trailing leg already partly folded laterally (knee / lateral shin / lateral thigh close to the
// turf together), faster sit-back (trunk recline, posting arm early).
const F2tracks = { "hip_L.flex": [[0, 30], [0.12, 40], [0.3, 55], [1.5, 50]], "hip_L.abd": [[0, 10], [0.12, 20], [1.5, 22]], "hip_L.rot": [[0, -30], [0.12, -42], [1.5, -38]],
  "knee_L.flex": [[0, 110], [0.12, 120], [1.5, 125]], "ankle_L.df": [[0, -35], [1.5, -30]],
  "hip_R.flex": [[0, 80], [0.25, 80], [0.6, 65], [1.5, 55]], "hip_R.abd": [[0, 5], [1.5, 5]], "hip_R.rot": [[0, 0], [1.5, 0]], "knee_R.flex": [[0, 45], [0.12, 40], [0.35, 12], [1.5, 8]], "ankle_R.df": [[0, 10], [1.5, 10]],
  "lumbar.flex": [[0, -5], [0.25, -20], [0.8, -15], [1.5, -10]], "lumbar.lat": [[0, 5], [0.3, 10], [1.5, 8]], "thoracic.flex": [[0, 0], [1.5, 0]], "neck.flex": [[0, 0], [0.3, 25], [1.5, 30]],
  "shoulder_L.flex": [[0, -40], [0.2, -55], [1.5, -50]], "shoulder_L.abd": [[0, 35], [0.2, 45], [1.5, 40]], "elbow_L.flex": [[0, 15], [1.5, 10]],
  "shoulder_R.flex": [[0, 60], [0.3, 90], [1.5, 70]], "shoulder_R.abd": [[0, 20], [1.5, 20]], "elbow_R.flex": [[0, 60], [0.3, 40], [1.5, 40]] };
export const anat0 = (tracks, extra = {}) => { const o = {}; for (const [k, tr] of Object.entries(tracks)) { const [jn, key] = k.split("."); (o[jn] = o[jn] || {})[key] = tr[0][1]; } for (const [jn, v] of Object.entries(extra)) o[jn] = { ...(o[jn] || {}), ...v }; return o; };
export const F2 = { id: "F2", note: "F1 + backward pitch at touchdown, lower partly-folded touchdown, faster sit-back",
  entry: { vRoot: [0, -1.0, 4.8], pelvis: { pitchDeg: -15, rollDeg: 35, yawDeg: 0 }, pelvisW: [-3, 0, 0], anat: anat0(F2tracks) }, tracks: F2tracks };
FIXTURES.F2 = F2;
// F2 RESULT (rejected): backward spin 3 rad/s + pelvis roll 35° → the pelvis slams first (6.3 BW over 29 ms, 23 BW single step) and the body rolls
// onto its side / back. Lesson: hand-designing touchdown postures blind does not converge; start from a physically realised posture.
// F3 — SLIDE STABILITY (Phase 6/7 groundwork): SP1's own realised seated-slide posture at 0.8 s (pelvis pitch −15.5, roll 37.7 to the fold side;
// fold hip 61 / rot −47, knee 116; trunk extended), tackling leg raised so its boot is clear (hip 72, knee 12), landing gently (v_y −0.5) at 4.5 m/s.
// Held posture (constant targets): does a correctly organised seated slide stay organised by itself, and what deceleration / distance does it give?
const seatAnat = { lumbar: { flex: -13.7, lat: 16.3, rot: 5.5 }, thoracic: { flex: -6, lat: 9.2 }, neck: { flex: 27.5, lat: 7.3 }, shoulder_L: { flex: -38.5, abd: 56 }, shoulder_R: { flex: 39.1, abd: 41.9 },
  elbow_L: { flex: 19.8 }, elbow_R: { flex: 36.4 }, hip_L: { flex: 61.3, abd: 6.5, rot: -47.2 }, knee_L: { flex: 116.2 }, ankle_L: { df: -9.3, inv: 20 }, hip_R: { flex: 72, abd: 0, rot: 20 }, knee_R: { flex: 12 }, ankle_R: { df: 0 } };
const hold = (anat) => Object.fromEntries(Object.entries(anat).flatMap(([j, v]) => Object.entries(v).map(([k, x]) => [`${j}.${k}`, [[0, x], [2, x]]])));
export const F3 = { id: "F3", note: "SP1's realised seated-slide posture held, boot raised, gentle landing at 4.5 m/s", entry: { vRoot: [0, -0.5, 4.5], pelvis: { pitchDeg: -15.5, rollDeg: 37.7, yawDeg: 0 }, anat: seatAnat }, tracks: hold(seatAnat) };
FIXTURES.F3 = F3;
// F3 RESULT (rejected as held): rolls forward / over the fold side onto the front (belly −0.83, head 0.65 s) although the slide itself decelerates at
// 4.8 m/s² over 1.77 m (Coulomb μg). Sweep of the HELD posture (evidence/phase2/F3_sweep.txt): 11 of 12 variants roll face-down; only the strongly
// reclined one (pelvis −35°, lumbar −25°, fold arm posted behind) stays organised (belly 0.06, no head contact, 2.0 m at 5.0 m/s²).
const reclAnat = { ...seatAnat, lumbar: { ...seatAnat.lumbar, flex: -25 }, shoulder_L: { flex: -60, abd: 45 }, elbow_L: { flex: 5 } };
export const F3R = { id: "F3R", note: "F3 strongly reclined + fold arm posted: the one held seated posture that stays organised", entry: { vRoot: [0, -0.5, 4.5], pelvis: { pitchDeg: -35, rollDeg: 37.7, yawDeg: 0 }, anat: reclAnat }, tracks: hold(reclAnat) };
FIXTURES.F3R = F3R;

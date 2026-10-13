// PVP-0 tackler posture vs the authored K (read-only, from the run records): is the tackler's on-turf posture the authored one or a deviation?
// Per strength and the TWIN-free NOMINAL geometry, at fixed times after activation: K's authored pelvis / thorax world orientation at the same clip
// time (pvp0_k.mjs v2Pose, same placement offset — the rigid placement does not affect orientation) against the physical tackler's; the belly normal
// (V2 body +z = front) vertical component (−1 face-down / prone, 0 on the side, +1 face-up / supine); the geodesic angle between authored and
// physical pelvis (CALIB = the same NOMINAL tackler 10 m from the recipient: no contact at all); authored and physical pelvis / right-boot / left-boot heights; and the authored-vs-physical heading of the travel direction.
// usage (worktree root): node .../pvp0_pose.mjs --dir <records dir> --out <json>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, KM = await import(new URL("./pvp0_k.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DIR = arg("dir"), load = (k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, k + ".json.gz"))));
const B = KM.SPEC.bodies, bi = (n) => B.findIndex(b => b.name === n), PEL = bi("pelvis"), THO = bi("thorax"), FR = bi("foot_R"), FL = bi("foot_L"), SR = bi("shank_R"), SL = bi("shank_L");
const ang = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; };
const belly = (rot) => +Q.rot(rot, [0, 0, 1])[1].toFixed(3), r3 = (x) => +x.toFixed(3);
const T_MS = [0, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2500];
const K = JSON.parse(fs.readFileSync(new URL("../source/slide_a1_K/K.json", import.meta.url))), out = { protocol: "PVP-0 tackler posture vs authored K", note: "belly = vertical component of the body's front (+z) axis: −1 face-down, 0 side, +1 face-up", kDuration: K.duration, cases: {} };
for (const cse of ["CALIB", "LIGHT", "NOMINAL", "HEAVY"]) { const o = load(cse), R = o.recs, A = o.setup.activate, off = o.offset, t0 = o.setup.t0, rows = [];
  for (const ms of T_MS) { const n = A + Math.round(ms * 240 / 1000), r = R.find(x => x.n === n); if (!r) continue; const S = r.S.slice(14), t = Math.min(t0 + (n - A) / 240, K.duration), kp = KM.v2Pose(KM.frameAt(t), off);
    rows.push({ msAfterActivation: ms, step: n, kClipT: r3(t), kPhase: K.frames[KM.frameAt(t)].phase,
      pelvisAngleDeg: +ang(kp[PEL].rot, S[PEL].rot).toFixed(1), thoraxAngleDeg: +ang(kp[THO].rot, S[THO].rot).toFixed(1),
      bellyPelvis: { K: belly(kp[PEL].rot), phys: belly(S[PEL].rot) }, bellyThorax: { K: belly(kp[THO].rot), phys: belly(S[THO].rot) },
      pelvisY: { K: r3(kp[PEL].pos[1]), phys: r3(S[PEL].pos[1]) }, footR_Y: { K: r3(kp[FR].pos[1]), phys: r3(S[FR].pos[1]) }, footL_Y: { K: r3(kp[FL].pos[1]), phys: r3(S[FL].pos[1]) },
      shankR_Y: { K: r3(kp[SR].pos[1]), phys: r3(S[SR].pos[1]) }, shankL_Y: { K: r3(kp[SL].pos[1]), phys: r3(S[SL].pos[1]) } }); }
  out.cases[cse] = rows; }
// the authored K alone over its whole clip from t0: belly normals and heights (what the action itself asks for)
out.authored = []; for (let t = 0.30; t <= K.duration + 1e-9; t += 0.05) { const kp = KM.v2Pose(KM.frameAt(t), [0, 0, 0]), f = K.frames[KM.frameAt(t)]; out.authored.push({ t: r3(t), phase: f.phase, bellyPelvis: belly(kp[PEL].rot), bellyThorax: belly(kp[THO].rot), pelvisY: r3(kp[PEL].pos[1]), footR_Y: r3(kp[FR].pos[1]), footL_Y: r3(kp[FL].pos[1]) }); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.authored)); for (const [k, v] of Object.entries(out.cases)) { console.log("==", k); for (const x of v) console.log(JSON.stringify(x)); }

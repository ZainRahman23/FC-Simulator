// SP2A — the folded-leg 3D tuck, designed GEOMETRICALLY (kinematic V2 FK of the tackler body; no simulation). For a seated-slide posture
// (pelvis pitch / roll, fold leg hip flex / abd / rot, knee, ankle df / inv; trunk and tackling leg fixed) the body is placed with its lowest point
// on the turf and scored on the brief's folded-leg objective:
//   • the OUTER (lateral) thigh, the lateral shin and the hip / buttock all near the turf (shared support surface), the knee NOT lower than them
//     (not the dominant point);
//   • the folded boot's sole facing AWAY from the turf (sole-down cosine ≤ 0) and the boot resting on its side / upper, not presenting studs;
//   • every angle inside the V2 HARD range with margin (hip adduction ≥ −28°, rotation within ±43°, knee ≤ 145°, ankle df ≥ −40° — M1b's
//     excitation domain — and inversion ≤ 28°);
//   • the tackling leg extended low but its boot above the turf (≥ 2 cm).
// Random-restart coordinate search; prints the best postures. usage (worktree root): node sp2a_tuck.mjs [--n 4000] [--seed 1] [--out best.json]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), EN = await import(S1 + "sp_entry.mjs");
const R = await import(new URL("../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href), { V, Q, B, bi } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
let seed = +arg("seed", "1"); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
// variables: [name, lo, hi]
export const VARS = [["pitch", -35, 0], ["roll", 10, 50], ["hipFlex", 20, 100], ["hipAbd", -28, 30], ["hipRot", -43, 20], ["knee", 80, 145], ["ankDf", -40, 10], ["ankInv", -10, 28]];
const FIXED = { lumbar: { flex: -12, lat: 12 }, thoracic: { flex: -4, lat: 6 }, neck: { flex: 25 }, hip_R: { flex: 72, abd: 5, rot: 10 }, knee_R: { flex: 12 }, ankle_R: { df: 5 },
  shoulder_L: { flex: -50, abd: 45 }, elbow_L: { flex: 10 }, shoulder_R: { flex: 60, abd: 30 }, elbow_R: { flex: 40 } };
export function posture(x) { const v = Object.fromEntries(VARS.map(([k], i) => [k, x[i]]));
  return { pelvis: { pitchDeg: v.pitch, rollDeg: v.roll, yawDeg: 0 }, anat: { ...FIXED, hip_L: { flex: v.hipFlex, abd: v.hipAbd, rot: v.hipRot }, knee_L: { flex: v.knee }, ankle_L: { df: v.ankDf, inv: v.ankInv } } }; }
// contact geometry of a placed pose: sample surface points of each body (support function toward −y plus a ring), classify by sp2_regions
function evaluate(x) { const p = posture(x), E = EN.buildEntry({ ...p, rate: {}, pelvisW: [0, 0, 0], vRoot: [0, 0, 0] }), P = E.pose, K = L.skel(P);
  const low = (name) => L.PL.bodyLowest(B[bi(name)], P[bi(name)]).y;
  // region heights: lowest point of the thigh's middle (u 0.3–0.7) vs its knee end, shin middle, pelvis, boot
  const along = (a, c, u) => V.add(a, V.sc(V.sub(c, a), u)), radius = { thigh_L: 0.075, shank_L: 0.05 };
  const segLow = (name, a, c, u0, u1) => { let m = Infinity; for (let u = u0; u <= u1 + 1e-9; u += 0.05) m = Math.min(m, along(a, c, u)[1] - radius[name]); return m; };
  const thighMid = segLow("thigh_L", K.hip_L, K.knee_L, 0.3, 0.75), kneeEnd = Math.min(segLow("thigh_L", K.hip_L, K.knee_L, 0.85, 1.0), segLow("shank_L", K.knee_L, K.ankle_L, 0, 0.15));
  const shinMid = segLow("shank_L", K.knee_L, K.ankle_L, 0.3, 0.9), pel = low("pelvis"), boot = low("foot_L"), tackBoot = low("foot_R"), f = P[bi("foot_L")], soleDown = -Q.rot(f.rot, [0, -1, 0])[1];
  // which side of the thigh faces down (lateral is required): local −x for the left leg
  const th = P[bi("thigh_L")], latW = Q.rot(th.rot, [-1, 0, 0]), latDown = -latW[1];
  const others = ["abdomen", "thorax", "head", "upperArm_L", "upperArm_R", "forearm_R", "thigh_R", "shank_R"].map(low);
  const c = {};
  c.support = 3 * (Math.max(0, thighMid - 0.02) + Math.max(0, shinMid - 0.04) + Math.max(0, pel - 0.03));   // outer thigh, shin, hip all down
  c.knee = 4 * Math.max(0, Math.min(thighMid, pel) - kneeEnd - 0.005);                                            // knee not lower than thigh / hip
  c.lateral = 1.5 * Math.max(0, 0.6 - latDown);                                                                   // the OUTER thigh faces the turf
  c.studs = 2 * Math.max(0, soleDown + 0.1) + 1.5 * Math.max(0, boot - 0.05);                                     // sole away; boot resting on its side
  c.tack = 3 * Math.max(0, 0.02 - tackBoot);                                                                     // tackling boot clear
  c.others = 2 * others.reduce((s, y) => s + Math.max(0, 0.03 - y), 0);                                          // trunk / head / arms / other leg not on the turf
  // preferences (robustness margins): hip adduction ≥ −25°, external rotation ≥ −40°, knee ≤ 135°, ankle plantarflexion ≥ −30°; the knee end not
  // below the mid-thigh by more than 6 mm (the knee shares, it does not dominate)
  const v = Object.fromEntries(VARS.map(([k], i) => [k, x[i]]));
  c.margin = 0.02 * (Math.max(0, -25 - v.hipAbd) + Math.max(0, -40 - v.hipRot) + Math.max(0, v.knee - 135) + Math.max(0, -30 - v.ankDf));
  c.kneeVsThigh = 2 * Math.max(0, thighMid - kneeEnd - 0.006);
  c.total = Object.values(c).reduce((s, v) => s + v, 0);
  return { c, m: { thighMid, kneeEnd, shinMid, pel, boot, tackBoot, soleDown, latDown, pelvisY: P[0].pos[1] } }; }
if (process.argv[1] && process.argv[1].endsWith("sp2a_tuck.mjs")) { const N = +arg("n", "4000"), best = [];
  const clamp = (x) => x.map((v, i) => Math.max(VARS[i][1], Math.min(VARS[i][2], v)));
  for (let r = 0; r < 24; r++) { let x = VARS.map(([, lo, hi]) => lo + rnd() * (hi - lo)), e = evaluate(x), step = 12;
    for (let it = 0; it < N / 24; it++) { const y = clamp(x.map((v, i) => v + (rnd() - 0.5) * 2 * step * (VARS[i][2] - VARS[i][1]) / 60)), ey = evaluate(y); if (ey.c.total < e.c.total) { x = y; e = ey; } if (it % 40 === 39) step = Math.max(1, step * 0.8); }
    best.push({ x, e }); }
  best.sort((a, b) => a.e.c.total - b.e.c.total);
  for (const b of best.slice(0, 6)) console.log(b.e.c.total.toFixed(4), VARS.map(([k], i) => `${k} ${b.x[i].toFixed(1)}`).join(" "), "|", Object.entries(b.e.m).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(" "), "|", JSON.stringify(Object.fromEntries(Object.entries(b.e.c).filter(([k, v]) => v > 1e-4 && k !== "total").map(([k, v]) => [k, +v.toFixed(3)]))));
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(best.slice(0, 6).map(b => ({ vars: Object.fromEntries(VARS.map(([k], i) => [k, +b.x[i].toFixed(2)])), m: b.e.m, c: b.e.c, posture: posture(b.x) })), null, 1)); }

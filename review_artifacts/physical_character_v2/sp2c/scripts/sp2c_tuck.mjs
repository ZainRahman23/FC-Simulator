// SP2C — the compact 3D folded-leg tuck, designed GEOMETRICALLY (kinematic V2 FK of the tackler; no simulation). Successor objective of
// sp2a_tuck.mjs (which is preserved), from the owner's SP2C review and the broadcast reference (REFERENCE_SP2A_ANALYSIS §1: the folded knee stays
// under the pelvis, the shin lies flat pointing back with the instep down, the pelvis rolls onto the fold side so the lateral knee / thigh / hip
// take the load). For a posture (pelvis pitch / roll; fold hip flexion / abduction / rotation, knee, ankle df / inv) placed with its lowest point
// on the turf it scores:
//   • COMPACTNESS: the folded knee in PELVIS-LOCAL coordinates under / just inside the fold hip (x ∈ [−0.13, −0.03] m; the hip is at −0.095) and
//     not projecting far forward (z ≤ 0.30 m); the ankle close to the pelvis / buttock (folded shin alongside the thigh);
//   • SLIDING SURFACE: the lateral knee / shin and the outer thigh and hip near the turf, the knee not lower than the thigh by more than 6 mm;
//   • FOOT IN THE CHAIN: toe and heel not below the shin's lowest point (+10 mm) — the foot continues the shin, it does not hang or spear —
//     and the sole facing away from the turf (sole-down cosine ≤ −0.3);
//   • MARGINS from the V2 stops: hip abduction ∈ [−15°, +10°] (the turf pushes the folded hip further into adduction; its stop ≈ −28°),
//     rotation ∈ [−40°, 0°], knee ≤ 142°, ankle plantarflexion ≥ −42° (stop −48°), inversion ≤ 24°; the tackling boot ≥ 3 cm above the turf.
// usage (worktree root): node sp2c_tuck.mjs [--n 8000] [--seed 1] [--out best.json]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), EN = await import(S1 + "sp_entry.mjs"), { V, Q, B, bi } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
let seed = +arg("seed", "1"); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
export const VARS = [["pitch", -30, 5], ["roll", 5, 45], ["hipFlex", 15, 90], ["hipAbd", -20, 15], ["hipRot", -45, 10], ["knee", 100, 145], ["ankDf", -46, 5], ["ankInv", -5, 28]];
const FIXED = { lumbar: { flex: -12, lat: -4 }, thoracic: { flex: -6, lat: -2 }, neck: { flex: 20 }, hip_R: { flex: 68, abd: 5, rot: 8 }, knee_R: { flex: 18 }, ankle_R: { df: 5 },
  shoulder_L: { flex: -30, abd: 55 }, elbow_L: { flex: 20 }, shoulder_R: { flex: 50, abd: 30 }, elbow_R: { flex: 40 } };
export function posture(x) { const v = Object.fromEntries(VARS.map(([k], i) => [k, x[i]])); return { pelvis: { pitchDeg: v.pitch, rollDeg: v.roll, yawDeg: 0 }, anat: { ...FIXED, hip_L: { flex: v.hipFlex, abd: v.hipAbd, rot: v.hipRot }, knee_L: { flex: v.knee }, ankle_L: { df: v.ankDf, inv: v.ankInv } } }; }
export function evaluate(x) { const p = posture(x), E = EN.buildEntry({ ...p, rate: {}, pelvisW: [0, 0, 0], vRoot: [0, 0, 0] }), P = E.pose, K = L.skel(P), pel = P[0];
  const toPel = (q) => Q.rot(Q.conj(pel.rot), V.sub(q, K.pelvisM)), kn = toPel(K.knee_L), an = toPel(K.ankle_L), low = (n) => L.PL.bodyLowest(B[bi(n)], P[bi(n)]).y;
  const along = (a, c, u) => V.add(a, V.sc(V.sub(c, a), u)), rad = { thigh_L: 0.075, shank_L: 0.05 }, segLow = (name, a, c, u0, u1) => { let m = Infinity; for (let u = u0; u <= u1 + 1e-9; u += 0.05) m = Math.min(m, along(a, c, u)[1] - rad[name]); return m; };
  const thighMid = segLow("thigh_L", K.hip_L, K.knee_L, 0.3, 0.75), kneeEnd = Math.min(segLow("thigh_L", K.hip_L, K.knee_L, 0.85, 1.0), segLow("shank_L", K.knee_L, K.ankle_L, 0, 0.15)), shinLow = segLow("shank_L", K.knee_L, K.ankle_L, 0.2, 0.95);
  const pelLow = low("pelvis"), f = P[bi("foot_L")], soleDown = -Q.rot(f.rot, [0, -1, 0])[1], th = P[bi("thigh_L")], latDown = -Q.rot(th.rot, [-1, 0, 0])[1];
  const v = Object.fromEntries(VARS.map(([k], i) => [k, x[i]])), c = {}, hinge = (val, lo, hi) => Math.max(0, lo - val) + Math.max(0, val - hi);
  c.knee = 30 * hinge(kn[0], -0.13, -0.03) + 15 * Math.max(0, kn[2] - 0.30);                                   // folded knee under / inside the fold hip, not far forward
  c.ankle = 6 * Math.max(0, Math.hypot(an[0], an[2]) - 0.25);                                                      // folded ankle tucked toward the pelvis / buttock
  c.surface = 3 * (Math.max(0, thighMid - 0.03) + Math.max(0, shinLow - 0.04) + Math.max(0, pelLow - 0.06)) + 4 * Math.max(0, Math.min(thighMid, pelLow) - kneeEnd - 0.006);
  c.lateral = 1.5 * Math.max(0, 0.5 - latDown);                                                                 // outer thigh toward the turf
  c.foot = 6 * (Math.max(0, shinLow + 0.01 - K.toe_L[1]) + Math.max(0, shinLow + 0.01 - K.heel_L[1])) + 3 * Math.max(0, soleDown + 0.3);
  c.margin = 0.05 * (hinge(v.hipAbd, -15, 10) + hinge(v.hipRot, -40, 0) + Math.max(0, v.knee - 142) + Math.max(0, -42 - v.ankDf) + Math.max(0, v.ankInv - 24));
  c.tack = 3 * Math.max(0, 0.03 - low("foot_R")); c.others = 2 * ["abdomen", "thorax", "head", "thigh_R", "shank_R"].map(low).reduce((s, y) => s + Math.max(0, 0.03 - y), 0);
  c.total = Object.values(c).reduce((s, q) => s + q, 0);
  return { c, m: { knee_inPelvis: kn, ankle_inPelvis: an, thighMid, kneeEnd, shinLow, pelLow, toeY: K.toe_L[1], heelY: K.heel_L[1], soleDown, latDown, tackBootY: low("foot_R") } }; }
if (process.argv[1] && process.argv[1].endsWith("sp2c_tuck.mjs")) { const N = +arg("n", "8000"), best = [], clamp = (x) => x.map((v, i) => Math.max(VARS[i][1], Math.min(VARS[i][2], v)));
  for (let r = 0; r < 32; r++) { let x = VARS.map(([, lo, hi]) => lo + rnd() * (hi - lo)), e = evaluate(x), step = 12;
    for (let it = 0; it < N / 32; it++) { const y = clamp(x.map((v, i) => v + (rnd() - 0.5) * 2 * step * (VARS[i][2] - VARS[i][1]) / 60)), ey = evaluate(y); if (ey.c.total < e.c.total) { x = y; e = ey; } if (it % 40 === 39) step = Math.max(0.6, step * 0.8); }
    best.push({ x, e }); }
  best.sort((a, b) => a.e.c.total - b.e.c.total); const fmt = (a) => a.map(q => q.toFixed(3)).join(",");
  for (const b of best.slice(0, 6)) console.log(b.e.c.total.toFixed(4), VARS.map(([k], i) => `${k} ${b.x[i].toFixed(1)}`).join(" "), "| knee@pel", fmt(b.e.m.knee_inPelvis), "ankle@pel", fmt(b.e.m.ankle_inPelvis), "toeY", b.e.m.toeY.toFixed(3), "heelY", b.e.m.heelY.toFixed(3), "shinLow", b.e.m.shinLow.toFixed(3), "soleDown", b.e.m.soleDown.toFixed(2), "latDown", b.e.m.latDown.toFixed(2), "|", JSON.stringify(Object.fromEntries(Object.entries(b.e.c).filter(([k, v]) => v > 1e-4 && k !== "total").map(([k, v]) => [k, +v.toFixed(3)]))));
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(best.slice(0, 6).map(b => ({ vars: Object.fromEntries(VARS.map(([k], i) => [k, +b.x[i].toFixed(2)])), m: b.e.m, c: b.e.c })), null, 1)); }

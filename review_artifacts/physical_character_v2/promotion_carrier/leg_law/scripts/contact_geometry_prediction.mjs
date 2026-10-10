// PREDICTION (leg-law investigation, read-only): would physically realisable collision legs change gameplay contacts? For every recorded V1.3 candidate
// (rx + defending, LC-1 exports), the simulation's own contact test (capsule surface distance, the CHARCOLLIDE profile radii / taper) is re-run offline at the
// 4 recorded sub-steps per tick between the recorded slide primitives and (a) the simulation's current law legs (`simBody`, calibration) and (b) legs built by
// the CHARCOLLIDE construction from the LC-1 presented skeleton (spring-mass vertical, world plants, C1 joints) — the proxy for a corrected shared law.
// Pelvis / torso primitives are the simulation's own in both (unchanged). Reported per case: first contact (sub-step, runner segment, primitive), minimum
// surface distance, and the change between (a) and (b). Full gameplay outcomes are not predicted (that needs the simulation itself).
// usage (worktree root, V13_WT …): node contact_geometry_prediction.mjs <out.json> <dir:case,case,...> ...
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../..");
const M0 = await import(path.join(ROOT, "pi1/trackB/scripts/pcg_f0.mjs")); const { SIMV, PROF, loadAir } = M0, M4 = SIMV.g("M4");
const segR = (g, t) => (g.ra != null ? g.ra + (g.rb - g.ra) * Math.max(0, Math.min(1, t)) : g.r), r2sim = (p) => [p[0], -p[2], p[1]];
const [OUT, ...SPECS] = process.argv.slice(2), out = { note: "first-contact re-detection, current law legs vs LC-1-proxy legs", cases: {} };
const F = PROF, K = F.kinds;
// CHARCOLLIDE leg segments from a set of skeleton world matrices (render frame) → simulation coordinates (ptRxBodyChar + ptRxSegments, legs only)
function legsFromWorld(world, idx) { const segs = []; const jp = (b) => r2sim([world[idx[b]][12], world[idx[b]][13], world[idx[b]][14]]), tp = (b, p) => r2sim(M4.transformPoint(world[idx[b]], p));
  for (const sd of ["R", "L"]) { const hip = jp("thigh_" + sd), knee = jp("shin_" + sd), ankle = jp("foot_" + sd), footA = tp("foot_" + sd, F.foot.a), footB = tp("foot_" + sd, F.foot.b), toeB = tp("toe_" + sd, F.toe.bToe);
    segs.push({ name: "foot_" + sd, seg: K.foot, sd, a: footA, b: footB, r: Math.max(F.foot.ra, F.foot.rb), ra: F.foot.ra, rb: F.foot.rb }, { name: "toe_" + sd, seg: K.toe, sd, a: footB, b: toeB, r: F.toe.r },
      { name: "shin_" + sd, seg: K.shin, sd, a: knee, b: ankle, r: F.radii.shin[0], ra: F.radii.shin[0], rb: F.radii.shin[1] }, { name: "thigh_" + sd, seg: K.thigh, sd, a: hip, b: knee, r: F.radii.thigh[0], ra: F.radii.thigh[0], rb: F.radii.thigh[1] }); }
  return segs; }
const lerpW = (A, B, w) => A.map((m, i) => m.map((x, j) => x + (B[i][j] - x) * w));
for (const spec of SPECS) { const [dir, list] = spec.split(":"); for (const cs of list.split(",")) { const R = loadAir(dir, `${cs}_LOCO.json.gz`), idx = Object.fromEntries(R.bones.map((b, i) => [b.name, i]));
  const ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), rec = ev[0] ? { t: ev[0].tick - 1 + ev[0].sub / 4, seg: ev[0].seg, prim: ev[0].prim, react: ev[0].react || ev[0].cls } : null;
  const k0 = Math.max(31, (R.prims.findIndex(p => p && p[3] && p[3].length) || 31)), kEnd = Math.min(R.prims.length - 1, (rec ? Math.ceil(rec.t) + 8 : R.prims.length - 1));
  const res = { a: { first: null, dmin: Infinity, at: null }, b: { first: null, dmin: Infinity, at: null } };
  for (let k = k0; k <= kEnd; k++) for (let n = 1; n <= 4; n++) { const prims = R.prims[k] && R.prims[k][n - 1]; if (!prims || !prims.length || !R.simBody[k] || !R.simBody[k][n - 1]) continue; const tau = k + n / 4;
    const law = R.simBody[k][n - 1].segs.filter(g => g.sd), pres = legsFromWorld(lerpW(R.pres[k - 1].world, R.pres[k].world, n / 4), idx);
    for (const [lab, segs] of [["a", law], ["b", pres]]) { const st = res[lab]; for (const p of prims) for (const g of segs) { const cc = SIMV.segseg(p.a, p.b, g.a, g.b), d = cc.d - p.r - segR(g, cc.t); if (d < st.dmin) { st.dmin = d; st.at = { tau, seg: g.name, prim: p.prim }; } if (d < 0 && !st.first) st.first = { tau, seg: g.name, prim: p.prim, penMm: +(-d * 1000).toFixed(1) }; } } }
  for (const lab of ["a", "b"]) res[lab].dmin = +(res[lab].dmin * 1000).toFixed(1);
  const dT = res.a.first && res.b.first ? +(res.b.first.tau - res.a.first.tau).toFixed(2) : null, classChange = !!res.a.first !== !!res.b.first, segChange = res.a.first && res.b.first ? res.a.first.seg !== res.b.first.seg : null;
  out.cases[cs] = { recorded: rec, lawLegs: res.a, lc1Legs: res.b, firstContactShiftTicks: dT, contactClassChange: classChange, segmentChange: segChange };
  console.log(cs.padEnd(22), "recorded", rec ? rec.t + " " + rec.seg : "none", "| law legs first", res.a.first ? res.a.first.tau + " " + res.a.first.seg : "none (dmin " + res.a.dmin + " mm)", "| LC-1 legs first", res.b.first ? res.b.first.tau + " " + res.b.first.seg : "none (dmin " + res.b.dmin + " mm)", "| shift", dT, classChange ? "CLASS CHANGE" : "", segChange ? "SEGMENT CHANGE" : ""); } }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

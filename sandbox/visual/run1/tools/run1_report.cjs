// run1/tools/run1_report.cjs — numeric inspection of the RUN-1 cycle: anatomical joint angles over the stride, pelvis path, foot
// heights / slip, contact transitions, continuity (C0/C1 across the stance↔swing joins), joint limits, reach.
// usage: node run1_report.cjs [--v 5.5] [--char vinicius] [--n 50] [--json out.json]
const { loadRun1 } = require("./run1_load.cjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const X = loadRun1(), D = 180 / Math.PI;
const skel = X.charSkel(arg("char", "vinicius")), v = +arg("v", 5.5), N = +arg("n", 50);
const A = X.r1Make(skel); const G = X.r1Prepare(A, v), p = G.p, body = G.body;
const f3 = (x) => (x >= 0 ? " " : "") + x.toFixed(1);
console.log(`RUN-1 ${arg("char", "vinicius")} v=${v} m/s  cadence ${(p.cadence * 60).toFixed(1)} spm  step ${p.stepLen.toFixed(3)} m  Ts ${p.Ts.toFixed(3)} s  tc ${p.tc.toFixed(3)} s  flight ${(p.Ts - p.tc).toFixed(3)} s  duty ${p.D.toFixed(3)}`);
console.log(`solved plant zTD (flat ankle ahead of root at touchdown) ${p.zTD.toFixed(3)} m, pelvis base y0 ${p.y0.toFixed(3)} m (bind ${body.pelvisY.toFixed(3)}), solve err ${p.solveErr.map(e => e.toExponential(1))}`);
// anatomical angles from the world matrices (root frame): hip flex = thigh vs pelvis in the pelvis sagittal plane, knee = thigh/shin,
// ankle DF = foot vs shank, thigh / shank global angles from vertical (+ = forward)
function frame(u) {
  const pose = X.r1Pose(G, u), fk = X.r1FK(G, pose, null);
  const I = body.idx, R = fk.R, P = fk.P;
  const col = (M, c) => [M[c], M[3 + c], M[6 + c]];
  const out = { u, pelY: pose.pelvisPos[1], pelX: pose.pelvisPos[0], legs: {} };
  for (const sd of ["R", "L"]) {
    const th = R[I["thigh_" + sd]], sh = R[I["shin_" + sd]], ft = R[I["foot_" + sd]], pv = R[I.pelvis];
    const thDir = X.R3.v(th, [0, -1, 0]), shDir = X.R3.v(sh, [0, -1, 0]), ftDir = X.R3.v(ft, [0, 0, 1]);
    const pvF = col(pv, 2), pvU = col(pv, 1);
    const hipFlex = Math.atan2(X.RV.dot(thDir, pvF), -X.RV.dot(thDir, pvU)) * D;
    const knee = Math.acos(Math.max(-1, Math.min(1, X.RV.dot(thDir, shDir)))) * D;
    const shF = col(sh, 2), shU = col(sh, 1);                       // ankle DF: foot forward axis vs shank frame (+ = dorsiflexion)
    const ankle = Math.atan2(X.RV.dot(ftDir, shU), X.RV.dot(ftDir, shF)) * D;
    const thighG = Math.atan2(thDir[2], -thDir[1]) * D, shankG = Math.atan2(shDir[2], -shDir[1]) * D, footG = Math.atan2(ftDir[1], ftDir[2]) * D;
    // lowest boot point (heel, MTP-ground, toe tip) above the stud plane; ankle position
    const fw = fk.world, an = P[I["foot_" + sd]];
    const heel = X.RV.add(an, X.R3.v(ft, [0, -body.ankleH, body.heelZ])), tip = X.RV.add(P[I["toe_" + sd]], X.R3.v(R[I["toe_" + sd]], [0, -0.031, body.tipZ - body.mtp[2]]));
    const mtpG = X.RV.add(P[I["toe_" + sd]], X.R3.v(R[I["toe_" + sd]], [0, -0.031, 0]));
    const lg = pose.legs[sd];
    out.legs[sd] = { st: lg.st, s: lg.s, w: lg.w, hipFlex, knee, ankle, thighG, shankG, footG, ankleP: an, heelY: heel[1], tipY: tip[1], mtpY: mtpG[1], low: Math.min(heel[1], tip[1], mtpG[1]), ch: lg.ch, hipAbd: lg.ch.a * D };
  }
  return out;
}
const rows = []; for (let i = 0; i < N; i++) rows.push(frame(i / N));
console.log("\n  u    | pelY   pelX  |  R: st  hipF   knee  ankDF  thighG shankG footG  low   ankZ  |  L: hipF  knee");
for (const r of rows) { const a = r.legs.R, b = r.legs.L; console.log(` ${r.u.toFixed(2)} | ${r.pelY.toFixed(3)} ${f3(r.pelX * 100)}cm | ${a.st ? "ST" : "sw"} ${f3(a.hipFlex)} ${f3(a.knee)} ${f3(a.ankle)}  ${f3(a.thighG)} ${f3(a.shankG)} ${f3(a.footG)} ${a.low.toFixed(3)} ${f3(a.ankleP[2])} | ${f3(b.hipFlex)} ${f3(b.knee)}`); }
// summaries
const Rl = rows.map(r => r.legs.R);
const mx = (k) => Math.max(...Rl.map(x => x[k])), mn = (k) => Math.min(...Rl.map(x => x[k]));
const at = (k, pred) => Rl.filter(pred).map(x => x[k]);
const pelY = rows.map(r => r.pelY);
console.log(`\npelvis vertical excursion ${((Math.max(...pelY) - Math.min(...pelY)) * 100).toFixed(1)} cm; lateral ${(Math.max(...rows.map(r => r.pelX)) * 200).toFixed(1)} cm p-p`);
console.log(`hip flex range ${mn("hipFlex").toFixed(1)} … ${mx("hipFlex").toFixed(1)}; knee ${mn("knee").toFixed(1)} … ${mx("knee").toFixed(1)}; ankle DF ${mn("ankle").toFixed(1)} … ${mx("ankle").toFixed(1)}; thigh global ${mn("thighG").toFixed(1)} … ${mx("thighG").toFixed(1)}`);
const stK = at("knee", x => x.st); console.log(`stance knee: TD ${Rl[0].knee.toFixed(1)}, max ${Math.max(...stK).toFixed(1)}; swing min boot height ${Math.min(...at("low", x => !x.st && x.w > 0.05 && x.w < 0.95)).toFixed(3)} m`);
// continuity across joins: channel values / slopes left and right of toe-off and touchdown (fine sampling in continuous phase)
const ch = (u) => X.r1Pose(G, u).legs.R.ch;
const eps = 1e-6, joins = { TO: p.D, TD: 1 - 1e-12 };
for (const [nm, uj] of Object.entries(joins)) {
  const a0 = ch(uj - 2 * eps), a1 = ch(uj - eps), b0 = ch((uj + eps) % 1), b1 = ch((uj + 2 * eps) % 1);
  const line = X.R1_CH.map(c => { const dv = (b0[c] - a1[c]) * D, sl = ((a1[c] - a0[c]) / eps), sr = ((b1[c] - b0[c]) / eps); return `${c}: Δ${dv.toFixed(3)}° slope ${(sl * D).toFixed(0)}|${(sr * D).toFixed(0)}`; });
  console.log(`${nm} join: ` + line.join("  "));
}
// stance slip: planted ankle in the WORLD (root moving at v): the flat-foot plant point must not move
let slip = 0; { const T = p.T; let first = null; for (let i = 0; i <= 200; i++) { const s = i / 200, u = s * p.D, S = X.r1StanceLeg(G, "R", s); const worldZ = S.ankle[2] + v * u * T; if (S.beta === 0) { if (first == null) first = worldZ; slip = Math.max(slip, Math.abs(worldZ - first)); } } }
console.log(`flat-foot plant slip (world) ${(slip * 1000).toFixed(3)} mm; reach max ${Math.max(...Array.from({ length: 101 }, (_, i) => X.r1StanceLeg(G, "R", i / 100).reach)).toFixed(4)}`);
if (arg("json")) require("fs").writeFileSync(arg("json"), JSON.stringify({ p: Object.assign({}, p, { swing: undefined }), rows }, null, 1));

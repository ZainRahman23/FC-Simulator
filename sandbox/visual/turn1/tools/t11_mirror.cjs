// turn1/tools/t11_mirror.cjs — TURN-1.1 left / right mirroring. A run that starts on the RIGHT foot and turns RIGHT vs one that starts on the LEFT foot and
// turns LEFT (TURN-1's exact-mirror pair), both with the authored body:
//  • movement: COM path mirrored about the start line, headings opposite, events identical with R ↔ L (TURN-1's own test);
//  • the authored layer: every channel equal, the lateral / about-vertical ones (pelvis shift / roll / yaw, trunk roll / yaw) exactly negated, the free-leg
//    swing offsets swapped R ↔ L — i.e. the layer itself adds no asymmetry;
//  • the pose: every joint of the right-turn run vs the mirrored joint (R ↔ L) of the left-turn run, mirrored about the start line — with the TURN-1
//    procedural body measured the same way as the control (RUN-1.3's own subtle arm asymmetry, asymArm / asymElbow, is in both).
const { loadTurn1 } = require("./t1_load.cjs"), X = loadTurn1(), T = X.TURN1, L11 = X.TURN11, fs = require("fs"), D = 180 / Math.PI;
const SIDED = new Set(["pX", "pRoll", "pYaw", "tRoll", "tYaw"]), Y0 = 34;
function run(foot, turn, v, authored) {
  const M12 = process.env.T12 === "1", scn = { init: { v, heading: 0, pos: [20, Y0], foot }, v, heading: 0, cmds: [{ t: 1.0, turn }] }, A = T.t1Make(X.skel, M12 && authored ? Object.assign({}, scn.init, { turn12: true }) : scn.init);
  if (authored) L11.attach(A, M12 ? { mode: "t12" } : undefined);   // T12=1: TURN-1.2 (its resolver + its phase body) instead of TURN-1.1
  const bones = A.body.skel.bones, out = [];
  for (let k = 0; k < 3.6 * 240; k++) { T.t1Step(A, T.t1Input(scn, k / 240)); if (k % 4) continue; const fk = T.t1Evaluate(A).fk, J = {}; for (const b of bones) J[b.name] = fk.joint[b.idx].slice();
    out.push({ P: A.P.slice(), psi: A.psi, J, c: A.l11s ? Object.assign({}, A.l11s.c) : null, sw: A.l11s ? JSON.parse(JSON.stringify(A.l11s.sw)) : null }); }
  return { out, ev: A.events.filter(e => e[1] === "TD" || e[1] === "maneuver").map(e => e.slice(1, 5).join(":")) };
}
const swapName = (n) => n.endsWith("_R") ? n.slice(0, -2) + "_L" : n.endsWith("_L") ? n.slice(0, -2) + "_R" : n;
const res = [];
for (const v of [3.0, 5.5, 7.8, 9.5]) for (const a of [15, 45, 60, 90, 120, 150, 180]) {
  const ang = Math.min(a, 179.5), r = run("R", ang, v, true), l = run("L", -ang, v, true), r0 = run("R", ang, v, false), l0 = run("L", -ang, v, false);
  let com = 0, hd = 0, ch = 0, sw = 0, jt = 0, jt0 = 0;
  for (let i = 0; i < r.out.length; i++) {
    const A = r.out[i], B = l.out[i]; com = Math.max(com, Math.abs(A.P[0] - B.P[0]), Math.abs((A.P[1] - Y0) + (B.P[1] - Y0))); hd = Math.max(hd, Math.abs(T.wrapA(A.psi + B.psi)));
    for (const k in A.c) ch = Math.max(ch, Math.abs(A.c[k] - (SIDED.has(k) ? -B.c[k] : B.c[k])));
    for (const F of ["R", "L"]) for (const k in A.sw[F]) sw = Math.max(sw, Math.abs(A.sw[F][k] - (k === "cross" ? -1 : 1) * B.sw[F === "R" ? "L" : "R"][k]));
    const mj = (P, Q, out) => { let m = out; for (const n in P.J) { const p = P.J[n], q = Q.J[swapName(n)]; m = Math.max(m, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - (-2 * Y0 - q[2]))); } return m; };
    jt = mj(A, B, jt); jt0 = mj(r0.out[i], l0.out[i], jt0);
  }
  // events: kinds, feet (R ↔ L) and roles identical; logged numbers equal within 0.011 (they are printed to 2 decimals: a value mirrored to
  // floating-point precision can still round to the other side of a last digit)
  const evKey = (e, swap) => e.split(":").map(x => swap && x === "R" ? "L" : swap && x === "L" ? "R" : x), num = (x) => x !== "" && !isNaN(+x);
  const evOk = r.ev.length === l.ev.length && r.ev.every((e, i) => { const a = evKey(e, true), b = evKey(l.ev[i], false); return a.length === b.length && a.every((x, j) => num(x) && num(b[j]) ? Math.abs(Math.abs(+x) - Math.abs(+b[j])) <= 0.011 : x === b[j]); });
  res.push({ v, turn: a, comMirrorErrMm: +(com * 1000).toFixed(4), headingMirrorErrDeg: +(hd * D).toFixed(5), eventsMirrored: evOk, layerChannelMirrorErr: +ch.toExponential(2), freeLegMirrorErrM: +sw.toExponential(2),
    jointMirrorErrMm: { t11: +(jt * 1000).toFixed(2), t1Control: +(jt0 * 1000).toFixed(2) } });
  const q = res[res.length - 1]; console.log(`v ${v} ${a}°  COM ${q.comMirrorErrMm} mm  events ${evOk ? "mirrored" : "DIFFER"}  layer channels ${q.layerChannelMirrorErr}  free leg ${q.freeLegMirrorErrM}  joints with the layer ${q.jointMirrorErrMm.t11} mm (TURN-1 control ${q.jointMirrorErrMm.t1Control} mm)`);
}
const ok = res.every(r => r.comMirrorErrMm < 0.01 && r.eventsMirrored && r.layerChannelMirrorErr < 1e-9 && r.freeLegMirrorErrM < 1e-9), jmax = Math.max(...res.map(r => r.jointMirrorErrMm.t11)), j0 = Math.max(...res.map(r => r.jointMirrorErrMm.t1Control));
console.log(ok ? `MIRROR EXACT (movement, layer channels, free leg) in all ${res.length} cases; joints with the layer ≤ ${jmax} mm vs TURN-1 control ≤ ${j0} mm` : "MIRROR MISMATCH");
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ note: "TURN-1.1 mirroring (start R + turn right vs start L + turn left), authored body; joint error vs the TURN-1 body as control", exact: ok, jointMaxMm: { t11: jmax, t1Control: j0 }, cases: res }, null, 1));

// run1/tools/run1_continuity.cjs — continuity / contact diagnostics for RUN-1, and the same measures on Locomotion V1 (unmodified
// ofActorTick, 60 Hz, V1.3 presentation and V1 + LC-1) under the same straight-line mover.
//   • joint world positions sampled at the tick rate → velocity (1st diff), "pop" = |2nd diff| (m per tick², i.e. acceleration·dt²) and
//     jerk-of-displacement (V1's diag.jerk definition: change in the per-tick displacement); p99 / max per joint group
//   • planted-foot slip: horizontal travel of the planted foot's ground point while the contact state says "planted"
//   • foot penetration (lowest boot point below the stud plane), swing clearance
//   • RUN-1 only: joint-channel angular velocities in continuous time (symmetric difference of the closed-form pose, h = 0.1 ms)
// usage: node run1_continuity.cjs [--v 5.5] [--hz 60] [--secs 4] [--json out.json]
const { loadRun1 } = require("./run1_load.cjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const X = loadRun1(), D = 180 / Math.PI, v = +arg("v", 5.5), HZ = +arg("hz", 60), SECS = +arg("secs", 4), dt = 1 / HZ;
const skel = X.charSkel("vinicius"), B = skel.byName;
const GROUPS = { pelvis: ["pelvis"], spine: ["spine", "chest"], head: ["head"], hands: ["hand_R", "hand_L"], elbows: ["foreArm_R", "foreArm_L"], knees: ["shin_R", "shin_L"], ankles: ["foot_R", "foot_L"], toes: ["toe_R", "toe_L"] };
const sim = (t) => ({ x: 20 + v * t, y: 34, vx: v, vy: 0, heading: 0, v });
function series(kind) {                                   // returns per-tick { joint: [[x,y,z]...], planted: {R,L}, low: {R,L}, ground: {R,L} }
  const out = [];
  if (kind === "run1") {
    const A = X.r1Make(skel); const G = X.r1Prepare(A, v);
    for (let k = 0; k <= SECS * HZ; k++) { const t = k * dt; A.phase = ((t / G.p.T) % 1 + 1) % 1; const ev = X.r1Evaluate(A, sim(t)); const fk = ev.fk;
      out.push({ t, j: fk.joint.map(p => p.slice()), tip: fk.tip.map(p => p.slice()), W: [B.foot_R.idx, B.foot_L.idx, B.toe_R.idx, B.toe_L.idx].reduce((o, i) => (o[i] = Array.from(fk.world[i]), o), {}), planted: { R: ev.pose.legs.R.st, L: ev.pose.legs.L.st } }); }
  } else {
    X.setCont(kind === "lc1");
    const a = X.ofActorMake(skel, 0, 0, 0); a.motion = "LOCO"; a.loco = X.ofLocoMake(); a.state = { feet: {} };
    const pre = Math.round(1.0 * 60);
    for (let k = -pre; k <= SECS * 60; k++) { const t = k / 60, s = sim(t); a.x = s.x; a.y = s.y; a.facing = 0; a.speed = v; a.sim = { x: s.x, y: s.y, vx: v, vy: 0, facing: 0 };
      X.ofActorTick(a, 1 / 60, t + 10); if (k < 0) continue; const fk = a.sol.fk;
      out.push({ t, j: fk.joint.map(p => Array.from(p)), tip: fk.tip.map(p => Array.from(p)), W: [B.foot_R.idx, B.foot_L.idx, B.toe_R.idx, B.toe_L.idx].reduce((o, i) => (o[i] = Array.from(fk.world[i]), o), {}), planted: { R: !!(a.state.feet.R && a.state.feet.R.locked && a.state.feet.R.w > 0.99 && a.state.feet.R.rel == null), L: !!(a.state.feet.L && a.state.feet.L.locked && a.state.feet.L.w > 0.99 && a.state.feet.L.rel == null) } }); }
  }
  return out;
}
const q = (arr, p) => { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
function analyse(S, hz) {
  const r = { groups: {}, slip: {}, pen: {}, clear: {} };
  for (const [g, names] of Object.entries(GROUPS)) {
    const acc = [], jerk = [], vel = [];
    for (const n of names) { const i = B[n].idx;
      for (let k = 2; k < S.length; k++) { const a = S[k].j[i], b = S[k - 1].j[i], c = S[k - 2].j[i];
        const d1 = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), d0 = Math.hypot(b[0] - c[0], b[1] - c[1], b[2] - c[2]);
        acc.push(Math.hypot(a[0] - 2 * b[0] + c[0], a[1] - 2 * b[1] + c[1], a[2] - 2 * b[2] + c[2])); jerk.push(Math.abs(d1 - d0)); vel.push(d1 * hz); } }
    // root-relative velocity is dominated by v; report the 2nd-difference measures (scale-free: m per tick²) as cm
    r.groups[g] = { accP99cm: +(q(acc, 0.99) * 100).toFixed(2), accMaxCm: +(Math.max(...acc) * 100).toFixed(2), jerkP99cm: +(q(jerk, 0.99) * 100).toFixed(2), jerkMaxCm: +(Math.max(...jerk) * 100).toFixed(2) };
  }
  // contact-point slip: the boot's contact point (heel bottom or the MTP joint's ground point, whichever is lower) must not travel while planted
  const heelZ = skel.feet ? skel.feet.R.footwearMin[2] + 0.012 : -0.07, mtpUp = skel.byName.toe_R.off[1] + skel.ankleH;   // MTP height above the stud plane
  for (const sd of ["R", "L"]) {
    const fi = B["foot_" + sd].idx, ti = B["toe_" + sd].idx; let maxStance = 0, maxTick = 0, acc = 0, prev = null, maxPen = 0, minClear = 1e9;
    for (let k = 0; k < S.length; k++) { const a = S[k].j[fi], tip = S[k].tip[ti], low = Math.min(a[1] - skel.ankleH, tip[1]);
      maxPen = Math.max(maxPen, -Math.min(0, low + 0.004));
      const heel = X.M4.transformPoint(S[k].W[fi], [0, -skel.ankleH, heelZ]), mtp = X.M4.transformPoint(S[k].W[ti], [0, -mtpUp, 0]);
      const cp = heel[1] <= mtp[1] ? { k: "heel", p: heel } : { k: "mtp", p: mtp };
      if (S[k].planted[sd]) { if (prev && prev.k === cp.k) { const d = Math.hypot(cp.p[0] - prev.p[0], cp.p[2] - prev.p[2]); acc += d; maxTick = Math.max(maxTick, d); } prev = cp; maxStance = Math.max(maxStance, acc); }
      else { prev = null; acc = 0; minClear = Math.min(minClear, a[1] - skel.ankleH); } }
    r.slip[sd] = { stanceCm: +(maxStance * 100).toFixed(2), tickMm: +(maxTick * 1000).toFixed(2) }; r.pen[sd] = +(maxPen * 100).toFixed(2); r.clear[sd] = +(minClear * 100).toFixed(1);
  }
  return r;
}
const res = {};
for (const kind of ["run1", "v13", "lc1"]) { const S = kind === "run1" && HZ !== 60 ? series(kind) : series(kind); res[kind] = analyse(S, kind === "run1" ? HZ : 60); }
// RUN-1 angular velocities (continuous time): channel rates over one stride at 2000 samples
{ const A = X.r1Make(skel); const G = X.r1Prepare(A, v), T = G.p.T, h = 1e-4, mx = {};
  for (let i = 0; i < 2000; i++) { const t = i / 2000 * T; const c0 = X.r1Pose(G, ((t - h) / T + 1) % 1).legs.R.ch, c1 = X.r1Pose(G, ((t + h) / T) % 1).legs.R.ch;
    for (const c of X.R1_CH) { const w = Math.abs(c1[c] - c0[c]) / (2 * h) * D; mx[c] = Math.max(mx[c] || 0, w); } }
  res.run1.channelRateMaxDegS = Object.fromEntries(Object.entries(mx).map(([k, w]) => [k, Math.round(w)])); }
console.log(`continuity @ ${v} m/s, RUN-1 sampled at ${HZ} Hz, V1 at 60 Hz ticks (measures in cm per tick²; lower = smoother)`);
console.log("group     |  RUN-1 acc p99/max   jerk p99/max  |  V1.3 acc p99/max   jerk p99/max  |  V1+LC-1 acc p99/max  jerk p99/max");
for (const g of Object.keys(GROUPS)) { const a = res.run1.groups[g], b = res.v13.groups[g], c = res.lc1.groups[g];
  console.log(`${g.padEnd(9)} | ${String(a.accP99cm).padStart(6)} / ${String(a.accMaxCm).padEnd(6)} ${String(a.jerkP99cm).padStart(6)} / ${String(a.jerkMaxCm).padEnd(6)} | ${String(b.accP99cm).padStart(6)} / ${String(b.accMaxCm).padEnd(6)} ${String(b.jerkP99cm).padStart(6)} / ${String(b.jerkMaxCm).padEnd(6)} | ${String(c.accP99cm).padStart(6)} / ${String(c.accMaxCm).padEnd(6)} ${String(c.jerkP99cm).padStart(6)} / ${String(c.jerkMaxCm).padEnd(6)}`); }
for (const k of ["run1", "v13", "lc1"]) console.log(`${k}: contact-point slip per stance R ${res[k].slip.R.stanceCm} cm (max/tick ${res[k].slip.R.tickMm} mm) L ${res[k].slip.L.stanceCm} cm · penetration R ${res[k].pen.R} L ${res[k].pen.L} cm · swing min ankle-above-rest R ${res[k].clear.R} L ${res[k].clear.L} cm`);
console.log("RUN-1 channel angular-rate max (deg/s):", JSON.stringify(res.run1.channelRateMaxDegS));
if (arg("json")) require("fs").writeFileSync(arg("json"), JSON.stringify(res, null, 1));

// turn1/tools/t1_pops.cjs — pose-continuity check at 240 Hz: for key joints, the residual of each position from its constant-velocity extrapolation
// e = |p(t+h) − 2p(t) + p(t−h)|. A pop (teleport / snap) shows as an isolated residual far above the motion's own curvature. Reports the largest
// residual per joint with its time, clock segment and step role. usage: node t1_pops.cjs ids [--thr 0.005]
const { loadTurn1 } = require("./t1_load.cjs"), X = loadTurn1(), T = X.TURN1, SCN = require("../turn1_scenarios.js");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, thr = +arg("thr", 0.005);
const J = ["pelvis", "foot_R", "foot_L", "toe_R", "toe_L", "hand_R", "hand_L", "head"];
function pops(id) {
  const scn = SCN.get(id), A = T.t1Make(X.skel, scn.init), n = Math.round(scn.dur * 240), idx = A.body.idx, hist = [], worst = {}, list = [];
  for (let k = 0; k < n; k++) { T.t1Step(A, T.t1Input(scn, k / 240)); const ev = T.t1Evaluate(A), P = {}; for (const j of J) P[j] = (j.startsWith("toe") ? ev.fk.tip : ev.fk.joint)[idx[j]].slice();
    hist.push({ t: A.t, P, seg: A.clk.seg, x: A.clk.x, role: A.st.role ? A.st.role.kind : "RUN" }); if (hist.length < 3) continue;
    const a = hist[hist.length - 3], b = hist[hist.length - 2], c = hist[hist.length - 1];
    for (const j of J) { const e = Math.hypot(c.P[j][0] - 2 * b.P[j][0] + a.P[j][0], c.P[j][1] - 2 * b.P[j][1] + a.P[j][1], c.P[j][2] - 2 * b.P[j][2] + a.P[j][2]);
      if (!worst[j] || e > worst[j].e) worst[j] = { e, t: b.t, seg: b.seg, x: b.x, role: b.role }; if (e > thr) list.push([+b.t.toFixed(4), j, +(e * 1000).toFixed(1), b.seg, +b.x.toFixed(2), b.role]); } }
  return { id, worst, list };
}
const OUT = {}; process.on("exit", () => { const o = arg("json"); if (o) require("fs").writeFileSync(o, JSON.stringify({ note: "TURN-1 pose continuity: per scenario the largest 240 Hz residual |p(t+h) − 2p(t) + p(t−h)| per joint (mm), with time, clock segment and step role", scenarios: OUT }, null, 1)); });
for (const id of process.argv[2].split(",")) { const r = pops(id); OUT[id] = Object.fromEntries(Object.entries(r.worst).map(([j, w]) => [j, { mm: +(w.e * 1000).toFixed(1), t: +w.t.toFixed(3), seg: w.seg, x: +w.x.toFixed(2), role: w.role }])); console.log(id, Object.entries(r.worst).map(([j, w]) => `${j} ${(w.e * 1000).toFixed(1)}mm@${w.t.toFixed(3)}(s${w.seg} ${w.x.toFixed(2)} ${w.role})`).join("  "));
  if (r.list.length) console.log("   pops>", thr * 1000, "mm:", r.list.length, JSON.stringify(r.list.slice(0, 12))); }

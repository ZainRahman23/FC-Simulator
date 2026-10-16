// turn1/tools/t1_mirror.cjs — exact mirroring: a run that starts on the RIGHT foot and turns RIGHT vs one that starts on the LEFT foot and turns LEFT.
// The COM path must be the mirror image (y about the start line), headings opposite, and the event sequences identical with R ↔ L swapped.
const { loadTurn1 } = require("./t1_load.cjs"), X = loadTurn1(), T = X.TURN1, fs = require("fs"), D = 180 / Math.PI;
const run = (foot, turn, v) => { const scn = { init: { v, heading: 0, pos: [20, 34], foot }, v, heading: 0, cmds: [{ t: 1.0, turn }] }, A = T.t1Make(X.skel, scn.init), out = [];
  for (let k = 0; k < 3.6 * 240; k++) { T.t1Step(A, T.t1Input(scn, k / 240)); out.push([A.P[0], A.P[1], A.psi]); } return { out, ev: A.events.filter(e => e[1] === "TD" || e[1] === "maneuver").map(e => e.slice(1, 5).join(":")) }; };
const res = [];
for (const v of [3.0, 5.5, 7.8, 9.5]) for (const a of [15, 30, 45, 60, 90, 120, 150, 180]) { const r = run("R", Math.min(a, 179.5), v), l = run("L", -Math.min(a, 179.5), v); let md = 0, my = 0;
  for (let i = 0; i < r.out.length; i++) { md = Math.max(md, Math.abs(r.out[i][0] - l.out[i][0]), Math.abs((r.out[i][1] - 34) + (l.out[i][1] - 34))); my = Math.max(my, Math.abs(T.wrapA(r.out[i][2] + l.out[i][2]))); }
  const sw = (e, a, b) => e.replace(/:R:/, ":#:").replace(/:L:/, ":" + b + ":").replace(/:#:/, ":" + a + ":"), evR = r.ev.map(e => sw(e, "X", "Y")), evL = l.ev.map(e => sw(e, "Y", "X").replace(/:-/, ":"));
  res.push({ v, turn: a, comMirrorErrMm: +(md * 1000).toFixed(4), headingMirrorErrDeg: +(my * D).toFixed(5), eventsMirrored: JSON.stringify(evR) === JSON.stringify(evL) }); }
const ok = res.every(r => r.comMirrorErrMm < 0.01 && r.headingMirrorErrDeg < 0.001 && r.eventsMirrored);
console.log(ok ? "MIRROR EXACT in all " + res.length + " cases" : "MIRROR MISMATCH", JSON.stringify(res.filter(r => !(r.comMirrorErrMm < 0.01 && r.eventsMirrored))));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ note: "TURN-1 exact mirroring (start R + turn right vs start L + turn left)", exact: ok, cases: res }, null, 1));

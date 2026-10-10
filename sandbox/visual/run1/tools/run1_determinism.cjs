// run1/tools/run1_determinism.cjs — RUN-1 is a pure function of its input history: two fresh loads, the same speed profile, bit-identical
// joint matrices at every 60 Hz tick (constant 5.5 m/s and the 3 → 7.8 → 3 m/s ramp); also replay-from-zero vs incremental stepping.
const { loadRun1 } = require("./run1_load.cjs"), crypto = require("crypto");
const prof = { const: () => 5.5, ramp: (t) => t < 1 ? 3 : t < 4 ? 3 + 4.8 * (t - 1) / 3 : t < 5 ? 7.8 : t < 8 ? 7.8 - 4.8 * (t - 5) / 3 : 3 };
function run(kind, mode) {
  const X = loadRun1(), skel = X.charSkel("vinicius"), A = X.r1Make(skel), h = crypto.createHash("sha256"), vOf = prof[kind];
  let x = 0;
  for (let k = 0; k <= 540; k++) { const t = k / 60;
    let restore = null; if (mode === "replay") restore = X.r1Replay(A, vOf, null, t); else if (k > 0) for (let j = 0; j < 4; j++) X.r1Advance(A, vOf((k - 1) / 60 + (j + 0.5) / 240), 1 / 240);
    x += k > 0 ? vOf(t - 1 / 120) / 60 : 0; const ev = X.r1Evaluate(A, { x: 10 + x, y: 30, heading: 0.3, v: vOf(t) }); if (restore) restore();
    for (const m of ev.fk.world) h.update(Buffer.from(new Float32Array(m).buffer)); }
  return h.digest("hex").slice(0, 16);
}
for (const kind of ["const", "ramp"]) { const a = run(kind, "replay"), b = run(kind, "replay"), c = run(kind, "step"), d = run(kind, "step");
  console.log(`${kind}: replay ${a} / ${b} ${a === b ? "IDENTICAL" : "DIFFER"} · incremental ${c} / ${d} ${c === d ? "IDENTICAL" : "DIFFER"} · replay vs incremental ${a === c ? "IDENTICAL" : "differ (expected only if the grid paths differ)"}`); }

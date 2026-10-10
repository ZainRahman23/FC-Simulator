// run1/tools/run1_perf.cjs — CPU cost of the RUN-1 pose evaluation (gait + IK + FK + skin matrices), 1 and 22 rigs, vs Locomotion V1
// (ofActorTick: law + contact solve + FK + skin matrices). Node (V8, same engine family as Chrome); deterministic inputs.
// usage: node --expose-gc run1_perf.cjs [--frames 3000]
const { loadRun1 } = require("./run1_load.cjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const X = loadRun1(), FR = +arg("frames", 3000), v = 5.5, dt = 1 / 60;
const { performance } = require("perf_hooks");
const skel = X.charSkel("vinicius");
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
function bench(kind, n) {
  const actors = [];
  for (let i = 0; i < n; i++) {
    if (kind === "run1") { const A = X.r1Make(skel); X.r1Prepare(A, v); A.phase = i * 0.137 % 1; actors.push(A); }
    else { X.setCont(kind === "lc1"); const a = X.ofActorMake(skel, 0, 0, 0); a.motion = "LOCO"; a.loco = X.ofLocoMake(); a.state = { feet: {} }; actors.push(a); }
  }
  const times = []; if (global.gc) global.gc(); const h0 = process.memoryUsage().heapUsed; let allocs = 0;
  for (let f = -120; f < FR; f++) {
    const t = f * dt, t0 = performance.now();
    for (let i = 0; i < n; i++) {
      const y = 10 + i * 2.5, x = 20 + v * t;
      if (kind === "run1") { const A = actors[i]; X.r1Advance(A, v, dt); X.r1Evaluate(A, { x, y, heading: 0, v }); }
      else { const a = actors[i]; a.x = x; a.y = y; a.facing = 0; a.speed = v; a.sim = { x, y, vx: v, vy: 0, facing: 0 }; X.ofActorTick(a, dt, t + 10); }
    }
    const el = performance.now() - t0; if (f >= 0) times.push(el);
  }
  const h1 = process.memoryUsage().heapUsed;
  return { kind, n, meanMs: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(4), p95Ms: +q(times, 0.95).toFixed(4), maxMs: +Math.max(...times).toFixed(3), perRigUs: +(times.reduce((a, b) => a + b, 0) / times.length / n * 1000).toFixed(1), heapDeltaMB: +((h1 - h0) / 1048576).toFixed(1) };
}
const out = [];
for (const kind of ["run1", "v13", "lc1"]) for (const n of [1, 22]) { const r = bench(kind, n); out.push(r); console.log(JSON.stringify(r)); }
if (arg("json")) require("fs").writeFileSync(arg("json"), JSON.stringify(out, null, 1));

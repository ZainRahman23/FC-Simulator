// run1/tools/run1_perf.cjs — CPU cost of the RUN-1 pose evaluation (gait + IK + FK + skin matrices), 1 and 22 rigs, vs Locomotion V1
// (ofActorTick: law + contact solve + FK + skin matrices). Node (V8, same engine family as Chrome); deterministic inputs.
// usage: node --expose-gc run1_perf.cjs [--frames 3000] [--v 5.5] [--kinds run1,v12,…]
const { loadRun1 } = require("./run1_load.cjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const X = loadRun1(), FR = +arg("frames", 3000), v = +arg("v", 5.5), dt = 1 / 60;
const { performance } = require("perf_hooks");
const skel = X.charSkel("vinicius");
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
// kinds: run1 (current RUN-1) · lv2b (the frozen Locomotion V2 straight-line baseline, run1_gait_v13.js) · v12 (RUN-1.2, frozen) · v11 (RUN-1.1, frozen) · orig (RUN-1.0, frozen) · v13 / lc1 (Locomotion V1); suffix "ramp" = the speed changes every frame (3 → 7.8 m/s sweep,
// so the gait is re-interpolated from the speed grid each frame — the worst case for the presentation; the simulation speed is the input)
const vAt = (kind, t) => kind.endsWith("ramp") ? (v > 8 ? 7.75 + 1.75 * Math.sin(t * 0.9) : 5.4 + 2.4 * Math.sin(t * 0.9)) : v;   // --v above 8: the sweep is 6 → 9.5 m/s
function bench(kind, n) {
  const actors = [], base = kind.replace("ramp", ""), E = base === "orig" ? X.RUN1_ORIG : base === "v11" ? X.RUN1_V11 : base === "v12" ? X.RUN1_V12 : base === "lv2b" ? X.RUN1_V13 : X, sk = base === "orig" || base === "v11" || base === "v12" || base === "lv2b" ? Object.assign({}, skel, { _r1body: undefined }) : skel;
  for (let i = 0; i < n; i++) {
    if (base === "run1" || base === "orig" || base === "v11" || base === "v12" || base === "lv2b") { const A = E.r1Make(sk); E.r1Prepare(A, v); A.phase = i * 0.137 % 1; actors.push(A); }
    else { X.setCont(kind === "lc1"); const a = X.ofActorMake(skel, 0, 0, 0); a.motion = "LOCO"; a.loco = X.ofLocoMake(); a.state = { feet: {} }; actors.push(a); }
  }
  const times = []; if (global.gc) global.gc(); const h0 = process.memoryUsage().heapUsed; let allocs = 0;
  for (let f = -120; f < FR; f++) {
    const t = f * dt, t0 = performance.now();
    for (let i = 0; i < n; i++) {
      const y = 10 + i * 2.5, x = 20 + v * t, vv = vAt(kind, t);
      if (base === "run1" || base === "orig" || base === "v11" || base === "v12" || base === "lv2b") { const A = actors[i]; E.r1Advance(A, vv, dt); E.r1Evaluate(A, { x, y, heading: 0, v: vv }); }
      else { const a = actors[i]; a.x = x; a.y = y; a.facing = 0; a.speed = v; a.sim = { x, y, vx: v, vy: 0, facing: 0 }; X.ofActorTick(a, dt, t + 10); }
    }
    const el = performance.now() - t0; if (f >= 0) times.push(el);
  }
  const h1 = process.memoryUsage().heapUsed;
  return { kind, n, meanMs: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(4), p95Ms: +q(times, 0.95).toFixed(4), maxMs: +Math.max(...times).toFixed(3), perRigUs: +(times.reduce((a, b) => a + b, 0) / times.length / n * 1000).toFixed(1), heapDeltaMB: +((h1 - h0) / 1048576).toFixed(1) };
}
const out = [];
for (const kind of (arg("kinds") || "run1,v12,v11,orig,run1ramp,v12ramp,v11ramp,origramp,v13,lc1").split(",")) for (const n of [1, 22]) { const r = bench(kind, n); out.push(r); console.log(JSON.stringify(r)); }
if (arg("json")) require("fs").writeFileSync(arg("json"), JSON.stringify(out, null, 1));

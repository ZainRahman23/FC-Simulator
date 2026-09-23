// OUTFIELD LOCOMOTION V1 — REGRESSION GATE (node, no browser)
//   1. ANIMATION ON/OFF NEUTRALITY: the authoritative player law is stepped with the presentation solve OFF and ON; every authoritative
//      quantity (x, y, vx, vy, facing) must be bit-identical. The animation may never write simulation state.
//   2. DETERMINISM / NO PRESENTATION RNG: the same run twice must produce bit-identical joint world positions.
//   3. SOURCE SCAN: no Math.random (or Date/performance-seeded value) anywhere in the locomotion presentation.
//   node of_loco_regress.js [--bodies A,B,C]
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../../anim3d");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const BODIES = opt("--bodies", "SHORT_LEAN,AVG_ATHLETIC,TALL_LEAN").split(",");
const FILES = ["m4.js", "skeleton.js", "skin_mesh.js", "ik.js", "gk_motion_library.js", "of_rig.js", "of_motion.js", "of_loco.js"];
const ctx = { console, Math, performance: { now: () => 0 }, Float32Array, Int32Array, Uint16Array, Map, Set, Object, Array, Number, JSON };
ctx.window = ctx; vm.createContext(ctx);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
vm.runInContext(`globalThis.clamp01=(x)=>Math.max(0,Math.min(1,x)); globalThis.lerp=(a,b,t)=>a+(b-a)*t; globalThis.smooth01=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}; globalThis.gkRootMatrix=function(px,py,f,dz){const m=M4.ident();const right=[-Math.sin(f),0,-Math.cos(f)],up=[0,1,0],fwd=[Math.cos(f),0,-Math.sin(f)];m[0]=right[0];m[1]=right[1];m[2]=right[2];m[4]=up[0];m[5]=up[1];m[6]=up[2];m[8]=fwd[0];m[9]=fwd[1];m[10]=fwd[2];m[12]=px;m[13]=dz||0;m[14]=-py;return m;};`, ctx);

const R = vm.runInContext(`(function(BODIES){
  const PT = { ACC: 4.8, VMAX: 8.2, RUNV: 5.0, WALKV: 1.5, JOGV: 3.0, ACC_GAIN: 8.5 / 4.8, BRAKE_PLANT: 12.0, ACC_LAT: 10.0, ACC_START: 9.5 }, DT = 1 / 60;
  const K = (o) => Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, o);
  // the authoritative law, verbatim from match.js ptStep (no ball / no carry steering: the harness parks the ball)
  function simStep(p, keys) {
    let dx = 0, dy = 0; if (keys.up) dy -= 1; if (keys.down) dy += 1; if (keys.left) dx -= 1; if (keys.right) dx += 1;
    const m = Math.hypot(dx, dy), spd = keys.sprint ? PT.VMAX : keys.walk ? PT.WALKV : keys.jog ? PT.JOGV : PT.RUNV; let dvx = 0, dvy = 0;
    if (m > 0) { dvx = dx / m * spd; dvy = dy / m * spd; }
    const cur = Math.hypot(p.vx, p.vy), ax = dvx - p.vx, ay = dvy - p.vy;
    if (cur > 0.5) { const uvx = p.vx / cur, uvy = p.vy / cur; const aPar = ax * uvx + ay * uvy; const aPx = ax - aPar * uvx, aPy = ay - aPar * uvy; const aLat = Math.hypot(aPx, aPy);
      const limPar = aPar >= 0 ? PT.ACC * PT.ACC_GAIN : PT.BRAKE_PLANT; const fPar = Math.min(1, limPar * DT / Math.max(1e-9, Math.abs(aPar))); const fLat = Math.min(1, PT.ACC_LAT * DT / Math.max(1e-9, aLat));
      p.vx += aPar * fPar * uvx + aPx * fLat; p.vy += aPar * fPar * uvy + aPy * fLat; }
    else { const am = Math.hypot(ax, ay), stp = Math.max(PT.ACC_START, PT.ACC * PT.ACC_GAIN) * DT; if (am > stp) { p.vx += ax / am * stp; p.vy += ay / am * stp; } else { p.vx = dvx; p.vy = dvy; } }
    p.x += p.vx * DT; p.y += p.vy * DT;
    const v = Math.hypot(p.vx, p.vy); const want = v > 0.7 ? Math.atan2(p.vy, p.vx) : p.facing;
    const df = ((want - p.facing) + Math.PI * 3) % (2 * Math.PI) - Math.PI; const rate = Math.max(4.0, Math.min(7.0, 7.0 - v * 0.30)) * DT; p.facing += Math.abs(df) <= rate ? df : Math.sign(df) * rate;
  }
  // every gait, every transition, both turns, a stop — 12 s of intent
  const script = (t) => t < 1 ? K({}) : t < 3 ? K({ right: true, walk: true }) : t < 5 ? K({ right: true, jog: true }) : t < 7 ? K({ right: true })
    : t < 8.5 ? K({ right: true, sprint: true }) : t < 10 ? K({ right: true, down: true, sprint: true }) : t < 11 ? K({ left: true }) : K({});
  const TICKS = 12 * 60;
  const runSim = (withAnim, id) => {
    const p = { x: 60, y: 34, vx: 0, vy: 0, facing: 0 }; const act = withAnim ? ofActorMake(id, 60, 34, 0) : null; if (act) act.motion = "LOCO";
    const trace = [], joints = []; let t = 0;
    for (let k = 0; k < TICKS; k++) {
      simStep(p, script(t)); t += DT;
      if (act) { act.x = p.x; act.y = p.y; act.facing = p.facing; act.speed = Math.hypot(p.vx, p.vy); act.sim = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing };
        const sol = ofActorTick(act, DT, t); if (k % 7 === 0) joints.push(sol.fk.joint.map(q => q.map(z => z))); }
      trace.push([p.x, p.y, p.vx, p.vy, p.facing]);
    }
    return { trace, joints };
  };
  const out = { bodies: {}, neutral: true, deterministic: true };
  const base = runSim(false, null);
  for (const id of BODIES) {
    const A = runSim(true, id), B = runSim(true, id);
    let maxAuth = 0; for (let k = 0; k < base.trace.length; k++) for (let i = 0; i < 5; i++) maxAuth = Math.max(maxAuth, Math.abs(base.trace[k][i] - A.trace[k][i]));
    let maxDet = 0; for (let k = 0; k < A.joints.length; k++) for (let j = 0; j < A.joints[k].length; j++) for (let i = 0; i < 3; i++) maxDet = Math.max(maxDet, Math.abs(A.joints[k][j][i] - B.joints[k][j][i]));
    let nan = false; for (const fr of A.joints) for (const q of fr) for (const z of q) if (!isFinite(z)) nan = true;
    out.bodies[id] = { authDelta: maxAuth, detDelta: maxDet, nan, ticks: TICKS, sampled: A.joints.length };
    if (maxAuth !== 0) out.neutral = false; if (maxDet !== 0) out.deterministic = false;
  }
  return out;
})(${JSON.stringify(BODIES)})`, ctx);

// 3. source scan
// POSE sources must contain no randomness and no wall-clock at all; the HARNESS may call performance.now() for its own timing panel,
// so those are listed separately and only flagged if the measured value could reach the pose (it is only ever pushed into OFPLAY.perf).
const POSE = ["of_loco.js", "of_motion.js", "of_rig.js"], HARNESS = ["of_player.js"];
const rng = [], clock = [];
const scan = (list, sink, pat) => { for (const f of list) { const p = path.join(ROOT, f); if (!fs.existsSync(p)) continue; const txt = fs.readFileSync(p, "utf8");
  txt.split("\n").forEach((l, i) => { if (pat.test(l) && !/^\s*\/\//.test(l)) sink.push(`${f}:${i + 1}: ${l.trim().slice(0, 100)}`); }); } };
scan(POSE.concat(HARNESS), rng, /Math\.random/);
scan(POSE, rng, /Date\.now\s*\(\)|performance\.now\s*\(\)/);
scan(HARNESS, clock, /performance\.now\s*\(\)/);
const clockBad = clock.filter(l => !/perf\.|const t0 = |const t1 = |const tS = |const tA = |tR\b/.test(l));

console.log("OUTFIELD LOCOMOTION V1 — REGRESSION GATE");
console.log("  1. animation ON/OFF neutrality (authoritative x,y,vx,vy,facing over 720 ticks of every gait + transitions + turns + stop)");
for (const id in R.bodies) { const b = R.bodies[id]; console.log(`       ${id.padEnd(13)} max |delta| = ${b.authDelta}   ${b.authDelta === 0 ? "IDENTICAL" : "*** DIFFERS ***"}`); }
console.log("  2. determinism (same run twice, joint world positions)");
for (const id in R.bodies) { const b = R.bodies[id]; console.log(`       ${id.padEnd(13)} max |delta| = ${b.detDelta}   ${b.detDelta === 0 ? "IDENTICAL" : "*** DIFFERS ***"}   NaN ${b.nan}`); }
console.log("  3. no presentation RNG, no wall-clock in the pose path");
console.log(rng.length ? rng.map(x => "       *** " + x).join("\n") : "       none (of_loco.js, of_motion.js, of_rig.js carry no Math.random / Date.now / performance.now; of_player.js carries no Math.random)");
console.log(`       harness timing probes in of_player.js: ${clock.length} (measured into OFPLAY.perf only, never into a pose)${clockBad.length ? "\n" + clockBad.map(x => "       *** " + x).join("\n") : ""}`);
const ok = R.neutral && R.deterministic && !rng.length && !clockBad.length && !Object.values(R.bodies).some(b => b.nan);
console.log(ok ? "\nGATE PASS" : "\nGATE FAIL"); process.exit(ok ? 0 : 1);

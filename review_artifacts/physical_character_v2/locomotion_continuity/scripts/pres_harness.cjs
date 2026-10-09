// LC-1 offline presentation harness: runs the page's OWN presentation scripts (anim3d/*.js of a given tree) in an isolated node vm and drives one
// runner actor from recorded authoritative rows exactly as of_squad.js ofSquadPresent does in LOCO mode (a.sim from the player's context, then
// ofActorTick(a, PT_DT, t.now)). Used for fast design iteration and for the general speed matrix; validated bit-for-bit against page records.
const vm = require("vm"), fs = require("fs"), path = require("path"), zlib = require("zlib");
function loadPres(wt, extra, post) {
  const ctx = { Math, console: { warn() {}, log() {}, error() {} }, performance: { now: () => 0 }, Float32Array, Float64Array, Uint16Array, Uint32Array, Uint8Array, Object, Array, JSON, Number, Set, Map, Promise, PT: { LEG_REF: 0.865, IDLE_V: 0.18 }, PT_DT: 1 / 60 };
  vm.createContext(ctx); const V = path.join(wt, "sandbox/visual"), run = (f) => vm.runInContext(fs.readFileSync(path.join(V, f), "utf8"), ctx, { filename: f });
  for (const f of ["anim3d/m4.js", "anim3d/skeleton.js", "anim3d/ik.js", "anim3d/of_rig.js", "anim3d/of_motion.js", "anim3d/of_loco.js"].concat(extra || []).concat(["anim3d/of_character.js"], post || [])) run(f);
  const gg = fs.readFileSync(path.join(V, "anim3d/gk_graph.js"), "utf8"), m = /function gkRootMatrix\([\s\S]*?\n}\n/.exec(gg); vm.runInContext(m[0], ctx, { filename: "gk_graph.js:gkRootMatrix" });
  const g = (n) => vm.runInContext(n, ctx);
  const rig = JSON.parse(fs.readFileSync(path.join(wt, "assets/characters/outfield/vinicius/rig.json"), "utf8"));
  return { ctx, g, rig };
}
// drive the runner (ctx index 0) from AIR rows; returns per tick { world (rounded like the exporter), diag, pose extras }
function driveRows(P, rows, opts) {
  const o = opts || {}, g = P.g, skel = g("ofCharSkeleton")({ rig: JSON.parse(JSON.stringify(P.rig)), skel: null });
  const r0 = rows[0], a = g("ofActorMake")(skel, r0[8], r0[9], r0[12]); a.motion = "LOCO"; a.loco = g("ofLocoMake")(); a.state = { feet: {} }; a.sim = { x: r0[8], y: r0[9], vx: 0, vy: 0, facing: r0[12] };
  const r8 = (x) => Math.round(x * 1e8) / 1e8, out = [], tick = g("ofActorTick"), dt = 1 / 60;
  for (let k = 0; k < rows.length; k++) { const r = rows[k]; a.x = r[8]; a.y = r[9]; a.facing = r[12]; a.speed = Math.hypot(r[10], r[11]);
    a.sim = { x: r[8], y: r[9], vx: r[10], vy: r[11], facing: r[12], gaitPhase: r[13], gaitSettled: o.settled ? o.settled(k, r) : false };
    const now = o.now ? o.now(k) : (k + 1) * dt; tick(a, dt, now);
    out.push({ world: a.sol.fk.world.map(m => Array.from(m).map(r8)), diag: a.sol.diag, pose: { pelvisOff: a.pose._pelvis ? a.pose._pelvis[1] : null, flight: !!a.pose._flight, legs: a.pose._legs }, loco: a.loco.diag }); }
  return { out, skel, actor: a };
}
// synthetic straight run along +x at speed v(t) with the simulation's stride clock (match.js ptGaitStep: phase += dt * v / (P.step * LEG_REF) / 2)
function driveSynth(P, vOf, T, dt, opts) {
  const o = opts || {}, g = P.g, skel = g("ofCharSkeleton")({ rig: JSON.parse(JSON.stringify(P.rig)), skel: null }), params = g("ofLocoParams"), LEG = 0.865;
  let x = 50, ph = o.phase0 != null ? o.phase0 : 0.08; const a = g("ofActorMake")(skel, x, 34, 0); a.motion = "LOCO"; a.loco = g("ofLocoMake")(); a.state = { feet: {} }; a.sim = { x, y: 34, vx: 0, vy: 0, facing: 0 };
  const out = [], tick = g("ofActorTick"), n = Math.round(T / dt);
  for (let k = 0; k < n; k++) { const t = (k + 1) * dt, v = vOf(t), Pp = params(v); x += v * dt; if (v > 0.18) ph = (ph + dt * v / (Pp.step * LEG) / 2) % 1;
    a.x = x; a.y = 34; a.facing = 0; a.speed = v; a.sim = { x, y: 34, vx: v, vy: 0, facing: 0, gaitPhase: ph, gaitSettled: false }; tick(a, dt, t);
    out.push({ t, v, phase: ph, x, world: a.sol.fk.world.map(m => Array.from(m)), joint: a.sol.fk.joint.map(p => p.slice()), tip: a.sol.fk.tip.map(p => p.slice()), diag: JSON.parse(JSON.stringify(a.sol.diag)), flight: !!a.pose._flight, legs: JSON.parse(JSON.stringify(a.pose._legs || {})), pel: a.pose._pelvis ? a.pose._pelvis.slice() : null }); }
  return { out, skel, actor: a };
}
const loadRec = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
module.exports = { loadPres, driveRows, driveSynth, loadRec };
if (require.main === module) {   // validation: node pres_harness.cjs <tree> <record.json.gz> [nowMode]
  const [wt, rec, nowMode] = process.argv.slice(2), P = loadPres(wt), R = loadRec(rec);
  const settled = (k, r) => Math.hypot(r[10], r[11]) <= 0.18;
  for (const nm of (nowMode ? [nowMode] : ["k+1", "k", "k+2"])) { const off = nm === "k" ? 0 : nm === "k+1" ? 1 : 2;
    const res = driveRows(P, R.rows, { now: (k) => (k + off) / 60, settled }); let mx = 0, at = -1, nBad = 0;
    for (let k = 0; k < R.pres.length; k++) { let d = 0; for (let b = 0; b < R.pres[k].world.length; b++) for (let i = 12; i < 15; i++) d = Math.max(d, Math.abs(R.pres[k].world[b][i] - res.out[k].world[b][i])); if (d > mx) { mx = d; at = k; } if (d > 1e-7) nBad++; }
    console.log(path.basename(rec), "now", nm, "max |Δpos| vs page record", mx.toExponential(2), "at", at, "frames > 1e-7 m:", nBad, "/", R.pres.length); }
}

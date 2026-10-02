// G2a report charts: inline SVG time series (yaw vs intended; vertical angular momentum by body group; knee / hip vs reference) — runs the
// scenarios once (keepStates) and writes an SVG snippet file per chart
import fs from "fs"; import path from "path";
const PC = process.argv[2], OUT = process.argv[3], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js");
const bi = (n) => spec.bodies.findIndex(b => b.name === n), ji = (n) => spec.joints.findIndex(j => j.name === n), yaw = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[0], z[2]); }, D = 57.2958;
function series(key) { const r = G2.runG2a(J, spec, key, { poses, keepStates: true }), T_ = G2.TESTS_G2A[key], turn = T_.loco.rhythm && T_.loco.rhythm.turn, mj = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (10 - 15 * x + 6 * x * x); };
  const f0 = r.recs[0].states, a = Q.rot(f0[bi("foot_L")].rot, [0, 0, 1]), b = Q.rot(f0[bi("foot_R")].rot, [0, 0, 1]), y0 = Math.atan2(a[0] + b[0], a[2] + b[2]), P = REF.inPlaceWalkParams(T_.loco.human && T_.loco.human.over);
  const w = (x) => Math.atan2(Math.sin(x), Math.cos(x)) * D;
  return r.recs.filter(q => q.n % 4 === 0).map(q => { const lz = G2.amBudget(spec, q.states), ref = q.ref ? REF.refPose(P, q.ref.u, q.ref.w) : null;
    return { t: q.t, pel: w(yaw(q.states[0].rot) - y0), che: w(yaw(q.states[bi("chest")].rot) - y0), int: turn ? turn.deg * mj((q.t - turn.at) / turn.dur) : 0, lz, knee: G2.jointAngles(spec, q.states, ji("knee_R")).a, hip: -G2.jointAngles(spec, q.states, ji("hip_R")).y, rKnee: ref ? ref.shin_R[0] : null, rHip: ref ? -ref.thigh_R[0] : null }; }); }
function svg(title, S, sets, t0, t1, unit) { const W = 900, H = 250, ml = 46, mr = 10, mt = 44, mb = 26, sel = S.filter(s => s.t >= t0 && s.t <= t1), X = (t) => ml + (t - t0) / (t1 - t0) * (W - ml - mr);
  const vals = sets.flatMap(([, k]) => sel.map(s => typeof k === "function" ? k(s) : s[k]).filter(v => v != null)), lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.08 + 1e-6, Y = (v) => mt + (1 - (v - lo + pad) / (hi - lo + 2 * pad)) * (H - mt - mb);
  let o = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${title}"><text x="${ml}" y="16" class="ct">${title}</text>`;
  const tick = (v) => `<line x1="${ml}" x2="${W - mr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gl"/><text x="${ml - 6}" y="${(Y(v) + 4).toFixed(1)}" class="ax" text-anchor="end">${(+v.toFixed(1))}</text>`;
  const step = Math.pow(10, Math.floor(Math.log10((hi - lo) || 1))) * ((hi - lo) / Math.pow(10, Math.floor(Math.log10((hi - lo) || 1))) > 5 ? 2 : 1); for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) o += tick(v);
  for (let t = Math.ceil(t0); t <= t1; t++) o += `<text x="${X(t).toFixed(1)}" y="${H - 8}" class="ax" text-anchor="middle">${t} s</text>`;
  let lx = ml; for (const [nm, k, cls, dash] of sets) { const pts = sel.map(s => [s.t, typeof k === "function" ? k(s) : s[k]]).filter(p => p[1] != null).map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ");
    o += `<polyline points="${pts}" class="${cls}"${dash ? ' stroke-dasharray="5 4"' : ""}/>`; o += `<text x="${lx}" y="34" class="lg ${cls}t">— ${nm}</text>`; lx += 22 + nm.length * 7.2; }
  return o + `<text x="${W - mr}" y="16" class="ax" text-anchor="end">${unit}</text></svg>`; }
const M = series("G2a_walkInPlace"), N = series("G2a_noArms"), TU = series("G2a_turn30"), G1 = series("G2a_G1style");
const out = {
  yaw: svg("G2a — pelvis and chest yaw (from the initial heading)", M, [["pelvis", "pel", "c1"], ["chest", "che", "c2"], ["intended", "int", "c0", true]], 1, 11, "deg"),
  yawCmp: svg("pelvis yaw — G2a vs arms held (no counter-swing) vs G1 robotic stepping", M.map((s, i) => ({ t: s.t, a: s.pel, b: N[i] ? N[i].pel : null, c: G1[i] ? G1[i].pel : null })), [["G2a", "a", "c1"], ["no arm swing", "b", "c3"], ["G1 stepping", "c", "c4"]], 1, 11, "deg"),
  lz: svg("vertical angular momentum about the whole-body COM, by body group (G2a)", M.map(s => ({ t: s.t, legs: s.lz.legs, arms: s.lz.arms, up: s.lz.trunk + s.lz.pelvis, all: s.lz.all })), [["legs", "legs", "c5"], ["arms", "arms", "c3"], ["trunk + pelvis", "up", "c6"], ["whole body", "all", "c0"]], 3, 6, "kg·m²/s"),
  turn: svg("intended 30° turn — pelvis, chest and intended heading", TU, [["pelvis", "pel", "c1"], ["chest", "che", "c2"], ["intended", "int", "c0", true]], 1, 11, "deg"),
  knees: svg("right knee and hip flexion — physical (solid) vs the in-place WALK reference at the measured phase (dashed)", M, [["knee", "knee", "c1"], ["knee ref", "rKnee", "c1", true], ["hip", "hip", "c5"], ["hip ref", "rHip", "c5", true]], 3.5, 6, "deg") };
fs.writeFileSync(OUT, JSON.stringify(out)); console.log("charts", Object.keys(out).join(", "));

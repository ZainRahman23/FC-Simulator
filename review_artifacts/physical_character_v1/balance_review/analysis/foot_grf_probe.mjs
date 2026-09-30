// READ-ONLY feasibility probe: per-foot ground reaction from the ankle joint's constraint impulse + Newton on the foot body,
// compared with the total GRF from whole-body momentum. Re-runs Gate B test B's exact inputs; changes nothing in the worktree.
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3] || "B";
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt, JoltCharacterWorld } = await import(PC + "/pc_jolt.js");
const GB = await import(PC + "/pc_gateb.js"); const GA = await import(PC + "/pc_gatea.js"); const C = await import(PC + "/pc_control.js"); const { V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), P = C.buildPoses(spec), TST = GB.TESTS[KEY], dt = 1 / 240, g = 9.81, M = spec.totalMass;
const w = new JoltCharacterWorld(J, spec, GB.GATE_B_WORLD, GA.frictionPolicy(spec)); for (const [a, b] of GA.disabledPairs(spec)) w.disablePair(a, b);
const prof = C.motorProfile(spec, P.N.S, TST.strength || "candidate"); prof.forEach((m, k) => w.setMotor(k, m));
const sup = C.supportSettings(spec, P.N.S, TST.support || "candidate"); if (sup) w.addSupport(sup);
P[TST.start || "N"].S.forEach((s, i) => w.setPose(i, s.pos, s.rot)); const segs = TST.segs(P, spec);
const fi = { L: spec.bodies.findIndex(b => b.name === "foot_L"), R: spec.bodies.findIndex(b => b.name === "foot_R") }, ak = { L: spec.joints.findIndex(j => j.name === "ankle_L"), R: spec.joints.findIndex(j => j.name === "ankle_R") };
let prev = null, pv = null; const rows = [];
for (let n = 1; n <= Math.round(TST.seconds * 240); n++) { const tg = C.targetAt(spec, segs, n * dt, dt); for (let k = 0; k < spec.joints.length; k++) w.setJointTarget(k, tg.P.T[k], tg.W[k]); if (sup) w.setSupportTarget(tg.P.rootPos, tg.P.rootRot, tg.rootV, tg.rootW);
  w.step(dt, 1); const st = spec.bodies.map((b, i) => w.read(i)); const lam = {}; for (const s of ["L", "R"]) { const l = w.cons[ak[s]].c.GetTotalLambdaPosition(); lam[s] = [l.GetX(), l.GetY(), l.GetZ()]; }
  const vcom = V.sc(st.reduce((a, s, i) => V.add(a, V.sc(s.v, spec.bodies[i].mass)), [0, 0, 0]), 1 / M), supF = sup ? V.sc(w.supportLambda().lin, 1 / dt) : [0, 0, 0];
  if (prev) { const feet = {}; for (const s of ["L", "R"]) { const i = fi[s], m = spec.bodies[i].mass, a = V.sc(V.sub(st[i].v, prev[i].v), 1 / dt); feet[s] = V.sub(V.sc(V.sub(a, [0, -g, 0]), m), V.sc(lam[s], 1 / dt)); }
    const tot = V.sub(V.sub(V.sc(V.sub(vcom, pv), M / dt), [0, -g * M, 0]), supF); rows.push({ t: n * dt, L: feet.L, R: feet.R, tot }); }
  prev = st; pv = vcom; }
const avg = (a, b) => { const R = rows.filter(r => r.t >= a && r.t < b), m = (f) => R.reduce((s, r) => s + f(r), 0) / R.length; return { L: m(r => r.L[1]), R: m(r => r.R[1]), sum: m(r => r.L[1] + r.R[1]), tot: m(r => r.tot[1]), LH: m(r => Math.hypot(r.L[0], r.L[2])), RH: m(r => Math.hypot(r.R[0], r.R[2])) }; };
console.log(`test ${KEY}: per-foot vertical GRF (N) from ankle impulse + foot Newton vs total from whole-body momentum (window means; body weight ${(M * g).toFixed(0)} N)`);
for (const [a, b, lab] of [[0.2, 0.5, "double stance"], [0.9, 1.2, "weight shifting"], [2.0, 3.5, "single stance (knee up)"], [5.2, 6.0, "double stance again"]]) { const x = avg(a, b); if (!Number.isFinite(x.sum)) continue;
  console.log(`  ${lab.padEnd(24)} [${a}-${b}s]  L ${x.L.toFixed(0).padStart(5)}  R ${x.R.toFixed(0).padStart(5)}  L+R ${x.sum.toFixed(0).padStart(5)}  total(momentum) ${x.tot.toFixed(0).padStart(5)}  horizontal L ${x.LH.toFixed(0)} R ${x.RH.toFixed(0)}`); }
w.destroy();

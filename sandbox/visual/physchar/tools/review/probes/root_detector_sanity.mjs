// READ-ONLY: the C1 pelvis external-force detector applied to the HISTORICAL Gate B support fixture (test B). The detector must read back the
// fixture's force; in C1 the same detector reads ~0 N. Changes nothing in the worktree.
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt, JoltCharacterWorld } = await import(PC + "/pc_jolt.js");
const GB = await import(PC + "/pc_gateb.js"); const GA = await import(PC + "/pc_gatea.js"); const C = await import(PC + "/pc_control.js"); const { V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), P = C.buildPoses(spec), TST = GB.TESTS.B, dt = 1 / 240, g = 9.81;
const w = new JoltCharacterWorld(J, spec, GB.GATE_B_WORLD, GA.frictionPolicy(spec)); for (const [a, b] of GA.disabledPairs(spec)) w.disablePair(a, b);
C.motorProfile(spec, P.N.S, "candidate").forEach((m, k) => w.setMotor(k, m)); const sup = C.supportSettings(spec, P.N.S, "candidate"); w.addSupport(sup);
P.N.S.forEach((s, i) => w.setPose(i, s.pos, s.rot)); const segs = TST.segs(P, spec), pj = spec.joints.map((j, k) => j.parentIndex === 0 ? k : -1).filter(k => k >= 0);
let prev = w.read(0); const diffs = [], mags = [];
for (let n = 1; n <= 6 * 240; n++) { const tg = C.targetAt(spec, segs, n * dt, dt); for (let k = 0; k < spec.joints.length; k++) w.setJointTarget(k, tg.P.T[k], tg.W[k]); w.setSupportTarget(tg.P.rootPos, tg.P.rootRot, tg.rootV, tg.rootW);
  w.step(dt, 1); const p = w.read(0), mp = spec.bodies[0].mass; let F = V.sub(V.sc(V.sc(V.sub(p.v, prev.v), 1 / dt), mp), [0, -g * mp, 0]); for (const k of pj) F = V.add(F, V.sc(w.jointLambdaPosition(k), 1 / dt));
  const touch = w.contacts.some(c => (c.a === 0 || c.b === 0) && c.depth > -0.0005); const Fs = V.sc(w.supportLambda().lin, 1 / dt);
  if (!touch && n > 12) { diffs.push(V.len(V.sub(F, Fs))); mags.push(V.len(Fs)); } prev = p; }
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`Gate B test B (historical support fixture): support force mean ${mean(mags).toFixed(1)} N (max ${Math.max(...mags).toFixed(0)} N); detector residual vs support force: mean |diff| ${mean(diffs).toFixed(2)} N, max ${Math.max(...diffs).toFixed(1)} N over ${diffs.length} steps`);
w.destroy();

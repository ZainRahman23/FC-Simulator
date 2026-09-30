// drop E (V1.1): the smallest change of the authored right-arm angles that removes the start-pose interpenetration (first solved step)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const GA = await import(PC + "/pc_gatea.js"); const { V, Q } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), s1 = buildBodySpec(rig, mesh, { calib: "V1" }), s11 = buildBodySpec(rig, mesh, { calib: "V1.1" }), D = GA.DROPS.E, j0 = JSON.parse(JSON.stringify(D.j));
const bi = (sp, n) => sp.bodies.findIndex(b => b.name === n), handOf = (sp, S) => { const i = bi(sp, "foreArm_R"), sh = sp.bodies[i].shapes[1]; return V.add(S[i].pos, Q.rot(S[i].rot, sh.pos)); };
const chestLocal = (sp, S, p) => { const c = S[bi(sp, "chest")]; return Q.rot(Q.conj(c.rot), V.sub(p, c.pos)); };
const S1 = GA.poseBodies(s1, D.rot, D.j), h1 = chestLocal(s1, S1, handOf(s1, S1)), e1 = chestLocal(s1, S1, S1[bi(s1, "foreArm_R")].pos);
console.log("V1 authored: hand (chest frame)", h1.map(v => v.toFixed(3)), "elbow", e1.map(v => v.toFixed(3)));
const tries = []; for (const dy of [0, 10, 20, 30, -10]) for (const da of [0, -10, -20, -30, -40]) tries.push({ dy, da });
tries.sort((a, b) => (Math.abs(a.dy) + Math.abs(a.da)) - (Math.abs(b.dy) + Math.abs(b.da)));
let found = 0;
for (const t of tries) { D.j = JSON.parse(JSON.stringify(j0)); D.j.shoulder_R.y += t.dy; D.j.elbow_R.a += t.da;
  const r = GA.runDrop(J, s11, "E", { tsc: GA.GATE_A_TSC, world: GA.GATE_A_WORLD, keepStates: true, seconds: 0.05 }), pen = Math.max(...r.recs.slice(1, 4).map(q => q.selfPen));
  const S = GA.poseBodies(s11, D.rot, D.j), h = chestLocal(s11, S, handOf(s11, S)), e = chestLocal(s11, S, S[bi(s11, "foreArm_R")].pos);
  console.log(`shoulder_R.y ${D.j.shoulder_R.y} elbow_R ${D.j.elbow_R.a} → first-steps self ${(pen * 1000).toFixed(1)} mm (${r.recs[1].selfPair || "-"}) · hand Δ ${(V.dist(h, h1) * 100).toFixed(1)} cm · elbow Δ ${(V.dist(e, e1) * 100).toFixed(1)} cm · E0 ${r.recs[0].E.toFixed(1)} J`);
  if (pen < 0.0005 && ++found >= 3) break; }
D.j = j0;

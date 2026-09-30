import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TESTK = process.argv[3], AT = (process.argv[4] || "").split(",").map(Number);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateb.js"); const { Q, V, deg } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const r = G.runTest(J, spec, TESTK, { keepStates: true });
const st = (j, q) => { if (j.type === "hinge") return deg(q).toFixed(1); const s = Q.swingTwist(q); return `t ${deg(s.twist).toFixed(1)} y ${deg(s.swingY).toFixed(1)} z ${deg(s.swingZ).toFixed(1)}`; };
for (const t of AT) { const rec = r.recs[Math.min(r.recs.length - 1, Math.round(t * 240))]; console.log(`— t ${rec.t.toFixed(3)} errRms ${deg(rec.errRms).toFixed(2)} contacts ${rec.cts.filter(c => c.a >= 0 && c.b >= 0).map(c => r2n(c)).join(" ")}`);
  spec.joints.forEach((j, k) => console.log(`   ${j.name.padEnd(11)} target ${st(j, rec.tgt.T[k]).padEnd(26)} actual ${st(j, rec.J[k].act).padEnd(26)} err ${deg(rec.J[k].err).toFixed(1).padStart(5)}°  τ ${rec.J[k].tauAx.toFixed(1).padStart(6)} ${rec.J[k].sat ? "SAT" : ""}`)); }
function r2n(c) { return `${spec.bodies[c.a].name}–${spec.bodies[c.b].name}(${(c.depth * 1000).toFixed(1)}mm)`; }

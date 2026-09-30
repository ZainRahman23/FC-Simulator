import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], TS = process.argv[4].split(",").map(Number);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { Q, V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, KEY, { keepStates: true });
const rv = (d) => { if (d[3] < 0) d = d.map(x => -x); return [2 * d[0], 2 * d[1], 2 * d[2]].map(x => (x * 57.3).toFixed(2)); };
for (const t of TS) { const q = r.recs.find(x => Math.abs(x.t - t) < 0.003); const pr = Q.rot(q.states[0].rot, [1, 0, 0]);
  console.log(`t ${t} pelvis roll(x-axis y) ${(Math.asin(pr[1]) * 57.3).toFixed(2)}° pelvisX ${q.states[0].pos[0].toFixed(3)}`);
  spec.joints.forEach((j, k) => { if (!/hip|knee|ankle|lumbar/.test(j.name)) return; const e = q.jt[k];
    if (j.type === "hinge") console.log(`  ${j.name.padEnd(8)} nom−act ${((e.nom - e.act) * 57.3).toFixed(2)}° g ${(e.g * 57.3).toFixed(2)} b ${(e.b * 57.3).toFixed(2)}`);
    else console.log(`  ${j.name.padEnd(8)} nom−act(cs) ${rv(Q.mul(Q.conj(e.act), e.nom))} g ${e.g.map(x => (x * 57.3).toFixed(2))} b ${e.b.map(x => (x * 57.3).toFixed(2))}`); }); }

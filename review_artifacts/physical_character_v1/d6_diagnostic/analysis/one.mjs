import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const { D6Diag } = await import(PC + "/pc_d6diag.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec), nb = spec.bodies.length;
const key = process.argv[3], plate = process.argv.includes("--plate"); const dg = new D6Diag(spec, { plate });
const r = D.runD(J, spec, key, { poses, world: plate ? { plateFrom: nb } : undefined, onStep: (x) => dg.onStep(x) }); const S = dg.summary(r);
console.log(JSON.stringify({ outcome: S.outcome, contact: S.contact, feet: S.feet, body: S.body, classes: S.classes, stepper: S.stepper, step: S.step, A: r.A.slide }, null, 0).slice(0, 2500));
const R = dg.rec, iT = R.findIndex(q => q.touch); for (let k = iT; k < Math.min(R.length, iT + 300); k += 12) { const q = R[k]; console.log(q.t.toFixed(3), q.pairs.map(p => `${p.a}->${p.b}@${p.y.toFixed(2)}`).join(",") || "-", q.B.cls, "L", q.B.feet.L.st, q.B.feet.L.load, "R", q.B.feet.R.st, q.B.feet.R.load, "trunk", q.B.trunk, "com", q.B.com.map(v => v.toFixed(2)).join(","), "stage", q.B.stage); }

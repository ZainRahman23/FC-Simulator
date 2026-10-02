import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const r = G.runG1a(J, spec, process.argv[3], { poses, keepStates: true }); const fR = spec.bodies.findIndex(b => b.name === "foot_R");
for (const q of r.recs) { if (q.t < 1.19 || q.t > 1.23) continue; for (const c of q.cts) if ((c.a === fR || c.b === fR) && c.depth > -0.002) console.log(q.t.toFixed(4), c.a, c.b, "n", c.normal.map(v => v.toFixed(2)).join(","), "depth", c.depth.toFixed(4), "pts", c.pts.map(p => p.map(v => v.toFixed(3)).join(",")).join(" | ")); }
for (const e of r.monitor.log) if (!/STEPPING · STEPPING|WAIT_VIEW/.test(e.what) && e.t > 1.1 && e.t < 2.5) console.log("MON", e.t.toFixed(3), e.what);

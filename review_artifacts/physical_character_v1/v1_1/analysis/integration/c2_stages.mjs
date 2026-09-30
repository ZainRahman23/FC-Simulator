// stage timeline + key state at each stage change for a C2 test
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], TEST = process.argv[4];
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, TEST, { keepStates: true, ctrl: process.env.CTRL ? JSON.parse(process.env.CTRL) : undefined });
let prev = null; const f = (x) => x == null ? "-" : x.toFixed(3);
for (const q of r.recs) { const k = `${q.reqId}:${q.reqStage}:${q.cls}`; if (k === prev) continue; prev = k;
  console.log(`t ${q.t.toFixed(3)} req ${q.reqId} ${String(q.reqStage).padEnd(9)} ${q.cls.padEnd(22)} L ${q.feet.L.load.toFixed(0)}N ${q.feet.L.state} R ${q.feet.R.load.toFixed(0)}N ${q.feet.R.state} ξm ${(q.xiMargin * 100).toFixed(1)} |v| ${Math.hypot(q.vcom[0], q.vcom[2]).toFixed(2)} com ${f(q.com[0])},${f(q.com[2])}`); }
console.log("seconds", r.recs[r.recs.length - 1].t.toFixed(2), "events", JSON.stringify((r.events || []).slice(-6)));

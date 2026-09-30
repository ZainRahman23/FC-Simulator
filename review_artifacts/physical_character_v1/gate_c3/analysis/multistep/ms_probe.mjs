import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js"); const { CorrectiveStepper } = await import(PC + "/pc_step.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const orig = CorrectiveStepper.prototype._choose; CorrectiveStepper.prototype._choose = function (o) { const r = orig.call(this, o); if (this.steps >= 1) {
  console.log(`  handover t ${o.t.toFixed(3)} ξ ${o.xi.map(v => v.toFixed(3))} v ${[o.vcom[0], o.vcom[2]].map(v => v.toFixed(2))} feet L ${o.feet.L.state}/${o.feet.L.load.toFixed(0)}${o.feet.L.slipping ? " SLIP" : ""} R ${o.feet.R.state}/${o.feet.R.load.toFixed(0)}${o.feet.R.slipping ? " SLIP" : ""}`);
  for (const c of this.allCands) console.log("    ", c ? JSON.stringify({ sw: c.sw, feasible: c.feasible, want: c.want && c.want.map(v => +v.toFixed(2)), target: c.target && c.target.map(v => +v.toFixed(2)), T: c.T && +c.T.toFixed(2), margin: c.margin != null ? +c.margin.toFixed(3) : null, reasons: (c.reasons || []).slice(0, 3) }) : "null (its stance foot is not touching or is slipping)"); } return r; };
for (const t of process.argv[3].split(",")) { console.log(t); C3.runC3(J, spec, t, { step: { maxSteps: 2 } }); }

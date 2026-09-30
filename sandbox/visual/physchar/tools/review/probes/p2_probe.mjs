import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js"); const { CorrectiveStepper, STEP } = await import(PC + "/pc_step.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const f = (c) => c ? JSON.stringify({ sw: c.sw, feasible: c.feasible, capture: c.capture, margin: c.margin != null ? +c.margin.toFixed(3) : null, target: c.target && c.target.map(v => +v.toFixed(2)), T: c.T && +c.T.toFixed(2), reasons: (c.reasons || []).slice(0, 2) }) : "null";
const orig = CorrectiveStepper.prototype._choose; let shown = 0;
CorrectiveStepper.prototype._choose = function (o) { const r = orig.call(this, o); if (shown++ === 0) { console.log(`  STEP_NEEDED t ${o.t.toFixed(3)} · 1-step best: ${f(r)}`);
  const w0 = o.omega0 || Math.sqrt(9.81 / Math.max(0.5, o.com[1]));
  for (const sw of ["L", "R"]) { const st = sw === "L" ? "R" : "L"; for (const alpha of STEP.nAlphas) { const c1 = this._candidate(o, sw, null, 0, alpha); if (!c1 || !c1.feasible) { console.log(`    ${sw} α ${alpha}: first step infeasible ${c1 ? JSON.stringify(c1.reasons.slice(0, 1)) : ""}`); continue; }
    const v1 = [(c1.xtd[0] - c1.ctd[0]) * w0, (c1.xtd[1] - c1.ctd[1]) * w0], o2 = this._synth(o, sw, c1.target, c1.yaw, c1.xtd, c1.ctd, v1), c2 = this._candidate(o2, st, null, 0);
    console.log(`    ${sw} α ${alpha}: step1 ${f(c1)}\n              step2 ${f(c2)}`); } } } return r; };
for (const t of process.argv[3].split(",")) { console.log(t); shown = 0; C3.runC3(J, spec, t, { step: { maxSteps: 2, nStep: true } }); }

import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const BALM = await import(PC + "/pc_balance.js"); let act = 0, cand = 0, noReg = 0, n = 0; const orig = BALM.BalanceController.prototype.update;
BALM.BalanceController.prototype.update = function (o) { n++; if (this.opts.touchSupport) for (const s of ["L", "R"]) { const f = o.feet[s]; if (f.touching && !f.loaded) { cand++; if (!(o.region && o.region.length >= 3)) noReg++; if (!f.slipping && f.points && f.points.length) act++; } } return orig.call(this, o); };
for (const key of process.argv[3].split(",")) { act = cand = noReg = n = 0; const r = G.runG1a(J, spec, key, { poses, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }); console.log(key, r.outcome, r.hash, "steps", n, "touching&!loaded", cand, "eligible", act, "no region", noReg); }

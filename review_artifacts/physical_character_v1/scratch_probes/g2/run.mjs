import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const f = (x, d = 2) => x == null ? "-" : (+x).toFixed(d);
for (const key of process.argv[3].split(",")) { const t0 = Date.now(); let r; try { r = G2.runG2a(J, spec, key, { poses, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }); } catch (e) { console.log(key, "ERROR", e.stack.split("\n").slice(0, 4).join(" | ")); continue; }
  console.log(`== ${key} (${Date.now() - t0} ms) ${r.outcome} hash ${r.hash} · steps ${r.steps.length} landed ${r.steps.filter(s => s.status === "LANDED").length} · rhythm ${JSON.stringify(r.rhythm)} · COM exc ${r.whole.comExcursionCm} drop ${r.whole.comDropCm} trunk ${r.whole.trunkMaxDeg} · ledger ${r.ledger.residualMaxNs} · sat ${r.satSteps} · cpu ${r.cpu.controller}`);
  for (const s of r.steps.slice(0, 16)) console.log(`   ${s.kind[0]}${s.sw} ${s.status} lift ${s.liftoffT} td ${s.tdT} plan ${s.plannedTdT} err ${s.footholdErrCm} slip ${s.stanceSlipCm}${s.fail ? " FAIL " + s.fail : ""}`);
  const ge = {}; for (const e of r.gaitEvents) ge[e.kind] = (ge[e.kind] || 0) + 1; console.log("   gait", JSON.stringify(ge), "monitor", JSON.stringify(r.monitor.verdicts)); }

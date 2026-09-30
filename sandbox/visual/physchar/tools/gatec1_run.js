// ═══ physchar/tools/gatec1_run.js — GATE C1 measurement run (Node, one process, sequential) ═══════════════════════════════════════════
// usage: node tools/gatec1_run.js [--tests a,b|all|group:<prefix>] [--repeat 3] [--out file.json] [--brief]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runC1, TESTS_C1 } from "../pc_gatec1.js";
import { buildPoses } from "../pc_control.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: String(arg("--calib", "V1")) }), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
const sel = String(arg("--tests", "all")), list = sel === "all" ? Object.keys(TESTS_C1) : sel.startsWith("group:") ? Object.keys(TESTS_C1).filter(k => k.startsWith(sel.slice(6))) : sel.split(",");
const rep = +arg("--repeat", 1), results = [];
for (const k of list) { const runs = []; for (let r = 0; r < rep; r++) { const x = runC1(J, spec, k, { poses }); delete x.recs; runs.push(x); }
  const s = runs[0]; s.repeatHashes = runs.map(x => x.hash); s.deterministic = runs.every(x => x.hash === s.hash); results.push(s);
  const w = s.whole, q = s.quiet, se = s.sensing;
  console.log(`${k.padEnd(14)} ${s.outcome.padEnd(9)} max ${s.maxClass.padEnd(20)} ${s.push ? `t[hip ${s.classTimes.RECOVERABLE_HIP ?? "-"} step ${s.classTimes.STEP_NEEDED ?? "-"} fall ${s.classTimes.FALLING ?? "-"} ground ${s.tGrounded ?? "-"} roll ${s.tFootRoll ?? "-"}] rec ${s.recoveryS ?? "-"}s` : ""} | COM exc ${w.comMaxExcursionCm} cm v ${w.comPeakSpeed} ξmin ${w.xiMarginMinCm} cm trunk ${w.trunkTiltMaxDeg}° spine ${w.spineBendMaxDeg}° slip ${w.footSlipMaxCm} cm${q ? ` | quiet drift ${q.comDriftCm} cm sway ${q.swayRmsMm} mm ankle ${q.ankleEffortPct}% inPlace ${q.stayedInPlace}` : ""} | root ${se.rootResidualN ? se.rootResidualN.mean + "/" + se.rootResidualN.max : "-"} N | sep ${s.stability.maxJointSepMm} lim ${s.stability.maxHardLimitDeg}° | cpu ${s.cpu.msPerFrame} (J ${s.cpu.jolt} S ${s.cpu.sensing} C ${s.cpu.controller}) | audit ${s.audit.teleports}/${s.audit.velocityWrites} fixture ${s.supportFixture} | det ${s.deterministic} ${s.hash}`);
  if (!arg("--brief", false)) { if (s.flags.length) console.log("      flags:", s.flags.join(" · ")); if (s.fallReason) console.log("      fall:", s.fallReason);
    if (s.friction.firstSlipL != null || s.friction.firstSlipR != null) console.log(`      friction: first SLIPPING L ${s.friction.firstSlipL} R ${s.friction.firstSlipR} s · degraded ${s.friction.degradedMs} ms · μ observed ${s.friction.muObserved} · CoP–COM friction limit min ${s.friction.frictionLimitCmMin} cm · slid L ${s.friction.slidCm.L} R ${s.friction.slidCm.R} cm`);
    console.log(`      sensing: lever-rule share err ${se.leverShareErr ? se.leverShareErr.mean + " (max " + se.leverShareErr.max + ", n " + se.leverShareErr.n + ")" : "-"} · grfY err ${se.grfYErrN} N · L+R vs total ${se.footSumErrN} (max ${se.footSumErrMaxN}) N · airborne foot ${se.airborneFootResidualN ? JSON.stringify(se.airborneFootResidualN) : "-"} · CoP inside ${se.copInsidePct}% · budget max ${Math.max(...s.joints.map(j => j.budgetMax))} · sat ${s.joints.filter(j => j.satMs > 0).map(j => j.joint + " " + j.satMs + "ms").join(", ")}`); } }
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ player: spec.player, tsc: "240x1", results }, null, 1));

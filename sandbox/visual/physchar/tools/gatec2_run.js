// ═══ physchar/tools/gatec2_run.js — GATE C2 measurement run (Node, one process, sequential) ═══════════════════════════════════════════
// usage: node tools/gatec2_run.js [--tests a,b|all] [--repeat 3] [--out file.json] [--brief]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runC2, TESTS_C2 } from "../pc_gatec2.js";
import { buildPoses } from "../pc_control.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: String(arg("--calib", WORKING_CALIB)) }), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
const sel = String(arg("--tests", "all")), list = sel === "all" ? Object.keys(TESTS_C2) : sel.split(","), rep = +arg("--repeat", 1), results = [];
// controller: default = the calibration's WORKING controller (pc_balance controllerProfile); --ctrl approved = the approved Gate C2 controller;
// --recal / --diag-unload = the approved controller + the historical V1.1-report options (R1·R2 / D1); --ctrl '{"k":v}' = explicit options
const ctrlArg = arg("--ctrl", null), hist = Object.assign({}, arg("--recal", false) ? { anticipateReach: true, reachToGround: true } : {}, arg("--diag-unload", false) ? { diagUnload: true } : {});
const ctrlOpt = Object.keys(hist).length ? hist : ctrlArg === "approved" ? {} : ctrlArg && ctrlArg !== true ? JSON.parse(ctrlArg) : undefined;
for (const k of list) { const runs = []; for (let r = 0; r < rep; r++) { const x = runC2(J, spec, k, { poses, ctrl: ctrlOpt }); delete x.recs; runs.push(x); }
  const s = runs[0]; s.repeatHashes = runs.map(x => x.hash); s.deterministic = runs.every(x => x.hash === s.hash); results.push(s);
  console.log(`${k.padEnd(12)} ${s.fell ? "FELL" : "upright"} final ${s.finalClass.padEnd(20)} loads ΣvsBW ${s.loads.totalVsBodyWeightN} N maxΔ/step ${s.loads.maxStepChangeN} N shareR ${JSON.stringify(s.loads.shareR)} | drift L ${s.drift.footL} R ${s.drift.footR} COM ${s.drift.com} cm slid L ${s.drift.slidL} R ${s.drift.slidR} mm | root ${s.root.residualMeanN}/${s.root.residualMaxN} N | sep ${s.stability.maxJointSepMm} limMargin ${s.stability.minJointLimitMarginDeg}° | cpu ${s.cpu.msPerFrame} | audit ${s.audit.teleports}/${s.audit.velocityWrites} fixture ${s.supportFixture} | det ${s.deterministic} ${s.hash}`);
  if (!arg("--brief", false)) for (const q of s.requests) { if (q.type === "shift") { console.log(`      #${q.id} shift w=${q.w} ${q.status}`); continue; }
    console.log(`      #${q.id} ${q.type} ${q.foot} ${q.label || ""} → ${q.status}${q.why ? " (" + q.why + ")" : ""}${q.correctedCm ? ` · projected ${q.correctedCm} cm [${q.projectionReasons.join("; ")}]` : ""}`);
    if (q.liftoff) console.log(`         liftoff: swing load ${q.liftoff.swingLoadN} N (${q.liftoff.swingLoadPctBW}% BW) · stance ξ margin ${q.liftoff.stanceXiMarginCm} cm · COM margin ${q.liftoff.stanceComMarginCm} cm · |v| ${q.liftoff.vcom} · transfer ${q.liftoff.transferS} s · physical liftoff ${q.liftoff.physicalT}`);
    if (q.touchdown) console.log(`         touchdown: single support ${q.touchdown.singleSupportS} s · landing error ${q.touchdown.landingErrorCm} cm · v ${q.touchdown.verticalVelocity}/${q.touchdown.horizontalVelocity} m/s · early ${q.touchdown.early} (u ${q.touchdown.uAt}) · ankle y planned ${q.touchdown.plannedAnkleY} actual ${q.touchdown.actualAnkleY} · tilt ${q.touchdown.footTiltDeg}°`);
    if (q.accepted) console.log(`         accepted: ${q.accepted.fromTouchdownS} s after touchdown · load ${q.accepted.loadN} N · final error ${q.accepted.finalErrorCm} cm · moved after touchdown ${q.accepted.driftAfterTouchdownCm} cm`);
    if (q.blocked) console.log(`         blocked: ${JSON.stringify(q.blocked)}`);
    if (q.metrics) console.log(`         metrics: sole clearance min ${q.metrics.minSoleClearanceCm} / peak ${q.metrics.peakSoleClearanceCm} cm · to stance leg ${q.metrics.minClearanceToStanceLegCm} cm · swing pen ${q.metrics.peakSwingFootPenetrationMm} mm · stance slid ${q.metrics.stanceFootSlidMm} mm · leg self-contact ${q.metrics.legSelfContactMm} mm · limit margin ${q.metrics.jointLimitMarginDeg}° (${q.metrics.jointLimitMarginJoint}) · root max ${q.metrics.rootResidualMaxN} N · class ${q.metrics.classMax} · sat ${JSON.stringify(q.metrics.saturationMs)}`); } }
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ player: spec.player, tsc: "240x1", results }, null, 1));

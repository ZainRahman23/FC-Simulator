// ═══ physchar/tools/gateb_run.js — GATE B measurement run (Node, one process, sequential) ═══════════════════════════════════════════
// usage: node tools/gateb_run.js [--tests A,B,...|all] [--tsc 240x1|120x1|60x1] [--repeat 3] [--mesh] [--out file.json] [--poses] [--profile] [--brief]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runTest, TESTS } from "../pc_gateb.js";
import { buildPoses, motorProfile, supportSettings } from "../pc_control.js";
import { boneBodyMap, referencedVertices } from "../pc_fit.js";
import { deg } from "../pc_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: String(arg("--calib", "V1")) }), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
if (arg("--poses", false)) for (const [k, p] of Object.entries(poses)) console.log(`pose ${k.padEnd(10)} stance ${p.stance.padEnd(4)} root [${p.rootPos.map(v => v.toFixed(3))}]  COM−support (x, z) [${p.comOffset.map(v => (v * 1000).toFixed(1))}] mm  stance hip ${JSON.stringify(p.params["hip_" + (p.stance === "both" ? "L" : p.stance)])}`);
if (arg("--profile", false)) { for (const m of motorProfile(spec, poses.N.S, "candidate")) console.log(`motor ${m.joint.padEnd(11)} ${m.region.padEnd(9)} tau ${m.tau.toFixed(0).padStart(4)} N·m  kp ${m.kp.toFixed(0).padStart(5)} N·m/rad  kd ${m.kd.toFixed(1).padStart(6)} N·m·s/rad  I_load ${m.Iload.toFixed(3)} kg·m²`);
  console.log("support candidate", JSON.stringify(supportSettings(spec, poses.N.S, "candidate"))); }
const list = arg("--tests", "") === "all" ? Object.keys(TESTS) : String(arg("--tests", "")).split(",").filter(Boolean), rep = +arg("--repeat", 1), withMesh = !!arg("--mesh", false);
const meshOpts = withMesh ? { mesh, rig, refList: referencedVertices(mesh), map: boneBodyMap(rig) } : {};
const results = [];
for (const k of list) {
  const runs = []; for (let r = 0; r < rep; r++) runs.push(runTest(J, spec, k, Object.assign({ poses, tsc: arg("--tsc", "240x1") }, r === 0 ? meshOpts : {})));
  const s = runs[0]; s.repeatHashes = runs.map(x => x.hash); s.deterministic = runs.every(x => x.hash === s.hash); delete s.recs; runs.forEach(x => delete x.recs); results.push(s);
  const b = s.block, d = s.disturbance, su = s.supportUse;
  console.log(`${k.padEnd(14)} err rms ${String(s.errRmsDeg).padStart(6)}° peak ${String(s.errPeakJointDeg).padStart(6)}° (${s.errPeakJoint.padEnd(10)}) sat ${String(s.satMsTotal).padStart(5)} ms | joint ${s.maxAnchorErrMm} mm lim ${s.maxHardLimitDeg}° soft ${s.maxSoftOvershootDeg}° turf ${s.maxGroundPenMm}/${s.restGroundPenMm} self ${s.maxSelfPenMm} pop ${s.maxPopMm} | KE max ${s.keMaxJ} end ${s.keEndJ} | pelvis end ${s.pelvisEnd.posMm} mm ${s.pelvisEnd.angDeg}°${s.fell ? " FELL" : ""} | ${su ? `sup F̄ ${su.meanForceN} N pk ${su.peakForceN} lift ${su.meanLiftPctBW}% T̄ ${su.meanTorqueNm} pk ${su.peakTorqueNm} sat ${su.satMs} ms` : "no support"} | cpu ${s.cpuMsPerFrame} ms/frame | audit ${s.audit.teleports}/${s.audit.velocityWrites} nan ${s.nan} | det ${s.deterministic} ${s.hash}`);
  if (arg("--brief", false)) continue;
  console.log("      holds:", s.holds.map(h => `[${h.t0}-${h.t1}] err ${h.errRmsDeg}° ω ${h.bodyAngVelRmsDegS}°/s KE ${h.keMaxJ} sat ${h.satSteps}`).join("  "));
  console.log("      joints:", s.joints.filter(j => j.peakDeg > 3 || j.satMs > 0).map(j => `${j.joint} rms ${j.rmsDeg} pk ${j.peakDeg}@${j.peakAt} τ ${j.peakTauNm}/${j.tauMax} sat ${j.satMs}ms`).join(" · "));
  if (b) { console.log(`      block: first contact ${b.firstContactT}s (${b.firstContactBody}) max pen ${b.maxPenetrationMm} mm (listener ${b.maxListenerDepthMm}) max F ${b.maxForceN} N obstacle moved ${b.obstacleMaxDisplacementMm} mm removed ${b.removedT}`);
    if (b.whileBlocked) console.log(`      while blocked [${b.whileBlocked.t0}-${b.whileBlocked.t1}]: hip err ${b.whileBlocked.hipErrDeg}° τ ${b.whileBlocked.hipTauNm} N·m sat ${b.whileBlocked.hipSatPct}% F ${b.whileBlocked.contactForceN} N pen ${b.whileBlocked.penetrationMm} mm support ${b.whileBlocked.supportForceN} N; others: ${b.whileBlocked.otherJointsErr.map(o => o.joint + " " + o.deg).join(", ")}`);
    if (b.afterRemoval) console.log(`      after removal: hip err ${b.afterRemoval.hipErrAtRemovalDeg}° → within 5° in ${b.afterRemoval.timeToWithin5degS}s, end ${b.afterRemoval.hipErrEndDeg}°`);
    for (const c of b.contactSteps) console.log(`        n ${c.n} t ${c.t} gap ${c.gapMm} mm depth ${c.depthMm} approach ${c.approachMs} m/s F ${c.forceN} N hip err ${c.hipErrDeg}° τ ${c.hipTauNm}`); }
  if (d) console.log(`      disturbance ${d.impulseNs} N·s @${d.at}: baseline ${d.baselineRmsDeg}° peak ${d.peakRmsDeg}° (+${d.peakAt}s) recovered in ${d.recoveryS}s (thr ${d.thresholdDeg}°) worst ${d.worstJoints.map(o => o.joint + " " + o.deg).join(", ")} pelvis ${d.pelvisMaxDisplacementMm} mm support pk ${d.supportPeakN} N`);
}
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ player: spec.player, tsc: "240x1", poses: Object.fromEntries(Object.entries(poses).map(([k, p]) => [k, { stance: p.stance, rootPos: p.rootPos, comOffset: p.comOffset, params: p.params }])), results }, null, 1));

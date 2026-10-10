// RH1 spec check (RH1_PREREG.md §1.3 / §1.4, frozen 50eae23a): generator neutrality (the 20 existing spec hashes), the record values against
// rig.json, and the hinge-only invariants of PI1-runner-vinicius-RH1 against the PI-1 runner (R0), bit for bit or ≤ 1e-12.
// usage (worktree root): node sandbox/visual/physchar2/tools/rh1_spec_check.mjs <baseline hashes json> [--json out]
import fs from "fs";
import { generateSpec, specHash } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { setAnkleNeutralKOverride } from "../spec/v2_joints.js";
import { PI1_RUNNER, PI1_RUNNER_F1, pi1RunnerSpec, pi1RunnerF1Spec } from "../spec/v2_pi1_runner.js"; import { PI1_RUNNER_RH1, pi1RunnerRH1Spec, RIG_RECORD } from "../spec/v2_pi1_runner_rh.js";
import { wholeBody } from "../spec/v2_body.js"; import { posedBodies } from "../spec/v2_pose.js"; import { V, Q } from "../core/v2_math.js";
const rows = [], row = (id, name, pass, value) => { rows.push({ id, name, pass: !!pass, value }); console.log(`${pass ? "PASS" : "FAIL"} ${id.padEnd(5)} ${name}: ${value}`); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b), maxAbs = (a, b) => { let m = 0; const walk = (x, y) => { if (typeof x === "number") m = Math.max(m, Math.abs(x - y)); else if (Array.isArray(x)) x.forEach((v, i) => walk(v, y[i])); }; walk(a, b); return m; };
// ── 1. generator neutrality ──
const base = JSON.parse(fs.readFileSync(process.argv[2])), now = {}; setAnkleNeutralKOverride(null);
for (const h of VARIATION_SET) now[h.id] = specHash(generateSpec(h)); now["PI1-runner"] = specHash(generateSpec(PI1_RUNNER)); now["PI1-runner-F1"] = specHash(generateSpec(PI1_RUNNER_F1));
setAnkleNeutralKOverride(0.13); for (const h of VARIATION_SET) now[h.id + "@K0.13"] = specHash(generateSpec(h)); now["PI1-runner@K0.13"] = specHash(pi1RunnerSpec()); now["PI1-runner-F1@K0.13"] = specHash(pi1RunnerF1Spec());
const diff = Object.keys(base).filter(k => base[k] !== now[k]); row("N1", "the 20 existing spec hashes unchanged", Object.keys(base).length === 20 && diff.length === 0, diff.length ? "DIFFER: " + diff.join(", ") : "20 / 20 identical");
// ── 2. record values ──
const rig = JSON.parse(fs.readFileSync("assets/characters/outfield/vinicius/rig.json")), rb = Object.fromEntries(rig.bones.map(b => [b.name, b]));
row("R1", "RH1 record values = rig.json bindOrigin (exact)", Object.entries(RIG_RECORD.bindOrigin).every(([n, p]) => same(p, rb[n].bindOrigin)), Object.keys(RIG_RECORD.bindOrigin).join(", "));
// ── 3. invariants RH1 vs R0 (both at the accepted ankle K 0.13) ──
const R0 = pi1RunnerSpec(), RH = pi1RunnerRH1Spec(), hR = specHash(RH), hR2 = specHash(pi1RunnerRH1Spec()); row("D1", "RH1 generation deterministic", hR === hR2, `${hR} / ${hR2}`);
const MOVED_J = ["lumbar", "thoracic", "elbow_L", "elbow_R"], MOVED_B = ["abdomen", "thorax", "forearm_L", "forearm_R"], ARMS = ["upperArm_L", "upperArm_R"];
const J0 = Object.fromEntries(R0.joints.map(j => [j.name, j])), J1 = Object.fromEntries(RH.joints.map(j => [j.name, j]));
row("H1", "moved joint centres = RH1_PREREG §1.2", maxAbs(J1.lumbar.at, PI1_RUNNER_RH1.hinges.lumbar) === 0 && maxAbs(J1.thoracic.at, PI1_RUNNER_RH1.hinges.thoracic) === 0 && maxAbs(J1.elbow_L.at, PI1_RUNNER_RH1.hinges.elbow.L) === 0 && maxAbs(J1.elbow_R.at, PI1_RUNNER_RH1.hinges.elbow.R) === 0,
  MOVED_J.map(n => `${n} (${J1[n].at.map(x => x.toFixed(6)).join(", ")}) Δ ${(V.dist(J1[n].at, J0[n].at) * 1000).toFixed(3)} mm`).join(" · "));
const jFieldsOk = R0.joints.every(j => { const k = J1[j.name]; const a = { ...j }, b = { ...k }; if (MOVED_J.includes(j.name)) { delete a.at; delete b.at; } return same(a, b); });
row("H2", "every joint identical except the moved centres (frames A / Rz / Cm / F1 / F2 / axes, ranges, passive, capacities, locked axes)", jFieldsOk, jFieldsOk ? "identical" : "differs");
let massOk = true, comW = 0, inW = 0, colW = 0, otherOk = true;
for (let i = 0; i < R0.bodies.length; i++) { const a = R0.bodies[i], b = RH.bodies[i];
  massOk = massOk && a.mass === b.mass && a.massBody === b.massBody && a.massEquip === b.massEquip;
  comW = Math.max(comW, maxAbs(V.add(a.origin, a.comLocal), V.add(b.origin, b.comLocal)), maxAbs(a.com, b.com), maxAbs(V.add(a.origin, a.comBodyLocal), V.add(b.origin, b.comBodyLocal)));
  inW = Math.max(inW, maxAbs(a.inertia, b.inertia), maxAbs(a.inertiaBody, b.inertiaBody));
  a.shapes.forEach((s, k) => { const t = b.shapes[k]; colW = Math.max(colW, maxAbs(V.add(a.origin, s.pos), V.add(b.origin, t.pos))); const x = { ...s }, y = { ...t }; delete x.pos; delete y.pos; otherOk = otherOk && same(x, y); });
  if (!MOVED_B.includes(a.name) && !ARMS.includes(a.name)) otherOk = otherOk && same(a, b);
  if (ARMS.includes(a.name)) { const x = { ...a }, y = { ...b }; delete x.distal; delete y.distal; otherOk = otherOk && same(x, y); } }
row("H3", "masses identical (body, equipment)", massOk, massOk ? "14 / 14 bit-identical" : "differ");
row("H4", "world COM at the canonical pose identical", comW <= 1e-12, `max ${comW.toExponential(2)} m`);
row("H5", "inertia tensors (canonical frame, about the COM) identical", inW === 0, `max ${inW.toExponential(2)}`);
row("H6", "collider world placement identical; collider shapes otherwise identical; unmoved bodies identical", colW <= 1e-12 && otherOk, `max ${colW.toExponential(2)} m; other fields ${otherOk ? "identical" : "differ"}`);
const t0 = wholeBody(R0.bodies), t1 = wholeBody(RH.bodies); row("H7", "whole-body mass / COM / inertia about the COM identical (recomputed)", Math.abs(t0.M - t1.M) === 0 && maxAbs(t0.com, t1.com) <= 1e-12 && maxAbs(t0.I, t1.I) <= 1e-12, `ΔCOM ${maxAbs(t0.com, t1.com).toExponential(2)} m, ΔI ${maxAbs(t0.I, t1.I).toExponential(2)}`);
const lower = ["pelvis", "thigh_L", "shank_L", "foot_L", "thigh_R", "shank_R", "foot_R"], lowJ = ["hip_L", "knee_L", "ankle_L", "hip_R", "knee_R", "ankle_R", "neck", "shoulder_L", "shoulder_R"];
row("H8", "lower body (pelvis, thighs, shanks, feet) and hip / knee / ankle / neck / shoulder joints byte-identical", lower.every(n => same(R0.bodies.find(b => b.name === n), RH.bodies.find(b => b.name === n))) && lowJ.every(n => same(J0[n], J1[n])), "identical");
row("H9", "disabled pairs, landmarks, passive law, contact, equipment identical", same(R0.disabledPairs, RH.disabledPairs) && same(R0.landmarks, RH.landmarks) && same(R0.passive, RH.passive) && same(R0.contact, RH.contact) && same(R0.equipment, RH.equipment), "identical");
// bind pose (anatomical zero): body COMs coincide (straight arms, upright trunk)
const Z0a = posedBodies(R0, {}), Z0b = posedBodies(RH, {}); let zc = 0, zr = 0; for (let i = 0; i < R0.bodies.length; i++) { zc = Math.max(zc, V.dist(V.add(Z0a[i].pos, Q.rot(Z0a[i].rot, R0.bodies[i].comLocal)), V.add(Z0b[i].pos, Q.rot(Z0b[i].rot, RH.bodies[i].comLocal)))); zr = Math.max(zr, maxAbs(Z0a[i].rot, Z0b[i].rot)); }
row("H10", "bind pose (anatomical zero): every body COM and rotation identical", zc <= 1e-12 && zr === 0, `ΔCOM ${zc.toExponential(2)} m, Δrot ${zr}`);
// reported: arm segment lengths, static gravity moments (canonical pose) about the moved trunk joints
const B1 = Object.fromEntries(RH.bodies.map(b => [b.name, b])), up = ["abdomen", "thorax", "head", "upperArm_L", "forearm_L", "upperArm_R", "forearm_R"], mom = (names, at) => names.reduce((s, n) => s + B1[n].mass * 9.81 * (B1[n].com[2] - at[2]), 0);
const rep = { upperArm: V.dist(J1.shoulder_L.at, J1.elbow_L.at), forearmToWrist: V.dist(J1.elbow_L.at, B1.forearm_L.distal), staticMomentNm: { lumbar: [mom(up, J0.lumbar.at), mom(up, J1.lumbar.at)], thoracic: [mom(up.slice(1), J0.thoracic.at), mom(up.slice(1), J1.thoracic.at)] }, specHash: hR };
console.log("report:", JSON.stringify(rep));
const pass = rows.every(r => r.pass); console.log(`${rows.filter(r => r.pass).length}/${rows.length} PASS`);
const j = process.argv.indexOf("--json"); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify({ rows, report: rep, pass }, null, 1)); process.exit(pass ? 0 : 1);

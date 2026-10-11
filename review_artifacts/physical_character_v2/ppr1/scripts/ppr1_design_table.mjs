// PPR-1 design calculation (no simulation step; no controller): the per-axis intrinsic parameters that the preregistered B formula gives at the
// PVP-1A-DX entry, computed from the constructed plant's own data (A's statics bias = B's tonic drive at entry, V2's isometric capacities and
// eccentric plateau per direction, the child-subtree inertia about each joint axis). Writes the table the preregistration freezes as the
// expected entry values (the B law recomputes them at runtime from the same formula and must reproduce them).
//   tonic activation   a± = max(±τ_drive, 0) / capIso±(θ) + a_cc                      (no 25 % margin; a_cc = antagonist / resting tone)
//   active torque      τ_act± = a± · capIso±(θ)
//   intrinsic K        K_i = Σ± (e± − 1) · τ_act± / θ_y,family     (elastic up to V2's own eccentric plateau after a joint rotation θ_y)
//   intrinsic D        D_i = 2 · ζ_i · √(K_i · I_axis)               (I_axis: child subtree about the joint axis)
// θ_y,ankle is CALIBRATED here: Σ (ankle_L, ankle_R) sagittal K_i = 0.78 · mgh at the entry (mean of 0.64–0.94 mgh, stance, < 1°).
// usage: V2_KNEE_MODEL=v2k node ppr1_design_table.mjs --fixture <PVP1A_FIXTURE.json> --out <json>
import fs from "fs";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const { PprPlant } = await import(new URL("./ppr1_plant.mjs", import.meta.url).href), { Jolt } = await import(new URL("./ppr1_run.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const DESIGN = Object.freeze({ aCC: 0.02, zeta: 0.2, ankleTargetMgh: 0.78, thetaYdeg: { knee: 1.0, hip: 1.0, lumbar: 3.0, thoracic: 3.0, neck: 2.0, shoulder: 2.2, elbow: 2.0 } });
const FIX = JSON.parse(fs.readFileSync(arg("fixture"))), G = 9.81, D2R = Math.PI / 180;
const sim = new PprPlant(Jolt, { runner: FIX.write.runner, tackler: FIX.write.tackler }, FIX.flags, "N2", { O: FIX.O, solo: "runner" });
const c = sim.runner, spec = c.spec, B = spec.bodies, st = c.st, ev = c.up.ev, M = c.M, P = c.P;
const kids = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) kids[b.parentIndex].push(i); }); const sub = (i) => [i, ...kids[i].flatMap(sub)];
const Iaxis = (ids, o, u) => ids.reduce((s, i) => { const R = st[i].rot, Il = B[i].inertia, ul = Q.rot(Q.conj(R), u), Iu = [0, 1, 2].map(r => Il[r][0] * ul[0] + Il[r][1] * ul[1] + Il[r][2] * ul[2]), d = V.sub(st[i].com, o);
  return s + V.dot(ul, Iu) + B[i].mass * (V.dot(d, d) - V.dot(d, u) ** 2); }, 0);
const com = V.sc(st.reduce((s, b, i) => V.add(s, V.sc(b.com, B[i].mass)), [0, 0, 0]), 1 / M), jointAt = (k) => { const j = spec.joints[k]; return V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin))); };
const ankY = (jointAt(spec.joints.findIndex(j => j.name === "ankle_L"))[1] + jointAt(spec.joints.findIndex(j => j.name === "ankle_R"))[1]) / 2, mgh = M * G * (com[1] - ankY);
const rows = []; for (const d of P.jd) { const k = d.k, j = spec.joints[k], T = c.tone[k], R2F2 = Q.mul(st[d.child].rot, d.F2), at = jointAt(k), fam = j.name.replace(/_[LR]$/, "");
  const kneeK = c.act.kneeOf[k], kneeDeg = kneeK != null ? P.anat(P.jd[kneeK], ev.qs[kneeK], "flex") : null;
  [0, 1, 2].forEach(i => { const x = c.act.ax[k][i]; if (!x || !T.K) return; const anat = P.anat(d, ev.qs[k], x.key), capP = c.act.capFull(x, 1, anat, 0, kneeDeg), capM = c.act.capFull(x, -1, anat, 0, kneeDeg), tau = T.bias[i];
    const aP = Math.min(1, Math.max(tau, 0) / capP + DESIGN.aCC), aM = Math.min(1, Math.max(-tau, 0) / capM + DESIGN.aCC), u = Q.rot(R2F2, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i]);
    rows.push({ joint: j.name, fam, axis: x.key, k, i, tauDrive: tau, capIsoP: capP, capIsoM: capM, aP, aM, tauActP: aP * capP, tauActM: aM * capM, eP: x.plus.cap.e, eM: x.minus.cap.e, I: Iaxis(sub(j.childIndex), at, u), KA: T.K[i], DA: T.D[i] }); }); }
const sumA = (th) => rows.filter(r => r.fam === "ankle" && r.axis === "df").reduce((s, r) => s + ((r.eP - 1) * r.tauActP + (r.eM - 1) * r.tauActM) / th, 0);
const thAnkle = rows.filter(r => r.fam === "ankle" && r.axis === "df").reduce((s, r) => s + (r.eP - 1) * r.tauActP + (r.eM - 1) * r.tauActM, 0) / (DESIGN.ankleTargetMgh * mgh);
const thOf = (fam) => (fam === "ankle" ? thAnkle : DESIGN.thetaYdeg[fam] * D2R);
for (const r of rows) { r.thetaYdeg = thOf(r.fam) / D2R; r.Ki = ((r.eP - 1) * r.tauActP + (r.eM - 1) * r.tauActM) / thOf(r.fam); r.Di = 2 * DESIGN.zeta * Math.sqrt(r.Ki * r.I); r.KioverKA = r.Ki / r.KA; r.yieldUpNm = (r.eP - 1) * r.tauActP; r.yieldDownNm = (r.eM - 1) * r.tauActM; }
const out = { tool: "ppr1_design_table.mjs", design: DESIGN, entry: { M, mgh, comHeightAboveAnkles: com[1] - ankY }, thetaYankleDeg: thAnkle / D2R, ankleSagittalSumKi: sumA(thAnkle), ankleSagittalSumKiOverMgh: sumA(thAnkle) / mgh, rows };
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); sim.destroy();
console.log(`θ_y ankle (calibrated) ${out.thetaYankleDeg.toFixed(3)}° · Σ ankle sagittal K_i ${out.ankleSagittalSumKi.toFixed(0)} N·m/rad = ${out.ankleSagittalSumKiOverMgh.toFixed(3)} mgh`);
for (const r of rows.filter(r => /_R$|lumbar|thoracic|neck/.test(r.joint))) console.log(`  ${(r.joint + "." + r.axis).padEnd(18)} τ_drive ${r.tauDrive.toFixed(1).padStart(6)} a+ ${r.aP.toFixed(3)} a− ${r.aM.toFixed(3)} · K_i ${r.Ki.toFixed(0).padStart(4)} (A ${r.KA.toFixed(0)}, ×${r.KioverKA.toFixed(2)}) · θ_y ${r.thetaYdeg.toFixed(2)}° · yield +${r.yieldUpNm.toFixed(1)}/−${r.yieldDownNm.toFixed(1)} N·m · D_i ${r.Di.toFixed(2)} (A ${r.DA.toFixed(1)}) · I ${r.I.toFixed(3)}`);

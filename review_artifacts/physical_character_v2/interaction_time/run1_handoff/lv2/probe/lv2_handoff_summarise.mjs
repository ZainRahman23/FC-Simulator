// Summarise lv2_handoff_probe.mjs output into the tables of RUN1_TO_V2_HANDOFF_CONTRACT_DRAFT_R2.md §4 (read-only; text out).
// usage: node lv2_handoff_summarise.mjs <probe.json> > summary.txt
import fs from "fs";
const o = JSON.parse(fs.readFileSync(process.argv[2])), f = (x, n = 2) => (x == null ? "—" : Number.isFinite(x) ? x.toFixed(n) : String(x)), pc = (x) => (x == null ? "—" : (100 * x).toFixed(0) + " %");
const L = [], P = (s) => L.push(s);
P(`source: ${o.provenance.contract} · ${o.provenance.implementation} · params ${o.provenance.paramHash} · rig ${o.provenance.rigId} bind ${o.provenance.bindHash} · rig bind rotations identity (max dev ${o.bindRotDev})`);
P(`V2 joint centre vs rig joint at bind (aligned at the hip midpoint): ` + Object.entries(o.bindGap).map(([k, v]) => `${k}↔${v.rigJoint} ${f(v.gapMm, 1)} mm`).join(" · "));
for (const [v, S] of Object.entries(o.speeds)) {
  const A = S.aggregate.classes, all = A.all;
  P(`\n=== ${v} m/s (stride ${f(S.strideTime * 1000, 0)} ms; ${all.samples} samples, ${all.velocitySamples} with velocities; RF-1 inconsistent across ±0.1 ms: ${all.rf1Inconsistent}) ===`);
  P(`class | share | C1 mapping only | C2 +pivot | C3 +pivot +P=M·v_auth | C4 draft literal (+L_yaw=I·ψ̇) | geometric fails | kinematic fails (mapped field)`);
  for (const [c, b] of Object.entries(A)) P(`${c} | ${pc(b.share)} | ${pc(b.cleanShareWithoutHgaAndVd)} | ${pc(b.cleanSharePivotOnly)} | ${pc(b.cleanShareR2)} | ${pc(b.cleanShare)} | ${JSON.stringify(b.geomFailCounts)} | ${JSON.stringify(b.kinContFailCounts)}`);
  P(`pose (mapped body; p50 / max): ` + ["trunk", "head", "shoulder", "elbow", "wrist", "handTip", "leg", "ankle", "mtp", "toeTip"].map(g => `${g} ${f(all.carryPosMm[g].p50, 1)}/${f(all.carryPosMm[g].max, 1)} mm`).join(" · "));
  P(`velocity, mapped field vs LV2 (p50 / max, m/s): ` + ["trunk", "head", "shoulder", "elbow", "handTip", "leg", "ankle", "toeTip"].map(g => `${g} ${f(all.carryVelMapped[g].p50)}/${f(all.carryVelMapped[g].max)}`).join(" · "));
  P(`P-14 (non-foot, ≤ 0.25 m/s) p50/p90/max ${f(all.P14.p50)}/${f(all.P14.p90)}/${f(all.P14.max)} · P-15 (≤ 2 rad/s) max ${f(all.P15.max)} · P-16 (≤ 0.05 m/s) p50/max ${f(all.P16.p50, 3)}/${f(all.P16.max, 3)} · P-17 dL / limit p50/max ${f(all.P17overLim.p50)}/${f(all.P17overLim.max)} · frozen 60 Hz P-14 max ${f(all.P14_60.max)}`);
  P(`shoulder hard-ROM clamp (P-12): ${JSON.stringify(all.clampJoints)} · rig clavicle local rotation p50/max ${f(all.rigLocalDeg.clavicle_L.p50, 1)}/${f(all.rigLocalDeg.clavicle_L.max, 1)}°`);
  P(`HG-A v2 |s| (≤ 0.180) p50/p90/max ${f(all.hgaS.p50, 3)}/${f(all.hgaS.p90, 3)}/${f(all.hgaS.max, 3)}, pass ${pc(all.hgaPassShare)}`);
  for (const n of ["draft", "pivotP", "pivotOnly", "POnly", "LyawOnly"]) { const d = all.vd[n]; P(`V-d ${n.padEnd(9)}: max body Δv p50/max ${f(d.maxDvBody.p50)}/${f(d.maxDvBody.max)} m/s · Δω p50/max ${f(d.maxDwBody.p50)}/${f(d.maxDwBody.max)} rad/s · joint vs LV2 (non-foot) p50/max ${f(d.jointVsLV2NonFoot.p50)}/${f(d.jointVsLV2NonFoot.max)} · KE change p50/max ${f(d.keDistJ.p50)}/${f(d.keDistJ.max)} J · fails ${JSON.stringify(all.vdFailCounts[n])}`); }
  for (const [c, b] of Object.entries(A)) { if (!c.startsWith("stance")) continue;
    P(`${c}: F0 boot lowest (following the LV2 foot) p50 ${f(b.F0lowestMm.p50, 1)} [${f(b.F0lowestMm.min, 1)} … ${f(b.F0lowestMm.max, 1)}] mm · RF-1 pitch |p50|/max ${f(b.RF1pitchDeg.p50, 1)}/${f(b.RF1pitchDeg.max, 1)}°${b.RF1pitchDeg.nonFinite ? ` (no RF-1 solution ${b.RF1pitchDeg.nonFinite})` : ""} · E-2 whole-body shift [${f(b.E2shiftMm.min, 1)} … ${f(b.E2shiftMm.max, 1)}] mm · V2 contact point speed p50/max ${f(b.v2ContactPtMs.p50)}/${f(b.v2ContactPtMs.max)} m/s · V2 contact ↔ LV2 pivot p50 ${f(b.v2ContactVsLv2PivotMm.p50, 0)} mm`); }
  const fl = A.flight; if (fl) P(`source physics (V2 mass model on the mapped field), flight: |a_COM,h| p50/max ${f(fl.phys.aComH_BW.p50)}/${f(fl.phys.aComH_BW.max)} BW · (a_COM,y + g)/g [${f(fl.phys.aComYplusG_BW.min)} … ${f(fl.phys.aComYplusG_BW.max)}] (0 = ballistic) · |dL/dt| p50/max ${f(fl.phys.torqueNm.p50, 0)}/${f(fl.phys.torqueNm.max, 0)} N·m · LV2 diagnostic COM: |a_h| p50/max ${f(fl.phys.lv2DiagAComH_BW.p50)}/${f(fl.phys.lv2DiagAComH_BW.max)} BW, (a_y+g)/g [${f(fl.phys.lv2DiagAComYplusG_BW.min)} … ${f(fl.phys.lv2DiagAComYplusG_BW.max)}]`);
}
console.log(L.join("\n"));

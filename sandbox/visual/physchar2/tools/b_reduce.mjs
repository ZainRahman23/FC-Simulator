// ═══ physchar2/tools/b_reduce.mjs — INVESTIGATION B: progressive reduction of the reproducer from the EXACT saved pre-event state ═════════
// Runs the G1 scenario to the last healthy tick (event − 1), saves the full Jolt state, then for each reduction level restores that state,
// removes every body (and the constraints touching it) outside the kept set, and takes ONE step. Reports the foot's position-level jump,
// the energy change of the kept bodies and every turf manifold of the foot (normal, turf-side point heights).
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/b_reduce.mjs --human=V1-matched --key=singleLeg --event=923 [--hz=240 --foot=foot_L --out=<json>]
import fs from "fs";
import { jolt, specOf, makeSim, runTo, save, restore, bodyEnergy, V, Q, D, JS } from "./b_lib.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
const human = arg("human", "V1-matched"), key = arg("key", "singleLeg"), hz = +arg("hz", 240), ev = +arg("event"), foot = arg("foot", "foot_L"), out = arg("out", null);
const side = foot.slice(-1), J = await jolt(), spec = specOf(human), names = spec.bodies.map(b => b.name), fi = names.indexOf(foot);
const LEVELS = [
  { id: "R0 full body", keep: names },
  { id: "R1 leg + pelvis", keep: ["pelvis", "thigh_" + side, "shank_" + side, foot] },
  { id: "R2 leg only", keep: ["thigh_" + side, "shank_" + side, foot] },
  { id: "R3 shank + foot + ankle", keep: ["shank_" + side, foot] },
  { id: "R4 foot alone (no joint)", keep: [foot] },
];
const res = [];
const turfManifolds = (sim) => (sim.lastContacts || []).filter(c => (c.a === -1 && c.b === fi) || (c.b === -1 && c.a === fi)).map(c => { const turfFirst = c.a === -1, n = turfFirst ? c.normal : V.sc(c.normal, -1), pT = turfFirst ? c.pts : c.pts2;
  return { piece: turfFirst ? c.sb : c.sa, normalY: +n[1].toFixed(4), depthMm: +(c.depth * 1000).toFixed(3), turfPointYmm: pT.map(p => +(p[1] * 1000).toFixed(2)) }; });
for (const L of LEVELS) {
  const s = makeSim(J, spec, key, { hz }); runTo(s, ev - 1);   // a fresh deterministic run to the last healthy tick per level (no restore across topology edits)
  const keep = new Set(L.keep.map(n => names.indexOf(n))), removedC = [], removedB = [];
  s.w.cons.forEach(({ j, c }, k) => { if (!keep.has(j.parentIndex) || !keep.has(j.childIndex)) { c.SetEnabled(false); removedC.push(k); } });   // disabled, not removed (Jolt frees a removed constraint the passive layer still addresses)
  names.forEach((n, i) => { if (!keep.has(i)) { s.w.bi.RemoveBody(s.w.bodies[i].GetID()); removedB.push(i); } });
  const E = (st) => [...keep].reduce((a, i) => { const e = bodyEnergy(spec, st[i], i, s.g); return a + e.kt + e.kr + e.pe; }, 0);
  const st0 = s.st, E0 = E(st0); s.up = s.P.compute(s.st, s.dt); s.up.joints = s.up.joints.filter(p => !removedC.includes(p.k));   // no passive write may activate a removed body
  s.tick(); const st1 = s.st, E1 = E(st1);
  const f0 = st0[fi], f1 = st1[fi], dq = Q.angle(Q.mul(f1.rot, Q.conj(f0.rot))) * D;
  const k = spec.joints.findIndex(j => j.name === "ankle_" + side), q0 = s.P.qcs(s.P.jd[k], st0.map(x => x.rot)), q1 = s.P.qcs(s.P.jd[k], st1.map(x => x.rot));
  const r = { level: L.id, kept: L.keep.length, footDxMm: +(V.dist(f1.com, f0.com) * 1000).toFixed(2), footRotDeg: +dq.toFixed(2), footVafter: +V.len(f1.v).toFixed(4), footWafter: +V.len(f1.w).toFixed(4),
    dKEplusPE_kept: +(E1 - E0).toFixed(3), ankleInvBefore: +(s.P.anat(s.P.jd[k], q0, "inv")).toFixed(2), ankleInvAfter: +(s.P.anat(s.P.jd[k], q1, "inv")).toFixed(2), turf: turfManifolds(s) };
  r.flipped = r.turf.filter(m => m.normalY < 0).map(m => m.piece); res.push(r);
  console.log(JSON.stringify(r)); s.destroy();
}
if (out) fs.writeFileSync(out, JSON.stringify({ human, key, hz, event: ev, kNeutral: JS.ankleNeutralKPerDeg(), levels: res }, null, 1));

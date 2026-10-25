// ═══ occupy3b/l3_forms.js — THE LIMB MOMENTUM CALIBRATION's shared definitions (owner, 25 Oct): the collision-effective velocity formulations
// (l3_world.js limbV / bodyV, RES3B.vsrc + RES3B.artMass), their names, the contact SPECTRUM, and the Lab's case rows (node tools and the page alike)
import { L3CASES, FLAGSHIP } from "./l3_cases.js";
// (each names its mass model explicitly — the default RES3B is the recommended F+M)
export const FORMS = { A: { vsrc: "A", artMass: false }, B: { vsrc: "B", artMass: false }, C: { vsrc: "C", artMass: false }, D: { vsrc: "D", artMass: false }, E: { vsrc: "E", artMass: false }, F: { vsrc: "F", artMass: false }, "D+M": { vsrc: "D", artMass: true }, "E+M": { vsrc: "E", artMass: true }, "F+M": { vsrc: "F", artMass: true } };
export const RECOMMENDED = "F+M";
export const FORM_LABEL = { A: "3B.1 AS FIRST BUILT (A)", B: "B · A on the local normal", C: "C · root + turn + limb about its hip", D: "D · the drawn surfaces", E: "E · frame + turn + limb", F: "F · frame + limb", "D+M": "D + articulated mass", "E+M": "E + articulated mass", "F+M": "CALIBRATED 3B.1 (F+M)" };
export const FORM_DESC = {
  A: "the authored point's motion less its frame's (incl. Stage 2's pushes), on the root's physical velocity — capped",
  B: "A's velocities on the LOCAL capsule normal",
  C: "the root's physical velocity + the body's turn + the limb's articulation about its hip",
  D: "the drawn surfaces' actual world velocity (bodies too)",
  E: "the drawn frame + turn + the limb about its hip; bodies: the root's physical velocity",
  F: "the drawn frame + the limb about its hip — only what a state can lose; bodies: the root's physical velocity",
  "D+M": "D, the articulated effective mass", "E+M": "E, the articulated effective mass",
  "F+M": "only what a state can lose (the root's translation, the limb's articulation about its hip) · the articulated effective mass",
};
export const SPECTRUM = [
  ["side", "light thigh brush · jogging in parallel (the flagship)"], ["side-run", "thigh brush · running in parallel"], ["side-walk", "walking in parallel"], ["glance", "glancing head-on · jogging"], ["run-past", "running past a turning defender"],
  ["oblique-firm", "stronger thigh collision · oblique, firm"], ["turn-into", "turning into each other"], ["headon-jog", "head-on · both jogging"], ["headon-walk", "head-on · both walking"],
  ["static-jog", "one standing · the other jogs into him (a swinging leg into a planted one)"], ["static-walk", "one standing · the other walks into him"],
  ["x90-jog", "crossing at 90° · jogging"], ["x60-jog", "crossing at 120° · jogging"], ["x120-run", "crossing at 60° · running"], ["x150-jog", "crossing at 30° · jogging"], ["x30-run", "crossing at 150° · running"],
  ["bf-fake", "Body Feint into a recovering tackle"], ["in-bf", "a tackle into a Body Feint"], ["bf-past", "Body Feint past a standing defender"], ["bf-shoulder", "Body Feint · shoulder contact"],
  ["croq-leg", "Croqueta · leg contact"], ["croq-early", "Croqueta into an early tackle"], ["croq-before", "Croqueta · a tackle before its transfer"], ["croq-between", "Croqueta · between its touches"], ["croq-hip", "Croqueta · hip contact"],
  ["in-croq", "a Standing Tackle into a Croqueta"], ["carry-walk", "a Standing Tackle into a walking carry"], ["both-committed", "both committed (Croqueta × tackle)"], ["croq-recover", "Croqueta × a tackle recovering across its exit"], ["croq-recover2", "Croqueta × a tackle recovering in front"],
];
export const ROT = 37, ROT_ROWS = ["side", "headon-jog", "static-jog", "x90-jog", "croq-leg", "in-croq"];
export const rotRow = (tc, th = ROT) => Object.assign({}, tc, { id: `${tc.id}@${th}°`, rot: th, name: `${tc.name} · THE WORLD TURNED ${th}°` });
// the Lab's rows: the flagship; the CALIBRATION SPECTRUM (brush → strike), each row with its mirror and, for some, the world turned 37°; then
// the rest of the §10 matrix by group
export function labRows() { const out = [], base = L3CASES.filter((x) => !x.matrixMirror), used = new Set(), mir = (r) => L3CASES.find((x) => x.matrixMirror === r.id);
  const fl = base.find((x) => x.id === FLAGSHIP); out.push(Object.assign({}, fl, { listGroup: "THE FLAGSHIP (the audit's failure)", name: "FLAGSHIP · " + fl.name })); used.add(fl.id);
  for (const [id, label] of SPECTRUM) { const r = base.find((x) => x.id === id); if (!r) continue; const g = "THE CALIBRATION SPECTRUM (brush → strike)";
    if (id !== FLAGSHIP) out.push(Object.assign({}, r, { listGroup: g, name: `${label.toUpperCase()} · ${r.name}` })); used.add(id);
    const m = mir(r); if (m) { out.push(Object.assign({}, m, { listGroup: g, name: `${label.toUpperCase()} · MIRRORED` })); used.add(m.id); }
    if (ROT_ROWS.includes(id)) out.push(Object.assign(rotRow(r), { listGroup: g })); }
  const groups = [...new Set(base.map((x) => x.group))];
  for (const g of groups) for (const r of base.filter((x) => x.group === g && !used.has(x.id))) { out.push(Object.assign({}, r, { listGroup: g })); const m = mir(r); if (m && !used.has(m.id)) out.push(Object.assign({}, m, { listGroup: g, name: r.name + " · MIRRORED" })); }
  return out; }

// ═══ physchar2/tools/e2_target_check.mjs — pre-G4 runway (item 7 support): are the proposed E2 footholds (G4_FIRST_EXPERIMENTS.md: ground level,
// foot yaw 0, 10 cm forward = E2a, 10 cm lateral outward = E2b) valid for every body, at which pelvis drop, with what limit margin — and does
// the answer depend on how the IK problem holds the twist DOFs (instantaneous values = the validated legIK semantics, vs the posture reference
// = ikRefTwist)? Static: the G3 U:R swing-ready state (8 s) of each body, the unloaded leg, its held foot pose as the origin (as ik_certificate).
// Research only; no G4 code.  usage: node tools/e2_target_check.mjs [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q, unitStates, unitEv } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI, TOL = 1e-6;
const AX = ["hip rot", "hip flex", "hip abd", "knee flex", "ankle DF", "ankle inv"], rows = [];
for (const h of VARIATION_SET) { const spec = generateSpec(h), n = 0, s = new G3Sim(J, spec, g3Def("U:R"), {}); let cap = null, want = false; const o = s.ctrl.legIK.bind(s.ctrl);
  s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want && nn === n && !cap) cap = { st: unitStates(st), ev: unitEv(ev), pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: Q.norm(fp.rot) } : null }; return o(st, ev, nn, pP, qP, fp); };
  while (s.n * s.dt < 8 - 1e-9 && s.tick()); want = true; s.tick(); s.ctrl.legIK = o; const c = s.ctrl, st = cap.st, ft0 = cap.foot || st[c.feet[n]];
  const fw = Q.rot(st[c.feet[1 - n]].rot, [0, 0, 1]), hd = V.norm([fw[0], 0, fw[2]]), latOut = V.sc([hd[2], 0, -hd[0]], -1);
  const Lh = c.legK[n].map(k => spec.joints[k].limits.hard), lo = [Lh[0].lo[0], Lh[0].lo[1], Lh[0].lo[2], Lh[1].lo[1], Lh[2].lo[1], Lh[2].lo[2]], hi = [Lh[0].hi[0], Lh[0].hi[1], Lh[0].hi[2], Lh[1].hi[1], Lh[2].hi[1], Lh[2].hi[2]], o0 = { ...c.o };
  for (const [name, fwd, lat] of [["E2a 10 cm forward", 0.10, 0], ["E2b 10 cm lateral", 0, 0.10], ["E2a' 5 cm forward", 0.05, 0], ["E2b' 5 cm lateral", 0, 0.05]]) for (const drop of [0, 0.025, 0.05, 0.075, 0.10]) {
    const pP = [cap.pP[0], cap.pP[1] - drop, cap.pP[2]], foot = { pos: V.add(V.add(ft0.pos, V.sc(hd, fwd)), V.sc(latOut, lat)), rot: ft0.rot }, row = { body: h.id, target: name, drop };
    for (const [def, opts] of [["instantaneous", {}], ["reference", { ikRefTwist: true }]]) { c.o = { ...o0, ...opts }; const U = c.legIK(st, cap.ev, n, pP, cap.qP, foot), B = c.legIKBounded(st, cap.ev, n, pP, cap.qP, foot); c.o = { ...o0 };
      const m = B.x.map((v, i) => Math.min(v - lo[i], hi[i] - v) * D), j = m.indexOf(Math.min(...m));
      row[def] = { geometric: U.err <= TOL, anatomical: B.err <= TOL, minMarginDeg: B.err <= TOL ? m[j] : null, binding: AX[j], residual: B.err }; }
    rows.push(row); const f = (r) => !r.geometric ? "out of reach" : !r.anatomical ? `INVALID (${r.binding})` : `ok, margin ${r.minMarginDeg.toFixed(1)}° (${r.binding})`;
    console.log(`${h.id.padEnd(14)} ${name.padEnd(18)} drop ${(drop * 100).toFixed(1).padStart(4)} cm: instantaneous ${f(row.instantaneous)} | reference ${f(row.reference)}`); }
  s.destroy(); }
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/e2_target_check.mjs", rows }));

// receive_elite1/tools/re1_neutral.mjs — ANIMATION ON / OFF NEUTRALITY (owner §33): the elite sequence with the presentation body on and off must
// be bit-identical in everything authoritative — contact ticks, ball launches, the player's path, the receive result, the DRIBBLE-V1 handoff — and
// the body's own diagnostics: every contact foot posed at its contact pose at the contact tick, planted feet without slip.
//   node re1_neutral.mjs <out.json> [ids] [seeds] [ratings list "99,99,99;50,99,99"]
import fs from "fs"; import { makeElite } from "./re1_env.mjs"; import { EliteBody } from "../re1_body.js"; import { ALL, parseCase } from "../re1_cases.js";
const out = process.argv[2] || "-", ids = process.argv[3] ? process.argv[3].split(",") : ALL, seeds = (process.argv[4] || "1").split(",").map(Number), RTS = (process.argv[5] || "99,99,99").split(";").map((x) => x.split(",").map(Number));
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { for (const x of r.ball.p) mix(x); mix(r.P[0]); mix(r.P[1]); mix(r.psi); } for (const T of S.touches) { mix(T.k); mix(T.launched ? 1 : 0); for (const x of T.executed.v) mix(x); } mix(S.ctrl.changes.length); const ho = S.rx.handoff; if (ho) { mix(ho.k); mix(ho.kDribble || 0); } return h.toString(16); };
const res = { runs: 0, identical: 0, fails: [], poses: 0, contactPoseErr: { max: 0, n: 0 }, slip: { max: 0 }, legExt: { max: 0 }, perCase: [] };
for (const id of ids) for (const sd of seeds) for (const rt of RTS) { const cs = parseCase(`${id}_B${rt[0]}_D${rt[1]}_A${rt[2]}`);
  const a = makeElite(cs, { seed: sd }); a.run(cs.scenario.dur);
  const b = makeElite(cs, { seed: sd, anim: true, EliteBody }); const diag = { cErr: 0, slip: 0, ext: 0, n: 0 }, ref = { R: null, L: null };
  // step the animated run tick by tick, reading the posed skeleton (presentation only)
  const T = Math.round(cs.scenario.dur / (1 / 240)); for (let i = 0; i < T && !b.fault; i++) { b.step(); const c2 = b.rc2, pz = c2 && c2.kind === "ELITE" && c2.phase === "action" ? c2.pose : null; if (!pz) { ref.R = ref.L = null; continue; } res.poses++; diag.n++;
    const ep = c2.ep, last = ep.contacts[ep.contacts.length - 1];
    if (last && b.k === last.k + 1 && b.body2) { const t = (last.k - c2.k0) * (1 / 240), po = b.body2.poseAt(t, null), want = b.body2.footAt(last.F, last.t), got = po.J["foot_" + last.F].j, e = Math.hypot(got[0] - want.ank[0], got[1] - want.ank[1], got[2] - want.ank[2]); diag.cErr = Math.max(diag.cErr, e); res.contactPoseErr.n++; }
    for (const X of ["R", "L"]) { const f = pz.feet[X]; if (!f.planted) { ref[X] = null; continue; } const pt = f.pivot ? pz.J["toe_" + X].j : pz.J["foot_" + X].j, key = f.pivot ? "p" + f.ballPt[0].toFixed(4) + f.ballPt[1].toFixed(4) : "f" + f.ank[0].toFixed(4) + f.ank[1].toFixed(4);
      if (!ref[X] || ref[X].id !== key) { ref[X] = { id: key, p: pt.slice() }; continue; } diag.slip = Math.max(diag.slip, Math.hypot(pt[0] - ref[X].p[0], pt[1] - ref[X].p[1])); }
    for (const X of ["R", "L"]) { const th = pz.J["thigh_" + X].j, an = pz.J["foot_" + X].j; diag.ext = Math.max(diag.ext, Math.hypot(an[0] - th[0], an[1] - th[1], an[2] - th[2]) / b.body2.b.legLen); } }
  res.runs++; const same = fp(a) === fp(b); if (same) res.identical++; else res.fails.push({ id: cs.id, sd });
  res.contactPoseErr.max = Math.max(res.contactPoseErr.max, diag.cErr); res.slip.max = Math.max(res.slip.max, diag.slip); res.legExt.max = Math.max(res.legExt.max, diag.ext);
  res.perCase.push({ id: cs.id, seed: sd, identical: same, contactPoseErr: +diag.cErr.toFixed(4), slip: +diag.slip.toFixed(4), legExt: +diag.ext.toFixed(3), poses: diag.n, fault: b.fault ? String(b.fault.message || b.fault) : null });
  console.log(cs.id.padEnd(32), same ? "IDENTICAL" : "DIFFERENT", "cErr", diag.cErr.toFixed(4), "slip", diag.slip.toFixed(4), "ext", diag.ext.toFixed(3), b.fault ? "FAULT " + (b.fault.message || b.fault) : ""); }
if (out !== "-") fs.writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify({ runs: res.runs, identical: res.identical, poses: res.poses, contactPoseErrMax: res.contactPoseErr.max, slipMax: res.slip.max, legExtMax: res.legExt.max }));

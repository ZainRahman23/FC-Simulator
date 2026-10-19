// technical_control11/tools/tc11_neutral.mjs — GAMEPLAY UNCHANGED: every case of the feet set × 99 / 80 / 50 with animation OFF, with
// TECHNICAL-CONTROL-1's body and with TECHNICAL-CONTROL-1.1's — the ball every tick, every contact (tick, foot, surface, executed impulse) and the
// player's path must be bit-identical.   node tc11_neutral.mjs <out.json>
import fs from "fs"; import { makeTech } from "../../technical_control1/tools/tc_env.mjs"; import { anyCase } from "../../technical_control1/tc_course.js"; import { bodyClass } from "./tc11_diag.mjs"; import { FEET_SET, RATINGS, caseId } from "../tc11_cases.js";
const B = { off: null, tc1: await bodyClass("tc1"), tc11: await bodyClass("tc11") }, rows = [];
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const c of (S.rc2 && S.rc2.ep ? S.rc2.ep.contacts : [])) { mix(c.k); mix(c.F === "R" ? 1 : 2); mix(c.surface.length); mix(c.vExec[0]); mix(c.vExec[1]); }
  for (const T of S.touches) mix(T.k); return h.toString(16); };
for (const e of FEET_SET) for (const r of RATINGS) { const id = caseId(e, r), o = {}; for (const k of ["off", "tc1", "tc11"]) { const cs = anyCase(id, e.seed), S = makeTech(cs, { seed: e.seed, foot: e.foot, anim: k !== "off", Body: B[k] }); S.run(); o[k] = { hash: fp(S), contacts: S.rc2.ep.contacts.length, fault: S.fault || null }; }
  const same = o.off.hash === o.tc1.hash && o.off.hash === o.tc11.hash; rows.push({ id, seed: e.seed, foot: e.foot, same, ...o }); console.log(same ? "=" : "DIFF", id, o.off.hash, o.tc1.hash, o.tc11.hash, o.off.contacts); }
const n = rows.length, ok = rows.filter((r) => r.same).length; fs.writeFileSync(process.argv[2] || "tc11_neutral.json", JSON.stringify({ identical: `${ok}/${n}`, rows }, null, 1)); console.log("identical", ok, "/", n);

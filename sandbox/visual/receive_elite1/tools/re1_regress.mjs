// receive_elite1/tools/re1_regress.mjs — REGRESSIONS (owner #20 / #21): everything RECEIVE-ELITE-1 does not own is bit-identical to RECEIVE-MOVING-1:
//   1. elite OFF (cfg.elite false): RECEIVE-CONTROL-2's integrated cases (A … M, A′, I′ × BC 50 / 99 × seeds 1, 2), RECEIVE-MOVING-1's owner cases (A … H,
//      A′ … C′ + extras × seeds 1, 2) and the movement matrix rows (seed 1) — ReceiveSimE ≡ ReceiveSimM
//   2. elite ON, receives that are not turns with a go intent — kill and hold, aerial control, kill-and-go / control-and-set-off: ≡ ReceiveSimM
//   3. elite ON, the turns: listed as changed (the elite sequence), with the reason
//   node re1_regress.mjs <out.json>
import fs from "fs"; import { makeElite, makeCurrent, RM1 } from "./re1_env.mjs"; import { CASES as C2, parseCase as parse2 } from "../../receive_control2/rc2_cases.js"; import { CASES as CM, parseCase as parseM, seedCase, matrix } from "../../receive_moving1/rm1_cases.js";
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; for (const r of S.rec) { for (const x of r.ball.p) mix(x); mix(r.P[0]); mix(r.P[1]); mix(r.psi); } for (const T of S.touches) { mix(T.k); mix(T.launched ? 1 : 0); } mix(S.ctrl.changes.length); return h.toString(16); };
const res = { off: { runs: 0, identical: 0, fails: [] }, onNonTurn: { runs: 0, identical: 0, fails: [] }, onTurn: { runs: 0, changed: 0, identical: 0, list: [] } };
const run = (mk, cs, sd, o) => { const S = mk(cs, Object.assign({ seed: sd }, o)); S.run(cs.scenario.dur); return S; };
const jobs = [];
for (const c of C2) for (const bc of c.bc ? [null] : [50, 99]) for (const sd of [1, 2]) jobs.push({ cs: parse2(bc == null ? c.id : c.id + "_BC" + bc), sd, kind: "rc2", id: c.id });
for (const c of CM) for (const sd of [1, 2]) jobs.push({ cs: seedCase(parseM(c.id), sd), sd, kind: "rm1", id: c.id });
for (const cs of matrix()) jobs.push({ cs, sd: 1, kind: "matrix", id: cs.id });
for (const j of jobs) { const a = run(makeCurrent, j.cs, j.sd, {}), b = run(makeElite, j.cs, j.sd, { elite: false }); res.off.runs++; if (fp(a) === fp(b)) res.off.identical++; else res.off.fails.push(j.cs.id + "@" + j.sd);
  if (j.kind !== "rc2") continue;
  const e = run(makeElite, j.cs, j.sd, {}), turn = e.rc2 && e.rc2.kind === "ELITE";
  if (!turn) { res.onNonTurn.runs++; if (fp(a) === fp(e)) res.onNonTurn.identical++; else res.onNonTurn.fails.push(j.cs.id + "@" + j.sd); }
  else { res.onTurn.runs++; const same = fp(a) === fp(e); if (same) res.onTurn.identical++; else res.onTurn.changed++; res.onTurn.list.push({ id: j.cs.id, sd: j.sd, family: e.rc2.ep.tech.fid, contacts: e.rc2.ep.contacts.length }); } }
fs.writeFileSync(process.argv[2] || "re1_regress.json", JSON.stringify(res, null, 1)); console.log(JSON.stringify({ off: [res.off.identical, res.off.runs], onNonTurn: [res.onNonTurn.identical, res.onNonTurn.runs], onTurn: [res.onTurn.changed, res.onTurn.runs] }), res.off.fails.slice(0, 5), res.onNonTurn.fails.slice(0, 5));

// possess1/tools/p_input.mjs — §14 / §15 / §22 PRE-EXISTING INPUT SURVIVES; NO INPUT LAG; NO EARLY USE OF NEW INFORMATION
// For each encounter and each reaction candidate: the run itself, and its COUNTERFACTUAL — the same encounter, the same inputs, the same tackle
// (commitment, body, boot path) but the boot never presented to the ball (no contact). Through the reaction interval after the contact the
// attacker must be EXACTLY the counterfactual (his stick, his committed move, his touches as he planned them: nothing paused, nothing re-planned
// from the contact); he may differ only from the tick he perceives it. Plus: a stick change made INSIDE the reaction interval is answered at
// once (the same tick, in both). OLD (the carrier re-planning in the contact tick) for comparison.
//   node p_input.mjs [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT, DEG } from "../../vocab2/c_sim.js";
import { CASES } from "../../vocab2/v_cases.js";
import { D } from "../../tackle1/t_cases.js";
import { runMode } from "../p_run.js";
import { MODES } from "../p_world.js";
import { ControlledSim, presetLayers } from "../../vocab2/c_sim.js";
import { caseOpts, runCaseOn } from "../../vocab2/v_run.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const carry = (mode, o = {}) => Object.assign({ tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, o);
const BF = CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT"), CQ = CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L");
// the attacker's signature per tick: root, pelvis, the plan's action and its contacts, his own contact record (as he believes it), his request
const sig = (A) => { const s = A.stateAt(A.t, A.plan), last = A.contacts[A.contacts.length - 1]; return { P: s.P, psi: s.psi, act: A.plan.action.label, id: A.plan.action.id, nC: A.plan.contacts.length, rec: A.contacts.length, last: last ? last.k + ":" + last.role : "", req: A.req ? A.req.h : null, skill: A.skill ? A.skill.state + ":" + (A.skill.result || "") : "" }; };
const same = (a, b) => a.P[0] === b.P[0] && a.P[1] === b.P[1] && a.psi === b.psi && a.act === b.act && a.id === b.id && a.nC === b.nC && a.rec === b.rec && a.last === b.last && a.req === b.req && a.skill === b.skill;
function pair(tc, mode) {
  const S = [], C = [], R = [], r = runMode(ENV, tc, mode, { onTick: (W) => { S.push(sig(W.att)); R.push((W.att.log.input || []).length); } });
  const c = runMode(ENV, tc, mode, { before: (W) => { W.tk.probes = () => {}; }, onTick: (W) => C.push(sig(W.att)) }), A = r.W.tk.act;
  if (!A || !A.hits.length) return null; const kE = Math.round(A.hits[0].t / DT), n = mode === "OLD" ? 0 : Math.round(MODES[mode] / DT);
  let div = null; for (let i = 0; i < Math.min(S.length, C.length); i++) { const k = i + 1; if (k <= kE) continue; if (!same(S[i], C[i])) { div = k; break; } }
  const at = S[kE - 1], perceived = r.W.auth ? r.W.att.pc.log.find((e) => e.type === "contact" && e.k === kE) : null;
  // what the attacker was doing at the contact, and whether it went on through the interval
  return { S, W: r.W, kE, n, div, dk: div == null ? null : div - kE, actAtContact: at.act, reqAtContact: at.req, skill: at.skill, perceivedAt: perceived ? perceived.perceived - kE : 0,
    actsDuring: [...new Set(S.slice(kE - 1, kE - 1 + Math.max(n, 1)).map((x) => x.act))], replansDuring: (r.W.att.plans || []).filter((p) => p.t0 > kE * DT - 1e-9 && p.t0 < (kE + n) * DT - 1e-9).map((p) => p.reason) }; }
// ── the encounters: an action already under way when the tackle meets the ball (found by a small deterministic sweep: the first set-up whose
// contact falls while it is active) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const FAM = [
  { name: "STEERING LEFT (stick 30° left from t = 0.30, held)", c: carry("JOG", { stick: [[0, 0, "JOG"], [0.30, -30, "JOG"]] }), defs: [[4.4, -1.6], [4.4, -1.3], [4.0, -1.6], [4.8, -1.6], [4.4, -1.0]], tq: [0.4, 0.5, 0.6, 0.7] },
  { name: "SHARP CUT 60° LEFT AT 0.55 (before the contact)", c: carry("JOG", { stick: [[0, 0, "JOG"], [0.55, -60, "JOG"]] }), defs: [[3.51, -0.89, 235], [3.6, -1.2, 225], [3.3, -0.9, 235]], tq: [0.606, 0.62, 0.58], need: (P) => P.kE * DT > 2.4 + 0.55 },
  { name: "BODY FEINT (committed)", c: BF, defs: [[2.4, 0.5], [3.0, 0.5], [3.0, 1.0], [3.6, 0.5], [3.6, 1.0], [4.2, 0.5], [4.2, 1.0], [2.4, 1.0]], tq: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8], need: (P) => /BODY FEINT/.test(P.actAtContact) },
  { name: "LA CROQUETA (committed)", c: CQ, defs: [[2.4, -0.5], [2.4, -1.0], [3.0, -0.5], [3.0, -1.0], [2.4, 0.5]], tq: [0.3, 0.4, 0.5, 0.2], need: (P) => /CROQUETA/.test(P.actAtContact) } ];
const out = []; let ok = 0, tot = 0;
for (const F of FAM) { let found = null;
  for (const d of F.defs) { for (const tq of F.tq) { const tc = { id: "x", c: F.c, def: D(d[0], d[1], d[2] || 180), tackle: [tq] }, P = pair(tc, "MEDIUM"); if (P && (!F.need || F.need(P))) { found = tc; break; } } if (found) break; }
  if (!found) { console.log(`${F.name}: no contact while the action is active in the sweep`); continue; }
  console.log(`\n${F.name} — defender [${found.def.at}] facing ${found.def.face}, tackle request ${found.tackle[0]} s`);
  for (const m of ["OLD", "SHORT", "MEDIUM", "LONG"]) { const P = pair(found, m); if (!P) { console.log(`  ${m}: no contact`); continue; } if (m !== "OLD") tot++; const pass = m === "OLD" ? true : (P.dk == null || P.dk >= P.n); if (m !== "OLD" && pass) ok++;
    console.log(`  ${m.padEnd(6)} contact tick ${P.kE}: doing "${P.actAtContact}" (stick ${P.reqAtContact == null ? "none" : (P.reqAtContact / DEG).toFixed(0) + "°"}${P.skill ? ", move " + P.skill : ""}) · ${m === "OLD" ? "re-plans in the contact tick" : `perceives at +${(P.n * DT).toFixed(3)} s`} · first difference from the counterfactual: ${P.dk == null ? "none" : "+" + P.dk + " ticks (" + (P.dk * DT).toFixed(3) + " s)"} ${m === "OLD" ? "" : pass ? "✓ identical through the reaction interval" : "✗ BEFORE perception"}`);
    if (m !== "OLD") console.log(`         during the interval: actions ${P.actsDuring.join(" → ")}; re-plans ${P.replansDuring.length ? P.replansDuring.join(", ") : "none"} (all on the belief)`);
    out.push({ fam: F.name, mode: m, kE: P.kE, n: P.n, dk: P.dk, act: P.actAtContact, req: P.reqAtContact, actsDuring: P.actsDuring, replansDuring: P.replansDuring, pass }); } }
// ── NO INPUT LAG: a stick change made inside the reaction interval (the carry case, the stick turned 70° left at the contact + half the interval)
console.log("\nNO INPUT LAG — the stick turned 70° left INSIDE the reaction interval");
for (const m of ["SHORT", "MEDIUM", "LONG"]) { const tc0 = { id: "x", c: carry("JOG"), def: D(4.4, -0.85, 180), tackle: [0.62] }, P0 = pair(tc0, m), tE = P0.kE * DT - 2.4, tTurn = +(tE + P0.n * DT / 2).toFixed(4);
  const tc = { id: "x", c: carry("JOG", { stick: [[0, 0, "JOG"], [tTurn, -70, "JOG"]] }), def: D(4.4, -0.85, 180), tackle: [0.62] }, P = pair(tc, m), kT = Math.round((2.4 + tTurn) / DT);
  const rp = (P.W.att.plans || []).find((p) => p.t0 >= kT * DT - 1e-9), rpAt = rp ? Math.round(rp.t0 / DT) - kT : null; tot++;
  // (the input's effect: the body's path against the same run WITHOUT the turn — the first tick it differs, and the travel heading 0.15 s on)
  let dIn = null; for (let i = kT - 1; i < Math.min(P.S.length, P0.S.length); i++) if (P.S[i].P[0] !== P0.S[i].P[0] || P.S[i].P[1] !== P0.S[i].P[1]) { dIn = i + 1 - kT; break; }
  // (the same input to the published player ALONE, no defender: when his path leaves the no-turn path — the movement's own response)
  const solo = []; for (const st of [tc.c.stick, [[0, 0, "JOG"]]]) { const c = carry("JOG", { stick: st }), A = new ControlledSim(ENV, Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })), arr = []; runCaseOn(A, c, false, () => arr.push(A.stateAt(A.t).P.slice())); solo.push(arr); }
  let dSolo = null; for (let i = kT - 1; i < solo[0].length; i++) if (solo[0][i][0] !== solo[1][i][0] || solo[0][i][1] !== solo[1][i][1]) { dSolo = i + 1 - kT; break; }
  const left = P.kE + P.n - kT, expect = dSolo < left ? dSolo : left + 1;
  const pass = rpAt === 0 && (P.dk == null || P.dk >= P.n) && dIn === expect; if (pass) ok++;
  console.log(`  ${m.padEnd(6)} contact tick ${P.kE}, the turn at tick ${kT} (+${((kT - P.kE) * DT).toFixed(3)} s, before perception at +${(P.n * DT).toFixed(3)} s): re-planned "${rp ? rp.reason : "—"}" at +${rpAt} ticks after the input; the body's path leaves the no-turn run's ${dIn} ticks after it — the player ALONE (no defender) with the same input: ${dSolo} ticks (his movement's own response)${dSolo < left ? " — the same" : `, but perception (${left} ticks after the input) comes first`} · identical to the counterfactual (the same input, no contact) through the interval: ${P.dk == null || P.dk >= P.n ? "✓" : "✗ (" + P.dk + ")"}`);
  out.push({ fam: "NO INPUT LAG", mode: m, kE: P.kE, kTurn: kT, replanAfterInput: rpAt, pathAfterInput: dIn, soloPathAfterInput: dSolo, dk: P.dk, n: P.n, pass }); }
console.log(`\n${ok} / ${tot} shared-mode checks pass (identical to the counterfactual through the reaction interval; the new input answered in its own tick)`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

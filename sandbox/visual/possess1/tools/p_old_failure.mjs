// possess1/tools/p_old_failure.mjs — §1 THE OLD FAILURE, instrumented BEFORE anything changes: Standing Tackle V1's world (tackle1/, unchanged)
// run with probes only — every re-plan of both players wrapped (the tick, the reason, the plan adopted, its fallback, where each planned touch was
// first created), both possession records and the ball per tick. Nothing here changes a result (the probes only read; checked: the outcome labels
// equal t_lab_cases / t_search's).
//   node p_old_failure.mjs --case carry-jog-l [--json f]        one case, frame by frame around the tackle contact
//   node p_old_failure.mjs --search 100 [--json f]               the t_search set (100 set-ups × 15 request times): the mechanism behind each outcome
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { TackleWorld, runEncounter, encounterOpts } from "../../tackle1/t_world.js";
import { buildEncounter, caseReport } from "../../tackle1/t_run.js";
import { TCASES } from "../../tackle1/t_cases.js";
import { trialCase } from "../../tackle1/tools/t_matrix.mjs";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, hyp = Math.hypot;
const f2 = (x) => (x == null ? "—" : (+x).toFixed(2)), f3 = (x) => (x == null ? "—" : (+x).toFixed(3));
// ── the probes (read only) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function instrument(W) {
  const R = { replans: [], born: new Map(), ticks: [] };
  for (const [who, P] of [["A", W.att], ["D", W.def]]) { const f = P.replan.bind(P);
    P.replan = (reason) => { const before = P.plan, k = P.k, r = f(reason), pl = P.plan, c = P.firstContact ? P.firstContact(pl) : null;
      const held = who === "D" && P.tk && P.tk.owns(k * DT) && pl === before, on = P.o.ballOn !== false;
      R.replans.push({ who, k, reason, held, adopted: pl !== before, action: pl.action.label + (pl.action.secure ? " · SECURE" : ""), fallback: P.poss ? P.poss.fallback : null, ballOn: on,
        next: c ? { k: c.k, F: c.F, role: c.role, id: c.id } : null, reach: on && c ? P.reachOf(pl) : null, cont: on && P.poss.cont ? P.poss.cont.ok : null, poss: P.poss ? P.poss.state : null });
      for (const q of pl.contacts) if (!R.born.has(who + ":" + q.id)) R.born.set(who + ":" + q.id, { k, reason }); return r; }; }
  return R; }
// a tick's row (after the world tick)
function row(W, R) { const A = W.att, D = W.def, b = A.ball, k = A.k - 1, ca = A.firstContact(A.plan), cd = D.o.ballOn !== false ? D.firstContact(D.plan) : null;
  return { k, bp: [b.p[0], b.p[1]], bv: [b.v[0], b.v[1]], pa: A.poss.state, pd: D.o.ballOn === false ? "— (ball off)" : D.poss.state, nextA: ca ? { k: ca.k, F: ca.F, role: ca.role, id: ca.id } : null, nextD: cd ? { k: cd.k, F: cd.F, role: cd.role, id: cd.id } : null,
    sepA: hyp(b.p[0] - A.stateAt(A.t).P[0], b.p[1] - A.stateAt(A.t).P[1]), sepD: hyp(b.p[0] - D.stateAt(D.t).P[0], b.p[1] - D.stateAt(D.t).P[1]) }; }
export function runOld(tc, o = {}) { const enc = buildEncounter(ENV, tc, o), W = new TackleWorld(ENV, encounterOpts(enc)), R = instrument(W);
  runEncounter(W, enc, o.rows ? (Wd) => R.ticks.push(row(Wd, R)) : null); return { W, enc, R, rep: caseReport(W, enc.c.runup) }; }
// the mechanism after the first tackle contact: the attacker's first re-plan (its latency, its reason, what it adopted), the attacker's next clean
// touch and WHEN that touch was created (at the contact tick's re-plan / a later re-plan / before the contact), dual CONTROLLED ticks
export function mechanism(W, R) { const A = W.tk.act; if (!A || !A.hits.length) return null; const h = A.hits[0], kC = Math.round(h.t / DT);
  const rp = R.replans.filter((x) => x.who === "A" && x.k >= kC), first = rp[0], reachP = rp.find((x) => x.next && x.reach), fb = rp.find((x) => x.fallback && /SECURE/.test(x.fallback));
  const nxt = W.att.contacts.find((c) => !c.missed && c.k > kC - 1 && c.t > h.t - 1e-9), born = nxt ? R.born.get("A:" + nxt.cid) : null;
  const dz = W.def.contacts.find((c) => !c.missed && c.k >= kC);
  const exit = W.att.poss.log.find((e) => e.from === "CONTROLLED" && e.t >= h.t - 1e-6);
  return { kC, tC: h.t, dv: h.dv, firstReplan: first ? { dk: first.k - kC, reason: first.reason, action: first.action, fallback: first.fallback } : null, secure: fb ? { dk: fb.k - kC, label: fb.fallback } : null, firstReach: reachP ? { dk: reachP.k - kC, reason: reachP.reason, touchIn: (reachP.next.k - reachP.k) * DT, role: reachP.next.role } : null,
    exit: exit ? { dk: Math.round(exit.t / DT) - kC, why: exit.why } : null,
    nextA: nxt ? { dk: nxt.k - kC, dt: nxt.t - h.t, role: nxt.role, src: nxt.src, created: born ? (born.k < kC ? `before the contact (${kC - born.k} ticks)` : born.k === kC ? `AT THE CONTACT TICK (re-plan "${born.reason}")` : `${born.k - kC} ticks after (re-plan "${born.reason}")`) : "?", bornDk: born ? born.k - kC : null } : null,
    nextD: dz ? { dk: dz.k - kC, dt: dz.t - h.t, role: dz.role } : null, outcome: A.outcome ? A.outcome.kind : null }; }
// ═══ one case, frame by frame ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (arg("case")) { const tc = TCASES.find((x) => x.id === arg("case")), { W, R, rep } = runOld(tc, { rows: true }), M = mechanism(W, R);
  if (!M) { console.log("no contact:", rep.action && rep.action.outcome); process.exit(0); }
  const kC = M.kC, t0 = tc.c.runup, last = W.att.k, Rk = new Map(R.ticks.map((x) => [x.k, x]));
  console.log(`OLD · ${tc.id} — ${tc.name}`); console.log(`tackle contact at t = ${f3(M.tC - t0)} s (tick ${kC}), Δv ${f2(M.dv)} m/s · outcome ${M.outcome}`);
  console.log(`  attacker's first re-plan: ${M.firstReplan.dk} ticks after the contact, reason "${M.firstReplan.reason}" → ${M.firstReplan.action}${M.firstReplan.fallback ? " (" + M.firstReplan.fallback + ")" : ""}`);
  if (M.firstReach) console.log(`  attacker's first plan with a touch IN REACH of the deflected ball: ${M.firstReach.dk} ticks after the contact (re-plan "${M.firstReach.reason}", its touch ${M.firstReach.role} in ${f3(M.firstReach.touchIn)} s)`);
  if (M.nextA) console.log(`  attacker's next touch: +${f3(M.nextA.dt)} s (${M.nextA.role}) — created ${M.nextA.created}`); if (M.nextD) console.log(`  defender's next touch: +${f3(M.nextD.dt)} s (${M.nextD.role})`);
  console.log("\n  tick   t−tC   ball (x, y)       |v|   att poss     def poss           att next touch         def next touch      events");
  for (let k = kC - 4; k <= last; k++) { const x = Rk.get(k); if (!x) continue; const ev = [];
    for (const h of W.tk.act.hits) if (Math.round(h.t / DT) === k) ev.push(`TACKLE CONTACT ${h.surface} Δv ${f2(h.dv)}`);
    for (const r of R.replans) if (r.k === k && !r.held) ev.push(`${r.who === "A" ? "ATT" : "DEF"} RE-PLAN "${r.reason}" → ${r.action}${r.fallback ? " [" + r.fallback + "]" : ""}${r.next ? " · next touch +" + f3((r.next.k - k) * DT) + " s" : ""}`);
    for (const c of W.att.contacts) if (c.k === k) ev.push(`ATT CONTACT ${c.role}${c.missed ? " (MISSED)" : ""}`); for (const c of W.def.contacts) if (c.k === k) ev.push(`DEF CONTACT ${c.role}${c.missed ? " (MISSED)" : ""}`);
    for (const e of W.att.poss.log) if (Math.round(e.t / DT) === k) ev.push(`ATT POSS → ${e.to} (${e.why})`); for (const e of (W.def.poss.log || [])) if (Math.round(e.t / DT) === k) ev.push(`DEF POSS → ${e.to} (${e.why})`);
    for (const e of W.log) if (Math.round(e.t / DT) === k) ev.push(e.kind);
    if (k > kC + 12 && !ev.length) continue;
    const nt = (n) => (n ? `${n.role} ${n.F} +${f3((n.k - k) * DT)}` : "—");
    console.log(`  ${String(k).padStart(5)} ${f3((k - kC) * DT).padStart(6)}  (${f2(x.bp[0])}, ${f2(x.bp[1])})  ${f2(hyp(...x.bv)).padStart(5)}   ${x.pa.padEnd(11)}  ${x.pd.padEnd(17)}  ${nt(x.nextA).padEnd(22)} ${nt(x.nextD).padEnd(19)} ${ev.join(" · ")}`); }
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ case: tc.id, M, ticks: R.ticks.filter((x) => x.k >= kC - 24 && x.k <= last + 24), replans: R.replans.filter((r) => r.k >= kC - 24), hits: W.tk.act.hits, att: W.att.contacts.filter((c) => c.k >= kC - 24), def: W.def.contacts, possA: W.att.poss.log, possD: W.def.poss.log || [] }, null, 1)); }
// ═══ the search set: the mechanism behind every committed contact ═════════════════════════════════════════════════════════════════════════════
if (arg("search")) { const N = +arg("search"), seed = +arg("seed", 7), out = [], T = {}, dual = { runs: 0, ticks: 0, ex: [] }; let runs = 0, committed = 0;
  for (let i = 0; i < N; i++) { const tc0 = trialCase(i, seed);
    for (let q = 0; q <= 14; q++) { const tq = +(q * 0.1).toFixed(2), tc = Object.assign({}, tc0, { tackle: [tq] }), { W, R, rep } = runOld(tc, { rows: true }); runs++;
      // (dual truth: ticks where both possession models say CONTROLLED)
      const dt = R.ticks.filter((x) => x.pa === "CONTROLLED" && x.pd === "CONTROLLED").length; if (dt) { dual.runs++; dual.ticks += dt; if (dual.ex.length < 12) dual.ex.push(`#${i}@${tq} (${dt} ticks)`); }
      if (!rep.action) continue; committed++; const M = mechanism(W, R), k = rep.action.outcome.kind; const key = k + (M && M.nextA && M.nextA.bornDk != null ? (M.nextA.bornDk < 0 ? " · touch pre-planned" : M.nextA.bornDk === 0 ? " · touch from the contact-tick re-plan" : " · touch from a later re-plan") : ""); T[key] = (T[key] || 0) + 1;
      out.push({ i, tq, k, M }); }
    if (i % 10 === 0) process.stderr.write(`${i} `); }
  console.log(`\nOLD SEARCH ${N} set-ups × 15 = ${runs} runs, ${committed} committed (seed ${seed})`);
  for (const [k, v] of Object.entries(T).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(78)} ${String(v).padStart(4)}`);
  const hit = out.filter((x) => x.M), frs = hit.filter((x) => x.M.firstReach), fr0 = frs.filter((x) => x.M.firstReach.dk === 0).length;
  console.log(`  the attacker's first plan with a touch in reach of the deflected ball: ${frs.length} contacts; in the contact tick itself ${fr0}; within 0.1 s ${frs.filter((x) => x.M.firstReach.dk <= 24).length}`);
  const lat = hit.map((x) => x.M.firstReplan ? x.M.firstReplan.dk : null).filter((x) => x != null), sec = hit.filter((x) => x.M.secure && x.M.secure.dk === 0).length;
  console.log(`  contacts ${hit.length}: the attacker's first re-plan after the contact — ${lat.filter((x) => x === 0).length} in the contact tick itself (max latency ${Math.max(...lat)} ticks); SECURE (pursuit) adopted in the contact tick: ${sec}`);
  const rec = hit.filter((x) => x.k === "ATTACKER RECOVERS"); console.log(`  ATTACKER RECOVERS ${rec.length}: next touch +${f3(Math.min(...rec.map((x) => x.M.nextA.dt)))} … +${f3(Math.max(...rec.map((x) => x.M.nextA.dt)))} s; created at the contact tick ${rec.filter((x) => x.M.nextA.bornDk === 0).length}, pre-planned ${rec.filter((x) => x.M.nextA.bornDk < 0).length}, later ${rec.filter((x) => x.M.nextA.bornDk > 0).length}`);
  console.log(`  DUAL TRUTH (both possession models CONTROLLED at once): ${dual.runs} runs, ${dual.ticks} ticks — ${dual.ex.join(" ")}`);
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ N, seed, runs, committed, T, dual, out }, null, 0)); }

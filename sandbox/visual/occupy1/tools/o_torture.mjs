// occupy1/tools/o_torture.mjs — §32 TORTURE TEST: long deterministic two-player runs, OLD vs OCCUPANCY V1, the same seeded scripts. The
// attacker carries the ball under a seeded stick (walk / jog / run, heading changes, RAPID TURNS of 120 – 180°) and asks for a Body Feint or a
// Croqueta every few seconds; the defender is a seeded SCRIPT reading the world (not AI: a fixed rule per phase, chosen by the seed) — CHASE
// (at the ball), CROSS (across a point ahead of the carrier), SIDE (shoulder to shoulder, leaning in), HEAD-ON (straight at him), AWAY (turning
// away for 1 – 2 s: separating and meeting again), RACE (at the ball whenever it is FREE) — and requests Standing Tackles when close. Every
// OCCUPANCY run is made twice (determinism). Instrumented on the bodies as drawn (each tick's live pose) whenever the roots are within the
// broad phase:
//   DEEP PENETRATION (resolved pairs: ticks > 2 / 5 / 10 cm, the deepest) · JITTER (root 2nd difference per 1/60 s > 1 cm; correction reversals
//   on consecutive ticks) · EXPLOSIVE CORRECTION (the largest per-tick correction; root accelerations > 100 m/s²) · STUCK PLAYERS (contact
//   held > 1.5 s while the carrier's stick points away from the defender) · ROOT DRIFT (corrections applied with no resolved pair in the
//   skin) · SUPPORT-FOOT SLIDING (a planted ball of foot drifting > 3 cm in one stance) · LEGS CROSSED · BALL ACCESS THROUGH A BODY (a ball
//   contact with the playing leg > 5 cm in the opponent) · OWNERSHIP ERRORS (the authority's own checks; chatter) · NON-DETERMINISM
//   node o_torture.mjs [--n 16] [--dur 40] [--seed 11] [--json f]
import { ENV } from "./o_env.mjs";
import { DT, DEG } from "../../vocab2/c_sim.js";
import { intentOf } from "../../vocab2/v_meta.js";
import { encounterOpts, defReqAt } from "../../tackle1/t_world.js";
import { buildEncounter } from "../../tackle1/t_run.js";
import { rng } from "../../tackle1/tools/t_matrix.mjs";
import { OccupancyWorld } from "../o_world.js";
import { volumesOf, detect, legThrough, OCC } from "../o_volumes.js";
import { groupOf } from "./o_measure.mjs";
import { BODY_TH } from "../../tackle1/t_body.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, N = +arg("n", 16), DUR = +arg("dur", 40), SEED = +arg("seed", 11), hyp = Math.hypot;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), CEN = [52.5, 34];
const BASE = { id: "torture", c: { tech: "CARRY", variant: "JOG", mode: "JOG", ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, def: { at: [7.0, 0.4], face: 180, stick: [] }, tackle: [] };
// one run: the world, the scripts, the instruments. mode "OLD" | "OCC"
function run(i, mode) { const R = rng(SEED * 7919 + i * 31), enc = buildEncounter(ENV, Object.assign({}, BASE, { def: Object.assign({}, BASE.def, { at: [5 + 4 * R(), (R() - 0.5) * 2] }) })), W = new OccupancyWorld(ENV, Object.assign(encounterOpts(enc), { mode: "MEDIUM", occupancy: mode === "OCC", record: false }));
  const A = W.att, D = W.def, nUp = Math.round(enc.c.runup / DT), n = Math.round(DUR / DT), M = { ticks: 0, near: 0, pen2: 0, pen5: 0, pen10: 0, deep: 0, deepAt: null, regions: {}, snaps: 0, snapMax: 0, acc100: 0, corrMax: 0, pingpong: 0, stuck: 0, stuckMax: 0, drift: 0, plant: 0, plantOld: 0, crossed: 0, through: 0, ambiguous: 0, contacts: 0, tackles: 0, intents: 0, intentsTaken: 0, phases: {}, owners: 0 };
  // (the attacker's script state, the defender's)
  let mv = null, mvAt = null, aCmd = null, aCmdT = 0, dCmd = null, dCmdT = 0, dCmdM = null, aH = 0, aMode = "JOG", aNext = 0, iNext = 2 + 2 * R(), dPhase = "CHASE", dNext = 0, dAway = 0, side = R() < 0.5 ? 1 : -1, tqNext = 0;
  const pos = { A: [], D: [] }, pin = { ATT: { R: null, L: null }, DEF: { R: null, L: null } }; let contactRun = 0, prevR = null, nC = 0, sigs = [];
  for (let k = -nUp; k < n; k++) { const t = k * DT, tw = W.t, sa = A.stateAt(tw), sd = D.stateAt(tw), ball = W.trueTrack(tw).p, free = W.auth.state === "FREE";
    let ra, rd;
    if (k < 0) { ra = { h: k + nUp < 24 ? null : 0, mode: "JOG", keys: 0 }; rd = defReqAt(enc, t, W); }
    else { // ── the ATTACKER: a heading random walk (rapid turns now and then), pulled back toward the pitch's centre; at the ball when it is FREE
      if (t >= aNext && mvAt == null) { const r = R(); if (r < 0.2) aH = wrap(aH + (R() < 0.5 ? 1 : -1) * (120 + 60 * R()) * DEG); else aH = wrap(aH + (R() - 0.5) * 140 * DEG);
        const toC = Math.atan2(CEN[1] - sa.P[1], CEN[0] - sa.P[0]); if (hyp(CEN[0] - sa.P[0], CEN[1] - sa.P[1]) > 14) aH = wrap(toC + (R() - 0.5) * 40 * DEG);
        aMode = ["WALK", "JOG", "JOG", "RUN"][Math.floor(R() * 4)]; aNext = t + 0.6 + 1.4 * R(); }
      const aim = free ? Math.atan2(ball[1] - sa.P[1], ball[0] - sa.P[0]) : aH; if (aCmd == null || Math.abs(wrap(aim - aCmd)) > 25 * DEG || (free && t - aCmdT > 0.4) || aim === aH) { aCmd = Math.round(aim * 1e6) / 1e6; aCmdT = t; } ra = { h: aCmd, mode: free ? "JOG" : aMode, keys: 0 };
      // (a MOVE, set up as the reference cases enter it (vocab2 v_cases: BODY FEINT V2 · FAKE LEFT → RIGHT, CROQUETA · REF JOG R → L, and their
      // mirrors): 1.2 s straight at a jog (both within their validated entry speeds), then the request with the stick pushed to the exit side
      // (± 45° / ∓ 40°); declined (the foot on the stride, the ball's side) → asked again 0.6 s later to the other side, three times at most)
      if (t >= iNext && !free && mvAt == null && !mv) { mvAt = t + 1.2; mv = { id: R() < 0.5 ? "BODY_FEINT_V2" : "CROQUETA", side: R() < 0.5 ? 1 : -1, tries: 0, h0: null }; aMode = "JOG"; aNext = t + 3.4; }
      if (mvAt != null && t >= mvAt) { const last = A.skill; if (mv.tries > 0 && !(last && last.done && last.result === "REJECTED")) { mv = null; mvAt = null; iNext = t + 3 + 3 * R(); }
        else if (mv.tries >= 3 || free) { mv = null; mvAt = null; iNext = t + 3 + 3 * R(); }
        else { const it = intentOf(mv.id); if (mv.tries > 0) mv.side = -mv.side; if (mv.h0 == null) mv.h0 = sa.s > 0.5 ? sa.h : sa.psi; aH = wrap(mv.h0 + mv.side * (mv.id === "CROQUETA" ? -40 : 45) * DEG); mv.tries++;
          if (it) { M.intents++; A.requestSkill(Object.assign({}, it, { foot: null, sprint: false })); } mvAt = t + 0.6; aNext = Math.max(aNext, t + 1.0); } }
      // ── the DEFENDER: one scripted rule per phase (the seed picks the next phase every 2 – 4 s)
      if (t >= dNext) { dPhase = ["CHASE", "CROSS", "SIDE", "HEADON", "AWAY", "CHASE"][Math.floor(R() * 6)]; side = R() < 0.5 ? 1 : -1; dNext = t + 2 + 2 * R(); if (dPhase === "AWAY") dAway = wrap(Math.atan2(sd.P[1] - sa.P[1], sd.P[0] - sa.P[0]) + (R() - 0.5) * 60 * DEG); }
      const ph = free ? "RACE" : dPhase; M.phases[ph] = (M.phases[ph] || 0) + 1; const ah = sa.s > 0.3 ? sa.h : sa.psi; let tgt, dm = "JOG";
      if (ph === "RACE" || ph === "CHASE") tgt = ball;
      else if (ph === "CROSS") tgt = [sa.P[0] + Math.cos(ah) * 1.5 + side * -Math.sin(ah) * 3, sa.P[1] + Math.sin(ah) * 1.5 + side * Math.cos(ah) * 3];
      else if (ph === "SIDE") tgt = [sa.P[0] + Math.cos(ah) * 3 + side * -Math.sin(ah) * 0.3, sa.P[1] + Math.sin(ah) * 3 + side * Math.cos(ah) * 0.3];
      else if (ph === "HEADON") tgt = [sa.P[0] + Math.cos(ah) * 0.5, sa.P[1] + Math.sin(ah) * 0.5];
      const dh = ph === "AWAY" ? dAway : Math.atan2(tgt[1] - sd.P[1], tgt[0] - sd.P[0]), dist = hyp(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]); if (ph !== "AWAY" && ph !== "RACE" && dist < 1.4) dm = "WALK";
      // (the stick as a person moves it: held, re-aimed when the wanted direction is 25° off or every 0.4 s — a stick re-aimed every tick keeps
      // the movement model re-planning its turn and never finishing it)
      if (dCmd == null || Math.abs(wrap(dh - dCmd)) > 25 * DEG || t - dCmdT > 0.4 || dm !== dCmdM) { dCmd = Math.round(dh * 1e6) / 1e6; dCmdT = t; dCmdM = dm; }
      rd = { h: dCmd, mode: dm, keys: 0 };
      if (t >= tqNext && dist < 2.4 && !free && ph !== "AWAY") { W.request("fixture"); tqNext = t + 0.8 + 1.6 * R(); } }
    W.step(ra, rd); M.ticks++;
    const t1 = W.t, s1a = A.stateAt(t1), s1d = D.stateAt(t1); pos.A.push(s1a.P); pos.D.push(s1d.P); if (k % 48 === 0) sigs.push([s1a.P[0], s1a.P[1], s1d.P[0], s1d.P[1]].map((v) => v.toFixed(9)).join(","));
    // ── the instruments (the bodies as drawn: the world's own live poses when it has them this tick)
    const dist1 = hyp(s1a.P[0] - s1d.P[0], s1a.P[1] - s1d.P[1]); let maxRes = -1;
    if (dist1 < OCC.broad + 0.3) { M.near++; const LP = W.livePoses(), va = volumesOf(LP.a.J), vd = volumesOf(LP.d.J);
      for (const x of detect(va, vd, { within: 0.05 })) { if (!x.both) continue; const G = groupOf(x.A, x.B); if (x.pen > maxRes) maxRes = x.pen; if (x.pen > OCC.hard) M.regions[`${x.A}↔${x.B}`] = (M.regions[`${x.A}↔${x.B}`] || 0) + 1; void G; }
      if (maxRes > 0.02) M.pen2++; if (maxRes > OCC.hard) M.pen5++; if (maxRes > 0.10) M.pen10++; if (maxRes > M.deep) { M.deep = maxRes; M.deepAt = +(t1).toFixed(3); }
      // (plant slides and crossed legs, on the near ticks)
      for (const [pid, p, J, st] of [["ATT", A, LP.a.J, s1a], ["DEF", D, LP.d.J, s1d]]) { const P = p.planAt(t1);
        for (const X of ["R", "L"]) { const s = P.stances[X].find((q) => q.t0 <= t1 + 1e-9 && q.t1 > t1 + 1e-9), q = J["toe_" + X].j; if (s) { const pn = pin[pid][X]; if (!pn || pn.id !== s.id) pin[pid][X] = { id: s.id, p: q.slice(), t: t1, flag: false }; else if (t1 - pn.t > 0.05 && !pn.flag && hyp(q[0] - pn.p[0], q[1] - pn.p[1]) > BODY_TH.plantDrift) { pn.flag = true; M.plant++; } } else pin[pid][X] = null; }
        const c = Math.cos(st.psi), s = Math.sin(st.psi), lat = (q) => -(q[0] - st.P[0]) * s + (q[1] - st.P[1]) * c; if (lat(J.foot_R.j) - lat(J.foot_L.j) < -BODY_TH.cross) M.crossed++; }
      // (every ball contact of this tick: the playing leg against the opponent's body)
      for (; nC < W.contactLog.length; nC++) { const C = W.contactLog[nC]; M.contacts++; if (C.kind === "tackle") M.tackles++; const who = C.by === "ATT" ? A : D, F = C.kind === "tackle" ? W.tk.act && W.tk.act.F : (who.contacts.find((x) => x.k === C.k && !x.missed) || {}).F; if (!F) continue;
        const L = legThrough(C.by === "ATT" ? va : vd, C.by === "ATT" ? vd : va, F); if (L.pen > OCC.hard) M.through++; else if (L.pen > OCC.tol) M.ambiguous++; } }
    else { pin.ATT = { R: null, L: null }; pin.DEF = { R: null, L: null }; for (; nC < W.contactLog.length; nC++) { M.contacts++; if (W.contactLog[nC].kind === "tackle") M.tackles++; } }
    // (stuck: in contact while the carrier's stick points away from the defender)
    if (maxRes > -OCC.tol && k >= 0 && ra.h != null) { const away = Math.cos(ra.h - Math.atan2(s1d.P[1] - s1a.P[1], s1d.P[0] - s1a.P[0])) < 0; contactRun = away ? contactRun + DT : 0; if (contactRun > 1.5 && contactRun - DT <= 1.5) M.stuck++; M.stuckMax = Math.max(M.stuckMax, contactRun); } else contactRun = 0;
    // (the occupancy's own corrections this tick: the largest, reversals, corrections with nothing in the skin)
    if (W.occ.log.length && W.occ.log[W.occ.log.length - 1].k === W.k) { const x = W.occ.log[W.occ.log.length - 1], m = Math.max(hyp(...x.dA), hyp(...x.dD)); M.corrMax = Math.max(M.corrMax, m); if (m > 0 && x.maxRes < -0.08) M.drift++;
      const rr = x.r, mm = hyp(rr[0], rr[1]); if (prevR && mm > 5e-4 && hyp(...prevR) > 5e-4 && rr[0] * prevR[0] + rr[1] * prevR[1] < 0) M.pingpong++; prevR = mm > 5e-4 ? rr : null; } }
  // (jitter: the root's 2nd difference per 1/60 s; accelerations per tick)
  for (const L of [pos.A, pos.D]) { for (let j = 8; j < L.length; j += 4) { const a = hyp(L[j][0] - 2 * L[j - 4][0] + L[j - 8][0], L[j][1] - 2 * L[j - 4][1] + L[j - 8][1]); if (a > 0.01) M.snaps++; M.snapMax = Math.max(M.snapMax, a); }
    for (let j = 2; j < L.length; j++) { const a = hyp(L[j][0] - 2 * L[j - 1][0] + L[j - 2][0], L[j][1] - 2 * L[j - 1][1] + L[j - 2][1]) / (DT * DT); if (a > 100) M.acc100++; } }
  const Au = W.auth, T = Au.log.filter((e) => e.to), own = T.filter((e) => e.to.startsWith("CONTROLLED")); let chatter = 0; for (let q = 1; q < own.length; q++) if (own[q].owner !== own[q - 1].owner && own[q].t - own[q - 1].t < 0.25) chatter++;
  M.owners = own.length; M.own = { dual: Au.checks.dual, unaware: Au.checks.unaware || 0, stale: Au.checks.far || 0, noTouch: Au.checks.noTouch, blindClaim: Au.checks.blindClaim || 0, chatter };
  M.skillRes = {}; for (const x of (A.log.skill || [])) M.skillRes[x.result || x.state || "?"] = (M.skillRes[x.result || x.state || "?"] || 0) + 1; M.intentsTaken = (A.log.skill || []).filter((x) => /ENTERED|PLAYED|DONE/.test(x.result || "")).length; M.occ = W.occ ? { conflicts: W.occ.conflicts, blocked: W.occ.blocked, unresolved: W.occ.unresolved || null, legConflicts: W.occ.legConflicts || 0 } : null;
  M.fp = JSON.stringify([sigs, W.contactLog.map((c) => [c.k, c.by, c.kind]), Au.log.map((e) => [e.k, e.to || e.note]), W.occ.log.length, W.occ.events.map((e) => [e.k, e.kind])]); return M; }
const S = { OLD: [], OCC: [] }; let nondet = 0;
for (let i = 0; i < N; i++) { const o = run(i, "OLD"), a = run(i, "OCC"), b = run(i, "OCC"); if (a.fp !== b.fp) nondet++; S.OLD.push(o); S.OCC.push(a); process.stderr.write(`${i} `); }
const sum = (L, k) => L.reduce((s, x) => s + (x[k] || 0), 0), mx = (L, k) => Math.max(...L.map((x) => x[k] || 0)), own = (L, k) => L.reduce((s, x) => s + x.own[k], 0);
console.log(`\nTORTURE — ${N} runs × ${DUR} s (seed ${SEED}), OLD vs OCCUPANCY V1 on the same seeded scripts (each OCCUPANCY run made twice) · ${(N * DUR / 60).toFixed(1)} simulated minutes per mode`);
const rows = [["ticks with the roots within the broad phase", (L) => sum(L, "near")], ["DEEP PENETRATION: ticks > 2 cm", (L) => sum(L, "pen2")], ["  ticks > 5 cm (the hard limit)", (L) => sum(L, "pen5")], ["  ticks > 10 cm", (L) => sum(L, "pen10")], ["  the deepest (cm)", (L) => (mx(L, "deep") * 100).toFixed(1)],
  ["JITTER: root 2nd difference > 1 cm per 1/60 s (frames)", (L) => sum(L, "snaps")], ["  the largest (mm per 1/60 s²)", (L) => (mx(L, "snapMax") * 1000).toFixed(1)], ["  correction reversals on consecutive ticks", (L) => sum(L, "pingpong")],
  ["EXPLOSIVE: root acceleration > 100 m/s² (ticks)", (L) => sum(L, "acc100")], ["  the largest per-tick correction (cm)", (L) => (mx(L, "corrMax") * 100).toFixed(2)], ["STUCK: contact > 1.5 s, the carrier steering away", (L) => sum(L, "stuck")], ["  the longest such contact (s)", (L) => mx(L, "stuckMax").toFixed(2)],
  ["ROOT DRIFT: corrections with nothing in the skin (ticks)", (L) => sum(L, "drift")], ["SUPPORT-FOOT SLIDING (planted > 3 cm, near ticks)", (L) => sum(L, "plant")], ["LEGS CROSSED (near ticks)", (L) => sum(L, "crossed")],
  ["BALL CONTACTS (all)", (L) => sum(L, "contacts")], ["  of them tackle contacts", (L) => sum(L, "tackles")], ["  THROUGH A BODY (leg > 5 cm in the opponent)", (L) => sum(L, "through")], ["  ambiguous (2 – 5 cm)", (L) => sum(L, "ambiguous")],
  ["OWNERSHIP: dual", (L) => own(L, "dual")], ["  unaware owner", (L) => own(L, "unaware")], ["  stale owner (3 m)", (L) => own(L, "stale")], ["  possession without a touch", (L) => own(L, "noTouch")], ["  control granted blind", (L) => own(L, "blindClaim")], ["  chatter (< 0.25 s)", (L) => own(L, "chatter")], ["  establishments", (L) => sum(L, "owners")],
  ["move requests (Body Feint / Croqueta)", (L) => sum(L, "intents")], ["  entered (the technique began)", (L) => sum(L, "intentsTaken")]];
console.log(`  ${"".padEnd(56)}${"OLD".padStart(10)}${"OCCUPANCY".padStart(12)}`); for (const [l, f] of rows) console.log(`  ${l.padEnd(56)}${String(f(S.OLD)).padStart(10)}${String(f(S.OCC)).padStart(12)}`);
console.log(`  NON-DETERMINISTIC OCCUPANCY RUNS (two runs, the same seed): ${nondet} / ${N}`);
const reg = {}; for (const x of S.OCC) for (const [k, v] of Object.entries(x.regions)) reg[k] = (reg[k] || 0) + v; console.log(`  OCCUPANCY: ticks > 5 cm by region pair: ${Object.entries(reg).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(" · ") || "none"}`);
const un = {}; for (const x of S.OCC) if (x.occ.unresolved) for (const [k, v] of Object.entries(x.occ.unresolved)) un[k] = (un[k] || 0) + v; console.log(`  OCCUPANCY: unresolved ticks by reason: ${JSON.stringify(un)} · conflicts ${sum(S.OCC.map((x) => x.occ), "conflicts")} · touches / boots blocked ${sum(S.OCC.map((x) => x.occ), "blocked")} · leg conflicts ${sum(S.OCC.map((x) => x.occ), "legConflicts")}`);
for (const m of ["OLD", "OCC"]) { const T = {}; for (const x of S[m]) for (const [k, v] of Object.entries(x.skillRes)) T[k] = (T[k] || 0) + v; console.log(`  ${m}: the move requests' outcomes (the carrier's own skill log): ${JSON.stringify(T)}`); }
const ph = {}; for (const x of S.OCC) for (const [k, v] of Object.entries(x.phases)) ph[k] = (ph[k] || 0) + v; console.log(`  the defender's script (ticks per phase, OCCUPANCY): ${JSON.stringify(ph)}`);
console.log("  per run (OCC): " + S.OCC.map((x, i) => `#${i} deep ${(x.deep * 100).toFixed(1)} >5 ${x.pen5} snaps ${x.snaps}(OLD ${S.OLD[i].snaps}) tk ${x.tackles}`).join(" | "));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ N, DUR, SEED, nondet, OLD: S.OLD.map((x) => Object.assign({}, x, { fp: undefined })), OCC: S.OCC.map((x) => Object.assign({}, x, { fp: undefined })) }, null, 1));

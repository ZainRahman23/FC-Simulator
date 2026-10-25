// occupy3/tools/o3_torture.mjs — §21 TORTURE: long deterministic two-player runs with REPEATED CONTACT, STAGE 2 (as decided) vs STAGE 3 on the
// same seeded scripts — Stage 2's torture (occupy2/tools/s2/o2s_torture.mjs: the carrier's seeded stick with rapid turns and Body Feint / Croqueta
// requests, the defender's seeded script CHASE / CROSS / SIDE / HEAD-ON / AWAY / RACE with Standing Tackles when close), its MIRROR (the same seed,
// the world mirrored: every heading and offset reflected), each STAGE 3 run made twice. Checked:
//   DETERMINISM (two runs of the same seed: every 48th tick's roots, every contact, the authority's log, Stage 3's events — identical)
//   NaN (any root, velocity, perturbation, pelvis offset not finite) · STUCK (contact held > 1.5 s while the carrier steers away; a player asking to
//   move who has not moved 0.1 m in a second) · DUAL OWNERSHIP and the authority's own checks · POSSESSION CHATTER (control changing hands within
//   0.25 s) · INFINITE COLLISION LOOPS (an impact episode longer than 6 s; more than 40 episodes in a run) · RECOVERY-STEP OSCILLATION (a player's
//   consecutive recovery steps reversing direction three times within 1.5 s) · the impacts' severities, balance outcomes, interruptions, fall
//   candidates · the deepest penetration · the drawn pelvis's jolts.   node o3_torture.mjs [--n 16] [--dur 40] [--seed 11] [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { DT, DEG } from "../../vocab2/c_sim.js";
import { intentOf } from "../../vocab2/v_meta.js";
import { encounterOpts, defReqAt } from "../../tackle1/t_world.js";
import { buildEncounter } from "../../tackle1/t_run.js";
import { rng } from "../../tackle1/tools/t_matrix.mjs";
import { makeWorld3 } from "../o3_run.js";
import "../o3_world.js";
import { volumesOf, detect, OCC } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, N = +arg("n", 16), DUR = +arg("dur", 40), SEED = +arg("seed", 11), hyp = Math.hypot;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), CEN = [52.5, 34];
const BASE = { id: "torture", c: { tech: "CARRY", variant: "JOG", mode: "JOG", ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, def: { at: [7.0, 0.4], face: 180, stick: [] }, tackle: [] };
const fin = (v) => Array.isArray(v) ? v.every((x) => Number.isFinite(x)) : Number.isFinite(v);
function run(i, mode, mirror) { const R = rng(SEED * 7919 + i * 31), sg = mirror ? -1 : 1, enc = buildEncounter(ENV, Object.assign({}, BASE, { mirror, def: Object.assign({}, BASE.def, { at: [5 + 4 * R(), sg * (R() - 0.5) * 2] }) })), W = makeWorld3(ENV, Object.assign(encounterOpts(enc), { mode: "MEDIUM", record: false }), mode);
  const A = W.att, D = W.def, nUp = Math.round(enc.c.runup / DT), n = Math.round(DUR / DT), M = { near: 0, pen5: 0, deep: 0, stuck: 0, stall: 0, nan: 0, jolt4: 0, joltMax: 0, intents: 0, episodes: 0, longEp: 0, osc: 0, sev: {}, bal: {}, act: {}, falls: 0, steps: 0, denied: 0 };
  let mv = null, mvAt = null, aCmd = null, aCmdT = 0, dCmd = null, dCmdT = 0, dCmdM = null, aH = 0, aMode = "JOG", aNext = 0, iNext = 2 + 2 * R(), dPhase = "CHASE", dNext = 0, dAway = 0, side = R() < 0.5 ? 1 : -1, tqNext = 0; let contactRun = 0; const sigs = [], pel = { a: [], d: [] }, hist = { a: [], d: [] };
  for (let k = -nUp; k < n; k++) { const t = k * DT, tw = W.t, sa = A.stateAt(tw), sd = D.stateAt(tw), ball = W.trueTrack(tw).p, free = W.auth.state === "FREE"; let ra, rd;
    if (k < 0) { ra = { h: k + nUp < 24 ? null : 0, mode: "JOG", keys: 0 }; rd = defReqAt(enc, t, W); }
    else { // ── the ATTACKER (Stage 2's torture script; the mirror reflects every turn)
      if (t >= aNext && mvAt == null) { const r = R(); if (r < 0.2) aH = wrap(aH + sg * (R() < 0.5 ? 1 : -1) * (120 + 60 * R()) * DEG); else aH = wrap(aH + sg * (R() - 0.5) * 140 * DEG);
        const toC = Math.atan2(CEN[1] - sa.P[1], CEN[0] - sa.P[0]); if (hyp(CEN[0] - sa.P[0], CEN[1] - sa.P[1]) > 14) aH = wrap(toC + sg * (R() - 0.5) * 40 * DEG);
        aMode = ["WALK", "JOG", "JOG", "RUN"][Math.floor(R() * 4)]; aNext = t + 0.6 + 1.4 * R(); }
      const aim = free ? Math.atan2(ball[1] - sa.P[1], ball[0] - sa.P[0]) : aH; if (aCmd == null || Math.abs(wrap(aim - aCmd)) > 25 * DEG || (free && t - aCmdT > 0.4) || aim === aH) { aCmd = Math.round(aim * 1e6) / 1e6; aCmdT = t; } ra = { h: aCmd, mode: free ? "JOG" : aMode, keys: 0 };
      if (t >= iNext && !free && mvAt == null && !mv) { mvAt = t + 1.2; mv = { id: R() < 0.5 ? "BODY_FEINT_V2" : "CROQUETA", side: sg * (R() < 0.5 ? 1 : -1), tries: 0, h0: null }; aMode = "JOG"; aNext = t + 3.4; }
      if (mvAt != null && t >= mvAt) { const last = A.skill; if (mv.tries > 0 && !(last && last.done && last.result === "REJECTED")) { mv = null; mvAt = null; iNext = t + 3 + 3 * R(); }
        else if (mv.tries >= 3 || free) { mv = null; mvAt = null; iNext = t + 3 + 3 * R(); }
        else { const it = intentOf(mv.id); if (mv.tries > 0) mv.side = -mv.side; if (mv.h0 == null) mv.h0 = sa.s > 0.5 ? sa.h : sa.psi; aH = wrap(mv.h0 + mv.side * (mv.id === "CROQUETA" ? -40 : 45) * DEG); mv.tries++;
          if (it) { M.intents++; A.requestSkill(Object.assign({}, it, { foot: null, sprint: false })); } mvAt = t + 0.6; aNext = Math.max(aNext, t + 1.0); } }
      // ── the DEFENDER: one scripted rule per phase
      if (t >= dNext) { dPhase = ["CHASE", "CROSS", "SIDE", "HEADON", "AWAY", "CHASE"][Math.floor(R() * 6)]; side = sg * (R() < 0.5 ? 1 : -1); dNext = t + 2 + 2 * R(); if (dPhase === "AWAY") dAway = wrap(Math.atan2(sd.P[1] - sa.P[1], sd.P[0] - sa.P[0]) + sg * (R() - 0.5) * 60 * DEG); }
      const ph = free ? "RACE" : dPhase, ah = sa.s > 0.3 ? sa.h : sa.psi; let tgt, dm = "JOG";
      if (ph === "RACE" || ph === "CHASE") tgt = ball; else if (ph === "CROSS") tgt = [sa.P[0] + Math.cos(ah) * 1.5 + side * -Math.sin(ah) * 3, sa.P[1] + Math.sin(ah) * 1.5 + side * Math.cos(ah) * 3];
      else if (ph === "SIDE") tgt = [sa.P[0] + Math.cos(ah) * 3 + side * -Math.sin(ah) * 0.3, sa.P[1] + Math.sin(ah) * 3 + side * Math.cos(ah) * 0.3]; else if (ph === "HEADON") tgt = [sa.P[0] + Math.cos(ah) * 0.5, sa.P[1] + Math.sin(ah) * 0.5];
      const dh = ph === "AWAY" ? dAway : Math.atan2(tgt[1] - sd.P[1], tgt[0] - sd.P[0]), dist = hyp(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]); if (ph !== "AWAY" && ph !== "RACE" && dist < 1.4) dm = "WALK";
      if (dCmd == null || Math.abs(wrap(dh - dCmd)) > 25 * DEG || t - dCmdT > 0.4 || dm !== dCmdM) { dCmd = Math.round(dh * 1e6) / 1e6; dCmdT = t; dCmdM = dm; } rd = { h: dCmd, mode: dm, keys: 0 };
      if (t >= tqNext && dist < 2.4 && !free && ph !== "AWAY") { W.request("fixture"); tqNext = t + 0.8 + 1.6 * R(); } }
    W.step(ra, rd);
    const t1 = W.t, s1a = A.stateAt(t1), s1d = D.stateAt(t1); if (k % 48 === 0) sigs.push([s1a.P[0], s1a.P[1], s1d.P[0], s1d.P[1]].map((v) => v.toFixed(9)).join(","));
    if (!fin(s1a.P) || !fin(s1d.P) || !fin(s1a.V) || !fin(s1d.V)) M.nan++; if (W.ps) for (const p of W.players) { const s = W.ps.get(p); if (!fin(s.u) || !fin(s.P) || !fin(s.O)) M.nan++; }
    hist.a.push(s1a.P.slice()); hist.d.push(s1d.P.slice());
    const dist1 = hyp(s1a.P[0] - s1d.P[0], s1a.P[1] - s1d.P[1]); let maxRes = -1;
    if (dist1 < OCC.broad + 0.3) { M.near++; const LP = W.livePoses(); for (const x of detect(volumesOf(LP.a.J), volumesOf(LP.d.J), { within: 0.05 })) { if (x.both && x.pen > maxRes) maxRes = x.pen; } if (maxRes > OCC.hard) M.pen5++; M.deep = Math.max(M.deep, maxRes);
      if (k % 4 === 0) { pel.a.push(LP.a.J.pelvis.j.slice()); pel.d.push(LP.d.J.pelvis.j.slice()); } } else if (k % 4 === 0) { pel.a.push(null); pel.d.push(null); }
    if (maxRes > -OCC.tol && k >= 0 && ra.h != null) { const away = Math.cos(ra.h - Math.atan2(s1d.P[1] - s1a.P[1], s1d.P[0] - s1a.P[0])) < 0; contactRun = away ? contactRun + DT : 0; if (contactRun > 1.5 && contactRun - DT <= 1.5) M.stuck++; } else contactRun = 0; }
  // (the drawn pelvis's jolt per 60 Hz frame on near ticks; a player asking to move who did not move 0.1 m over a second)
  for (const L of [pel.a, pel.d]) for (let j = 2; j < L.length; j++) { if (!L[j] || !L[j - 1] || !L[j - 2]) continue; const a = hyp(L[j][0] - 2 * L[j - 1][0] + L[j - 2][0], L[j][1] - 2 * L[j - 1][1] + L[j - 2][1]); if (a > 0.04) M.jolt4++; M.joltMax = Math.max(M.joltMax, a); }
  for (const L of [hist.a, hist.d]) for (let j = Math.round(nUp) + 240; j < L.length; j += 60) if (hyp(L[j][0] - L[j - 240][0], L[j][1] - L[j - 240][1]) < 0.1) M.stall++;
  const Au = W.auth, own = Au.log.filter((e) => e.to && e.to.startsWith("CONTROLLED")); let chatter = 0; for (let q = 1; q < own.length; q++) if (own[q].owner !== own[q - 1].owner && own[q].t - own[q - 1].t < 0.25) chatter++;
  M.own = { dual: Au.checks.dual, unaware: Au.checks.unaware || 0, noTouch: Au.checks.noTouch, blindClaim: Au.checks.blindClaim || 0, chatter }; M.owners = own.length;
  if (W.imp) { const eps = W.imp.episodes.concat(W.imp.ep && W.imp.ep.active ? [W.imp.ep] : []); M.episodes = eps.length; for (const e of eps) { if ((e.dur || 0) > 6) { M.longEp++; const t1 = e.t1 != null ? e.t1 : W.t, ev = {}; for (const x of W.imp.events) if (x.t >= e.t0 - 1e-9 && x.t <= t1 + 1e-9) ev[x.kind] = (ev[x.kind] || 0) + 1;
        // (what kept it open: the bodies still touching (its last contact tick), a player not yet settled)
        (M.long || (M.long = [])).push({ t0: +e.t0.toFixed(2), dur: e.dur != null ? e.dur : +(t1 - e.t0).toFixed(2), lastContact: +(e.last * DT - e.t0).toFixed(2), why: e.why, strikes: (e.strikes.length != null ? e.strikes.length : e.strikes.size), ev, players: Object.fromEntries(["ATT", "DEF"].filter((k) => e.players[k]).map((k) => [k, `${e.players[k].sev} ${e.players[k].cls} ${e.players[k].outcome} steps ${e.players[k].steps.length} regained ${e.players[k].regainAfter}`])) }); } for (const k of ["ATT", "DEF"]) { const q = e.players[k]; if (!q) continue; M.sev[q.sev] = (M.sev[q.sev] || 0) + 1; M.bal[q.cls] = (M.bal[q.cls] || 0) + 1; M.act[q.outcome] = (M.act[q.outcome] || 0) + 1; if (q.fall) M.falls++; M.steps += q.steps.length; } }
    M.denied = W.imp.events.filter((e) => /DENIED/.test(e.kind)).length;
    // (oscillation: a player's recovery steps' directions (target − where the foot would have landed) reversing ≥ 3 times within 1.5 s)
    // (the steps' successive displacements d_j = target_j − target_{j−1}; a reversal when d_j · d_{j−1} < 0 — three in four consecutive steps within 1.5 s)
    for (const pid of ["ATT", "DEF"]) { const S = W.imp.events.filter((e) => e.who === pid && e.kind === "RECOVERY STEP" && e.pos), d = S.map((e, j) => (j ? [e.pos[0] - S[j - 1].pos[0], e.pos[1] - S[j - 1].pos[1]] : null));
      for (let j = 4; j < S.length; j++) { if (S[j].t - S[j - 4].t > 1.5) continue; let rev = 0; for (let q = j - 2; q <= j; q++) if (d[q] && d[q - 1] && d[q][0] * d[q - 1][0] + d[q][1] * d[q - 1][1] < 0) rev++; if (rev >= 3) { M.osc++; break; } } } }
  M.fp = JSON.stringify([sigs, W.contactLog.map((c) => [c.k, c.by, c.kind]), Au.log.map((e) => [e.k, e.to || e.note]), W.imp ? W.imp.events.map((e) => [e.k, e.who, e.kind]) : null]); return M; }
const S = { S2D: [], S3: [] }; let nondet = 0;
const ONLY = arg("only") ? arg("only").split(",") : null;   // (--only 8m,12: those runs only — a diagnosis)
for (let i = 0; i < N; i++) for (const mirror of [false, true]) { if (ONLY && !ONLY.includes(`${i}${mirror ? "m" : ""}`)) continue; const o = run(i, "S2D", mirror), a = run(i, "S3", mirror), b = run(i, "S3", mirror); if (a.fp !== b.fp) nondet++; o.tag = a.tag = `#${i}${mirror ? "m" : ""}`; S.S2D.push(o); S.S3.push(a); process.stderr.write(`${i}${mirror ? "m" : ""} `); }
const sum = (L, k) => L.reduce((s, x) => s + (x[k] || 0), 0), mx = (L, k) => Math.max(...L.map((x) => x[k] || 0)), own = (L, k) => L.reduce((s, x) => s + x.own[k], 0), merge = (L, k) => { const m = {}; for (const x of L) for (const [a, b] of Object.entries(x[k] || {})) m[a] = (m[a] || 0) + b; return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${b}`).join(" · ") || "—"; };
console.log(`\nTORTURE — ${N} seeds × 2 (the seed and its MIRROR) × ${DUR} s (seed ${SEED}), STAGE 2 (as decided) vs STAGE 3 on the same scripts (each Stage 3 run twice) · ${(2 * N * DUR / 60).toFixed(1)} simulated minutes per stage`);
const rows = [["ticks with the roots within the broad phase", (L) => sum(L, "near")], ["ticks with a pair > 5 cm", (L) => sum(L, "pen5")], ["the deepest (cm)", (L) => (mx(L, "deep") * 100).toFixed(1)], ["pelvis jolts > 4 cm per frame² (near)", (L) => sum(L, "jolt4")], ["  the largest (cm)", (L) => (mx(L, "joltMax") * 100).toFixed(1)],
  ["NaN (roots, velocities, perturbations)", (L) => sum(L, "nan")], ["STUCK: contact > 1.5 s, the carrier steering away", (L) => sum(L, "stuck")], ["  a player asking to move, < 0.1 m in a second (samples)", (L) => sum(L, "stall")],
  ["OWNERSHIP: dual", (L) => own(L, "dual")], ["  unaware owner", (L) => own(L, "unaware")], ["  possession without a touch", (L) => own(L, "noTouch")], ["  control granted blind", (L) => own(L, "blindClaim")], ["  CHATTER (< 0.25 s)", (L) => own(L, "chatter")], ["  establishments", (L) => sum(L, "owners")],
  ["IMPACT EPISODES", (L) => sum(L, "episodes")], ["  longer than 6 s (a collision loop)", (L) => sum(L, "longEp")], ["  recovery steps", (L) => sum(L, "steps")], ["  RECOVERY-STEP OSCILLATION (runs)", (L) => sum(L, "osc")], ["  fall candidates", (L) => sum(L, "falls")], ["  touches / boots denied (geometry)", (L) => sum(L, "denied")], ["move requests", (L) => sum(L, "intents")]];
console.log(`  ${"".padEnd(56)}${"STAGE 2".padStart(10)}${"STAGE 3".padStart(10)}`); for (const [l, f] of rows) console.log(`  ${l.padEnd(56)}${String(f(S.S2D)).padStart(10)}${String(f(S.S3)).padStart(10)}`);
console.log(`  NON-DETERMINISTIC STAGE 3 RUNS (two runs, the same seed): ${nondet} / ${2 * N}`);
console.log(`  STAGE 3 severity: ${merge(S.S3, "sev")}`); console.log(`  STAGE 3 balance: ${merge(S.S3, "bal")}`); console.log(`  STAGE 3 action: ${merge(S.S3, "act")}`);
console.log("  per run (S3): " + S.S3.map((x, j) => `${x.tag} eps ${x.episodes} steps ${x.steps} falls ${x.falls} deep ${(x.deep * 100).toFixed(1)} jolt ${(S.S2D[j].joltMax * 100).toFixed(1)}→${(x.joltMax * 100).toFixed(1)}`).join(" | "));
for (const x of S.S3) for (const L of x.long || []) console.log(`  EPISODE > 6 s in ${x.tag}: from ${L.t0} s for ${L.dur} s · the bodies last touched at +${L.lastContact} s · ${L.why} · ${L.strikes} limb strikes · ${Object.entries(L.ev).map(([k, v]) => `${k} ${v}`).join(" · ")} · ${Object.entries(L.players).map(([k, v]) => `${k}: ${v}`).join(" | ")}`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ N, DUR, SEED, nondet, S2D: S.S2D.map((x) => Object.assign({}, x, { fp: undefined })), S3: S.S3.map((x) => Object.assign({}, x, { fp: undefined })) }, null, 1));

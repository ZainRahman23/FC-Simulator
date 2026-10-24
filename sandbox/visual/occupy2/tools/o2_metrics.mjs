// occupy2/tools/o2_metrics.mjs — §20 / §21 THE MEASUREMENTS, OLD · STAGE 1 · STAGE 2, one case set, the bodies as drawn (each tick's live pose):
//   PENETRATION — every tick's deepest positive penetration per group (TORSO/PELVIS · LEGS · FEET · ARMS) and per REGION CLASS (TORSO/PELVIS ↔
//     TORSO/PELVIS · TORSO ↔ LEG · LEG ↔ LEG · FOOT ↔ BODY · ARM ↔ BODY): median / p95 / p99 / max, ticks beyond the hard limit
//   CONTINUITY — per player: the root's displacement per frame (60 Hz) that occupancy added; the root's 2nd difference per frame (acceleration)
//     and 3rd (jerk); the drawn pelvis's 2nd difference per frame; the largest correction in a tick; correction reversals on consecutive ticks
//   SUPPORT — per planted stance (a foot down): the SUPPORT CONSISTENCY ERROR = the root displacement occupancy executed while that foot stayed
//     (the distance between where the authored support foot is and where the corrected body implies it should be), committed stances apart;
//     the planted foot's drawn drift (> 3 cm in one stance = a FORCED PLANT RELEASE); the support chain's STRETCH (the drawn hip beyond the
//     planted leg's usable length from its ankle)
//   The executed displacement is read from the plan itself around each shiftPlan call (the same instrument for Stage 1 and Stage 2).
//   node o2_metrics.mjs --set review|search|moves [--modes OLD,S1,S2] [--res json] [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { CASES } from "../../vocab2/v_cases.js";
import { trialCase } from "../../tackle1/tools/t_matrix.mjs";
import { O2CASES } from "../o2_cases.js";
import { runO2 } from "../o2_run.js";
import { volumesOf, detect, OCC, GROUP } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "review"), MODES = arg("modes", "OLD,S1,S2").split(","), RESO = arg("res") ? JSON.parse(arg("res")) : undefined, DT = 1 / 240, hyp = Math.hypot;
export function setOf(SET) { const L = []; if (SET === "review") return O2CASES.slice();
  if (SET === "search") for (let i = 0; i < 100; i++) { const t0 = trialCase(i, 7); for (let q = 0; q <= 14; q++) L.push(Object.assign({}, t0, { id: `#${i}@${(q * 0.1).toFixed(1)}`, tackle: [+(q * 0.1).toFixed(2)], onlyCommitted: true })); }
  if (SET === "moves") { const MV = { BODY_FEINT: CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT"), CROQUETA: CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L") };
    for (const [name, c] of Object.entries(MV)) for (const ahead of [2.4, 3.0, 3.6, 4.2]) for (const lat of [-1.0, -0.5, 0.5, 1.0]) for (let q = 0; q <= 10; q++) L.push({ id: `${name} ${ahead}/${lat}@${(q * 0.1).toFixed(1)}`, c, def: { at: [ahead, lat], face: 180, stick: [] }, tackle: [+(q * 0.1).toFixed(1)] }); }
  return L; }
// (the commitment at t from the plan LIVE at t — never the run's last plan): a Standing Tackle owning the body, or a technique between its
// commitment and its release; a stance a planned Body Feint / Croqueta will commit on counts as committed from its landing
const MOVE = /BODY FEINT|CROQUETA/;
// (a Standing Tackle owns the body from its commitment (act.t0) to its control end — tk.owns(t) alone has no lower bound: read after the run it
// would count every tick before the tackle as committed)
export const tackleAt = (p, t) => !!(p.tk && (p.tk.acts || []).some((A) => t >= A.t0 - 1e-9 && t < A.tCtl - 1e-9));
export function committedAt(p, t) { if (tackleAt(p, t)) return "TACKLE"; const a = p.planAt(t).action; return a && a.tech && a.tCommit != null && t >= a.tCommit - 1e-9 && t < a.tRelease ? a.label : null; }
const preCommitAt = (p, t, q) => { const a = p.planAt(t).action; return !!(a && a.tech && a.tCommit != null && MOVE.test(a.label || "") && t < a.tCommit - 1e-9 && q.t1 > a.tCommit - 1e-9); };
const G4 = (A, B) => { const g = [GROUP[A], GROUP[B]]; if (g.includes("ARM")) return "ARMS"; if (g.includes("FOOT")) return "FEET"; if (g[0] === "TRUNK" && g[1] === "TRUNK") return "TRUNK"; return "LEGS"; };
const C5 = (A, B) => { const g = [GROUP[A], GROUP[B]]; if (g.includes("ARM")) return "ARM ↔ BODY"; if (g.includes("FOOT")) return "FOOT ↔ BODY"; if (g[0] === "TRUNK" && g[1] === "TRUNK") return "TORSO/PELVIS ↔ TORSO/PELVIS"; if (g[0] === "TRUNK" || g[1] === "TRUNK") return "TORSO ↔ LEG"; return "LEG ↔ LEG"; };
// one run's measurements
export function measure(env, tc, mode, res) { const E = [], GAP = { ATT: new Map(), DEF: new Map() }; const r = runO2(env, tc, mode, { res, before: (W) => {
    // (THE SUPPORT-CHAIN GAP, from the live pose itself: a planted foot's target ankle against the ankle the leg actually reaches — > 0 when the
    // body has been moved beyond what its leg can reach: a forced plant release, drawn)
    const lp = W.livePoses.bind(W); W.livePoses = () => { const L = lp(); if (!L._g) { L._g = true; for (const [pid, P] of [["ATT", L.a], ["DEF", L.d]]) { let g = 0; for (const X of ["R", "L"]) { const f = P.feet && P.feet[X]; if (!f || !f.planted) continue; const A = P.J["foot_" + X].j, T = f.ank; g = Math.max(g, hyp(A[0] - T[0], A[1] - T[1], A[2] - T[2])); } GAP[pid].set(L.k, g); } } return L; };
    if (!W.occOn) return; const sp = W.shiftPlan.bind(W); W.shiftPlan = (p, d, t, w) => { const P = p.plan, i1 = Math.min(P.n, Math.max(0, Math.round((t - P.t0) / DT)) + 1), b = [P.P[2 * i1], P.P[2 * i1 + 1]], o = sp(p, d, t, w); E.push({ k: Math.round(t / DT), pid: p.pid, d: [d[0], d[1]], e: [P.P[2 * i1] - b[0], P.P[2 * i1 + 1] - b[1]] }); return o; }; } });
  const W = r.W, k0 = Math.round(r.clip[0] / DT), k1 = Math.round(r.clip[1] / DT), legLen = (env.body && env.body.legLen) || 0.85, Lr = 0.985 * legLen, out = { id: tc.id, mode, pen4: { TRUNK: [], LEGS: [], FEET: [], ARMS: [] }, pen5: {}, hard4: { TRUNK: 0, LEGS: 0, FEET: 0, ARMS: 0 }, ord: { TRUNK: [], LEGS: [] }, com: { TRUNK: [], LEGS: [] } };
  // penetration
  for (let k = k0; k <= k1; k++) { const f = W.frames.get(k); if (!f || hyp(f.a.P[0] - f.d.P[0], f.a.P[1] - f.d.P[1]) > OCC.broad + 0.5) continue; const g4 = {}, g5 = {};
    for (const x of detect(volumesOf(f.a.J), volumesOf(f.d.J))) { if (x.pen <= 0) continue; const a = G4(x.A, x.B), b = C5(x.A, x.B); g4[a] = Math.max(g4[a] || 0, x.pen); g5[b] = Math.max(g5[b] || 0, x.pen); }
    for (const [g, v] of Object.entries(g4)) { out.pen4[g].push(+v.toFixed(4)); if (v > OCC.hard) out.hard4[g]++; } for (const [g, v] of Object.entries(g5)) (out.pen5[g] = out.pen5[g] || []).push(+v.toFixed(4));
    // (ORDINARY contact (no committed action at that tick, nor a move about to commit) vs contact with a COMMITTED action involved)
    const t = k * DT, isC = !!(committedAt(W.att, t) || committedAt(W.def, t)); for (const g of ["TRUNK", "LEGS"]) if (g4[g]) (isC ? out.com : out.ord)[g].push(+g4[g].toFixed(4)); }
  // executed occupancy displacement per tick and player
  const EX = { ATT: new Map(), DEF: new Map() }, DD = { ATT: new Map(), DEF: new Map() }; for (const x of E) { const m = EX[x.pid], q = m.get(x.k) || [0, 0]; m.set(x.k, [q[0] + x.e[0], q[1] + x.e[1]]); const n = DD[x.pid], w = n.get(x.k) || [0, 0]; n.set(x.k, [w[0] + x.d[0], w[1] + x.d[1]]); }
  out.pl = {}; for (const [pid, p, key] of [["ATT", W.att, "a"], ["DEF", W.def, "d"]]) { const o = { frameDisp: [], acc: [], jerk: [], pelvisJumps: 0, pelvisMax: 0, maxE: 0, maxD: 0, sce: [], sceC: [], scePush: [], drift: [], forced: 0, stretch: [], stretchTicks: 0, gap: [], gapTicks: 0 }; out.pl[pid] = o;
    for (const g of GAP[pid].values()) if (g > 0.005) { o.gap.push(+g.toFixed(5)); if (g > 0.02) o.gapTicks++; }
    for (const v of EX[pid].values()) o.maxE = Math.max(o.maxE, hyp(v[0], v[1])); for (const v of DD[pid].values()) o.maxD = Math.max(o.maxD, hyp(v[0], v[1]));
    // (per frame: the occupancy displacement within it, the root's 2nd and 3rd differences)
    const P = []; for (let k = k0; k <= k1; k += 4) { P.push(p.stateAt(k * DT).P); let s = [0, 0]; for (let j = k - 3; j <= k; j++) { const v = EX[pid].get(j); if (v) { s[0] += v[0]; s[1] += v[1]; } } if (s[0] || s[1]) o.frameDisp.push(+hyp(s[0], s[1]).toFixed(5)); }
    for (let i = 2; i < P.length; i++) o.acc.push(+hyp(P[i][0] - 2 * P[i - 1][0] + P[i - 2][0], P[i][1] - 2 * P[i - 1][1] + P[i - 2][1]).toFixed(5));
    for (let i = 3; i < P.length; i++) o.jerk.push(+hyp(P[i][0] - 3 * P[i - 1][0] + 3 * P[i - 2][0] - P[i - 3][0], P[i][1] - 3 * P[i - 1][1] + 3 * P[i - 2][1] - P[i - 3][1]).toFixed(5));
    let prevPel = null; const pins = {}, led = {};
    for (let k = k0; k <= k1; k++) { const f = W.frames.get(k); if (!f) { prevPel = null; continue; } const J = f[key].J, t = k * DT, PL = p.planAt(t), cm = committedAt(p, t);
      if (k % 4 === 0) { const pj = J.pelvis.j; if (prevPel && prevPel.length === 2) { const a = hyp(pj[0] - 2 * prevPel[1][0] + prevPel[0][0], pj[1] - 2 * prevPel[1][1] + prevPel[0][1], pj[2] - 2 * prevPel[1][2] + prevPel[0][2]); o.pelvisMax = Math.max(o.pelvisMax, a); if (a > 0.02) o.pelvisJumps++; prevPel = [prevPel[1], pj]; } else prevPel = prevPel ? [...prevPel, pj] : [pj]; }
      for (const X of ["R", "L"]) { const s = PL.stances[X].find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9); if (!s) { if (led[X]) { const L = led[X]; (L.c ? o.sceC : o.sce).push(+(L.c ? L.cmax : L.max).toFixed(5)); o.scePush.push(+L.pmax.toFixed(5)); o.drift.push(+pins[X].max.toFixed(5)); if (pins[X].max > 0.03) o.forced++; } led[X] = null; pins[X] = null; continue; }
        const key2 = X + s.id + "@" + s.t0.toFixed(4), toe = J["toe_" + X].j; if (!led[X] || led[X].key !== key2) { if (led[X]) { const L = led[X]; (L.c ? o.sceC : o.sce).push(+(L.c ? L.cmax : L.max).toFixed(5)); o.scePush.push(+L.pmax.toFixed(5)); o.drift.push(+pins[X].max.toFixed(5)); if (pins[X].max > 0.03) o.forced++; } led[X] = { key: key2, v: [0, 0], pv: [0, 0], cv: [0, 0], max: 0, pmax: 0, cmax: 0, c: false }; pins[X] = { p: toe.slice(), max: 0 }; }
        const L = led[X], cNow = !!cm || preCommitAt(p, t, s); if (cNow) L.c = true; const e = EX[pid].get(k), d = DD[pid].get(k); if (e) { L.v[0] += e[0]; L.v[1] += e[1]; L.max = Math.max(L.max, hyp(L.v[0], L.v[1])); if (cNow) { L.cv[0] += e[0]; L.cv[1] += e[1]; L.cmax = Math.max(L.cmax, hyp(L.cv[0], L.cv[1])); } } if (d) { L.pv[0] += d[0]; L.pv[1] += d[1]; L.pmax = Math.max(L.pmax, hyp(L.pv[0], L.pv[1])); }
        pins[X].max = Math.max(pins[X].max, hyp(toe[0] - pins[X].p[0], toe[1] - pins[X].p[1]));
        const H = J["thigh_" + X].j, A = J["foot_" + X].j, st = hyp(H[0] - A[0], H[1] - A[1], H[2] - A[2]) - Lr; if (st > 0) { o.stretch.push(+st.toFixed(5)); if (st > 0.01) o.stretchTicks++; } } }
    for (const X of ["R", "L"]) if (led[X]) { const L = led[X]; (L.c ? o.sceC : o.sce).push(+(L.c ? L.cmax : L.max).toFixed(5)); o.scePush.push(+L.pmax.toFixed(5)); o.drift.push(+pins[X].max.toFixed(5)); if (pins[X].max > 0.03) o.forced++; } }
  // correction reversals (the relative correction reversing on consecutive ticks)
  out.reversals = 0; if (W.occ && W.occOn) { let prev = null; for (const x of W.occ.log) { const rr = x.r || [0, 0], m = hyp(rr[0], rr[1]); if (prev && m > 5e-4 && hyp(prev[0], prev[1]) > 5e-4 && rr[0] * prev[0] + rr[1] * prev[1] < 0) out.reversals++; prev = m > 5e-4 ? rr : null; } out.unresolved = W.occ.unresolved || null; }
  W.frames = null; return out; }
const q = (A, p) => { if (!A.length) return 0; const s = Float64Array.from(A).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }, amax = (A) => A.reduce((m, x) => (x > m ? x : m), 0), cm = (v) => (v * 100).toFixed(1);
export function summarize(R) { const S = {}; for (const m of Object.keys(R)) { const L = R[m], cat = (f) => L.flatMap(f); const s = { pen4: {}, pen5: {}, hard4: {} };
    for (const g of ["TRUNK", "LEGS", "FEET", "ARMS"]) { const A = cat((x) => x.pen4[g]); s.pen4[g] = { n: A.length, med: q(A, 0.5), p95: q(A, 0.95), p99: q(A, 0.99), max: amax(A) }; s.hard4[g] = L.reduce((a, x) => a + x.hard4[g], 0); }
    for (const c of ["TORSO/PELVIS ↔ TORSO/PELVIS", "TORSO ↔ LEG", "LEG ↔ LEG", "FOOT ↔ BODY", "ARM ↔ BODY"]) { const A = cat((x) => x.pen5[c] || []); s.pen5[c] = { n: A.length, med: q(A, 0.5), p95: q(A, 0.95), p99: q(A, 0.99), max: amax(A), over5: A.filter((v) => v > OCC.hard).length }; }
    s.split = {}; for (const w of ["ord", "com"]) for (const g of ["TRUNK", "LEGS"]) { const A = cat((x) => x[w][g]); s.split[w + g] = { n: A.length, p95: q(A, 0.95), max: amax(A), over5: A.filter((v) => v > OCC.hard).length }; }
    const P = cat((x) => [x.pl.ATT, x.pl.DEF]), cc = (f) => P.flatMap(f);
    s.cont = { frameDispP99: q(cc((o) => o.frameDisp), 0.99), frameDispMax: amax(cc((o) => o.frameDisp)), accOver1cm: cc((o) => o.acc).filter((v) => v > 0.01).length, accOver2cm: cc((o) => o.acc).filter((v) => v > 0.02).length, accOver4cm: cc((o) => o.acc).filter((v) => v > 0.04).length, accMax: amax(cc((o) => o.acc)), accP99: q(cc((o) => o.acc), 0.99), jerkOver1cm: cc((o) => o.jerk).filter((v) => v > 0.01).length, jerkMax: amax(cc((o) => o.jerk)), pelvisJumps: P.reduce((a, o) => a + o.pelvisJumps, 0), pelvisMax: amax(P.map((o) => o.pelvisMax)), maxE: amax(P.map((o) => o.maxE)), maxD: amax(P.map((o) => o.maxD)), reversals: L.reduce((a, x) => a + (x.reversals || 0), 0) };
    const sce = cc((o) => o.sce), sceC = cc((o) => o.sceC), push = cc((o) => o.scePush), drift = cc((o) => o.drift), str = cc((o) => o.stretch);
    const gp = cc((o) => o.gap); s.sup = { gapTicks: P.reduce((a, o) => a + o.gapTicks, 0), gapMax: amax(gp), gapP99: q(gp, 0.99), stances: sce.length + sceC.length, sceP99: q(sce, 0.99), sceMax: amax(sce), sceCommitted: sceC.length, sceCP99: q(sceC, 0.99), sceCMax: amax(sceC), pushMax: amax(push), driftMax: amax(drift), forced: P.reduce((a, o) => a + o.forced, 0), stretchTicks: P.reduce((a, o) => a + o.stretchTicks, 0), stretchMax: amax(str) };
    const U = {}; for (const x of L) if (x.unresolved) for (const [k, v] of Object.entries(x.unresolved)) U[k] = (U[k] || 0) + v; s.unresolved = U; S[m] = s; } return S; }
export function printSummary(S, title) { const M = Object.keys(S), col = (f) => M.map((m) => String(f(S[m])).padStart(24)).join("");
  console.log(`\n${title}`); console.log(`${"".padEnd(58)}${M.map((m) => m.padStart(24)).join("")}`);
  console.log("PENETRATION (cm: median / p95 / p99 / max · ticks > 5 cm)");
  for (const g of ["TRUNK", "LEGS", "FEET", "ARMS"]) console.log(`  ${(g === "TRUNK" ? "TORSO / PELVIS" : g).padEnd(60)}${col((s) => `${cm(s.pen4[g].med)}/${cm(s.pen4[g].p95)}/${cm(s.pen4[g].p99)}/${cm(s.pen4[g].max)}`)}\n  ${"   ticks > 5 cm".padEnd(60)}${col((s) => s.hard4[g])}`);
  for (const c of ["TORSO/PELVIS ↔ TORSO/PELVIS", "TORSO ↔ LEG", "LEG ↔ LEG", "FOOT ↔ BODY", "ARM ↔ BODY"]) console.log(`  ${("class " + c).padEnd(60)}${col((s) => `${cm(s.pen5[c].p95)}/${cm(s.pen5[c].max)} ·${s.pen5[c].over5}`)}`);
  for (const [w, lab] of [["ord", "ORDINARY contact"], ["com", "COMMITTED action involved"]]) for (const g of ["TRUNK", "LEGS"]) console.log(`  ${(lab + " · " + (g === "TRUNK" ? "torso/pelvis" : "legs") + ": p95 / max ·>5 cm").padEnd(60)}${col((s) => `${cm(s.split[w + g].p95)}/${cm(s.split[w + g].max)} ·${s.split[w + g].over5}`)}`);
  console.log("CONTINUITY (per frame = 4 ticks)");
  for (const [l, f] of [["occupancy's root displacement per frame p99 / max (cm)", (s) => `${cm(s.cont.frameDispP99)}/${cm(s.cont.frameDispMax)}`], ["root acceleration: frames > 1 / 2 / 4 cm per frame²", (s) => `${s.cont.accOver1cm}/${s.cont.accOver2cm}/${s.cont.accOver4cm}`], ["   the largest (cm per frame²) · p99", (s) => `${cm(s.cont.accMax)} · ${cm(s.cont.accP99)}`], ["root jerk: frames > 1 cm per frame³ · the largest", (s) => `${s.cont.jerkOver1cm} · ${cm(s.cont.jerkMax)}`], ["drawn pelvis acceleration: frames > 2 cm per frame² · largest", (s) => `${s.cont.pelvisJumps} · ${cm(s.cont.pelvisMax)}`], ["the largest correction in a tick: executed / pushed (cm)", (s) => `${cm(s.cont.maxE)}/${cm(s.cont.maxD)}`], ["correction reversals on consecutive ticks", (s) => s.cont.reversals]]) console.log(`  ${l.padEnd(60)}${col(f)}`);
  console.log("SUPPORT (per planted stance)");
  for (const [l, f] of [["planted stances measured", (s) => s.sup.stances], ["SUPPORT CONSISTENCY ERROR, ordinary stances p99 / max (cm)", (s) => `${cm(s.sup.sceP99)}/${cm(s.sup.sceMax)}`], ["   … of which pushed (position corrections) max (cm)", (s) => cm(s.sup.pushMax)], ["SUPPORT CONSISTENCY ERROR, COMMITTED part (n) p99 / max", (s) => `(${s.sup.sceCommitted}) ${cm(s.sup.sceCP99)}/${cm(s.sup.sceCMax)}`], ["planted foot drift, the largest (cm)", (s) => cm(s.sup.driftMax)], ["FORCED PLANT RELEASES (a planted foot drifting > 3 cm)", (s) => s.sup.forced], ["support-chain stretch: ticks > 1 cm · the largest (cm)", (s) => `${s.sup.stretchTicks} · ${cm(s.sup.stretchMax)}`], ["planted leg short of its plant (drawn; canonical in OLD): ticks > 2 cm", (s) => s.sup.gapTicks], ["   the largest (cm)", (s) => cm(s.sup.gapMax)]]) console.log(`  ${l.padEnd(60)}${col(f)}`);
  for (const m of M) if (Object.keys(S[m].unresolved).length) console.log(`  ${m} unresolved ticks: ${Object.entries(S[m].unresolved).map(([k, v]) => `${k} ${v}`).join(" · ")}`); }
if (process.argv[1] && process.argv[1].endsWith("o2_metrics.mjs")) {
  const L = setOf(SET), R = {}; for (const m of MODES) R[m] = []; let n = 0;
  for (const tc of L) { if (tc.onlyCommitted) { const p = runO2(ENV, tc, "OLD", { record: false }); if (!p.W.tk.act) continue; } n++; for (const m of MODES) R[m].push(measure(ENV, tc, m, m === "S2" ? RESO : undefined)); if (n % 20 === 0) process.stderr.write(`${n} `); }
  const S = summarize(R); printSummary(S, `SET "${SET}" — ${n} encounters · ${MODES.join(" · ")} (the bodies as drawn)`);
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ SET, n, S, per: Object.fromEntries(MODES.map((m) => [m, R[m].map((x) => ({ id: x.id, hard4: x.hard4, unresolved: x.unresolved || null, max: Math.max(0, ...Object.values(x.pen4).flat()), sceMax: Math.max(0, ...[x.pl.ATT, x.pl.DEF].flatMap((o) => o.sce)), sceCMax: Math.max(0, ...[x.pl.ATT, x.pl.DEF].flatMap((o) => o.sceC)) }))])) }, null, 0)); }

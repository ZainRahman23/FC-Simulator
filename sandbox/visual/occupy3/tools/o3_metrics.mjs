// occupy3/tools/o3_metrics.mjs — §17 / §18 THE MEASUREMENTS, STAGE 2 (as decided) · STAGE 3, one case set, the bodies as drawn (each tick's live pose).
// Per case and stage: the deepest torso / leg penetration; the PLANTED-FOOT ERROR (a planted foot's drawn ball of the foot against where it landed —
// a foot sliding to resolve a collision; and Stage 2's support consistency error of committed stances); and for Stage 3's impact episodes, per player:
// the root's displacement by the impact, the drawn pelvis's, the trunk lean, the rotation (chest, pelvis), the bodies' closing speed before / after,
// the support state at onset, the recovery steps (where, how far from where the foot would have landed), the time to regain balance, the action's
// outcome, the decisive touch made or denied, the possession outcome, the severity (σ and its band), whether Stage 3 intervened at all.
// THE QUALITY CHECKS (both stages, the same instruments): visible ROOT JOLTS (the drawn pelvis's acceleration per 60 Hz frame), KNEE / FOOT
// DISCONTINUITIES (a knee / an ankle / a toe moving > 4 cm in one tick), CROSSED LEGS (the feet across each other's line by > 5 cm), GROUND
// PENETRATION (a toe / an ankle below the turf), IMPOSSIBLE JOINT SPEEDS (a joint > 15 m/s, a knee folding > 2000 °/s), PING-PONG (the impulse on a
// player reversing along the normal within an episode), STUCK (a player asking to move who does not, ≥ 1 s).
//   node o3_metrics.mjs --set review|matrix|search|moves [--json f] [--imp json]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { setOf } from "./o3_identity.mjs";
import { runO3, outcomeO3 } from "../o3_run.js";
import "../o3_world.js";
import { actionState } from "../o3_facts.js";
import { volumesOf, detect, GROUP, OCC } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "matrix"), IMP = arg("imp") ? JSON.parse(arg("imp")) : undefined, DT = 1 / 240, hyp = Math.hypot;
const DEGF = 180 / Math.PI, r3 = (x) => (x == null ? null : +x.toFixed(3));
const kneeAngle = (J, X) => { const h = J["thigh_" + X].j, k = J["shin_" + X].j, a = J["foot_" + X].j, u = [h[0] - k[0], h[1] - k[1], h[2] - k[2]], v = [a[0] - k[0], a[1] - k[1], a[2] - k[2]], c = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (hyp(...u) * hyp(...v) || 1); return Math.acos(Math.max(-1, Math.min(1, c))) * DEGF; };
export function measure(tc, mode, imp = IMP) { const live = new Map(); const R = runO3(ENV, tc, mode, { record: true, imp, onTick: (W) => { const t = W.att.t; live.set(W.k, { a: W.att.stateAt(t), d: W.def.stateAt(t), req: [W.att.req, W.def.req], pa: W.att.planAt(t), pd: W.def.planAt(t), on: W.ps ? [W.ps.get(W.att).active, W.ps.get(W.def).active] : [false, false] }); } }), W = R.W;
  const k0 = Math.round(R.clip[0] / DT), k1 = Math.round(R.clip[1] / DT), o = { id: tc.id, mode, torso: 0, legs: 0, ticks5: 0, footSlide: 0, footSlideAt: null, jolt: { f1: 0, f2: 0, f4: 0, max: 0 }, disc: 0, discMax: 0, crossed: 0, ground: 0, jointV: 0, kneeRate: 0, stuck: 0 };
  // (per tick: penetration; the planted feet's balls against their landing; the joints' jumps; crossed legs; the turf)
  const land = { a: {}, d: {} }; let prev = null; const pel = { a: [], d: [] };
  for (let k = k0; k <= k1; k++) { const F = W.frames.get(k), q = live.get(k); if (!F || !q) continue; const t = k * DT;
    const P = detect(volumesOf(F.a.J), volumesOf(F.d.J), { within: 0 }).filter((x) => x.both); let m5 = false; for (const x of P) { const tr = GROUP[x.A] === "TRUNK" && GROUP[x.B] === "TRUNK"; if (tr) o.torso = Math.max(o.torso, x.pen); else o.legs = Math.max(o.legs, x.pen); if (x.pen > OCC.hard) m5 = true; } if (m5) o.ticks5++;
    for (const [ck, p, plan] of [["a", W.att, q.pa], ["d", W.def, q.pd]]) { const J = F[ck].J;
      for (const X of ["R", "L"]) { const st = plan.stances[X].find((s) => s.t0 <= t + 1e-9 && s.t1 > t + 1e-9), key = X, ball = J["toe_" + X].j;
        // (the ball of the foot (the toe joint) of a planted foot WHILE IT IS ON THE TURF (the drawn toe joint within 5 cm of the ground: the canonical
        // body lifts a planted foot's heel and, at times, the whole foot before the plan's stance ends — those ticks are not a slide), from its first
        // grounded tick in that stance — a heel rise pivots about it; a slide moves it)
        // (and once the foot has ARRIVED at its stance — the drawn ankle within 3 cm of the stance's place: a re-plan that moves a landing has the
        // canonical body blend the foot there over 0.12 s, along the turf — Stage 2's own behaviour, not a collision's)
        if (!st || ball[2] > 0.05) { land[ck][key] = null; continue; } const an = J["foot_" + X].j; if ((!land[ck][key] || land[ck][key].id !== st.id) && st.pos && hyp(an[0] - st.pos[0], an[1] - st.pos[1]) > 0.03) { land[ck][key] = null; continue; }
        if (!land[ck][key] || land[ck][key].id !== st.id) land[ck][key] = { id: st.id, p: ball.slice(), k }; else if (k - land[ck][key].k > 3) { const d = hyp(ball[0] - land[ck][key].p[0], ball[1] - land[ck][key].p[1]); if (d > o.footSlide) { o.footSlide = d; o.footSlideAt = { t: r3(t - R.t0), who: ck === "a" ? "ATT" : "DEF", X }; } } }
      for (const nm of ["foot_R", "foot_L", "toe_R", "toe_L"]) if (J[nm].j[2] < -0.01 || J[nm].t[2] < -0.015) o.ground++;
      // (crossed: the feet across each other's line — the left foot to the right of the right one by > 5 cm in the pelvis frame)
      { const s = ck === "a" ? q.a : q.d, r = [-Math.sin(s.psi), Math.cos(s.psi)], lat = (J.foot_R.j[0] - J.foot_L.j[0]) * r[0] + (J.foot_R.j[1] - J.foot_L.j[1]) * r[1]; if (lat < -0.05) { o.crossed++; if (q.on[ck === "a" ? 0 : 1]) o.crossedOn = (o.crossedOn || 0) + 1; } }
      pel[ck].push([k, J.pelvis.j.slice()]);
      if (prev) { const Jp = prev[ck]; for (const nm of ["shin_R", "shin_L", "foot_R", "foot_L", "toe_R", "toe_L"]) { const d = hyp(J[nm].j[0] - Jp[nm].j[0], J[nm].j[1] - Jp[nm].j[1], J[nm].j[2] - Jp[nm].j[2]); if (d / DT > 15) o.jointV++; if (d > 0.04) o.disc++; o.discMax = Math.max(o.discMax, d); }
        for (const X of ["R", "L"]) { const r = Math.abs(kneeAngle(J, X) - kneeAngle(Jp, X)) / DT; if (r > 2000) o.kneeRate++; } } }
    prev = { a: F.a.J, d: F.d.J }; }
  // (the drawn pelvis's acceleration per 60 Hz frame (every 4 ticks): the jolt a viewer sees)
  for (const ck of ["a", "d"]) { const A = pel[ck].filter(([k]) => k % 4 === 0); for (let i = 2; i < A.length; i++) { const [, p0] = A[i - 2], [, p1] = A[i - 1], [, p2] = A[i], acc = hyp(p2[0] - 2 * p1[0] + p0[0], p2[1] - 2 * p1[1] + p0[1]); if (acc > 0.01) o.jolt.f1++; if (acc > 0.02) o.jolt.f2++; if (acc > 0.04) o.jolt.f4++; o.jolt.max = Math.max(o.jolt.max, acc); } }
  // (stuck: a player whose request asks to move (a heading) but whose root moves < 0.1 m over a whole second, after the run-up)
  for (const key of ["a", "d"]) { let run = 0; for (let k = Math.max(k0, Math.round(R.t0 / DT)); k + 240 <= k1; k += 24) { const q0 = live.get(k), q1 = live.get(k + 240); if (!q0 || !q1) continue; const ask = (key === "a" ? q0.req[0] : q0.req[1]); if (!ask || ask.h == null) continue; const mv = hyp(q1[key].P[0] - q0[key].P[0], q1[key].P[1] - q0[key].P[1]); if (mv < 0.1) run++; } if (run) o.stuck += run; }
  o.out = outcomeO3(W); o.outKind = o.out ? o.out.kind : null; o.poss = W.auth.log.length ? W.auth.log[W.auth.log.length - 1].to : "FREE";
  // (the decisive touches: the moves' and the tackle's, made / denied / missed)
  o.decisive = []; for (const c of W.att.contacts) if (c.decisive) o.decisive.push({ t: r3(c.t - R.t0), made: !c.missed, why: c.impact || (c.blocked ? "blocked" : c.missed ? "missed" : null) }); if (W.tk && W.tk.act) { const A = W.tk.act; o.decisive.push({ t: r3(A.t0 + A.M.tc - R.t0), tackle: true, made: A.hits.length > 0, why: A.impBlocked ? "denied (the displaced hips)" : A.hits.length ? null : "no ball contact" }); }
  // (Stage 3's episodes, per player; the bodies' closing speed before (onset) and 0.2 s after; ping-pong: the impulse along the onset normal reversing)
  o.eps = []; if (W.imp) { const log = new Map(W.imp.log.map((x) => [x.k, x]));
    for (const e of W.imp.episodes) { const n = e.onset ? e.onset.contact.normal : null, kA = e.kA, after = live.get(kA + 48), q0 = live.get(kA); let closeAfter = null;
      if (n && after && q0) { const sa = W.att.stateAt((kA + 48) * DT), sd = W.def.stateAt((kA + 48) * DT), rA = log.get(kA + 48), uA = rA && rA.p && rA.p[0] ? rA.p[0].u : [0, 0], uD = rA && rA.p && rA.p[1] ? rA.p[1].u : [0, 0]; closeAfter = r3(((sd.V[0] + uD[0]) - (sa.V[0] + uA[0])) * n[0] + ((sd.V[1] + uD[1]) - (sa.V[1] + uA[1])) * n[1]); }
      // (the impulse on a player along the onset normal changing sign: a SIDE CHANGE (the bodies passing, the contact now on the other side) — counted;
      // PING-PONG is the rapid kind: two reversals within 0.25 s)
      const pp = { ATT: 0, DEF: 0 }, sides = { ATT: 0, DEF: 0 }; if (n) for (const [i, key] of [[0, "ATT"], [1, "DEF"]]) { let sgn = 0; const ft = []; for (let k = e.k0; k <= (e.t1 != null ? Math.round(e.t1 / DT) : k1); k++) { const x = log.get(k); if (!x || !x.p || !x.p[i] || !x.p[i].J) continue; const j = x.p[i].J[0] * n[0] + x.p[i].J[1] * n[1]; if (Math.abs(j) < 0.05) continue; const s = Math.sign(j); if (sgn && s !== sgn) ft.push(k * DT); sgn = s; }
        sides[key] = ft.length; for (let q = 1; q < ft.length; q++) if (ft[q] - ft[q - 1] < 0.25) pp[key]++; }
      const st = e.onset ? [actionState(W, W.att, e.t0), actionState(W, W.def, e.t0)] : [null, null];
      // (each player's ROOT DISPLACEMENT BY THE IMPACT: the sum of the root shifts Stage 3 realised over the episode — net, and the largest reached — and
      // his SUPPORT STATE at onset)
      const phys = {}; for (const [i, key] of [[0, "ATT"], [1, "DEF"]]) { let sx = 0, sy = 0, mx = 0, sup = null; for (let k = e.k0; k <= (e.t1 != null ? Math.round(e.t1 / DT) : k1); k++) { const x = log.get(k); if (!x || !x.p || !x.p[i]) continue; if (sup == null && x.p[i].state) sup = x.p[i].state; if (x.p[i].root) { sx += x.p[i].root[0]; sy += x.p[i].root[1]; mx = Math.max(mx, Math.hypot(sx, sy)); } }
        phys[key] = { rootNet: r3(Math.hypot(sx, sy)), rootMax: r3(mx), support: sup }; }
      o.eps.push({ n: e.n, t0: r3(e.t0 - R.t0), dur: e.dur, why: e.why, regions: e.onset && e.onset.contact.regions, closing: e.onset && e.onset.contact.closing, closeAfter, tangential: e.onset && e.onset.contact.tangential, onATT: e.onset && e.onset.contact.onATT, onDEF: e.onset && e.onset.contact.onDEF,
        act: st.map((a) => a && (a.kind === "ORDINARY" ? "ordinary" : `${a.label} ${a.phase}`)), pingpong: pp, sides, phys, players: e.players }); } }
  o.events = W.imp ? W.imp.events.map((e) => ({ t: r3(e.t - R.t0), who: e.who, kind: e.kind, why: e.why })) : []; o.t0 = R.t0; return o; }
if (process.argv[1] && process.argv[1].endsWith("o3_metrics.mjs")) {
  const L = setOf(SET), rows = [];
  for (const tc of L) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; } rows.push({ id: tc.id, group: tc.group, S2D: measure(tc, "S2D"), S3: measure(tc, "S3") }); process.stderr.write("."); }
  const cm = (v) => (v * 100).toFixed(1), agg = (m, f) => rows.reduce((a, r) => a + f(r[m]), 0), mx = (m, f) => Math.max(0, ...rows.map((r) => f(r[m])));
  console.log(`\n§17 / §18 THE MEASUREMENTS — set ${SET} (${rows.length} encounters), STAGE 2 (as decided) · STAGE 3, the bodies as drawn`);
  console.log(`${"".padEnd(44)}${"STAGE 2".padStart(12)}${"STAGE 3".padStart(12)}`);
  for (const [nm, f, k] of [["deepest torso penetration (cm)", (o) => o.torso, "max"], ["deepest leg penetration (cm)", (o) => o.legs, "max"], ["ticks with a pair > 5 cm", (o) => o.ticks5, "sum"], ["planted ball-of-foot slide on the turf, largest (cm)", (o) => o.footSlide, "max"],
    ["pelvis jolts per frame > 1 / 2 / 4 cm", (o) => o.jolt.f1, "sum3"], ["largest pelvis jolt (cm per frame²)", (o) => o.jolt.max, "max"], ["knee / foot jumps > 4 cm in a tick", (o) => o.disc, "sum"], ["largest knee / foot jump in a tick (cm)", (o) => o.discMax, "max"],
    ["crossed-legs ticks (feet across > 5 cm)", (o) => o.crossed, "sum"], ["  of them while Stage 3 acts on that player", (o) => o.crossedOn || 0, "sum"], ["turf penetration ticks", (o) => o.ground, "sum"], ["joint > 15 m/s (ticks × joints)", (o) => o.jointV, "sum"], ["knee folding > 2000 °/s", (o) => o.kneeRate, "sum"], ["stuck seconds (asking, not moving)", (o) => o.stuck / 10, "sum"]]) {
    const v = (m) => k === "max" ? cm(mx(m, f)) : k === "sum3" ? `${agg(m, (o) => o.jolt.f1)}/${agg(m, (o) => o.jolt.f2)}/${agg(m, (o) => o.jolt.f4)}` : String(+agg(m, f).toFixed(1)); console.log(`${nm.padEnd(44)}${v("S2D").padStart(12)}${v("S3").padStart(12)}`); }
  const E = rows.flatMap((r) => r.S3.eps.map((e) => Object.assign({ id: r.id }, e))), P = E.flatMap((e) => ["ATT", "DEF"].filter((k) => e.players[k]).map((k) => Object.assign({ id: e.id, key: k, e }, e.players[k])));
  const count = (f) => { const m = {}; for (const x of P) { const v = f(x); m[v] = (m[v] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${b}`).join(" · "); };
  console.log(`\nSTAGE 3 INTERVENED in ${rows.filter((r) => r.S3.eps.length).length} / ${rows.length} encounters · ${E.length} impact episodes · ${P.length} player responses`);
  console.log(`  severity  ${count((x) => x.sev)}`); console.log(`  balance   ${count((x) => x.cls)}`); console.log(`  action    ${count((x) => x.outcome)}`);
  console.log(`  PING-PONG (the impulse along the normal reversing twice within 0.25 s): ${E.filter((e) => e.pingpong.ATT || e.pingpong.DEF).length} episodes · slower side changes (the bodies passing, the contact on the other side): ${E.reduce((a, e) => a + e.sides.ATT + e.sides.DEF, 0)} in ${E.filter((e) => e.sides.ATT || e.sides.DEF).length} episodes`);
  const tb = rows.flatMap((r) => r.S3.events.filter((e) => /LEG BLOCKED/.test(e.kind))); console.log(`  SWINGING LEG BLOCKED (trip risk, instrumented): ${tb.length} · of them becoming fall candidates (the stepping foot blocked): ${rows.flatMap((r) => r.S3.events.filter((e) => e.kind === "UNRESOLVED FALL CANDIDATE" && /TRIP/.test(e.why))).length}`);
  const st = P.flatMap((x) => x.steps); console.log(`  recovery steps ${st.length} (landed ${st.filter((s) => s.landed).length}) · adjustment median ${st.length ? cm(st.map((s) => s.d).sort((a, b) => a - b)[Math.floor(st.length / 2)]) : "—"} cm · largest ${st.length ? cm(Math.max(...st.map((s) => s.d))) : "—"} cm`);
  const rg = P.filter((x) => x.regainAfter != null).map((x) => x.regainAfter).sort((a, b) => a - b); console.log(`  balance regained ${rg.length} / ${P.length} · median ${rg.length ? rg[Math.floor(rg.length / 2)].toFixed(2) : "—"} s · longest ${rg.length ? rg[rg.length - 1].toFixed(2) : "—"} s · fall candidates ${P.filter((x) => x.fall).length}`);
  // (MIRRORS: each case against its mirror — per episode and player the severity band, the balance outcome, the action outcome, the steps)
  { let n = 0, same = 0; const diff = []; for (const r of rows) { const m = rows.find((x) => x.id === r.id + "-m"); if (!m) continue; n++; const sig = (o) => JSON.stringify(o.S3.eps.map((e) => ["ATT", "DEF"].map((k) => e.players[k] ? [e.players[k].sev, e.players[k].cls, e.players[k].outcome, e.players[k].steps.length] : null)));
      if (sig(r) === sig(m)) same++; else diff.push(r.id); }
    if (n) console.log(`  MIRRORS: ${same} / ${n} cases respond identically to their mirror (severity, balance, action, steps per player and episode)${diff.length ? " · differ: " + diff.join(", ") : ""}`); }
  console.log(`\nPER ENCOUNTER (Stage 3): torso / legs cm (Stage 2 → 3) · impacts · per player: severity σ · balance · action · Δv · root / pelvis cm · lean° · rotation° · steps · regained`);
  for (const r of rows) { const a = r.S2D, b = r.S3; console.log(`${r.id.slice(0, 26).padEnd(27)}torso ${cm(a.torso)} → ${cm(b.torso)} · legs ${cm(a.legs)} → ${cm(b.legs)} · foot ${cm(b.footSlide)} · ${b.eps.length} impact${b.eps.length === 1 ? "" : "s"}${a.outKind || b.outKind ? ` · tackle ${a.outKind} → ${b.outKind}` : ""}`);
    for (const e of b.eps) { console.log(`    #${e.n} ${e.t0.toFixed(2)} ${e.regions} closing ${e.closing} → ${e.closeAfter} m/s · ${e.act.join(" | ")}`);
      for (const k of ["ATT", "DEF"]) { const q = e.players[k]; if (q) console.log(`       ${k} ${q.sev} σ ${q.sigma} · ${q.cls} · ${q.outcome} · Δv ${q.du} · root ${e.phys && e.phys[k] ? cm(e.phys[k].rootMax) : "—"} · pelvis ${cm(q.peakP)} · lean ${q.peakLean} · rot ${q.peakYaw} · ${q.steps.length ? q.steps.map((s) => `${s.X} ${cm(s.d)}`).join(",") : "no step"} · ${q.regainAfter != null ? "regained " + q.regainAfter + " s" : q.fall ? "FALL CANDIDATE" : "not regained"}`); } } }
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(rows.map((r) => ({ id: r.id, group: r.group, S2D: Object.assign({}, r.S2D, { events: undefined }), S3: r.S3 })), null, 0));
}

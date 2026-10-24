// ═══ occupy1/o_world.js — PLAYER OCCUPANCY V1 (Stage 1 only): two footballers no longer pass through each other or reach the ball through
// each other's body. Shared Possession + Reaction V1's world (possess1/, unchanged; Reaction MEDIUM 0.200 s) + one OCCUPANCY PASS per tick:
//   DETECTION (o_volumes.js): both bodies POSED LIVE at the tick just simulated (PlayBody — the real animated body; only while the two roots
//     are within the broad phase, 1.9 m), every pair of occupancy volumes: the gap, the separating direction, the regions. Detection moves
//     nothing (Stage 2's contact response will read the same manifold)
//   RESOLUTION: the MINIMUM relative ROOT correction (horizontal) that keeps every resolved pair within the CONTACT TOLERANCE (2 cm) — one 2-D
//     minimum-norm problem over all the pairs at once (no alternating between pairs); a closing gap approaches the tolerance in ≈ 7 ticks; a
//     pair with a leg is corrected gently within the 5 cm hard limit, firmly beyond it; ≤ 3 cm per tick. The SPLIT is kinematic, never
//     strength: the player moving INTO the other and with FEWER PLANTED FEET takes more; a STILL player (both feet planted) none while the other
//     can give way; a COMMITTED action (Standing Tackle while it owns the body; a Body Feint / Croqueta between commitment and release) is not
//     moved — its authored world placement stands, its footholds are its own, the other gives way; a Body Feint / Croqueta still AHEAD in the
//     plan is placed, never reshaped (a correction before its commitment is held through it; its steps are its own); BOTH committed: a
//     CONFLICT — split by the kinematics, root only, within the support budget, counted and reported
//   THE SOFT WALL (softWall): within 30 cm the two PLANNED root paths, read relative to each other, are walked against a virtual disk fitted to
//     the closest pair and shrinking to the tolerance (τ = 0.06 s) — and only when the free relative path would touch: a head-on path
//     decelerates into the contact, a passing or near-missing path is untouched —
//     no force field; it only ever removes a player's own velocity toward the other — no momentum is given to anyone
//   SUPPORT: a planted foot never moves (no plant slide); over one stance the root moves at most 18 cm from where that stance found it (the
//     body leans over its support, it never splays) — what neither player's support can take stays as overlap: UNRESOLVED · PLANTED SUPPORT
//   APPLICATION (shiftPlan): the correction moves the ROOT PATH from this tick on and the FUTURE footholds (their swings' technique frames,
//     the contact aims) with it; joint animation is never edited — the posed body follows its root; footholds of an ordinary gait that would
//     land on the opponent's planted foot or swing through his legs are moved clear / shortened
//   BALL ACCESS (gates on each player's contacts and on the tackle's boot): a ball contact whose playing leg (foot, shin, thigh) is inside the
//     opponent's body (pelvis, waist, chest, thighs, shins) by more than the HARD LIMIT at the contact or in the 0.1 s before it is BLOCKED —
//     the canonical miss (a touch) / no impulse (the boot). Reaching AROUND the body stays possible; feet meeting feet at the ball stay possible
//   UNRESOLVED: a tick still beyond the hard limit is reported with the reason root placement cannot fix it — never hidden, never fixed by
//     bending an animation
// NOT HERE (Stage 2 / 3): momentum, braking, deflection, strength, shielding, shoulder challenges, stumbles, trips, fouls, falls.
import { SharedWorld } from "../possess1/p_world.js";
import { PlayBody } from "../vocab2/u_body.js";
import { volumesOf, detect, legThrough, segClosest, OCC, RESOLVED } from "./o_volumes.js";
const DT = 1 / 240, hyp = Math.hypot;
export const RES = { swingClear: true, spread: 1, urgent: 0, jerk: 1, legTol: 0.02, legAlpha: 0.15, legCap: 0.03, tau: 0.06, skin: 0.08, zone: 0.3, wallOpen: 0.5, alpha: 0.15, recover: 0.006, rMax: 0.03, wallH: 1.0, eps: 0.25, hMin: 0.35, access: 24, effMin: 0.45, effLeg: 0.1, lowCap: 0.012, footClear: 0.12, look: 0, still: 0.15, stanceCap: 0.18, wallGate: 0 };
// THE PARAMETERS — tol / hard (o_volumes.js OCC): the contact tolerance 2 cm, the hard limit 5 cm.
//   rMax: the relative root correction per tick at most (3 cm = 7.2 m/s) · alpha: the share of the remaining gap a closing pair may close per
//   tick (≈ 7 ticks to the tolerance) · recover: how fast a pair deeper than the tolerance is pushed out (0.6 cm per tick) · legTol / legAlpha /
//   legCap: a pair with a thigh or shin — limbs swing far faster than a body may be pushed — corrected gently (≤ 3 cm per tick) within the hard
//   limit · skin: pairs closer than 8 cm are position-constrained · eps: the approach floor (m/s): a moving player with no approach still takes a
//   small share · still: below this speed with both feet planted a player is STILL (no share while the other can give way) · hMin: the least
//   horizontal share of a contact normal counted · effMin / lowCap / effLeg: how much of a root shift reaches the contact (a planted knee half,
//   a planted ankle none): below effMin a pair pushes no faster than lowCap (1.2 cm per tick), below effLeg (planted lower leg against planted
//   lower leg) it is a LEG CONFLICT the roots cannot separate — reported, not pushed · zone / tau / wallOpen / wallH: the soft wall — pairs
//   within 30 cm, a 0.06 s exponential approach, its gap reopening no faster than 0.5 m/s, 1 s of relative path; wallGate: it acts only when
//   the free relative path comes closer than the two radii + wallGate (0: would touch) · stanceCap: the root's reach
//   over one planted stance (18 cm) · access: the ball-access window (24 ticks, 0.1 s) · footClear: a landing ankle at least two shins' radii
//   less the tolerance from the opponent's planted ankle (0.12 m) · swingClear: a swing whose path would cross the opponent's legs is shortened
//   · spread / urgent / jerk / look: correction schedules and a look-ahead, measured and NOT adopted (spread 1 and jerk 1 = immediate; look 0
//   = off — tools/o_tradeoff.mjs, evidence/schedule_tradeoff.txt)
export class OccupancyWorld extends SharedWorld {
  // o.record: keep every tick's LIVE pose of both bodies (the body as drawn at that tick — what the solver saw; the Lab draws these, the
  // statistics are measured on these: a replay posed afterwards would draw a swing begun before a correction with its corrected foothold)
  constructor(env, o = {}) { super(env, Object.assign({ mode: "MEDIUM" }, o)); this.env = env; this.occOn = o.occupancy !== false; this.record = !!o.record;
    this.bodies = new Map(this.players.map((p) => [p, new PlayBody(env, p)])); this.gapMem = new Map(); this.queue = new Map(this.players.map((p) => [p, Array.from({ length: RES.spread }, () => [0, 0])])); this.lastD = new Map(); this.sup = new Map(); this.occ = { log: [], events: [], conflicts: 0, blocked: 0 }; this.legHist = { ATT: [], DEF: [] };
    this.frames = this.record ? new Map() : null; if (this.record) this.recordFrame();
    if (!this.occOn) return;
    // (the BALL-ACCESS gates: each player's contacts, the tackle's boot)
    for (const p of this.players) { const ex = p.execute.bind(p); p.execute = (c) => { const b = this.accessBlocked(p, c.F); if (!b) return ex(c);
        c.done = true; c.missed = true; c.blocked = b; p.contacts.push(Object.assign(p.contactRec(c, p.ball.v, p.ball.v, null), { missed: true, blocked: b })); p.flags.replan = "missed contact";
        this.occ.blocked++; this.occ.events.push({ k: this.k, t: this.k * DT, kind: "BALL ACCESS BLOCKED", who: p.pid, what: c.role || "touch", F: c.F, through: b }); }; }
    if (this.tk) { const pr = this.tk.probes.bind(this.tk); this.tk.probes = (t) => { const opp = this.att.opp, n = opp.length; pr(t); const A = this.tk.act; if (!A || opp.length === n) return;
        const b = this.accessBlocked(this.def, A.F); if (!b) return; opp.splice(n); this.occ.blocked++; if (!A.occBlocked) { A.occBlocked = []; } A.occBlocked.push(Math.round(t / DT));
        this.occ.events.push({ k: this.k, t, kind: "TACKLE BOOT BLOCKED", who: "DEF", what: A.fam, F: A.F, through: b }); }; } }
  // the playing leg inside the opponent's body (> the hard limit) now or in the access window before → the regions, else null
  accessBlocked(p, F) { const H = this.legHist[p.pid]; if (!H.length || !F) return null; const k = this.k; let worst = null;
    for (let i = H.length - 1; i >= 0 && H[i].k >= k - RES.access; i--) { const x = H[i][F]; if (x && x.pen > OCC.hard && (!worst || x.pen > worst.pen)) worst = x; }
    return worst ? { pen: +worst.pen.toFixed(3), leg: worst.A, body: worst.B } : null; }
  step(reqA, reqD) { super.step(reqA, reqD); if (this.occOn) this.occupancy(); else if (this.record) this.recordFrame(); }
  // the live poses of the present tick (posed once, shared by the occupancy pass and the record)
  livePoses() { const t = this.att.t, k = Math.round(t / DT); if (this.lp && this.lp.k === k) return this.lp; const a = this.bodies.get(this.att).pose(t), d = this.bodies.get(this.def).pose(t); this.lp = { k, a, d }; return this.lp; }
  recordFrame() { const L = this.livePoses(); this.frames.set(L.k, { a: { skin: L.a.skin, J: L.a.J, P: L.a.P }, d: { skin: L.d.skin, J: L.d.J, P: L.d.P } }); }
  // ═══ THE OCCUPANCY PASS (after both players' ticks: the bodies at the present tick) ════════════════════════════════════════════════════════
  occupancy() { const t = this.att.t, k = this.k, A = this.att, D = this.def, sa = A.stateAt(t), sd = D.stateAt(t), dist = hyp(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]);
    if (dist > OCC.broad) { if (this.gapMem.size) this.gapMem.clear(); for (const p of this.players) { const Q = this.queue.get(p), want = Q.shift(), last = this.lastD.get(p) || [0, 0]; Q.push([0, 0]);
        if (!(want[0] || want[1] || last[0] || last[1])) continue; let dx = want[0] - last[0], dy = want[1] - last[1]; const m = hyp(dx, dy); if (m > RES.jerk) { dx *= RES.jerk / m; dy *= RES.jerk / m; } const ap = [last[0] + dx, last[1] + dy]; Q[0][0] += want[0] - ap[0]; Q[0][1] += want[1] - ap[1]; this.lastD.set(p, ap); if (ap[0] || ap[1]) this.shiftPlan(p, ap, t); }
      if (this.record) this.recordFrame(); return; }
    const c0 = performance.now(), LP = this.livePoses(), JA = LP.a.J, JD = LP.d.J, va = volumesOf(JA), vd = volumesOf(JD); if (this.record) this.recordFrame();
    // (the legs' ball-access record of this tick: each leg's deepest reach into the opponent's body)
    for (const [p, mine, theirs] of [[A, va, vd], [D, vd, va]]) { const H = this.legHist[p.pid]; H.push({ k, R: legThrough(mine, theirs, "R"), L: legThrough(mine, theirs, "L") }); while (H.length > RES.access + 2) H.shift(); }
    const pairs = detect(va, vd, { within: RES.zone }), res = pairs.filter((x) => x.both && x.gap < RES.skin), soft = pairs.filter((x) => x.both), cA = this.committed(A, t), cD = this.committed(D, t);
    const rec = { k, t, dist, pairs: pairs.slice(0, 8).map((x) => ({ A: x.A, B: x.B, pen: +x.pen.toFixed(4), n: x.nh ? [+x.nh[0].toFixed(3), +x.nh[1].toFixed(3)] : null, at: x.at.map((v) => +v.toFixed(3)) })),
      maxPen: pairs.length ? pairs[0].pen : -RES.skin, maxRes: res.length ? res[0].pen : -RES.skin, sup: [this.planted(A, t), this.planted(D, t)], act: [this.actionOf(A, t), this.actionOf(D, t)], committed: [cA, cD], dA: [0, 0], dD: [0, 0], share: null, conflict: false, us: 0 };
    // ── RESOLUTION: the constraints (the gap a pair may reach this tick), the minimum relative correction, the split ────────────────────────
    // (the split first — it decides how much of a relative correction each player's body actually carries)
    const u = [sd.P[0] - sa.P[0], sd.P[1] - sa.P[1]], um = hyp(u[0], u[1]) || 1, ua = [u[0] / um, u[1] / um], apA = Math.max(0, sa.V[0] * ua[0] + sa.V[1] * ua[1]), apD = Math.max(0, -(sd.V[0] * ua[0] + sd.V[1] * ua[1]));
    // (one committed: it is not moved, the other gives way. BOTH committed: a CONFLICT — a correction is then necessary: split by the kinematics
    // alone, the ROOT only (each authored action's own motion and velocity kept; a tackle's boot moves with its root), counted and reported)
    // (a STILL player — both feet planted, moving < RES.still m/s — takes no share at all while the other can give way: a standing blocker is not
    // displaced by someone walking into him (displacement is Stage 2); both still: an even split)
    const still = (st, sup) => sup === 2 && hyp(st.V[0], st.V[1]) < RES.still, eA = still(sa, rec.sup[0]) ? 0 : RES.eps, eD = still(sd, rec.sup[1]) ? 0 : RES.eps;
    let mA = (apA + eA) / (1 + rec.sup[0]), mD = (apD + eD) / (1 + rec.sup[1]); if (cA && !cD) mA = 0; if (cD && !cA) mD = 0; if (mA + mD <= 0 && !(cA && !cD) && !(cD && !cA)) { mA = 1; mD = 1; } if (cA && !cD && mD <= 0) mD = 1; if (cD && !cA && mA <= 0) mA = 1;
    const sm = mA + mD, fA = sm > 0 ? mA / sm : 0, fD = sm > 0 ? mD / sm : 0;
    rec.share = [+fA.toFixed(3), +fD.toFixed(3)]; rec.approach = [+apA.toFixed(2), +apD.toFixed(2)];
    // (EFFECTIVENESS: a root shift moves the trunk fully, a planted leg's knee half and its ankle not at all; a swinging leg follows its moved
    // foothold most of the way. A pair the roots cannot separate — planted lower leg against planted lower leg — is a LEG CONFLICT: reported,
    // never fed to the root solver (it would push the bodies apart explosively while the planted legs stay crossed))
    const legA = this.legPlant(A, t), legD = this.legPlant(D, t), C = [], legC = [];
    for (const x of res) { const key = x.A + "|" + x.B, gPrev = this.gapMem.has(key) ? this.gapMem.get(key) : x.gap, leg = /THIGH|SHIN/.test(key), tl = leg ? RES.legTol : OCC.tol, al = leg ? RES.legAlpha : RES.alpha;
      // (TWO TIERS: trunk against trunk keeps the strict tolerance; a pair with a LEG — limbs swing far faster than a body may be pushed — is
      // corrected gently (RES.legCap per tick) within the hard limit, firmly beyond it)
      const gMin = gPrev > -tl ? -tl + (gPrev + tl) * (1 - al) : Math.min(-tl, gPrev + RES.recover), need = gMin - x.gap;
      let n = x.nh, h = x.hFrac; if (!n || h < 1e-6) { n = [-ua[0], -ua[1]]; h = RES.hMin; }
      // (both committed: neither may move — the conflict below; else the share of the correction reaching this contact)
      const e = cA && cD ? 1 : effOf(x.A, x.uA, legA) * fA + effOf(x.B, x.uB, legD) * fD;
      if (need > 1e-9 && e < RES.effLeg) { legC.push({ A: x.A, B: x.B, pen: +x.pen.toFixed(4), e: +e.toFixed(2) }); continue; }
      // (a contact the roots reach only partly (a planted knee / shin): it still pushes, but no faster than lowCap per tick — a gentle push the
      // canonical gait answers with a step, never an explosive one while the planted feet stay crossed)
      C.push({ key, gap: x.gap, need, n, h: Math.max(RES.hMin, h), e: Math.max(RES.effMin, e), low: e < RES.effMin, legSoft: leg && (RES.legAlways || x.pen <= OCC.hard) }); }
    // (LOOK-AHEAD: limbs swing several times faster than a root may be moved — both bodies are also posed RES.look ticks ahead on their present
    // plans (separate bodies: the live ones' continuity untouched); a resolved pair that will be deeper than its tolerance then asks for its
    // share of that depth now (1 / RES.look of it per tick), so the separation starts before the limb arrives instead of chasing it)
    if (RES.look > 0) { if (!this.ahead) this.ahead = new Map(this.players.map((p) => [p, new PlayBody(this.env, p)])); const tF = t + RES.look * DT, vaF = volumesOf(this.ahead.get(A).pose(tF).J), vdF = volumesOf(this.ahead.get(D).pose(tF).J), legAF = this.legPlant(A, tF), legDF = this.legPlant(D, tF);
      for (const x of detect(vaF, vdF, { within: 0 })) { if (!x.both) continue; const key = x.A + "|" + x.B, leg = /THIGH|SHIN/.test(key), tl = leg ? RES.legTol : OCC.tol; if (x.gap >= -tl) continue;
        const needF = (-tl - x.gap) / RES.look, e = cA && cD ? 1 : effOf(x.A, x.uA, legAF) * fA + effOf(x.B, x.uB, legDF) * fD; if (e < RES.effLeg) continue; const have = C.find((c) => c.key === key);
        if (have) { if (needF > have.need) { have.need = needF; have.ahead = true; } } else C.push({ key, gap: x.gap, need: needF, n: x.nh || [-ua[0], -ua[1]], h: Math.max(RES.hMin, x.hFrac), e: Math.max(RES.effMin, e), low: e < RES.effMin, legSoft: false, ahead: true, noMem: true }); } }
    rec.C = C.map((c) => ({ key: c.key, gap: +c.gap.toFixed(4), need: +c.need.toFixed(4), e: +c.e.toFixed(2), low: c.low, ahead: !!c.ahead }));
    if (legC.length) { rec.legConflict = legC; this.occ.legConflicts = (this.occ.legConflicts || 0) + 1; }
    // (THE SCHEDULE — measured, not adopted (RES.spread 1, RES.jerk 1: at once): with RES.spread > 1 a correction is spread over the next ticks by a smooth kernel; what is already
    // scheduled but not yet applied counts against this tick's need, so nothing is applied twice and nothing overshoots)
    const qA = this.queue.get(A).reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]), qD = this.queue.get(D).reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
    for (const c of C) c.need -= ((qA[0] - qD[0]) * c.n[0] + (qA[1] - qD[1]) * c.n[1]) * c.h * c.e;
    const viol = C.filter((c) => c.need > 1e-9); let r = [0, 0];
    if (viol.length) { r = minNorm(viol.map((c) => ({ n: c.n, c: Math.min(c.low ? RES.lowCap : Infinity, c.legSoft ? RES.legCap : Infinity, c.need / (c.h * c.e)) }))); const m = hyp(r[0], r[1]); if (m > RES.rMax) r = [r[0] / m * RES.rMax, r[1] / m * RES.rMax]; }
    if (viol.length && (cA && cD)) { rec.conflict = true; this.occ.conflicts++; if (!this.occ.events.length || this.occ.events[this.occ.events.length - 1].kind !== "CONFLICT: BOTH COMMITTED" || k - this.occ.events[this.occ.events.length - 1].k > 1) this.occ.events.push({ k, t, kind: "CONFLICT: BOTH COMMITTED", what: rec.act.join(" · "), pen: +rec.maxRes.toFixed(3) }); else this.occ.events[this.occ.events.length - 1].k = k; }
    // ── THE SOFT WALL (collide and slide, on the RELATIVE PLAN): within RES.zone of contact, the two planned root paths are read RELATIVE to each
    // other (my path minus his: two players running side by side do not close at all) against a VIRTUAL DISK fitted to the closest pair (its
    // two radii + the gap now, along the contact normal) whose radius shrinks to the tolerance exponentially (RES.tau). The relative path is
    // walked sample by sample and any sample inside the disk is put back on its rim (collide and slide: a head-on path stops at the rim, a
    // glancing or passing one slides round it and is otherwise untouched — a disk, not a half-plane: a path that passes the other's body is
    // never cut). The relative correction is split by the same shares as the position correction; the velocities follow the corrected path.
    // Nothing is given to anyone — no transfer, no push, no bounce ──
    rec.wallA = null; rec.wallD = null; let wall = null;
    if (soft.length) { let nb = [0, 0], gmin = Infinity, rho = 0.23; for (const x of soft) { const n = x.nh || [-ua[0], -ua[1]], w = RES.zone - x.gap; nb = [nb[0] + n[0] * w, nb[1] + n[1] * w]; if (x.gap < gmin) { gmin = x.gap; rho = x.rA + x.rB; } } const nm = hyp(nb[0], nb[1]);
      if (nm > 1e-9) { nb = [nb[0] / nm, nb[1] / nm];
        // (the wall's gap closes at once but REOPENS no faster than RES.wallOpen (0.5 m/s) and its normal turns smoothly: the gap of the moment
        // swings with the gait (a thigh forward, back) — a wall following it decelerated and re-released the body every stride)
        const W0 = this.wallMem; if (W0 && k - W0.k <= 1) { gmin = Math.min(gmin, W0.g + RES.wallOpen * DT); const a = 0.25, m2 = [W0.n[0] * (1 - a) + nb[0] * a, W0.n[1] * (1 - a) + nb[1] * a], mm = hyp(m2[0], m2[1]) || 1; nb = [m2[0] / mm, m2[1] / mm]; }
        this.wallMem = { k, g: gmin, n: nb }; rec.nbar = [+nb[0].toFixed(3), +nb[1].toFixed(3)]; rec.gmin = +gmin.toFixed(4);
        const wA = cA ? 0 : fA, wD = cD ? 0 : fD; if (wA + wD > 0) wall = this.softWall(t, nb, Math.max(gmin, -OCC.tol), rho, wA, wD); } }
    // (the new correction into the queues; this tick applies the first slot)
    // (URGENT — an overlap already deeper than the tolerance + RES.urgent: applied at once, the hard limit comes first; else spread)
    const urgent = rec.maxRes > OCC.tol + RES.urgent; rec.urgent = urgent;
    for (const [p, f, sg] of [[A, fA, 1], [D, fD, -1]]) { const Q = this.queue.get(p); if ((r[0] || r[1]) && f > 0) { if (urgent) { Q[0][0] += sg * r[0] * f; Q[0][1] += sg * r[1] * f; } else for (let j = 0; j < RES.spread; j++) { Q[j][0] += sg * r[0] * f * KERNEL[j]; Q[j][1] += sg * r[1] * f * KERNEL[j]; } } }
    // (JERK LIMIT — measured, not adopted: the correction actually applied this tick changes from the last tick's by at most RES.jerk — a root is never accelerated by
    // occupancy faster than RES.jerk / DT² — and never exceeds RES.rMax; what cannot be applied yet stays at the head of the queue)
    for (const [p, key] of [[A, "dA"], [D, "dD"]]) { const Q = this.queue.get(p), want = Q.shift(), last = this.lastD.get(p) || [0, 0]; Q.push([0, 0]);
      let dx = want[0] - last[0], dy = want[1] - last[1]; const m = hyp(dx, dy); if (m > RES.jerk) { dx *= RES.jerk / m; dy *= RES.jerk / m; } let ap = [last[0] + dx, last[1] + dy]; const am = hyp(ap[0], ap[1]); if (am > RES.rMax) ap = [ap[0] / am * RES.rMax, ap[1] / am * RES.rMax];
      const rest = [want[0] - ap[0], want[1] - ap[1]]; Q[0][0] += rest[0]; Q[0][1] += rest[1]; this.lastD.set(p, ap); rec[key] = ap; }
    // ── SUPPORT (§8): a PLANTED FOOT is an anchor — over one stance the root may move at most RES.stanceCap from where that stance found it (the
    // body leans over its support; it never splays its legs across the pitch to make room). What one player's support cannot take goes to the
    // other when he may be moved and his own support allows; what neither can take is not applied — the overlap stays, reported UNRESOLVED:
    // PLANTED SUPPORT (both committed, the stance budget is what each may lean; the conflict resolves stride by stride as new footholds land) ──
    if (RES.stanceCap > 0 && (rec.dA[0] || rec.dA[1] || rec.dD[0] || rec.dD[1])) {
      const keyOf = (q, X) => X + q.id + "@" + q.t0.toFixed(4), planted = (p) => ["R", "L"].map((X) => [X, p.plan.stances[X].find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9)]).filter((x) => x[1]);
      const accOf = (p, X, q) => { const m = this.sup.get(p) || {}; this.sup.set(p, m); if (!m[X] || m[X].key !== keyOf(q, X)) m[X] = { key: keyOf(q, X), v: [0, 0] }; return m[X]; };
      // (the largest λ ≤ 1 with |acc + λ·d| ≤ cap for every planted foot)
      const fit = (p, d) => { const dd = d[0] * d[0] + d[1] * d[1]; if (dd < 1e-14) return 1; let lam = 1; for (const [X, q] of planted(p)) { const v = accOf(p, X, q).v, vd = v[0] * d[0] + v[1] * d[1], c = v[0] * v[0] + v[1] * v[1] - RES.stanceCap * RES.stanceCap, disc = vd * vd - dd * c;
          lam = Math.min(lam, disc < 0 ? 0 : Math.max(0, (-vd + Math.sqrt(disc)) / dd)); } return lam; };
      const mA = !cA || cD, mD = !cD || cA; let dA = rec.dA.slice(), dD = rec.dD.slice();
      const lA = fit(A, dA), lD = fit(D, dD), sA = [dA[0] * (1 - lA), dA[1] * (1 - lA)], sD = [dD[0] * (1 - lD), dD[1] * (1 - lD)]; dA = [dA[0] * lA, dA[1] * lA]; dD = [dD[0] * lD, dD[1] * lD];
      // (the shortfall offered to the other: the relative correction dA − dD is what separates them)
      if ((sA[0] || sA[1]) && mD) { const e = [-sA[0], -sA[1]], l = fit(D, [dD[0] + e[0], dD[1] + e[1]]); const take = [(dD[0] + e[0]) * l - dD[0], (dD[1] + e[1]) * l - dD[1]]; dD = [dD[0] + take[0], dD[1] + take[1]]; sA[0] += take[0]; sA[1] += take[1]; }
      if ((sD[0] || sD[1]) && mA) { const e = [-sD[0], -sD[1]], l = fit(A, [dA[0] + e[0], dA[1] + e[1]]); const take = [(dA[0] + e[0]) * l - dA[0], (dA[1] + e[1]) * l - dA[1]]; dA = [dA[0] + take[0], dA[1] + take[1]]; sD[0] += take[0]; sD[1] += take[1]; }
      const left = hyp(sA[0], sA[1]) + hyp(sD[0], sD[1]); if (lA < 1 || lD < 1) rec.support = { lam: [+lA.toFixed(3), +lD.toFixed(3)], left: +left.toFixed(5) }; if (left > 1e-6) rec.supportLimited = true;
      rec.dA = dA; rec.dD = dD; this.lastD.set(A, dA); this.lastD.set(D, dD);
      for (const [p, d] of [[A, dA], [D, dD]]) for (const [X, q] of planted(p)) { const a = accOf(p, X, q); a.v[0] += d[0]; a.v[1] += d[1]; } }
    rec.rNew = [+r[0].toFixed(5), +r[1].toFixed(5)];
    for (const [p, d, w, key] of [[A, rec.dA, wall && wall.A, "wA"], [D, rec.dD, wall && wall.D, "wD"]]) { if (!(d[0] || d[1] || w)) continue; const c = this.shiftPlan(p, d, t, w); if (c > 0 || d[0] || d[1]) rec.acted = true; rec[key] = +c.toFixed(4); }
    // ── FOOT CORRECTION before touchdown: a swinging foot's next foothold that would land inside the opponent's planted lower leg is moved clear
    // (never a planted foot: no plant slide) ──
    // (a COMMITTED action's footholds are its own — authored placement: never moved; a clash with the opponent's planted foot is reported)
    rec.foot = [cA ? [] : this.footholds(A, D, vd, t), cD ? [] : this.footholds(D, A, va, t)].flat();
    if (RES.swingClear) { if (!cA) rec.foot.push(...this.swingPath(A, JA, vd, t)); if (!cD) rec.foot.push(...this.swingPath(D, JD, va, t)); }
    if (rec.foot.length) rec.acted = true;
    // (the pairs' gaps after the correction: the next tick's starting point)
    // (the pairs' gaps after the correction as far as it reaches them (its effectiveness): the next tick's starting point)
    const ra = [rec.dA[0] - rec.dD[0], rec.dA[1] - rec.dD[1]], keep = new Set(); for (const c of C) { if (c.noMem) continue; this.gapMem.set(c.key, c.gap + (ra[0] * c.n[0] + ra[1] * c.n[1]) * c.h * c.e); keep.add(c.key); } for (const x of legC) keep.add(x.A + "|" + x.B); for (const key of [...this.gapMem.keys()]) if (!keep.has(key)) this.gapMem.delete(key);
    // (a tick still beyond the hard limit is UNRESOLVED, with the reason root placement cannot fix it: both actions committed; planted lower
    // legs; an authored / ball-anchored limb path the root does not carry — reported, never hidden, never fixed by bending the animation)
    if (rec.maxRes > OCC.hard) { const why = rec.conflict ? "BOTH COMMITTED" : legC.some((x) => x.pen > OCC.hard) ? "PLANTED LEGS" : rec.supportLimited ? "PLANTED SUPPORT (the stance budget)" : cA || cD ? "COMMITTED ACTION'S LIMB" : "AUTHORED / BALL-ANCHORED LIMB PATH"; rec.unresolved = why; this.occ.unresolved = this.occ.unresolved || {}; this.occ.unresolved[why] = (this.occ.unresolved[why] || 0) + 1; }
    rec.r = [+ra[0].toFixed(5), +ra[1].toFixed(5)]; rec.us = (performance.now() - c0) * 1000; this.occ.log.push(rec); }
  // ── THE SOFT WALL's relative path: A's planned path minus D's from now on (RES.wallH at most), walked against the virtual disk (the closest
  // pair's radii rho + the gap g along nb, from D to A; the radius shrinking to rho − tol with RES.tau). Returns each player's correction per
  // sample of his own plan from now (A: +wA of the relative correction, D: −wD of it) or null when nothing is cut ─────────────────────────────
  softWall(t, nb, g, rho, wA, wD) { const PA = this.att.plan, PD = this.def.plan, iA = Math.max(0, Math.round((t - PA.t0) / DT)), iD = Math.max(0, Math.round((t - PD.t0) / DT)), m = Math.min(PA.n - iA, Math.round(RES.wallH / DT));
    if (m <= 0) return null; const R0 = rho + g, c = [nb[0] * R0, nb[1] * R0], relAt = (s) => { const a = 2 * (iA + s), d = 2 * Math.min(PD.n, iD + s); return [PA.P[a] - PD.P[d], PA.P[a + 1] - PD.P[d + 1]]; };
    const r0 = relAt(0), CA = new Float64Array(2 * (m + 1)), CD = new Float64Array(2 * (m + 1)); let p = [c[0], c[1]], prev = r0, cut = 0;
    // (NO FORCE FIELD: the free relative path first — if it never comes closer than the two radii + RES.wallGate (a near miss, a pass, side by side), the wall
    // does nothing at all: it only shapes an approach that would otherwise penetrate)
    { let q = [c[0], c[1]], pv = r0, dmin = Infinity; for (let s = 1; s <= m; s++) { const rel = relAt(s); q = [q[0] + rel[0] - pv[0], q[1] + rel[1] - pv[1]]; pv = rel; dmin = Math.min(dmin, hyp(q[0], q[1])); } if (dmin >= rho + RES.wallGate) return null; }
    for (let s = 1; s <= m; s++) { const rel = relAt(s); p = [p[0] + rel[0] - prev[0], p[1] + rel[1] - prev[1]]; prev = rel;
      const R = rho - OCC.tol + (g + OCC.tol) * Math.exp(-s * DT / RES.tau), pm = hyp(p[0], p[1]); if (pm < R) { const rr = pm > 1e-9 ? [p[0] / pm, p[1] / pm] : nb; p = [rr[0] * R, rr[1] * R]; }
      const C = [p[0] - (c[0] + rel[0] - r0[0]), p[1] - (c[1] + rel[1] - r0[1])]; CA[2 * s] = C[0] * wA; CA[2 * s + 1] = C[1] * wA; CD[2 * s] = -C[0] * wD; CD[2 * s + 1] = -C[1] * wD; cut = Math.max(cut, hyp(C[0], C[1])); }
    return cut > 1e-7 ? { A: wA > 0 ? { C: CA, m } : null, D: wD > 0 ? { C: CD, m } : null, cut } : null; }
  // ── APPLICATION: the root path from now on and the future footholds move; planted feet and the past do not ────────────────────────────────
  // d: the position correction now (every future sample); wall: { C, m } — the soft wall's correction of the next m samples (then held), the
  // planned velocities following it (and the movement model's heading). The future footholds, contact aims and technique frames move by the
  // path's correction at their time. Returns the largest wall correction (m)
  shiftPlan(p, d, t, wall = null) { const P = p.plan, i0 = Math.max(0, Math.round((t - P.t0) / DT)), n = P.n, C = new Float64Array(2 * (n + 1)); let cut = 0;
    // (a planned technique ahead: from its commitment on the wall's correction is held — the move is placed, never reshaped)
    const tq = this.techOf(p), iF = tq && tq.tCommit > t + 1e-9 ? Math.max(i0, Math.round((tq.tCommit - P.t0) / DT)) : Infinity;
    for (let i = i0; i <= n; i++) { let cx = d[0], cy = d[1];
      if (wall) { const s = Math.min(Math.min(i, iF) - i0, wall.m), wx = wall.C[2 * s], wy = wall.C[2 * s + 1]; cx += wx; cy += wy; cut = Math.max(cut, hyp(wx, wy));
        // (the planned velocity follows the corrected path; the movement model's own heading array with it — a re-plan reads that heading, and a
        // stale one snapped the path back toward the other player — but only for a player MOVING on his own (> 0.5 m/s before and after): a
        // standing player's heading never follows the slide occupancy gives him (it turned a blocker toward the push, his planted legs crossed))
        // NO MOMENTUM: the wall only ever REMOVES a player's own velocity against the correction (down to zero along it) — it never gives him a
        // velocity (a standing player slid aside by a committed move keeps standing still: a velocity written into his plan was momentum his next
        // re-plan carried on with, turning him to face it with his feet planted)
        if (s >= 1 && i - i0 <= wall.m && i <= iF) { const dvx = (wx - wall.C[2 * s - 2]) / DT, dvy = (wy - wall.C[2 * s - 1]) / DT, dm = hyp(dvx, dvy);
          if (dm > 1e-9) { const ux = dvx / dm, uy = dvy / dm, against = -(P.V[2 * i] * ux + P.V[2 * i + 1] * uy), take = Math.min(dm, Math.max(0, against)), v0 = hyp(P.V[2 * i], P.V[2 * i + 1]);
            if (take > 0) { P.V[2 * i] += ux * take; P.V[2 * i + 1] += uy * take; if (P.ah && v0 > 0.5 && hyp(P.V[2 * i], P.V[2 * i + 1]) > 0.5) P.ah[i] = Math.atan2(P.V[2 * i + 1], P.V[2 * i]); } } } }
      P.P[2 * i] += cx; P.P[2 * i + 1] += cy; C[2 * i] = cx; C[2 * i + 1] = cy; }
    const at = (tau) => { const i = Math.min(n, Math.max(i0, Math.round((tau - P.t0) / DT))); return [C[2 * i], C[2 * i + 1]]; };
    const fm = new Map(), fr = (f) => { if (!f || !f.O) return f; let g = fm.get(f); if (!g) { const o = at(f.tC != null ? f.tC : t); g = Object.assign({}, f, { O: [f.O[0] + o[0], f.O[1] + o[1]] }); fm.set(f, g); } return g; };
    const st = {}; for (const X of ["R", "L"]) st[X] = P.stances[X].map((q) => { if (!(q.t0 > t + 1e-9 && q.pos)) return q; const o = at(q.t0); return Object.assign({}, q, { pos: [q.pos[0] + o[0], q.pos[1] + o[1]], swingIn: q.swingIn && q.swingIn.frame ? Object.assign({}, q.swingIn, { frame: fr(q.swingIn.frame) }) : q.swingIn }); });
    P.stances = st;
    for (const c of P.contacts) if (!c.done && c.t > t - 1e-9) { const o = at(c.t); if (c.aim && c.aim.kind === "target" && c.aim.P) c.aim = Object.assign({}, c.aim, { P: [c.aim.P[0] + o[0], c.aim.P[1] + o[1]] }); if (c.frame) c.frame = fr(c.frame); }
    // (a committed tackle moved in a conflict: its authoritative boot moves with its root)
    if (p.tk && p.tk.act && p.tk.owns(t) && (d[0] || d[1])) { const A = p.tk.act; if (!A.occOff) { A.occOff = [0, 0]; const bb = A.boot; A.boot = (tau) => { const b = bb(tau); return Object.assign({}, b, { a: [b.a[0] + A.occOff[0], b.a[1] + A.occOff[1], b.a[2]] }); }; } A.occOff[0] += d[0]; A.occOff[1] += d[1]; }
    const B = this.bodies.get(p); if (B && B.cache) B.cache.delete(P); p.occShift = (p.occShift || 0) + hyp(d[0], d[1]); p.occCut = Math.max(p.occCut || 0, cut); return cut; }
  // the planted state of each leg at t ({ R: bool, L: bool })
  legPlant(p, t) { const o = {}; for (const X of ["R", "L"]) o[X] = p.plan.stances[X].some((s) => s.t0 <= t + 1e-9 && s.t1 > t + 1e-9); return o; }
  // a swinging foot's next foothold, against the opponent's planted feet: the ankle a shin's-radius pair + the tolerance clear of his planted
  // ankle (horizontal) — else moved away by the deficit; returns the corrections made
  footholds(p, q, vq, t) { const out = [], P = p.plan, lp = this.legPlant(q, t); let changed = false; const st = { R: P.stances.R, L: P.stances.L };
    const tq = this.techOf(p), own = (s) => tq && s.t0 >= tq.tCommit - 0.25 && s.t0 < tq.tRelease;   // (a planned technique's steps — and the one that sets it up — are its own)
    for (const X of ["R", "L"]) { const L = st[X], i = L.findIndex((s) => s.t0 > t + 1e-9 && s.pos); if (i < 0 || L.some((s) => s.t0 <= t + 1e-9 && s.t1 > t + 1e-9)) continue; const s = L[i]; if (own(s)) continue;
      for (const Y of ["R", "L"]) { if (!lp[Y]) continue; const qs = q.plan.stances[Y].find((x) => x.t0 <= t + 1e-9 && x.t1 > t + 1e-9); if (!qs || !(qs.t1 > s.t0)) continue;
        const d = [s.pos[0] - qs.pos[0], s.pos[1] - qs.pos[1]], m = hyp(d[0], d[1]), need = RES.footClear - m; if (need <= 0) continue;
        const nd = m > 1e-6 ? [d[0] / m, d[1] / m] : (() => { const a = p.stateAt(t).P, b = q.stateAt(t).P, w = hyp(a[0] - b[0], a[1] - b[1]) || 1; return [(a[0] - b[0]) / w, (a[1] - b[1]) / w]; })();
        const ns = Object.assign({}, s, { pos: [s.pos[0] + nd[0] * need, s.pos[1] + nd[1] * need] }); st[X] = L.slice(); st[X][i] = ns; changed = true; out.push({ who: p.pid, foot: X, from: s.pos, to: ns.pos, by: +need.toFixed(3), clearOf: q.pid + " " + Y, landsIn: +(s.t0 - t).toFixed(3) }); } }
    if (changed) { P.stances = st; const B = this.bodies.get(p); if (B && B.cache) B.cache.delete(P); this.occ.footFix = (this.occ.footFix || 0) + 1; } return out; }
  // a swinging foot's path to its next foothold, as a straight segment from where the foot is drawn now (a shin-radius capsule), against the
  // opponent's legs (thighs, shins, feet): if it would cross them, the foothold is brought back along the path until it clears (a shorter step,
  // ≥ 0.10 m) — the gait stops stepping through the other player's legs; a committed action's footholds are its own
  swingPath(p, J, vq, t) { const out = [], P = p.plan, legs = vq.filter((v) => /THIGH|SHIN|FOOT/.test(v.id)); let st = null; const tq = this.techOf(p);
    for (const X of ["R", "L"]) { const L = (st || P.stances)[X]; if (L.some((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9)) continue; const i = L.findIndex((q) => q.t0 > t + 1e-9 && q.pos); if (i < 0) continue; if (tq && L[i].t0 >= tq.tCommit - 0.25 && L[i].t0 < tq.tRelease) continue;
      const q0 = L[i], a = J["foot_" + X].j, land = (pos) => [pos[0], pos[1], 0.088], clear = (pos) => { let worst = Infinity; for (const v of legs) { const c = segClosest(a, land(pos), v.a, v.b), g = c.d - 0.07 - v.r; if (g < worst) worst = g; } return worst; };
      if (clear(q0.pos) >= -OCC.tol) continue; const L0 = hyp(q0.pos[0] - a[0], q0.pos[1] - a[1]); if (L0 < 0.12) continue; let lo = 0.10 / L0, hi = 1, best = null;
      for (let it = 0; it < 10; it++) { const m = (lo + hi) / 2, pos = [a[0] + (q0.pos[0] - a[0]) * m, a[1] + (q0.pos[1] - a[1]) * m]; if (clear(pos) >= -OCC.tol) { best = pos; lo = m; } else hi = m; }
      if (!best) continue; if (!st) st = { R: P.stances.R.slice(), L: P.stances.L.slice() }; st[X][i] = Object.assign({}, q0, { pos: best }); out.push({ who: p.pid, foot: X, from: q0.pos, to: best, by: +hyp(best[0] - q0.pos[0], best[1] - q0.pos[1]).toFixed(3), kind: "step shortened (its path crossed " + (p === this.att ? "DEF" : "ATT") + "'s legs)", landsIn: +(q0.t0 - t).toFixed(3) }); }
    if (st) { P.stances = st; const B = this.bodies.get(p); if (B && B.cache) B.cache.delete(P); this.occ.stepFix = (this.occ.stepFix || 0) + 1; } return out; }
  // the planned APPROVED MOVE of a player's present plan (a Body Feint / Croqueta: its commitment and release), committed or still ahead — its
  // authored part (from its commitment on) is never reshaped: corrected only as a whole (world placement), its footholds its own
  techOf(p) { const a = p.plan.action; return a && a.tech && a.tCommit != null && a.tRelease != null && /BODY FEINT|CROQUETA/.test(a.label || "") ? a : null; }
  // ── the states the split reads ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  committed(p, t) { if (p.tk && p.tk.owns(t)) return "TACKLE"; const a = p.plan.action; return a.tech && a.tCommit != null && t >= a.tCommit - 1e-9 && t < a.tRelease ? a.label : null; }
  planted(p, t) { let n = 0; for (const X of ["R", "L"]) if (p.plan.stances[X].some((s) => s.t0 <= t + 1e-9 && s.t1 > t + 1e-9)) n++; return n; }
  actionOf(p, t) { const a = p.plan.action; return p.tk && p.tk.owns(t) ? "TACKLE " + p.tk.phaseAt(t) : a.label; }
}
// how much of a root shift reaches a point of a volume (u: 0 … 1 along it): the trunk all of it; a leg from the hip (1) to the knee (planted 0.5,
// swinging 0.85) to the ankle (planted 0, swinging 0.7 — it follows its moved foothold); a foot as its ankle
export function effOf(id, u, plant) { if (!/_(R|L)$/.test(id)) return 1; const X = id.slice(-1), pl = plant[X], knee = pl ? 0.5 : 0.85, ankle = pl ? 0 : 0.7;
  if (id.startsWith("THIGH")) return 1 + (knee - 1) * u; if (id.startsWith("SHIN")) return knee + (ankle - knee) * u; return ankle; }
// the smooth spreading kernel (a sine bell over RES.spread ticks, summing to 1)
const KERNEL = (() => { const n = 8, w = Array.from({ length: n }, (_, j) => Math.sin(Math.PI * (j + 0.5) / n)), s = w.reduce((a, b) => a + b, 0); return w.map((x) => x / s); })();
// the minimum-norm r with r·n_i ≥ c_i for every constraint (2-D): the best feasible of the single projections and the pairwise vertices; with
// no feasible point (opposing contacts: an interlock), the least-squares compromise by sequential projection
export function minNorm(K) { const ok = (r) => K.every((q) => r[0] * q.n[0] + r[1] * q.n[1] >= q.c - 1e-9); let best = null;
  const take = (r) => { if (ok(r) && (!best || hyp(r[0], r[1]) < hyp(best[0], best[1]))) best = r; };
  for (const q of K) take([q.n[0] * q.c, q.n[1] * q.c]);
  for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) { const a = K[i], b = K[j], det = a.n[0] * b.n[1] - a.n[1] * b.n[0]; if (Math.abs(det) < 1e-6) continue; take([(a.c * b.n[1] - b.c * a.n[1]) / det, (a.n[0] * b.c - b.n[0] * a.c) / det]); }
  if (best) return best; let r = [0, 0]; for (let it = 0; it < 16; it++) for (const q of K) { const v = q.c - (r[0] * q.n[0] + r[1] * q.n[1]); if (v > 0) r = [r[0] + q.n[0] * v * 0.5, r[1] + q.n[1] * v * 0.5]; } return r; }

// ═══ occupy2/o2_world.js — PLAYER OCCUPANCY STAGE 2: COMMITTED-ACTION CONTACT RESOLUTION. Stage 1's world (occupy1/, kept unchanged as the
// comparison) rebuilt around SUPPORT: a body is never dragged away from its planted feet, a committed action is never reshaped or pushed around.
// Shared Possession + Reaction V1 (possess1/, unchanged; Reaction MEDIUM 0.200 s) + one OCCUPANCY PASS per tick:
//   SUPPORT STATE (every player, every tick): COMMITTED PLANT (a committed Body Feint / Croqueta / Standing Tackle with a foot down) · AIRBORNE
//     (no foot down) · FREE LOCOMOTION (an ordinary gait in motion: its supports are transient, its future footholds re-placeable) · SINGLE /
//     DOUBLE SUPPORT (an ordinary player standing on one / two feet). Each planted foot is an ANCHOR with a ledger: the root displacement
//     occupancy executed since that foot landed — the SUPPORT CONSISTENCY ERROR (how far the support chain must reconcile)
//   DETECTION (occupy1/o_volumes.js, unchanged): both bodies posed live, 121 capsule pairs; each pair classed by REGION (TORSO/PELVIS ↔
//     TORSO/PELVIS · TORSO ↔ LEG · LEG ↔ LEG · FOOT ↔ BODY · ARM ↔ BODY) and by TIER — a pair with a leg whose contact points close faster than
//     RES2.vFast is a FAST ARTICULATED LIMB contact — classified and reported apart, and resolved at the leg rate (≤ RES2.limbCap a tick: a shin
//     flicking through a shin never throws the whole footballer; tolerating it to the hard limit first was measured and left more overlap for
//     no fewer jolts); every other resolved pair is CORE body occupancy
//   RESOLUTION (normal / tangent): one 2-D minimum-norm RELATIVE correction over every violated pair, along the contact normals only — the
//     tangential motion is never touched (two players shoulder to shoulder keep running alongside); per region its own rate (torso / pelvis
//     ≤ RES2.rMax per tick, legs ≤ RES2.legCap / llCap); a short LOOK-AHEAD (RES2.look ticks: both bodies posed on their present plans) can
//     start the separation before the violation (compared, not adopted: 0). The SPLIT by kinematics (approach, planted feet; a still player
//     none; a committed action none), then each player's share FITTED TO HIS SUPPORT:
//       · committed: ≤ RES2.commitPlant over one planted stance, ≤ RES2.commitTotal over the whole commitment (its flights included) — the
//         approved action is placed where its author put it; it is never pushed around, never reshaped
//       · ordinary, a foot planted: ≤ RES2.lean over that stance (the body leans over its support) and only inside the planted leg's REACH
//         (the drawn hip within the leg's length of its planted ankle, the pelvis dropping ≤ RES2.drop) — never dragged off its feet
//       · airborne, ordinary: free (≤ RES2.rMax per tick)
//     what one player's support cannot take goes to the other when his allows; what neither can take is not applied: the overlap stays and is
//     classified UNRESOLVED (COMMITTED CONFLICT · PLANTED SUPPORT · FAST LIMB · …) — never a hidden reconciliation in the legs
//   THE SOFT WALL (Stage 1's, unchanged in principle): the two planned paths relative to each other against a virtual disk, acting only when
//     the free relative paths would touch; it removes only a player's own approach velocity (never gives one); a committed action takes no
//     share; a Body Feint / Croqueta still ahead in a plan is placed as a whole, never reshaped
//   BALL ACCESS: a touch / the tackle's boot whose playing leg is > the hard limit inside the opponent's body NOW (both bodies posed at the
//     contact's own tick — no one-tick lag) or in the 0.1 s before is BLOCKED. A blocked touch inside a committed Body Feint / Croqueta does not
//     cancel the move: its self-caused re-plans (the missed contact, footfall, refresh, its later touches) are held until the move's release —
//     the action continues, the ball goes where it actually went, the canonical planner resumes from what actually happened
//   PLACEMENT: the plan is shifted — the root, the future stances, the contacts' frames; a PLANTED stance never moves; a swinging leg is carried
//     with the body (its lift-off key, and the cached swing in flight after its ball contact — never rebuilt mid-flight)
// NOT HERE (Stage 3): momentum transfer, strength, balance loss, stumbles, knockback, tackle force, fouls, falls, outcome tuning, slide tackle.
import { SharedWorld } from "../possess1/p_world.js";
import { PlayBody } from "../vocab2/u_body.js";
import { volumesOf, detect, legThrough, segClosest, OCC, GROUP } from "../occupy1/o_volumes.js";
import { minNorm, effOf } from "../occupy1/o_world.js";
const DT = 1 / 240, hyp = Math.hypot;
export const RES2 = { coreTol: 0.02, hard: OCC.hard, legTol: 0.02, limbTol: 0.05, vFast: 2.5, skin: 0.08, alpha: 0.15, legAlpha: 0.15, recover: 0.006, rMax: 0.03, legCap: 0.015, llTol: 0.02, llCap: 0.015, llCapDeep: 0.02, limbCap: 0.015, limbMode: "leg", hMin: 0.35, effMin: 0.45, effLeg: 0.1, lowCap: 0.012,
  eps: 0.25, still: 0.15, commitPlant: 0.02, commitAir: 0.08, commitTotal: 0.12, lean: 0.12, reach: 0.985, drop: 0.02,
  zone: 0.3, tau: 0.06, wallOpen: 0.5, wallH: 1.0, wallGate: 0, look: 0, ramp: 0, swingShift: true, carrySwing: true, access: 24, gateNow: true, holdReplans: true, footClear: 0.12, swingClear: true };
// (coreTol / hard: the contact tolerance and the impossibility threshold (Stage 1's measurement, compared in the report); limbMode "leg": a FAST
// limb pair resolved like a leg pair, at most limbCap a tick ("tolerate": to limbTol, then limbCap — compared); vFast: the ARTICULATED closing speed (the contact points' less the roots') above which a leg contact is a fast limb
// contact; commitPlant / commitAir / commitTotal: a committed action's compliance over one plant / one flight (no foot down: placed as a whole,
// its next landing with it) / its whole commitment; lean: an ordinary planted stance's push budget (LOW 0.06 / 0.12 / Stage 1's 0.18 / HIGH
// 0.25 compared); reach / drop: the planted leg's usable length (of its full length) and the pelvis drop allowed for reach; rMax / legCap /
// llCap / llCapDeep: the per-tick rate of a torso, torso–leg, leg–leg (≤ / > the hard limit) correction; look: the look-ahead in ticks (0 / 1 /
// 2 / 4 compared); ramp: a minimum-jerk schedule of each correction (compared: it deepens the overlap); gateNow: ball access at the contact's
// own tick; holdReplans: a committed move whose touch was blocked keeps its own plan to its release; swingShift / carrySwing: a swinging leg
// carried with the body; the rest as Stage 1)
const S5 = (x) => x * x * x * (10 - 15 * x + 6 * x * x), LEG = /^(THIGH|SHIN)_/, isLeg = (id) => LEG.test(id), CLS = (A, B) => { const g = [GROUP[A], GROUP[B]]; if (g.includes("ARM")) return "ARM ↔ BODY"; if (g.includes("FOOT")) return "FOOT ↔ BODY"; if (g[0] === "TRUNK" && g[1] === "TRUNK") return "TORSO/PELVIS ↔ TORSO/PELVIS"; if (g[0] === "TRUNK" || g[1] === "TRUNK") return "TORSO ↔ LEG"; return "LEG ↔ LEG"; };
export const REGION_CLASSES = ["TORSO/PELVIS ↔ TORSO/PELVIS", "TORSO ↔ LEG", "LEG ↔ LEG", "FOOT ↔ BODY", "ARM ↔ BODY"];
export class OccupancyWorld2 extends SharedWorld {
  // o.record: keep every tick's live pose of both bodies (the Lab draws them, the statistics are measured on them) · o.res: RES2 overrides
  constructor(env, o = {}) { super(env, Object.assign({ mode: "MEDIUM" }, o)); this.env = env; this.occOn = o.occupancy !== false; this.record = !!o.record; this.R = Object.assign({}, RES2, o.res || {});
    this.bodies = new Map(this.players.map((p) => [p, new PlayBody(env, p)])); this.gapMem = new Map(); this.stanceL = new Map(); this.commitL = new Map(); this.prevV = null; this.wallMem = null; this.pend = new Map(this.players.map((p) => [p, []]));
    this.occ = { log: [], events: [], conflicts: 0, blocked: 0, held: 0 }; this.legHist = { ATT: [], DEF: [] }; this.legLen = (env.body && env.body.legLen) || 0.85;
    this.frames = this.record ? new Map() : null; if (this.record) this.recordFrame();
    if (!this.occOn) return;
    // (BALL ACCESS — each player's contacts: blocked through the opponent's body, now or in the window; a committed move's blocked touch holds its
    // self-caused re-plans to its release instead of ending it)
    for (const p of this.players) { const ex = p.execute.bind(p), rp = p.replan.bind(p);
      p.execute = (c) => { const b = this.accessBlocked(p, c.F) || this.gateNow(p, c.F, p.t); if (!b) { const r = ex(c); if (p._hold && /^(missed contact|contact)$/.test(p.flags.replan || "")) { p._hold.n++; p.flags.replan = null; } return r; }
        c.done = true; c.missed = true; c.blocked = b; p.contacts.push(Object.assign(p.contactRec(c, p.ball.v, p.ball.v, null), { missed: true, blocked: b })); const mv = this.moveCommitted(p, p.t);
        if (mv && this.R.holdReplans) { p._hold = { until: mv.tRelease, n: 0, label: mv.label }; this.occ.held++; } else p.flags.replan = "missed contact";
        this.occ.blocked++; this.occ.events.push({ k: this.k, t: this.k * DT, kind: "BALL ACCESS BLOCKED", who: p.pid, what: c.role || "touch", F: c.F, through: b, held: !!(mv && this.R.holdReplans) }); };
      p.replan = (why) => { const H = p._hold; if (H && p.t < H.until - 1e-9 && /^(footfall|refresh|missed contact|contact)$/.test(why)) { H.n++; return; } if (H && p.t >= H.until - 1e-9) p._hold = null; return rp(why); }; }
    if (this.tk) { const pr = this.tk.probes.bind(this.tk); this.tk.probes = (t) => { const opp = this.att.opp, n = opp.length; pr(t); const A = this.tk.act; if (!A || opp.length === n) return;
        const b = this.accessBlocked(this.def, A.F) || this.gateNow(this.def, A.F, t); if (!b) return; opp.splice(n); this.occ.blocked++; if (!A.occBlocked) A.occBlocked = []; A.occBlocked.push(Math.round(t / DT));
        this.occ.events.push({ k: this.k, t, kind: "TACKLE BOOT BLOCKED", who: "DEF", what: A.fam, F: A.F, through: b }); }; } }
  // the playing leg inside the opponent's body (> the hard limit) in the access window before this tick → the regions, else null
  accessBlocked(p, F) { const H = this.legHist[p.pid]; if (!H.length || !F) return null; const k = this.k; let worst = null;
    for (let i = H.length - 1; i >= 0 && H[i].k >= k - this.R.access; i--) { const x = H[i][F]; if (x && x.pen > this.R.hard && (!worst || x.pen > worst.pen)) worst = x; }
    return worst ? { pen: +worst.pen.toFixed(3), leg: worst.A, body: worst.B } : null; }
  // … and NOW: both bodies posed at the contact's own tick on their present plans (separate bodies — the live ones untouched): no one-tick lag
  gateNow(p, F, t) { if (!this.R.gateNow || !F) return null; const q = p === this.att ? this.def : this.att, a = p.stateAt(t).P, b = q.stateAt(t).P; if (hyp(a[0] - b[0], a[1] - b[1]) > OCC.broad) return null;
    if (!this.gateB) this.gateB = new Map(this.players.map((x) => [x, new PlayBody(this.env, x)])); const L = legThrough(volumesOf(this.gateB.get(p).pose(t).J), volumesOf(this.gateB.get(q).pose(t).J), F);
    return L.pen > this.R.hard ? { pen: +L.pen.toFixed(3), leg: L.A, body: L.B, now: true } : null; }
  step(reqA, reqD) { for (const p of this.players) if (p._hold && p.t >= p._hold.until - 1e-9) { p._hold = null; p.flags.replan = p.flags.replan || "missed contact"; }   // (the held move released: the canonical planner resumes)
    super.step(reqA, reqD); if (this.occOn) this.occupancy(); else if (this.record) this.recordFrame(); }
  livePoses() { const t = this.att.t, k = Math.round(t / DT); if (this.lp && this.lp.k === k) return this.lp; const a = this.bodies.get(this.att).pose(t), d = this.bodies.get(this.def).pose(t); this.lp = { k, a, d }; return this.lp; }
  recordFrame() { const L = this.livePoses(); this.frames.set(L.k, { a: { skin: L.a.skin, J: L.a.J, P: L.a.P }, d: { skin: L.d.skin, J: L.d.J, P: L.d.P } }); }
  // ═══ SUPPORT ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  plantedStances(p, t) { return ["R", "L"].map((X) => [X, p.plan.stances[X].find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9)]).filter((x) => x[1]); }
  supportState(p, t, st) { const n = this.plantedStances(p, t).length, c = this.committed(p, t); if (c && n) return "COMMITTED PLANT"; if (!n) return "AIRBORNE"; if (hyp(st.V[0], st.V[1]) >= this.R.still) return "FREE LOCOMOTION"; return n === 2 ? "DOUBLE SUPPORT" : "SINGLE SUPPORT"; }
  // the ledger of a planted stance (the root displacement occupancy executed since that foot landed: PUSH = position corrections, WALL = the soft
  // wall's executed path change) and of a commitment (everything executed since it committed)
  stanceLedger(p, X, q) { let m = this.stanceL.get(p); if (!m) this.stanceL.set(p, (m = {})); const key = X + q.id + "@" + q.t0.toFixed(4); if (!m[X] || m[X].key !== key) m[X] = { key, push: [0, 0], wall: [0, 0], t0: q.t0 }; return m[X]; }
  commitLedger(p, t) { const c = this.committed(p, t); if (!c) { this.commitL.delete(p); return null; } const key = c + "@" + (p.tk && p.tk.owns(t) ? p.tk.act.t0 : p.plan.action.tCommit).toFixed(4); let L = this.commitL.get(p); if (!L || L.key !== key) this.commitL.set(p, (L = { key, v: [0, 0], air: [0, 0], airK: -1 })); return L; }
  // the largest λ ≤ 1 with |v + λ·d| ≤ cap
  static fitDisk(v, d, cap) { const dd = d[0] * d[0] + d[1] * d[1]; if (dd < 1e-14) return 1; if (hyp(v[0] + d[0], v[1] + d[1]) <= cap) return 1; const vd = v[0] * d[0] + v[1] * d[1], c = v[0] * v[0] + v[1] * v[1] - cap * cap, disc = vd * vd - dd * c; return disc < 0 ? 0 : Math.max(0, Math.min(1, (-vd + Math.sqrt(disc)) / dd)); }
  // how much of a root shift d a player's support takes (λ): a committed action its compliance; an ordinary planted stance its lean budget and
  // its leg's reach (the drawn hip may not leave the planted ankle further than the leg reaches with the pelvis dropped ≤ RES2.drop); airborne
  // and ordinary: all of it. Also returns why it was limited
  capFit(p, d, t, J) { if (hyp(d[0], d[1]) < 1e-12) return { lam: 1 }; let lam = 1, why = null; const cm = this.committed(p, t), P2 = this.plantedStances(p, t), lim = (l, w) => { if (l < lam - 1e-12) { lam = l; why = w; } };
    if (cm) { const L = this.commitLedger(p, t); lim(OccupancyWorld2.fitDisk(L.v, d, this.R.commitTotal), "COMMITTED (its placement)"); for (const [X, q] of P2) { const S = this.stanceLedger(p, X, q); lim(OccupancyWorld2.fitDisk([S.push[0] + S.wall[0], S.push[1] + S.wall[1]], d, this.R.commitPlant), "COMMITTED PLANT"); }
      if (!P2.length) lim(OccupancyWorld2.fitDisk(L.air, d, this.R.commitAir), "COMMITTED FLIGHT"); }
    else for (const [X, q] of P2) { const S = this.stanceLedger(p, X, q);
      // (a stance the planned move will commit on is already the move's support: the committed compliance from its landing — the move never starts
      // from a body already pushed off its planted foot)
      if (this.preCommitStance(p, q, t)) { lim(OccupancyWorld2.fitDisk([S.push[0] + S.wall[0], S.push[1] + S.wall[1]], d, this.R.commitPlant), "COMMITTED PLANT (the move ahead)"); continue; }
      lim(OccupancyWorld2.fitDisk(S.push, d, this.R.lean), "LEAN BUDGET");
      const H = J["thigh_" + X].j, A = J["foot_" + X].j, v = Math.max(0, H[2] - A[2] - this.R.drop), Lr = this.R.reach * this.legLen, rmax = Math.sqrt(Math.max(0, Lr * Lr - v * v)), h = [H[0] - A[0], H[1] - A[1]];
      lim(OccupancyWorld2.fitDisk(h, d, Math.max(rmax, hyp(h[0], h[1]))), "LEG REACH"); }
    return { lam, why }; }
  // ═══ THE OCCUPANCY PASS ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  occupancy() { const R = this.R, t = this.att.t, k = this.k, A = this.att, D = this.def, sa = A.stateAt(t), sd = D.stateAt(t), dist = hyp(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]);
    if (dist > OCC.broad) { if (this.gapMem.size) this.gapMem.clear(); this.prevV = null; if (this.record) this.recordFrame(); return; }
    const c0 = performance.now(), LP = this.livePoses(), JA = LP.a.J, JD = LP.d.J, va = volumesOf(JA), vd = volumesOf(JD); if (this.record) this.recordFrame();
    for (const [p, mine, theirs] of [[A, va, vd], [D, vd, va]]) { const H = this.legHist[p.pid]; H.push({ k, R: legThrough(mine, theirs, "R"), L: legThrough(mine, theirs, "L") }); while (H.length > R.access + 2) H.shift(); }
    const cA = this.committed(A, t), cD = this.committed(D, t), pairs = detect(va, vd, { within: R.zone }), PV = this.prevV && this.prevV.k === k - 1 ? this.prevV : null; this.prevV = { k, va, vd };
    // (each pair's REGION class and TIER: the contact points' closing speed from the previous tick's volumes — a leg pair closing faster than vFast
    // is a FAST ARTICULATED LIMB contact)
    const u0 = [sd.P[0] - sa.P[0], sd.P[1] - sa.P[1]], um = hyp(u0[0], u0[1]) || 1, ua = [u0[0] / um, u0[1] / um];
    const vol = (V, id) => V.find((v) => v.id === id), ptAt = (v, u) => [v.a[0] + (v.b[0] - v.a[0]) * u, v.a[1] + (v.b[1] - v.a[1]) * u, v.a[2] + (v.b[2] - v.a[2]) * u];
    for (const x of pairs) { x.cls = CLS(x.A, x.B); x.vc = 0; if (PV) { const a0 = vol(PV.va, x.A), b0 = vol(PV.vd, x.B); if (a0 && b0) { const pa = ptAt(vol(va, x.A), x.uA), pb = ptAt(vol(vd, x.B), x.uB), qa = ptAt(a0, x.uA), qb = ptAt(b0, x.uB), n = x.n;
          x.vc = -(((pa[0] - qa[0]) - (pb[0] - qb[0])) * n[0] + ((pa[1] - qa[1]) - (pb[1] - qb[1])) * n[1] + ((pa[2] - qa[2]) - (pb[2] - qb[2])) * n[2]) / DT; } }
      // (ARTICULATED speed: the contact points' closing less the roots' own closing on the pair's horizontal normal — the bodies approaching is
      // core occupancy; a leg swinging into the other faster than its body moves is a fast limb)
      { const nh = x.nh || [-ua[0], -ua[1]]; x.vRoot = (sa.V[0] - sd.V[0]) * -nh[0] + (sa.V[1] - sd.V[1]) * -nh[1]; x.vArt = x.vc - Math.max(0, x.vRoot) * (x.hFrac || 1); }
      x.tier = x.both && (isLeg(x.A) || isLeg(x.B)) && x.vArt > R.vFast ? "FAST LIMB" : x.both ? "CORE" : "DETECTED"; }
    const res = pairs.filter((x) => x.both && x.gap < R.skin), soft = pairs.filter((x) => x.both);   // (the predictive wall reads the whole resolved envelope)
    const stA = this.supportState(A, t, sa), stD = this.supportState(D, t, sd);
    const rec = { k, t, dist, pairs: pairs.slice(0, 8).map((x) => ({ A: x.A, B: x.B, pen: +x.pen.toFixed(4), cls: x.cls, tier: x.tier, vc: +x.vc.toFixed(2), n: x.nh ? [+x.nh[0].toFixed(3), +x.nh[1].toFixed(3)] : null, at: x.at.map((v) => +v.toFixed(3)) })),
      maxPen: pairs.length ? pairs[0].pen : -R.skin, maxRes: res.length ? Math.max(...res.map((x) => x.pen)) : -R.skin, sup: [this.plantedStances(A, t).length, this.plantedStances(D, t).length], state: [stA, stD], act: [this.actionOf(A, t), this.actionOf(D, t)], committed: [cA, cD], dA: [0, 0], dD: [0, 0], eA: [0, 0], eD: [0, 0], conflict: false, us: 0 };
    // (THE NORMAL / TANGENT of the contact: the aggregate separating direction (from D to A), and the roots' relative velocity on it — approach
    // INTO the other on the normal (> 0 closing), sliding ALONG on the tangent)
    { let nb = [0, 0]; for (const x of res.length ? res : pairs.filter((y) => y.both)) { const n = x.nh || [-ua[0], -ua[1]], w = Math.max(0.01, R.skin - x.gap); nb = [nb[0] + n[0] * w, nb[1] + n[1] * w]; }
      const nm = hyp(nb[0], nb[1]); if (nm > 1e-9) { nb = [nb[0] / nm, nb[1] / nm]; const vr = [sa.V[0] - sd.V[0], sa.V[1] - sd.V[1]], tn = [-nb[1], nb[0]]; rec.normal = [+nb[0].toFixed(3), +nb[1].toFixed(3)]; rec.vn = +(-(vr[0] * nb[0] + vr[1] * nb[1])).toFixed(3); rec.vt = +(vr[0] * tn[0] + vr[1] * tn[1]).toFixed(3); } }
    // ── THE SPLIT (kinematics, never strength): approach into the other, planted feet; a still player none; a committed action none ──
    const apA = Math.max(0, sa.V[0] * ua[0] + sa.V[1] * ua[1]), apD = Math.max(0, -(sd.V[0] * ua[0] + sd.V[1] * ua[1])), still = (st, n) => n === 2 && hyp(st.V[0], st.V[1]) < R.still, eA = still(sa, rec.sup[0]) ? 0 : R.eps, eD = still(sd, rec.sup[1]) ? 0 : R.eps;
    let mA = (apA + eA) / (1 + rec.sup[0]), mD = (apD + eD) / (1 + rec.sup[1]); if (cA && !cD) mA = 0; if (cD && !cA) mD = 0; if (mA + mD <= 0) { mA = cA && !cD ? 0 : 1; mD = cD && !cA ? 0 : 1; }
    const sm = mA + mD, fA = sm > 0 ? mA / sm : 0, fD = sm > 0 ? mD / sm : 0; rec.share = [+fA.toFixed(3), +fD.toFixed(3)]; rec.approach = [+apA.toFixed(2), +apD.toFixed(2)];
    // ── THE CONSTRAINTS (normal only): CORE pairs to the contact tolerance (a closing gap approaches it smoothly; one already deeper is pushed out);
    // FAST LIMB pairs only beyond the hard limit and gently; a pair the roots cannot reach (planted lower legs) is a LEG CONFLICT, never pushed ──
    const legA = this.legPlant(A, t), legD = this.legPlant(D, t), Cn = [], legC = []; let limbN = 0;
    // (a FAST LIMB pair (R.limbMode "leg", chosen on the evidence): classified and reported, resolved like any leg pair — its own tolerance and the
    // leg rate, never more than R.limbCap a tick; "tolerate": Stage 2's first form, tolerated to R.limbTol then corrected at R.limbCap)
    const consOf = (x, gPrev, ahead) => { const leg = isLeg(x.A) || isLeg(x.B), ll = x.cls === "LEG ↔ LEG", fast = x.tier === "FAST LIMB" && R.limbMode === "tolerate", tl = fast ? R.limbTol : ll ? R.llTol : leg ? R.legTol : R.coreTol, al = leg ? R.legAlpha : R.alpha;
      const need = ahead ? (-tl - x.gap) / ahead : fast ? -tl - x.gap : (gPrev > -tl ? -tl + (gPrev + tl) * (1 - al) : Math.min(-tl, gPrev + R.recover)) - x.gap;
      let n = x.nh, h = x.hFrac; if (!n || h < 1e-6) { n = [-ua[0], -ua[1]]; h = R.hMin; } const e = cA && cD ? 1 : effOf(x.A, x.uA, legA) * fA + effOf(x.B, x.uB, legD) * fD;
      return { key: x.A + "|" + x.B, gap: x.gap, need, n, h: Math.max(R.hMin, h), e: Math.max(R.effMin, e), eRaw: e, low: e < R.effMin, cap: fast ? R.limbCap : Math.min(x.tier === "FAST LIMB" ? R.limbCap : Infinity, ll ? (x.pen <= R.hard ? R.llCap : R.llCapDeep) : leg && x.pen <= R.hard ? R.legCap : Infinity), fast: x.tier === "FAST LIMB", cls: x.cls }; };
    for (const x of res) { const key = x.A + "|" + x.B, cs = consOf(x, this.gapMem.has(key) ? this.gapMem.get(key) : x.gap, 0); if (cs.need > 1e-9 && cs.eRaw < R.effLeg) { legC.push({ A: x.A, B: x.B, pen: +x.pen.toFixed(4), e: +cs.eRaw.toFixed(2) }); continue; } if (cs.fast) limbN++; Cn.push(cs); }
    // (LOOK-AHEAD: both bodies posed R.look ticks ahead on their present plans; a CORE pair that will be beyond its tolerance asks for 1/look of
    // that depth now — the separation starts before the violation, not after it)
    if (R.look > 0) { if (!this.ahead) this.ahead = new Map(this.players.map((p) => [p, new PlayBody(this.env, p)])); const tF = t + R.look * DT, vaF = volumesOf(this.ahead.get(A).pose(tF).J), vdF = volumesOf(this.ahead.get(D).pose(tF).J);
      for (const x of detect(vaF, vdF, { within: 0 })) { if (!x.both) continue; const now = res.find((y) => y.A === x.A && y.B === x.B); x.tier = now ? now.tier : "CORE"; x.cls = CLS(x.A, x.B); if (x.tier !== "CORE") continue; const cs = consOf(x, 0, R.look); if (cs.need <= 1e-9 || cs.eRaw < R.effLeg) continue;
        const have = Cn.find((c) => c.key === cs.key); if (have) { if (cs.need > have.need) { have.need = cs.need; have.ahead = true; } } else Cn.push(Object.assign(cs, { ahead: true, noMem: true })); } }
    if (legC.length) { rec.legConflict = legC; this.occ.legConflicts = (this.occ.legConflicts || 0) + 1; } rec.limb = limbN;
    // (THE RAMP: a correction is written into the plan as a minimum-jerk path change over the next R.ramp ticks — what is already scheduled but
    // not yet executed counts against this tick's need, so nothing is asked twice)
    if (R.ramp > 0) { const pA = this.pending(A, k), pD = this.pending(D, k); for (const c of Cn) c.need -= ((pA[0] - pD[0]) * c.n[0] + (pA[1] - pD[1]) * c.n[1]) * c.h * c.e; }
    const viol = Cn.filter((c) => c.need > 1e-9); let r = [0, 0];
    if (viol.length) { r = minNorm(viol.map((c) => ({ n: c.n, c: Math.min(c.low ? R.lowCap : Infinity, c.cap, c.need / (c.h * c.e)) }))); const m = hyp(r[0], r[1]); if (m > R.rMax) r = [r[0] / m * R.rMax, r[1] / m * R.rMax]; }
    if (viol.length && cA && cD) { rec.conflict = true; this.occ.conflicts++; const E = this.occ.events, L = E[E.length - 1]; if (!L || L.kind !== "CONFLICT: BOTH COMMITTED" || k - L.k > 1) E.push({ k, t, kind: "CONFLICT: BOTH COMMITTED", what: rec.act.join(" · "), pen: +rec.maxRes.toFixed(3) }); else L.k = k; }
    // ── ALLOCATION FITTED TO SUPPORT: each share as far as its support takes it, the shortfall to the other, the rest unresolved ──
    let dA = [r[0] * fA, r[1] * fA], dD = [-r[0] * fD, -r[1] * fD]; const fa = this.capFit(A, dA, t, JA), fd = this.capFit(D, dD, t, JD); let sA = [dA[0] * (1 - fa.lam), dA[1] * (1 - fa.lam)], sD = [dD[0] * (1 - fd.lam), dD[1] * (1 - fd.lam)];
    dA = [dA[0] * fa.lam, dA[1] * fa.lam]; dD = [dD[0] * fd.lam, dD[1] * fd.lam]; const lim = [fa.why, fd.why];
    if (hyp(sA[0], sA[1]) > 1e-9) { const want = [dD[0] - sA[0], dD[1] - sA[1]], g = this.capFit(D, want, t, JD), tk = [(want[0] - dD[0]) * g.lam, (want[1] - dD[1]) * g.lam]; dD = [dD[0] + tk[0], dD[1] + tk[1]]; sA = [sA[0] + tk[0], sA[1] + tk[1]]; if (g.why) lim[1] = lim[1] || g.why; }
    if (hyp(sD[0], sD[1]) > 1e-9) { const want = [dA[0] - sD[0], dA[1] - sD[1]], g = this.capFit(A, want, t, JA), tk = [(want[0] - dA[0]) * g.lam, (want[1] - dA[1]) * g.lam]; dA = [dA[0] + tk[0], dA[1] + tk[1]]; sD = [sD[0] + tk[0], sD[1] + tk[1]]; if (g.why) lim[0] = lim[0] || g.why; }
    const left = hyp(sA[0], sA[1]) + hyp(sD[0], sD[1]); if (left > 1e-6) { rec.supportLimited = lim; rec.left = +left.toFixed(5); } rec.dA = dA; rec.dD = dD;
    // ── THE SOFT WALL (Stage 1's: relative paths, a virtual disk, gated on a predicted touch; a committed action takes no share) ──
    let wall = null; if (soft.length) { let nb = [0, 0], gmin = Infinity, rho = 0.23; for (const x of soft) { const n = x.nh || [-ua[0], -ua[1]], w = R.zone - x.gap; nb = [nb[0] + n[0] * w, nb[1] + n[1] * w]; if (x.gap < gmin) { gmin = x.gap; rho = x.rA + x.rB; } } const nm = hyp(nb[0], nb[1]);
      if (nm > 1e-9) { nb = [nb[0] / nm, nb[1] / nm]; const W0 = this.wallMem; if (W0 && k - W0.k <= 1) { gmin = Math.min(gmin, W0.g + R.wallOpen * DT); const a = 0.25, m2 = [W0.n[0] * (1 - a) + nb[0] * a, W0.n[1] * (1 - a) + nb[1] * a], mm = hyp(m2[0], m2[1]) || 1; nb = [m2[0] / mm, m2[1] / mm]; }
        this.wallMem = { k, g: gmin, n: nb }; rec.gmin = +gmin.toFixed(4); const wA = cA || this.preCommit(A, t) ? 0 : fA, wD = cD || this.preCommit(D, t) ? 0 : fD; if (wA + wD > 0) wall = this.softWall(t, nb, Math.max(gmin, -R.coreTol), rho, wA, wD); } }
    // ── APPLICATION, and the ledgers (what each player's root actually moved by at the next tick: push + wall) ──
    for (const [p, d, w, key, ek] of [[A, rec.dA, wall && wall.A, "wA", "eA"], [D, rec.dD, wall && wall.D, "wD", "eD"]]) { if (!(d[0] || d[1] || w)) continue; if (R.ramp > 0 && (d[0] || d[1])) this.pend.get(p).push({ d: d.slice(), k0: k }); const o = this.shiftPlan(p, d, t, w, R.ramp); if (o.cut > 0 || d[0] || d[1]) rec.acted = true; rec[key] = +o.cut.toFixed(4); rec[ek] = o.e; }
    rec.sce = []; for (const [p, d, e, i] of [[A, rec.dA, rec.eA, 0], [D, rec.dD, rec.eD, 1]]) { const CL = this.commitLedger(p, t); if (CL) { CL.v[0] += e[0]; CL.v[1] += e[1]; if (this.plantedStances(p, t).length) CL.air = [0, 0]; else { CL.air[0] += e[0]; CL.air[1] += e[1]; } }
      for (const [X, q] of this.plantedStances(p, t)) { const S = this.stanceLedger(p, X, q); S.push[0] += d[0]; S.push[1] += d[1]; S.wall[0] += e[0] - d[0]; S.wall[1] += e[1] - d[1]; rec.sce.push({ who: i ? "DEF" : "ATT", X, pos: q.pos, push: +hyp(...S.push).toFixed(4), total: +hyp(S.push[0] + S.wall[0], S.push[1] + S.wall[1]).toFixed(4), committed: !!rec.committed[i] }); } }
    // ── LIMB-LEVEL ACCOMMODATION (ordinary gait only; a committed action's — and a planned move's — steps are its own) ──
    rec.foot = [cA ? [] : this.footholds(A, D, vd, t), cD ? [] : this.footholds(D, A, va, t)].flat(); if (R.swingClear) { if (!cA) rec.foot.push(...this.swingPath(A, JA, vd, t)); if (!cD) rec.foot.push(...this.swingPath(D, JD, va, t)); } if (rec.foot.length) rec.acted = true;
    const ra = [rec.dA[0] - rec.dD[0], rec.dA[1] - rec.dD[1]], keep = new Set(); for (const c of Cn) { if (c.noMem) continue; this.gapMem.set(c.key, c.gap + (ra[0] * c.n[0] + ra[1] * c.n[1]) * c.h * c.e); keep.add(c.key); } for (const x of legC) keep.add(x.A + "|" + x.B); for (const kk of [...this.gapMem.keys()]) if (!keep.has(kk)) this.gapMem.delete(kk);
    // (a tick still beyond the hard limit is UNRESOLVED, with its reason — never hidden, never fixed by bending the animation or the support)
    if (rec.maxRes > R.hard) { const deep = res.reduce((a, x) => (x.pen > a.pen ? x : a), res[0]), commitLim = (rec.supportLimited || []).some((w) => w && w.startsWith("COMMITTED"));
      const why = rec.conflict || (commitLim && (cA || cD)) ? "UNRESOLVED COMMITTED CONFLICT" : legC.some((x) => x.pen > R.hard) ? "PLANTED LEGS" : rec.supportLimited ? "PLANTED SUPPORT" : deep && deep.tier === "FAST LIMB" ? "FAST LIMB CONTACT" : cA || cD ? "COMMITTED ACTION'S LIMB" : "AUTHORED / BALL-ANCHORED LIMB PATH";
      rec.unresolved = why; this.occ.unresolved = this.occ.unresolved || {}; this.occ.unresolved[why] = (this.occ.unresolved[why] || 0) + 1; }
    rec.r = [+ra[0].toFixed(5), +ra[1].toFixed(5)]; rec.us = (performance.now() - c0) * 1000; this.occ.log.push(rec); }
  // ── THE SOFT WALL's relative path (Stage 1's, unchanged) ──────────────────────────────────────────────────────────────────────────────────
  softWall(t, nb, g, rho, wA, wD) { const R = this.R, PA = this.att.plan, PD = this.def.plan, iA = Math.max(0, Math.round((t - PA.t0) / DT)), iD = Math.max(0, Math.round((t - PD.t0) / DT)), m = Math.min(PA.n - iA, Math.round(R.wallH / DT));
    if (m <= 0) return null; const R0 = rho + g, c = [nb[0] * R0, nb[1] * R0], relAt = (s) => { const a = 2 * (iA + s), d = 2 * Math.min(PD.n, iD + s); return [PA.P[a] - PD.P[d], PA.P[a + 1] - PD.P[d + 1]]; };
    const r0 = relAt(0), CA = new Float64Array(2 * (m + 1)), CD = new Float64Array(2 * (m + 1)); let p = [c[0], c[1]], prev = r0, cut = 0;
    { let q = [c[0], c[1]], pv = r0, dmin = Infinity; for (let s = 1; s <= m; s++) { const rel = relAt(s); q = [q[0] + rel[0] - pv[0], q[1] + rel[1] - pv[1]]; pv = rel; dmin = Math.min(dmin, hyp(q[0], q[1])); } if (dmin >= rho + R.wallGate) return null; }
    for (let s = 1; s <= m; s++) { const rel = relAt(s); p = [p[0] + rel[0] - prev[0], p[1] + rel[1] - prev[1]]; prev = rel;
      const Rr = rho - R.coreTol + (g + R.coreTol) * Math.exp(-s * DT / R.tau), pm = hyp(p[0], p[1]); if (pm < Rr) { const rr = pm > 1e-9 ? [p[0] / pm, p[1] / pm] : nb; p = [rr[0] * Rr, rr[1] * Rr]; }
      const C = [p[0] - (c[0] + rel[0] - r0[0]), p[1] - (c[1] + rel[1] - r0[1])]; CA[2 * s] = C[0] * wA; CA[2 * s + 1] = C[1] * wA; CD[2 * s] = -C[0] * wD; CD[2 * s + 1] = -C[1] * wD; cut = Math.max(cut, hyp(C[0], C[1])); }
    return cut > 1e-7 ? { A: wA > 0 ? { C: CA, m } : null, D: wD > 0 ? { C: CD, m } : null, cut } : null; }
  // ── APPLICATION (Stage 1's shiftPlan) + what the root executes at the next tick (e) ────────────────────────────────────────────────────────
  shiftPlan(p, d, t, wall = null, ramp = 0) { const P = p.plan, i0 = Math.max(0, Math.round((t - P.t0) / DT)), n = P.n, i1 = Math.min(n, i0 + 1), b1 = [P.P[2 * i1], P.P[2 * i1 + 1]], C = new Float64Array(2 * (n + 1)); let cut = 0;
    const tq = this.techOf(p), iF = tq && tq.tCommit > t + 1e-9 ? Math.max(i0, Math.round((tq.tCommit - P.t0) / DT)) : Infinity;
    for (let i = i0; i <= n; i++) { const g = ramp > 0 ? S5(Math.min(1, (i - i0) / ramp)) : 1; let cx = d[0] * g, cy = d[1] * g;
      if (ramp > 0 && (d[0] || d[1]) && i > i0 && i - i0 <= ramp) { const dg = (g - S5(Math.min(1, (i - 1 - i0) / ramp))) / DT; P.V[2 * i] += d[0] * dg; P.V[2 * i + 1] += d[1] * dg; }   // (the planned velocity follows the ramp)
      if (wall) { const s = Math.min(Math.min(i, iF) - i0, wall.m), wx = wall.C[2 * s], wy = wall.C[2 * s + 1]; cx += wx; cy += wy; cut = Math.max(cut, hyp(wx, wy));
        if (s >= 1 && i - i0 <= wall.m && i <= iF) { const dvx = (wx - wall.C[2 * s - 2]) / DT, dvy = (wy - wall.C[2 * s - 1]) / DT, dm = hyp(dvx, dvy);
          if (dm > 1e-9) { const ux = dvx / dm, uy = dvy / dm, against = -(P.V[2 * i] * ux + P.V[2 * i + 1] * uy), take = Math.min(dm, Math.max(0, against)), v0 = hyp(P.V[2 * i], P.V[2 * i + 1]);
            if (take > 0) { P.V[2 * i] += ux * take; P.V[2 * i + 1] += uy * take; if (P.ah && v0 > 0.5 && hyp(P.V[2 * i], P.V[2 * i + 1]) > 0.5) P.ah[i] = Math.atan2(P.V[2 * i + 1], P.V[2 * i]); } } } }
      P.P[2 * i] += cx; P.P[2 * i + 1] += cy; C[2 * i] = cx; C[2 * i + 1] = cy; }
    const at = (tau) => { const i = Math.min(n, Math.max(i0, Math.round((tau - P.t0) / DT))); return [C[2 * i], C[2 * i + 1]]; };
    const fm = new Map(), fr = (f) => { if (!f || !f.O) return f; let g = fm.get(f); if (!g) { const o = at(f.tC != null ? f.tC : t); g = Object.assign({}, f, { O: [f.O[0] + o[0], f.O[1] + o[1]] }); fm.set(f, g); } return g; };
    // (future stances move with the root; a SWINGING foot's lift-off stance too (R.swingShift) — the swing is interpolated from it, and left behind it
    // bent each swing by a different share of the shift: the feet's relative geometry changed, the swing corridor flipped and the foot whipped. A
    // swinging leg is carried with the body; a PLANTED stance never moves)
    const st = {}; for (const X of ["R", "L"]) { const L0 = P.stances[X], swinging = !L0.some((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9); let iLift = -1; if (this.R.swingShift && swinging && (d[0] || d[1])) for (let j = 0; j < L0.length; j++) if (L0[j].t1 <= t + 1e-9 && L0[j].pos) iLift = j;
      st[X] = L0.map((q, j) => { if (j === iLift) return Object.assign({}, q, { pos: [q.pos[0] + d[0], q.pos[1] + d[1]] }); if (!(q.t0 > t + 1e-9 && q.pos)) return q; const o = at(q.t0); return Object.assign({}, q, { pos: [q.pos[0] + o[0], q.pos[1] + o[1]], swingIn: q.swingIn && q.swingIn.frame ? Object.assign({}, q.swingIn, { frame: fr(q.swingIn.frame) }) : q.swingIn }); }); }
    P.stances = st;
    for (const c of P.contacts) if (!c.done && c.t > t - 1e-9) { const o = at(c.t); if (c.aim && c.aim.kind === "target" && c.aim.P) c.aim = Object.assign({}, c.aim, { P: [c.aim.P[0] + o[0], c.aim.P[1] + o[1]] }); if (c.frame) c.frame = fr(c.frame); }
    if (p.tk && p.tk.act && p.tk.owns(t) && (d[0] || d[1])) { const A = p.tk.act; if (!A.occOff) { A.occOff = [0, 0]; const bb = A.boot; A.boot = (tau) => { const b = bb(tau); return Object.assign({}, b, { a: [b.a[0] + A.occOff[0], b.a[1] + A.occOff[1], b.a[2]] }); }; } A.occOff[0] += d[0]; A.occOff[1] += d[1]; }
    if (this.R.carrySwing) this.carryCache(p, P, t, at); else this.dropCache(p, P); p.occShift = (p.occShift || 0) + hyp(d[0], d[1]); return { cut, e: [P.P[2 * i1] - b1[0], P.P[2 * i1 + 1] - b1[1]] }; }
  // the part of the scheduled ramps not yet executed at tick k
  pending(p, k) { const L = this.pend.get(p), R = this.R.ramp; let x = 0, y = 0; for (let i = L.length - 1; i >= 0; i--) { const j = k - L[i].k0; if (j >= R) { L.splice(i, 1); continue; } const rest = 1 - S5(j / R); x += L[i].d[0] * rest; y += L[i].d[1] * rest; } return [x, y]; }
  // (a changed plan: every body of that player forgets it — the plan's context AND its contacts' cached swings, which carry the frame they were
  // first resolved with (Stage 1 cleared only the live body's context: a contact's swing kept its pre-shift frame — the swing foot aimed at
  // stale waypoints and whipped to the shifted stance — and the access gate posed stale plans)
  // (THE SWING IN FLIGHT CARRIED, not rebuilt (R.carrySwing): the canonical body caches each swing per plan, built once from what it knew then
  // (the ball's track, the body's velocity); rebuilt mid-flight after a shift it reads the present and can re-plan the whole path — a Croqueta's
  // airborne foot jumped 93 cm in one tick. Each body keeps its swings; their keys after now and after the swing's ball contact move with the
  // root's shift at that key's time (the foot still meets the real ball, then lands on the moved stance); the stance list is rebuilt)
  carryCache(p, P, t, at) { for (const M of [this.bodies, this.gateB, this.ahead]) { const B = M && M.get(p); if (!B || !B.cache) continue; for (const c of P.contacts) B.cache.delete("cp" + c.id + "@" + P.v); const ctx = B.cache.get(P); if (!ctx) continue;
      for (const X of ["R", "L"]) ctx.st[X] = P.stances[X].map((s) => B.stanceOf(s)).sort((a, b) => a.t0 - b.t0);
      for (const w of ctx.sw.values()) { if (!(w.t1 > t + 1e-9) || !w.keys) continue; const t1 = Math.max(t, w.con ? w.con.t : -Infinity); for (const k of w.keys) { if (!(k.t > t1 + 1e-9)) continue; const o = at(k.t); k.p = [k.p[0] + o[0], k.p[1] + o[1], k.p[2]]; } } } }
  dropCache(p, P) { for (const M of [this.bodies, this.gateB, this.ahead]) { const B = M && M.get(p); if (!B || !B.cache) continue; B.cache.delete(P); for (const c of P.contacts) B.cache.delete("cp" + c.id + "@" + P.v); } }
  legPlant(p, t) { const o = {}; for (const X of ["R", "L"]) o[X] = p.plan.stances[X].some((s) => s.t0 <= t + 1e-9 && s.t1 > t + 1e-9); return o; }
  // (Stage 1's limb-level accommodation, unchanged: a landing on the opponent's planted ankle moved clear; a swing through his legs shortened)
  footholds(p, q, vq, t) { const out = [], P = p.plan, lp = this.legPlant(q, t); let changed = false; const st = { R: P.stances.R, L: P.stances.L }, tq = this.techOf(p), own = (s) => tq && s.t0 >= tq.tCommit - 0.25 && s.t0 < tq.tRelease;
    for (const X of ["R", "L"]) { const L = st[X], i = L.findIndex((s) => s.t0 > t + 1e-9 && s.pos); if (i < 0 || L.some((s) => s.t0 <= t + 1e-9 && s.t1 > t + 1e-9)) continue; const s = L[i]; if (own(s)) continue;
      for (const Y of ["R", "L"]) { if (!lp[Y]) continue; const qs = q.plan.stances[Y].find((x) => x.t0 <= t + 1e-9 && x.t1 > t + 1e-9); if (!qs || !(qs.t1 > s.t0)) continue;
        const d = [s.pos[0] - qs.pos[0], s.pos[1] - qs.pos[1]], m = hyp(d[0], d[1]), need = this.R.footClear - m; if (need <= 0) continue;
        const nd = m > 1e-6 ? [d[0] / m, d[1] / m] : (() => { const a = p.stateAt(t).P, b = q.stateAt(t).P, w = hyp(a[0] - b[0], a[1] - b[1]) || 1; return [(a[0] - b[0]) / w, (a[1] - b[1]) / w]; })();
        const ns = Object.assign({}, s, { pos: [s.pos[0] + nd[0] * need, s.pos[1] + nd[1] * need] }); st[X] = L.slice(); st[X][i] = ns; changed = true; out.push({ who: p.pid, foot: X, from: s.pos, to: ns.pos, by: +need.toFixed(3), clearOf: q.pid + " " + Y, landsIn: +(s.t0 - t).toFixed(3) }); } }
    if (changed) { P.stances = st; this.dropCache(p, P); } return out; }
  swingPath(p, J, vq, t) { const out = [], P = p.plan, legs = vq.filter((v) => /THIGH|SHIN|FOOT/.test(v.id)); let st = null; const tq = this.techOf(p);
    for (const X of ["R", "L"]) { const L = (st || P.stances)[X]; if (L.some((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9)) continue; const i = L.findIndex((q) => q.t0 > t + 1e-9 && q.pos); if (i < 0) continue; if (tq && L[i].t0 >= tq.tCommit - 0.25 && L[i].t0 < tq.tRelease) continue;
      const q0 = L[i], a = J["foot_" + X].j, land = (pos) => [pos[0], pos[1], 0.088], clear = (pos) => { let worst = Infinity; for (const v of legs) { const c = segClosest(a, land(pos), v.a, v.b), g = c.d - 0.07 - v.r; if (g < worst) worst = g; } return worst; };
      if (clear(q0.pos) >= -this.R.coreTol) continue; const L0 = hyp(q0.pos[0] - a[0], q0.pos[1] - a[1]); if (L0 < 0.12) continue; let lo = 0.10 / L0, hi = 1, best = null;
      for (let it = 0; it < 10; it++) { const m = (lo + hi) / 2, pos = [a[0] + (q0.pos[0] - a[0]) * m, a[1] + (q0.pos[1] - a[1]) * m]; if (clear(pos) >= -this.R.coreTol) { best = pos; lo = m; } else hi = m; }
      if (!best) continue; if (!st) st = { R: P.stances.R.slice(), L: P.stances.L.slice() }; st[X][i] = Object.assign({}, q0, { pos: best }); out.push({ who: p.pid, foot: X, from: q0.pos, to: best, by: +hyp(best[0] - q0.pos[0], best[1] - q0.pos[1]).toFixed(3), kind: "step shortened (its path crossed " + (p === this.att ? "DEF" : "ATT") + "'s legs)", landsIn: +(q0.t0 - t).toFixed(3) }); }
    if (st) { P.stances = st; this.dropCache(p, P); } return out; }
  techOf(p) { const a = p.plan.action; return a && a.tech && a.tCommit != null && a.tRelease != null && /BODY FEINT|CROQUETA/.test(a.label || "") ? a : null; }
  // a planted stance that the present plan's Body Feint / Croqueta commits on (it is still ahead, its commitment before the stance ends)
  preCommitStance(p, q, t) { const a = this.techOf(p); return !!(a && t < a.tCommit - 1e-9 && q.t1 > a.tCommit - 1e-9); }
  preCommit(p, t) { return this.plantedStances(p, t).some(([, q]) => this.preCommitStance(p, q, t)); }
  // a committed Body Feint / Croqueta at t (its action), else null
  moveCommitted(p, t) { const a = this.techOf(p); return a && t >= a.tCommit - 1e-9 && t < a.tRelease ? a : null; }
  committed(p, t) { if (p.tk && p.tk.owns(t)) return "TACKLE"; const a = p.plan.action; return a.tech && a.tCommit != null && t >= a.tCommit - 1e-9 && t < a.tRelease ? a.label : null; }
  actionOf(p, t) { const a = p.plan.action; return p.tk && p.tk.owns(t) ? "TACKLE " + p.tk.phaseAt(t) : a.label; }
}

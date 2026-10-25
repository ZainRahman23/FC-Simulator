// ═══ occupy3/o3_world.js — PLAYER OCCUPANCY STAGE 3: PHYSICAL IMPACT + BALANCE RESPONSE ═════════════════════════════════════════════════════════
// Stage 2 as decided (occupy2/, unchanged; the soft wall spares a planned move's approach) + one IMPACT PASS per tick after Stage 2's occupancy pass:
//   CONTACT → IMPACT → BALANCE RESPONSE → RECOVERY, for the class Stage 2 leaves unresolved — two physically incompatible motions meeting.
// ── CONTACT (the bodies as drawn, Stage 2's capsules): each penetrating pair is a BODY contact (pelvis, waist, chest / shoulders, the upper half of a
//    thigh — the hips) or a LIMB contact (a knee, a shin). An EPISODE begins at the first touching tick; it becomes an IMPACT only if the contact is
//    MEANINGFUL: the bodies close faster than RES3.uMin at a body contact, a limb strikes faster than RES3.limbMin (its articulated speed), or
//    Stage 2 cannot separate them (an unresolved tick). Otherwise nothing here acts: the run is Stage 2's, bit for bit.
// ── IMPACT (from the relative motion, never from who is who): a body contact is a velocity constraint on the two bodies' closing speed along the
//    contact normal (the posed contact point; the bodies' velocities = their roots' motion + the drawn pelvis's), removed over RES3.tauC — a soft,
//    inelastic human collision. Its effective mass is each body's at that point: the whole mass (the rig's own 73 kg, equal for both — no ratings)
//    reduced by the rotation the point's lever allows (the tilt and yaw inertias of the POSED body about its centre of mass). A limb strike is a
//    one-off impulse with the leg's mass. A planted leg aligned against the impulse is a STRUT: the ground takes the axial share (friction-capped).
//    The rest changes the body's centre-of-mass velocity; its moment about the hips rotates the trunk (lean, side, yaw); the knees absorb (crouch).
// ── BALANCE (the linear inverted pendulum about the authored motion): per player the perturbation's centre-of-mass offset e (from its support's
//    authored relation: the root's displacement since the stance landed, the drawn pelvis's, what could not be realised) and velocity u; the
//    capture point ξ = e + u/ω (ω = √(g / z_com)); the support's SLACK along ξ (the planted footprints' polygon about the authored centre of
//    pressure, the hip strategy's few cm). The centre of pressure moves inside the slack to drive ξ back (a capture-point controller); outside it
//    ξ diverges. The OUTCOME: A ABSORB · B CORRECT (lean / rotation, no step) · C RECOVERY STEP (one new foot placement catches it) · D STAGGER
//    CANDIDATE (more than one step) · E FALL CANDIDATE (no reachable placement) — the demand |ξ| / slack is the continuous severity.
// ── THE BODY (o3_body.js): the perturbation drawn on the authored pose — the pelvis displaced over the SAME feet (the legs re-solved: planted feet
//    never move), the trunk's lean / side / rotation, the knees, the arms (abduction with the demand), the head (counter-rotating) — each a damped
//    oscillator driven by the impulse and the balance controller (the hip strategy), never a canned clip.
// ── REALISATION: the perturbation moves the ROOT only as far as Stage 2's support rules allow (an ordinary stance's 12 cm lean inside the leg's
//    reach; a committed action's 2 cm per plant / 12 per commitment — committed feet stay exact); the rest is the drawn pelvis (≤ RES3.pelvisCap);
//    beyond it the body cannot be where its momentum takes it: OVERFLOW — the balance model must step, or it is a fall candidate.
// ── RECOVERY STEP (ordinary players, and a committed one once released): the foot that can reach soonest without crossing lands where the capture
//    point will be (its predicted divergence until the landing), through the canonical swing (a new plan version: the body blends 0.12 s);
//    impact → imbalance → the foot moves → plants → weight accepted → settles → ordinary locomotion re-plans from there.
// ── ACTION INTERRUPTION (committed actions, explicit rules): UNAFFECTED · PERTURBED BUT CONTINUES (the posture holds it) · TECHNICAL EVENT
//    COMPLETES, RECOVERY REPLACED (after the decisive touch / the tackle's contact: the rest of the authored action gives way to the recovery) ·
//    INTERRUPTED BEFORE TECHNICAL EVENT (the decisive touch is no longer reachable) · STAGGER / FALL CANDIDATE. A touch is denied only for
//    geometry (the leg cannot reach the ball from the displaced hips, or the foot is the recovery step's). The ball and possession stay with the
//    authority (possess1/): nothing here assigns, transfers or rolls possession.
// NOT HERE (Stage 3B): stumbles, trips, falls, ground contact, get-up; fouls; strength ratings; outcome tuning.
import { OccupancyWorld2 } from "../occupy2/o2_world.js";
import { volumesOf, detect, OCC } from "../occupy1/o_volumes.js";
import { comOf, footPoly, hull, polyMargin, polyReach, regionOf, facingSide, capPt } from "./o3_geom.js";
import { ImpactBody } from "./o3_body.js";
import { PlayBody } from "../vocab2/u_body.js";
import { setImpactWorld } from "./o3_run.js";
const DT = 1 / 240, hyp = Math.hypot, G = 9.81, DEG = 180 / Math.PI, clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]], sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]], mul2 = (a, k) => [a[0] * k, a[1] * k], dot2 = (a, b) => a[0] * b[0] + a[1] * b[1], len2 = (a) => hyp(a[0], a[1]);
const unit2 = (a, d = [1, 0]) => { const m = hyp(a[0], a[1]); return m > 1e-12 ? [a[0] / m, a[1] / m] : d; };
export const RES3 = {
  uMin: 0.30,        // m/s: a body contact is an impact when the bodies close faster than this (slower: Stage 2's occupancy alone — a brush)
  limbMin: 1.0,      // m/s: a limb contact is a strike when its articulated closing (beyond the bodies') exceeds this
  artTicks: 3,       // the articulated speed over 3 ticks (a re-plan's blend or a re-aimed swing moves a drawn leg a few mm in a tick: over one tick, metres per second)
  artCap: { THIGH: 3.0, SHIN: 4.5 },   // m/s: a knee / a shin's speed relative to its own body in football running — the physiological ceiling of a strike
  tauC: 0.03,        // s: the body contact's closing speed removed with this time constant (≈ 0.08 s to 95 %: a soft human collision)
  mu: 0.9,           // studs on grass: the ground's horizontal impulse ≤ μ m g Δt through a strut leg
  legFrac: 0.2,      // a leg's mass fraction (thigh + shank + foot, the rig's table ≈ 0.20): a limb strike's effective mass
  kXi: 3.0,          // 1/s: the capture-point controller's convergence (inside the slack)
  hipOrd: 0.03, hipCom: 0.02,   // m: the hip strategy's extra reach of the centre of pressure (ordinary / committed)
  slackStand: 0.85, slackMove: 0.6, slackCom: 0.5,   // the share of the footprint polygon's reach usable around the authored centre of pressure
  pelvisOrd: 0.06, pelvisCom: 0.10,   // m: the drawn pelvis's displacement from the root (the legs re-solved to the same feet)
  relax: 6.0,        // 1/s: an ordinary player's pelvis offset handed back to the root (its support permitting)
  oRelease: 0.008,   // m per tick: an overflow realised once a new support allows (Stage 2's per-tick scale)
  stepOut: 0.42, stepCross: 0.10, stepMax: 0.95,   // m: a recovery step's adjustment outward / across the stance foot; its distance from the stance foot
  stepMin: 0.05,     // m: a landing adjusted less than this is the gait's own variation — the next landing captures it (CORRECT), not a recovery step
  liftMaxSpeed: 1.2, // m/s: above this a body does not lift a planted foot to step — its gait's next landing (re-aimed) is the recovery step
  reachLand: 0.75,   // m: a step's target never further than this from the body (the root) at its landing
  minWidth: 0.08,    // m: a recovery step lands on its own side of the stance foot by at least this (no crossover steps)
  tUnload: 0.04, tSwing0: 0.17, tSwing1: 0.22,       // s: a planted foot unloads, then swings (0.17 + 0.22 × distance)
  lock: 0.13,        // s: a swing landing sooner than this is not re-aimed (the canonical blend is 0.12 s — a later edit would land unblended)
  // the posture oscillators: natural frequency (rad/s), damping ratio, limit (deg, or m for the crouch)
  osc: { lean: [8, 0.75, 28], side: [8, 0.75, 22], trunk: [9, 0.65, 30], yaw: [10, 0.8, 14], crouch: [9, 0.9, 0.06] },
  trunkShare: 0.55,  // the share of the impulse's moment about the hips taken by the trunk's rotation (the legs and the ground take the rest)
  balLean: 10,       // deg: the hip strategy's lean against the imbalance at full demand
  settle: { xi: 0.012, u: 0.04, P: 0.0015, ang: 0.25 },   // regained: the capture point, velocity, pelvis and posture back within these
  quiet: 0.15,       // s without contact before an episode may end
  failHold: 0.12,    // s an unrealisable overflow may persist before it is a fall candidate
  fallFade: 0.30,    // s: after a fall candidate's failure point the perturbation fades (a labelled diagnostic placeholder — Stage 3B)
};
const OSC_KEYS = ["lean", "side", "trunk", "yaw", "crouch"];
const isBodyRegion = (id, u) => id === "PELVIS" || id === "WAIST" || id === "CHEST" || (/^THIGH/.test(id) && u < 0.5);
const newState = () => ({ active: false, u: [0, 0], P: [0, 0], O: [0, 0], oT: 0, osc: Object.fromEntries(OSC_KEYS.map((k) => [k, { x: 0, v: 0 }])), pose: null, step: null, steps: [], landAdj: new Map(), prevRoot: null, prevP: [0, 0],
  bal: null, peak: { demand: 0, xi: 0, u: 0, P: 0, lean: 0, yaw: 0, O: 0 }, cls: "—", outcome: null, fall: null, fadeFrom: null, regained: null, imp: [0, 0], nImp: 0 });
export class ImpactWorld extends OccupancyWorld2 {
  // o.imp: RES3 overrides · o.impact === false: Stage 3 off (the world is then Stage 2 as decided, exactly)
  constructor(env, o = {}) { super(env, o); this.X = Object.assign({}, RES3, o.imp || {}); this.impOn = o.impact !== false && this.occOn;
    this.mass = (env.skel && env.skel.identity && env.skel.identity.weightKg) || 73; this.MF = env.body.massFrac; this.hipH = env.body.pelvisY;
    this.ps = new Map(this.players.map((p) => [p, newState()])); this.imp = { log: [], events: [], episodes: [], ep: null, cpu: [] };
    if (!this.impOn) return;
    // (the bodies drawn with the perturbation — the live ones Stage 2 measures, and its ball-access gate's)
    const src = (sim, t) => { const s = this.ps.get(sim); return s && s.pose && s.pose.on && Math.abs(t - sim.t) < 1.5 * DT ? s.pose : null; };
    this.bodies = new Map(this.players.map((p) => [p, new ImpactBody(env, p, src)])); this.gateB = new Map(this.players.map((p) => [p, new ImpactBody(env, p, src)]));
    // (after each player's simulation step: a recovery step pending is applied to whatever plan the canonical planner just adopted — before any pose of
    // it, so the body's own 0.12 s blend carries the swing to its new landing)
    for (const p of this.players) { const st = p.step.bind(p); p.step = (req) => { const r = st(req); const s = this.ps.get(p); if (s.step && !s.step.landed) this.applyStep(p, s.step); return r; }; }
    // (a touch: denied if the perturbed body cannot reach it — the playing leg from the displaced hips — or the foot is the recovery step's)
    for (const p of this.players) { const ex = p.execute.bind(p); p.execute = (c) => { const s = this.ps.get(p), why = s.active ? this.touchBlocked(p, c) : null; if (!why) return ex(c);
      c.done = true; c.missed = true; c.blocked = { impact: why }; p.contacts.push(Object.assign(p.contactRec(c, p.ball.v, p.ball.v, null), { missed: true, impact: why })); p.flags.replan = p.flags.replan || "missed contact";
      this.event(p, "TOUCH DENIED", why, { role: c.role || "touch", F: c.F }); }; }
    if (this.tk) { const pr = this.tk.probes.bind(this.tk); this.tk.probes = (t) => { pr(t); const A = this.tk.act, s = this.ps.get(this.def); if (!A || !s.active || !(s.P[0] || s.P[1])) return; const opp = this.att.opp, fresh = opp.filter((q) => q.kind === "tackle" && q.tk === A.n && Math.abs(q.t0 - t) < 1e-9 && !q.hit); if (!fresh.length) return;
      // (the boot follows the authored reach from the hips; displaced by the impact it must still be reachable from them)
      const why = this.bootBlocked(A, t); if (!why) return; for (const q of fresh) opp.splice(opp.indexOf(q), 1); if (!A.impBlocked) { A.impBlocked = t; this.event(this.def, "TACKLE BOOT DENIED", why, {}); } }; }
  }
  event(p, kind, why, o = {}) { this.imp.events.push(Object.assign({ k: this.k, t: +(this.k * DT).toFixed(4), who: p ? p.pid : "—", kind, why }, o)); }
  step(reqA, reqD) { super.step(reqA, reqD); if (this.impOn) { const c0 = performance.now(); this.impactPass(); this.imp.cpu.push(performance.now() - c0); } }
  // ═══ THE BODY'S PHYSICAL STATE FROM THE POSE ══════════════════════════════════════════════════════════════════════════════════════════════════
  // the centre of mass, its height, the hips, the inertias about the centre of mass (tilt about the horizontal axis ⟂ n, yaw) and of the trunk
  // about the hips (pitch / roll / yaw) — every segment at its bone's midpoint with the rig's mass fraction
  bodyOf(J, n) { const MF = this.MF, m = this.mass, c = comOf(J, MF), hip = [(J.thigh_R.j[0] + J.thigh_L.j[0]) / 2, (J.thigh_R.j[1] + J.thigh_L.j[1]) / 2, (J.thigh_R.j[2] + J.thigh_L.j[2]) / 2];
    let It = 0, Iy = 0.25, Ith = 0, Ithy = 0.12; const TR = /^(spine|chest|head|upperArm|foreArm)/;
    for (const k in MF) { const b = J[k]; if (!b) continue; const w = MF[k] * m, p = [(b.j[0] + b.t[0]) / 2, (b.j[1] + b.t[1]) / 2, (b.j[2] + b.t[2]) / 2], d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], along = n ? d[0] * n[0] + d[1] * n[1] : 0;
      It += w * (d[2] * d[2] + along * along); Iy += w * (d[0] * d[0] + d[1] * d[1]); if (TR.test(k)) { const h = [p[0] - hip[0], p[1] - hip[1], p[2] - hip[2]]; Ith += w * (h[0] * h[0] + h[1] * h[1] + h[2] * h[2]); Ithy += w * (h[0] * h[0] + h[1] * h[1]); } }
    return { c, hip, It: Math.max(4, It), Iy: Math.max(0.6, Iy), Ith: Math.max(1.5, Ith), Ithy: Math.max(0.15, Ithy), z: c[2], w: Math.sqrt(G / Math.max(0.6, c[2])) }; }
  // ═══ THE IMPACT PASS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  impactPass() { const t = this.att.t, k = this.k, X = this.X, A = this.att, D = this.def, SA = this.ps.get(A), SD = this.ps.get(D), sa = A.stateAt(t), sd = D.stateAt(t), dist = hyp(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]);
    // (the bodies' PHYSICAL velocities: the plan's (the authored motion, the soft wall's edits included) + the impact perturbation's — Stage 2's
    // positional corrections are a constraint, not a velocity (they move a root ≤ 3 cm in a tick: as a velocity, 7 m/s); and each body's FRAME as
    // drawn (root + pelvis, measured tick to tick): a contact point's ARTICULATED velocity is its motion in that frame — the swing of a limb)
    const vPhys = (s, st) => [st.V[0] + s.u[0], st.V[1] + s.u[1]], vFrame = (s, st) => (s.prevRoot && s.prevRoot.k === k - 1 ? [(st.P[0] - s.prevRoot.P[0] + s.P[0] - s.prevP[0]) / DT, (st.P[1] - s.prevRoot.P[1] + s.P[1] - s.prevP[1]) / DT] : [st.V[0], st.V[1]]);
    const vA = vPhys(SA, sa), vD = vPhys(SD, sd), fA = vFrame(SA, sa), fD = vFrame(SD, sd), active = SA.active || SD.active;
    const done = () => { for (const [s, st] of [[SA, sa], [SD, sd]]) { s.prevRoot = { k, P: st.P.slice() }; s.prevP = s.P.slice(); } };
    if (!active && dist > OCC.broad) { if (this.imp.ep) this.closeEpisode(t); this.prevV3 = null; return done(); }
    const LP = this.livePoses(), va = volumesOf(LP.a.J), vd = volumesOf(LP.d.J), H = this.volHist || (this.volHist = []); while (H.length && H[0].k < k - X.artTicks) H.shift();
    const PV = H.length && H[0].k === k - X.artTicks ? H[0] : null, nT = X.artTicks; H.push({ k, va, vd, rA: sa.P.slice(), rD: sd.P.slice(), pA: SA.P.slice(), pD: SD.P.slice() });
    const pairs = dist <= OCC.broad ? detect(va, vd, { within: 0 }).filter((x) => x.both) : [];
    // ── THE CONTACT: each touching pair, BODY or LIMB; the bodies' closing speed on its normal, and its limbs' articulated closing (the contact points'
    // motion in their bodies' frames, from last tick's capsules) ──
    for (const x of pairs) { x.body = isBodyRegion(x.A, x.uA) && isBodyRegion(x.B, x.uB); x.n2 = x.nh || unit2(sub2(sa.P, sd.P)); x.vBody = dot2(sub2(vD, vA), x.n2);
      x.vArt = null; if (PV) { const a0 = PV.va.find((v) => v.id === x.A), b0 = PV.vd.find((v) => v.id === x.B); if (a0 && b0) { const pa = capPt(va.find((v) => v.id === x.A), x.uA), pb = capPt(vd.find((v) => v.id === x.B), x.uB), qa = capPt(a0, x.uA), qb = capPt(b0, x.uB);
          // (the contact points' motion over nT ticks less their bodies' frames' (root + pelvis) over the same ticks; each side capped at its limb's ceiling)
          const T = nT * DT, gA = [(sa.P[0] - PV.rA[0] + SA.P[0] - PV.pA[0]) / T, (sa.P[1] - PV.rA[1] + SA.P[1] - PV.pA[1]) / T], gD = [(sd.P[0] - PV.rD[0] + SD.P[0] - PV.pD[0]) / T, (sd.P[1] - PV.rD[1] + SD.P[1] - PV.pD[1]) / T];
          const cap = (id, v) => { const c = X.artCap[id.replace(/_[RL]$/, "")]; if (!c) return v; const m = len2(v); return m > c ? mul2(v, c / m) : v; };
          const aA = cap(x.A, [(pa[0] - qa[0]) / T - gA[0], (pa[1] - qa[1]) / T - gA[1]]), aB = cap(x.B, [(pb[0] - qb[0]) / T - gD[0], (pb[1] - qb[1]) / T - gD[1]]); x.vArt = dot2(sub2(aB, aA), x.n2); } }
      x.legA = /^(THIGH|SHIN)_/.test(x.A) && !isBodyRegion(x.A, x.uA) ? x.A.slice(-1) : null; x.legB = /^(THIGH|SHIN)_/.test(x.B) && !isBodyRegion(x.B, x.uB) ? x.B.slice(-1) : null; }
    const touching = pairs.length > 0, rec2 = this.occ.log.length && this.occ.log[this.occ.log.length - 1].k === k ? this.occ.log[this.occ.log.length - 1] : null;
    let ep = this.imp.ep;
    if (touching && !ep) ep = this.imp.ep = { n: this.imp.episodes.length + 1, k0: k, t0: t, active: false, last: k, why: null, pairs: new Set(), strikes: new Set(), onset: null, peakPen: 0, J: [0, 0], players: {} };
    if (ep && touching) { ep.last = k; for (const x of pairs) ep.pairs.add(x.A + "|" + x.B); ep.peakPen = Math.max(ep.peakPen, pairs[0].pen);
      if (!ep.active) { // ── MEANINGFUL? ──
        const bodyC = pairs.filter((x) => x.body), vb = bodyC.length ? Math.max(...bodyC.map((x) => x.vBody)) : -Infinity, limb = pairs.filter((x) => !x.body && x.vArt != null && x.vArt > X.limbMin), unres = rec2 && rec2.unresolved;
        const why = vb > X.uMin ? `BODY CONTACT closing ${vb.toFixed(2)} m/s` : limb.length ? `LIMB STRIKE ${limb[0].vArt.toFixed(2)} m/s (${regionOf(limb[0].A, limb[0].uA)} / ${regionOf(limb[0].B, limb[0].uB)})` : unres ? `STAGE 2 UNRESOLVED (${unres})` : null;
        if (why) { ep.active = true; ep.why = why; ep.kA = k; ep.onset = this.onsetFacts(t, pairs, sa, sd, vA, vD, LP); for (const s of [SA, SD]) { if (!s.active) { Object.assign(s, newState(), { active: true, prevRoot: s.prevRoot, prevP: s.prevP, steps: [], ep: ep.n, t0: t }); } } this.event(null, "IMPACT", why, { ep: ep.n }); } } }
    if (ep && !touching && (k - ep.last) * DT > X.quiet && !SA.active && !SD.active) this.closeEpisode(t);
    if (!SA.active && !SD.active) return done();
    // ── THE IMPULSES of this tick (each player's, on his centre of mass and about his hips) ──
    const bodies = { A: this.bodyOf(LP.a.J, null), D: this.bodyOf(LP.d.J, null) }, Jt = { A: [0, 0], D: [0, 0] }, lev = { A: [], D: [] }, rec = { k, t, pairs: [], imp: null, strike: [] };
    if (ep && ep.active && touching) {
      // BODY: the deepest body pair's normal and point; the constraint on the closing speed of the bodies there
      const bc = pairs.filter((x) => x.body); if (bc.length) { const x = bc[0], n = x.n2, c = x.at, close = x.vBody;
        if (close > 0) { const BA = this.bodyOf(LP.a.J, n), BD = this.bodyOf(LP.d.J, n), mA = this.effMass(A, BA, c, n), mD = this.effMass(D, BD, c, n), mu = 1 / (1 / mA.m + 1 / mD.m), j = mu * close * Math.min(1, DT / X.tauC);
          Jt.A = add2(Jt.A, mul2(n, j)); Jt.D = add2(Jt.D, mul2(n, -j)); lev.A.push({ c, J: mul2(n, j) }); lev.D.push({ c, J: mul2(n, -j) });
          rec.imp = { pair: x.A + " / " + x.B, regions: regionOf(x.A, x.uA) + " / " + regionOf(x.B, x.uB), n: n.map((v) => +v.toFixed(3)), c: c.map((v) => +v.toFixed(3)), close: +close.toFixed(3), mA: +mA.m.toFixed(1), mD: +mD.m.toFixed(1), j: +j.toFixed(3) }; } }
      // LIMB strikes: a swinging limb's articulated closing, once per pair of limbs per episode (the strongest pair of the tick), each side's effective
      // mass at the point — a swinging leg's about its hip (I_hip / d²), a planted leg's the whole body's through it — delivered over 6 ticks
      { const L = pairs.filter((x) => !x.body && x.vArt != null && x.vArt > X.limbMin).sort((a, b) => b.vArt - a.vArt)[0];
        if (L) { const key = (L.legA || "b") + "|" + (L.legB || "b"); if (!ep.strikes.has(key)) { ep.strikes.add(key);
          const mA = this.limbMass(A, LP.a.J, L.legA, L.at, L.n2, bodies.A, t), mD = this.limbMass(D, LP.d.J, L.legB, L.at, L.n2, bodies.D, t), mu = 1 / (1 / mA + 1 / mD), j = mu * L.vArt;
          (ep.queue || (ep.queue = [])).push({ J: mul2(L.n2, j), c: L.at, n: 6 });
          rec.strike.push({ pair: L.A + " / " + L.B, regions: regionOf(L.A, L.uA) + " / " + regionOf(L.B, L.uB), art: +L.vArt.toFixed(2), mA: +mA.toFixed(1), mD: +mD.toFixed(1), j: +j.toFixed(2) }); this.event(null, "LIMB STRIKE", `${regionOf(L.A, L.uA)} / ${regionOf(L.B, L.uB)} at ${L.vArt.toFixed(2)} m/s (effective masses ${mA.toFixed(1)} / ${mD.toFixed(1)} kg): ${j.toFixed(1)} N·s`, { ep: ep.n }); } } }
      ep.J = add2(ep.J, Jt.A); }
    // (the strikes' impulses, spread over their 6 ticks)
    if (ep && ep.queue && ep.queue.length) { for (const q of ep.queue) { const jA = mul2(q.J, 1 / 6); Jt.A = add2(Jt.A, jA); Jt.D = add2(Jt.D, mul2(jA, -1)); lev.A.push({ c: q.c, J: jA }); lev.D.push({ c: q.c, J: mul2(jA, -1) }); q.n--; } ep.queue = ep.queue.filter((q) => q.n > 0); }
    // ── A SWINGING LEG BLOCKED (the trip risk, instrumented — Stage 3B's): a player's leg in its swing held more than the hard limit (5 cm) inside the
    // opponent's leg for 6 ticks (25 ms): the swing cannot pass — that foot cannot land where it must. Recorded with its state; a fall candidate
    // when that foot is the one the balance needs to step with
    if (ep && ep.active) { const bl = this.blocked || (this.blocked = new Map()); const seen = new Set();
      for (const x of pairs) { if (x.pen <= OCC.hard) continue; for (const [p, leg, oth] of [[A, x.legA, x.B], [D, x.legB, x.A]]) { if (!leg || !/^(THIGH|SHIN)/.test(oth)) continue; if (this.plantedStances(p, t).some(([Y]) => Y === leg)) continue; const key = p.pid + leg; seen.add(key);
          const n = (bl.get(key) || 0) + 1; bl.set(key, n); if (n === 6) { const s = this.ps.get(p); s.legBlocked = (s.legBlocked || []).concat([{ t, X: leg, by: oth, pen: +x.pen.toFixed(3) }]); this.event(p, "SWINGING LEG BLOCKED (trip risk)", `the ${leg === "R" ? "right" : "left"} leg ${(x.pen * 100).toFixed(1)} cm inside his ${oth} for 25 ms: the swing cannot pass`, { X: leg });
            if (s.active && s.bal && /RECOVERY STEP|STAGGER|FALL/.test(s.bal.cls) && ((s.step && !s.step.landed && s.step.X === leg) || (s.bal.step && s.bal.step.X === leg)) && !s.fall) this.markFall(p, s, t, Object.assign({}, s.bal, { why: `TRIP: the stepping foot (${leg}) is blocked by the opponent's ${oth} — the recovery step it must make cannot pass` }), p.stateAt(t), bodies[p === A ? "A" : "D"] || this.bodyOf(p === A ? LP.a.J : LP.d.J, null), [0, 0], [0, 0]); } } }
      for (const k of [...bl.keys()]) if (!seen.has(k)) bl.delete(k); }
    rec.pairs = pairs.slice(0, 4).map((x) => ({ A: x.A, B: x.B, pen: +x.pen.toFixed(4), body: x.body, vBody: +x.vBody.toFixed(2), vArt: x.vArt == null ? null : +x.vArt.toFixed(2), regions: regionOf(x.A, x.uA) + " / " + regionOf(x.B, x.uB) }));
    // ── EACH PLAYER: the response, the balance, the realisation, the step, the action ──
    rec.p = [];
    for (const [p, s, st, B, J, L, key] of [[A, SA, sa, bodies.A, Jt.A, lev.A, "A"], [D, SD, sd, bodies.D, Jt.D, lev.D, "D"]]) { if (!s.active) { rec.p.push(null); continue; }
      const J3 = key === "A" ? LP.a.J : LP.d.J; rec.p.push(this.player(p, s, st, B, J, L, J3, t, rec2)); }
    rec.dist = +dist.toFixed(3); this.imp.log.push(rec); done(); }
  // the effective mass of a body at contact point c along n: 1 / (1/m + h²/I_tilt + l²/I_yaw) — the lever's rotation reduces it
  effMass(p, B, c, n) { const d = [c[0] - B.c[0], c[1] - B.c[1], c[2] - B.c[2]], h = d[2], l = -d[0] * n[1] + d[1] * n[0], m = this.mass;
    return { m: 1 / (1 / m + h * h / B.It + l * l / B.Iy), h, l }; }
  // a limb's effective mass at point c: a swinging leg's about its hip (I_hip / d², ≤ the leg's mass); a planted leg — or a body region — the whole
  // body's through it (effMass at c)
  limbMass(p, J3, X, c, n, B, t) { if (!X || this.plantedStances(p, t).some(([Y]) => Y === X)) return this.effMass(p, this.bodyOf(J3, n), c, n).m;
    const h = J3["thigh_" + X].j, MF = this.MF, m = this.mass; let I = 0, ml = 0; for (const seg of ["thigh_", "shin_", "foot_"]) { const b = J3[seg + X], w = MF[seg + X] * m, q = [(b.j[0] + b.t[0]) / 2 - h[0], (b.j[1] + b.t[1]) / 2 - h[1], (b.j[2] + b.t[2]) / 2 - h[2]]; I += w * (q[0] * q[0] + q[1] * q[1] + q[2] * q[2]); ml += w; }
    const d2 = (c[0] - h[0]) ** 2 + (c[1] - h[1]) ** 2 + (c[2] - h[2]) ** 2; return clamp(I / Math.max(1e-4, d2), 2, ml); }
  // the ground's share of an impulse through a planted leg aligned against it (a strut: its axial component, compressive only, friction-capped)
  strut(p, t, J, B, J3) { const planted = this.plantedStances(p, t); if (!planted.length || len2(J) < 1e-9) return [0, 0]; let best = [0, 0], bm = 0;
    for (const [X] of planted) { const a = J3["foot_" + X].j, d = [B.c[0] - a[0], B.c[1] - a[1], B.c[2] - a[2]], L = hyp(d[0], d[1], d[2]) || 1, ax = (J[0] * d[0] + J[1] * d[1]) / L; if (ax >= 0) continue;
      const g = [-ax * d[0] / L, -ax * d[1] / L], gm = len2(g); if (gm > bm) { bm = gm; best = g; } }
    const cap = this.X.mu * this.mass * G * DT; return bm > cap ? mul2(best, cap / bm) : best; }
  // ── one player's tick ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  player(p, s, st, B, J, levers, J3, t, rec2) { const X = this.X, m = this.mass, psi = st.psi, f = [Math.cos(psi), Math.sin(psi)], r = [-f[1], f[0]];   // (r: the player's RIGHT in pitch coordinates)
    const out = { pid: p.pid }; const cm = this.committed(p, t), pre = !cm && this.preCommit(p, t), held = !!(cm || pre);
    // (a recovery step landing: its adjustment beyond where the foot would have landed becomes its stance's own — the relation the perturbation is
    // measured from; weight acceptance follows (the canonical load), then the body settles)
    if (s.step && !s.step.landed && t >= s.step.tLand - 1e-9) { const S = s.step; S.landed = true; S.tLanded = t; S.adj = sub2(S.pos, S.base); s.landAdj.set(S.id, S.adj.slice()); this.event(p, "STEP LANDED", `${S.X} — ${(len2(S.adj) * 100).toFixed(0)} cm from where it would have landed; weight acceptance`, { X: S.X, pos: S.pos.map((v) => +v.toFixed(3)) }); }
    // (1) THE IMPULSE: the strut's share to the ground, the rest to the centre of mass; its moment about the hips to the trunk; the knees absorb
    if (J[0] || J[1]) { const g = this.strut(p, t, J, B, J3), Jb = sub2(J, g), du = mul2(Jb, 1 / m); s.u = add2(s.u, du); s.imp = add2(s.imp, Jb); s.nImp++;
      for (const L of levers) { const jb = mul2(L.J, len2(J) > 1e-12 ? len2(Jb) / len2(J) : 0), h = L.c[2] - B.hip[2], o = [L.c[0] - B.hip[0], L.c[1] - B.hip[1]], jf = dot2(jb, f), jr = dot2(jb, r), of = dot2(o, f), or = dot2(o, r), sh = X.trunkShare;
        s.osc.lean.v += sh * jf * h / B.Ith * DEG; s.osc.side.v += sh * jr * h / B.Ith * DEG; s.osc.trunk.v += sh * (jr * of - jf * or) / B.Ithy * DEG * 0.5; s.osc.yaw.v += (1 - sh) * (jr * of - jf * or) / B.Iy * DEG * 0.5; }
      s.osc.crouch.v += 0.04 * len2(du) / Math.max(0.05, DT * 8); out.J = Jb.map((v) => +v.toFixed(3)); out.ground = g.map((v) => +v.toFixed(3)); }
    // (2) THE SUPPORT: planted stances, the footprints' polygon, the authored centre of pressure, ω
    // (the support polygon: the planted feet whose ball is ON THE TURF as drawn — the canonical body lifts a planted foot early at times: it holds nothing)
    const planted = this.plantedStances(p, t), feet = planted.map(([Xf]) => Xf).filter((Xf) => J3["toe_" + Xf].j[2] < 0.06), poly = feet.length ? hull(feet.flatMap((Xf) => footPoly(J3, Xf))) : null, com2 = [B.c[0] - s.P[0], B.c[1] - s.P[1]];
    let cop = null; if (feet.length === 1) { const a = J3["foot_" + feet[0]].j, tip = J3["toe_" + feet[0]].t; cop = [(a[0] + tip[0]) / 2, (a[1] + tip[1]) / 2]; } else if (feet.length === 2) { cop = polyMargin(poly, com2) > 0 ? com2 : poly.reduce((a, q) => [a[0] + q[0] / poly.length, a[1] + q[1] / poly.length], [0, 0]); }
    const moving = st.s > 0.3, kS = held ? X.slackCom : feet.length === 2 && !moving ? X.slackStand : X.slackMove, hipS = held ? X.hipCom : X.hipOrd;
    // the perturbation's centre-of-mass offset from the support's authored relation: the newest stance's ledger (root shifts since it landed, less a
    // recovery step's own adjustment) + the drawn pelvis + what could not be realised
    let led = [0, 0]; if (planted.length) { const [Xn, q] = planted.reduce((a, b) => (b[1].t0 > a[1].t0 ? b : a)); const S = this.stanceLedger(p, Xn, q), adj = s.landAdj.get(q.id) || [0, 0]; led = sub2(add2(S.push, this.impOnly(S, held)), adj); }   // (Stage 2's pushes and the impact's root shifts — the soft wall's path change is the player's own (voluntary), not a displacement)
    const e = add2(add2(led, s.P), s.O), w = B.w, xi = add2(e, mul2(s.u, 1 / w)), xm = len2(xi), xh = unit2(xi, f);
    const slackDir = (u) => (cop && poly ? polyReach(poly, cop, u) * kS : 0) + hipS, d = slackDir(xh), demand = xm / Math.max(1e-3, d);
    // (3) THE BALANCE CONTROLLER: the centre of pressure inside the slack drives ξ back; outside, saturated, ξ diverges (the LIP about the authored motion)
    const qWant = mul2(xi, 1 + X.kXi / w), qm = len2(qWant), q = qm > d ? mul2(xh, d) : qWant; if (feet.length) s.u = add2(s.u, mul2(sub2(e, q), w * w * DT));   // (no ball of a foot on the turf: no ground, no horizontal force)
    // (4) THE OUTCOME (A – E) and the recovery step
    const bal = this.capture(p, s, t, xi, d, w, held, planted, J3, st, f, r); s.bal = bal; s.cls = bal.cls;
    if (held && bal.cls === "CORRECT" && bal.demand > 1 && !s.outcome) s.outcome = { kind: "PERTURBED BUT CONTINUES", why: `ξ ${(xm * 100).toFixed(0)} cm: beyond the centre of pressure's ${(d * 100).toFixed(0)} cm, carried by the support chain (the pelvis over the authored feet)`, t };
    if (bal.cls === "RECOVERY STEP" || bal.cls === "STAGGER CANDIDATE" || bal.cls === "FALL CANDIDATE") {
      // (a step only when its adjustment is a step: below RES3.stepMin the gait's own landing is the step — its limits left no room to adjust it)
      if (held) this.decideAction(p, s, t, bal, cm, pre); else if ((!s.step || (s.step.landed && t - s.step.tLanded > 0.05)) && bal.step && bal.cls !== "FALL CANDIDATE" && len2(bal.step.adj) >= X.stepMin) this.planStep(p, s, t, bal.step, bal.cls); }
    s.fallN = bal.cls === "FALL CANDIDATE" ? (s.fallN || 0) + 1 : 0; if (s.fallN >= 3 && !s.fall) { if (bal.step && (!s.step || s.step.landed) && len2(bal.step.adj) >= X.stepMin) this.planStep(p, s, t, bal.step, bal.cls); this.markFall(p, s, t, bal, st, B, xi, e); }
    // (5) THE REALISATION: the root as far as its support allows (Stage 2's own budgets), the drawn pelvis, the overflow
    const fade = s.fadeFrom != null ? clamp(1 - (t - s.fadeFrom) / X.fallFade, 0, 1) : 1; if (fade < 1) { s.u = mul2(s.u, fade); }
    let dRoot = [0, 0]; const want = mul2(s.u, DT), capP = held ? X.pelvisCom : X.pelvisOrd;
    { const fit = this.impFit(p, want, t, J3, held), lam = fit.lam; dRoot = mul2(want, lam); let rest = mul2(want, 1 - lam);
      // (an ordinary player's pelvis hands its offset back to the root; an overflow is realised once the support allows)
      if (!held) { const back = mul2(s.P, -Math.min(1, X.relax * DT)), f2 = this.impFit(p, add2(dRoot, mul2(back, -1)), t, J3, held); if (f2.lam >= 1 - 1e-9) { dRoot = add2(dRoot, mul2(back, -1)); s.P = add2(s.P, back); }
        if (len2(s.O) > 1e-9) { const o = mul2(unit2(s.O), Math.min(len2(s.O), X.oRelease)), f3 = this.impFit(p, add2(dRoot, o), t, J3, held); if (f3.lam >= 1 - 1e-9) { dRoot = add2(dRoot, o); s.O = sub2(s.O, o); } } }
      let P2 = add2(s.P, rest); const pm = len2(P2); if (pm > capP) { const over = mul2(unit2(P2), pm - capP); P2 = sub2(P2, over); s.O = add2(s.O, over); } s.P = P2; }
    if (fade < 1) { s.P = mul2(s.P, fade); s.O = mul2(s.O, fade); }
    if (len2(dRoot) > 1e-9) this.shiftRoot(p, dRoot, t);
    if (!held && len2(s.O) > 0.01 && (!s.step || (s.step.landed && t - s.step.tLanded > 0.05)) && planted.length === 2) this.followStep(p, s, t, planted, f, r);
    s.oT = len2(s.O) > 0.005 && !(s.step && !s.step.landed) ? s.oT + DT : 0; if (s.oT > X.failHold && !s.fall && !held) this.markFall(p, s, t, Object.assign({}, bal, { cls: "FALL CANDIDATE", why: `the body's momentum cannot be realised over its support for ${(s.oT * 1000).toFixed(0)} ms (overflow ${(len2(s.O) * 100).toFixed(1)} cm)` }), st, B, xi, e);
    // (6) THE POSTURE: the oscillators (impulse-driven) + the hip strategy against the imbalance, the arms with the demand, the head counter-rotating
    const dm = clamp(demand, 0, 2), xF = dot2(xh, f), xR = dot2(xh, r), tgt = { lean: -X.balLean * clamp(demand, 0, 1) * xF, side: -X.balLean * 0.6 * clamp(demand, 0, 1) * xR, trunk: 0, yaw: 0, crouch: 0.012 * clamp(demand, 0, 1.5) };
    for (const kk of OSC_KEYS) { const O = s.osc[kk], [wn, z, lim] = X.osc[kk]; const a = -wn * wn * (O.x - tgt[kk]) - 2 * z * wn * O.v; O.v += a * DT; O.x = clamp((O.x + O.v * DT) * fade, -lim, lim); if (Math.abs(O.x) >= lim) O.v = 0; }
    const arms = clamp(0.5 * clamp(demand - 0.3, 0, 1.4), 0, 0.6) * fade, armSide = clamp(-0.6 * xR * clamp(demand - 0.3, 0, 1), -0.5, 0.5) * fade;
    s.pose = { on: true, pelvis: s.P.slice(), yaw: s.osc.yaw.x / DEG, lean: s.osc.lean.x, side: s.osc.side.x, trunk: s.osc.trunk.x, crouch: Math.max(-0.01, s.osc.crouch.x), arms, armSide, headYaw: -0.6 * (s.osc.trunk.x + s.osc.yaw.x), headDrop: 4 * clamp(demand - 0.5, 0, 1) };
    // (7) THE PEAKS, the severity, regained?
    // (the episode's severity: the peak of σ held for three consecutive ticks — a capture analysis that predicts a stagger for one tick and is caught
    // by the next landing is not a stagger)
    const pk = s.peak, sig = this.sigmaOf(bal); s.sigma = sig; const H3 = s.sig3 || (s.sig3 = []); H3.push(Math.min(1, bal.held ? bal.demand * bal.d / bal.carry : bal.demand)); if (H3.length > 3) H3.shift(); pk.inplace = Math.max(pk.inplace || 0, H3.length === 3 ? Math.min(...H3) : 0); pk.sigma = Math.max(pk.sigma || 0, sig); pk.demand = Math.max(pk.demand, demand); pk.xi = Math.max(pk.xi, xm); pk.u = Math.max(pk.u, len2(s.u)); pk.P = Math.max(pk.P, len2(s.P)); pk.O = Math.max(pk.O, len2(s.O)); pk.lean = Math.max(pk.lean, Math.abs(s.osc.lean.x), Math.abs(s.osc.side.x)); pk.yaw = Math.max(pk.yaw, Math.abs(s.osc.trunk.x), Math.abs(s.osc.yaw.x));
    if (s.fadeFrom != null && t - s.fadeFrom > X.fallFade) { s.active = false; s.pose = null; s.handedBack = t; const ep0 = this.imp.ep; if (ep0) ep0.players[p.pid] = this.summary(p, s, t); this.event(p, "FALL CANDIDATE — PLACEHOLDER ENDS", "the perturbation faded out (a labelled diagnostic placeholder, not physics): Stage 2 drives the player again", {}); return Object.assign(out, { cls: "FALL CANDIDATE", fall: true }); }
    const ep = this.imp.ep, quiet = !ep || (this.k - ep.last) * DT > X.quiet, S5 = X.settle, calm = xm < S5.xi && len2(s.u) < S5.u && len2(s.P) < S5.P && len2(s.O) < 1e-3 && OSC_KEYS.every((kk) => Math.abs(s.osc[kk].x) < (kk === "crouch" ? 0.001 : S5.ang)) && !(s.step && !s.step.landed);
    if (calm && quiet && (!s.step || s.step.landed)) this.regain(p, s, t);
    Object.assign(out, { state: this.supportState(p, t, st), committed: cm || (pre ? "PLANNED MOVE (its commit stance)" : null), feet, poly: poly ? poly.map((v) => [+v[0].toFixed(3), +v[1].toFixed(3)]) : null, cop: cop && cop.map((v) => +v.toFixed(3)), com: B.c.map((v) => +v.toFixed(3)),
      u: s.u.map((v) => +v.toFixed(3)), e: e.map((v) => +v.toFixed(3)), xi: xi.map((v) => +v.toFixed(3)), slack: +d.toFixed(3), demand: +demand.toFixed(3), sigma: +sig.toFixed(3), cls: bal.cls, sev: ImpactWorld.band(sig), sevPeak: this.severity(s), P: s.P.map((v) => +v.toFixed(4)), O: s.O.map((v) => +v.toFixed(4)), root: dRoot.map((v) => +v.toFixed(4)),
      step: s.step ? { X: s.step.X, tLand: +s.step.tLand.toFixed(3), pos: s.step.pos.map((v) => +v.toFixed(3)), d: +len2(s.step.adj).toFixed(3), landed: !!s.step.landed } : null, osc: Object.fromEntries(OSC_KEYS.map((kk) => [kk, +s.osc[kk].x.toFixed(2)])), outcome: s.outcome, fall: !!s.fall });
    return out; }
  // THE SEVERITY σ (continuous; the labels are its diagnostic bands): captured in place σ = |ξ| / slack (0 – 1); by the next landing as planned
  // σ = 1 (MODERATE: the gait's own step catches it); by a recovery step σ = 1 + its adjustment / RES3.stepOut (STRONG, 1 – 2); beyond one step
  // σ = 2 + the uncaught residual / stepOut (SEVERE: stagger / fall candidate)
  sigmaOf(bal) { if (!bal) return 0; const X = this.X; if (bal.cls === "ABSORB" || (bal.cls === "CORRECT" && bal.demand <= 1)) return Math.min(1, bal.demand); if (bal.cls === "CORRECT") return 1;
    if (bal.held) { const r = bal.demand * bal.d / bal.carry; return r <= 1 ? r : 1 + Math.min(0.99, r - 1); } if (bal.cls === "RECOVERY STEP") return bal.step ? 1 + Math.min(0.99, len2(bal.step.adj) / X.stepOut) : 1; return 2 + (bal.step ? bal.step.resid / X.stepOut : 1); }
  static band(sig) { return sig < 0.15 ? "BRUSH" : sig < 0.6 ? "LIGHT" : sig < 1.0001 ? "MODERATE" : sig < 2 ? "STRONG" : "SEVERE"; }
  // THE EPISODE'S SEVERITY is the REALISED one: in place — the peak in-place demand held three ticks (≤ 1); one recovery step — 1 + its adjustment / the
  // step's reach; more than one (≥ 10 cm each) or a stagger prediction that came true — 2 + …; a fall candidate — ≥ 3. (The per-tick σ the Lab
  // shows is the PREDICTED demand at that tick.)
  realised(s) { const big = s.steps.filter((x) => len2(x.adj) >= 0.10), mx = s.steps.length ? Math.max(...s.steps.map((x) => len2(x.adj))) : 0;
    if (s.fall) return 3; if (big.length > 1 || s.steps.some((x) => x.cls === "STAGGER CANDIDATE" && len2(x.adj) >= 0.10)) return 2 + Math.min(0.99, (s.steps.length - 1) * 0.25 + mx / this.X.stepOut * 0.5); if (s.steps.length) return 1 + Math.min(0.99, mx / this.X.stepOut);
    return Math.min(1, s.peak.inplace || 0); }
  severity(s) { return ImpactWorld.band(this.realised(s)); }
  // how much of a root shift d the support takes: a committed (or planned) action — Stage 2's capFit exactly (2 cm per plant, 12 per commitment: the
  // owner's decision, the impact's shifts counted in the same ledger); an ordinary player — the planted legs' REACH (Stage 2's own reach rule: the
  // drawn hip within the leg's length of each planted ankle). Stage 2's 12 cm lean allowance stays what it was — the bound on occupancy's positional
  // pushes; the impact's momentum carries the body as far as the planted leg physically reaches, and the recovery step catches it
  impFit(p, d, t, J, held) { if (held) return this.capFit(p, d, t, J); if (hyp(d[0], d[1]) < 1e-12) return { lam: 1 }; const P2 = this.plantedStances(p, t); if (!P2.length) return { lam: 1 };
    const newest = P2.reduce((a, b) => (b[1].t0 > a[1].t0 ? b : a))[1]; let lam = 1, why = null; const lim = (l, w) => { if (l < lam - 1e-12) { lam = l; why = w; } };
    for (const [X, q] of P2) {
      const H = J["thigh_" + X].j, A = J["foot_" + X].j, v = Math.max(0, H[2] - A[2] - this.R.drop), Lr = this.R.reach * this.legLen, rmax = Math.sqrt(Math.max(0, Lr * Lr - v * v)), h = [H[0] - A[0], H[1] - A[1]];
      lim(OccupancyWorld2.fitDisk(h, d, Math.max(rmax, hyp(h[0], h[1]))), q.t0 >= newest.t0 - 1e-9 ? "LEG REACH" : "TRAILING LEG REACH"); }
    return { lam, why }; }
  // the impact's own root shifts in a stance's ledger not already in Stage 2's push (an ordinary player's)
  impOnly(S, held) { return held || !S.imp ? [0, 0] : S.imp; }
  // ═══ THE OUTCOME: can the present support capture ξ; else which foot, when, where; how many steps ═════════════════════════════════════════════
  capture(p, s, t, xi, d, w, held, planted, J3, st, f, r) { const xm = len2(xi), xh = unit2(xi, f), X = this.X;
    if (xm <= d) return { cls: xm < 0.35 * d ? "ABSORB" : "CORRECT", demand: xm / d, d, w };
    if (held) { const carry = d + 0.8 * X.pelvisCom; return xm <= carry ? { cls: "CORRECT", demand: xm / d, d, w, held: true, carry, why: "carried by the support chain (the pelvis over the authored feet)" } : { cls: "RECOVERY STEP", demand: xm / d, d, w, held: true, carry, why: "the committed action's support chain cannot hold ξ" }; }
    // THE PREDICTION (the linear inverted pendulum, closed form): on the present support the centre of pressure saturates at the slack along ξ̂ —
    // u(τ) = ω (e − q) sinh ωτ + u cosh ωτ — until that support ends; then flight (no horizontal force: u constant) until the landing
    const e0 = sub2(xi, mul2(s.u, 1 / w)), q = mul2(xh, d), sup = planted.length ? Math.min(...planted.map(([, qq]) => qq.t1)) : t;
    const lip = (eA, qA, tau) => { if (tau <= 0) return s.u; const sh = Math.sinh(w * tau), chh = Math.cosh(w * tau); return add2(mul2(sub2(eA, qA), w * sh), mul2(s.u, chh)); };
    const uAt = (tL) => (!planted.length ? s.u : lip(e0, q, Math.min(tL, Math.max(t, sup)) - t));
    // (a planted foot lifted: the OTHER foot alone carries the body until the step lands — the pivot is that foot: its own relation (its ledger, less
    // its own landing adjustment), its own footprint's slack, for the whole step)
    const pivot = (oth) => { const pq = planted.find(([Y]) => Y === oth); if (!pq) return null; const S = this.stanceLedger(p, oth, pq[1]), eo = add2(add2(sub2(add2(S.push, this.impOnly(S, held)), s.landAdj.get(pq[1].id) || [0, 0]), s.P), s.O), xo = add2(eo, mul2(s.u, 1 / w)), xoh = unit2(xo, xh);
      const fp = footPoly(J3, oth), a = J3["foot_" + oth].j, tip = J3["toe_" + oth].t, c = [(a[0] + tip[0]) / 2, (a[1] + tip[1]) / 2], so = polyReach(fp, c, xoh) * X.slackMove + X.hipOrd; return { eo, qo: mul2(xoh, Math.min(len2(xo), so)), pq }; };
    // the landing must catch what its carried place does not: the drawn pelvis, the overflow, the velocity's capture offset at the landing (a swing's
    // landing — and a lifted foot's new stance — move with every root shift: the displacement the root realises is carried)
    const opts = [], slackNew = 0.065 * X.slackMove + X.hipOrd; let locked = 0;
    for (const Xf of ["R", "L"]) { const oth = Xf === "R" ? "L" : "R", Ls = p.plan.stances[Xf], cur = Ls.find((qq) => qq.t0 <= t + 1e-9 && qq.t1 > t + 1e-9), nx = Ls.find((qq) => qq.t0 > t + 1e-9 && qq.pos), othPl = planted.some(([Y]) => Y === oth);
      let tLand, base, kind, newer = false;
      if (!cur && nx) { tLand = nx.t0; if (tLand - t < X.lock) { locked++; continue; } base = nx.pos; kind = "swing re-aimed"; }
      else if (!cur && !nx) { if (st.s > X.liftMaxSpeed) continue; const a = J3["foot_" + Xf].j; base = add2([a[0], a[1]], mul2(s.u, X.tSwing0)); kind = "free foot placed"; tLand = null; }
      else if (cur && othPl) { // (the weight is on the foot that landed last: of two planted feet only the older one lifts — steps alternate; and only
        // a slow body lifts a planted foot to step (standing, walking): a moving one's gait brings its next landing within a stride — that one is re-aimed)
        // (alternation is a preference: the foot that landed last carries the weight — it may still step outward when the other one cannot help (its
        // step would cross), unloading first (later))
        const oq = planted.find(([Y]) => Y === oth)[1]; if (st.s > X.liftMaxSpeed) continue; newer = cur.t0 > oq.t0 + 1e-9;
        const S = this.stanceLedger(p, Xf, cur); base = add2(cur.pos, add2(S.push, this.impOnly(S, held))); kind = newer ? "loaded foot lifted (unloads first)" : "planted foot lifted"; tLand = null; }
      else continue;
      const tU = X.tUnload * (newer ? 2 : 1); let tl = tLand != null ? tLand : t + tU + X.tSwing0, need = null; const pv = /foot lifted/.test(kind || "") ? pivot(oth) : null;
      if (tLand == null) { const r0 = p.stateAt(t).P, r1 = p.stateAt(t + tU + X.tSwing0 + 0.05).P; base = add2(base, sub2(r1, r0)); }
      for (let it = 0; it < 2; it++) { const dz = add2(add2(s.P, s.O), mul2(pv ? lip(pv.eo, pv.qo, tl - t) : uAt(tl), 1 / w)); need = sub2(dz, mul2(unit2(dz, xh), Math.min(len2(dz), slackNew))); if (tLand == null) tl = t + tU + X.tSwing0 + X.tSwing1 * len2(need); }
      // THE PLACEMENT: the gait's own landing (base) + an ADJUSTMENT toward the capture point, at most RES3.stepOut — and every limit below only
      // SHRINKS that adjustment (never moves the foot beyond the landing the gait meant): across the stance foot's line it may not go further than
      // the landing itself already does (or the minimum stance width) — no crossover steps; away from the body at the landing no further than the
      // leg reaches (or than the gait's own landing already is); a lifted foot never onto its partner
      const sx = Xf === "R" ? 1 : -1, oSt = pv ? pv.pq[1] : p.plan.stances[oth].find((qq) => qq.t0 <= tl + 1e-9 && qq.t1 > tl + 1e-9) || (planted.find(([Y]) => Y === oth) || [])[1], os = oSt && oSt.pos ? oSt.pos : null, rL = p.stateAt(tl).P;
      let adj = len2(need) > X.stepOut ? mul2(unit2(need), X.stepOut) : need.slice(); const at = (lam) => add2(base, mul2(adj, lam));
      const ok = (q) => { if (os) { const latB = dot2(sub2(base, os), r) * sx, latQ = dot2(sub2(q, os), r) * sx; if (latQ < Math.min(latB, X.minWidth) - 1e-6) return false; if (len2(sub2(q, os)) < 0.16 && len2(sub2(base, os)) >= 0.16) return false; }
        const dB = len2(sub2(base, rL)), dQ = len2(sub2(q, rL)); if (dQ > Math.max(X.reachLand, dB) + 1e-6) return false; return true; };
      if (!ok(at(1))) { let lo = 0, hi = 1; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (ok(at(m))) lo = m; else hi = m; } adj = mul2(adj, lo); }
      const pos = add2(base, adj), nR = dot2(adj, r) * sx;
      const realAdj = sub2(pos, base), resid = len2(sub2(need, realAdj));
      opts.push({ X: Xf, tLand: tl, tLift: tLand == null ? (kind === "free foot placed" ? t : t + tU) : null, base, pos, adj: realAdj, need, resid, kind, newer, useful: len2(realAdj) >= X.stepMin, yaw: Math.atan2(f[1], f[0]) + sx * 0.12 * (nR > 0 ? 1 : 0) }); }
    // (no foot available NOW is not a fall: a moving body between its gait's events — both feet down, the next landing not planned yet, or landing
    // within the canonical blend — steps as soon as its next landing exists; a fall candidate is a capture point no reachable step can catch)
    if (!opts.length) return { cls: "RECOVERY STEP", demand: xm / d, d, w, step: null, pending: true, why: locked ? "the swinging foot lands within the canonical blend (not re-aimed): it is the next support; the step after it catches the rest" : "no foot can step this instant (both down at speed / the next landing not yet planned): the next landing will be re-aimed" };
    // (the best: a step that can adjust at all, the least uncaught; between two close ones the foot not carrying the weight)
    opts.sort((a, b) => (b.useful - a.useful) || (Math.abs(a.resid - b.resid) < 0.03 ? a.newer - b.newer : 0) || a.resid - b.resid || len2(a.adj) - len2(b.adj)); const best = opts[0];
    if (best.resid <= 0.03) return len2(best.adj) < X.stepMin ? { cls: "CORRECT", demand: xm / d, d, w, why: `the next landing captures it (its adjustment < ${(X.stepMin * 100).toFixed(0)} cm)` } : { cls: "RECOVERY STEP", demand: xm / d, d, w, step: best };
    // more than one step: the other foot after this one lands (≈ 0.25 s later), its residual grown meanwhile
    const r2 = best.resid * Math.exp(w * 0.25); if (r2 <= X.stepOut + slackNew) return { cls: "STAGGER CANDIDATE", demand: xm / d, d, w, step: best, why: `one step leaves ${(best.resid * 100).toFixed(0)} cm uncaught (${best.X}); a second step needs ${(r2 * 100).toFixed(0)} cm` };
    return { cls: "FALL CANDIDATE", demand: xm / d, d, w, step: best, why: `the capture point runs away: one step leaves ${(best.resid * 100).toFixed(0)} cm, the next would need ${(r2 * 100).toFixed(0)} cm` }; }
  // ═══ THE RECOVERY STEP ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  planStep(p, s, t, o, cls) { s.step = { X: o.X, tLift: o.tLift, tLand: o.tLand, pos: o.pos, base: o.base, adj: o.adj, yaw: o.yaw, kind: o.kind, cls, t, id: null, landed: false, plan: null };
    s.steps.push(s.step); p.flags.replan = p.flags.replan || "impact: recovery step";   // (a new plan version: the body blends to the new landing)
    this.event(p, "RECOVERY STEP", `${o.X} ${o.kind} — lands at +${(o.tLand - t).toFixed(3)} s, ${(len2(o.adj) * 100).toFixed(0)} cm from where it would have landed${cls !== "RECOVERY STEP" ? " (" + cls + ")" : ""}`, { X: o.X, tLand: +o.tLand.toFixed(4), pos: o.pos.map((v) => +v.toFixed(3)) }); }
  // the trailing foot (the older of two planted) steps up beside the newer one, a stance width apart, along the body's motion — the weight already moved
  followStep(p, s, t, planted, f, r) { const X = this.X, [[Xa, qa], [Xb, qb]] = planted, old = qa.t0 <= qb.t0 ? [Xa, qa] : [Xb, qb], nw = old[0] === Xa ? [Xb, qb] : [Xa, qa], sx = old[0] === "R" ? 1 : -1;
    const tLift = t + X.tUnload, dur = X.tSwing0 + 0.1, ahead = mul2(s.u, dur + X.tUnload), pos = add2(add2(nw[1].pos, mul2(r, sx * 0.20)), ahead), base = old[1].pos.slice();
    if (p.stateAt(t).s > X.liftMaxSpeed) return;   // (a moving body's gait brings that foot up itself)
    this.planStep(p, s, t, { X: old[0], tLift, tLand: tLift + dur, pos, base, adj: sub2(pos, base), yaw: Math.atan2(f[1], f[0]), kind: "following step (the trailing foot)" }, "RECOVERY STEP"); }
  // the step in the plan the body draws: the stepping foot's landing at the step's place and time; a lifted foot's stance ends at its lift; that
  // foot's touches during the step are the step's (cancelled)
  applyStep(p, S) { const P = p.plan, t = p.t; if (S.plan === P) return; const L = P.stances[S.X].slice();
    if (S.tLift != null) { const i = L.findIndex((q) => q.t0 <= S.tLift + 1e-9 && q.t1 > S.tLift + 1e-9); if (i >= 0 && L[i].t0 < S.tLift - 1e-9) L[i] = Object.assign({}, L[i], { t1: S.tLift }); for (let j = L.length - 1; j >= 0; j--) if (L[j].t0 > S.tLift + 1e-9) L.splice(j, 1);
      L.push({ id: S.id || (S.id = 900000 + this.k * 2 + (S.X === "R" ? 0 : 1)), F: S.X, t0: S.tLand, t1: Infinity, pos: S.pos.slice(), yaw: S.yaw, kind: "recovery step", src: "stand" });
      // (the other foot is the support until the step lands: its stance held past the landing, its own steps before then dropped)
      const Y = S.X === "R" ? "L" : "R", LY = P.stances[Y].slice(), j = LY.findIndex((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9);
      if (j >= 0 && LY[j].t1 < S.tLand + 0.06) { LY[j] = Object.assign({}, LY[j], { t1: S.tLand + 0.06 }); for (let i2 = LY.length - 1; i2 > j; i2--) if (LY[i2].t0 < S.tLand + 0.06) LY.splice(i2, 1); P.stances = Object.assign({}, P.stances, { [Y]: LY }); } }
    else { let i = S.id != null ? L.findIndex((q) => q.id === S.id && q.t0 > t + 1e-9) : -1; if (i < 0) i = L.findIndex((q) => q.t0 > t + 1e-9 && q.pos); if (i < 0) return; S.id = L[i].id;
      // (the step lands when it was planned to: a re-plan that moved this landing later has its swing shortened back — a recovery step is not delayed)
      const t0 = Math.max(t + DT, Math.min(L[i].t0, S.tLand)); L[i] = Object.assign({}, L[i], { pos: S.pos.slice(), t0, kind: (L[i].kind || "").replace(/ · recovery step$/, "") + " · recovery step" }); if (i > 0 && L[i - 1].t1 > t0) L[i - 1] = Object.assign({}, L[i - 1], { t1: Math.min(L[i - 1].t1, t0) }); }
    L.sort((a, b) => a.t0 - b.t0); P.stances = Object.assign({}, P.stances, { [S.X]: L }); this.dropCache(p, P); S.plan = P;
    for (const c of P.contacts) if (!c.done && c.F === S.X && c.t > t - 1e-9 && c.t < S.tLand + 0.05) { c.done = true; c.missed = true; c.blocked = { impact: "the foot is the recovery step" }; this.event(p, "TOUCH DENIED", "the foot is the recovery step", { role: c.role || "touch", F: c.F }); } }
  // ═══ THE ACTION (committed): explicit rules ═════════════════════════════════════════════════════════════════════════════════════════════════════
  decideAction(p, s, t, bal, cm, pre) { if (s.outcome && s.outcome.final) return;
    // (the chain carries a perturbation the centre of pressure cannot: while ξ ≤ the slack + 80 % of the pelvis's compliance the authored action goes on)
    const carry = bal.carry; if (bal.demand * bal.d <= carry) { if (!s.outcome) s.outcome = { kind: "PERTURBED BUT CONTINUES", why: `ξ ${(bal.demand * bal.d * 100).toFixed(0)} cm: carried by the support chain (slack ${(bal.d * 100).toFixed(0)} cm + the pelvis)`, t }; return; }
    const mv = this.moveCommitted(p, t), tk = p.tk && p.tk.owns(t) ? p.tk.act : null, a = p.plan.action;
    const made = mv ? p.contacts.find((c) => c.actionId === mv.id && c.decisive) : null, failed = !!(made && made.missed);
    if (failed) { this.release(p, s, t, mv, null, false, "INTERRUPTED BEFORE TECHNICAL EVENT", `the decisive touch was not made (${made.impact || (made.blocked ? "blocked" : "missed")}); the support cannot hold ξ ${(bal.demand * bal.d * 100).toFixed(0)} cm`); return; }
    const before = mv ? !made : tk ? t - tk.t0 < tk.M.tc - 1e-9 : pre;
    // (before the decisive event: the touch is protected while the posture can still carry the body to it — ξ at the touch inside the slack plus the
    // pelvis's compliance; else the technical event is no longer reachable)
    if (before && !pre) { const tE = mv ? mv.tC : tk.t0 + tk.M.tc, tau = Math.max(0, tE - t);
      const xiE = bal.d + (bal.demand * bal.d - bal.d) * Math.exp(bal.w * tau); if (xiE <= bal.d + this.X.pelvisCom || tau < 0.03) { if (!s.outcome) s.outcome = { kind: "PERTURBED BUT CONTINUES", why: `the decisive ${mv ? "touch" : "contact"} at +${tau.toFixed(3)} s is still within the body's reach (ξ there ${(xiE * 100).toFixed(0)} cm ≤ slack + pelvis ${((bal.d + this.X.pelvisCom) * 100).toFixed(0)} cm)`, t }; return; }
      this.release(p, s, t, mv, tk, pre, "INTERRUPTED BEFORE TECHNICAL EVENT", `ξ ${(bal.demand * bal.d * 100).toFixed(0)} cm grows to ${(xiE * 100).toFixed(0)} cm by the decisive ${mv ? "touch" : "contact"} (+${tau.toFixed(3)} s): beyond the slack + the pelvis's ${(this.X.pelvisCom * 100).toFixed(0)} cm`); return; }
    if (pre) { this.release(p, s, t, null, null, true, "INTERRUPTED BEFORE TECHNICAL EVENT", `the planned ${a.label} would commit from a body the impact has displaced beyond its support chain (ξ ${(bal.demand * bal.d * 100).toFixed(0)} cm > ${(carry * 100).toFixed(0)} cm)`); return; }
    this.release(p, s, t, mv, tk, false, "TECHNICAL EVENT COMPLETES, RECOVERY REPLACED", `the ${mv ? "decisive touch" : "tackle's contact window"} is past; the support cannot hold ξ ${(bal.demand * bal.d * 100).toFixed(0)} cm (slack ${(bal.d * 100).toFixed(0)} cm): the rest of the authored ${mv ? mv.label : "tackle"} gives way to a recovery step`); }
  // the committed action ends now: its remaining touches are not played, its commitment released, the canonical planner re-plans from what is
  release(p, s, t, mv, tk, pre, kind, why) { const cut = (c) => { c.done = true; c.missed = true; c.blocked = { impact: kind }; };
    if (mv) { for (const c of p.plan.contacts) if (!c.done && c.t > t - 1e-9) cut(c); mv.tRelease = Math.min(mv.tRelease, t); p._hold = null; }
    if (tk) { tk.tCtl = Math.min(tk.tCtl, t + DT); tk.tW1 = Math.min(tk.tW1, t); tk.impact = kind; }
    if (pre) { const S = p.skill; if (S && !S.done) { S.done = true; S.result = "CANCELLED"; S.alt = "impact"; S.tEnd = t; if (p.log && p.log.skill) p.log.skill.push(Object.assign({}, S)); } for (const c of p.plan.contacts) if (!c.done && c.t > t - 1e-9 && c.src === "tech") cut(c); }
    p.flags.replan = "impact: " + kind.toLowerCase(); s.outcome = { kind, why, t, final: true }; this.event(p, kind, why, {}); }
  markFall(p, s, t, bal, st, B, xi, e) { s.fall = { t, why: bal.why || "no reachable placement", xi: xi.map((v) => +v.toFixed(3)), e: e.map((v) => +v.toFixed(3)), u: s.u.map((v) => +v.toFixed(3)), V: st.V.map((v) => +v.toFixed(3)), com: B.c.map((v) => +v.toFixed(3)), support: this.supportState(p, t, st), osc: Object.fromEntries(OSC_KEYS.map((k) => [k, { x: +s.osc[k].x.toFixed(2), v: +s.osc[k].v.toFixed(2) }])), contact: this.imp.ep && this.imp.ep.onset ? this.imp.ep.onset.contact : null };
    s.fadeFrom = t; s.outcome = Object.assign({}, s.outcome, { kind: s.outcome && s.outcome.final ? s.outcome.kind + " → FALL CANDIDATE" : "STAGGER / FALL CANDIDATE", fall: true, t, final: true });
    this.event(p, "UNRESOLVED FALL CANDIDATE", s.fall.why, { state: s.fall }); }
  regain(p, s, t) { s.regained = t; s.active = false; s.pose = null; const ep = this.imp.ep; if (ep) ep.players[p.pid] = this.summary(p, s, t); this.event(p, "BALANCE REGAINED", `after ${(t - s.t0).toFixed(3)} s${s.steps.length ? ` (${s.steps.length} recovery step${s.steps.length > 1 ? "s" : ""})` : ""}`, {}); }
  summary(p, s, t) { const pk = s.peak; return { pid: p.pid, t0: s.t0, tRegain: s.regained, regainAfter: s.regained != null ? +(s.regained - s.t0).toFixed(3) : null, demand: +pk.demand.toFixed(3), sigma: +this.realised(s).toFixed(3), sigmaPredicted: +(pk.sigma || 0).toFixed(3), sev: this.severity(s),
    cls: s.fall ? "FALL CANDIDATE" : s.steps.some((x) => x.cls === "STAGGER CANDIDATE") || s.steps.filter((x) => len2(x.adj) >= 0.10).length > 1 ? "STAGGER CANDIDATE" : s.steps.length ? "RECOVERY STEP" : (pk.sigma || 0) >= 0.35 ? "CORRECT" : "ABSORB", unresolved: s.regained == null, steps: s.steps.map((x) => ({ X: x.X, t: +x.t.toFixed(3), tLand: +x.tLand.toFixed(3), d: +len2(x.adj).toFixed(3), kind: x.kind, landed: x.landed })),
    outcome: s.outcome ? s.outcome.kind : "—", why: s.outcome ? s.outcome.why : null, legBlocked: s.legBlocked || null, J: +len2(s.imp).toFixed(2), du: +(len2(s.imp) / this.mass).toFixed(3), peakU: +pk.u.toFixed(3), peakP: +pk.P.toFixed(3), peakO: +pk.O.toFixed(3), peakLean: +pk.lean.toFixed(1), peakYaw: +pk.yaw.toFixed(1), fall: s.fall }; }
  finish() { if (!this.impOn) return; const t = this.att.t; if (this.imp.ep) { const ep = this.imp.ep; for (const p of this.players) { const s = this.ps.get(p); if (ep.active && s.ep === ep.n && !ep.players[p.pid]) ep.players[p.pid] = this.summary(p, s, t); } this.closeEpisode(t); } }
  closeEpisode(t) { const ep = this.imp.ep; if (!ep) return; for (const p of this.players) { const s = this.ps.get(p); if (ep.active && !ep.players[p.pid] && s.ep === ep.n) ep.players[p.pid] = this.summary(p, s, t); }
    ep.t1 = t; ep.dur = +(t - ep.t0).toFixed(3); ep.pairs = [...ep.pairs]; ep.strikes = [...ep.strikes]; if (ep.active || this.imp.keepBrush) this.imp.episodes.push(ep); this.imp.ep = null; }
  // (a pending recovery step's landing is a future stance: it moves with every root shift as the plan's future stances do — its target and the place
  // the foot would have landed both carried)
  shiftPlan(p, d, t, wall = null, ramp = 0) { const s = this.ps && this.ps.get(p), S = s && s.step && !s.step.landed ? s.step : null, q0 = S && S.id != null ? ["R", "L"].map((X) => p.plan.stances[X].find((q) => q.id === S.id)).find(Boolean) : null, before = q0 ? q0.pos.slice() : null;
    const o = super.shiftPlan(p, d, t, wall, ramp); if (S) { const q1 = ["R", "L"].map((X) => p.plan.stances[X].find((q) => q.id === S.id)).find(Boolean), dd = q1 && before ? sub2(q1.pos, before) : d; S.pos = add2(S.pos, dd); S.base = add2(S.base, dd); } return o; }
  // ── the root moved by the impact: Stage 2's plan shift, the stance and commitment ledgers ──
  shiftRoot(p, d, t) { const o = this.shiftPlan(p, d, t); const CL = this.commitLedger(p, t); if (CL) { CL.v[0] += o.e[0]; CL.v[1] += o.e[1]; if (this.plantedStances(p, t).length) CL.air = [0, 0]; else { CL.air[0] += o.e[0]; CL.air[1] += o.e[1]; } }
    // (a committed player's shift counts in Stage 2's own ledger — its 2 cm per plant; an ordinary player's is the impact's own, Stage 2's lean budget untouched)
    const held = !!(this.committed(p, t) || this.preCommit(p, t)); for (const [X, q] of this.plantedStances(p, t)) { const S = this.stanceLedger(p, X, q); if (held) { S.push[0] += d[0]; S.push[1] += d[1]; } S.imp = add2(S.imp || [0, 0], d); } }
  // ═══ THE BALL: a touch the perturbed body cannot make ════════════════════════════════════════════════════════════════════════════════════════
  touchBlocked(p, c) { const s = this.ps.get(p); if (s.step && !s.step.landed && c.F === s.step.X && c.t < s.step.tLand + 0.05) return "the foot is the recovery step";
    if (!(s.P[0] || s.P[1])) return null; const sh = this.shortBy(p, p.t, c.F); return sh > 0.02 ? `the ${c.F === "R" ? "right" : "left"} leg cannot reach the ball from the displaced hips (${(sh * 100).toFixed(1)} cm shorter than the authored pose)` : null; }
  bootBlocked(A, t) { const sh = this.shortBy(this.def, t, A.F); return sh > 0.02 ? `the tackling leg cannot reach from the displaced hips (${(sh * 100).toFixed(1)} cm shorter than the authored pose)` : null; }
  // how much shorter the leg falls of its foot with the perturbation than in the canonical pose (the authored reach may itself be at the limit)
  shortBy(p, t, F) { if (!this.refB) this.refB = new Map(this.players.map((x) => [x, new PlayBody(this.env, x)])); const a = this.gateB.get(p).pose(t).legs, b = this.refB.get(p).pose(t).legs;
    return a && b && a[F] && b[F] ? (a[F].short || 0) - (b[F].short || 0) : 0; }
  // ═══ THE ONSET FACTS (for the referee layer to come, the report, the Lab) ════════════════════════════════════════════════════════════════════
  onsetFacts(t, pairs, sa, sd, vA, vD, LP) { const x = pairs.find((q) => q.body) || pairs[0], n = x.n2, tn = [-n[1], n[0]], vr = sub2(vA, vD);
    const ballK = (p) => { const L = p.contacts.filter((c) => !c.missed && c.t <= t + 1e-9); return L.length ? +L[L.length - 1].t.toFixed(4) : null; }, tkH = this.tk && this.tk.act ? this.tk.act.hits.filter((h) => h.t <= t + 1e-9) : [];
    return { t: +t.toFixed(4), contact: { pair: x.A + " / " + x.B, regions: regionOf(x.A, x.uA) + " / " + regionOf(x.B, x.uB), body: x.body, at: x.at.map((v) => +v.toFixed(3)), normal: n.map((v) => +v.toFixed(3)), pen: +x.pen.toFixed(4), closing: +x.vBody.toFixed(3), tangential: +dot2(vr, tn).toFixed(3), limbClosing: x.vArt == null ? null : +x.vArt.toFixed(3), onATT: facingSide(n, sa.psi).side, onDEF: facingSide([-n[0], -n[1]], sd.psi).side },
      ball: { state: this.auth.state, owner: this.auth.id, lastTouchATT: ballK(this.att), lastTackleHit: tkH.length ? +tkH[tkH.length - 1].t.toFixed(4) : null }, act: [this.actionOf(this.att, t), this.actionOf(this.def, t)], committed: [this.committed(this.att, t), this.committed(this.def, t)] }; }
}
setImpactWorld(ImpactWorld);

// ═══ occupy3b/l3_world.js — PLAYER OCCUPANCY STAGE 3B.1: THE LIMB-CONTACT LAYER (between Stage 2 and Stage 3) ═════════════════════════════════
// canonical footballer → Stage 2 occupancy / separation (unchanged) → STAGE 3B: LIMB CONTACT (here) → Stage 3 impact / balance / action
// (unchanged but for its limb strikes, which this layer REPLACES) → the shared ball authority (unchanged).
// Stage 3B answers ONE question: what physically happens to the contacting limb. Each tick, on the bodies as drawn (Stage 1's mesh-measured
// volumes, unchanged), every pair with a SWINGING leg's lower thigh / shin / boot beyond the 2 cm tolerance (or a pair already held) is a limb
// contact. The swinging limb yields before a planted one (a planted leg is part of its body: it never moves); the limb's physical velocity
// at the contact point is resolved against the other side's (occupy3b/l3_limb.js): the normal closing removed by one impulse — never more than
// that closing permits —, the tangential motion untouched (the limb slides). The limb yields: its deflection is drawn (stop, slide, swing aside,
// the knee swivelled) and carries no second momentum; the impulse the limb's contact point took passes whole through its hip into its own body,
// its equal and opposite into the opponent (at the contact point on a planted leg or the trunk, through his hip if his limb yielded too). A
// limb at its range is part of its body for that contact. Stage 3 receives exactly those impulses at their points (its hook EXT) and decides
// absorb / correct / step / stagger / fall candidate as before — its own animated-speed limb strikes are off
// (limbMin = ∞): there is exactly one source of momentum for a limb interaction.
// THE FACE RULE (the contact direction): two bodies near-parallel (|sin Δψ| < 0.15, the same way) and side by side take the stable side-on
// normal — the separating axis of their occupied footprints (the mean heading or its perpendicular), never a local capsule normal tilted by the
// animation (Astra's forward-wedge failure, and Stage 3's flagship one); blended out to the local normal by |sin Δψ| 0.30; a pair whose local
// normal points the other way (the legs crossed over) keeps its local normal. Stage 3's body contacts use the same rule.
// THE LEDGER (Stage 3B.0): every momentum change of every limb and body by source, every tick; positional corrections apart; checks closed.
// NOT HERE: recovery-step placement (3B.2), the trip, the stagger (3B.3), falls, ground contact, get-up (3B.4), the shoulder duel. Their INPUTS
// are reported: a limb held / at its range, a landing obstructed, a recovery step that lands in the opponent, the body outrunning a held foot.
import { OccupancyWorld2 } from "../occupy2/o2_world.js";
import { ImpactWorld } from "../occupy3/o3_world.js";
import { setLimbWorld } from "../occupy3/o3_run.js";
import { volumesOf, detect, OCC, RESOLVED } from "../occupy1/o_volumes.js";
import { regionOf } from "../occupy3/o3_geom.js";
import { LimbBody } from "./l3_body.js";
import * as LM from "./l3_limb.js";
const DT = 1 / 240, DEG = Math.PI / 180, hyp = Math.hypot, clamp = (x, a, b) => (x < a ? a : x > b ? b : x), S5 = (x) => x * x * x * (10 - 15 * x + 6 * x * x);
const SIDES = ["R", "L"], h2 = (v) => [v[0], v[1]], add2 = (a, b) => [a[0] + b[0], a[1] + b[1]], sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]], len2 = (a) => hyp(a[0], a[1]);
const unit2 = (a, d = [1, 0]) => { const m = hyp(a[0], a[1]); return m > 1e-12 ? [a[0] / m, a[1] / m] : d; };
const legsFromJ = (J) => Object.fromEntries(SIDES.map((X) => [X, { H: J["thigh_" + X].j, K: J["shin_" + X].j, A: J["foot_" + X].j, B: J["toe_" + X].j, T: J["toe_" + X].t }]));
const newLeg = (who, X) => ({ who, X, q: [0, 0, 0], qd: [0, 0, 0], P: null, MM: null, dAnk: 0, planted: false, ev: {} });
const SRC = ["EXT3B", "S3_BODY", "STRUT", "BALANCE", "FADE", "SETTLE"];
export class LimbWorld extends ImpactWorld {
  // o.l3: RES3B overrides · o.limb === false: the layer off (then Stage 3 without its limb strikes — a diagnostic, never a mode of the Lab)
  constructor(env, o = {}) { super(env, Object.assign({}, o, { imp: Object.assign({ limbMin: Infinity }, o.imp || {}) }));
    this.L3 = Object.assign({}, LM.RES3B, o.l3 || {}); this.L3.limRad = this.L3.lim.map((d) => d * DEG); this.limbOn = this.impOn && o.limb !== false;
    this.l3 = { apps: [], log: [], events: [], cpu: [], acc: { ATT: this.newAcc(), DEF: this.newAcc() }, check: { limb: 0, stage3: 0, player: 0, pair: 0, bound: 0, energy: 0, n: 0 }, contacts: 0, held: new Map(), hist: [], snaps: [] };
    this.ext = null; this.face = null;
    if (!this.limbOn) return;
    const m = this.mass, MF = this.MF; this.legM = { thigh: MF.thigh_R * m, shin: MF.shin_R * m, foot: MF.foot_R * m };
    this.legs = new Map(this.players.map((p) => [p, { R: newLeg(p.pid, "R"), L: newLeg(p.pid, "L") }]));
    const src = (sim, t) => { const s = this.ps.get(sim); return s && s.pose && s.pose.on && Math.abs(t - sim.t) < 1.5 * DT ? s.pose : null; };
    const lsrc = (sim, t) => { if (Math.abs(t - sim.t) >= 1.5 * DT) return null; const L = this.legs.get(sim); if (!L || !(L.R.q.some((v) => v) || L.L.q.some((v) => v))) return null; return { on: true, R: L.R.q.slice(), L: L.L.q.slice() }; };
    this.bodies = new Map(this.players.map((p) => [p, new LimbBody(env, p, src, lsrc)])); this.gateB = new Map(this.players.map((p) => [p, new LimbBody(env, p, src, lsrc)]));
    // (A TOUCH whose foot the limb contact displaced beyond touchTol is denied — for geometry, with its reason; the ball is never moved for it)
    for (const p of this.players) { const ex = p.execute.bind(p); p.execute = (c) => { const L = this.legs.get(p), leg = c.F && L[c.F], d = leg ? leg.dAnk : 0; if (!(d > this.L3.touchTol)) return ex(c);
      const why = `the ${c.F === "R" ? "right" : "left"} foot was displaced ${(d * 100).toFixed(1)} cm by limb contact: it cannot reach the ball`;
      c.done = true; c.missed = true; c.blocked = { limb: why }; p.contacts.push(Object.assign(p.contactRec(c, p.ball.v, p.ball.v, null), { missed: true, limb: why })); p.flags.replan = p.flags.replan || "missed contact";
      this.l3event(p, "TOUCH DENIED (limb contact)", why, { role: c.role || "touch", F: c.F }); }; }
    // (THE TACKLE'S BOOT: its probes removed while the tackling leg is displaced beyond touchTol — the boot cannot be where the tackle meant it)
    if (this.tk) { const pr = this.tk.probes.bind(this.tk); this.tk.probes = (t) => { pr(t); const A = this.tk.act; if (!A) return; const opp = this.att.opp, fresh = opp.filter((q) => q.kind === "tackle" && q.tk === A.n && Math.abs(q.t0 - t) < 1e-9 && !q.hit); if (!fresh.length) return;
      const leg = this.legs.get(this.def)[A.F], d = leg ? leg.dAnk : 0; if (!(d > this.L3.touchTol)) return; for (const q of fresh) opp.splice(opp.indexOf(q), 1);
      if (!A.limbBlocked) { A.limbBlocked = t; this.l3event(this.def, "TACKLE BOOT DENIED (limb contact)", `the tackling leg was displaced ${(d * 100).toFixed(1)} cm by limb contact`, { F: A.F }); } }; }
    // (a RECOVERY STEP Stage 3 plans that lands inside the opponent's leg: reported for Stage 3B.2, not changed)
    const ps0 = this.planStep.bind(this); this.planStep = (p, s, t, o, cls) => { ps0(p, s, t, o, cls); const q = this.opp(p), L = this.lp; if (!L) return; const V = volumesOf(q === this.att ? L.a.J : L.d.J).filter((v) => /^(SHIN|FOOT|THIGH)_/.test(v.id));
      let worst = null; for (const v of V) { const foot = { a: [o.pos[0], o.pos[1], 0.09], b: [o.pos[0] + 0.15 * Math.cos(o.yaw || 0), o.pos[1] + 0.15 * Math.sin(o.yaw || 0), 0.03], r: 0.07 }; const c = segc(foot.a, foot.b, v.a, v.b), pen = foot.r + v.r - c; if (!worst || pen > worst.pen) worst = { pen, id: v.id }; }
      if (worst && worst.pen > this.L3.tol) this.l3event(p, "RECOVERY STEP LANDS IN THE OPPONENT (3B.2)", `the ${o.X} step's landing is ${(worst.pen * 100).toFixed(1)} cm inside ${q.pid}'s ${worst.id} as he stands now`, { X: o.X }); };
  }
  newAcc() { return Object.fromEntries(SRC.map((k) => [k, [0, 0]])); }
  opp(p) { return p === this.att ? this.def : this.att; }
  l3event(p, kind, why, o = {}) { this.l3.events.push(Object.assign({ k: this.k, t: +(this.k * DT).toFixed(4), who: p ? p.pid : "—", kind, why }, o)); }
  recordFrame() { super.recordFrame(); const L = this.livePoses(), F = this.frames.get(L.k); if (F) for (const [f, p] of [[F.a, L.a], [F.d, L.d]]) { f.psi = p.psi; if (p.legAuth) { f.legAuth = p.legAuth; f.limbQ = p.limbQ; } } }
  extImpulses(k) { return this.ext && this.ext.k === k ? this.ext : null; }
  // (Stage 3's onset facts for an episode a 3B contact opened without a resolved pair (a boot on a shin): the 3B contact as the pair)
  extPairs(k) { const r = this.l3.log.length && this.l3.log[this.l3.log.length - 1].k === k ? this.l3.log[this.l3.log.length - 1] : null, c = r && r.contacts[0];
    if (!c) return [{ A: "—", B: "—", uA: 0, uB: 0, at: [0, 0, 0], n2: [1, 0], pen: 0, vBody: 0, vArt: null, body: false }];
    const [A, B] = c.key.split("|"); return [{ A, B, uA: c.uA || 0, uB: c.uB || 0, at: c.at, n2: c.n, pen: c.pen, vBody: c.vn != null ? -c.vn : 0, vArt: null, body: false }]; }
  normalOf(x, sa, sd) { const nl = x.nh || unit2(sub2(sa.P, sd.P)); return this.face && this.face.k === this.k ? this.faceBlend(nl, this.face) : nl; }
  step(reqA, reqD) { OccupancyWorld2.prototype.step.call(this, reqA, reqD);
    if (this.limbOn) { const c0 = performance.now(); this.limbPass(); this.l3.cpu.push(performance.now() - c0); }
    if (this.impOn) { const u0 = this.limbOn ? this.players.map((p) => { const s = this.ps.get(p); return s.active ? s.u.slice() : [0, 0]; }) : null; this.s3in = new Map(); this.s3out = new Map(); this.s3settle = new Map();
      const c0 = performance.now(); this.impactPass(); this.imp.cpu.push(performance.now() - c0); if (this.limbOn) this.closeLedger(u0); } }
  // (Stage 3's per-player tick: its input impulse, its output, a settle (the player handed back: his remaining u ends with the episode) — for the ledger)
  player(p, s, st, B, J, L, J3, t, rec2) { if (this.s3in) this.s3in.set(p.pid, J.slice()); const out = super.player(p, s, st, B, J, L, J3, t, rec2);
    if (this.s3out) { this.s3out.set(p.pid, out); if (!s.active) this.s3settle.set(p.pid, s.u.slice()); } return out; }
  // ═══ THE FACE RULE ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  faceRule(LP) { const X = this.L3, pa = LP.a.psi, pd = LP.d.psi, c = Math.abs(Math.sin(pa - pd)), same = Math.cos(pa - pd) > 0; if (!same || c >= X.faceHi) return { k: this.k, w: 0, c };
    const h = unit2([Math.cos(pa) + Math.cos(pd), Math.sin(pa) + Math.sin(pd)]), l = [-h[1], h[0]], res = (v) => RESOLVED.has(v.id), VA = volumesOf(LP.a.J).filter(res), VD = volumesOf(LP.d.J).filter(res);
    const iv = (V, ax) => { let lo = Infinity, hi = -Infinity; for (const v of V) for (const p of [v.a, v.b]) { const d = p[0] * ax[0] + p[1] * ax[1]; lo = Math.min(lo, d - v.r); hi = Math.max(hi, d + v.r); } return [lo, hi]; };
    let best = null; for (const [ax, lat] of [[h, false], [l, true]]) { const ia = iv(VA, ax), id = iv(VD, ax), sep = Math.max(id[0] - ia[1], ia[0] - id[1]); if (!best || sep > best.sep) best = { ax, sep, lat, sign: ia[0] + ia[1] > id[0] + id[1] ? 1 : -1 }; }
    return { k: this.k, w: 1 - S5(clamp((c - X.faceLo) / (X.faceHi - X.faceLo), 0, 1)), n: [best.ax[0] * best.sign, best.ax[1] * best.sign], lateral: best.lat, sep: best.sep, c }; }
  faceBlend(nl, F) { if (!F || !(F.w > 0)) return nl; if (nl[0] * F.n[0] + nl[1] * F.n[1] < -0.2) return nl; return unit2([F.w * F.n[0] + (1 - F.w) * nl[0], F.w * F.n[1] + (1 - F.w) * nl[1]], nl); }
  // ═══ THE LIMB PASS ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  vPhys(p, st) { const s = this.ps.get(p), u = s && s.active ? s.u : [0, 0]; return [st.V[0] + u[0], st.V[1] + u[1], 0]; }
  frameOf(p, st) { const s = this.ps.get(p), P = s && s.active ? s.P : [0, 0]; return [st.P[0] + P[0], st.P[1] + P[1], 0]; }
  // a side of a pair: the swinging leg's lower thigh / shin / boot is a LIMB; the trunk, the hips (the thigh's upper half), a planted leg are BODY
  sideOf(p, L, id, u, x, n, J, st) { if (/^UARM/.test(id)) return null; const m = /^(THIGH|SHIN|FOOT)_([RL])$/.exec(id), vb = this.vPhys(p, st), body = () => ({ kind: "BODY", who: p.pid, x, w: 1 / this.effMass(p, this.bodyOf(J, h2(n)), x, h2(n)).m, vBase: vb, vBody: vb, id });
    if (!m) return body(); const leg = L[m[2]]; if (leg.planted || (m[1] === "THIGH" && u < 0.5)) return body();
    const art = this.artOf(p, m[2], m[1], u); return { kind: "LIMB", who: p.pid, leg, seg: m[1], u, x, id, art, vBody: vb, vBase: LM.add(vb, art), wBody: 1 / this.effMass(p, this.bodyOf(J, h2(n)), x, h2(n)).m }; }
  // the AUTHORED articulated velocity of a leg point (over artTicks: its motion less its body frame's, capped at the segment's ceiling)
  artOf(p, X, seg, u, lag = 0) { const H = this.l3.hist, n = this.L3.artTicks, a = H[H.length - 1 - lag], b = H.length > n + lag ? H[H.length - 1 - n - lag] : null; if (!a || !b || a.k - b.k !== n) return [0, 0, 0];
    const i = p === this.att ? 0 : 1, pa = LM.pointOf(a.legs[i][X], seg, u), pb = LM.pointOf(b.legs[i][X], seg, u), fa = a.F[i], fb = b.F[i], T = n * DT;
    let v = [(pa[0] - pb[0] - (fa[0] - fb[0])) / T, (pa[1] - pb[1] - (fa[1] - fb[1])) / T, (pa[2] - pb[2]) / T]; const c = this.L3.artCap[seg], m = LM.len(v); if (m > c) v = LM.mul(v, c / m); return v; }
  limbPass() { const X = this.L3, t = this.att.t, k = this.k, A = this.att, D = this.def, sa = A.stateAt(t), sd = D.stateAt(t), dist = hyp(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]), LA = this.legs.get(A), LD = this.legs.get(D);
    this.ext = null; this.tk3 = { ATT: this.newAcc(), DEF: this.newAcc() }; const T3 = this.tk3, active = [LA.R, LA.L, LD.R, LD.L].some((l) => l.q.some((v) => v) || l.qd.some((v) => v));
    if (dist > OCC.broad + 0.3 && !active) { this.l3.hist = []; this.face = null; this.l3.held.clear(); return; }
    const LP = this.livePoses(), PL = [[A, LA, LP.a, sa, 0], [D, LD, LP.d, sd, 1]], auth = PL.map(([, , pose]) => pose.legAuth || legsFromJ(pose.J));
    const H = this.l3.hist; H.push({ k, legs: auth, F: PL.map(([p, , , st]) => this.frameOf(p, st)) }); while (H.length > X.artTicks + 2) H.shift();
    this.face = this.faceRule(LP);
    const ev = (leg, kind, why) => { const key = kind + leg.X; if (leg.ev[key] != null && k - leg.ev[key] < 24) { leg.ev[key] = k; return; } leg.ev[key] = k; this.l3event(leg.who === "ATT" ? A : D, kind, why, { X: leg.X }); };
    const EXT = { k, A: [], D: [], any: false, why: null }, give = (who, J, at, src) => { if (!(hyp(J[0], J[1]) > 1e-15)) return; (who === "ATT" ? EXT.A : EXT.D).push({ J: h2(J), at: at.slice(), src }); EXT.any = true; T3[who].EXT3B = add2(T3[who].EXT3B, h2(J)); };
    // ── each leg's model at this tick: the authored leg, the perturbation drawn on it, its inertia; planted?; its next landing and touch ──
    for (const [p, L, pose, st, i] of PL) { const fr = LM.frameOf(pose.psi), plan = p.plan;
      for (const Xf of SIDES) { const leg = L[Xf], au = auth[i][Xf]; leg.auth = au; leg.fr = fr; leg.P = LM.legPose(au, leg.q, fr); leg.MM = LM.massOf(leg.P, this.legM);
        const st0 = plan.stances[Xf], now = st0.find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), nx = st0.find((q) => q.t0 > t + 1e-9); leg.planted = !!now; leg.tLand = nx ? nx.t0 : Infinity;
        const tc = plan.contacts.find((c) => !c.done && c.F === Xf && c.t > t + 1e-9); leg.tTouch = tc ? tc.t : Infinity;
        // (a leg planted with a perturbation left: the landing had to happen where its stance is — the remainder is drawn onto it, reported (3B.2))
        if (leg.planted && (leg.q.some((v) => v) || leg.qd.some((v) => v))) { const d = LM.len(leg.P.d); if (d > 0.005) { ev(leg, "LANDING SNAP (3B.2)", `${Xf} landed with ${(d * 100).toFixed(1)} cm of perturbation left: drawn onto its stance in one tick`); this.l3.snaps.push({ k, who: leg.who, X: Xf, d }); }
          leg.q = [0, 0, 0]; leg.qd = [0, 0, 0]; leg.P = LM.legPose(au, leg.q, fr); } } }
    // ── the contacts: a swinging limb in a pair beyond the tolerance (or held), the stable normal, both sides' physical velocities and masses ──
    const va = volumesOf(LP.a.J), vd = volumesOf(LP.d.J), pairs = dist <= OCC.broad ? detect(va, vd, { within: X.hyst - X.tol }) : [], C = [], seen = new Set();
    // (the held state is per LIMB and per OPPONENT: a limb that struck him is held against all of him until they are apart — its contact moving
    // from his thigh to his hip is the same collision; two limbs: per limb pair)
    const grp = (id, L) => { const m = /^(THIGH|SHIN|FOOT)_([RL])$/.exec(id); return m && !L[m[2]].planted ? "LEG_" + m[2] : "BODY"; };
    // (a held pair ends when a leg that was swinging when it struck has planted: its next swing may strike again)
    for (const [hk, h] of [...this.l3.held]) if (h.legs.some((l) => l.planted)) this.l3.held.delete(hk);
    for (const x of pairs) { const key = x.A + "|" + x.B, hkey = grp(x.A, LA) + "|" + grp(x.B, LD), held = this.l3.held.get(hkey); if (x.pen <= X.tol && !(held && x.pen > X.tol - X.hyst)) continue;
      const n2 = this.faceBlend(x.nh || unit2(sub2(sa.P, sd.P)), this.face), n = [n2[0], n2[1], 0];
      const sA = this.sideOf(A, LA, x.A, x.uA, x.at, n, LP.a.J, sa), sB = this.sideOf(D, LD, x.B, x.uB, x.at, LM.mul(n, -1), LP.d.J, sd); if (!sA || !sB || (sA.kind !== "LIMB" && sB.kind !== "LIMB")) continue;
      if (/^FOOT/.test(x.A) && /^FOOT/.test(x.B)) continue;   // (two boots meet at the ball: the tackle's contest, not a limb contact)
      // (a LANDING leg (inside its landing window) is not resolved: it lands where its stance is — the contact recorded as an obstructed landing, its
      // momentum not exchanged (Stage 3B.2 / 3B.3: where a foot can land, a stamp on a leg))
      const landing = [sA, sB].find((s2) => s2.kind === "LIMB" && s2.leg.tLand - t < X.landForce); if (landing) { if (x.pen > X.tol) { ev(landing.leg, "LANDING OBSTRUCTED (3B.2 / 3B.3)", `${landing.leg.X} lands in ${((landing.leg.tLand - t) * 1000).toFixed(0)} ms where its stance is, through the opponent's ${landing === sA ? x.B : x.A} (${(x.pen * 100).toFixed(1)} cm)`); this.l3.obstructedLand = (this.l3.obstructedLand || 0) + 1; } continue; }
      seen.add(hkey); C.push({ key, hkey, n, pen: x.pen, A: sA, B: sB, x, held: !!held, uA: x.uA, uB: x.uB, region: regionOf(x.A, x.uA) + " / " + regionOf(x.B, x.uB) }); }
    // ── RECONCILE: each perturbed leg driven back to its authored path (faster before a landing / a touch; never into a held contact unless it must land) ──
    for (const [p, L] of PL) for (const Xf of SIDES) { const leg = L[Xf]; if (leg.planted || !(leg.q.some((v) => v) || leg.qd.some((v) => v))) continue;
      const tl = leg.tLand - t, tt = leg.tTouch - t; let w = X.wn; if (tl < X.landWin) w = Math.max(w, X.landK / Math.max(tl, DT)); if (tt < X.landWin) w = Math.max(w, X.landK / Math.max(tt, DT));
      const mine = C.flatMap((c) => [[c.A, 1], [c.B, -1]].filter(([s]) => s.kind === "LIMB" && s.leg === leg).map(([s, sg]) => ({ seg: s.seg, x: s.x, nSide: LM.mul(c.n, sg) }))), force = tl < X.landForce;
      if (force && mine.length) ev(leg, "LANDING OBSTRUCTED (3B.2 / 3B.3)", `${Xf} must land in ${(tl * 1000).toFixed(0)} ms where its stance is, and the opponent's leg is in the way: it lands through the contact`);
      LM.drive(leg, w, mine, X, force); }
    // ── THE CONTACT SOLVE ──
    // (a player under Stage 3's FALL-CANDIDATE PLACEHOLDER — its labelled, non-physical fade writing his velocity back to the authored motion — has
    // no physical momentum to exchange: the closing the fade re-creates every tick would otherwise become a new impulse every tick (animation-made
    // momentum, pumped into the opponent). His limb contacts resolve positionally only — the yield and the projection, no impulse — reported (3B.4))
    const fading = [A, D].filter((p) => { const s3 = this.ps.get(p); return s3 && s3.active && s3.fadeFrom != null; });
    if (fading.length && C.length) { for (const c of C) c.placeholder = true; this.l3.placeholderTicks = (this.l3.placeholderTicks || 0) + 1;
      for (const p of fading) { const s3 = this.ps.get(p), key = "ph" + p.pid; if (this.l3[key] !== s3.fadeFrom) { this.l3[key] = s3.fadeFrom; this.l3event(p, "CONTACT DURING A FALL PLACEHOLDER (3B.4)", "Stage 3's fall-candidate placeholder is fading this player back to the authored motion (not physics): his limb contacts are resolved positionally only — no impulse"); } } }
    const sol = LM.solveContacts(C, X); for (const b of sol.body) give(b.who, b.J, b.at, b.src);
    for (const b of sol.body) if (b.range) { const leg = (b.who === "ATT" ? LA : LD)[b.X]; ev(leg, "LIMB AT ITS RANGE (obstructed)", `${b.X} ${b.seg} can yield no further (${leg.q.map((v) => (v / DEG).toFixed(0)).join(" / ")}°): its body takes the contact`); }
    for (const ap of sol.apps) { this.l3.check.n++; this.l3.check.bound = Math.max(this.l3.check.bound, ap.lam - ap.src); this.l3.check.energy = Math.max(this.l3.check.energy, ap.keAfter - ap.keBefore); this.l3.check.pair = Math.max(this.l3.check.pair, LM.len(LM.add(ap.JA, ap.JB)));
      const c = C.find((z) => z.key === ap.key); this.l3.apps.push({ k, key: ap.key, region: c.region, vn: ap.vn, lam: ap.lam, src: ap.src, wA: ap.wA, wB: ap.wB, routeA: ap.routeA, routeB: ap.routeB, n: ap.n, at: c.x.at, keB: ap.keBefore, keA: ap.keAfter, dvnA: ap.dvnA, dvnB: ap.dvnB, vnAfter: ap.vnAfter,
        vA: c.A.vBase, vB: c.B.vBase, artA: c.A.art || null, artB: c.B.art || null, kindA: c.A.kind, kindB: c.B.kind, held: c.held }); }
    // ── INTEGRATE, the range, the positional projection (positions only), the range again ──
    for (const [, L] of PL) for (const Xf of SIDES) { const leg = L[Xf]; leg.q0 = leg.q.slice(); if (leg.planted) continue; leg.q = LM.add(leg.q, LM.mul(leg.qd, DT)); LM.clampRange(leg, X); }
    // (inside its landing window a leg is not projected out of the opponent: it must land where its stance is — reported as an obstructed landing)
    const posn = []; for (const c of C) { const over = c.pen - X.tol; if (!(over > 0)) continue; const sides = [[c.A, 1], [c.B, -1]].filter(([s]) => s.kind === "LIMB" && !s.leg.planted && !(s.leg.tLand - t < X.landForce)).map(([s, sg]) => ({ s, sg, r: LM.limbResp(s.leg, s.seg, s.x, LM.mul(c.n, sg), X) })).filter((z) => z.r.w > 1e-9);
      const W = sides.reduce((a, z) => a + z.r.w, 0), d = Math.min(over, X.posCap); if (!(W > 0)) { c.unresolved = over; continue; }
      for (const z of sides) { const want = d * z.r.w / W, dist = LM.project(z.s.leg, z.s.seg, z.s.x, LM.mul(c.n, z.sg), want, X); posn.push({ key: c.key, who: z.s.leg.who, X: z.s.leg.X, dist, want }); } }
    for (const [, L, pose] of PL) { const J = pose.J, fr = { hipR: J.thigh_R.j, hipL: J.thigh_L.j, up: LM.sub(J.spine.t, J.pelvis.j) };
      for (const Xf of SIDES) { const leg = L[Xf]; if (leg.planted) continue; LM.clampRange(leg, X); if (LM.keepAdmissible(leg, leg.q0, fr)) this.l3.kept = (this.l3.kept || 0) + 1; if (LM.restoreAdmissible(leg, fr, X)) this.l3.restored = (this.l3.restored || 0) + 1; } }
    // ── the new state: the ankle's displacement the next pose will draw; the held pairs; the 3B.3 inputs ──
    for (const [, L] of PL) for (const Xf of SIDES) { const leg = L[Xf], P2 = LM.legPose(leg.auth, leg.q, leg.fr); leg.dAnk = LM.len(P2.d); leg.reach = hyp(P2.H[0] - P2.A[0], P2.H[1] - P2.A[1]); }
    for (const c of C) { const h0 = this.l3.held.get(c.hkey); this.l3.held.set(c.hkey, { k0: h0 ? h0.k0 : k, k, legs: h0 ? h0.legs : [c.A, c.B].filter((s) => s.kind === "LIMB").map((s) => s.leg) }); const dur = (k - (h0 ? h0.k0 : k)) * DT;
      for (const s of [c.A, c.B]) { if (s.kind !== "LIMB") continue; if (dur > 0.10) ev(s.leg, "LIMB HELD (3B.3 trip input)", `${s.leg.X} ${s.seg} held against ${c.region} for ${(dur * 1000).toFixed(0)} ms`);
        if (s.leg.reach > 0.66 * this.legLen && dur > 0.04) ev(s.leg, "BODY OUTRAN A HELD FOOT (3B.3 input)", `${s.leg.X} held while its hip is ${(s.leg.reach * 100).toFixed(0)} cm from its ankle (≥ 0.66 × leg)`); } }
    for (const key of [...this.l3.held.keys()]) if (!seen.has(key)) this.l3.held.delete(key);
    // ── to Stage 3: the impulses at their points; the reason (the first contact impulse of the tick) ──
    const first = sol.apps.find((a) => a.lam > 0); if (first) { const c = C.find((z) => z.key === first.key); EXT.why = `LIMB CONTACT (3B) ${c.region} closing ${(-first.vn).toFixed(2)} m/s: ${first.lam.toFixed(2)} N·s`; this.l3.contacts++; }
    this.ext = EXT.any ? EXT : null;
    if (C.length || EXT.any || active) this.l3.log.push({ k, t, face: this.face && { w: +this.face.w.toFixed(3), lateral: this.face.lateral, n: this.face.n && this.face.n.map((v) => +v.toFixed(3)), c: +this.face.c.toFixed(3) },
      contacts: C.map((c) => ({ key: c.key, region: c.region, pen: +c.pen.toFixed(4), held: c.held, n: [+c.n[0].toFixed(3), +c.n[1].toFixed(3)], at: c.x.at.map((v) => +v.toFixed(3)), A: c.A.kind, B: c.B.kind, uA: +c.uA.toFixed(3), uB: +c.uB.toFixed(3), yielded: c.yielded ? +c.yielded.toFixed(3) : 0, unresolved: c.unresolved ? +c.unresolved.toFixed(4) : 0, lam: +(c.lam || 0).toFixed(4),
        vA: c.A.vBase.map((v) => +v.toFixed(3)), vB: c.B.vBase.map((v) => +v.toFixed(3)), vn: c.vn != null ? c.vn : null })),
      apps: sol.apps.map((a) => ({ key: a.key, vn: +a.vn.toFixed(4), lam: +a.lam.toFixed(4), wA: +a.wA.toFixed(4), wB: +a.wB.toFixed(4), routeA: a.routeA, routeB: a.routeB, keB: +a.keBefore.toFixed(5), keA: +a.keAfter.toFixed(6) })),
      posn: posn.map((z) => Object.assign({}, z, { dist: +z.dist.toFixed(4) })), ext: { A: EXT.A.map((e) => ({ src: e.src, J: e.J.map((v) => +v.toFixed(4)), at: e.at.map((v) => +v.toFixed(3)) })), D: EXT.D.map((e) => ({ src: e.src, J: e.J.map((v) => +v.toFixed(4)), at: e.at.map((v) => +v.toFixed(3)) })) },
      legs: PL.map(([, L]) => Object.fromEntries(SIDES.map((Xf) => [Xf, { q: L[Xf].q.map((v) => +(v / DEG).toFixed(2)), qd: L[Xf].qd.map((v) => +v.toFixed(3)), d: +L[Xf].dAnk.toFixed(4), planted: L[Xf].planted }]))) }); }
  // ═══ THE LEDGER (after Stage 3 has taken this tick's impulses): every source, the closure, the pairing ══════════════════════════════════════
  // per player, per tick (horizontal momentum): m (u(k) − u(k−1)) = Stage 3's input − its strut + its balance controller + its fade + its settle;
  // Stage 3's input = what 3B gave (EXT3B: every limb contact's impulse, through the hip or at the contact point) + Stage 3's own body contact
  // (S3_BODY, the difference); PAIRING: 3B's impulses and Stage 3's body contacts are each equal and opposite between the two players.
  closeLedger(u0) { const T = this.tk3; if (!T) return; const C = this.l3.check, m = this.mass, ext = this.ext && this.ext.k === this.k ? this.ext : null, sum = (L) => L.reduce((g, e) => add2(g, e.J), [0, 0]); const s3b = [];
    for (const [i, p] of this.players.entries()) { const who = p.pid, t = T[who], s = this.ps.get(p), given = ext ? sum(i ? ext.D : ext.A) : [0, 0], jin = this.s3in.get(who), o = this.s3out.get(who);
      if (!jin && len2(given) > 1e-12) { C.stage3 = Math.max(C.stage3, len2(given)); this.l3event(p, "LEDGER: AN IMPULSE STAGE 3 DID NOT TAKE", `${len2(given).toFixed(4)} N·s`); }
      const s3body = jin ? sub2(jin, given) : [0, 0]; s3b.push(s3body); t.S3_BODY = add2(t.S3_BODY, s3body);
      if (o) { if (o.gx) t.STRUT = add2(t.STRUT, [-o.gx[0], -o.gx[1]]); if (o.bal) t.BALANCE = add2(t.BALANCE, [o.bal[0] * m, o.bal[1] * m]); if (o.fade) t.FADE = add2(t.FADE, [o.fade[0] * m, o.fade[1] * m]); }
      const settle = this.s3settle.get(who); if (settle) t.SETTLE = add2(t.SETTLE, [-settle[0] * m, -settle[1] * m]);
      const u1 = s.active ? s.u : [0, 0], dBody = [(u1[0] - u0[i][0]) * m, (u1[1] - u0[i][1]) * m], eBody = add2(add2(add2(add2(jin || [0, 0], t.STRUT), t.BALANCE), t.FADE), t.SETTLE);
      C.stage3 = Math.max(C.stage3, len2(sub2(dBody, eBody)));
      const A = this.l3.acc[who]; for (const k of Object.keys(t)) A[k] = add2(A[k] || [0, 0], t[k]); }
    C.pair = Math.max(C.pair, len2(add2(T.ATT.EXT3B, T.DEF.EXT3B)), len2(add2(s3b[0], s3b[1]))); }
}
function segc(p1, q1, p2, q2) { const d1 = LM.sub(q1, p1), d2 = LM.sub(q2, p2), r = LM.sub(p1, p2), a = LM.dot(d1, d1), e = LM.dot(d2, d2), f = LM.dot(d2, r); let s, t;
  if (a <= 1e-12 && e <= 1e-12) { s = 0; t = 0; } else if (a <= 1e-12) { s = 0; t = clamp(f / e, 0, 1); } else { const c = LM.dot(d1, r); if (e <= 1e-12) { t = 0; s = clamp(-c / a, 0, 1); } else { const b = LM.dot(d1, d2), den = a * e - b * b; s = den !== 0 ? clamp((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); } } }
  return LM.len(LM.sub(LM.add(p1, LM.mul(d1, s)), LM.add(p2, LM.mul(d2, t)))); }
setLimbWorld(LimbWorld);

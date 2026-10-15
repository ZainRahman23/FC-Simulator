// HYBRID-RUN-1: the animation-driven, physically interruptible runner (a law object for the PVP plants: command → actuator rows, plus an
// explicit gait-support wrench that the plant applies before each physics step).
//
// RUN-1 (hr_intent.mjs) is the athlete's locomotor intent at every step: before, during and after any contact. The physical V2 body is never
// posed, never teleported and never made kinematic. It tracks the intent only through bounded actuators, and contacts always win:
//
// 1. JOINT TRACKING (shape). The ANIMATION DRIVE (hr_drive.mjs: the V2 actuator layer's implicit Jolt motors, torque bounded inside the solver,
//    with a constant finite limit κ·T_iso per axis and direction, κ = 2, and no force–velocity curve or activation lag) tracks RUN-1's joint
//    rotations. The athlete-capacity layer (Hill force–velocity, activation 15 / 50 ms) was tried first and saturates (HYBRID_RUN1_LOG.md §3).
//    No muscles are asked to produce gait; M1b is not used.
//      τ0 = α_r · [ ff + K·err + (D + h·K)·ω_ref ],   K, D ← α_r·K, α_r·D
//    ff is the RELATIVE-motion chain inverse dynamics of the intended limb motion (hr_id.mjs: sp_id without base linear acceleration or gravity,
//    which the gait support distributes uniformly). K and D come from a natural
//    frequency per joint family on the joint's subtree inertia. These are joint-space targets only: no body is pulled toward a world-space pose.
//
// 2. GAIT SUPPORT (locomotion: replaces "muscles generate the run"). While a foot is ACTUALLY on the turf, the intended running ground reaction is
//    applied as an internal force pair: −F at that foot's contact point, and +F on every other body of the athlete in proportion to its mass. This
//    is a virtual pivot at the COM, the idealisation of a runner directing the ground reaction through his centre of mass. Momentum leaves or
//    enters the athlete ONLY through the real foot–turf contact, so:
//      - the turf carries the load;
//      - friction genuinely anchors a planted foot;
//      - a swept or lifted foot carries nothing.
//      F = M·[ a_h + KvFwd·Δv_along + Kv·Δv_across ,  g + a_y + Ky·(y* − y) + Dy·(vy* − vy) ]    (*: RUN-1 intent; Δv = v* − v)
//    Horizontal is VELOCITY ONLY: there is no position term, so a displaced athlete keeps its displacement and runs on from where it is, and the
//    world keeps the collision's consequences. Bounds:
//      - push only;
//      - friction cone |F_h| ≤ μ·F_y;
//      - |F| ≤ F_max;
//      - the lean envelope (the leg cannot support a COM far outside the foot: full support while the foot→COM line is within lean0 of
//        vertical, none beyond lean1, and none beyond the leg's reach);
//      - organisation (no running support for a pelvis tilted beyond tilt1).
//    BALANCE: a pelvis orientation moment toward RUN-1's orientation, bounded by lever·F_y (pitch / roll) and leverYaw·F_y (yaw), with the same
//    gates. It is applied as an external moment on the pelvis, the angular part of the gait abstraction. It is needed because RUN-1 is kinematic
//    and its angular momentum is not dynamically consistent (its inverse dynamics put the centre of pressure beyond the toes, PVP-1 log §2). It
//    is LOGGED every step, and is zero in flight and whenever support is lost.
//
// 3. REGIONAL AUTHORITY (the continuum). Tolerances fixed BEFORE any contact run, from the no-contact run (720 steps, b04ec761; the frozen no-contact run 52c3320f gives the same values): eTol_r =
//    max(3°, 1.5 × the region's largest no-contact tracking error), giving legs 11°, trunk 3°, arms 3°; jScale 4 N·s. Regions: legL, legR, trunk, armL, armR. Each has its own α_r ∈ [floor, 1]:
//      D_r = max(0, e_r − eTol_r) / eScale + J_r / jScale,   α_r* = floor + (1 − floor)·exp(−D_r)
//      e_r  the region's tracking error (RMS over its axes, deg);
//      J_r  the player–player contact impulse on its bodies, sensed with a 20 ms delay over a 30 ms window (no turf contacts).
//    α_r falls toward α_r* with τ_down and recovers with τ_up.
//    So: tiny contact → local yield → recovery; overpowered → stays compliant while it cannot reach its target; no RUN-ON / RAGDOLL-ON switch.
//    Gait support is NOT tied to authority: it fails only physically (no foot on the turf, the COM outside the lean envelope, the pelvis
//    disorganised).
//
// The law is deterministic and reads only:
//   - the athlete's own body states;
//   - the plant's record of the previous step (its own contacts: turf loads and player–player impulses, i.e. touch / load sensing).
// Nothing here is presentation, and there is no random number.
const RA = new URL("../../", import.meta.url).href, S1 = RA + "slide_phys1/scripts/";
const L = await import(S1 + "sp_lib.mjs"), { V, Q, B, JN, M, G, bi } = L, CH = await import(S1 + "sp_chor.mjs"), ID = await import(new URL("./hr_id.mjs", import.meta.url).href), DR = await import(new URL("./hr_drive.mjs", import.meta.url).href);
const E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], D2R = Math.PI / 180, smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
export const REGIONS = { legL: ["hip_L", "knee_L", "ankle_L"], legR: ["hip_R", "knee_R", "ankle_R"], trunk: ["lumbar", "thoracic", "neck"], armL: ["shoulder_L", "elbow_L"], armR: ["shoulder_R", "elbow_R"] };
export const REGION_BODIES = { legL: ["thigh_L", "shank_L", "foot_L"], legR: ["thigh_R", "shank_R", "foot_R"], trunk: ["pelvis", "abdomen", "thorax", "head"], armL: ["upperArm_L", "forearm_L"], armR: ["upperArm_R", "forearm_R"] };
const regionOfJoint = Object.fromEntries(Object.entries(REGIONS).flatMap(([r, js]) => js.map(j => [j, r]))), regionOfBody = Object.fromEntries(Object.entries(REGION_BODIES).flatMap(([r, bs]) => bs.map(b => [b, r])));
export const DEFAULTS = {
  gains: { hip: { f: 8, z: 0.8 }, knee: { f: 8, z: 0.8 }, ankle: { f: 7, z: 0.8 }, lumbar: { f: 6, z: 0.9 }, thoracic: { f: 6, z: 0.9 }, neck: { f: 5, z: 0.9 }, shoulder: { f: 6, z: 0.8 }, elbow: { f: 6, z: 0.8 } },
  ffChains: [["hip_L", "knee_L", "ankle_L"], ["hip_R", "knee_R", "ankle_R"], ["shoulder_L", "elbow_L"], ["shoulder_R", "elbow_R"], ["lumbar", "thoracic", "neck"]],
  drive: { kappa: 2 },
  place: { on: false, cLatDeg: 12, cFwdDeg: 8, maxDeg: 15 },
  phase: { on: false, windowS: 0.15, minEarlyS: 0.04, lateClearM: 0.012, loadN: 200, kCatch: 4, rMax: 4, rLate: 0.25, holdS: 0.08 },
  support: { Ky: 150, Dy: 25, Kv: 4.0, KvFwd: 25, mu: 0.9, FmaxBW: 3.5, Ko: 2500, Do: 250, lever: 0.4, leverYaw: 0.2, acPR: 450, acYaw: 150, stanceAuth: 0.3, acCut: null, footPoint: "contact", grfBeta: 1.0, grfTauS: 0.02, gateRampS: 0.01, contactN: 20, proximityM: 0.004, stanceMarginS: 0.02, catchW: 1, lean0: 35, lean1: 60, reachM: 1.15, tilt0: 35, tilt1: 70 },
  authority: { eTolDeg: { legL: 11, legR: 11, trunk: 3, armL: 3, armR: 3 }, eScaleDeg: 15, jScaleNs: 4, floor: 0.15, tauDownS: 0.02, tauUpS: 0.3, delayS: 0.02, winS: 0.03 } };
const rotvec = (Rd, R) => { const dq = Q.mul(Rd, Q.conj(R)), d = dq[3] < 0 ? dq.map(x => -x) : dq, s = Math.hypot(d[0], d[1], d[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, d[3]); return [d[0] / s * a, d[1] / s * a, d[2] / s * a]; };
// subtree inertia about a joint centre (pose-dependent; evaluated once at the entry pose): Σ m·d² + mean principal inertia of every body below the joint
const kids = (() => { const k = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) k[b.parentIndex].push(i); }); const S = (i) => [i, ...k[i].flatMap(S)]; return B.map((_, i) => S(i)); })();
function subtreeInertia(st, j) { const p = V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin))); let I = 0;
  for (const i of kids[j.childIndex]) { const c = L.comBody(st, i), d = V.sub(c, p), b = B[i], tr = (b.inertia[0][0] + b.inertia[1][1] + b.inertia[2][2]) / 3; I += b.mass * V.dot(d, d) + tr; } return I; }
export class HybridRunner {
  constructor(intent, opts = {}) { this.I = intent; this.o = { ...DEFAULTS, ...opts, support: { ...DEFAULTS.support, ...(opts.support || {}) }, authority: { ...DEFAULTS.authority, ...(opts.authority || {}), eTolDeg: { ...DEFAULTS.authority.eTolDeg, ...((opts.authority || {}).eTolDeg || {}) } } };
    this.alpha = Object.fromEntries(Object.keys(REGIONS).map(r => [r, 1])); this.gate = { L: 0, R: 0 }; this.log = []; this.forces = null; this.h = 1 / 240;
    this.tau = 0; this.rate = 1; this.phys = { L: false, R: false }; this.catchUp = null; this.hold = 0; this.o.phase = { ...DEFAULTS.phase, ...(opts.phase || {}) };
    this.ff = this.o.ffChains.map(ch => ({ chain: ch, fn: ID.makeChainID(ch, intent.chor) })); }
  attach(plant, c) { this.plant = plant; this.c = c; this.role = c.role; const st = c.st; if (this.o.drive) c.act = new DR.AnimationDrive(c.spec, c.view, c.P, this.o.drive);
    this.gain = JN.map((j, k) => { const fam = j.name.replace(/_[LR]$/, ""), g = this.o.gains[fam] || { f: 6, z: 0.8 }, Ij = subtreeInertia(st, j), w = 2 * Math.PI * g.f; return { K: Ij * w * w, D: 2 * g.z * Ij * w, I: Ij }; }); }
  // touch sensing: player–player contact impulse per region over [now − delay − win, now − delay] from the plant's records (own bodies only)
  _touch() { const R = this.o.authority, out = Object.fromEntries(Object.keys(REGIONS).map(r => [r, 0])), recs = this.plant.recs, d = Math.round(R.delayS / this.h), w = Math.max(1, Math.round(R.winS / this.h));
    for (let k = Math.max(0, recs.length - d - w); k < recs.length - d; k++) for (const c of recs[k].contacts || []) { if (c.kind !== "cross" || !(c.Jn > 0)) continue; for (const s of [c.a, c.b]) if (Array.isArray(s) && s[0] === this.role && regionOfBody[s[1]]) out[regionOfBody[s[1]]] += c.Jn; }
    return out; }
  // turf load (N) and contact centroid of each own boot in the previous step
  _feet(st) { const out = { L: { N: 0, p: null }, R: { N: 0, p: null } }, r = this.plant.recs[this.plant.recs.length - 1];
    if (r) for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const s = c.a === "turf" ? c.b : c.a; if (!Array.isArray(s) || s[0] !== this.role || !/^foot_/.test(s[1])) continue; const f = out[s[1].slice(-1)], lam = c.points.reduce((a, p) => a + p.lam, 0);
      f.N += c.Jn / this.h; const Jf = c.a === "turf" ? c.J2 : V.sc(c.J2, -1); f.Fh = V.add(f.Fh || [0, 0, 0], V.sc([Jf[0], 0, Jf[2]], 1 / this.h)); const cp = c.points.reduce((a, p) => V.add(a, V.sc(p.p, p.lam)), [0, 0, 0]); f.acc = f.acc ? V.add(f.acc, cp) : cp; f.lam = (f.lam || 0) + lam; }
    for (const s of ["L", "R"]) { const f = out[s], fb = st[bi("foot_" + s)]; f.p = f.acc && f.lam > 0 ? V.sc(f.acc, 1 / f.lam) : V.add(fb.pos, Q.rot(fb.rot, [0, -0.09, 0.07])); f.lo = L.PL.bodyLowest(B[bi("foot_" + s)], fb).y; }
    return out; }
  command(c, st, ev, n) { const h = this.h, I = this.I, A = this.o.authority, Sp = this.o.support; if (n === 0) { this.tau = 0; this.rate = 1; this.catchUp = null; this.hold = 0; } const tau = this.tau, row = { n, tau: +tau.toFixed(2), e: {}, a: {} };
    // ── SWING-FOOT PLACEMENT (minimum experimental version, SIMBICON's velocity feedback): while a leg swings (RUN-1 swing and no support), its hip
    //    abduction / flexion targets move by c·(COM velocity − intended COM velocity) across / along the intended running direction (deg per m/s,
    //    clamped to maxDeg), so a body knocked sideways steps where it is going instead of where RUN-1 would have put the foot ──
    const PLc = this.o.place; let q1, q2;
    if (PLc && PLc.on) { let Pm = [0, 0, 0]; st.forEach((b, i) => { Pm = V.add(Pm, V.sc(b.v, B[i].mass)); }); const vv = V.sc(Pm, 1 / M), vi = I.comVel(tau), vhn = Math.hypot(vi[0], vi[2]), uf = vhn > 0.3 ? [vi[0] / vhn, 0, vi[2] / vhn] : [0, 0, 1], ulft = V.cross(uf, [0, 1, 0]), dv = [vv[0] - vi[0], 0, vv[2] - vi[2]];
      const eLat = V.dot(dv, ulft), eFwd = V.dot(dv, uf), cl = (x) => Math.max(-PLc.maxDeg, Math.min(PLc.maxDeg, x)), stI = I.stance(tau), off = {};
      for (const sd of ["L", "R"]) { if (stI[sd] || this.gate[sd] > 0.5) continue; off[sd] = { abd: cl((sd === "L" ? 1 : -1) * PLc.cLatDeg * eLat), flex: cl(PLc.cFwdDeg * eFwd) }; }
      const tgt = (t) => { const an = I.anat(t), o2 = {}; for (const [j, v] of Object.entries(an)) o2[j] = { ...v }; for (const [sd, d] of Object.entries(off)) { const hj = o2["hip_" + sd]; hj.abd = (hj.abd ?? 0) + d.abd; hj.flex = (hj.flex ?? 0) + d.flex; } return CH.jointTargets(o2); };
      q1 = tgt(tau); q2 = tgt(tau + this.rate); if (Object.keys(off).length) row.place = Object.fromEntries(Object.entries(off).map(([k, d]) => [k, [+d.abd.toFixed(1), +d.flex.toFixed(1)]])); }
    else { q1 = I.jointTargets(tau); q2 = I.jointTargets(tau + this.rate); }
    // ── joint tracking errors, per region, and regional authority ──
    const errs = JN.map((j, k) => { const q = ev.qs[k], qr = q1[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)); return [2 * dq[0], 2 * dq[1], 2 * dq[2]]; });
    const touch = n > 0 ? this._touch() : Object.fromEntries(Object.keys(REGIONS).map(r => [r, 0])); if (n === 0) this.touched = false; else if (Object.values(touch).some(x => x > 0)) this.touched = true;
    for (const [r, js] of Object.entries(REGIONS)) { let s = 0, m = 0; for (const jn of js) { const k = JN.findIndex(j => j.name === jn); for (let i = 0; i < 3; i++) if (c.act.ax[k][i]) { s += errs[k][i] ** 2; m++; } }
      const e = Math.sqrt(s / Math.max(1, m)) / D2R, Dr = Math.max(0, e - A.eTolDeg[r]) / A.eScaleDeg + touch[r] / A.jScaleNs, aStar = A.floor + (1 - A.floor) * Math.exp(-Dr), a0 = this.alpha[r];
      this.alpha[r] = n === 0 ? 1 : a0 + (aStar - a0) * (1 - Math.exp(-h / (aStar < a0 ? A.tauDownS : A.tauUpS))); row.e[r] = +e.toFixed(2); row.a[r] = +this.alpha[r].toFixed(3); if (touch[r] > 0) (row.touch = row.touch || {})[r] = +touch[r].toFixed(3); }
    // ── support state first (the gait support below and the stance-leg compliance both use it) ──
    let com = [0, 0, 0], P = [0, 0, 0]; st.forEach((b, i) => { com = V.add(com, V.sc(b.com, B[i].mass)); P = V.add(P, V.sc(b.v, B[i].mass)); }); com = V.sc(com, 1 / M); const v = V.sc(P, 1 / M);
    const feet = this._feet(st), stance = I.stance(tau), stM = I.stance(tau + Math.round(Sp.stanceMarginS / h)), stP = I.stance(tau - Math.round(Sp.stanceMarginS / h)), sup = {};
    for (const s of ["L", "R"]) { const f = feet[s], touching = f.N > Sp.contactN || f.lo < Sp.proximityM, sched = stance[s] || stM[s] || stP[s], want = touching ? (sched ? 1 : Sp.catchW) : 0;
      this.gate[s] = n === 0 ? want : Math.max(0, Math.min(1, this.gate[s] + Math.sign(want - this.gate[s]) * Math.min(Math.abs(want - this.gate[s]), h / Sp.gateRampS)));
      const d = V.sub(com, f.p), dl = V.len(d), lean = Math.acos(Math.max(-1, Math.min(1, d[1] / Math.max(1e-9, dl)))) / D2R, sLean = smooth(1 - (lean - Sp.lean0) / (Sp.lean1 - Sp.lean0)) * (dl <= Sp.reachM ? 1 : 0);
      sup[s] = { gate: this.gate[s], sLean, lean, N: f.N, p: f.p }; }
    // ── feed-forward: free-chain inverse dynamics of the intended motion on the actual base ──
    const ffT = JN.map(() => [0, 0, 0]); for (const f of this.ff) { const side = /_L$/.test(f.chain[0]) && /^hip/.test(f.chain[0]) ? "L" : /_R$/.test(f.chain[0]) && /^hip/.test(f.chain[0]) ? "R" : null, wf = side ? 1 - this.gate[side] : 1; if (wf <= 0) continue; const fv = f.fn(st, tau * h); for (const [k, v2] of Object.entries(fv)) for (let i = 0; i < 3; i++) ffT[k][i] += wf * (v2[i] || 0); }
    // ── actuator rows ──
    const legSide = { hip_L: "L", knee_L: "L", ankle_L: "L", hip_R: "R", knee_R: "R", ankle_R: "R" };
    const cmd = JN.map((j, k) => { const ls = legSide[j.name], al = (this.alpha[regionOfJoint[j.name]] ?? 1) * (ls ? 1 - this.gate[ls] * (1 - Sp.stanceAuth) : 1), g = this.gain[k], qa = q1[k], qn = q2[k], sn = qa[0] * qn[0] + qa[1] * qn[1] + qa[2] * qn[2] + qa[3] * qn[3] < 0 ? -1 : 1, dr = Q.mul(Q.conj(qa), qn.map(x => x * sn)), wRef = [2 * dr[0] / h, 2 * dr[1] / h, 2 * dr[2] / h];
      return [0, 1, 2].map(i => c.act.ax[k][i] ? { K: al * g.K, D: al * g.D, tau0: al * (ffT[k][i] + g.K * errs[k][i] + (g.D + h * g.K) * wRef[i]) } : null); });
    // ── gait support (the intended ground reaction, through the real foot contacts) ──
    const cs = I.com(tau), vs = I.comVel(tau), as = I.comAcc(tau), pel = st[0], up = Q.rot(pel.rot, [0, 1, 0]), tilt = Math.acos(Math.max(-1, Math.min(1, up[1]))) / D2R, sOrg = smooth(1 - (tilt - Sp.tilt0) / (Sp.tilt1 - Sp.tilt0));
    // horizontal velocity regulation split along the INTENDED running direction (KvFwd: keep running speed) and across it (Kv: a sideways
    // deviation decays slowly, the athlete keeps it and runs on); velocity only, no position term
    const vh = Math.hypot(vs[0], vs[2]), uf = vh > 0.3 ? [vs[0] / vh, 0, vs[2] / vh] : [0, 0, 0], ul = [uf[2], 0, -uf[0]], dv = [vs[0] - v[0], 0, vs[2] - v[2]], dvf = V.dot(dv, uf), dvl = V.dot(dv, ul);
    const ah = V.add(V.sc(uf, (Sp.KvFwd ?? Sp.Kv) * dvf), V.sc(ul, Sp.Kv * dvl));
    let Fd = [M * (as[0] + ah[0]), M * (G + as[1] + Sp.Ky * (cs[1] - com[1]) + Sp.Dy * (vs[1] - v[1])), M * (as[2] + ah[2])];
    if (Fd[1] < 0) Fd[1] = 0; const fh = Math.hypot(Fd[0], Fd[2]), cone = Sp.mu * Fd[1]; if (fh > cone && fh > 0) { Fd[0] *= cone / fh; Fd[2] *= cone / fh; } const fm = V.len(Fd), Fmax = Sp.FmaxBW * M * G; if (fm > Fmax) Fd = V.sc(Fd, Fmax / fm);
    const wsum = sup.L.gate + sup.R.gate, out = [];
    let Tw = [0, 0, 0], Fy = 0;
    // load-sensed ground-reaction tracking (grfBeta > 0): the horizontal turf force the support foot actually received last step, against the pair's
    // own push, is the leg's extra (its momentum absorbed through the planted foot); it is added to this step's pair so that the TOTAL horizontal
    // ground reaction follows the intent (filtered, τ grfTauS)
    this.xL = this.xL || { L: [0, 0, 0], R: [0, 0, 0] }; const prevF = this.forces ? Object.fromEntries(this.forces.pair.map(x => [x.side, x.F])) : {};
    for (const s of ["L", "R"]) { const pf = prevF[s], ft = feet[s].Fh; const x = pf && ft ? [pf[0] - ft[0], 0, pf[2] - ft[2]] : [0, 0, 0], a = 1 - Math.exp(-h / Sp.grfTauS); this.xL[s] = this.xL[s].map((y, i) => y + (x[i] - y) * a); if (!pf) this.xL[s] = [0, 0, 0]; }
    if (wsum > 0) for (const s of ["L", "R"]) { const u = sup[s].gate / Math.max(1, wsum) * sup[s].sLean * sOrg; if (u <= 0) continue; let F = V.sc(Fd, u); if (Sp.grfBeta) { F = V.add(F, V.sc(this.xL[s], Sp.grfBeta)); const fh2 = Math.hypot(F[0], F[2]), cone2 = Sp.mu * F[1]; if (fh2 > cone2 && fh2 > 0) { F[0] *= cone2 / fh2; F[2] *= cone2 / fh2; } }
      out.push({ side: s, foot: bi("foot_" + s), p: sup[s].p, F }); Fy += F[1]; }
    // orientation: the supported part (bounded by the support's lever, zero without support) + the animation-consistency part (RUN-1's own
    // angular momentum is not physically consistent, so following it needs a moment the turf cannot give; bounded, scaled by the trunk's authority, logged).
    // acCut (sensitivity check only, null in every frozen run): "touch" removes the animation-consistency part from the first sensed player contact
    // on; a number removes it from that time (s) on, contact or not
    const pd = I.pelvis(tau), T = V.add(V.sc(rotvec(pd.R, pel.rot), Sp.Ko), V.sc(V.sub(pd.w, pel.w), Sp.Do)), clampHY = (x, lh, ly) => { const th = Math.hypot(x[0], x[2]), f = th > lh ? lh / th : 1; return [x[0] * f, Math.max(-ly, Math.min(ly, x[1])), x[2] * f]; };
    const Tsup = Fy > 0 ? clampHY(T, Sp.lever * Fy, Sp.leverYaw * Fy) : [0, 0, 0], aRoot = this.alpha.trunk, Tac = (Sp.acCut === "touch" && this.touched) || (typeof Sp.acCut === "number" && n * h >= Sp.acCut) ? [0, 0, 0] : V.sc(clampHY(V.sub(T, Tsup), Sp.acPR, Sp.acYaw), aRoot); Tw = V.add(Tsup, Tac);
    this.forces = { pair: out, T: Tw }; row.Tsup = Tsup.map(x => Math.round(x)); row.Tac = Tac.map(x => Math.round(x));
    row.sup = { L: +sup.L.gate.toFixed(2), R: +sup.R.gate.toFixed(2), NL: Math.round(sup.L.N), NR: Math.round(sup.R.N), leanL: +sup.L.lean.toFixed(1), leanR: +sup.R.lean.toFixed(1), org: +sOrg.toFixed(2) };
    row.F = out.map(x => [x.side, ...x.F.map(y => Math.round(y))]); row.T = Tw.map(x => Math.round(x)); row.v = v.map(x => +x.toFixed(3)); row.vd = vs.map(x => +x.toFixed(3)); row.com = com.map(x => +x.toFixed(4)); row.comd = cs.map(x => +x.toFixed(4)); row.tilt = +tilt.toFixed(1);
    // ── PHASE SYNCHRONISATION (minimum experimental version): RUN-1's playback clock follows the body's physical touchdowns. A foot that lands
    //    while RUN-1 still swings it, more than minEarlyS (40 ms: smaller footfall timing errors are absorbed by the stance margin) and at most windowS (0.15 s)
//    before RUN-1's own touchdown of that foot, advances the playback toward that touchdown at up to
    //    rMax frames per step. A foot still more than lateClearM (12 mm) above the turf when RUN-1's stance of it begins holds the playback (rate rLate) for at most holdS. The
    //    playback otherwise runs at 1 frame per step. A touchdown here means real LOAD (> loadN = 200 N), never mere proximity. RUN-1 is never
//    edited, only re-timed.
    const PH = this.o.phase; let rate = 1;
    if (PH.on && n > 0) { for (const s2 of ["L", "R"]) { const f = feet[s2], touching = f.N > PH.loadN, rising = touching && !this.phys[s2], inSt = I.stances[s2].find(([a, b]) => tau >= a && tau <= b), next = I.stances[s2].find(([a]) => a > tau);
        if (rising && !inSt && next && next[0] - tau <= PH.windowS / h && next[0] - tau > PH.minEarlyS / h) { this.catchUp = { s: s2, target: next[0] }; row.ph = "early " + s2; }
        if (!touching && f.lo > PH.lateClearM && inSt && tau - inSt[0] <= 2 && this.hold < PH.holdS / h) { rate = Math.min(rate, PH.rLate); this.hold++; row.ph = "late " + s2; }
        if (touching) this.hold = 0; this.phys[s2] = touching; }
      if (this.catchUp) { const d = this.catchUp.target - tau; if (d <= 0.5) this.catchUp = null; else rate = Math.max(rate, Math.min(PH.rMax, 1 + d / PH.kCatch)); } }
    this.rate = rate; this.tau = tau + rate; row.rate = +rate.toFixed(2);
    this.log.push(row); this.last = row; return { cmd }; }
  // the plant calls this immediately before the physics step (after the actuator / passive motors are written)
  applyForces(plant) { const f = this.forces; if (!f) return; const c = this.c, w = plant.w, nb = c.nb;
    for (const x of f.pair) { let Mr = 0; for (let i = 0; i < nb; i++) if (i !== x.foot) Mr += B[i].mass;
      for (let i = 0; i < nb; i++) { if (i === x.foot) continue; const s = c.st[i]; w.addForceAt(c.bOff + i, V.sc(x.F, B[i].mass / Mr), s.com); }
      const fp = this.o.support.footPoint === "com" ? c.st[x.foot].com : x.p; w.addForceAt(c.bOff + x.foot, V.sc(x.F, -1), fp); }
    if (V.len(f.T) > 0) { const J = plant.J, t = w._t; t.v.Set(f.T[0], f.T[1], f.T[2]); w.bi.AddTorque(w.bodies[c.bOff].GetID(), t.v, J.EActivation_Activate); } }
  after() {}
  info() { return this.last || null; }
  meta() { return { law: "HYBRID-RUN-1 HybridRunner", opts: this.o, gains: this.gain.map(g => ({ K: +g.K.toFixed(1), D: +g.D.toFixed(2), I: +g.I.toFixed(4) })) }; }
}

// HAC-1 (HYBRID ACTIVE-PHYSICS CHARACTER V1): the runner law. RUN-1 is the athlete's locomotor INTENT; a V2 rigid body carries it out with finite
// joint torques only; real contacts disturb, constrain or defeat it; a continuous viability estimate decides how much of the intent is still
// physically executable, region by region.
//
// What changed from HYBRID-RUN-1 (hybrid_run1/scripts/hr_runner.mjs, preserved):
//   - NO EXTERNAL WRENCH OF ANY KIND. HYBRID-RUN-1 had three non-physical angular sources: the "animation-consistency" pelvis moment (external),
//     the "supported" pelvis moment (also applied as an external torque), and the gait-support pair itself, whose +F was spread over every body
//     by mass (a virtual pivot AT the COM): an internal pair whose lines of action do not coincide carries a hidden moment (r_com − r_foot) × F.
//     That last one also made foot placement irrelevant to balance, which is why HYBRID-RUN-1's foot-placement variant did nothing useful.
//   - SUPPORT IS DELIVERED BY THE STANCE LEG'S OWN JOINTS. The intended ground reaction F at the real contact point p is produced by the stance
//     hip, knee and ankle torques of the leg chain in statics: τ_on_distal(j) = −(p − c_j) × F. The upper body then receives exactly the ground
//     reaction acting at p, and the whole body's angular momentum about its COM changes only by (p − r_com) × F: physics, not bookkeeping.
//   - ATTITUDE THROUGH THE GROUND REACTION'S DIRECTION (Raibert's stance-hip attitude servo; SIMBICON's stance-hip torque): F = F_c + F_t, with
//     F_c along the foot→COM line (a SLIP leg: no moment about the COM) and F_t ⊥ that line giving the pelvis-orientation moment the stance foot
//     can actually transmit (friction cone, force bound). Yaw only through foot friction torque. In flight there is NO attitude control: the
//     pelvis is free to deviate from RUN-1 (RUN-1 is not angular-momentum consistent; the deviation is the physical truth).
//   - RECOVERY FOOT PLACEMENT (capture point / Raibert neutral point on top of RUN-1's own step): the free foot's landing point relative to the
//     COM moves by Δp = c · (v − v_RUN1 at its touchdown); c_lat = 1/ω0 (capture point), c_fwd tuned. Δp is turned into hip flexion / abduction
//     offsets of the swing leg in the PHYSICAL pelvis frame, ramped over the swing and rate-limited; bounded by the hip's range, the leg's reach,
//     the cross-over limit and the time left before RUN-1's touchdown. Whatever the bounds cut off is the step's infeasibility.
//   - CONTINUOUS ACTION VIABILITY V ∈ [0, 1] = min(placement feasibility, height margin at the next touchdown, trunk organisation), filtered
//     (falls fast, recovers slowly) plus a fall-commitment state C with a dead band (hysteresis). Locomotion weight w_loc = min(1 − C, s(V)).
//   - REGIONAL INTENT: per region, the joint targets are slerp(PROTECT, RUN-1 + recovery, w_region); legs and trunk use w_loc, arms leave RUN-1
//     earlier (balance / brace). Stiffness per region = max(contact/error authority α_r, protect tone × (1 − w_region)): contacts still win
//     locally, and a failing athlete keeps muscle tone instead of going limp.
//   - ACTIVE FALL / PROTECT intent: chin tuck, mild trunk flexion, arms toward the fall direction (brace / post), hips and knees flexed.
// Deterministic; reads only its own body state, RUN-1, and the plant's record of its own previous-step contacts. No random number.
const RA = new URL("../../", import.meta.url).href, S1 = RA + "slide_phys1/scripts/", H1 = RA + "hybrid_run1/scripts/";
const L = await import(S1 + "sp_lib.mjs"), { V, Q, B, JN, M, G, bi, ji } = L, CH = await import(S1 + "sp_chor.mjs"), ID = await import(H1 + "hr_id.mjs"), DR = await import(H1 + "hr_drive.mjs");
const D2R = Math.PI / 180, E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], now = () => performance.now();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x), sstep = (x, a, b) => smooth((x - a) / (b - a));
export const REGIONS = { legL: ["hip_L", "knee_L", "ankle_L"], legR: ["hip_R", "knee_R", "ankle_R"], trunk: ["lumbar", "thoracic", "neck"], armL: ["shoulder_L", "elbow_L"], armR: ["shoulder_R", "elbow_R"] };
export const REGION_BODIES = { legL: ["thigh_L", "shank_L", "foot_L"], legR: ["thigh_R", "shank_R", "foot_R"], trunk: ["pelvis", "abdomen", "thorax", "head"], armL: ["upperArm_L", "forearm_L"], armR: ["upperArm_R", "forearm_R"] };
const regionOfJoint = Object.fromEntries(Object.entries(REGIONS).flatMap(([r, js]) => js.map(j => [j, r]))), regionOfBody = Object.fromEntries(Object.entries(REGION_BODIES).flatMap(([r, bs]) => bs.map(b => [b, r])));
const LEG = { L: { hip: ji("hip_L"), knee: ji("knee_L"), ankle: ji("ankle_L"), foot: bi("foot_L"), region: "legL" }, R: { hip: ji("hip_R"), knee: ji("knee_R"), ankle: ji("ankle_R"), foot: bi("foot_R"), region: "legR" } };
const OTHER = { L: "R", R: "L" }, SOLE = [0, -0.09, 0.07];
export const DEFAULTS = {
  version: "HAC-1 V1",
  gains: { hip: { f: 8, z: 0.8 }, knee: { f: 8, z: 0.8 }, ankle: { f: 7, z: 0.8 }, lumbar: { f: 6, z: 0.9 }, thoracic: { f: 6, z: 0.9 }, neck: { f: 5, z: 0.9 }, shoulder: { f: 6, z: 0.8 }, elbow: { f: 6, z: 0.8 } },
  ffChains: [["hip_L", "knee_L", "ankle_L"], ["hip_R", "knee_R", "ankle_R"], ["shoulder_L", "elbow_L"], ["shoulder_R", "elbow_R"], ["lumbar", "thoracic", "neck"]],
  drive: { kappa: 2 },
  // support: the stance leg's joints realise the ground reaction F at the contact point
  support: { Ky: 150, Dy: 25, mu: 0.9, FmaxBW: 3.5, contactN: 20, gateRampS: 0.01, stanceAuth: 0.3, minUy: 0.35, kvT: 0, align: true, comp: false, stanceHip: "rel", stanceHipAuth: 1.0, vlaw: "warp", warpMinS: 0.06, KyS: 20, chain: false, stanceRotAuth: 0.3, ftOn: true, mode: "pair", integ: { vA: 0.8, vB: 2.0, dA: 0.15, dB: 0.35, settleS: 0.02, tauS: 0.02, plantedFrac: 0.75 }, muUse: 0.7, missS: 0.06, proximityM: 0.004, stanceMarginS: 0.02, catchW: 1,
    pairP: { floorBW: 0, floorLoadBW: 0.5, alignY: false, alignTolS: 0.042, KyS: 20, Ky: 150, Dy: 25, Kv: 4.0, KvFwd: 25, Ko: 2500, Do: 250, lever: 0.4, leverYaw: 0.2, acPR: 450, acYaw: 150, grfBeta: 1.0, grfTauS: 0.02, lean0: 35, lean1: 60, reachM: 1.15, tilt0: 35, tilt1: 70 }, supM: { on: false, Kp: 2500, Kd: 250, lFoot: 0.10, wFoot: 0.04, rFoot: 0.07, yawKp: 1200, yawKd: 150 },
    att: { Kp: 2500, Kd: 250, maxNm: 600, footR: 0.05, yawKp: 400, yawKd: 40 } },
  // recovery placement (Δp = c·Δv at the free foot's RUN-1 touchdown)
  place: { on: true, cLat: 0.15, cFwd: 0, dvA: 5, dvB: 6, vDownMax: 2.5, reactS: 0.06, maxFlexDeg: 25, maxAbdDeg: 30, maxAddDeg: 15, rateDegS: 500, crossM: 0.05, reachM: 0.80, rampFrac: 0.35, decayS: 0.12, emergencyS: 0.06 },
  // viability: instantaneous margins → filtered V → fall commitment C (dead band)
  viab: { qA: 0.7, qB: 1.4, dropA: 0.12, dropB: 0.30, tiltA: 32, tiltB: 58, tiltLookS: 0.15, tauDownS: 0.04, tauUpS: 0.35, cOn: 0.30, cOff: 0.65, cRiseS: 0.10, cFallS: 0.80, wLo: 0.15, wHi: 0.50, armLo: 0.45, armHi: 0.85 },
  // regional contact / error authority (HYBRID-RUN-1's law, measured against the blended target)
  authority: { eTolDeg: { legL: 11, legR: 11, trunk: 3, armL: 3, armR: 3 }, eScaleDeg: 15, jScaleNs: 4, floor: 0.15, tauDownS: 0.02, tauUpS: 0.3, delayS: 0.02, winS: 0.03 },
  protect: { tone: 0.45 },
  clear: { on: true, phase0: 0.1, phase1: 0.85, tolM: 0.03, degPerM: 200, maxDeg: 20, hipShare: 0.5, rateDegS: 600 },
  phase: { on: false, windowS: 0.15, minEarlyS: 0.04, lateClearM: 0.012, loadN: 200, kCatch: 4, rMax: 4, rLate: 0.25, holdS: 0.08 },
  aim: { on: false, mode: "yaw" },
  icm: { on: false, Kp: 2500, Kd: 250, capPR: 150, capYaw: 60, stanceOnly: true },
};
const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" ? merge(a[k], v) : v; return o; };
const rotvec = (Rd, R) => { const dq = Q.mul(Rd, Q.conj(R)), d = dq[3] < 0 ? dq.map(x => -x) : dq, s = Math.hypot(d[0], d[1], d[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, d[3]); return [d[0] / s * a, d[1] / s * a, d[2] / s * a]; };
const kids = (() => { const k = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) k[b.parentIndex].push(i); }); const S = (i) => [i, ...k[i].flatMap(S)]; return B.map((_, i) => S(i)); })();
const jointAt = (st, j) => V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin)));
function subtreeInertia(st, j) { const p = jointAt(st, j); let I = 0; for (const i of kids[j.childIndex]) { const c = L.comBody(st, i), d = V.sub(c, p), b = B[i], tr = (b.inertia[0][0] + b.inertia[1][1] + b.inertia[2][2]) / 3; I += b.mass * V.dot(d, d) + tr; } return I; }
const hz = (v) => [v[0], 0, v[2]];
// the PROTECT intent (anatomical degrees). fwd / side: the fall direction in the pelvis frame (unit, side > 0 = toward the athlete's right)
export function protectAnat(fwd, side) { const sR = Math.max(0, side), sL = Math.max(0, -side), f = Math.max(0, fwd);
  const arm = (s) => ({ flex: 35 + 45 * f + 15 * (sR + sL), abd: 20 + 50 * s, rot: 0 });
  return { lumbar: { flex: 10, lat: 0, rot: 0 }, thoracic: { flex: 10, lat: 0, rot: 0 }, neck: { flex: 22, lat: 0, rot: 0 },
    shoulder_L: arm(sL), shoulder_R: arm(sR), elbow_L: { flex: 35, pron: 0 }, elbow_R: { flex: 35, pron: 0 },
    hip_L: { flex: 40, abd: 8, rot: 0 }, hip_R: { flex: 40, abd: 8, rot: 0 }, knee_L: { flex: 60, rot: 0 }, knee_R: { flex: 60, rot: 0 }, ankle_L: { df: 0, inv: 0, fabd: 0 }, ankle_R: { df: 0, inv: 0, fabd: 0 } }; }

export class HacRunner {
  constructor(intent, opts = {}) { this.I = intent; this.o = merge(DEFAULTS, opts); this.h = 1 / 240;
    this.alpha = Object.fromEntries(Object.keys(REGIONS).map(r => [r, 1])); this.gate = { L: 0, R: 0 }; this.Vf = 1; this.C = 0; this.off = { L: { flex: 0, abd: 0 }, R: { flex: 0, abd: 0 } };
    this.log = []; this.perf = { viab: 0, plan: 0, track: 0, support: 0, total: 0, n: 0 }; this.touched = false; this.onTurf = { L: false, R: false }; this.tdPhys = { L: 0, R: 0 }; this.stIv = { L: null, R: null }; this.hs = { L: null, R: null }; this.land = { L: null, R: null }; this.integ = { L: 1, R: 1 }; this.stOn = { L: false, R: false }; this.stT0 = { L: 0, R: 0 }; this.planted = { L: false, R: false }; this.lost = { L: false, R: false }; this.clr = { L: 0, R: 0 };
    this.ff = this.o.ffChains.map(ch => ({ chain: ch, fn: ID.makeChainID(ch, intent.chor) })); }
  attach(plant, c) { this.plant = plant; this.c = c; this.role = c.role; const st = c.st; if (this.o.drive) c.act = new DR.AnimationDrive(c.spec, c.view, c.P, this.o.drive);
    this.jdOf = {}; for (const d of c.P.jd) this.jdOf[d.k] = d;
    this.gain = JN.map((j) => { const fam = j.name.replace(/_[LR]$/, ""), g = this.o.gains[fam] || { f: 6, z: 0.8 }, Ij = subtreeInertia(st, j), w = 2 * Math.PI * g.f; return { K: Ij * w * w, D: 2 * g.z * Ij * w, I: Ij }; }); }
  _touch() { const R = this.o.authority, out = Object.fromEntries(Object.keys(REGIONS).map(r => [r, 0])), recs = this.plant.recs, d = Math.round(R.delayS / this.h), w = Math.max(1, Math.round(R.winS / this.h));
    for (let k = Math.max(0, recs.length - d - w); k < recs.length - d; k++) for (const c of recs[k].contacts || []) { if (c.kind !== "cross" || !(c.Jn > 0)) continue; for (const s of [c.a, c.b]) if (Array.isArray(s) && s[0] === this.role && regionOfBody[s[1]]) out[regionOfBody[s[1]]] += c.Jn; }
    return out; }
  _feet(st) { const out = { L: { N: 0, p: null }, R: { N: 0, p: null } }, r = this.plant.recs[this.plant.recs.length - 1];
    if (r) for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const s = c.a === "turf" ? c.b : c.a; if (!Array.isArray(s) || s[0] !== this.role || !/^foot_/.test(s[1])) continue; const f = out[s[1].slice(-1)], lam = c.points.reduce((a, p) => a + p.lam, 0);
      f.N += c.Jn / this.h; const Jf = c.a === "turf" ? c.J2 : V.sc(c.J2, -1); f.Fh = V.add(f.Fh || [0, 0, 0], V.sc([Jf[0], 0, Jf[2]], 1 / this.h)); const cp = c.points.reduce((a, p) => V.add(a, V.sc(p.p, p.lam)), [0, 0, 0]); f.acc = f.acc ? V.add(f.acc, cp) : cp; f.lam = (f.lam || 0) + lam; }
    for (const s of ["L", "R"]) { const f = out[s], fb = st[bi("foot_" + s)]; f.sole = V.add(fb.pos, Q.rot(fb.rot, SOLE)); f.p = f.acc && f.lam > 0 ? V.sc(f.acc, 1 / f.lam) : f.sole; f.lo = L.PL.bodyLowest(B[bi("foot_" + s)], fb).y; f.v = V.add(fb.v, V.cross(fb.w, V.sub(f.p, fb.com))); }   // f.v: the SLIP velocity of the foot's material point at the contact
    return out; }
  // RUN-1's touchdown plan for foot s seen from intent frame tau: the next stance start (or "now" if RUN-1 says stance but the foot is free)
  _nextTD(s, tau, stanceNow) { const I = this.I, ivs = I.stances[s];
    if (stanceNow) { const cur = ivs.find(([a, b]) => tau >= a && tau <= b); return { nTd: tau + Math.round(this.o.place.emergencyS / this.h), nLo: cur ? cur[0] - 1 : tau - 1, emergency: true }; }
    const nx = ivs.find(([a]) => a > tau); if (!nx) return null; const prev = [...ivs].reverse().find(([, b]) => b < nx[0]); return { nTd: nx[0], nLo: prev ? prev[1] : tau - 1, emergency: false }; }
  command(c, st, ev, n) {
    if (n === 0) { this.Vf = 1; this.C = 0; this.touched = false; this.tau = 0; this.catchUp = null; this.hold = 0; this.physTouch = { L: false, R: false }; }
    const T0 = now(), h = this.h, I = this.I, A = this.o.authority, Sp = this.o.support, PLc = this.o.place, VB = this.o.viab, tau = this.o.phase.on ? this.tau : n;
    const row = { n, e: {}, a: {}, w: {} };
    // ── physical state ──
    let com = [0, 0, 0], P = [0, 0, 0]; st.forEach((b, i) => { com = V.add(com, V.sc(b.com, B[i].mass)); P = V.add(P, V.sc(b.v, B[i].mass)); }); com = V.sc(com, 1 / M); const v = V.sc(P, 1 / M);
    const feet = this._feet(st), pel = st[0], upP = Q.rot(pel.rot, [0, 1, 0]), tilt = Math.acos(clamp(upP[1], -1, 1)) / D2R, thor = st[bi("thorax")], upT = Q.rot(thor.rot, [0, 1, 0]), tiltT = Math.acos(clamp(upT[1], -1, 1)) / D2R;
    // tilt rate: the horizontal part of the pelvis angular velocity that increases its tilt (look-ahead)
    const tiltAxis = V.cross([0, 1, 0], upP), tiltRate = V.len(tiltAxis) > 1e-6 ? V.dot(pel.w, V.norm(tiltAxis)) / D2R : 0;
    const stanceI = I.stance(tau), comI = I.com(tau), vI = I.comVel(tau), aI = I.comAcc(tau), pelI = I.pelvis(tau);
    const vhI = Math.hypot(vI[0], vI[2]), uf = vhI > 0.3 ? [vI[0] / vhI, 0, vI[2] / vhI] : [0, 0, 1], ul = V.cross(uf, [0, 1, 0]);   // ul = the athlete's anatomical left
    // support gates (real load only; ramped)
    const stM_ = I.stance(tau + Math.round(Sp.stanceMarginS / h)), stP_ = I.stance(tau - Math.round(Sp.stanceMarginS / h));
    for (const s of ["L", "R"]) { const touchP = feet[s].N > Sp.contactN || feet[s].lo < Sp.proximityM, sched = stanceI[s] || stM_[s] || stP_[s], want = Sp.mode === "pair" ? (touchP ? (sched ? 1 : Sp.catchW) : 0) : (feet[s].N > Sp.contactN ? 1 : 0); this.gate[s] = n === 0 ? want : clamp(this.gate[s] + Math.sign(want - this.gate[s]) * Math.min(Math.abs(want - this.gate[s]), h / Sp.gateRampS), 0, 1);
      // the foot's PHYSICAL touchdown step (for the stance-aligned support profile)
      if (want && !this.onTurf[s]) { this.tdPhys[s] = n; const ivs = I.stances[s]; let best = null; for (const iv of ivs) if (!best || Math.abs(iv[0] - tau) < Math.abs(best[0] - tau)) best = iv; this.stIv[s] = best && Math.abs(best[0] - tau) * h < 0.2 ? best : null;
        // half-sine stance template (physical touchdown → RUN-1's stance length of that foot; takeoff vertical velocity = RUN-1's at its toe-off)
        const iv = this.stIv[s], Tst = iv ? (iv[1] - iv[0] + 1) * h : 0.13, vTo = iv ? I.comVel(iv[1] + 1)[1] : Math.abs(v[1]);
        this.hs[s] = { Tst, vLand: v[1], zLand: com[1], vTo, zMid: iv ? I.com(Math.round((iv[0] + iv[1]) / 2))[1] : comI[1], Fpk: Math.PI * M * (vTo - v[1] + G * Tst) / (2 * Tst) }; }
      this.onTurf[s] = !!want; if (want && this.tdPhys[s] === n) this.land[s] = hz(st[LEG[s].foot].pos);
      // SUPPORT INTEGRITY: a support foot that slides (horizontal sole speed) or has been displaced from where it landed is no longer a running
      // stance; its share of the gait support fades (physical: a dragged / swept foot cannot hold the leg's load)
      const fv = Math.hypot(feet[s].v[0], feet[s].v[2]), disp = want && this.land[s] ? V.len(V.sub(hz(st[LEG[s].foot].pos), this.land[s])) : 0, SI = Sp.integ;   // the foot BODY's displacement (its contact centroid rolls heel → toe in a normal stance)
      // judged only where the foot should be planted: settled after touchdown, and inside the first planted fraction of RUN-1's own stance of
      // this foot (a normal toe-off rolls and lifts the foot)
      const ivNow = stanceI[s] ? I.stances[s].find(([a0, b0]) => tau >= a0 && tau <= b0) : null, phSt = ivNow ? (tau - ivNow[0]) / Math.max(1, ivNow[1] - ivNow[0]) : 1;
      const settled = want && (n - this.tdPhys[s]) * h >= SI.settleS && phSt <= SI.plantedFrac, raw = settled ? (1 - sstep(fv, SI.vA, SI.vB)) * (1 - sstep(disp, SI.dA, SI.dB)) : 1;
      this.integ[s] = !want ? 1 : this.integ[s] + (raw - this.integ[s]) * (1 - Math.exp(-h / SI.tauS)); feet[s].integ = this.integ[s]; feet[s].slide = fv; feet[s].disp = disp; }
    this.gEff = { L: this.gate.L * feet.L.integ, R: this.gate.R * feet.R.integ };
    // SUPPORT LOST (per RUN-1 stance of each foot): the foot was planted in this stance and has lost it (swept / slipping), or RUN-1's stance has
    // run for more than missS without the foot ever being planted (a missed step). Normal touchdown jitter is neither.
    for (const s of ["L", "R"]) { if (stanceI[s] && !this.stOn[s]) { this.stOn[s] = true; this.stT0[s] = n; this.planted[s] = false; } if (!stanceI[s]) this.stOn[s] = false; if (this.gEff[s] > 0.5) this.planted[s] = true;
      this.lost[s] = !!stanceI[s] && ((this.planted[s] && this.gEff[s] < 0.5 && this.gate[s] > 0.2) || (!this.planted[s] && (n - this.stT0[s]) * h > Sp.missS)); }
    const touch = n > 0 ? this._touch() : Object.fromEntries(Object.keys(REGIONS).map(r => [r, 0])); if (Object.values(touch).some(x => x > 0)) this.touched = true;
    // ── RECOVERY PLANNER (free feet) ──
    const T1 = now(), plan = {}; let cand = null;
    const w0 = Math.sqrt(G / Math.max(0.5, com[1])), cLat = PLc.cLat ?? 1 / w0;
    for (const s of ["L", "R"]) { const loaded = this.gate[s] > 0.5; if (loaded) continue;
      const td = this._nextTD(s, tau, !!stanceI[s]); if (!td) continue; const tRem = Math.max(h, (td.nTd - tau) * h), phi = clamp((tau - td.nLo) / Math.max(1, td.nTd - td.nLo), 0, 1);
      // RUN-1's own landing: sole relative to its COM, its pelvis, its hip; and its COM velocity at that touchdown
      const PI = I.pose(td.nTd), soleI = V.add(PI[LEG[s].foot].pos, Q.rot(PI[LEG[s].foot].rot, SOLE)), comTdI = I.com(td.nTd), vTdI = I.comVel(td.nTd), hipI = jointAt(PI, JN[LEG[s].hip]);
      const relI = hz(V.sub(soleI, comTdI)), dv = hz(V.sub(v, vTdI)), dvF = V.dot(dv, uf), dvL = V.dot(dv, ul);
      // lateral gain: small velocity noise is absorbed by the stance (cLat); a real sideways disturbance gets the full capture-point step (1/ω0)
      const cLatE = cLat + (1 / w0 - cLat) * sstep(Math.abs(dvL), PLc.dvA, PLc.dvB), dP = V.add(V.sc(uf, PLc.cFwd * dvF), V.sc(ul, cLatE * dvL));
      // predicted physical COM and hip at touchdown (ballistic horizontally), desired landing point
      const comPred = V.add(hz(com), V.sc(hz(v), tRem)), hipNow = jointAt(st, JN[LEG[s].hip]), hipPred = V.add(hipNow, V.sc(hz(v), tRem));
      const pNom = V.add(comPred, relI), pDes0 = V.add(pNom, dP);
      // cross-over limit: the free foot may not land more than crossM beyond the other foot's line toward the other side
      const other = feet[OTHER[s]], sideSign = s === "L" ? 1 : -1, otherLat = V.dot(hz(other.p), ul); let pDes = pDes0.slice(), cross = 0;
      // (measured from RUN-1's own placement: RUN-1's runner already lands near / across the midline, which is its style, not a crossing)
      const lat = V.dot(pDes, ul), latNom = V.dot(pNom, ul), minLat = sideSign > 0 ? Math.min(latNom, otherLat) - PLc.crossM : Math.max(latNom, otherLat) + PLc.crossM; if (sideSign * (lat - minLat) < 0) { cross = Math.abs(lat - minLat); pDes = V.add(pDes, V.sc(ul, minLat - lat)); }
      // desired vs RUN-1 leg direction (hip → sole), each in its own pelvis frame; the difference = hip flexion / abduction offsets
      const legI = Q.rot(Q.conj(PI[0].rot), V.sub(soleI, hipI)), legD = Q.rot(Q.conj(PI[0].rot), V.sub([pDes[0], soleI[1], pDes[2]], [hipPred[0], hipI[1], hipPred[2]]));   // both in RUN-1's pelvis frame at touchdown: the free hip is aimed in that frame (below)
      const fl = (u) => Math.atan2(u[2], -u[1]) / D2R, la = (u) => Math.atan2(u[0], -u[1]) / D2R;   // pelvis frame: +z forward, +x the athlete's right
      const dFlex = fl(legD) - fl(legI), dLatR = la(legD) - la(legI), dAbd = s === "R" ? dLatR : -dLatR, reach = Math.hypot(pDes[0] - hipPred[0], pDes[2] - hipPred[2]);
      const flexT = clamp(dFlex, -PLc.maxFlexDeg, PLc.maxFlexDeg), abdT = clamp(dAbd, -PLc.maxAddDeg, PLc.maxAbdDeg), ramp = td.emergency ? 1 : sstep(phi, 0, PLc.rampFrac);
      const tgt = { flex: flexT * ramp, abd: abdT * ramp }, need = Math.max(Math.abs(flexT - this.off[s].flex), Math.abs(abdT - this.off[s].abd)) / Math.max(tRem, 0.05);   // deg/s still needed to get there by touchdown
      const reachI = Math.hypot(soleI[0] - hipI[0], soleI[2] - hipI[2]), qs = [Math.abs(dFlex) / PLc.maxFlexDeg, dAbd >= 0 ? dAbd / PLc.maxAbdDeg : -dAbd / PLc.maxAddDeg, cross / 0.15, need / PLc.rateDegS, Math.max(0, reach - reachI) / Math.max(0.05, PLc.reachM - reachI)];
      const q = Math.max(...qs);
      // EARLIEST POSSIBLE CONTACT of this free foot: its lowest point over the turf at the foot's maximum downward speed (+ a fixed reaction);
      // if the athlete has no intact support, the step may be advanced to it (emergency step); otherwise RUN-1's own touchdown stands
      const tPoss = clamp(Math.max(0, feet[s].lo) / PLc.vDownMax + PLc.reactS, PLc.reactS, tRem), gE0 = this.gEff || this.gate, noSup = n > 0 && (this.lost.L || this.lost.R) && gE0.L + gE0.R < 0.5;   // the expected stance is lost (swept / slipping / missed) and nothing else supports
      const tUse = noSup && tRem > tPoss + 0.02 ? tPoss : tRem;
      plan[s] = { s, tRem: tUse, tRun: tRem, adv: tUse < tRem, phi, nTd: td.nTd, emergency: td.emergency || tUse < tRem, dP, pNom, pDes, cross, dFlex, dAbd, tgt, q, qs, need, reach };
      if (!cand || tRem < cand.tRem) cand = plan[s]; }
    // apply / decay the per-foot offsets (rate-limited: no target pops)
    for (const s of ["L", "R"]) { const o = this.off[s], g = plan[s] && PLc.on && (VB.off || this.C < 0.95) ? plan[s].tgt : { flex: o.flex * Math.exp(-h / PLc.decayS), abd: o.abd * Math.exp(-h / PLc.decayS) }, r = PLc.rateDegS * h;
      o.flex += clamp(g.flex - o.flex, -r, r); o.abd += clamp(g.abd - o.abd, -r, r); }
    this.perf.plan += now() - T1;
    // ── VIABILITY ──
    const T2 = now(), VBm = {};
    VBm.place = cand ? 1 - sstep(cand.q, VB.qA, VB.qB) : 1;
    // height margin at the candidate's touchdown: ballistic if nothing supports the athlete now, held if something does
    const gI = this.gEff || this.gate, supNow = gI.L + gI.R > 0.5, tC = cand ? cand.tRem : 0, lostNow = (this.lost.L || this.lost.R) && !supNow, zPred = !lostNow ? (supNow ? com[1] : com[1] + v[1] * tC - 0.5 * G * tC * tC) : com[1] + v[1] * tC - 0.5 * G * tC * tC, zRef = cand ? I.com(cand.nTd)[1] : comI[1];
    VBm.drop = zRef - zPred; VBm.height = 1 - sstep(VBm.drop, VB.dropA, VB.dropB);
    VBm.tiltPred = Math.max(tilt, tiltT) + Math.max(0, tiltRate) * VB.tiltLookS; VBm.org = 1 - sstep(VBm.tiltPred, VB.tiltA, VB.tiltB);
    // support integrity: the athlete relies on a stance (RUN-1 says one foot is in stance, or a foot is loaded) that is sliding / displaced
    const relied = ["L", "R"].filter(s => this.gate[s] > 0.5 || stanceI[s]); VBm.integ = relied.length ? Math.max(...relied.map(s => (this.gate[s] > 0.5 ? feet[s].integ : 0))) : 1;
    VBm.integ = supNow || !relied.length ? Math.max(VBm.integ, supNow ? 1 : 0) : VBm.integ;
    const Vi = Math.min(VBm.place, VBm.height, VBm.org);
    this.Vf += (Vi - this.Vf) * (1 - Math.exp(-h / (Vi < this.Vf ? VB.tauDownS : VB.tauUpS)));
    // fall commitment with a dead band: rises below cOn, decays above cOff, holds in between
    if (this.Vf < VB.cOn) this.C += (1 - this.C) * (1 - Math.exp(-h / VB.cRiseS)); else if (this.Vf > VB.cOff) this.C += (0 - this.C) * (1 - Math.exp(-h / VB.cFallS));
    const wLoc = VB.off ? 1 : Math.min(1 - this.C, sstep(this.Vf, VB.wLo, VB.wHi)), wArm = VB.off ? 1 : Math.min(wLoc, sstep(this.Vf, VB.armLo, VB.armHi));
    const W = { legL: wLoc, legR: wLoc, trunk: wLoc, armL: wArm, armR: wArm };
    this.perf.viab += now() - T2;
    // ── TRACKING: blended targets (PROTECT ↔ RUN-1 + recovery), regional authority, PD + feed-forward ──
    const T3 = now();
    const anR = { ...I.anat(tau) }, anR2 = { ...I.anat(tau + 1) }, addOff = (an) => { const o = {}; for (const [j, x] of Object.entries(an)) o[j] = { ...x }; for (const s of ["L", "R"]) { const hj = o["hip_" + s]; hj.flex = (hj.flex ?? 0) + this.off[s].flex; hj.abd = (hj.abd ?? 0) + this.off[s].abd; } return o; };
    // EMERGENCY STEP: a free leg whose step is advanced takes RUN-1's own TOUCHDOWN pose for that leg (RUN-1's leg cycle re-timed, not a new motion)
    for (const s of ["L", "R"]) { const pl = plan[s]; if (!pl || !pl.adv) continue; const aTd = I.anat(pl.nTd); for (const j of ["hip_", "knee_", "ankle_"]) { anR[j + s] = { ...aTd[j + s] }; anR2[j + s] = { ...aTd[j + s] }; } }
    // SWING-FOOT CLEARANCE (the elevating response to a trip): in mid-swing (RUN-1 swing phase clrPhase0…1 of a free foot), a foot lower than
    // RUN-1's own swing foot by more than clrTol gets extra hip and knee flexion ∝ the deficit (bounded, rate-limited). RUN-1's step is
    // otherwise untouched.
    const CL = this.o.clear; row.clr = {};
    for (const s of ["L", "R"]) { let tgtC = 0; if (CL.on && !stanceI[s] && this.gate[s] < 0.5) { const nx = I.stances[s].find(([a0]) => a0 > tau), pv = [...I.stances[s]].reverse().find(([, b0]) => b0 < tau);
        if (nx && pv) { const ph = (tau - pv[1]) / Math.max(1, nx[0] - pv[1]); if (ph > CL.phase0 && ph < CL.phase1) { const PI2 = I.pose(Math.round(tau)), fI = PI2[LEG[s].foot], loI = L.PL.bodyLowest(B[LEG[s].foot], fI).y, def = loI - feet[s].lo - CL.tolM; if (def > 0) tgtC = Math.min(CL.maxDeg, CL.degPerM * def); } } }
      const r = CL.rateDegS * h; this.clr[s] += clamp(tgtC - this.clr[s], -r, r); if (this.clr[s] > 0.05) { for (const an of [anR, anR2]) { an["hip_" + s] = { ...an["hip_" + s], flex: (an["hip_" + s].flex ?? 0) + this.clr[s] * CL.hipShare }; an["knee_" + s] = { ...an["knee_" + s], flex: (an["knee_" + s].flex ?? 0) + this.clr[s] }; } row.clr[s] = +this.clr[s].toFixed(1); } }
    const qRun = CH.jointTargets(addOff(anR)), qRun2 = CH.jointTargets(addOff(anR2));
    // FREE-LEG AIMING (procedural adaptation of the intent to the physical pelvis): a free leg's hip target is RUN-1's thigh orientation in RUN-1's
    // pelvis frame, i.e. in the WORLD, expressed relative to the PHYSICAL pelvis, so a pelvis that deviates from RUN-1 (it must: RUN-1 is not
    // angular-momentum consistent) does not carry the swing foot off line. A supporting leg keeps RUN-1's pelvis-relative targets (its hip then
    // couples the pelvis to the planted leg). Weight = 1 − support gate.
    if (this.o.aim.on) { const an1 = addOff(anR), an2 = addOff(anR2), yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) / D2R; };
      // "yaw": the free thigh keeps RUN-1's pelvis-relative flexion / abduction, but its heading follows RUN-1's pelvis heading instead of the
      // physical pelvis's (the foot lands pointing where RUN-1 points it); "full": RUN-1's thigh world orientation (all axes)
      const full = this.o.aim.mode === "full", pRef1 = full ? pelI.R : Q.norm(Q.mul(L.yawQ(yawOf(pelI.R) - yawOf(pel.rot)), pel.rot)), pRef2 = full ? I.pelvis(tau + 1).R : Q.norm(Q.mul(L.yawQ(yawOf(I.pelvis(tau + 1).R) - yawOf(pel.rot)), pel.rot));
      for (const s of ["L", "R"]) { const wA = 1 - this.gate[s]; if (wA <= 0.001) continue; const k = LEG[s].hip, j = JN[k];
        const qa = L.IL.qcs(j, pel.rot, L.childRotation(j, pRef1, an1[j.name] || {})), qb = L.IL.qcs(j, pel.rot, L.childRotation(j, pRef2, an2[j.name] || {}));
        qRun[k] = wA >= 0.999 ? qa : L.slerp(qRun[k], qa, wA); qRun2[k] = wA >= 0.999 ? qb : L.slerp(qRun2[k], qb, wA); } }
    const vhP = Q.rot(Q.conj(pel.rot), hz(v)), vn = Math.hypot(vhP[0], vhP[2]) || 1, qPro = CH.jointTargets(protectAnat(vhP[2] / vn, vhP[0] / vn));
    // STANCE-HIP ATTITUDE (SIMBICON): a supporting leg's hip target is "the pelvis at RUN-1's WORLD orientation, relative to the actual thigh":
    // the hip then servos the pelvis attitude (pitch, roll, yaw) against the planted leg, and the turf takes the reaction through the foot
    if (Sp.stanceHip === "world") for (const s of ["L", "R"]) { const g = this.gate[s]; if (g <= 0.001) continue; const k = LEG[s].hip, j = JN[k], qw = L.IL.qcs(j, pelI.R, st[j.childIndex].rot), qw2 = L.IL.qcs(j, I.pelvis(tau + 1).R, st[j.childIndex].rot);
      qRun[k] = g >= 0.999 ? qw : L.slerp(qRun[k], qw, g); qRun2[k] = g >= 0.999 ? qw2 : L.slerp(qRun2[k], qw2, g); }
    const qT = JN.map((j, k) => { const w = W[regionOfJoint[j.name]] ?? 1; return w >= 0.999 ? qRun[k] : w <= 0.001 ? qPro[k] : L.slerp(qPro[k], qRun[k], w); });
    const errs = JN.map((j, k) => { const q = ev.qs[k], qr = qT[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)); return [2 * dq[0], 2 * dq[1], 2 * dq[2]]; });
    for (const [r, js] of Object.entries(REGIONS)) { let s2 = 0, m = 0; for (const jn of js) { const k = ji(jn); for (let i = 0; i < 3; i++) if (c.act.ax[k][i]) { s2 += errs[k][i] ** 2; m++; } }
      const e = Math.sqrt(s2 / Math.max(1, m)) / D2R, Dr = Math.max(0, e - A.eTolDeg[r]) / A.eScaleDeg + touch[r] / A.jScaleNs, aStar = A.floor + (1 - A.floor) * Math.exp(-Dr), a0 = this.alpha[r];
      this.alpha[r] = n === 0 ? 1 : a0 + (aStar - a0) * (1 - Math.exp(-h / (aStar < a0 ? A.tauDownS : A.tauUpS))); row.e[r] = +e.toFixed(2); row.a[r] = +this.alpha[r].toFixed(3); row.w[r] = +W[r].toFixed(3); if (touch[r] > 0) (row.touch = row.touch || {})[r] = +touch[r].toFixed(3); }
    const ffT = JN.map(() => [0, 0, 0]); for (const f of this.ff) { const side = /^hip_L/.test(f.chain[0]) ? "L" : /^hip_R/.test(f.chain[0]) ? "R" : null, reg = regionOfJoint[f.chain[0]], wf = (side ? 1 - this.gate[side] : 1) * W[reg]; if (wf <= 0.001) continue; const fv = f.fn(st, tau * h); for (const [k, v2] of Object.entries(fv)) for (let i = 0; i < 3; i++) ffT[k][i] += wf * (v2[i] || 0); }
    const legSide = { hip_L: "L", knee_L: "L", ankle_L: "L", hip_R: "R", knee_R: "R", ankle_R: "R" }, tone = this.o.protect.tone;
    const cmd = JN.map((j, k) => { const reg = regionOfJoint[j.name], ls = legSide[j.name], w = W[reg], isHip = /^hip_/.test(j.name), sa = isHip && Sp.stanceHip === "world" ? Sp.stanceHipAuth : Sp.stanceAuth, stiff = Math.max(this.alpha[reg] ?? 1, tone * (1 - w)) * (ls ? 1 - this.gate[ls] * (1 - sa) * w : 1);
      const g = this.gain[k], qa = qRun[k], qn = qRun2[k], sn = qa[0] * qn[0] + qa[1] * qn[1] + qa[2] * qn[2] + qa[3] * qn[3] < 0 ? -1 : 1, dr = Q.mul(Q.conj(qa), qn.map(x => x * sn)), wRef = [2 * dr[0] / h * w, 2 * dr[1] / h * w, 2 * dr[2] / h * w];
      return [0, 1, 2].map(i => { if (!c.act.ax[k][i]) return null; const st2 = isHip && i === 0 && ls ? Math.max(this.alpha[reg] ?? 1, tone * (1 - w)) * (1 - this.gate[ls] * (1 - Sp.stanceRotAuth) * w) : stiff;
        return { K: st2 * g.K, D: st2 * g.D, tau0: st2 * (ffT[k][i] + g.K * errs[k][i] + (g.D + h * g.K) * wRef[i]) }; }); });
    // CHAIN TRANSMISSION: a supporting leg's knee and ankle also carry that leg's stance-hip PD torque (statics of the leg: the same moment on
    // every distal joint), so the hip's attitude torque reaches the foot and the turf instead of spinning the light leg under the heavy body
    if (Sp.chain) for (const s of ["L", "R"]) { const g = this.gate[s] * W[LEG[s].region]; if (g <= 0.001) continue; const kh = LEG[s].hip, dh = this.jdOf[kh], Rh = Q.mul(st[dh.child].rot, dh.F2), wrel = V.sub(st[dh.child].w, st[dh.parent].w); let Th = [0, 0, 0];
      for (let i = 0; i < 3; i++) { const r = cmd[kh][i]; if (!r) continue; const ax = Q.rot(Rh, E3[i]), req = r.tau0 - (r.D + h * r.K) * V.dot(wrel, ax), cap = this.c.act.driveCap[kh][i], tq = clamp(req, -cap[1], cap[0]); Th = V.add(Th, V.sc(ax, tq)); }
      for (const jn of ["knee", "ankle"]) { const k = LEG[s][jn], d0 = this.jdOf[k], R2F2 = Q.mul(st[d0.child].rot, d0.F2); for (let i = 0; i < 3; i++) { if (!cmd[k][i]) continue; cmd[k][i].tau0 += g * V.dot(Th, Q.rot(R2F2, E3[i])); } } }
    this.perf.track += now() - T3;
    // ── SUPPORT: the intended ground reaction through the stance leg's joints (no external wrench) ──
    const T4 = now(), wsum = this.gate.L + this.gate.R, Fout = [], supM = []; this.pairs = []; this.legPairs = [];
    if (Sp.mode === "pair") { if (wLoc > 0.001) this._pairSupport(st, com, v, feet, tau, wLoc, uf, row, Fout); }
    else if (wsum > 0 && wLoc > 0.001) {
      // vertical: RUN-1's support profile aligned to each foot's PHYSICAL stance phase (RUN-1's own stance of that foot, from its physical
      // touchdown); past RUN-1's stance length (a prolonged stance after a disturbance) it holds RUN-1's mean stance height with no feed-forward
      const fyOf = (s) => { if (Sp.vlaw === "warp" && this.hs[s] && this.stIv[s]) { const H0 = this.hs[s], iv = this.stIv[s], el = n - this.tdPhys[s], len = iv[1] - iv[0], rem = Math.max(Sp.warpMinS / h, iv[1] - this.tdPhys[s]), wp = len / rem;
          // RUN-1's stance profile TIME-WARPED onto [physical touchdown, RUN-1's own toe-off] (RUN-1's clock lifts the leg at its toe-off, so the
          // push-off must be complete by then): k(t) = iv0 + el·w, z = z_land + Δz_RUN1(k), v = v_RUN1(k)·w, a = a_RUN1(k)·w²; past it: hold
          if (el * wp > len) return M * (G + Sp.Ky * (H0.zMid - com[1]) + Sp.Dy * (0 - v[1]));
          const kf = iv[0] + el * wp, k = Math.round(kf), zRef = H0.zLand + (I.com(k)[1] - I.com(iv[0])[1]);
          return M * (G + I.comAcc(k)[1] * wp * wp + Sp.Ky * (zRef - com[1]) + Sp.Dy * (I.comVel(k)[1] * wp - v[1]) + Sp.KyS * (H0.zMid - com[1])); }
        if (Sp.vlaw === "shape" && this.hs[s] && this.stIv[s]) { const H0 = this.hs[s], iv = this.stIv[s], el = n - this.tdPhys[s], len = iv[1] - iv[0], k = iv[0] + Math.min(el, len);
          // RUN-1's stance profile from ITS touchdown, started at the PHYSICAL touchdown and offset to the physical touchdown height; a slow pull
          // (KyS) toward RUN-1's own mid-stance height; past RUN-1's stance length: hold
          if (el > len) return M * (G + Sp.Ky * (H0.zMid - com[1]) + Sp.Dy * (0 - v[1]));
          const zRef = H0.zLand + (I.com(k)[1] - I.com(iv[0])[1]);
          return M * (G + I.comAcc(k)[1] + Sp.Ky * (zRef - com[1]) + Sp.Dy * (I.comVel(k)[1] - v[1]) + Sp.KyS * (H0.zMid - com[1])); }
        if (Sp.vlaw === "halfsine" && this.hs[s]) { const H0 = this.hs[s], el = (n - this.tdPhys[s]) * h;
          if (el < H0.Tst) return Math.max(0, H0.Fpk) * Math.sin(Math.PI * Math.max(el, 0.5 * h) / H0.Tst) + M * Sp.KyS * (H0.zMid - com[1]);
          return M * (G + Sp.Ky * (H0.zMid - com[1]) + Sp.Dy * (0 - v[1])); }
        const iv = Sp.align ? this.stIv[s] : null; if (!iv) return M * (G + aI[1] + Sp.Ky * (comI[1] - com[1]) + Sp.Dy * (vI[1] - v[1]));
        const el = n - this.tdPhys[s], len = iv[1] - iv[0], k = iv[0] + Math.min(el, len), over = el > len, cA = I.com(k), vA = I.comVel(k), aA = I.comAcc(k), zMid = I.com(Math.round((iv[0] + iv[1]) / 2))[1];
        return over ? M * (G + Sp.Ky * (zMid - com[1]) + Sp.Dy * (0 - v[1])) : M * (G + aA[1] + Sp.Ky * (cA[1] - com[1]) + Sp.Dy * (vA[1] - v[1])); };
      // attitude moment (pitch / roll toward RUN-1's pelvis orientation) and yaw
      const Mrot = V.add(V.sc(rotvec(pelI.R, pel.rot), Sp.att.Kp), V.sc(V.sub(pelI.w, pel.w), Sp.att.Kd)), Mh = [Mrot[0], 0, Mrot[2]], mh = Math.hypot(Mh[0], Mh[2]), MhC = mh > Sp.att.maxNm ? V.sc(Mh, Sp.att.maxNm / mh) : Mh;
      for (const s of ["L", "R"]) { const share = this.gate[s] / Math.max(1, wsum); if (share <= 0) continue; const Fy = Math.max(0, fyOf(s)), p = feet[s].p, d = V.sub(p, com), dd = V.dot(d, d), u = V.sc(d, -1 / Math.sqrt(dd));
        const hipP = jointAt(st, JN[LEG[s].hip]), ulg = V.norm(V.sub(hipP, p)), uu = Sp.mode === "vleg" ? ulg : u;
        const Fc = V.sc(uu, Fy / Math.max(Sp.minUy, uu[1])), Ft = Sp.ftOn && Sp.mode !== "vleg" ? V.sc(V.cross(MhC, d), 1 / dd) : [0, 0, 0], Fv = Sp.mode === "vleg" ? [0, 0, 0] : V.sc(uf, M * Sp.kvT * V.dot(hz(V.sub(vI, v)), uf));
        let F = V.sc(V.add(V.add(Fc, Ft), Fv), share * wLoc); if (F[1] < 0) F[1] = 0; const fh = Math.hypot(F[0], F[2]), cone = Sp.mu * F[1]; if (fh > cone && fh > 0) { F[0] *= cone / fh; F[2] *= cone / fh; }
        const fm = V.len(F), Fmax = Sp.FmaxBW * M * G * share; if (fm > Fmax) F = V.sc(F, Fmax / fm);
        const yawMax = Sp.mu * F[1] * Sp.att.footR, My = clamp(Sp.att.yawKp * rotvec(pelI.R, pel.rot)[1] + Sp.att.yawKd * (pelI.w[1] - pel.w[1]), -yawMax, yawMax);
        // SIMBICON stance-hip compensation: the previous step's actual torques of the free hip and the lumbar (on their children) react on the
        // pelvis; the stance chain supplies the opposite to the pelvis and passes it down to the foot (the turf takes it, within the foot's limits)
        const tComp = Sp.comp ? V.sc(this._prevTorque(c, [LEG[OTHER[s]].hip, ji("lumbar")].filter(k => k !== LEG[OTHER[s]].hip || this.gate[OTHER[s]] < 0.5)), share * wLoc) : [0, 0, 0];
        if (Sp.mode === "vleg") { this.legPairs.push({ foot: LEG[s].foot, p, hip: hipP, F }); if (My) this.pairs.push({ foot: LEG[s].foot, M: [0, My, 0] }); }
        else for (const jn of ["hip", "knee", "ankle"]) { const k = LEG[s][jn], cj = jointAt(st, JN[k]), tauC = V.sub(V.sub(V.sc(V.cross(V.sub(p, cj), F), -1), [0, My, 0]), tComp), d0 = this.jdOf[k], R2F2 = Q.mul(st[d0.child].rot, d0.F2);
          for (let i = 0; i < 3; i++) { if (!cmd[k][i]) continue; cmd[k][i].tau0 += V.dot(tauC, Q.rot(R2F2, E3[i])); } }
        Fout.push([s, ...F.map(x => Math.round(x)), Math.round(My)]);
        // SUPPORT MOMENT (ground-limited stiff-leg transmission): +M on the pelvis, −M on this stance foot — an internal pair (no net torque on
        // the athlete); the turf must hold the foot against −M. Bounded by what a loaded foot can transmit: pitch ≤ F_y·lFoot (CoP travel),
        // roll ≤ F_y·wFoot, yaw ≤ μ·F_y·rFoot (torsional friction). Zero in flight.
        if (Sp.supM.on) { const sm = Sp.supM, Ms = V.add(V.sc(rotvec(pelI.R, pel.rot), sm.Kp), V.sc(V.sub(pelI.w, pel.w), sm.Kd)), Mp = clamp(V.dot(Ms, ul), -F[1] * sm.lFoot, F[1] * sm.lFoot), Mr = clamp(V.dot(Ms, uf), -F[1] * sm.wFoot, F[1] * sm.wFoot), Myw = clamp(sm.yawKp * rotvec(pelI.R, pel.rot)[1] + sm.yawKd * (pelI.w[1] - pel.w[1]), -Sp.mu * F[1] * sm.rFoot, Sp.mu * F[1] * sm.rFoot);
          const Msup = V.add(V.add(V.sc(ul, Mp), V.sc(uf, Mr)), [0, Myw, 0]); this.pairs.push({ foot: LEG[s].foot, M: Msup }); supM.push([s, Math.round(Mp), Math.round(Mr), Math.round(Myw)]); } }
      row.M = [Math.round(MhC[0]), Math.round(Mrot[1]), Math.round(MhC[2])]; }
    // INTENT-CONSISTENCY MOMENT (ICM; development device, OFF unless opts.icm.on): an EXTERNAL pelvis moment toward RUN-1's pelvis orientation,
    // capped, optionally stance-only, and scaled by the locomotion weight w_loc, so it vanishes as soon as RUN stops being viable. It exists
    // only to measure how much non-physical moment RUN-1 needs; it is logged every step and reported (HAC1_LOG §2).
    this.icm = null; if (this.o.icm.on && wLoc > 0.001) { const ic = this.o.icm, gS = Math.min(1, this.gate.L + this.gate.R), k = ic.stanceOnly ? gS : 1;
      if (k > 0.001) { const Mi = V.add(V.sc(rotvec(pelI.R, pel.rot), ic.Kp), V.sc(V.sub(pelI.w, pel.w), ic.Kd)), mh = Math.hypot(Mi[0], Mi[2]), fh = mh > ic.capPR ? ic.capPR / mh : 1;
        this.icm = V.sc([Mi[0] * fh, clamp(Mi[1], -ic.capYaw, ic.capYaw), Mi[2] * fh], k * wLoc); row.icm = this.icm.map(x => Math.round(x)); } }
    this.perf.support += now() - T4; row.supM = supM;
    // ── log ──
    row.V = { integ: +VBm.integ.toFixed(3), place: +VBm.place.toFixed(3), height: +VBm.height.toFixed(3), org: +VBm.org.toFixed(3), inst: +Vi.toFixed(3), f: +this.Vf.toFixed(3), C: +this.C.toFixed(3), wLoc: +wLoc.toFixed(3), drop: +VBm.drop.toFixed(3), tiltPred: +VBm.tiltPred.toFixed(1) };
    row.cand = cand ? { s: cand.s, qs: cand.qs.map(x => +x.toFixed(2)), tRem: +cand.tRem.toFixed(3), phi: +cand.phi.toFixed(2), em: cand.emergency ? 1 : 0, q: +cand.q.toFixed(2), dFlex: +cand.dFlex.toFixed(1), dAbd: +cand.dAbd.toFixed(1), cross: +cand.cross.toFixed(3), pDes: cand.pDes.map(x => +x.toFixed(3)), pNom: cand.pNom.map(x => +x.toFixed(3)), nTd: cand.nTd } : null;
    row.off = { L: [+this.off.L.flex.toFixed(1), +this.off.L.abd.toFixed(1)], R: [+this.off.R.flex.toFixed(1), +this.off.R.abd.toFixed(1)] };
    { const rv = rotvec(pelI.R, pel.rot); row.pe = [V.dot(rv, ul), V.dot(rv, uf), rv[1]].map(x => +(x / D2R).toFixed(1)); }   // pelvis error to RUN-1 (deg): about the left axis (pitch), forward axis (roll), vertical (yaw)
    row.lo = { L: +feet.L.lo.toFixed(3), R: +feet.R.lo.toFixed(3) }; row.ej = Object.fromEntries(["hip_L", "knee_L", "ankle_L", "hip_R", "knee_R", "ankle_R"].map(jn => [jn, errs[ji(jn)].map(x => +(x / D2R).toFixed(1))])); row.stI = (stanceI.L ? "L" : "") + (stanceI.R ? "R" : "");
    row.sup = { L: +this.gate.L.toFixed(2), R: +this.gate.R.toFixed(2), NL: Math.round(feet.L.N), NR: Math.round(feet.R.N), iL: +feet.L.integ.toFixed(2), iR: +feet.R.integ.toFixed(2), slL: +feet.L.slide.toFixed(2), slR: +feet.R.slide.toFixed(2), dL: +feet.L.disp.toFixed(3), dR: +feet.R.disp.toFixed(3) }; row.F = Fout;
    row.v = v.map(x => +x.toFixed(3)); row.vd = vI.map(x => +x.toFixed(3)); row.com = com.map(x => +x.toFixed(4)); row.comd = comI.map(x => +x.toFixed(4)); row.tilt = +tilt.toFixed(1); row.tiltT = +tiltT.toFixed(1);
    // ── PHASE RESYNCHRONISATION (HYBRID-RUN-1's rule, now on): RUN-1's clock follows the body's physical touchdowns. A foot that lands (load >
    //    loadN) 40 ms … 0.15 s before RUN-1's touchdown of it advances the clock toward that touchdown (≤ rMax frames per step); a foot still
    //    above the turf when RUN-1's stance of it begins holds the clock (rate rLate) for at most holdS. RUN-1 is re-timed, never edited.
    const PH = this.o.phase; let rate = 1;
    if (PH.on && n > 0) { for (const s2 of ["L", "R"]) { const f = feet[s2], touching = f.N > PH.loadN, rising = touching && !this.physTouch[s2], inSt = I.stances[s2].find(([a0, b0]) => tau >= a0 && tau <= b0), next = I.stances[s2].find(([a0]) => a0 > tau);
        if (rising && !inSt && next && next[0] - tau <= PH.windowS / h && next[0] - tau > PH.minEarlyS / h) { this.catchUp = { s: s2, target: next[0] }; row.ph = "early " + s2; }
        if (!touching && f.lo > PH.lateClearM && inSt && tau - inSt[0] <= 2 && this.hold < PH.holdS / h) { rate = Math.min(rate, PH.rLate); this.hold++; row.ph = "late " + s2; }
        if (touching) this.hold = 0; this.physTouch[s2] = touching; }
      if (this.catchUp) { const d = this.catchUp.target - tau; if (d <= 0.5) this.catchUp = null; else rate = Math.max(rate, Math.min(PH.rMax, 1 + d / PH.kCatch)); } }
    if (PH.on) { this.tau = tau + rate; row.tau = +tau.toFixed(2); row.rate = +rate.toFixed(2); }
    this.perf.total += now() - T0; this.perf.n++;
    this.log.push(row); this.last = row; return { cmd }; }
  // PAIR MODE = HYBRID-RUN-1's gait support and balance moment (hr_runner.mjs §2, same law and parameters), every term × w_loc: the support
  // pair (−F at the stance foot, +F over the other bodies by mass: its linear momentum comes through the turf, its angular effect is the
  // virtual pivot at the COM) and the pelvis moment (supported part ≤ lever·F_y; animation-consistency part ≤ acPR / acYaw). Both are logged.
  _pairSupport(st, com, v, feet, tau, wLoc, ufI, row, Fout) { const I = this.I, Sp = this.o.support, PS = Sp.pairP, h = this.h, pel = st[0];
    const cs = I.com(tau), vs = I.comVel(tau), as = I.comAcc(tau), up = Q.rot(pel.rot, [0, 1, 0]), tilt = Math.acos(clamp(up[1], -1, 1)) / D2R, sOrg = smooth(1 - (tilt - PS.tilt0) / (PS.tilt1 - PS.tilt0));
    const vh = Math.hypot(vs[0], vs[2]), uf = vh > 0.3 ? [vs[0] / vh, 0, vs[2] / vh] : [0, 0, 0], ul = [uf[2], 0, -uf[0]], dv = [vs[0] - v[0], 0, vs[2] - v[2]], ah = V.add(V.sc(uf, PS.KvFwd * V.dot(dv, uf)), V.sc(ul, PS.Kv * V.dot(dv, ul)));
    let Fd = [M * (as[0] + ah[0]), M * (G + as[1] + PS.Ky * (cs[1] - com[1]) + PS.Dy * (vs[1] - v[1])), M * (as[2] + ah[2])];
    const muU = Sp.muUse ?? Sp.mu;   // the controller's own friction budget (below the turf's): it must not make its own stance foot slip
    if (Fd[1] < 0) Fd[1] = 0; const fh = Math.hypot(Fd[0], Fd[2]), cone = muU * Fd[1]; if (fh > cone && fh > 0) { Fd[0] *= cone / fh; Fd[2] *= cone / fh; } const fm = V.len(Fd), Fmax = Sp.FmaxBW * M * G; if (fm > Fmax) Fd = V.sc(Fd, Fmax / fm);
    const gE = this.gEff || this.gate, wsum = gE.L + gE.R, out = []; let Fy = 0;
    this.xL = this.xL || { L: [0, 0, 0], R: [0, 0, 0] }; const prevF = this.pairF || {};
    for (const s of ["L", "R"]) { const pf = prevF[s], ft = feet[s].Fh; const x = pf && ft ? [pf[0] - ft[0], 0, pf[2] - ft[2]] : [0, 0, 0], a = 1 - Math.exp(-h / PS.grfTauS); this.xL[s] = this.xL[s].map((y, i) => y + (x[i] - y) * a); if (!pf) this.xL[s] = [0, 0, 0]; }
    const sup = {}; for (const s of ["L", "R"]) { const d = V.sub(com, feet[s].p), dl = V.len(d), lean = Math.acos(clamp(d[1] / Math.max(1e-9, dl), -1, 1)) / D2R; sup[s] = { lean, sLean: smooth(1 - (lean - PS.lean0) / (PS.lean1 - PS.lean0)) * (dl <= PS.reachM ? 1 : 0) }; }
    this.pairF = {};
    // vertical: per foot, RUN-1's stance profile aligned to that foot's PHYSICAL touchdown (height change, velocity, acceleration; hold past
    // RUN-1's stance length), so an early or late stance still supports the athlete; horizontal: HYBRID-RUN-1's law
    const fyAl = (s) => { const H0 = this.hs[s], iv = this.stIv[s], n = Math.round(tau); if (!PS.alignY || !H0 || !iv || Math.abs(this.tdPhys[s] - iv[0]) * h <= PS.alignTolS) return null; const el = n - this.tdPhys[s], len = iv[1] - iv[0];
      if (el > len) return M * (G + PS.Ky * (H0.zMid - com[1]) + PS.Dy * (0 - v[1]));
      const k = iv[0] + el, zRef = H0.zLand + (I.com(k)[1] - I.com(iv[0])[1]); return M * (G + I.comAcc(k)[1] + PS.Ky * (zRef - com[1]) + PS.Dy * (I.comVel(k)[1] - v[1]) + PS.KyS * (H0.zMid - com[1])); };
    if (wsum > 0) for (const s of ["L", "R"]) { const u = gE[s] / Math.max(1, wsum) * sup[s].sLean * sOrg * wLoc; if (u <= 0) continue; let F = V.sc(Fd, u); const fyA = fyAl(s);
      if (fyA != null) { F[1] = Math.max(0, fyA) * u; const fhh = Math.hypot(F[0], F[2]), cc = muU * F[1]; if (fhh > cc && fhh > 0) { F[0] *= cc / fhh; F[2] *= cc / fhh; } }
      // LOADED-LEG FLOOR: a foot truly carrying load while the body descends onto it (an early or off-schedule stance) supports at least
      // floorBW of body weight: a loaded leg resists compression; it does not go limp because RUN-1's clock says "flight"
      if (PS.floorBW > 0 && feet[s].N > PS.floorLoadBW * M * G && v[1] < 0) { const fl = PS.floorBW * M * G * u; if (F[1] < fl) F[1] = fl; } if (PS.grfBeta) { F = V.add(F, V.sc(this.xL[s], PS.grfBeta * wLoc)); const fh2 = Math.hypot(F[0], F[2]), cone2 = muU * F[1]; if (fh2 > cone2 && fh2 > 0) { F[0] *= cone2 / fh2; F[2] *= cone2 / fh2; } }
      out.push({ side: s, foot: bi("foot_" + s), p: feet[s].p, F }); this.pairF[s] = F; Fy += F[1]; Fout.push([s, ...F.map(x => Math.round(x))]); }
    const pd = I.pelvis(tau), T = V.add(V.sc(rotvec(pd.R, pel.rot), PS.Ko), V.sc(V.sub(pd.w, pel.w), PS.Do)), clampHY = (x, lh, ly) => { const th = Math.hypot(x[0], x[2]), f = th > lh ? lh / th : 1; return [x[0] * f, clamp(x[1], -ly, ly), x[2] * f]; };
    const Tsup = Fy > 0 ? clampHY(T, PS.lever * Fy, PS.leverYaw * Fy) : [0, 0, 0], Tac = V.sc(clampHY(V.sub(T, Tsup), PS.acPR, PS.acYaw), (this.alpha.trunk ?? 1) * wLoc);
    this.pairOut = { pair: out, T: V.add(Tsup, Tac) }; row.Tsup = Tsup.map(x => Math.round(x)); row.Tac = Tac.map(x => Math.round(x)); row.leans = { L: +sup.L.lean.toFixed(1), R: +sup.R.lean.toFixed(1), org: +sOrg.toFixed(2) }; }
  // the actual torque (world vector, on the child) of joints ks during the previous step: actuator readback × the plan's axes
  _prevTorque(c, ks) { let T = [0, 0, 0]; const plan = c.aplan, res = c.actRes || []; if (!plan) return T; const byK = {}; for (const p of plan.joints) byK[p.k] = p;
    for (const r of res) if (ks.includes(r.k) && byK[r.k]) T = V.add(T, V.sc(byK[r.k].axW[r.i], r.tau)); return T; }
  // the support-moment pairs (internal: +M on the pelvis, −M on the stance foot); nothing else is ever applied
  applyForces(plant) { const c = this.c, w = plant.w, J = plant.J, t = w._t;
    if (this.o.support.mode === "pair" && this.pairOut) { const nb = c.nb, f = this.pairOut;
      for (const x of f.pair) { let Mr = 0; for (let i = 0; i < nb; i++) if (i !== x.foot) Mr += B[i].mass; for (let i = 0; i < nb; i++) { if (i === x.foot) continue; w.addForceAt(c.bOff + i, V.sc(x.F, B[i].mass / Mr), c.st[i].com); } w.addForceAt(c.bOff + x.foot, V.sc(x.F, -1), x.p); }
      if (V.len(f.T) > 0) { t.v.Set(f.T[0], f.T[1], f.T[2]); w.bi.AddTorque(w.bodies[c.bOff].GetID(), t.v, J.EActivation_Activate); } this.pairOut = null; }
    if (this.icm) { t.v.Set(this.icm[0], this.icm[1], this.icm[2]); w.bi.AddTorque(w.bodies[c.bOff].GetID(), t.v, J.EActivation_Activate); }
    // virtual-leg pairs: +F on the pelvis at the hip joint, −F on the foot at its contact point — same line of action (internal, central)
    for (const lp of this.legPairs || []) { w.addForceAt(c.bOff, lp.F, lp.hip); w.addForceAt(c.bOff + lp.foot, V.sc(lp.F, -1), lp.p); }
    if (!this.pairs || !this.pairs.length) return;
    for (const pr of this.pairs) { t.v.Set(pr.M[0], pr.M[1], pr.M[2]); w.bi.AddTorque(w.bodies[c.bOff].GetID(), t.v, J.EActivation_Activate); t.v.Set(-pr.M[0], -pr.M[1], -pr.M[2]); w.bi.AddTorque(w.bodies[c.bOff + pr.foot].GetID(), t.v, J.EActivation_Activate); } }          // nothing: HAC-1 applies no external force or torque
  after() {}
  info() { return this.last || null; }
  meta() { return { law: "HAC-1 HacRunner", version: this.o.version, opts: this.o, gains: this.gain.map(g => ({ K: +g.K.toFixed(1), D: +g.D.toFixed(2), I: +g.I.toFixed(4) })), perf: this.perf }; }
}

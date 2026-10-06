// ═══ physchar2/ctrl/v2_footstep.js — E2 ONE-STEP PLANNER (e2/E2_DESIGN_v2.md §2, §5; used only by the default-off E2 option `e2`) ═══════════════════════
// ONE planner for commanded and recovery steps. Planning primitive: (foothold, swing duration / touchdown, acceptance ramp T_r, DCM reference plan). Outcome:
//   CERTIFIED_ONE_STEP { foothold, T, T_r, slack, plan inputs, certificates }  or  NO_CERTIFIED_ONE_STEP { why } — never clamped and called feasible.
// Feasible set = TIMED SAFE CAPTURE ∩ BODY-CERTIFIED REACH ∩ VALID LANDING GEOMETRY:
//   • timed capture (IHMC one-step capture with the Touchline timing chain): a candidate is a member iff the forward prediction of the measured DCM under the
//     IMPLEMENTED E2 law — the plan's ξ_ref tracked by the existing law p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω, the CoP clamped to the controller's realisable region
//     (ctrl/v2_dcm.js realisable: zero landed-foot authority before LOAD_ACCEPT, then growth with s and the share caps) — stays captured, with the MEASURED margins
//     (e2/research/E2_TIMING_LOAD_ASSUMPTIONS.md §3: CoP-realisation shortfall per phase, realised-load lag, landing uncertainty base + servo-bandwidth term,
//     timing margin 0.04 s before contact) and the plan's VRP inside the margin-shrunk realisable region (the E2-17 predicate). Horizon: contact (+ margin) →
//     debounce → lag → ramp → 2.5 s. Robustness slack = the largest extra touchdown delay still captured (bisection).
//   • reach: the Touchline leg IK (bounded, soft-limit box — the E1a-10 convention) after analytic rejection; a node is in the certified reach only if it is a corner of
//     a 1-cm cell whose 4 corners AND centre are FEASIBLE and valid (no convex hull of samples) — the offline certification rule (research/E2_REACH_AND_SNAPSHOTS.md
//     §1), evaluated online from the measured state; then the final foothold and its full swing path (11 samples of the planned trajectory) are re-certified.
//   • landing geometry: no overlap with the stance foot, gap ≥ 10 mm, no crossover (centroid at least half a foot width outward of the stance foot).
// Priorities (same machinery): commanded — the nominal foothold whenever feasible, else the feasible corridor node nearest to it (IHMC projection toward the
// nominal); T = the seed (≥ the tracking-bound minimum); T_r = the LONGEST certifying ramp (the T-A rule). Recovery — maximise the slack over footholds, swing
// durations T ∈ [T_min(d), 0.60] and ramps; the best five are path-certified in order. Pure arithmetic + the controller's IK: deterministic, browser = Node.
import { V, Q } from "../core/v2_math.js";
import { clampPoly, polyDist, IK, _eigMinSym } from "./v2_stand.js";
import { stepSegment, stepAt, qexp } from "./v2_swing.js";
import { realisable, inset, cmdPlan, dsPlan, recPlan, clonePlan, dcmTick, centroid2, smooth01 } from "./v2_dcm.js";
import { TA } from "./v2_capture.js";

export const PLAN_MARGINS = { copSS: 0.0023, copRamp: 0.0152, copFull: 0.0040, shareLag: 0.008, landBase: 0.00164 };   // measured (E2_TIMING_LOAD_ASSUMPTIONS.md §3)
export const FS = {
  gapMin: 0.010, h: 0.01,                                    // landing gap (m); reach grid / cell size (m)
  corridor: { forward: { dx: [0.07, 0.13], dy: [-0.02, 0.02] }, lateral: { dx: [-0.02, 0.02], dy: [0.05, 0.11] }, recovery: { dx: [-0.03, 0.03], dy: [0, 0.20] } },   // research/E2_REACH_AND_SNAPSHOTS.md §1
  TrGrid: [0.225, 0.2, 0.175, 0.15, 0.125, 0.10],            // T-A ramp range [TrMin, TrMax] on the planning-audit grid
  Tstep: 0.01, TmaxRec: 0.60, trackEps: 0.010,               // recovery swing-time grid; T_min(d) = max(TputMin, √(5.77 d / (ωn² ε)))
  gate: 0.6, lateHold: 0.3,                                  // IHMC minimum swing fraction for accepting a touchdown; late-contact hold (s)
  slackMax: 0.5, slackIt: 10,                                // slack bisection range (s) and iterations (0.5 ms)
  TdsCmd: 4.0, TdsRec: 0.6,                                  // final double-support transition: commanded = E1b's validated 4 s return; recovery = the supervisor's abortDur
  nPath: 11, topPath: 5, vrpTol: 0.005, vrpDwell: 0.020,     // path samples; path-certified candidates (recovery); E2-17 predicate (5 mm for > 20 ms)
  clearWin: [0.2, 0.8], clearMin: 0.005,                     // commanded-step clearance certificate = the planning counterpart of E2-3 (swept boot geometry − tracking envelope ≥ 5 mm, φ ∈ [0.2, 0.8])
  // B1 (option e2: 2; e2/E2_PREREG_AMENDMENT_A1B1.md): the vertical liftoff phase = the validated E1b lift reference (20 mm min-jerk over 0.6 s) and its measured AIRBORNE
  // delay, maximum over the 8 bodies (research/E2_TIMING_LOAD_ASSUMPTIONS.md §2: 167–171 ms) — the planning value of the "remaining liftoff delay"
  lift: { h: 0.020, T: 0.6 }, liftDelayPlan: 0.171,
  // D1 (PSTAR5C, swingAccFF): tracked-clearance allowance per swing phase (rise φ < 0.4, apex ≤ 0.6, descent) = the worst downward deviation of the actual lowest boot
  // point from the reference pose's, over the REPRESENTATIVE segments of the independent servo validation (e2/SWING_SERVO_VALIDATION_PREREG.md §4). null = not yet derived.
  // SV-2 form (e2/SWING_SERVO_VALIDATION_V2_PREREG.md §6): { servo: {options}, bins: { phi0, width, mm[] }, source } — set only from a battery that validated
  clearAllow: null,
};
// the B1 lift reference at τ s after the step command: anchor + h·minjerk(τ/T), vertical only → { p, v, a } (plain arithmetic)
export function liftRef(A, tau) { const T = FS.lift.T, u = Math.min(1, Math.max(0, tau / T)), h = FS.lift.h, mov = tau > 0 && tau < T;
  return { p: [A.pos[0], A.pos[1] + h * u * u * u * (10 - 15 * u + 6 * u * u), A.pos[2]], v: [0, mov ? h * 30 * u * u * (1 - u) * (1 - u) / T : 0, 0], a: [0, mov ? h * (60 * u - 180 * u * u + 120 * u * u * u) / (T * T) : 0, 0] }; }
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
// the controller's lateral axis (from its heading) oriented toward the landed foot n — the axis of the validated capture model (ctrl/v2_capture.js captureContext)
export function latU(info, n) { const hd = info.heading, cS = centroid2(info.polys[1 - n]), cL = centroid2(info.polys[n]); let u = [hd[1], -hd[0]]; if ((cL[0] - cS[0]) * u[0] + (cL[1] - cS[1]) * u[1] < 0) u = [-u[0], -u[1]]; return u; }
// heading-aligned frame of the stance foot: forward f, lateral-outward (toward the swing side) o — horizontal unit vectors (as tools/e2_plan_lib.mjs)
export function stepFrame(ctrl, st, n) { const m = 1 - n, fw = Q.rot(st[ctrl.feet[m]].rot, [0, 0, 1]), l = Math.sqrt(fw[0] * fw[0] + fw[2] * fw[2]), f = [fw[0] / l, 0, fw[2] / l], right = [f[2], 0, -f[0]], o = n === 0 ? V.sc(right, -1) : right; return { f, o }; }
export const candPose = (A, fr, dx, dy, dz = 0) => ({ pos: [A.pos[0] + fr.f[0] * dx + fr.o[0] * dy, A.pos[1] + dz, A.pos[2] + fr.f[2] * dx + fr.o[2] * dy], rot: A.rot.slice() });
export function footprintAt(ctrl, n, pose) { const s = ctrl.sole[n]; return s.poly.map(([x, z]) => { const p = V.add(pose.pos, Q.rot(pose.rot, [x, s.y0, z])); return [p[0], p[2]]; }); }
function polysIntersect(A, B) { const axes = []; for (const P of [A, B]) for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; axes.push([-(b[1] - a[1]), b[0] - a[0]]); }
  for (const ax of axes) { let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; for (const p of A) { const v = p[0] * ax[0] + p[1] * ax[1]; a0 = Math.min(a0, v); a1 = Math.max(a1, v); } for (const p of B) { const v = p[0] * ax[0] + p[1] * ax[1]; b0 = Math.min(b0, v); b1 = Math.max(b1, v); } if (a1 < b0 || b1 < a0) return false; } return true; }
function polyGap(A, B) { let g = Infinity; for (const [P, R] of [[A, B], [B, A]]) for (const p of P) for (let i = 0; i < R.length; i++) { const a = R[i], b = R[(i + 1) % R.length], ex = b[0] - a[0], ez = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / (ex * ex + ez * ez))); g = Math.min(g, Math.sqrt((p[0] - a[0] - t * ex) ** 2 + (p[1] - a[1] - t * ez) ** 2)); } return g; }
export function landingValid(ctrl, st, n, pose, fr) { const m = 1 - n, S = ctrl.footPoly(st, m), Lp = footprintAt(ctrl, n, pose), cS = st[ctrl.feet[m]].pos, side = (pose.pos[0] - cS[0]) * fr.o[0] + (pose.pos[2] - cS[2]) * fr.o[2];
  const xs = ctrl.sole[n].poly.map(p => p[0]), halfW = (Math.max(...xs) - Math.min(...xs)) / 2;
  if (polysIntersect(S, Lp)) return { ok: false, why: "overlaps the stance foot" }; const gap = polyGap(S, Lp); if (gap < FS.gapMin) return { ok: false, why: `gap ${(gap * 1000).toFixed(1)} mm`, gap };
  if (side < halfW) return { ok: false, why: "crossover", side }; return { ok: true, gap, side }; }
// kinematic feasibility of one foot pose for leg n from pelvis frame pel: analytic rejection, then the bounded IK in the soft-limit box (FEASIBLE iff reached)
export function ikFeasible(ctrl, st, ev, n, pel, pose) { const ks = ctrl.legK[n], hip = V.add(pel.pos, Q.rot(pel.rot, ctrl.anchor[ks[0]])), L1 = V.len(ctrl.anchor[ks[1]]), L2 = V.len(ctrl.anchor[ks[2]]);
  if (V.dist(hip, pose.pos) > L1 + L2 + 0.12) return false; ctrl._e2plan = (ctrl._e2plan || 0) + 1; try { return ctrl.legIKBounded(st, ev, n, pel.pos, pel.rot, pose, { limits: "soft", fallback: "none" }).err <= 1e-6; } finally { ctrl._e2plan--; } }   // _e2plan: harness IK captures skip planner queries
// the swing leg's pelvis frame exactly as the controller uses it for a non-supporting leg (actual pose; height min(target, actual) in contact → actual airborne)
export function swingFrame(ctrl, st, n) { const ps = st[ctrl.pelvis], a = ctrl.lc.feet[n].a, pelH = ctrl.info && ctrl.info.pelH != null ? ctrl.info.pelH : ps.pos[1], hC = Math.min(pelH, ps.pos[1]);
  return { pos: [ps.pos[0], hC + a * (ps.pos[1] - hC), ps.pos[2]], rot: ps.rot.slice() }; }
// reach grid over a corridor (offsets from the anchor in the stance frame): node FEASIBLE ∧ valid; cell = 4 corners + centre; certified nodes = corners of a cell
export function reachGrid(X, cor) { const { ctrl, st, ev, n, A, fr, pel, dz } = X, h = FS.h, rng = (a, b) => { const o = []; for (let i = 0; a + i * h <= b + 1e-9; i++) o.push(+(a + i * h).toFixed(4)); return o; };
  const dxs = rng(cor.dx[0], cor.dx[1]), dys = rng(cor.dy[0], cor.dy[1]), node = new Map(), key = (dx, dy) => `${dx.toFixed(4)},${dy.toFixed(4)}`;
  const test = (dx, dy) => { const k = key(dx, dy); if (node.has(k)) return node.get(k).ok; const pose = candPose(A, fr, dx, dy, dz), geo = landingValid(ctrl, st, n, pose, fr), ok = geo.ok && ikFeasible(ctrl, st, ev, n, pel, pose); node.set(k, { dx, dy, ok, geo: geo.ok ? "ok" : geo.why }); return ok; };
  const cert = new Set(); for (const dx of dxs) for (const dy of dys) test(dx, dy);
  for (let i = 0; i < dxs.length - 1; i++) for (let j = 0; j < dys.length - 1; j++) { const x0 = dxs[i], y0 = dys[j], x1 = dxs[i + 1], y1 = dys[j + 1];
    if (test(x0, y0) && test(x1, y0) && test(x0, y1) && test(x1, y1) && test(+((x0 + x1) / 2).toFixed(4), +((y0 + y1) / 2).toFixed(4))) for (const [a, b] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) cert.add(key(a, b)); }
  return { dxs, dys, nodes: [...node.values()], certified: (dx, dy) => cert.has(key(dx, dy)), nCert: cert.size }; }
export const Tmin = (d, wn) => Math.max(TA.TputMin, Math.sqrt(5.77 * d / (wn * wn * FS.trackEps)));
export const eLandOf = (d, T, wn) => PLAN_MARGINS.landBase + 5.77 * d / (wn * wn * T * T);
// ── timed capture prediction of one candidate under the implemented law ──
// X: { info, n, mode: "commanded" | "recovery", w, dt, kXi, minShare, debounce, abortDur, xi0, p0 (commanded CoP of the previous tick), rs (commanded: stance VRP),
//      plan0 (the current execution plan to continue, or null = a fresh plan from the measured state), contactNow (already in contact: tc = 0) }
// c: { pose, L (landed region at the pose), T (remaining swing to the planned touchdown), Tr, eLand, rMid }
export function predict(X, c, delay = 0, keep = false) { const M = PLAN_MARGINS, w = X.w, dt = X.dt, m = 1 - X.n, rec = X.mode === "recovery";
  const tN = X.tNow ?? 0, Tlo = c.Tlo || 0, S = inset(X.info.polys[m], M.copSS), Lr = inset(c.L, c.eLand + M.copRamp), Lf = inset(c.L, c.eLand + M.copFull), tc = tN + (X.contactNow ? 0 : Tlo + c.T + TA.margin) + delay, tAcc = tc + X.debounce + M.shareLag;   // Tlo: remaining liftoff delay (B1)
  const horizon = tAcc + c.Tr + TA.horizon, Rfin = realisable(S, Lf, 1, X.minShare);   // all times absolute (plan0 is the execution plan, in simulation time)
  let xi = X.xi0.slice(), pPrev = X.p0.slice(), P = X.plan0 ? clonePlan(X.plan0) : rec ? recPlan({ t0: tN, xi0: xi, Tds: FS.TdsRec, u: latU(X.info, X.n) }) : cmdPlan({ t0: tN, xi0: xi, xid0: [w * (xi[0] - pPrev[0]), w * (xi[1] - pPrev[1])], rs: X.rs, tTD: tN + Tlo + c.T });
  let reinit = X.mode !== "commanded" || (P.kind === "ds"), vrpOut = 0, vrpWorst = 0, out = keep ? [] : null, early = false;
  for (let k = 0; ; k++) { const t = tN + k * dt; if (t > horizon + 1e-9) break;
    const s = t < tAcc ? 0 : smooth01((t - tAcc) / c.Tr), contacted = t >= tc - 1e-12, floor = rec ? X.minShare * (contacted ? mj((t - tc) / X.abortDur) : 0) : X.minShare;
    const R = s <= 0 ? S : realisable(S, s < 1 ? Lr : Lf, s, floor);
    if (!reinit && contacted) { P = dsPlan({ t0: t, xi0: xi, xid0: [w * (xi[0] - pPrev[0]), w * (xi[1] - pPrev[1])], Tds: FS.TdsCmd }); reinit = true; }
    const r = dcmTick(P, t, { w, dt, R, Rm: M.copFull, s, rMid: c.rMid }), dv = polyDist(R, r.vrp);
    vrpOut = dv < -FS.vrpTol ? vrpOut + dt : 0; vrpWorst = Math.min(vrpWorst, dv); if (vrpOut > FS.vrpDwell + 1e-9) return { recovers: false, vrpOk: false, t, why: "plan VRP outside the realisable region", out };
    const pRaw = [xi[0] + X.kXi * (xi[0] - r.xi[0]) - r.xid[0] / w, xi[1] + X.kXi * (xi[1] - r.xi[1]) - r.xid[1] / w], p = clampPoly(R, pRaw);
    if (keep) out.push({ t, xi: xi.slice(), xiRef: r.xi, vrp: r.vrp, p, s, ph: r.phase });
    xi = [xi[0] + dt * w * (xi[0] - p[0]), xi[1] + dt * w * (xi[1] - p[1])]; pPrev = p;
    if (polyDist(Rfin, xi) < -TA.fellBeyond) return { recovers: false, vrpOk: true, t, why: "DCM diverged beyond the support", out };
    // captured: full support, ξ inside the realisable region by ≥ 1 cm, tracking the reference within 2 mm, reference in its final transition → the rest of the plan
    // is checked geometrically (VRP vs the full-support region) to its end
    if (!keep && s >= 1 && (r.phase === "DS" || r.phase === "R3" || r.phase === "end") && polyDist(R, xi) >= 0.01 && Math.hypot(xi[0] - r.xi[0], xi[1] - r.xi[1]) <= 0.002) { early = true;
      const Pg = clonePlan(P), tEnd = P.kind === "ds" ? P.t0 + P.Tds : P.h ? P.h.t0 + P.Tds : t; let out2 = 0;
      for (let tt = t + dt; tt <= tEnd + dt; tt += dt) { const q = dcmTick(Pg, tt, { w, dt, R: Rfin, Rm: M.copFull, s: 1, rMid: c.rMid }), d2 = polyDist(Rfin, q.vrp); out2 = d2 < -FS.vrpTol ? out2 + dt : 0; vrpWorst = Math.min(vrpWorst, d2); if (out2 > FS.vrpDwell + 1e-9) return { recovers: false, vrpOk: false, t: tt, why: "plan VRP outside the realisable region", out }; }
      break; } }
  const end = early || polyDist(Rfin, xi) >= 0; return { recovers: end, vrpOk: true, vrpWorst, why: end ? null : "DCM not inside the support at the horizon", out }; }
const ok = (r) => r.recovers && r.vrpOk;
export function slackOf(X, c) { if (!ok(predict(X, c, 0))) return -1; let lo = 0, hi = FS.slackMax; if (ok(predict(X, c, hi))) return hi; for (let i = 0; i < FS.slackIt; i++) { const mid = (lo + hi) / 2; if (ok(predict(X, c, mid))) lo = mid; else hi = mid; } return lo; }
// CLEARANCE certificate (commanded steps; design §4 "certified with the swept boot geometry plus the bandwidth tracking-error envelope"; E2-3's window and threshold):
// the lowest of ALL boot hull points (toe, heel, sides) at the reference pose, sampled every physics tick for φ ∈ clearWin, minus the servo-bandwidth envelope of the
// planned trajectory e = max|p̈_ref| / ωn² (the bound behind the landing-uncertainty term), ≥ clearMin. Recovery steps carry no clearance criterion (§4 R-1 … R-6)
export function certifyClearance(X, sg) { const c = X.ctrl, f = c.spec.bodies[c.feet[X.n]], pts = f.shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(q => V.add(q, h.pos))), wn = 2 * Math.PI * c.lc.o.swingHz, dt = X.dt;
  let amax = 0; for (let t = 0; t <= sg.T + 1e-9; t += dt) { const e = stepAt(sg, t); amax = Math.max(amax, Math.sqrt(e.acc[0] * e.acc[0] + e.acc[1] * e.acc[1] + e.acc[2] * e.acc[2])); }
  // PSTAR5C: predicted TRACKED clearance = reference clearance − the validated per-phase allowance (replaces the symmetric bandwidth envelope of the servo without acceleration FF)
  const trk = !!c.o.swingAccFF; if (trk && !FS.clearAllow) throw new Error("tracked-clearance allowance not derived (servo validation)");
  // the allowance belongs to the servo configuration it was validated on (FS.clearAllow.servo: the controller options that define that servo); another servo has none
  if (trk && FS.clearAllow.servo && Object.keys(FS.clearAllow.servo).some(k => (c.o[k] ?? false) !== FS.clearAllow.servo[k])) throw new Error("tracked-clearance allowance validated for another swing-servo configuration");
  // allowance form: per phase { rise, apex, descent } (m; v1 rule), or per φ bin (SV-2, e2/SWING_SERVO_VALIDATION_V2_PREREG.md §6: bins { phi0, width, mm[] }; a sample exactly on a bin
  // boundary takes the larger of the two bins; outside the table the nearest bin)
  const allowAt = (phi) => { const A = FS.clearAllow; if (A.bins) { const B = A.bins, k = (phi - B.phi0) / B.width, i = Math.min(B.mm.length - 1, Math.max(0, Math.floor(k + 1e-9))); let v = B.mm[i];
      const r = Math.round(k); if (Math.abs(k - r) < 1e-9 && r - 1 >= 0 && r - 1 < B.mm.length) v = Math.max(v, B.mm[r - 1]); return v / 1000; } return phi < 0.4 ? A.rise : phi <= 0.6 ? A.apex : A.descent; };
  const env = amax / (wn * wn); let worst = Infinity, at = null;   // φ of segment time t: (t + phiOff) / phiDen (a re-plan's segment starts phiOff into the swing)
  for (let t = 0; t <= sg.T + 1e-9; t += dt) { const phi = (t + (X.phiOff || 0)) / (X.phiDen || sg.T); if (phi < FS.clearWin[0] - 1e-9 || phi > FS.clearWin[1] + 1e-9) continue; const e = stepAt(sg, t);
    let low = Infinity; for (const q of pts) low = Math.min(low, e.pos[1] + Q.rot(e.rot, q)[1]); const m = low - (trk ? allowAt(phi) : env); if (m < worst) { worst = m; at = phi; } }
  return { ok: worst >= FS.clearMin - 1e-12, margin: worst, at, envelope: trk ? allowAt(at ?? 0.5) : env, aMax: amax, model: trk ? "tracked (validated allowance)" : "bandwidth envelope" }; }
// path certificate: the planned trajectory sampled at FS.nPath points, each pose IK-FEASIBLE from the swing frame
// ═══ EXECUTION FEASIBILITY, analytic layer (e2/EXECUTION_FEASIBILITY.md; user decision 2026-10-06 AB2_coordinator; used by nothing by default) ═══════════════════════════
// endpoint geometry → the WHOLE swing path under the PREDICTED PELVIS-MOTION ENVELOPE → (closed-loop finite-actuator replay: tools/exec_qualify.mjs). At N samples of the swing
// (endpoint included = the final contact-compatible posture) and for the nominal swing frame plus its 12 axis extremes (± translation / ± rotation per pelvis axis, opt.envelope =
// the validated pelvis excursion over a swing):
//   • reach: bounded IK in the soft-limit box reaches the target (err ≤ 1e-6), every solved coordinate STRICTLY inside its soft limits (margin > opt.softMargin);
//   • conditioning: λmin(JᵀJ) of the free coordinates ≥ IK.srEps² — outside the region where the rate solve's singularity-robust damping engages;
//   • joint rates (nominal frame): coordinate rates between samples ≤ opt.rateMax;
//   • torque feasibility (nominal frame, opt.act = the actuator layer): gravity + the D1 inertial wrench of the leg at the planned pose and the reference's acceleration, per
//     actuated axis, ≤ the full-activation capacity at the planned anatomical angle and coordinate rate divided by (1 + ACT.U_MARGIN) — the actuator's own excitation headroom;
//   • self-collision (nominal): min distance from the swing boot's hull points to the stance boot's ≥ opt.selfDist;
//   • swept sole clearance: the reference's lowest sole point over φ ∈ [0.2, 0.8] minus the per-bin tracked deviation (opt.binDev, mm) ≥ FS.clearMin.
// GATING is on the NOMINAL predicted swing frame (reach, conditioning, rates, torque, self-collision, clearance — the final contact posture is the endpoint sample). The 12 envelope
// extremes are evaluated for reach and conditioning and REPORTED: an "envelope-sensitive" swing (any extreme fails) is never admitted analytically alone — it must pass the
// closed-loop replay, which is the authority on execution for every commanded swing (independent per-axis extremes ignore how pelvis motions correlate, so they flag, not reject).
// Returns { ok (nominal gates), envelopeOk, fails[] (nominal), envelopeFails[], minMargin / minMarginNominal (rad), minLambda, maxRate, torqueRatioMax, selfMin (m), clearMin (m) }.
export function certifyExecution(X, sg, opt) { const c = X.ctrl, n = X.n, m = 1 - n, spec = c.spec, ks = c.legK[n], env = opt.envelope, at = opt.at || ((t) => stepAt(sg, t));
  const SL = ks.map(k => spec.joints[k].limits.soft), LO = [SL[0].lo[0], SL[0].lo[1], SL[0].lo[2], SL[1].lo[1], SL[2].lo[1], SL[2].lo[2]], HI = [SL[0].hi[0], SL[0].hi[1], SL[0].hi[2], SL[1].hi[1], SL[2].hi[1], SL[2].hi[2]];
  const poses = [{ tag: "nominal", pos: X.pel.pos, rot: X.pel.rot }]; for (let i = 0; i < 3; i++) for (const sgn of [-1, 1]) { const d = [0, 0, 0]; d[i] = sgn * env.dp[i]; poses.push({ tag: `p${i}${sgn > 0 ? "+" : "-"}`, pos: V.add(X.pel.pos, Q.rot(X.pel.rot, d)), rot: X.pel.rot });
    const r = [0, 0, 0]; r[i] = sgn * env.dr[i]; poses.push({ tag: `r${i}${sgn > 0 ? "+" : "-"}`, pos: X.pel.pos, rot: Q.norm(Q.mul(X.pel.rot, qexp(r))) }); }
  const foot = (fi) => spec.bodies[fi].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))), sw = foot(c.feet[n]), stP = foot(c.feet[m]).map(p => V.add(X.st[c.feet[m]].pos, Q.rot(X.st[c.feet[m]].rot, p)));
  const N = opt.samples ?? 21, fails = [], envFails = []; let minMarginNom = Infinity, minMargin = Infinity, minLambda = Infinity, maxRate = 0, torqueRatioMax = 0, selfMin = Infinity, clearMin = Infinity, prevX = null; const T = sg.T, dts = T / (N - 1);
  c._e2plan = (c._e2plan || 0) + 1;
  try { for (let i = 0; i < N; i++) { const t = T * i / (N - 1), e = at(t), tgt = { pos: e.pos, rot: e.rot }, phi = t / T;
      for (const pel of poses) { const r = c.legIKBounded(X.st, X.ev, n, pel.pos, pel.rot, tgt, { limits: "soft", fallback: "none" });
        const F = pel.tag === "nominal" ? fails : envFails;
        if (!(r.err <= 1e-6)) { F.push(`φ ${phi.toFixed(2)} ${pel.tag}: IK not reached (${r.err.toExponential(1)})`); continue; }
        const mg = Math.min(...r.x.map((v, j) => Math.min(v - LO[j], HI[j] - v))); minMargin = Math.min(minMargin, mg); if (pel.tag === "nominal") minMarginNom = Math.min(minMarginNom, mg); if (!(mg > (opt.softMargin ?? 0))) F.push(`φ ${phi.toFixed(2)} ${pel.tag}: soft-limit margin ${(mg * 180 / Math.PI).toFixed(2)}°`);
        const Jm = c.legChain(X.st, X.ev, n, pel.pos, pel.rot, tgt).jac(r.x), free = [0, 1, 2, 3, 4, 5].filter(j => !r.atBound[j]), H = free.map(a => free.map(b => Jm[a].reduce((s2, _, q) => s2 + Jm[a][q] * Jm[b][q], 0))), lam = _eigMinSym(H);
        minLambda = Math.min(minLambda, lam); if (!(lam >= IK.srEps * IK.srEps)) F.push(`φ ${phi.toFixed(2)} ${pel.tag}: conditioning λmin ${lam.toExponential(2)} < ε²`);
        if (pel.tag !== "nominal") continue;
        if (prevX) { const rate = Math.max(...r.x.map((v, j) => Math.abs(v - prevX[j]) / dts)); maxRate = Math.max(maxRate, rate); if (opt.rateMax && rate > opt.rateMax) fails.push(`φ ${phi.toFixed(2)}: coordinate rate ${rate.toFixed(2)} rad/s`); }
        if (opt.act) { const ref = { vel: e.vel, acc: e.acc, w: e.w || [0, 0, 0], al: e.al || [0, 0, 0], vPel: [0, 0, 0] }, wr = c.swingAccWrench(X.st, X.ev, n, pel, r.x, ref, [0, 0, 0]);
          const P = c.legChain(X.st, X.ev, n, pel.pos, pel.rot, null).pose(r.x), bodies = ks.map(k => spec.joints[k].childIndex), cOff = bodies.map(b => Q.rot(Q.conj(X.st[b].rot), V.sub(X.st[b].com, X.st[b].pos))), com = P.R.map((R, b) => V.add(P.p[b], Q.rot(R, cOff[b])));
          const tgtQ = new Map(r.targets); ks.forEach((k, idx) => { let Tg = [0, 0, 0]; for (let b = idx; b < 3; b++) Tg = V.sub(Tg, V.cross(V.sub(com[b], P.p[idx]), [0, -9.81 * spec.bodies[bodies[b]].mass, 0])); const Treq = V.add(Tg, wr && wr.T[k] ? wr.T[k] : [0, 0, 0]);
            const d = c.P.jd[k], R2F2 = Q.mul(P.R[idx], d.F2), q = tgtQ.get(k) || X.ev.qs[k], kneeDeg = idx === 2 ? c.P.anat(c.P.jd[ks[1]], tgtQ.get(ks[1]) || X.ev.qs[ks[1]], "flex") : null;
            [0, 1, 2].forEach(ii => { const ax = opt.act.ax[k] && opt.act.ax[k][ii]; if (!ax) return; const axW = Q.rot(R2F2, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][ii]), tq = V.dot(Treq, axW), anat = c.P.anat(d, q, ax.key), wq = prevX ? Math.max(...r.x.map((v, j) => Math.abs(v - prevX[j]) / dts)) : 0;
              const cap = opt.act.capFull(ax, tq >= 0 ? 1 : -1, anat, wq, kneeDeg) / (1 + opt.uMargin), ratio = Math.abs(tq) / Math.max(1e-9, cap); torqueRatioMax = Math.max(torqueRatioMax, ratio); if (ratio > 1) fails.push(`φ ${phi.toFixed(2)} ${spec.joints[k].name}.${"xyz"[ii]}: torque ${tq.toFixed(1)} N·m > capacity/headroom ${cap.toFixed(1)}`); }); }); }
        const swW = sw.map(p => V.add(tgt.pos, Q.rot(tgt.rot, p))); let dmin = Infinity; for (const a of swW) for (const b of stP) dmin = Math.min(dmin, V.dist(a, b)); selfMin = Math.min(selfMin, dmin); if (opt.selfDist && dmin < opt.selfDist) fails.push(`φ ${phi.toFixed(2)}: self-collision distance ${(dmin * 1000).toFixed(1)} mm`);
        if (opt.binDev && phi >= 0.2 - 1e-9 && phi <= 0.8 + 1e-9) { const low = Math.min(...swW.map(p => p[1])) - X.groundY, b = Math.min(opt.binDev.length - 1, Math.floor((phi - 0.2) / 0.05 + 1e-9)), cl = low - opt.binDev[b] / 1000; clearMin = Math.min(clearMin, cl); if (cl < FS.clearMin) fails.push(`φ ${phi.toFixed(2)}: swept sole clearance ${(cl * 1000).toFixed(2)} mm`); }
        prevX = r.x.slice(); } } }
  finally { c._e2plan--; }
  return { ok: fails.length === 0, envelopeOk: envFails.length === 0, fails, envelopeFails: envFails, minMargin, minMarginNominal: minMarginNom, minLambda, maxRate, torqueRatioMax, selfMin, clearMin }; }
export function certifyPath(X, sg) { const v = []; for (let i = 0; i < FS.nPath; i++) { const e = stepAt(sg, sg.T * i / (FS.nPath - 1)); v.push(ikFeasible(X.ctrl, X.st, X.ev, X.n, X.pel, { pos: e.pos, rot: e.rot })); } return { ok: v.every(Boolean), verdicts: v.map(b => (b ? "FEASIBLE" : "NOT REACHED")) }; }
// candidate build: landed region at the pose, timing, landing uncertainty, the predicted new double-support midpoint (rMid0 = the quiet-stance reference with the
// swing foot where it is now, shifted by half the foot's planned translation — exact for a translation without yaw change).
// Landing uncertainty = the servo-bandwidth tracking bound of the PLANNED move: at a decision, base + 5.77·d/(ωn²T²) for the whole move d in T; for a re-plan of a
// running swing (X.F0 = the current foothold, X.eLand0 = its bound), the current bound + the term of the re-target displacement |F − F0| over the remaining T
export const moveOf = (X, pose) => (X.F0 ? V.dist(X.F0.pos, pose.pos) : V.dist(X.foot.pos, pose.pos));
function cand(X, pose, T, Tr, eFix = null) { const d = moveOf(X, pose), wn = 2 * Math.PI * X.ctrl.lc.o.swingHz, T1 = Math.max(T, 1e-3);
  const eLand = eFix != null ? eFix : X.contactNow ? 0 : X.F0 ? X.eLand0 + 5.77 * d / (wn * wn * T1 * T1) : eLandOf(Math.max(d, 1e-9), T1, wn);
  return { pose, T, Tr, d, eLand, Tlo: X.liftDelay || 0, L: footprintAt(X.ctrl, X.n, pose), rMid: [X.rMid0[0] + 0.5 * (pose.pos[0] - X.foot.pos[0]), X.rMid0[1] + 0.5 * (pose.pos[2] - X.foot.pos[2])] }; }
// the swing segment a candidate implies (from the current reference state; apex knot for commanded steps that have not passed it)
export function segFor(X, pose, T) { const knot = X.apex != null && X.knotT != null && X.knotT > 1e-6 && X.knotT < T - 1e-6 ? { z: X.apexZ, tk: X.knotT } : null; return stepSegment(X.ref, pose, T, knot); }
// ── the planner ──
// X adds: { ctrl, st, ev, pel, A (anchor), fr, foot (current foot pose), ref (current reference state for the swing), nominal {dx, dy, dz}, Tseed, apex, apexZ, knotT,
//           corridor name, rMid0, Tfixed (re-plan keeping the touchdown time) }
export function plan(X) { const t0 = typeof performance !== "undefined" ? performance.now() : Date.now(), wn = 2 * Math.PI * X.ctrl.lc.o.swingHz, log = { mode: X.mode, evaluated: 0 };
  const dz = X.nominal ? X.nominal.dz || 0 : 0, grid = reachGrid({ ...X, dz }, FS.corridor[X.corridor]); log.reachNodes = grid.nodes.length; log.reachCertified = grid.nCert;
  const done = (res) => ({ ...res, log: { ...log, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0 } });
  if (X.mode === "commanded") { const nom = X.nominal, nodes = grid.nodes.filter(q => grid.certified(q.dx, q.dy)).map(q => ({ ...q, dist: Math.hypot(q.dx - nom.dx, q.dy - nom.dy) }));
    const isNom = (q) => Math.abs(q.dx - nom.dx) < 1e-6 && Math.abs(q.dy - nom.dy) < 1e-6; nodes.sort((a, b) => (isNom(b) - isNom(a)) || a.dist - b.dist);
    log.nominalCertifiedReach = nodes.some(isNom);
    for (const q of nodes) { const pose = candPose(X.A, X.fr, q.dx, q.dy, dz), d = moveOf(X, pose), T = X.Tfixed != null ? X.Tfixed : X.Tseed == null ? Tmin(d, wn) : Math.max(X.Tseed, Tmin(d, wn));
      if (X.Tfixed == null && X.Tseed != null && T > X.Tseed + 1e-9) continue;
      for (const Tr of FS.TrGrid) { const c = cand(X, pose, T, Tr); log.evaluated++; const r = predict(X, c); if (!ok(r)) continue;
        const sg = segFor(X, pose, T), pc = certifyPath(X, sg); if (!pc.ok) { log.pathFail = (log.pathFail || 0) + 1; break; }
        // X.diagNoClearance: DIAGNOSTIC smoke runs only (never official; tools/e2_eval.mjs rejects such runs) — the certificate is computed and logged, not enforced
        const cl = certifyClearance(X, sg); if (!cl.ok && X.diagNoClearance) log.clearanceNotEnforced = { margin: cl.margin, at: cl.at, envelope: cl.envelope }; else if (!cl.ok) { log.clearanceFail = (log.clearanceFail || 0) + 1; log.clearance = log.clearance || { margin: cl.margin, at: cl.at, envelope: cl.envelope, dx: q.dx, dy: q.dy }; break; }
        return done({ clearance: { margin: cl.margin, at: cl.at, envelope: cl.envelope }, verdict: "CERTIFIED_ONE_STEP", nominal: isNom(q), dx: q.dx, dy: q.dy, dz, pose, T, Tr, eLand: c.eLand, rMid: c.rMid, slack: slackOf(X, c), seg: sg, path: pc, cert: { geometry: q.geo, reach: grid.certified(q.dx, q.dy) } }); } }
    return done({ verdict: "NO_CERTIFIED_ONE_STEP", why: !nodes.length ? "no certified reach node" : log.clearanceFail ? `clearance certificate fails at every capturing, path-certified node (nominal: margin ${(log.clearance.margin * 1000).toFixed(1)} mm at φ ${log.clearance.at.toFixed(2)}, envelope ${(log.clearance.envelope * 1000).toFixed(1)} mm; need ≥ ${FS.clearMin * 1000} mm)` : "no corridor node certifies (timed capture / VRP / path)" }); }
  // recovery: maximise the slack over certified nodes × T ≥ T_min(d) × ramps
  const res = []; for (const q of grid.nodes.filter(q => grid.certified(q.dx, q.dy))) { const pose = candPose(X.A, X.fr, q.dx, q.dy, 0), d = moveOf(X, pose), T0 = X.Tfixed != null ? X.Tfixed : Tmin(d, wn); let best = null;
    for (let i = 0; T0 + i * FS.Tstep <= (X.Tfixed != null ? X.Tfixed : FS.TmaxRec) + 1e-9; i++) { const T = +(T0 + i * FS.Tstep).toFixed(6); let bestT = null;
      for (const Tr of FS.TrGrid) { const c = cand(X, pose, T, Tr); log.evaluated++; const sl = slackOf(X, c); if (sl >= 0 && (!bestT || sl > bestT.slack)) bestT = { T, Tr, slack: sl, c }; }
      if (bestT && (!best || bestT.slack > best.slack)) best = bestT; else if (best) break; }   // scan up to the first capturing T, then while the slack improves (a longer swing delays support)
    if (best) res.push({ dx: q.dx, dy: q.dy, geo: q.geo, pose, ...best }); }
  res.sort((a, b) => b.slack - a.slack); log.capturing = res.length;
  for (const r of res.slice(0, FS.topPath)) { const sg = segFor(X, r.pose, r.T), pc = certifyPath(X, sg); if (!pc.ok) { r.pathFail = pc.verdicts; continue; }
    return done({ verdict: "CERTIFIED_ONE_STEP", dx: r.dx, dy: r.dy, dz: 0, pose: r.pose, T: r.T, Tr: r.Tr, eLand: r.c.eLand, rMid: r.c.rMid, slack: r.slack, seg: sg, path: pc, cert: { geometry: r.geo, reach: grid.certified(r.dx, r.dy) }, top: res.slice(0, 8).map(x => ({ dx: x.dx, dy: x.dy, T: x.T, Tr: x.Tr, slack: x.slack, pathFail: !!x.pathFail })) }); }
  return done({ verdict: "NO_CERTIFIED_ONE_STEP", why: res.length ? "no capturing candidate with a certified swing path" : "no capturing candidate", top: res.slice(0, 8).map(x => ({ dx: x.dx, dy: x.dy, T: x.T, Tr: x.Tr, slack: x.slack })) }); }
// per-tick check of the CURRENT foothold from the measured state (remaining time T, ramp Tr); no reach grid (the foothold was certified when chosen)
export function check(X, pose, T, Tr, eLand) { const c = cand(X, pose, T, Tr, eLand), r = predict(X, c); return { ok: ok(r), why: r.why, eLand: c.eLand }; }
// prediction trajectory of the chosen plan (for the predicted-vs-actual DCM criterion E2-12)
export function trajectory(X, pose, T, Tr, eLand = null) { const c = cand(X, pose, T, Tr, eLand); return predict(X, c, 0, true); }
export { centroid2 };

// SP2F addendum candidate (REFERENCE3: continuous SIDE slide + ACTIVE posting-arm stabilisation) = the SP2F candidate (sp2f/scripts/sp2f_cand.mjs with
// sp2f/evidence/SP2F_opts.json: its recline curve, pelvis objective and sliding post) with three changes, all targets / gains / authority / feedback:
//   lateral    the lateral organisation is ESTABLISHED at the folded-side landing: the pelvis-roll objective and the trunk's lateral components (lumbar /
//              thoracic lateral flexion, thoracic rotation) follow the SUM of a short establishing curve (E.t0 → E.t1, to E.*) and the slow recline
//              (E.t0 → R.t1, from E.* to R.*): one monotonic motion, fast at the landing, slow afterwards, with no pause at E.t1 (no zero-rate junction).
//              The sagittal recline (flexion, pelvis pitch, neck) keeps SP2F's single slow curve. Pelvis-objective gain / onset: S.ko / S.onsetS.
//   reach      the folded-side arm reaches out to the SIDE of the body before the landing (A.t0 → A.t1 to A.abd / A.flex / A.elbow) so it meets the turf as
//              the body goes onto its side (REFERENCE3: a long, nearly straight arm placed beside / behind the hip)
//   support    from the forearm's first turf contact the arm is an ACTIVE, LOAD-AWARE SUPPORT (sp2_ctrl opts.post.support): its press is a feedback of the
//              sensed trunk lowering against the SAME intended lowering (sched: trunk tilt T0 → TE with the establishing curve, → T1 with the recline
//              curve), light (Fmin) when the trunk is on or behind its intended lowering, stronger (≤ Fmax) only when its PREDICTED lowering (tilt + Tp·rate) runs ahead;
//              two-sided with Flo: Fmin is the nominal press on the intended lowering, LESS (down to Flo) when the trunk is behind it (the arm yields to the descent);
//              optional load-aware yielding (yieldN / dMin) and end-range shoulder stabiliser (elevMax / kR / capR). The authored arm targets fade
//              out at contact (SP2F) — no pose lock, no hand target.
// No anti-roll torque, no root / COM / propulsion objective, no world-space target. The posting hand is part of the forearm body (no wrist joint).
import fs from "fs";
const SF = await import(new URL("../../scripts/sp2f_cand.mjs", import.meta.url).href), FL = await import(new URL("../../../sp2a/scripts/sp2a_flight.mjs", import.meta.url).href);
const AA = await import(new URL("../../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
export const SP2F_OPTS = JSON.parse(fs.readFileSync(new URL("../../evidence/SP2F_opts.json", import.meta.url)));
const r3 = (x) => +(+x).toFixed(3), PROF = { mj: (u) => u * u * u * (10 - 15 * u + 6 * u * u), smooth: (u) => u * u * (3 - 2 * u), sine: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u) };
const valAt = (keys, t) => { let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++; const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)]; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : a[1]; };
const cl = (u) => Math.max(0, Math.min(1, u));
// two-curve sum: v0 (the base track at t0) → vE along fE over [t0, tE] PLUS vE → v1 along fR over [t0, t1]; held after t1
export const twoCurve = (keys, t0, tE, t1, vE, v1, End, pE = "sine", pR = "sine") => { const k0 = keys || [[0, 0]], v0 = valAt(k0, t0), fE = PROF[pE], fR = PROF[pR], out = k0.filter(([t]) => t < t0 - 1e-6).map(([t, v]) => [r3(t), r3(v)]);
  for (let t = t0; t < t1 - 1e-6; t += 0.025) out.push([r3(t), r3(v0 + (vE - v0) * fE(cl((t - t0) / (tE - t0))) + (v1 - vE) * fR(cl((t - t0) / (t1 - t0))))]); out.push([r3(t1), r3(v1)], [r3(Math.max(End, t1 + 0.1)), r3(v1)]); return out; };
export const DEFAULT = { E: { t0: 0.40, t1: 0.65, prof: "sine", roll: 60, lumbarLat: null, thoracicLat: null, thoracicRot: null },
  S: { ko: 400, onsetS: 0.35 }, A: { t0: 0.22, t1: 0.48, prof: "sine", abd: 70, flex: -20, elbow: 12, blendS: 0.12, delayS: 0.0, auth: 0.7 },
  Sup: { Fmin: 50, Fmax: 300, Ka: 8, Kr: 0, Tp: 0.12, tauS: 0.04, delayS: 0.025, yieldN: null, dMin: 0.3, elevMax: null, kR: 60, capR: 40, T0: 18, TE: 45, T1: 85 } };
export function sp2f2Cand(speed, X0 = {}) { const X = { E: { ...DEFAULT.E, ...(X0.E || {}) }, S: { ...DEFAULT.S, ...(X0.S || {}) }, A: { ...DEFAULT.A, ...(X0.A || {}) }, Sup: { ...DEFAULT.Sup, ...(X0.Sup || {}) }, id: X0.id || "SP2F2" };
  const base = X0.base || SP2F_OPTS, R = { ...SF.DEFAULT.R, ...(base.R || {}) }, E = X.E, A = X.A, T = X.Sup, End = 6;
  // the SP2C base tracks (SP2F's recline moved out of the run: every trunk target and the seat roll keep SP2C's values)
  const raw = SF.sp2fCand(speed, { id: "raw", R: { ...(base.R || {}), t0: 9, t1: 9.5 } }), rawTr = raw.chor.tracks, rawRoll = raw.seat.pelvis.roll;
  // SP2F's candidate with this reach and this post (the press magnitude is replaced by the support regulator)
  const c = SF.sp2fCand(speed, { ...base, id: X.id, R: { ...(base.R || {}), ko: X.S.ko, onsetS: X.S.onsetS }, A: { ...(base.A || {}), t0: A.t0, t1: A.t1, prof: A.prof, abd: A.abd, flex: A.flex, elbow: A.elbow, blendS: A.blendS, delayS: A.delayS, auth: A.auth, pressN: T.Fmin } }), tr = c.chor.tracks;
  // 1) the lateral establishment: pelvis roll + trunk lateral components = establishing curve + slow recline (from the SP2C base value at E.t0)
  for (const [k, vE, v1] of [["lumbar.lat", E.lumbarLat, R.lumbarLat], ["thoracic.lat", E.thoracicLat, R.thoracicLat], ["thoracic.rot", E.thoracicRot, R.thoracicRot]]) if (vE != null) tr[k] = twoCurve(rawTr[k], E.t0, E.t1, R.t1, vE, v1, End, E.prof, R.prof);
  if (c.seat && E.roll != null) c.seat.pelvis.roll = twoCurve(rawRoll, E.t0, E.t1, R.t1, E.roll, R.roll, End, E.prof, R.prof);
  // 2) the active support regulator: the intended trunk lowering on the same two curves
  const sched = []; for (let t = 0; t <= End + 1e-9; t += 0.025) sched.push([r3(t), r3(t < E.t0 ? T.T0 : T.T0 + (T.TE - T.T0) * PROF[E.prof](cl((t - E.t0) / (E.t1 - E.t0))) + (T.T1 - T.TE) * PROF[R.prof](cl((t - E.t0) / (R.t1 - E.t0))))]);
  c.post = { ...c.post, support: { Fmin: T.Fmin, ...(T.Flo != null ? { Flo: T.Flo } : {}), Fmax: T.Fmax, Ka: T.Ka, Kr: T.Kr, Tp: T.Tp, tauS: T.tauS, delayS: T.delayS, ...(T.yieldN ? { yieldN: T.yieldN, dMin: T.dMin } : {}), ...(T.elevMax != null ? { elevMax: T.elevMax, kR: T.kR, capR: T.capR } : {}), sched } };
  c.sp2f2 = X; return c; }
export async function runSP2F2(runin, X, steps = 1440, runOpts = {}) { const CL = await import(new URL("../../../slide_phys1/scripts/sp_climits.mjs", import.meta.url).href);
  const RI = AA.loadRunIn(runin, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3), cand = sp2f2Cand(speed, X), plan = FL.flightPlan(RI, cand), c2 = { ...cand, entry: plan.entry };
  const o = await CL.auditRun(c2, { steps, ...runOpts }); o.contactRule = c2.soleRule; o.candId = c2.id; o.runIn = plan.frames; o.entrySpec = plan.entry; o.flight = { T: plan.T, nF: plan.nF, v0: plan.v0, vT: plan.vT, kTO: plan.kTO }; o.tOffset = 0; o.speedTackler = speed; o.sp2f2Opts = cand.sp2f2; o.candLead = cand.lead; return o; }

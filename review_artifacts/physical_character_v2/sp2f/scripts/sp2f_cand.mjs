// SP2F candidate = ONE continuous controlled recline + a persistent SLIDING ARM POST, on the SP2C tackle (sp2c/evidence/SP2C_opts.json without its recovery:
// RUN → tackle, commitment, scissor, folded-leg tuck, folded boot, ground entry, contact authority, local yielding unchanged). SP2D / SP2E are not modified.
// Diagnosed causes of SP2E's fall-over (SP2F_LOG §1): (1) fast authored changes at contact (arm swing and fast-start trunk targets, ≤ 730°/s of target
// change) → a 300°/s trunk jolt; (2) the authored arm-opening target LIFTS the posting hand off the turf (+0.20…+0.57 s) exactly while the pelvis passes its
// tipping edge, so the body rolls over unsupported (roll rate 120°/s) and the torso lands at 400°/s. SP2F therefore uses:
//   recline  every trunk / head target moves from SP2C's value to the lying organisation along ONE minimum-jerk curve (zero rate and acceleration at both
//            ends) from R.t0 (the sagittal recline — lumbar / thoracic / neck flexion — optionally from R.flexT0) to R.t1 — no fast-start ramp, no phase, no later target change; the pelvis objective (seat:
//            orientation through the fold hip while the fold leg is on the turf) follows the SAME curve to R.roll / R.pitch at gain R.ko; its strength builds
//            over R.onsetS once the fold leg is on the turf (SP2C: 0.03 s) — a soft onset at landing, not a late gain step
//   reach    before contact the folded-side arm moves along a minimum-jerk curve (A.t0 → A.t1) from SP2C's back-held pose toward the turf beside / behind the
//            hip (A.abd / A.flex / A.elbow) — it reaches the turf because the torso reclines
//   post     from the forearm's first sensed turf contact the arm's authored targets fade out (A.blendS) and it exerts a finite PRESS (A.pressN downward at
//            the hand, Jacobian transpose) with its damping, at authority A.auth (sp2_ctrl opts.post): the turf and the lowering body set its geometry
//   other    the tackling-side arm goes up / over the body along the recline curve; trailing-leg authority U.trailLeg held from contact (no late change)
// Targets / gains / authority only: no anti-roll torque, no root / COM / propulsion objective, no world-space hand target.
import fs from "fs";
const SC = await import(new URL("../../sp2c/scripts/sp2c_cand.mjs", import.meta.url).href), FL = await import(new URL("../../sp2a/scripts/sp2a_flight.mjs", import.meta.url).href);
const AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
export const SP2C_OPTS = JSON.parse(fs.readFileSync(new URL("../../sp2c/evidence/SP2C_opts.json", import.meta.url)));
const r3 = (x) => +(+x).toFixed(3), PROF = { mj: (u) => u * u * u * (10 - 15 * u + 6 * u * u), smooth: (u) => u * u * (3 - 2 * u), sine: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u), osine: (u) => Math.sin(Math.PI * u / 2) };
const valAt = (keys, t) => { let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++; const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)]; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : a[1]; };
export const curve = (keys, t0, t1, v1, E, prof = "mj") => { const k0 = keys || [[0, 0]], v0 = valAt(k0, t0), f = PROF[prof] || PROF.mj, out = k0.filter(([t]) => t < t0 - 1e-6).map(([t, v]) => [r3(t), r3(v)]); out.push([r3(t0), r3(v0)]);
  for (let t = t0 + 0.025; t < t1 - 1e-6; t += 0.025) out.push([r3(t), r3(v0 + (v1 - v0) * f((t - t0) / (t1 - t0)))]); out.push([r3(t1), r3(v1)], [r3(Math.max(E, t1 + 0.1)), r3(v1)]); return out; };
export const DEFAULT = { R: { t0: 0.18, t1: 1.6, prof: "mj", lumbarFlex: -10, thoracicFlex: -4, lumbarLat: -5, thoracicLat: -3, lumbarRot: 2.5, thoracicRot: 30, neck: 34, roll: 82, pitch: -30, ko: 400 },
  A: { t0: 0.18, t1: 0.6, prof: "mj", abd: 30, flex: -30, elbow: 15, pressN: 120, blendS: 0.1, auth: 0.7 }, O: { shRFlex: 78, shRAbd: 22, elRFlex: 44 }, U: { trailLeg: null } };
export function sp2fCand(speed, F0 = {}) { const F = { R: { ...DEFAULT.R, ...(F0.R || {}) }, A: { ...DEFAULT.A, ...(F0.A || {}) }, O: { ...DEFAULT.O, ...(F0.O || {}) }, U: { ...DEFAULT.U, ...(F0.U || {}) }, id: F0.id || "SP2F" };
  const base = { ...SP2C_OPTS, id: F.id }; delete base.recover; const c = SC.sp2cCand(speed, base), tr = c.chor.tracks, E = base.tEnd || 6, R = F.R, A = F.A, O = F.O;
  // 1) the continuous recline: every trunk / head target along one curve
  for (const [k, v] of [["lumbar.flex", R.lumbarFlex], ["thoracic.flex", R.thoracicFlex], ["lumbar.lat", R.lumbarLat], ["thoracic.lat", R.thoracicLat], ["lumbar.rot", R.lumbarRot], ["thoracic.rot", R.thoracicRot], ["neck.flex", R.neck]])
    if (v != null) tr[k] = curve(tr[k], k.endsWith(".flex") ? (R.flexT0 ?? R.t0) : R.t0, R.t1, v, E, R.prof);
  // 2) the pelvis objective follows the same curve
  if (c.seat) { const sp = c.seat.pelvis; c.seat = { ...c.seat, window: [c.seat.window[0], E], gains: { ko: R.ko, do: R.ko * 0.14 }, gate: { ...(c.seat.gate || { clearM: 0.02 }), ramp: R.onsetS ?? 0.03 }, pelvis: { pitch: curve(sp.pitch, R.t0, R.t1, R.pitch, E, R.prof), roll: curve(sp.roll, R.t0, R.t1, R.roll, E, R.prof), yaw: [[0, 0], [E, 0]] } }; }
  // 3) the folded-side arm: a continuous reach toward the turf, then the sliding post (controller-side, from the first forearm turf contact)
  for (const [k, v] of [["shoulder_L.abd", A.abd], ["shoulder_L.flex", A.flex], ["elbow_L.flex", A.elbow]]) tr[k] = curve(tr[k], A.t0, A.t1, v, E, A.prof);
  c.post = { body: "forearm_L", side: "L", joints: ["shoulder_L", "elbow_L"], delayS: A.delayS ?? 0.025, blendS: A.blendS, pressN: A.pressN, ...(A.pressRampS ? { pressRampS: A.pressRampS } : {}) };
  // 4) the tackling-side arm up / over the body along the recline
  for (const [k, v] of [["shoulder_R.flex", O.shRFlex], ["shoulder_R.abd", O.shRAbd], ["elbow_R.flex", O.elRFlex]]) tr[k] = curve(tr[k], R.t0, R.t1, v, E, R.prof);
  // 5) authority: SP2C's contact schedule (it settles within 0.3 s of contact), the arm at A.auth and optionally the trailing leg at U.trailLeg — held, no later step
  c.contactAuth = { ...c.contactAuth, schedule: c.contactAuth.schedule.map(([t, a]) => [t, t > 0 ? { ...a, armL: t >= 0.3 ? A.auth : Math.max(A.auth, a.armL), ...(F.U.trailLeg != null && t >= 0.3 ? { trailLeg: F.U.trailLeg } : {}), ...(F.U.trunk != null && t >= 0.06 ? { trunk: F.U.trunk } : {}) } : a]) };
  c.sp2f = F; return c; }
export async function runSP2F(runin, F, steps = 1440, runOpts = {}) { const CL = await import(new URL("../../slide_phys1/scripts/sp_climits.mjs", import.meta.url).href);
  const RI = AA.loadRunIn(runin, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3), cand = sp2fCand(speed, F), plan = FL.flightPlan(RI, cand), c2 = { ...cand, entry: plan.entry };
  const o = await CL.auditRun(c2, { steps, ...runOpts }); o.contactRule = c2.soleRule; o.candId = c2.id; o.runIn = plan.frames; o.entrySpec = plan.entry; o.flight = { T: plan.T, nF: plan.nF, v0: plan.v0, vT: plan.vT, kTO: plan.kTO }; o.tOffset = 0; o.speedTackler = speed; o.sp2fOpts = cand.sp2f; o.candLead = cand.lead; return o; }

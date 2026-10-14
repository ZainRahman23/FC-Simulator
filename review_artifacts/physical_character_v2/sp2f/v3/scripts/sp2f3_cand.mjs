// SP2F3 candidate = the posting arm CORRECTED from the hand outward (owner correction 2026-10-14 ≈ 22:58, sources/…_sp2f2_arm_correction_hand_outward.md) on SP2F's
// torso (sp2f/evidence/SP2F_opts.json: one continuous sine recline, pelvis objective, no in-air counter-lean release — the folded knee stays at SP2F's level).
//   reach    before contact the folded-side arm reaches DOWN, beside / behind the hip, elbow slightly bent (joint targets A.abd / A.flex / A.elbow over
//            A.t0 → A.t1, still moving at contact)
//   post     from the first forearm turf contact (sp2_ctrl opts.post): the authored arm targets fade out over A.blendS and the arm becomes a compliant
//            support chain — a light press (A.pressN) holds the hand on the turf; the HOLD (opts.post.hold) keeps the hand near its captured
//            horizontal offset from the pelvis (it slides WITH the player instead of being dragged toward the head); the elbow (and optionally the
//            shoulder) keeps a compliant fraction of its stiffness toward its orientation at contact, so it flexes as weight comes on. No angle target
//            after contact: the shoulder / elbow angles come from the torso moving relative to the hand.
//   lean     optional E (time-based) or L (state-triggered at the hand plant): a lateral lean of the trunk onto the posting arm AFTER contact
//            (the folded-leg landing stays SP2F's)
//   other    the tackling-side arm: SP2F's (up / over the body) unless O is given
// No anti-roll torque, no root / COM / propulsion objective, no world-space or height target, no rigid constraint.
import fs from "fs";
const SF = await import(new URL("../../scripts/sp2f_cand.mjs", import.meta.url).href), FL = await import(new URL("../../../sp2a/scripts/sp2a_flight.mjs", import.meta.url).href);
const AA = await import(new URL("../../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href), F2 = await import(new URL("../../v2/scripts/sp2f2_cand.mjs", import.meta.url).href);
export const SP2F_OPTS = JSON.parse(fs.readFileSync(new URL("../../evidence/SP2F_opts.json", import.meta.url)));
export const DEFAULT = { A: { t0: 0.25, t1: 0.62, prof: "sine", abd: 25, flex: -35, elbow: 20, blendS: 0.03, delayS: 0.0, pressN: 80, auth: 0.7 },
  H: { Kh: 600, Dh: 60, Fhmax: 120, driftS: null, elbowK: 0.3, shoulderK: 0 }, O: null };
export function sp2f3Cand(speed, X0 = {}) { const X = { A: { ...DEFAULT.A, ...(X0.A || {}) }, H: { ...DEFAULT.H, ...(X0.H || {}) }, O: X0.O || null, id: X0.id || "SP2F3" }, base = X0.base || SP2F_OPTS;
  const c = SF.sp2fCand(speed, { ...base, id: X.id, A: { ...(base.A || {}), ...X.A }, ...(X.O ? { O: X.O } : {}) });
  // optional E (post-contact lateral lean ONTO the posting arm; nothing is released in the air, so the folded-leg landing is SP2F's): from E.t0 the trunk's
  // lateral components follow SP2F's track until E.t0, then the sum of an establishing curve (→ E.lumbarLat / E.thoracicLat by E.t1) and the slow recline
  if (X0.E) { const E = X0.E, R = { ...SF.DEFAULT.R, ...(base.R || {}) }, tr = c.chor.tracks; for (const [k, vE, v1] of [["lumbar.lat", E.lumbarLat, R.lumbarLat], ["thoracic.lat", E.thoracicLat, R.thoracicLat]])
    if (vE != null) tr[k] = F2.twoCurve(tr[k], E.t0, E.t1, Math.max(R.t1, E.t1 + 0.1), vE, v1, 6, E.prof || "sine", R.prof || "sine"); X.E = E; }
  // optional L (state-triggered lean onto the planted hand: sp2_ctrl opts.post.lean): lumbar / thoracic lateral offsets added from the first forearm
  // contact + L.delayS over L.durS (smoothstep)
  const Lx = X0.L; if (Lx) X.L = Lx;
  const H = X.H; c.post = { ...c.post, hold: { Kh: H.Kh, Dh: H.Dh, Fhmax: H.Fhmax, ...(H.frame ? { frame: H.frame } : {}), ...(H.driftS ? { driftS: H.driftS } : {}), ...(H.strut ? { strut: H.strut } : {}), elbowK: H.elbowK, shoulderK: H.shoulderK }, ...(Lx ? { lean: { offsets: { lumbar: { lat: Lx.lumbarLat ?? 0 }, thoracic: { lat: Lx.thoracicLat ?? 0 } }, durS: Lx.durS ?? 0.6, delayS: Lx.delayS ?? 0 } } : {}) };
  c.sp2f3 = X; return c; }
export async function runSP2F3(runin, X, steps = 1440, runOpts = {}) { const CL = await import(new URL("../../../slide_phys1/scripts/sp_climits.mjs", import.meta.url).href);
  const RI = AA.loadRunIn(runin, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3), cand = sp2f3Cand(speed, X), plan = FL.flightPlan(RI, cand), c2 = { ...cand, entry: plan.entry };
  const o = await CL.auditRun(c2, { steps, ...runOpts }); o.contactRule = c2.soleRule; o.candId = c2.id; o.runIn = plan.frames; o.entrySpec = plan.entry; o.flight = { T: plan.T, nF: plan.nF, v0: plan.v0, vT: plan.vT, kTO: plan.kTO }; o.tOffset = 0; o.speedTackler = speed; o.sp2f3Opts = cand.sp2f3; o.candLead = cand.lead; return o; }

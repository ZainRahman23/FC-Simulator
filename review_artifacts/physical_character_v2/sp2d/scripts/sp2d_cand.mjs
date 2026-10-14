// SP2D candidate = SP2C (sp2c/evidence/SP2C_opts.json: SP2A + the compact pre-contact fold-leg tuck, folded boot, held regional authority) WITHOUT
// SP2C's state-triggered seated recovery, and with an authored, physically TRACKED DESCENT of the upper body during the slide instead of SP2C's held
// upright counter-lean. SP2C's code and evidence are not modified: every change is applied here to a copy of the candidate.
//   descent  from D.t0 (after ground entry) to D.t1 the trunk targets move continuously (smoothstep keys) from SP2C's upright counter-lean to a lowered
//            organisation: spine extension (lumbar / thoracic flex < 0: leaning back), the lateral counter-lean released toward D.lumbarLat / thoracicLat,
//            the chest turned open toward the tackling side (thoracic / lumbar rot > 0) so the BACK / fold-side flank, not the chest, meets the turf, the
//            neck flexed to carry the head; the seat objective (pelvis orientation through the fold hip while that leg is on the turf) follows the same
//            schedule to a backward-pitched, fold-side-rolled pelvis. Targets only: no anti-roll torque, no root / COM objective.
//   post     the fold-side (balance) arm — SP2C holds it extended back ≈ 80° at shoulder height, floating — opens and reaches DOWN to the turf beside /
//            behind the hip (P.reachT: shoulder elevation P.reachAbd, extension P.reachFlex, elbow P.reachElbow), then keeps opening along the turf as the
//            torso lowers and the body slides past the hand (P.openT: elevation P.openAbd ≈ the reference's ≈ 130–140°). Finite arm authority
//            (P.authArm): the shoulder / elbow yield to the contact; the hand / forearm keep the temporary low body friction (they slide, not anchor).
//   other    the tackling-side arm up / over the body (O.shRFlex / shRAbd / elRFlex); post-contact authority per region (auth, SP2C's schedule otherwise).
import fs from "fs";
const SC = await import(new URL("../../sp2c/scripts/sp2c_cand.mjs", import.meta.url).href), FL = await import(new URL("../../sp2a/scripts/sp2a_flight.mjs", import.meta.url).href);
const AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
export const SP2C_OPTS = JSON.parse(fs.readFileSync(new URL("../../sp2c/evidence/SP2C_opts.json", import.meta.url)));
const r3 = (x) => +(+x).toFixed(3), sm = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const valAt = (keys, t) => { let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++; const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)]; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : a[1]; };
// continuous descent keys: the track's own value until t0, then a smoothstep (sampled every 0.1 s) to v1 at t1, held to E
const descend = (keys, t0, t1, v1, E) => { const v0 = valAt(keys || [[0, 0]], t0), out = (keys || [[0, 0]]).filter(([t]) => t < t0).map(([t, v]) => [r3(t), r3(v)]); out.push([r3(t0), r3(v0)]);
  for (let t = t0 + 0.1; t < t1 - 1e-6; t += 0.1) out.push([r3(t), r3(v0 + (v1 - v0) * sm((t - t0) / (t1 - t0)))]); out.push([r3(t1), r3(v1)], [r3(Math.max(E, t1 + 0.1)), r3(v1)]); return out; };
// two-stage keys: value until t0, → v1 at tA, → v2 at tB, held
const stage2 = (keys, t0, tA, v1, tB, v2, E) => { const v0 = valAt(keys || [[0, 0]], t0), out = (keys || [[0, 0]]).filter(([t]) => t < t0).map(([t, v]) => [r3(t), r3(v)]);
  return [...out, [r3(t0), r3(v0)], [r3(tA), r3(v1)], [r3(tB), r3(v2)], [r3(Math.max(E, tB + 0.1)), r3(v2)]]; };
export const DEFAULT = { descent: { t0: 0.5, t1: 1.6, lumbarFlex: -22, thoracicFlex: -12, lumbarLat: 5, thoracicLat: 0, lumbarRot: 6, thoracicRot: 28, neck: 30, seatPitch: -35, seatRoll: 45, seatKo: 150 },
  post: { t0: 0.45, reachT: 0.95, reachAbd: 45, reachFlex: -45, reachElbow: 10, openT: 1.8, openAbd: 135, openFlex: 0, openElbow: 15, authArm: 0.55 },
  other: { shRFlex: 60, shRAbd: 70, elRFlex: 60 } };
export function sp2dCand(speed, D0 = {}) { const D = { descent: { ...DEFAULT.descent, ...(D0.descent || {}) }, post: { ...DEFAULT.post, ...(D0.post || {}) }, other: { ...DEFAULT.other, ...(D0.other || {}) }, auth: D0.auth || null, id: D0.id || "SP2D" };
  const base = { ...SP2C_OPTS, id: D.id }; delete base.recover;
  const c = SC.sp2cCand(speed, base), tr = c.chor.tracks, E = base.tEnd || 6, d = D.descent, p = D.post, o = D.other;
  // trunk / head descent
  for (const [k, v] of [["lumbar.flex", d.lumbarFlex], ["thoracic.flex", d.thoracicFlex], ["lumbar.lat", d.lumbarLat], ["thoracic.lat", d.thoracicLat], ["lumbar.rot", d.lumbarRot], ["thoracic.rot", d.thoracicRot], ["neck.flex", d.neck]]) tr[k] = descend(tr[k], d.t0, d.t1, v, E);
  // seat objective follows the descent (pelvis pitched back, rolled onto the fold side), held to the end
  if (c.seat) { const sp = c.seat.pelvis, ko = d.seatKo; c.seat = { ...c.seat, window: [c.seat.window[0], E], gains: { ko, do: ko * 0.14 }, pelvis: { pitch: descend(sp.pitch, d.t0, d.t1, d.seatPitch, E), roll: descend(sp.roll, d.t0, d.t1, d.seatRoll, E), yaw: [[0, 0], [E, 0]] } }; }
  // fold-side (balance) arm: reach down to the turf beside / behind the hip, then open along the turf
  tr["shoulder_L.abd"] = stage2(tr["shoulder_L.abd"], p.t0, p.reachT, p.reachAbd, p.openT, p.openAbd, E);
  tr["shoulder_L.flex"] = stage2(tr["shoulder_L.flex"], p.t0, p.reachT, p.reachFlex, p.openT, p.openFlex, E);
  tr["elbow_L.flex"] = stage2(tr["elbow_L.flex"], p.t0, p.reachT, p.reachElbow, p.openT, p.openElbow, E);
  // tackling-side arm up / over the body
  for (const [k, v] of [["shoulder_R.flex", o.shRFlex], ["shoulder_R.abd", o.shRAbd], ["elbow_R.flex", o.elRFlex]]) tr[k] = descend(tr[k], d.t0, d.t1, v, E);
  // regional authority after the first fold-side contact (SP2C's schedule, the fold arm at p.authArm), or D.auth
  const sch = c.contactAuth.schedule.map(([t, a]) => [t, t >= 0.3 ? { ...a, armL: p.authArm } : a]);
  c.contactAuth = { ...c.contactAuth, schedule: D.auth ? [[0, { tackLeg: 1, trailLeg: 1, trunk: 1, armL: 1, armR: 1 }], ...D.auth, [99, D.auth.at(-1)[1]]] : sch };
  c.sp2d = D; return c; }
export async function runSP2D(runin, D, steps = 1440, runOpts = {}) { const CL = await import(new URL("../../slide_phys1/scripts/sp_climits.mjs", import.meta.url).href);
  const RI = AA.loadRunIn(runin, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3), cand = sp2dCand(speed, D), plan = FL.flightPlan(RI, cand), c2 = { ...cand, entry: plan.entry };
  const o = await CL.auditRun(c2, { steps, ...runOpts }); o.contactRule = c2.soleRule; o.candId = c2.id; o.runIn = plan.frames; o.entrySpec = plan.entry; o.flight = { T: plan.T, nF: plan.nF, v0: plan.v0, vT: plan.vT, kTO: plan.kTO }; o.tOffset = 0; o.speedTackler = speed; o.sp2dOpts = cand.sp2d; return o; }

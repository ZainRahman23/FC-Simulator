// SP2E candidate = SP2D's organisation (sp2d/evidence/SP2D_opts.json: the folded-side / back descent with the chest turned open to the tackling side, the
// folded-side arm post, the tackling-side arm over the body) executed at the reference's pace. Everything else is SP2C / SP2D unchanged (RUN → tackle,
// commitment, scissor, folded-leg tuck and boot, ground entry, contact authority, local yielding); SP2D's code and evidence are not modified.
// Diagnosed causes of SP2D's slowness (SP2E_LOG §1, 5.0 m/s): (1) SP2C's counter-lean toward the TACKLING side (trunk side component −18…−25°) is still
// commanded at contact — the descent toward the folded side must first undo it; (2) the pelvis-roll objective and the trunk targets follow a smoothstep from
// contact to +0.95 s, so the pelvis stays at ≈ 23° roll and the trunk at ≈ 25° until +0.5 s; (3) the posting hand is only ≈ 10 cm above the turf at +0.2 s
// but the arm waits for the slow descent. SP2E therefore exposes the TIMING of the same intention (absolute sim times; first fold contact ≈ 0.40–0.44 s):
//   commit  before contact: SP2C's counter-lean released (lumbar / thoracic lat → commit.lumbarLat / thoracicLat) and the chest opened (thoracic rot →
//           commit.thoracicRot) between commit.t0 and commit.t1 — "torso still elevated but already committed toward the folded side / back"
//   descent trunk targets (SP2D's final values unless overridden) from descent.t0 to descent.t1 with a fast-start profile (shape "out": 1 − (1 − u)²)
//   pelvis  the pelvis-orientation (seat) objective through the fold hip to SP2D's roll / pitch from pelvis.t0 to pelvis.t1 (shape), gain pelvis.ko
//   arm     the folded-side arm opens / reaches toward the turf from arm.t0 to arm.reachT (it reaches the turf because the torso descends), then keeps
//           opening to arm.openT; finite authority arm.auth (shoulder / elbow yield); the tackling-side arm follows the descent timing
//   settle  optional: once lying, the spine relaxes from the falling extension to a resting curve (settle.t0 → t1)
//   auth    optional regional authority levels after contact (auth.trunk / trailLeg / tackLeg / armR from auth.from, optionally until auth.until)
// Targets / gains / authority only: no anti-roll torque, no root / COM / propulsion objective.
import fs from "fs";
const SC = await import(new URL("../../sp2c/scripts/sp2c_cand.mjs", import.meta.url).href), FL = await import(new URL("../../sp2a/scripts/sp2a_flight.mjs", import.meta.url).href);
const AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
export const SP2C_OPTS = JSON.parse(fs.readFileSync(new URL("../../sp2c/evidence/SP2C_opts.json", import.meta.url))), SP2D_OPTS = JSON.parse(fs.readFileSync(new URL("../../sp2d/evidence/SP2D_opts.json", import.meta.url)));
const r3 = (x) => +(+x).toFixed(3), SHAPES = { smooth: (u) => u * u * (3 - 2 * u), out: (u) => 1 - (1 - u) * (1 - u), lin: (u) => u };
const valAt = (keys, t) => { let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++; const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)]; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : a[1]; };
// the track's own value until t0, then the shaped transition (sampled every 25 ms) to v1 at t1, held to E
export const shaped = (keys, t0, t1, v1, E, shape = "out") => { const k0 = keys || [[0, 0]], v0 = valAt(k0, t0), f = SHAPES[shape] || SHAPES.out, out = k0.filter(([t]) => t < t0 - 1e-6).map(([t, v]) => [r3(t), r3(v)]); out.push([r3(t0), r3(v0)]);
  for (let t = t0 + 0.025; t < t1 - 1e-6; t += 0.025) out.push([r3(t), r3(v0 + (v1 - v0) * f((t - t0) / (t1 - t0)))]); out.push([r3(t1), r3(v1)], [r3(Math.max(E, t1 + 0.1)), r3(v1)]); return out; };
export const DEFAULT = { commit: { t0: 0.25, t1: 0.42, lumbarLat: 0, thoracicLat: 0, thoracicRot: 15 },
  descent: { t0: 0.40, t1: 0.80, shape: "out" }, pelvis: { t0: 0.40, t1: 0.75, shape: "out", ko: 150 }, arm: { t0: 0.30, reachT: 0.58, openT: 1.05 }, auth: {} };
export function sp2eCand(speed, E0 = {}) { const E = { commit: { ...DEFAULT.commit, ...(E0.commit || {}) }, descent: { ...DEFAULT.descent, ...(E0.descent || {}) }, pelvis: { ...DEFAULT.pelvis, ...(E0.pelvis || {}) }, arm: { ...DEFAULT.arm, ...(E0.arm || {}) }, auth: { ...DEFAULT.auth, ...(E0.auth || {}) }, id: E0.id || "SP2E" };
  const d0 = SP2D_OPTS.descent, p0 = SP2D_OPTS.post, o0 = SP2D_OPTS.other, base = { ...SP2C_OPTS, id: E.id }; delete base.recover;
  const c = SC.sp2cCand(speed, base), tr = c.chor.tracks, End = base.tEnd || 6, d = { ...d0, ...E.descent }, P = E.pelvis, A = { ...p0, ...E.arm }, C = E.commit;
  // 1) commitment before contact: release SP2C's tackling-side counter-lean, open the chest
  for (const [k, v] of [["lumbar.lat", C.lumbarLat], ["thoracic.lat", C.thoracicLat], ["thoracic.rot", C.thoracicRot]]) if (v != null) tr[k] = shaped(tr[k], C.t0, C.t1, v, End, "smooth");
  // 2) the trunk / head descent (SP2D's targets), fast-start profile
  for (const [k, v] of [["lumbar.flex", d.lumbarFlex], ["thoracic.flex", d.thoracicFlex], ["lumbar.lat", d.lumbarLat], ["thoracic.lat", d.thoracicLat], ["lumbar.rot", d.lumbarRot], ["thoracic.rot", d.thoracicRot], ["neck.flex", d.neck]])
    tr[k] = shaped(tr[k], Math.max(d.t0, k.includes(".lat") || k === "thoracic.rot" ? C.t1 : 0), d.t1, v, End, d.shape);
  // 2b) settle (optional E.settle = { t0, t1, lumbarFlex, thoracicFlex }): once lying, the spine relaxes from the falling extension to a resting curve
  if (E0.settle) { const s = E0.settle; for (const [k, v] of [["lumbar.flex", s.lumbarFlex], ["thoracic.flex", s.thoracicFlex]]) if (v != null) tr[k] = shaped(tr[k], s.t0, s.t1, v, End, "smooth"); }
  // 3) the pelvis (seat objective through the fold hip, active while the fold leg is on the turf): SP2D's roll / pitch, early
  if (c.seat) { const sp = c.seat.pelvis; c.seat = { ...c.seat, window: [c.seat.window[0], End], gains: { ko: P.ko, do: P.ko * 0.14 },
    pelvis: { pitch: shaped(sp.pitch, P.t0, P.t1, P.pitch ?? d.seatPitch, End, P.shape), roll: shaped(sp.roll, P.t0, P.t1, P.roll ?? d.seatRoll, End, P.shape), yaw: [[0, 0], [End, 0]] } }; }
  // 4) the folded-side (posting) arm: opens / reaches during the descent, keeps opening; the tackling-side arm follows the descent
  const two = (k, v1, v2) => { const k0 = tr[k] || [[0, 0]], v0 = valAt(k0, A.t0); tr[k] = [...k0.filter(([t]) => t < A.t0 - 1e-6).map(([t, v]) => [r3(t), r3(v)]), [r3(A.t0), r3(v0)], [r3(A.reachT), r3(v1)], [r3(A.openT), r3(v2)], [r3(Math.max(End, A.openT + 0.1)), r3(v2)]]; };
  two("shoulder_L.abd", A.reachAbd, A.openAbd); two("shoulder_L.flex", A.reachFlex, A.openFlex); two("elbow_L.flex", A.reachElbow, A.openElbow);
  for (const [k, v] of [["shoulder_R.flex", o0.shRFlex], ["shoulder_R.abd", o0.shRAbd], ["elbow_R.flex", o0.elRFlex]]) tr[k] = shaped(tr[k], d.t0, d.t1, v, End, d.shape);
  // 5) authority after the first fold-side contact: SP2C's schedule, the posting arm at A.authArm (SP2D), optional trunk level
  // (E.auth.{trunk, trailLeg, tackLeg, armR}: levels from E.auth.from (s after the contact trigger; default 0.3) — optionally only until E.auth.until, then SP2C's)
  const ov = Object.fromEntries(["trunk", "trailLeg", "tackLeg", "armR"].filter(k => E.auth[k] != null).map(k => [k, E.auth[k]])), from = E.auth.from ?? 0.3, until = E.auth.until;
  let sch = c.contactAuth.schedule.map(([t, a]) => [t, t >= 0.3 ? { ...a, armL: A.authArm } : a]);
  if (Object.keys(ov).length) { const at = (t) => { let i = 0; while (i + 1 < sch.length && sch[i + 1][0] <= t) i++; return sch[i][1]; }, base = at(from), late = until != null ? at(until) : null;
    sch = [...sch.filter(([t]) => t < from), [from, { ...base, ...ov }], ...(until != null ? [[until, { ...late, ...ov }], [until + 0.15, late], [99, late]] : [[99, { ...sch.at(-1)[1], ...ov }]])]; }
  c.contactAuth = { ...c.contactAuth, schedule: sch };
  c.sp2e = E; return c; }
export async function runSP2E(runin, E, steps = 1440, runOpts = {}) { const CL = await import(new URL("../../slide_phys1/scripts/sp_climits.mjs", import.meta.url).href);
  const RI = AA.loadRunIn(runin, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3), cand = sp2eCand(speed, E), plan = FL.flightPlan(RI, cand), c2 = { ...cand, entry: plan.entry };
  const o = await CL.auditRun(c2, { steps, ...runOpts }); o.contactRule = c2.soleRule; o.candId = c2.id; o.runIn = plan.frames; o.entrySpec = plan.entry; o.flight = { T: plan.T, nF: plan.nF, v0: plan.v0, vT: plan.vT, kTO: plan.kTO }; o.tOffset = 0; o.speedTackler = speed; o.sp2eOpts = cand.sp2e; return o; }

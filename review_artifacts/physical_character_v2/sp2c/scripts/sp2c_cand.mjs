// SP2C candidate = SP2A EXACTLY (sp2a_flight.tackleCand with evidence/SP2A_opts.json: SP2's physical tackle + A7 contact authority + the 3D-tuck
// morph, entered through the authored ballistic final flight) with optional SP2C groups. A group left null keeps SP2A's own value. SP2A's code
// and evidence are not modified: every change is applied to a copy of the candidate here. Each group answers one diagnosed problem:
//   trunk   the late roll-over (sp2c_rollover.mjs: the roll is removed by the trunk's lateral counter-lean toward the tackling side and made
//           earlier by removing it): lumbar / thoracic lateral bend reached by latT and held; optional flexion / neck
//   fold    the folded leg not tucked before contact (problems 1–3): from the plant push-off (t0) the fold hip adducts / rotates externally, the knee
//           folds, the ankle plantarflexes / inverts — the compact 3D tuck (sp2c_tuck.mjs) reached by tuckT, BEFORE the fold side meets the turf
//           (≈ 0.41 s), and held. Replaces SP2A's post-landing morph.
//   seat    pelvis orientation through the fold hip while the fold leg is on the turf (SP2's objective; ablation: stronger → less roll)
//   arms    fold-side post / tackling-side balance arm targets
//   tack    the tackling leg after the strike: extended low through the slide, drawn in for the recovery
//   auth    regional authority after the first legitimate fold-side contact (A7 schedule) — evolving to a held level, not decaying to a limp floor
//   tEnd    the follow-through: every target, the seat objective and the authority run to tEnd (SP2A's timeline ended at 1.7 s)
//   recover the end of the slide (the S2 candidate otherwise HOLDS its slide pose, arms out, after stopping): a state-triggered recovery posture —
//           posture only: no root, COM or propulsion objective anywhere
import fs from "fs";
const FL = await import(new URL("../../sp2a/scripts/sp2a_flight.mjs", import.meta.url).href), AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
export const SP2A_OPTS = JSON.parse(fs.readFileSync(new URL("../../sp2a/evidence/SP2A_opts.json", import.meta.url)));
// the compact tuck from sp2c_tuck.mjs (best: knee in pelvis (−0.034, −0.341, 0.282) m; ankle plantarflexed / inverted, sole away from the turf)
export const TUCK_C = { hipFlex: 39, hipAbd: -9, hipRot: -40, knee: 141, ankDf: -40, ankInv: 19 };
const r3 = (x) => +(+x).toFixed(3), ramp = (keys) => keys.map(([t, v]) => [r3(t), r3(v)]), upTo = (k, t1) => (k || [[0, 0]]).filter(([t]) => t <= t1);
const valAt = (keys, t) => { let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++; const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)]; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : a[1]; };
export function sp2cCand(speed, C = {}) { const c = FL.tackleCand(speed, { ...SP2A_OPTS, id: C.id || "SP2C" }), tr = c.chor.tracks, E = C.tEnd || 1.7;
  // fold leg: SP2A's plant phase up to t0, then the compact tuck by tuckT, held (SP2A's morph removed)
  if (C.fold) { const f = { ...TUCK_C, t0: 0.08, tuckT: 0.3, ...C.fold }, t0 = f.t0, T = f.tuckT;
    const set = (k, v, mid) => { const a = upTo(tr[k], t0), m = mid ? mid.filter(([t]) => t > t0 && t < T) : []; tr[k] = ramp([...a, ...m, [T, v], [Math.max(E, T + 0.1), v]]); };
    set("hip_L.flex", f.hipFlex); set("hip_L.abd", f.hipAbd); set("hip_L.rot", f.hipRot); set("knee_L.flex", f.knee, [[0.1, 90], [0.2, Math.min(f.knee, 135)]]); set("ankle_L.df", f.ankDf); set("ankle_L.inv", f.ankInv); }
  // trunk lateral counter-lean toward the tackling side (+ = toward the right / tackling side), optional flexion and neck
  if (C.trunk) { const k = C.trunk, lt = k.latT ?? 0.3;
    if (k.lumbarLat != null) tr["lumbar.lat"] = ramp([...upTo(tr["lumbar.lat"], 0.12), [lt, k.lumbarLat], [Math.max(E, 1.2), k.lumbarLat]]);
    if (k.thoracicLat != null) tr["thoracic.lat"] = ramp([[0, 0], [lt, k.thoracicLat], [Math.max(E, 1.2), k.thoracicLat]]);
    if (k.lumbarFlex != null) tr["lumbar.flex"] = ramp([...upTo(tr["lumbar.flex"], 0.12), [0.5, k.lumbarFlex], [Math.max(E, 1.2), k.lumbarFlex]]);
    if (k.thoracicFlex != null) tr["thoracic.flex"] = ramp([...upTo(tr["thoracic.flex"], 0.12), [0.5, k.thoracicFlex], [Math.max(E, 1.2), k.thoracicFlex]]);
    if (k.neck != null) tr["neck.flex"] = ramp([...upTo(tr["neck.flex"], 0.25), [0.5, k.neck], [Math.max(E, 1.2), k.neck]]); }
  // arms: { "shoulder_L.flex": x, ... } reached by armT (default 0.42 s) and held
  if (C.arms) { const at = C.arms.armT ?? 0.42; for (const [k, x] of Object.entries(C.arms)) if (k.includes(".")) tr[k] = ramp([...upTo(tr[k], 0.12), [at, x], [Math.max(E, at + 0.1), x]]); }
  // tackling leg after the strike (SP2's drive / extension kept to 0.8 s)
  if (C.tack) { const k = C.tack; if (k.hip != null) tr["hip_R.flex"] = ramp([...upTo(tr["hip_R.flex"], 0.8), [1.1, k.hip], [Math.max(E, 1.2), k.hip]]); if (k.knee != null) tr["knee_R.flex"] = ramp([...upTo(tr["knee_R.flex"], 0.95), [1.1, k.knee], [Math.max(E, 1.2), k.knee]]); }
  // seat objective (pelvis orientation through the fold hip while the fold leg is on the turf)
  if (C.seat && c.seat) { const s = C.seat, sp = c.seat.pelvis, ko = s.ko ?? c.seat.gains.ko, ext = (keys, v) => v == null ? [...keys, [Math.max(E, 1.7), keys.at(-1)[1]]] : [...keys.filter(([t]) => t < 0.45), [0.6, v], [Math.max(E, 1.7), v]];
    c.seat = { ...c.seat, window: [c.seat.window[0], Math.max(E, c.seat.window[1])], gains: { ko, do: ko * 0.14 }, pelvis: { pitch: ext(sp.pitch, s.pitch), roll: ext(sp.roll, s.roll), yaw: [[0, 0], [Math.max(E, 1.7), 0]] } }; }
  else if (c.seat && E > 1.7) c.seat = { ...c.seat, window: [c.seat.window[0], E], pelvis: Object.fromEntries(Object.entries(c.seat.pelvis).map(([k, v]) => [k, [...v, [E, v.at(-1)[1]]]])) };
  // regional authority after the first fold-side contact: [[t, {region: level}], ...] relative to the contact (+ delay), held to the end
  if (C.auth) c.contactAuth = { ...c.contactAuth, schedule: [[0, { tackLeg: 1, trailLeg: 1, trunk: 1, armL: 1, armR: 1 }], ...C.auth, [99, C.auth.at(-1)[1]]] };
  // follow-through: every remaining target held to tEnd; recovery posture keys from recoverT (e.g. {"lumbar.flex": 10, "hip_R.flex": 55, ...})
  if (E > 1.7) for (const k of Object.keys(tr)) if (tr[k].at(-1)[0] < E) tr[k] = [...tr[k], [E, tr[k].at(-1)[1]]];
  // recovery: a STATE-triggered phase (sp2_ctrl opts.recover) — when the body's own horizontal COM speed falls below vh (≥ minAfterS after the first
  // fold-side contact) the targets blend over blendS into the recovery posture { "joint.key": deg } (keys not named keep the tackle's targets)
  if (C.recover) { const r = C.recover; c.recover = { vh: r.vh ?? 0.8, minAfterS: r.minAfterS ?? 0.5, delayS: 0.025, blendS: r.blendS ?? 0.8,
    chor: { tracks: Object.fromEntries(Object.entries(r).filter(([k]) => k.includes(".")).map(([k, x]) => [k, [[0, x], [99, x]]])) } }; }
  c.sp2c = C; return c; }
// run (authored final flight → physics); runOpts.setup = the temporary friction hook
export async function runSP2C(runin, C, steps = 1440, runOpts = {}) { const CL = await import(new URL("../../slide_phys1/scripts/sp_climits.mjs", import.meta.url).href);
  const RI = AA.loadRunIn(runin, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3), cand = sp2cCand(speed, C), plan = FL.flightPlan(RI, cand), c2 = { ...cand, entry: plan.entry };
  const o = await CL.auditRun(c2, { steps, ...runOpts }); o.contactRule = c2.soleRule; o.candId = c2.id; o.runIn = plan.frames; o.entrySpec = plan.entry; o.flight = { T: plan.T, nF: plan.nF, v0: plan.v0, vT: plan.vT, kTO: plan.kTO }; o.tOffset = 0; o.speedTackler = speed; o.sp2cOpts = cand.sp2c; return o; }

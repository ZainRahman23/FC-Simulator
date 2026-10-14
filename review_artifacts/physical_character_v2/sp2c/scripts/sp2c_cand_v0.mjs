// SP2C-0 (FIRST ATTEMPT, kept for the log): a complete re-organisation of SP2A (fold leg, trunk, arms, seat, authority all changed at once) → the body falls SUPINE
// (lies flat on its back from ≈ +0.5 s). Superseded by sp2c_cand.mjs (SP2A unchanged + single diagnosed changes). Run with --opts {"mode":"sp2c0"}.
// SP2C candidate = SP2A's tackle (sp2a_flight.tackleCand: SP2's physical tackle + A7 contact authority, entered through the authored ballistic
// final flight) with SP2C's body-organisation changes. SP2A's code and evidence are not modified; every change is applied here, to a copy.
//   C.tuck      the compact 3D tuck (sp2c_tuck.mjs) REACHED BEFORE the fold side meets the turf: from the plant push-off the fold hip adducts
//               slightly and rotates externally, the knee folds, the ankle plantarflexes / inverts so the boot continues the shin (studs away)
//   C.tuckT     time the tuck is reached (s after the plant touchdown; ground entry is ≈ 0.41 s)
//   C.entry     optional pre-commitment of the plant leg in the final stride (external rotation of the planted leg, °) — the authored final flight
//               carries it with C1 continuity from the run (flightPlan Hermites into the entry)
//   C.follow    the active follow-through (to C.tEnd): seat on the fold hip (pelvis pitch / roll objective through the fold hip while that leg
//               is on the turf), trunk counter-lean toward the tackling side, head up, the fold-side arm posting beside the hip, the tackling-side arm
//               balancing, the tackling leg extended then drawn in, and a sit-up recovery posture — posture only: no root or COM objective
//   C.auth      regional authority after the first legitimate fold-side contact (A7 schedule), held — not decayed to a limp floor; A6 regional
//               yielding / failure / whole-body fallback remain the only route to loss of control (obstruction, overpowering)
const FL = await import(new URL("../../sp2a/scripts/sp2a_flight.mjs", import.meta.url).href), AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
export const TUCK_C = { pitch: -27, roll: 18, hipFlex: 39, hipAbd: -9, hipRot: -40, knee: 141, ankDf: -40, ankInv: 19 };   // sp2c_tuck.mjs best (knee 141 / df −40: 1–2° inside its margins)
export const DEFAULT = { tuckT: 0.28, tEnd: 3.5, auth: { tackLeg: 0.75, trailLeg: 0.75, trunk: 0.8, armL: 0.75, armR: 0.7 }, seatKo: 260, seatPitch: -18, seatRoll: 26, trunkLat: -8, recline: -10, neck: 22,
  post: { shoulder_L: { flex: -25, abd: 70 }, elbow_L: { flex: 20 } }, armR: { shoulder_R: { flex: 55, abd: 35 }, elbow_R: { flex: 45 } }, tackHip: 64, tackKnee: 15, recoverT: 2.2, entryRot: 0 };
const ramp = (keys) => keys.map(([t, v]) => [+t.toFixed(4), +v.toFixed(3)]);
export function sp2cCand(speed, C0 = {}) { const C = { ...DEFAULT, ...C0, auth: { ...DEFAULT.auth, ...(C0.auth || {}) }, tuck: { ...TUCK_C, ...(C0.tuck || {}) } }, tk = C.tuck, T = C.tuckT, E = C.tEnd;
  const c = FL.tackleCand(speed, { id: C.id || "SP2C", contactAuth: { trigger: ["thigh_L", "shank_L", "pelvis"], delayS: 0.025, schedule: [[0, { tackLeg: 1, trailLeg: 1, trunk: 1, armL: 1, armR: 1 }], [0.15, C.auth], [9, C.auth]] } });
  const tr = c.chor.tracks, h0 = (k) => tr[k] ? tr[k][0][1] : 0;
  // 1) the fold leg: SP2's plant phase (t ≤ 0.05 s) kept, then straight into the compact tuck, reached by T and HELD (finite authority) through the slide
  tr["hip_L.flex"] = ramp([[0, h0("hip_L.flex")], [0.05, 22], [0.11, 22], [T, tk.hipFlex], [E, tk.hipFlex]]);
  tr["hip_L.abd"] = ramp([[0, h0("hip_L.abd")], [0.06, 3], [0.14, 0], [T, tk.hipAbd], [E, tk.hipAbd]]);
  tr["hip_L.rot"] = ramp([[0, h0("hip_L.rot") + C.entryRot], [0.08, -15 + C.entryRot * 0.5], [0.16, -30], [T, tk.hipRot], [E, tk.hipRot]]);
  tr["knee_L.flex"] = ramp([[0, h0("knee_L.flex")], [0.05, 32], [0.06, 60], [0.1, 90], [0.2, 130], [T, tk.knee], [E, tk.knee - 2]]);
  tr["ankle_L.df"] = ramp([[0, h0("ankle_L.df")], [0.04, 8], [0.12, -20], [T, tk.ankDf], [E, tk.ankDf]]);
  tr["ankle_L.inv"] = ramp([[0, h0("ankle_L.inv")], [0.11, 4], [T, tk.ankInv], [E, tk.ankInv]]);
  // 2) the tackling leg: SP2's drive and extension (kept to ~0.8 s), then controlled — extended low through the slide, drawn in for the recovery
  const R = C.recoverT; for (const [k, v1, v2] of [["hip_R.flex", C.tackHip, 55], ["knee_R.flex", C.tackKnee, 70]]) { const keep = (tr[k] || []).filter(([t]) => t <= 0.8); tr[k] = ramp([...keep, [1.1, v1], [R, v1], [R + 0.6, v2], [E, v2]]); }
  // 3) trunk / head: recline + counter-lean toward the tackling side (keeps the COM over the fold-side base), head up looking forward
  const keep = (k, t1 = 0.4) => (tr[k] || [[0, 0]]).filter(([t]) => t <= t1);
  tr["lumbar.flex"] = ramp([...keep("lumbar.flex"), [0.6, C.recline], [R, C.recline], [R + 0.6, 4], [E, 4]]); tr["lumbar.lat"] = ramp([...keep("lumbar.lat", 0.25), [0.5, C.trunkLat], [E, C.trunkLat]]);
  tr["thoracic.flex"] = ramp([...keep("thoracic.flex"), [0.6, -6], [R + 0.6, 2], [E, 2]]); tr["thoracic.lat"] = ramp([...keep("thoracic.lat", 0.25), [0.5, C.trunkLat * 0.5], [E, C.trunkLat * 0.5]]);
  tr["neck.flex"] = ramp([...keep("neck.flex", 0.2), [0.5, C.neck], [E, C.neck]]);
  // 4) arms: the fold-side arm reaches out / down to POST beside the hip before and through the landing; the tackling-side arm balances
  for (const [j, v] of Object.entries({ ...C.post, ...C.armR })) for (const [key, x] of Object.entries(v)) { const k = `${j}.${key}`, kp = (tr[k] || [[0, 0]]).filter(([t]) => t <= 0.12); tr[k] = ramp([...kp, [0.38, x], [E, x]]); }
  // 5) the seat objective (orientation through the fold hip while the fold leg is on the turf): reclined, rolled onto the fold hip, held to tEnd
  if (c.seat) c.seat = { ...c.seat, window: [0.3, E], gains: { ko: C.seatKo, do: C.seatKo * 0.14 }, pelvis: { pitch: [[0, 0], [0.45, C.seatPitch], [E, C.seatPitch]], roll: [[0, 0], [0.45, C.seatRoll], [E, C.seatRoll]], yaw: [[0, 0], [E, 0]] } };
  // the knee coupling (tackling knee from its hip) ends with SP2's window; the tracks run to tEnd (the run continues past the old 1.7 s timeline)
  c.sp2c = C; return c; }
// run (authored final flight → physics), with the temporary friction hook
export async function runSP2C(runin, C, steps = 1440, runOpts = {}) { const CL = await import(new URL("../../slide_phys1/scripts/sp_climits.mjs", import.meta.url).href);
  const RI = AA.loadRunIn(runin, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3), cand = sp2cCand(speed, C), plan = FL.flightPlan(RI, cand), c2 = { ...cand, entry: plan.entry };
  const o = await CL.auditRun(c2, { steps, ...runOpts }); o.contactRule = c2.soleRule; o.candId = c2.id; o.runIn = plan.frames; o.entrySpec = plan.entry; o.flight = { T: plan.T, nF: plan.nF, v0: plan.v0, vT: plan.vT, kTO: plan.kTO }; o.tOffset = 0; o.speedTackler = speed; o.sp2cOpts = cand.sp2c; return o; }

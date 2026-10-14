// SLIDE-PHYS-2 parameterised H structure (SP1's commit + bent-leg-first ground entry + slide organised from the fold side) and the SP2 Stage-1
// qualification objective (the brief's Phase-10 list as costs; a qualification measure, not a style score). Every parameter is a physically
// meaningful authoring / intent quantity. Used by sp2_search.mjs (CMA-ES, disclosed tool) and by the named SP2 candidates.
const CN = await import(new URL("./sp2_cand.mjs", import.meta.url).href), M = await import(new URL("./sp2_measures.mjs", import.meta.url).href);
const AU = await import(new URL("../../slide_phys1/scripts/sp_authority.mjs", import.meta.url).href), RT = await import(new URL("./sp2_ctrl.mjs", import.meta.url).href);
// controller configuration: "A5" = SLIDE-PHYS-1 (regional authority schedule + always-on tackling-leg yield + whole-body rms fallback);
// "A6" = SLIDE-PHYS-2 (the same regional authority schedule A4 + RegionalTracker: baseline-relative local yield, regional failure, whole-body fallback)
const TRAIL = new Set(["hip_L", "knee_L", "ankle_L"]), smooth = (t, a, b) => { const s = Math.max(0, Math.min(1, (t - a) / (b - a))); return s * s * (3 - 2 * s); };
export function finalize(cand, ctrl = "A6", regional = null) { if (ctrl === "A5") return AU.apply(cand, "A5");
  const c = AU.apply(cand, "A4"), p = cand.params || {}, base = AU.MODELS.A4.authority;
  const authority = p.trailYieldT != null ? (t, jn) => base(t, jn) * (TRAIL.has(jn) ? 1 + (p.trailYieldA - 1) * smooth(t, p.trailYieldT, p.trailYieldT + 0.08) : 1) : base;
  return { ...c, authority, yield: null, ragdoll: null, regional: regional || RT.DEFAULT_REG, makeCtrl: RT.makeCtrlRegional, authorityModel: "A6" }; }
export const PARAMS = [
  // the commit (plant support objective; SP1 values inside the ranges)
  ["plantK1", 1.2, 2.2], ["plantK2", 1.0, 1.8], ["plantEnd", 0.07, 0.14], ["plantPitch", -25, 2], ["lateral", 0, 3.5], ["plantRoll", 0, 16],
  // tackling leg: thigh drive peak / time, the knee held through the landing (coupling end value), when it extends, late thigh angle
  ["tackHip", 70, 100], ["tackHipT", 0.15, 0.30], ["tackKneeHold", 15, 60], ["tackKneeExtT", 0.4, 0.9], ["tackHipLate", 50, 90],
  // fold (trailing, bent) leg: how fast it folds back / under, its late posture
  ["foldKnee90T", 0.10, 0.25], ["foldKneeLate", 110, 145], ["foldHipLate", 30, 65], ["foldRot", -40, -10], ["foldAbd", 5, 45],
  // trunk recline and the posting arm
  ["recline", -30, 0], ["reclineT", 0.25, 0.7], ["postArm", -70, -20], ["postT", 0.15, 0.45],
  // seat objective (pelvis world orientation through the fold hip while the fold leg is on the turf)
  ["seatPitch", -30, 5], ["seatRoll", 0, 50], ["seatKo", 0, 800],
  // the sit-down (v4): after its knee lands the trailing leg stops holding the body up — its authority falls to trailYieldA from trailYieldT
  // (over 80 ms), so gravity lowers the pelvis onto the lateral thigh / hip (van den Eijnde 2017: knee impact, then the hip ≈ 0.1 s later)
  ["trailYieldT", 0.30, 0.60], ["trailYieldA", 0.15, 1.0]];
export const toPhys = (u) => Object.fromEntries(PARAMS.map(([k, lo, hi], i) => [k, lo, hi, i]).filter(([, , , i]) => i < u.length && Number.isFinite(u[i])).map(([k, lo, hi, i]) => [k, lo + (hi - lo) * Math.max(0, Math.min(1, u[i]))]));
export const toU = (p) => PARAMS.map(([k, lo, hi]) => p[k] == null ? 0.5 : (p[k] - lo) / (hi - lo));
export const START = { plantK1: 1.61, plantK2: 1.53, plantEnd: 0.091, plantPitch: -7.2, lateral: 3.5, plantRoll: 10.85, tackHip: 88, tackHipT: 0.22, tackKneeHold: 30, tackKneeExtT: 0.65, tackHipLate: 70,
  foldKnee90T: 0.16, foldKneeLate: 125, foldHipLate: 58, foldRot: -40, foldAbd: 15, recline: -20, reclineT: 0.5, postArm: -55, postT: 0.3, seatPitch: -15, seatRoll: 20, seatKo: 400 };
export function makeCand(p, speed = 5, id = "H") { const c = CN.base(speed), tr = c.chor.tracks;
  c.vfPlan = { ...c.vfPlan, window: [-0.05, p.plantEnd], kappa: [[Math.min(0.05, p.plantEnd - 0.01), p.plantK1], [p.plantEnd, p.plantK2]], lateral: p.lateral };
  c.pelvis = { pitch: [[0, 2], [p.plantEnd, p.plantPitch]], roll: [[0, 0], [p.plantEnd, p.plantRoll]], yaw: [[0, 0], [p.plantEnd, 4]] };
  const hT = p.tackHipT; tr["hip_R.flex"] = [[0, 0], [0.08, Math.min(35, p.tackHip)], [hT * 0.6, p.tackHip * 0.8], [hT, p.tackHip], [Math.max(hT + 0.05, p.tackKneeExtT), p.tackHip - 2], [1.0, p.tackHipLate], [1.7, p.tackHipLate - 5]];
  tr["knee_R.flex"] = [[0, 118], [0.08, 92], [0.16, Math.max(p.tackKneeHold, 55)], [0.26, p.tackKneeHold], [p.tackKneeExtT, p.tackKneeHold], [p.tackKneeExtT + 0.25, 10], [1.7, 10]];
  c.couple = [{ ...c.couple[0], map: [[38, 115], [(38 + p.tackHip * 0.8) / 2, 70], [p.tackHip * 0.8, p.tackKneeHold]], window: [0, Math.min(0.55, p.tackKneeExtT)] }];
  const k9 = p.foldKnee90T; tr["knee_L.flex"] = [[0, 22], [0.05, 32], [k9 * 0.6, 60], [k9, 90], [k9 + 0.1, p.foldKneeLate - 5], [k9 + 0.3, p.foldKneeLate], [1.7, p.foldKneeLate - 8]];
  tr["hip_L.flex"] = [[0, 30], [0.05, 22], [0.1, 20], [k9 + 0.05, p.foldHipLate * 0.75], [k9 + 0.2, p.foldHipLate], [1.7, p.foldHipLate - 5]];
  tr["hip_L.rot"] = [[0, 0], [0.08, p.foldRot * 0.4], [k9 + 0.05, p.foldRot], [1.7, p.foldRot * 0.85]]; tr["hip_L.abd"] = [[0, 3], [0.08, p.foldAbd * 0.4], [k9 + 0.05, p.foldAbd], [1.7, p.foldAbd * 0.8]];
  tr["lumbar.flex"] = [[0, 3], [0.12, 0], [p.reclineT, p.recline], [p.reclineT + 0.5, p.recline * 0.8], [1.7, p.recline * 0.5]];
  tr["shoulder_L.flex"] = [[0, -35], [0.12, -50], [p.postT, p.postArm], [1.7, p.postArm]]; tr["shoulder_L.abd"] = [[0, 12], [0.15, 25], [p.postT, 45]]; tr["elbow_L.flex"] = [[0, 95], [0.2, 35], [p.postT + 0.05, 8]];
  c.press = { ...c.press, window: [9, 9] };
  c.seat = { side: "L", window: [0.3, 1.7], ramp: 0.05, gains: { ko: p.seatKo, do: p.seatKo * 0.14 }, pelvis: { pitch: [[0, 0], [0.4, p.seatPitch], [1.7, p.seatPitch]], roll: [[0, 0], [0.4, p.seatRoll], [1.7, p.seatRoll + 3]], yaw: [[0, 0], [1.7, 0]] } };
  return { ...c, id, chor: { name: id, tracks: tr }, params: p }; }
// ── the SP2 Stage-1 qualification objective (v2, for search H2: thigh impact bounded like the pelvis; retention target 0.5; foldRot range kept off the −50° stop) ──
// v3 (14 Oct, from research/SLIDE2_LITERATURE.md): the knee only LANDS (van den Eijnde 2017: in contact during the impact only, ≈ 30 ms); the
// thigh / hip must take over within ≈ 0.15 s and carry the glide; whole slide (first contact → stop) 1.5–3.0 m at 4.5–5.5 m/s (μ 0.45, impact
// loss 0.8–1.5 m/s); knee impact ≤ 2.5 kN realistic (3.2 BW), ≤ 1.3 kN target.
export const LIMW = +(process.env.SP2_LIMW || 0.1);
export const OBJ = { slide: [1.5, 3.0], decel: [2.5, 7.0], kneeBW: 3.0, pelvisBW: 6.5, kneeGlideShare: 0.25, handOverS: 0.15 };
export function cost(m, climits) { const c = {}, g = m.groups, fold = ["shin_L", "knee_L", "thigh_L"], firstFold = Math.min(...fold.map(k => g[k] && g[k].first != null ? g[k].first : 9)), tb = g.tackBoot;
  const firstBodyGroup = (m.sequence.find(([k]) => !k.endsWith("Boot")) || [null])[0];
  c.bootFirst = tb && tb.first != null && tb.first < firstFold ? 3 : 0;                                         // the tackling boot must not land first
  c.bootLoad = 8 * Math.max(0, (tb ? tb.shareJn : 0) - 0.05) + 1.5 * Math.max(0, (tb ? tb.peak29msBW : 0) - 0.5);   // nor carry load (a light skim is allowed)
  c.firstRegion = fold.includes(firstBodyGroup) ? 0 : 2;                                                          // bent-leg side first
  c.knee = 1.0 * Math.max(0, (g.knee_L ? g.knee_L.peak29msBW : 0) - OBJ.kneeBW); c.pelvis = 0.5 * Math.max(0, (g.pelvis ? g.pelvis.peak29msBW : 0) - OBJ.pelvisBW) + 0.5 * Math.max(0, (g.thigh_L ? g.thigh_L.peak29msBW : 0) - OBJ.pelvisBW);
  c.faceDown = m.posture.minBellyY < -0.5 ? 3 + 3 * (-0.5 - m.posture.minBellyY) : 0; c.head = m.posture.headTurfT != null ? 2.5 : 0;
  c.torso = 4 * Math.max(0, (g.torso ? g.torso.shareJn : 0) - 0.1);
  c.slide = 1.5 * (Math.max(0, OBJ.slide[0] - m.slideDistM) + Math.max(0, m.slideDistM - OBJ.slide[1])); c.decel = 0.3 * (Math.max(0, OBJ.decel[0] - m.meanDecel) + Math.max(0, m.meanDecel - OBJ.decel[1]));
  c.entrySpeed = 1.0 * Math.max(0, 3.6 - (m.atFirstBody.vh ?? 0)); c.retention = 2 * Math.max(0, 0.5 - (m.retention["+0.2s"] ?? 0));   // 0.5: μ 0.5 friction for 0.2 s + the impact (μ·|v_y|) cost ≈ 2.3 of 4.8 m/s
  const gs = m.glideShare || {}, kneeG = (gs.knee_L || 0) + (gs.shin_L || 0), seatG = (gs.thigh_L || 0) + (gs.pelvis || 0);
  c.kneeGlide = 6 * Math.max(0, kneeG - OBJ.kneeGlideShare) + 3 * Math.max(0, 0.45 - seatG);                // the glide is carried by the thigh / hip, not the knee
  const tSeat = Math.min(g.thigh_L && g.thigh_L.first != null ? g.thigh_L.first : 9, g.pelvis && g.pelvis.first != null ? g.pelvis.first : 9);
  c.handOver = 4 * Math.max(0, Math.min(1, tSeat - firstFold - OBJ.handOverS));                              // knee → thigh / hip within 0.15 s
  c.lying = 3 * Math.max(0, (gs.arm || 0) + (gs.torso || 0) + (gs.head || 0) - 0.12);                    // v5: a slide, not lying on the side / back
  c.limits = climits ? LIMW * Object.values(climits).reduce((s, e) => s + e.max * (1 + Math.min(1, e.t / 0.2)), 0) : 0;   // v6: weight (default 0.1; search H6 0.3) × excess, doubled when it lasts ≥ 0.2 s
  c.total = Object.values(c).reduce((s, x) => s + x, 0); return c; }
export { M };

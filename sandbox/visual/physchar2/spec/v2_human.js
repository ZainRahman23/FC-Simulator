// ═══ physchar2/spec/v2_human.js — the HUMAN SPECIFICATION → normalised landmarks (V2-G0) ══════════════════════════════════════════════
// Pure, deterministic data + arithmetic (only + − × ÷ √; no Math.sin/cos/exp). Node and browser produce bit-identical numbers.
// Source of every value: review_artifacts/physical_character_v2/PHYSICAL_CHARACTER_V2_SPEC.md §10 (approved 2026-10-02) and its
// calculation calc/v2_anthro.py. Evidence tags: [H] human evidence, [ENG] engineering choice, [R] recalled (unverified).
//
// Canonical character space (CCS): +X = anatomical RIGHT, +Y = up, +Z = anatomical forward — a LEFT-HANDED triad (Unity numeric
// convention, identical to the existing Touchline data). Metres, kilograms, seconds, radians. Ground = stud-tip plane y = 0.

// de Leva (1996) J Biomech 29:1223, Table 4, MALE: mass % of body mass, mean segment length (mm; sample 1.741 m / 73.0 kg), COM % from the
// listed proximal endpoint, radii of gyration % of length about [AP (sagittal r), ML (transverse r), longitudinal]. [H]
export const DE_LEVA = {
  head:     { m: 6.94,  L: 242.9, cm: 50.02, r: [30.3, 31.5, 26.1], ends: "VERT → CERV (C7)" },
  UPT:      { m: 15.96, L: 170.7, cm: 29.99, r: [71.6, 45.4, 65.9], ends: "SUPR → XYPH" },
  MPT:      { m: 16.33, L: 215.5, cm: 45.02, r: [48.2, 38.3, 46.8], ends: "XYPH → OMPH" },
  LPT:      { m: 11.17, L: 145.7, cm: 61.15, r: [61.5, 55.1, 58.7], ends: "OMPH → MIDH" },
  upperArm: { m: 2.71,  L: 281.7, cm: 57.72, r: [28.5, 26.9, 15.8], ends: "SJC → EJC" },
  forearm:  { m: 1.62,  L: 268.9, cm: 45.74, r: [27.6, 26.5, 12.1], ends: "EJC → WJC" },
  hand:     { m: 0.61,  L: 86.2,  cm: 79.00, r: [62.8, 51.3, 40.1], ends: "WJC → MET3" },
  thigh:    { m: 14.16, L: 422.2, cm: 40.95, r: [32.9, 32.9, 14.9], ends: "HJC → KJC" },
  shank:    { m: 4.33,  L: 440.3, cm: 43.95, r: [25.1, 24.6, 10.2], ends: "KJC → AJC (de Leva alternative row)" },
  foot:     { m: 1.37,  L: 258.1, cm: 44.15, r: [25.7, 24.5, 12.4], ends: "HEEL → TTIP" },
};
export const DE_LEVA_H0 = 1.741;
export const DE_LEVA_TRUNK_CERV_MIDH_MM = 603.3;   // de Leva CERV → MIDH (stature-closure check only)

// V2 population profile: fractions of BAREFOOT stature H unless noted (spec §10.2). Every row is a generator parameter.
export const PROFILE = {
  ankleH: 0.039,        // AJC height, barefoot [H] Drillis & Contini 0.039 H; de Leva AJC = sphyrion − 12.6 mm; ANSUR II LMAL 0.0415 H
  kneeH: 0.280,         // KJC height [H] ANSUR II lateral femoral epicondyle 492 / 1756 mm
  hipH: 0.515,          // HJC height [H] ANSUR II trochanterion 901 / 1756 mm + de Leva HJC 3.2 mm above trochanterion
  hipHalf: 0.050,       // HJC half-spacing [H] Bell / Harrington with de Leva bispinous breadth → 183–184 mm; Hara 2016 171–179 mm
  shoulderHalf: 0.109,  // GH centre half-spacing [H]+[ENG] ANSUR II biacromial 0.231 H (footballer-sized subset) / 2 − ≈1.2 cm
  sjcH: 0.798,          // SJC height [H] acromion 0.818–0.821 H − de Leva 34.5 mm (scaled)
  headJointH: 0.924,    // atlanto-occipital (render `head` bone) [ENG] between eye 0.936 H and chin 0.870 H (Drillis)
  headJointAP: -0.0055, // [ENG]
  footLen: 0.153,       // barefoot foot length [H] Drillis 0.152; ANSUR II 0.1544; ANSUR footballer-sized subset 0.1525
  footBreadth: 0.0575,  // ball breadth = 0.376 FL [H] ANSUR II
  heelBreadth: 0.041,   // heel breadth = 0.268 FL [H] ANSUR II
  ankleFromHeel: 0.22,  // AJC from the heel, fraction of FL [H] range 0.18–0.24, [ENG] pick
  mtp1FromHeel: 0.741,  // first MTP [H] ANSUR II ball-of-foot length; Thompson 2019 0.70–0.79
  mtp5FromHeel: 0.63,   // fifth MTP [R] Hawes & Sovak
  mtpHeight: 0.065,     // MTP joint height above the plantar surface, fraction of FL [ENG] (render toe bone)
  spineAP: { lumbar: -0.017, thoracic: -0.022, cervical: -0.017 },   // spinal joint centres posterior of the segment COM line [ENG]
  claviclePos: { x: 0.011, z: 0.047 },  // sternoclavicular joint (render clavicle origin) [ENG]
  // surface breadths / depths (collider geometry) [H] unless noted
  hipBreadth: 0.190, abdomenBreadth: 0.155, waistDepth: 0.119, chestBreadth: 0.165, chestDepth: 0.131, pelvisDepth: 0.125,
  bideltoid: 0.291, headLength: 0.114, headBreadth: 0.088,
  // variation hooks (1.0 = population profile). Lengths are renormalised so the stature stays exact.
  legScale: 1.0, armScale: 1.0, build: 1.0,
};
export const PROFILE_EVIDENCE = {
  ankleH: "[H] Drillis & Contini 0.039 H; de Leva AJC = sphyrion − 12.6 mm; ANSUR II lateral malleolus 0.0415 H",
  kneeH: "[H] ANSUR II lateral femoral epicondyle height 492 / 1756 mm",
  hipH: "[H] ANSUR II trochanterion 901 / 1756 mm; de Leva HJC = trochanterion + 3.2 mm",
  hipHalf: "[H] Bell / Harrington (de Leva bispinous 255.7 mm) → 183–184 mm; Hara 2016 171–179 mm; Bardakos 90.6 mm per side",
  shoulderHalf: "[H]+[ENG] ANSUR II biacromial 0.231 H (footballer-sized subset) / 2 minus ≈1.2 cm acromion-edge → GH-centre offset",
  sjcH: "[H] acromion 0.818–0.821 H (Drillis / ANSUR II) − de Leva SJC 34.5 mm below the acromion",
  headJointH: "[ENG] between eye 0.936 H and chin 0.870 H (Drillis)",
  footLen: "[H] Drillis 0.152; ANSUR II 0.1544; ANSUR footballer-sized subset 0.1525",
  footBreadth: "[H] ANSUR II ball breadth 0.376 × foot length", heelBreadth: "[H] ANSUR II heel breadth 0.268 × foot length",
  ankleFromHeel: "[H] range 0.18–0.24 FL (Papachatzis 2023, Baxter 2012, Salami 2020); [ENG] pick 0.22",
  mtp1FromHeel: "[H] ANSUR II ball-of-foot length 0.741 FL; Thompson 2019 0.70–0.79", mtp5FromHeel: "[R] Hawes & Sovak ≈0.63 FL",
  spineAP: "[ENG] gravity line anterior of the lumbar spine (qualitative); Dumas 2007 frames differ",
  hipBreadth: "[H] Drillis 0.191; ANSUR II 0.197", chestDepth: "[H] ANSUR II footballer-sized subset 237 mm", waistDepth: "[H] ANSUR II subset 215 mm",
  chestBreadth: "[ENG] < Drillis external chest 0.174 H", abdomenBreadth: "[ENG] arm clearance at 6° abduction", pelvisDepth: "[ENG]",
  bideltoid: "[H] ANSUR II 510 mm", headLength: "[H] ANSUR II 199.5 mm", headBreadth: "[H] ANSUR II 154.3 mm",
};
// equipment worn in play (body mass M is measured without boots) — [H] boots 160–250 g, FG studs 12 mm (Loud 2024); rest [ENG]
export const EQUIP = { boot: 0.20, shinPad: 0.08, kitUpper: 0.20, kitLower: 0.15, soleStack: 0.020, bootToe: 0.010, bootHeel: 0.005, bootWidthAdd: 0.008, toeSpring: 0.012 };

// V2-REF: professional male outfield player (CIES 2022 182.3 cm; WC2018 182.4 cm / 77.2 kg; EPL DXA 182.7 cm / 78.9 kg) — approved D1
export const V2_REF = Object.freeze({ id: "V2-REF", H: 1.82, M: 78.0, kind: "population" });
export const V1_MATCHED = Object.freeze({ id: "V1-matched", H: 1.90, M: 78.0, kind: "population" });
// G0 variation set (spec §17): topology must be identical for every body.
// kind (spec §22 0.12 as amended 2026-10-02, decision C2):
//   "population"         — normally proportioned population / reference bodies: population COM and inertia bands APPLY;
//   "morphology-variant" — deliberately extreme morphology / stress tests (±2 SD leg length): population bands do NOT apply; they must pass
//                          their own internal-consistency checks (requested morphology, mass, segment allocation, COM / inertia calculation,
//                          bilateral geometry, valid joints / colliders, deterministic construction).
export const VARIATION_SET = [
  { id: "V2-165-62", H: 1.65, M: 62, kind: "population" }, { id: "V2-175-70", H: 1.75, M: 70, kind: "population" }, { id: "V2-REF", H: 1.82, M: 78, kind: "population" },
  { id: "V2-190-85", H: 1.90, M: 85, kind: "population" }, { id: "V2-198-92", H: 1.98, M: 92, kind: "population" },
  { id: "V2-long-legs", H: 1.82, M: 78, overrides: { legScale: 1.05 }, kind: "morphology-variant" }, { id: "V2-short-legs", H: 1.82, M: 78, overrides: { legScale: 0.95 }, kind: "morphology-variant" },
  { id: "V1-matched", H: 1.90, M: 78, kind: "population" },
];

// ── generator: human specification → landmarks (CCS heights include the boot sole stack) ─────────────────────────────────────────
// legScale ≠ 1 changes the leg (hip / knee heights) and refits the trunk between the hip and C7 so the stature stays exact.
export function humanLandmarks(human) {
  const H = human.H, M = human.M, P = Object.assign({}, PROFILE, human.overrides || {}), E = EQUIP, sole = E.soleStack;
  const len = (seg) => DE_LEVA[seg].L / 1000 / DE_LEVA_H0 * H;
  const Ls = {}; for (const s of Object.keys(DE_LEVA)) Ls[s] = len(s);
  const hipH = P.ankleH + (P.hipH - P.ankleH) * P.legScale, kneeH = P.ankleH + (P.kneeH - P.ankleH) * P.legScale;
  Ls.shank = (kneeH - P.ankleH) * H; Ls.thigh = (hipH - kneeH) * H;
  Ls.upperArm *= P.armScale; Ls.forearm *= P.armScale; Ls.hand *= P.armScale;
  // trunk refit (identity at legScale = 1): the de Leva trunk lengths stacked on the hip, scaled so C7 stays at 1 − head fraction
  if (P.legScale !== 1) {
    const gap0 = (1 - DE_LEVA.head.L / 1000 / DE_LEVA_H0) - (PROFILE.hipH + (DE_LEVA.LPT.L + DE_LEVA.MPT.L + DE_LEVA.UPT.L) / 1000 / DE_LEVA_H0);
    const k = ((1 - DE_LEVA.head.L / 1000 / DE_LEVA_H0) - hipH - gap0) / ((DE_LEVA.LPT.L + DE_LEVA.MPT.L + DE_LEVA.UPT.L) / 1000 / DE_LEVA_H0);
    Ls.LPT *= k; Ls.MPT *= k; Ls.UPT *= k;
  }
  const yA = P.ankleH * H + sole, yK = yA + Ls.shank, yH = yK + Ls.thigh;
  const yOMPH = yH + Ls.LPT, yXYPH = yOMPH + Ls.MPT, ySUPR = yXYPH + Ls.UPT, yVERT = H + sole, yCERV = yVERT - Ls.head;
  const ySJC = P.sjcH * H + sole, hx = P.hipHalf * H, sx = P.shoulderHalf * H, fl = P.footLen * H;
  const closure = (yH - sole) + DE_LEVA_TRUNK_CERV_MIDH_MM / 1000 / DE_LEVA_H0 * H + Ls.head - H;   // ≈ +1.9 mm at V2-REF
  return { H, M, P, E, sole, Ls, yA, yK, yH, yOMPH, yXYPH, ySUPR, yVERT, yCERV, ySJC, hx, sx, fl,
    ap: { lumbar: P.spineAP.lumbar * H, thoracic: P.spineAP.thoracic * H, cervical: P.spineAP.cervical * H },
    s: H / V2_REF.H,                                                              // ENG geometric offsets are authored at V2-REF and scale with H
    closure, legLen: yH - yA };
}

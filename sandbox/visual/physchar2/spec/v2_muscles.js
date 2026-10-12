// ═══ physchar2/spec/v2_muscles.js — the CANONICAL V2 muscle force path (M1b, adopted 2026-10-12): data + pure lookups ═══════════════════════
// Owner decision 2026-10-12 (sources/2026-10-12_user_instruction_overnight_m1b_adoption_balance1.md): the character-owned force path is
//   controller excitation u± → electrochemical delay → activation a± (15 / 50 ms, the Ca²⁺ stage) → developed force f± (contraction dynamics)
//   → intrinsic / elastic muscle mechanics → physical joint torque → articulated body.
// Qualified in MUSCLE-1 (review_artifacts/physical_character_v2/muscle1: M1b, ankle 16/16, knee 14/14). This file holds the constants with their
// provenance labels: [M] measured human value · [E] derived from measured values · [MODEL] model parameter · [D] design assumption ·
// [SENS] preregistered sensitivity range where evidence is insufficient (central value used, low / high recorded for sensitivity runs).
// NO SILENT GENERALIZATION: a muscle group without an entry here throws (muscleGroup()), so ankle / knee constants can never leak to the hip,
// trunk or neck by default.
import { ACTIVATION, CAP_OF_JOINT } from "./v2_actuators.js";

export const FORCE_PATH = Object.freeze({
  electrochemicalDelay: { ms: 6.05, steps240: 2, label: "[M]→[D]", src: "Nordez et al. 2009 J Appl Physiol 106:1970 (PMID 19359617): medial gastrocnemius fascicle-motion onset 6.05 ± 0.64 ms after EMG onset; rounded UP to whole 240 Hz steps (never faster than human)" },
  activation: { tauActMs: ACTIVATION.tauAct * 1000, tauDeactMs: ACTIVATION.tauDeact * 1000, label: "[MODEL]", src: "Thelen 2003, kept as the activation (Ca²⁺) stage only" },
  contraction: "first-order developed-force lag f ← a + (f − a)·exp(−dt/τc), τc = τc,rise while a > f, τc,fall while a < f (per muscle group, MUSCLE_GROUPS)",
  qualification: "MUSCLE-1 M1b (muscle1/MUSCLE1_REPORT.md; evidence/MUSCLE1B_VERDICT.json)" });

// contraction lags per muscle group: τc,rise / τc,fall (ms), inverted on the 240 Hz cascade (activation 15 / 50 ms → developed force) from the human
// step-drive 10–90 % torque rise and 90–10 % relaxation targets (muscle1/scripts/m1_design_derive.mjs). Keys: "<capacity family>.<capacity direction>".
const G = (tauRiseMs, tauFallMs, label, targets, src, range = null) => Object.freeze({ tauRiseMs, tauFallMs, label, targets, src, range });
export const MUSCLE_GROUPS = Object.freeze({
  "ankle.plantarflexion": G(146.7, 54.2, "[E]", { rise10_90ms: 325, fall90_10ms: 175 }, "MUSCLE-1: FORCE_PRODUCTION_LITERATURE §9/§12.2 plantarflexors (rise 250–450, fall 120–250 ms)"),
  "ankle.dorsiflexion": G(88.8, 95.3, "[E]", { rise10_90ms: 200, fall90_10ms: 250 }, "MUSCLE-1: dorsiflexors (rise 150–250, fall 230–360 ms; fall weak)"),
  "knee.extension": G(88.8, 45.3, "[E]", { rise10_90ms: 200, fall90_10ms: 160 }, "MUSCLE-1: knee extensors (rise 165–235, fall 120–200 ms)"),
  "knee.flexion": G(88.8, 45.3, "[D]", { rise10_90ms: 200, fall90_10ms: 160 }, "MUSCLE-1: knee flexors — no human step-drive data; knee-extensor values borrowed (labelled). BALANCE-1 literature §19.1 refines to 107.4 / 45.3 [E low] (Kozinc 2021): run as a SENSITIVITY value, canonical unchanged so the MUSCLE-1 qualification stands", { tauRiseMs: [88.8, 135.2], tauFallMs: [17.1, 68.5] }),
  // ── BALANCE-1 additions (2026-10-12): balance1/research/BALANCE_MUSCLE_AND_BENCHMARK_LITERATURE.md §19.1; τc inverted on this cascade by
  //    balance1/scripts/b1_groups_derive.mjs (evidence/MUSCLE_GROUPS_DERIVED.json). range = preregistered sensitivity span [low, high] of τc. ──
  "hip.abduction": G(125.9, 54.2, "rise [E] low–moderate · fall [SENS]", { rise10_90ms: 280, fall90_10ms: 175 }, "voluntary RTD 4 data sets 186–338 ms, same-protocol calibrated; NO hip relaxation data (fall = median adopted lower-limb fall)", { tauRiseMs: [88.8, 181.1], tauFallMs: [17.1, 95.3] }),
  "hip.adduction": G(125.9, 54.2, "rise [E] low–moderate · fall [SENS]", { rise10_90ms: 280, fall90_10ms: 175 }, "as abductors (198–325 ms); fall no data", { tauRiseMs: [88.8, 181.1], tauFallMs: [17.1, 95.3] }),
  "hip.extension": G(135.2, 54.2, "rise [E] low · fall [SENS]", { rise10_90ms: 300, fall90_10ms: 175 }, "voluntary RTD 228–338 ms; fall no data", { tauRiseMs: [98.1, 181.1], tauFallMs: [17.1, 95.3] }),
  "hip.flexion": G(135.2, 54.2, "rise [E] low · fall [SENS]", { rise10_90ms: 300, fall90_10ms: 175 }, "voluntary RTD 249–301 ms; fall no data", { tauRiseMs: [98.1, 181.1], tauFallMs: [17.1, 95.3] }),
  "hip.internal rotation": G(135.2, 54.2, "[D]", { rise10_90ms: 300, fall90_10ms: 175 }, "NO hip-rotation data: hip flexor/extensor envelope, labelled assumption (posture axis only; no balance task)", { tauRiseMs: [98.1, 181.1], tauFallMs: [17.1, 95.3] }),
  "hip.external rotation": G(135.2, 54.2, "[D]", { rise10_90ms: 300, fall90_10ms: 175 }, "NO hip-rotation data: hip flexor/extensor envelope, labelled assumption (posture axis only)", { tauRiseMs: [98.1, 181.1], tauFallMs: [17.1, 95.3] }),
  "knee.tibial internal rotation": G(107.4, 45.3, "[D]", { rise10_90ms: 240, fall90_10ms: 160 }, "NO data: hamstring / popliteus side = knee-flexor refinement, labelled assumption (posture axis only)", { tauRiseMs: [88.8, 135.2], tauFallMs: [17.1, 68.5] }),
  "knee.tibial external rotation": G(107.4, 45.3, "[D]", { rise10_90ms: 240, fall90_10ms: 160 }, "NO data: as tibial internal rotation, labelled assumption (posture axis only)", { tauRiseMs: [88.8, 135.2], tauFallMs: [17.1, 68.5] }),
  "ankle.inversion": G(135.2, 68.5, "[SENS]", { rise10_90ms: 300, fall90_10ms: 200 }, "NO timing data for tibialis posterior; frontal-plane ankle envelope", { tauRiseMs: [88.8, 204], tauFallMs: [17.1, 120.9] }),
  "ankle.eversion": G(135.2, 68.5, "[SENS]", { rise10_90ms: 300, fall90_10ms: 200 }, "reflex-driven eversion torque 284–404 ms (weak); no relaxation data", { tauRiseMs: [88.8, 204], tauFallMs: [17.1, 120.9] }),
  "trunk.extension": G(144.4, 68.5, "[SENS]", { rise10_90ms: 320, fall90_10ms: 200 }, "conflicting indicators (fibre type, EMG→force shifts, RFD/PF vs hip/trunk fits, ballistic TPT); no relaxation data", { tauRiseMs: [88.8, 226.9], tauFallMs: [17.1, 120.9] }),
  "trunk.flexion": G(135.2, 68.5, "[SENS]", { rise10_90ms: 300, fall90_10ms: 200 }, "fibre type only ('flexors faster than extensors'); no RTD / relaxation", { tauRiseMs: [88.8, 204], tauFallMs: [17.1, 120.9] }),
  "trunk.right lateral bend": G(135.2, 68.5, "[SENS]", { rise10_90ms: 300, fall90_10ms: 200 }, "no group-specific data (same muscles as flexors / extensors)", { tauRiseMs: [88.8, 204], tauFallMs: [17.1, 120.9] }),
  "trunk.left lateral bend": G(135.2, 68.5, "[SENS]", { rise10_90ms: 300, fall90_10ms: 200 }, "no group-specific data", { tauRiseMs: [88.8, 204], tauFallMs: [17.1, 120.9] }),
  "trunk.right axial rotation": G(135.2, 68.5, "[SENS]", { rise10_90ms: 300, fall90_10ms: 200 }, "no data", { tauRiseMs: [88.8, 204], tauFallMs: [17.1, 120.9] }),
  "trunk.left axial rotation": G(135.2, 68.5, "[SENS]", { rise10_90ms: 300, fall90_10ms: 200 }, "no data", { tauRiseMs: [88.8, 204], tauFallMs: [17.1, 120.9] }),
  "neck.flexion": G(107.4, 79.4, "rise [E] moderate · fall [SENS]", { rise10_90ms: 240, fall90_10ms: 220 }, "3 voluntary data sets 187–296 ms (no direction separable); fall from one SCM twitch-relaxation abstract", { tauRiseMs: [79.5, 135.2], tauFallMs: [39, 120.9] }),
  "neck.extension": G(107.4, 79.4, "rise [E] moderate · fall [SENS]", { rise10_90ms: 240, fall90_10ms: 220 }, "as neck flexion", { tauRiseMs: [79.5, 135.2], tauFallMs: [39, 120.9] }),
  "neck.right lateral bend": G(107.4, 79.4, "rise [E] moderate · fall [SENS]", { rise10_90ms: 240, fall90_10ms: 220 }, "as neck flexion", { tauRiseMs: [79.5, 135.2], tauFallMs: [39, 120.9] }),
  "neck.left lateral bend": G(107.4, 79.4, "rise [E] moderate · fall [SENS]", { rise10_90ms: 240, fall90_10ms: 220 }, "as neck flexion", { tauRiseMs: [79.5, 135.2], tauFallMs: [39, 120.9] }),
  "neck.right axial rotation": G(107.4, 79.4, "[D]", { rise10_90ms: 240, fall90_10ms: 220 }, "no rotation data: neck envelope, labelled assumption (posture axis only)", { tauRiseMs: [79.5, 135.2], tauFallMs: [39, 120.9] }),
  "neck.left axial rotation": G(107.4, 79.4, "[D]", { rise10_90ms: 240, fall90_10ms: 220 }, "no rotation data: neck envelope, labelled assumption (posture axis only)", { tauRiseMs: [79.5, 135.2], tauFallMs: [39, 120.9] }),
  "shoulder.flexion": G(98.1, 39, "[SENS]", { rise10_90ms: 220, fall90_10ms: 150 }, "no deltoid torque twitch; elbow values widened", { tauRiseMs: [65.4, 135.2], tauFallMs: [2.7, 79.4] }),
  "shoulder.extension": G(98.1, 39, "[SENS]", { rise10_90ms: 220, fall90_10ms: 150 }, "as shoulder flexion", { tauRiseMs: [65.4, 135.2], tauFallMs: [2.7, 79.4] }),
  "shoulder.abduction": G(98.1, 39, "[SENS]", { rise10_90ms: 220, fall90_10ms: 150 }, "as shoulder flexion", { tauRiseMs: [65.4, 135.2], tauFallMs: [2.7, 79.4] }),
  "shoulder.adduction": G(98.1, 39, "[SENS]", { rise10_90ms: 220, fall90_10ms: 150 }, "as shoulder flexion", { tauRiseMs: [65.4, 135.2], tauFallMs: [2.7, 79.4] }),
  "shoulder.internal rotation": G(98.1, 39, "[SENS]", { rise10_90ms: 220, fall90_10ms: 150 }, "as shoulder flexion", { tauRiseMs: [65.4, 135.2], tauFallMs: [2.7, 79.4] }),
  "shoulder.external rotation": G(98.1, 39, "[SENS]", { rise10_90ms: 220, fall90_10ms: 150 }, "as shoulder flexion", { tauRiseMs: [65.4, 135.2], tauFallMs: [2.7, 79.4] }),
  "elbow.flexion": G(93.5, 25.4, "[E] moderate", { rise10_90ms: 210, fall90_10ms: 130 }, "twitch TPT 41–71 / HRT 37–63 ms; voluntary 214–229 ms", { tauRiseMs: [65.4, 112.1], tauFallMs: [2.7, 57.1] }),
  "elbow.extension": G(102.8, 32.5, "[E] low", { rise10_90ms: 230, fall90_10ms: 140 }, "triceps twitch × adopted-group calibration", { tauRiseMs: [84.2, 130.5], tauFallMs: [11.8, 57.1] }),
  "elbow.pronation": G(93.5, 25.4, "[D]", { rise10_90ms: 210, fall90_10ms: 130 }, "no forearm-rotator data: elbow-flexor values, labelled assumption (posture axis only)", { tauRiseMs: [65.4, 112.1], tauFallMs: [2.7, 57.1] }),
  "elbow.supination": G(93.5, 25.4, "[D]", { rise10_90ms: 210, fall90_10ms: 130 }, "no forearm-rotator data: elbow-flexor values, labelled assumption (posture axis only)", { tauRiseMs: [65.4, 112.1], tauFallMs: [2.7, 57.1] }),
});
// lookups (strict). Preregistered sensitivity values, or explicitly LABELLED values for a group without canonical data, are passed to the
// muscle layer as opts.groupOverrides (sim/v2_muscle.js axisDescriptor) — never added here silently.
export function muscleGroup(family, dirName) { const k = `${family}.${dirName}`, g = MUSCLE_GROUPS[k]; if (!g) throw new Error(`unparameterized muscle group "${k}" — no silent generalization (v2_muscles.js)`); return g; }
export function hasMuscleGroup(family, dirName) { return !!MUSCLE_GROUPS[`${family}.${dirName}`]; }
export const capFamilyOf = (jointName) => CAP_OF_JOINT[jointName.replace(/_[LR]$/, "")];

// intrinsic (short-range) mechanics: K = Σ± (e± − 1)·f±·capIso±(θ)/θ_y on DEVELOPED force; damping D = 2ζ√(K_tot·I) (PPR-1 / PPR-2 / PPR-3 S2)
export const SHORT_RANGE = Object.freeze({ thetaYdeg: Object.freeze({ ankle: 0.9673617406041296, knee: 1, hip: 1, lumbar: 3, thoracic: 3, neck: 2, shoulder: 2.2, elbow: 2 }), zeta: 0.2,
  src: "PPR-1 θ_y (ankle from Vlutters 2015; others [D]); ζ 0.2 (PPR-3 review ranges); stiffness on developed force (Hunter & Kearney 1983; Kirsch & Rymer 1992) — MUSCLE-1" });
// C — history-consistent strain arms (MUSCLE-1 redesign of PPR-3's C): arm FORCES, incremental loading w_j·K·Δe, relaxation at constant length,
// detachment ∝ fall of developed force, attachment unstrained, yield at R⁺ + R⁻ (R± = (e± − 1)·f±·capIso±)
export const STRAIN_ARMS = Object.freeze({ fRes: 0.15, wS: 0.30, tauS: 0.5, wF: 0.55, tauF: 0.02, src: "ECCENTRIC_PERSISTENCE_DAMPING_LITERATURE §recommendation (central); energy-consistent law MUSCLE-1 (BC1/BC2)" });
// B — mid-range passive elasticity about the anatomical slack angle (PPR-2 / PPR-3 S2). Literature-supported; NOT shown necessary (PPR-3 ablation 18/18 without B)
export const PASSIVE_B = Object.freeze({ "ankle.df": { k: 46, slackDeg: 0 }, "knee.flex": { k: 17, slackDeg: 14 }, "hip.flex": { k: 19, slackDeg: 26.8 }, "lumbar.flex": { k: 10, slackDeg: 0 }, "neck.flex": { k: 1.6, slackDeg: 0 }, "neck.lat": { k: 2.4, slackDeg: 0 },
  label: "[M]/[E] Loram 2007a; Riener & Edrich 1999; Liu 2024 (PPR-2 literature); necessity not demonstrated (PPR-3)" });
// T — standing tone: activation floors per anatomical muscle group (EMG %MVC ≈ activation), ready-stance mid (PPR-3 STANDING_TONE review). A NEURAL setting
// used by controllers when they allocate excitation (not a body property). pos / neg = muscles producing the ANATOMICAL positive / negative direction.
export const TONE_T = Object.freeze({ "ankle.df": { pos: 0.01, neg: 0.07 }, "ankle.inv": { pos: 0.02, neg: 0.04 }, "knee.flex": { pos: 0.03, neg: 0.085 }, "knee.rot": { pos: 0.03, neg: 0.03 }, "hip.flex": { pos: 0.03, neg: 0.05 }, "hip.abd": { pos: 0.04, neg: 0.03 }, "hip.rot": { pos: 0.03, neg: 0.03 },
  "lumbar.flex": { pos: 0.025, neg: 0.07 }, "lumbar.lat": { pos: 0.06, neg: 0.06 }, "lumbar.rot": { pos: 0.04, neg: 0.04 }, "thoracic.flex": { pos: 0.025, neg: 0.05 }, "thoracic.lat": { pos: 0.06, neg: 0.06 }, "thoracic.rot": { pos: 0.04, neg: 0.04 },
  "neck.flex": { pos: 0.02, neg: 0.05 }, "neck.lat": { pos: 0.04, neg: 0.04 }, "neck.rot": { pos: 0.04, neg: 0.04 }, default: 0.02, src: "PPR-3 S2 (ready-stance mid; STANDING_TONE_LITERATURE §2)" });

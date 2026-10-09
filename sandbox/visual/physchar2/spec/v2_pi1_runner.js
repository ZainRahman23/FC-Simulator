// ═══ physchar2/spec/v2_pi1_runner.js — PI-1 V2 RUNNER BODY (D-1; review_artifacts/physical_character_v2/pi1/PI1_PREREGISTRATION.md §4, frozen 6ef7e1e) ═══
// A V2 body generated from the simulation runner's record (assets/characters/outfield/vinicius/rig.json at f5f6076): 1.76 m, 73 kg body mass, the
// record's leg (ankle / knee / hip joint heights → thigh 0.43493, shank 0.39869 m), hip-joint spacing (± 0.15250 m), shoulder joints (± 0.24699 m at
// 1.45883 m) and shoulder → wrist chain (0.58883 m). V2 height convention: y (stud-tip ground) = fraction · H + 0.020 m sole stack. Everything else is
// the unchanged V2 generator. NOT tuned for any tackle. kind "morphology-variant": the record's hip spacing is not a population value.
import { generateSpec } from "./v2_spec.js";
import { setAnkleNeutralKOverride } from "./v2_joints.js";
export const PI1_RUNNER = Object.freeze({ id: "PI1-runner-vinicius", H: 1.76, M: 73.0, kind: "morphology-variant",
  overrides: Object.freeze({ ankleH: 0.0386364, kneeH: 0.2651623, hipH: 0.5122814, hipHalf: 0.0866456, shoulderHalf: 0.1403375, sjcH: 0.8175175, armScale: 1.0578941 }),
  record: "assets/characters/outfield/vinicius/rig.json @ f5f6076 (identity 176 cm / 73 kg)" });
// the accepted E1a / SLP configuration: ankle neutral K 0.13 (v2k knee is selected by the passive options / env, as in SLP)
export const pi1RunnerSpec = () => { setAnkleNeutralKOverride(0.13); return generateSpec(PI1_RUNNER); };
// D-1F1 (CORRECTION_DESIGN_FROZEN.md §2, 7c090de): the same runner with the V2-F1 toe body; boot heel / tip and the MTP hinge from the record
// (rig.json footwear min / max z, toe bone bind origin), forefoot mass fraction / MTP range / passive stiffness from V2 spec §12.3
export const PI1_RUNNER_F1 = Object.freeze({ ...PI1_RUNNER, id: "PI1-runner-vinicius-F1", f1: Object.freeze({ heelBehindAJC: 0.08076356756756757, tipAheadAJC: 0.2751943783783784,
  mtpAheadAJC: 0.1805, mtpAboveStud: 0.030999999999999972, forefootMassFrac: 0.165, neutralKPerDeg: 0.75, dfActive: Object.freeze([-30, 60]), dfHard: Object.freeze([-35, 70]), centreDeg: 15 }) });
export const pi1RunnerF1Spec = () => { setAnkleNeutralKOverride(0.13); return generateSpec(PI1_RUNNER_F1); };

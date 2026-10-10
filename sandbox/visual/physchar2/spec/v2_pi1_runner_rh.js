// ═══ physchar2/spec/v2_pi1_runner_rh.js — RECORD-HINGED V2 RUNNER (RH1): a NEW versioned body spec; the PI-1 runner (v2_pi1_runner.js) is unchanged ═══
// Preregistration: review_artifacts/physical_character_v2/record_hinged/RH1_PREREG.md (frozen 50eae23a); user decision D1 (084f736d).
// = PI1_RUNNER (H 1.76 m, M 73 kg, every record override, ankle neutral K 0.13) + three joint centres from the runner record
// (assets/characters/outfield/vinicius/rig.json, blob 6ca64389; its bind frame coincides with V2's canonical frame: hip midpoints at
// (0, 0.921615, 0)):
//   lumbar   = rig spine.bindOrigin  (0, 1.029058, 0)      [V2 population value (0, 1.068905, −0.029920)]
//   thoracic = rig chest.bindOrigin  (0, 1.243945, 0)      [(0, 1.286757, −0.038720)]
//   elbow    = the unchanged shoulder (∓0.246994, 1.458831, 0) + the record's upper-arm length |foreArm − upperArm| = 0.312818 m along the
//              canonical arm axis → (∓0.559812, 1.458831, 0)  [(∓0.548255, …)]; shoulder → wrist stays 0.588833 m
// Hinge-only (spec/v2_hinges.js): masses, COMs, inertias, colliders, frames, ranges, passive parameters, capacities and the lower body unchanged.
// The record values are the bind origins exactly as stored in rig.json (copied here as data, so the spec stays a pure function of this file;
// tools/rh1_spec_check.mjs verifies them against the file).
import { generateSpec } from "./v2_spec.js";
import { setAnkleNeutralKOverride } from "./v2_joints.js";
import { PI1_RUNNER } from "./v2_pi1_runner.js";
export const RIG_RECORD = Object.freeze({ file: "assets/characters/outfield/vinicius/rig.json", blob: "6ca64389d44244331cd7af37ce8f4ee6f854353e",
  bindOrigin: Object.freeze({ spine: [0, 1.029058373428653, 0], chest: [0, 1.2439445905306439, 0], upperArm_L: [-0.24699406338809193, 1.4588308076326348, 0], foreArm_L: [-0.24699406338809193, 1.1460131643893916, 0],
    upperArm_R: [0.24699406338809193, 1.4588308076326348, 0], foreArm_R: [0.24699406338809193, 1.1460131643893916, 0] }) });   // exactly as stored in rig.json
const ua = (s) => { const a = RIG_RECORD.bindOrigin["upperArm_" + s], b = RIG_RECORD.bindOrigin["foreArm_" + s]; return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); };
const elbow = (s, shoulder) => [shoulder[0] + (s === "L" ? -1 : 1) * ua(s), shoulder[1], shoulder[2]];
// the shoulder centre is the PI-1 runner's own (realised from the record overrides); computed from that spec so the elbow sits on its arm axis
const runnerShoulder = (() => { const s = generateSpec(PI1_RUNNER), J = Object.fromEntries(s.joints.map(j => [j.name, j])); return { L: J.shoulder_L.at.slice(), R: J.shoulder_R.at.slice() }; })();
export const PI1_RUNNER_RH1 = Object.freeze({ ...PI1_RUNNER, id: "PI1-runner-vinicius-RH1",
  record: PI1_RUNNER.record + "; record-hinged lumbar / thoracic / elbow (RH1_PREREG.md §1.2)",
  hinges: Object.freeze({ lumbar: RIG_RECORD.bindOrigin.spine.slice(), thoracic: RIG_RECORD.bindOrigin.chest.slice(),
    elbow: Object.freeze({ L: elbow("L", runnerShoulder.L), R: elbow("R", runnerShoulder.R) }), source: `${RIG_RECORD.file} @ ${RIG_RECORD.blob.slice(0, 8)} bindOrigin (spine, chest, upperArm → foreArm length)` }) });
// the accepted configuration (ankle neutral K 0.13), as pi1RunnerSpec
export const pi1RunnerRH1Spec = () => { setAnkleNeutralKOverride(0.13); return generateSpec(PI1_RUNNER_RH1); };

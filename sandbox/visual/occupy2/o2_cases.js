// ═══ occupy2/o2_cases.js — PLAYER OCCUPANCY STAGE 2 REVIEW: Stage 1's deterministic encounters (occupy1/o_cases.js, unchanged) + the ordinary
// locomotion Stage 2 must also handle (§19): overtaking, two players turning into each other, a glancing head-on contact, a near miss. The format
// is Standing Tackle V1's (tackle1/t_cases.js); no case names its result
import { OCASES, mirrorCase } from "../occupy1/o_cases.js";
import { D } from "../tackle1/t_cases.js";
const carry = (mode, o = {}) => Object.assign({ tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, o);
const NEW = [
  { id: "overtake", group: "ORDINARY LOCOMOTION", name: "OVERTAKING · a running player passes the jogging carrier shoulder to shoulder", c: carry("JOG", { dur: 3.5 }), def: D(-3.2, 0.45, 0, { stick: [[-1.2, 0, "RUN"]] }), tackle: [] },
  { id: "turn-into", group: "ORDINARY LOCOMOTION", name: "TURNING INTO EACH OTHER · both turn toward the other at 0.5 s", c: carry("JOG", { dur: 3.5, stick: [[0, 0, "JOG"], [0.5, 25, "JOG"]] }), def: D(4.6, 1.5, 180, { stick: [[-0.2, 0, "WALK"], [0.5, 30, "WALK"]] }), tackle: [] },
  { id: "glance", group: "ORDINARY LOCOMOTION", name: "GLANCING HEAD-ON · jogging past each other shoulder to shoulder", c: carry("JOG", { dur: 3.5 }), def: D(7.2, 0.45, 180, { stick: [[-0.3, 0, "JOG"]] }), tackle: [] },
  { id: "near-miss", group: "ORDINARY LOCOMOTION", name: "NEAR MISS · jogging past each other, almost touching", c: carry("JOG", { dur: 3.5 }), def: D(7.2, 0.62, 180, { stick: [[-0.3, 0, "JOG"]] }), tackle: [] }];
export const O2CASES = [...OCASES, ...NEW, ...["overtake", "turn-into", "glance"].map((id) => mirrorCase(NEW.find((x) => x.id === id)))];

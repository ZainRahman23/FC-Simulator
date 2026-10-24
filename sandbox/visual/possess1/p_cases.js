// ═══ possess1/p_cases.js — SHARED POSSESSION + REACTION V1 REVIEW: the deterministic scenarios ═════════════════════════════════════════════════
// Standing Tackle V1's 21 Lab cases (tackle1/t_cases.js, verbatim) + the scenarios this architecture is judged on: an action already under way
// when the tackle meets the ball (found by tools/p_input.mjs's sweep), a stick change inside the reaction interval, and the loose-ball races.
// Every case runs under every mode with identical inputs; nothing in a case names its result (the list shows what each run produced).
import { CASES } from "../vocab2/v_cases.js";
import { TCASES, D } from "../tackle1/t_cases.js";
const find = (tech, variant) => CASES.find((x) => x.tech === tech && x.variant === variant);
const carry = (mode, o = {}) => Object.assign({ tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, o);
const T = (id) => Object.assign({}, TCASES.find((x) => x.id === id));
export const PCASES = [
  // ── THE CORE SCENARIO: a clean contact, the ball FREE, two footballers responding to one loose ball ──
  Object.assign(T("carry-jog-l"), { group: "THE CORE SCENARIO" }),
  Object.assign(T("race"), { group: "THE CORE SCENARIO", name: "THE RACE: JOG + CUT LEFT (cut 0.27 s before the contact) · SIDE-ON DEFENDER" }),
  Object.assign(T("croq-win"), { group: "THE CORE SCENARIO" }),
  Object.assign(T("carry-walk"), { group: "THE CORE SCENARIO" }),
  // ── PRE-EXISTING INPUT / COMMITTED ACTIONS CONTINUE THROUGH THE REACTION INTERVAL (tools/p_input.mjs) ──
  { id: "in-steer", group: "INPUT ALREADY GIVEN", name: "STEERING LEFT (stick 30° left, held) WHEN THE TACKLE MEETS THE BALL", c: carry("JOG", { variant: "JOG · LEFT 30° AT 0.30 s", stick: [[0, 0, "JOG"], [0.30, -30, "JOG"]] }), def: D(4.4, -1.6, 180), tackle: [0.4] },
  { id: "in-bf", group: "INPUT ALREADY GIVEN", name: "BODY FEINT ALREADY COMMITTED WHEN THE TACKLE MEETS THE BALL", c: find("BODY_FEINT_V2", "FAKE LEFT → RIGHT"), def: D(2.4, 0.5, 180), tackle: [0.3] },
  { id: "in-croq", group: "INPUT ALREADY GIVEN", name: "LA CROQUETA ALREADY COMMITTED WHEN THE TACKLE MEETS THE BALL", c: find("CROQUETA", "REF · JOG R → L"), def: D(2.4, -0.5, 180), tackle: [0.3] },
  { id: "in-turn", group: "INPUT ALREADY GIVEN", name: "A NEW STICK INPUT INSIDE THE REACTION INTERVAL (70° left, 0.1 s after the contact)", c: carry("JOG", { variant: "JOG · LEFT 70° AT 1.0125 s", stick: [[0, 0, "JOG"], [1.0125, -70, "JOG"]] }), def: D(4.4, -0.85, 180), tackle: [0.62] },
  // ── THE REST OF STANDING TACKLE V1'S CASES (unchanged) ──
  ...TCASES.filter((x) => !["carry-jog-l", "race", "croq-win", "carry-walk"].includes(x.id)).map((x) => Object.assign({}, x, { group: "TACKLING LAB V1 · " + x.group }))
];

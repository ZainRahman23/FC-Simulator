// technical_control1/tools/tc_jobs.mjs — the sweep job lists (owner §43 – §45): every set runs the whole TECHNICAL COURSE + the receive chain
//   node tc_jobs.mjs <indep | presets | styles | foot | all> [seeds 1,2,3] > jobs.json
import { COURSE, RECEIVE_CHAIN } from "../tc_course.js"; import { STYLES } from "../tc_attrs.js";
const set = process.argv[2] || "all", seeds = (process.argv[3] || "1,2,3").split(",").map(Number), CASES = COURSE.concat(RECEIVE_CHAIN), jobs = [];
export const LEVELS = [99, 90, 80, 70, 60, 50, 40, 25, 1];
export const PRESETS = { "99/99/99": [99, 99, 99], "90/90/90": [90, 90, 90], "80/80/80": [80, 80, 80], "70/70/70": [70, 70, 70], "60/60/60": [60, 60, 60], "50/50/50": [50, 50, 50],
  "BC99/D99/A50": [99, 99, 50], "BC99/D50/A99": [99, 50, 99], "BC50/D99/A99": [50, 99, 99], "95/95/55": [95, 95, 55], "95/55/95": [95, 55, 95], "55/95/95": [55, 95, 95] };
const rid = (c, b, d, a, st) => `${c}_B${b}_D${d}_A${a}` + (st && st !== "NEUTRAL" ? `_S${st}` : "");
const add = (tag, id, o = {}) => { for (const seed of seeds) jobs.push(Object.assign({ set: tag, id, seed }, o)); };
if (set === "indep" || set === "all") for (const X of ["B", "D", "A"]) for (const r of LEVELS) for (const c of CASES) add("indep:" + X + r, rid(c, X === "B" ? r : 99, X === "D" ? r : 99, X === "A" ? r : 99));
if (set === "presets" || set === "all") for (const [k, [b, d, a]] of Object.entries(PRESETS)) for (const c of CASES) add("preset:" + k, rid(c, b, d, a));
if (set === "styles" || set === "all") for (const st of Object.keys(STYLES)) for (const c of CASES) add("style:" + st, rid(c, 90, 90, 90, st));
if (set === "foot" || set === "all") for (const foot of ["R", "L", "B"]) for (const st of ["NEUTRAL", "DOMINANT_FOOT", "TWO_FOOT"]) for (const c of CASES) add(`foot:${foot}:${st}`, rid(c, 90, 90, 90, st), { foot });
// the full chain (owner §45 "receive → turn → dribble") with the BRIDGE to DRIBBLE-V1 at a sprint: the receive chain + the sprint receives +
// the acceleration into space, bridge on (and off for comparison), the six uniform presets
export const CHAIN = RECEIVE_CHAIN.concat(["RL_0_SPRINT_NORMAL", "L_30_SPRINT_NORMAL", "L_60_SPRINT_NORMAL", "L_90_SPRINT_NORMAL", "L_120_SPRINT_NORMAL", "ACCEL"]);
if (set === "chain" || set === "all") for (const k of ["99/99/99", "90/90/90", "80/80/80", "70/70/70", "60/60/60", "50/50/50"]) { const [b, d, a] = PRESETS[k]; for (const c of CHAIN) for (const bridge of ["sprint", "off"]) add(`chain:${bridge}:${k}`, rid(c, b, d, a), { bridge }); }
process.stdout.write(JSON.stringify(jobs));

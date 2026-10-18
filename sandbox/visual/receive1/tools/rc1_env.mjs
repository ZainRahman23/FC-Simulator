// receive1/tools/rc1_env.mjs — Node environment for RECEIVE-CONTROL-1: TURN-1.2 (frozen, loaded as the page loads it) + the receive adapter
// (receive1/rc1_core.js) on the frozen DRIBBLE-V1 core (dribble15/d15_core.js)
import { createRequire } from "module"; import path from "path"; import fs from "fs"; import { fileURLToPath } from "url";
import * as RC from "../rc1_core.js"; import { PROFILES } from "../../dribble1/d1_attrs.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs"));
export const X = loadTurn1();
// experiments only: RC1OVR='{"key": value}' overrides adapter parameters for this process (never used by the evidence of record)
if (process.env.RC1OVR) for (const [k, v] of Object.entries(JSON.parse(process.env.RC1OVR))) RC.RC1[k] = v && typeof v === "object" && !Array.isArray(v) && RC.RC1[k] ? { ...RC.RC1[k], ...v } : v;
export const COLLIDERS = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../dribble1/d1_colliders.json"), "utf8"));
export function makeReceive(scenario, o = {}) {
  return new RC.ReceiveSim({ T1: X.TURN1, E: X.RUN1_V13, M4: X.M4, TURN11: X.TURN11, skel: X.skel, colliders: COLLIDERS, ball: o.ball || RC.BALL_DEFAULT, arch: o.arch || "B", seed: o.seed == null ? 20261016 : o.seed,
    player: o.player || PROFILES.HIGH, scenario, opts: Object.assign({ record: true }, o.opts || {}) });
}
export const { DT, D1, RC1, receiveTurnAngle, exitTurn } = RC;
export { PROFILES, RC };

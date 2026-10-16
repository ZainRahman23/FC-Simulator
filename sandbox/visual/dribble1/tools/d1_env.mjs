// dribble1/tools/d1_env.mjs — Node environment for DRIBBLE-1: TURN-1.2 (frozen, classic scripts in a vm context, as the page loads them) + the ESM core
import { createRequire } from "module"; import path from "path"; import fs from "fs"; import { fileURLToPath } from "url";
import { DribbleSim, BALL_DEFAULT, D1, DT } from "../d1_core.js"; import { PROFILES } from "../d1_attrs.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs"));
export const X = loadTurn1();
// experiments: D1OVR='{"key": value, ...}' overrides resolver parameters for this process (never used by the evidence of record)
if (process.env.D1OVR) Object.assign(D1, JSON.parse(process.env.D1OVR));
export const COLLIDERS = JSON.parse(fs.readFileSync(path.resolve(HERE, "../d1_colliders.json"), "utf8"));
export function makeSim(scenario, o = {}) {
  return new DribbleSim({ T1: X.TURN1, E: X.RUN1_V13, M4: X.M4, TURN11: X.TURN11, skel: X.skel, colliders: COLLIDERS, ball: o.ball || BALL_DEFAULT, arch: o.arch || "B", seed: o.seed == null ? 20261016 : o.seed,
    player: o.player || PROFILES.HIGH, scenario, opts: Object.assign({ record: true }, o.opts || {}, process.env.D1OPTS ? JSON.parse(process.env.D1OPTS) : {}) });
}
export { D1, DT, PROFILES, BALL_DEFAULT };

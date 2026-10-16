// dribble11/tools/d11_env.mjs — Node environment for DRIBBLE-1.1 and its DRIBBLE-1 reference: TURN-1.2 (frozen, classic scripts in a vm context, as the
// page loads them) + either core: ver "d11" (dribble11/d11_core.js, default) or "d1" (dribble1/d1_core.js, frozen at 7fe57fd3)
import { createRequire } from "module"; import path from "path"; import fs from "fs"; import { fileURLToPath } from "url";
import * as C11 from "../d11_core.js"; import * as C1 from "../../dribble1/d1_core.js"; import { PROFILES } from "../../dribble1/d1_attrs.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs"));
export const X = loadTurn1();
// experiments: D1OVR='{"key": value, ...}' overrides the DRIBBLE-1.1 resolver parameters for this process (never used by the evidence of record)
if (process.env.D1OVR) Object.assign(C11.D1, JSON.parse(process.env.D1OVR));
export const COLLIDERS = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../dribble1/d1_colliders.json"), "utf8"));
export const CORES = { d1: C1, d11: C11 };
export function makeSim(scenario, o = {}) {
  const C = CORES[o.ver || "d11"];
  return new C.DribbleSim({ T1: X.TURN1, E: X.RUN1_V13, M4: X.M4, TURN11: X.TURN11, skel: X.skel, colliders: COLLIDERS, ball: o.ball || C.BALL_DEFAULT, arch: o.arch || "B", seed: o.seed == null ? 20261016 : o.seed,
    player: o.player || PROFILES.HIGH, scenario, opts: Object.assign({ record: true }, o.opts || {}, process.env.D1OPTS ? JSON.parse(process.env.D1OPTS) : {}) });
}
export const DT = C11.DT, D1 = C11.D1;
export { PROFILES };

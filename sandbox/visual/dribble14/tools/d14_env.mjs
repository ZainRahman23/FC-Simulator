// dribble14/tools/d14_env.mjs — Node environment for DRIBBLE-1.4 and its references: TURN-1.2 (frozen, classic scripts in a vm context, as the page
// loads them) + the cores: ver "d14" (dribble14/d14_core.js, default), "d13" (dribble13/d13_core.js, the approved performance architecture,
// frozen at 54ff810d), "d12" (dribble12/d12_core.js, the approved behavioural foundation, frozen at
// a2f0505b), "d11" (dribble11/d11_core.js, frozen at 7d8c8524) or "d1" (dribble1/d1_core.js, frozen at 7fe57fd3)
import { createRequire } from "module"; import path from "path"; import fs from "fs"; import { fileURLToPath } from "url";
import * as C13 from "../../dribble13/d13_core.js"; import * as C12 from "../../dribble12/d12_core.js"; import * as C11 from "../../dribble11/d11_core.js"; import * as C1 from "../../dribble1/d1_core.js"; import { PROFILES } from "../../dribble1/d1_attrs.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
// (bisection only: D14CORE=<file in dribble14/> loads another DRIBBLE-1.4 core file as "d14"; never used by the evidence of record)
const C14 = await import(process.env.D14CORE ? new URL("../" + process.env.D14CORE, import.meta.url).href : "../d14_core.js");
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs"));
export const X = loadTurn1();
// experiments: D1OVR='{"key": value, ...}' overrides the DRIBBLE-1.4 resolver parameters for this process (never used by the evidence of record)
if (process.env.D1OVR) for (const [k, v] of Object.entries(JSON.parse(process.env.D1OVR))) C14.D1[k] = v && typeof v === "object" && !Array.isArray(v) && C14.D1[k] ? { ...C14.D1[k], ...v } : v;   // (one level deep: {"plan13": {"budget": 60}})
export const COLLIDERS = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../dribble1/d1_colliders.json"), "utf8"));
export const CORES = { d1: C1, d11: C11, d12: C12, d13: C13, d14: C14 };
export function makeSim(scenario, o = {}) {
  const C = CORES[o.ver || "d14"];
  return new C.DribbleSim({ T1: X.TURN1, E: X.RUN1_V13, M4: X.M4, TURN11: X.TURN11, skel: X.skel, colliders: COLLIDERS, ball: o.ball || C.BALL_DEFAULT, arch: o.arch || "B", seed: o.seed == null ? 20261016 : o.seed,
    player: o.player || PROFILES.HIGH, scenario, opts: Object.assign({ record: true }, o.opts || {}, process.env.D1OPTS ? JSON.parse(process.env.D1OPTS) : {}) });
}
export const DT = C14.DT, D1 = C14.D1;
export { PROFILES };

// dribble15/tools/d15_env.mjs — Node environment for DRIBBLE-1.5 and its references: TURN-1.2 (frozen, classic scripts in a vm context, as the page
// loads them) + the cores: ver "d15" (dribble15/d15_core.js, default), "d14" (dribble14/d14_core.js, the DRIBBLE-1.4 baseline, frozen at 33ce1ca1), "d13" (dribble13/d13_core.js, the approved performance architecture,
// frozen at 54ff810d), "d12" (dribble12/d12_core.js, the approved behavioural foundation, frozen at
// a2f0505b), "d11" (dribble11/d11_core.js, frozen at 7d8c8524) or "d1" (dribble1/d1_core.js, frozen at 7fe57fd3)
import { createRequire } from "module"; import path from "path"; import fs from "fs"; import { fileURLToPath } from "url";
import * as C14 from "../../dribble14/d14_core.js"; import * as C13 from "../../dribble13/d13_core.js"; import * as C12 from "../../dribble12/d12_core.js"; import * as C11 from "../../dribble11/d11_core.js"; import * as C1 from "../../dribble1/d1_core.js"; import { PROFILES } from "../../dribble1/d1_attrs.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
// (bisection only: D15CORE=<file in dribble15/> loads another DRIBBLE-1.5 core file as "d15"; never used by the evidence of record)
const C15 = await import(process.env.D15CORE ? new URL("../" + process.env.D15CORE, import.meta.url).href : "../d15_core.js");
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs"));
export const X = loadTurn1();
// experiments: D1OVR='{"key": value, ...}' overrides the DRIBBLE-1.5 resolver parameters for this process (never used by the evidence of record)
if (process.env.D1OVR) for (const [k, v] of Object.entries(JSON.parse(process.env.D1OVR))) C15.D1[k] = v && typeof v === "object" && !Array.isArray(v) && C15.D1[k] ? { ...C15.D1[k], ...v } : v;   // (one level deep: {"plan13": {"budget": 60}})
export const COLLIDERS = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../dribble1/d1_colliders.json"), "utf8"));
export const CORES = { d1: C1, d11: C11, d12: C12, d13: C13, d14: C14, d15: C15 };
export function makeSim(scenario, o = {}) {
  const C = CORES[o.ver || "d15"];
  return new C.DribbleSim({ T1: X.TURN1, E: X.RUN1_V13, M4: X.M4, TURN11: X.TURN11, skel: X.skel, colliders: COLLIDERS, ball: o.ball || C.BALL_DEFAULT, arch: o.arch || "B", seed: o.seed == null ? 20261016 : o.seed,
    player: o.player || PROFILES.HIGH, scenario, opts: Object.assign({ record: true }, o.opts || {}, process.env.D1OPTS ? JSON.parse(process.env.D1OPTS) : {}) });
}
export const DT = C15.DT, D1 = C15.D1;
export { PROFILES };

// receive11/tools/rx_env.mjs — Node environment for RECEIVE-CONTROL-1.1: TURN-1.2 (frozen, loaded as the page loads it) + the receive action system
// (receive11/rx_core.js) beside the frozen DRIBBLE-V1 core (dribble15/d15_core.js). opts.anim: run the presentation layer (default off in Node)
import { createRequire } from "module"; import path from "path"; import fs from "fs"; import { fileURLToPath } from "url";
import * as RXC from "../rx_core.js"; import { RxBody } from "../rx_body.js"; import { PROFILES } from "../../dribble1/d1_attrs.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs"));
export const X = loadTurn1();
// experiments only: RXOVR='{"key": value}' overrides RX for this process; RXEOVR the execution model (never used by the evidence of record)
const ovr = (T, s) => { if (s) for (const [k, v] of Object.entries(JSON.parse(s))) T[k] = v && typeof v === "object" && !Array.isArray(v) && T[k] ? { ...T[k], ...v } : v; };
ovr(RXC.RX, process.env.RXOVR); ovr(RXC.RXE, process.env.RXEOVR);
export const COLLIDERS = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../dribble1/d1_colliders.json"), "utf8"));
export function makeReceive(cs, o = {}) {
  const anim = o.anim != null ? o.anim : false;
  return new RXC.ReceiveSim11({ T1: X.TURN1, E: X.RUN1_V13, M4: X.M4, TURN11: X.TURN11, skel: X.skel, colliders: COLLIDERS, ball: o.ball || RXC.BALL_DEFAULT, arch: o.arch || "B", seed: o.seed == null ? 1 : o.seed,
    player: o.player || PROFILES.HIGH, bc: o.bc != null ? o.bc : cs.bc, scenario: cs.scenario, Body: anim ? RxBody : null, opts: Object.assign({ record: true, anim, recViewer: !!o.recViewer }, o.opts || {}) });
}
export const { DT, D1, RX, RXE, receiveTurnAngle, exitTurn } = RXC;
export { PROFILES, RXC };

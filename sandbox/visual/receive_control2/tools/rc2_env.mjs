// receive_control2/tools/rc2_env.mjs — Node environment for RECEIVE-CONTROL-2 (as RECEIVE-CONTROL-1.1's rx_env.mjs: TURN-1.2 loaded as the page
// loads it, the frozen DRIBBLE-V1 core) — makeReceive2 builds the integrated ReceiveSim2
import { X, COLLIDERS, PROFILES } from "../../receive11/tools/rx_env.mjs"; import * as RC2 from "../rc2_core.js"; import { RxBody } from "../../receive11/rx_body.js";
export { X, COLLIDERS, PROFILES, RC2 }; export const DT = RC2.DT;
export function makeReceive2(cs, o = {}) {
  return new RC2.ReceiveSim2({ T1: X.TURN1, E: X.RUN1_V13, M4: X.M4, TURN11: X.TURN11, skel: X.skel, colliders: COLLIDERS, ball: o.ball || RC2.BALL_DEFAULT, arch: o.arch || "B", seed: o.seed == null ? 1 : o.seed,
    player: o.player || PROFILES.HIGH, bc: o.bc != null ? o.bc : cs.bc, wf: o.wf != null ? o.wf : cs.wf, scenario: cs.scenario, receiverKey: o.receiverKey, Body: o.anim ? RxBody : null, opts: Object.assign({ record: true, anim: !!o.anim }, o.opts || {}) });
}

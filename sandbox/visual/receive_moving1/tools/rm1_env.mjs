// receive_moving1/tools/rm1_env.mjs — Node environment for RECEIVE-MOVING-1 (RECEIVE-CONTROL-2's, building ReceiveSimM)
import { X, COLLIDERS, PROFILES } from "../../receive11/tools/rx_env.mjs"; import * as RM1 from "../rm1_core.js"; import { RxBody } from "../../receive11/rx_body.js";
export { X, COLLIDERS, PROFILES, RM1 }; export const DT = RM1.DT;
export function makeReceiveM(cs, o = {}) {
  return new RM1.ReceiveSimM({ T1: X.TURN1, E: X.RUN1_V13, M4: X.M4, TURN11: X.TURN11, skel: X.skel, colliders: COLLIDERS, ball: o.ball || RM1.BALL_DEFAULT, arch: o.arch || "B", seed: o.seed == null ? 1 : o.seed,
    player: o.player || PROFILES.HIGH, bc: o.bc != null ? o.bc : cs.bc, wf: o.wf != null ? o.wf : cs.wf, scenario: cs.scenario, receiverKey: o.receiverKey, Body: o.anim ? RxBody : null, opts: Object.assign({ record: true, anim: !!o.anim }, o.opts || {}) });
}

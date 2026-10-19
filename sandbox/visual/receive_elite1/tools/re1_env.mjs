// receive_elite1/tools/re1_env.mjs — Node environment for RECEIVE-ELITE-1: CURRENT = RECEIVE-MOVING-1's pipeline (ReceiveSimM: RECEIVE-CONTROL-2
// for a standing receiver, its moving actions for a moving one), NEW = ReceiveSimE (the elite tight-control layer on it). The receiver is the
// repository profile with the case's ratings written into its attributes (Ball Control, Dribbling, Agility) — DRIBBLE-V1 reads them as it always did
import { X, COLLIDERS, PROFILES } from "../../receive11/tools/rx_env.mjs"; import * as RM1 from "../../receive_moving1/rm1_core.js"; import { RxBody } from "../../receive11/rx_body.js";
export { X, COLLIDERS, PROFILES, RM1 }; export const DT = RM1.DT;
export function playerWith(r, base) { const p = base || PROFILES.HIGH; if (!r) return p; return Object.assign({}, p, { attributes: Object.assign({}, p.attributes, { ball_control: r.bc, dribbling: r.dri, agility: r.agi }) }); }
export function cfgFor(cs, o = {}) { const r = o.ratings || cs.ratings;
  return { T1: X.TURN1, E: X.RUN1_V13, M4: X.M4, TURN11: X.TURN11, skel: X.skel, colliders: COLLIDERS, ball: o.ball || RM1.BALL_DEFAULT, arch: o.arch || "B", seed: o.seed == null ? 1 : o.seed,
    player: playerWith(r, o.player), bc: r ? r.bc : (o.bc != null ? o.bc : cs.bc), wf: o.wf != null ? o.wf : cs.wf, scenario: cs.scenario, receiverKey: o.receiverKey, ratings: r || null, Body: o.anim ? RxBody : null, opts: Object.assign({ record: true, anim: !!o.anim }, o.opts || {}) }; }
export function makeCurrent(cs, o = {}) { return new RM1.ReceiveSimM(cfgFor(cs, o)); }
import * as RE1 from "../re1_core.js";
export { RE1 };
// experiments only: RE1OVR='{"key": value}' overrides RE for this process (never used by the evidence of record unless the tool says so)
if (process.env.RE1OVR) for (const [k, v] of Object.entries(JSON.parse(process.env.RE1OVR))) RE1.RE[k] = v;
export function makeElite(cs, o = {}) { const c = cfgFor(cs, o); c.elite = o.elite !== false; c.EliteBody = o.anim ? o.EliteBody || null : null; return new RE1.ReceiveSimE(c); }

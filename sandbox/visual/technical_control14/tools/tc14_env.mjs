// technical_control14/tools/tc14_env.mjs — Node environment for TECHNICAL-CONTROL-1.4: makeEff (the efficiency layer on TECHNICAL-CONTROL-1.2's carry model;
// with anim: TECHNICAL-CONTROL-1.4's ChopBody (TECHNICAL-CONTROL-1.3's FlowBody + the chop's standing foot) unless another body is given) — as TECHNICAL-CONTROL-1.2's makeCarry / 1.3's makeFlow
import { cfgFor } from "../../receive_elite1/tools/re1_env.mjs"; import { footPlayer } from "../../technical_control1/tools/tc_env.mjs"; import { EffSim } from "../tc14_core.js"; import { ChopBody } from "../tc14_body.js";
export function makeEff(cs, o = {}) { if (o.foot && !o.player) o = Object.assign({}, o, { player: footPlayer(o.foot) }); const c = cfgFor(cs, o); c.elite = true; c.style = o.style || cs.style || "NEUTRAL"; c.bridge = o.bridge || cs.bridge || "off";
  c.moveIntent = o.moveIntent || cs.moveIntent || null; c.dribble = cs.dribble || null; c.EliteBody = o.anim ? o.Body || ChopBody : null; return new EffSim(c); }

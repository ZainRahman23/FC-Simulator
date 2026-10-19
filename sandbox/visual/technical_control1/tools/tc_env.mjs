// technical_control1/tools/tc_env.mjs — Node environment for TECHNICAL-CONTROL-1 (RECEIVE-ELITE-1's environment + TechSim)
import { cfgFor, makeCurrent, makeElite, X, PROFILES, playerWith } from "../../receive_elite1/tools/re1_env.mjs"; import * as TC1 from "../tc_core.js";
export { cfgFor, makeCurrent, makeElite, X, PROFILES, playerWith, TC1 }; export const DT = TC1.DT;
if (process.env.TC1OVR) for (const [k, v] of Object.entries(JSON.parse(process.env.TC1OVR))) TC1.TC[k] = v;
export function makeTech(cs, o = {}) { const c = cfgFor(cs, o); c.elite = true; c.style = o.style || cs.style || "NEUTRAL"; c.bridge = o.bridge || cs.bridge || "off"; c.moveIntent = o.moveIntent || cs.moveIntent || null; c.dribble = cs.dribble || null; c.EliteBody = o.anim ? o.Body || null : null; return new TC1.TechSim(c); }

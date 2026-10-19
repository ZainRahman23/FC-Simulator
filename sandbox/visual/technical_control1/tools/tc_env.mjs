// technical_control1/tools/tc_env.mjs — Node environment for TECHNICAL-CONTROL-1 (RECEIVE-ELITE-1's environment + TechSim)
import { cfgFor, makeCurrent, makeElite, X, PROFILES, playerWith } from "../../receive_elite1/tools/re1_env.mjs"; import * as TC1 from "../tc_core.js";
export { cfgFor, makeCurrent, makeElite, X, PROFILES, playerWith, TC1 }; export const DT = TC1.DT;
if (process.env.TC1OVR) for (const [k, v] of Object.entries(JSON.parse(process.env.TC1OVR))) TC1.TC[k] = v;
// o.foot: "R" | "L" | "B" (two-footed: weak foot 5)
export const footPlayer = (foot) => Object.assign({}, PROFILES.HIGH, { preferred_foot: foot === "L" ? "L" : "R", weak_foot: foot === "B" ? 5 : PROFILES.HIGH.weak_foot });
export function makeTech(cs, o = {}) { if (o.foot && !o.player) o = Object.assign({}, o, { player: footPlayer(o.foot) }); const c = cfgFor(cs, o); c.elite = true; c.style = o.style || cs.style || "NEUTRAL"; c.bridge = o.bridge || cs.bridge || "off"; c.moveIntent = o.moveIntent || cs.moveIntent || null; c.dribble = cs.dribble || null; c.EliteBody = o.anim ? o.Body || null : null; return new TC1.TechSim(c); }

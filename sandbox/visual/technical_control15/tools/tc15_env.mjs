// technical_control15/tools/tc15_env.mjs — Node environment for TECHNICAL-CONTROL-1.5: the frozen rig (RUN-1.3, the skeleton, M4 — loaded as the page
// loads them, receive11's loader) and DRIBBLE-1's boot colliders; makeRef(id) builds a technique reference (tc15_tech.js) on them.
import { X, COLLIDERS } from "../../receive11/tools/rx_env.mjs";
import { RefSim } from "../tc15_ref.js";
import { TECH } from "../tc15_tech.js";
export const ENV = { E: X.RUN1_V13, M4: X.M4, skel: X.skel, colliders: COLLIDERS };
export function makeRef(id, o = {}) { const T = typeof id === "string" ? TECH[id] : id; if (!T) throw new Error("unknown technique " + id); return new RefSim(ENV, T, o); }
export { TECH };

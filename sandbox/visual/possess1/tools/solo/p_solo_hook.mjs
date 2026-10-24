// possess1/tools/solo/p_solo_hook.mjs — RUN ANY SINGLE-PLAYER TOOL THROUGH THE SHARED ARCHITECTURE (§29): `node --import <this file> tool.mjs`
// (or NODE_OPTIONS=--import=<file URL>). Every import of vocab2/c_sim.js made outside possess1/ resolves to p_solo_shim.js, whose ControlledSim
// IS possess1's SharedSim (alone in its world: one candidate, the authority trivial). No file of the published build is modified.
import { register } from "node:module";
register("./p_solo_loader.mjs", import.meta.url);

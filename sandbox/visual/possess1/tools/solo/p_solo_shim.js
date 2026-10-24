// possess1/tools/solo/p_solo_shim.js — vocab2/c_sim.js as the single-player tools see it under p_solo_hook.mjs: everything re-exported, and
// ControlledSim = possess1's SharedSim (counted: the run reports how many footballers were built through it)
export * from "../../../vocab2/c_sim.js";
import { SharedSim } from "../../p_sim.js";
let n = 0; process.on("exit", () => process.stderr.write(`[SHARED-SOLO] ${n} footballer(s) constructed through possess1 SharedSim (pid ${process.pid})\n`));
export class ControlledSim extends SharedSim { constructor(...a) { super(...a); n++; } }

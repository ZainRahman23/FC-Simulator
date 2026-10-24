// occupy1/tools/two/o_two_shim.js — possess1/p_world.js as the possession tools see it under o_two_hook.mjs: everything re-exported, and
// SharedWorld = occupy1's OccupancyWorld (occupancy ON; counted: the run reports how many worlds were built through it)
export * from "../../../possess1/p_world.js";
import { OccupancyWorld } from "../../o_world.js";
let n = 0, acted = 0; process.on("exit", () => process.stderr.write(`[OCCUPANCY-TWO] ${n} world(s) constructed through occupy1 OccupancyWorld, ${acted} with occupancy acting (pid ${process.pid})\n`));
export class SharedWorld extends OccupancyWorld { constructor(...a) { super(...a); n++; } occupancy() { super.occupancy(); const L = this.occ.log[this.occ.log.length - 1]; if (L && L.acted && !this._counted) { this._counted = true; acted++; } } }

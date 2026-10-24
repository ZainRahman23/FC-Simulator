// occupy2/tools/s2/two/o2_two_shim.js — possess1/p_world.js as the possession tools see it under o2_two_hook.mjs: everything re-exported, and
// SharedWorld = occupy2's OccupancyWorld2 (STAGE 2 occupancy ON; counted)
export * from "../../../../possess1/p_world.js";
import { OccupancyWorld2 } from "../../../o2_world.js";
let n = 0, acted = 0; process.on("exit", () => process.stderr.write(`[OCCUPANCY-STAGE2-TWO] ${n} world(s) constructed through occupy2 OccupancyWorld2, ${acted} with occupancy acting (pid ${process.pid})\n`));
export class SharedWorld extends OccupancyWorld2 { constructor(...a) { super(...a); n++; } occupancy() { super.occupancy(); const L = this.occ.log[this.occ.log.length - 1]; if (L && L.acted && !this._counted) { this._counted = true; acted++; } } }

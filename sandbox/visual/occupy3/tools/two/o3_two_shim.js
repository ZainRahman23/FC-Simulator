// occupy3/tools/two/o3_two_shim.js — possess1/p_world.js as the possession tools see it under o3_two_hook.mjs: everything re-exported, and
// SharedWorld = occupy3's ImpactWorld (STAGE 3 on, over Stage 2 as decided; counted)
export * from "../../../possess1/p_world.js";
import { ImpactWorld } from "../../o3_world.js";
import { S2D } from "../../o3_run.js";
let n = 0, acted = 0; process.on("exit", () => process.stderr.write(`[STAGE3-TWO] ${n} world(s) constructed through occupy3 ImpactWorld, ${acted} with an impact (pid ${process.pid})\n`));
export class SharedWorld extends ImpactWorld { constructor(env, o = {}) { super(env, Object.assign({}, o, { res: Object.assign({}, S2D, o.res || {}) })); n++; } impactPass() { super.impactPass(); if (!this._counted && this.imp.episodes.length + (this.imp.ep && this.imp.ep.active ? 1 : 0) > 0) { this._counted = true; acted++; } } }

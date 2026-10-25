// occupy3b/tools/two/l3_two_shim.js — possess1/p_world.js as the possession tools see it under l3_two_hook.mjs: everything re-exported, and
// SharedWorld = occupy3b's LimbWorld (STAGE 3B: the limb layer + Stage 3 over Stage 2 as decided; counted)
export * from "../../../possess1/p_world.js";
import { LimbWorld } from "../../l3_world.js";
import { S2D } from "../../../occupy3/o3_run.js";
let n = 0, acted = 0, strikes = 0, bad = 0; process.on("exit", () => process.stderr.write(`[STAGE3B-TWO] ${n} world(s) constructed through occupy3b LimbWorld, ${acted} with a limb contact or an impact, ${strikes} limb strikes, ledger violations ${bad} (pid ${process.pid})\n`));
export class SharedWorld extends LimbWorld { constructor(env, o = {}) { super(env, Object.assign({}, o, { res: Object.assign({}, S2D, o.res || {}) })); n++; }
  impactPass() { super.impactPass(); if (!this._counted && (this.l3.apps.length || this.imp.episodes.length + (this.imp.ep && this.imp.ep.active ? 1 : 0) > 0)) { this._counted = true; acted++; } }
  closeLedger(u0) { const s0 = this.l3.contacts; super.closeLedger(u0); strikes += this.l3.contacts - s0; const c = this.l3.check; if (!this._bad && (c.stage3 > 1e-9 || c.pair > 1e-9 || c.bound > 1e-9 || c.energy > 1e-9)) { this._bad = true; bad++; } } }

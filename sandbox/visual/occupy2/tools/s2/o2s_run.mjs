// occupy2/tools/s2/o2s_run.mjs — Stage 1's tools (occupy1/tools/, unchanged) re-run on STAGE 2: runO(env, tc, "OLD" | "OCC") with OCC =
// OccupancyWorld2 (OLD as Stage 1's: the same world with occupancy off). The ported copies in this folder import this instead of occupy1/o_run.js
import { runEncounter, encounterOpts } from "../../../tackle1/t_world.js";
import { buildEncounter } from "../../../tackle1/t_run.js";
import { SharedWorld } from "../../../possess1/p_world.js";
import { outcomeShared } from "../../../possess1/p_run.js";
import { OccupancyWorld } from "../../../occupy1/o_world.js";
import { OccupancyWorld2 } from "../../o2_world.js";
export const O_MODES = ["OLD", "OCC"];
export function makeWorld(env, opts, mode) { return mode === "OCC" ? new OccupancyWorld2(env, Object.assign({}, opts, { record: opts.record })) : new OccupancyWorld(env, Object.assign({}, opts, { occupancy: false })); }
export function runO(env, tc, mode, o = {}) { const enc = o.enc || buildEncounter(env, tc, o), opts = Object.assign(encounterOpts(enc), { mode: "MEDIUM", timing: !!o.timing, record: o.record !== false });
  const W = o.plain && mode === "OLD" ? new SharedWorld(env, opts) : makeWorld(env, opts, mode); if (o.before) o.before(W, enc);
  const r = runEncounter(W, enc, o.onTick || null); W.omode = mode; return { W, enc, mode, t0: r.t0, clip: [Math.max(0, r.t0 - (tc.c.pre || 1.0)), W.t] }; }
export const outcomeO = (W) => outcomeShared(W);

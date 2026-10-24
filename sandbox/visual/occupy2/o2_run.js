// ═══ occupy2/o2_run.js — one encounter, OLD · STAGE 1 · STAGE 2, identical inputs (the same code in the Review Lab and in node) ════════════════
// OLD = Shared Possession + Reaction V1 at MEDIUM 0.200 s (possess1/, unchanged; run in Stage 1's world with occupancy off, the bodies recorded)
// · S1 = PLAYER OCCUPANCY V1 (occupy1/, unchanged) · S2 = PLAYER OCCUPANCY STAGE 2 (o2_world.js)
import { runEncounter, encounterOpts } from "../tackle1/t_world.js";
import { buildEncounter } from "../tackle1/t_run.js";
import { outcomeShared } from "../possess1/p_run.js";
import { OccupancyWorld } from "../occupy1/o_world.js";
import { OccupancyWorld2 } from "./o2_world.js";
export const O2_MODES = ["OLD", "S1", "S2"], O2_LABEL = { OLD: "OLD · Shared Possession + Reaction V1 (MEDIUM)", S1: "STAGE 1 · Player Occupancy V1", S2: "STAGE 2 · Committed-action contact resolution" };
export function runO2(env, tc, mode, o = {}) { const enc = o.enc || buildEncounter(env, tc, o), opts = Object.assign(encounterOpts(enc), { mode: "MEDIUM", timing: !!o.timing });
  const W = mode === "S2" ? new OccupancyWorld2(env, Object.assign(opts, { record: o.record !== false, res: o.res })) : new OccupancyWorld(env, Object.assign(opts, { occupancy: mode === "S1", record: o.record !== false })); if (o.before) o.before(W, enc);
  const r = runEncounter(W, enc, o.onTick || null); W.omode = mode; return { W, enc, mode, t0: r.t0, clip: [Math.max(0, r.t0 - (tc.c.pre || 1.0)), W.t] }; }
export const outcomeO2 = (W) => outcomeShared(W);

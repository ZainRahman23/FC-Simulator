// ═══ occupy1/o_run.js — one encounter, OLD or OCCUPANCY V1, identical inputs (the same code in the Review Lab and in node) ══════════════════════
// OLD = Shared Possession + Reaction V1 at MEDIUM 0.200 s (possess1/, unchanged) · OCC = the same world + Player Occupancy V1 (o_world.js)
import { runEncounter, encounterOpts } from "../tackle1/t_world.js";
import { buildEncounter } from "../tackle1/t_run.js";
import { SharedWorld } from "../possess1/p_world.js";
import { outcomeShared } from "../possess1/p_run.js";
import { OccupancyWorld } from "./o_world.js";
export const O_MODES = ["OLD", "OCC"], O_LABEL = { OLD: "OLD · Shared Possession + Reaction V1 (MEDIUM)", OCC: "PLAYER OCCUPANCY V1 (MEDIUM)" };
export function runO(env, tc, mode, o = {}) { const enc = o.enc || buildEncounter(env, tc, o), opts = Object.assign(encounterOpts(enc), { mode: "MEDIUM", timing: !!o.timing });
  // (OLD is the same world with occupancy off: Shared Possession + Reaction V1 exactly — tools/o_identity.mjs — with the bodies recorded the same way)
  const W = o.plain && mode === "OLD" ? new SharedWorld(env, opts) : new OccupancyWorld(env, Object.assign(opts, { occupancy: mode === "OCC", record: o.record !== false })); if (o.before) o.before(W, enc);
  const r = runEncounter(W, enc, o.onTick || null); W.omode = mode; return { W, enc, mode, t0: r.t0, clip: [Math.max(0, r.t0 - (tc.c.pre || 1.0)), W.t] }; }
export const outcomeO = (W) => outcomeShared(W);

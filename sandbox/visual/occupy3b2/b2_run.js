// ═══ occupy3b2/b2_run.js — one encounter in any stage, identical inputs (the Lab and the tools): S2D · S3 (OLD STAGE 3) · S3B (3B.1, calibrated
// F+M — the frozen foundation) through Stage 3's own runner (occupy3/o3_run.js, unchanged) · S3B2 (3B.2: 3B.1 + feasible placement, here) —
// the same construction runO3 uses for S3B, the 3B.2 world in its place. Also the rotated encounter (occupy3b/l3_rot.js's stepping) and a bare
// world for the drivers that step it themselves (the torture, the solo check).
import { runEncounter, encounterOpts } from "../tackle1/t_world.js";
import { buildEncounter } from "../tackle1/t_run.js";
import { runO3, makeWorld3, S2D } from "../occupy3/o3_run.js";
import "../occupy3/o3_world.js";
import "../occupy3b/l3_world.js";
import { buildRotated, runEncounterRotated } from "../occupy3b/l3_rot.js";
import { PlacementWorld } from "./b2_world.js";
export const B2_MODES = ["S2D", "S3", "S3B", "S3B2"], B2_LABEL = { S2D: "STAGE 2 (as decided)", S3: "OLD STAGE 3", S3B: "STAGE 3B.1 (calibrated F+M)", S3B2: "STAGE 3B.2 · placement" };
// (globalThis.__b2opts: a TOOL's RES3B2 overrides for every 3B.2 world it builds — the ablation; never set by the Lab)
export function makeWorldB2(env, opts, mode, o = {}) { if (mode !== "S3B2") return makeWorld3(env, opts, mode, o); return new PlacementWorld(env, Object.assign({}, opts, { res: Object.assign({}, S2D, o.res || {}), imp: o.imp, l3: o.l3, b2: o.b2 || globalThis.__b2opts || undefined })); }
export function runB2(env, tc, mode, o = {}) { if (o.rot) return runB2Rotated(env, tc, mode, o.rot, o); if (mode !== "S3B2") { const R = runO3(env, tc, mode, o); runB2.last = R; return R; }
  const enc = o.enc || buildEncounter(env, tc, o), opts = Object.assign(encounterOpts(enc), { mode: "MEDIUM", timing: !!o.timing, record: o.record !== false }), W = makeWorldB2(env, opts, mode, o);
  if (o.before) o.before(W, enc); const r = runEncounter(W, enc, o.onTick || null); if (W.finish) W.finish(); W.omode = mode; const R = { W, enc, mode, t0: r.t0, clip: [Math.max(0, r.t0 - (tc.c.pre || 1.0)), W.t] }; runB2.last = R; return R; }
export function runB2Rotated(env, tc, mode, th, o = {}) { const enc = buildRotated(env, tc, th, o), opts = Object.assign(encounterOpts(enc), { mode: "MEDIUM", timing: !!o.timing, record: o.record !== false });
  const W = makeWorldB2(env, opts, mode, { res: o.res, imp: o.imp, l3: o.l3, b2: o.b2 }); if (o.before) o.before(W, enc); const r = runEncounterRotated(W, enc, o.onTick || null); if (W.finish) W.finish(); W.omode = mode;
  const R = { W, enc, mode, t0: r.t0, clip: [Math.max(0, r.t0 - (tc.c.pre || 1.0)), W.t] }; runB2.last = R; return R; }

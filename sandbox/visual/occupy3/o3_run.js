// ═══ occupy3/o3_run.js — one encounter, STAGE 2 · STAGE 3, identical inputs (the same code in the Review Lab and in node) ═══════════════════════
// S2  = PLAYER OCCUPANCY STAGE 2 exactly as presented (occupy2/, unchanged: RES2)
// S2D = STAGE 2 AS DECIDED by the owner (25 Oct): RES2 + the soft wall spares an already-planned move's approach (R.wallSparesMove) — every other
//       Stage 2 decision kept (committed feet 2 / 8 / 12 cm, no look-ahead, 2 cm tolerance, 12 cm lean) — the foundation Stage 3 builds on
// S3  = STAGE 3: S2D + PHYSICAL IMPACT + BALANCE RESPONSE (o3_world.js)
import { runEncounter, encounterOpts } from "../tackle1/t_world.js";
import { buildEncounter } from "../tackle1/t_run.js";
import { outcomeShared } from "../possess1/p_run.js";
import { OccupancyWorld2 } from "../occupy2/o2_world.js";
export const S2D = { wallSparesMove: true };
export const O3_MODES = ["S2", "S2D", "S3"], O3_LABEL = { S2: "STAGE 2 (as presented)", S2D: "STAGE 2 (as decided)", S3: "STAGE 3 · Impact + balance", S3B: "STAGE 3B.1 · Limb contact" };
let ImpactWorld = null; export function setImpactWorld(C) { ImpactWorld = C; }
// (S3B = STAGE 3B.1: S3 with the limb-contact layer between Stage 2 and Stage 3 (occupy3b/l3_world.js registers it) — Stage 3's limb strikes replaced)
let LimbWorld = null; export function setLimbWorld(C) { LimbWorld = C; }
export function runO3(env, tc, mode, o = {}) { const enc = o.enc || buildEncounter(env, tc, o), opts = Object.assign(encounterOpts(enc), { mode: "MEDIUM", timing: !!o.timing, record: o.record !== false });
  let W; if (mode === "S2") W = new OccupancyWorld2(env, Object.assign(opts, { res: o.res }));
  else if (mode === "S2D") W = new OccupancyWorld2(env, Object.assign(opts, { res: Object.assign({}, S2D, o.res || {}) }));
  else if (mode === "S3B") { if (!LimbWorld) throw new Error("o3_run: import occupy3b/l3_world.js first (it registers the Stage 3B world)"); W = new LimbWorld(env, Object.assign(opts, { res: Object.assign({}, S2D, o.res || {}), imp: o.imp, l3: o.l3 })); }
  else { if (!ImpactWorld) throw new Error("o3_run: import o3_world.js first (it registers the Stage 3 world)"); W = new ImpactWorld(env, Object.assign(opts, { res: Object.assign({}, S2D, o.res || {}), imp: o.imp })); }
  if (o.before) o.before(W, enc); const r = runEncounter(W, enc, o.onTick || null); if (W.finish) W.finish(); W.omode = mode; return { W, enc, mode, t0: r.t0, clip: [Math.max(0, r.t0 - (tc.c.pre || 1.0)), W.t] }; }
export const outcomeO3 = (W) => outcomeShared(W);
// a world without an encounter's runner (the torture, the solo check drive it themselves): "S2" · "S2D" · "S3"
export function makeWorld3(env, opts, mode, o = {}) { if (mode === "S2") return new OccupancyWorld2(env, Object.assign({}, opts, { res: o.res }));
  if (mode === "S2D") return new OccupancyWorld2(env, Object.assign({}, opts, { res: Object.assign({}, S2D, o.res || {}) }));
  if (mode === "S3B") { if (!LimbWorld) throw new Error("o3_run: import occupy3b/l3_world.js first"); return new LimbWorld(env, Object.assign({}, opts, { res: Object.assign({}, S2D, o.res || {}), imp: o.imp, l3: o.l3 })); }
  if (!ImpactWorld) throw new Error("o3_run: import o3_world.js first"); return new ImpactWorld(env, Object.assign({}, opts, { res: Object.assign({}, S2D, o.res || {}), imp: o.imp })); }

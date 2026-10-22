// tc_unified1/tools/u_env.mjs — the node environment (the frozen rig: RUN-1.3, the skeleton, M4 — receive11's loader) and the two engines:
//   "BASE" = the LOCKED BASELINE-88573ef0 (tc_baseline_88573ef0/pt_sim.js, imported read-only) · "TL" = the layered copy with its layer toggles
import { X } from "../../receive11/tools/rx_env.mjs";
import { PlaySim as BaseSim } from "../../tc_baseline_88573ef0/pt_sim.js";
import { ControlledSim as TLSim } from "../c_sim.js";
import { UnifiedSim as UnifiedRef } from "../../tc_unified1/u_sim.js";
import { AgilitySim } from "../../agility99/sim.js";
import fs from "node:fs";
export const DT = 1 / 240;
const baked = JSON.parse(fs.readFileSync(new URL("../../tc_baseline_88573ef0/pt_baked.json", import.meta.url)));
export const ENV = { E: X.RUN1_V13, M4: X.M4, skel: X.skel, body: X.RUN1_V13.r1Body(X.skel), baked };
// (S99 MISSION: S99_PACE=D38 / S99_VOCAB=EXPANDED run any tool on that pace / vocabulary — the speed99 TLSim only, never a reference engine; an explicit o.pace wins)
export function makeSim(engine, o = {}) { if (process.env.S99_PACE && engine === "TL" && o.pace == null) o = Object.assign({}, o, { pace: process.env.S99_PACE }); if (process.env.S99_VOCAB && engine === "TL" && o.vocab == null) o = Object.assign({}, o, { vocab: process.env.S99_VOCAB }); if (process.env.S99_CARRY && engine === "TL" && o.carry == null) o = Object.assign({}, o, { carry: process.env.S99_CARRY }); return engine === "BASE" ? new BaseSim(ENV, o) : engine === "UNIFIED" ? new UnifiedRef(ENV, o) : engine === "ASTRA" ? new AgilitySim(ENV, Object.assign({ profile: "A99-C", ballOn: true }, o)) : new TLSim(ENV, o); }

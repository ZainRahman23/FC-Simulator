// tc_layered2/tools/tl_env.mjs — the node environment (the frozen rig: RUN-1.3, the skeleton, M4 — receive11's loader) and the two engines:
//   "BASE" = the LOCKED BASELINE-88573ef0 (tc_baseline_88573ef0/pt_sim.js, imported read-only) · "TL" = the layered copy with its layer toggles
import { X } from "../../receive11/tools/rx_env.mjs";
import { PlaySim as BaseSim } from "../../tc_baseline_88573ef0/pt_sim.js";
import { PlaySim as TLSim } from "../tl_sim.js";
import fs from "node:fs";
export const DT = 1 / 240;
const baked = JSON.parse(fs.readFileSync(new URL("../../tc_baseline_88573ef0/pt_baked.json", import.meta.url)));
export const ENV = { E: X.RUN1_V13, M4: X.M4, skel: X.skel, body: X.RUN1_V13.r1Body(X.skel), baked };
export function makeSim(engine, o = {}) { return engine === "BASE" ? new BaseSim(ENV, o) : new TLSim(ENV, o); }

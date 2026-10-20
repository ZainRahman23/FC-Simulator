// tc_responsive/tools/rs_env.mjs — Node environment for the RESPONSIVENESS EXPERIMENT and the locked BASELINE-88573ef0 (A/B): the frozen rig
// (RUN-1.3, the skeleton, M4 — receive11's loader, as the baseline's own tools use) and a simulation of either engine on it.
import { X } from "../../receive11/tools/rx_env.mjs";
import * as RXS from "../rs_sim.js";
import * as BASE from "../../tc_baseline_88573ef0/pt_sim.js";
import fs from "node:fs";
const bakedURL = new URL("../pt_baked.json", import.meta.url);
export const ENV = { E: X.RUN1_V13, M4: X.M4, skel: X.skel, body: X.RUN1_V13.r1Body(X.skel), baked: JSON.parse(fs.readFileSync(bakedURL)) };
export const SIMS = { RX: RXS.PlaySim, BASE: BASE.PlaySim };
export function makeSim(engine = "RX", o = {}) { return new SIMS[engine](ENV, o); }
export const DT = 1 / 240;

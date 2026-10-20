// tc_playtest1/tools/pt_env.mjs — Node environment for PLAYTEST-1: the frozen rig (RUN-1.3, the skeleton, M4: receive11's loader) and a PlaySim on it;
// script(sim, steps): drive it with a scripted request sequence [{ t, keys: "W" | "WA" | "", mode }] (the request's heading from the keys in the
// pitch frame: W = +x, A = left (−y in the player's frame … the pitch's +y is the player's right when facing +x), as the page's world-frame input)
import { X } from "../../receive11/tools/rx_env.mjs";
import { PlaySim, DT } from "../pt_sim.js";
import fs from "node:fs";
const bakedURL = new URL("../pt_baked.json", import.meta.url);
export const ENV = { E: X.RUN1_V13, M4: X.M4, skel: X.skel, body: X.RUN1_V13.r1Body(X.skel), baked: fs.existsSync(bakedURL) && !process.env.PT_NOBAKE ? JSON.parse(fs.readFileSync(bakedURL)) : null };
export function makeSim(o = {}) { return new PlaySim(ENV, o); }
// keys → a heading (the page's camera-latched frame is the entry heading here: W = forward 0 rad, D = right +90°, A = left −90°, S = back)
export function keysToH(keys, base = 0) { let f = 0, r = 0; if (keys.includes("W")) f += 1; if (keys.includes("S")) f -= 1; if (keys.includes("D")) r += 1; if (keys.includes("A")) r -= 1; if (!f && !r) return null; return base + Math.atan2(r, f); }
export function runScript(sim, script, until, onTick) { let i = 0, cur = { keys: "", mode: "RUN" }; const n = Math.round(until / DT);
  for (let k = 0; k < n; k++) { const t = k * DT; while (i < script.length && script[i].t <= t + 1e-9) cur = Object.assign({}, cur, script[i++]); sim.step({ h: keysToH(cur.keys, cur.base || 0), mode: cur.mode || "RUN", keys: 0 }); if (onTick) onTick(sim, k); } return sim; }

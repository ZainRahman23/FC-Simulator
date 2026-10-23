// feint2vg/tools/feint_pose.mjs — BODY FEINT V2 (VIDEO-GUIDED): the posed body's shape through a curated feint, in the body's own frame
// (forward = the entry heading, + side = toward the EXIT, up): the hands from their shoulders, the free foot from the pelvis, the trunk's pitch
// and lean, the head, the pelvis's height — the numbers behind the reference comparison (VIDEO_STUDY.md)
//   node feint_pose.mjs [--case "FAKE LEFT → RIGHT"] [--at "-0.30,-0.2,-0.1,0,0.1,0.2,0.4"]
import fs from "node:fs";
import { makeSim, ENV } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { CASES } from "../v_cases.js";
import { caseOpts, runCaseOn, summarize } from "../v_run.js";
import { PlayBody } from "../u_body.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const c = CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === arg("case", "FAKE LEFT → RIGHT")), at = arg("at", "-0.40,-0.30,-0.22,-0.15,-0.08,0,0.08,0.20,0.40").split(",").map(Number);
const sim = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, false), body = new PlayBody(env, sim);
const a = sim.log.actions ? null : null; let tC = null, m = 1, h0 = 0;
for (let t = r.t0; t < r.t0 + 2; t += 1 / 240) { const P = sim.planAt(t); if (P.action && P.action.tech && P.action.tech.startsWith("BFEINT")) { tC = P.action.tC; m = P.action.m; h0 = P.action.h0; break; } }
if (tC == null) { console.log("no feint"); process.exit(0); }
if (arg("names")) { console.log(Object.keys(body.pose(tC).J).join(" ")); process.exit(0); }
const f = [Math.cos(h0), Math.sin(h0)], rt = [-Math.sin(h0), Math.cos(h0)];   // (rt: the RIGHT of the heading (the world is left-handed: + lateral = right))
const loc = (p, o) => { const d = [p[0] - o[0], p[1] - o[1]]; return [d[0] * f[0] + d[1] * f[1], m * (d[0] * rt[0] + d[1] * rt[1]), (p[2] - o[2])]; };
console.log(`${c.variant} · touch @${(tC - r.t0).toFixed(2)} s · m ${m} (+ side = the exit)`);
for (const dt of at) { const t = tC + dt, p = body.pose(t), J = p.J, g = (k) => J[k] && J[k].j; const pel = g("pelvis"), F = m > 0 ? "R" : "L", S = F === "R" ? "L" : "R";
  const hE = loc(g("hand_" + F), g("upperArm_" + F)), hF = loc(g("hand_" + S), g("upperArm_" + S)), fF = loc(g("foot_" + F), pel), fS = loc(g("foot_" + S), pel), hd = loc(g("head"), pel), ch = loc(g("chest") || g("spine"), pel);
  const pitch = Math.atan2(hd[0], hd[2]) * 180 / Math.PI, lean = Math.atan2(hd[1], hd[2]) * 180 / Math.PI;
  const q = (v) => v.map((x) => (x >= 0 ? " " : "") + x.toFixed(2)).join(",");
  console.log(`${dt >= 0 ? "+" : ""}${dt.toFixed(2)}  pelvis h ${pel[2].toFixed(2)} | head fwd/side/up ${q(hd)} (pitch ${pitch.toFixed(0)}° lean ${lean.toFixed(0)}°) | EXIT hand ${q(hE)} | FAKE hand ${q(hF)} | free(exit) foot ${q(fF)} | fake foot ${q(fS)}`); }

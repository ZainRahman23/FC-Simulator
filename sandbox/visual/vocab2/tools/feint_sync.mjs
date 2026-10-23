// feint2ef/tools/feint_sync.mjs — BODY FEINT V2 (EXIT FOOT): the order of the reversal on the posed body — when the pelvis's sideways motion
// toward the fake reverses, when the free foot releases (its speed forward from the pelvis passes 1.5 m/s), the touch — for any build
//   node feint_sync.mjs [--build ../ | ../../feint2vg/] [--case "FAKE LEFT → RIGHT"]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const base = new URL(arg("build", "../"), import.meta.url);
const { makeSim, ENV, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { CASES } = await import(new URL("v_cases.js", base));
const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base)); const { PlayBody } = await import(new URL("u_body.js", base));
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const c = CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === arg("case", "FAKE LEFT → RIGHT")), sim = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, false), body = new PlayBody(env, sim);
let a = null; for (let t = r.t0; t < r.t0 + 2; t += 1 / 240) { const P = sim.planAt(t); if (P.action && /^BFEINT/.test(String(P.action.tech))) { a = P.action; break; } }
const tC = a.tC, m = a.m, h0 = a.h0, F = m > 0 ? "R" : "L", rt = [-Math.sin(h0), Math.cos(h0)], f = [Math.cos(h0), Math.sin(h0)];
let prevLat = null, prevFw = null, tRevPel = null, tRel = null, tPeakTrunk = null, minHead = 9;
for (let t = tC - 0.4; t <= tC; t += DT) { const p = body.pose(t), pel = p.J.pelvis.j, ft = p.J["foot_" + F].j, hd = p.J.head.j, lat = m * (pel[0] * rt[0] + pel[1] * rt[1]), fw = (ft[0] - pel[0]) * f[0] + (ft[1] - pel[1]) * f[1];
  if (prevLat != null) { const v = (lat - prevLat) / DT; if (tRevPel == null && t > tC - 0.3 && v > 0) tRevPel = t - tC; }   // (toward the fake is −: the first positive = reversed)
  if (prevFw != null && tRel == null && t > tC - 0.25 && (fw - prevFw) / DT > 1.5) tRel = t - tC;
  if (hd[2] < minHead) { minHead = hd[2]; tPeakTrunk = t - tC; } prevLat = lat; prevFw = fw; }
console.log(`${c.variant}: the lie's deepest (head lowest) ${tPeakTrunk.toFixed(3)} · pelvis reverses ${tRevPel != null ? tRevPel.toFixed(3) : "—"} · free foot releases ${tRel != null ? tRel.toFixed(3) : "—"} · touch 0`);

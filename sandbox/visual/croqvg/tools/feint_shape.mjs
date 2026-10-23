// feint2vg/tools/feint_shape.mjs — BODY FEINT V2 (VIDEO-GUIDED): the reference recording's cues, measured the same way on any build's posed body
// at the lie's deepest moment (the head's lowest point in the 0.35 s before the touch; for a case without a false step, the 0.35 s before the
// decisive contact): the trunk's forward pitch and its lean toward the fake (pelvis → head), the head's drop (from its height in the approach, 0.2 s before the request), the exit-side hand's height above
// its shoulder and how far out it is, the fake-side hand's height, the free (exit-side) foot's height and how far behind the pelvis, the fake
// foot's lateral offset; and the lowest speed
//   node feint_shape.mjs [--build ../ | ../../feint2/] [--case "FAKE LEFT → RIGHT"] [--req BODY_FEINT]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const base = new URL(arg("build", "../"), import.meta.url);
const { makeSim, ENV } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { CASES } = await import(new URL("v_cases.js", base));
const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base)); const { PlayBody } = await import(new URL("u_body.js", base));
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
export function shape(c, req) { const c2 = req ? Object.assign({}, c, { intents: [{ t: 0, id: req, foot: null, sprint: false }] }) : c;
  const sim = makeSim("TL", Object.assign(caseOpts(c2, false), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c2, false), body = new PlayBody(env, sim);
  let tC = null, m = c.ang > 0 ? 1 : -1, h0 = sim.stateAt(r.t0).h;
  for (const x of sim.contacts) if (x.t > r.t0 && (x.decisive || /BODY FEINT|redirect|REDIRECT/i.test(x.role || ""))) { tC = x.t; break; }
  for (let t = r.t0; t < r.t0 + 2 && tC == null; t += 1 / 240) { const P = sim.planAt(t); if (P.action && P.action.tC && P.action.tech) { tC = P.action.tC; h0 = P.action.h0; } }
  if (tC == null) return null;
  const f = [Math.cos(h0), Math.sin(h0)], rt = [-Math.sin(h0), Math.cos(h0)], loc = (p, o) => { const d = [p[0] - o[0], p[1] - o[1]]; return [d[0] * f[0] + d[1] * f[1], m * (d[0] * rt[0] + d[1] * rt[1]), p[2] - o[2]]; };
  let best = null, vMin = 9;
  for (let t = tC - 0.35; t <= tC; t += 1 / 120) { const p = body.pose(t), J = p.J, g = (k) => J[k].j; if (g("head")[2] < (best ? best.hz : 9)) best = { t, hz: g("head")[2], J }; }
  for (let t = r.t0; t < tC + 0.6; t += 1 / 60) vMin = Math.min(vMin, sim.stateAt(t).s);
  const J = best.J, g = (k) => J[k].j, F = m > 0 ? "R" : "L", S = F === "R" ? "L" : "R", pel = g("pelvis"), hd = loc(g("head"), pel);
  const eh = loc(g("hand_" + F), g("upperArm_" + F)), fh = loc(g("hand_" + S), g("upperArm_" + S)), ff = loc(g("foot_" + F), pel), fs_ = loc(g("foot_" + S), pel);
  const deg = (a) => (a * 180 / Math.PI);
  return { at: +(best.t - tC).toFixed(3), pelvisH: pel[2], headDropCm: (body.pose(r.t0 - 0.2).J.head.j[2] - g("head")[2]) * 100, trunkPitch: deg(Math.atan2(hd[0], hd[2])), trunkLeanToFake: -deg(Math.atan2(hd[1], hd[2])),
    exitHandUp: eh[2], exitHandOut: eh[1], fakeHandUp: fh[2], freeFootUp: g("foot_" + F)[2], freeFootBehind: -ff[0], fakeFootOut: -fs_[1], vMin };
}
const c = CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === arg("case", "FAKE LEFT → RIGHT")), o = shape(c, arg("req", null));
if (o) console.log(JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(+v).toFixed(2)]))));

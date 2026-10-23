// speed99/tools/s_trunk.mjs — THE DRAWN LEAN: the posed trunk's angle from vertical (pelvis → neck, along the travel) through a standing sprint,
// per pace, beside the lean channel it was drawn from
//   node s_trunk.mjs
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const TD = fileURLToPath(new URL("../", import.meta.url));
const { ENV, makeSim, DT } = await import(TD + "tools/u_env.mjs"); const { PlayBody } = await import(TD + "u_body.js"); const { presetLayers } = await import(TD + "c_sim.js");
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(TD + "../dribble1/d1_colliders.json")) };
for (const pace of (process.argv[2] || "CURRENT,C38,D38,E38").split(",")) { const sim = makeSim("TL", { layers: presetLayers("FULL"), ballOn: false, start: { P: [20, 34], h: 0 }, pace });
  for (let k = 0; k < 120; k++) sim.step({ h: null, mode: "RUN", keys: 64 }); const t0 = sim.t; for (let k = 0; k < 240 * 5; k++) sim.step({ h: 0, mode: "SPRINT", keys: 64 });
  const body = new PlayBody(env, sim), out = []; let names = null;
  for (const x of [0.1, 0.25, 0.4, 0.6, 0.8, 1.0, 1.3, 1.7, 2.2, 3.0, 4.0]) { const t = t0 + x, p = body.pose(t); if (!names) names = Object.keys(p.J).filter((n) => /neck|head|chest|spine/.test(n)).join(","); const a = p.J.pelvis.j, b = (p.J.neck || p.J.head || p.J.chest).j, fwd = (b[0] - a[0]) * Math.cos(sim.stateAt(t).h) + (b[1] - a[1]) * Math.sin(sim.stateAt(t).h), up = b[2] - a[2];
    out.push(`${x}s ${sim.stateAt(t).s.toFixed(1)}m/s trunk ${(Math.atan2(fwd, up) * 57.3).toFixed(0)}° (ch ${body.ch && body.ch.lean ? body.ch.lean.at(t).toFixed(0) : "?"})`); }
  console.log(pace.padEnd(8), out.join(" | ")); if (pace === "CURRENT") console.log("   joints:", names); }

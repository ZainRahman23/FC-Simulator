// tc_unified1/tools/u_gaps.mjs — every authoritative contact of Astra's BALL ON set whose drawn boot is > 3 cm from the ball: the scenario, the
// action / role / surface, and what the foot timeline did there (its offset, its corridor / clearance push, its speed limit) — and the raw foot's gap
//   node u_gaps.mjs <cfg>
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../u_sim.js";
import { request } from "../../agility99/cases.js";
process.argv.push("--ball"); const { specs: astra } = await import("./u_audit.mjs");
// (--tests <substr>: the owner's report-card traces (u_tests.js TESTS) instead of Astra's set — the page's own stick input)
const ti = process.argv.indexOf("--tests"), { TESTS, MODES: TM, reqOf } = await import("../u_tests.js");
const specs = ti > 0 ? TESTS.filter((x) => x.name.includes(process.argv[ti + 1])).map((x) => ({ id: x.name, t0: x.changes[0], end: x.dur, fn: (t) => x, test: x })) : astra;
const cfg = process.argv[2], env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
for (const spec of specs) { const sim = makeSim("TL", Object.assign({ layers: presetLayers(cfg.replace(/-(FREE|CONTROLLED)$/, "")), ballOn: true }, /CONTROLLED$/.test(cfg) ? { control: "CONTROLLED" } : {})), body = new PlayBody(env, sim), n = Math.round(spec.end / DT);
  for (let k = 0; k < n; k++) sim.step(spec.test ? reqOf(spec.test.f, k * DT, TM[spec.test.mode]) : request(k * DT < 0.2 ? null : spec.fn(k * DT), spec.mode));
  for (let k = Math.round(spec.t0 / DT); k <= sim.k; k++) body.pose(k * DT);
  for (const c of sim.contacts.filter((c) => c.t >= spec.t0 && !c.missed)) { const p = body.pose(c.t), g = p.gap?.[c.F]?.gap; if (!(g > 0.03)) continue; const f = p.feet[c.F], P = sim.planAt(c.t);
    const raw = body.rawAt(c.F, c.t, sim.planAt(Math.max(0, c.t - DT / 2)));
    console.log(`${spec.id.padEnd(26)} t ${c.t.toFixed(3)} ${c.F} gap ${(g * 100).toFixed(1)} cm · ${P.action.kind}/${P.action.label} ${c.role || ""} ${c.surface} · off ${((f.tlOff || 0) * 100).toFixed(1)} corr ${((f.corridor || 0) * 100).toFixed(1)} clr ${((f.cleared || 0) * 100).toFixed(1)} lim ${f.limited ? (f.limited * 100).toFixed(0) : "-"} · raw→drawn ${(Math.hypot(...raw.ank.map((x, i) => x - f.ank[i])) * 100).toFixed(1)} cm · contactFlag ${f.contact ? 1 : 0} planted ${f.planted ? 1 : 0}`); } }

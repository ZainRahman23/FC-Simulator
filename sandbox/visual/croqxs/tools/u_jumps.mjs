// tc_unified1/tools/u_jumps.mjs — a foot-jump / intersection diagnostic: for one of Astra's scenarios under one configuration, every tick where a
// rendered toe moves > 12 cm (or the leg capsules intersect < −2 cm) with what changed: the plan, the action, the raw foot, the timeline offset
//   node u_jumps.mjs <scenario id> <cfg> [--ball] [--x]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../u_sim.js";
import { scenario, request } from "../../agility99/cases.js";
const A = process.argv, id = A[2], cfg = A[3], ballOn = A.includes("--ball"), X = A.includes("--x");
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) }, dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const [mode, kind, ...r] = id.split("_"); let spec;
if (kind === "snap") spec = scenario("snap", mode, +r[0], +r[1].slice(1), r[2] === "R" ? 1 : -1); else spec = scenario(kind, mode, 90, +r[0].slice(1), r[1] === "R" ? 1 : -1);
const sim = makeSim("TL", { layers: presetLayers(cfg), ballOn }), body = new PlayBody(env, sim), n = Math.round(spec.end / DT);
for (let k = 0; k < n; k++) { const t = k * DT; sim.step(request(t < 0.2 ? null : spec.fn(t), spec.mode)); }
let prev = null;
for (let k = Math.round(spec.t0 / DT); k <= sim.k; k++) { const t = k * DT, p = body.pose(t), P = sim.planAt(t), c = Math.min(...Object.values(p.clr));
  if (prev) for (const F of ["R", "L"]) { const d = dist(p.J["toe_" + F].j, prev.J["toe_" + F].j), da = dist(p.feet[F].ank, prev.feet[F].ank);
    if (d > 0.12) console.log(`${t.toFixed(4)} ${F} toe ${(d * 100).toFixed(1)} ank ${(da * 100).toFixed(1)} pl ${prev.feet[F].planted ? 1 : 0}→${p.feet[F].planted ? 1 : 0} off ${((p.feet[F].tlOff || 0) * 100).toFixed(1)} plan v${P.v} t0 ${P.t0.toFixed(3)} ${P.action.kind}/${P.action.label || ""} ${P.reason || ""}${P !== prev.P ? " SWITCH" : ""} sw ${p.feet[F].swing ? p.feet[F].swing.from.id + ">" + p.feet[F].swing.to.id : "-"} short ${p.legs[F].short?.toFixed?.(3)} ikErr ${p.legs[F].err?.toFixed?.(1)}`); }
  if (X && c < -0.02) { const st = sim.stateAt(t), lat = (F) => { const a = p.feet[F].ank, d = [a[0] - st.P[0], a[1] - st.P[1]]; return ((-d[0] * Math.sin(st.psi) + d[1] * Math.cos(st.psi)) * (F === "R" ? 1 : -1) * 100).toFixed(0) + "/" + ((d[0] * Math.cos(st.psi) + d[1] * Math.sin(st.psi)) * 100).toFixed(0) + (p.feet[F].planted ? "P" : p.feet[F].contact ? "C" : "S"); };
    console.log(`${t.toFixed(4)} INTERSECT ${(c * 100).toFixed(1)} ${Object.entries(p.clr).filter(([k, v]) => v < -0.02).map(([k, v]) => k + " " + (v * 100).toFixed(1)).join(", ")} R ${lat("R")} L ${lat("L")} w ${(st.turnRate * 180 / Math.PI || 0).toFixed(0)} s ${st.s.toFixed(1)} ${P.action.kind}/${P.action.label || ""}`); }
  prev = { J: p.J, feet: { R: { ...p.feet.R }, L: { ...p.feet.L } }, P }; }

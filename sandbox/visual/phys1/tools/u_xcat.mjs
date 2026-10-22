// tc_unified1/tools/u_xcat.mjs — the intersection frames of Astra's BALL ON set by kind: which segments, which foot states (planted / swing /
// contact), which action (carry / generic / technique), how far the crossing foot is across the midline — to aim the next fix
//   node u_xcat.mjs <cfg>
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../u_sim.js";
import { request } from "../../agility99/cases.js";
process.argv.push("--ball"); const { specs } = await import("./u_audit.mjs");
const cfg = process.argv[2], env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) }, C = {}, inc = (k) => (C[k] = (C[k] || 0) + 1);
for (const spec of specs) { const sim = makeSim("TL", { layers: presetLayers(cfg), ballOn: true }), body = new PlayBody(env, sim), n = Math.round(spec.end / DT);
  for (let k = 0; k < n; k++) sim.step(request(k * DT < 0.2 ? null : spec.fn(k * DT), spec.mode));
  let prev = null;
  for (let k = Math.round(spec.t0 / DT); k <= sim.k; k++) { const t = k * DT, p = body.pose(t), c = Math.min(...Object.values(p.clr)), P0 = sim.planAt(Math.max(0, t - DT / 2));
    // (the jumps: the toe > 12 cm in a tick — what moved: the drawn ankle (the raw foot / the timeline offset) or only the orientation / IK)
    if (prev) for (const F of ["R", "L"]) { const d = Math.hypot(...p.J["toe_" + F].j.map((x, i) => x - prev.J["toe_" + F].j[i])); if (d <= 0.12) continue;
      const fa = p.feet[F], fb = prev.feet[F], da = Math.hypot(...fa.ank.map((x, i) => x - fb.ank[i])), raw = body.rawAt(F, t, P0), rawP = body.rawAt(F, t - DT, P0), dr = Math.hypot(...raw.ank.map((x, i) => x - rawP.ank[i]));
      const dyaw = Math.abs(Math.atan2(Math.sin(fa.yaw - fb.yaw), Math.cos(fa.yaw - fb.yaw))) * 180 / Math.PI, P = sim.planAt(t);
      inc("jump " + (da > 0.10 ? (dr > 0.10 ? "ANKLE raw-fast" + (fa.swing?.con ? "+con" : "") + (P.action.tech ? " tech" : P.action.kind === "GENERIC" ? " gen" : " carry") : "ANKLE offset/push") : dyaw > 20 ? "YAW " + (fa.planted ? "planted" : "swing") : "IK/pitch dp" + Math.round(Math.abs((fa.pitch || 0) - (fb.pitch || 0)) * 180 / Math.PI / 5) * 5 + " dy" + Math.round(dyaw / 5) * 5 + " sh" + (p.legs[F].short > 0.01 ? "Y" : "n") + " " + (fa.planted !== fb.planted ? "liftoff/td" : fa.planted ? "planted" : "swing"))); }
    prev = { J: p.J, feet: { R: p.feet.R, L: p.feet.L } };
    if (c >= -0.02) continue;
    const st = sim.stateAt(t), P = sim.planAt(t), seg = Object.entries(p.clr).filter(([, v]) => v < -0.02).map(([k]) => k).sort().join("+"), S = (F) => (p.feet[F].planted ? "P" : p.feet[F].contact ? "C" : "S");
    const lat = (F) => { const a = p.feet[F].ank, d = [a[0] - st.P[0], a[1] - st.P[1]]; return (-d[0] * Math.sin(st.psi) + d[1] * Math.cos(st.psi)) * (F === "R" ? 1 : -1); }, cross = Math.min(lat("R"), lat("L"));
    inc("seg " + seg); inc("feet " + [S("R"), S("L")].sort().join("")); inc("act " + (P.action.tech ? "tech " + P.action.tech : P.action.kind)); const dps = Math.abs(Math.atan2(Math.sin(st.psi - st.h), Math.cos(st.psi - st.h))) * 180 / Math.PI; inc("psi-h " + (dps < 5 ? "<5" : dps < 15 ? "5-15" : dps < 30 ? "15-30" : ">30") + "°" + (st.s > 4 ? " fast" : " slow")); { const XF = lat("R") < lat("L") ? "R" : "L", fx = p.feet[XF], age = fx.planted && fx.stance ? t - fx.stance.t0 : fx.swing ? t - fx.swing.t0 : -1; inc("crossed foot " + S(XF) + (fx.planted ? (fx.stance?.src || "?") + (fx.stance?.commit ? " COMMIT" : "") + " off" + Math.round((fx.tlOff||0)*100) + " lat" + Math.round(lat(XF)*100) : fx.swing?.con ? "+con" : "") + (age < 0.1 ? " early" : " late")); } inc("cross " + (cross < -0.05 ? "<-5" : cross < 0 ? "-5..0" : cross < 0.05 ? "0..5" : ">5") + " cm"); } }
for (const k of Object.keys(C).sort()) console.log(k.padEnd(40), C[k]);

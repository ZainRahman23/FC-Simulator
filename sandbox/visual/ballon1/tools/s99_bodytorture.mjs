// speed99/tools/s99_bodytorture.mjs — THE INTEGRATED PLAYER'S BODY UNDER TORTURE (S99 MISSION, the long torture's body half): the seeded analog
// torture programs (c_torture.mjs: holds, snaps, rotations, oscillations, wandering, stops, abuse — walk / jog / run / sprint) with the BALL ON,
// CONTROLLED_BALL, posed every 1/240 s tick — per configuration:
//   JUMP   a toe or ankle moving > 12 cm in one tick        KNEE   a knee angle changing > 20° in one tick
//   CROSS  leg capsules interpenetrating < −2 cm (onsets)   FLOAT  no foot down > 0.18 s (> 0.08 s below 3 m/s)
//   SLIDE  a planted foot's ball moving > 4 mm in one tick (same stance, not a pivot) — and each failure's action
//   node s99_bodytorture.mjs [--configs D38:EXPANDED,CURRENT:CORE] [--seeds 8] [--dur 60] [--from 1]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, hyp = Math.hypot, DEG = Math.PI / 180;
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const knee = (J, X) => { const a = J["thigh_" + X].j, b = J["shin_" + X].j, c = J["foot_" + X].j, u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (hyp(...u) * hyp(...v))))); };
for (const cfg of opt("configs", "D38:EXPANDED,CURRENT:CORE").split(",")) { const [pace, vocab] = cfg.split(":"), seeds = +opt("seeds", 8), dur = +opt("dur", 60), from = +opt("from", 1);
  const C = { jump: 0, knee: 0, cross: 0, float: 0, slide: 0 }, byAct = {}, bySeg = {}, segT = {}; let ticks = 0, poseMs = 0;
  for (let sd = from; sd < from + seeds; sd++) { const P = program(sd, dur), sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control: "CONTROLLED", pace, vocab })), body = new PlayBody(env, sim);
    let prev = null, air = 0, crossOn = false, floatOn = false; const add = (k) => { C[k]++; const a = sim.plan.action.label; byAct[a] = byAct[a] || {}; byAct[a][k] = (byAct[a][k] || 0) + 1; const g = P.at(sim.t), sk = `${g.kind}·${g.mode}`; bySeg[sk] = bySeg[sk] || {}; bySeg[sk][k] = (bySeg[sk][k] || 0) + 1; };
    for (let k = 0; k < Math.round(dur / DT); k++) { sim.step(P.req(k * DT)); const t0 = performance.now(), p = body.pose(sim.t); poseMs += performance.now() - t0; ticks++; if (sim.t < 1.2) { prev = null; continue; } const st = sim.stateAt(sim.t); { const g = P.at(sim.t), sk = `${g.kind}·${g.mode}`; segT[sk] = (segT[sk] || 0) + DT; }
      const c = Math.min(...Object.values(p.clr)); if (c < -0.02) { if (!crossOn) add("cross"); crossOn = true; } else crossOn = false;
      if (!p.feet.R.planted && !p.feet.L.planted) air += DT; else air = 0; const fl = air > 0.18 || (air > 0.08 && st.s < 3); if (fl && !floatOn) add("float"); floatOn = fl;
      if (prev) for (const X of ["R", "L"]) { const f = p.feet[X], q = prev.feet[X], a = f.ank, a0 = q.ank, t1 = p.J["toe_" + X].j, tq = prev.toe[X];
        if (Math.max(hyp(a[0] - a0[0], a[1] - a0[1], a[2] - a0[2]), hyp(t1[0] - tq[0], t1[1] - tq[1], t1[2] - tq[2])) > 0.12) add("jump");
        if (Math.abs(knee(p.J, X) - prev.knee[X]) > 20 * DEG) add("knee");
        if (f.planted && q.planted && f.stance && q.stance && f.stance.id === q.stance.id && !f.stance.pivot && f.ballPt && q.ballPt && hyp(f.ballPt[0] - q.ballPt[0], f.ballPt[1] - q.ballPt[1]) > 0.004) add("slide"); }
      prev = { feet: { R: { ...p.feet.R, ank: p.feet.R.ank.slice(), ballPt: p.feet.R.ballPt && p.feet.R.ballPt.slice() }, L: { ...p.feet.L, ank: p.feet.L.ank.slice(), ballPt: p.feet.L.ballPt && p.feet.L.ballPt.slice() } }, toe: { R: p.J.toe_R.j.slice(), L: p.J.toe_L.j.slice() }, knee: { R: knee(p.J, "R"), L: knee(p.J, "L") } }; } }
  const mins = seeds * (dur - 1.2) / 60, top = Object.entries(byAct).map(([a, o]) => [a, Object.values(o).reduce((x, y) => x + y, 0), o]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`■ ${pace} · ${vocab} · BALL ON · CONTROLLED · ${mins.toFixed(1)} min posed every tick: jumps ${C.jump} (${(C.jump / mins).toFixed(2)}/min) · knee pops ${C.knee} (${(C.knee / mins).toFixed(2)}/min) · crossings ${C.cross} (${(C.cross / mins).toFixed(2)}/min) · floats ${C.float} · slides ${C.slide} · pose ${(poseMs / ticks).toFixed(3)} ms`);
  console.log(`   by action: ${top.map(([a, n, o]) => `${a} ${n} ${JSON.stringify(o)}`).join(" · ")}`);
  console.log(`   by input segment (per simulated minute of it): ${Object.keys(segT).sort().map((k) => `${k} ${(segT[k] / 60).toFixed(1)} min: ${Object.entries(bySeg[k] || {}).map(([x, n]) => `${x} ${(n / (segT[k] / 60)).toFixed(0)}`).join(" ") || "clean"}`).join(" · ")}`); }

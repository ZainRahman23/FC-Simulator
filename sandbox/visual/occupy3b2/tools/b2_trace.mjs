// occupy3b2/tools/b2_trace.mjs — one case, one player's foot, tick by tick: its stance (id, kind, t0 … t1, place), the target ankle (the feet
// timeline), the drawn ankle, the leg's shortfall, the hip–ankle distance, the root, Stage 3's pelvis offset / step, the plan's version.
//   node b2_trace.mjs --id turn-into --who a --X L --t0 1.7 --t1 2.1 [--mode S3B]
import { ENV, setOf, arg } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 as runO3 } from "../b2_run.js";
const DT = 1 / 240, hyp = Math.hypot, f3 = (v) => (v == null ? "—" : v.toFixed(3)), c1 = (v) => (v * 100).toFixed(1);
globalThis.__b2opts = JSON.parse(arg("cfg", "null")) || undefined;
const ID = arg("id"), WHO = arg("who", "a"), X = arg("X", "L"), T0 = +arg("t0", 0), T1 = +arg("t1", 9), MODE = arg("mode", "S3B"), SET = arg("set", "l3");
const tc = setOf(SET).find((x) => x.id === ID) || setOf("review").find((x) => x.id === ID); const rows = [];
const R = runO3(ENV, tc, MODE, { record: true, onTick: (W) => { const t = W.att.t, p = WHO === "a" ? W.att : W.def, LP = W.livePoses(), pose = WHO === "a" ? LP.a : LP.d, s = W.ps ? W.ps.get(p) : null, st = p.stateAt(t);
  const L = p.plan.stances[X], now = L.find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), nx = L.find((q) => q.t0 > t + 1e-9), J = pose.J, an = J["foot_" + X].j, hip = J["thigh_" + X].j, f = pose.feet[X];
  rows.push({ t, v: p.plan.v, st: now ? `${now.id} ${now.kind || ""} [${f3(now.t0)} … ${now.t1 === Infinity ? "∞" : f3(now.t1)}] @${now.pos.map(f3).join(",")}` : nx ? `swing → ${nx.id} ${nx.kind || ""} at ${f3(nx.t0)} @${nx.pos.map(f3).join(",")}` : "—",
    tgt: f.ank, an, short: pose.legs[X].short, hd: hyp(hip[0] - an[0], hip[1] - an[1], hip[2] - an[2]), root: st.P, V: st.V, sP: s && s.active ? s.P.slice() : null, u: s && s.active ? s.u.slice() : null, step: s && s.step ? `${s.step.X} ${s.step.kind} land ${f3(s.step.tLand)}${s.step.landed ? " LANDED" : ""}` : "", cls: s && s.active ? s.cls : "", tl: f.tlOff }); } });
console.log(`${ID} ${WHO === "a" ? "ATT" : "DEF"} ${X} — ${MODE}, clip from ${R.t0.toFixed(3)} (times relative)`);
for (const r of rows) { const tr = r.t - R.t0; if (tr < T0 || tr > T1) continue;
  console.log(`${tr.toFixed(3)} v${r.v} ${r.st.padEnd(70)} tgt ${r.tgt.slice(0, 2).map(f3).join(",")} drawn ${r.an.slice(0, 2).map(f3).join(",")} short ${c1(r.short)} hip–ank ${f3(r.hd)} root ${r.root.map(f3).join(",")} V ${r.V.map((v) => v.toFixed(2)).join(",")} ${r.sP ? `S3 P ${r.sP.map((v) => c1(v)).join(",")} u ${r.u.map((v) => v.toFixed(2)).join(",")} ${r.cls}` : ""} ${r.step} tl ${c1(r.tl || 0)}`); }

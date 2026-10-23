// croqvg/tools/croq_probe.mjs — LA CROQUETA (VIDEO-GUIDED): one curated croqueta case on any build's posed body — the contacts (time, foot,
// surface, role), the actions, and through the transfer (from 0.3 s before the first croqueta contact to 0.6 s after) the lateral displacement
// (+ = toward the exit side, from the entry line at the request) of the authoritative root, the posed pelvis, the head, both feet and the ball,
// the root's speed, the trunk's lean (pelvis → head) toward the exit
//   node croq_probe.mjs [--build ../ | ../../feint2ef/] [--case "REF · JOG L → R"] [--every 6]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export async function croqTool(buildRel) { const base = new URL(buildRel, import.meta.url);
  const { makeSim, ENV, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base)); const { PlayBody } = await import(new URL("u_body.js", base));
  const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
  return function run(c, mirror = false) { const sim = makeSim("TL", Object.assign(caseOpts(c, mirror), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, mirror), body = new PlayBody(env, sim), t0 = r.t0;
    const st0 = sim.stateAt(t0), h0 = st0.s > 0.6 ? st0.h : st0.psi, side = (c.ang > 0 ? 1 : -1) * (mirror ? -1 : 1), f = [Math.cos(h0), Math.sin(h0)], rt = [-Math.sin(h0), Math.cos(h0)];
    const lat = (p) => side * ((p[0] - st0.P[0]) * rt[0] + (p[1] - st0.P[1]) * rt[1]), fwd = (p) => (p[0] - st0.P[0]) * f[0] + (p[1] - st0.P[1]) * f[1];
    const cs = sim.contacts.filter((x) => x.t >= t0 - 1e-9 && x.t < t0 + 2.0).map((x) => ({ t: +(x.t - t0).toFixed(3), F: x.F, surface: x.surface, role: (x.role || "").slice(0, 60), missed: !!x.missed }));
    const acts = []; let lastA = null; for (let t = t0; t < t0 + 2.0; t += DT) { const a = sim.planAt(t).action; const lab = a.label || a.kind; if (lab !== lastA) { acts.push(`${(t - t0).toFixed(2)} ${lab}`); lastA = lab; } }
    const first = cs.find((x) => /croq|LATERAL|transfer/i.test(x.role)) || cs[0], tF = first ? first.t + t0 : t0 + 0.5; const rows = [];
    for (let t = tF - 0.3; t <= tF + (+arg("span", 0.6)) + 1e-9; t += DT) { const p = body.pose(t), s = sim.stateAt(t), J = p.J, b = p.ball;
      rows.push({ dt: +(t - tF).toFixed(3), root: lat(s.P), pelvis: lat(J.pelvis.j), head: lat(J.head.j), R: lat(J.foot_R.j), L: lat(J.foot_L.j), ball: lat(b), ballF: fwd(b) - fwd(J.pelvis.j), sp: s.s, lean: Math.atan2(lat(J.head.j) - lat(J.pelvis.j), J.head.j[2] - J.pelvis.j[2]) * 180 / Math.PI, Rp: p.feet.R.planted, Lp: p.feet.L.planted, pelH: J.pelvis.j[2] }); }
    return { cs, acts, rows, tFirst: first ? first.t : null }; }; }
if (import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
  const base = new URL(arg("build", "../"), import.meta.url); const { CASES } = await import(new URL("../v_cases.js", import.meta.url)); const run = await croqTool(arg("build", "../"));
  const c = CASES.find((x) => x.tech === "CROQUETA" && x.variant === arg("case", "REF · JOG L → R")), o = run(c, !!arg("mirror"));
  console.log(`${c.variant} · contacts: ${o.cs.map((x) => `${x.t}s ${x.F} ${x.surface} [${x.role}]${x.missed ? " MISSED" : ""}`).join(" | ")}`); console.log(`actions: ${o.acts.join(" → ")}`);
  const ev = +arg("every", 6); console.log("dt (from the first croqueta contact) · across (+ = the exit side, m): root pelvis head | R foot L foot | ball (ahead of pelvis) | speed | lean→exit | pelvis h");
  o.rows.forEach((r, i) => { if (i % ev) return; console.log(`${r.dt >= 0 ? "+" : ""}${r.dt.toFixed(3)}  root ${r.root.toFixed(2)} pel ${r.pelvis.toFixed(2)} head ${r.head.toFixed(2)} | R ${r.R.toFixed(2)}${r.Rp ? "▪" : " "} L ${r.L.toFixed(2)}${r.Lp ? "▪" : " "} | ball ${r.ball.toFixed(2)} (${r.ballF.toFixed(2)}) | v ${r.sp.toFixed(1)} | lean ${r.lean.toFixed(0)}° | h ${r.pelH.toFixed(2)}`); }); }

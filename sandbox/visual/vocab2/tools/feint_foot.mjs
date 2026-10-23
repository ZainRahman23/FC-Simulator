// feint2ef/tools/feint_foot.mjs — BODY FEINT V2 (EXIT FOOT): the free (exit-side) foot through the lie on the posed body of any build — its
// place from the pelvis (ahead, side: + toward the EXIT, up), its toe's direction (+ toward the exit), the fake foot; at the decisive contact the
// boot surface nearest the ball and its gap (u_body's hull); the foot's largest per-tick step (cm) and turn rate (°/s: an ankle snap)
//   node feint_foot.mjs [--build ../ | ../../feint2vg/] [--case "FAKE LEFT → RIGHT"] [--rows 1]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export async function footTool(buildRel) { const base = new URL(buildRel, import.meta.url);
const { makeSim, ENV, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { CASES } = await import(new URL("v_cases.js", base));
const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base)); const { PlayBody } = await import(new URL("u_body.js", base));
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
return { CASES, footRun: function footRun(c, mirror = false) { const sim = makeSim("TL", Object.assign(caseOpts(c, mirror), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, mirror), body = new PlayBody(env, sim);
  let a = null; for (let t = r.t0; t < r.t0 + 2; t += 1 / 240) { const P = sim.planAt(t); if (P.action && /^BFEINT/.test(String(P.action.tech))) { a = P.action; break; } }
  if (!a) return null; const tC = a.tC, m = a.m, h0 = a.h0, F = m > 0 ? "R" : "L", S = F === "R" ? "L" : "R", f = [Math.cos(h0), Math.sin(h0)], rt = [-Math.sin(h0), Math.cos(h0)];
  const loc = (p, o) => { const d = [p[0] - o[0], p[1] - o[1]]; return [d[0] * f[0] + d[1] * f[1], m * (d[0] * rt[0] + d[1] * rt[1]), p[2]]; };
  const yawOf = (J, X) => { const a = J["foot_" + X].j, b = J["toe_" + X].j; return m * (Math.atan2(b[1] - a[1], b[0] - a[0]) - h0) * 180 / Math.PI; };
  const rows = []; let prevP = null, prevY = null, maxStep = 0, maxYawRate = 0, tStep = null, tYaw = null, minSide = 9, tMinSide = null, contact = null;
  for (let t = tC - 0.45; t <= tC + 0.12 + 1e-9; t += DT) { const p = body.pose(t), J = p.J, pel = J.pelvis.j, ff = loc(J["foot_" + F].j, pel), fs_ = loc(J["foot_" + S].j, pel), y = yawOf(J, F);
    const wy = ((y - (prevY ?? y) + 540) % 360) - 180; if (prevP) { const st = Math.hypot(J["foot_" + F].j[0] - prevP[0], J["foot_" + F].j[1] - prevP[1], J["foot_" + F].j[2] - prevP[2]); if (st > maxStep) { maxStep = st; tStep = t - tC; } if (Math.abs(wy) / DT > maxYawRate) { maxYawRate = Math.abs(wy) / DT; tYaw = t - tC; } }
    prevP = J["foot_" + F].j.slice(); prevY = y; if (t < tC - 0.02 && !p.feet[F].planted && ff[1] < minSide) { minSide = ff[1]; tMinSide = t - tC; }
    if (contact == null && t >= tC - 1e-9) contact = { gap: p.gap && p.gap[F] ? p.gap[F].gap : null, face: p.gap && p.gap[F] ? p.gap[F].face : null };
    if (Math.round((t - tC) / DT) % (+arg("every", 8)) === 0) rows.push({ dt: +(t - tC).toFixed(3), free: ff.map((x) => +x.toFixed(2)), toe: +y.toFixed(0), planted: p.feet[F].planted, fake: fs_.map((x) => +x.toFixed(2)), clr: +Math.min(...Object.values(p.clr)).toFixed(3) }); }
  // (per phase — approach · lie · release · landing — the free foot's largest per-tick step and toe-turn rate, and its mean place across in the lie)
  const tS = (a.T && a.T.tS) || 1, ph = [["approach", -0.45, -0.38], ["lie", -0.38, -0.11], ["release", -0.11, 0], ["landing", 0, 0.12]].map(([n, x0, x1]) => ({ n, x0: x0 * (a.tech === "BFEINT_R" ? 0.8 : a.tech === "BFEINT_L" ? 1.12 : 1), x1: x1 * (a.tech === "BFEINT_R" ? 0.8 : a.tech === "BFEINT_L" ? 1.12 : 1), step: 0, yaw: 0, side: [], toe: [] }));
  { let pp = null, py = null; for (let t = tC - 0.5; t <= tC + 0.12 + 1e-9; t += DT) { const p = body.pose(t), J = p.J, x = t - tC, y = yawOf(J, F), fp = J["foot_" + F].j; const q = ph.find((o) => x >= o.x0 - 1e-9 && x < o.x1 - 1e-9);
      if (q && pp) { q.step = Math.max(q.step, Math.hypot(fp[0] - pp[0], fp[1] - pp[1], fp[2] - pp[2])); q.yaw = Math.max(q.yaw, Math.abs(((y - py + 540) % 360) - 180) / DT); }
      if (q && q.n === "lie") { q.side.push(loc(fp, J.pelvis.j)[1]); q.toe.push(y); } pp = fp.slice(); py = y; } }
  const phases = Object.fromEntries(ph.map((o) => [o.n, { stepCm: +(o.step * 100).toFixed(1), toeRate: +o.yaw.toFixed(0), side: o.side.length ? +(o.side.reduce((a, b) => a + b, 0) / o.side.length).toFixed(2) : null, toe: o.toe.length ? +(o.toe.reduce((a, b) => a + b, 0) / o.toe.length).toFixed(0) : null }]));
  const surf = (sim.contacts.find((x) => Math.abs(x.t - tC) < 0.01) || {}).surface;
  return { tC: +(tC - r.t0).toFixed(3), F, minSide: +minSide.toFixed(2), tMinSide: tMinSide != null ? +tMinSide.toFixed(3) : null, contact, surface: surf, maxStepCm: +(maxStep * 100).toFixed(1), tStep: tStep != null ? +tStep.toFixed(3) : null, maxYawRate: +maxYawRate.toFixed(0), tYaw: tYaw != null ? +tYaw.toFixed(3) : null, phases, rows }; } }; }
if (import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) { const { CASES, footRun } = await footTool(arg("build", "../"));
const c = CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === arg("case", "FAKE LEFT → RIGHT")), o = footRun(c);
console.log(`${c.variant} · touch ${o.tC} s · free foot ${o.F} · closest to the fake side ${o.minSide} m (+ = the exit side) @${o.tMinSide} · contact: ${o.surface} (nearest boot face ${o.contact.face}, gap ${(o.contact.gap * 100).toFixed(1)} cm) · max step ${o.maxStepCm} cm/tick @${o.tStep} · max toe turn ${o.maxYawRate}°/s @${o.tYaw}`);
console.log("   " + Object.entries(o.phases).map(([k, v]) => `${k}: step ${v.stepCm} cm · toe ${v.toeRate}°/s${v.side != null ? ` · across ${v.side} m · toe ${v.toe}°` : ""}`).join(" | "));
if (arg("rows")) for (const r of o.rows) console.log(`${r.dt >= 0 ? "+" : ""}${r.dt.toFixed(3)}  free ahead ${r.free[0].toFixed(2)} side ${r.free[1].toFixed(2)} up ${r.free[2].toFixed(2)} toe ${r.toe}° ${r.planted ? "PLANT" : "swing"} | fake ${r.fake[0].toFixed(2)},${r.fake[1].toFixed(2)} | clr ${r.clr}`);
}

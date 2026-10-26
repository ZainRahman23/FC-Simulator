// occupy3b2/tools/b2_diag.mjs — STAGE 3B.2 DIAGNOSIS (before any change): where the lower-body failures of the calibrated 3B.1 come from.
// Per case and mode (S2D · S3 · S3B), every tick of the clip, the bodies as drawn:
//   LEG OVERLAP > 5 cm — the deepest leg pair; each side's leg state (PLANTED · LANDING ≤ 60 ms · SWING), its stance a recovery step or not, the
//     player committed or not, Stage 3 active, a recovery step in flight
//   PLANTED DRIFT — a planted foot's drawn ball of the foot against its first grounded tick in that stance (o3_metrics' rule), with the plan's own
//     stance place at that tick (did the PLAN move it?) and the drawn ankle against the stance (did the BODY leave it?)
//   CROSSED FEET — the feet across each other's line > 5 cm in the pelvis frame; the swing / plant state of each foot, a recovery step involved
//   node b2_diag.mjs --set review|matrix|l3|moves|search [--ids a,b] [--modes S3,S3B] [--top 12]
import { ENV, setOf, arg, cm } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 as runO3 } from "../b2_run.js";
import { volumesOf, detect, GROUP } from "../../occupy1/o_volumes.js";
const DT = 1 / 240, hyp = Math.hypot, SET = arg("set", "review"), IDS = arg("ids") ? arg("ids").split(",") : null, MODES = arg("modes", "S2D,S3,S3B").split(","), TOP = +arg("top", 12);
const legOf = (id) => { const m = /^(THIGH|SHIN|FOOT)_([RL])$/.exec(id); return m ? m[2] : null; };
function legState(p, X, t) { const L = p.plan.stances[X], now = L.find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), nx = L.find((q) => q.t0 > t + 1e-9), pv = [...L].reverse().find((q) => q.t1 <= t + 1e-9);
  const rec = (q) => !!(q && /recovery step/.test(q.kind || ""));
  if (now) return { st: "PLANTED", rec: rec(now), since: t - now.t0, id: now.id, pos: now.pos };
  if (nx && nx.t0 - t <= 0.06) return { st: "LANDING", rec: rec(nx), inMs: (nx.t0 - t) * 1000, id: nx.id, pos: nx.pos };
  return { st: "SWING", rec: rec(nx), inMs: nx ? (nx.t0 - t) * 1000 : null, sinceLift: pv ? t - pv.t1 : null, id: nx ? nx.id : null }; }
const L = setOf(SET).filter((x) => !IDS || IDS.includes(x.id)), out = {};
for (const m of MODES) out[m] = { overl: [], drift: [], cross: [], buckets: {}, crossB: {}, driftB: {} };
for (const tc of L) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  for (const mode of MODES) { const live = new Map();
    const R = runO3(ENV, tc, mode, { record: true, onTick: (W) => { const t = W.att.t, k = W.k, row = { t };
      for (const [key, p] of [["a", W.att], ["d", W.def]]) { const s = W.ps ? W.ps.get(p) : null, st = p.stateAt(t);
        row[key] = { psi: st.psi, R: legState(p, "R", t), L: legState(p, "L", t), cm: W.committed ? W.committed(p, t) : null, s3: !!(s && s.active), step: s && s.step && !s.step.landed ? { X: s.step.X, kind: s.step.kind } : null, P: s && s.active ? hyp(...s.P) : 0,
          q: W.legs ? Object.fromEntries(["R", "L"].map((X) => [X, W.legs.get(p)[X].dAnk])) : { R: 0, L: 0 } }; }
      live.set(k, row); } });
    const W = R.W, k0 = Math.round(R.clip[0] / DT), k1 = Math.round(R.clip[1] / DT), O = out[mode], land = { a: {}, d: {} };
    for (let k = k0; k <= k1; k++) { const F = W.frames.get(k), q = live.get(k); if (!F || !q) continue; const t = k * DT;
      // ── the deepest leg pair beyond 5 cm ──
      const P = detect(volumesOf(F.a.J), volumesOf(F.d.J), { within: 0 }).filter((x) => x.both && !(GROUP[x.A] === "TRUNK" && GROUP[x.B] === "TRUNK"));
      const deep = P.reduce((a, x) => (!a || x.pen > a.pen ? x : a), null);
      if (deep && deep.pen > 0.05) { const XA = legOf(deep.A), XB = legOf(deep.B), sa = XA ? q.a[XA] : { st: "TRUNK" }, sb = XB ? q.d[XB] : { st: "TRUNK" };
        const lab = (s, side) => s.st + (s.rec ? "(rec)" : "") + (side.step ? "*" : ""), key = [lab(sa, q.a), lab(sb, q.d)].sort().join(" × ");
        O.buckets[key] = (O.buckets[key] || 0) + 1; O.overl.push({ id: tc.id, t: +(t - R.t0).toFixed(3), pen: deep.pen, A: deep.A, B: deep.B, sa, sb, cmA: q.a.cm, cmD: q.d.cm, s3: [q.a.s3, q.d.s3], step: [q.a.step, q.d.step], key }); }
      // ── planted drift (o3_metrics' rule) and crossed feet ──
      for (const [ck, side] of [["a", q.a], ["d", q.d]]) { const J = F[ck].J;
        for (const X of ["R", "L"]) { const ls = side[X], ball = J["toe_" + X].j, an = J["foot_" + X].j; if (ls.st !== "PLANTED" || ball[2] > 0.05) { land[ck][X] = null; continue; }
          if ((!land[ck][X] || land[ck][X].id !== ls.id) && ls.pos && hyp(an[0] - ls.pos[0], an[1] - ls.pos[1]) > 0.03) { land[ck][X] = null; continue; }
          if (!land[ck][X] || land[ck][X].id !== ls.id) land[ck][X] = { id: ls.id, p: ball.slice(), pos: ls.pos.slice(), k, max: 0 };
          else if (k - land[ck][X].k > 3) { const d = hyp(ball[0] - land[ck][X].p[0], ball[1] - land[ck][X].p[1]), dPlan = hyp(ls.pos[0] - land[ck][X].pos[0], ls.pos[1] - land[ck][X].pos[1]), dAnk = hyp(an[0] - ls.pos[0], an[1] - ls.pos[1]);
            if (d > 0.03 && d > land[ck][X].max + 0.01) { land[ck][X].max = d; const why = dPlan > 0.02 ? "PLAN MOVED THE STANCE" : side.s3 && side.P > 0.01 ? "STAGE 3 PELVIS" : side.q[X] > 0.005 ? "3B q" : "CANONICAL BODY"; O.driftB[why] = (O.driftB[why] || 0) + 1;
              O.drift.push({ id: tc.id, t: +(t - R.t0).toFixed(3), who: ck === "a" ? "ATT" : "DEF", X, d, dPlan, dAnk, why, s3: side.s3, P: side.P, rec: ls.rec, cm: side.cm }); } } }
        const r = [-Math.sin(side.psi), Math.cos(side.psi)], lat = (J.foot_R.j[0] - J.foot_L.j[0]) * r[0] + (J.foot_R.j[1] - J.foot_L.j[1]) * r[1];
        if (lat < -0.05) { const key = `${side.R.st}${side.R.rec ? "(rec)" : ""} / ${side.L.st}${side.L.rec ? "(rec)" : ""}${side.s3 ? " · S3" : ""}${side.step ? " · step " + side.step.X : ""}${side.q.R > 0.005 || side.q.L > 0.005 ? " · 3Bq" : ""}${side.cm ? " · " + side.cm : ""}`;
          O.crossB[key] = (O.crossB[key] || 0) + 1; O.cross.push({ id: tc.id, t: +(t - R.t0).toFixed(3), who: ck === "a" ? "ATT" : "DEF", lat, key }); } } } }
  process.stderr.write("."); }
console.log(`\nSTAGE 3B.2 DIAGNOSIS — set ${SET} (${L.length} cases)`);
for (const m of MODES) { const O = out[m]; console.log(`\n══ ${m} ══  leg-overlap ticks > 5 cm: ${O.overl.length} · planted-drift events (> 3 cm, +1 cm steps): ${O.drift.length} · crossed-feet ticks: ${O.cross.length}`);
  console.log(`  OVERLAP by leg states (A × D; (rec) = a recovery-step stance, * = a recovery step in flight):`); for (const [k, v] of Object.entries(O.buckets).sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(5)}  ${k}`);
  console.log(`  deepest overlaps:`); for (const o of O.overl.sort((a, b) => b.pen - a.pen).filter((o, i, A) => A.findIndex((z) => z.id === o.id) === i).slice(0, TOP)) console.log(`    ${cm(o.pen).padStart(5)} cm  ${o.id.padEnd(24)} t ${o.t.toFixed(3)}  ${o.A} × ${o.B}  [${o.key}]  ATT ${o.cmA || "-"} DEF ${o.cmD || "-"}  S3 ${o.s3.map((v) => (v ? "on" : "-")).join("/")}`);
  console.log(`  PLANTED DRIFT by cause:`); for (const [k, v] of Object.entries(O.driftB).sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(5)}  ${k}`);
  console.log(`  largest drifts:`); const byStance = new Map(); for (const d of O.drift) { const key = d.id + d.who + d.X + Math.round(d.t * 4); if (!byStance.has(key) || byStance.get(key).d < d.d) byStance.set(key, d); }
  for (const d of [...byStance.values()].sort((a, b) => b.d - a.d).slice(0, TOP)) console.log(`    ${cm(d.d).padStart(5)} cm  ${d.id.padEnd(24)} t ${d.t.toFixed(3)} ${d.who} ${d.X}  plan moved ${cm(d.dPlan)} · ankle off its stance ${cm(d.dAnk)} · ${d.why}${d.s3 ? ` (S3 pelvis ${cm(d.P)})` : ""}${d.rec ? " · recovery stance" : ""}${d.cm ? " · " + d.cm : ""}`);
  console.log(`  CROSSED FEET by state (R / L):`); for (const [k, v] of Object.entries(O.crossB).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`    ${String(v).padStart(5)}  ${k}`); }

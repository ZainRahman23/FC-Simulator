// item 4/5 summary of the per-run lead_drift outputs (read-only). Instantaneous state criteria (frozen tolerances) are re-evaluated per tick from the
// series; NM-2's B-load rows are INTERVAL fractions (as PI-1 evaluates them) and are reported per run, not as a first-failure time.
//   RC4_h  pelvis height >= 0.85 x presentation's          (PI-1 RC-4)       RC4_tilt pelvis tilt <= 20 deg vs presentation (PI-1 RC-4)
//   CG4    every leg segment COM within 0.10 m horizontal of the presentation's counterpart (CG-4 location tolerance)
//   CG2    physical foot state (<= 5 mm planted / >= 15 mm air) = simulation planted state (CG-2; 'lenient' lets 5-15 mm pass)
//   P12    no joint beyond its hard limit                  NM2slip planted-foot slip <= 10 mm (PI-1 NM-2)
//   CG4sim every leg segment COM within 0.10 m horizontal of the SIMULATION's own segment axis (contact correspondence is decided against it)
//   DG     pelvis and every joint within 10 mm of the presentation (REV2 DG / PI-1 §9.1(a): hand-back without a blend)
import fs from "fs";
const [DIR, OUT] = process.argv.slice(2), runs = [];
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith(".json"))) { const j = JSON.parse(fs.readFileSync(DIR + "/" + f)); for (const [cs, c] of Object.entries(j.cases)) for (const r of c.runs) runs.push({ cs, contactRec: c.contactRec, trigger: c.trigger, tRef: c.tRef, ...r }); }
const crit = { RC4_h: s => s.pelHratio >= 0.85, RC4_tilt: s => s.tiltDeg <= 20, CG4: s => s.legHmm <= 100, CG2: s => ["L", "R"].every(sd => { const ft = s.feet[sd], ref = ft.sim != null ? ft.sim : ft.pres; return ft.phys !== "trans" && (ft.phys === "planted") === !!ref; }),
  CG2len: s => ["L", "R"].every(sd => { const ft = s.feet[sd], ref = ft.sim != null ? ft.sim : ft.pres; return ft.phys === "trans" || (ft.phys === "planted") === !!ref; }), P12: s => s.marginDeg >= 0, CG4sim: s => s.legSimMm == null || s.legSimMm <= 100, NM2slip: s => Math.max(s.slipMm.L, s.slipMm.R) <= 10,
  DGpel: s => Math.hypot(s.rootDh, 0) <= 1e9 && s.poseAbsMm <= 10 };
const STATE = ["RC4_h", "RC4_tilt", "CG4sim", "CG2len", "P12", "NM2slip"];   // contact-coherence set (vs the simulation); CG4 vs the presentation and DG are reported separately (visual)
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };
const rows = runs.map(r => { const ff = {}; for (const [k, fn] of Object.entries(crit)) { const s = r.series.find(x => !fn(x)); ff[k] = s ? s.t : null; }
  const tc = Math.min(...STATE.map(k => ff[k] == null ? Infinity : ff[k])), first = tc === Infinity ? null : STATE.filter(k => ff[k] === tc);
  const end = r.series[r.series.length - 1] || null;
  return { cs: r.cs, contactRec: r.contactRec, label: r.label, kp: r.kp, lead: r.lead, variant: r.variant, s: r.sHGA, hgaV2ok: r.hgaV2ok, hgFails: r.hgFailsExHGA, vY0: r.vcomY0, dur: r.durTicks,
    tCoh: tc === Infinity ? null : tc, cohThrough: tc === Infinity, firstFail: first, ff, Bmean: Math.max(r.BmeanFrac.h, r.BmeanFrac.v, r.BmeanFrac.T), BmeanFrac: r.BmeanFrac, Bsat: r.BsatFrac, pr2: r.pr2,
    atEnd: end ? { t: end.t, rootDh: end.rootDh, pelDy: end.pelDy, legHmm: end.legHmm, tilt: end.tiltDeg, pelH: end.pelHratio, feet: end.feet, slip: end.slipMm, margin: end.marginDeg } : null,
    presVsSimLegMm: Math.max(...r.series.map(x => x.legSimPresMm || 0)), physVsSimLegEnd: end ? end.legSimMm : null,
    peak: { pelDy: Math.max(...r.series.map(x => Math.abs(x.pelDy))), rootDh: Math.max(...r.series.map(x => x.rootDh)), legHmm: Math.max(...r.series.map(x => x.legHmm)), tilt: Math.max(...r.series.map(x => x.tiltDeg)), vY: Math.max(...r.series.map(x => Math.abs(x.vY))) } }; });
fs.writeFileSync(OUT, JSON.stringify(rows));
const moving = rows.filter(r => !["rx_standing", "rx_facing_front", "rx_side_standing", "rx_behind_standing"].includes(r.cs));
console.log("runs", rows.length, "moving", moving.length);
for (const v of ["v2", "smooth", "vert0"]) { console.log(`\n== variant ${v} ==`);
  for (const lab of ["L1", "L2", "L4", "L8", "L12", "trig"]) { const g = moving.filter(r => r.variant === v && r.label === lab); if (!g.length) continue;
    const tc = g.map(r => r.cohThrough ? r.dur : r.tCoh), through = g.filter(r => r.cohThrough).length, fails = {}; for (const r of g) for (const k of (r.firstFail || ["(none)"])) fails[k] = (fails[k] || 0) + 1;
    console.log(lab.padEnd(5), "n", g.length, "lead med", q(g.map(r => r.lead), 0.5), "| coherent through contact/horizon", through + "/" + g.length, "| t_coh (ticks) p10/p50/p90", q(tc, 0.1), q(tc, 0.5), q(tc, 0.9), "| first-to-fail", JSON.stringify(fails),
      "| Bmean p50", q(g.map(r => r.Bmean), 0.5), "Bsat p50", q(g.map(r => r.Bsat), 0.5), "| peak |pelDy| p50", q(g.map(r => r.peak.pelDy), 0.5), "| peak rootDh p50", q(g.map(r => r.peak.rootDh), 0.5)); } }
// near-miss free evolution (no contact; horizon 30 ticks from promotion): time to first state-criterion failure, per variant
console.log("\n== near-miss free evolution (30-tick horizon) ==");
for (const v of ["v2", "smooth", "vert0"]) { const g = moving.filter(r => !r.contactRec && r.variant === v); const tc = g.map(r => r.cohThrough ? r.dur : r.tCoh); const fails = {}; for (const r of g) for (const k of (r.firstFail || ["(none)"])) fails[k] = (fails[k] || 0) + 1;
  console.log(v.padEnd(6), "n", g.length, "t_coh p10/p50/p90/max", q(tc, 0.1), q(tc, 0.5), q(tc, 0.9), q(tc, 1), JSON.stringify(fails)); }

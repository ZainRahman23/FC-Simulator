// ═══ physchar2/tools/b_g2_compare.mjs — FLAT-PLANE DECISION: G2 plane vs the accepted box-turf G2 (user decision §8) ═══════════════════════
// Pairs every job of two g2_results files and compares: outcome class per job; push boundaries (largest recovered / smallest failed impulse per
// body × direction); quiet stance (COM / CoP sway, slip, tilt); recovery metrics; foot slip / tilt; actuator utilisation (peak / mean fraction of
// capacity, saturation, over-capacity); energy-ledger closure; controller cost. DIAGNOSTIC report (no tuning).
// usage: node tools/b_g2_compare.mjs <box g2_results.json[.gz]> <plane g2_results.json[.gz]> [--md]
import fs from "fs"; import zlib from "zlib";
const rd = (f) => JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)) : fs.readFileSync(f)), [fa, fb] = process.argv.slice(2).filter(a => !a.startsWith("--")), A = rd(fa), B = rd(fb);
// a job is identified by group × human × scenario × evaluation variant × repetition (the files are in worker-completion order)
const key = (j) => JSON.stringify([j.group, j.human, j.sc, j.eval || null, j.rep ?? null]), am = new Map(A.jobs.map(j => [key(j), j])), pairs = B.jobs.map(j => [am.get(key(j)), j]).filter(([a, b]) => a && a.res && b.res);
if (am.size !== A.jobs.length) throw new Error("job key not unique");
const f = (x, n = 2) => (x == null || !isFinite(x) ? "—" : (+x).toFixed(n)), q = (a, p) => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; };
// outcomes
const oc = (r) => r.outcome, changed = pairs.filter(([a, b]) => oc(a.res) !== oc(b.res)).map(([a, b]) => `${b.group} ${b.human} ${JSON.stringify(b.sc)} ${b.eval || ""}: ${oc(a.res)} → ${oc(b.res)}`), sameHash = pairs.filter(([a, b]) => a.res.hash === b.res.hash).length;
// boundaries
const bnd = (R) => { const m = {}; for (const j of R.jobs.filter(j => j.group === "push" && j.res)) { const k = j.human + "|" + j.sc.dir, x = m[k] || (m[k] = { rec: 0, fail: Infinity }); if (j.res.recovered) x.rec = Math.max(x.rec, j.sc.J); else x.fail = Math.min(x.fail, j.sc.J); } return m; };
const bA = bnd(A), bB = bnd(B), bChanged = Object.keys(bB).filter(k => bA[k] && (bA[k].rec !== bB[k].rec || bA[k].fail !== bB[k].fail)).map(k => `${k}: ${bA[k].rec}/${bA[k].fail} → ${bB[k].rec}/${bB[k].fail}`);
// metric comparisons over paired jobs (by group subset)
const M = [
  ["quiet stance COM sway RMS AP (mm)", "S0", r => r.sway && r.sway.com.rmsApMm],
  ["quiet stance CoP sway RMS AP (mm)", "S0", r => r.sway && r.sway.cop.rmsApMm],
  ["quiet stance COM mean speed (mm/s)", "S0", r => r.sway && r.sway.com.meanSpeedMmS],
  ["foot slip max, all jobs (mm)", null, r => r.feet && Math.max(...r.feet.slipMaxMm)],
  ["foot tilt max, all jobs (°)", null, r => r.feet && Math.max(...r.feet.tiltMaxDeg)],
  ["heel lift max, all jobs (mm)", null, r => r.feet && Math.max(...r.feet.heelMaxMm)],
  ["push: ξ deviation max (cm), recovered", "push", r => (r.recovered ? r.xiDevMaxCm : null)],
  ["push: recovery time (s)", "push", r => (r.recovered ? r.recoveryT : null)],
  ["push: support margin min (cm), recovered", "push", r => (r.recovered ? r.marginMinCm : null)],
  ["actuator peak fraction of capacity (max axis)", null, r => r.actuators && Math.max(...r.actuators.top.map(t => t.peakFrac))],
  ["actuator over-capacity ticks", null, r => r.actuators && r.actuators.overCapTicks],
  ["energy-ledger closure (J)", null, r => r.ledger && r.ledger.closure],
  ["controller cost mean (ms)", null, r => r.cpuCtrl && r.cpuCtrl.meanMs],
  ["turf penetration max (mm)", null, r => r.g1 && r.g1.contacts && r.g1.contacts.turfPenMaxMm],
];
const rows = M.map(([name, grp, g]) => { const P = pairs.filter(([a]) => !grp || a.group === grp).map(([a, b]) => [g(a.res), g(b.res)]).filter(([x, y]) => x != null && y != null && isFinite(x) && isFinite(y)); if (!P.length) return null;
  const d = P.map(([x, y]) => y - x); return { name, n: P.length, box: [q(P.map(p => p[0]), 0.5), q(P.map(p => p[0]), 0.95), Math.max(...P.map(p => p[0]))], plane: [q(P.map(p => p[1]), 0.5), q(P.map(p => p[1]), 0.95), Math.max(...P.map(p => p[1]))], medD: q(d, 0.5), up: d.filter(x => x > 1e-12).length / d.length, dn: d.filter(x => x < -1e-12).length / d.length }; }).filter(Boolean);
const inv = B.jobs.filter(j => j.res && j.res.g1 && j.res.g1.invariants).reduce((o, j) => { const I = j.res.g1.invariants; o.turf += I.turfInvalidManifolds; o.env += I.turfEnvViolations; o.tele += I.posCorrTicksOver; o.teleMax = Math.max(o.teleMax, I.posCorrMaxMm); o.depthMax = Math.max(o.depthMax, I.turfDepthMaxMm); return o; }, { turf: 0, env: 0, tele: 0, teleMax: 0, depthMax: -Infinity });
const kept = pairs.filter(([a, b]) => !a.res.fell && !b.res.fell), dSlip = kept.map(([a, b]) => [Math.max(...b.res.feet.slipMaxMm) - Math.max(...a.res.feet.slipMaxMm), a, b]).sort((x, y) => Math.abs(y[0]) - Math.abs(x[0]));
const slipTop = dSlip.slice(0, 6).map(([d, a, b]) => `${b.group} ${b.human} ${JSON.stringify(b.sc)}${b.eval ? " [" + b.eval + "]" : ""} ${f(Math.max(...a.res.feet.slipMaxMm))} → ${f(Math.max(...b.res.feet.slipMaxMm))} mm`);
if (process.argv.includes("--md")) {
  console.log(`Non-falling paired runs: ${kept.length}; |Δ foot slip| > 1 mm in ${dSlip.filter(x => Math.abs(x[0]) > 1).length}; largest: ${slipTop.join("; ")}.`);
  console.log(`Paired jobs: ${pairs.length} (identical state hash ${sameHash}). **Outcome class changes: ${changed.length}**${changed.length ? ": " + changed.slice(0, 12).join("; ") : ""}.`);
  console.log(`Push boundaries (largest recovered / smallest failed, N·s) changed: ${bChanged.length}${bChanged.length ? ": " + bChanged.join("; ") : ""}.`);
  console.log(`Plane physics-integrity counters over all G2 jobs: invalid turf manifolds ${inv.turf}; turf-envelope violations ${inv.env}; teleport ticks over 5 mm ${inv.tele} (max ${f(inv.teleMax, 3)} mm); max turf depth ${f(inv.depthMax, 2)} mm.\n`);
  console.log("| metric | jobs | box median / p95 / max | plane median / p95 / max | paired median Δ | plane higher / lower |"); console.log("|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.name} | ${r.n} | ${f(r.box[0], 3)} / ${f(r.box[1], 3)} / ${f(r.box[2], 3)} | ${f(r.plane[0], 3)} / ${f(r.plane[1], 3)} / ${f(r.plane[2], 3)} | ${f(r.medD, 4)} | ${(100 * r.up).toFixed(0)} % / ${(100 * r.dn).toFixed(0)} % |`); }
else console.log(JSON.stringify({ pairs: pairs.length, sameHash, changed, bChanged, rows, inv, slipTop }, null, 1));

// ═══ physchar2/tools/b_g3_compare.mjs — FLAT-PLANE DECISION: G3 plane run vs the box-turf G3 run 3 (user decision §9; report, no tuning) ═══
// Pairs the jobs of two g3_results files (group × key × human × variant fields × rep) and compares outcome class, supervisor abort,
// final load split, hold loads (stance min / mean, unloaded-foot max), foot slip / lift / tilt, pelvis roll, trunk lean, yaw, ankle twist, pelvis
// drift, λ tracking, energy-ledger closure. Jobs new in the plane run (T9U: U per body, criteria v2) have no box partner and are listed.
// usage: node tools/b_g3_compare.mjs <box g3_results.json[.gz]> <plane g3_results.json[.gz]> [--md]
import fs from "fs"; import zlib from "zlib";
const rd = (f) => JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)) : fs.readFileSync(f)), [fa, fb] = process.argv.slice(2).filter(a => !a.startsWith("--")), A = rd(fa), B = rd(fb);
const VAR = (j) => Object.fromEntries(Object.entries(j).filter(([k]) => !["res", "title", "error"].includes(k)));
const key = (j) => JSON.stringify(VAR(j)), am = new Map(A.jobs.map(j => [key(j), j]));
if (am.size !== A.jobs.length) throw new Error("job key not unique");
const pairs = B.jobs.map(j => [am.get(key(j)), j]).filter(([a, b]) => a && a.res && b.res && a.res.g3 && b.res.g3), unpaired = B.jobs.filter(j => !am.get(key(j)));
const f = (x, n = 2) => (x == null || !isFinite(x) ? "—" : (+x).toFixed(n)), q = (a, p) => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; };
const mx = (a) => Math.max(...a), hold = (r, fn) => { const H = Object.values(r.g3.holds || {}); return H.length ? fn(H) : null; };
const changed = pairs.filter(([a, b]) => a.res.outcome !== b.res.outcome).map(([a, b]) => `${b.group} ${b.key} ${b.human}: ${a.res.outcome} → ${b.res.outcome}`);
const abortCh = pairs.filter(([a, b]) => (a.res.g3.abortT == null) !== (b.res.g3.abortT == null) || (a.res.g3.abortT != null && Math.abs(a.res.g3.abortT - b.res.g3.abortT) > 1e-9)).map(([a, b]) => `${b.group} ${b.key} ${b.human}: abort ${f(a.res.g3.abortT, 3)} → ${f(b.res.g3.abortT, 3)}`);
const M = [
  ["final load_R", r => r.g3.endLoad && r.g3.endLoad[1], 4],
  ["hold: stance-foot load min (% BW)", r => hold(r, H => Math.min(...H.map(h => h.loadMin)) * 100), 3],
  ["hold: stance-foot load mean (% BW)", r => hold(r, H => Math.min(...H.map(h => h.loadMean)) * 100), 3],
  ["hold: unloaded-foot load max (% BW)", r => hold(r, H => mx(H.map(h => h.otherMaxBW)) * 100), 3],
  ["hold: ξ margin min (cm)", r => hold(r, H => Math.min(...H.map(h => h.xiMarginMinCm))), 3],
  ["foot slip max (mm)", r => mx(r.g3.feet.map(x => x.slipMm)), 3],
  ["foot lift max (mm)", r => mx(r.g3.feet.map(x => x.liftMm)), 3],
  ["foot tilt max (°)", r => mx(r.g3.feet.map(x => x.tiltDeg)), 3],
  ["pelvis roll max (°)", r => r.g3.pelvisRollMaxDeg, 3],
  ["trunk lean max (°)", r => r.g3.trunkLeanMaxDeg, 3],
  ["pelvis yaw max (°)", r => r.g3.yawMaxDeg, 3],
  ["ankle twist max (°)", r => r.g3.twistMaxDeg, 3],
  ["pelvis drift (mm)", r => r.g3.pelvisDriftMm, 3],
  ["λ tracking RMS", r => r.g3.trackRms, 4],
  ["energy-ledger closure (J)", r => r.ledger && r.ledger.closure, 3],
  ["turf penetration max (mm)", r => r.g1 && r.g1.contacts && r.g1.contacts.turfPenMaxMm, 3],
];
const rows = M.map(([name, g, n]) => { const P = pairs.map(([a, b]) => [g(a.res), g(b.res)]).filter(([x, y]) => x != null && y != null && isFinite(x) && isFinite(y)); if (!P.length) return null; const d = P.map(([x, y]) => y - x);
  return { name, n: P.length, dec: n, box: [q(P.map(p => p[0]), 0.5), q(P.map(p => p[0]), 0.95), mx(P.map(p => p[0]))], plane: [q(P.map(p => p[1]), 0.5), q(P.map(p => p[1]), 0.95), mx(P.map(p => p[1]))], medD: q(d, 0.5), maxAbsD: mx(d.map(Math.abs)), up: d.filter(x => x > 1e-12).length / d.length, dn: d.filter(x => x < -1e-12).length / d.length }; }).filter(Boolean);
const inv = B.jobs.filter(j => j.res && j.res.g1 && j.res.g1.invariants).reduce((o, j) => { const I = j.res.g1.invariants; o.n++; o.turf += I.turfInvalidManifolds; o.env += I.turfEnvViolations; o.tele += I.posCorrTicksOver; o.teleMax = Math.max(o.teleMax, I.posCorrMaxMm); o.depthMax = Math.max(o.depthMax, I.turfDepthMaxMm); return o; }, { n: 0, turf: 0, env: 0, tele: 0, teleMax: 0, depthMax: -Infinity });
const out = { pairs: pairs.length, unpaired: unpaired.map(j => `${j.group} ${j.key} ${j.human}`), changed, abortCh, rows, inv };
if (process.argv.includes("--md")) {
  console.log(`Paired G3 jobs: ${pairs.length} (new in this run, no box partner: ${unpaired.length}${unpaired.length ? " — " + [...new Set(unpaired.map(j => j.group))].join(", ") : ""}). **Outcome class changes: ${changed.length}**${changed.length ? ": " + changed.join("; ") : ""}. Supervisor abort changes: ${abortCh.length}${abortCh.length ? ": " + abortCh.join("; ") : ""}.`);
  console.log(`Plane physics-integrity counters over ${inv.n} G3 jobs: invalid turf manifolds ${inv.turf}; turf-envelope violations ${inv.env}; teleport ticks over 5 mm ${inv.tele} (max ${f(inv.teleMax, 3)} mm); max turf depth ${f(inv.depthMax, 2)} mm.\n`);
  console.log("| metric | jobs | box median / p95 / max | plane median / p95 / max | paired median Δ | max \\|Δ\\| | plane higher / lower |"); console.log("|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.name} | ${r.n} | ${f(r.box[0], r.dec)} / ${f(r.box[1], r.dec)} / ${f(r.box[2], r.dec)} | ${f(r.plane[0], r.dec)} / ${f(r.plane[1], r.dec)} / ${f(r.plane[2], r.dec)} | ${f(r.medD, r.dec)} | ${f(r.maxAbsD, r.dec)} | ${(100 * r.up).toFixed(0)} % / ${(100 * r.dn).toFixed(0)} % |`); }
else console.log(JSON.stringify(out, null, 1));

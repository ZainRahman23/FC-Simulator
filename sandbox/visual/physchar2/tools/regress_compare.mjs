// ═══ physchar2/tools/regress_compare.mjs — compare two G1 or G2 result files (baseline vs new): hashes, outcomes, per-run checks, key metrics ═══
// usage: node tools/regress_compare.mjs <baseline.json[.gz]> <new.json[.gz]> [out.json]
import fs from "fs"; import zlib from "zlib";
const rd = (f) => JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)) : fs.readFileSync(f)), A = rd(process.argv[2]), B = rd(process.argv[3]);
const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o), out = {};
if (A.runs) {   // G1
  const id = (r) => `${r.key}|${r.human}|${JSON.stringify(r.cfg && r.cfg.hz)}`, mA = new Map(A.runs.map(r => [id(r), r])), M = ["energy.unexplainedJ", "energy.maxRiseJ", "energy.dampingJ", "joints.sepMaxMm", "joints.sepRestMm", "joints.hardExcMaxDeg", "joints.hardExcRestDeg", "contacts.turfPenMaxMm", "contacts.turfPenRestMm", "contacts.selfPenMaxMm", "maxSpeed"];
  let n = 0, same = 0, sameOut = 0; const outc = [], chk = [], mx = {}, at = {};
  for (const r of B.runs) { const o = mA.get(id(r)); if (!o) continue; n++; if (o.hash === r.hash) same++; const q = (x) => (x && typeof x === "object" ? JSON.stringify({ posture: x.posture, firstNonFoot: x.firstNonFoot, firstNonFootT: x.firstNonFootT != null ? +x.firstNonFootT.toFixed(4) : null }) : JSON.stringify(x));
    if (q(o.outcome) === q(r.outcome)) sameOut++; else outc.push(`${id(r)}: ${q(o.outcome)} → ${q(r.outcome)}`);
    if (o.outcome && r.outcome && o.outcome.comEnd && r.outcome.comEnd) { const d = Math.hypot(...o.outcome.comEnd.map((v, i) => v - r.outcome.comEnd[i])); if (!(d <= (mx["outcome.comEndShiftM"] ?? -1))) { mx["outcome.comEndShiftM"] = d; at["outcome.comEndShiftM"] = id(r); } }
    const ca = o.checks || {}, cb = r.checks || {}; for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) { const pa = ca[k] && (ca[k].pass ?? ca[k]), pb = cb[k] && (cb[k].pass ?? cb[k]); if (JSON.stringify(pa) !== JSON.stringify(pb)) chk.push(`${id(r)} ${k}: ${JSON.stringify(pa)} → ${JSON.stringify(pb)}`); }
    for (const m of M) { const x = get(o, m), y = get(r, m); if (typeof x === "number" && typeof y === "number") { const d = Math.abs(y - x); if (!(d <= (mx[m] ?? -1))) { mx[m] = d; at[m] = `${id(r)} ${x.toFixed(4)} → ${y.toFixed(4)}`; } } } }
  Object.assign(out, { kind: "G1", runs: n, identicalHashes: same, identicalOutcomes: sameOut, outcomeChanges: outc, checkChanges: chk.slice(0, 40), checkChangeCount: chk.length, allPass: [A.allPass, B.allPass], maxAbsChange: Object.fromEntries(Object.entries(mx).map(([k, v]) => [k, { d: v, at: at[k] }])) });
} else {        // G2 / G3 job lists
  const id = (j) => JSON.stringify([j.group, j.human, j.sc || j.key, j.stand || null, j.eval || null, j.rep ?? null]), mA = new Map(A.jobs.map(j => [id(j), j]));
  let n = 0, same = 0, sameOut = 0; const outc = [], rec = []; let ds = 0, dx = 0, dr = 0, dsAt = "";
  const h = (j) => (j.res ? j.res.hash : JSON.stringify([j.hashA, j.hashB, j.exact]));
  for (const j of B.jobs) { const o = mA.get(id(j)); if (!o) continue; n++; if (h(o) === h(j)) same++; if (!j.res || !o.res) { sameOut++; continue; }
    if (j.res.outcome === o.res.outcome) sameOut++; else outc.push(`${id(j)}: ${o.res.outcome} → ${j.res.outcome}`);
    const ok = (x) => ["recovered", "stood"].includes(x.outcome); if (ok(j.res) && ok(o.res) && j.res.feet) { const a = Math.max(...o.res.feet.slipMaxMm), b = Math.max(...j.res.feet.slipMaxMm); if (Math.abs(b - a) > ds) { ds = Math.abs(b - a); dsAt = `${id(j)} ${a.toFixed(3)} → ${b.toFixed(3)}`; }
      dx = Math.max(dx, Math.abs(j.res.xiDevMaxCm - o.res.xiDevMaxCm)); if (j.res.recoveryT != null && o.res.recoveryT != null) dr = Math.max(dr, Math.abs(j.res.recoveryT - o.res.recoveryT)); } }
  Object.assign(out, { kind: "jobs", jobs: n, identicalHashes: same, identicalOutcomes: sameOut, outcomeChanges: outc, recoveredMaxAbsChange: { slipMm: ds, slipAt: dsAt, xiDevCm: dx, recoveryS: dr } });
}
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1).slice(0, 3000));

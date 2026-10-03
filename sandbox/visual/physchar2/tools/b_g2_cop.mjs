// ═══ physchar2/tools/b_g2_cop.mjs — FLAT-PLANE DECISION, G2 follow-up: per-foot CoP jumps in the CoP sweeps, box vs plane (the L sweep's
// diagnostic per-foot jump rose 12.9 → 21.3 mm; the gated net-CoP jump stayed ≤ 5 mm). Re-runs the six sweeps exactly as g2_run.js does and
// records every per-foot single-tick CoP jump with that foot's vertical load, so a jump can be attributed to load conditioning (CoP = M / F of
// a lightly loaded foot) or to a contact difference. DIAGNOSTIC, no tuning.   usage: node tools/b_g2_cop.mjs [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { VARIATION_SET } from "../spec/v2_human.js";
import { G2Sim, DIRS } from "../gates/v2_g2.js";
import { polyDist } from "../ctrl/v2_stand.js";
const J = await loadJolt(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../vendor/jolt-physics.wasm-compat.js")), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), out = [];
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; };
for (const [d, len] of [["F", 0.09], ["B", 0.085], ["R", 0.12], ["L", 0.12], ["FR", 0.09], ["BL", 0.09]]) for (const turf of ["box", "plane"]) {
  const u = DIRS[d], T = len / 0.01, base = { title: `CoP sweep ${d}`, seconds: 1 + 2 * T + 1, ramp: { u, len, T } };
  const stand = { refOffset: (t) => { const k = t < 1 ? 0 : t < 1 + T ? (t - 1) * 0.01 : Math.max(0, len - (t - 1 - T) * 0.01); return [u[0] * k, u[1] * k]; } };
  const s = new G2Sim(J, spec, base, { stand, cfg: { turf } }); let prevFoot = null; const jumps = [];
  while (s.tick()) { const r = s.lastRow, I = s.ctrl.info, t = r.t; if (t < 1) continue;
    const fc = s.probeRows.map(x => (x.cop ? [x.cop[0], x.cop[2], x.JyN] : null)), inside = polyDist(I.support, r.pCmd) > 0.01;
    if (prevFoot && inside) fc.forEach((c, k) => { if (c && prevFoot[k] && c[2] > 100 && prevFoot[k][2] > 100) jumps.push({ t, foot: k ? "R" : "L", mm: Math.hypot(c[0] - prevFoot[k][0], c[1] - prevFoot[k][1]) * 1000, loadN: Math.min(c[2], prevFoot[k][2]) }); });
    prevFoot = fc; }
  s.destroy(); jumps.sort((a, b) => b.mm - a.mm);
  const band = (lo, hi) => { const a = jumps.filter(j => j.loadN >= lo && j.loadN < hi).map(j => j.mm); return { n: a.length, p99: q(a, 0.99), max: a.length ? Math.max(...a) : null }; };
  const row = { dir: d, turf, n: jumps.length, top: jumps.slice(0, 5), lt200: band(100, 200), b200_400: band(200, 400), ge400: band(400, 1e9) }; out.push(row);
  console.log(`${d} ${turf}: top ${jumps.slice(0, 3).map(j => `${j.mm.toFixed(1)} mm (${j.foot}, ${j.loadN.toFixed(0)} N, t ${j.t.toFixed(2)})`).join(", ")} | load 100–200 N: n ${row.lt200.n} p99 ${row.lt200.p99?.toFixed(2)} max ${row.lt200.max?.toFixed(1)} | 200–400: p99 ${row.b200_400.p99?.toFixed(2)} max ${row.b200_400.max?.toFixed(1)} | ≥400: p99 ${row.ge400.p99?.toFixed(2)} max ${row.ge400.max?.toFixed(1)}`); }
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));

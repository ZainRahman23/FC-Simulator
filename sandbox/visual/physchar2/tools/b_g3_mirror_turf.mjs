// ═══ physchar2/tools/b_g3_mirror_turf.mjs — FLAT-PLANE DECISION, G3 J2 follow-up: is the commanded-CoP mirror difference a controller asymmetry or
// a physics (state) asymmetry, and is it turf-related? Re-runs selected mirrored pairs exactly as tools/g3_mirror_pairs.mjs does, on the plane
// AND the historical box, and records, per pair: the pre-slide max |Δ commanded CoP| and WHEN it occurs; the commanded CoP's lateral offset from the
// mid-ankle point of each trial (raw, unmirrored) in the shared pre-request phase; the COM / ξ lateral offset there; the pre-slide max foot-position
// difference. In the shared phase both trials are physically identical, so a mirrored Δ there equals 2 × the lateral offset of that common state.
// DIAGNOSTIC, no change.   usage: node tools/b_g3_mirror_turf.mjs [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def, mirrorDir } from "../gates/v2_g3.js";
const J = await loadJolt(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../vendor/jolt-physics.wasm-compat.js")), SLIDE = 1e-3, out = [];
const PAIRS = [["T1", "T2"], ["T5", "T6"], ["U:R", "U:L"], ...[4, 1, 0.75, 0.5, 0.25].map(T => [`T7:R:${T}`, `T7:L:${T}`]), ["T8:hold:R:F:20", `T8:hold:L:${mirrorDir("F")}:20`]];
function trace(key, mirror, turf) { const def = g3Def(key), spec = generateSpec(VARIATION_SET.find(h => h.id === (def.human || "V2-REF"))), s = new G3Sim(J, spec, def, { cfg: { turf } }), rows = [], ft = s.ctrl.feet; let foot0 = null;
  while (s.tick()) { const I = s.ctrl.info, hd = I.heading, lat = [hd[1], -hd[0]], latOf = (p) => (p[0] - I.mid[0]) * lat[0] + (p[1] - I.mid[1]) * lat[1], rel = (p) => [latOf(p) * (mirror ? -1 : 1), (p[0] - I.mid[0]) * hd[0] + (p[1] - I.mid[1]) * hd[1]];
    const fp = ft.map(f => [s.st[f].pos[0], s.st[f].pos[2]]); if (!foot0) foot0 = fp.map(p => p.slice()); const disp = fp.map((p, n) => [(p[0] - foot0[n][0]) * (mirror ? -1 : 1), p[1] - foot0[n][1]]);
    rows.push({ t: s.n * s.dt, p: rel(I.p), pLatRaw: latOf(I.p), cLatRaw: latOf([I.c[0], I.c[2]]), lam: mirror ? 1 - (I.lam ?? 0.5) : (I.lam ?? 0.5), disp: mirror ? [disp[1], disp[0]] : disp });
    if (s.g2acc.fallT != null && s.n * s.dt > s.g2acc.fallT + 0.5) break; }
  s.destroy(); return rows; }
for (const [a, b] of PAIRS) for (const turf of ["plane", "box"]) { const A = trace(a, false, turf), B = trace(b, true, turf), n = Math.min(A.length, B.length); let onset = null, pre = 0, preT = null, shared = 0, firstDiv = null, posPre = 0;
  for (let i = 0; i < n; i++) { const x = A[i], y = B[i], dm = Math.max(...x.disp.map(d => Math.hypot(...d)), ...y.disp.map(d => Math.hypot(...d))); if (onset == null && dm > SLIDE) onset = i;
    const dc = Math.hypot(x.p[0] - y.p[0], x.p[1] - y.p[1]); if (onset == null) { if (dc > pre) { pre = dc; preT = x.t; } posPre = Math.max(posPre, ...[0, 1].map(k => Math.hypot(x.disp[k][0] - y.disp[k][0], x.disp[k][1] - y.disp[k][1]))); }
    if (firstDiv == null && (Math.abs(x.lam - y.lam) > 1e-12 || Math.abs(x.pLatRaw + y.pLatRaw) > 1e-9 && Math.abs(x.pLatRaw - y.pLatRaw) > 1e-12)) firstDiv = x.t;   // first tick where the trials stop being the same physical run
    if (Math.abs(x.pLatRaw - y.pLatRaw) < 1e-12) shared = Math.max(shared, Math.abs(x.pLatRaw)); }
  const row = { a, b, turf, slidingOnsetS: onset != null ? onset / 240 : null, cmdCopPreSlideMm: pre * 1000, atS: preT, sharedPhaseCmdCopLatMaxMm: shared * 1000, sharedPhaseComLatEndMm: null, posPreSlideMm: posPre * 1000, firstDivergenceS: firstDiv };
  const sh = A.filter((x, i) => i < n && Math.abs(x.pLatRaw - B[i].pLatRaw) < 1e-12); if (sh.length) row.sharedPhaseComLatEndMm = sh[sh.length - 1].cLatRaw * 1000, row.sharedPhaseEndS = sh[sh.length - 1].t;
  out.push(row); console.log(`${a}/${b} ${turf}: pre-slide Δcmd ${row.cmdCopPreSlideMm.toFixed(3)} mm at t ${row.atS?.toFixed(3)} (onset ${row.slidingOnsetS?.toFixed(3) ?? "—"}); shared phase until ${row.sharedPhaseEndS?.toFixed(3)} s: cmd-CoP lateral offset max ${row.sharedPhaseCmdCopLatMaxMm.toFixed(4)} mm, COM lateral ${row.sharedPhaseComLatEndMm?.toFixed(4)} mm; pre-slide foot Δpos ${row.posPreSlideMm.toFixed(3)} mm`); }
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));

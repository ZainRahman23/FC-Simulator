// ═══ physchar2/tools/g3_mirror_pairs.mjs — G3 criteria v2 row J: tick-by-tick mirrored-pair comparison (gate input, like the browser check) ═══
// For every mirrored pair (T1/T2, T5/T6, U:R/U:L, T7 R/L at every ramp, T9 cycles of every body (R hold vs L hold are inside one run — compared
// by the summary), U per body, and all 64 T8 pushes vs their mirror) both trials are re-run and compared per tick in the MIRRORED frame
// (lateral = the character's right; the L-trial's lateral sign flipped; feet swapped):
//   • positional difference: max over the run of the horizontal distance between each foot's displacement and its mirror partner's (mm);
//   • sliding onset: the first tick at which either trial has a foot displaced > 1.0 mm from its start ("meaningful sliding");
//   • controller symmetry: max |Δ commanded CoP| (mirrored, relative to the mid-ankle point, heading frame) BEFORE the sliding onset (whole run
//     if neither slides), max |Δ requested λ| (mirrored: λ_R vs 1 − λ_R), supervisor decision and abort time;
//   • outcome classes.
// usage: node tools/g3_mirror_pairs.mjs → review_artifacts/physical_character_v2/g3/json/g3_mirror_pairs.json
import fs from "fs"; import path from "path"; import os from "os"; import { fork } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def, mirrorDir } from "../gates/v2_g3.js"; import { cls } from "../gates/v2_g3_checks.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g3/json/g3_mirror_pairs.json"), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js");
const DIR8 = ["F", "B", "L", "R", "FL", "FR", "BL", "BR"], SLIDE = 1.0e-3;
function pairs() { const P = [["T1", "T2"], ["T5", "T6"], ["U:R", "U:L"], ...[4, 2, 1, 0.75, 0.5, 0.25].map(T => [`T7:R:${T}`, `T7:L:${T}`])];
  for (const w of ["hold", "ramp"]) for (const d of DIR8) for (const m of [5, 10, 15, 20]) P.push([`T8:${w}:R:${d}:${m}`, `T8:${w}:L:${mirrorDir(d)}:${m}`]);
  const J = P.map(([a, b]) => ({ a, b, human: "V2-REF" })); for (const h of VARIATION_SET) J.push({ a: "U:R", b: "U:L", human: h.id }); return J; }
function trace(Jolt, key, human, mirror) { const def = g3Def(key), spec = generateSpec(VARIATION_SET.find(h => h.id === (def.human || human))), s = new G3Sim(Jolt, spec, def, {}), rows = [], ft = s.ctrl.feet;
  let foot0 = null; while (s.tick()) { const I = s.ctrl.info, hd = I.heading, lat = [hd[1], -hd[0]], rel = (p) => [((p[0] - I.mid[0]) * lat[0] + (p[1] - I.mid[1]) * lat[1]) * (mirror ? -1 : 1), (p[0] - I.mid[0]) * hd[0] + (p[1] - I.mid[1]) * hd[1]];
    const fp = ft.map(f => [s.st[f].pos[0], s.st[f].pos[2]]); if (!foot0) foot0 = fp.map(p => p.slice());
    // per foot displacement in the mirrored frame: x flips sign for the mirrored trial; feet swap (L foot of trial B ↔ R foot of trial A)
    const disp = fp.map((p, n) => [(p[0] - foot0[n][0]) * (mirror ? -1 : 1), p[1] - foot0[n][1]]);
    rows.push({ p: rel(I.p), lam: mirror ? 1 - (I.lam ?? 0.5) : (I.lam ?? 0.5), disp: mirror ? [disp[1], disp[0]] : disp });
    if (s.g2acc.fallT != null && s.n * s.dt > s.g2acc.fallT + 0.5) break; }
  const g = s.g3summary(); s.destroy(); return { rows, res: { outcome: g.outcome, cls: cls(g), abortT: g.g3.abortT, slip: g.g3.feet.map(f => f.slipMm) } }; }
function compare(Jolt, job) { const A = trace(Jolt, job.a, job.human, false), B = trace(Jolt, job.b, job.human, true), n = Math.min(A.rows.length, B.rows.length);
  let onset = null, posMax = 0, cmdPre = 0, lamMax = 0, cmdAll = 0;
  for (let i = 0; i < n; i++) { const a = A.rows[i], b = B.rows[i]; const dispMax = Math.max(...a.disp.map(d => Math.hypot(...d)), ...b.disp.map(d => Math.hypot(...d)));
    if (onset == null && dispMax > SLIDE) onset = i; const dpos = Math.max(...[0, 1].map(k => Math.hypot(a.disp[k][0] - b.disp[k][0], a.disp[k][1] - b.disp[k][1]))); posMax = Math.max(posMax, dpos);
    const dc = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]); cmdAll = Math.max(cmdAll, dc); if (onset == null) cmdPre = Math.max(cmdPre, dc); lamMax = Math.max(lamMax, Math.abs(a.lam - b.lam)); }
  return { ...job, ticks: n, lengthsEqual: A.rows.length === B.rows.length, sliding: onset != null, slidingOnsetS: onset != null ? onset / 240 : null, posDiffMaxMm: posMax * 1000, cmdCopDiffPreSlideMm: cmdPre * 1000, cmdCopDiffAllMm: cmdAll * 1000, lamDiffMax: lamMax,
    clsA: A.res.cls, clsB: B.res.cls, sameClass: A.res.cls === B.res.cls, abortA: A.res.abortT, abortB: B.res.abortT, sameAbort: (A.res.abortT == null) === (B.res.abortT == null) && (A.res.abortT == null || Math.abs(A.res.abortT - B.res.abortT) <= 1 / 240 + 1e-9), slipA: A.res.slip, slipB: B.res.slip }; }
if (process.argv.includes("--worker")) { const Jolt = await loadJolt(VEND); process.on("message", (m) => { if (m === "exit") process.exit(0); try { process.send({ ok: true, out: compare(Jolt, m) }); } catch (e) { process.send({ ok: false, err: String(e.stack || e), job: m }); } }); process.send({ ready: true }); }
else { const list = pairs(), outs = [], W = Math.max(2, Math.min(10, os.cpus().length - 1)), t0 = Date.now();
  await new Promise((resolve) => { let next = 0, live = 0; const spawn = () => { if (next >= list.length) { if (live === 0) resolve(); return; } live++; const cp = fork(fileURLToPath(import.meta.url), ["--worker"], { stdio: ["ignore", "inherit", "inherit", "ipc"] }); let done = 0;
      const feed = () => { if (next >= list.length || done >= 8) { cp.send("exit"); live--; if (next < list.length) spawn(); else if (live === 0) resolve(); return; } cp.send(list[next++]); };
      cp.on("message", (m) => { if (m.ready) return feed(); outs.push(m.ok ? m.out : { ...m.job, error: m.err }); done++; process.stdout.write(`  ${outs.length}/${list.length}\r`); feed(); }); };
    for (let i = 0; i < W; i++) spawn(); });
  fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/g3_mirror_pairs.mjs", date: new Date().toISOString().slice(0, 10), slideThresholdMm: SLIDE * 1000, wallS: (Date.now() - t0) / 1000, pairs: outs }, null, 1));
  console.log(`\n${outs.length} pairs → ${path.relative(ROOT, OUT)} (${outs.filter(o => o.error).length} errors)`); }

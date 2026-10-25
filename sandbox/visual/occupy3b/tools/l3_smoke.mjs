// occupy3b/tools/l3_smoke.mjs — one block per case: S2D · S3 (OLD) · S3B, penetration, Stage 3 episodes, 3B contacts and the ledger checks.
//   node l3_smoke.mjs [id,id,…] [--set review|matrix] [--events] [--log]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { O3CASES, MATRIX } from "../../occupy3/o3_cases.js";
import { runO3 } from "../../occupy3/o3_run.js";
import "../../occupy3/o3_world.js";
import "../l3_world.js";
import { volumesOf, detect } from "../../occupy1/o_volumes.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, ids = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2].split(",") : null, DT = 1 / 240;
const SET = arg("set", "review") === "matrix" ? MATRIX : O3CASES, cases = SET.filter((x) => !ids || ids.includes(x.id));
for (const tc of cases) { const line = []; let W3 = null, t0 = 0;
  for (const mode of ["S2D", "S3", "S3B"]) { const R = runO3(ENV, tc, mode, { record: true }), W = R.W; let torso = 0, legs = 0, t5 = 0;
    for (const [k, F] of W.frames) { if (k * DT < R.clip[0]) continue; let m5 = false; for (const x of detect(volumesOf(F.a.J), volumesOf(F.d.J), { within: 0 }).filter((x) => x.both)) { const tr = /PELVIS|WAIST|CHEST/.test(x.A) && /PELVIS|WAIST|CHEST/.test(x.B); if (tr) torso = Math.max(torso, x.pen); else { legs = Math.max(legs, x.pen); if (x.pen > 0.05) m5 = true; } } if (m5) t5++; }
    const eps = W.imp ? W.imp.episodes.concat(W.imp.ep && W.imp.ep.active ? [W.imp.ep] : []) : [];
    line.push(`${mode} torso ${(torso * 100).toFixed(1)} legs ${(legs * 100).toFixed(1)} >5cm ${t5}${eps.length ? ` · ${eps.length} ep` : ""}`); if (mode === "S3B") { W3 = W; t0 = R.t0; } }
  console.log(`${tc.id.padEnd(16)} ${line.join("  |  ")}`);
  const L = W3.l3, C = L.check; console.log(`   3B: contacts ${L.contacts} · applications ${C.n} · checks: stage3 ${C.stage3.toExponential(1)} pair ${C.pair.toExponential(1)} bound ${C.bound.toExponential(1)} energy ${C.energy.toExponential(1)} · cpu mean ${(L.cpu.reduce((a, b) => a + b, 0) / L.cpu.length * 1000).toFixed(1)} µs`);
  for (const who of ["ATT", "DEF"]) { const a = L.acc[who], f = (v) => `${v[0].toFixed(2)},${v[1].toFixed(2)}`; console.log(`   ${who} Σ 3B ${f(a.EXT3B)} · Stage 3 body contact ${f(a.S3_BODY)} · strut ${f(a.STRUT)} · balance ${f(a.BALANCE)} · fade ${f(a.FADE)} · settle ${f(a.SETTLE)}`); }
  for (const ep of W3.imp.episodes) { console.log(`   impact #${ep.n} at ${(ep.t0 - t0).toFixed(3)} (${ep.why})`); for (const pid of ["ATT", "DEF"]) { const q = ep.players[pid]; if (q) console.log(`      ${pid}: ${q.sev} · ${q.cls} · ${q.outcome} · Δv ${q.du} m/s${q.steps.length ? " · steps " + q.steps.map((x) => `${x.X} ${(x.d * 100).toFixed(0)} cm`).join(", ") : ""}`); } }
  if (process.argv.includes("--events")) for (const e of W3.l3.events.concat(W3.imp.events).sort((a, b) => a.k - b.k)) console.log(`      ${(e.t - t0).toFixed(3)} ${e.who} ${e.kind}: ${e.why}`);
  if (process.argv.includes("--log")) for (const r of W3.l3.log.slice(0, +arg("n", 30))) console.log(`      ${(r.t - t0).toFixed(3)} ${JSON.stringify({ c: r.contacts.map((c) => [c.region, c.pen, c.A + "/" + c.B, c.n, c.lam, c.yielded]), apps: r.apps.map((a) => [a.vn, a.lam, a.routeA + "/" + a.routeB]), legs: r.legs, ext: r.ext })}`); }

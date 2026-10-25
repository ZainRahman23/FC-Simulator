// occupy3/tools/o3_smoke.mjs — one line per case and mode (S2D · S3), then Stage 3's episodes and events: the quick look while building.
//   node o3_smoke.mjs [id,id,…] [--set review|matrix] [--imp json] [--events]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { O3CASES, MATRIX } from "../o3_cases.js";
import { actionState } from "./o3_study.mjs";
import { runO3, outcomeO3 } from "../o3_run.js";
import "../o3_world.js";
import { volumesOf, detect } from "../../occupy1/o_volumes.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, IMP = arg("imp") ? JSON.parse(arg("imp")) : undefined, ids = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2].split(",") : null;
const SETL = arg("set", "review") === "matrix" ? MATRIX : O3CASES, cases = SETL.filter((x) => (!ids || ids.includes(x.id)) && (!process.argv.includes("--base") || !x.matrixMirror)), DT = 1 / 240, hyp = Math.hypot;
for (const tc of cases) { const line = [];
  for (const mode of ["S2D", "S3"]) { const R = runO3(ENV, tc, mode, { record: true, imp: IMP }), W = R.W; let torso = 0, legs = 0;
    for (const [k, F] of W.frames) { if (k * DT < R.clip[0]) continue; const P = detect(volumesOf(F.a.J), volumesOf(F.d.J), { within: 0 }).filter((x) => x.both); for (const x of P) { const tr = /PELVIS|WAIST|CHEST/.test(x.A) && /PELVIS|WAIST|CHEST/.test(x.B); if (tr) torso = Math.max(torso, x.pen); else legs = Math.max(legs, x.pen); } }
    const o = outcomeO3(W), eps = W.imp ? W.imp.episodes.concat(W.imp.ep && W.imp.ep.active ? [W.imp.ep] : []) : [];
    line.push(`${mode} torso ${(torso * 100).toFixed(1)} legs ${(legs * 100).toFixed(1)}${o ? " · " + o.kind : ""}${eps.length ? ` · ${eps.length} impact${eps.length > 1 ? "s" : ""}` : ""}`);
    if (mode === "S3" && W.imp) { R.W._eps = eps; tc._W = W; tc._t0 = R.t0; for (const ep of eps) ep._ph = [actionState(W, W.att, ep.t0), actionState(W, W.def, ep.t0)].map((a) => a.kind === "ORDINARY" ? "ordinary" : `${a.label} ${a.phase}`); } }
  console.log(`${tc.id.padEnd(22)} ${line.join("  |  ")}`);
  const W = tc._W; if (!W) continue;
  for (const ep of W._eps || []) { console.log(`   impact #${ep.n} at ${(ep.t0 - tc._t0).toFixed(3)} (${ep.why})${ep.dur != null ? ` ${ep.dur.toFixed(2)} s` : " (open)"} · ${ep.onset ? `${ep.onset.contact.regions} closing ${ep.onset.contact.closing} m/s · on ATT ${ep.onset.contact.onATT} / DEF ${ep.onset.contact.onDEF}` : ""}\n      at onset: ATT ${ep._ph ? ep._ph[0] : ""} | DEF ${ep._ph ? ep._ph[1] : ""}`);
    for (const pid of ["ATT", "DEF"]) { const q = ep.players[pid]; if (q) console.log(`      ${pid}: ${q.sev} · ${q.cls} · ${q.outcome} · Δv ${q.du} m/s · peak u ${q.peakU} pelvis ${(q.peakP * 100).toFixed(1)} cm overflow ${(q.peakO * 100).toFixed(1)} cm · lean ${q.peakLean}° yaw ${q.peakYaw}° · regained ${q.regainAfter != null ? "+" + q.regainAfter + " s" : "—"}${q.steps.length ? " · steps " + q.steps.map((x) => `${x.X} ${(x.d * 100).toFixed(0)} cm @${(x.t - tc._t0).toFixed(2)}${x.landed ? "" : " (not landed)"}`).join(", ") : ""}`); } }
  if (process.argv.includes("--events")) for (const e of W.imp.events) console.log(`      ${(e.t - tc._t0).toFixed(3)} ${e.who} ${e.kind}: ${e.why}`); }

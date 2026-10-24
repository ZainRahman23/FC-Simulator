// occupy1/tools/o_tradeoff.mjs — THE SCHEDULE TRADE-OFF (look-ahead, jerk limits, correction rates, the leg tier): per setting (V=json), the deepest penetration, ticks > 5 cm, and continuity (root 2nd differences)
import { ENV } from "./o_env.mjs";
import { OCASES } from "../o_cases.js";
import { runO } from "../o_run.js";
import { RES } from "../o_world.js";
import { measureRun } from "./o_measure.mjs";
const DT = 1 / 240, ids = (process.env.IDS || "static-walk,static-jog,headon-walk,headon-jog,face,side,cross,race,carry-walk,carry-jog-l,in-bf,bf-fake,croq-win,croq-close,croq-early,in-croq").split(",");
const q = (A, p) => { const s = A.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : 0; }, base = Object.assign({}, RES);
for (const [name, cfg] of Object.entries(JSON.parse(process.env.V || '{"base":{}}'))) { Object.assign(RES, base, cfg); const F = [], per = []; let snap = 0, hard = 0, us = 0, nt = 0;
  for (const id of ids) { const tc = OCASES.find((x) => x.id === id), r = runO(ENV, tc, cfg.mode || "OCC"), rec = measureRun(ENV, r.W, r.clip); let deep = -1;
    for (const x of rec.ticks) if (x.g) { const m = Math.max(x.g.TRUNK ? x.g.TRUNK.pen : -1, x.g.LEGS ? x.g.LEGS.pen : -1); deep = Math.max(deep, m); if (m > 0.05) hard++; }
    for (const L of (r.W.occ ? r.W.occ.log : [])) { us += L.us; nt++; } per.push(`${id} ${(deep * 100).toFixed(1)}`);
    for (const p of [r.W.att, r.W.def]) { const P = []; for (let k = Math.round(r.clip[0] / DT); k <= Math.round(r.clip[1] / DT); k += 4) P.push(p.stateAt(k * DT).P); for (let i = 1; i < P.length - 1; i++) { const a = Math.hypot(P[i + 1][0] - 2 * P[i][0] + P[i - 1][0], P[i + 1][1] - 2 * P[i][1] + P[i - 1][1]); F.push(a); if (a > 0.01) snap++; } } }
  console.log(`${name.padEnd(12)} ticks>5cm ${String(hard).padStart(4)} · 2nd-diff p99 ${(q(F, 0.99) * 1000).toFixed(1)} mm max ${(q(F, 1) * 1000).toFixed(1)} · frames>1cm ${snap} · ${(us / nt).toFixed(0)} µs/near tick\n    ${per.join(" · ")}`); }

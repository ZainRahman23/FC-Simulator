// tc_responsive/tools/rs_snap.mjs — quick look at one snap over stride phases: the first relevant contact, the root's braking / turn in the
// first 0.1 / 0.2 s, the new line, the touches — either engine
//   node rs_snap.mjs <RX|BASE> <MODE> <deg> [phases]
import { makeSim, DT } from "./rs_env.mjs";
import { stickVector, stickMode, headingFrom } from "../pt_input.js";
const [eng, mode, angS, nS] = process.argv.slice(2), ang = +angS, NP = +(nS || 8), DEG = Math.PI / 180, D = 180 / Math.PI, M = { WALK: 0.30, JOG: 0.56, RUN: 0.95, SPRINT: 0.95 }[mode];
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const rows = [];
for (let i = 0; i < NP; i++) for (const sgn of [1, -1]) { const tIn = 3.0 + i * 0.48 / NP, sim = makeSim(eng, {}), H = ang * sgn * DEG; let st0 = null; const rec = {};
  for (let k = 0; k < Math.round((tIn + 2.2) / DT); k++) { const t = k * DT, a = t < tIn ? 0 : ang * sgn, v = stickVector(Math.sin(a * DEG) * M, Math.cos(a * DEG) * M); sim.step({ h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: mode === "SPRINT" ? "SPRINT" : stickMode(v.r), keys: 64 });
    const T = sim.t, s = sim.stateAt(T); if (T < tIn) continue; if (!st0) st0 = s; const dt = T - tIn, vh = Math.abs(wrap(s.h - st0.h)) / DEG;
    if (rec.ack == null && (Math.hypot(s.V[0] - st0.V[0] - 0, s.V[1] - st0.V[1]) > 0.25 + 0 || Math.abs(wrap(s.psi - st0.psi)) > 3 * DEG)) rec.ack = dt;
    if (Math.abs(dt - 0.1) < DT / 2) { rec.dv1 = s.s - st0.s; rec.dh1 = wrap(s.h - st0.h) / DEG * sgn; rec.dp1 = wrap(s.psi - st0.psi) / DEG * sgn; }
    if (Math.abs(dt - 0.2) < DT / 2) { rec.dv2 = s.s - st0.s; rec.dh2 = wrap(s.h - st0.h) / DEG * sgn; }
    if (rec.line == null && s.s >= 0.4 * sim.P.speed[mode] && Math.abs(wrap(s.h - H)) < 15 * DEG) { rec.lineS = rec.lineS ?? T; if (T - rec.lineS >= 0.1) rec.line = rec.lineS - tIn; } else if (rec.line == null) rec.lineS = null; }
  const cs = sim.contacts.filter((c) => !c.missed && c.t >= tIn); const rel = cs.find((c) => Math.hypot(...c.vOut) > 0.3 && Math.abs(wrap(Math.atan2(c.vOut[1], c.vOut[0]) - H)) < 30 * DEG);
  rows.push({ ph: i, sgn, ack: rec.ack, contact: rel ? rel.t - tIn : null, first: cs[0] ? cs[0].t - tIn : null, line: rec.line, dv1: rec.dv1, dh1: rec.dh1, dp1: rec.dp1, dv2: rec.dv2, dh2: rec.dh2, n: cs.filter((c) => c.t < tIn + 1.5).length, acts: sim.log.actions.filter((a) => a.t >= tIn && a.label !== "CARRY").map((a) => a.label.split(" ").map((w) => w[0]).join("") + (a.F || "")).slice(0, 3).join(">"), missed: sim.contacts.filter((c) => c.missed).length }); }
const f = (x, d = 2) => (x == null ? "  — " : x.toFixed(d).padStart(5));
for (const r of rows) console.log(`ph ${r.ph} ${r.sgn > 0 ? "R" : "L"} · ack ${f(r.ack, 3)} · +0.1 s: Δv ${f(r.dv1, 1)} Δtravel ${f(r.dh1, 0)}° Δfacing ${f(r.dp1, 0)}° · +0.2 s: Δv ${f(r.dv2, 1)} Δtravel ${f(r.dh2, 0)}° · first touch ${f(r.first)} relevant ${f(r.contact)} · line ${f(r.line)} · touches/1.5 s ${r.n} ${r.missed ? "MISSED " + r.missed : ""} ${r.acts}`);
const med = (k) => { const a = rows.map((r) => r[k]).filter((x) => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; }, mx = (k) => Math.max(...rows.map((r) => r[k] ?? 9));
console.log(`MEDIAN ack ${f(med("ack"), 3)} · relevant contact ${f(med("contact"))} (max ${f(mx("contact"))}) · line ${f(med("line"))} (max ${f(mx("line"))}) · Δv@0.1 ${f(med("dv1"), 1)} Δtravel@0.2 ${f(med("dh2"), 0)}°`);

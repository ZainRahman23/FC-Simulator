// speed99/tools/s_accgrid.mjs — THE ACCELERATION-99 STUDY (owner, V1.1): the curve family a(v) = a0 · (1 − (v / vmax)^p) (≥ aEnd) at vmax 38 km/h,
// integrated exactly as the simulation does (1/240 s), over launch a0 × middle-holding p: the 5 … 40 m times, the times to 25 … 99 % of vmax,
// the speed at 0.25 … 2.0 s, the time to 30 km/h — the evidence the candidates were chosen from
//   node s_accgrid.mjs
const DT = 1 / 240, V = 38 / 3.6;
function run(a0, p, aEnd) { let v = 0, x = 0, t = 0; const o = { pct: {}, vAt: {}, dAt: {} }, P = [25, 50, 70, 80, 90, 95, 99], T = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0], D = [5, 10, 20, 30, 40];
  for (let k = 0; k < 240 * 8; k++) { t = (k + 1) * DT; const a = v >= V ? 0 : Math.max(a0 * (1 - Math.pow(v / V, p)), aEnd); v = Math.min(V, v + a * DT); x += v * DT;
    for (const q of P) if (o.pct[q] == null && v >= q / 100 * V - 1e-9) o.pct[q] = t; for (const q of T) if (Math.abs(t - q) < DT / 2) o.vAt[q] = v; for (const q of D) if (o.dAt[q] == null && x >= q) o.dAt[q] = t; if (o.t30kmh == null && v >= 30 / 3.6) o.t30kmh = t; }
  return o; }
const f = (x) => (x == null ? "  —  " : x.toFixed(2)), row = (name, a0, p, aEnd) => { const o = run(a0, p, aEnd); console.log(`${name.padEnd(16)} a0 ${a0.toFixed(2)} p ${p.toFixed(2)} · 5/10/20/30/40 m ${[5, 10, 20, 30, 40].map((d) => f(o.dAt[d])).join(" ")} · t25/50/70/80/90/95/99 % ${[25, 50, 70, 80, 90, 95, 99].map((q) => f(o.pct[q])).join(" ")} · v@.25/.5/.75/1/1.5/2 ${[0.25, 0.5, 0.75, 1, 1.5, 2].map((q) => f(o.vAt[q])).join(" ")} · 30 km/h ${f(o.t30kmh)} s`); return o; };
row("C (10.35)", 10.35 / 0.95, 1.35, 0.7);
const C38 = row("C38", V / 0.95, 1.35, 0.7);
for (const a0 of [V / 0.95, 11.5, 12.0]) for (const p of [1.8, 2.2, 2.6, 3.0, 3.5]) row(`grid`, a0, p, 0.7);

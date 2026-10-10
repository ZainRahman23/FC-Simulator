// PREDICTION evaluation (leg-law investigation): the coherent interval of a promoted runner (no tackler) — frozen coherence set with CG-4 / CG-2 judged against
// the gait reference used (here the LC-1 presentation, the proxy for a physically realisable shared law), and, for comparison, against the simulation's current legs.
import fs from "fs"; import zlib from "zlib";
const files = process.argv.slice(2), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
for (const f of files) { const r = rd(f), T = r.ticks, first = {}, first2 = {};
  const rowsRef = { RC4h: t => t.pelHratio >= 0.85, RC4t: t => t.tiltDeg <= 20, CG4ref: t => !t.ref || t.ref.legRefMm <= 100, CG2ref: t => !t.ref || t.ref.cg2ref, P12: t => t.marginDeg >= 0, NM2slip: t => t.slipMm <= 10 };
  const rowsSim = { CG4sim: t => t.legSimMm == null || t.legSimMm <= 100, CG2sim: t => t.feet.L.cg2 && t.feet.R.cg2 };
  for (const t of T) { for (const [k, fn] of Object.entries(rowsRef)) if (!(k in first) && !fn(t)) first[k] = t.tau; for (const [k, fn] of Object.entries(rowsSim)) if (!(k in first2) && !fn(t)) first2[k] = t.tau; }
  const tCoh = Math.min(...Object.values(first), Infinity), S = r.stepsLog, sat = S.reduce((s, x) => s + x.ax.filter(a => a[14]).length, 0), maxVff = Math.max(...S.flatMap(x => x.ax.map(a => Math.abs(a[3])))), maxId = Math.max(...S.flatMap(x => x.ax.map(a => Math.abs(a[4]))));
  const bsat = S.filter(s => { const F = s.B.J.map(x => x * 240), Tq = s.B.H.map(x => x * 240); return Math.abs(F[0]) >= 0.99 * 274.95 || Math.abs(F[2]) >= 0.99 * 274.95 || Tq.some(t => Math.abs(t) >= 0.99 * 81.8); }).length / S.length;
  const pelMin = Math.min(...S.map(s => s.bodies[0][8]));
  console.log(r.case.padEnd(15), "kp", r.kp, "| coherent vs reference until", tCoh === Infinity ? "end (" + T[T.length - 1].tau + ")" : tCoh, "→", tCoh === Infinity ? (T[T.length - 1].tau - r.kp - 1) + "+ ticks" : (tCoh - r.kp - 1 - 1) + " ticks", JSON.stringify(first), "| vs current sim legs", JSON.stringify(first2), "| B sat", bsat.toFixed(2), "| act sat axis-steps", sat, "| max vff/id N·m", maxVff.toFixed(0), maxId.toFixed(0), "| pelvis COM min", pelMin.toFixed(3), "| legRef max (mm) first 15 ticks", Math.max(...T.slice(0, 15).map(t => t.ref ? t.ref.legRefMm : 0)).toFixed(0)); }

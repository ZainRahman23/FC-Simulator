// touchdown statistics over a set of runs: bounce (contact lost ≥ 3 ticks within 0.15 s of the first contact), time to flat, peak load, landing pitch
import { walk, f3, W, M, bi } from "./lib.mjs";
const { Q } = M; const pitch = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[1], Math.hypot(f[0], f[2])) * 57.3; };
export function tdStats(r) { const out = []; const d = r.LOCO.planner.exec.done.filter(x => x.kind === "rhythmic" && x.td); const tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
  for (const x of d) { const s = x.sw, td = x.td.t; if (td > tF - 0.2) continue; const fb = bi("foot_" + s), W_ = r.recs.filter(q => q.t >= td - 1e-9 && q.t <= td + 0.2);
    let off = 0, bounce = false, flat = null, pk = 0, pmax = -99; for (const q of W_) { const F = q.feet[s]; if (!F.touching && F.load < 25) { off++; if (off >= 3 && q.t < td + 0.15) bounce = true; } else off = 0; if (F.heel && F.toe && flat == null) flat = q.t - td; pk = Math.max(pk, F.load); pmax = Math.max(pmax, pitch(q.states[fb].rot)); }
    out.push({ k: x.stepIndex, s, bounce, flat, pk: pk / W, p0: pitch(W_[0].states[fb].rot), pmax }); }
  return out; }
if (process.argv[1].endsWith("tdstat.mjs")) { const COND = { df: 0.237, dl: 0.368, T: 0.45 }, extra = JSON.parse(process.argv[2] || "{}"), hum = JSON.parse(process.argv[3] || "{}"), all = [];
  const U = []; for (const df of [0.22, 0.28, 0.34, 0.40, 0.46]) U.push({ df }); for (const dl of [0.18, 0.22, 0.30, 0.34]) U.push({ dl }); for (const T of [0.37, 0.41, 0.49, 0.53]) U.push({ T });
  for (const u of U) { const r = walk({ n: 4, seconds: 3.9, keep: true, walk: { ...extra, char: { 0: COND, 1: { df: 0.34, dl: 0.26, T: 0.45, ...u } } }, human: hum }); all.push(...tdStats(r)); }
  const n = all.length, nb = all.filter(e => e.bounce).length, fl = all.map(e => e.flat).filter(x => x != null).sort((a, b) => a - b);
  console.log(`touchdowns ${n} · bounced ${nb} · flat p50 ${f3(fl[Math.floor(fl.length / 2)])} p90 ${f3(fl[Math.floor(fl.length * 0.9)])} never ${n - fl.length} · peak load p50 ${f3(all.map(e => e.pk).sort()[Math.floor(n / 2)], 2)} BW · pitch at td p50 ${f3(all.map(e => e.p0).sort((a, b) => a - b)[Math.floor(n / 2)], 1)}° max-after p50 ${f3(all.map(e => e.pmax).sort((a, b) => a - b)[Math.floor(n / 2)], 1)}°`); }

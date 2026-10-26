// occupy3b2/tools/b2_swings.mjs — SWINGS: the swing that follows a 3B.2 released plant against every other swing (3B.1 · 3B.2) — the leg's in-air shortfall (target out of reach), the ball of the foot
// skimming the turf (z < 2 cm, not planted) and its speed there.   node b2_swings.mjs --set matrix
import { ENV, setOf, arg, DT } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
const SET = arg("set", "matrix"), hyp = Math.hypot, agg = { S3B: { other: [], rel: [] }, S3B2: { other: [], rel: [] } };
for (const tc of setOf(SET)) { if (tc.onlyCommitted) continue;
  for (const mode of ["S3B", "S3B2"]) { const tr = { a: { R: [], L: [] }, d: { R: [], L: [] } };
    const R = runB2(ENV, tc, mode, { record: true, onTick: (W) => { const t = W.att.t, LP = W.livePoses();
      for (const [key, p, P] of [["a", W.att, LP.a], ["d", W.def, LP.d]]) for (const X of ["R", "L"]) { const st = p.plan.stances[X].find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), b = P.J["toe_" + X].j, lg = P.legs && P.legs[X];
        tr[key][X].push({ k: W.k, pl: !!st, b: b.slice(), sh: lg ? lg.short : 0 }); } } });
    const W = R.W, k0 = Math.round(R.clip[0] / DT), rel = new Set((W.b2 ? W.b2.release : []).map((e) => (e.who === "ATT" ? "a" : "d") + e.X + "@" + e.k));
    for (const key of ["a", "d"]) for (const X of ["R", "L"]) { const T = tr[key][X]; let i = 1;
      while (i < T.length) { if (T[i].pl || !T[i - 1].pl) { i++; continue; } // a lift-off at i
        const kL = T[i].k; let j = i, sh = 0, skim = 0, vmax = 0; while (j < T.length && !T[j].pl) { sh = Math.max(sh, T[j].sh); if (j > i && T[j].b[2] < 0.02) { const d = hyp(T[j].b[0] - T[j - 1].b[0], T[j].b[1] - T[j - 1].b[1]); skim += d; vmax = Math.max(vmax, d / DT); } j++; }
        if (kL >= k0) { const isRel = [...rel].some((r) => r.startsWith(key + X + "@") && Math.abs(+r.split("@")[1] - kL) <= 2); agg[mode][isRel ? "rel" : "other"].push({ id: tc.id, who: key, X, t: +(kL * DT - R.t0).toFixed(3), sh, skim, vmax, dur: (j < T.length ? T[j].k - kL : T[T.length - 1].k - kL) * DT, open: j >= T.length }); }
        i = j; } } } process.stderr.write("."); }
const pr = (L, lab) => { const n = L.length, c = (f) => L.filter(f).length; console.log(`  ${lab.padEnd(26)} swings ${String(n).padStart(5)} · leg short in the air > 10 cm ${c((x) => x.sh > 0.1)} (> 25 cm ${c((x) => x.sh > 0.25)}, largest ${(Math.max(0, ...L.map((x) => x.sh)) * 100).toFixed(1)}) · skimming the turf > 5 cm ${c((x) => x.skim > 0.05)} (largest ${(Math.max(0, ...L.map((x) => x.skim)) * 100).toFixed(1)} cm, fastest ${Math.max(0, ...L.map((x) => x.vmax)).toFixed(1)} m/s) · airborne longest ${Math.max(0, ...L.filter((x) => !x.open).map((x) => x.dur)).toFixed(2)} s, > 0.6 s ${c((x) => !x.open && x.dur > 0.6)}, still airborne at the clip's end ${c((x) => x.open)}`); };
console.log(`\nSWINGS — set ${SET}`); for (const m of ["S3B", "S3B2"]) { console.log(m); pr(agg[m].other, "ordinary / Stage 3"); if (agg[m].rel.length) pr(agg[m].rel, "after a RELEASED PLANT"); }
console.log("worst after a release:"); for (const x of agg.S3B2.rel.sort((a, b) => b.sh - a.sh).slice(0, 10)) console.log(`  ${x.id.padEnd(22)} ${x.who === "a" ? "ATT" : "DEF"} ${x.X} t ${x.t}  short ${(x.sh * 100).toFixed(1)} cm · skim ${(x.skim * 100).toFixed(1)} cm at ${x.vmax.toFixed(1)} m/s`);
console.log("worst ordinary / Stage 3 (S3B2):"); for (const x of agg.S3B2.other.sort((a, b) => b.sh - a.sh).slice(0, 6)) console.log(`  ${x.id.padEnd(22)} ${x.who === "a" ? "ATT" : "DEF"} ${x.X} t ${x.t}  short ${(x.sh * 100).toFixed(1)} cm · skim ${(x.skim * 100).toFixed(1)} cm at ${x.vmax.toFixed(1)} m/s`);
console.log("worst (S3B):"); for (const x of agg.S3B.other.sort((a, b) => b.sh - a.sh).slice(0, 6)) console.log(`  ${x.id.padEnd(22)} ${x.who === "a" ? "ATT" : "DEF"} ${x.X} t ${x.t}  short ${(x.sh * 100).toFixed(1)} cm · skim ${(x.skim * 100).toFixed(1)} cm at ${x.vmax.toFixed(1)} m/s`);

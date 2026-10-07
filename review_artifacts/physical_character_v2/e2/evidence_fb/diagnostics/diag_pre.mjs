// POST-HOC DIAGNOSTIC (not a verdict): pre-impact foot angular speed and potential-contact speeds at t_nc (last tick without touching pieces) and over [φ 0.75, t_nc), F vs AB
import fs from "fs"; import zlib from "zlib";
const D = process.argv[2], L = (a) => Math.hypot(...a), SET = (t) => t[0], ld = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; }, mx = (a) => Math.max(...a);
const res = {}; for (const f of fs.readdirSync(D).filter(x => x.startsWith("fb_PSTAR5CHAB_") && x.endsWith(".json.gz"))) { const g = f.replace("fb_PSTAR5CHAB_", ""), ff = D + "/fb_PSTAR5CHABF_" + g; if (!fs.existsSync(ff)) continue;
  const m = (r) => { const R = r.rows, i1 = R.findIndex(x => x.t === r.t1), x0 = R[i1 - 1], T = r.tr.T, w = R.filter((x, i) => i < i1 && x.u != null && x.u / T >= 0.75 - 1e-9); return { wNC: L(x0.wF), vN: x0.pc.vN * 1000, vT: x0.pc.vT * 1000, wMax: mx(w.map(x => L(x.wF))), w1: L(R[i1].wF), w2: L(R[i1 + 1].wF) }; };
  const a = m(ld(D + "/" + f)), b = m(ld(ff)), tr = g.split("_").slice(-1)[0].replace(".json.gz", ""), s = SET(tr); (res[s] = res[s] || []).push({ g, a, b }); }
for (const s of ["R", "C", "H"]) { const P = res[s]; console.log(`${s} n ${P.length}`); for (const k of ["wNC", "wMax", "vN", "vT", "w1", "w2"]) { const A = P.map(p => p.a[k]), B = P.map(p => p.b[k]), d = P.map(p => p.b[k] - p.a[k]);
  console.log(`  ${k.padEnd(5)} AB med ${med(A).toFixed(3)} max ${mx(A).toFixed(3)} | F med ${med(B).toFixed(3)} max ${mx(B).toFixed(3)} | paired Δ med ${med(d).toFixed(4)} min ${Math.min(...d).toFixed(3)} max ${mx(d).toFixed(3)}`); } }

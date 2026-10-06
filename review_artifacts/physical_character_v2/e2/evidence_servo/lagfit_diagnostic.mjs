// diagnostic: e ≈ α·(−v_ref·2ζ/ωn) + β·(−a_ref/ωn²) + c (least squares, pooled axes) per segment
import fs from "fs"; import zlib from "zlib";
const solve3 = (M, y) => { const a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < 3; c++) { let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; [a[c], a[p]] = [a[p], a[c]]; for (let r = 0; r < 3; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= 3; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[3] / r[i]); };
for (const f of process.argv.slice(2)) { const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), wn = r.wn, z = 0.8; const by = {}; for (const x of r.rows) (by[x.k] = by[x.k] || []).push(x);
  console.log("\n" + f.split("/").pop());
  for (const k of Object.keys(by)) { const R = by[k].filter(x => x.u >= 0 && x.u <= x.T + 1e-9 && x.st === "AIRBORNE"); if (!R.length) continue; const M = [[0,0,0],[0,0,0],[0,0,0]], y = [0,0,0]; let r0 = 0, r1 = 0;
    for (const x of R) for (let i = 0; i < 3; i++) { const e = x.foot.p[i] - x.ref.p[i], gv = -x.ref.v[i] * 2 * z / wn, ga = -x.ref.a[i] / (wn * wn), g = [gv, ga, 1]; for (let a = 0; a < 3; a++) { y[a] += g[a] * e; for (let b = 0; b < 3; b++) M[a][b] += g[a] * g[b]; } r0 += e * e; }
    const c = solve3(M, y); for (const x of R) for (let i = 0; i < 3; i++) { const e = x.foot.p[i] - x.ref.p[i], p = c[0] * (-x.ref.v[i] * 2 * z / wn) + c[1] * (-x.ref.a[i] / (wn * wn)) + c[2]; r1 += (e - p) ** 2; }
    console.log(`  ${R[0].id.padEnd(4)} velocity-lag coeff ${c[0].toFixed(2)}, accel-lag coeff ${c[1].toFixed(2)}, offset ${(c[2] * 1000).toFixed(2)} mm; variance explained ${(100 * (1 - r1 / r0)).toFixed(0)} %`); } }

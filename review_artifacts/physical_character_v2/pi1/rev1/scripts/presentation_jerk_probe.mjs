const L = await import(process.cwd() + "/review_artifacts/physical_character_v2/pi1/scripts/compat_lib.mjs");
const { V, loadAir, m2p } = L; const [dir, cs, r0, r1, sd] = process.argv.slice(2), R = loadAir(dir, `${cs}_LOCO.json.gz`), idx = Object.fromEntries(R.bones.map((b, i) => [b.name, i]));
const P = (k, n) => m2p(R.pres[k].world[idx[n + "_" + sd]]); let pv = null;
for (let k = +r0; k <= +r1; k++) { const cur = { knee: P(k, "shin"), ankle: P(k, "foot"), toe: P(k, "toe") };
  if (pv) { const acc = (n) => { const d1 = V.sub(cur[n], pv.c[n]), d0 = pv.d ? pv.d[n] : null; return d0 ? V.len(V.sub(d1, d0)) * 1000 : NaN; };
    console.log(`row ${k} step knee ${(V.dist(cur.knee, pv.c.knee) * 1000).toFixed(1)} mm ankle ${(V.dist(cur.ankle, pv.c.ankle) * 1000).toFixed(1)} mm | 2nd-diff knee ${acc("knee").toFixed(1)} ankle ${acc("ankle").toFixed(1)} mm`); }
  pv = { c: cur, d: pv ? { knee: V.sub(cur.knee, pv.c.knee), ankle: V.sub(cur.ankle, pv.c.ankle) } : null }; }

// SLIDE-PHYS-1 slide deceleration budget: per tackler body, the turf normal impulse and the tangential impulse along the travel direction over a
// time window, the effective friction ratio, the sole-rule state of boot contacts, and the momentum change they explain.
// usage: node sp_decel.mjs --rec rec.json.gz [--from 0.40] [--to 1.6]
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, M, G } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, out = L.readGz(arg("rec")), t0 = +arg("from", "0.4"), t1 = +arg("to", "1.6");
const acc = {}; let P0 = null, P1 = null;
for (const r of out.recs) { if (r.t < t0 || r.t > t1) continue; const P = r.chars.tackler.P; if (!P0) P0 = P; P1 = P; const vh = Math.hypot(P[0], P[2]), dir = vh > 0.2 ? [P[0] / vh, 0, P[2] / vh] : [0, 0, 1];
  for (const c of r.contacts) { if (!c.kind.startsWith("turf")) continue; const side = c.a === "turf" ? c.b : c.a, sg = c.a === "turf" ? 1 : -1, Jw = V.sc(c.J2, sg), e = acc[side[1]] || (acc[side[1]] = { Jn: 0, Jt: 0, steps: 0 });
    e.Jn += Jw[1]; e.Jt += V.dot(Jw, dir); e.steps++; } }
console.log(`window ${t0}–${t1} s · horizontal momentum ${Math.hypot(P0[0], P0[2]).toFixed(1)} → ${Math.hypot(P1[0], P1[2]).toFixed(1)} N·s`);
for (const [k, e] of Object.entries(acc).sort((a, b) => a[1].Jt - b[1].Jt)) console.log(k.padEnd(12), "normal", e.Jn.toFixed(1).padStart(7), "N·s  along-travel", e.Jt.toFixed(1).padStart(7), "N·s  ratio", (-e.Jt / Math.max(1e-6, e.Jn)).toFixed(2), " steps", e.steps);

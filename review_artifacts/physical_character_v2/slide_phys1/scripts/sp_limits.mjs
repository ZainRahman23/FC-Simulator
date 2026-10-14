// SLIDE-PHYS-1 joint-limit audit of a record: per joint key, the largest excursion beyond the V2 anatomical ACTIVE and HARD ranges (deg), when,
// and the total time beyond each, plus the plant's own constraint-space integrity measure (hardExcDeg).
// usage: node sp_limits.mjs --rec rec.json.gz [--bodies 0] (bOff for two-character records: 14 = tackler)
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { JN, B } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, out = L.readGz(arg("rec")), off = +arg("bodies", "0"), h = 1 / 240;
const acc = {}; let integ = 0;
for (const r of out.recs) { const an = L.anatOf(r.S.slice(off, off + B.length)); integ = Math.max(integ, (r.chars.tackler || r.chars.runner).integrity.hardExcDeg || 0);
  for (const j of JN) for (const [key, rom] of Object.entries(j.def.rom || {})) { const v = an[j.name][key]; if (v == null) continue; const id = j.name + "." + key, e = acc[id] || (acc[id] = { maxA: 0, tA: 0, maxH: 0, tH: 0, at: null, min: Infinity, max: -Infinity, active: rom.active, hard: rom.hard });
    e.min = Math.min(e.min, v); e.max = Math.max(e.max, v); const ea = Math.max(rom.active[0] - v, v - rom.active[1], 0), eh = Math.max(rom.hard[0] - v, v - rom.hard[1], 0);
    if (ea > 0) e.tA += h; if (eh > 0) e.tH += h; if (eh > e.maxH) { e.maxH = eh; e.at = r.t; } e.maxA = Math.max(e.maxA, ea); } }
const rows = Object.entries(acc).filter(([, e]) => e.maxA > 0.5).sort((a, b) => b[1].maxH - a[1].maxH || b[1].maxA - a[1].maxA);
console.log("plant integrity max hardExcDeg (constraint space):", integ.toFixed(2));
for (const [id, e] of rows) console.log(id.padEnd(18), "range", `${e.min.toFixed(0)}..${e.max.toFixed(0)}`.padEnd(10), "active", JSON.stringify(e.active).padEnd(10), "beyond active", e.maxA.toFixed(1).padStart(5), "° for", e.tA.toFixed(2), "s | hard", JSON.stringify(e.hard).padEnd(10), "beyond hard", e.maxH.toFixed(1).padStart(5), "° for", e.tH.toFixed(2), "s", e.at != null ? "at " + e.at.toFixed(2) : "");

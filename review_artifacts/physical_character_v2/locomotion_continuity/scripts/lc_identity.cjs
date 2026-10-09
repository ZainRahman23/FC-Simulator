// LC-1 OFFICIAL identity rows (LC1_PREREG §4): LC-6a (page export repeated → presentation world matrices + gameplay bit-identical), LC-7 (gameplay hashes
// identical across OFFNP / OFF / FULL / LOCO with LC-1 on, identical to the V1.3 baseline records, and identical with OF_CONT on vs off), LC-8 (OF_CONT off
// reproduces the V1.3 records' presentation bit for bit).
// usage: node lc_identity.cjs <airRoot (on/on_rep/off)> <v13 rx dir> <v13 def dir> <out.json>
const fs = require("fs"), zlib = require("zlib"), path = require("path"), [ROOT, V13RX, V13DEF, OUT] = process.argv.slice(2);
const rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), sum = (d) => JSON.parse(fs.readFileSync(path.join(d, "air_summary.json"))).summary;
const out = { LC6a: {}, LC7: {}, LC8: {} }; let ok6 = true, ok7 = true, ok8 = true;
for (const set of ["rx", "def", "speed"]) {
  const on = sum(path.join(ROOT, "on", set)), rep = sum(path.join(ROOT, "on_rep", set)), off = sum(path.join(ROOT, "off", set)), v13 = set === "rx" ? sum(V13RX) : set === "def" ? sum(V13DEF) : null;
  for (const cs of Object.keys(on)) {
    const hs = {}; for (const m of ["OFFNP", "OFF", "FULL", "LOCO"]) if (on[cs][m]) hs["on." + m] = on[cs][m].gameplayHash; for (const m of ["OFF", "LOCO"]) { if (rep[cs] && rep[cs][m]) hs["rep." + m] = rep[cs][m].gameplayHash; if (off[cs] && off[cs][m]) hs["off." + m] = off[cs][m].gameplayHash; }
    if (v13 && v13[cs]) for (const m of Object.keys(v13[cs])) if (v13[cs][m] && v13[cs][m].gameplayHash) hs["v13." + m] = v13[cs][m].gameplayHash;
    const uniq = [...new Set(Object.values(hs))], same = uniq.length === 1; ok7 = ok7 && same && (set === "speed" || !!(v13 && v13[cs])); out.LC7[set + "/" + cs] = { hashes: hs, identical: same };
    // LC-6a: LOCO presentation + rows identical between on and on_rep
    const A = rd(path.join(ROOT, "on", set, cs + "_LOCO.json.gz")), B = rd(path.join(ROOT, "on_rep", set, cs + "_LOCO.json.gz"));
    let presSame = A.pres.length === B.pres.length; for (let k = 0; presSame && k < A.pres.length; k++) presSame = JSON.stringify(A.pres[k].world) === JSON.stringify(B.pres[k].world) && JSON.stringify(A.pres[k].lc) === JSON.stringify(B.pres[k].lc);
    const rowsSame = JSON.stringify(A.rows) === JSON.stringify(B.rows); ok6 = ok6 && presSame && rowsSame; out.LC6a[set + "/" + cs] = { presentation: presSame, rows: rowsSame };
    // LC-8: off LOCO presentation vs the V1.3 record (rx / def)
    if (set !== "speed") { const C = rd(path.join(ROOT, "off", set, cs + "_LOCO.json.gz")), Vr = rd(path.join(set === "rx" ? V13RX : V13DEF, cs + "_LOCO.json.gz")); let mx = 0;
      for (let k = 0; k < Math.min(C.pres.length, Vr.pres.length); k++) for (let b = 0; b < C.pres[k].world.length; b++) for (let i = 0; i < 16; i++) mx = Math.max(mx, Math.abs(C.pres[k].world[b][i] - Vr.pres[k].world[b][i]));
      const same = mx === 0 && C.pres.length === Vr.pres.length; ok8 = ok8 && same; out.LC8[set + "/" + cs] = { maxAbsDiff: mx, frames: [C.pres.length, Vr.pres.length], identical: same }; }
    console.log((set + "/" + cs).padEnd(24), "LC-7", same ? "identical" : "DIFFER " + JSON.stringify(hs), "| LC-6a", presSame && rowsSame ? "identical" : "DIFFER", set !== "speed" ? "| LC-8 " + (out.LC8[set + "/" + cs].identical ? "identical" : "DIFFER " + out.LC8[set + "/" + cs].maxAbsDiff) : "");
  } }
out.pass = { LC6a: ok6, LC7: ok7, LC8_records: ok8 }; fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log("PASS", JSON.stringify(out.pass));

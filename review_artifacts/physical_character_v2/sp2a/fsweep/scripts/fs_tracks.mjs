// body-friction sweep: COM tracks for the review page (overhead / trajectory view, v_h plot) — from the run records, 60 Hz, 0–6 s after the
// plant touchdown: [t, along (m, from the ground-entry point along the entry travel direction), lateral (m), v_h (m/s), pelvis roll (°), belly-down y]
// usage (worktree root): node fs_tracks.mjs --records <dir> --out <evidence dir>
import fs from "fs";
const L = await import(new URL("../../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href), AA = await import(new URL("../../scripts/sp2a_author.mjs", import.meta.url).href), { V, Q, B, bi } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, out = { tool: "fs_tracks.mjs", rate: 60, cols: ["t", "along", "lat", "vh", "roll", "bellyY"], tracks: {} };
const SUM = JSON.parse(fs.readFileSync(arg("out") + "/fsweep_summary.json"));
for (const id of ["F100", "F75", "F50", "F25", "F10", "F0"]) { const o = L.readGz(`${arg("records")}/${id}.json.gz`), tE = SUM.conditions[id].groundEntry.t, kE = Math.round(tE * 240) - 1, S0 = o.recs[kE].S.slice(0, B.length), c0 = L.comOf(S0), P0 = o.recs[kE].chars.tackler.P, h0 = Math.hypot(P0[0], P0[2]), d = [P0[0] / h0, 0, P0[2] / h0], lat = [d[2], 0, -d[0]];
  out.tracks[id] = { m: o.fsweep.m, entryT: tE, rows: o.recs.filter((_, k) => k % 4 === 3).map(r => { const S = r.S.slice(0, B.length), c = L.comOf(S), dc = V.sub(c, c0), P = r.chars.tackler.P, pa = AA.pelvisAngles(S[0].rot), belly = Q.rot(S[bi("thorax")].rot, [0, 0, 1]);
    return [+r.t.toFixed(4), +V.dot(dc, d).toFixed(3), +V.dot(dc, lat).toFixed(3), +(Math.hypot(P[0], P[2]) / L.M).toFixed(3), +pa.rollDeg.toFixed(1), +belly[1].toFixed(3)]; }) }; }
fs.writeFileSync(arg("out") + "/fsweep_tracks.json", JSON.stringify(out)); console.log("tracks", Object.keys(out.tracks).map(k => `${k}:${out.tracks[k].rows.length}`).join(" "));

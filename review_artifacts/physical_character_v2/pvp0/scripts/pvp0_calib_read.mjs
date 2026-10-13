// PVP-0 calibration reader (setup only): the tackler-alone CALIB run, sampled every 50 ms after activation (COM, velocity, right-boot path, pelvis height, turf contacts, tracking error). usage: node pvp0_calib_read.mjs <CALIB.json.gz>
import fs from "fs"; import zlib from "zlib";
const RA = process.cwd() + "/review_artifacts/physical_character_v2/";
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, T = PL.SPEC_T();
const o = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.argv[2]))), A = o.setup.activate, nb = 14, off = 14;
const fR = off + T.bodies.findIndex(b => b.name === "foot_R"), sR = off + T.bodies.findIndex(b => b.name === "shank_R"), pel = off;
const rec = (n) => o.recs[n - 1];
const start = rec(A + 1), c0 = start.chars.tackler.com, f0 = start.S[fR].com;
for (let dt = 0; dt <= 1.6; dt += 0.05) { const n = A + 1 + Math.round(dt * 240); if (n > o.recs.length) break; const r = rec(n), c = r.chars.tackler, P = c.P, M = 78.91;
  const turf = (r.contacts || []).filter(m => m.kind === "turf-tackler" && m.Jn > 0).map(m => (m.a === "turf" ? m.b[1] : m.a[1])); const low = PL.bodyLowest(T.bodies[14 - 14 + 10], r.S[fR]);
  const ti = o.trackerLog.n.indexOf(n); console.log(`+${dt.toFixed(2)}s COM [${c.com.map(v => v.toFixed(2))}] v [${V.sc(P, 1 / M).map(v => v.toFixed(2))}] footR com [${r.S[fR].com.map(v => v.toFixed(2))}] Δ(footR−start) z ${(r.S[fR].com[2] - f0[2]).toFixed(2)} x ${(r.S[fR].com[0] - f0[0]).toFixed(2)} | ΔCOM z ${(c.com[2] - c0[2]).toFixed(2)} | pelvisY ${r.S[pel].pos[1].toFixed(2)} | turf: ${[...new Set(turf)].join(",")} | trackErr ${ti >= 0 ? o.trackerLog.errDeg[ti] : "-"}°`); }

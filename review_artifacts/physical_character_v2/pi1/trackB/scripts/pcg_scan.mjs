// Track B characterisation (descriptive; selects nothing): PCG-F0 eligibility of every PRE-CONTACT locomotion frame in the V1.3 records — which
// stride phases of ordinary running the rigid F0 foot can represent within the frozen tolerances, the longest eligible run, and why frames fail.
// usage (worktree root): V13_WT=<v1.3 worktree> node .../pcg_scan.mjs <airDir> <out.json>
import fs from "fs";
const M = await import(new URL("./pcg_f0.mjs", import.meta.url).href);
const { L, pose, geomRows, kinRows, rigGeom } = M; const { loadAir } = L;
const [AIRDIR, OUT] = process.argv.slice(2), summ = JSON.parse(fs.readFileSync(AIRDIR + "/air_summary.json")).summary;
const seen = new Set(), frames = [];
for (const cs of Object.keys(summ)) {
  const h = summ[cs].LOCO && summ[cs].LOCO.gameplayHash; if (!h || seen.has(h)) continue; seen.add(h);   // identical records (e.g. rx_jog = rx_planted_leg) counted once
  const R = loadAir(AIRDIR, `${cs}_LOCO.json.gz`), G = rigGeom(R), first = R.events.find(e => e.kind === "PLAYER_CONTACT"), last = first ? first.tick - 2 : R.pres.length - 1;
  const cache = []; const getP = (k) => cache[k] || (cache[k] = pose(R, k, "F"));
  for (let k = 2; k <= last; k++) { const row = R.rows[k], vx = row[10], vy = row[11], v = Math.hypot(vx, vy), ph = row[13], g = geomRows(R, k, getP(k), G), kin = kinRows(R, k, getP);
    frames.push({ cs, k, v: +v.toFixed(2), phase: +ph.toFixed(3), geom: g.fails, kin: kin.fails, feet: g.footContact, mtp: g.report.mtpFlexDeg }); } }
const cls = (v) => v < 0.18 ? "standing" : v < 4 ? "jog (≈3 m/s)" : v < 6.5 ? "run (≈5.5 m/s)" : "sprint (≈7.5 m/s)";
const out = { note: "pre-contact LOCO frames of every distinct V1.3 record; PCG-F0 rows per TRACKB_PREREG §3 / A2", classes: {} };
for (const c of [...new Set(frames.map(f => cls(f.v)))]) { const F = frames.filter(f => cls(f.v) === c), ok = (f) => !f.geom.length && !f.kin.length;
  const items = {}; for (const f of F) for (const x of f.geom.concat(f.kin)) items[x] = (items[x] || 0) + 1;
  let maxRun = 0; for (const cs of [...new Set(F.map(f => f.cs))]) { const G = F.filter(f => f.cs === cs).sort((a, b) => a.k - b.k); let run = 0, prev = null; for (const f of G) { run = ok(f) && (prev == null || f.k === prev + 1) ? (ok(f) ? run + 1 : 0) : (ok(f) ? 1 : 0); prev = f.k; maxRun = Math.max(maxRun, run); } }
  const bins = Array.from({ length: 10 }, (_, i) => { const B = F.filter(f => Math.floor(((f.phase % 1) + 1) % 1 * 10) === i); return { phase: `${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}`, frames: B.length, eligible: B.filter(ok).length, geomOK: B.filter(f => !f.geom.length).length, kinOK: B.filter(f => !f.kin.length).length }; });
  out.classes[c] = { frames: F.length, eligible: F.filter(ok).length, geometricOK: F.filter(f => !f.geom.length).length, kinematicOK: F.filter(f => !f.kin.length).length, longestEligibleRunFrames: maxRun, failItems: Object.fromEntries(Object.entries(items).sort((a, b) => b[1] - a[1])), byPhase: bins };
  console.log(c.padEnd(18), "frames", F.length, "eligible", out.classes[c].eligible, "geomOK", out.classes[c].geometricOK, "kinOK", out.classes[c].kinematicOK, "longest eligible run", maxRun, "| items", JSON.stringify(out.classes[c].failItems)); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

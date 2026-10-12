// BALANCE-2 successor DEVELOPMENT set (DEV), declared before any successor design run and disjoint from the frozen matched battery B2M:
// B2M uses 50 ms pulses at 4.82 / 9.64 / 14.83 / 21.50 (fwd), 5.84 / 11.69 / 17.98 / 26.07 (back), 7.5 / 15 / 23 / 32.5 (lateral) N·s; DEV uses
// 100 ms pulses (24 steps) at different magnitudes, plus the audit's own C-diagnosis case (BALANCE-1 moderate fwd 12 N·s / 50 ms, §6), plus
// a 100 ms-pulse forward bisection as the superhuman guard. Same frozen protocol otherwise (SOLO, PPR-3 entry, onset 480, 4 s window, twin,
// frozen recovery rule). Development results never read B2M. usage (worktree root):
//   node .../b2_dev.mjs --ctrl <json> [--ctrlModule <path> --ctrlClass <name>] [--set <json override, merged into the params>] [--thr] --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs");
const { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { overshoot } = await import(new URL("./b2_qualify.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const DEV = Object.freeze({ onset: 480, window: 960, cases: [["fwd", 5, 24], ["fwd", 10, 24], ["back", 6, 24], ["back", 12, 24], ["left", 12, 24], ["fwd", 12, 12]], thr: { dir: "fwd", pulse: 24, lo: 0, hi: 30, iters: 6 } });
const merge = (a, b) => { if (b == null) return a; if (typeof b !== "object" || Array.isArray(b)) return b; const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) o[k] = merge(o[k], v); return o; };
export async function dev(CFG, opts = {}) { const CM = await import(CFG.ctrlModule || (RA + "balance1/scripts/b1_ctrl.mjs")), Ctrl = CM[CFG.ctrlClass || "BalanceController"], body = CFG.body || JSON.parse(fs.readFileSync(new URL("balance1/params/B1_BODY.json", RA)));
  const job = (extra) => ({ law: "M1B", params: body, ctrl: () => new Ctrl(CFG.ctrl), ...extra }), steps = DEV.onset + DEV.window, base = await runOne(job({ steps })), edges = BT.bos(base.recs, DEV.onset - 6, DEV.onset), out = { cases: {} };
  for (const [dir, J, pulse] of DEV.cases) { const o = await runOne(job({ steps, perturb: BT.pushJob(dir, J, DEV.onset, pulse) })), rec = BT.recovery(base, o, DEV.onset, DEV.window, edges, { dropFallMm: 150, recTolMm: 10 });
    out.cases[`${dir}.${J}@${pulse}`] = { fall: rec.fall, recovered: rec.recovered, peakMm: rec.comPeakMm, tPeakS: rec.tPeakS, settleS: rec.settleS, overshoot: rec.fall ? null : overshoot(base, o, DEV.onset, DEV.window, dir), stop: o.stop || null }; }
  if (opts.thr) { let { lo, hi } = DEV.thr; for (let it = 0; it < DEV.thr.iters; it++) { const J = (lo + hi) / 2, o = await runOne(job({ steps, perturb: BT.pushJob(DEV.thr.dir, J, DEV.onset, DEV.thr.pulse) })); if (BT.recovery(base, o, DEV.onset, DEV.window, edges, { dropFallMm: 150, recTolMm: 10 }).fall) hi = J; else lo = J; }
    out.thrFwd100ms = { thresholdNs: (lo + hi) / 2, bracket: [lo, hi] }; }
  // DEV-only superhuman guard backward (100 ms pulses) and a 20 s quiet-standing check (B2M's own U and T are not run in development)
  if (opts.thrBack) { let lo = 0, hi = 36; for (let it = 0; it < 6; it++) { const J = (lo + hi) / 2, o = await runOne(job({ steps, perturb: BT.pushJob("back", J, DEV.onset, 24) })); if (BT.recovery(base, o, DEV.onset, DEV.window, edges, { dropFallMm: 150, recTolMm: 10 }).fall) hi = J; else lo = J; }
    out.thrBack100ms = { thresholdNs: (lo + hi) / 2, bracket: [lo, hi] }; }
  if (opts.quiet) { const U = await runOne(job({ steps: 4800 })), sw = BT.sway(U, 960, U.recs.length); out.quiet20s = { comAPmm: sw.comAPmm.rms, comMLmm: sw.comMLmm.rms, freqHz: sw.comAPfreqHz, stop: U.stop || null }; }
  return out; }
if (process.argv[1] && process.argv[1].endsWith("b2_dev.mjs")) { const ctrl = merge(JSON.parse(fs.readFileSync(arg("ctrl"))), arg("set") ? JSON.parse(arg("set")) : null);
  const R = await dev({ ctrl, ctrlModule: arg("ctrlModule") ? new URL(arg("ctrlModule"), "file://" + process.cwd() + "/").href : undefined, ctrlClass: arg("ctrlClass") }, { thr: process.argv.includes("--thr"), thrBack: process.argv.includes("--thrBack"), quiet: process.argv.includes("--quiet") });
  R.label = arg("label", ""); if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(R));
  const f = (x, d = 1) => (x == null ? "  -  " : x.toFixed(d)); console.log(R.label); for (const [k, c] of Object.entries(R.cases)) console.log(`  ${k.padEnd(13)} ${c.fall ? "FALL " + c.fall.t.toFixed(2) + " " + c.fall.cause : (c.recovered ? "rec " : "NOTset")} pk ${f(c.peakMm)} tpk ${f(c.tPeakS, 2)} set ${f(c.settleS, 2)} os ${c.overshoot ? f(c.overshoot.frac, 3) : "-"}`);
  if (R.thrFwd100ms) console.log("  thr fwd 100ms", R.thrFwd100ms.thresholdNs.toFixed(2)); if (R.thrBack100ms) console.log("  thr back 100ms", R.thrBack100ms.thresholdNs.toFixed(2));
  if (R.quiet20s) console.log("  quiet 20 s: COM RMS AP", R.quiet20s.comAPmm.toFixed(2), "ML", R.quiet20s.comMLmm.toFixed(2), "f", R.quiet20s.freqHz.toFixed(2), R.quiet20s.stop ? "STOP" : ""); }

// BALANCE-2 C3 development harness: C2's frozen DEV set (scripts/b2_dev.mjs DEV: 100 ms pulses fwd 5 / 10, back 6 / 12, left 12, the audit's
// fwd 12 N·s @ 50 ms, the 100 ms forward / backward bisections, 20 s quiet standing) — disjoint from B2M — plus the legitimate-support
// measurement (scripts/c3_support.mjs: boot-tip load share, heel lift) on every case and every bisection level. Never reads B2M.
// usage (worktree root): node .../c3_dev.mjs --ctrl <json> [--ctrlModule <path> --ctrlClass <name>] [--set <json>] [--thr] [--thrBack] [--quiet] --label <id> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs");
const { overshoot } = await import(new URL("./b2_qualify.mjs", import.meta.url).href), { DEV } = await import(new URL("./b2_dev.mjs", import.meta.url).href), { support } = await import(new URL("./c3_support.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const merge = (a, b) => { if (b == null) return a; if (typeof b !== "object" || Array.isArray(b)) return b; const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) o[k] = merge(o[k], v); return o; };
export async function dev(CFG, opts = {}) { const CM = await import(CFG.ctrlModule), Ctrl = CM[CFG.ctrlClass], body = JSON.parse(fs.readFileSync(new URL("balance1/params/B1_BODY.json", RA))); let last = null;
  const job = (extra) => ({ law: "M1B", params: body, ctrl: () => (last = new Ctrl(CFG.ctrl)), ...extra }), steps = DEV.onset + DEV.window, base = await runOne(job({ steps })), edges = BT.bos(base.recs, DEV.onset - 6, DEV.onset), out = { cases: {} };
  const one = async (dir, J, pulse) => { const o = await runOne(job({ steps, perturb: BT.pushJob(dir, J, DEV.onset, pulse) })), rec = BT.recovery(base, o, DEV.onset, DEV.window, edges, { dropFallMm: 150, recTolMm: 10 });
    return { fall: rec.fall, recovered: rec.recovered, peakMm: rec.comPeakMm, tPeakS: rec.tPeakS, settleS: rec.settleS, overshoot: rec.fall ? null : overshoot(base, o, DEV.onset, DEV.window, dir), support: support(o, base, DEV.onset, steps), gov: last && last.govStats ? { ...last.govStats } : null, stop: o.stop || null }; };
  for (const [dir, J, pulse] of DEV.cases) out.cases[`${dir}.${J}@${pulse}`] = await one(dir, J, pulse);
  const bis = async (dir, lo, hi, it, pulse) => { const tried = []; for (let i = 0; i < it; i++) { const J = (lo + hi) / 2, c = await one(dir, J, pulse); tried.push({ J: +J.toFixed(3), fall: !!c.fall, tipSharePeak: c.support.tipSharePeak, heelLiftPeakDeg: c.support.heelLiftPeakDeg }); if (c.fall) hi = J; else lo = J; } return { thresholdNs: (lo + hi) / 2, bracket: [lo, hi], tried }; };
  if (opts.thr) out.thrFwd100ms = await bis("fwd", DEV.thr.lo, DEV.thr.hi, DEV.thr.iters, DEV.thr.pulse);
  if (opts.thrBack) out.thrBack100ms = await bis("back", 0, 36, 6, 24);
  if (opts.quiet) { const U = await runOne(job({ steps: 4800 })), sw = BT.sway(U, 960, U.recs.length); out.quiet20s = { comAPmm: sw.comAPmm.rms, comMLmm: sw.comMLmm.rms, freqHz: sw.comAPfreqHz, support: support(U, null, 960, U.recs.length), stop: U.stop || null }; }
  return out; }
if (process.argv[1] && process.argv[1].endsWith("c3_dev.mjs")) { const ctrl = merge(JSON.parse(fs.readFileSync(arg("ctrl"))), arg("set") ? JSON.parse(arg("set")) : null), abs = (p) => new URL(p, "file://" + process.cwd() + "/").href;
  const R = await dev({ ctrl, ctrlModule: abs(arg("ctrlModule", "review_artifacts/physical_character_v2/balance2/c3/c3_ctrl.mjs")), ctrlClass: arg("ctrlClass", "C3Controller") }, { thr: process.argv.includes("--thr"), thrBack: process.argv.includes("--thrBack"), quiet: process.argv.includes("--quiet") });
  R.label = arg("label", ""); R.set = arg("set") ? JSON.parse(arg("set")) : null; if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(R));
  const f = (x, d = 1) => (x == null ? "  -  " : x.toFixed(d)); console.log(R.label);
  for (const [k, c] of Object.entries(R.cases)) console.log(`  ${k.padEnd(13)} ${c.fall ? "FALL " + c.fall.t.toFixed(2) : (c.recovered ? "rec " : "NOTset")} pk ${f(c.peakMm)} set ${f(c.settleS, 2)} os ${c.overshoot ? f(c.overshoot.frac, 3) : "-"}  tip ${f(c.support.tipSharePeak, 3)} heel ${f(c.support.heelLiftPeakDeg, 1)}°${c.gov ? " gov " + c.gov.limited + "/" + c.gov.steps + " res " + c.gov.residual : ""}`);
  for (const t of ["thrFwd100ms", "thrBack100ms"]) if (R[t]) console.log(`  ${t} ${R[t].thresholdNs.toFixed(2)}  ` + R[t].tried.map(x => `${x.J}${x.fall ? "F" : "r"}(tip ${x.tipSharePeak.toFixed(2)}, ${x.heelLiftPeakDeg.toFixed(1)}°)`).join(" "));
  if (R.quiet20s) console.log("  quiet 20 s: COM RMS AP", R.quiet20s.comAPmm.toFixed(2), "ML", R.quiet20s.comMLmm.toFixed(2), "tip", R.quiet20s.support.tipSharePeak, R.quiet20s.stop ? "STOP" : ""); }

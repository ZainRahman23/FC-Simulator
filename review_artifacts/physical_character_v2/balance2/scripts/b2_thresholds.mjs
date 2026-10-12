// BALANCE-2 §7 / §8 — no-step thresholds in all four directions for a given body / controller / entry (diagnostic; the frozen BALANCE-1 T
// protocol: 50 ms pelvis-COM pulse at t = 2 s, 4 s window, the frozen recovery / fall definition with the battery's support edges, 7-step
// bisection over [0, 1.5 × the BALANCE-1 zero-delay limit]). Thresholds are reported in N·s and as fractions of BOTH the BALANCE-1 zero-delay
// limits (battery edge, incl. near-contact points within 5 mm) and the zero-delay limits at the LOADED support edge of the settled entry.
// usage: node b2_thresholds.mjs [--ctrl B1_B] [--entry <fixture json>] [--dirs fwd,back,left,right] [--iters 7] --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), SPEC = PL.SPEC_R(), M = SPEC.totals.mass;
const { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), CT = await import(RA + "balance1/scripts/b1_ctrl.mjs"), BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs");
const B1LIM = { fwd: 24.27, back: 29.01, left: 62.22, right: 62.22 }, ONSET = 480, WINDOW = 960;
export async function thresholds(opt = {}) { const cp = opt.ctrlObj || JSON.parse(fs.readFileSync(new URL(`balance1/params/${opt.ctrl || "B1_B"}.json`, RA))), fixtureObj = opt.entryObj || undefined, body = opt.body || {};
  const job = (extra) => ({ law: "M1B", params: body, ctrl: () => new CT.BalanceController(cp), fixtureObj, steps: ONSET + WINDOW, ...extra });
  const base = await runOne(job({})), edges = BT.bos(base.recs, ONSET - 6, ONSET), lp = []; for (let q = ONSET - 6; q < ONSET; q++) for (const m of base.recs[q].contacts || []) if (m.kind === "turf-runner") for (const p of m.points) if (p.lam > 0) lp.push(p.p);
  const loaded = { fwd: Math.max(...lp.map(p => p[0])), back: Math.min(...lp.map(p => p[0])), left: Math.max(...lp.map(p => p[2])), right: Math.min(...lp.map(p => p[2])) }, c0 = base.recs[ONSET - 1].chars.runner.com, w0 = Math.sqrt(9.81 / c0[1]);
  const mg = (E) => ({ fwd: E.fwd - c0[0], back: c0[0] - E.back, left: E.left - c0[2], right: c0[2] - E.right }), mB = mg(edges), mL = mg(loaded), lim = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, M * w0 * v]));
  const out = { baseHash: base.finalHash, comEntry: c0, omega0: w0, marginsBatteryMm: Object.fromEntries(Object.entries(mB).map(([k, v]) => [k, v * 1000])), marginsLoadedMm: Object.fromEntries(Object.entries(mL).map(([k, v]) => [k, v * 1000])), JlimBattery: lim(mB), JlimLoaded: lim(mL), T: {} };
  for (const dir of opt.dirs || ["fwd", "back", "left", "right"]) { let lo = 0, hi = 1.5 * B1LIM[dir]; const tried = [];
    for (let it = 0; it < (opt.iters || 7); it++) { const J = (lo + hi) / 2, o = await runOne(job({ perturb: BT.pushJob(dir, J, ONSET, 12) })), rec = BT.recovery(base, o, ONSET, WINDOW, edges, { dropFallMm: 150, recTolMm: 10 });
      tried.push({ J: +J.toFixed(3), fall: rec.fall ? { t: +rec.fall.t.toFixed(3), cause: rec.fall.cause } : null, recovered: rec.recovered, peakMm: +rec.comPeakMm.toFixed(1), settleS: rec.settleS }); if (rec.fall) hi = J; else lo = J; }
    const T = (lo + hi) / 2; out.T[dir] = { thresholdNs: T, bracket: [lo, hi], fracB1Lim: T / B1LIM[dir], fracLoadedLim: T / out.JlimLoaded[dir], fracBatteryLim: T / out.JlimBattery[dir], tried }; }
  return out; }
if (process.argv[1] && process.argv[1].endsWith("b2_thresholds.mjs")) { const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const R = await thresholds({ ctrl: arg("ctrl", "B1_B"), entryObj: arg("entry") ? JSON.parse(fs.readFileSync(arg("entry"))) : undefined, dirs: arg("dirs") ? arg("dirs").split(",") : undefined, iters: +arg("iters", "7") });
  fs.writeFileSync(arg("out"), JSON.stringify(R, null, 1)); const f = (x) => +x.toFixed(3);
  console.log("margins loaded mm", JSON.stringify(R.marginsLoadedMm, (k, v) => typeof v === "number" ? f(v) : v), "battery", JSON.stringify(R.marginsBatteryMm, (k, v) => typeof v === "number" ? f(v) : v));
  for (const [d, t] of Object.entries(R.T)) console.log(d, "T", f(t.thresholdNs), "bracket", t.bracket.map(f), "/B1lim", f(t.fracB1Lim), "/loadedLim", f(t.fracLoadedLim), "/batteryLim", f(t.fracBatteryLim), "JlimLoaded", f(R.JlimLoaded[d])); }

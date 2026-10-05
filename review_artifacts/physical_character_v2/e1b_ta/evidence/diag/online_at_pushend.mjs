import fs from "fs"; import zlib from "zlib";
import { captureContext, simulate, planDescent, TA } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/ctrl/v2_capture.js";
const rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const K = { dt: 1 / 240, horizon: 2.5, fellBeyond: 0.05, kXi: 1 / 3, minShare: 0.10, acceptDebounce: 0.05, abortDur: 0.6 };
for (const b of ["V2-165-62", "V2-175-70", "V2-REF", "V2-long-legs", "V2-198-92"]) { const R = rd(`cap_${b}_L_pd.json.gz`), n = R.lifted, ab = R.events.abortT, te = R.events.pertT + 0.1;
  for (const [lab, tt] of [["abort", ab], ["push end", te]]) { const r = R.rows.find(x => x.t >= tt - 1e-9 && x.dg), cx = captureContext({ xi: r.xi, w0: r.dg.w0, p: r.dg.p, polys: r.dg.polys, heading: r.dg.heading }, n, K), el = r.t - ab;
    const pl = planDescent(cx, { elapsed: el, kFrom: 1, TputMax: 0.3023, lamFrom: 1, dt: 1 / 240 });
    // latest touchdown (from now, no margin) with ramp 0.10, decoupled acceptance, ta floor
    let lo = 0, hi = 1; const ok = (tc) => simulate(cx, { tc, tAcc: tc + 0.05, Tr: 0.10, lamFrom: 1, floorRule: "ta" }).recovers; let lt; if (!ok(0)) lt = -1; else { for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; } lt = lo; }
    console.log(`${b.padEnd(13)} at ${lab.padEnd(8)} (+${el.toFixed(3)} s after abort): ξ outside S ${(-cx.Sin * 100).toFixed(1)} cm | plan: ${pl.verdict}, k ${pl.k.toFixed(2)}, Tput ${pl.Tput.toFixed(3)}, Tr ${pl.Tr.toFixed(3)} | latest touchdown after abort, ramp 0.10, no margin: ${lt < 0 ? "none" : (lt + el).toFixed(3)} s`); } }

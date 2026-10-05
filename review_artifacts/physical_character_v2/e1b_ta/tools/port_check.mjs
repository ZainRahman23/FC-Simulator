import fs from "fs"; import zlib from "zlib"; import { setup, sim, latestTD } from "./p15_model.mjs";
import { captureContext, simulate } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/ctrl/v2_capture.js";
const rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const K = { dt: 1 / 240, horizon: 2.5, fellBeyond: 0.05, kXi: 1 / 3, minShare: 0.10, acceptDebounce: 0.05, abortDur: 0.6 };
// current-pipeline acceptance time (relative): first t ≥ tc with 1 − λS ≥ wantShare, + debounce
const tAccCur = (tc) => { for (let t = tc; t < tc + 1; t += 1 / 960) if (0.5 * mj((t - tc) / 0.6) >= 0.05) return t + 0.05; };
let exact = 0, tot = 0, agreeU = 0; const bodies = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"];
for (const b of bodies) for (const sd of ["L", "R"]) for (const mode of ["pd", "drop"]) { const R = rd(`cap_${b}_${sd}_${mode}.json.gz`), P = setup(R), n = R.lifted;
  const td = R.lcLog[n].find(e => e.t >= R.events.abortT - 1e-9 && e.to === "TOUCHDOWN").t, tcRel = td - P.te, real = /fell/.test(R.summary.outcome);
  // (1) exact port: online simulate on the offline geometry mapped to the u-frame (origin ξ, +toward the landed foot)
  const cxM = { ...K, w: P.w, Sin: P.sgn * (P.Sin - P.xi0), Aout: P.sgn * (P.Aout - P.xi0), cA: P.sgn * (P.cA - P.xi0), cS: P.sgn * (P.cS - P.xi0), miss: false };
  const off = sim(P, { tc: td, latency: "current" }).fell, on = !simulate(cxM, { tc: tcRel, tAcc: tAccCur(tcRel), Tr: 0.1, lamFrom: 1, floorRule: "current" }).recovers; tot++; if (off === on) exact++;
  // (2) the online geometry from the measured state (captureContext along u = ξ − p)
  const r = R.rows.find(x => x.t >= P.te - 1e-9 && x.dg), cx = captureContext({ xi: r.xi, w0: r.dg.w0, p: r.dg.p, polys: r.dg.polys, heading: r.dg.heading }, n, K), onU = !simulate(cx, { tc: tcRel, tAcc: tAccCur(tcRel), Tr: 0.1, lamFrom: 1, floorRule: "current" }).recovers; if (onU === real) agreeU++;
  if (off !== on || onU !== real) console.log(`  ${b} ${sd} ${mode}: offline ${off ? "FELL" : "rec"} | online(mapped) ${on ? "FELL" : "rec"} | online(u-geometry) ${onU ? "FELL" : "rec"} | sim ${real ? "FELL" : "rec"} | u ${cx.u.map(v => v.toFixed(3))} Sin ${cx.Sin.toFixed(4)} Aout ${cx.Aout.toFixed(4)} vs mapped ${cxM.Sin.toFixed(4)} ${cxM.Aout.toFixed(4)}`); }
console.log(`port exactness (online on offline geometry == offline): ${exact}/${tot}; online u-geometry vs simulation outcomes: ${agreeU}/${tot}`);

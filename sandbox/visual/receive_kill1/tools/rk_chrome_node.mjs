// receive_kill1/tools/rk_chrome_node.mjs — the Node side of rk_chrome.cjs: the lab's evalCase, verbatim
import { prepare, runBC, drawsFor } from "../rk_sim.js";
export async function run(cases) {
  return cases.map(({ cond, bc, draw }) => {
    const c = Object.assign({ h: 0.11, drop: 0, bear: 0, lat: 0, surface: "AUTO" }, cond), P = prepare(c), N = drawsFor(draw.startsWith("seed") ? { seed: +draw.slice(4) } : { example: draw });
    if (P.plan.none) return { none: true }; const run = runBC(P, bc, N, { post: 3.0, every: 1 });
    let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
    for (const x of run.ex.v) mix(x); for (const x of run.m.final) mix(x); mix(P.kc);
    return { hash: h.toString(16), surface: P.plan.sf.key, kc: P.kc, D: P.plan.dif.D, v: run.ex.v, final: run.m.final, d2: run.m.dStar, ideal: P.ideal.v, launched: run.m.launched };
  });
}

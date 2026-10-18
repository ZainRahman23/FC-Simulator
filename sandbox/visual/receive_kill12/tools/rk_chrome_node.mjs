// receive_kill12/tools/rk_chrome_node.mjs — the Node side of rk_chrome.cjs: the lab's evalCase, verbatim (control episodes)
import { prepare, runBC, runEpisode, firstContact, drawsFor } from "../rk_sim.js";
export async function run(cases) {
  return cases.map(({ cond, bc, draw }) => {
    const c = Object.assign({ h: 0.11, drop: 0, bear: 0, lat: 0, surface: "AUTO" }, cond), P = prepare(c), spec = draw.startsWith("seed") ? { seed: +draw.slice(4) } : { example: draw };
    if (P.plan.none) return { none: true }; const r1 = runBC(P, bc, drawsFor(Object.assign({ event: "kill1" }, spec)), { post: 2.2, every: 2 }), fc = firstContact(P, r1.ex, r1.run), ep = runEpisode(P, bc, spec, { every: 1 });
    let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
    for (const k of ep.contacts) { mix(k.i); for (const x of k.ex.v) mix(x); } for (const x of ep.m.finalBall) mix(x); mix(ep.m.tStable == null ? -1 : ep.m.tStable); mix(P.kc);
    return { hash: h.toString(16), surface: P.plan.sf.key, kc: P.kc, D: P.plan.dif.D, contacts: ep.contacts.map((k) => [k.sf.key, k.i, k.ex.v]), final: ep.m.finalBall, tStable: ep.m.tStable, cls: ep.m.continuation, launched: ep.launched, fc: [fc.velErr, fc["e0.25"], fc.dropErr] };
  });
}

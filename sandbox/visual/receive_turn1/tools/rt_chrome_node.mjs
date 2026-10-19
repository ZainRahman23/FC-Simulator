// receive_turn1/tools/rt_chrome_node.mjs — the Node side of rt_chrome.cjs: the turn lab's evalCase, verbatim
import { prepareTurn, runTurn } from "../rt_sim.js";
const condFor = (c) => ({ theta: c.theta, v: c.v, lat: c.lat, family: c.family === "AUTO" ? undefined : c.family, foot: c.foot === "AUTO" ? undefined : c.foot, variant: c.variant === "AUTO" ? undefined : c.variant, prep: c.prep === "clean" ? undefined : +c.prep, pref: c.pref === "both" ? null : c.pref });
export async function run(cases) {
  return cases.map(({ cond, bc, draw }) => {
    const c = Object.assign({ theta: 0, v: 12, lat: 0, family: "AUTO", foot: "AUTO", variant: "AUTO", prep: "clean", pref: "R" }, cond), P = prepareTurn(condFor(c)); if (P.A.none) return { none: true };
    const spec = draw.startsWith("seed") ? { seed: +draw.slice(4) } : { example: draw }, e = runTurn(P, bc, spec, { every: 1 });
    let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
    mix(P.kc); for (const x of e.ex.v) mix(x); mix(e.m.tCont == null ? -1 : e.m.tCont); for (const x of e.rec[e.rec.length - 1].p) mix(x);
    return { hash: h.toString(16), fid: P.A.fid, F: P.A.F, surface: P.A.surface, kc: P.kc, v: e.ex.v, cls: e.m.cls, tCont: e.m.tCont, extraAdj: e.m.extraAdj, contacts: e.m.contacts, end: e.rec[e.rec.length - 1].p, launched: e.launched };
  });
}

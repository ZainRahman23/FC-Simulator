// receive_turn11/tools/rt11_chrome_node.mjs — the Node side of rt11_chrome.cjs: the human-motion lab's evalCase (RECEIVE-TURN-1's chain, verbatim)
// and its bodyProbe (the HumanTurnBody posed at the listed times, the ball as the lab samples it, every joint hashed)
import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
import { prepareTurn, runTurn } from "../../receive_turn1/rt_sim.js"; import { DT } from "../../receive_turn1/rk_sim.js"; import { HumanTurnBody } from "../rt11_body.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url), { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")), X = loadTurn1();
const condFor = (c) => ({ theta: c.theta, v: c.v, lat: c.lat, family: c.family === "AUTO" ? undefined : c.family, foot: c.foot === "AUTO" ? undefined : c.foot, variant: c.variant === "AUTO" ? undefined : c.variant, prep: c.prep === "clean" ? undefined : +c.prep, pref: c.pref === "both" ? null : c.pref });
export async function run(cases, probeTs) {
  return cases.map(({ cond, bc, draw }) => {
    const c = Object.assign({ theta: 0, v: 12, lat: 0, family: "AUTO", foot: "AUTO", variant: "AUTO", prep: "clean", pref: "R" }, cond), P = prepareTurn(condFor(c)); if (P.A.none) return { none: true };
    const spec = draw.startsWith("seed") ? { seed: +draw.slice(4) } : { example: draw }, e = runTurn(P, bc, spec, { every: 1 }), IE = runTurn(P, 99, { example: "PERFECT" }, { every: 2 });
    let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
    mix(P.kc); for (const x of e.ex.v) mix(x); mix(e.m.tCont == null ? -1 : e.m.tCont); for (const x of e.rec[e.rec.length - 1].p) mix(x);
    const res = { hash: h.toString(16), fid: P.A.fid, F: P.A.F, surface: P.A.surface, kc: P.kc, v: e.ex.v, cls: e.m.cls, tCont: e.m.tCont, extraAdj: e.m.extraAdj, contacts: e.m.contacts, end: e.rec[e.rec.length - 1].p, launched: e.launched };
    // the lab's ballAt, verbatim
    const ballAt = (t) => { const k = Math.round(t / DT); if (k <= P.kc) { const s = P.inc.pred.P[Math.min(P.inc.pred.P.length - 1, Math.max(0, k))]; return { a: s.p, i: s.p }; } const i = k - P.kc, r = e.rec, ri = IE.rec, pick = (rec, j) => rec[Math.min(rec.length - 1, Math.max(0, Math.round(j / (rec[1].i - rec[0].i))))].p; return { a: pick(r, i), i: pick(ri, i) }; };
    const B = new HumanTurnBody(X.RUN1_V13, X.M4, X.skel, P, e), tc = P.kc * DT; let hb = 2166136261 >>> 0; const mixb = (x) => { const s = (+x).toFixed(7); for (let i = 0; i < s.length; i++) { hb ^= s.charCodeAt(i); hb = Math.imul(hb, 16777619) >>> 0; } };
    for (const t of probeTs) { const po = B.poseAt(tc + t, ballAt(tc + t).a); for (const k of Object.keys(po.J).sort()) for (const v of po.J[k].j) mixb(v); }
    return { sim: res, body: hb.toString(16) };
  });
}

// dribble13/tools/d13_funnel.mjs — THE PLANNING FUNNEL during held cuts, per foot and boot surface: how many candidate contacts survive each stage of
// makePlan — generated (contact geometry OK), the re-aim into the cut (switchCand: the post-cut aim, or a stage), the follow-through floor
// (followMinSpeed), the launch solve (a next window on the motion after the touch), the solved follow-through (caftFor), the other foot / planted
// leg (otherClear) — and which surface the committed touches finally used. Stage failures inside makePlan are also counted by its own rejection keys.
// usage: node d13_funnel.mjs SCENARIO seeds [ver d12] [prof HIGH]
import { makeSim, DT, CORES, PROFILES } from "./d13_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [id = "CUT60_RUN", seedsA = "8", ver = "d13", prof = "HIGH"] = process.argv.slice(2);
const P = CORES[ver].DribbleSim.prototype, W = {}, cnt = {}, inc = (k) => { cnt[k] = (cnt[k] || 0) + 1; };
const held = (S) => S.held && !S.held.released;
const wrap = (name, pre, post) => { const f = P[name]; W[name] = f; P[name] = function (...a) { const h = held(this), tag = h ? pre(a) : null; const r = f.apply(this, a); if (h && tag) post(tag, r, a); return r; }; };
wrap("contactGeom", (a) => a[1] + ":" + a[2], (t, r) => { if (r) inc("1 geom ok      " + t); });
wrap("switchCand", (a) => a[0].F + ":" + a[0].reg, (t, r) => inc((r ? "2 cut re-aim   " + r.F + ":" + r.reg + (r.stage != null ? " (stage)" : " (full)") : "2 cut re-aim ✗ " + t)));
wrap("followMinSpeed", (a) => a[0].F + ":" + a[0].reg + (a[0].release ? " cut" : " line"), (t, r) => inc(r == null ? "3 follow-min ✗ " + t : "3 follow-min   " + t));
wrap("solveLaunch", (a) => a[0].F + ":" + a[0].reg + (a[0].release ? " cut" : " line"), (t, r) => inc(r ? "4 solve ok     " + t : "4 solve ✗      " + t));
wrap("caftFor", (a) => a[2] + ":" + a[3].reg, (t, r) => inc(r ? "5 follow ok    " + t : "5 follow ✗     " + t));
wrap("otherClear", (a) => a[2] + ":" + a[3].reg, (t, r) => inc(r ? "6 other ok     " + t : "6 other ✗      " + t));
const used = {}, rejAll = {};
for (let sd = 1; sd <= +seedsA; sd++) {
  const S = makeSim(get(id), { ver, seed: sd, player: PROFILES[prof], opts: { record: false } });
  const mp = S.makePlan.bind(S); S.makePlan = (k) => { if (held(S)) { S.rej = {}; mp(k); for (const [kk, v] of Object.entries(S.rej)) if (typeof v === "number") rejAll[kk] = (rejAll[kk] || 0) + v; S.rej = null; } else mp(k); };
  S.run(); for (const T of S.touches) if (T.launched && T.t > 2.0) { const k = T.F + ":" + T.reg + (T.release ? " " + T.release : ""); used[k] = (used[k] || 0) + 1; }
}
console.log(`${id} · ${ver} · ${prof} · seeds 1–${seedsA} — held-cut planning funnel`);
for (const [k, v] of Object.entries(cnt).sort()) console.log("  " + k.padEnd(40), v);
console.log("makePlan rejection keys (held cut):", JSON.stringify(rejAll));
console.log("committed touches after 2.0 s:", JSON.stringify(used));

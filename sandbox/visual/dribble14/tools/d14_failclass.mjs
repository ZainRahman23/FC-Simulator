// dribble14/tools/d14_failclass.mjs — WHAT GOES WRONG FIRST in a cut: for each run of the cut scenarios, the first adverse event after the request —
// a stray contact (a foot that was not touching meets the ball), a same-foot re-contact, a cancelled launch, a dropped plan, a recovery touch, a hold
// released without a touch (timeout / not controlled), or LOOSE without any of these — and whether the turn was taken with the ball.
// usage: node d14_failclass.mjs "SC1,SC2" seeds [ver d12]
import { makeSim, DT } from "./d14_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [idsA = "CUT60_RUN,CUT60L_RUN,CUT90_RUN,CUT90L_RUN", nA = "8", ver = "d14"] = process.argv.slice(2), hist = {}, rows = [];
for (const id of idsA.split(",")) { const scn = get(id), cmd = scn.cmds.find((c) => c.turn != null && Math.abs(c.turn) > 8), tR = cmd.t, want = cmd.turn;
  for (let sd = 1; sd <= +nA; sd++) {
    const S = makeSim(scn, { ver, seed: sd }); const drops = []; const dp = S.dropAdj.bind(S); S.dropAdj = (F, sw) => { drops.push(S.k); return dp(F, sw); };
    S.run(); const ev = [];
    for (const c of S.contacts) if (c.own && c.t >= tR) { const T = S.touches.find((t) => t.launched && c.k > t.k && c.k - t.k <= 60 && c.part.endsWith("_" + t.F)); ev.push({ t: c.t, kind: c.striking ? (T ? "same-foot re-contact" : "striking contact") : (T && c.part.endsWith("_" + T.F) ? "same-foot re-contact" : "stray contact") }); }
    for (const T of S.touches) if (T.t >= tR && T.cancelled) ev.push({ t: T.t, kind: "cancelled: " + String(T.cancelled).split(":")[0].split(" ").slice(0, 2).join(" ") });
    for (const T of S.touches) if (T.t >= tR && T.launched && T.recovery) ev.push({ t: T.t, kind: "recovery touch" });
    for (const e of S.turnLog) if (e.kind === "release" && (e.by === "timeout" || e.by === "not-controlled")) ev.push({ t: e.t, kind: "hold released: " + e.by });
    const loose = S.ctrl.changes.find((c) => c.to === "LOOSE" && c.t >= tR); if (loose) ev.push({ t: loose.t + 1e-6, kind: "LOOSE" });
    ev.sort((a, b) => a.t - b.t); const rec = S.rec, last = rec[rec.length - 1], headErr = Math.abs(((S.A.psi * 180 / Math.PI - want) + 540) % 360 - 180);
    const rel = S.turnLog.filter((e) => e.kind === "release").pop(), taken = !!(rel && /^touch/.test(rel.by) && headErr < 20 && last.ctrl === "CONTROLLED");
    const first = ev.length ? ev[0].kind : "none"; const key = (taken ? "taken · " : "FAILED · ") + first; hist[key] = (hist[key] || 0) + 1;
    rows.push(`${id} s${sd} ${taken ? "taken " : "FAILED"} first: ${first}${ev.length ? " @+" + (ev[0].t - tR).toFixed(2) : ""}`); } }
for (const r of rows) console.log(r); console.log(JSON.stringify(Object.fromEntries(Object.entries(hist).sort((a, b) => b[1] - a[1])), null, 1));

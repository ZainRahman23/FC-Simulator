// adv4/tools/adv_measure.mjs — ADV-4: the four advanced families against the basic solutions, the same problem at every speed. The sandbox's
// right-footed player (S99 · D38 · A99-C · Agility B · D99 · BC99 · CARRY-B · CONTROLLED) runs straight in WALK / JOG / RUN / SPRINT, then
//   a TURN problem (CROQUETA · V-TURN · MATTHEWS): the stick to the exit angle and, per lane, the family requested · B4 alone (AUTO) · B4 with
//     the family withheld (BASIC — what the player without it does) · a named basic technique requested
//   a STOP-AND-GO problem: HESITATION (sprint → hesitation → sprint) and STOP (run → stop → new line); the BASIC lane is the ordinary input of
//     the same intention — the stick released, then pressed again (for STOP: released until the body is below 1 m/s) — and B4 alone is the
//     same input with the family available; the requested lane presses E with the stick toward the exit
// Per lane, over 4 stride phases: request → decisive contact · → USEFUL EXIT (v_run.js exitMetrics; for STOP-AND-GO the RELAUNCH: after the
// lowest speed, ≥ min(lowest + 2.5, 0.9 × entry) within 30° of the exit) · total · the lowest speed · the speed 1 s after the decisive contact ·
// control back · metres along the exit 2.5 s after the request · preparation (request → the technique's own window opening) · possession ·
// the posed body (normal / slow-motion visible)
//   node adv_measure.mjs [--fam CROQUETA,V_TURN,MATTHEWS,STOP_AND_GO] [--modes WALK,JOG,RUN,SPRINT] [--angles -90,-120] [--lanes V_TURN,AUTO] [--phases 4] [--json f]
import fs from "node:fs";
import { makeSim, DT, ENV } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { intentOf, META_BY_ID } from "../v_meta.js";
import { exitMetrics, CRUISE } from "../v_run.js";
import { measure } from "./v_extreme.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180, hyp = Math.hypot;
export const RUNUP = { WALK: 2.2, JOG: 2.4, RUN: 2.6, SPRINT: 4.5 };
// the families: the player-facing intent, what it is made of (withheld for the BASIC lane), the problems, the named basic lanes
export const FAMS = {
  CROQUETA: { intent: "CROQUETA", hold: ["LAT"], angles: [-25, -40, -55, 40], lanes: [-35, 35], basics: ["INSIDE_CUT", "OUTSIDE_REDIRECT"] },
  V_TURN: { intent: "V_TURN", hold: ["VTURN", "VTURN_B", "VPULL", "LDRAG", "PULLPUSH"], angles: [-60, -90, -120, -150], basics: ["INSIDE_CUT", "BRAKING_PIVOT", "BRAKING_TOUCH", "INSIDE_HOOK", "DRAG_BACK", "CRUYFF"] },
  MATTHEWS: { intent: "MATTHEWS", hold: ["MATTHEWS", "MATTHEWS_C"], angles: [30, 50, 70], basics: ["OUTSIDE_CUT", "OUTSIDE_REDIRECT"] },
  STOP_AND_GO: { intent: "STOP_AND_GO", hold: ["DEADEN", "HESITATE", "FAKESTOP"], kinds: [["HESITATION", 0], ["STOP", 0], ["STOP", 45]] },
};
const legacy = (id) => (META_BY_ID[id] ? id : { V_TURN: "V_PULL", STOP_AND_GO: "DEADEN_EXPLODE" }[id] || id);
export function mk(o = {}) { const sim = makeSim("TL", { layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot: o.pref || "R", style: "NEUTRAL", seed: 1, start: { P: [30, 34], h: 0 }, pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B", ballOn: true, croq: o.croq || null }); if (o.hold) sim.o.noFam = new Set(o.hold); return sim; }   // (croq: "CURRENT" — the croqueta before its body upgrade)
// one lane: lane = { req: intent id | null (AUTO), hold: [...] }, problem = { mode, ang } (turn) or { stop: "HESITATION" | "STOP", ang }
export function runLane(lane, prob, o = {}) { const sim = mk({ hold: lane.hold, croq: lane.croq, pref: lane.pref }), mode = prob.mode, R = (h, mm) => ({ h, mode: mm || mode, keys: 0 });
  const nU = Math.round((RUNUP[mode] + (o.phase || 0)) / DT); for (let k = 0; k < nU; k++) sim.step(R(k < 24 ? null : 0));
  const t0 = sim.t, v0 = sim.stateAt(t0).s, k0 = sim.k, c0 = sim.contacts.length, ex0 = sim.poss.log.length, hq = prob.ang * DEG, dur = o.dur || 3.4;
  if (lane.req) { const it = intentOf(legacy(lane.req)); if (it) sim.requestSkill(Object.assign({}, it, { sprint: prob.stop === "HESITATION" })); }
  // the stick: a turn problem holds the exit; STOP-AND-GO: the requested lane holds the exit (SPRINT for the hesitation); the input lanes release
  // (a LANE problem: the stick toward the side for 0.5 s, then straight on again — a lane change; STOP-AND-GO input lanes: released, then
  // pressed toward the exit — HESITATION after 0.30 s, STOP below 1 m/s, a FULL stop (stop → settle → go) below 0.3 m/s + 0.15 s)
  let released = !!prob.stop && !lane.req, tPress = null, tSlow = null;
  for (let k = 0; k < Math.round(dur / DT); k++) { const t = k * DT, s = sim.stateAt(sim.t).s;
    if (released && lane.full && s < 0.3 && tSlow == null) tSlow = t;
    if (released && ((prob.stop === "HESITATION" && t >= 0.30) || (prob.stop === "STOP" && !lane.full && s < 1.0) || (lane.full && tSlow != null && t >= tSlow + 0.15) || t > 2.4)) { released = false; tPress = t; }
    const hNow = prob.lane ? (t < 0.5 ? hq : 0) : hq;
    sim.step(released ? R(null, prob.stop ? "SPRINT" : mode) : R(hNow, prob.stop ? "SPRINT" : mode)); }
  const sk = (sim.log.skill || []).filter((x) => x.t >= t0 - 1e-9)[0] || null, X = exitMetrics(sim, t0, hq, prob.stop ? "SPRINT" : mode);
  const res = { lane: lane.name, mode, prob: prob.stop || (prob.lane ? "LANE" : "TURN"), ang: prob.ang, v0: +v0.toFixed(2), result: lane.req ? (sk ? sk.result : "PENDING") : "AUTO", played: X ? X.label : null, rej: sk && sk.result !== "PLAYED" ? Object.keys(sk.rej || {}).slice(0, 2) : null, tPress };
  if (X) { let tx = X.tExit != null ? X.dec.t + X.tExit : null, vMin = X.vMin, tMin = null;
    if (prob.stop) { vMin = Infinity; for (let t = t0; t <= sim.t - 1e-9; t += DT) { const st = sim.stateAt(t); if (st.s < vMin) { vMin = st.s; tMin = t; } }
      const thr = Math.min(4.0, 0.9 * v0); tx = null; for (let t = tMin; t <= sim.t - 1e-9; t += DT) { const st = sim.stateAt(t), dev = Math.abs(Math.atan2(Math.sin(st.h - hq), Math.cos(st.h - hq))); if (st.s >= thr && dev < 30 * DEG) { tx = t; break; } } }
    // (STOP-AND-GO: the speed 1 s after the LOWEST speed and the relaunch from it — the same moment for every lane; a turn: 1 s after the decisive contact)
    const A = X.A; Object.assign(res, { tDec: +X.tDec.toFixed(3), total: tx != null ? +(tx - t0).toFixed(3) : null, tExit: tx != null ? +(tx - X.dec.t).toFixed(3) : null, vMin: +vMin.toFixed(2), vC: +X.vC.toFixed(2),
      v1: +sim.stateAt(Math.min(sim.t, (prob.stop && tMin != null ? tMin : X.dec.t) + 1.0)).s.toFixed(2), tRel: prob.stop && tMin != null && tx != null ? +(tx - tMin).toFixed(3) : null, ctl: X.ctl != null ? +X.ctl.toFixed(3) : null, p25: +X.p25.toFixed(2), prep: A && A.tA != null ? +(A.tA - t0).toFixed(3) : null }); }
  // (the LANE problem: metres gained to the side and along the run 1.5 s after the request, the body's largest heading change on the way)
  if (prob.lane) { const P0 = sim.stateAt(t0).P, P1 = sim.stateAt(t0 + 1.5).P, h0 = sim.stateAt(t0).h, side = Math.sign(prob.ang); let dh = 0; for (let t = t0; t <= t0 + 1.5; t += 0.02) dh = Math.max(dh, Math.abs(Math.atan2(Math.sin(sim.stateAt(t).h - h0), Math.cos(sim.stateAt(t).h - h0))));
    const d = [P1[0] - P0[0], P1[1] - P0[1]]; res.lat = +((-d[0] * Math.sin(h0) + d[1] * Math.cos(h0)) * side).toFixed(2); res.fwd = +(d[0] * Math.cos(h0) + d[1] * Math.sin(h0)).toFixed(2); res.dh = +(dh / DEG).toFixed(0);
    const b = sim.ballTrack(t0 + 1.5).p, bd = [b[0] - P0[0], b[1] - P0[1]]; res.ballLat = +((-bd[0] * Math.sin(h0) + bd[1] * Math.cos(h0)) * side).toFixed(2); }
  let sep = 0; for (let t = t0; t <= sim.t; t += 0.05) { const st = sim.stateAt(t), b = sim.ballTrack(t).p; sep = Math.max(sep, hyp(b[0] - st.P[0], b[1] - st.P[1])); }
  const cs = sim.contacts.slice(c0); res.exits = sim.poss.log.slice(ex0).filter((e) => e.from === "CONTROLLED" && e.to === "FREE").length; res.missed = cs.filter((c) => c.missed).length; res.sep = +sep.toFixed(2);
  if (o.body !== false) { const m = measure(sim, k0 - 24, 0); res.body = m.N; res.bodyEv = m.F.filter((f) => f.lvl === "normal").map((f) => `${f.kind} ${f.depth || f.deg || f.cm || f.air || ""}`); }
  res.sim = sim; return res; }
export function lanesOf(fam) { const F = FAMS[fam], L = [{ name: fam, req: F.intent }, { name: F.kinds ? "AUTO (release → press)" : "AUTO", req: null }, { name: F.kinds ? "BASIC (release → press)" : "BASIC (B4 without it)", req: null, hold: F.hold }];
  if (F.kinds) L.push({ name: "STOP → SETTLE → GO", req: null, hold: F.hold, full: true });
  for (const b of F.basics || []) L.push({ name: b, req: b, hold: F.hold }); return L; }
export function problemsOf(fam, modes, angs = null) { const F = FAMS[fam], out = [], ok = (a) => !angs || angs.includes(a); if (F.kinds) { for (const [stop, ang] of F.kinds) for (const mode of (stop === "HESITATION" ? ["RUN", "SPRINT"] : ["JOG", "RUN", "SPRINT"])) if (modes.includes(mode) && ok(ang)) out.push({ stop, ang, mode }); return out; }
  for (const ang of F.angles) for (const mode of modes) if (ok(ang)) out.push({ mode, ang }); for (const ang of F.lanes || []) for (const mode of modes) if (!angs) out.push({ mode, ang, lane: true }); return out; }
export function avgLane(lane, prob, o = {}) { const N = o.phases || 4, rs = []; for (let i = 0; i < N; i++) { const r = runLane(lane, prob, Object.assign({}, o, { phase: i * 0.3 / N })); delete r.sim; rs.push(r); }
  const ok = rs.filter((r) => (r.tDec != null || r.lat != null) && (r.result === "PLAYED" || r.result === "AUTO")), mean = (k) => { const v = ok.filter((r) => r[k] != null); return v.length ? v.reduce((a, r) => a + r[k], 0) / v.length : null; };
  const played = {}; for (const r of rs) { const k = r.result === "PLAYED" || r.result === "AUTO" ? (r.played || "—").replace(/ \((R|L)\)$/, "") : `${r.result}→${(r.played || "—").replace(/ \((R|L)\)$/, "")}`; played[k] = (played[k] || 0) + 1; }
  return { lane: lane.name, prob, n: N, nOk: ok.length, played, tDec: mean("tDec"), tExit: mean("tExit"), total: mean("total"), vMin: mean("vMin"), vC: mean("vC"), v1: mean("v1"), ctl: mean("ctl"), p25: mean("p25"), prep: mean("prep"), tRel: mean("tRel"), lat: mean("lat"), fwd: mean("fwd"), dh: mean("dh"), ballLat: mean("ballLat"), tPress: mean("tPress"),
    exits: rs.reduce((a, r) => a + r.exits, 0), missed: rs.reduce((a, r) => a + r.missed, 0), bodyN: rs.reduce((a, r) => a + (r.body ? r.body.normal : 0), 0), bodyS: rs.reduce((a, r) => a + (r.body ? r.body.slow : 0), 0), bodyEv: rs.flatMap((r) => r.bodyEv || []), runs: rs.map((r) => ({ played: r.played, result: r.result, total: r.total, rej: r.rej })) }; }
const f2 = (x) => (x == null ? "  — " : x.toFixed(2)), f1 = (x) => (x == null ? " — " : x.toFixed(1));
export const fmt = (a) => `   ${a.lane.slice(0, 26).padEnd(26)} ${a.nOk}/${a.n} ${Object.entries(a.played).map(([k, v]) => `${k}×${v}`).join(", ").slice(0, 44).padEnd(44)} dec ${f2(a.tDec)} · exit +${f2(a.tExit)} · total ${f2(a.total)} · prep ${f2(a.prep)} · vMin ${f1(a.vMin)} · v+1s ${f1(a.v1)}${a.tRel != null ? ` · relaunch ${f2(a.tRel)}` : ""} · ctl +${f2(a.ctl)} · p25 ${f2(a.p25)}${a.lat != null ? ` · lane +${f2(a.lat)} m (ball ${f2(a.ballLat)}) fwd ${f2(a.fwd)} turn ${a.dh.toFixed(0)}°` : ""}${a.tPress != null ? ` · pressed @${f2(a.tPress)}` : ""} · exits ${a.exits} · missed ${a.missed} · body ${a.bodyN}/${a.bodyS}`;
if ((process.argv[1] || "").endsWith("adv_measure.mjs")) { const fams = opt("fam", "CROQUETA,V_TURN,MATTHEWS,STOP_AND_GO").split(","), modes = opt("modes", "WALK,JOG,RUN,SPRINT").split(","), N = +opt("phases", 4), out = [];
  const angs = opt("angles") ? opt("angles").split(",").map(Number) : null, only = opt("lanes") ? opt("lanes").split(",") : null;
  for (const fam of fams) for (const prob of problemsOf(fam, modes, angs)) { console.log(`■ ${fam} · ${prob.stop ? prob.stop + " → " : prob.lane ? "LANE CHANGE · " : ""}${prob.mode} · ${prob.ang}°`); for (const lane of lanesOf(fam)) { if (only && !only.some((x) => lane.name.startsWith(x))) continue; const a = avgLane(lane, prob, { phases: N }); out.push(Object.assign({ fam }, a)); console.log(fmt(a)); } }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

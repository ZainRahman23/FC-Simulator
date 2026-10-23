// cruyff_chop1/tools/cc_measure.mjs — CRUYFF + RONALDO CHOP FAMILY CLEANUP: the hooks against the elite solutions, the same problem at every
// speed. A right-footed sandbox player (S99 · D38 · A99-C · D99 · BC99 · CARRY-B · CONTROLLED) runs straight in WALK / JOG / RUN / SPRINT, then
// the stick goes to the problem's angle and the technique is requested (AUTO: no request — what B4 chooses). Per run:
//   tDec    request → the decisive contact (s)            prep   footfalls drawn between the request and the decisive contact
//   tExit   decisive → USEFUL EXIT: the body moving within 30° of the request at ≥ 70 % of the mode's cruising speed (≤ 3.5 m/s) (s)
//   total   request → useful exit                           vC     speed at the decisive contact · vMin the lowest speed request → exit
//   ctl     decisive → control returned (B5's release)      d1     metres made along the exit in the 1.0 s after the decisive contact
//   possession (CONTROLLED exits, missed contacts, the ball's separation) · the posed body (v_extreme's classes) over the clip
//   node cc_measure.mjs [--angle -120] [--techs INSIDE_HOOK,OUTSIDE_HOOK,CRUYFF,RONALDO_CHOP,AUTO] [--modes WALK,JOG,RUN,SPRINT] [--body 1] [--json f]
import fs from "node:fs";
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { intentOf } from "../v_meta.js";
import { measure } from "./v_extreme.mjs";
import { exitMetrics } from "../v_run.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180, hyp = Math.hypot;
export const CRUISE = { WALK: 1.5, JOG: 3.2, RUN: 5.3, FAST: 7.5, SPRINT: 9.4 }, RUNUP = { WALK: 2.2, JOG: 2.4, RUN: 2.6, FAST: 2.6, SPRINT: 4.5 };
const MODE_OF = (m) => (m === "FAST" ? "SPRINT" : m);   // (FAST: a run, then the sprint key 0.55 s before the request — ≈ 7.5 m/s and still accelerating)
export function mkPlayer(foot = "R", ballOff = false) { return makeSim("TL", Object.assign({ layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot, style: "NEUTRAL", seed: 1, start: { P: [30, 34], h: 0 }, pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B", ballOn: true }, ballOff ? { ballOn: false, carry: undefined } : {})); }
export function runOne(tech, mode, ang, o = {}) { const off = tech === "BODY", sim = mkPlayer(o.pref || "R", off), R = (h, mm) => ({ h, mode: mm || MODE_OF(mode), keys: 0 });
  if (o.noElite) for (const id of ["CRUYFF", "CHOP"]) sim.P.techMin[id] = 101;   // (the player who cannot access the elite solutions: Dribbling below their gate)
  const nU = Math.round(((o.runup || RUNUP[mode]) + (o.phase || 0)) / DT); for (let k = 0; k < nU; k++) sim.step(R(k < 24 ? null : 0, mode === "FAST" && k < nU - Math.round(0.55 / DT) ? "RUN" : null));
  const t0 = sim.t, v0 = sim.stateAt(t0).s, c0 = sim.contacts.length, ex0 = sim.poss.log.length, k0 = sim.k, hq = ang * DEG;
  if (tech !== "AUTO" && !off) sim.requestSkill(Object.assign({}, intentOf(tech), { foot: o.foot || null }));
  const dur = o.dur || 3.2; for (let k = 0; k < Math.round(dur / DT); k++) sim.step(R(hq));
  const sk = (sim.log.skill || []).filter((x) => x.t >= t0 - 1e-9)[0] || null;
  // the decisive contact: the requested technique's (its action's decisive contact), AUTO: the first technique / generic redirect B4 chose
  const acts = Object.values(sim.log.acts || {}).filter((a) => a.tSel >= t0 - 0.02).sort((a, b) => a.tSel - b.tSel);
  const cs = off ? [] : sim.contacts.slice(c0); let A = off ? { label: "BODY ONLY (ball off)", tRelease: null } : null, dec = off ? { t: t0, surface: "-", F: "-" } : null;
  if (!off) for (const a of acts) { if (!(a.tech || a.kind === "GENERIC")) continue; const d = cs.find((c) => c.actionId === a.id && (c.decisive || (a.kind === "GENERIC" && c.fam === a.fam))); if (d) { A = a; dec = d; break; } }
  const res = { tech, mode, ang, v0: +v0.toFixed(2), result: tech === "AUTO" ? "AUTO" : off ? "BODY" : sk ? sk.result : "PENDING", played: A ? A.label + (A.m ? (A.m > 0 ? " (R)" : " (L)") : "") : null, alt: sk && sk.result !== "PLAYED" ? sk.alt : null,
    rej: sk && sk.result !== "PLAYED" ? Object.keys(sk.rej || {}).slice(0, 2) : null };
  if (dec) { const td = dec.t; let vMin, tx, d1, ctl;
    if (off) { { const Q0 = sim.stateAt(t0).P, Q1 = sim.stateAt(Math.min(sim.t, t0 + 2.5)).P; res.p25 = +((Q1[0] - Q0[0]) * Math.cos(hq) + (Q1[1] - Q0[1]) * Math.sin(hq)).toFixed(2); } const cr = Math.min(3.5, 0.7 * CRUISE[mode]); tx = null; vMin = Infinity; for (let t = t0; t <= sim.t - 1e-9; t += DT) { const s = sim.stateAt(t); if (tx == null) vMin = Math.min(vMin, s.s); if (t > td && tx == null) { const along = s.V[0] * Math.cos(hq) + s.V[1] * Math.sin(hq), dev = Math.abs(Math.atan2(Math.sin(s.h - hq), Math.cos(s.h - hq))); if (s.s > 0.3 && dev < 30 * DEG && along >= cr) tx = t; } }
      const P0 = sim.stateAt(td).P, P1 = sim.stateAt(Math.min(sim.t, td + 1.0)).P; d1 = (P1[0] - P0[0]) * Math.cos(hq) + (P1[1] - P0[1]) * Math.sin(hq); ctl = null; }
    else { const X = exitMetrics(sim, t0, hq, MODE_OF(mode) === "SPRINT" && mode === "FAST" ? "SPRINT" : mode); vMin = X.vMin; tx = X.tExit != null ? td + X.tExit : null; d1 = X.d1; ctl = X.ctl; res.p25 = +X.p25.toFixed(2); }   // (v_run.js exitMetrics: the Lab's own definition)
    let aPk = 0; for (let t = t0; t + 0.05 <= (tx != null ? tx : sim.t) + 1e-9; t += DT) { const a = sim.stateAt(t).V, b = sim.stateAt(t + 0.05).V; aPk = Math.max(aPk, hyp(b[0] - a[0], b[1] - a[1]) / 0.05); }
    // footfalls drawn between the request and the decisive contact (the posed body: a foot going from swing to planted)
    let prep = null; if (o.prep !== false) { const { PlayBody } = await_body(); const body = new PlayBody(ENV2(), sim); let prev = null; prep = 0;
      for (let k = k0; k <= Math.round(td / DT); k++) { const p = body.pose(k * DT); if (prev) for (const X of ["R", "L"]) if (p.feet[X].planted && !prev[X]) prep++; prev = { R: p.feet.R.planted, L: p.feet.L.planted }; } }
    Object.assign(res, { tDec: +(td - t0).toFixed(3), tExit: tx != null ? +(tx - td).toFixed(3) : null, total: tx != null ? +(tx - t0).toFixed(3) : null, vC: +sim.stateAt(td).s.toFixed(2), vMin: +vMin.toFixed(2),
      ctl: ctl != null ? +ctl.toFixed(3) : null, aPk: +aPk.toFixed(1), d1: +d1.toFixed(2), prep, surface: dec.surface, foot: dec.F }); }
  let sep = 0; for (let t = t0; t <= sim.t; t += 0.05) { const s = sim.stateAt(t), b = sim.ballTrack(t).p; sep = Math.max(sep, hyp(b[0] - s.P[0], b[1] - s.P[1])); }
  res.exits = off ? 0 : sim.poss.log.slice(ex0).filter((e) => e.from === "CONTROLLED" && e.to === "FREE").length; res.missed = cs.filter((c) => c.missed).length; res.sep = +sep.toFixed(2);
  if (o.body && !off) { const m = measure(sim, k0 - 24, 0); res.body = m.N; res.bodyEv = m.F.filter((f) => f.lvl === "normal").map((f) => `${f.kind} ${f.depth || f.deg || f.cm || f.air || ""}@${(f.t - 0.1).toFixed(2)}`); }
  res.sim = sim; return res; }
// (the posed body, loaded lazily: only for the footfall count and the body classes)
import { PlayBody as _PB } from "../u_body.js";
import { ENV } from "./u_env.mjs";
const _env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
function await_body() { return { PlayBody: _PB }; }
function ENV2() { return _env; }
export const fmt = (r) => `${r.tech.padEnd(13)} ${r.mode.padEnd(6)} ${String(r.ang).padStart(5)}° v${r.v0.toFixed(1).padStart(4)} ${(r.result || "").padEnd(9)} ${(r.played || "—").padEnd(28)}` +
  (r.tDec != null ? ` dec ${r.tDec.toFixed(2)} · exit +${r.tExit != null ? r.tExit.toFixed(2) : " —  "} · total ${r.total != null ? r.total.toFixed(2) : " —  "} · prep ${r.prep} · vC ${r.vC.toFixed(1)} · vMin ${r.vMin.toFixed(1)} · ctl +${r.ctl != null ? r.ctl.toFixed(2) : "?"} · d1 ${r.d1.toFixed(2)} · aPk ${r.aPk}` : ` (${(r.rej || []).join("; ").slice(0, 60)} → ${r.alt || ""})`) +
  ` · exits ${r.exits} · missed ${r.missed} · sep ${r.sep}` + (r.body ? ` · body ${r.body.normal}/${r.body.slow}${r.bodyEv.length ? " [" + r.bodyEv.join(", ") + "]" : ""}` : "");
// the phase-averaged row: n runs at 4 gait phases (run-up + 0 / 0.075 / 0.15 / 0.225 s), means over the PLAYED ones
export function avgRow(tech, mode, ang, o = {}) { const N = o.phases || 4, rs = [];
  for (let i = 0; i < N; i++) { const r = tech === "AUTO_NOELITE" ? Object.assign(runOne("AUTO", mode, ang, Object.assign({}, o, { noElite: true, phase: i * 0.3 / N })), { tech: "AUTO_NOELITE" }) : runOne(tech, mode, ang, Object.assign({}, o, { phase: i * 0.3 / N })); delete r.sim; rs.push(r); }
  const ok = rs.filter((r) => r.tDec != null && (r.result === "PLAYED" || r.result === "AUTO" || r.result === "BODY")), mean = (k) => (ok.filter((r) => r[k] != null).length ? ok.filter((r) => r[k] != null).reduce((a, r) => a + r[k], 0) / ok.filter((r) => r[k] != null).length : null);
  const played = {}; for (const r of rs) { const k = r.result === "PLAYED" || r.result === "AUTO" || r.result === "BODY" ? (r.played || "—").replace(/ \((R|L)\)$/, "") : `${r.result}→${(r.played || "—").replace(/ \((R|L)\)$/, "")}`; played[k] = (played[k] || 0) + 1; }
  return { tech, mode, ang, n: rs.length, nOk: ok.length, played, tDec: mean("tDec"), tExit: mean("tExit"), total: mean("total"), prep: mean("prep"), vC: mean("vC"), vMin: mean("vMin"), ctl: mean("ctl"), d1: mean("d1"), p25: mean("p25"), aPk: ok.length ? Math.max(...ok.map((r) => r.aPk || 0)) : null,
    v0: mean("v0") ?? rs[0].v0, exits: rs.reduce((a, r) => a + r.exits, 0), missed: rs.reduce((a, r) => a + r.missed, 0), bodyN: rs.reduce((a, r) => a + (r.body ? r.body.normal : 0), 0), bodyS: rs.reduce((a, r) => a + (r.body ? r.body.slow : 0), 0), bodyEv: rs.flatMap((r) => r.bodyEv || []), runs: rs }; }
const f2 = (x) => (x == null ? "  — " : x.toFixed(2));
export const fmtAvg = (a) => `${a.tech.padEnd(13)} ${a.mode.padEnd(6)} ${String(a.ang).padStart(5)}° ${String(a.nOk).padStart(1)}/${a.n} ${Object.entries(a.played).map(([k, v]) => `${k}×${v}`).join(", ").slice(0, 46).padEnd(46)} dec ${f2(a.tDec)} · exit +${f2(a.tExit)} · total ${f2(a.total)} · prep ${a.prep == null ? " —" : a.prep.toFixed(1)} · vC ${a.vC == null ? " — " : a.vC.toFixed(1)} · vMin ${a.vMin == null ? " — " : a.vMin.toFixed(1)} · ctl +${f2(a.ctl)} · d1 ${f2(a.d1)} · p25 ${f2(a.p25)} · aPk ${a.aPk == null ? "—" : a.aPk.toFixed(0)} · exits ${a.exits} · missed ${a.missed} · body ${a.bodyN}/${a.bodyS}`;
if ((process.argv[1] || "").endsWith("cc_measure.mjs")) { const techs = opt("techs", "BODY,INSIDE_HOOK,OUTSIDE_HOOK,CRUYFF,RONALDO_CHOP,AUTO,AUTO_NOELITE").split(","), modes = opt("modes", "WALK,JOG,RUN,FAST,SPRINT").split(","), angs = opt("angle", "-120").split(",").map(Number), body = opt("body", "1") === "1", N = +opt("phases", 4), out = [];
  for (const ang of angs) for (const mode of modes) { for (const tech of techs) { const a = avgRow(tech, mode, ang, { body, phases: N, prep: opt("prep", "1") === "1" }); out.push(a); console.log(fmtAvg(a)); } console.log(""); }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

// ═══ vocab1/v_run.js — DRIBBLING VOCAB-1: run one curated case (v_cases.js) — THE SAME CODE in the Dribbling Lab (browser) and in node
// (tools/v_cases_run.mjs): exact initial conditions, the run-up, the stick timeline, the manual intents at their ticks — deterministic ════════
import { intentOf, META_BY_ID } from "./v_meta.js";
import { stickAt } from "./v_cases.js";
const DT = 1 / 240, DEG = Math.PI / 180;
// the sandbox's player (S99 · D38 · A99-C · Agility scale B below 99 · D99 · BC99 · CARRY-B · CONTROLLED · EXPANDED); mirror: the left-footed twin
export function caseOpts(c, mirror = false, extra = {}) { const pref = c.pref || "R", foot = mirror ? (pref === "R" ? "L" : "R") : pref;
  return Object.assign({ layers: null, attrs: { bc: 99, dri: 99, agi: 99 }, foot, style: "NEUTRAL", seed: 1, start: { P: [30, 34], h: 0 }, pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B", ballOn: true }, c.simOpts || {}, extra); }   // (ADV-4: c.simOpts — e.g. croq: "CURRENT", the croqueta before its body upgrade)
// step the case through sim (built by the caller with caseOpts); returns { t0, clip: [a, b] }
export function runCaseOn(sim, c, mirror = false, onTick = null) { const s = mirror ? -1 : 1, R = (h, mode) => ({ h, mode, keys: 0 });
  // (CRUYFF-CHOP-1: a player who cannot access the elite solutions — the Cruyff and the chop gated off, as a low Dribbling rating would)
  if (c.noElite) for (const id of ["CRUYFF", "CHOP"]) sim.P.techMin[id] = 101;
  // (ADV-4: the basic solution — the advanced families withheld from B4 (template ids and B4's one-contact families))
  if (c.noFam) sim.o.noFam = new Set(c.noFam);
  for (let k = 0; k < Math.round(c.runup / DT); k++) { sim.step(R(k < 24 ? null : 0, c.mode)); if (onTick) onTick(sim); }
  const t0 = sim.t, n = Math.round(c.dur / DT), I = (c.intents || []).map((x) => ({ k: Math.round(x.t / DT), x }));
  // (a case with a THREAT: the defender marker's point is the harness's threat from t = 0)
  if (c.threat && c.def) { const st = sim.stateAt(sim.t), a = c.def[0], l = s * c.def[1]; sim.setThreat({ P: [st.P[0] + a * Math.cos(st.h) - l * Math.sin(st.h), st.P[1] + a * Math.sin(st.h) + l * Math.cos(st.h)] }); }
  for (let k = 0; k < n; k++) { const t = k * DT;
    for (const q of I) if (q.k === k) { const it = intentOf(q.x.id); if (it) { const foot = q.x.foot ? (mirror ? (q.x.foot === "R" ? "L" : "R") : q.x.foot) : null; sim.requestSkill(Object.assign({}, it, { foot, sprint: !!q.x.sprint })); } }
    const st = stickAt(c, t); sim.step(R(st.ang == null ? null : s * st.ang * DEG, st.mode)); if (onTick) onTick(sim); }
  return { t0, clip: [Math.max(0, t0 - (c.pre || 1.0)), sim.t] }; }
// what happened, from the simulation's own record: each intent's result (PLAYED / REJECTED / CANCELLED + the reasons + the alternative), the
// actions, the contacts, the technique's phases (preparation → commitment → decisive → control returned → the next action), possession
export function summarize(sim, t0) {
  const acts = Object.values(sim.log.acts || {}).filter((a) => a.tSel >= t0 - 0.05).sort((a, b) => a.tSel - b.tSel), techs = acts.filter((a) => a.tech || a.kind === "GENERIC");
  const contacts = sim.contacts.filter((c) => c.t >= t0 - 0.3), skills = (sim.log.skill || []).filter((x) => x.t >= t0 - 0.05);
  const phases = techs.map((a) => { const dec = contacts.find((c) => c.actionId === a.id && (c.decisive || (a.kind === "GENERIC" && c.fam === a.fam)));
    const next = acts.find((b) => b.tSel > (dec ? dec.t : a.tC) + 1e-6 && b.id !== a.id);
    return { label: a.label + (a.m ? (a.m > 0 ? " (R)" : " (L)") : a.F ? ` (${a.F})` : ""), tech: a.tech || a.fam, tSel: a.tSel - t0, tPrep: a.tA != null ? a.tA - t0 : a.tPrep != null ? a.tPrep - t0 : null, tCommit: a.tCommit != null ? a.tCommit - t0 : null,
      tDecisive: dec ? dec.t - t0 : null, decisiveSurface: dec ? dec.surface : null, tControl: a.tRelease != null ? a.tRelease - t0 : dec ? dec.t + 0.06 - t0 : null, tNext: next ? next.tSel - t0 : null, next: next ? next.label : null }; });
  let sepMax = 0; for (let t = t0; t <= sim.t; t += 0.05) { const st = sim.stateAt(t), b = sim.ballTrack(t).p; sepMax = Math.max(sepMax, Math.hypot(b[0] - st.P[0], b[1] - st.P[1])); }
  const exits = (sim.poss && sim.poss.log ? sim.poss.log : []).filter((e) => e.from === "CONTROLLED" && e.to === "FREE" && e.t >= t0 - 1e-9).map((e) => e.why);
  return { skills: skills.map((x) => ({ intent: x.intent, result: x.result, played: x.played, alt: x.alt, rej: x.rej, t: x.t - t0, tPlayed: x.tPlayed != null ? x.tPlayed - t0 : null })), phases,
    contacts: contacts.map((c) => ({ t: +(c.t - t0).toFixed(3), F: c.F, surface: c.surface, role: c.role, missed: !!c.missed })), missed: contacts.filter((c) => c.missed).length, sepMax, exits, feints: (sim.log.feints || []).filter((f) => f.t >= t0 - 0.05).map((f) => Object.assign({}, f, { t: f.t - t0 })) }; }
// ── CRUYFF-CHOP-1: THE EXIT METRICS (the same definition in the Lab's COMPARE view and tools/cc_measure.mjs): request → the decisive contact
// (the first technique or one-contact redirect after the request) → the USEFUL EXIT — the body moving within 30° of the request at ≥ 70 % of
// the mode's cruising speed (≤ 3.5 m/s) — the lowest speed on the way (momentum kept), the metres made along the exit 1 s after the contact
export const CRUISE = { WALK: 1.5, JOG: 3.2, RUN: 5.3, SPRINT: 9.4 };
// (ADV-4: + prep — the request → the technique's own window opening; v1 — the speed 1 s after the decisive contact (the exit speed); STOP-AND-GO
// (o.stop): the useful exit is the RELAUNCH — after the lowest speed, ≥ min(4.0, 0.9 × the entry speed) within 30° of the exit — and v1 is
// taken 1 s after that lowest speed: the same moment for every lane, whatever touched the ball)
export function exitMetrics(sim, t0, hq, mode, acts0 = null, o = {}) { const DT_ = 1 / 240, acts = (acts0 || Object.values(sim.log.acts || {})).filter((a) => a.tSel >= t0 - 0.02).sort((a, b) => a.tSel - b.tSel), cs = sim.contacts.filter((c) => c.t >= t0 - 0.02);
  let A = null, dec = null; for (const a of acts) { if (!(a.tech || a.kind === "GENERIC")) continue; const d = cs.find((c) => c.actionId === a.id && (c.decisive || (a.kind === "GENERIC" && c.fam === a.fam))); if (d) { A = a; dec = d; break; } }
  // (no technique and no one-contact redirect: the CARRY solved it — a controlled arc; measured from the request itself)
  if (!dec) { A = { label: "CARRY (a controlled arc)", m: 0, tRelease: null }; dec = { t: t0 }; } const td = dec.t, cr = Math.min(3.5, 0.7 * (CRUISE[mode] || 5.3)); let tx = null, vMin = Infinity;
  for (let t = t0; t <= sim.t - 1e-9; t += DT_) { const st = sim.stateAt(t); if (tx == null) vMin = Math.min(vMin, st.s);
    if (t > td && tx == null) { const along = st.V[0] * Math.cos(hq) + st.V[1] * Math.sin(hq), dev = Math.abs(Math.atan2(Math.sin(st.h - hq), Math.cos(st.h - hq))); if (st.s > 0.3 && dev < 30 * DEG && along >= cr) tx = t; } }
  let tMin = null, v1 = sim.stateAt(Math.min(sim.t, td + 1.0)).s;
  if (o.stop) { const v0 = sim.stateAt(t0).s, thr = Math.min(4.0, 0.9 * v0); vMin = Infinity; for (let t = t0; t <= Math.min(sim.t, t0 + 2.5) - 1e-9; t += DT_) { const st = sim.stateAt(t); if (st.s < vMin) { vMin = st.s; tMin = t; } }
    tx = null; for (let t = tMin; t <= sim.t - 1e-9; t += DT_) { const st = sim.stateAt(t), dev = Math.abs(Math.atan2(Math.sin(st.h - hq), Math.cos(st.h - hq))); if (st.s >= thr && dev < 30 * DEG) { tx = t; break; } } v1 = sim.stateAt(Math.min(sim.t, tMin + 1.0)).s; }
  const P0 = sim.stateAt(td).P, P1 = sim.stateAt(Math.min(sim.t, td + 1.0)).P;
  return { prep: A.tA != null ? A.tA - t0 : null, v1, tMin: tMin != null ? tMin - t0 : null, label: A.label + (A.m ? (A.m > 0 ? " (R)" : " (L)") : ""), A, dec, tDec: td - t0, tExit: tx != null ? tx - td : null, total: tx != null ? tx - t0 : null, vC: sim.stateAt(td).s, vMin, ctl: A.tRelease != null ? A.tRelease - td : null,
    d1: (P1[0] - P0[0]) * Math.cos(hq) + (P1[1] - P0[1]) * Math.sin(hq), p25: (() => { const Q0 = sim.stateAt(t0).P, Q1 = sim.stateAt(Math.min(sim.t, t0 + 2.5)).P; return (Q1[0] - Q0[0]) * Math.cos(hq) + (Q1[1] - Q0[1]) * Math.sin(hq); })() }; }   // (p15 → p25: metres made along the exit 2.5 s after the REQUEST, from where it was made — the turn's whole cost, its width included)
export { META_BY_ID };

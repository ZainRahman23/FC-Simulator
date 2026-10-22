// ═══ vocab1/v_run.js — DRIBBLING VOCAB-1: run one curated case (v_cases.js) — THE SAME CODE in the Dribbling Lab (browser) and in node
// (tools/v_cases_run.mjs): exact initial conditions, the run-up, the stick timeline, the manual intents at their ticks — deterministic ════════
import { intentOf, META_BY_ID } from "./v_meta.js";
import { stickAt } from "./v_cases.js";
const DT = 1 / 240, DEG = Math.PI / 180;
// the sandbox's player (S99 · D38 · A99-C · Agility scale B below 99 · D99 · BC99 · CARRY-B · CONTROLLED · EXPANDED); mirror: the left-footed twin
export function caseOpts(c, mirror = false, extra = {}) { const pref = c.pref || "R", foot = mirror ? (pref === "R" ? "L" : "R") : pref;
  return Object.assign({ layers: null, attrs: { bc: 99, dri: 99, agi: 99 }, foot, style: "NEUTRAL", seed: 1, start: { P: [30, 34], h: 0 }, pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B", ballOn: true }, extra); }
// step the case through sim (built by the caller with caseOpts); returns { t0, clip: [a, b] }
export function runCaseOn(sim, c, mirror = false, onTick = null) { const s = mirror ? -1 : 1, R = (h, mode) => ({ h, mode, keys: 0 });
  for (let k = 0; k < Math.round(c.runup / DT); k++) { sim.step(R(k < 24 ? null : 0, c.mode)); if (onTick) onTick(sim); }
  const t0 = sim.t, n = Math.round(c.dur / DT), I = (c.intents || []).map((x) => ({ k: Math.round(x.t / DT), x }));
  for (let k = 0; k < n; k++) { const t = k * DT;
    for (const q of I) if (q.k === k) { const it = intentOf(q.x.id); if (it) { const foot = q.x.foot ? (mirror ? (q.x.foot === "R" ? "L" : "R") : q.x.foot) : null; sim.requestSkill(Object.assign({}, it, { foot })); } }
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
export { META_BY_ID };

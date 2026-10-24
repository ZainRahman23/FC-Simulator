// ═══ lsi1/lsr_summary.js — LEFT-STICK INPUT LAB V1: the per-attempt SUMMARY and the per-label DESCRIPTIVE STATISTICS ═════════════════════════════
// Pure (browser and node), from a recorded attempt (lsr_schema.js). DIAGNOSTICS, NOT THRESHOLDS: descriptive values of what the thumb did and the
// state the footballer was in. The ANCHOR is the instant the state is read at ("the input intent moment"): the owner's own mark when set, else the
// sample of the attempt's largest 150 ms direction change; other anchors can be chosen (ANCHORS) — none of them is a detector.
import { col, rowOf } from "./lsr_schema.js";
import { DT, SUPPORT, MODES } from "./lsr_state.js";
export const ANCHORS = { auto: "owner mark, else the largest 150 ms change", mark: "the owner's intent mark", d150: "the largest 150 ms direction change", omega: "the peak angular velocity",
  dzexit: "the first time the stick left the deadzone", release: "the sharpest magnitude release", start: "the recording's start (START)" };
const absMaxIdx = (A) => { let bi = -1, bv = -1; A.forEach((v, i) => { if (v != null && Math.abs(v) > bv) { bv = Math.abs(v); bi = i; } }); return bi; };
// the frame index → its simulation time (the first tick the sample was applied to)
export const frameT = (att, i) => att.frames.data.k[i] * DT;
export function anchorOf(att, kind = "auto") {
  const D = att.derived, n = D.n, Fk = att.frames.data.k; if (!n) return { kind, t: att.capture.t0, i: -1 };
  const at = (i, k) => (i >= 0 ? { kind: k, t: Fk[i] * DT, i } : null);
  if ((kind === "auto" || kind === "mark") && att.owner && att.owner.mark != null) { const t = att.owner.mark; let i = 0; while (i < n - 1 && Fk[i + 1] * DT <= t + 1e-9) i++; return { kind: "mark", t, i }; }
  if (kind === "start") { const t = att.capture.tStart; let i = 0; while (i < n - 1 && Fk[i + 1] * DT <= t + 1e-9) i++; return { kind, t, i }; }
  if (kind === "omega") return at(absMaxIdx(col(D, "om")), kind) || at(0, kind);
  if (kind === "dzexit") { const e = (att.stickEvents || []).find((x) => x.kind === "dz_exit"); return e ? { kind, t: e.tSim, i: e.i } : at(0, kind); }
  if (kind === "release") { const R = col(D, "rd"); let bi = -1, bv = 0; R.forEach((v, i) => { if (v != null && v < bv) { bv = v; bi = i; } }); return at(bi, kind) || at(0, kind); }
  return at(absMaxIdx(col(D, "d150")), kind === "auto" ? "d150" : kind) || at(0, kind);
}
// the state row at (or just before) time t
// the state row at (or just before) time t — or, with `after`, at or just after it (the anchor: the row that already carries the anchor frame's
// request; rows are every 2 ticks, a frame's input starts at any tick)
export function stateAt(att, t, after = false) { const T = col(att.state, "t"); if (!T.length) return null; let lo = 0, hi = T.length - 1; if (t <= T[0]) return rowOf(att.state, 0); if (t >= T[hi]) return rowOf(att.state, hi);
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t + 1e-9) lo = m; else hi = m; } return rowOf(att.state, after && T[lo] < t - 1e-9 ? hi : lo); }
const dictOf = (att, k, i) => (i == null ? null : att.dict && att.dict[k] ? att.dict[k][i] : i);
export function summarize(att, anchorKind = "auto") {
  const D = att.derived, th = col(D, "th"), r = col(D, "r"), m = col(D, "m"), dth = col(D, "dth"), om = col(D, "om"), Fk = att.frames.data.k, ev = att.stickEvents || [];
  const A = anchorOf(att, anchorKind), sA = stateAt(att, A.t, true), s0 = att.state.n ? rowOf(att.state, 0) : null, tl = att.timeline || [];
  const iv = th.findIndex((v) => v != null), big = (k) => { const X = col(D, k), i = absMaxIdx(X); return i >= 0 ? { v: X[i], t: Fk[i] * DT } : { v: null, t: null }; };
  const after = (f) => tl.find((e) => e.t >= A.t - 1e-9 && f(e)), firstAct = after((e) => e.kind === "select" || (e.kind === "action" && e.akind !== "CARRY")), firstC = after((e) => e.kind === "contact");
  const nextTD = sA && sA.nextTD != null ? sA.nextTD - A.t : null, nextC = sA && sA.nextC != null ? sA.nextC - A.t : null, peak = big("om");
  const req = tl.filter((e) => e.kind === "request"), autoVocab = tl.filter((e) => (e.kind === "select" || e.kind === "action") && /BFEINT|CROQ_LW|BODY FEINT|CROQUETA/i.test((e.tech || "") + " " + (e.label || ""))).filter((e) => !req.some((q) => q.t <= e.t + 1e-9));
  return { id: att.id, label: att.label, source: att.input.source, duration: att.capture.t1 - att.capture.t0, anchor: A,
    startDir: iv >= 0 ? th[iv] : null, startDirRelFacing: (() => { const s = att.state.n ? stateFirst(att, (x) => x.reqH != null) : null; return s ? s.relFacing : null; })(),
    maxR: r.length ? Math.max(...r) : null, maxM: m.length ? Math.max(...m) : null, travel: dth.reduce((a, v) => a + (v != null ? Math.abs(v) : 0), 0),
    d50: big("d50"), d100: big("d100"), d150: big("d150"), peakOm: peak,
    crossings: ev.filter((e) => e.kind === "centre_cross").length, dzEntries: ev.filter((e) => e.kind === "dz_enter").length, reversals: ev.filter((e) => e.kind === "reversal").length, largeTurns: ev.filter((e) => e.kind === "large_turn").length,
    speed0: s0 ? s0.s : null, speedA: sA ? sA.s : null, modeA: sA && sA.mode >= 0 ? MODES[sA.mode] : null, turnA: sA ? sA.turn : null,
    ballSideA: sA ? (sA.bLat >= 0 ? "R" : "L") : null, ballLatA: sA ? sA.bLat : null, ballFwdA: sA ? sA.bFwd : null,
    sup0: s0 ? SUPPORT[s0.sup] : null, supA: sA ? SUPPORT[sA.sup] : null, stepPhaseA: sA ? sA.stepPhase : null,
    nextTDA: nextTD, nextTDFA: sA ? dictOf(att, "F", sA.nextTDF) : null, nextCA: nextC, nextCFA: sA ? dictOf(att, "F", sA.techF) : null,
    actA: sA ? dictOf(att, "act", sA.act) : null, committedA: sA ? !!sA.committed : null,
    firstAction: firstAct ? { label: firstAct.label, dt: firstAct.t - A.t } : null, firstContact: firstC ? { F: firstC.F, dt: firstC.t - A.t, role: firstC.role } : null,
    lostControl: tl.some((e) => e.kind === "poss" && e.to === "FREE" && e.t > att.capture.t0), explicitRequests: req.length, autoVocab: autoVocab.length };
}
function stateFirst(att, f) { for (let i = 0; i < att.state.n; i++) { const x = rowOf(att.state, i); if (f(x)) return x; } return null; }
// the table's columns: [key, header, unit, getter, decimals]
export const SUMMARY_COLUMNS = [
  ["duration", "dur", "s", (s) => s.duration, 2], ["startDir", "start dir", "°", (s) => s.startDir, 0], ["maxR", "max |r|", "", (s) => s.maxR, 2], ["travel", "ang. travel", "°", (s) => s.travel, 0],
  ["d50", "max Δ50", "°", (s) => s.d50.v, 0], ["d100", "max Δ100", "°", (s) => s.d100.v, 0], ["d150", "max Δ150", "°", (s) => s.d150.v, 0], ["peakOm", "peak ω", "°/s", (s) => s.peakOm.v, 0],
  ["crossings", "centre ×", "", (s) => s.crossings, 0], ["speed0", "v start", "m/s", (s) => s.speed0, 2], ["speedA", "v @anchor", "m/s", (s) => s.speedA, 2], ["turnA", "turn @A", "°", (s) => s.turnA, 0],
  ["ballSideA", "ball", "", (s) => s.ballSideA, null], ["sup0", "sup start", "", (s) => s.sup0, null], ["supA", "sup @A", "", (s) => s.supA, null], ["stepPhaseA", "step φ @A", "", (s) => s.stepPhaseA, 2],
  ["nextTDA", "→ next TD", "s", (s) => s.nextTDA, 3], ["nextCA", "→ next touch", "s", (s) => s.nextCA, 3], ["firstAction", "→ 1st action", "s", (s) => (s.firstAction ? s.firstAction.dt : null), 2]];
const quant = (S, q) => { const i = (S.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return S[lo] + (S[hi] - S[lo]) * (i - lo); };
export function describe(values) { const V = values.filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b); if (!V.length) return null; const mean = V.reduce((a, b) => a + b, 0) / V.length;
  return { n: V.length, min: V[0], q25: quant(V, 0.25), median: quant(V, 0.5), q75: quant(V, 0.75), max: V[V.length - 1], mean, sd: V.length > 1 ? Math.sqrt(V.reduce((a, b) => a + (b - mean) ** 2, 0) / (V.length - 1)) : 0 }; }
// per label: every numeric column described, the categorical ones counted
export function labelStats(atts, anchorKind = "auto") { const by = {}; for (const a of atts) (by[a.label] = by[a.label] || []).push(summarize(a, anchorKind)); const out = {};
  for (const [lab, S] of Object.entries(by)) { const o = { n: S.length, num: {}, cat: {} };
    for (const [k, , , g, d] of SUMMARY_COLUMNS) { if (d == null) { const c = {}; for (const s of S) { const v = g(s) ?? "—"; c[v] = (c[v] || 0) + 1; } o.cat[k] = c; } else o.num[k] = describe(S.map(g)); }
    out[lab] = o; } return out; }

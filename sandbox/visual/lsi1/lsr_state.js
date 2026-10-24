// ═══ lsi1/lsr_state.js — LEFT-STICK INPUT LAB V1: THE FOOTBALLER'S PHYSICAL STATE, read from the canonical simulation's own record ═══════════════
// Pure reader (browser and node): given the canonical sim (vocab2 ControlledSim — in the lab it lives in the sandbox's frame; in node it is
// re-simulated from the recording), sample its state over a window of ticks. It only CALLS the sim's read accessors on its history (planAt,
// stateAt, ballTrack, the plans' stances / contacts / action, the logs) — it never steps, re-plans or writes anything, and the sim never reads
// it. The canonical sim keeps 12 s of history (plans, the ball's track), so a window must end at the sim's present and span < 11.9 s.
// Canonical terms: the SUPPORT foot = a foot inside one of the shared foot plan's stances (possInfo's "support foot"); the TECHNICAL foot = the
// foot of the next planned contact (possInfo's "technical foot"); COMMITTED = possInfo's test (the next contact closer than the reaction time, or a
// technique between its commitment and its control return); the ACTION / its PHASE = the plan's action and the HUD's phase (hudAt / phaseOf);
// the TRAVEL heading = the velocity heading above 1 m/s, else the facing (hudAt); the TURN = the request against the travel. There is no separate
// gait-state machine in the canonical build: the gait is the foot plan (stances: support, touchdowns, lift-offs, step phase) + the requested mode.
export const LSR_STATE_VERSION = 1;
export const DT = 1 / 240;
export const MODES = ["WALK", "JOG", "RUN", "SPRINT"];   // (tc_baseline_88573ef0/pt_params.js MODES — the record's mode index)
export const STATE_EVERY = 2;                             // one state row every 2 ticks = 120 Hz
const R2D = 180 / Math.PI, hyp = Math.hypot;
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };   // (u_tc.js wrap / toLocal, the same formulas)
const toLocal = (q, P, h) => { const dx = q[0] - P[0], dy = q[1] - P[1], c = Math.cos(h), s = Math.sin(h); return [dx * c + dy * s, -dx * s + dy * c]; };   // [forward, right]
const deg = (r) => (r == null ? null : r * R2D);
export const SUPPORT = ["none", "L", "R", "both"];        // (flight · left · right · double support / standing)
export const POSS = ["FREE", "CONTROLLED"];
// the state row's fields (the recording's columns; angles in degrees, world headings in the pitch frame: + = turning right)
export const STATE_FIELDS = ["t", "k", "x", "y", "psi", "h", "travel", "vx", "vy", "s", "reqH", "mode", "planReqH", "turn", "relFacing", "relVel",
  "bx", "by", "bz", "bvx", "bvy", "bFwd", "bLat", "bDist", "sup", "lastTD", "lastTDF", "nextTD", "nextTDF", "nextTDL", "nextTDR", "stepPhase", "stepDur",
  "nextC", "techF", "lastC", "lastCF", "poss", "act", "phase", "committed", "commitUntil", "skill", "turnVsBall", "turnVsSupport"];
// (string fields are stored by index into the recording's dictionary: lastTDF / nextTDF / techF (= the next planned contact's foot) / lastCF ∈ "L" / "R"; act, phase, skill)
const footKey = (F, t0) => F + "@" + t0.toFixed(6);
function stanceAt(plan, X, t) { for (const s of plan.stances[X]) if (s.t0 <= t + 1e-9 && s.t1 > t) return s; return null; }
// the label the HUD shows for an action (hudAt: the label and its side)
export const actLabel = (a) => (a ? a.label + (a.m ? (a.m > 0 ? " (R)" : " (L)") : a.F && a.kind === "GENERIC" ? " · " + a.F : "") : "—");
// the HUD's phase of an action at t (phaseOf / hudAt, for any t)
export const phaseAt = (a, t) => (!a ? "—" : !a.tech ? a.label : t < a.tA ? "ENTRY · approach" : t < a.tC - 0.01 ? "ENTRY" : t < a.tC + 0.03 ? "CONTACT" : t < a.tRelease ? "PROTECTION" : "EXIT");

// sample [kA, kB] (inclusive, kB ≤ S.k − 1 for the request of the tick) every `every` ticks; the foot-plan tracker runs every tick from 0.6 s before kA
export function sampleState(S, kA, kB, every = STATE_EVERY) {
  const I = S.log.input, dict = { F: ["L", "R"], act: [], phase: [], skill: ["—"] }, ix = (L, v) => { let i = L.indexOf(v); if (i < 0) { L.push(v); i = L.length - 1; } return i; };
  const rows = [], tl = [], react = S.P && S.P.react != null ? S.P.react : 0.1, kW = Math.max(0, kA - 144), seen = { L: null, R: null }, tds = [];
  const C = S.contacts.slice().sort((a, b) => a.t - b.t); let ci = 0, lastC = null;
  const possLog = (S.poss && S.poss.log) || [], skills = (S.log.skill || []).slice(); if (S.skill && !S.skill.done) skills.push(S.skill);
  for (let k = kW; k <= kB; k++) {
    const t = k * DT, plan = S.planAt(t);
    // the foot-plan tracker: touchdowns (a stance's t0, exact) and lift-offs (the first tick its foot is out of it)
    for (const X of ["L", "R"]) { const s = stanceAt(plan, X, t), key = s ? footKey(X, s.t0) : null;
      if (key !== seen[X]) { if (seen[X] && k >= kA) tl.push({ t, kind: "liftoff", F: X }); if (s && s.t0 > 0) { tds.push({ t: s.t0, F: X }); if (s.t0 >= kA * DT - 1e-9) tl.push({ t: s.t0, kind: "touchdown", F: X }); } seen[X] = key; } }
    while (ci < C.length && C[ci].t <= t + 1e-9) { if (!C[ci].missed) lastC = C[ci]; ci++; }
    if (k < kA || (k - kA) % every) continue;
    const st = S.stateAt(t, plan), B = S.ballTrack(t), a = plan.action;
    const h = I.length / 3 > k ? I[3 * k] : -99, reqH = h === -99 ? null : h, mode = I.length / 3 > k ? I[3 * k + 1] : -1;
    const travel = st.s > 1.0 ? st.h : st.psi, frameH = st.s > 0.5 ? st.h : st.psi, rel = toLocal(B.p, st.P, frameH);
    const sL = stanceAt(plan, "L", t), sR = stanceAt(plan, "R", t), sup = sL && sR ? 3 : sL ? 1 : sR ? 2 : 0;
    let nT = null, nF = null; const nx = { L: null, R: null }; for (const X of ["L", "R"]) for (const s of plan.stances[X]) if (s.t0 > t + 1e-9 && (nx[X] == null || s.t0 < nx[X])) nx[X] = s.t0;
    for (const X of ["L", "R"]) if (nx[X] != null && (nT == null || nx[X] < nT)) { nT = nx[X]; nF = X; }
    let lT = null, lF = null, pT = null; for (let i = tds.length - 1; i >= 0; i--) if (tds[i].t <= t + 1e-9) { if (lT == null) { lT = tds[i].t; lF = tds[i].F; } else if (tds[i].t < lT - 1e-6) { pT = tds[i].t; break; } }
    let nc = null; for (const c of plan.contacts) if (c.t > t + 1e-9 && !c.missed && (!nc || c.t < nc.t)) nc = c;
    const committed = !!(nc && (nc.t - t < react + 1e-9 || (a.tech && t >= a.tCommit - 1e-9 && t < a.tRelease)));
    const commitUntil = a.tech && t < a.tRelease ? a.tRelease : nc && nc.t - t < react + 1e-9 ? nc.t : null;
    let poss = 0; for (const e of possLog) { if (e.t <= t + 1e-4) poss = e.to === "CONTROLLED" ? 1 : 0; else break; }
    let sk = 0; for (const x of skills) if (x.t <= t + 1e-9 && (x.tEnd == null || t < x.tEnd) && !(x.done && x.tEnd == null && x.t < t - 2)) sk = ix(dict.skill, x.intent + " · " + (x.state || "PENDING"));
    const turn = reqH != null ? wrap(reqH - travel) : null, sgnT = turn == null || Math.abs(turn) < 1e-9 ? 0 : Math.sign(turn);
    rows.push({ t, k, x: st.P[0], y: st.P[1], psi: deg(st.psi), h: deg(st.h), travel: deg(travel), vx: st.V[0], vy: st.V[1], s: st.s, reqH: deg(reqH), mode,
      planReqH: plan.req && plan.req.h != null ? deg(plan.req.h) : null, turn: deg(turn), relFacing: reqH != null ? deg(wrap(reqH - st.psi)) : null, relVel: reqH != null && st.s > 0.05 ? deg(wrap(reqH - st.h)) : null,
      bx: B.p[0], by: B.p[1], bz: B.p[2], bvx: B.v[0], bvy: B.v[1], bFwd: rel[0], bLat: rel[1], bDist: hyp(rel[0], rel[1]), sup,
      lastTD: lT, lastTDF: lF ? ix(dict.F, lF) : null, nextTD: nT, nextTDF: nF ? ix(dict.F, nF) : null, nextTDL: nx.L, nextTDR: nx.R,
      stepPhase: lT != null && nT != null && nT > lT ? (t - lT) / (nT - lT) : null, stepDur: lT != null && pT != null ? lT - pT : null,
      nextC: nc ? nc.t : null, techF: nc ? ix(dict.F, nc.F) : null, lastC: lastC ? lastC.t : null, lastCF: lastC ? ix(dict.F, lastC.F) : null,
      poss, act: ix(dict.act, actLabel(a) + (a.kind && a.kind !== "CARRY" ? " [" + (a.tech || a.kind) + "]" : "")), phase: ix(dict.phase, phaseAt(a, t)), committed: committed ? 1 : 0, commitUntil, skill: sk,
      turnVsBall: sgnT && Math.abs(rel[1]) > 1e-9 ? sgnT * Math.sign(rel[1]) : null, turnVsSupport: sgnT && (sup === 1 || sup === 2) ? sgnT * (sup === 2 ? 1 : -1) : null });
  }
  // the rest of the timeline, from the sim's own logs: contacts, actions (and control return), possession, the explicit requests, the re-plans
  const t0 = kA * DT, t1 = kB * DT, inW = (t) => t >= t0 - 1e-9 && t <= t1 + 1e-9;
  for (const c of C) if (inW(c.t)) tl.push({ t: c.t, kind: c.missed ? "miss" : "contact", F: c.F, surface: c.surface, role: c.role, tech: c.tech, action: c.action, decisive: !!c.decisive });
  for (const a of S.log.actions) if (inW(a.t)) tl.push({ t: a.t, kind: "action", label: a.label + (a.m ? (a.m > 0 ? " (R)" : " (L)") : ""), akind: a.kind });
  for (const a of Object.values(S.log.acts || {})) { if (a.tRelease != null && inW(a.tRelease) && a.tech) tl.push({ t: a.tRelease, kind: "control", label: actLabel(a) }); if (a.tSel != null && inW(a.tSel) && (a.tech || a.kind === "GENERIC")) tl.push({ t: a.tSel, kind: "select", label: actLabel(a), tech: a.tech || a.fam, tA: a.tA, tC: a.tC, tCommit: a.tCommit, tRelease: a.tRelease }); }
  for (const e of possLog) if (inW(e.t)) tl.push({ t: e.t, kind: "poss", from: e.from, to: e.to, why: e.why });
  for (const x of skills) { if (inW(x.t)) tl.push({ t: x.t, kind: "request", intent: x.intent }); if (x.done && x.tEnd != null && inW(x.tEnd)) tl.push({ t: x.tEnd, kind: "request_end", intent: x.intent, result: x.result, played: x.played || null }); }
  for (const p of S.plans) if (p.t0 > 0 && inW(p.t0) && p.reason) tl.push({ t: p.t0, kind: "replan", reason: String(p.reason) });
  tl.sort((a, b) => a.t - b.t || (a.kind < b.kind ? -1 : 1));
  return { rows, timeline: tl, dict };
}
// the request ticks of a window (240 Hz): the heading delivered to movement (deg, null = none), the mode index, the input bits (the record's)
export function sampleTicks(S, kA, kB) { const I = S.log.input, h = [], m = [], b = []; for (let k = kA; k <= kB; k++) { const x = I[3 * k]; h.push(x === -99 ? null : x * R2D); m.push(I[3 * k + 1]); b.push(I[3 * k + 2]); } return { k0: kA, reqH: h, mode: m, keys: b }; }

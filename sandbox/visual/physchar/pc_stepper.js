// ═══ physchar/pc_stepper.js — PHYSICAL STEPPER (opt-in: walk.ctrl.stepper) ═════════════════════════════════════════════════════════════
// Future limb / contact intentions made explicit — conceptually after F. Sarıhan's Stepper (an editable stepping layer between movement
// intent and execution), NOT a copy of an unrecovered implementation. Physics stays authoritative:
//   requested locomotion → nominal contact-event proposals → continuation-aware planning (a cheap surrogate, never full Jolt rollouts) →
//   committed contact-event references → the existing finite-motor execution → ACTUAL Jolt contact → ACHIEVED / MISSED / INTERRUPTED /
//   CANCELLED → replan from the actual state.
// A planned contact is an ATTEMPT: only a qualifying physical contact achieves it; a timer never does; history is never repaired.

// ── 1. CONTACT EVENTS ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Walking implements "support" (foot → ground). The other types are SCHEMA ONLY (football, later): a ball touch / strike / interception has
// a target region on the BALL's predicted path, a time window and a desired relative contact velocity; a release ends a contact; a recovery
// contact is a survival support that supersedes optional tasks. They are planned with — not on top of — the support events they constrain.
export const EVENT_TYPES = { support: "foot → ground support", ball_touch: "schema only", strike: "schema only", interception: "schema only", release: "schema only", recovery: "schema only" };
export const EVENT_STATES = ["PROPOSED", "ACCEPTED", "EXECUTING", "ACHIEVED", "MISSED", "INTERRUPTED", "CANCELLED"];
const LEGAL = { PROPOSED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["EXECUTING", "CANCELLED"], EXECUTING: ["ACHIEVED", "MISSED", "INTERRUPTED", "CANCELLED"] };
let NEXT_ID = 1;
export class ContactEvent {
  // spec: { effector: "foot_L" | "foot_R" | …, type, target: { center: [x, z] (world), halfExtent: [fwd, lat] (tolerance, heading frame) },
  //         orientation: { yaw, tol }, window: { earliest, nominal, latest } (physical s), relVel: null | [vx, vy, vz] (contact events),
  //         prereq: [{ effector, state }] (supports that must exist), continuation: { require, margin } (what must remain possible),
  //         priority (higher wins a limb), fallback: "replan" | "defer" | "cancel", command: { df, dl, T } (the step-frame parametrisation),
  //         source: which proposal / planner produced it, predicted: the surrogate's prediction (for calibration) }
  constructor(spec, t, why) { Object.assign(this, { id: NEXT_ID++, version: 1, type: "support", priority: 1, fallback: "replan", relVel: null, prereq: [], continuation: null }, spec);
    this.state = "PROPOSED"; this.history = [{ t, state: "PROPOSED", why: why || "proposed" }]; this.outcome = null; }
  to(state, t, why, outcome) { if (!(LEGAL[this.state] || []).includes(state)) throw new Error(`contact event ${this.id}: illegal ${this.state} → ${state}`);
    this.state = state; this.history.push({ t, state, why }); if (outcome) this.outcome = outcome; return this; }
  get terminal() { return !LEGAL[this.state]; }
  // a revision of a not-yet-executing event is a NEW version (the old one is CANCELLED, kept in the log: history is never edited)
  revise(t, patch, why) { if (this.state !== "PROPOSED" && this.state !== "ACCEPTED") throw new Error(`contact event ${this.id}: cannot revise in ${this.state}`);
    const nx = new ContactEvent({ ...this, ...patch, id: undefined, version: this.version + 1, history: undefined, state: undefined, outcome: undefined }, t, why); nx.parent = this.id; nx.id = NEXT_ID++; this.to("CANCELLED", t, `superseded by v${nx.version} (${why})`); return nx; }
}
// the ACHIEVED / MISSED / INTERRUPTED classification of an executing SUPPORT event from what physically happened (the executor's sensed
// events — it never invents a contact): achieved = the foot loaded the turf within the event's tolerance region and time window
export function classifySupport(ev, d, tol) { const T = tol || {}; if (!d) return null;
  if (d.status === "FAILED" || !d.td) return { state: "MISSED", why: d.fail || "no qualifying ground contact" };
  if (d.td.obstructed || d.obst) return { state: "INTERRUPTED", why: "contact with a non-turf obstacle before the turf" };
  const e = ev.target.center, c = d.td.center, hd = ev.heading, rt = [hd[1], -hd[0]], dx = [c[0] - e[0], c[1] - e[1]], ef = dx[0] * hd[0] + dx[1] * hd[1], el = dx[0] * rt[0] + dx[1] * rt[1];
  const he = ev.target.halfExtent || [T.fwd ?? 0.10, T.lat ?? 0.08], early = d.td.t < ev.window.earliest - (T.time ?? 0.0), late = d.td.t > ev.window.latest + (T.time ?? 0.0);
  const out = { t: d.td.t, center: c.slice(), err: [ef, el], dt: d.td.t - ev.window.nominal, uAt: d.td.uAt };
  if (Math.abs(ef) > he[0] || Math.abs(el) > he[1]) return { state: "MISSED", why: `touched down ${(100 * ef).toFixed(1)} / ${(100 * el).toFixed(1)} cm from the target (outside its region)`, outcome: out };
  if (early || late) return { state: "MISSED", why: `touched down ${early ? "early" : "late"} (${(1000 * out.dt).toFixed(0)} ms vs the window)`, outcome: out };
  return { state: "ACHIEVED", why: "qualifying ground contact", outcome: out }; }

// ── 2. NOMINAL GAIT GENERATOR ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// A few plausible next-support proposals — it does NOT decide what physics can execute. The operating region scales with the requested and
// the measured speed and the leg length through a WALK-RATIO law: achieved step length ℓ = √(WR·v), cadence = v/ℓ (WR = step length per
// step frequency, m·s; human walking keeps it roughly constant across speeds — Sekiya & Nagasaki 1998), calibrated on this body's own
// demonstrated stable region (the depth-2 Jolt oracle, 2026-10-02: ≈ 0.34 m achieved at ≈ 1.73 steps/s → WR ≈ 0.20 m·s at L = 0.924 m) and
// scaled with the leg length (WR ∝ L²·(g/L)^½ under dynamic similarity). The commanded foothold leads the achieved one by the measured
// execution bias (commanded / achieved ≈ 1.13). Candidates span offsets around that nominal in placement and timing.
export const NOMINAL = { WR: 0.20, L0: 0.9243, cmdGain: 1.13, Tss: [0.34, 0.40, 0.46], dfOff: [-0.12, -0.06, 0, 0.06, 0.12], dlOff: [-0.03, 0, 0.03], dl0: 0.30, dfLo: 0.0, dfHi: 0.55 };
export function nominalStep(vReq, vMeas, legLen, P) { const N = { ...NOMINAL, ...(P || {}) }, L = legLen || N.L0, WR = N.WR * Math.pow(L / N.L0, 1.5), v = Math.max(0.15, 0.5 * (vReq + (vMeas ?? vReq)));
  const ell = Math.sqrt(WR * v); return { df: N.cmdGain * ell, T: N.Tss[1], ell, cadence: v / ell }; }
export function proposeSupports(z, task, P) { const N = { ...NOMINAL, ...(P || {}) }, nom = nominalStep(task.vReq, z.v[0], task.legLen, N), out = [];
  const dl0 = task.dl0 ?? N.dl0;
  for (const d of N.dfOff) for (const T of N.Tss) for (const w of N.dlOff) { const df = Math.max(N.dfLo, Math.min(N.dfHi, nom.df + d)); out.push({ df, dl: dl0 + w, T, src: `nominal ${d >= 0 ? "+" : ""}${d.toFixed(2)} / T ${T.toFixed(2)} / w ${w >= 0 ? "+" : ""}${w.toFixed(2)}` }); }
  return { nominal: nom, cands: out }; }

// ── 3. THE SURROGATE (runtime evaluation; fitting is offline: tools/stepper/surrogate.mjs) ─────────────────────────────────────────────────
// A step-to-step model: (state at a step start z, commanded step u = [df, dl, T]) → the state at the next step start (its own input features,
// so it chains), the REALISED step (achieved length / width, the step's duration) and P(fall before the next step start). Deterministic,
// regularised, a few hundred multiply-adds per evaluation. Model JSON: { kind: lin | quad | local, F, T, mu, sd, W | regions, feas }.
export const featOf = (z, nm) => { const p = nm.split("."); let v = z; for (const k of p) { if (v == null) return 0; v = Array.isArray(v) ? v[+k] : v[k]; } return v == null || !Number.isFinite(v) ? 0 : v; };
const CPF = ["xi.0", "xi.1", "v.0", "v.1"];
// (feature paths are compiled once per feature list — the planner evaluates the model a few hundred times per decision)
const PATHS = new Map(), pathOf = (nm) => { let p = PATHS.get(nm); if (!p) { p = nm.split(".").map(q => /^\d+$/.test(q) ? +q : q); PATHS.set(nm, p); } return p; };
const featP = (z, p) => { let v = z; for (let i = 0; i < p.length; i++) { if (v == null) return 0; v = v[p[i]]; } return v == null || !Number.isFinite(v) ? 0 : v; };
export function designX(F, kind, z, u) { const x = [1]; for (const nm of F) x.push(featP(z, pathOf(nm))); x.push(u[0], u[1], u[2]); if (kind === "lin") return x;
  x.push(u[0] * u[0], u[1] * u[1], u[2] * u[2], u[0] * u[1], u[0] * u[2], u[1] * u[2]); for (const a of u) for (const nm of CPF) x.push(a * featP(z, pathOf(nm))); return x; }
const stdz = (x, mu, sd) => x.map((v, i) => (v - mu[i]) / sd[i]);
const mv = (W, x) => { const m = W[0].length, y = new Array(m).fill(0); for (let i = 0; i < x.length; i++) { const xi = x[i], Wi = W[i]; if (xi) for (let j = 0; j < m; j++) y[j] += xi * Wi[j]; } return y; };
export function modelPredict(M, z, u) { const x = stdz(designX(M.F, M.kind === "local" ? "quad" : M.kind, z, u), M.mu, M.sd); let y;
  if (M.kind !== "local") y = mv(M.W, x);
  else { const R = M.regions, p = R.sIdx.map(i => x[i]), d = R.C.map(c => c.reduce((a, v, i) => a + (v - p[i]) ** 2, 0)), m = Math.min(...d), e = d.map(v => Math.exp(-(v - m) / (2 * R.tau * R.tau))), s = e.reduce((a, b) => a + b, 0);
    y = new Array(M.T.length).fill(0); R.Ws.forEach((W, k) => { const w = e[k] / s; if (w > 1e-4) { const q = mv(W, x); for (let j = 0; j < y.length; j++) y[j] += w * q[j]; } }); }
  let pFall = 0; if (M.feas) { const xf = stdz(designX(M.F, "quad", z, u), M.feas.mu, M.feas.sd); let a = 0; for (let i = 0; i < xf.length; i++) a += xf[i] * M.feas.w[i]; pFall = 1 / (1 + Math.exp(-a)); }
  const yo = {}; for (let j = 0; j < M.T.length; j++) yo[M.T[j]] = y[j]; return { y: yo, pFall }; }
// a predicted next state as a state record (the model's own input features, set by path) — what a second step is planned from
export function stateFrom(y, F) { const z = {}; for (const nm of F) { const p = nm.split("."); let o = z; for (let i = 0; i < p.length - 1; i++) { const nx = /^\d+$/.test(p[i + 1]); o[p[i]] = o[p[i]] || (nx ? [] : {}); o = o[p[i]]; } o[p[p.length - 1]] = y[nm]; } return z; }

// ── 4. THE CONTINUATION-AWARE PLANNER ─────────────────────────────────────────────────────────────────────────────────────────────────
// At a step start: nominal proposals (and, optionally, the feedback controller's own decision with offsets around it) are scored on the
// surrogate's prediction of the NEXT step start: the stride-level objective (the capture point's placement in the new stance and the
// phase-matched forward velocity — the same instant every step, never the within-step velocity), a feasibility gate (P(fall) above pMax →
// rejected) and CONTINUATION — horizon 2: the best `beam` first steps are each followed by the best predicted second step (two transitions,
// only the first is executed); or horizon 1 + a terminal value V(z1) fitted to what the depth-2 oracle found reachable from z1. The first
// command is returned with its prediction (for the event's target region and for calibration). Nothing here touches the body.
export const STEPPER = { horizon: 2, beam: 3, w1: 0.5, pMax: 0.3, center: "nominal", cost: { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06, ws: 0, ts: null } };
export function stepCost(y, C) { let c = ((y["xi.0"] - C.tf) / 0.03) ** 2 + ((y["xi.1"] - C.tl) / 0.03) ** 2 + ((y["v.0"] - C.tv) / C.sv) ** 2;
  if (C.ws) { const vs = y.achF / Math.max(0.2, y.dur); c += C.ws * ((vs - (C.ts ?? C.tv)) / C.sv) ** 2; } return c; }   // (ws: the step-average speed — achieved length / duration)
const featX = (z, nm) => nm.includes("*") ? nm.split("*").reduce((a, q) => a * featOf(z, q), 1) : featOf(z, nm);   // ("a*b": a product feature)
export function terminalValue(V, z) { if (!V) return 0; let y = V.b; V.feats.forEach((nm, i) => { y += V.w[i] * (featX(z, nm) - V.mu[i]) / V.sd[i]; }); return Math.max(0, y); }
export class StepPlanner {
  constructor(cfg) { this.C = { ...STEPPER, ...cfg, cost: { ...STEPPER.cost, ...((cfg && cfg.cost) || {}) } }; this.M = this.C.model; this.n = 0; }
  candidates(z, task, uc) { const C = this.C, out = []; if (C.center !== "ctrl") out.push(...proposeSupports(z, task, C.nominal).cands.map(c => [c.df, c.dl, c.T]));
    if (uc && C.center !== "nominal") for (const d of [-0.12, -0.06, 0, 0.06, 0.12]) for (const t of [-0.06, 0, 0.06]) for (const w of [-0.03, 0, 0.03]) out.push([uc[0] + d, uc[1] + w, Math.max(0.30, Math.min(0.54, uc[2] + t))]);
    return out; }
  score(z, u) { const p = modelPredict(this.M, z, u), C = this.C; return { u, p, c: p.pFall > C.pMax ? Infinity : stepCost(p.y, C.cost) }; }
  decide(z, task, uc) { const C = this.C; this.n++; const L1 = this.candidates(z, task, uc).map(u => this.score(z, u)), fin = L1.filter(e => Number.isFinite(e.c));
    if (!fin.length) { const e = L1.slice().sort((a, b) => a.p.pFall - b.p.pFall)[0]; return { u: e.u, pred: e.p, why: "no candidate predicted safe — the least likely to fall", n1: L1.length, n2: 0, tot: Infinity }; }
    let best = null, n2 = 0;
    if (C.horizon === 2) { for (const e of fin.slice().sort((a, b) => a.c - b.c).slice(0, C.beam)) { const z1 = { ...stateFrom(e.p.y, this.M.F), t: 0 }; let b2 = Infinity;
        for (const u2 of this.candidates(z1, task, null)) { n2++; const e2 = this.score(z1, u2); if (e2.c < b2) b2 = e2.c; }
        const tot = C.w1 * e.c + b2; if (!best || tot < best.tot) best = { ...e, tot, c2: b2 }; } }
    else for (const e of fin) { const tot = C.V ? C.w1 * e.c + terminalValue(C.V, stateFrom(e.p.y, this.M.F)) : e.c; if (!best || tot < best.tot) best = { ...e, tot }; }
    if (!best || !Number.isFinite(best.tot)) best = fin.slice().sort((a, b) => a.c - b.c)[0];
    return { u: best.u, pred: best.p, c1: best.c, c2: best.c2 ?? null, tot: best.tot, n1: L1.length, n2, why: C.horizon === 2 ? "two-transition search on the surrogate" : (C.V ? "one step + terminal value" : "one step") }; }
}

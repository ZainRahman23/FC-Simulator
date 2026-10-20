// ═══ tc_responsive/pt_ball.js — RESPONSIVENESS EXPERIMENT (from 88573ef0, deterministic math): the AUTHORITATIVE BALL (the frozen kernel, unchanged) and its fast prediction ══════════
// The ball is DRIBBLE-V1's kernel (BALL-FEEL-1.3 world, dribble15/d15_core.js BALL_DEFAULT — read-only): free between contacts, each authoritative
// contact one schedule() launch (velocity + its rolling spin), never parented to a foot. The controller needs to know where a rolling ball will be
// many times per decision, so the kernel's own rolling law is tabulated once at start-up: one long roll from 16 m/s to rest — the law is autonomous
// (a rolling ball's future depends only on its present speed), so any launch speed reads the same curve from the point where the long roll passes
// that speed (fractional, interpolated). Rolling balls travel straight (no side spin is ever given). The controller only PREDICTS with the table;
// every launch is executed on the kernel and the next decision reads the kernel's actual ball.
// (DETERMINISTIC math for everything that feeds the simulation: JavaScript does not make Math.sin / cos / atan2 / acos / hypot bit-identical
// across engines — Node and Chrome were measured to differ — so a recorded session could diverge on another engine; + − × ÷ and sqrt are exact)
import { dsin, dcos, datan2, dacos, dnorm } from "../physchar2/core/v2_math.js";
import { BALL_DEFAULT } from "../dribble15/d15_core.js";
export const DT = 1 / 240, R = 0.11;
const B = BALL_DEFAULT, hyp = dnorm;
export const rollK = (vk) => [vk[2] / R, 0, -vk[0] / R];
export function mkWorld(p, v) { return new B.World(Object.assign({}, B.options, { p, v, w: rollK(v), dt: DT, substeps: 1, parameters: B.parameters, colliders: [] })); }
// ── the rolling table: distance d[i] and speed s[i] along one roll from V0, i ticks after its launch ────────────────────────────────────────────────
const V0 = 16;
export const ROLL = (() => { const W = mkWorld([0, R, 0], [V0, 0, 0]), d = [0], s = [V0]; for (let i = 0; i < 240 * 12; i++) { W.step(); d.push(W.ball.p[0]); s.push(hyp(W.ball.v[0], W.ball.v[2])); if (W.ball.sleeping || s[s.length - 1] < 1e-4) break; }
  return { d: Float64Array.from(d), s: Float64Array.from(s), n: d.length, dRest: d[d.length - 1] }; })();
// the fractional tick at which the long roll's speed equals v (binary search; the speed is monotone)
function idxOf(v) { if (v >= V0) return 0; const s = ROLL.s; let lo = 0, hi = ROLL.n - 1; if (v <= s[hi]) return hi; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] > v) lo = m; else hi = m; } return lo + (s[lo] - v) / Math.max(1e-12, s[lo] - s[hi]); }
function dAt(x) { const n = ROLL.n - 1; if (x >= n) return ROLL.dRest; const i = Math.floor(x), u = x - i; return ROLL.d[i] + (ROLL.d[i + 1] - ROLL.d[i]) * u; }
function sAt(x) { const n = ROLL.n - 1; if (x >= n) return 0; const i = Math.floor(x), u = x - i; return ROLL.s[i] + (ROLL.s[i + 1] - ROLL.s[i]) * u; }
// a ball launched (rolling) at v0: its distance and speed t seconds later
export function rollFrom(v0, t) { if (v0 <= 1e-6) return { d: 0, v: 0 }; const x0 = idxOf(v0), x1 = x0 + t / DT; return { d: dAt(x1) - dAt(x0), v: sAt(x1) }; }
// the launch speed that rolls distance D in T seconds (null if no launch ≤ vMax reaches it)
export function speedFor(D, T, vMax = 15.5) { if (D <= 1e-4) return 0; if (rollFrom(vMax, T).d < D) return null; let lo = 0, hi = vMax; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (rollFrom(m, T).d < D) lo = m; else hi = m; } return (lo + hi) / 2; }
// the free ball t seconds ahead from a kernel state (pitch x, y): straight along its velocity, the table's law (an airborne ball: ballistic + the
// same roll after — rare here: launches are along the turf)
export function predict(p, v, t) { const sp = hyp(v[0], v[1]); if (sp < 1e-4) return { p: [p[0], p[1]], v: [0, 0], speed: 0 }; const r = rollFrom(sp, t), u = [v[0] / sp, v[1] / sp];
  return { p: [p[0] + u[0] * r.d, p[1] + u[1] * r.d], v: [u[0] * r.v, u[1] * r.v], speed: r.v }; }
// THE AUTHORITATIVE BALL: the kernel world; launch() is the only way anything changes the ball. A launch is scheduled for the current tick and the
// kernel applies it at the start of its next step — until then v reports the launched velocity (the decision made right after a contact must see
// the ball it has just sent, not the one it received)
export class Ball {
  constructor(p, v) { this.W = mkWorld([p[0], R, p[1]], [v[0], 0, v[1]]); this.n = 0; this.pend = null; }
  get p() { const b = this.W.ball.p; return [b[0], b[2], b[1]]; }                  // pitch x, y, height
  get v() { if (this.pend) return [this.pend[0], this.pend[1], 0]; const b = this.W.ball.v; return [b[0], b[2], b[1]]; }
  get q() { return this.W.ball.q || [0, 0, 0, 1]; }
  launch(v2, meta) { const vk = [v2[0], 0, v2[1]], W = this.W; this.pend = [v2[0], v2[1]]; W.schedule({ id: "c" + (++this.n), tick: W.tick, position: W.ball.p.slice(), velocity: vk, spin: rollK(vk), maxContactError: 0.06, preparedAt: W.time, colliderId: null, metadata: meta || {} }); }
  step() { this.W.step(); this.pend = null; }
  // a full copy of the kernel state (for snapshots / the replay); restore() puts it back exactly
  snapshot() { const W = this.W; return { ball: structuredClone(W.ball), tick: W.tick, time: W.time, restTime: W.restTime, n: this.n, stats: Object.assign({}, W.stats), actions: structuredClone(W.actions), actionIds: [...W.actionIds], pend: this.pend && this.pend.slice() }; }
  restore(s) { const W = mkWorld([0, R, 0], [0, 0, 0]); W.ball = structuredClone(s.ball); W.tick = s.tick; W.time = s.time; W.restTime = s.restTime; W.stats = Object.assign({}, s.stats); W.actions = structuredClone(s.actions || []); W.actionIds = new Set(s.actionIds || []); this.W = W; this.n = s.n; this.pend = s.pend ? s.pend.slice() : null; }
}

// ═══ technical_control14/tc14_body.js — TECHNICAL-CONTROL-1.4's body: TECHNICAL-CONTROL-1.3's FlowBody (the transition / phasing body) + THE CHOP'S
// STANDING FOOT (presentation only): the foot that stands for a chop / Cruyff lands just past the ball and beside it on its own side — a braking plant
// ahead of the body — so the touching foot sweeps across behind the standing leg and the ball leaves behind its heel (a plain landing would put it
// at the running stride's place, short of the ball). Everything else is FlowBody's. ════════════════════════════════════════════════════════════
import { FlowBody } from "../technical_control13/tc13_body.js";
import { DEG, sgnF } from "../receive_turn1/rt_actions.js";
const hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min;
export const CB = { past: 0.10, beside: 0.12, window: 0.14 };   // m past the ball along the run, m beside it on the standing foot's side; s: a landing that long before the contact
export class ChopBody extends FlowBody {
  // the chop / Cruyff contact the other foot plays within CB.window after this landing (from the episode's action and the known contacts)
  chopAfter(X, t) { const A = this.ep && this.ep.act; if (!A || !(A.fam === "CHOP" || A.fam === "CRUYFF")) return null; const q = A.contacts[0]; if (!q || q.F === X || q.tc < t - 0.005 || q.tc > t + CB.window) return null;
    const c = (this.contactsKnown || []).find((k) => k.F === q.F && abs(k.t - q.tc) < 0.02); return c && c.ball ? { c, tc: q.tc } : null; }
  landAfterTouch(X, c, s) { const L = super.landAfterTouch(X, c, s), ch = this.chopAfter(X, s.t1); return ch ? this.chopStand(X, s.t1, L, ch) : L; }
  landAt(X, t) { const L = super.landAt(X, t), ch = this.chopAfter(X, t); return ch ? this.chopStand(X, t, L, ch) : L; }
  chopStand(X, t, L, ch) {
    const psi = this.ep.psiAt(t), f = [Math.cos(psi), Math.sin(psi)], sd = [-Math.sin(psi) * sgnF(X), Math.cos(psi) * sgnF(X)], b = ch.c.ball;
    const pos = [b[0] + f[0] * CB.past + sd[0] * CB.beside, b[1] + f[1] * CB.past + sd[1] * CB.beside];
    return Object.assign({}, L, { pos: this.reachClamp(X, pos, t), chopStand: true }); }
}

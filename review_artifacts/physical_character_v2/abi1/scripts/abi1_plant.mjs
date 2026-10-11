// ABI-1 plant (active balance investigation). The FROZEN PVP-1A two-character plant (pvp1/scripts/pvp1a_sim.mjs, class PvpPlant — imported, not
// copied, not modified) with three hooks, all inert when unused:
//   (1) SENSING: after every recorded step the runner's sensory frame (the record itself: exact body states + per-foot turf normal impulse from the
//       decoded contact cache) is handed to the controller, which keeps its own delay line (it can only read frames ≥ 1 step old);
//   (2) COMMAND: the runner's SnapshotTone rows (IFM-1, unchanged) are passed to the controller, which may add feed-forward increments or replace the
//       rows of a stepping leg; every row still goes through the unchanged ActuatorLayer (capacity, activation dynamics, saturation);
//   (3) CONTACT SET (EXT diagnostic only): cross-character pairs other than runner leg ↔ tackler leg rejected from t = 0 through the same validate
//       callback the frozen plant uses for C0 / X2;
//   (4) TONE SCALE (S-TONE diagnostic only): the runner's SnapshotTone K and D scaled once at entry (bias unchanged); the entry actuator plan recomputed.
// With no controller and the frozen contact set, the physics is the frozen plant's exactly (checked bit for bit against the committed CF1 N2 record).
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV } = PL;
const { PvpPlant } = await import(new URL("../../pvp1/scripts/pvp1a_sim.mjs", import.meta.url).href);
export const LEG_BODIES = Object.freeze(["thigh_L", "shank_L", "foot_L", "thigh_R", "shank_R", "foot_R"]);
const now = () => performance.now();
export class AbiPlant extends PvpPlant {
  // opts (in addition to PvpPlant's): controller: null | (plant) => controller object { sense(rec, plant), command(cmd, c, st, ev, n), info(), meta() }
  //                                  contactSet: "ALL" (frozen) | "LEGS" (EXT)
  constructor(J, entries, flags, mode, opts = {}) {
    super(J, entries, flags, mode, opts);
    this.contactSet = opts.contactSet || "ALL"; this.cpu.ctl = 0; this.cpu.sense = 0;
    if (this.contactSet === "LEGS") { if (mode !== "N2" || this.solo) throw new Error("contactSet LEGS is defined for N2 only");
      const Jm = J, self = this, nR = this.chars[0].nb, names = this.comb.bodies.map(b => b.name), leg = (u) => LEG_BODIES.includes(names[u - 1]);
      this.w.listener.OnContactValidate = (b1p, b2p) => { const u1 = Jm.wrapPointer(b1p, Jm.Body).GetUserData(), u2 = Jm.wrapPointer(b2p, Jm.Body).GetUserData(), side = (u) => (u >= 1 && u <= nR ? 1 : u > nR && u <= self.nbAll ? 2 : 0), s1 = side(u1), s2 = side(u2);
        return s1 && s2 && s1 !== s2 && !(leg(u1) && leg(u2)) ? Jm.ValidateResult_RejectAllContactsForThisBodyPair : Jm.ValidateResult_AcceptAllContactsForThisBodyPair; }; }
    else if (this.contactSet !== "ALL") throw new Error("contactSet " + this.contactSet);
    if (opts.toneScale) { const c = this.chars.find(x => x.role === "runner"), { k: sk, d: sd } = opts.toneScale; this.toneScale = { k: sk, d: sd };
      for (const T of c.tone) if (T.K) { T.K = T.K.map(x => x * sk); T.D = T.D.map(x => x * sd); }
      const { cmd } = PvpPlant.prototype.toneCmd.call(this, c, c.st, c.up.ev, 0); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); }
    this.ctl = opts.controller ? opts.controller(this) : null;
  }
  toneCmd(c, st, ev, t) { const out = super.toneCmd(c, st, ev, t);
    if (this.ctl && c.role === "runner") { const t0 = now(); this.ctl.command(out.cmd, c, st, ev, this.n); this.cpu.ctl += now() - t0; }
    return out; }
  _record(pre, S1, mf) { const rec = super._record(pre, S1, mf), c = this.chars.find(x => x.role === "runner");
    rec.act = c ? (c.actRes || []).map(r => [r.k, r.i, r.tau, r.cap, r.frac, r.sat ? 1 : 0, r.req]) : null;   // runner actuator torque per axis (exact constraint readback)
    if (this.ctl && c) { const t0 = now(); this.ctl.sense(rec, this); rec.ctl = this.ctl.info(); this.cpu.sense += now() - t0; }
    return rec; }
}

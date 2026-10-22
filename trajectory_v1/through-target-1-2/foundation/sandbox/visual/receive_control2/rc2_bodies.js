// ═══ receive_control2/rc2_bodies.js — RECEIVE-CONTROL-2: the PRESENTATION bodies of the integrated receive (never read by the simulation) ═══════
// RECEIVE-TURN-1.1's HumanTurnBody (the turns) and RECEIVE-KILL's KillBody (kills, aerial controls and their follow-ups), unchanged, placed in the
// receive's frame: both were authored in RECEIVE-KILL's local frame about the stance (pitch 40, 34) facing 0; here their root goes to the
// receiver's actual stance and facing. At that reference frame the output is the base class's exactly (the base finish() runs).
import { HumanTurnBody } from "../receive_turn11/rt11_body.js";
import { KillBody } from "../receive_turn1/rk_body.js";
const isRef = (F) => !F || (F.P0[0] === 40 && F.P0[1] === 34 && F.h === 0);
function framedFinish(self, F, P, psi, pose) {
  const E = self.E, b = self.b, Fp = F.pitch(P), rootM = E.r1RootMatrix(Fp[0], Fp[1], F.h + psi, 0), fk = E.r1FK({ body: b }, pose, rootM, self.fk); self.fk = fk;
  const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(self.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
  const J = {}; for (const bn of sk.bones) { const w = fk.joint[bn.idx], tp = fk.tip[bn.idx]; J[bn.name] = { j: F.loc([w[0], w[1], -w[2]]), t: F.loc([tp[0], tp[1], -tp[2]]) }; }
  return { skin, J, pose };
}
export class FramedTurnBody extends HumanTurnBody {
  constructor(E, M4, skel, prep, ep, F) { super(E, M4, skel, prep, ep); this.F = F; }
  finish(P, psi, pose) { return isRef(this.F) ? super.finish(P, psi, pose) : framedFinish(this, this.F, P, psi, pose); }
}
export class FramedKillBody extends KillBody {
  constructor(E, M4, skel, prep, ep, F) { super(E, M4, skel, prep, ep); this.F = F; }
  finish(S, pose) { return isRef(this.F) ? super.finish(S, pose) : framedFinish(this, this.F, S, 0, pose); }
}

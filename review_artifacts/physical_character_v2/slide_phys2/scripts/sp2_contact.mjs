// SLIDE-PHYS-2 Phase 3 — body-on-turf contact (EXPERIMENTAL, labelled; never installed unless a run asks for it). The V2 contact table already
// separates materials: boot|turf 1.2 (studs), hand|turf 0.7, body|turf 0.5 for every other sub-shape (kit, skin, socks) — sliding body regions
// are NOT treated like studded boots; only a boot's own non-sole surfaces were (TCF-1 corrects those to 0.5 when the sole does not face the turf).
// installBodyFriction(sim, mu, bodies?) sets the turf friction of the listed (default: all non-boot, non-hand) sub-shapes of the given user-data
// bodies — used only for SENSITIVITY runs across the literature bracket (kit on 3G 0.35–0.55; research/SLIDE2_LITERATURE.md), never to tune.
export function installBodyFriction(sim, mu, footHandUD = new Set()) { const J = sim.J, Lr = sim.w.listener, GROUND = 1000, log = sim.bodyMuLog = { n: 0, mu };
  const adj = (b1p, b2p, mp, sp) => { const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), u1 = b1.GetUserData(), u2 = b2.GetUserData();
    const other = u1 === GROUND ? u2 : u2 === GROUND ? u1 : null; if (other == null || other >= 2000 || footHandUD.has(other)) return;
    const cs = J.wrapPointer(sp, J.ContactSettings); if (Math.abs(cs.mCombinedFriction - 0.5) < 1e-9) { cs.mCombinedFriction = mu; log.n++; } };   // only the spec's body|turf pairs (0.5)
  const oa = Lr.OnContactAdded, op = Lr.OnContactPersisted;
  Lr.OnContactAdded = (a, b, c, d) => { oa(a, b, c, d); adj(a, b, c, d); }; Lr.OnContactPersisted = (a, b, c, d) => { op(a, b, c, d); adj(a, b, c, d); };
  return log; }

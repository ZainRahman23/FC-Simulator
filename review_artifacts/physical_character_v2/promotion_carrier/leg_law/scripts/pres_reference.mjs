// PREDICTION ONLY (leg-law investigation; not a gate, not adopted): a gait-reference provider with the frozen carrier's `law` interface, built from the
// LC-1 presentation already in the record (R.pres) — a proxy for "a physically realisable shared law" (spring-mass vertical with ballistic flight, world-
// fixed rolling plants, C1 joints). Mapping = the PI-1 mapping WITHOUT RF-1 foot reconciliation (makeMapper RK, rf1 false): RF-1 snaps the V2 foot pitch to
// the turf whenever the presentation's contact flag toggles (≈ 40° in one frame — measured in the first prediction run, kept as evidence), which is a mapping
// artefact, not part of the presented gait; the carrier's decaying promotion offset absorbs the k_p difference.
// Time rule = the law provider's: for τ ∈ (r, r+1] interpolate frames r−1 (τ = r) → r (τ = r+1) at w = τ − r; stencil points use their centre's row
// (linear / slerp extrapolation beyond the frame pair) — no later frame is read. planted = the presentation's own contact flags at the centre row.
import { fileURLToPath } from "url"; const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const M = await import(ROOT + "pi1/rev1/scripts/pcg_rev1.mjs"); const { V, Q, slerp } = M.L;
export function makePresRef(R) {
  const cache = new Map(), mapper = M.makeMapper(R, { knee: "RK", rf1: false });
  const at = (tau, center = tau) => { const r = Math.ceil(center - 1e-9) - 1, w = tau - r, key = r + ":" + w.toFixed(6); if (cache.has(key)) return cache.get(key);
    const A = mapper.poseAt(r - 1).S, Bf = mapper.poseAt(r).S, S = A.map((a, i) => ({ pos: V.add(a.pos, V.sc(V.sub(Bf[i].pos, a.pos), w)), rot: Q.norm(slerp(a.rot, Bf[i].rot, w)) }));
    const o = { S, planted: { L: !!R.pres[r].feet[0].contact, R: !!R.pres[r].feet[1].contact } }; cache.set(key, o); if (cache.size > 64) cache.delete(cache.keys().next().value); return o; };
  return { at };
}

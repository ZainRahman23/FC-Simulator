// ABI-1 offline metrics (read-only, applied identically to every condition's record). Physical quantities only — no gameplay label is computed here.
//   support: per-foot V2 support state from the recorded turf normal impulse with V2's own lifecycle thresholds (ctrl/v2_support.js LIFECYCLE:
//            unloaded < loadOff·M·g, loaded > loadOn·M·g, each transition held ≥ debounce); initial state SUPPORT (standing entry)
//   BoS:     convex hull of the supporting feet's usable sole regions (the StandController's own footPoly, 5 mm inset)
//   XcoM:    ξ = c_h + v_h / ω0, ω0 = √(g / c_y) (Hof 2005); dOut = distance of ξ outside the BoS (≤ 0 inside: −margin of stability)
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q, P2 } = PL;
const { StandController, clampPoly, insidePoly, polyDist } = await import(P2 + "ctrl/v2_stand.js"), { solveStance, STANCE } = await import(P2 + "ctrl/v2_stance.js");
const { SLP_STAND } = await import(P2 + "gates/v2_slp.js"), { PassiveLayer } = await import(P2 + "sim/v2_passive.js"), { LIFECYCLE } = await import(P2 + "ctrl/v2_support.js"), { hull2 } = await import(P2 + "sim/v2_geom.js");
export const G = 9.81, H = 1 / 240;
let _ctx = null;
export function runnerCtx() { if (_ctx) return _ctx; const spec = PL.SPEC_R(), P = new PassiveLayer(spec, { driveOn: () => {} }, { enabled: true, couplings: true, kneeModel: "v2k" }), ctrl = new StandController(spec, P, solveStance(spec, { ...STANCE }), { probes: false, passiveOpts: { kneeModel: "v2k" }, stand: SLP_STAND });
  const B = spec.bodies; _ctx = { spec, P, ctrl, B, M: B.reduce((s, b) => s + b.mass, 0), nb: B.length, idx: Object.fromEntries(B.map((b, i) => [b.name, i])) }; return _ctx; }
export function comOf(S, B) { let c = [0, 0, 0], v = [0, 0, 0], m = 0; S.forEach((s, i) => { c = V.add(c, V.sc(s.com, B[i].mass)); v = V.add(v, V.sc(s.v, B[i].mass)); m += B[i].mass; }); return { c: V.sc(c, 1 / m), v: V.sc(v, 1 / m) }; }
export function supportTracker(M) { const W = M * G, lo = LIFECYCLE.loadOff * W, hi = LIFECYCLE.loadOn * W, nDb = Math.round(LIFECYCLE.debounce / H);
  const st = [true, true], cnt = [0, 0]; return (F) => { for (const n of [0, 1]) { const want = st[n] ? F[n] >= lo : F[n] > hi; if (want !== st[n]) { cnt[n]++; if (cnt[n] >= nDb) { st[n] = want; cnt[n] = 0; } } else cnt[n] = 0; } return st.slice(); }; }
// per-step metrics of one run record (out = abi1_run output)
export function analyze(out) { const X = runnerCtx(), { B, ctrl, M, nb } = X, track = supportTracker(M), rows = [];
  for (const r of out.recs) { const S = r.S.slice(0, nb), ch = r.chars.runner, F = [ch.feet.L / H, ch.feet.R / H], sup = track(F), { c, v } = comOf(S, B), w0 = Math.sqrt(G / Math.max(0.3, c[1])), xi = [c[0] + v[0] / w0, c[2] + v[2] / w0];
    const polys = [0, 1].map(n => ctrl.footPoly(S, n)), supIdx = [0, 1].filter(n => sup[n]), bos = supIdx.length ? hull2(supIdx.flatMap(n => polys[n]).map(([x, z]) => [x, 0, z])) : null;
    const dOut = bos ? -polyDist(bos, xi) : Infinity;   // polyDist is signed (+ inside)
    const pel = S[X.idx.pelvis], tho = S[X.idx.thorax], up = (q) => Q.rot(q, [0, 1, 0]), fwd = (q) => Q.rot(q, [0, 0, 1]);
    const L = S.reduce((s, b, i) => V.add(s, V.add(V.cross(V.sub(b.com, c), V.sc(V.sub(b.v, v), B[i].mass)), PL.IL.mat3vec(PL.MC.Iworld(b.rot, B[i].inertia), b.w))), [0, 0, 0]);
    rows.push({ n: r.n, t: r.t, F, sup, c, v, xi, dOut, bos, pelUp: up(pel.rot), thoUp: up(tho.rot), pelFwd: fwd(pel.rot), L, footR: S[X.idx.foot_R].pos, footL: S[X.idx.foot_L].pos }); }
  return rows; }

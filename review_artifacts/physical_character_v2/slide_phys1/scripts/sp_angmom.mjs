// SLIDE-PHYS-1 whole-body angular momentum about the COM (exact from body states) and the moment about the COM of every turf contact impulse,
// per body — where the pitch / roll / yaw momentum comes from. usage: node sp_angmom.mjs --rec rec.json.gz [--every 6] [--T 0.6]
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, M, G } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export function angMom(S) { let com = [0, 0, 0], P = [0, 0, 0]; S.forEach((b, i) => { com = V.add(com, V.sc(b.com, B[i].mass)); P = V.add(P, V.sc(b.v, B[i].mass)); }); com = V.sc(com, 1 / M); const vc = V.sc(P, 1 / M);
  let Lc = [0, 0, 0]; S.forEach((b, i) => { const Iw = L.IL.mat3vec(L.IL.MC.Iworld(b.rot, B[i].inertia), b.w); Lc = V.add(Lc, V.add(V.cross(V.sub(b.com, com), V.sc(V.sub(b.v, vc), B[i].mass)), Iw)); }); return { com, vc, Lc }; }
if (process.argv[1] && process.argv[1].endsWith("sp_angmom.mjs")) { const out = L.readGz(arg("rec")), ev = +arg("every", "6"), T = +arg("T", "0.6"), cum = {};
  console.log("t      Lx(pitch,+fwd)  Ly(yaw)  Lz(roll,+left)  | cumulative contact moment x about COM per body (N·m·s)");
  out.recs.forEach((r, n) => { const S = r.S.slice(0, B.length), A = angMom(S);
    for (const ct of r.contacts) { if (!ct.kind.startsWith("turf")) continue; const side = ct.a === "turf" ? ct.b : ct.a, sg = ct.a === "turf" ? 1 : -1, Jw = V.sc(ct.J2, sg), p = ct.friction ? ct.friction.at : ct.points[0].p;
      // moment of the full impulse about the COM: Σ points normal impulses at their points + friction at its point (approximate: total at the first point)
      let H = [0, 0, 0]; for (const q of ct.points) H = V.add(H, V.cross(V.sub(q.p, A.com), V.sc([0, 1, 0], q.lam))); if (ct.friction) H = V.add(H, V.cross(V.sub(ct.friction.at, A.com), V.sc(ct.friction.J, sg)));
      const nm = side[1]; cum[nm] = V.add(cum[nm] || [0, 0, 0], H); }
    if (n % ev === 0 && r.t <= T) console.log(r.t.toFixed(3), A.Lc.map(x => x.toFixed(1).padStart(8)).join(" "), " |", Object.entries(cum).map(([k, v]) => `${k}:${v[0].toFixed(1)}`).join(" ")); }); }

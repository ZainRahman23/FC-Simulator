const L = await import(process.cwd() + "/review_artifacts/physical_character_v2/pi1/scripts/compat_lib.mjs");
const { V, Q, B, bi, loadAir, m2p, m2q, rawRotations, Z0 } = L;
const [dir, cs, r0, r1, sd] = process.argv.slice(2), R = loadAir(dir, `${cs}_LOCO.json.gz`);
const D = 180 / Math.PI; let prev = null;
for (let k = +r0; k <= +r1; k++) { const w = R.pres[k].world, rr = rawRotations(R.bones, R.bind, w, {}), rk = rawRotations(R.bones, R.bind, w, { rk: true }), idx = rr.idx;
  const H = m2p(w[idx["thigh_" + sd]]), K = m2p(w[idx["shin_" + sd]]), A = m2p(w[idx["foot_" + sd]]), u = V.norm(V.sub(K, H)), wv = V.norm(V.sub(A, K));
  const xr = Q.rot(rr.raw[bi("thigh_" + sd)], [1, 0, 0]), xrP = V.norm(V.sub(xr, V.sc(u, V.dot(xr, u)))), cr = V.cross(u, wv), n = V.len(cr) > 1e-9 ? V.norm(cr) : xrP;
  const outOfPlane = Math.asin(Math.max(-1, Math.min(1, V.dot(wv, xr)))) * D;   // rig shin direction's component along the rig thigh's flexion axis = rig knee "varus / out-of-hinge" angle
  const nAng = Math.acos(Math.max(-1, Math.min(1, Math.abs(V.dot(n, xrP))))) * D, sgn = Math.sign(V.dot(n, xrP));
  const qRig = rr.raw[bi("thigh_" + sd)], qRK = rk.raw[bi("thigh_" + sd)], tw = L.swingTwist(qRig, qRK, [0, -1, 0]).twist, info = rk.info[sd];
  console.log(`row ${k} bend ${info.bendDeg.toFixed(1).padStart(5)} rigOutOfHinge ${outOfPlane.toFixed(2).padStart(6)} plane-vs-rigAxis ${nAng.toFixed(1).padStart(5)} sgn ${sgn} RKthighTwist ${tw.toFixed(2).padStart(6)} d/frame ${(prev == null ? 0 : tw - prev).toFixed(2).padStart(6)} contact ${R.pres[k].feet[sd === "L" ? 0 : 1].contact ? R.pres[k].feet[sd === "L" ? 0 : 1].mode : "-"}`); prev = tw; }

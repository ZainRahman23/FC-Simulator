// physchar2/tools/b_native/scan_poses.mjs — INVESTIGATION B: pose sets for the native batch scanner b_scan (float32 bit patterns). DIAGNOSTIC.
// usage: node tools/b_native/scan_poses.mjs <out.txt> --set=near|flush|random [--fixtures=a.json,b.json --human=V2-REF --n=100000 --turf=50,1,50 --seed=1]
//   near   = micro-perturbations of each fixture's exact transform (b_narrow.mjs --dump): vertical ulp scan, random µm / 0.1 µm moves, fine yaw
//   flush  = a random face of a random boot piece exactly parallel to the turf, gap ∈ [−5, +5] mm, any yaw, anywhere in ±3 m (resting-type)
//   random = any orientation, lowest point ∈ [−3, +8] mm, anywhere in ±3 m
import fs from "fs";
const P2 = new URL("../..", import.meta.url).pathname;
const { V, Q } = await import(P2 + "core/v2_math.js");
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
const outF = process.argv[2], set = arg("set", "near"), N = +arg("n", 100000), turf = arg("turf", "50,1,50").split(",").map(Number);
let seed = +arg("seed", 1); const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
const fb = new Float32Array(1), ub = new Uint32Array(fb.buffer), b = (x) => { fb[0] = x; return ub[0]; }, fr = Math.fround;
const hulls = [], queries = []; const addQ = (h, q, p) => queries.push([h, ...q.map(b), ...p.map(b)].join(" "));
if (set === "near") { for (const f of arg("fixtures", "").split(",").filter(Boolean)) { const d = JSON.parse(fs.readFileSync(f)), hi = hulls.length; hulls.push({ pts: d.points, cr: d.cr, ht: d.hullTol || 0 });
    for (let k = -3000; k <= 3000; k += 5) { fb[0] = d.p[1]; ub[0] += k; addQ(hi, d.q, [d.p[0], fb[0], d.p[2]]); }                                   // vertical ulps
    for (const eps of [1e-7, 1e-6, 3e-6]) for (let k = 0; k < 1000; k++) { const p = V.add(d.p, [(rnd() * 2 - 1) * eps, (rnd() * 2 - 1) * eps, (rnd() * 2 - 1) * eps]), q = Q.norm(Q.mul(Q.axis(V.norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]), (rnd() * 2 - 1) * eps), d.q)); addQ(hi, q, p); }
    for (let k = -500; k <= 500; k++) addQ(hi, Q.norm(Q.mul(Q.axis([0, 1, 0], k * 1e-4 * Math.PI / 180), d.q)), d.p); } }                       // yaw ±0.05° in 1e-4°
else { const { generateSpec } = await import(P2 + "spec/v2_spec.js"); const H = await import(P2 + "spec/v2_human.js"), spec = generateSpec(H.VARIATION_SET.find(h => h.id === arg("human", "V2-REF")));
  const foot = spec.bodies.find(x => x.name === "foot_R"); for (const sh of foot.shapes) hulls.push({ pts: sh.points, cr: sh.cr, ht: sh.hullTol || 0 });
  const faces = (pts) => { const F = [], key = new Set(); for (let a = 0; a < pts.length; a++) for (let c1 = a + 1; c1 < pts.length; c1++) for (let c2 = c1 + 1; c2 < pts.length; c2++) {
      let n = V.cross(V.sub(pts[c1], pts[a]), V.sub(pts[c2], pts[a])); const l = V.len(n); if (l < 1e-9) continue; n = V.sc(n, 1 / l); let dd = V.dot(n, pts[a]), pos = 0, neg = 0;
      for (const q of pts) { const e = V.dot(n, q) - dd; if (e > 1e-7) pos++; else if (e < -1e-7) neg++; } if (pos && neg) continue; if (pos) { n = V.sc(n, -1); dd = -dd; } const k = n.map(x => Math.round(x * 1e5)).join(","); if (!key.has(k)) { key.add(k); F.push({ n, d: dd }); } } return F; };
  const rotTo = (a, c) => { const x = V.cross(a, c), dd = V.dot(a, c); if (dd < -0.999999) return Q.axis(Math.abs(a[0]) < 0.9 ? V.norm(V.cross(a, [1, 0, 0])) : V.norm(V.cross(a, [0, 1, 0])), Math.PI); return Q.norm([x[0], x[1], x[2], 1 + dd]); };
  // each hull's centre of mass as Jolt computes it (the query transform is the hull's COM frame, as in b_narrow.mjs)
  const { loadJolt } = await import(P2 + "core/v2_jolt.js"), J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js");
  const hullCom = hulls.map(h => { const hs = new J.ConvexHullShapeSettings(); for (const p of h.pts) hs.mPoints.push_back(new J.Vec3(p[0], p[1], p[2])); hs.mMaxConvexRadius = h.cr; if (h.ht) hs.mHullTolerance = h.ht; const c = hs.Create().Get().GetCenterOfMass(); return [c.GetX(), c.GetY(), c.GetZ()]; });
  const PF = hulls.map(h => faces(h.pts));
  for (let k = 0; k < N; k++) { const hi = Math.floor(rnd() * hulls.length), h = hulls[hi], x = (rnd() * 2 - 1) * 3, z = (rnd() * 2 - 1) * 3; let q, org;
    if (set === "flush") { const fl = PF[hi], fc = fl[Math.floor(rnd() * fl.length)], gap = (rnd() * 2 - 1) * 0.005; q = Q.norm(Q.mul(Q.axis([0, 1, 0], rnd() * 2 * Math.PI), rotTo(fc.n, [0, -1, 0]))); org = [x, gap + fc.d, z]; }
    else { q = Q.norm(Q.mul(Q.axis(V.norm([rnd() * 2 - 1, 0, rnd() * 2 - 1]), rnd() * Math.PI), Q.axis([0, 1, 0], rnd() * 2 * Math.PI))); const low = Math.min(...h.pts.map(p => Q.rot(q, p)[1])); org = [x, -0.003 + rnd() * 0.011 - low, z]; }
    addQ(hi, q, V.add(org, Q.rot(q, hullCom[hi]))); } }   // COM frame: world = R·(p − c) + T with T = org + R·c
const L = [String(hulls.length)]; for (const h of hulls) { L.push(String(h.pts.length)); for (const p of h.pts) L.push(p.map(x => b(fr(x))).join(" ")); L.push([b(h.cr), b(h.ht)].join(" ")); }
L.push([...turf.map(b), b(0.02)].join(" ")); L.push(String(queries.length)); for (const q of queries) L.push(q); fs.writeFileSync(outF, L.join("\n") + "\n"); console.log(`${set}: ${hulls.length} hulls, ${queries.length} queries → ${outF}`);

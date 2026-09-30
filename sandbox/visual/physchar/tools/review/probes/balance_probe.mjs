// READ-ONLY analysis of recorded Gate B runs: COM, XCoM / capture point, support polygon from turf contacts, margin of stability,
// net GRF + CoP from centroidal dynamics (finite differences), friction use, support-force share. No controller, no code changes.
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TESTS = process.argv[3].split(",");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateb.js"); const { Q, V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), M = spec.totalMass, g = 9.81, dt = 1 / 240;
const hull = (P) => { const p = P.map(q => [q[0], q[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
const sd = (poly, x) => { if (poly.length < 3) return -1; let inside = true, dmin = 1e9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], e = [b[0] - a[0], b[1] - a[1]], w = [x[0] - a[0], x[1] - a[1]];
  const t = Math.max(0, Math.min(1, (w[0] * e[0] + w[1] * e[1]) / (e[0] * e[0] + e[1] * e[1]))), d = Math.hypot(w[0] - t * e[0], w[1] - t * e[1]); dmin = Math.min(dmin, d); if (e[0] * w[1] - e[1] * w[0] < 0) inside = false; } return inside ? dmin : -dmin; };
for (const key of TESTS) {
  const r = G.runTest(J, spec, key, { keepStates: true, seconds: +(process.argv[5] || 0) || undefined }), R = r.recs;
  const A = R.map(rec => { let c = [0, 0, 0], v = [0, 0, 0], Lm = [0, 0, 0]; rec.states.forEach((s, i) => { c = V.add(c, V.sc(s.com, spec.bodies[i].mass)); v = V.add(v, V.sc(s.v, spec.bodies[i].mass)); }); c = V.sc(c, 1 / M); v = V.sc(v, 1 / M);
    rec.states.forEach((s, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(s.rot), s.w), Lw = Q.rot(s.rot, [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]]); Lm = V.add(Lm, V.add(Lw, V.sc(V.cross(V.sub(s.com, c), s.v), b.mass))); });
    const pts = []; for (const k of rec.cts) { const oth = k.a === -1 ? k.b : k.b === -1 ? k.a : null; if (oth == null || oth < 0) continue; if (k.depth > -0.001) pts.push(...k.pts); }
    const feetOnly = []; for (const k of rec.cts) { const oth = k.a === -1 ? k.b : k.b === -1 ? k.a : null; if (oth == null || oth < 0 || !/^foot_/.test(spec.bodies[oth].name)) continue; if (k.depth > -0.001) feetOnly.push(...k.pts); }
    const w0 = Math.sqrt(g / c[1]), xi = [c[0] + v[0] / w0, c[2] + v[2] / w0], poly = hull(feetOnly);
    return { t: rec.t, c, v, Lm, xi, poly, npts: feetOnly.length, other: pts.length - feetOnly.length, marginXi: sd(poly, xi), marginCom: sd(poly, [c[0], c[2]]), sup: rec.sup, imp: rec.imp };
  });
  // centroidal dynamics: F_grf = M a_com − M g − F_support − impulses/dt ; CoP from dL/dt = (p − c) × F
  const W = 3; const out = [];
  for (let i = W; i < A.length - W; i++) { const a = V.sc(V.sub(A[i + W].v, A[i - W].v), 1 / (2 * W * dt)), dL = V.sc(V.sub(A[i + W].Lm, A[i - W].Lm), 1 / (2 * W * dt));
    let F = V.sub(V.sc(a, M), [0, -g * M, 0]); let sup = [0, 0, 0]; for (let k = i - W; k <= i + W; k++) if (A[k].sup) sup = V.add(sup, V.sc(A[k].sup.F, 1 / (2 * W + 1))); F = V.sub(F, sup);
    const hasImp = A.slice(i - W, i + W + 1).some(q => q.imp); const c = A[i].c; let cop = null;
    if (!hasImp && F[1] > 50) { const rz = (-c[1] * F[2] - dL[0]) / F[1], rx = (dL[2] - c[1] * F[0]) / F[1]; cop = [c[0] + rx, c[2] + rz]; }
    out.push({ ...A[i], F, cop, copMargin: cop ? sd(A[i].poly, cop) : null, fric: F[1] > 1 ? Math.hypot(F[0], F[2]) / (0.9 * F[1]) : null, supF: sup, hasImp }); }
  console.log(`\n=== ${key}  (${r.title})`);
  const firstXiOut = out.find(o => o.t > 0.3 && o.marginXi < 0), firstComOut = out.find(o => o.t > 0.3 && o.marginCom < 0), firstOther = out.find(o => o.other > 0);
  console.log(`XCoM first leaves the FOOT polygon: ${firstXiOut ? firstXiOut.t.toFixed(3) + " s" : "never"} · COM projection leaves: ${firstComOut ? firstComOut.t.toFixed(3) + " s" : "never"} · first non-foot body on turf: ${firstOther ? firstOther.t.toFixed(3) + " s" : "never"}`);
  const steady = out.filter(o => o.cop && o.t > 0.3 && !o.hasImp && o.marginCom > 0);
  if (steady.length) { const ins = steady.filter(o => o.copMargin >= -0.005).length; console.log(`CoP estimate inside foot polygon (±5 mm) on ${(100 * ins / steady.length).toFixed(1)}% of ${steady.length} valid steps · mean |ΣF_y − Mg| ${(steady.reduce((s, o) => s + Math.abs(o.F[1] + o.supF[1] - M * g), 0) / steady.length).toFixed(1)} N (incl. support) · max friction use ${(Math.max(...steady.map(o => o.fric || 0)) * 100).toFixed(1)}%`); }
  for (const t of (process.argv[4] || "0.5,1.0,1.1,1.25,1.5,2,3,4,5,5.5,6").split(",").map(Number)) { const o = out.find(q => Math.abs(q.t - t) < 0.003); if (!o) continue;
    console.log(`t ${o.t.toFixed(2)}  COM [${o.c.map(x => x.toFixed(3))}] v [${o.v.map(x => x.toFixed(2))}]  XCoM [${o.xi.map(x => x.toFixed(3))}] margin(XCoM) ${(o.marginXi * 1000).toFixed(0)} mm (COM ${(o.marginCom * 1000).toFixed(0)} mm)  feet pts ${o.npts}  CoP ${o.cop ? "[" + o.cop.map(x => x.toFixed(3)) + "] margin " + (o.copMargin * 1000).toFixed(0) + " mm" : "-"}  GRF [${o.F.map(x => x.toFixed(0))}] N  support [${o.supF.map(x => x.toFixed(0))}] N`); }
  // support impulse share after a disturbance
  if (r.disturbance) { const t0 = r.disturbance.at; let Jsup = [0, 0, 0]; for (const o of A) if (o.t > t0 && o.t < t0 + 0.6 && o.sup) Jsup = V.add(Jsup, V.sc(o.sup.F, dt));
    const minM = Math.min(...out.filter(o => o.t > t0 && o.t < t0 + 1.5).map(o => o.marginXi)); console.log(`disturbance ${r.disturbance.impulseNs} N·s: support impulse over the next 0.6 s = [${Jsup.map(x => x.toFixed(1))}] N·s (|${Math.hypot(...Jsup).toFixed(1)}|) · min XCoM margin in 1.5 s = ${(minM * 1000).toFixed(0)} mm`); }
}

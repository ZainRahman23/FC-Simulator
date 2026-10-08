const P = process.cwd() + "/sandbox/visual/physchar2/";
const { loadJolt } = await import(P + "core/v2_jolt.js"), { e2Spec, CFG } = await import(P + "gates/v2_e2.js"), { G2Sim } = await import(P + "gates/v2_g2.js");
const { V, Q, unitStates, unitEv } = await import(P + "core/v2_math.js"), { bootSole, hull2 } = await import(P + "sim/v2_geom.js");
const J = await loadJolt(P + "vendor/jolt-physics.wasm-compat.js"), D = Math.PI / 180;
const spec = e2Spec("V2-REF"), s = new G2Sim(J, spec, { title: "x", seconds: 1 }, { stand: { ikRefTwist: true, lifecycle: true, ...CFG.PSTAR5CHABV }, passiveOpts: { kneeModel: "v2k" } });
const C = s.ctrl, st = unitStates(s.st), ev = unitEv(s.up.ev), B = spec.bodies, pel0 = st[C.pelvis], hipMid = V.sc(V.add(C.jointAt(st, C.hipK[0]), C.jointAt(st, C.hipK[1])), 0.5);
const sole = C.feet.map(f => { const sb = bootSole(B[f]), h = hull2(sb.pts), zs = h.map(p => p[1]), xs = h.map(p => p[0]), cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { c: [cx, sb.y0, zs.reduce((a, b) => a + b, 0) / zs.length], heel: [cx, sb.y0, Math.min(...zs)], toe: [cx, sb.y0, Math.max(...zs)] }; });
function footPose(n, fwd, th = 0, pivot = null) { const f = st[C.feet[n]], R0 = f.rot, cW = V.add(f.pos, Q.rot(R0, sole[n].c)); let pos = V.add(f.pos, [0, 0, hipMid[2] + fwd - cW[2]]); if (!th) return { pos, rot: R0 };
  const pw = V.add(pos, Q.rot(R0, sole[n][pivot])), a = Q.rot(R0, [1, 0, 0]), other = pivot === "heel" ? "toe" : "heel";
  for (const sg of [1, -1]) { const q = Q.axis(a, sg * th), p2 = V.add(pw, Q.rot(q, V.sub(pos, pw))), r2 = Q.norm(Q.mul(q, R0)); if (V.add(p2, Q.rot(r2, sole[n][other]))[1] > pw[1] + 1e-6) return { pos: p2, rot: r2 }; } }
const ok = (n, dh, pose, lim) => C.legIKBounded(st, ev, n, V.add(pel0.pos, [0, dh, 0]), pel0.rot, pose, { limits: lim, fallback: "none" }).err <= 1e-6;
for (const lim of ["soft", "hard"]) { console.log("== limits", lim);
  for (let k = 0; k <= 30; k += 2) { const dh = -0.01 * k; const res = [0, 1].map(n => {
      let fr = null, bk = null, mid = ok(n, dh, footPose(n, 0), lim);
      for (let x = 0; x <= 0.7; x += 0.01) { const good = [0, 5, 10, 15, 20].some(a => ok(n, dh, footPose(n, x, a * D, "heel"), lim)); if (good) fr = +x.toFixed(2); else if (fr != null) break; }
      for (let x = 0; x <= 0.7; x += 0.01) { const good = [0, 10, 20, 30, 40].some(a => ok(n, dh, footPose(n, -x, a * D, "toe"), lim)); if (good) bk = +x.toFixed(2); else if (bk != null) break; }
      return { mid, fr, bk }; });
    console.log(dh.toFixed(2), JSON.stringify(res)); } }

// OUTFIELD RIG VALIDATION (node, no browser): loads the plain-script modules into one VM context and runs, for every generic body,
// the bind-pose checks, the morphology signature, and the diagnostic motion set (stand / ready / walk / run / turn / single-leg /
// punt) through the retarget + contact solve, measuring foot slide, sole float / penetration, knee / elbow limits, joint jumps
// (discontinuities), skin edge stretch (tearing) and morphology retention. Deterministic; writes a JSON report.
//   node of_validate.js --out <json> [--ticks 240]
const fs = require("fs"), path = require("path"), vm = require("vm");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; }; const OUT = opt("--out", "of_validate.json"), TICKS = +opt("--ticks", 240);
const ROOT = path.resolve(__dirname, "../../anim3d");
const ctx = { console, Math, performance: { now: () => Date.now() }, Float32Array, Int32Array, Uint16Array, Map, Set, Object, Array, Number, JSON };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["m4.js", "skeleton.js", "skin_mesh.js", "ik.js", "gk_motion_library.js", "of_rig.js", "of_motion.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
// helpers the modules expect from gk_graph.js / match.js (root matrix, clamp/lerp/smooth); defined only if the modules did not
vm.runInContext(`
  if (typeof clamp01 === "undefined") globalThis.clamp01 = (x) => Math.max(0, Math.min(1, x));
  if (typeof lerp === "undefined") globalThis.lerp = (a, b, t) => a + (b - a) * t;
  if (typeof smooth01 === "undefined") globalThis.smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  if (typeof gkRootMatrix === "undefined") globalThis.gkRootMatrix = function (px, py, f, dz) { const m = M4.ident(); const right = [-Math.sin(f), 0, -Math.cos(f)], up = [0, 1, 0], fwd = [Math.cos(f), 0, -Math.sin(f)]; m[0] = right[0]; m[1] = right[1]; m[2] = right[2]; m[4] = up[0]; m[5] = up[1]; m[6] = up[2]; m[8] = fwd[0]; m[9] = fwd[1]; m[10] = fwd[2]; m[12] = px; m[13] = dz || 0; m[14] = -py; return m; };
`, ctx);
const R = vm.runInContext(`(function (TICKS) {
  const report = { bodies: {}, motions: ["STAND", "READY", "WALK", "RUN", "TURN", "SINGLE_LEG", "PUNT"], ticks: TICKS };
  for (const id of OF_BODY_ORDER) {
    const skel = ofBuildSkeleton(OF_BODIES[id]); const rig = ofValidateRig(skel); const mesh = skinBuildMesh(skel); const bindFk = skelFK(skel, {}, M4.ident()); const sig0 = ofMorphSignature(skel, bindFk);
    const body = { rig, mesh: { verts: mesh.nVerts, tris: mesh.nTris }, bindSignature: sig0, motions: {} };
    for (const mo of report.motions) {
      const act = ofActorMake(id, 100, 34, Math.PI); act.motion = mo === "WALK" || mo === "RUN" || mo === "TURN" ? "LOCO" : mo; const dt = 1 / 60; let t = 0;
      const m = { slideMax: 0, floatMax: 0, penMax: 0, kneeMin: 999, elbowMin: 999, jumpMax: 0, overReachMax: 0, stretchMax: 0, groundLiftMax: 0, legFloor: 0, sigDrift: 0, plantResMax: 0, nan: false, strides: [] };
      let lastPlantR = null;
      for (let k = 0; k < TICKS; k++) {
        const speed = mo === "WALK" ? 1.4 : mo === "RUN" ? 6.0 : mo === "TURN" ? 1.2 : 0; act.speed = speed;
        if (mo === "TURN") act.facing = Math.PI + Math.sin(t * 1.2) * 1.2;                                   // the authoritative facing turns; the body follows
        act.x -= Math.cos(act.facing) * speed * dt * -1; act.y -= Math.sin(act.facing) * speed * dt * -1;       // authoritative displacement along the facing (a simple mover)
        const sol = ofActorTick(act, dt, t); t += dt; const d = sol.diag;
        for (const sd of ["R", "L"]) { const f = d.feet[sd]; if (f.locked) { m.slideMax = Math.max(m.slideMax, f.slide); m.plantResMax = Math.max(m.plantResMax, f.residual); m.overReachMax = Math.max(m.overReachMax, f.overReach); } if (f.soleY < 0) m.penMax = Math.max(m.penMax, -f.soleY); if (f.locked && f.soleY > 0) m.floatMax = Math.max(m.floatMax, f.soleY); m.kneeMin = Math.min(m.kneeMin, d.knee[sd]); m.elbowMin = Math.min(m.elbowMin, d.elbow[sd]); }
        if (k > 0) m.jumpMax = Math.max(m.jumpMax, d.jump); m.groundLiftMax = Math.max(m.groundLiftMax, d.ground || 0); if (d.legFloor) m.legFloor++;
        if (sol.fk.joint.some(q => q.some(v => !isFinite(v)))) m.nan = true;
        if (k % 20 === 0) { const sc = ofSkinCheck(skel, mesh, sol.fk); m.stretchMax = Math.max(m.stretchMax, sc.maxEdgeStretch); const sg = ofMorphSignature(skel, sol.fk); for (const q of ["thigh", "shin", "upperArm", "foreArm", "shoulders", "hips"]) m.sigDrift = Math.max(m.sigDrift, Math.abs(sg[q] - sig0[q])); }
        if (act.state.feet.R && act.state.feet.R.locked && act.state.feet.R.P) { const P = act.state.feet.R.P; if (!lastPlantR || Math.hypot(P[0] - lastPlantR[0], P[2] - lastPlantR[2]) > 0.05) { if (lastPlantR) m.strides.push(+Math.hypot(P[0] - lastPlantR[0], P[2] - lastPlantR[2]).toFixed(3)); lastPlantR = P.slice(); } }
      }
      m.strideMean = m.strides.length ? +(m.strides.reduce((x, y) => x + y, 0) / m.strides.length).toFixed(3) : null; m.gait = act.gait ? { stride: +act.gait.stride.toFixed(3), cadence: +act.gait.cadence.toFixed(3), A: act.gait.A } : null; delete m.strides;
      for (const q in m) if (typeof m[q] === "number") m[q] = +m[q].toFixed(4);
      body.motions[mo] = m;
    }
    report.bodies[id] = body;
  }
  return report;
})(${TICKS})`, ctx);
fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
for (const id of Object.keys(R.bodies)) { const b = R.bodies[id]; console.log(id, "rig", b.rig.ok ? "OK" : "FAIL " + JSON.stringify(Object.entries(b.rig.checks).filter(([k, v]) => !v.ok)), JSON.stringify(b.rig.summary), "mesh", b.mesh.verts, "verts");
  for (const mo of R.motions) { const m = b.motions[mo]; console.log("   ", mo.padEnd(10), "slide", m.slideMax, "float", m.floatMax, "pen", m.penMax, "kneeMin", m.kneeMin, "elbowMin", m.elbowMin, "jump", m.jumpMax, "overReach", m.overReachMax, "stretch", m.stretchMax, "sigDrift", m.sigDrift, "stride", m.strideMean, m.gait ? "gait " + m.gait.stride + "/" + m.gait.cadence : "", m.nan ? "NAN" : ""); } }

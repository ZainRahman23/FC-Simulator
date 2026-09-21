// MOTION EXPORT (generic, review tooling): the complete deterministic solved-pose sequence of ONE goalkeeper fixture through the
// SKELETAL_3D backend — the exact skeleton (bind pose, inverse bind), the per-tick authoritative facts (simulation root, facing,
// commit, contact, ball position + velocity, held flag, IK targets) and the per-tick solved presentation (phase, presentation root,
// root matrix, pose eulers, every bone's world matrix AFTER IK / look-at — the matrices the skinned mesh is drawn with — joints,
// tips, screen positions) plus the exact camera (authored basis, rig state per tick, GL view / projection matrices) and the
// renderer settings. Machine-readable input for a character / rendering pipeline experiment; nothing here writes gk / ball state.
//   node gk3d_export_motion.js --scenario 42 [--ticks 320] [--out motion_42.json] [--variant tall|short|skin2|jersey2] [--character SKINNED|MANNEQUIN] [--url ...] [--udd ...]
// The rig follows the ball every tick exactly as the capture tool does (updateRig + TRAVEL), so screen coordinates match the
// gameplay-camera captures made with capture.js on the same fixture.
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const IDX = +opt("--scenario", 42), TICKS = +opt("--ticks", 320), OUT = opt("--out", "motion_" + IDX + ".json"), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), UDD = opt("--udd", "chrome-export"), VARIANT = opt("--variant", ""), CHARACTER = opt("--character", "");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: UDD, args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?gkBackend=3d&r=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
  for (let i = 0; i < 900; i++) { const ok = await p.evaluate(() => { const el = document.getElementById("loading"); return !!(el && el.style.display === "none" && typeof ptEnter === "function"); }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
  const out = await p.evaluate((IDX, TICKS, VARIANT, CHARACTER) => {
    if (!(S.pt && S.pt.on)) ptEnter(); S.pb.playing = false; GK_PRESENTATION.set("SKELETAL_3D");
    if (VARIANT) GK3D.variant = VARIANT; if (CHARACTER) GL3D.character = CHARACTER;
    ptReset(); ptGkScenario(IDX); gkAnimResetView(); gk3dReset(); S.pt.paused = true;
    const r5 = (v) => +v.toFixed(5), r3 = (v) => +v.toFixed(3), A5 = (arr) => Array.from(arr).map(r5), pitch = (w) => [r5(w[0]), r5(-w[2]), r5(w[1])];   // GL (x, height, z) → pitch (x, y, z-height)
    const rows = []; let sk = null, commitRec = null, contactRec = null;
    for (let k = 0; k < TICKS; k++) {
      ptStep(); updateRig(1 / 60, null); TRAVEL = RIG.x - 52.5; gkPresentationDraw(S.pt, S.pt.gk, 1 / 60);
      const L = GK3D.last, g = L.g, d = L.desc, gk = S.pt.gk, bb = S.pt.b, fk = L.sol.fk, cur = S.gkAnim.cur || {}; sk = GK3D.skel;
      if (gk.committed && !commitRec) commitRec = JSON.parse(JSON.stringify(gk.committed)); if (gk.contact && !contactRec) contactRec = JSON.parse(JSON.stringify(gk.contact));
      const bones = {}; for (const bn of sk.bones) bones[bn.name] = { world: A5(fk.world[bn.idx]), joint: pitch(fk.joint[bn.idx]), tip: pitch(fk.tip[bn.idx]) };
      const pose = {}; for (const bn in g.pose) if (bn[0] !== "_" && bn !== "name") pose[bn] = g.pose[bn].map(v => +v.toFixed(2));
      const sp = sproj3(gk.x, 0, gk.y), bs = sproj3(bb.x, bb.z, bb.y);
      rows.push({ tick: k, t: r5(S.pt.now), phase: g.phase, sub: g.sub, mode: g.mode, motion: g.motion, side: g.side, landedSide: g.landedSide, reachHand: g.reachHand, ikW: r3(g.ikW), clipT: g.clipT != null ? r3(g.clipT) : null,
        simRoot: [r5(gk.x), r5(gk.y)], simVel: [r3(gk.vx), r3(gk.vy)], simFacingDeg: r3(gk.facing * 180 / Math.PI), presFacingDeg: r3(g.facing * 180 / Math.PI), presRoot: [r5(g.pres.x), r5(g.pres.y)], presOffsetM: r3(g.pres.dm),
        rootMatrix: A5(g.rootM), pelvisOffsetLocal: (g.pose._pelvis || [0, 0, 0]).map(r5), pelvisWorld: pitch(fk.joint[sk.byName.pelvis.idx]),
        simHandTarget: gk.handNow ? gk.handNow.map(r5) : null, legTip: gk.legTipNow ? gk.legTipNow.map(r5) : null, gloveResidualM: L.sol.diag.ik ? r3(L.sol.diag.ik.residual) : null, legTipResidualM: L.sol.diag.legTip ? r3(L.sol.diag.legTip.residual) : null,
        ball: [r5(bb.x), r5(bb.y), r5(bb.z)], ballVel: [r3(bb.vx), r3(bb.vy), r3(bb.vz)], held: !!(bb.held === "GK"), ballCtrl: !!bb.ctrl, renderedBall: GK3D.ballPres ? { p: GK3D.ballPres.p.map(r5), r: GK3D.ballPres.r, drawn3d: GK3D.ballPres.drawn3d, pres: GK3D.ballPres.pres } : null,
        shotActive: !!gk.shotActive, gkState: gk.state, gkPhase: gk.phase || null, resolverState: cur.state || null, isContactTick: !!(gk.contact && Math.round(gk.contact.tickT * 60) === Math.round(S.pt.now * 60)),
        feet: { R: L.sol.diag.feet.R ? { locked: !!L.sol.diag.feet.R.locked, w: L.sol.diag.feet.R.w || 0, plant: L.sol.diag.feet.R.P ? pitch(L.sol.diag.feet.R.P) : null } : null, L: L.sol.diag.feet.L ? { locked: !!L.sol.diag.feet.L.locked, w: L.sol.diag.feet.L.w || 0, plant: L.sol.diag.feet.L.P ? pitch(L.sol.diag.feet.L.P) : null } : null },
        brace: g.brace || null, groundLiftM: L.sol.diag.ground || 0, torsoAssistDeg: L.sol.diag.torso || 0, lookDeg: L.sol.diag.look || 0,
        camera: { rigX: r5(RIG.x), travel: r5(TRAVEL), zoom: RIG.zoom }, keeperScreenPx: [r3(sp.x), r3(sp.y), r3(sp.d)], ballScreenPx: [r3(bs.x), r3(bs.y), r3(bs.d)],
        poseEulersDeg: pose, bones });
    }
    const cam = glCamera(cv.width, cv.height);
    const skeleton = { H: sk.H, prop: sk.prop, bindWidthM: sk.bindWidthM, boneOrder: sk.bones.map(b => b.name),
      bones: sk.bones.map(b => ({ name: b.name, index: b.idx, parent: b.parent ? b.parent.name : null, offsetLocal: b.off.map(r5), bindDirLocal: b.dir.map(r5), lengthM: r5(b.len), radiusM: r5(b.rad), part: b.part, children: b.children.map(c => c.name) })),
      inverseBind: sk.invBind.map(m => A5(m)), bindJointsCharacter: (function () { const f = skelFK(sk, {}, M4.ident()); const o = {}; for (const bn of sk.bones) o[bn.name] = { joint: f.joint[bn.idx].map(r5), tip: f.tip[bn.idx].map(r5) }; return o; })(),
      definitionTable: SKEL_DEF.map(r => ({ name: r[0], parent: r[1], offsetH: r[2], bindDir: r[3], lengthH: r[4], radiusM_at_1_88: r[5], part: r[6] })), parts: SKEL_PARTS, palette: GK3D.palette || SKEL_PARTS, variant: GK3D.variant, variantDef: GK3D.variants[GK3D.variant] || null };
    const camera = { authored: JSON.parse(JSON.stringify(S.author)), authorDefaults: AUTHOR_DEFAULTS, runtimeDefaults: RUNTIME_DEFAULTS, VIEW, RES, devicePixelRatio: window.devicePixelRatio, canvas: { width: cv.width, height: cv.height, cssWidth: cv.clientWidth, cssHeight: cv.clientHeight }, PROJ: { C: PROJ.C, f: PROJ.f, u: PROJ.u, r: PROJ.r, fpx: PROJ.fpx, czRef: PROJ.czRef }, PITCH, DEPTH_ALPHA, pxPerM: S.pxPerM, playerVScale: S.playerVScale, REF_ZOOM,
      rig: { x: RIG.x, mode: RIG.mode, zoom: RIG.zoom, travel: TRAVEL }, gl: { view: A5(cam.view), proj: A5(cam.proj), near: GL3D.near, far: GL3D.far, canvasW: cv.width, canvasH: cv.height } };
    const renderer = { GL3D: JSON.parse(JSON.stringify(GL3D)), GK3D: { variant: GK3D.variant, variants: GK3D.variants, ballNearM: GK3D.ballNearM, debug: GK3D.debug }, GK_GRAPH: { ballVisR: GK_GRAPH.ballVisR, handOff: GK_GRAPH.handOff, lookMaxDeg: GK_GRAPH.lookMaxDeg, presMaxM: GK_GRAPH.presMaxM }, GOALFX_ballR: GOALFX.ballR, SKIN_PARTS: typeof SKIN_PARTS !== "undefined" ? SKIN_PARTS : null, SKIN_STYLE: typeof SKIN_STYLE !== "undefined" ? SKIN_STYLE : null };
    return { scenario: IDX, name: GK_SCENARIOS[IDX].name, fixture: JSON.parse(JSON.stringify(GK_SCENARIOS[IDX])), ticksPerSecond: 60, ticks: TICKS, worldFrames: { pitch: "x east (goal line at x≈105), y north→south, z up; metres", gl3d: "x = pitch x, y = height, z = −pitch y (right-handed); character frame: +x = character's RIGHT, +y up, +z forward (facing)", facing: "world heading deg = atan2(dy, dx) in the pitch frame; the character's right = (−sin f, cos f)" },
      commit: commitRec, contact: contactRec, skeleton, camera, renderer, rows, errors: [] };
  }, IDX, TICKS, VARIANT, CHARACTER);
  out.errors = errs; fs.writeFileSync(OUT, JSON.stringify(out)); console.log("export", IDX, out.name, "rows", out.rows.length, "bones", out.skeleton.boneOrder.length, "commitTick", out.commit && Math.round(out.commit.t0 * 60), "contactTick", out.contact && Math.round(out.contact.tickT * 60), "errors", errs.length); await b.close();
})();

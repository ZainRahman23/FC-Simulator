// MOTION MANIFEST PROBE (Astra reference data): for each scenario, run the SKELETAL_3D backend and record, per tick, the
// authoritative facts (simulation root, facing, commit target, contact tick / point / hand, ball position) and the presentation
// result (motion id, phase, presentation root, per-bone pose eulers, per-joint world positions in pitch coordinates).
//   node gk_motion_manifest.js --out <json> --scenarios 42,10,... [--ticks 320] [--url ...]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "manifest.json"), IDXS = opt("--scenarios", "42").split(",").map(Number), TICKS = +opt("--ticks", 320), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), UDD = opt("--udd", "chrome-manifest");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: UDD, args: ["--no-sandbox"] });
  const out = {};
  for (const idx of IDXS) {                                                                       // ONE FRESH PAGE PER FIXTURE: page state (capability band, held ball, kick records) never leaks between fixtures
    const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
    await p.goto(URL + "?gkBackend=3d&r=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
    for (let i = 0; i < 900; i++) { const ok = await p.evaluate(() => { const el = document.getElementById("loading"); return !!(el && el.style.display === "none" && typeof ptEnter === "function"); }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
    out[idx] = await p.evaluate((idx, TICKS) => {
      if (!(S.pt && S.pt.on)) ptEnter(); S.pb.playing = false; GK_PRESENTATION.set("SKELETAL_3D"); ptReset(); ptGkScenario(idx); gkAnimResetView(); gk3dReset(); S.pt.paused = true;
      const rows = []; let sk = null; r3 = (v) => +v.toFixed(3), pitch = (w) => [r3(w[0]), r3(-w[2]), r3(w[1])];   // GL (x, height, z) → pitch (x, y, z-height)
      for (let k = 0; k < TICKS; k++) { ptStep(); gkPresentationDraw(S.pt, S.pt.gk, 1 / 60); const L = GK3D.last, g = L.g, d = L.desc, gk = S.pt.gk, fk = L.sol.fk, cur = S.gkAnim.cur || {}; sk = GK3D.skel;
        const joints = {}; for (const bn of sk.bones) joints[bn.name] = pitch(fk.joint[bn.idx]); joints["head_tip"] = pitch(fk.tip[sk.byName.head.idx]); joints["hand_R_tip"] = pitch(fk.tip[sk.byName.hand_R.idx]); joints["hand_L_tip"] = pitch(fk.tip[sk.byName.hand_L.idx]); joints["foot_R_tip"] = pitch(fk.tip[sk.byName.foot_R.idx]); joints["foot_L_tip"] = pitch(fk.tip[sk.byName.foot_L.idx]);
        const pose = {}; for (const bn in g.pose) if (bn[0] !== "_" && bn !== "name") pose[bn] = g.pose[bn].map(v => +v.toFixed(1));
        rows.push({ tick: k, t: r3(S.pt.now), motion: g.motion, phase: g.phase, sub: g.sub, mode: g.mode, side: g.side, landedSide: g.landedSide, reachHand: g.reachHand, twoHands: !!g.twoHands, ikW: r3(g.ikW), gloveResidual: L.sol.diag.ik ? r3(L.sol.diag.ik.residual) : null, legTipResidual: L.sol.diag.legTip ? r3(L.sol.diag.legTip.residual) : null,
          simRoot: [r3(gk.x), r3(gk.y)], simVel: [r3(gk.vx), r3(gk.vy)], facingDeg: r3(g.facing * 180 / Math.PI), presRoot: [r3(g.pres.x), r3(g.pres.y)], presOffsetM: r3(g.pres.dm),
          simHand: gk.handNow ? gk.handNow.map(r3) : null, legTip: gk.legTipNow ? gk.legTipNow.map(r3) : null, ball: d.ball ? d.ball.map(r3) : null, held: d.held, state: d.state, family: d.family, cls: cur.cls ? { hClass: cur.cls.hClass, lat: cur.cls.lat, z: cur.cls.z, norm: cur.cls.norm, feetPlanted: cur.cls.feetPlanted, goalSide: cur.cls.goalSide, saveDir: cur.cls.saveDir } : null,
          feet: { R: !!(L.sol.diag.feet.R && L.sol.diag.feet.R.locked), L: !!(L.sol.diag.feet.L && L.sol.diag.feet.L.locked) }, ballPres: GK3D.ballPres ? { p: GK3D.ballPres.p.map(r3), r: GK3D.ballPres.r, held: GK3D.ballPres.held, pres: GK3D.ballPres.pres, wB: GK3D.ballPres.wB, drawn3d: GK3D.ballPres.drawn3d } : null, hands: L.sol.hands ? { R: pitch(L.sol.hands.R), L: pitch(L.sol.hands.L) } : null, elbows: L.sol.elbows ? { R: pitch(L.sol.elbows.R), L: pitch(L.sol.elbows.L) } : null, holdRes: [L.sol.diag.hold_R, L.sol.diag.hold_L], spinePitch: (g.pose.pelvis ? g.pose.pelvis[0] : 0) + (g.pose.spine ? g.pose.spine[0] : 0) + (g.pose.chest ? g.pose.chest[0] : 0), pelvisWorld: pitch(fk.joint[sk.byName.pelvis.idx]), pelvisOffset: (g.pose._pelvis || [0, 0, 0]).map(r3), pose, joints }); }
      const gk = S.pt.gk, c = gk.committed;
      return { scenario: idx, name: GK_SCENARIOS[idx].name, skeletonHeightM: sk.H, boneOrder: sk.bones.map(b => b.name), commit: c ? { t0: c.t0, commitTick: Math.round(c.t0 * 60), execTime: c.execTime, tier: c.tier, action: c.action, target: c.target.map(v => +v.toFixed(3)), feet: c.feet.map(v => +v.toFixed(3)), handOrigin: c.handOrigin.map(v => +v.toFixed(3)), envNorm: c.envNorm, bestEffort: c.bestEffort, gather: !!c.gather } : null,
               contact: gk.contact ? { tickT: gk.contact.tickT, tick: Math.round(gk.contact.tickT * 60), volume: gk.contact.volume, surface: gk.contact.surface, outcome: gk.contact.outcome, held: gk.contact.held, point: gk.contact.point, root: gk.contact.root, twoHands: gk.contact.q ? gk.contact.q.two : null } : null, rows, asserts: GK3D.asserts.filter(x => x.bad) };
    }, idx, TICKS);
    console.log("manifest", idx, out[idx].name, "rows", out[idx].rows.length); await p.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(out)); await b.close();
})();

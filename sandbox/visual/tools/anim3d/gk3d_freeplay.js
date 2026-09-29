// FREE-PLAY VALIDATION of the skeletal goalkeeper motion library on the production path: seeded shots through the real kick
// pipeline (ptChargeBegin / ptChargeRelease → ptKick), ONE continuous keeper (never reset between shots), the SKELETAL_3D backend
// drawn every tick. For every shot the resolver classification, the selected motion, side / landed side, contact volume and
// outcome, glove / leg-tip residual at contact, unauthored ticks, fallback selections and continuity assertions are recorded;
// a gameplay-camera frame is saved at the contact tick (or mid-action) for the review page.
//   node gk3d_freeplay.js --out <dir> [--shots 120] [--seed 7] [--url http://127.0.0.1:8124/sandbox/visual/match.html]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "freeplay3d"), N = +opt("--shots", 120), SEED = +opt("--seed", 7), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), UDD = opt("--udd", "chrome-fp3d"), DUMP = opt("--dump", null) != null ? +opt("--dump") : null;   // --dump <i>: per-tick trace (phase, IK / lock weights, joint eulers)
const DIST = a.indexOf("--dist") > 0, FRAMES = a.indexOf("--frames") > 0;                                                                                 // --dist: every shot carries a deterministic DISTRIBUTION request (kind + target cycle from the seed); a held catch is then released on the production path of ONE shot → dump_<i>.json
fs.mkdirSync(OUT, { recursive: true });
let s = SEED; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const XS = [82, 86, 90, 94, 98, 101, 103], YS = [20, 24, 28, 31, 34, 37, 40, 44, 48];
const AIMS = [30.5, 31.0, 31.8, 32.6, 33.4, 34.0, 34.6, 35.4, 36.3, 37.0, 37.5];
const KEYS = [{ k: "z", c: [0.3, 1.0] }, { k: "3", c: [0.4, 1.0] }, { k: "2", c: [0.5, 1.0] }, { k: "5", c: [0.4, 0.9] }, { k: "1", c: [0.6, 1.0] }, { k: "z", c: [0.6, 1.0] }];
const DKINDS = ["PUTDOWN", "ROLL", "THROW", "PUNT"], DTARGETS = { PUTDOWN: [null], ROLL: [[96, 24], [96, 44], [98, 30], [98, 38]], THROW: [[78, 22], [78, 46], [70, 34], [82, 28], [82, 40]], PUNT: [[55, 30], [55, 38], [50, 34]] };
const SHOTS = []; for (let i = 0; i < N; i++) { const key = pick(KEYS); const dk = DIST ? DKINDS[i % 4] : null; SHOTS.push({ i, origin: [pick(XS), pick(YS)], aim: [105, pick(AIMS)], key: key.k, c: +(key.c[0] + rnd() * (key.c[1] - key.c[0])).toFixed(3), settle: rnd() < 0.7 ? 120 : 40, run: pick(["none", "none", "goal", "side"]), dist: dk ? { kind: dk, target: pick(DTARGETS[dk]), foot: dk === "PUNT" ? (rnd() < 0.5 ? "R" : "L") : undefined } : null }); }
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: UDD, args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + "?gkBackend=3d&r=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
  for (let i = 0; i < 900; i++) { const ok = await p.evaluate(() => { const el = document.getElementById("loading"); return !!(el && el.style.display === "none" && typeof ptEnter === "function"); }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(() => { if (!(S.pt && S.pt.on)) ptEnter(); ptReset(); GK_PRESENTATION.set("SKELETAL_3D"); gkAnimResetView(); gk3dReset(); S.pt.paused = true; S.dbg.anim = false; S.pt.pauseAtContact = false; S.pt.slow = 1; });
  const rec = [];
  for (const sh of SHOTS) { if (DUMP != null && sh.i > DUMP) break; sh.dump = sh.i === DUMP; sh.frames = FRAMES;
    const r0 = await p.evaluate((sh) => {
      const t = S.pt, A = S.gkAnim; const tm = KICK_CHARGE.timing[ptKickSpec(sh.key, t).chargeFam] || KICK_CHARGE.timing.LACES;
      const holdTicks = Math.round(Math.max(0, (sh.c - tm.bias) * tm.ms) / 1000 * 60), fac = Math.atan2(sh.aim[1] - sh.origin[1], sh.aim[0] - sh.origin[0]);
      t.keys = {}; t.charge = null; if (t.kick && t.kick.kicked === false) t.kick = null;
      t.gkDist = sh.dist ? Object.assign({}, sh.dist) : null; if (t.gk) { t.gk.dist = null; t.gk.distDone = null; t.gk.distEvents = []; } GK3D.distRecords = []; GK3D.distFlags = []; GK3D._distSeen = {};   // distribution request for this shot (the simulation decides if / when a held ball is released)
      t.p = { x: sh.origin[0], y: sh.origin[1], vx: 0, vy: 0, facing: fac, touchT: t.now };
      t.b = { x: sh.origin[0] + Math.cos(fac) * 0.3, y: sh.origin[1] + Math.sin(fac) * 0.3, z: 0, vx: 0, vy: 0, vz: 0, ctrl: true, exclT: 0 };
      const step = () => { ptStep(); if (sh.dump && GK3D.state && GK3D.state.poleMem) for (const k in GK3D.state.poleMem) GK3D.state.poleMem[k].debug = true; gkPresentationDraw(t, t.gk, 1 / 60); };
      for (let k = 0; k < sh.settle; k++) step();
      if (!t.b.ctrl || t.kick) return { skipped: "no control / kick busy" };
      ptChargeBegin(t, sh.key, ptKickSpec(sh.key, t)); for (let k = 0; k < holdTicks; k++) step(); ptChargeRelease(t, sh.key);
      if (!t.kick) return { skipped: "kick not scheduled" };
      if (sh.run === "goal") t.keys = { right: true }; else if (sh.run === "side") t.keys = { down: true };
      // the shot loop is RESUMABLE (state on window.__fpSt): with --frames it pauses at every authoritative distribution event so the node side can screenshot that exact frame
      window.__fpSt = { tick: 0, shotTick: null, commitTick: null, contactTick: null, unauth: 0, fallback: 0, motion: null, family: null, side: null, landed: null, gloveRes: null, legRes: null, facing: null, tier: null, action: null, hClass: null, outcome: null, volume: null, held: false, phases: [], lastPhase: null, presMax: 0, pelvisMin: 9, sim: null, trace: [], tShot: t.now, evSeen: 0 };
      GK3D.asserts = []; GK3D.cradleFlags = [];
      window.__fpRun = function (sh) {
        const t = S.pt, A = S.gkAnim, st = window.__fpSt; const step = () => { ptStep(); if (sh.dump && GK3D.state && GK3D.state.poleMem) for (const k in GK3D.state.poleMem) GK3D.state.poleMem[k].debug = true; gkPresentationDraw(t, t.gk, 1 / 60); };
        while (st.tick < 480) { step(); st.tick++; const tick = st.tick, gk = t.gk, L = GK3D.last, g = L && L.g, cur = A.cur;
          if (sh.dump && g && gk.committed) { const fk = L.sol.fk, e = (n) => { const m = fk.world[GK3D.skel.byName[n].idx]; return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]].map(v => +v.toFixed(4)); };   /* world rotation (3×3) — the same quantity the continuity assertion compares */ st.trace.push({ tick, now: +t.now.toFixed(3), endT: A.cur && +A.cur.endT?.toFixed(3), u: g.clipT != null ? +g.clipT.toFixed(3) : null, mode: g.mode, phase: g.phase, sub: g.sub, stage: g.landing && g.landing.L.stage, s: g.landing && +g.landing.L.s.toFixed(3), ikW: +g.ikW.toFixed(2), legTip: g.legTip ? +g.legTip.w.toFixed(2) : null, hold: !!g.holdBall, two: g.twoHands, locks: g.locks, feet: L.sol.diag.feet, brace: g.brace, ik: L.sol.diag.ik, ik2: L.sol.diag.ik2, legTipD: L.sol.diag.legTip, pelvis: fk.joint[GK3D.skel.byName.pelvis.idx].map(v => +v.toFixed(3)), contact: !!gk.contact, posePelvis: g.pose._pelvis, rootM: Array.from(g.rootM).map(v => +v.toFixed(4)), pelOff: GK3D.skel.byName.pelvis.off, dirSign: g.landing && g.landing.plan.dirSign, hs: +(GK3D.skel.H / 1.9).toFixed(3), poles: JSON.parse(JSON.stringify(GK3D.state.poleMem || null)), torso: L.sol.diag.torso, ground: L.sol.diag.ground, groundBone: L.sol.diag.groundBone, legFloor: L.sol.diag.legFloor, dist: g.dist ? { seg: g.dist.seg, x: g.dist.x, hands: g.dist.hands, kick: L.sol.kick } : null, J: Object.fromEntries(["shin_L", "foot_L", "shin_R", "foot_R", "foreArm_L", "hand_L", "foreArm_R", "hand_R"].map(n => [n, [fk.joint[GK3D.skel.byName[n].idx].map(v => +v.toFixed(3)), fk.tip[GK3D.skel.byName[n].idx].map(v => +v.toFixed(3))]])), ang: { thigh_L: e("thigh_L"), thigh_R: e("thigh_R"), upperArm_L: e("upperArm_L"), upperArm_R: e("upperArm_R") } }); }
          if (gk.shotActive && st.shotTick == null) st.shotTick = tick;
          if (gk.committed && st.commitTick == null) { st.commitTick = tick; st.facing = +(gk.facing * 180 / Math.PI).toFixed(1); st.tier = gk.committed.tier; st.action = gk.committed.action; st.family = cur && cur.family; st.hClass = cur && cur.cls && cur.cls.hClass; st.side = cur && cur.side; }
          if (g && gk.committed) { if (g.authored === false) st.unauth++; if (g.fallback) st.fallback++; if (g.motion) st.motion = g.motion; if (g.landedSide) st.landed = g.landedSide; if (g.phase !== st.lastPhase) { st.phases.push([tick, g.phase]); st.lastPhase = g.phase; } st.presMax = Math.max(st.presMax, g.pres.dm); if (L.sol) st.pelvisMin = Math.min(st.pelvisMin, L.sol.fk.joint[GK3D.skel.byName.pelvis.idx][1]); }
          if (gk.contact && gk.contact.tickT >= st.tShot - 1e-6 && st.contactTick == null) { st.contactTick = tick; st.outcome = gk.contact.outcome; st.volume = gk.contact.volume; st.held = !!gk.contact.held; st.gloveRes = L && L.sol.diag.ik ? L.sol.diag.ik.residual : null; st.legRes = L && L.sol.diag.legTip ? L.sol.diag.legTip.residual : null; st.sim = { point: gk.contact.point, root: [+gk.x.toFixed(2), +gk.y.toFixed(2)] }; }
          if (sh.frames && (gk.distEvents || []).length > st.evSeen) { st.evSeen = gk.distEvents.length; const ev = gk.distEvents[st.evSeen - 1]; return { paused: true, event: ev.name, kind: ev.kind, tick, sx: sproj3(gk.x, 0, gk.y).x / RES, sy: sproj3(gk.x, 0, gk.y).y / RES }; }   // pause ON the authoritative event frame
          if (st.shotTick != null && !gk.shotActive && !gk.committed && tick > st.shotTick + 40 && !gk.contact) break;
          if (st.commitTick != null && !gk.committed) break;                                          // the keeper finished (resolver released the commit)
          if (st.contactTick != null && tick > st.contactTick + (sh.dist ? 420 : 330)) break;
        }
        t.keys = {};
        const dd = t.gk.distDone || t.gk.dist; const distRec = sh.dist ? { requested: sh.dist, started: !!dd, kind: dd ? dd.kind : null, done: !!(dd && dd.done), released: !!(dd && dd.released), kicked: !!(dd && dd.kicked), events: (t.gk.distEvents || []).map(e => ({ name: e.name, tick: e.tick, ball: e.ball.map(v => +v.toFixed(3)), speed: +Math.hypot(e.v[0], e.v[1], e.v[2]).toFixed(2), predErr: e.predErr != null ? e.predErr : null })), records: GK3D.distRecords || [], flags: (GK3D.distFlags || []).length, startDown: !!(GK3D.distRecords && GK3D.distRecords[0] && GK3D.distRecords[0].startDown), startPhase: GK3D.distRecords && GK3D.distRecords[0] ? GK3D.distRecords[0].startPhase : null, distPhases: st.phases.filter(p => /^DIST/.test(p[1])).length } : null;
        return { dist: distRec, trace: sh.dump ? st.trace : undefined, shotTick: st.shotTick, commitTick: st.commitTick, contactTick: st.contactTick, facing: st.facing, tier: st.tier, action: st.action, family: st.family, hClass: st.hClass, side: st.side, motion: st.motion, landed: st.landed, outcome: st.outcome, volume: st.volume, held: st.held, gloveRes: st.gloveRes, legRes: st.legRes, unauth: st.unauth, fallback: st.fallback, phases: st.phases.slice(0, 40), presMax: +st.presMax.toFixed(2), pelvisMin: +st.pelvisMin.toFixed(2), asserts: GK3D.asserts.filter(x => x.bad).slice(0, 4), cradleViolations: (GK3D.cradleFlags || []).length, cradleFirst: (GK3D.cradleFlags || [])[0] || null, sim: st.sim, keeperReady: !t.gk.committed };
      };
      return window.__fpRun(sh);
    }, sh);
    let r = r0; const evFrames = [];
    while (r && r.paused) {                                                                      // --frames: screenshot the authoritative event frame (gameplay clip + keeper crop), then resume the same shot
      const nm = "ev_" + String(sh.i).padStart(3, "0") + "_" + r.event + "_t" + r.tick + ".png";
      try { await p.screenshot({ path: path.join(OUT, nm), clip: { x: 600, y: 150, width: 500, height: 450 } }); await p.screenshot({ path: path.join(OUT, nm.replace(".png", "_crop.png")), clip: { x: Math.max(0, Math.round(r.sx - 110)), y: Math.max(0, Math.round(r.sy - 170)), width: 220, height: 220 } }); evFrames.push({ event: r.event, tick: r.tick, file: nm }); } catch (e) {}
      r = await p.evaluate((sh) => window.__fpRun(sh), sh);
    }
    if (evFrames.length) r.evFrames = evFrames;
    if (r.trace) { fs.writeFileSync(path.join(OUT, "dump_" + sh.i + ".json"), JSON.stringify(r.trace, null, 1)); delete r.trace; }
    r.shot = sh; rec.push(r);
    if (r.contactTick != null && rec.length % 3 === 0) { try { await p.screenshot({ path: path.join(OUT, "shot_" + String(sh.i).padStart(3, "0") + ".png"), clip: { x: 600, y: 150, width: 500, height: 450 } }); r.frame = "shot_" + String(sh.i).padStart(3, "0") + ".png"; } catch (e) {} }
    if (sh.i % 20 === 19) console.log("shot", sh.i + 1, "/", N);
  }
  fs.writeFileSync(path.join(OUT, "freeplay3d.json"), JSON.stringify({ seed: SEED, shots: rec, errors: errs }, null, 1)); console.log("done", rec.length, "errors", errs.length); await b.close();
})();

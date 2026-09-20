// FREE-PLAY VALIDATION of the skeletal goalkeeper motion library on the production path: seeded shots through the real kick
// pipeline (ptChargeBegin / ptChargeRelease → ptKick), ONE continuous keeper (never reset between shots), the SKELETAL_3D backend
// drawn every tick. For every shot the resolver classification, the selected motion, side / landed side, contact volume and
// outcome, glove / leg-tip residual at contact, unauthored ticks, fallback selections and continuity assertions are recorded;
// a gameplay-camera frame is saved at the contact tick (or mid-action) for the review page.
//   node gk3d_freeplay.js --out <dir> [--shots 120] [--seed 7] [--url http://127.0.0.1:8124/sandbox/visual/match.html]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "freeplay3d"), N = +opt("--shots", 120), SEED = +opt("--seed", 7), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), UDD = opt("--udd", "chrome-fp3d");
fs.mkdirSync(OUT, { recursive: true });
let s = SEED; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const XS = [82, 86, 90, 94, 98, 101, 103], YS = [20, 24, 28, 31, 34, 37, 40, 44, 48];
const AIMS = [30.5, 31.0, 31.8, 32.6, 33.4, 34.0, 34.6, 35.4, 36.3, 37.0, 37.5];
const KEYS = [{ k: "z", c: [0.3, 1.0] }, { k: "3", c: [0.4, 1.0] }, { k: "2", c: [0.5, 1.0] }, { k: "5", c: [0.4, 0.9] }, { k: "1", c: [0.6, 1.0] }, { k: "z", c: [0.6, 1.0] }];
const SHOTS = []; for (let i = 0; i < N; i++) { const key = pick(KEYS); SHOTS.push({ i, origin: [pick(XS), pick(YS)], aim: [105, pick(AIMS)], key: key.k, c: +(key.c[0] + rnd() * (key.c[1] - key.c[0])).toFixed(3), settle: rnd() < 0.7 ? 120 : 40, run: pick(["none", "none", "goal", "side"]) }); }
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: UDD, args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + "?gkBackend=3d&r=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
  for (let i = 0; i < 900; i++) { const ok = await p.evaluate(() => { const el = document.getElementById("loading"); return !!(el && el.style.display === "none" && typeof ptEnter === "function"); }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(() => { if (!(S.pt && S.pt.on)) ptEnter(); ptReset(); GK_PRESENTATION.set("SKELETAL_3D"); gkAnimResetView(); gk3dReset(); S.pt.paused = true; S.dbg.anim = false; S.pt.pauseAtContact = false; S.pt.slow = 1; });
  const rec = [];
  for (const sh of SHOTS) {
    const r = await p.evaluate((sh) => {
      const t = S.pt, A = S.gkAnim; const tm = KICK_CHARGE.timing[ptKickSpec(sh.key, t).chargeFam] || KICK_CHARGE.timing.LACES;
      const holdTicks = Math.round(Math.max(0, (sh.c - tm.bias) * tm.ms) / 1000 * 60), fac = Math.atan2(sh.aim[1] - sh.origin[1], sh.aim[0] - sh.origin[0]);
      t.keys = {}; t.charge = null; if (t.kick && t.kick.kicked === false) t.kick = null;
      t.p = { x: sh.origin[0], y: sh.origin[1], vx: 0, vy: 0, facing: fac, touchT: t.now };
      t.b = { x: sh.origin[0] + Math.cos(fac) * 0.3, y: sh.origin[1] + Math.sin(fac) * 0.3, z: 0, vx: 0, vy: 0, vz: 0, ctrl: true, exclT: 0 };
      const step = () => { ptStep(); gkPresentationDraw(t, t.gk, 1 / 60); };
      for (let k = 0; k < sh.settle; k++) step();
      if (!t.b.ctrl || t.kick) return { skipped: "no control / kick busy" };
      ptChargeBegin(t, sh.key, ptKickSpec(sh.key, t)); for (let k = 0; k < holdTicks; k++) step(); ptChargeRelease(t, sh.key);
      if (!t.kick) return { skipped: "kick not scheduled" };
      if (sh.run === "goal") t.keys = { right: true }; else if (sh.run === "side") t.keys = { down: true };
      let tick = 0, shotTick = null, commitTick = null, contactTick = null, unauth = 0, fallback = 0, motion = null, family = null, side = null, landed = null, gloveRes = null, legRes = null, facing = null, tier = null, action = null, hClass = null, outcome = null, volume = null, held = false, phases = [], lastPhase = null, presMax = 0, pelvisMin = 9, sim = null;
      GK3D.asserts = [];
      while (tick < 480) { step(); tick++; const gk = t.gk, L = GK3D.last, g = L && L.g, cur = A.cur;
        if (gk.shotActive && shotTick == null) shotTick = tick;
        if (gk.committed && commitTick == null) { commitTick = tick; facing = +(gk.facing * 180 / Math.PI).toFixed(1); tier = gk.committed.tier; action = gk.committed.action; family = cur && cur.family; hClass = cur && cur.cls && cur.cls.hClass; side = cur && cur.side; }
        if (g && gk.committed) { if (g.authored === false) unauth++; if (g.fallback) fallback++; if (g.motion) motion = g.motion; if (g.landedSide) landed = g.landedSide; if (g.phase !== lastPhase) { phases.push([tick, g.phase]); lastPhase = g.phase; } presMax = Math.max(presMax, g.pres.dm); if (L.sol) pelvisMin = Math.min(pelvisMin, L.sol.fk.joint[GK3D.skel.byName.pelvis.idx][1]); }
        if (gk.contact && contactTick == null) { contactTick = tick; outcome = gk.contact.outcome; volume = gk.contact.volume; held = !!gk.contact.held; gloveRes = L && L.sol.diag.ik ? L.sol.diag.ik.residual : null; legRes = L && L.sol.diag.legTip ? L.sol.diag.legTip.residual : null; sim = { point: gk.contact.point, root: [+gk.x.toFixed(2), +gk.y.toFixed(2)] }; }
        if (shotTick != null && !gk.shotActive && !gk.committed && tick > shotTick + 40 && !gk.contact) break;
        if (commitTick != null && !gk.committed) break;                                          // the keeper finished (resolver released the commit)
        if (contactTick != null && tick > contactTick + 330) break;
      }
      t.keys = {};
      return { shotTick, commitTick, contactTick, facing, tier, action, family, hClass, side, motion, landed, outcome, volume, held, gloveRes, legRes, unauth, fallback, phases: phases.slice(0, 30), presMax: +presMax.toFixed(2), pelvisMin: +pelvisMin.toFixed(2), asserts: GK3D.asserts.filter(x => x.bad).slice(0, 4), sim, keeperReady: !t.gk.committed };
    }, sh);
    r.shot = sh; rec.push(r);
    if (r.contactTick != null && rec.length % 3 === 0) { try { await p.screenshot({ path: path.join(OUT, "shot_" + String(sh.i).padStart(3, "0") + ".png"), clip: { x: 600, y: 150, width: 500, height: 450 } }); r.frame = "shot_" + String(sh.i).padStart(3, "0") + ".png"; } catch (e) {} }
    if (sh.i % 20 === 19) console.log("shot", sh.i + 1, "/", N);
  }
  fs.writeFileSync(path.join(OUT, "freeplay3d.json"), JSON.stringify({ seed: SEED, shots: rec, errors: errs }, null, 1)); console.log("done", rec.length, "errors", errs.length); await b.close();
})();

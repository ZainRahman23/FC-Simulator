// SHOOTING V1 — ANIMATION ON/OFF NEUTRALITY on the REAL runtime, for all five families and both feet.
// Fires an identical scripted shot twice on the live page — once with the whole skeletal layer active, once with it skipped — and compares
// the AUTHORITATIVE trace tick by tick: player, ball position / velocity / height, possession, and the kick record itself (contact tick,
// launch speed, launch vz, technique, striking foot, charge). The skeletal layer may explain the strike; it may never change it.
//   node of_shot_regress.js [--shots 1,2,3,4,5] [--feet R,L] [--ticks 200] [--approach stand,run]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const SHOTS = opt("--shots", "1,2,3,4,5").split(","), FEET = opt("--feet", "R,L").split(",");
const APPS = opt("--approach", "stand,run").split(","), TICKS = +opt("--ticks", 200), OUT = opt("--out", "");
const URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
const SELF = a.indexOf("--selftest") > 0;
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-shotreg"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 600; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  const run = (shot, foot, app, animOff) => p.evaluate((shot, foot, app, animOff, TICKS) => {
    S.pt.paused = true; OFPLAY.mixed = false; OFPLAY.animOff = animOff;
    ptReset(); const t = S.pt; t.pfoot = foot;
    t.p.x = 78; t.p.y = 34; t.p.vx = 0; t.p.vy = 0; t.p.facing = 0; t.p.touchT = 0; t.p.gaitPhase = 0.08; t.p.gaitSettled = true;
    t.p.legLen = (OFPLAY.actor && OFPLAY.actor.skel.legLen) || PT.LEG_REF;
    t.b.x = 78.48; t.b.y = 34 + (foot === "R" ? 0.16 : -0.16); t.b.z = 0; t.b.vx = 0; t.b.vy = 0; t.b.vz = 0; t.b.ctrl = true; t.b.exclT = 0;
    t.gk.x = 104.5; t.gk.y = 34;
    const K = app === "run" ? { right: true } : {};
    const appT = app === "run" ? 90 : 10, holdT = 24, tr = [];
    for (let k = 0; k < TICKS; k++) {
      S.pt.keys = Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, K);
      if (k === appT) { const sp = OFPLAY_SHOTS[shot]; ptChargeBegin(t, shot, { fam: sp.fam, label: sp.label, D: sp.D, chargeFam: sp.chargeFam, force: { tech: sp.tech, foot: t.pfoot || "R" } }); }
      if (k === appT + holdT) ptChargeRelease(t, shot);
      ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
      const kk = t.kick;
      tr.push([t.p.x, t.p.y, t.p.vx, t.p.vy, t.p.facing, t.b.x, t.b.y, t.b.z, t.b.vx, t.b.vy, t.b.vz, t.b.ctrl ? 1 : 0,
               kk ? kk.kickAt : -1, kk ? kk.v0 : -1, kk ? kk.vz : -1, kk ? (kk.kicked ? 1 : 0) : -1,
               kk ? ({ INSIDE: 1, INSIDE_FINISH: 2, LACES: 3, LACES_POWER: 4, OUTSIDE: 5, CHIP: 6 })[kk.tech] || 0 : -1,
               kk ? ({ R: 1, L: 2 })[kk.foot] || 0 : -1, kk && kk.charge != null ? kk.charge : -1, t.touchN]);
    }
    OFPLAY.animOff = false;
    return tr;
  }, shot, foot, app, animOff, TICKS);
  const F = ["p.x", "p.y", "p.vx", "p.vy", "facing", "b.x", "b.y", "b.z", "b.vx", "b.vy", "b.vz", "b.ctrl", "kickAt", "v0", "vz", "kicked", "tech", "foot", "charge", "touchN"];
  const rows = []; let fail = false;
  for (const s of SHOTS) for (const f of FEET) for (const ap of APPS) {
    const on = await run(s, f, ap, false), off = await run(s, f, ap, SELF ? false : true);
    let worst = 0, wi = -1, wf = -1;
    for (let k = 0; k < on.length; k++) for (let i = 0; i < on[k].length; i++) {
      const d = Math.abs(on[k][i] - off[k][i]); if (d > worst) { worst = d; wi = k; wf = i; }
    }
    const fired = on.some(r => r[15] === 1);
    rows.push({ shot: s, foot: f, app: ap, fired, maxDelta: worst, at: wi, field: wf >= 0 ? F[wf] : null });
    if (worst !== 0) fail = true;
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ rows, errors: errs }, null, 1));
  const NM2 = { "1": "INSIDE/CURL", "2": "NORMAL", "3": "POWER", "4": "CHIP", "5": "TRIVELA" };
  console.log("SHOOTING V1 — animation ON vs OFF, authoritative trace (real runtime)");
  console.log("family        foot  approach  fired   max |delta|   verdict");
  for (const r of rows) console.log(`${NM2[r.shot].padEnd(14)}${r.foot.padEnd(6)}${r.app.padEnd(10)}${String(r.fired).padEnd(8)}${String(r.maxDelta).padStart(12)}   ${r.maxDelta === 0 ? "IDENTICAL" : "*** DIFFERS at tick " + r.at + " field " + r.field + " ***"}`);
  console.log("page errors", errs.length, errs.slice(0, 2));
  console.log(fail ? "\nGATE FAIL" : "\nGATE PASS — the skeletal layer explains the strike, it does not decide it");
  await b.close(); process.exit(fail || errs.length ? 1 : 0);
})();

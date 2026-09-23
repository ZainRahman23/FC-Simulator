// DRIBBLING V1 — ANIMATION ON/OFF NEUTRALITY on the REAL runtime.
// Runs an identical scripted carry twice on the live page — once with the whole skeletal layer active, once with it skipped — and compares
// the AUTHORITATIVE trace tick by tick: player x/y/vx/vy/facing, ball x/y/z/vx/vy/ctrl, possession state, touch count, chosen foot.
// The skeletal layer may explain a touch; it may never decide one. Any non-zero difference fails.
//   node of_drib_regress.js [--gears walk,jog,run,sprint] [--ticks 420]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const GEARS = opt("--gears", "walk,jog,run,sprint").split(","), TICKS = +opt("--ticks", 420);
const URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), OUT = opt("--out", "");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-dribreg"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 600; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  const run = (gear, animOff, turnAt) => p.evaluate((gear, animOff, TICKS, turnAt) => {
    S.pt.paused = true; OFPLAY.mixed = false; OFPLAY.animOff = animOff;
    ptReset();                                                                                     // the playtest's own full reset: carry corridor, possession, kick and keeper state all cleared
    const t = S.pt;
    t.p.x = 60; t.p.y = 34; t.p.vx = 0; t.p.vy = 0; t.p.facing = 0; t.p.touchT = 0; t.p.gaitPhase = 0.08; t.p.gaitSettled = true;
    t.p.legLen = (OFPLAY.actor && OFPLAY.actor.skel.legLen) || PT.LEG_REF;
    t.b.x = 66; t.b.y = 34; t.b.z = 0; t.b.vx = 0; t.b.vy = 0; t.b.vz = 0; t.b.ctrl = false; t.b.exclT = 0; t.b.held = null;
    t.gk.x = 104.5; t.gk.y = 34;
    const K = { walk: { walk: true }, jog: { jog: true }, run: {}, sprint: { sprint: true } }[gear] || {};
    const tr = [];
    for (let k = 0; k < TICKS; k++) {
      const keys = Object.assign({ up: false, down: false, left: false, right: true }, K);
      if (turnAt && k > turnAt) keys.down = true;
      S.pt.keys = keys; ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
      tr.push([t.p.x, t.p.y, t.p.vx, t.p.vy, t.p.facing, t.b.x, t.b.y, t.b.z, t.b.vx, t.b.vy, t.b.ctrl ? 1 : 0,
               t.touchN, t.p.gaitPhase, ({ SECURE: 1, EXPOSED: 2, ESCAPING: 3 })[t.ctrlState] || 0,
               ({ R: 1, L: 2 })[t.lastTouchFoot] || 0]);
    }
    OFPLAY.animOff = false;
    return tr;
  }, gear, animOff, TICKS, turnAt);
  const rows = []; let fail = false;
  for (const g of GEARS) {
    for (const [tag, turnAt] of [["straight", 0], ["turn", 150]]) {
      const SELF = a.indexOf("--selftest") > 0;
      const on = await run(g, false, turnAt), off = await run(g, SELF ? false : true, turnAt);
      let worst = 0, wi = -1, wf = -1;
      for (let k = 0; k < on.length; k++) for (let i = 0; i < on[k].length; i++) {
        const d = Math.abs(on[k][i] - off[k][i]); if (d > worst) { worst = d; wi = k; wf = i; }
      }
      const F = ["p.x", "p.y", "p.vx", "p.vy", "facing", "b.x", "b.y", "b.z", "b.vx", "b.vy", "b.ctrl", "touchN", "gaitPhase", "ctrlState", "lastFoot"];
      rows.push({ gear: g, path: tag, ticks: on.length, touches: on[on.length - 1][11], maxDelta: worst, at: wi, field: wf >= 0 ? F[wf] : null });
      if (worst !== 0) fail = true;
    }
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ rows, errors: errs }, null, 1));
  console.log("DRIBBLING V1 — animation ON vs OFF, authoritative trace (real runtime)");
  console.log("gear    path      ticks  touches   max |delta|   verdict");
  for (const r of rows) console.log(`${r.gear.padEnd(8)}${r.path.padEnd(10)}${String(r.ticks).padStart(5)}${String(r.touches).padStart(9)}${String(r.maxDelta).padStart(14)}   ${r.maxDelta === 0 ? "IDENTICAL" : "*** DIFFERS at tick " + r.at + " field " + r.field + " ***"}`);
  console.log("page errors", errs.length, errs.slice(0, 2));
  console.log(fail ? "\nGATE FAIL" : "\nGATE PASS — the skeletal layer explains touches, it does not decide them");
  await b.close(); process.exit(fail || errs.length ? 1 : 0);
})();

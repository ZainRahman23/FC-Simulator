// DETERMINISTIC CAPTURE of the playable outfield locomotion harness (?ofPlay=1): the page is paused, the scripted key intents are applied
// per 60 Hz tick, the playtest is stepped by hand (ptStep → the authoritative player law → the presentation solve), the frame is drawn and
// the Mixed output (or the page canvas) is screenshotted at the requested ticks. Also dumps OFPLAY.rec (per-tick diagnostics).
//   node of_play_capture.js --script <name|json> --out <dir> [--ticks 0-300] [--every 1] [--body AVG_ATHLETIC] [--view mixed|page|close] [--zoom 3] [--udd dir]
// scripts: constant / ramp / stop / turn_grad / turn_sharp / idle_turn / walk / jog / run / sprint / accel / decel / w2j / j2r / r2s / s2stop
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const SCRIPT = opt("--script", "run"), OUT = opt("--out", "ofcap"), BODY = opt("--body", "AVG_ATHLETIC"), VIEW = opt("--view", "mixed"), ZOOM = +opt("--zoom", 0), EVERY = +opt("--every", 1), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
const TICKS = opt("--ticks", "0-300").split(",").flatMap(x => { const m = x.match(/^(\d+)-(\d+)$/); return m ? Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => +m[1] + i) : [+x]; });
// key intent per tick (deterministic); walk / jog use the harness gears (desired-speed intent, the limiter is the playtest's own)
const K = (o) => Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, o);
const walkPulse = (k) => K({ right: true, walk: true });                                        // gears (harness intent: Q walk 1.5 / E jog 3.0)
const jogK = () => K({ right: true, jog: true });
const SCRIPTS = {
  idle: (k) => K({}),
  walk: (k) => k < 20 ? K({}) : walkPulse(k),
  jog: (k) => k < 20 ? K({}) : jogK(),
  run: (k) => k < 20 ? K({}) : K({ right: true }),
  sprint: (k) => k < 20 ? K({}) : K({ right: true, sprint: true }),
  accel: (k) => k < 20 ? K({}) : K({ right: true, sprint: true }),
  decel: (k) => k < 20 ? K({}) : k < 170 ? K({ right: true, sprint: true }) : K({}),
  stop: (k) => k < 20 ? K({}) : k < 170 ? K({ right: true, sprint: true }) : K({}),
  w2j: (k) => k < 20 ? K({}) : k < 140 ? walkPulse(k) : jogK(),
  j2r: (k) => k < 20 ? K({}) : k < 140 ? jogK() : K({ right: true }),
  walk_stop: (k) => k < 20 ? K({}) : k < 170 ? walkPulse(k) : K({}),
  jog_stop: (k) => k < 20 ? K({}) : k < 170 ? jogK() : K({}),
  walk_turn: (k) => k < 20 ? K({}) : k < 140 ? walkPulse(k) : K({ down: true, walk: true }),
  r2s: (k) => k < 20 ? K({}) : k < 140 ? K({ right: true }) : K({ right: true, sprint: true }),
  s2stop: (k) => k < 20 ? K({}) : k < 170 ? K({ right: true, sprint: true }) : K({}),
  turn_grad: (k) => k < 20 ? K({}) : k < 140 ? K({ right: true }) : k < 260 ? K({ right: true, down: true }) : K({ down: true }),
  turn_sharp: (k) => k < 20 ? K({}) : k < 160 ? K({ right: true }) : K({ left: true }),
  idle_turn: (k) => K({}),                                                                       // the facing is turned by the ball position in the playtest: the script moves the parked ball around the player (fixture set-up)
};
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-ofcap"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1500, height: 950, deviceScaleFactor: 2 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + `?ofPlay=1&fps=60&body=${BODY}&r=` + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 600; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate((VIEW, ZOOM) => { S.pt.paused = true; OFPLAY.mixed = VIEW !== "page"; OFPLAY.dbg.hud = VIEW === "mixed"; if (OFPLAY.panel) OFPLAY.panel.style.display = VIEW === "mixed" ? "block" : "none"; if (ZOOM) { RIG.zoomTarget = ZOOM; RIG.zoom = ZOOM; } OFPLAY.rec = []; }, VIEW, ZOOM);
  const fn = SCRIPTS[SCRIPT] || SCRIPTS.run; const last = TICKS[TICKS.length - 1]; const rec = [];
  for (let k = 0; k <= last; k++) {
    const keys = fn(k);
    await p.evaluate((keys, k, SCRIPT) => {
      S.pt.keys = Object.assign({}, keys);
      if (SCRIPT === "idle_turn") { const p = S.pt.p, ang = k < 60 ? 0 : k < 180 ? Math.PI / 2 : k < 300 ? Math.PI : -Math.PI / 2; S.pt.b.x = p.x + Math.cos(ang) * 6; S.pt.b.y = p.y + Math.sin(ang) * 6; }
      ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
    }, keys, k, SCRIPT);
    if (TICKS.includes(k) && (k % EVERY === 0)) {
      const r = await p.evaluate(() => OFPLAY.rec[OFPLAY.rec.length - 1]); rec.push(r);
      if (VIEW === "page") { const el = await p.$("canvas#c") || await p.$("canvas"); await el.screenshot({ path: path.join(OUT, `of_${SCRIPT}_t${String(k).padStart(3, "0")}.png`) }); }
      else { const el = await p.$("#ofplay-out"); await el.screenshot({ path: path.join(OUT, `of_${SCRIPT}_t${String(k).padStart(3, "0")}.png`) }); }
    }
  }
  const all = await p.evaluate(() => OFPLAY.rec); fs.writeFileSync(path.join(OUT, `of_${SCRIPT}_rec.json`), JSON.stringify({ script: SCRIPT, body: BODY, view: VIEW, rec: all, errors: errs }));
  console.log("captured", SCRIPT, BODY, VIEW, "frames", rec.length, "errors", errs.length, errs.slice(0, 2)); await b.close();
})();

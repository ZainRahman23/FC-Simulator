// DEFENDING V1 — ad-hoc page evaluation helper: runs a defending fixture to a tick and evaluates an expression in the page.
//   node of_def_dbg.js --scen sl_win --tick 90 --expr "..."
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const SC = require(opt("--scenfile", "./of_def_scenarios.js")), NAME = opt("--scen", "sl_win"), TICK = +opt("--tick", 90), EXPR = opt("--expr", "1"), EVERY = opt("--every", "");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-defdbg"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); await p.setViewport({ width: 1200, height: 800 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto("http://127.0.0.1:8124/sandbox/visual/match.html?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(async () => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} } });
  const S0 = SC.SCEN[NAME];
  await p.evaluate((D) => { ofSquadStart("probe", D); window.__watch = [];
    for (let i = 0; i < D.players.length; i++) { const e = D.players[i].char && OF_CHAR.get(D.players[i].char); if (e && e.status === "ready") { const c = S.pt.squad.ctx[i]; const ac = ofPlayMakeActor(e.skel, c.p); ac.char = e; ac.team = c.team; OFSQ.actors[i] = ac; } } }, S0.drill);
  for (let k = 0; k <= TICK; k++) {
    const r = await p.evaluate((keys, cmd, k, expr, ev) => { const t = S.pt; t.keys = keys;
      for (const c of (window.__watch || [])) if (!c.fired && k >= c.at) { const me = t.squad.ctx[t.squad.active].p, dB = Math.hypot(t.b.x - me.x, t.b.y - me.y); if (dB <= c.d) { c.fired = k; if (c.do === "standWhen") ptDefStand(t, t.squad.active); else ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : ptDefSlideAim(t, t.squad.ctx[t.squad.active])); } }
      for (const c of cmd) { if (c.do === "standWhen" || c.do === "slideWhen") window.__watch.push(Object.assign({}, c)); else if (c.do === "stand") ptDefStand(t, t.squad.active); else if (c.do === "slide") ptDefSlide(t, t.squad.active, c.dir); else if (c.do === "humanAi") t.squad.humanAi = true; }
      ptStep(); return ev ? eval(expr) : null; }, SC.keysAt(S0, k), (S0.cmds || []).filter(c => c.at === k), k, EXPR, !!EVERY && k % +EVERY === 0 || k === TICK);
    if (r != null) console.log(k, JSON.stringify(r));
  }
  console.log("errors", errs);
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();

// RECEIVING + PASSING V1 — scripted probe / capture of the live squad harness (?ofPlay=1&squad=...).
// The page is paused and stepped by hand, tick by tick: scripted intents (keys held by the player you control) and scripted commands
// (a pass of a family in a direction, a switch, a shot) are applied at fixed ticks; the simulation steps; the presentation solves; frames
// are screenshotted on request. Outputs every reception / pass record (final-state boot-ball residuals, plant state, reach), the squad's
// event log and the authoritative per-tick trace, so the same script is both a review capture and a measurement.
//   node of_rp_probe.js --scen <name>[,<name>...] --out <dir> [--frames 0-300] [--every 2] [--zoom 3] [--view mixed|page] [--anim off] [--chars on|off]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "rp_probe"), VIEW = opt("--view", "mixed"), ZOOM = +opt("--zoom", 0), EVERY = +opt("--every", 1), ANIMOFF = opt("--anim", "on") === "off";
const LAYERS = opt("--layers", ""), JOINTS = a.indexOf("--joints") > 0, FMT = opt("--fmt", "png"), DPR = +opt("--dpr", 2), RECVOFF = opt("--recv", "on") === "off", CAST = opt("--cast", ""), OVERLAY = opt("--overlay", "on"), CHARS = opt("--chars", "on") !== "off", URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
const FR = opt("--frames", "").split(",").filter(Boolean).flatMap(x => { const m = x.match(/^(\d+)-(\d+)$/); return m ? Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => +m[1] + i) : [+x]; });
const SC = require(opt("--scenfile", "./of_rp_scenarios.js"));   // DEFENDING V1: --scenfile ./of_def_scenarios.js
const FRAMES_ALL = opt("--frames", "") === "all";
const NAMES = opt("--scen", "ab").split(",").flatMap(n => n === "all" ? Object.keys(SC.SCEN) : [n]);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-rpprobe"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); await p.setViewport({ width: 1500, height: 950, deviceScaleFactor: FR.length ? DPR : 1 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(() => { S.pt.paused = true; });
  if (CHARS) await p.evaluate(async () => { for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} } });   // load every real character once (sequential)
  const results = {};
  for (const name of NAMES) {
    const S0 = SC.SCEN[name]; if (!S0) { console.error("unknown scenario", name); continue; }
    await p.evaluate((S0, VIEW, ZOOM, ANIMOFF, CHARS, OVERLAY, CAST, RECVOFF, LAYERS) => {
      const D = JSON.parse(JSON.stringify(S0.drill)); if (!CHARS) for (const q of D.players) q.char = null;
      if (CAST) for (const q of D.players) if (!q.team) { if (CAST === "generic") q.char = null; else q.char = CAST; }
      ofSquadStart("probe", D); window.__watch = []; window.__dbg = []; OFPLAY.animOff = ANIMOFF; OF_RECV.enabled = !RECVOFF;
      if (LAYERS) { const l = LAYERS.split(","); OF_RECV.layers = { pose: l.includes("pose"), plants: l.includes("plants"), reach: l.includes("reach") }; } else OF_RECV.layers = { pose: true, plants: true, reach: true };
      for (let i = 0; i < D.players.length; i++) { const id = D.players[i].char; const e = id && OF_CHAR.get(id);          // ready characters: build the actor now (no async gap)
        if (e && e.status === "ready") { const c = S.pt.squad.ctx[i]; const ac = ofPlayMakeActor(e.skel, c.p); ac.char = e; ac.team = c.team; ac.palette = c.team ? OFPLAY_KIT_B : SKEL_PARTS; OFSQ.actors[i] = ac; } }
      OFPLAY.actor = OFSQ.actors[S.pt.squad.active];
      OFPLAY.mixed = VIEW !== "page"; OFPLAY.dbg.hud = VIEW === "mixed"; if (OFPLAY.panel) OFPLAY.panel.style.display = VIEW === "mixed" ? "block" : "none";
      if (ZOOM) { RIG.zoomTarget = ZOOM; RIG.zoom = ZOOM; }
      OFSQ.cam = null; if (OVERLAY === "off") { OFSQ.names = false; OFPLAY.dbg.feet = false; OFPLAY.dbg.roots = false; OFPLAY.dbg.ball = false; OFPLAY.dbg.hud = false; if (OFPLAY.panel) OFPLAY.panel.style.display = "none"; OFSQ.overlay = false; } else OFSQ.overlay = true;
    }, S0, VIEW, ZOOM, ANIMOFF, CHARS, OVERLAY, CAST, RECVOFF, LAYERS);
    const trace = [], pres = [], joints = [];
    for (let k = 0; k < S0.ticks; k++) {
      const cmd = (S0.cmds || []).filter(c => c.at === k), keys = SC.keysAt(S0, k);
      const row = await p.evaluate((keys, cmd, k) => {
        const t = S.pt; t.keys = Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, keys);
        for (const c of cmd) {
          if (c.do === "passTo") { const o = t.squad.ctx[c.to].p, rel = c.rel || [0, 0]; ptSquadPassTo(t, c.fam || "SHORT", c.to, o.x + rel[0], o.y + rel[1]); }
          else if (c.do === "pass") ptSquadPass(t, c.fam || "SHORT", c.dir != null ? c.dir : (c.toward != null ? Math.atan2(t.squad.ctx[c.toward].p.y - t.p.y, t.squad.ctx[c.toward].p.x - t.p.x) : null));
          else if (c.do === "switch") ptSquadSwitch(t, c.to);
          else if (c.do === "shot") { const sp = OFPLAY_SHOTS[c.key || "2"]; ptChargeBegin(t, c.key || "2", { fam: sp.fam, label: sp.label, D: sp.D, chargeFam: sp.chargeFam, force: { tech: sp.tech, foot: t.pfoot || "R" } }); t._shotRel = { key: c.key || "2", at: k + (c.hold || 20) }; }
          else if (c.do === "pfoot") { t.pfoot = c.foot; }
          else if (c.do === "attrs") { t.squad.ctx[c.pid].attrs = c.attrs; }
          else if (c.do === "humanAi") t.squad.humanAi = true;                                     // DEFENDING V1 media: the AI also plays the player you control
          else if (c.do === "stand") ptDefStand(t, t.squad.active);                                 // DEFENDING V1 commands (the same requests the keys make)
          else if (c.do === "slide") ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : null);
        }
        for (const c of (window.__watch || [])) if (!c.fired && k >= c.at) { const me = t.squad.ctx[t.squad.active].p, dB = Math.hypot(t.b.x - me.x, t.b.y - me.y);   // DEFENDING V1: press when the ball is within d (a person's timing)
          if (dB <= c.d) { c.fired = k; if (c.do === "standWhen") ptDefStand(t, t.squad.active); else ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : ptDefSlideAim(t, t.squad.ctx[t.squad.active])); } }
        for (const c of cmd) if (c.do === "standWhen" || c.do === "slideWhen") (window.__watch || (window.__watch = [])).push(Object.assign({}, c));
        if (t._shotRel && t._shotRel.at === k) { ptChargeRelease(t, t._shotRel.key); t._shotRel = null; }
        ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
        const Q = t.squad, b = t.b;
        return [k, b.x, b.y, b.z, b.vx, b.vy, b.owner == null ? -1 : b.owner, Q.active].concat(...Q.ctx.map(c => [c.p.x, c.p.y, c.p.vx, c.p.vy, c.p.facing]));
      }, keys, cmd, k);
      trace.push(row);
      if (JOINTS && !ANIMOFF) joints.push(await p.evaluate((k) => [k].concat(OFSQ.actors.map(a => {        // per-joint pop (root frame), per actor
        if (!a.sol || !a.rootM) return null; const inv = M4.invertRigid(a.rootM), JL = a.sol.fk.joint.map(q => M4.transformPoint(inv, q)), out = [];
        for (let j = 0; j < JL.length; j++) { const dv = a._pjL ? V3.sub(JL[j], a._pjL[j]) : [0, 0, 0]; out.push(a._pdv ? +V3.len(V3.sub(dv, a._pdv[j])).toFixed(4) : 0); (a._pdvN || (a._pdvN = []))[j] = dv; }
        a._pjL = JL; a._pdv = a._pdvN.slice(); return out; })), k));
      if (!ANIMOFF) pres.push(await p.evaluate((k) => [k].concat(...OFSQ.actors.map(a => { const d = a.sol ? a.sol.diag : null; if (!d) return [0, 0, 0];
        let sl = 0; for (const sd of ["R", "L"]) { const f = d.feet[sd]; if (f && f.contact && f.slide != null) sl = Math.max(sl, f.slide); }
        return [+(d.jerk || 0).toFixed(4), +sl.toFixed(4), +(d.jump || 0).toFixed(4)]; })), k));
      if ((FRAMES_ALL || FR.includes(k)) && k % EVERY === 0) {
        const el = VIEW === "page" ? (await p.$("canvas#c") || await p.$("canvas")) : await p.$("#ofplay-out");
        await el.screenshot(FMT === "jpg" ? { path: path.join(OUT, `${name}_t${String(k).padStart(3, "0")}.jpg`), type: "jpeg", quality: 88 } : { path: path.join(OUT, `${name}_t${String(k).padStart(3, "0")}.png`) });
      }
    }
    const res = await p.evaluate(() => ({ dbg: window.__dbg, events: S.pt.squad.events, recv: OFSQ.recvRecs, pass: OFSQ.passRecs, def: OFSQ.defRecs || [], chars: OFSQ.actors.map(a => a.char ? a.char.id : "generic") }));
    res.trace = trace; res.pres = pres; if (JOINTS) { res.joints = joints; res.jointNames = await p.evaluate(() => OFSQ.actors[0].skel.bones.map(b => b.name)); } results[name] = res;
    const R = res.recv.map(r => `${r.name}:${r.foot}:${r.style}:${r.outcome}:${(r.surf * 100).toFixed(1)}cm${r.reachCapped ? "*" : ""}`).join(" ");
    const P = res.pass.map(r => `${r.name}:${r.tech}:${r.foot}:${(r.surf * 100).toFixed(1)}cm`).join(" ");
    const DF = (res.def || []).map(r => `${r.name}:${r.kind}:${r.foot}:${r.out}:${(r.insideSurf * 100).toFixed(1)}/${(r.legSurf * 100).toFixed(1)}cm`).join(" ");
    const TK = res.events.filter(e => e.kind === "TACKLE").map(e => `${e.type}:${e.out}${e.why ? "(" + e.why + ")" : ""}${e.q != null ? " q" + e.q : ""}`).join(",");
    if (DF || TK) console.log(name.padEnd(22), "def", DF || "-", " | tackles", TK || "-");
    console.log(name.padEnd(22), "recv", R || "-", " | pass", P || "-", " | ev", res.events.filter(e => /RECEPTION|OUT_OF_REACH|LOOSE/.test(e.kind)).map(e => e.kind + (e.outcome ? ":" + e.outcome : "")).join(","));
  }
  fs.writeFileSync(path.join(OUT, "probe.json"), JSON.stringify({ results, errors: errs, anim: !ANIMOFF, chars: CHARS }));
  console.log("page errors", errs.length, errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {});
  process.exit(0);
})();

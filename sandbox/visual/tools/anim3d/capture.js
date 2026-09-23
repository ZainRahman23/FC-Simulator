// Capture frames of one GK scenario through a presentation backend (review tooling; reads the page, writes PNGs).
//   node capture.js --backend sprite|3d --scenario 42 --ticks 0,30,40,... --out <dir> [--crop 1] [--dbg bones,ik,roots,anim] [--copies N] [--pixel 2]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const BACKEND = opt("--backend", "3d"), IDX = +opt("--scenario", 42), TICKS = opt("--ticks", "0,30,40,50,62,75,100,130").split(",").flatMap(x => { const m = x.match(/^(\d+)-(\d+)$/); return m ? Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => +m[1] + i) : [+x]; }), OUT = opt("--out", "cap"), CROP = +opt("--crop", 1), DBG = (opt("--dbg", "") || "").split(",").filter(Boolean), COPIES = +opt("--copies", 0), PIXEL = +opt("--pixel", 0), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), ZOOM = +opt("--zoom", 0), CAMX = +opt("--camx", 0), CLIP = opt("--clip", "") ? opt("--clip").split(",").map(Number) : null, OUTLINE = opt("--outline", ""), BANDS = opt("--bands", ""), CHARACTER = opt("--character", ""), VARIANT = opt("--variant", ""), COPIES2 = 0, ADHOC = opt("--adhoc", "") ? JSON.parse(fs.readFileSync(opt("--adhoc"), "utf8"))[+opt("--adhocIndex", 0)] : null, PRESET = opt("--preset", ""), BAND = opt("--band", "");   // --band K1|K2|K3|COURTOIS|…: the keeper capability band (persists on a page; fixtures pin it — the playable page carries it between shots)   // --adhoc <json> --adhocIndex i: fire an ad-hoc scenario object through ptGkFire; --preset broken: review switches reproducing the unbounded flight / fold
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-cap-" + BACKEND), args: ["--no-sandbox"] /* default GPU path (ANGLE Metal on macOS): SwiftShader made the first GL frame take ~6 s and ticks ~15 ms */ });
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 }); const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error" || m.type() === "warning") errs.push("console:" + m.text()); });
  await p.goto(URL + (URL.includes("?") ? "&" : "?") + "gkBackend=" + (BACKEND === "3d" ? "3d" : "sprite") + "&r=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
  for (let i = 0; i < 900; i++) { const ok = await p.evaluate(() => { const el = document.getElementById("loading"); return !!(el && el.style.display === "none" && typeof ptEnter === "function"); }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate((IDX, BACKEND, DBG, COPIES, PIXEL, ZOOM, CAMX, OUTLINE, BANDS, CHARACTER, VARIANT, ADHOC, PRESET, BAND) => {
    if (!(S.pt && S.pt.on)) ptEnter(); S.pb.playing = false;
    GK_PRESENTATION.set(BACKEND === "3d" ? "SKELETAL_3D" : "SPRITE");
    for (const d of DBG) { if (d === "anim") S.dbg.anim = true; else if (typeof GK3D !== "undefined") GK3D.debug[d] = true; }
    if (CHARACTER && typeof GL3D !== "undefined") GL3D.character = CHARACTER; if (VARIANT && typeof GK3D !== "undefined") GK3D.variant = VARIANT;
    if (typeof GK3D !== "undefined") GK3D.copies = COPIES; if (PIXEL && typeof GL3D !== "undefined") GL3D.pixelScale = PIXEL; if (OUTLINE !== "" && typeof GL3D !== "undefined") GL3D.outline = OUTLINE === "1"; if (BANDS && typeof GL3D !== "undefined") GL3D.bands = +BANDS;
    if (ZOOM) { RIG.zoom = ZOOM; RIG.zoomTarget = ZOOM; } if (CAMX) { RIG.manualX = CAMX; RIG.x = CAMX; RIG.targetX = CAMX; TRAVEL = CAMX - 52.5; }
    if (PRESET === "broken") { GK_GRAPH.flightCap = false; GK_IK_MIN_ELBOW_DEG = 0; }
    if (PRESET === "auth") Object.assign(GK_GRAPH.dbg, { noRedirect: true, noLaunch: true, noAssist: true, noIK: true });      // layer isolation (review): authored keys + simulation root only
    if (PRESET === "redir") Object.assign(GK_GRAPH.dbg, { noLaunch: true, noAssist: true, noIK: true });                        // + axis redirect
    if (PRESET === "launch") Object.assign(GK_GRAPH.dbg, { noAssist: true, noIK: true });                                       // + launch / landing plan pelvis
    if (PRESET === "noik") Object.assign(GK_GRAPH.dbg, { noIK: true });
    if (PRESET === "before") GK_GRAPH.lateralRule = false;
    if (PRESET === "armbroken") GK_GRAPH.dbg.noArmClear = true;                                                                  // review: the far-lateral regime WITHOUT the trailing-arm clearance rule                                                                      // review: the far-lateral regime rules off (the previous resolver behaviour)                                                          // + torso assist, no glove IK
    if (BAND) S.pt.gkCap = BAND;
    ptReset(); if (ADHOC) { S.pt.gkScenario = null; ptGkFire(ADHOC, 0, 1); } else ptGkScenario(IDX); gkAnimResetView(); if (typeof gk3dReset === "function") gk3dReset(); S.pt.paused = true; window.__k = 0;
  }, IDX, BACKEND, DBG, COPIES, PIXEL, ZOOM, CAMX, OUTLINE, BANDS, CHARACTER, VARIANT, ADHOC, PRESET, BAND);
  if (CHARACTER === "COURTOIS") { for (let i = 0; i < 900; i++) { const st = await p.evaluate(() => (typeof GK_CHAR !== "undefined" && GK_CHAR.get("COURTOIS")) ? (GK_CHAR.get("COURTOIS").status === "idle" ? (gkCharLoad("COURTOIS"), "loading") : GK_CHAR.get("COURTOIS").status) : "missing"); if (st === "ready" || st === "error" || st === "missing") { console.log("character", st); if (st !== "ready") { const err = await p.evaluate(() => (typeof GK_CHAR !== "undefined" && GK_CHAR.get("COURTOIS")) ? String(GK_CHAR.get("COURTOIS").error || "") : "no registry"); console.error("CHARACTER NOT LOADED:", st, err, "console:", errs.slice(0, 5)); await b.close(); process.exit(2); } break; } await new Promise(r => setTimeout(r, 100)); } }   // finished character: wait for the asset before the first frame
  const maxT = Math.max(...TICKS); const rec = [];
  for (let k = 0; k <= maxT; k++) {
    const info = await p.evaluate((k, want) => {
      ptStep(); updateRig(1 / 60, null); TRAVEL = RIG.x - 52.5;
      if (want) draw(null, 1 / 60); else gkPresentationDraw(S.pt, S.pt.gk, 1 / 60);   // full frame only on capture ticks (headless canvas is slow); the keeper backend still runs every tick
      const g = S.pt.gk, sp = sproj3(g.x, 0, g.y), A = S.gkAnim;
      return { k, t: +S.pt.now.toFixed(4), root: [g.x, g.y], hand: g.handNow, phase: g.phase, contact: g.contact ? g.contact.tickT + "/" + g.contact.outcome : null, art: A.cur ? A.cur.artLabel : null, sx: sp.x / RES, sy: sp.y / RES, perf: (typeof GK3D !== "undefined" && GK_PRESENTATION.backend === "SKELETAL_3D") ? { n: GK3D.perf.n, avg: GK3D.perf.n ? GK3D.perf.ms / GK3D.perf.n : 0, max: GK3D.perf.max, draws: GK3D.perf.glDraws, target: GK3D.perf.target, lastContact: GK3D.lastContact } : { n: A.perf.n, avg: A.perf.n ? A.perf.ms / A.perf.n : 0, max: A.perf.max, lastContact: A.lastContact } };
    }, k, TICKS.includes(k));
    if (TICKS.includes(k)) {
      const stem = `${BACKEND}_${IDX}`, tt = `t${String(k).padStart(3, "0")}`;
      if (CROP !== 2) await p.screenshot({ path: path.join(OUT, `${stem}_full_${tt}.png`), clip: CLIP ? { x: CLIP[0], y: CLIP[1], width: CLIP[2], height: CLIP[3] } : { x: 0, y: 0, width: 1100, height: 900 } });
      if (CROP !== 0) { const cx = info.sx, cy = info.sy; await p.screenshot({ path: path.join(OUT, `${stem}_crop_${tt}.png`), clip: { x: Math.max(0, Math.round(cx - 110)), y: Math.max(0, Math.round(cy - 170)), width: 220, height: 220 } }); }
      rec.push(info); console.log(k, info.t, "phase", info.phase, "contact", info.contact, "art", info.art);
    }
  }
  fs.writeFileSync(path.join(OUT, `${BACKEND}_${IDX}_record.json`), JSON.stringify({ backend: BACKEND, scenario: IDX, rec, errors: errs }, null, 1));
  console.log("perf", JSON.stringify(rec[rec.length - 1].perf)); console.log("errors", errs.slice(0, 8)); await b.close();
})();

// occupy1/tools/o_browser.cjs — TOUCHLINE — PLAYER OCCUPANCY V1 REVIEW in Chrome (headless): the page loads with 0 console / HTTP errors; every
// case simulates OLD and OCCUPANCY V1 and both viewports draw; the page's numbers (deepest penetration, ticks > 5 cm, outcome, contacts through a
// body, blocks) equal node's (o_lab_cases.json); the three views draw; SKIN / SKELETON / SKIN + SKELETON; VOLUMES / CONTACT NORMALS / BALL ACCESS /
// DIAGNOSTICS toggle; the eight cameras draw; 1× / 0.5× / 0.25× play; frame step; loop. Screenshots → --shots (never committed: real players' models).
//   PUPPETEER_NODE_MODULES=<dir> node o_browser.cjs --out <evidence dir> --shots <dir> [--node <o_lab_cases.json>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = arg("out"), SHOTS = arg("shots", OUT), BASE = arg("base", "http://127.0.0.1:8365/sandbox/visual/"), NODE = arg("node") ? JSON.parse(fs.readFileSync(arg("node"), "utf8")) : null; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
const checks = [], ok = (name, c, detail) => { checks.push({ name, pass: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail != null ? "  — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""}`); };
(async () => { const prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "opb-")), b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const p = await b.newPage(); await p.setViewport({ width: 1600, height: 950 }); const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); }); p.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push("HTTP " + r.status() + " " + r.url()); });
  const t0 = Date.now(); await p.goto(BASE + "occupy1_lab.html?external=1&play=0", { waitUntil: "load" }); await p.waitForFunction(() => window.OL && OL.ready(), { timeout: 240000 });
  ok("the page loads (TOUCHLINE — PLAYER OCCUPANCY V1 REVIEW)", await p.evaluate(() => document.querySelector("#bar h1").textContent.includes("PLAYER OCCUPANCY V1 REVIEW")), `${((Date.now() - t0) / 1000).toFixed(1)} s to the first case`);
  const painted = (n) => p.evaluate((n) => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h = c.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const cells = n === 1 ? [[0, 0, w, h]] : [[0, 0, w / 2, h], [w / 2, 0, w / 2, h]];
    return cells.map(([x0, y0, cw, ch]) => { let k = 0, m = 0; for (let y = Math.floor(y0) + 3; y < y0 + ch - 3; y += 9) for (let x = Math.floor(x0) + 3; x < x0 + cw - 3; x += 9) { const i = (y * w + x) * 4; k++; if (Math.abs(px[i] - 15) + Math.abs(px[i + 1] - 20) + Math.abs(px[i + 2] - 18) > 24) m++; } return Math.round(100 * m / Math.max(1, k)); }); }, n);
  const overlayInk = () => p.evaluate(() => { const c = document.getElementById("ov"), x = c.getContext("2d"), d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 20) n++; return n; });
  const hashView = () => p.evaluate(() => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h0 = c.height, px = new Uint8Array(w * h0 * 4); gl.readPixels(0, 0, w, h0, gl.RGBA, gl.UNSIGNED_BYTE, px); let h = 0; for (let i = 0; i < px.length; i += 4 * 13) h = (h * 31 + px[i] + 7 * px[i + 1] + 13 * px[i + 2]) >>> 0; return h; });
  const shot = async (name) => { const el = await p.$("#stage"); await el.screenshot({ path: path.join(SHOTS, name + ".jpg"), type: "jpeg", quality: 72 }); };
  const ids = await p.evaluate(() => OL.L.cases.map((c) => c.id)); let drawn = 0, match = 0, compared = 0; const rows = [];
  for (const id of ids) { await p.evaluate((id) => OL.select(id), id); const rep = await p.evaluate(() => OL.report()), tb = rep.runs.OLD.bestT != null ? rep.runs.OLD.bestT : 0.6;
    await p.evaluate((t) => OL.seek(t), tb); await sleep(20); const v = await painted(2); if (v.every((x) => x > 15)) drawn++; rows.push({ id, painted: v, runs: rep.runs });
    if (NODE) { const n = NODE.find((x) => x.id === id); if (n) { compared++; const same = ["OLD", "OCC"].every((m) => Math.abs(n.runs[m].best - Math.max(0, rep.runs[m].best)) < 1e-4 && n.runs[m].over5 === rep.runs[m].over5 && n.runs[m].out === rep.runs[m].out && n.runs[m].through === rep.runs[m].through && n.runs[m].blocked === rep.runs[m].blocked); if (same) match++; else console.log("   ≠", id, JSON.stringify(n.runs), JSON.stringify(rep.runs)); } }
    if (["static-walk", "headon-jog", "side", "cross", "race", "carry-jog-l", "cut", "in-bf", "in-croq", "croq-close", "both-committed"].includes(id)) await shot(`case_${id}_old_vs_occ_at_old_deepest`); }
  ok("every case simulates OLD and OCCUPANCY V1 and both viewports draw", drawn === ids.length, `${drawn}/${ids.length}`);
  if (NODE) ok("the page's numbers equal node's (deepest, ticks > 5 cm, outcome, through, blocked), both modes", match === compared && compared > 0, `${match}/${compared}`);
  // the views
  await p.evaluate(() => OL.select("headon-jog")); const R0 = await p.evaluate(() => OL.report()); await p.evaluate((t) => OL.seek(t), R0.runs.OLD.bestT);
  for (const [lay, n, nm] of [["2", 2, "OLD | OCCUPANCY"], ["OLD", 1, "OLD"], ["OCC", 1, "OCCUPANCY V1"]]) { await p.evaluate((l) => { OL.layout(l); OL.seek(OL.L.t - OL.L.cur.t0); }, lay); await sleep(30); const v = await painted(n); ok(`view ${nm}: every viewport draws`, v.every((x) => x > 15), v); await shot(`view_${lay}_headon_jog`); }
  const hO = await (async () => { await p.evaluate(() => { OL.layout("OLD"); OL.seek(OL.L.t - OL.L.cur.t0); }); return hashView(); })(), hC = await (async () => { await p.evaluate(() => { OL.layout("OCC"); OL.seek(OL.L.t - OL.L.cur.t0); }); return hashView(); })();
  ok("OLD and OCCUPANCY V1 draw different replays of the same inputs (head-on jog at OLD's deepest)", hO !== hC, { hO, hC });
  // body display
  await p.evaluate(() => OL.layout("2")); const bh = {}; for (const s of ["skin", "skel", "both"]) { await p.evaluate((s) => { OL.show(s); OL.seek(OL.L.t - OL.L.cur.t0); }, s); await sleep(20); bh[s] = await hashView(); await shot(`body_${s}`); }
  ok("SKIN / SKELETON / SKIN + SKELETON draw (skeleton-only differs from skin)", bh.skin !== bh.skel, bh); await p.evaluate(() => OL.show("skin"));
  // overlays
  // (the diagnostics panel stays on while the overlays are compared: hiding it widens the canvas, and the ink with it)
  const ink = {}; for (const [nm, o] of [["all overlays", { vol: 1, nrm: 1, acc: 1, diag: 1 }], ["volumes off", { vol: 0, nrm: 1, acc: 1, diag: 1 }], ["normals off", { vol: 0, nrm: 0, acc: 1, diag: 1 }], ["ball access off", { vol: 0, nrm: 0, acc: 0, diag: 1 }]]) { await p.evaluate((o) => OL.set(o), o); await sleep(20); ink[nm] = await overlayInk(); await shot("overlay_" + nm.replace(/[^a-z]+/g, "_")); }
  await p.evaluate(() => OL.set({ diag: 0 })); await sleep(20); await shot("overlay_plain");
  ok("VOLUMES / CONTACT NORMALS / BALL ACCESS toggle (overlay ink falls as each goes off)", ink["all overlays"] > ink["volumes off"] && ink["volumes off"] >= ink["normals off"] && ink["normals off"] >= ink["ball access off"], ink);
  const diagHidden = await p.evaluate(() => document.getElementById("diag").classList.contains("hidden")); ok("DIAGNOSTICS off hides the panel", diagHidden); await p.evaluate(() => OL.set({ vol: 1, nrm: 1, acc: 1, diag: 1 }));
  const diagText = await p.evaluate(() => { OL.mode("OCC"); OL.layout("2"); OL.seek(OL.report().runs.OLD.bestT); return document.getElementById("diag").textContent; });
  ok("the diagnostics show both modes' records, the playhead's pairs and the occupancy's state", ["deepest", "per region", "ball contacts", "AT THE PLAYHEAD", "OCCUPANCY AT THIS TICK", "share", "root correction"].every((s) => diagText.includes(s)));
  // the ball-access path: a case with a blocked touch / a through-the-body contact in OLD
  const acc = await p.evaluate(() => { for (const id of ["race", "carry-jog-l", "in-steer", "headon-jog"]) { OL.select(id); const C = OL.L.cur, R = C.runs.OCC, e = R.W.occ.events.find((x) => /BLOCKED/.test(x.kind)); if (e) { OL.seek(e.t - C.t0 + 0.02); return { id, t: e.t - C.t0, kind: e.kind }; } } return null; });
  ok("BALL ACCESS: a touch / boot BLOCKED under occupancy is shown", !!acc, acc); if (acc) await shot(`access_blocked_${acc.id}`);
  // cameras
  const cams = ["gameplay", "front", "rear", "sideL", "sideR", "q3f", "q3r", "top"], ch = {}; let camOk = true; await p.evaluate(() => OL.select("side")); const RS = await p.evaluate(() => OL.report()); await p.evaluate((t) => OL.seek(t), RS.runs.OLD.bestT);
  for (const c of cams) { await p.evaluate((c) => OL.cam(c), c); await sleep(20); const v = await painted(2); if (!v.every((x) => x > 15)) camOk = false; ch[c] = await hashView(); await shot(`cam_${c}_side`); }
  ok("the eight cameras draw, each a different view", camOk && new Set(Object.values(ch)).size === cams.length, Object.keys(ch).length); await p.evaluate(() => OL.cam("gameplay"));
  // transport: frame step, rates, loop
  const ta = await p.evaluate(() => OL.L.t); await p.click("#bFwd"); const tb = await p.evaluate(() => OL.L.t); ok("frame step moves the playhead 4 ticks", Math.abs(tb - ta - 4 / 240) < 1e-6, (tb - ta) * 240);
  const rates = {}; for (const r of [1, 0.5, 0.25]) { await p.evaluate((r) => { OL.live(); OL.seek(0); OL.play(r); }, r); await sleep(600); rates[r] = await p.evaluate(() => { OL.L.playing = false; return OL.L.t - OL.L.cur.t0; }); }
  ok("1× / 0.5× / 0.25× play at their rates (the playhead after 0.6 s of wall clock)", rates[1] > rates[0.5] && rates[0.5] > rates[0.25] && rates[0.25] > 0, rates);
  await p.click("#bLoop"); const looped = await p.evaluate(async () => { const C = OL.L.cur; OL.L.t = C.clip[1] - 0.01; OL.play(1); await new Promise((r) => setTimeout(r, 300)); const t = OL.L.t; OL.L.playing = false; return t < C.clip[1] - 0.05; }); ok("LOOP wraps the replay to its start", looped);
  ok("0 console / HTTP errors", errs.length === 0, errs.slice(0, 5));
  fs.writeFileSync(path.join(OUT, "browser.json"), JSON.stringify({ checks, rows, errs }, null, 1)); console.log(`\n${checks.filter((c) => c.pass).length} / ${checks.length} checks pass`); await b.close(); process.exit(checks.every((c) => c.pass) ? 0 : 1); })().catch((e) => { console.error(e); process.exit(2); });

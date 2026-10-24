// lsi1/tools/lsr_browser.cjs — LEFT-STICK INPUT LAB V1 in Chrome (headless), end to end:
//   A  the lab (profile 1): boots with 0 console / HTTP errors; the eight RECORDER-TEST traces (lsr_synth.js) recorded through the virtual stick
//      path into the canonical footballer (RESET start), each reviewed and SAVED (SMOOTH 90° three times, for the comparison); a REAL pointer drag
//      on the virtual stick (CDP mouse events: down · moves · up) — its raw / coalesced events, its source, the event → applied-frame latency;
//      the KEYBOARD (WASD through the sandbox's own path); a CONTINUOUS start (the 1.5 s pre-roll); an intent MARK; the sandbox keys the lab takes
//      (R pressed inside the sandbox's frame must not reset the session); the ATTEMPTS and COMPARE tabs; every saved attempt re-simulated in the
//      page (PT.load) — hash and state track identical; the dataset exported (LSR.dataset — what EXPORT writes)
//   B  a fresh profile: the dataset IMPORTED, every attempt replayed by re-simulation — identical; its summaries = profile 1's
//   C  CPU: the canonical sandbox page alone vs the lab (diagnostics OFF · ON · ON + recording), the same scripted stick for 20 s each
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node lsr_browser.cjs --out <evidence dir> --shots <dir, not committed> [--base http://127.0.0.1:8362/sandbox/visual/] [--cpu 20]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = arg("out"), SHOTS = arg("shots", OUT), BASE = arg("base", "http://127.0.0.1:8362/sandbox/visual/"), CPU_S = +arg("cpu", 20); fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", TMP = process.env.PT_TMP || os.tmpdir();
const res = { A: {}, B: {}, C: {}, errors: {} }, checks = []; const ok = (name, c, detail) => { checks.push({ name, pass: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail != null ? "  — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""}`); };
async function browser() { const prof = fs.mkdtempSync(path.join(TMP, "lsr-")); const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1600,940", "--autoplay-policy=no-user-gesture-required"] }); b.__prof = prof; return b; }
async function close(b) { await b.close(); fs.rmSync(b.__prof, { recursive: true, force: true }); }
async function page(b, url, key) { const p = await b.newPage(); await p.setViewport({ width: 1600, height: 940 }); const logs = (res.errors[key] = []);
  p.on("pageerror", (e) => logs.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push("console: " + m.text()); }); p.on("response", (r) => { if (r.status() >= 400) logs.push("HTTP " + r.status() + " " + r.url()); });
  await p.goto(BASE + url, { waitUntil: "load" }); return p; }
const waitState = (p, s, ms = 30000) => p.waitForFunction((s) => window.LSR && LSR.state && LSR.state() === s, { timeout: ms }, s);
const curInfo = (p) => p.evaluate(() => { const a = LSR.current(), s = a.summary; const kinds = {}; for (let i = 0; i < a.raw.n; i++) { const k = ["down", "move", "coalesced", "up", "gamepad", "keydown", "keyup", "synthetic"][a.raw.data.kind[i]]; kinds[k] = (kinds[k] || 0) + 1; }
  const ev = {}; for (const e of a.stickEvents) ev[e.kind] = (ev[e.kind] || 0) + 1; const tl = {}; for (const e of a.timeline) tl[e.kind] = (tl[e.kind] || 0) + 1;
  const lat = []; const F = a.frames.data; for (let i = 0; i < a.raw.n; i++) { const k = a.raw.data.appliedK[i]; if (k == null) continue; const j = F.k.indexOf(k); if (j >= 0) lat.push((F.tHost[j] - a.raw.data.tHost[i]) * 1000); }
  lat.sort((x, y) => x - y); const delivered = a.ticks.reqH.filter((v) => v != null).length;
  return { id: a.id, label: a.label, source: a.input.source, mode: a.capture.mode, k0: a.capture.k0, kStart: a.capture.kStart, k1: a.capture.k1, dur: +a.capture.duration.toFixed(3), frames: a.frames.n, frameHz: +(a.input.frameHz || 0).toFixed(1), raw: a.raw.n, rawKinds: kinds, state: a.state.n,
    timeline: tl, stickEvents: ev, delivered, ticks: a.ticks.reqH.length, preRollFrames: a.frames.data.tSim.filter((t) => t < a.capture.tStart - 1e-9).length, latencyMs: lat.length ? { n: lat.length, median: +lat[lat.length >> 1].toFixed(2), max: +lat[lat.length - 1].toFixed(2) } : null,
    summary: { travel: +s.travel.toFixed(2), maxR: +s.maxR.toFixed(3), d150: s.d150.v, peakOm: s.peakOm.v, crossings: s.crossings, reversals: s.reversals, startDir: s.startDir, speedA: s.speedA, supA: s.supA, stepPhaseA: s.stepPhaseA, nextTDA: s.nextTDA, firstAction: s.firstAction, firstContact: s.firstContact, anchor: s.anchor },
    flags: a.flags, bytes: JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k]) => !k.startsWith("_")))).length }; });
(async () => {
  // ═══ A ═══
  let b = await browser(), p = await page(b, "lsi1_lab.html", "lab_A"); await waitState(p, "LIVE", 120000); await sleep(1200);
  res.A.checks = await p.evaluate(() => LSR.L.checks); ok("the lab boots on the canonical sandbox (layered · EXPANDED · D38 · CONTROLLED · CARRY-B · ball on)", res.A.checks.engine === "layered" && res.A.checks.vocab === "EXPANDED" && res.A.checks.pace === "D38" && res.A.checks.control === "CONTROLLED" && res.A.checks.ballOn, res.A.checks);
  ok("the old analog feint is OFF in the framed sandbox", res.A.checks.analogFeint === false);
  ok("the framed page is the canonical sandbox in external mode", await p.evaluate(() => /vocab2_sandbox\.html\?external=1/.test(document.getElementById("sim").src) && LSR.L.V.external === true));
  await p.screenshot({ path: path.join(SHOTS, "A0_live.jpg"), type: "jpeg", quality: 72 });
  const SY = ["straight_hold", "smooth_45", "smooth_90", "rapid_90", "reversal_180", "right_left", "neutral_dir", "dir_neutral", "smooth_90", "smooth_90"]; res.A.synth = [];
  for (const id of SY) { await p.evaluate((id) => LSR.synth(id), id); await waitState(p, "REVIEW", 30000); await sleep(400); const info = await curInfo(p); info.trace = id; res.A.synth.push(info);
    if (id === "right_left" || (id === "smooth_90" && res.A.synth.filter((x) => x.trace === "smooth_90").length === 1)) { await p.evaluate(() => { LSR.L.V.replay.t = LSR.L.V.replay.t0 + 1.62; LSR.L.V.replay.playing = false; }); await sleep(500); await p.screenshot({ path: path.join(SHOTS, `A1_review_${id}.jpg`), type: "jpeg", quality: 72 }); }
    await p.evaluate(() => LSR.save()); await waitState(p, "LIVE"); await sleep(250); }
  for (const s of res.A.synth) ok(`recorder test ${s.trace}: recorded through the real footballer (source synthetic, ${s.frames} frames ≈ ${s.frameHz} Hz, ${s.state} state rows, request delivered on ${s.delivered} / ${s.ticks} ticks)`, s.source === "synthetic" && s.frames > 100 && s.state > 300 && s.delivered > 0 && (s.timeline.touchdown || 0) > 0, { ev: s.stickEvents, tl: s.timeline });
  const sy = (id) => res.A.synth.find((x) => x.trace === id);
  ok("straight hold: no angular travel, no reversal / crossing", sy("straight_hold").summary.travel < 0.01 && !sy("straight_hold").stickEvents.reversal && !sy("straight_hold").stickEvents.centre_cross, sy("straight_hold").summary);
  ok("smooth 45°: angular travel 45°, no large-turn marker", Math.abs(sy("smooth_45").summary.travel - 45) < 0.1 && !sy("smooth_45").stickEvents.large_turn, sy("smooth_45").summary.travel);
  ok("smooth 90°: angular travel 90°", Math.abs(sy("smooth_90").summary.travel - 90) < 0.1, sy("smooth_90").summary.travel);
  ok("rapid 90°: one large-turn marker, |Δ150| ≈ 90°", sy("rapid_90").stickEvents.large_turn === 1 && Math.abs(Math.abs(sy("rapid_90").summary.d150) - 90) < 0.5, sy("rapid_90").summary);
  ok("180° reversal: one centre crossing, one rapid reversal", sy("reversal_180").stickEvents.centre_cross === 1 && sy("reversal_180").stickEvents.reversal === 1, sy("reversal_180").stickEvents);
  ok("right → left: one centre crossing, one rapid reversal, start +90°", sy("right_left").stickEvents.centre_cross === 1 && sy("right_left").stickEvents.reversal === 1 && Math.abs(sy("right_left").summary.startDir - 90) < 0.01, sy("right_left").stickEvents);
  ok("neutral → direction: deadzone exit + magnitude spike, start +30°", sy("neutral_dir").stickEvents.dz_exit === 1 && sy("neutral_dir").stickEvents.mag_spike === 1 && Math.abs(sy("neutral_dir").summary.startDir - 30) < 0.01, sy("neutral_dir").stickEvents);
  ok("direction → neutral: deadzone entry + magnitude release, the request ends", sy("dir_neutral").stickEvents.dz_enter === 1 && sy("dir_neutral").stickEvents.mag_release === 1 && sy("dir_neutral").delivered < sy("dir_neutral").ticks, sy("dir_neutral").stickEvents);
  // the REAL pointer path: CDP mouse events on the virtual stick
  const pad = await p.$eval("#pad", (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }), R = await p.evaluate(() => LSR.L.padR);
  await p.evaluate(() => { LSR.capture("RESET"); LSR.label("RECORDER TEST · POINTER (CDP mouse)"); LSR.start(); }); await sleep(150);
  await p.mouse.move(pad.x, pad.y); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(pad.x + (R * i) / 10, pad.y); await sleep(25); }
  for (let i = 0; i < 40; i++) { await p.mouse.move(pad.x + R * Math.cos(i * 0.02), pad.y - R * Math.sin(i * 0.02)); await sleep(30); }
  for (let i = 1; i <= 6; i++) { await p.mouse.move(pad.x + R * (1 - (2 * i) / 6), pad.y); await sleep(20); } for (let i = 0; i < 30; i++) { await p.mouse.move(pad.x - R, pad.y + (i % 2)); await sleep(30); }
  await p.mouse.up(); await sleep(400); await p.evaluate(() => LSR.stop()); await waitState(p, "REVIEW"); await sleep(300);
  await p.evaluate(() => { LSR.L.V.replay.t = LSR.L.V.replay.t0 + 1.2; LSR.L.V.replay.playing = false; }); await sleep(200); await p.evaluate(() => LSR.mark());
  res.A.pointer = await curInfo(p); res.A.pointer.mark = await p.evaluate(() => LSR.current().owner.mark);
  ok("pointer: source mouse, raw down / move-or-coalesced / up logged, request delivered", res.A.pointer.source === "mouse" && res.A.pointer.rawKinds.down === 1 && res.A.pointer.rawKinds.up === 1 && (res.A.pointer.rawKinds.coalesced || res.A.pointer.rawKinds.move) > 20 && res.A.pointer.delivered > 100, res.A.pointer.rawKinds);
  ok("pointer: the drag through the centre shows as a crossing", (res.A.pointer.stickEvents.centre_cross || 0) >= 1, res.A.pointer.stickEvents);
  ok("pointer: raw event → the frame that applied it ≤ one frame", res.A.pointer.latencyMs && res.A.pointer.latencyMs.max <= 34, res.A.pointer.latencyMs);
  ok("an intent MARK is stored and becomes the anchor", res.A.pointer.mark != null && res.A.pointer.summary.anchor.kind === "mark", res.A.pointer.summary.anchor);
  await sleep(300); await p.screenshot({ path: path.join(SHOTS, "A2_review_pointer.jpg"), type: "jpeg", quality: 72 }); await p.evaluate(() => LSR.save()); await waitState(p, "LIVE"); await sleep(300);
  // the KEYBOARD (focus on the lab: forwarded into the sandbox's own key handler)
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); LSR.label("RECORDER TEST · KEYBOARD (WASD)"); LSR.start(); }); await sleep(100);
  await p.keyboard.down("KeyW"); await sleep(1500); await p.keyboard.down("KeyD"); await sleep(600); await p.keyboard.up("KeyD"); await p.keyboard.up("KeyW"); await sleep(500); await p.evaluate(() => LSR.stop()); await waitState(p, "REVIEW");
  res.A.keys = await curInfo(p); ok("keyboard: source keys, key events logged, the request delivered (WASD through the sandbox's path)", res.A.keys.source === "keys" && (res.A.keys.rawKinds.keydown || 0) >= 2 && res.A.keys.delivered > 300, res.A.keys.rawKinds);
  await p.evaluate(() => LSR.save()); await waitState(p, "LIVE"); await sleep(300);
  // CONTINUOUS: dribbling before START, the 1.5 s pre-roll in the attempt
  await p.evaluate(() => { LSR.capture("CONTINUOUS"); LSR.label("RECORDER TEST · CONTINUOUS"); }); await p.mouse.move(pad.x, pad.y); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(pad.x, pad.y - (R * i) / 8); await sleep(20); }
  for (let i = 0; i < 60; i++) { await p.mouse.move(pad.x + (i % 2), pad.y - R); await sleep(33); } await p.evaluate(() => LSR.start());
  for (let i = 0; i < 25; i++) { await p.mouse.move(pad.x + (i % 2), pad.y - R); await sleep(33); } for (let i = 1; i <= 12; i++) { const a = (i / 12) * (Math.PI / 2); await p.mouse.move(pad.x + R * Math.sin(a), pad.y - R * Math.cos(a)); await sleep(33); }
  for (let i = 0; i < 20; i++) { await p.mouse.move(pad.x + R, pad.y + (i % 2)); await sleep(33); } await p.mouse.up(); await sleep(200); await p.evaluate(() => LSR.stop()); await waitState(p, "REVIEW");
  res.A.cont = await curInfo(p); ok("CONTINUOUS: k0 = START − 1.5 s, pre-roll frames recorded", res.A.cont.mode === "CONTINUOUS" && res.A.cont.kStart - res.A.cont.k0 === 360 && res.A.cont.preRollFrames >= 80, { k0: res.A.cont.k0, kStart: res.A.cont.kStart, pre: res.A.cont.preRollFrames });
  await p.evaluate(() => LSR.save()); await waitState(p, "LIVE"); await sleep(300);
  const lastId = await p.evaluate(() => LSR.attempts()[LSR.attempts().length - 1].id); await p.evaluate((id) => LSR.replay(id), lastId); await sleep(600); res.A.replayLive = await p.evaluate(() => [LSR.state(), LSR.L.replay && LSR.L.replay.det]); await p.evaluate(() => LSR.live()); await sleep(200);
  ok("REPLAY of a saved attempt still in the live session runs on it (no re-simulation)", res.A.replayLive[0] === "REPLAY" && /live session/.test(res.A.replayLive[1]), res.A.replayLive);
  await p.evaluate(() => LSR.capture("RESET")); await sleep(300);
  // a GAMEPAD (emulated: navigator.getGamepads replaced in the page — the lab's own polling, button mapping and stick path run unchanged):
  // Menu (9) starts, the left stick runs up then swings right, Menu stops, A (0) saves
  await p.evaluate(() => { const pad = { id: "EMULATED standard gamepad", connected: true, mapping: "standard", timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__gp = pad; navigator.getGamepads = () => [pad]; LSR.label("RECORDER TEST · GAMEPAD (emulated)");
    window.__gpSet = (ax, ay, btn) => { pad.axes[0] = ax; pad.axes[1] = -ay; pad.buttons.forEach((b, i) => { b.value = btn === i ? 1 : 0; b.pressed = btn === i; }); pad.timestamp = performance.now(); }; });
  await p.evaluate(() => __gpSet(0, 0, 9)); await sleep(80); await p.evaluate(() => __gpSet(0, 0, -1)); await sleep(100); const gpRec = await p.evaluate(() => LSR.state());
  for (let i = 0; i <= 60; i++) { const t = i / 60, a = t < 0.5 ? 0 : Math.min(1, (t - 0.5) / 0.25) * Math.PI / 2; await p.evaluate((x, y) => __gpSet(x, y, -1), Math.sin(a) * 0.97, Math.cos(a) * 0.97); await sleep(33); }
  await p.evaluate(() => __gpSet(0, 0, -1)); await sleep(200); await p.evaluate(() => __gpSet(0, 0, 9)); await sleep(80); await p.evaluate(() => __gpSet(0, 0, -1)); await waitState(p, "REVIEW"); res.A.gamepad = await curInfo(p);
  await p.evaluate(() => __gpSet(0, 0, 0)); await sleep(80); await p.evaluate(() => __gpSet(0, 0, -1)); await waitState(p, "LIVE"); const gpSaved = await p.evaluate(() => LSR.attempts().some((a) => a.label === "RECORDER TEST · GAMEPAD (emulated)"));
  ok("gamepad: Menu starts / stops, A saves; source gamepad, raw axes logged, the request delivered", gpRec === "REC" && gpSaved && res.A.gamepad.source === "gamepad" && (res.A.gamepad.rawKinds.gamepad || 0) > 30 && res.A.gamepad.delivered > 200, { gpRec, gpSaved, src: res.A.gamepad.source, raw: res.A.gamepad.rawKinds, delivered: res.A.gamepad.delivered });
  await p.evaluate(() => { delete navigator.getGamepads; LSR.L.gp.active = false; LSR.L.PT.stick(null); }); await sleep(200);
  // the sandbox keys the lab takes: R inside the sandbox's frame must not reset the session
  const tagBefore = await p.evaluate(() => LSR.L.tags.get(LSR.L.V.sim)); const fr = await p.$("#sim"), frBox = await fr.boundingBox(); await p.mouse.click(frBox.x + frBox.width * 0.6, frBox.y + frBox.height * 0.6); await sleep(150);
  await p.keyboard.press("KeyR"); await sleep(300); const tagAfter = await p.evaluate(() => LSR.L.tags.get(LSR.L.V.sim)); ok("R pressed inside the sandbox's frame is taken by the lab (no session reset)", tagBefore === tagAfter, { tagBefore, tagAfter });
  await p.keyboard.press("Enter"); await sleep(1200); const recByEnter = await p.evaluate(() => LSR.state()); await p.keyboard.press("Enter"); await sleep(300); const afterEnter = await p.evaluate(() => LSR.state());
  ok("Enter (focus inside the sandbox's frame) starts and stops a recording", recByEnter === "REC" && afterEnter === "REVIEW", { recByEnter, afterEnter }); await p.keyboard.press("Backspace"); await waitState(p, "LIVE"); ok("Backspace discards", true);
  // the tabs
  await p.evaluate(() => document.querySelector('#tabs button[data-tab="list"]').click()); await sleep(400); res.A.listRows = await p.evaluate(() => document.querySelectorAll("#attTable tr").length - 1); res.A.statRows = await p.evaluate(() => document.querySelectorAll("#statTable tr").length - 1);
  const nSaved = await p.evaluate(() => LSR.attempts().length); ok(`the ATTEMPTS tab lists every saved attempt (${nSaved}) and the per-label statistics`, res.A.listRows === nSaved && res.A.statRows >= 10, { rows: res.A.listRows, labels: res.A.statRows }); await p.screenshot({ path: path.join(SHOTS, "A3_attempts.jpg"), type: "jpeg", quality: 72 });
  await p.evaluate(() => { document.querySelector('#tabs button[data-tab="cmp"]').click(); const s = document.getElementById("cmpLabel"); s.value = "RECORDER TEST · SMOOTH 90° TURN"; s.onchange({ target: s }); const h = document.getElementById("cmpHi"); h.value = h.options[2].value; h.onchange({ target: h }); }); await sleep(500);
  res.A.cmp = await p.evaluate(() => ({ stats: document.querySelectorAll("#cmpStats tr").length - 1, entry: document.querySelectorAll("#cmpEntry tr").length - 1 })); ok("COMPARE: the three SMOOTH 90° attempts overlaid, statistics and entry state", res.A.cmp.entry === 3 && res.A.cmp.stats >= 10, res.A.cmp);
  await p.screenshot({ path: path.join(SHOTS, "A4_compare.jpg"), type: "jpeg", quality: 72 }); await p.evaluate(() => document.querySelector('#tabs button[data-tab="live"]').click());
  // a saved attempt's replay: the live one (no re-simulation) and every one re-simulated in the page
  const ids = await p.evaluate(() => LSR.attempts().map((a) => a.id));
  res.A.resim = []; for (const id of ids) { const r = await p.evaluate((id) => { const a = LSR.attempts().find((x) => x.id === id); const o = LSR.resim(a); const out = { label: a.label, ok: o.ok, det: o.det }; LSR.live(); return out; }, id); res.A.resim.push(r); }
  ok(`every saved attempt re-simulated in the page (PT.load): hash + state track identical (${res.A.resim.filter((x) => x.ok).length}/${res.A.resim.length})`, res.A.resim.every((x) => x.ok), res.A.resim.filter((x) => !x.ok));
  const D = await p.evaluate(() => LSR.dataset()); fs.writeFileSync(path.join(OUT, "lsr_recorder_tests.json"), JSON.stringify(D)); res.A.datasetKB = +(JSON.stringify(D).length / 1024).toFixed(1); res.A.attempts = D.attempts.length;
  ok(`the dataset exported (${D.attempts.length} attempts, ${res.A.datasetKB} KB, schema ${D.schema} v${D.version})`, D.schema === "TOUCHLINE_LEFT_STICK_RECORDING_V1" && D.attempts.length === nSaved && D.meta.milestone.commit === "f775daac80bb58f214f7ae011705162e4d4e9e95");
  res.A.summaries = await p.evaluate(() => LSR.attempts().map((a) => JSON.stringify(a.summary)));
  await close(b);
  // ═══ B: a fresh profile — import, replay (re-simulated) ═══
  b = await browser(); p = await page(b, "lsi1_lab.html", "lab_B"); await waitState(p, "LIVE", 120000); await sleep(800);
  const n0 = await p.evaluate(() => LSR.attempts().length); const imp = await p.evaluate((d) => LSR.importObj(d), D); const n1 = await p.evaluate(() => LSR.attempts().length);
  ok(`IMPORT into a fresh browser profile: ${n1} attempts (was ${n0})`, n0 === 0 && n1 === D.attempts.length && imp.errs.length === 0, imp);
  res.B.replays = []; for (const a of D.attempts) { await p.evaluate((id) => LSR.replay(id), a.id); await p.waitForFunction(() => LSR.state() === "REPLAY", { timeout: 30000 }); await sleep(150); const r = await p.evaluate(() => ({ det: LSR.L.replay.det, ok: LSR.L.replay.ok, label: LSR.current().label })); res.B.replays.push(r); await p.evaluate(() => LSR.live()); await sleep(100); }
  ok(`every imported attempt replays by re-simulation, identical (${res.B.replays.filter((x) => x.ok).length}/${res.B.replays.length})`, res.B.replays.every((x) => x.ok), res.B.replays.filter((x) => !x.ok));
  const sB = await p.evaluate(() => LSR.attempts().map((a) => JSON.stringify(a.summary))); ok("the imported attempts' summaries = the recorded ones", JSON.stringify(sB) === JSON.stringify(res.A.summaries));
  await p.evaluate((id) => LSR.replay(id), D.attempts.find((a) => /RIGHT → LEFT/.test(a.label)).id); await sleep(300); await p.evaluate(() => { LSR.L.V.replay.t = LSR.L.V.replay.t0 + 1.62; LSR.L.V.replay.playing = false; }); await sleep(500);
  await p.screenshot({ path: path.join(SHOTS, "B1_imported_replay.jpg"), type: "jpeg", quality: 72 }); await close(b);
  // ═══ C: CPU — the same scripted stick for CPU_S seconds ═══
  const drive = `window.__drive = (PTx, dur) => new Promise((res) => { let t0 = null; const f = (ts) => { if (t0 == null) t0 = ts; const t = (ts - t0) / 1000; if (t > dur) { PTx.stick(null); res(); return; }
    const a = 70 * Math.sin(2 * Math.PI * t / 2.5) * Math.PI / 180, r = t % 5 < 4.6 ? 1 : 0.3; PTx.stick(Math.sin(a) * r, Math.cos(a) * r); requestAnimationFrame(f); }; requestAnimationFrame(f); });`;
  const stat = (o) => ({ avg: +o.avg.toFixed(3), p95: +o.p95.toFixed(3), p99: +o.p99.toFixed(3), n: o.n });
  b = await browser(); p = await page(b, "vocab2_sandbox.html", "sandbox_C"); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 120000 }); await sleep(1500); await p.evaluate(drive);
  await p.evaluate(() => { PT.reset(); PT.resetPerf(); }); await p.evaluate((d) => __drive(PT, d), CPU_S); const pc = await p.evaluate(() => PT.perf()); res.C.canonical = { work: stat(pc.work), sim: stat(pc.sim), frame: stat(pc.frame) }; await close(b);
  for (const mode of ["OFF", "ON", "REC"]) { b = await browser(); p = await page(b, "lsi1_lab.html", "lab_C_" + mode); await waitState(p, "LIVE", 120000); await sleep(1500); await p.evaluate(drive);
    await p.evaluate((m) => { LSR.setDiag(m !== "OFF"); LSR.L.PT.reset(); if (m === "REC") { LSR.capture("RESET"); LSR.label("CPU"); LSR.start(); } LSR.resetPerf(); LSR.L.PT.resetPerf(); }, mode);
    const dur = mode === "REC" ? Math.min(CPU_S, 11) : CPU_S; await p.evaluate((d) => __drive(LSR.L.PT, d), dur);
    const o = await p.evaluate(() => ({ pt: LSR.L.PT.perf(), lab: LSR.perf() })); if (mode === "REC") { const t0 = Date.now(); await p.evaluate(() => LSR.stop()); res.C.stopMs = Date.now() - t0; }
    res.C["lab_" + mode] = { work: stat(o.pt.work), sim: stat(o.pt.sim), frame: stat(o.pt.frame), labHost: stat(o.lab.host), labTick: stat(o.lab.tick) }; await close(b); }
  const C = res.C; ok(`CPU — canonical page work ${C.canonical.work.avg} ms/frame (sim ${C.canonical.sim.avg}); lab diagnostics OFF: page work ${C.lab_OFF.work.avg} + lab ${C.lab_OFF.labHost.avg} ms/frame (p99 ${C.lab_OFF.labHost.p99}); ON: + ${C.lab_ON.labHost.avg} (p99 ${C.lab_ON.labHost.p99}); recording: + ${C.lab_REC.labHost.avg}`, C.lab_OFF.labHost.avg < 0.25, C);
  for (const [k, v] of Object.entries(res.errors)) ok(`no console / HTTP errors: ${k}`, v.length === 0, v.slice(0, 5));
  res.checks = checks; fs.writeFileSync(path.join(OUT, "lsr_browser.json"), JSON.stringify(res, null, 1));
  console.log(`\n${checks.filter((c) => c.pass).length}/${checks.length} checks pass`); process.exit(checks.every((c) => c.pass) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });

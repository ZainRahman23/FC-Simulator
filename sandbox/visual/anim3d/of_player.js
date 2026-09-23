// ═══ anim3d/of_player.js — PLAYABLE OUTFIELD LOCOMOTION TEST HARNESS on the real playtest (presentation only) ═══
// Enable with  ?ofPlay=1[&body=AVG_ATHLETIC][&fps=60][&runners=N]  on match.html.
// The single-player playtest's own authoritative field player (`S.pt.p`: the ported world.py locomotion law — acceleration, plant brake,
// lateral limit, run 5.0 / sprint 8.2 m/s, facing toward the velocity) is driven by the playtest's own keys (W A S D / arrows, Shift =
// sprint). This harness never writes the player or the ball; it replaces the SPRITE presentation of the field player by the outfield
// skeletal rig + LOCOMOTION V1 (of_loco.js) solved from the authoritative root / velocity / facing every simulation tick, rendered
// through the generic skinned program in a render ROI at twice the canvas density (the approved Mixed composition), the view following
// the player, the camera rail following the player's x. Diagnostics (foot contacts, plant residuals, gait state, root vs presentation
// root, timing split) are on the HUD and in OFPLAY.rec (per tick, deterministic). Optional extra runners (deterministic laps, the same
// locomotion) for the scaling test. The ball is parked far away at boot (a fixture set-up, like the goalkeeper fixtures) and ignored.
const OFPLAY = { on: false, body: "AVG_ATHLETIC", actor: null, mixed: true, follow: true, dbg: { feet: true, roots: true, hud: true }, rec: [], recMax: 3600, runners: [], panel: null, out: null, octx: null, perf: { sim: [], anim: [], skin: [], render: [], comp: [] }, R: null, lastTick: -1, view: null };
function ofPlayWanted() { return new URLSearchParams(location.search).get("ofPlay") === "1"; }
function ofPlayMakeActor(bodyId, p) {
  const a = ofActorMake(bodyId, p.x, p.y, p.facing); a.motion = "LOCO"; a.loco = ofLocoMake(); a.state = { feet: {} }; a.sim = { x: p.x, y: p.y, vx: 0, vy: 0, facing: p.facing }; return a;
}
function ofPlayInstall() {
  if (OFPLAY.on) return; OFPLAY.on = true;
  OFPLAY.R = glCreateRenderer();
  // 1. per simulation tick: solve the presentation from the authoritative player (after the playtest stepped it). Deterministic: one solve per 60 Hz step.
  const _step = ptStep; ptStep = function () {
    const t0 = performance.now(); _step(); const tS = performance.now() - t0; const t = S.pt; if (!t || !t.on || !OFPLAY.actor) return;
    const p = t.p, a = OFPLAY.actor; a.x = p.x; a.y = p.y; a.facing = p.facing; a.speed = Math.hypot(p.vx, p.vy); a.sim = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing };
    const t1 = performance.now(); ofActorTick(a, PT_DT, t.now);
    for (const r of OFPLAY.runners) { ofPlayRunnerStep(r, t.now); ofActorTick(r, PT_DT, t.now); }
    const tA = performance.now() - t1;                                                            // ALL rigs (the player and every runner), so the figure scales with the load on screen
    OFPLAY.perf.sim.push(tS); OFPLAY.perf.anim.push(tA); for (const k in OFPLAY.perf) if (OFPLAY.perf[k].length > 600) OFPLAY.perf[k].shift();
    ofPlayRecord(t, a);
  };
  // 2. the field player's sprite draw becomes the skeletal draw (same depth slot in the entity loop)
  const _sprite = ptDrawPlayerSprite; ptDrawPlayerSprite = function (dt) { if (!OFPLAY.actor) return _sprite(dt); ofPlayDraw(dt); };
  // 3. camera rail follows the player's x (the playtest rig is "manual"; the rail eases with RIG.smooth); the Mixed view follows in the canvas
  const _draw = draw; draw = function (sample, dt) {
    if (S.pt && S.pt.on && OFPLAY.follow) { RIG.manualX = Math.max(0, Math.min(105, S.pt.p.x)); }
    _draw(sample, dt); if (OFPLAY.mixed) ofPlayComposite(); else if (OFPLAY.out) OFPLAY.out.style.display = "none"; if (OFPLAY.dbg.hud) ofPlayHud();
  };
  ofPlayDom(); ofPlayKeys();
}
function ofPlayRunnerStep(r, now) {                                                            // extra runners: a deterministic lap mover stands in for their simulation (INPUT to the presentation)
  const L = r.lap, ang = L.ph + now * L.w, nx = L.cx + Math.cos(ang) * L.r, ny = L.cy + Math.sin(ang) * L.r; const vx = (nx - r.x) * 60, vy = (ny - r.y) * 60;
  r.facing = Math.atan2(vy, vx); r.x = nx; r.y = ny; r.sim = { x: nx, y: ny, vx, vy, facing: r.facing }; r.speed = Math.hypot(vx, vy);
}
function ofPlaySetRunners(n) {
  OFPLAY.runners = []; const p = S.pt.p;
  for (let i = 0; i < n; i++) { const id = OF_BODY_ORDER[i % OF_BODY_ORDER.length]; const r = ofPlayMakeActor(id, { x: p.x + 4 + (i % 4) * 3, y: p.y - 6 + Math.floor(i / 4) * 4, facing: 0 }); r.lap = { cx: r.x, cy: r.y, r: 2.6 + (i % 3) * 0.7, w: (2.0 + (i % 4) * 1.6) / (2.6 + (i % 3) * 0.7), ph: i * 0.9 }; OFPLAY.runners.push(r); }
}
function ofPlayRecord(t, a) {
  const d = a.sol.diag, L = a.loco.diag, fk = a.sol.fk, pel = fk.joint[a.skel.byName.pelvis.idx];
  const rec = { tick: Math.round(t.now * 60), t: +t.now.toFixed(4), x: +t.p.x.toFixed(4), y: +t.p.y.toFixed(4), vx: +t.p.vx.toFixed(4), vy: +t.p.vy.toFixed(4), facing: +t.p.facing.toFixed(4), keys: Object.keys(t.keys).filter(k => t.keys[k]).join("+"),
    loco: L, feet: d.feet, knee: d.knee, elbow: d.elbow, jump: d.jump, jerk: d.jerk || 0, ground: d.ground, drop: d.pelvisDrop || 0, pres: [+pel[0].toFixed(4), +pel[1].toFixed(4), +(-pel[2]).toFixed(4)] };
  OFPLAY.rec.push(rec); if (OFPLAY.rec.length > OFPLAY.recMax) OFPLAY.rec.shift();
}
function ofPlayDraw(dt) {
  const t = S.pt, p = t.p, a = OFPLAY.actor; if (!a.sol) return;
  const t0 = performance.now();
  // skin matrices (world × inverse bind) — computed by ofActorTick; extra runners too
  const chars = [{ skel: a.skel, fk: a.sol.fk, skinMats: a.skinMats, palette: SKEL_PARTS }]; for (const r of OFPLAY.runners) if (r.sol) chars.push({ skel: r.skel, fk: r.sol.fk, skinMats: r.skinMats, palette: OFPLAY_KIT_B });
  const t1 = performance.now(); const prev = GL3D.character; GL3D.character = "SKINNED"; const out = glRenderCharacters(OFPLAY.R, chars, cv.width, cv.height, {}); GL3D.character = prev; const tR = performance.now() - t1;
  // shadow at the authoritative root, then the layer (page canvas at the canvas density)
  const sp = sproj3(p.x, 0, p.y); const s = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES, flat = flattenAt(p.x, p.y);
  ctx.save(); ctx.beginPath(); ctx.ellipse(Math.round(sp.x), Math.round(sp.y), 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill(); ctx.restore();
  for (const r of OFPLAY.runners) { const q = sproj3(r.x, 0, r.y); ctx.save(); ctx.beginPath(); ctx.ellipse(Math.round(q.x), Math.round(q.y), 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill(); ctx.restore(); }
  if (!OFPLAY.mixed) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(out.canvas, 0, 0, out.w, out.h, 0, 0, cv.width, cv.height); ctx.restore(); }
  OFPLAY.lastChars = chars; OFPLAY.perf.render.push(tR); OFPLAY.perf.skin.push(performance.now() - t0 - tR);
  if (OFPLAY.dbg.feet || OFPLAY.dbg.roots) ofPlayOverlay(a, p);
}
const OFPLAY_KIT_B = Object.assign({}, SKEL_PARTS, { shirt: [0.92, 0.25, 0.20] });
function ofPlayOverlay(a, p) {                                                                  // diagnostics on the page canvas: foot contact markers (green planted / yellow toe pivot / orange swing), plant points, authoritative root (red) vs presentation pelvis ground point (violet)
  const P3 = (q) => sproj3(q[0], q[1], -q[2]); ctx.save(); ctx.lineWidth = Math.max(1, PXQ);
  for (const sd of ["R", "L"]) { const f = a.sol.diag.feet[sd]; if (!f) continue; const an = P3(f.ankle), tp = P3(f.toe);
    ctx.strokeStyle = f.mode === "toe" ? "#ffe36a" : f.mode === "step" ? "#7fd0ff" : f.locked ? "#38ff9a" : "#ff9a3c"; ctx.beginPath(); ctx.arc(tp.x, tp.y, uipx(3), 0, Math.PI * 2); ctx.stroke();
    if (f.P) { const pp = P3(f.P); ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(pp.x - 1, pp.y - 1, 3, 3); } }
  const sp = sproj3(p.x, 0, p.y); ctx.strokeStyle = "#ff4040"; ctx.beginPath(); ctx.moveTo(sp.x - uipx(5), sp.y); ctx.lineTo(sp.x + uipx(5), sp.y); ctx.moveTo(sp.x, sp.y - uipx(5)); ctx.lineTo(sp.x, sp.y + uipx(5)); ctx.stroke();
  const pel = a.sol.fk.joint[a.skel.byName.pelvis.idx], pg = sproj3(pel[0], 0, -pel[2]); ctx.strokeStyle = "#c080ff"; ctx.beginPath(); ctx.arc(pg.x, pg.y, uipx(4), 0, Math.PI * 2); ctx.stroke();
  const fx = Math.cos(p.facing), fy = Math.sin(p.facing), fp = sproj3(p.x + fx * 0.6, 0, p.y + fy * 0.6); ctx.strokeStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(fp.x, fp.y); ctx.stroke();   // facing
  const v = Math.hypot(p.vx, p.vy); if (v > 0.1) { const vp = sproj3(p.x + p.vx / v * (0.4 + v * 0.1), 0, p.y + p.vy / v * (0.4 + v * 0.1)); ctx.strokeStyle = "#8ab4f8"; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(vp.x, vp.y); ctx.stroke(); }   // velocity
  ctx.restore();
}
function ofPlayComposite() {                                                                    // Mixed: environment nearest ×2 of the page's native pass; the characters re-rendered at 2·RES inside their ROI (one layer px per output px), the view following the player
  const t = S.pt; if (!OFPLAY.out || !OFPLAY.lastChars) return; const out = OFPLAY.out, octx = OFPLAY.octx; out.style.display = "block";
  const W = Math.round(out.clientWidth * RES), H = Math.round(out.clientHeight * RES); if (out.width !== W || out.height !== H) { out.width = W; out.height = H; }
  const Z = 2; let cx = cv.width / 2, cy = cv.height / 2; if (OFPLAY.follow && t && t.p) { const sp = sproj3(t.p.x, 0, t.p.y); cx = sp.x; cy = sp.y - 40 * RES; }
  const sw = W / Z, sh = H / Z; let sx = Math.round(cx - sw / 2), sy = Math.round(cy - sh / 2); sx = Math.max(0, Math.min(cv.width - sw, sx)); sy = Math.max(0, Math.min(cv.height - sh, sy)); OFPLAY.view = { sx, sy, sw, sh, Z };
  const t0 = performance.now(); octx.imageSmoothingEnabled = false; octx.fillStyle = "#0b0e12"; octx.fillRect(0, 0, W, H); octx.drawImage(cv, sx, sy, sw, sh, 0, 0, W, H);
  // characters at 2·RES in a ROI around the visible ones (the ROI is clipped to the view; grow-only GL targets)
  const roi = { x: sx / RES, y: sy / RES, w: sw / RES, h: sh / RES }; const prev = GL3D.character; GL3D.character = "SKINNED";
  const lay = glRenderCharactersROI(OFPLAY.R, OFPLAY.lastChars, roi, Z * RES, cv.width, cv.height, RES); GL3D.character = prev;
  octx.drawImage(lay.canvas, 0, 0, lay.w, lay.h, 0, 0, lay.w, lay.h); OFPLAY.lastLayer = { w: lay.w, h: lay.h, draws: lay.draws };
  OFPLAY.perf.comp.push(performance.now() - t0);
}
function ofPlayKeys() {
  window.addEventListener("keydown", (e) => {
    if (!OFPLAY.on || !S.pt || !S.pt.on) return; if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON")) return; const k = e.key.toLowerCase();
    if (k === "q" || k === "e") { S.pt.keys[k === "q" ? "walk" : "jog"] = true; e.preventDefault(); e.stopImmediatePropagation(); return; }   // gears: desired-speed intent (held)
    if (k === "x") { OFPLAY.mixed = !OFPLAY.mixed; S.pt.last = "PRESENTATION -> " + (OFPLAY.mixed ? "MIXED" : "page canvas"); }
    else if (k === "g") { OFPLAY.follow = !OFPLAY.follow; }
    else if (k === "v") { OFPLAY.dbg.feet = !OFPLAY.dbg.feet; OFPLAY.dbg.roots = OFPLAY.dbg.feet; }
    else if (k === "h") { OFPLAY.dbg.hud = !OFPLAY.dbg.hud; if (OFPLAY.panel) OFPLAY.panel.style.display = OFPLAY.dbg.hud ? "block" : "none"; }
    else if (k === "1") ofPlaySetBody("SHORT_LEAN"); else if (k === "2") ofPlaySetBody("AVG_ATHLETIC"); else if (k === "3") ofPlaySetBody("TALL_LEAN"); else if (k === "4") ofPlaySetBody("SHORT_COMPACT"); else if (k === "5") ofPlaySetBody("AVG_LEAN"); else if (k === "6") ofPlaySetBody("TALL_POWER");
    else if (k === "n") ofPlaySetRunners(OFPLAY.runners.length ? 0 : 10); else if (k === "b") ofPlaySetRunners(OFPLAY.runners.length >= 21 ? 0 : 21);
    else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  window.addEventListener("keyup", (e) => { if (!OFPLAY.on || !S.pt) return; const k = e.key.toLowerCase(); if (k === "q" || k === "e") { S.pt.keys[k === "q" ? "walk" : "jog"] = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener("blur", () => { if (S.pt && S.pt.keys) { S.pt.keys.walk = false; S.pt.keys.jog = false; } });
}
function ofPlaySetBody(id) { const p = S.pt.p; OFPLAY.body = id; OFPLAY.actor = ofPlayMakeActor(id, p); S.pt.last = "BODY -> " + id + " (H " + OF_BODIES[id].H + " m)"; }
function ofPlayDom() {
  const css = document.createElement("style"); css.textContent = `
  #ofplay-out{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5;image-rendering:pixelated;background:#0b0e12;display:none}
  #ofplay-panel{position:fixed;right:0;top:0;width:400px;max-height:100vh;overflow:auto;z-index:20;background:rgba(10,12,16,.92);color:#e8e6e0;font:12px/1.4 Menlo,monospace;padding:10px 12px;box-sizing:border-box;border-left:1px solid #333}
  #ofplay-panel h3{margin:8px 0 4px;color:#ffe36a;font-size:12px}#ofplay-panel b{color:#ffe36a}#ofplay-panel .ok{color:#38ff9a}#ofplay-panel .bad{color:#ff5a5a}#ofplay-panel .dim{color:#9aa0a8}
  #ofplay-status{white-space:pre;font-size:11px;background:#0f1114;border:1px solid #2a2d33;padding:6px;margin:4px 0}`; document.head.appendChild(css);
  const out = document.createElement("canvas"); out.id = "ofplay-out"; document.body.appendChild(out); OFPLAY.out = out; OFPLAY.octx = out.getContext("2d");
  const p = document.createElement("div"); p.id = "ofplay-panel"; document.body.appendChild(p); OFPLAY.panel = p;
  p.innerHTML = `<h3>OUTFIELD LOCOMOTION V1 — live test</h3><div class="dim">simulation decides (the playtest's own player law) · animation presents · no ball</div><div id="ofplay-status"></div>
  <h3>keys</h3><div class="dim">W A S D / arrows move · hold Q walk (1.5 m/s) · hold E jog (3.0) · nothing = run (5.0) · Shift sprint (8.2) · 1 short (1.70) · 2 average (1.83) · 3 tall (1.96) · 4 short-compact (1.66) · 5 average-lean (1.80) · 6 tall-power (2.00) · N 10 extra runners · B 21 extra runners · X Mixed / page view · G follow · V foot / root markers · H hud · R reset · M pause · , slow-mo · . step</div>
  <h3>markers</h3><div class="dim"><span class="ok">green</span> planted (ankle lock) · <span style="color:#ffe36a">yellow</span> toe pivot · <span style="color:#7fd0ff">blue</span> stepping · <span style="color:#ff9a3c">orange</span> swing · red cross = authoritative root · violet ring = presentation pelvis · white = facing · blue = velocity</div>`;
}
function ofPlayHud() {
  const p = OFPLAY.panel; if (!p) return; const t = S.pt, a = OFPLAY.actor; if (!t || !t.on || !a || !a.sol) return; const L = a.loco.diag, d = a.sol.diag, pl = t.p;
  const mean = (v) => v.length ? (v.reduce((x, y) => x + y, 0) / v.length) : 0; const f2 = (v) => (+v).toFixed(2);
  // the plant residual is only meaningful while the foot is IN CONTACT; a releasing foot is airborne and leaving on purpose
  const foot = (sd) => { const f = d.feet[sd]; return f ? `${sd} ${f.mode.padEnd(7)} ${f.contact ? "PLANT slide " + (f.slide * 100).toFixed(1).padStart(4) + "cm" : "                "} sole ${(f.soleY * 100).toFixed(1).padStart(5)}cm${f.s != null ? " s " + f.s.toFixed(2) : ""}` : sd + " -"; };
  const fs = S.frameStat; const iv = fs && fs.intervals.length ? fs.intervals.slice(-120) : null;
  p.querySelector("#ofplay-status").textContent =
`body        ${OFPLAY.body}  H ${a.skel.H.toFixed(2)} m  leg ${a.skel.legLen.toFixed(3)} m
sim         x ${f2(pl.x)} y ${f2(pl.y)}  v ${f2(L.v)} m/s  a‖ ${L.aPar.toFixed(1)}  facing ${L.facing}°  legs ${L.legYaw}°  twist ${L.twist}°
gait        ${L.gait}  (${L.lo}→${L.hi} ${L.t})  phase ${L.phase.toFixed(2)}  cadence ${L.cadence} steps/s  step ${L.step} m  wGait ${L.wGait}${L.settled ? "  SETTLED" : ""}${L.reverse ? "  BACKPEDAL" : ""}
lean        ${L.lean}°  roll ${L.roll}°  pelvis drop ${((d.pelvisDrop || 0) * 100).toFixed(1)} cm  ground lift ${((d.ground || 0) * 100).toFixed(1)} cm  pop ${((d.jerk || 0) * 100).toFixed(1)} cm/tick
${foot("R")}
${foot("L")}
knees       R ${d.knee.R}° L ${d.knee.L}°   elbows R ${d.elbow.R}° L ${d.elbow.L}°
runners     ${OFPLAY.runners.length}   rigs ${1 + OFPLAY.runners.length}
timing      sim ${mean(OFPLAY.perf.sim).toFixed(2)} ms  anim+IK ${mean(OFPLAY.perf.anim).toFixed(2)} ms  skin ${mean(OFPLAY.perf.skin).toFixed(2)} ms  render ${mean(OFPLAY.perf.render).toFixed(2)} ms  composite ${mean(OFPLAY.perf.comp).toFixed(2)} ms  page draw ${S.perfT && S.perfT.length ? mean(S.perfT).toFixed(1) : "-"} ms
frames      ${iv ? "rAF " + (1000 / mean(iv)).toFixed(0) + " Hz  drawn " + fs.drawn + "/" + fs.n + (S.fpsCap ? "  cap " + S.fpsCap : "  no cap (?fps=60)") : "-"}   view ${OFPLAY.mixed ? "MIXED ×2 / character density " + (2 * RES) + (OFPLAY.lastLayer ? " (" + OFPLAY.lastLayer.w + "×" + OFPLAY.lastLayer.h + ")" : "") : "page canvas"}
last        ${t.last || ""}`;
}
function ofPlayBoot() {
  if (!ofPlayWanted()) return; const q = new URLSearchParams(location.search);
  const tryStart = () => {
    const el = document.getElementById("loading"); if (!(el && el.style.display === "none" && typeof ptEnter === "function")) { setTimeout(tryStart, 150); return; }
    if (!(S.pt && S.pt.on)) ptEnter(); ptReset();
    const t = S.pt; t.b.x = 3; t.b.y = 3; t.b.ctrl = false; t.b.vx = 0; t.b.vy = 0;                    // fixture set-up: the ball parked in the corner (no ball in this test); the player stays where the playtest puts him
    t.p.x = 70; t.p.y = 34; t.p.facing = 0; if (t.gk) { t.gk.x = 104.5; t.gk.y = 34; }
    OFPLAY.body = (q.get("body") || "AVG_ATHLETIC").toUpperCase(); if (!OF_BODIES[OFPLAY.body]) OFPLAY.body = "AVG_ATHLETIC";
    OFPLAY.actor = ofPlayMakeActor(OFPLAY.body, t.p); ofPlayInstall(); if (q.get("runners")) ofPlaySetRunners(+q.get("runners"));
    RIG.mode = "manual"; RIG.smooth = 0.25; t.last = "OUTFIELD LOCOMOTION — W A S D / arrows, Shift sprint";
  };
  tryStart();
}
window.addEventListener("load", () => setTimeout(ofPlayBoot, 300));

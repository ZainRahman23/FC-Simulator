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
const OFPLAY = { on: false, body: "AVG_ATHLETIC", actor: null, mixed: true, follow: true, charId: null, charEntry: null, charDrivesSim: (new URLSearchParams(location.search).get("charSim") === "1"), dbg: { feet: true, roots: true, hud: true, ball: true }, rec: [], recMax: 3600, runners: [], panel: null, out: null, octx: null, perf: { sim: [], anim: [], skin: [], render: [], comp: [] }, R: null, lastTick: -1, view: null };
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
    if (t.squad && typeof OFSQ !== "undefined" && OFSQ.on) {                                      // RECEIVING + PASSING V1: every squad player's actor from his own context
      OFPLAY.perf.sim.push(tS); if (OFPLAY.animOff) return;
      const t1 = performance.now(); ofSquadPresent(t); OFPLAY.perf.anim.push(performance.now() - t1); for (const k in OFPLAY.perf) if (OFPLAY.perf[k].length > 600) OFPLAY.perf[k].shift(); return; }
    const p = t.p, a = OFPLAY.actor; a.x = p.x; a.y = p.y; a.facing = p.facing; a.speed = Math.hypot(p.vx, p.vy); a.sim = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing, gaitPhase: p.gaitPhase, gaitSettled: p.gaitSettled };   // the stride clock comes from the simulation
    if (OFPLAY.animOff) { OFPLAY.perf.sim.push(tS); return; }                                     // REGRESSION HOOK: skip the whole skeletal layer, leave the simulation running
    ofPlayKickLink(t, a);                                                                         // the simulation's scheduled SHOT -> kick pose + striking-boot reach
    ofPlayTouchLink(t, a);                                                                        // the simulation's scheduled / fired touch -> a bounded boot reach
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
    if (S.pt && S.pt.on && OFPLAY.follow) { RIG.manualX = Math.max(0, Math.min(105, S.pt.squad && typeof ofSquadFocus === "function" && OFSQ.cam ? OFSQ.cam[0] : S.pt.p.x)); }
    _draw(sample, dt); if (OFPLAY.mixed) ofPlayComposite(); else if (OFPLAY.out) OFPLAY.out.style.display = "none"; if (OFPLAY.dbg.hud) ofPlayHud();
  };
  ofPlayDom(); if (typeof ofSquadKeys === "function") { ofSquadKeys(); ofSquadInstrument(); } ofPlayKeys();
}
function ofPlayRunnerStep(r, now) {                                                            // extra runners: a deterministic lap mover stands in for their simulation (INPUT to the presentation)
  const L = r.lap, ang = L.ph + now * L.w, nx = L.cx + Math.cos(ang) * L.r, ny = L.cy + Math.sin(ang) * L.r; const vx = (nx - r.x) * 60, vy = (ny - r.y) * 60;
  r.facing = Math.atan2(vy, vx); r.x = nx; r.y = ny; r.sim = { x: nx, y: ny, vx, vy, facing: r.facing }; r.speed = Math.hypot(vx, vy);
}
function ofPlaySetRunners(n) {
  OFPLAY.runners = []; const p = S.pt.p;
  for (let i = 0; i < n; i++) { const id = OF_BODY_ORDER[i % OF_BODY_ORDER.length]; const r = ofPlayMakeActor(id, { x: p.x + 4 + (i % 4) * 3, y: p.y - 6 + Math.floor(i / 4) * 4, facing: 0 }); r.lap = { cx: r.x, cy: r.y, r: 2.6 + (i % 3) * 0.7, w: (2.0 + (i % 4) * 1.6) / (2.6 + (i % 3) * 0.7), ph: i * 0.9 }; OFPLAY.runners.push(r); }
}
// A squad of REAL characters. Every loaded character is reused by reference — one set of GPU buffers and one atlas per PLAYER, not per
// runner — so this measures what 22 real bodies actually cost, not what 22 copies of them would.
function ofPlaySetCharRunners(n) {
  const ids = OF_CHAR.order.filter(id => { const e = OF_CHAR.get(id); return e && e.status === "ready"; });
  if (!ids.length) { ofPlaySetRunners(n); return; }
  OFPLAY.runners = []; const p = S.pt.p;
  for (let i = 0; i < n; i++) {
    const ent = OF_CHAR.get(ids[i % ids.length]);
    const r = ofPlayMakeActor(ent.skel, { x: p.x + 4 + (i % 4) * 3, y: p.y - 6 + Math.floor(i / 4) * 4, facing: 0 });
    r.char = ent;
    r.lap = { cx: r.x, cy: r.y, r: 2.6 + (i % 3) * 0.7, w: (2.0 + (i % 4) * 1.6) / (2.6 + (i % 3) * 0.7), ph: i * 0.9 };
    OFPLAY.runners.push(r);
  }
  S.pt.last = "SQUAD -> " + n + " real characters (" + ids.length + " distinct, shared by reference)";
}
function ofPlayRecord(t, a) {
  const d = a.sol.diag, L = a.loco.diag, fk = a.sol.fk, pel = fk.joint[a.skel.byName.pelvis.idx];
  const rec = { tick: Math.round(t.now * 60), t: +t.now.toFixed(4), x: +t.p.x.toFixed(4), y: +t.p.y.toFixed(4), vx: +t.p.vx.toFixed(4), vy: +t.p.vy.toFixed(4), facing: +t.p.facing.toFixed(4), keys: Object.keys(t.keys).filter(k => t.keys[k]).join("+"),
    loco: L, feet: d.feet, knee: d.knee, elbow: d.elbow, jump: d.jump, jerk: d.jerk || 0, ground: d.ground, drop: d.pelvisDrop || 0, pres: [+pel[0].toFixed(4), +pel[1].toFixed(4), +(-pel[2]).toFixed(4)] };
  OFPLAY.rec.push(rec); if (OFPLAY.rec.length > OFPLAY.recMax) OFPLAY.rec.shift();
}
// The SIMULATION decides the foot, the tick and the contact point. This only converts that into the 3D point the boot should meet: the
// ball's near surface at ball height. Nothing here can change the touch, the ball or the player.
// SHOOTING V1. ptKick has already fixed the family, the striking foot and kickAt; this only gives the presentation the contact point.
// Before the strike it tracks the live authoritative ball; at kickAt it FREEZES, because after that the ball is gone and the follow-through
// must swing through where the ball WAS, not chase it. Nothing here can move the ball or change the shot.
function ofPlayKickLink(t, a) {
  const k = t.kick;
  if (!k) { a.kick = null; a.kickBall = null; a.kickRec = null; return; }
  a.kick = k;
  const BR = 0.11, foot = k.foot === "L" ? "L" : "R";
  if (t.now < k.kickAt && k.aim) {                                                               // PASSING V1: a pass is struck on the ball's far side from the TARGET —
    const b = t.b, dx = k.aim.x - b.x, dy = k.aim.y - b.y, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;   // with the INSIDE (or, for a trivela, the OUTSIDE) of
    if (k.tech === "INSIDE" || k.tech === "INSIDE_FINISH" || k.tech === "OUTSIDE") {              // the boot; a driven pass with the laces like a shot
      const R = typeof OF_RECV !== "undefined" ? OF_RECV : { surfH: 0.085, ballR: 0.11, eps: 0.004 }, dz = R.surfH - (Math.max(0, b.z) + BR), h = Math.sqrt(Math.max(0, (BR + R.eps) ** 2 - dz * dz));
      a.kickBall = [b.x - ux * h, R.surfH, -(b.y - uy * h)]; a.kickSurf = k.tech === "OUTSIDE" ? "outside" : "inside";
    } else { const r = BR + 0.015; a.kickBall = [b.x - ux * r, BR, -(b.y - uy * r)]; a.kickSurf = null; }
    a.kickContact = [b.x, b.y];
  } else if (t.now < k.kickAt) {
    const b = t.b; let ux = -1, uy = 0; a.kickSurf = null;
    const ft = a.sol && a.sol.diag.feet[foot];
    const from = ft && ft.toe ? { x: ft.toe[0], y: -ft.toe[2] } : (t.boots && t.boots[foot]);
    if (from) { const dx = from.x - b.x, dy = from.y - b.y, m = Math.hypot(dx, dy); if (m > 1e-6) { ux = dx / m; uy = dy / m; } }
    const r = BR + 0.015;
    a.kickBall = [b.x + ux * r, BR, -(b.y + uy * r)];
    a.kickContact = [b.x, b.y];
  } else if (!a.kickFrozen || a.kickFrozen !== k) { a.kickFrozen = k; }                           // keep the last pre-contact point for the swing-through
}
function ofPlayTouchLink(t, a) {
  const BR = 0.11, lead = 0.10;
  // Aim at the point on the ball's surface facing the boot that will actually play it, measured from the RENDERED toe when there is one
  // (the simulation's planned boot is only a predictor). Without this the boot drives on through the ball centre.
  const surf = (bx, by, foot) => {
    let ux = -1, uy = 0;
    const ft = a.sol && a.sol.diag.feet[foot];
    const from = ft && ft.toe ? { x: ft.toe[0], y: -ft.toe[2] } : (t.boots && t.boots[foot]);
    if (from) { const dx = from.x - bx, dy = from.y - by, m = Math.hypot(dx, dy); if (m > 1e-6) { ux = dx / m; uy = dy / m; } }
    const r = BR + 0.015;                                                                         // stop at the surface, not in the middle
    return [bx + ux * r, BR, -(by + uy * r)];                                                     // 3D world: [x, height, -pitchY]
  };
  const pl = t.touchPlan;
  if (pl) { a.touch = { foot: pl.foot, at: t.now + (pl.fire - t.tickN) * PT_DT, p: surf(pl.point[0], pl.point[1], pl.foot), lead }; return; }
  const lt = t.lastTouch;
  if (lt && lt.tick === t.tickN && lt.foot) a.touch = { foot: lt.foot, at: t.now, p: surf(t.b.x, t.b.y, lt.foot), lead };
}
function ofPlayDraw(dt) {
  const t = S.pt, p = t.p, a = OFPLAY.actor; if (OFPLAY.animOff || !a.sol) return;
  const t0 = performance.now();
  // skin matrices (world × inverse bind) — computed by ofActorTick; extra runners too
  const sq = t.squad && typeof OFSQ !== "undefined" && OFSQ.on;
  const chars = sq ? ofSquadChars() : [{ skel: a.skel, fk: a.sol.fk, skinMats: a.skinMats, palette: SKEL_PARTS, char: OFPLAY.charEntry }]; for (const r of OFPLAY.runners) if (r.sol) chars.push({ skel: r.skel, fk: r.sol.fk, skinMats: r.skinMats, palette: OFPLAY_KIT_B, char: r.char || null });
  const t1 = performance.now(); const prev = GL3D.character; GL3D.character = "SKINNED"; const out = glRenderCharacters(OFPLAY.R, chars, cv.width, cv.height, {}); GL3D.character = prev; const tR = performance.now() - t1;
  // shadow at the authoritative root, then the layer (page canvas at the canvas density)
  const sp = sproj3(p.x, 0, p.y); const s = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES, flat = flattenAt(p.x, p.y);
  ctx.save(); ctx.beginPath(); ctx.ellipse(Math.round(sp.x), Math.round(sp.y), 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill(); ctx.restore();
  if (sq) for (const c of t.squad.ctx) { if (c.p === p) continue; const q = sproj3(c.p.x, 0, c.p.y); ctx.save(); ctx.beginPath(); ctx.ellipse(Math.round(q.x), Math.round(q.y), 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill(); ctx.restore(); }
  for (const r of OFPLAY.runners) { const q = sproj3(r.x, 0, r.y); ctx.save(); ctx.beginPath(); ctx.ellipse(Math.round(q.x), Math.round(q.y), 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill(); ctx.restore(); }
  if (!OFPLAY.mixed) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(out.canvas, 0, 0, out.w, out.h, 0, 0, cv.width, cv.height); ctx.restore(); }
  OFPLAY.lastChars = chars; OFPLAY.perf.render.push(tR); OFPLAY.perf.skin.push(performance.now() - t0 - tR);
  if (OFPLAY.dbg.feet || OFPLAY.dbg.roots) ofPlayOverlay(a, p);
}
// SHOOTING V1 test controls. These map straight onto the EXISTING authoritative techniques and launch families — no new simulation
// concepts. Hold to charge, release to strike, exactly as the playtest's own kick keys do.
const OFPLAY_SHOTS = {
  "1": { tech: "INSIDE",      fam: "SHORT",  D: 14, chargeFam: "INSIDE",  label: "INSIDE / CURL" },
  "2": { tech: "LACES",       fam: "DRIVEN", D: 20, chargeFam: "LACES",   label: "NORMAL" },
  "3": { tech: "LACES_POWER", fam: "CLEAR",  D: 35, chargeFam: "POWER",   label: "POWER" },
  "4": { tech: "CHIP",        fam: "LOFT",   D: 22, chargeFam: "CHIP",    label: "CHIP" },
  "5": { tech: "OUTSIDE",     fam: "SHORT",  D: 14, chargeFam: "OUTSIDE", label: "TRIVELA / OUTSIDE" },
};
const OFPLAY_KIT_B = Object.assign({}, SKEL_PARTS, { shirt: [0.92, 0.25, 0.20] });
function ofPlayOverlay(a, p) {                                                                  // diagnostics on the page canvas: foot contact markers (green planted / yellow toe pivot / orange swing), plant points, authoritative root (red) vs presentation pelvis ground point (violet)
  const P3 = (q) => sproj3(q[0], q[1], -q[2]); ctx.save(); ctx.lineWidth = Math.max(1, PXQ);
  for (const sd of ["R", "L"]) { const f = a.sol.diag.feet[sd]; if (!f) continue; const an = P3(f.ankle), tp = P3(f.toe);
    ctx.strokeStyle = f.mode === "toe" ? "#ffe36a" : f.mode === "step" ? "#7fd0ff" : f.locked ? "#38ff9a" : "#ff9a3c"; ctx.beginPath(); ctx.arc(tp.x, tp.y, uipx(3), 0, Math.PI * 2); ctx.stroke();
    if (f.P) { const pp = P3(f.P); ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(pp.x - 1, pp.y - 1, 3, 3); } }
  const sp = sproj3(p.x, 0, p.y); ctx.strokeStyle = "#ff4040"; ctx.beginPath(); ctx.moveTo(sp.x - uipx(5), sp.y); ctx.lineTo(sp.x + uipx(5), sp.y); ctx.moveTo(sp.x, sp.y - uipx(5)); ctx.lineTo(sp.x, sp.y + uipx(5)); ctx.stroke();
  const pel = a.sol.fk.joint[a.skel.byName.pelvis.idx], pg = sproj3(pel[0], 0, -pel[2]); ctx.strokeStyle = "#c080ff"; ctx.beginPath(); ctx.arc(pg.x, pg.y, uipx(4), 0, Math.PI * 2); ctx.stroke();
  const fx = Math.cos(p.facing), fy = Math.sin(p.facing), fp = sproj3(p.x + fx * 0.6, 0, p.y + fy * 0.6); ctx.strokeStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(fp.x, fp.y); ctx.stroke();   // facing
  if (OFPLAY.dbg.ball) ofPlayBallOverlay(a, p);
  if (S.pt.squad && typeof ofSquadOverlay === "function") ofSquadOverlay();
  const v = Math.hypot(p.vx, p.vy); if (v > 0.1) { const vp = sproj3(p.x + p.vx / v * (0.4 + v * 0.1), 0, p.y + p.vy / v * (0.4 + v * 0.1)); ctx.strokeStyle = "#8ab4f8"; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(vp.x, vp.y); ctx.stroke(); }   // velocity
  ctx.restore();
}
// DRIBBLE DIAGNOSTICS: the simulation's boot plan, the boot the next touch is assigned to, the contact point, and the line from the
// rendered boot to the ball so a right-foot touch can be seen to be made by the right boot.
function ofPlayBallOverlay(a, p) {
  const t = S.pt, b = t.b; if (!b) return;
  const P = (x, y, z) => sproj3(x, z || 0, y);
  if (t.boots) for (const sd of ["R", "L"]) {                                                   // where the SIMULATION thinks each boot is
    const bo = t.boots[sd], q = P(bo.x, bo.y); ctx.strokeStyle = bo.planted ? "#4a7a5a" : "#7ad6a0";
    ctx.beginPath(); ctx.arc(q.x, q.y, uipx(2.5), 0, Math.PI * 2); ctx.stroke();
  }
  const pl = t.touchPlan, lt = t.lastTouch && (t.tickN - t.lastTouch.tick) < 18 ? t.lastTouch : null;
  const act = pl || lt; if (!act) return;
  const foot = act.foot, pt = act.point || [b.x, b.y];
  const cp = P(pt[0], pt[1]); ctx.strokeStyle = pl ? "#ffe36a" : "#ff5ad0"; ctx.lineWidth = Math.max(1, PXQ * 1.5);
  ctx.beginPath(); ctx.arc(cp.x, cp.y, uipx(4.5), 0, Math.PI * 2); ctx.stroke();                 // the CONTACT POINT the simulation chose
  const f = a.sol.diag.feet[foot];
  if (f && f.toe) { const tp = sproj3(f.toe[0], f.toe[1], -f.toe[2]);                            // the RENDERED boot that must make it
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(cp.x, cp.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(tp.x, tp.y, uipx(5.5), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = pl ? "#ffe36a" : "#ff5ad0"; ctx.font = (uipx(9) | 0) + "px Menlo, monospace";
    const d = Math.hypot(f.toe[0] - b.x, -f.toe[2] - b.y) - 0.11;
    ctx.fillText(foot + (pl ? " next" : " touch") + "  " + (d * 100).toFixed(0) + "cm", tp.x + uipx(7), tp.y - uipx(6)); }
  ctx.lineWidth = Math.max(1, PXQ);
}
function ofPlayComposite() {                                                                    // Mixed: environment nearest ×2 of the page's native pass; the characters re-rendered at 2·RES inside their ROI (one layer px per output px), the view following the player
  const t = S.pt; if (!OFPLAY.out || !OFPLAY.lastChars) return; const out = OFPLAY.out, octx = OFPLAY.octx; out.style.display = "block";
  const W = Math.round(out.clientWidth * RES), H = Math.round(out.clientHeight * RES); if (out.width !== W || out.height !== H) { out.width = W; out.height = H; }
  const Z = 2; let cx = cv.width / 2, cy = cv.height / 2; if (OFPLAY.follow && t && t.p) { const f = t.squad && typeof ofSquadFocus === "function" ? ofSquadFocus(t) : [t.p.x, t.p.y]; const sp = sproj3(f[0], 0, f[1]); cx = sp.x; cy = sp.y - 40 * RES; }
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
    else if (OFPLAY_SHOTS[k]) { const sp = OFPLAY_SHOTS[k]; if (!S.pt.charge && !S.pt.kick && S.pt.b.ctrl)
      ptChargeBegin(S.pt, k, { fam: sp.fam, label: sp.label, D: sp.D, chargeFam: sp.chargeFam,
                               force: { tech: sp.tech, foot: S.pt.pfoot || "R" } }); }
    else if (k === "6") { const o = OF_BODY_ORDER, i = (o.indexOf(OFPLAY.body) + 1) % o.length; ofPlaySetCharacter(null); ofPlaySetBody(o[i]); }
    else if (k === "c") ofPlayCycleCharacter(e.shiftKey ? -1 : 1);
    else if (k === "n") {
      // A squad. With a real character selected the squad is made of REAL characters (shared by reference), so what you see at 22 is
      // what 22 real players cost; with the generic test body it stays the generic runners the locomotion work was measured on.
      const n = OFPLAY.runners.length === 0 ? 10 : OFPLAY.runners.length < 21 ? 21 : 0;
      if (OFPLAY.charId) ofPlaySetCharRunners(n); else ofPlaySetRunners(n);
    }
    else if (k === "j" || k === "l") {
      // J: the ball AT YOUR FEET, already carried — start dribbling immediately. L: a LOOSE ball 4 m ahead to run onto.
      // Ahead means along the way you are actually going; at rest the idle facing points at the old ball, which is never where you want it.
      const t = S.pt, v = Math.hypot(t.p.vx, t.p.vy);
      const dir = v > 0.5 ? Math.atan2(t.p.vy, t.p.vx) : t.p.facing, loose = k === "l", d = loose ? 4 : 0.9;
      t.b.x = t.p.x + Math.cos(dir) * d; t.b.y = t.p.y + Math.sin(dir) * d; t.b.z = 0;
      t.b.vx = loose ? 0 : t.p.vx; t.b.vy = loose ? 0 : t.p.vy; t.b.vz = 0;
      t.b.ctrl = !loose; t.b.exclT = 0; t.b.held = null; t.b.curve = null;
      t.touchPlan = null; t.lastTouch = null; t.lastTouchFoot = null; t.ctrlState = null; t.p.touchT = 0; t.lastTouchT = undefined;
      t.last = loose ? "BALL -> loose, 4 m ahead (run onto it)" : "BALL -> at your feet (carrying)";
    }
    else if (k === "k") { OFPLAY.dbg.ball = !OFPLAY.dbg.ball; S.pt.last = "DRIBBLE MARKERS -> " + (OFPLAY.dbg.ball ? "ON" : "OFF"); }
    else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  window.addEventListener("keyup", (e) => { if (!OFPLAY.on || !S.pt) return; const k = e.key.toLowerCase();
    if (k === "q" || k === "e") { S.pt.keys[k === "q" ? "walk" : "jog"] = false; e.preventDefault(); e.stopImmediatePropagation(); }
    else if (OFPLAY_SHOTS[k]) { ptChargeRelease(S.pt, k); e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener("blur", () => { if (S.pt && S.pt.keys) { S.pt.keys.walk = false; S.pt.keys.jog = false; } });
}
// ── REAL CHARACTERS (Astra outfield package) ────────────────────────────────────────────────────────────────────────────────────
// Selecting a character rebuilds the actor on THAT player's own bind and morphology. Nothing about the simulation changes: the
// character is presentation, so the same authoritative inputs must produce the same authoritative outcomes whoever is selected.
function ofPlaySetCharacter(id) {
  if (!id) { OFPLAY.charId = null; OFPLAY.charEntry = null; ofPlaySetBody(OFPLAY.body); S.pt.last = "CHARACTER -> generic test body"; return; }
  const e = OF_CHAR.get(id); if (!e) return;
  S.pt.last = "CHARACTER -> loading " + id + " ...";
  ofCharLoad(id).then((ent) => {
    const p = S.pt.p;
    OFPLAY.charId = id; OFPLAY.charEntry = ent;
    OFPLAY.actor = ofPlayMakeActor(ent.skel, p);
    // SIMULATION NEUTRALITY. Choosing a character is PRESENTATION. The simulation's own leg length (which its stride clock and boot plan
    // consume) is therefore left alone by default, so identical authoritative inputs give identical authoritative outcomes whoever is
    // selected. Publishing the real body's leg length is a deliberate, visible opt-in, not something character selection does silently:
    // it WOULD change the touch schedule and the boot plan, which is a design decision about whether the simulation consumes morphology.
    if (OFPLAY.charDrivesSim) p.legLen = ent.skel.legLen;
    S.pt.last = "CHARACTER -> " + ent.rig.identity.name + "  " + ent.rig.identity.heightCm + " cm / " + ent.rig.identity.weightKg + " kg"
              + (OFPLAY.charDrivesSim ? "  [morphology drives the simulation: leg " + ent.skel.legLen.toFixed(3) + " m]" : "  [presentation only]");
  }).catch(err => { S.pt.last = "CHARACTER load failed: " + err; });
}
function ofPlayCycleCharacter(dir) {
  const o = OF_CHAR.order, i = OFPLAY.charId ? o.indexOf(OFPLAY.charId) : -1;
  const n = i + (dir || 1);
  ofPlaySetCharacter(n < 0 || n >= o.length ? null : o[n]);
}
// leg length is a PLAYER attribute: selecting a body also tells the simulation which boots to plan with
function ofPlaySetBody(id) { const p = S.pt.p; OFPLAY.body = id; OFPLAY.actor = ofPlayMakeActor(id, p); p.legLen = OFPLAY.actor.skel.legLen; S.pt.last = "BODY -> " + id + " (H " + OF_BODIES[id].H + " m)"; }
function ofPlayDom() {
  const css = document.createElement("style"); css.textContent = `
  #ofplay-out{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5;image-rendering:pixelated;background:#0b0e12;display:none}
  #ofplay-panel{position:fixed;right:0;top:0;width:400px;max-height:100vh;overflow:auto;z-index:20;background:rgba(10,12,16,.92);color:#e8e6e0;font:12px/1.4 Menlo,monospace;padding:10px 12px;box-sizing:border-box;border-left:1px solid #333}
  #ofplay-panel h3{margin:8px 0 4px;color:#ffe36a;font-size:12px}#ofplay-panel b{color:#ffe36a}#ofplay-panel .ok{color:#38ff9a}#ofplay-panel .bad{color:#ff5a5a}#ofplay-panel .dim{color:#9aa0a8}
  #ofplay-status{white-space:pre;font-size:11px;background:#0f1114;border:1px solid #2a2d33;padding:6px;margin:4px 0}`; document.head.appendChild(css);
  const out = document.createElement("canvas"); out.id = "ofplay-out"; document.body.appendChild(out); OFPLAY.out = out; OFPLAY.octx = out.getContext("2d");
  const p = document.createElement("div"); p.id = "ofplay-panel"; document.body.appendChild(p); OFPLAY.panel = p;
  p.innerHTML = `<h3>OUTFIELD LOCOMOTION V1 — live test</h3><div class="dim">simulation decides (the playtest's own player law) · animation presents · no ball</div><div id="ofplay-status"></div>
  <h3>keys</h3><div class="dim">W A S D / arrows move · hold Q walk (1.5 m/s) · hold E jog (3.0) · nothing = run (5.0) · Shift sprint (8.2) · 1 short (1.70) · 2 average (1.83) · 3 tall (1.96) · 4 short-compact (1.66) · 5 average-lean (1.80) · 6 tall-power (2.00) · C cycle the six real characters (shift+C back) · J ball at your feet · L loose ball ahead · K dribble markers · N 10 extra runners · B 21 extra runners · X Mixed / page view · G follow · V foot / root markers · H hud · R reset · M pause · , slow-mo · . step</div>
  <h3>receiving + passing V1</h3><div class="dim">7 two players (A &harr; B) · 8 passing triangle · 9 three v two passive lane shadows · Space short pass · O driven pass · I through pass (direction keys choose the receiver, else your facing; control follows the ball to the receiver — the keys you hold as it arrives direct his first touch) · Tab switch player · T auto-switch · P preferred foot · 1-5 shots · J ball to your player · R restart drill · U names · Esc leave the drill</div>
  <h3>markers</h3><div class="dim"><span class="ok">green</span> planted (ankle lock) · <span style="color:#ffe36a">yellow</span> toe pivot · <span style="color:#7fd0ff">blue</span> stepping · <span style="color:#ff9a3c">orange</span> swing · red cross = authoritative root · violet ring = presentation pelvis · white = facing · blue = velocity</div>`;
}
function ofPlayBallHud(a) {
  const t = S.pt, b = t.b; if (!b) return "ball        (none)";
  const bs = Math.hypot(b.vx, b.vy), dPB = Math.hypot(t.p.x - b.x, t.p.y - b.y);
  const pl = t.touchPlan, lt = t.lastTouch;
  const boot = (f) => { const ft = a.sol.diag.feet[f]; return ft && ft.toe ? (Math.hypot(ft.toe[0] - b.x, -ft.toe[2] - b.y) - 0.11) : null; };
  const L1 = `ball        ${b.ctrl ? (t.ctrlState || "CARRIED") : "LOOSE"}  ${bs.toFixed(2)} m/s  ${dPB.toFixed(2)} m ahead  phase ${(t.p.gaitPhase || 0).toFixed(2)}`;
  const nx = pl ? `NEXT ${pl.foot} in ${((pl.fire - t.tickN) / 60 * 1000) | 0} ms  plan gap ${(pl.gap * 100).toFixed(0)} cm` :
             (b.ctrl ? `next touch in ${Math.max(0, (t.p.touchT || 0) * 1000) | 0} ms` : "no possession");
  const rc = a.sol.diag.reach || {};
  const rr = ["R", "L"].filter(f => rc[f]).map(f => `${f} ${rc[f].skipped ? rc[f].skipped : ((rc[f].applied * 100).toFixed(0) + "cm" + (rc[f].capped ? "*" : ""))}`).join("  ");
  const bd = ["R", "L"].map(f => { const q = boot(f); return f + " " + (q == null ? "-" : (q * 100).toFixed(0) + "cm"); }).join("  ");
  const L3 = lt ? `last touch  ${lt.foot} ${lt.kind}  late ${((lt.late || 0) * 1000) | 0} ms  boot-ball ${lt.bootReal != null ? (lt.bootReal * 100).toFixed(0) + " cm" : "-"}${lt.unrealisable ? "  UNREALISED" : ""}` : "last touch  -";
  return `${L1}\ntouch       ${nx}\nboot→ball   ${bd}${rr ? "   reach " + rr : ""}\n${L3}`;
}
// The identity line. With a real character selected it names the PLAYER — the stature and mass are his own, read from his rig, not
// from a generic body preset — and states whether his morphology is presentation-only or is also driving the simulation.
function ofPlayWho(a) {
  const e = OFPLAY.charEntry, L = a.loco.diag, k = a.kick;
  const act = k ? "KICK " + (k.tech || "") + " — " + ((ofKickFam(k.tech) || {}).label || "") + " (" + k.foot + " foot)"
            : (S.pt.b && S.pt.b.ctrl) ? "CARRY " + (L.wGait < 0.5 ? "IDLE" : L.gait) : L.wGait < 0.5 ? "IDLE" : L.gait;
  const who = e ? `${e.rig.identity.name}   ${e.rig.identity.heightCm} cm / ${e.rig.identity.weightKg} kg`
                : `generic test body ${OFPLAY.body}   H ${(a.skel.H * 100).toFixed(0)} cm`;
  return `player      ${who}   leg ${a.skel.legLen.toFixed(3)} m   ${e ? (OFPLAY.charDrivesSim ? "morphology DRIVES SIM" : "presentation only") : ""}
action      ${act}   touches ${S.pt.touchN || 0}   ${S.pt.ctrlState || ""}`;
}
function ofPlayHud() {
  const p = OFPLAY.panel; if (!p) return; const t = S.pt, a = OFPLAY.actor; if (!t || !t.on || !a || !a.sol) return; const L = a.loco.diag, d = a.sol.diag, pl = t.p;
  const mean = (v) => v.length ? (v.reduce((x, y) => x + y, 0) / v.length) : 0; const f2 = (v) => (+v).toFixed(2);
  // the plant residual is only meaningful while the foot is IN CONTACT; a releasing foot is airborne and leaving on purpose
  const foot = (sd) => { const f = d.feet[sd]; return f ? `${sd} ${f.mode.padEnd(7)} ${f.contact ? "PLANT slide " + (f.slide * 100).toFixed(1).padStart(4) + "cm" : "                "} sole ${(f.soleY * 100).toFixed(1).padStart(5)}cm${f.s != null ? " s " + f.s.toFixed(2) : ""}` : sd + " -"; };
  const fs = S.frameStat; const iv = fs && fs.intervals.length ? fs.intervals.slice(-120) : null;
  p.querySelector("#ofplay-status").textContent =
`${ofPlayWho(a)}
sim         x ${f2(pl.x)} y ${f2(pl.y)}  v ${f2(L.v)} m/s  a‖ ${L.aPar.toFixed(1)}  facing ${L.facing}°  legs ${L.legYaw}°  twist ${L.twist}°
gait        ${L.gait}  (${L.lo}→${L.hi} ${L.t})  phase ${L.phase.toFixed(2)}  cadence ${L.cadence} steps/s  step ${L.step} m  wGait ${L.wGait}${L.settled ? "  SETTLED" : ""}${L.reverse ? "  BACKPEDAL" : ""}
lean        ${L.lean}°  roll ${L.roll}°  pelvis drop ${((d.pelvisDrop || 0) * 100).toFixed(1)} cm  ground lift ${((d.ground || 0) * 100).toFixed(1)} cm  pop ${((d.jerk || 0) * 100).toFixed(1)} cm/tick
${foot("R")}
${foot("L")}
${ofPlayBallHud(a)}
knees       R ${d.knee.R}° L ${d.knee.L}°   elbows R ${d.elbow.R}° L ${d.elbow.L}°
runners     ${OFPLAY.runners.length}   rigs ${1 + OFPLAY.runners.length}
timing      sim ${mean(OFPLAY.perf.sim).toFixed(2)} ms  anim+IK ${mean(OFPLAY.perf.anim).toFixed(2)} ms  skin ${mean(OFPLAY.perf.skin).toFixed(2)} ms  render ${mean(OFPLAY.perf.render).toFixed(2)} ms  composite ${mean(OFPLAY.perf.comp).toFixed(2)} ms  page draw ${S.perfT && S.perfT.length ? mean(S.perfT).toFixed(1) : "-"} ms
frames      ${iv ? "rAF " + (1000 / mean(iv)).toFixed(0) + " Hz  drawn " + fs.drawn + "/" + fs.n + (S.fpsCap ? "  cap " + S.fpsCap : "  no cap (?fps=60)") : "-"}   view ${OFPLAY.mixed ? "MIXED ×2 / character density " + (2 * RES) + (OFPLAY.lastLayer ? " (" + OFPLAY.lastLayer.w + "×" + OFPLAY.lastLayer.h + ")" : "") : "page canvas"}
last        ${t.last || ""}${t.squad && typeof ofSquadHud === "function" ? "\n" + ofSquadHud() : ""}`;
}
function ofPlayBoot() {
  if (!ofPlayWanted()) return; const q = new URLSearchParams(location.search);
  const tryStart = () => {
    const el = document.getElementById("loading"); if (!(el && el.style.display === "none" && typeof ptEnter === "function")) { setTimeout(tryStart, 150); return; }
    if (!(S.pt && S.pt.on)) ptEnter(); ptReset();
    const t = S.pt; t.b.x = 3; t.b.y = 3; t.b.ctrl = false; t.b.vx = 0; t.b.vy = 0;                    // fixture set-up: the ball parked in the corner (no ball in this test); the player stays where the playtest puts him
    t.p.x = 70; t.p.y = 34; t.p.facing = 0; if (t.gk) { t.gk.x = 104.5; t.gk.y = 34; }
    OFPLAY.body = (q.get("body") || "AVG_ATHLETIC").toUpperCase(); if (!OF_BODIES[OFPLAY.body]) OFPLAY.body = "AVG_ATHLETIC";
    OFPLAY.actor = ofPlayMakeActor(OFPLAY.body, t.p); t.p.legLen = OFPLAY.actor.skel.legLen; ofPlayInstall(); if (q.get("runners")) ofPlaySetRunners(+q.get("runners"));
    RIG.mode = "manual"; RIG.smooth = 0.25; t.last = "OUTFIELD LOCOMOTION — W A S D / arrows, Shift sprint";
    if (q.get("squad") && typeof ofSquadStart === "function") ofSquadStart(q.get("squad"));   // RECEIVING + PASSING V1 live drill
  };
  tryStart();
}
window.addEventListener("load", () => setTimeout(ofPlayBoot, 300));

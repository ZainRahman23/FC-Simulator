// ═══ anim3d/gk3d_backend.js — SKELETAL_3D presentation backend for the playtest goalkeeper (prototype) ═══
// Same simulation, same resolver (gkAnimUpdate → ActionDescription); only the drawing differs. Never writes gk/ball.
const GK3D = {
  copies: 0,                    // review: draw N extra keepers (offset laterally) for the scaling measurement
  debug: { bones: false, ik: false, roots: false, feet: false, trail: false, label: false },
  trail: [],                    // review: presentation pelvis samples through the committed action (path, markers, velocity vectors)
  asserts: [], prev: null,      // development checks: position / velocity discontinuity at every stage boundary after touchdown
  perf: { n: 0, ms: 0, max: 0, glDraws: 0 },
  lastContact: null, log: [],
  state: {},                    // presentation memory (plant lock, commit key) — reset per shot
  R: null, skel: null, skelH: 0,
};
function gk3dReset() { GK3D.state = {}; GK3D.trail = []; GK3D.asserts = []; GK3D.prev = null; }
function gk3dDraw(t, gk, dt) {
  const A = S.gkAnim, t0 = performance.now();
  if (!GK3D.R) { GK3D.R = glCreateRenderer(); if (!GK3D.R) return gkAnimDraw(t, gk, dt); }
  if (A.prevRoot) A.odo += Math.hypot(gk.x - A.prevRoot.x, gk.y - A.prevRoot.y); A.prevRoot = { x: gk.x, y: gk.y };
  const cur = gkAnimUpdate(t, gk);                       // shared semantic resolver (layer B)
  const desc = gkActionDescription(t, gk, cur);
  if (GK3D.skelH !== gk.height) { GK3D.skel = skelBuild(gk.height); GK3D.skelH = gk.height; }
  const skel = GK3D.skel, clip = GK_CLIP_FAR_DIVE;
  if (!desc.commit && GK3D.state.commitKey != null) { GK3D.state = {}; GK3D.trail = []; GK3D.prev = null; }
  const g = gkGraphEvaluate(desc, clip, skel, GK3D.state);
  const sol = gkGraphSolve(desc, g, skel, GK3D.state);
  if (desc.commit && g.phase === "SETTLE" && !GK3D.state.landedSide) { GK3D.state.landedSide = gkLandedSide(skel, sol.fk); g.landedSide = GK3D.state.landedSide; }   // explicit recovery input: which side is against the pitch
  // head look-at (procedural, bounded): rotate neck+head toward the ball — applied by re-running FK on a few bones is costly; approximate by a post-hoc rotation of the head matrices
  if (desc.ball && !desc.held) {
    const hd = skel.byName.head, nk = skel.byName.neck, hj = sol.fk.joint[hd.idx], B = glW(desc.ball);
    const fwd = M4.transformDir(sol.fk.world[hd.idx], [0, 0, 1]), to = V3.norm(V3.sub(B, hj)); const ang = Math.acos(Math.max(-1, Math.min(1, V3.dot(V3.norm(fwd), to))));
    const maxA = GK_GRAPH.lookMaxDeg * DEG, k = ang > 1e-4 ? Math.min(1, maxA / ang) : 0;
    if (k > 0) { const axis = V3.norm(V3.cross(fwd, to)); if (V3.len(V3.cross(fwd, to)) > 1e-6) { const Rr = M4.axisAngle(axis, ang * k); for (const b of [hd, skel.byName.hair]) { const m = sol.fk.world[b.idx], o = M4.origin(m); const m2 = M4.mul(M4.translate(o[0], o[1], o[2]), M4.mul(Rr, M4.mul(M4.translate(-o[0], -o[1], -o[2]), m))); m2[12] = m[12]; m2[13] = m[13]; m2[14] = m[14]; sol.fk.world[b.idx] = m2; sol.fk.tip[b.idx] = M4.transformPoint(m2, V3.scale(b.dir, b.len)); } sol.diag.look = +(ang * k / DEG).toFixed(0); } }
  }
  // render (plus optional copies for the scaling test)
  const chars = [{ skel, fk: sol.fk }];
  for (let i = 1; i <= GK3D.copies; i++) { const off = M4.translate(0, 0, (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 1.2); const fk2 = { world: sol.fk.world.map(m => M4.mul(off, m)), joint: sol.fk.joint.map(p => M4.transformPoint(off, p)), tip: sol.fk.tip.map(p => M4.transformPoint(off, p)) }; chars.push({ skel, fk: fk2 }); }
  const out = glRenderCharacters(GK3D.R, chars, cv.width, cv.height, {});
  // composite at the keeper's depth slot: shadow at the PRESENTATION root, then the low-res layer scaled with nearest sampling
  const sp = sproj3(gk.x, 0, gk.y); if (sp.d < 0.5) return true;
  const s = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES, flat = flattenAt(gk.x, gk.y);
  const spp = sproj3(g.pres.x != null ? g.pres.x : gk.x + g.pres.dx, 0, g.pres.y != null ? g.pres.y : gk.y + g.pres.dy);
  ctx.save(); ctx.beginPath(); ctx.ellipse(Math.round(spp.x), Math.round(spp.y), 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill(); ctx.restore();
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(out.canvas, 0, 0, out.w, out.h, 0, 0, cv.width, cv.height); ctx.restore();
  // drawn glove vs simulation hand (contact synchronisation metric, same units as the sprite backend)
  const P3 = (p) => sproj3(p[0], p[1], -p[2]);          // 3D world → screen
  const handC = sol.diag.ik ? sol.diag.ik.handCentre : sol.fk.tip[skel.byName["hand_" + g.reachHand].idx];
  const handScreen = P3(handC), simHand = gk.handNow ? sproj3(gk.handNow[0], gk.handNow[2], gk.handNow[1]) : null;
  const artLabel = "3D " + clip.id + (g.side === "LEFT" ? " (mirrored)" : "") + " " + g.phase + (g.sub && g.sub !== g.phase ? " [" + g.sub + "]" : "") + (g.clipT != null ? (g.mode === "post" ? "  +" + g.clipT.toFixed(2) + " s" : "  u " + g.clipT.toFixed(2)) : "") + (g.pres.dm ? "  pres +" + g.pres.dm.toFixed(2) + " m" : "") + (sol.diag.ik ? "  ik w " + sol.diag.ik.w + " res " + (sol.diag.ik.residual * 100).toFixed(1) + " cm" : "") + (g.axis ? "  axis " + g.axis.theta + "° side-land " + g.axis.wSide.toFixed(2) : "") + (g.landedSide ? "  LANDED " + g.landedSide : "") + (g.landing ? "  h " + g.landing.L.h.toFixed(2) + " s " + g.landing.L.s.toFixed(2) : "") + (g.flight ? "  v " + Math.hypot(g.flight.v[0], g.flight.v[2]).toFixed(2) + "/" + g.flight.v[1].toFixed(2) + " m/s" : "") + "  RIGHT FOOT: " + (sol.diag.feet.R && sol.diag.feet.R.locked ? "PLANTED" : "RELEASED") + "  LEFT FOOT: " + (sol.diag.feet.L && sol.diag.feet.L.locked ? "PLANTED" : "RELEASED") + (sol.diag.plant ? "  plant w " + sol.diag.plant.w : "") + (sol.diag.torso ? "  torso +" + sol.diag.torso + "°" : "") + (g.authored ? "" : "  [family not authored: SET + procedural reach]");
  cur.artLabel = artLabel;
  if (gk.contact && (!GK3D.lastContact || GK3D.lastContact.tickT !== gk.contact.tickT)) {
    const cp = gk.contact.point, cs = sproj3(cp[0], cp[2], cp[1]);
    const errPx = simHand ? Math.hypot(handScreen.x - simHand.x, handScreen.y - simHand.y) : null;
    const pxPerM = Math.abs(sproj3(cp[0], cp[2] + 1, cp[1]).y - cs.y) || 1;
    const hm = pitchW(handC); const errM3 = gk.handNow ? Math.hypot(hm[0] - gk.handNow[0], hm[1] - gk.handNow[1], hm[2] - gk.handNow[2]) : null;
    GK3D.lastContact = { tickT: gk.contact.tickT, outcome: gk.contact.outcome, volume: gk.contact.volume, phase: g.phase, u: desc.u, errPx: errPx != null ? +errPx.toFixed(1) : null, errM: errPx != null ? +(errPx / pxPerM).toFixed(3) : null, err3dM: errM3 != null ? +errM3.toFixed(3) : null, spritePx: errPx != null ? +(errPx / s).toFixed(1) : null, ik: sol.diag.ik, art: artLabel };
    A.lastContact = Object.assign({}, GK3D.lastContact, { state: cur.state, family: cur.family, side: cur.side, dir: cur.dir, cls: cur.cls, source: "3D glove centre vs sim hand", flagged: errPx != null && errPx / s > GK_ANIM.ikMaxPx });
  }
  // continuity assertions (development): a stage change after touchdown must not relocate the body — root, pelvis and velocity checked at every boundary
  {
    const pw = sol.fk.joint[skel.byName.pelvis.idx], pr = [g.pres.x, g.pres.y], pv = GK3D.prev;
    const rotOf = (m) => [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]], angDeg = (a, b) => { const tr = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6] + a[7] * b[7] + a[8] * b[8]; return Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2))) / DEG; };
    const rots = { root: rotOf(g.rootM), pelvis: rotOf(sol.fk.world[skel.byName.pelvis.idx]), chest: rotOf(sol.fk.world[skel.byName.chest.idx]), thigh_L: rotOf(sol.fk.world[skel.byName.thigh_L.idx]), thigh_R: rotOf(sol.fk.world[skel.byName.thigh_R.idx]), upperArm_L: rotOf(sol.fk.world[skel.byName.upperArm_L.idx]), upperArm_R: rotOf(sol.fk.world[skel.byName.upperArm_R.idx]) };
    if (pv && desc.commit && g.mode === "post" && pv.stage !== g.phase && desc.now - pv.t < 0.1) {
      const dRoot = Math.hypot(pr[0] - pv.pr[0], pr[1] - pv.pr[1]), dPel = V3.dist(pw, pv.pw), dt = desc.now - pv.t, vNow = V3.scale(V3.sub(pw, pv.pw), 1 / dt), dV = pv.v ? V3.len(V3.sub(vNow, pv.v)) : 0;
      const expect = pv.v ? V3.scale(pv.v, dt) : [0, 0, 0], excess = V3.dist(V3.sub(pw, pv.pw), expect);   // displacement beyond what the previous velocity predicts = relocation
      const ang = {}; for (const k in rots) ang[k] = +angDeg(rots[k], pv.rots[k]).toFixed(1);   // angular difference (deg) of the world orientation across the boundary
      const bad = excess > 0.03 || dV > 1.5 || ang.root > 5 || ang.pelvis > 15 || ang.chest > 15; const rec = { tick: Math.round(desc.now * 60), from: pv.stage, to: g.phase, dRoot: +dRoot.toFixed(3), dPelvis: +dPel.toFixed(3), excess: +excess.toFixed(3), dV: +dV.toFixed(2), ang, bad };
      GK3D.asserts.push(rec); if (bad) console.warn("[gk3d] discontinuity at stage boundary", rec);
    }
    const v = pv && desc.now - pv.t > 1e-4 && desc.now - pv.t < 0.1 ? V3.scale(V3.sub(pw, pv.pw), 1 / (desc.now - pv.t)) : null;
    // side / mirror continuity: any tick (not only boundaries) where the mirror or the pelvis roll sign flips while the body is down
    if (pv && desc.commit && g.mode === "post" && desc.now - pv.t < 0.1 && (pv.side !== g.side || (pv.roll != null && g.pose.pelvis && Math.abs(g.pose.pelvis[2]) > 30 && Math.sign(g.pose.pelvis[2]) !== Math.sign(pv.roll)))) { const rec = { tick: Math.round(desc.now * 60), from: pv.stage, to: g.phase, sideFlip: pv.side + "->" + g.side, roll: pv.roll + "->" + (g.pose.pelvis ? g.pose.pelvis[2] : null), ang: { pelvis: +angDeg(rots.pelvis, pv.rots.pelvis).toFixed(1) }, bad: true }; GK3D.asserts.push(rec); console.warn("[gk3d] side / roll flip", rec); }
    GK3D.prev = { t: desc.now, stage: g.phase, pr, pw: pw.slice(), v, rots, side: g.side, roll: g.pose.pelvis ? g.pose.pelvis[2] : null };
  }
  // trail: one sample per drawn tick while committed (pelvis world position, stage, event markers)
  if (desc.commit) {
    const T = GK3D.trail, has = (ev) => T.some(x => x.ev && x.ev.split("/").indexOf(ev) >= 0); const smp = { t: desc.now, W: sol.fk.joint[skel.byName.pelvis.idx].slice(), stage: g.phase, ev: null };
    const tag = (ev) => { smp.ev = smp.ev ? smp.ev + "/" + ev : ev; };
    const grounded = ["R", "L"].some(sd => sol.diag.feet[sd] && (sol.diag.feet[sd].locked || sol.diag.feet[sd].floored || (sol.diag.feet[sd].height != null && sol.diag.feet[sd].height < 0.02)));
    if (g.mode === "pre" && (g.phase === "TOE_OFF" || g.phase === "EARLY_FLIGHT" || g.phase === "MID_FLIGHT" || g.phase === "PUSH_OFF") && !grounded && !has("TOE-OFF")) { const prev = T[T.length - 1]; if (prev && !prev.ev) prev.ev = "TOE-OFF"; else tag("TOE-OFF"); }   // TOE-OFF = the last frame with a foot on the pitch
    if (gk.contact && !has("CONTACT")) tag("CONTACT");
    if (g.phase === "IMPACT" && !has("TOUCHDOWN")) tag("TOUCHDOWN");
    if (g.phase === "SETTLE" && !has("SETTLE")) tag("SETTLE");
    if (g.phase === "REPOSITION" && !has("STAND")) tag("STAND");
    if (g.phase === "SET" && has("STAND") && !has("SET")) tag("SET");
    if (!T.length || T[T.length - 1].t < desc.now) T.push(smp);
    if (!has("APEX") && has("TOE-OFF") && !has("TOUCHDOWN")) { let hi = null; for (const x of T) if (!hi || x.W[1] > hi.W[1]) hi = x; if (hi && hi !== smp && smp.W[1] < hi.W[1] - 0.01) hi.ev = hi.ev ? hi.ev + "/APEX" : "APEX"; }
  }
  // debug overlays
  if (GK3D.debug.trail) gk3dDrawTrail(P3);
  if (GK3D.debug.bones || S.dbg.anim) gk3dDrawBones(skel, sol.fk, P3);
  if (GK3D.debug.ik || S.dbg.anim) gk3dDrawIK(sol, g, gk, P3, handScreen, simHand);
  if (GK3D.debug.roots || S.dbg.anim) gk3dDrawRoots(gk, g, sp, spp);
  if (GK3D.debug.feet || S.dbg.anim) gk3dDrawFeet(skel, sol, P3);
  if (S.dbg.anim) { const anchors = { root: { x: Math.round(sp.x), y: Math.round(sp.y) }, pelvis: P3(sol.fk.joint[skel.byName.pelvis.idx]), head: P3(sol.fk.tip[skel.byName.head.idx]), shoulder: P3(sol.fk.tip[skel.byName.chest.idx]), handL: P3(sol.fk.tip[skel.byName.hand_L.idx]), handR: P3(sol.fk.tip[skel.byName.hand_R.idx]), footL: P3(sol.fk.tip[skel.byName.foot_L.idx]), footR: P3(sol.fk.tip[skel.byName.foot_R.idx]) }; gkAnimOverlay(t, gk, cur, anchors, handScreen, s); }
  if (GK3D.debug.label) { ctx.fillStyle = "#ffb0f0"; ctx.font = uipx(9) + "px monospace"; ctx.textAlign = "center"; const hp = P3(sol.fk.tip[skel.byName.head.idx]); ctx.fillText("SKELETAL_3D", hp.x, hp.y - uipx(12)); ctx.textAlign = "left"; }
  GK3D.perf.n++; const ms = performance.now() - t0; GK3D.perf.ms += ms; if (ms > GK3D.perf.max) GK3D.perf.max = ms; GK3D.perf.glDraws = out.draws; GK3D.perf.target = out.w + "x" + out.h + " (1/" + out.scale + ")";
  GK3D.last = { desc, g, sol, handScreen, simHand };
  return true;
}
function gk3dDrawTrail(P3) {
  // presentation-root trajectory: ground track (grey), pelvis path (magenta), velocity vectors (yellow, 0.12 s long) every 6 ticks
  // and at the markers TOE-OFF / CONTACT / APEX / TOUCHDOWN / SETTLE. One continuous curve through CONTACT is the acceptance.
  const T = GK3D.trail; if (!T || T.length < 2) return; ctx.save();
  ctx.lineWidth = Math.max(1, PXQ); ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); T.forEach((x, i) => { const p = P3([x.W[0], 0, x.W[2]]); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke();
  ctx.lineWidth = Math.max(1.5, PXQ * 1.5); ctx.strokeStyle = "#ff5ad6"; ctx.beginPath(); T.forEach((x, i) => { const p = P3(x.W); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke();
  const vel = (i) => { const a = T[Math.max(0, i - 1)], b = T[Math.min(T.length - 1, i + 1)], dt = b.t - a.t; return dt > 1e-6 ? V3.scale(V3.sub(b.W, a.W), 1 / dt) : [0, 0, 0]; };
  ctx.lineWidth = Math.max(1, PXQ);
  for (let i = 1; i < T.length - 1; i++) {
    if (i % 6 && !T[i].ev) continue; const v = vel(i); if (V3.len(v) < 0.05) continue;
    const p = P3(T[i].W), q = P3(V3.add(T[i].W, V3.scale(v, 0.12))); const ang = Math.atan2(q.y - p.y, q.x - p.x), ah = uipx(4);
    ctx.strokeStyle = T[i].ev ? "#ffe36a" : "rgba(255,227,106,0.6)"; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - ah * Math.cos(ang - 0.5), q.y - ah * Math.sin(ang - 0.5)); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - ah * Math.cos(ang + 0.5), q.y - ah * Math.sin(ang + 0.5)); ctx.stroke();
  }
  // markers + a stacked label column (leader lines) so the labels stay readable when the path is foreshortened on screen
  ctx.font = uipx(8) + "px monospace"; ctx.textAlign = "left"; const marks = [];
  for (let i = 0; i < T.length; i++) { const x = T[i]; if (!x.ev) continue; const p = P3(x.W); ctx.fillStyle = "#ffe36a"; ctx.beginPath(); ctx.arc(p.x, p.y, uipx(3), 0, Math.PI * 2); ctx.fill(); const v = vel(i); marks.push({ p, text: x.ev + " t" + Math.round(x.t * 60) + " " + Math.hypot(v[0], v[2]).toFixed(1) + "/" + v[1].toFixed(1) + " m/s" }); }
  if (marks.length) { const lx = Math.max(...marks.map(m => m.p.x)) + uipx(14), y0 = Math.min(...marks.map(m => m.p.y)) - uipx(4), step = uipx(10); marks.sort((a, b) => a.p.y - b.p.y);
    marks.forEach((m, i) => { const ly = y0 + i * step; ctx.strokeStyle = "rgba(255,227,106,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(m.p.x, m.p.y); ctx.lineTo(lx - uipx(2), ly + uipx(3)); ctx.stroke(); ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(lx - 1, ly - uipx(2), ctx.measureText(m.text).width + 2, uipx(9)); ctx.fillStyle = "#ffffff"; ctx.fillText(m.text, lx, ly + uipx(5)); }); }
  ctx.restore();
}
function gk3dDrawBones(skel, fk, P3) {
  ctx.save(); ctx.lineWidth = Math.max(1, PXQ); 
  for (const b of skel.bones) { if (!b.parent || b.len <= 0) continue; const a = P3(fk.joint[b.idx]), c = P3(fk.tip[b.idx]); ctx.strokeStyle = b.name.endsWith("_R") ? "#ff6a6a" : b.name.endsWith("_L") ? "#6ab0ff" : "#ffe36a"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.fillRect(a.x - 1, a.y - 1, 3, 3); }
  // anatomical side markers (L / R at the shoulders and hips) and pelvis / chest local axes (red = right, green = up, blue = forward, 0.15 m)
  ctx.font = "bold " + uipx(9) + "px monospace"; ctx.textAlign = "center";
  for (const [bn, lab, col] of [["upperArm_L", "L", "#6ab0ff"], ["upperArm_R", "R", "#ff6a6a"], ["thigh_L", "L", "#6ab0ff"], ["thigh_R", "R", "#ff6a6a"]]) { const j = P3(fk.joint[skel.byName[bn].idx]); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(j.x - uipx(5), j.y - uipx(11), uipx(10), uipx(10)); ctx.fillStyle = col; ctx.fillText(lab, j.x, j.y - uipx(3)); }
  for (const bn of ["pelvis", "chest"]) { const m = fk.world[skel.byName[bn].idx], o = M4.origin(m), po = P3(o); for (const [c0, col] of [[0, "#ff4040"], [4, "#40ff40"], [8, "#4080ff"]]) { const q = P3([o[0] + m[c0] * 0.15, o[1] + m[c0 + 1] * 0.15, o[2] + m[c0 + 2] * 0.15]); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, PXQ * 1.5); ctx.beginPath(); ctx.moveTo(po.x, po.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } }
  ctx.textAlign = "left"; ctx.restore();
}
function gk3dDrawIK(sol, g, gk, P3, handScreen, simHand) {
  ctx.save();
  if (sol.diag.ik) { const T = P3(sol.diag.ik.target); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, PXQ); ctx.beginPath(); ctx.arc(T.x, T.y, uipx(4), 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = "#38ff9a"; ctx.beginPath(); ctx.arc(handScreen.x, handScreen.y, uipx(5), 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = "rgba(56,255,154,0.7)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(handScreen.x, handScreen.y); ctx.lineTo(T.x, T.y); ctx.stroke(); ctx.setLineDash([]); }
  if (gk.contact) { const cp = gk.contact.point, cs = sproj3(cp[0], cp[2], cp[1]); ctx.strokeStyle = "#ff3b3b"; ctx.lineWidth = Math.max(1, PXQ * 2); ctx.beginPath(); ctx.arc(cs.x, cs.y, uipx(6), 0, Math.PI * 2); ctx.stroke(); }
  if (gk.committed) { const tg = gk.committed.target, ts = sproj3(tg[0], tg[2], tg[1]); ctx.strokeStyle = "#38e0ff"; ctx.lineWidth = Math.max(1, PXQ); ctx.beginPath(); ctx.arc(ts.x, ts.y, uipx(4), 0, Math.PI * 2); ctx.stroke(); }
  if (sol.diag.plant && GK3D.state.plantAnkle) { const pa = P3(GK3D.state.plantAnkle); ctx.strokeStyle = "#ffa040"; ctx.lineWidth = Math.max(1, PXQ); ctx.strokeRect(pa.x - uipx(3), pa.y - uipx(3), uipx(6), uipx(6)); }
  ctx.restore();
}
function gk3dDrawFeet(skel, sol, P3) {
  // foot / ground contact: green = planted (locked by leg IK at its world point), yellow = touching the pitch, orange = airborne; brace hands in white
  ctx.save(); ctx.lineWidth = Math.max(1, PXQ);
  for (const side of ["R", "L"]) {
    const f = sol.diag.feet[side]; if (!f) continue; const tip = P3(sol.fk.tip[skel.byName["foot_" + side].idx]);
    if (f.locked) { const p = P3(f.P); ctx.strokeStyle = "#38ff9a"; ctx.beginPath(); ctx.arc(p.x, p.y, uipx(5), 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = "#38ff9a"; ctx.fillRect(tip.x - 1, tip.y - 1, 3, 3); }
    else { ctx.strokeStyle = f.height < 0.05 ? "#ffe36a" : "#ff9a3c"; ctx.beginPath(); ctx.arc(tip.x, tip.y, uipx(4), 0, Math.PI * 2); ctx.stroke(); }
  }
  for (const s of ["R", "L"]) { const b = sol.diag["brace_" + s]; if (b) { const p = P3(b.P); ctx.strokeStyle = "#ffffff"; ctx.strokeRect(p.x - uipx(3), p.y - uipx(3), uipx(6), uipx(6)); } }
  ctx.restore();
}
function gk3dDrawRoots(gk, g, sp, spp) {
  ctx.save(); ctx.lineWidth = Math.max(1, PXQ);
  ctx.strokeStyle = "#ff4040"; ctx.beginPath(); ctx.moveTo(sp.x - uipx(6), sp.y); ctx.lineTo(sp.x + uipx(6), sp.y); ctx.moveTo(sp.x, sp.y - uipx(6)); ctx.lineTo(sp.x, sp.y + uipx(6)); ctx.stroke();      // simulation root (red cross)
  ctx.strokeStyle = "#c080ff"; ctx.beginPath(); ctx.arc(spp.x, spp.y, uipx(4), 0, Math.PI * 2); ctx.stroke();                                                                                  // presentation root (violet ring)
  if (g.pres.dm > 0.001) { ctx.strokeStyle = "rgba(192,128,255,0.8)"; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(spp.x, spp.y); ctx.stroke(); }
  if (gk.committed) { const f = gk.committed.feet, fs = sproj3(f[0], 0, f[1]); ctx.strokeStyle = "#39d98a"; ctx.strokeRect(fs.x - uipx(4), fs.y - uipx(4), uipx(8), uipx(8)); }              // feet at commit (green square)
  // world-space direction test: DIVE direction (cyan, from the presentation root) and the SIMULATION ROOT → PRESENTATION ROOT vector (magenta) — a sign flip would show as these disagreeing
  if (g.landing && g.landing.plan.launch) {
    const V = g.landing.plan.launch.V, vn = Math.hypot(V[0], V[2]) || 1, dx = V[0] / vn * 0.6, dy = -V[2] / vn * 0.6, px = g.pres.x, py = g.pres.y;
    const arrow = (a, b, col, text) => { ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1, PXQ * 1.5); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); const an = Math.atan2(b.y - a.y, b.x - a.x), ah = uipx(5); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - ah * Math.cos(an - 0.5), b.y - ah * Math.sin(an - 0.5)); ctx.lineTo(b.x - ah * Math.cos(an + 0.5), b.y - ah * Math.sin(an + 0.5)); ctx.closePath(); ctx.fill(); ctx.font = uipx(8) + "px monospace"; ctx.fillText(text, b.x + uipx(3), b.y + uipx(3)); };
    arrow(sproj3(px, 0, py), sproj3(px + dx, 0, py + dy), "#38e0ff", "DIVE");
    if (g.pres.dm > 0.02) arrow(sp, spp, "#ff5ad6", "ROOT→PRES " + g.pres.dm.toFixed(2) + " m" + (g.pres.dm > 0.02 ? ((g.pres.dx * dx + g.pres.dy * dy) >= 0 ? " (dive side)" : " (OPPOSITE SIDE!)") : ""));
  }
  ctx.restore();
}
GK_PRESENTATION.register("SKELETAL_3D", { draw: gk3dDraw, reset: gk3dReset, label: "skeletal 3D prototype" });
document.addEventListener("DOMContentLoaded", () => { for (const k of ["bones", "ik", "roots", "feet", "trail"]) { const el = document.getElementById("dbg3d-" + k); if (el) el.addEventListener("change", () => { GK3D.debug[k] = el.checked; }); } });

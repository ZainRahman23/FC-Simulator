// ═══ anim3d/gk3d_backend.js — SKELETAL_3D presentation backend for the playtest goalkeeper (prototype) ═══
// Same simulation, same resolver (gkAnimUpdate → ActionDescription); only the drawing differs. Never writes gk/ball.
const GK3D = {
  copies: 0,                    // review: draw N extra keepers (offset laterally) for the scaling measurement
  debug: { bones: false, ik: false, roots: false, feet: false, label: false },
  perf: { n: 0, ms: 0, max: 0, glDraws: 0 },
  lastContact: null, log: [],
  state: {},                    // presentation memory (plant lock, commit key) — reset per shot
  R: null, skel: null, skelH: 0,
};
function gk3dReset() { GK3D.state = {}; }
function gk3dDraw(t, gk, dt) {
  const A = S.gkAnim, t0 = performance.now();
  if (!GK3D.R) { GK3D.R = glCreateRenderer(); if (!GK3D.R) return gkAnimDraw(t, gk, dt); }
  if (A.prevRoot) A.odo += Math.hypot(gk.x - A.prevRoot.x, gk.y - A.prevRoot.y); A.prevRoot = { x: gk.x, y: gk.y };
  const cur = gkAnimUpdate(t, gk);                       // shared semantic resolver (layer B)
  const desc = gkActionDescription(t, gk, cur);
  if (GK3D.skelH !== gk.height) { GK3D.skel = skelBuild(gk.height); GK3D.skelH = gk.height; }
  const skel = GK3D.skel, clip = GK_CLIP_FAR_DIVE;
  if (!desc.commit && GK3D.state.commitKey != null) GK3D.state = {};
  const g = gkGraphEvaluate(desc, clip, skel, GK3D.state);
  const sol = gkGraphSolve(desc, g, skel, GK3D.state);
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
  const artLabel = "3D " + clip.id + (g.side === "LEFT" ? " (mirrored)" : "") + " " + g.phase + (g.sub && g.sub !== g.phase ? " [" + g.sub + "]" : "") + (g.clipT != null ? (g.mode === "post" ? "  +" + g.clipT.toFixed(2) + " s" : "  u " + g.clipT.toFixed(2)) : "") + (g.pres.dm ? "  pres +" + g.pres.dm.toFixed(2) + " m" : "") + (sol.diag.ik ? "  ik w " + sol.diag.ik.w + " res " + (sol.diag.ik.residual * 100).toFixed(1) + " cm" : "") + (g.axis ? "  axis " + g.axis.theta + "° side-land " + g.axis.wSide.toFixed(2) : "") + (g.landing ? "  h " + (g.landing.L.h != null ? g.landing.L.h.toFixed(2) : "keys") + " x " + g.landing.L.x.toFixed(2) + " s " + g.landing.L.s.toFixed(2) : "") + "  RIGHT FOOT: " + (sol.diag.feet.R && sol.diag.feet.R.locked ? "PLANTED" : "RELEASED") + "  LEFT FOOT: " + (sol.diag.feet.L && sol.diag.feet.L.locked ? "PLANTED" : "RELEASED") + (sol.diag.plant ? "  plant w " + sol.diag.plant.w : "") + (sol.diag.torso ? "  torso +" + sol.diag.torso + "°" : "") + (g.authored ? "" : "  [family not authored: SET + procedural reach]");
  cur.artLabel = artLabel;
  if (gk.contact && (!GK3D.lastContact || GK3D.lastContact.tickT !== gk.contact.tickT)) {
    const cp = gk.contact.point, cs = sproj3(cp[0], cp[2], cp[1]);
    const errPx = simHand ? Math.hypot(handScreen.x - simHand.x, handScreen.y - simHand.y) : null;
    const pxPerM = Math.abs(sproj3(cp[0], cp[2] + 1, cp[1]).y - cs.y) || 1;
    const hm = pitchW(handC); const errM3 = gk.handNow ? Math.hypot(hm[0] - gk.handNow[0], hm[1] - gk.handNow[1], hm[2] - gk.handNow[2]) : null;
    GK3D.lastContact = { tickT: gk.contact.tickT, outcome: gk.contact.outcome, volume: gk.contact.volume, phase: g.phase, u: desc.u, errPx: errPx != null ? +errPx.toFixed(1) : null, errM: errPx != null ? +(errPx / pxPerM).toFixed(3) : null, err3dM: errM3 != null ? +errM3.toFixed(3) : null, spritePx: errPx != null ? +(errPx / s).toFixed(1) : null, ik: sol.diag.ik, art: artLabel };
    A.lastContact = Object.assign({}, GK3D.lastContact, { state: cur.state, family: cur.family, side: cur.side, dir: cur.dir, cls: cur.cls, source: "3D glove centre vs sim hand", flagged: errPx != null && errPx / s > GK_ANIM.ikMaxPx });
  }
  // debug overlays
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
function gk3dDrawBones(skel, fk, P3) {
  ctx.save(); ctx.lineWidth = Math.max(1, PXQ); 
  for (const b of skel.bones) { if (!b.parent || b.len <= 0) continue; const a = P3(fk.joint[b.idx]), c = P3(fk.tip[b.idx]); ctx.strokeStyle = b.name.endsWith("_R") ? "#ff6a6a" : b.name.endsWith("_L") ? "#6ab0ff" : "#ffe36a"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.fillRect(a.x - 1, a.y - 1, 3, 3); }
  ctx.restore();
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
  ctx.restore();
}
GK_PRESENTATION.register("SKELETAL_3D", { draw: gk3dDraw, reset: gk3dReset, label: "skeletal 3D prototype" });
document.addEventListener("DOMContentLoaded", () => { for (const k of ["bones", "ik", "roots", "feet"]) { const el = document.getElementById("dbg3d-" + k); if (el) el.addEventListener("change", () => { GK3D.debug[k] = el.checked; }); } });

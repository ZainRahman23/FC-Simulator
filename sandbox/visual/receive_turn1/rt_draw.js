// ═══ receive_turn1/rt_draw.js — the receive-and-turn TOP VIEW (plan) used by the lab, the turn matrix and the variance page ═══════════════════════
// The passer is at the top (+f up), the receiver's initial right to the right. Drawn: the initial facing (white), the incoming ball (grey dashed),
// the desired exit line (gold), the planned body rotation (cyan arc about the pivot), the IDEAL first-touch vector (green) and the ACTUAL one
// (orange), the ideal ball path (green dashed) and the actual one (orange), the reconnection point (green ring), the meeting (white diamond), an
// extra control touch (cyan ring), the receiver's actual root path (gold dotted) and his skeleton seen from above.
import { COL } from "./rk_draw.js";
export const TCOL = Object.assign({}, COL, { facing: "#ffffff", exit: "#ffd45e", rot: "#5ee8e0", vIdeal: "#4fd18b", vActual: "#ff9a3d", root: "rgba(255,212,94,0.75)", meet: "#ffffff", ctrl: "#5ee8e0" });
export function turnExtents(d) {
  let f0 = -1.2, f1 = 1.2, r0 = -1.2, r1 = 1.2; const add = (p) => { if (!p) return; f0 = Math.min(f0, p[0]); f1 = Math.max(f1, p[0]); r0 = Math.min(r0, p[1]); r1 = Math.max(r1, p[1]); };
  for (const p of d.fit || []) add(p); const pad = 0.35; f0 -= pad; f1 += pad; r0 -= pad; r1 += pad; return { f0, f1, r0, r1 };
}
export function turnTop(ctx, box, ext, d, o = {}) {
  const { x, y, w, h } = box, sx = w / (ext.r1 - ext.r0), sy = h / (ext.f1 - ext.f0), s = Math.min(sx, sy), cx = x + w / 2 - ((ext.r0 + ext.r1) / 2) * s, cy = y + h / 2 + ((ext.f0 + ext.f1) / 2) * s;
  const P = (p) => [cx + p[1] * s, cy - p[0] * s], fs = o.font || 11, lw = o.lw || 1.6;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = o.bg || TCOL.bg; ctx.fillRect(x, y, w, h);
  // grid (1 m)
  ctx.strokeStyle = TCOL.grid; ctx.lineWidth = 1; for (let f = Math.ceil(ext.f0); f <= ext.f1; f++) { const a = P([f, ext.r0]), b = P([f, ext.r1]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  for (let r = Math.ceil(ext.r0); r <= ext.r1; r++) { const a = P([ext.f0, r]), b = P([ext.f1, r]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  const line = (pts, col, wd, dash) => { if (!pts || pts.length < 2) return; ctx.beginPath(); pts.forEach((p, i) => { const q = P(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); };
  const arrow = (a, v, col, wd, lbl) => { const b = [a[0] + v[0], a[1] + v[1]], A = P(a), B = P(b); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    const an = Math.atan2(B[1] - A[1], B[0] - A[0]), hl = 7 + wd; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(B[0] - hl * Math.cos(an - 0.4), B[1] - hl * Math.sin(an - 0.4)); ctx.lineTo(B[0] - hl * Math.cos(an + 0.4), B[1] - hl * Math.sin(an + 0.4)); ctx.closePath(); ctx.fill();
    if (lbl) { ctx.font = `${fs}px Menlo, monospace`; ctx.fillText(lbl, B[0] + 4, B[1] - 4); } };
  const ring = (p, r, col, wd, dash) => { const q = P(p); ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 2 * Math.PI); ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); };
  const text = (p, t, col, dx = 6, dy = -6) => { const q = P(p); ctx.fillStyle = col; ctx.font = `${fs}px Menlo, monospace`; ctx.fillText(t, q[0] + dx, q[1] + dy); };
  // incoming, facing, exit
  line(d.inc, TCOL.incoming, lw, [5, 4]);
  if (d.facing0) arrow([0, 0], [Math.cos(d.facing0) * 0.9, Math.sin(d.facing0) * 0.9], TCOL.facing, lw, o.labels !== false ? "facing" : null);
  if (d.exit) { line([d.exit.from, [d.exit.from[0] + d.exit.u[0] * 4.2, d.exit.from[1] + d.exit.u[1] * 4.2]], TCOL.exit, lw + 0.6, [9, 5]); if (o.labels !== false) text([d.exit.from[0] + d.exit.u[0] * 3.0, d.exit.from[1] + d.exit.u[1] * 3.0], `exit ${d.exit.deg}°`, TCOL.exit); }
  // the planned rotation: an arc about the pivot from the contact facing to the exit heading
  if (d.rot) { const pts = [], n = 24; for (let i = 0; i <= n; i++) { const a = d.rot.a0 + (d.rot.a1 - d.rot.a0) * i / n; pts.push([d.rot.c[0] + Math.cos(a) * 0.55, d.rot.c[1] + Math.sin(a) * 0.55]); } line(pts, TCOL.rot, lw, [3, 3]); const e = pts[pts.length - 1], e0 = pts[pts.length - 2]; arrow(e0, [e[0] - e0[0], e[1] - e0[1]], TCOL.rot, lw); }
  // paths
  line(d.root, TCOL.root, lw, [2, 3]);
  line(d.ideal, TCOL.ideal, lw, [6, 4]); line(d.actual, TCOL.actual, lw + 0.4);
  if (d.Prec) ring(d.Prec, 7, TCOL.ideal, 1.5);
  if (d.stand) { const q = P(d.stand); ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(q[0] - 4, q[1] - 4, 8, 8); }
  // first-touch vectors (scaled 0.35 s of travel)
  if (d.C && d.vIdeal) arrow(d.C, [d.vIdeal[0] * 0.35, d.vIdeal[1] * 0.35], TCOL.vIdeal, lw + 0.8, o.labels !== false ? "ideal touch" : null);
  if (d.C && d.vActual) arrow(d.C, [d.vActual[0] * 0.35, d.vActual[1] * 0.35], TCOL.vActual, lw + 0.8, o.labels !== false ? "actual touch" : null);
  if (d.C) { ring(d.C, 5, TCOL.surf.FOOT, 1.8); if (d.contactLabel && o.labels !== false) text(d.C, d.contactLabel, TCOL.surf.FOOT, 8, 14); }
  if (d.meet) { const q = P(d.meet); ctx.strokeStyle = TCOL.meet; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(q[0], q[1] - 7); ctx.lineTo(q[0] + 7, q[1]); ctx.lineTo(q[0], q[1] + 7); ctx.lineTo(q[0] - 7, q[1]); ctx.closePath(); ctx.stroke(); }
  if (d.ctrl) { ring(d.ctrl, 7, TCOL.ctrl, 2); if (o.labels !== false) text(d.ctrl, "control", TCOL.ctrl); }
  for (const g of d.ghosts || []) { line(g.path, g.col, 1, []); if (g.end) { const q = P(g.end); ctx.fillStyle = g.col; ctx.beginPath(); ctx.arc(q[0], q[1], 2.4, 0, 2 * Math.PI); ctx.fill(); } }
  // skeleton from above
  if (d.J) { const seg = (a, b) => { if (!d.J[a] || !d.J[b]) return; const A = P(d.J[a].j), B = P(d.J[b].j); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); };
    ctx.strokeStyle = TCOL.body; ctx.lineWidth = 2; for (const [a, b] of [["pelvis", "chest"], ["clavicle_R", "clavicle_L"], ["thigh_R", "shin_R"], ["shin_R", "foot_R"], ["thigh_L", "shin_L"], ["shin_L", "foot_L"], ["upperArm_R", "foreArm_R"], ["upperArm_L", "foreArm_L"], ["thigh_R", "thigh_L"]]) seg(a, b);
    for (const X of ["R", "L"]) { const f = d.J["foot_" + X], tt = d.J["toe_" + X]; if (f && tt) { ctx.strokeStyle = X === (d.contactFoot || "R") ? TCOL.surf.FOOT : TCOL.body; ctx.lineWidth = 3; const A = P(f.j), B = P(tt.t); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } } }
  if (d.ball) { const q = P(d.ball); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(2.5, 0.11 * s), 0, 2 * Math.PI); ctx.fill(); }
  if (d.ballIdeal) { const q = P(d.ballIdeal); ctx.strokeStyle = TCOL.ideal; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(3, 0.11 * s), 0, 2 * Math.PI); ctx.stroke(); }
  if (o.title) { ctx.fillStyle = TCOL.ink; ctx.font = `bold ${fs + 1}px -apple-system, Helvetica, sans-serif`; ctx.fillText(o.title, x + 8, y + fs + 6); }
  if (o.sub) { ctx.fillStyle = o.subCol || TCOL.dim; ctx.font = `${fs}px Menlo, monospace`; ctx.fillText(o.sub, x + 8, y + 2 * fs + 10); }
  if (o.scale !== false) { const a = [ext.f0 + 0.25, ext.r1 - 1.25], b = [ext.f0 + 0.25, ext.r1 - 0.25], A = P(a), B = P(b); ctx.strokeStyle = TCOL.dim; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.fillStyle = TCOL.dim; ctx.font = `${fs - 1}px Menlo, monospace`; ctx.fillText("1 m", A[0], A[1] - 4); }
  ctx.restore();
}
// the drawing data of one episode (lab / matrix / variance page)
export function turnData(prep, ep, o = {}) {
  const A = prep.A, P = prep.inc.pred.P, kc = prep.kc, inc = []; for (let k = Math.max(0, kc - Math.round(1.1 * 240)); k <= kc; k += 6) inc.push(P[k].p);
  const tEnd = o.tEnd || 2.4, pick = (rec) => rec.filter((r) => r.i <= tEnd * 240).map((r) => r.p), ideal = prep.idealP ? prep.idealP.filter((r, j) => j % 6 === 0 && j <= tEnd * 240).map((r) => r.p) : null;
  const root = []; if (o.body) for (let t = -0.4; t <= tEnd; t += 0.05) root.push(o.body.rootAt(t));
  const u = A.path.u, th = A.thetaDeg;
  return { inc, ideal, actual: ep ? pick(ep.rec) : null, C: A.C, vIdeal: A.vIdeal, vActual: ep ? ep.ex.v : null, facing0: 0, exit: { from: A.path.endRoot, u, deg: th }, rot: { c: A.path.pivot, a0: A.psiC, a1: A.theta },
    Prec: A.Prec, stand: A.stand, meet: ep && ep.meet && ep.m.cls !== "RECOVERY" && ep.m.cls !== "UNSTABLE" ? ep.meet.ball : null, ctrl: ep && ep.follow ? ep.follow.contact : null, root: root.length ? root : null, contactLabel: `${A.F} ${A.surface.toLowerCase()}`, contactFoot: A.F,
    fit: [[0.9, 0], [-0.4, 0], A.C, A.Prec, [A.path.endRoot[0] + u[0] * 2.0, A.path.endRoot[1] + u[1] * 2.0]].concat(ep ? ep.rec.filter((r) => r.i <= 1.1 * 240 && r.i % 24 === 0).map((r) => r.p) : []) };
}

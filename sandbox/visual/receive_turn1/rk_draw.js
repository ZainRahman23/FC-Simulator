// (receive_turn1 copy: + o.actualCol, o.noGrid for the variance page's overlays)
// ═══ receive_kill11/rk_draw.js — RECEIVE-KILL-1.1: the 2D geometry views (side / top) of a CONTROL EPISODE ═══════════════════════════════════════
// (RECEIVE-KILL-1's views + the episode: follow-up contacts (cyan, numbered), the stable-control point (white diamond), the receiver's adjustment
// path (yellow, top view), the first-contact drop points (actual ✕ orange, ideal ✕ green)). The ideal path is the IDEAL EPISODE (perfect execution).
// Side view: forward distance f (→ toward the passer) against height z. Top view: forward f against the receiver's right r (down = right).
// Colours: incoming ball grey · IDEAL result green (dashed) · ACTUAL result orange · contact marker by surface · intended point = green ring.
import { R } from "./rk_model.js";
export const COL = { bg: "#121916", grid: "#1f2a25", ink: "#e6efe9", dim: "#8fa49a", incoming: "#9aa8a2", ideal: "#4fd18b", actual: "#ffb547", body: "#cfd8d3", target: "#4fd18b",
  surf: { FOOT: "#5ec8ff", THIGH: "#c39bff", CHEST: "#ff8fb8", HEAD: "#ffe066" }, state: { SET: "#3fbf7f", CONTROLLED: "#9fd65a", LOOSE: "#ffc640", CONTESTABLE: "#ff8a3d", LOST: "#ff4d4d" },
  cls: { IMMEDIATE: "#3fbf7f", ADJUSTED: "#c8d84a", RECOVERY: "#ffa13d", UNSTABLE: "#ff4d4d" }, follow: "#5ee8e0", move: "#ffd45e", stable: "#ffffff" };
// the extents of a set of runs (one row of the matrix, or the lab): f, r, z ranges with margins
export function extents(items, o = {}) {
  let f0 = -1.0, f1 = 1.6, r1 = 0.6, z1 = 2.0;
  for (const it of items) for (const p of it) { if (!p) continue; f0 = Math.min(f0, p[0]); f1 = Math.max(f1, p[0]); r1 = Math.max(r1, Math.abs(p[1])); z1 = Math.max(z1, p[2]); }
  if (o.near) { f0 = Math.max(f0, -o.near * 0.6); f1 = Math.min(f1, o.near); r1 = Math.min(r1, o.near * 0.6); }
  const pad = (f1 - f0) * 0.06; return { f0: f0 - pad, f1: f1 + pad, r1: r1 * 1.12 + 0.05, z1: z1 * 1.08 };
}
const niceStep = (span) => { const raw = span / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
// draw a polyline of local points through a projector
function poly(ctx, pts, pr, color, w, dash) { if (!pts || pts.length < 2) return; ctx.beginPath(); let started = false; for (const p of pts) { const q = pr(p); if (!q) continue; if (!started) { ctx.moveTo(q[0], q[1]); started = true; } else ctx.lineTo(q[0], q[1]); } ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); }
function dot(ctx, q, r, fill, stroke) { if (!q) return; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } }
// the receiver's stick figure from joints J (local [f, r, z]); proj picks the 2D axes
const BONES = ["pelvis", "spine", "chest", "neck", "head", "thigh_R", "shin_R", "foot_R", "toe_R", "thigh_L", "shin_L", "foot_L", "toe_L", "clavicle_R", "upperArm_R", "foreArm_R", "clavicle_L", "upperArm_L", "foreArm_L"];
function stick(ctx, J, pr, color, w, hi) { if (!J) return; ctx.lineCap = "round"; for (const n of BONES) { const b = J[n]; if (!b) continue; const a = pr(b.j), c = pr(b.t); if (!a || !c) continue; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.strokeStyle = hi && hi.includes(n) ? hi.color : color; ctx.lineWidth = (n === "head" ? 2.2 : n.startsWith("thigh") || n === "spine" || n === "chest" ? 1.6 : 1.1) * w; ctx.stroke(); }
  const h = J.head; if (h) { const q = pr([(h.j[0] + h.t[0]) / 2, (h.j[1] + h.t[1]) / 2, (h.j[2] + h.t[2]) / 2]); if (q) dot(ctx, q, 4.2 * w, null, color); } }
// one view: kind "side" | "top"; box {x, y, w, h}; ext from extents(); d = { incoming, ideal, actual, contact, target, group, J, hiBones, ballNow, idealNow, ladder: [{p, label, color}] }
export function view(ctx, kind, box, ext, d, o = {}) {
  const { x, y, w, h } = box, side = kind === "side";
  const sx = w / (ext.f1 - ext.f0), sy = side ? h / ext.z1 : h / (2 * ext.r1), s = Math.min(sx, sy) * (o.fill ? 1 : 1);
  const ox = x + (w - s * (ext.f1 - ext.f0)) / 2, oy = side ? y + h - (h - s * ext.z1) / 2 : y + h / 2;
  const pr = (p) => (side ? [ox + (p[0] - ext.f0) * s, oy - p[2] * s] : [ox + (p[0] - ext.f0) * s, oy + p[1] * s]);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = o.bg || COL.bg; ctx.fillRect(x, y, w, h);
  // grid: 1 m (or nice) lines, the turf line in the side view
  const step = niceStep(ext.f1 - ext.f0); ctx.strokeStyle = o.noGrid ? "rgba(0,0,0,0)" : COL.grid; ctx.lineWidth = 1;
  for (let f = Math.ceil(ext.f0 / step) * step; f <= ext.f1; f += step) { const q = pr([f, 0, 0]); ctx.beginPath(); ctx.moveTo(q[0], y); ctx.lineTo(q[0], y + h); ctx.stroke(); }
  if (side) { const g = pr([0, 0, 0]); ctx.strokeStyle = "#3b4a43"; ctx.beginPath(); ctx.moveTo(x, g[1]); ctx.lineTo(x + w, g[1]); ctx.stroke(); }
  else { const c = pr([0, 0, 0]); ctx.strokeStyle = "#26332d"; ctx.beginPath(); ctx.moveTo(x, c[1]); ctx.lineTo(x + w, c[1]); ctx.stroke(); }
  // the intended point
  if (d.target) { const q = pr(side ? [d.target[0], 0, R] : d.target); const rr = Math.max(3, (side ? 0.5 : 0.5) * s * (o.ringM || 0)); dot(ctx, q, Math.max(4, 0.12 * s), null, COL.target); if (o.ringM) dot(ctx, q, rr, null, "rgba(79,209,139,0.25)"); }
  // the receiver
  if (d.J) stick(ctx, d.J, (p) => pr(side ? [p[0], p[1], p[2]] : p), o.bodyCol || COL.body, o.lw || 1, d.hiBones ? Object.assign(d.hiBones.slice(), { color: COL.surf[d.group] || COL.actual }) : null);
  else if (d.stance) { const q = pr([d.stance[0], d.stance[1], 0]); if (side) { const top = pr([d.stance[0], 0, 1.76]); ctx.strokeStyle = COL.body; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(top[0], top[1]); ctx.stroke(); dot(ctx, pr([d.stance[0], 0, 1.66]), Math.max(2, 0.1 * s), null, COL.body); } else dot(ctx, q, Math.max(2.5, 0.16 * s), null, COL.body); }
  // trajectories
  poly(ctx, d.incoming, pr, COL.incoming, 1.3 * (o.lw || 1), [3, 3]);
  poly(ctx, d.ideal, pr, COL.ideal, 1.6 * (o.lw || 1), [5, 3]);
  poly(ctx, d.actual, pr, o.actualCol || COL.actual, 1.8 * (o.lw || 1));
  // the contact marker
  if (d.contact) dot(ctx, pr(d.contact), Math.max(2.5, R * s), "rgba(255,255,255,0.08)", COL.surf[d.group] || "#fff");
  // the episode: the receiver's adjustment path (top), the first-contact drop points, the follow-up contacts, the stable-control point
  if (d.moves && d.moves.length > 1 && !side) { ctx.strokeStyle = COL.move; ctx.lineWidth = 1.6; ctx.setLineDash([]); ctx.beginPath(); d.moves.forEach((S, k) => { const q = pr([S[0], S[1], 0]); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); for (const S of d.moves.slice(1)) dot(ctx, pr([S[0], S[1], 0]), 2.5, COL.move, null); }
  const xm = (q, c, r) => { if (!q) return; ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q[0] - r, q[1] - r); ctx.lineTo(q[0] + r, q[1] + r); ctx.moveTo(q[0] + r, q[1] - r); ctx.lineTo(q[0] - r, q[1] + r); ctx.stroke(); };
  if (d.dropIdeal) xm(pr(d.dropIdeal), COL.ideal, 3); if (d.drop) xm(pr(d.drop), COL.actual, 3);
  if (d.follow) for (const F of d.follow) { const q = pr(F.p); if (!q) continue; dot(ctx, q, Math.max(3, R * s), null, COL.follow); if (o.followLabels !== false) { ctx.fillStyle = COL.follow; ctx.font = (o.font || 9) + "px Menlo, monospace"; ctx.fillText(F.label, q[0] + 4, q[1] - 4); } }
  if (d.stable) { const q = pr(d.stable); if (q) { const r = Math.max(3.5, 0.08 * s); ctx.beginPath(); ctx.moveTo(q[0], q[1] - r); ctx.lineTo(q[0] + r, q[1]); ctx.lineTo(q[0], q[1] + r); ctx.lineTo(q[0] - r, q[1]); ctx.closePath(); ctx.strokeStyle = COL.stable; ctx.lineWidth = 1.5; ctx.stroke(); } }
  // ladder (BC 10 … 99 end points for the same draws)
  if (d.ladder) for (const L of d.ladder) { const q = pr(L.p); if (!q) continue; dot(ctx, q, 3, L.color, null); if (o.ladderLabels) { ctx.fillStyle = L.color; ctx.font = "10px Menlo, monospace"; ctx.fillText(L.label, q[0] + 4, q[1] - 3); } }
  // the end points at 2.0 s
  if (d.idealEnd) dot(ctx, pr(d.idealEnd), Math.max(2.5, R * s * 0.9), null, COL.ideal);
  if (d.actualEnd) dot(ctx, pr(d.actualEnd), Math.max(2.5, R * s * 0.9), COL.actual, null);
  // live balls (the lab)
  if (d.idealNow) dot(ctx, pr(d.idealNow), Math.max(3, R * s), "rgba(79,209,139,0.35)", COL.ideal);
  if (d.ballNow) dot(ctx, pr(d.ballNow), Math.max(3, R * s), "#f4f1e6", "#222");
  // scale bar
  if (o.scale !== false) { const L = step, a = [x + 6, y + h - 6], b = [a[0] + L * s, a[1]]; ctx.strokeStyle = COL.dim; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.fillStyle = COL.dim; ctx.font = (o.font || 9) + "px Menlo, monospace"; ctx.fillText((L >= 1 ? L.toFixed(0) : L.toFixed(1)) + " m", b[0] + 3, b[1] + 3); }
  if (o.label) { ctx.fillStyle = COL.dim; ctx.font = (o.font || 9) + "px Menlo, monospace"; ctx.fillText(o.label, x + 4, y + (o.font || 9) + 2); }
  ctx.restore(); return pr;
}

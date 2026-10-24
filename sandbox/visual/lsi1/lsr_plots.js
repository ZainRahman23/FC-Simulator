// ═══ lsi1/lsr_plots.js — LEFT-STICK INPUT LAB V1: the canvas drawings (the stick-history circle, the time series, the event timeline, the
// comparison overlays). Drawing only — it reads the arrays it is given. Colours: the validated dark categorical order (blue · orange · aqua ·
// yellow · magenta · violet, checked against the panel surface #141b18), the lab accent for the live thumb; text in the ink tokens.
export const C = { bg: "#0d1210", surf: "#141b18", ink: "#e6efe9", dim: "#8fa49a", mute: "#5d6e66", line: "#2a3530", grid: "rgba(200,220,210,0.10)", acc: "#ffd45e",
  s1: "#3987e5", s2: "#d95926", s3: "#199e70", s4: "#c98500", s5: "#d55181", s6: "#9085e9", ok: "#8dffa6", bad: "#e66767", warn: "#ffb36b" };
export const EV_STYLE = { dz_enter: [C.dim, "dz↓"], dz_exit: [C.ink, "dz↑"], near_neutral: [C.s6, "nn"], centre_cross: [C.s5, "×"], reversal: [C.s2, "rev"], large_turn: [C.s4, "turn"],
  mag_spike: [C.s3, "r↑"], mag_release: [C.s1, "r↓"], dir_hold: [C.mute, "hold"] };
export const PLOT_L = 66, PLOT_R = 10;   // (the plots' left / right margins — the click / hover mapping uses the same)
export function fit(cv) { const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); return { g, w, h }; }
const D2R = Math.PI / 180;
function tri(g, x, y, ang, s, col) { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.7, s * 0.6); g.lineTo(-s * 0.7, s * 0.6); g.closePath(); g.fill(); g.restore(); }
// THE STICK-HISTORY CIRCLE. o: { pts: [{ t, x, y, valid }] oldest → newest (t in s), tNow, span, dz, zones, nn, events: [{ t, kind }],
// cur: { x, y } | null, refs: [{ deg, label, col }] (directions on the rim, relative to the stick frame), title, sub, ticks (ages to label) }
export function drawStickHistory(cv, o) {
  const { g, w, h } = fit(cv); if (w < 80 || h < 80) return; const cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) / 2 - 26, P = (x, y) => [cx + x * R, cy - y * R];
  g.fillStyle = C.surf; g.beginPath(); g.arc(cx, cy, R + 14, 0, 2 * Math.PI); g.fill();
  const ring = (f, col, dash, wd = 1) => { g.strokeStyle = col; g.lineWidth = wd; g.setLineDash(dash || []); g.beginPath(); g.arc(cx, cy, f * R, 0, 2 * Math.PI); g.stroke(); g.setLineDash([]); };
  ring(1, "rgba(200,230,215,0.45)", null, 1.5); ring(o.zones.jogTo, "rgba(160,220,255,0.22)", [3, 4]); ring(o.zones.walkTo, "rgba(160,220,255,0.22)", [3, 4]); ring(o.nn, "rgba(144,133,233,0.30)", [1, 4]);
  g.fillStyle = "rgba(255,255,255,0.10)"; g.beginPath(); g.arc(cx, cy, o.dz * R, 0, 2 * Math.PI); g.fill(); ring(o.dz, "rgba(255,255,255,0.45)");
  g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
  // the frame's forward (the camera forward the stick latched) and the rim references
  tri(g, cx, cy - R - 7, 0, 5, C.acc); g.textAlign = "center";
  (o.refs || []).forEach((r, j) => { if (r.deg == null) return; const a = r.deg * D2R, x = cx + Math.sin(a) * (R + 9), y = cy - Math.cos(a) * (R + 9), rl = R - 12 - 11 * j; tri(g, x, y, a + Math.PI, 5, r.col); g.fillStyle = r.col; g.font = "600 9px Menlo,monospace"; g.fillText(r.label, cx + Math.sin(a) * rl, cy - Math.cos(a) * rl + 3); });
  g.font = "9px Menlo,monospace"; g.fillStyle = C.mute; g.textAlign = "left"; g.fillText(`▲ = camera fwd (latched) · rings dz ${o.dz.toFixed(2)} · ${o.zones.walkTo} · ${o.zones.jogTo} · nn ${o.nn}`, 4, h - 4);
  // the path: older = thinner, fainter; direction of time = arrowheads every ~0.15 s and the bright head
  const pts = o.pts || [], span = o.span || 2, tNow = o.tNow; let lastArrow = -1e9;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], age = tNow - b.t; if (age > span || age < -1e-6) continue; const f = 1 - age / span, [x0, y0] = P(a.x, a.y), [x1, y1] = P(b.x, b.y);
    g.strokeStyle = `rgba(255,212,94,${(0.12 + 0.88 * f * f).toFixed(3)})`; g.lineWidth = 1 + 2.6 * f; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (b.t - lastArrow >= 0.15 && Math.hypot(x1 - x0, y1 - y0) > 3) { lastArrow = b.t; tri(g, x1, y1, Math.atan2(x1 - x0, -(y1 - y0)), 3 + 2 * f, `rgba(255,212,94,${(0.25 + 0.75 * f).toFixed(3)})`); } }
  for (const p of pts) { const age = tNow - p.t; if (age > span || age < -1e-6) continue; const f = 1 - age / span, [x, y] = P(p.x, p.y); g.fillStyle = `rgba(230,239,233,${(0.10 + 0.5 * f).toFixed(3)})`; g.fillRect(x - 1, y - 1, 2, 2); }
  // labelled ages (−0.5 s, −1.0 s, …) and the diagnostic events at their samples
  for (const a of o.ticks || [0.5, 1.0, 1.5]) { if (a > span) continue; let best = null; for (const p of pts) if (Math.abs(tNow - p.t - a) < 0.02 && (!best || Math.abs(tNow - p.t - a) < Math.abs(tNow - best.t - a))) best = p; if (!best) continue; const [x, y] = P(best.x, best.y); g.fillStyle = C.dim; g.font = "9px Menlo,monospace"; g.textAlign = "left"; g.fillText(`−${a.toFixed(1)}s`, x + 5, y - 4); }
  for (const e of o.events || []) { const age = tNow - e.t; if (e.kind === "dir_hold" || age > span || age < -1e-6) continue;   // (holds: in the readouts, not on the path)
    const p = nearestPt(pts, e.t); if (!p) continue; const [x, y] = P(p.x, p.y), st = EV_STYLE[e.kind] || [C.ink, e.kind];
    g.strokeStyle = st[0]; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 6, 0, 2 * Math.PI); g.stroke(); g.fillStyle = st[0]; g.font = "700 9px Menlo,monospace"; g.textAlign = "left"; g.fillText(st[1], x + 8, y + 3); }
  if (o.cur) { const [x, y] = P(o.cur.x, o.cur.y); g.fillStyle = C.acc; g.strokeStyle = "#1a1408"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7, 0, 2 * Math.PI); g.fill(); g.stroke(); }
  if (o.title) { g.textAlign = "left"; g.fillStyle = C.ink; g.font = "700 11px -apple-system,Helvetica,sans-serif"; g.fillText(o.title, 4, 13); }
  if (o.sub) { g.textAlign = "right"; g.fillStyle = C.dim; g.font = "10px Menlo,monospace"; g.fillText(o.sub, w - 4, 13); }
}
function nearestPt(pts, t) { let b = null; for (const p of pts) if (!b || Math.abs(p.t - t) < Math.abs(b.t - t)) b = p; return b && Math.abs(b.t - t) < 0.05 ? b : null; }
// THE TIME-SERIES PANELS on one canvas (stacked, one shared time axis). o: { t0, t1, panels: [{ title, unit, yMin, yMax, ticks, series: [{ name, col,
// pts: [[t, v|null]] }], refs: [{ v, col, dash }] }], vlines: [{ t, col }], playhead, hoverT, readout: (t) → string[] }
export function drawSeries(cv, o) {
  const { g, w, h } = fit(cv); if (w < 120 || h < 60) return null; const L = PLOT_L, Rm = PLOT_R, top = 4, gap = 6, n = o.panels.length, ph = (h - top - 16 - gap * (n - 1)) / n, X = (t) => L + ((t - o.t0) / Math.max(1e-6, o.t1 - o.t0)) * (w - L - Rm);
  o.panels.forEach((p, i) => { const y0 = top + i * (ph + gap), Y = (v) => y0 + ph - ((Math.max(p.yMin, Math.min(p.yMax, v)) - p.yMin) / (p.yMax - p.yMin)) * ph;
    g.fillStyle = C.surf; g.fillRect(L, y0, w - L - Rm, ph);
    g.font = "9px Menlo,monospace"; g.textAlign = "right"; for (const v of p.ticks) { g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - Rm, Y(v)); g.stroke(); g.fillStyle = C.mute; g.fillText(String(v), L - 3, Y(v) + 3); }
    for (const r of p.refs || []) { g.strokeStyle = r.col; g.setLineDash(r.dash || [2, 3]); g.beginPath(); g.moveTo(L, Y(r.v)); g.lineTo(w - Rm, Y(r.v)); g.stroke(); g.setLineDash([]); }
    for (const v of o.vlines || []) { if (v.t < o.t0 || v.t > o.t1) continue; g.strokeStyle = v.col; g.globalAlpha = 0.45; g.beginPath(); g.moveTo(X(v.t), y0); g.lineTo(X(v.t), y0 + ph); g.stroke(); g.globalAlpha = 1; }
    for (const s of p.series) { g.strokeStyle = s.col; g.lineWidth = 2; g.beginPath(); let pen = false; for (const [t, v] of s.pts) { if (t < o.t0 - 0.05 || t > o.t1 + 0.05 || v == null || !Number.isFinite(v)) { pen = false; continue; } const x = X(t), y = Y(v); if (!pen) { g.moveTo(x, y); pen = true; } else g.lineTo(x, y); } g.stroke(); }
    g.textAlign = "left"; g.font = "600 10px -apple-system,Helvetica,sans-serif"; let lx = L + 5; g.fillStyle = C.ink; g.fillText(p.title, lx, y0 + 11); lx += g.measureText(p.title).width + 10;
    if (p.series.length > 1 && p.legend !== false) for (const s of p.series) { g.fillStyle = s.col; g.fillRect(lx, y0 + 5, 10, 3); g.fillStyle = C.dim; g.font = "10px -apple-system,Helvetica,sans-serif"; g.fillText(s.name, lx + 13, y0 + 11); lx += 13 + g.measureText(s.name).width + 10; } });
  // the time axis
  g.fillStyle = C.mute; g.font = "9px Menlo,monospace"; g.textAlign = "center"; const step = niceStep(o.t1 - o.t0); for (let t = Math.ceil(o.t0 / step) * step; t <= o.t1 + 1e-9; t += step) g.fillText((o.axisFmt ? o.axisFmt(t) : t.toFixed(step < 1 ? 1 : 0)) + "s", X(t), h - 3);
  if (o.playhead != null && o.playhead >= o.t0 && o.playhead <= o.t1) { g.strokeStyle = C.acc; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(o.playhead), top); g.lineTo(X(o.playhead), h - 14); g.stroke(); }
  if (o.hoverT != null && o.readout) { const x = X(o.hoverT); g.strokeStyle = "rgba(230,239,233,0.6)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, top); g.lineTo(x, h - 14); g.stroke(); tooltip(g, x, top + 8, w, o.readout(o.hoverT)); }
  return { X, L, Rm };
}
export function niceStep(span) { for (const s of [0.1, 0.25, 0.5, 1, 2, 5, 10]) if (span / s <= 9) return s; return 20; }
export function tooltip(g, x, y, w, lines) { if (!lines || !lines.length) return; g.font = "10px Menlo,monospace"; const tw = Math.max(...lines.map((l) => g.measureText(l).width)) + 12, th = lines.length * 13 + 6; let bx = x + 10; if (bx + tw > w - 2) bx = x - 10 - tw;
  g.fillStyle = "rgba(13,18,16,0.94)"; g.strokeStyle = C.line; g.lineWidth = 1; g.fillRect(bx, y, tw, th); g.strokeRect(bx, y, tw, th); g.fillStyle = C.ink; g.textAlign = "left"; lines.forEach((l, i) => g.fillText(l, bx + 6, y + 14 + i * 13)); }
// THE EVENT TIMELINE (rows, one shared time axis with drawSeries). o: { t0, t1, rows: [{ name, items: [{ t, t2?, col, label?, glyph? }] }], playhead, moments: [{ t, col, label }], hoverT, readout }
export function drawTimeline(cv, o) {
  const { g, w, h } = fit(cv); if (w < 120 || h < 40 || !o.rows.length) return null; const L = PLOT_L, Rm = PLOT_R, n = o.rows.length, rh = (h - 14) / n, X = (t) => L + ((t - o.t0) / Math.max(1e-6, o.t1 - o.t0)) * (w - L - Rm);
  o.rows.forEach((r, i) => { const y0 = i * rh; g.fillStyle = i % 2 ? "rgba(255,255,255,0.02)" : C.surf; g.fillRect(L, y0, w - L - Rm, rh - 1);
    g.fillStyle = C.dim; g.font = "600 9px -apple-system,Helvetica,sans-serif"; g.textAlign = "right"; g.fillText(r.name, L - 3, y0 + rh / 2 + 3);
    for (const it of r.items) { if ((it.t2 != null ? it.t2 : it.t) < o.t0 || it.t > o.t1) continue; const x = X(Math.max(o.t0, it.t)), yc = y0 + (it.lane != null ? (it.lane + 0.5) * (rh / (it.lanes || 2)) : rh / 2);
      if (it.t2 != null) { const x2 = X(Math.min(o.t1, it.t2)), hh = it.lanes ? rh / it.lanes - 3 : rh - 6; g.fillStyle = it.col; g.globalAlpha = it.alpha != null ? it.alpha : 0.75; g.fillRect(x, yc - hh / 2, Math.max(1.5, x2 - x - 1), hh); g.globalAlpha = 1;
        if (it.label && x2 - x > 26) { g.fillStyle = it.ink || C.bg; g.font = "600 9px -apple-system,Helvetica,sans-serif"; g.textAlign = "left"; g.save(); g.beginPath(); g.rect(x, yc - hh / 2, x2 - x - 2, hh); g.clip(); g.fillText(it.label, x + 3, yc + 3); g.restore(); } }
      else { g.fillStyle = it.col; g.strokeStyle = it.col; if (it.glyph === "tick") { g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y0 + 2); g.lineTo(x, y0 + rh - 3); g.stroke(); }
        else { g.beginPath(); g.arc(x, yc, 3.5, 0, 2 * Math.PI); g.fill(); } if (it.label) { g.font = "700 9px Menlo,monospace"; g.textAlign = "left"; g.fillText(it.label, x + 5, yc + 3); } } } });
  for (const m of o.moments || []) { if (m.t < o.t0 || m.t > o.t1) continue; const x = X(m.t); g.strokeStyle = m.col; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h - 14); g.stroke(); g.setLineDash([]); g.fillStyle = m.col; g.font = "700 9px -apple-system,Helvetica,sans-serif"; g.textAlign = "left"; g.fillText(m.label, x + 3, h - 16); }
  g.fillStyle = C.mute; g.font = "9px Menlo,monospace"; g.textAlign = "center"; const step = niceStep(o.t1 - o.t0); for (let t = Math.ceil(o.t0 / step) * step; t <= o.t1 + 1e-9; t += step) g.fillText((o.axisFmt ? o.axisFmt(t) : t.toFixed(step < 1 ? 1 : 0)) + "s", X(t), h - 3);
  if (o.playhead != null && o.playhead >= o.t0 && o.playhead <= o.t1) { g.strokeStyle = C.acc; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(o.playhead), 0); g.lineTo(X(o.playhead), h - 14); g.stroke(); }
  if (o.hoverT != null && o.readout) { const x = X(o.hoverT); g.strokeStyle = "rgba(230,239,233,0.6)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h - 14); g.stroke(); tooltip(g, x, 4, w, o.readout(o.hoverT)); }
  return { X, L, Rm };
}
// THE COMPARISON: many attempts' paths in one circle (all one hue, faint; the highlighted one in the accent) — o: { paths: [{ pts: [{ x, y, t }], hi, anchor: { x, y } }], dz, zones, nn, title }
export function drawOverlayPaths(cv, o) {
  const { g, w, h } = fit(cv); if (w < 80 || h < 80) return; const cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) / 2 - 22, P = (x, y) => [cx + x * R, cy - y * R];
  g.fillStyle = C.surf; g.beginPath(); g.arc(cx, cy, R + 12, 0, 2 * Math.PI); g.fill();
  const ring = (f, col, dash) => { g.strokeStyle = col; g.lineWidth = 1; g.setLineDash(dash || []); g.beginPath(); g.arc(cx, cy, f * R, 0, 2 * Math.PI); g.stroke(); g.setLineDash([]); };
  ring(1, "rgba(200,230,215,0.45)"); ring(o.zones.jogTo, "rgba(160,220,255,0.2)", [3, 4]); ring(o.zones.walkTo, "rgba(160,220,255,0.2)", [3, 4]); ring(o.nn, "rgba(144,133,233,0.3)", [1, 4]); ring(o.dz, "rgba(255,255,255,0.45)");
  tri(g, cx, cy - R - 6, 0, 5, C.acc);
  const draw = (p) => { g.strokeStyle = p.hi ? C.acc : "rgba(57,135,229,0.45)"; g.lineWidth = p.hi ? 2.5 : 1.5; g.beginPath(); p.pts.forEach((q, i) => { const [x, y] = P(q.x, q.y); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
    if (p.pts.length) { const [x, y] = P(p.pts[p.pts.length - 1].x, p.pts[p.pts.length - 1].y); g.fillStyle = p.hi ? C.acc : "rgba(57,135,229,0.8)"; g.beginPath(); g.arc(x, y, 3, 0, 2 * Math.PI); g.fill(); }
    if (p.anchor) { const [x, y] = P(p.anchor.x, p.anchor.y); g.strokeStyle = p.hi ? C.acc : C.s5; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 4.5, 0, 2 * Math.PI); g.stroke(); } };
  for (const p of o.paths) if (!p.hi) draw(p); for (const p of o.paths) if (p.hi) draw(p);
  g.fillStyle = C.ink; g.font = "700 11px -apple-system,Helvetica,sans-serif"; g.textAlign = "left"; if (o.title) g.fillText(o.title, 4, 13);
  g.fillStyle = C.dim; g.font = "10px -apple-system,Helvetica,sans-serif"; g.fillText("◯ = the anchor · ● = the window's end", 4, h - 5);
}

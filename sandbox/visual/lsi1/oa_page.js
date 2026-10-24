// ═══ lsi1/oa_page.js — TOUCHLINE — OWNER INPUT ANALYSIS V1: the analysis page ══════════════════════════════════════════════════════════════
// Reads the analysis JSON (tools/lsr_owner_analysis.mjs — the gestures cut by lsr_gesture.js, the canonical gates' answers by
// tools/lsr_owner_probe.mjs) and draws it. OFFLINE: nothing here records, recognizes, triggers or buffers anything; there is no live loop.
// Every angle is PLAYER-RELATIVE (against the approach line, + = the player's right); in the family views each attempt is MIRRORED so its exit
// is to the right (the toggle shows them unmirrored). Colours: the lab's validated dark order (lsr_plots.js C) — one per family, never per
// rank; PLAYED / REJECTED in the status tokens with their words beside them.
import { C, fit, niceStep, tooltip } from "./lsr_plots.js";
const $ = (id) => document.getElementById(id), esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const f = (v, n = 0) => (v == null || !Number.isFinite(+v) ? "—" : (+v).toFixed(n)), ms = (v) => (v == null || !Number.isFinite(+v) ? "—" : (v * 1000).toFixed(0));
const FAMS = [["BODY FEINT", C.s1], ["CROQUETA", C.s2], ["SHARP TURN / CUT", C.s3], ["GENTLE TURN", C.s4], ["STOP → GO", C.s5]];
const famCol = (F) => (FAMS.find((x) => x[0] === F) || [, C.dim])[1];
const MAIN_TECH = { "BODY FEINT": ["BODY_FEINT"], CROQUETA: ["CROQUETA", "BODY_FEINT"], "SHARP TURN / CUT": ["BODY_FEINT", "CROQUETA"], "GENTLE TURN": ["BODY_FEINT", "CROQUETA"] };
const UI = { fam: "BODY FEINT", mirror: true, anchor: "peak", detail: 1 }; let A = null;
// ── hover: each canvas keeps its redraw and a hit function; the tooltip is drawn over a fresh redraw ─────────────────────────────────────────
const HOV = new Map();
function hoverable(cv, draw0) { const draw = (m) => { if (cv.clientWidth < 60 || cv.clientHeight < 40) return; draw0(m); }; HOV.set(cv, draw); draw(null); if (cv._hov) return; cv._hov = true;
  cv.addEventListener("mousemove", (e) => { const b = cv.getBoundingClientRect(); HOV.get(cv)({ x: e.clientX - b.left, y: e.clientY - b.top }); });
  cv.addEventListener("mouseleave", () => HOV.get(cv)(null)); }
const tip = (g, w, h, m, lines) => { if (m && lines && lines.length) tooltip(g, m.x, Math.min(m.y, h - lines.length * 13 - 12), w, lines); };
const axisText = (g, s, x, y, al = "center", col = C.dim) => { g.fillStyle = col; g.font = "10px Menlo,monospace"; g.textAlign = al; g.fillText(s, x, y); };
// ── data ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const real = () => A.attempts.filter((o) => o.provenance.real);
const gest = () => real().filter((o) => o.f);
const sgnOf = (o) => (UI.mirror && o.f && o.f.exitSide === "L" ? -1 : 1);
const anchorT = (o, k) => (k === "onset" ? 0 : k === "peak" ? o.gesture.peak1.t : k === "side2" ? (o.gesture.tSide2 ?? o.gesture.settle) : 0);
async function load() { const q = new URLSearchParams(location.search), url = q.get("data") || "../../review_artifacts/owner_input_analysis1/data/owner_input_analysis.json";
  try { const r = await fetch(url); if (!r.ok) throw new Error(r.status + " " + url); A = await r.json(); render(); }
  catch (e) { $("status").innerHTML = `Could not load the analysis (${esc(e.message)}). Serve the worktree root (python3 -m http.server 8362 --bind 127.0.0.1) or choose an analysis JSON: <input type="file" id="fileIn" accept=".json">`;
    $("fileIn").onchange = async (ev) => { A = JSON.parse(await ev.target.files[0].text()); render(); }; } }
// ── render ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function render() { const R = real(), E = A.edges || [];
  $("status").textContent = `${A.dataset.attempts} attempts in ${A.dataset.file} · ${R.length} real owner attempts · analysis ${A.created.slice(0, 16).replace("T", " ")} UTC · gesture cuts v${A.gestureVersion}`;
  $("edgeNote").textContent = E.length ? E.map((e) => `${e.edge} screen edge at ${f(Math.abs(e.at), 2)} stick radii from the stick's centre`).join("; ") : "no screen edge found";
  renderDataset(); renderOverview(); renderOpportunity(); renderFamilyTabs(); renderFamily(); renderDetailSelect(); renderDetail(); }
function renderDataset() { const by = {}; for (const o of real()) (by[o.label] = by[o.label] || []).push(o);
  $("dsTable").innerHTML = `<tr><th>label (the owner's)</th><th>real attempts</th><th>source</th><th>start</th><th>duration s</th><th>G marks</th><th>shape found (descriptive)</th><th>pointer at the left screen edge during the gesture</th></tr>` +
    Object.entries(by).map(([L, X]) => `<tr><td><span class="sw" style="background:${famCol(X[0].family)}"></span>${esc(L)}</td><td class="num">${X.length}</td><td>${esc([...new Set(X.map((o) => o.provenance.source))].join(" / "))}</td><td>${esc([...new Set(X.map((o) => o.mode))].join(" / "))}</td>` +
      `<td class="num">${f(Math.min(...X.map((o) => o.duration)), 1)}–${f(Math.max(...X.map((o) => o.duration)), 1)}</td><td class="num">${X.filter((o) => o.mark != null).length}</td><td>${esc([...new Set(X.map((o) => (o.f ? o.f.kind : o.gesture.neutral && o.gesture.neutral.length ? "neutral gaps" : "—")))].join(" / "))}</td>` +
      `<td class="num">${X.filter((o) => o.clip && (o.clip.first.length || o.clip.exit.length)).length} / ${X.length}</td></tr>`).join("") +
    `<tr class="tot"><td>total</td><td class="num">${real().length}</td><td colspan="6">synthetic / test / automated attempts in this dataset: ${A.attempts.length - real().length}</td></tr>`; }
// ── OVERVIEW: every gesture by its first phase against the exit (the counter) and its exit ──────────────────────────────────────────────────
function renderOverview() { const G = gest();
  $("ovLegend").innerHTML = FAMS.slice(0, 4).map(([F, c]) => `<span class="lg"><span class="sw" style="background:${c}"></span>${esc(F)} (${G.filter((o) => o.family === F).length})</span>`).join("") + `<span class="lg"><span class="sw ring"></span>hollow = the measure ran into the left screen edge</span><span class="lg">filled ● exit right · ◆ exit left</span>`;
  scatter($("cvOv1"), G, (o) => o.f.counter, (o) => o.f.exit, "the first phase AGAINST the exit (counter) °", "exit angle °", [0, 150], [0, 90]);
  scatter($("cvOv2"), G, (o) => o.f.counter, (o) => (o.f.tSide2 ?? o.f.settle) * 1000, "counter °", "→ exit side / settled ms", [0, 150], [0, 400]); }
function scatter(cv, G, fx, fy, lx, ly, [x0, x1], [y0, y1]) {
  hoverable(cv, (m) => { const { g, w, h } = fit(cv), L = 52, Rm = 14, T = 12, B = 34, X = (v) => L + (v - x0) / (x1 - x0) * (w - L - Rm), Y = (v) => h - B - (v - y0) / (y1 - y0) * (h - T - B);
    g.fillStyle = C.surf; g.fillRect(0, 0, w, h); g.strokeStyle = C.grid; g.lineWidth = 1;
    for (let v = x0; v <= x1 + 1e-9; v += niceStep(x1 - x0)) { g.beginPath(); g.moveTo(X(v), T); g.lineTo(X(v), h - B); g.stroke(); axisText(g, f(v), X(v), h - B + 13); }
    for (let v = y0; v <= y1 + 1e-9; v += niceStep(y1 - y0)) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - Rm, Y(v)); g.stroke(); axisText(g, f(v), L - 5, Y(v) + 3, "right"); }
    axisText(g, lx, (L + w - Rm) / 2, h - 6); g.save(); g.translate(11, (T + h - B) / 2); g.rotate(-Math.PI / 2); axisText(g, ly, 0, 0); g.restore();
    let hit = null, best = 1e9; const placed = [];
    for (const o of G) { const vx = fx(o), vy = fy(o); if (vx == null || vy == null) continue; const x = X(Math.min(x1, vx)), y = Y(Math.min(y1, vy)), col = famCol(o.family), clipped = o.clip && (o.clip.first.length || o.clip.exit.length);
      g.lineWidth = 2; g.strokeStyle = C.surf; g.fillStyle = clipped ? C.surf : col; g.beginPath(); if (o.f.exitSide === "L") { g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); } else g.arc(x, y, 5, 0, 2 * Math.PI); g.fill(); g.stroke();
      if (clipped) { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); }
      let ly2 = y - 8; while (placed.some((p) => Math.abs(p[0] - x) < 16 && Math.abs(p[1] - ly2) < 10)) ly2 -= 10; placed.push([x, ly2]); axisText(g, "#" + o.n, x, ly2, "center", C.dim);
      if (m) { const d = Math.hypot(m.x - x, m.y - y); if (d < 12 && d < best) { best = d; hit = o; } } }
    if (hit) tip(g, w, h, m, [`#${hit.n} ${hit.label}`, `${hit.f.kind} · counter ${f(hit.f.counter)}° · exit ${f(hit.f.exit)}° ${hit.f.exitSide === "L" ? "(left)" : "(right)"}`, `exit side / settled at +${ms(hit.f.tSide2 ?? hit.f.settle)} ms · transit ${hit.f.transitVia || "—"}`, hit.clip && (hit.clip.first.length || hit.clip.exit.length) ? "the pointer was pinned at the left screen edge" : "not clipped"]); }); }
// ── PHYSICAL OPPORTUNITY: every gesture with a Body Feint probe — the canonical gates asked at the onset and at the recognition point ─────────
function renderOpportunity() { const rows = []; for (const o of gest()) for (const s of o.probes || []) if (s.variant !== "OWNER") rows.push({ o, s });
  const one = (x) => (!x ? "—" : x.stance != null ? `<span class="ok">PLAYED</span> stance +${ms(x.stance)} · touch +${ms(x.touch)}` : `<span class="bad">${esc(x.result)}</span> <span class="mut">${esc(x.why || "")}</span>`);
  const by = (tech) => rows.filter((r) => r.s.tech === tech);
  const sum = (R, k, v) => { const B = R.map((r) => r.s[k]).filter((x) => x && x.stance != null).map((x) => x[v]).sort((a, b) => a - b); return B.length ? `${ms(B[B.length >> 1])} <span class="mut">[${ms(B[0])}–${ms(B[B.length - 1])}] n ${B.length}</span>` : "—"; };
  // (the owner's deception attempts first, with their summary; the ordinary turns after — what the gates would allow there: false-positive exposure)
  const row = ({ o, s }) => `<tr><td>${o.n}</td><td>${esc(o.label)}</td><td>${s.variant === "HELD" ? "HELD (counterfactual)" : "AS PLAYED"}</td><td>${one(s.onset)}</td><td><span class="mut">+${ms(s.tRecog)}:</span> ${one(s.recog)}</td><td class="num">${s.playedFrames} / ${s.frames}</td></tr>`;
  $("oppTable").innerHTML = ["BODY_FEINT", "CROQUETA"].map((tech) => { const R = by(tech); if (!R.length) return ""; const D = R.filter((r) => /^(BODY FEINT|CROQUETA)$/.test(r.o.family)), O = R.filter((r) => !D.includes(r));
    return `<tr class="sec"><td colspan="6">${tech === "BODY_FEINT" ? "BODY FEINT (the canonical BFEINT_L / J / R)" : "LA CROQUETA (the canonical CROQ_LW, LEG-WAVE V4)"} — the owner's feint and croqueta attempts</td></tr><tr><th>#</th><th>label</th><th>variant</th><th>request at the inferred onset</th><th>request at the recognition point</th><th>request frames ≥ onset that play</th></tr>` +
      D.map(row).join("") + `<tr class="tot"><td></td><td>first stance, median [range] ms from the onset</td><td></td><td>${sum(D.filter((r) => r.s.variant === "CANONICAL"), "onset", "stance")}</td><td>as played ${sum(D.filter((r) => r.s.variant === "CANONICAL"), "recog", "stance")}<br>held ${sum(D.filter((r) => r.s.variant === "HELD"), "recog", "stance")}</td><td></td></tr>` +
      (O.length ? `<tr class="sec"><td colspan="6"><span class="mut">the owner's ORDINARY turns — what the gates would allow if a request were made there (false-positive exposure, not intent)</span></td></tr>` + O.map(row).join("") : ""); }).join(""); }
// ── FAMILY PANELS ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function renderFamilyTabs() { const G = real();
  $("famTabs").innerHTML = FAMS.map(([F, c]) => `<button data-f="${esc(F)}" class="${UI.fam === F ? "on" : ""}"><span class="sw" style="background:${c}"></span>${esc(F)} · ${G.filter((o) => o.family === F).length}</button>`).join("");
  $("famTabs").querySelectorAll("button").forEach((b) => (b.onclick = () => { UI.fam = b.dataset.f; UI.anchor = UI.fam === "BODY FEINT" || UI.fam === "CROQUETA" ? "peak" : "onset"; renderFamilyTabs(); renderFamily(); }));
  $("bMirror").classList.toggle("on", UI.mirror); $("bMirror").onclick = () => { UI.mirror = !UI.mirror; renderFamilyTabs(); renderFamily(); };
  $("anchorSel").value = UI.anchor; $("anchorSel").onchange = (e) => { UI.anchor = e.target.value; renderFamily(); }; }
function renderFamily() { const F = UI.fam, X = real().filter((o) => o.family === F), G = X.filter((o) => o.f);
  $("famHead").innerHTML = `<b>${esc(F)}</b> — ${X.length} real attempt(s): ${X.map((o) => `#${o.n} ${esc(o.label)}`).join(" · ")}`;
  const sw = $("famShapeBox"); sw.style.display = G.length ? "" : "none"; $("famNeutral").style.display = G.length ? "none" : "";
  if (!G.length) { $("famNeutral").innerHTML = neutralHtml(X); $("famRanges").innerHTML = ""; $("famState").innerHTML = ""; $("famVocab").innerHTML = ""; $("cvProbe").style.display = "none"; $("probeLegend").innerHTML = ""; return; }
  drawPaths($("cvPaths"), G); drawAligned($("cvAlign"), G, "rel"); drawAligned($("cvAlignR"), G, "r"); $("famRanges").innerHTML = rangesHtml(G); $("famState").innerHTML = stateHtml(G); $("famVocab").innerHTML = vocabHtml(G);
  const techs = MAIN_TECH[F] || []; $("cvProbe").style.display = techs.length ? "" : "none"; drawProbes($("cvProbe"), G, techs); }
function neutralHtml(X) { return X.map((o) => `<p><b>#${o.n} ${esc(o.label)}</b> — no ≥ 15° direction change after a held approach. The stick was RELEASED and pressed again: ${o.gesture.neutral.map((x) => `released ${ms(x.dur)} ms, the new direction ${f(x.change)}° from the old (radius ${f(x.rBefore, 2)} → ${f(x.rAfter, 2)})`).join("; ")}. ` +
  `The ordinary carry brakes on release (STOP) and accelerates on the new press — a direction → neutral → direction shape; nothing else in this recording separates it from ordinary play.</p>`).join(""); }
// the overlaid stick paths, player-relative (the approach up), each from 0.1 s before its onset to 0.25 s after it settled
function drawPaths(cv, G) {
  hoverable(cv, (m) => { const { g, w, h } = fit(cv), R = Math.min(w, h) / 2 - 26, cx = w / 2, cy = h / 2 + 6, P = (x, y) => [cx + x * R, cy - y * R];
    g.fillStyle = C.surf; g.fillRect(0, 0, w, h); g.strokeStyle = C.line; g.lineWidth = 1;
    for (const rr of [1, 0.72, 0.4]) { g.setLineDash(rr === 1 ? [] : [3, 4]); g.beginPath(); g.arc(cx, cy, rr * R, 0, 2 * Math.PI); g.stroke(); } g.setLineDash([]);
    g.strokeStyle = C.grid; g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    axisText(g, "approach line (the run he was making)", cx, cy - R - 8, "center", C.dim); axisText(g, UI.mirror ? "exit side →" : "right →", cx + R - 4, cy - 6, "right"); axisText(g, UI.mirror ? "← counter side" : "← left", cx - R + 4, cy - 6, "left");
    axisText(g, "walk 0.40 · jog 0.72 · rim = full", cx, cy + R + 16, "center", C.mute);
    let hit = null, best = 1e9;
    for (const o of G) { const s = sgnOf(o), t1 = (o.gesture.settle ?? 0.3) + 0.25, W = o.gesture.window.filter((q) => q.on && q.t >= -0.1 && q.t <= t1), col = famCol(o.family);
      g.strokeStyle = col; g.lineWidth = 2; g.setLineDash(UI.mirror && o.f.exitSide === "L" ? [5, 3] : []); g.beginPath(); W.forEach((q, i) => { const [x, y] = P(s * q.px, q.py); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]);
      // the first side's peak, the clipped samples, the attempt's number at the path's end
      const pk = o.gesture.window.reduce((b, q) => (q.on && Math.abs(q.t - o.gesture.peak1.t) < Math.abs(b.t - o.gesture.peak1.t) ? q : b), W[0] || { t: 0, px: 0, py: 0 });
      if (pk) { const [x, y] = P(s * pk.px, pk.py); g.fillStyle = col; g.strokeStyle = C.surf; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 4.5, 0, 2 * Math.PI); g.fill(); g.stroke(); }
      for (const tc of o.clip.times || []) { const q = W.find((z) => Math.abs(z.t - tc) < 0.009); if (!q) continue; const [x, y] = P(s * q.px, q.py); g.strokeStyle = C.ink; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x + 3, y + 3); g.moveTo(x + 3, y - 3); g.lineTo(x - 3, y + 3); g.stroke(); }
      const e = W[W.length - 1]; if (e) { const [x, y] = P(s * e.px * 1.08, e.py * 1.08); axisText(g, "#" + o.n, x, y + 3, "center", C.ink); }
      if (m) for (const q of W) { const [x, y] = P(s * q.px, q.py), d = Math.hypot(m.x - x, m.y - y); if (d < 8 && d < best) { best = d; hit = { o, q }; } } }
    if (hit) tip(g, w, h, m, [`#${hit.o.n} ${hit.o.label}`, `${hit.q.t >= 0 ? "+" : ""}${ms(hit.q.t)} ms from the onset`, `${f(hit.q.rel)}° from the approach line (unmirrored) · radius ${f(hit.q.r, 2)}`]); }); }
// the aligned series: the stick against the approach (mirrored) or its radius, every attempt aligned at the chosen anchor
function drawAligned(cv, G, field) { const t0 = -0.5, t1 = 0.7;
  hoverable(cv, (m) => { const { g, w, h } = fit(cv), L = 52, Rm = 12, T = 10, B = 22, isR = field === "r"; let lo = isR ? 0 : -60, hi = isR ? 1.05 : 90;
    if (!isR) for (const o of G) { const s = sgnOf(o), a = anchorT(o, UI.anchor); o.track.t.forEach((t, i) => { const v = o.track.rel[i]; if (v == null || t - a < t0 || t - a > t1) return; lo = Math.min(lo, s * v - 10); hi = Math.max(hi, s * v + 10); }); }
    lo = isR ? lo : Math.max(-185, Math.floor(lo / 30) * 30); hi = isR ? hi : Math.min(185, Math.ceil(hi / 30) * 30);
    const X = (t) => L + (t - t0) / (t1 - t0) * (w - L - Rm), Y = (v) => h - B - (v - lo) / (hi - lo) * (h - T - B);
    g.fillStyle = C.surf; g.fillRect(0, 0, w, h); g.strokeStyle = C.grid; g.lineWidth = 1;
    for (let t = -0.5; t <= t1 + 1e-9; t += 0.1) { g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), h - B); g.stroke(); axisText(g, (t >= 0 ? "+" : "") + Math.round(t * 1000), X(t), h - 8); }
    const st = isR ? 0.2 : niceStep(hi - lo) >= 20 ? 30 : niceStep(hi - lo); for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - Rm, Y(v)); g.stroke(); axisText(g, isR ? f(v, 1) : f(v) + "°", L - 5, Y(v) + 3, "right"); }
    if (!isR) { g.strokeStyle = C.dim; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(w - Rm, Y(0)); g.stroke(); }
    g.strokeStyle = C.acc; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(0), T); g.lineTo(X(0), h - B); g.stroke(); g.setLineDash([]);
    axisText(g, { onset: "inferred onset", peak: "first-side peak (the reversal)", side2: "exit side reached / settled" }[UI.anchor] + (isR ? " — radius" : " — angle from the approach, + = the exit side"), L + 4, T + 10, "left", C.ink);
    let hit = null, best = 1e9;
    for (const o of G) { const s = sgnOf(o), a = anchorT(o, UI.anchor), col = famCol(o.family); g.strokeStyle = col; g.lineWidth = 2; g.setLineDash(UI.mirror && o.f.exitSide === "L" ? [5, 3] : []); g.beginPath(); let pen = false, last = null;
      o.track.t.forEach((t, i) => { const v = isR ? o.track.r[i] : o.track.rel[i], tt = t - a; if (v == null || tt < t0 || tt > t1) { pen = false; return; } const x = X(tt), y = Y(isR ? v : s * v); pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; last = [x, y];
        if (m) { const d = Math.hypot(m.x - x, m.y - y); if (d < 7 && d < best) { best = d; hit = { o, tt, v: isR ? v : s * v }; } } });
      g.stroke(); g.setLineDash([]); if (last) axisText(g, "#" + o.n, Math.min(w - Rm - 2, last[0] + 2), last[1] - 4, "right", C.ink); }
    if (hit) tip(g, w, h, m, [`#${hit.o.n} ${hit.o.label}`, `${hit.tt >= 0 ? "+" : ""}${ms(hit.tt)} ms from the anchor`, isR ? `radius ${f(hit.v, 2)}` : `${f(hit.v)}° (mirrored: + = exit side)`]); }); }
function rangesHtml(G) { const cols = [["counter", "counter °", 0, 1], ["exit", "exit °", 0, 1], ["tPeak1", "→ peak ms", 0, 1000], ["dwell1", "dwell ms", 0, 1000], ["tSide2", "→ exit side ms", 0, 1000], ["transitVia", "transit", null], ["transitMs", "transit ms", 0, 1000], ["settle", "→ settled ms", 0, 1000], ["travel", "travel °", 0, 1], ["omegaPeak", "peak ω °/s", 0, 1], ["rMin", "min r", 2, 1], ["arcExtent", "arc °", 0, 1], ["arcMs", "arc ms", 0, 1000], ["exitHold", "exit held ms", 0, 1000]];
  const use = cols.filter(([k]) => G.some((o) => o.f[k] != null && o.f[k] !== 0 || k === "counter")), vals = (k, sc) => G.map((o) => (o.f[k] == null ? null : o.f[k] * sc));
  const qs = (A) => { const B = A.filter((v) => v != null).sort((a, b) => a - b); if (B.length < 4) return null; const q = (p) => B[Math.floor(p * (B.length - 1))]; const q1 = q(0.25), q3 = q(0.75); return q3 - q1 < 1e-6 ? null : [q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1)]; };   // (no spread: nothing is an outlier)
  const fences = Object.fromEntries(use.map(([k, , d, sc]) => [k, d == null ? null : qs(vals(k, sc))]));
  const head = `<tr><th>#</th><th>label</th><th>kind</th>${use.map(([, n]) => `<th>${esc(n)}</th>`).join("")}<th>edge-pinned (first / exit)</th></tr>`;
  const rows = G.map((o) => `<tr><td>${o.n}</td><td>${esc(o.label)}</td><td>${o.f.kind}</td>${use.map(([k, , d, sc]) => { if (d == null) return `<td>${esc(o.f[k] || "—")}</td>`; const v = o.f[k] == null ? null : o.f[k] * sc, F = fences[k], out = F && v != null && (v < F[0] || v > F[1]); return `<td class="num${out ? " out" : ""}">${f(v, d)}${out ? " ◆" : ""}</td>`; }).join("")}<td class="num">${o.clip.first.reduce((a, e) => a + e.n, 0)} / ${o.clip.exit.reduce((a, e) => a + e.n, 0)}</td></tr>`).join("");
  const med = (k, sc, d) => { const B = vals(k, sc).filter((v) => v != null).sort((a, b) => a - b); if (!B.length) return "—"; const md = B.length % 2 ? B[B.length >> 1] : (B[B.length / 2 - 1] + B[B.length / 2]) / 2; return `${f(md, d)}<br><span class="mut">${f(B[0], d)}–${f(B[B.length - 1], d)}</span>`; };
  return `<table class="t">${head}${rows}<tr class="tot"><td></td><td>median<br><span class="mut">min–max (n ${G.length})</span></td><td></td>${use.map(([k, , d, sc]) => (d == null ? `<td>${esc(Object.entries(G.reduce((mm, o) => ((mm[o.f[k] || "—"] = (mm[o.f[k] || "—"] || 0) + 1), mm), {})).map(([x, n]) => `${x} ${n}`).join(" · "))}</td>` : `<td class="num">${med(k, sc, d)}</td>`)).join("")}<td></td></tr></table>` +
    `<p class="mut">◆ = outside 1.5 × the interquartile range of this family (n ${G.length}: indicative only). Values mirrored so the exit is +. The counter is the first phase's peak against the exit; 0 = one-sided. ω at 60 Hz, between samples ≥ 0.5 from the centre.</p>`; }
function stateHtml(G) { return `<table class="t"><tr><th>#</th><th>speed m/s</th><th>mode</th><th>travel vs approach °</th><th>facing vs approach °</th><th>ball side · lateral m</th><th>ball ahead m</th><th>support</th><th>step phase</th><th>next touchdown ms (foot)</th><th>next ball touch ms</th><th>technical foot</th><th>last touch foot</th><th>action</th><th>committed</th></tr>` +
  G.map((o) => { const s = o.gesture.state.onset; return `<tr><td>${o.n}</td><td class="num">${f(s.speed, 1)}</td><td>${s.mode}</td><td class="num">${f(sgnOf(o) * s.travelRel, 1)}</td><td class="num">${f(sgnOf(o) * s.facingRel, 1)}</td><td>${s.ballSide} · ${f(Math.abs(s.ballLat), 2)}</td><td class="num">${f(s.ballFwd, 2)}</td><td>${s.support}</td><td class="num">${f(s.stepPhase, 2)}</td><td class="num">${ms(s.nextTD)} (${s.nextTDF || "—"})</td><td class="num">${ms(s.nextTouch)}</td><td>${s.techFoot || "—"}</td><td>${s.lastTouchFoot || "—"}</td><td>${esc(s.action)}</td><td>${s.committed ? "yes" : "no"}</td></tr>`; }).join("") + `</table>`; }
function vocabHtml(G) { return `<ul class="acts">${G.map((o) => `<li><b>#${o.n}</b> ${o.gesture.actions.map((x) => `<span class="mut">+${ms(x.t)}</span> ${esc(x.a)}`).join(" → ")}</li>`).join("")}</ul>`; }
// the canonical gates asked at each request frame (tools/lsr_owner_probe.mjs): one strip per attempt × technique × variant
function drawProbes(cv, G, techs) { const rows = []; for (const o of G) for (const tech of techs) for (const s of o.probes || []) if (s.tech === tech) rows.push({ o, s });
  const t0 = -0.2, t1 = 2.0, RH = 15; cv.style.height = Math.max(80, 30 + rows.length * RH + 26) + "px";
  $("probeLegend").innerHTML = `<span class="lg"><span class="sw" style="background:${C.ok}"></span>PLAYED if requested at that frame</span><span class="lg"><span class="sw" style="background:#33403a"></span>REJECTED (hover: the resolver's reason)</span><span class="lg"><span class="sw" style="background:${C.warn}"></span>cancelled</span><span class="lg">markers: │ onset · ◇ first-side peak · ▼ exit side reached (the earliest a contradiction is visible) · ▲ ● the move's first stance / its touch if requested at ▼</span>`;
  hoverable(cv, (m) => { const { g, w, h } = fit(cv), L = 236, Rm = 10, T = 22, X = (t) => L + (t - t0) / (t1 - t0) * (w - L - Rm);
    g.fillStyle = C.surf; g.fillRect(0, 0, w, h); g.strokeStyle = C.grid; g.lineWidth = 1;
    for (let t = -0.2; t <= t1 + 1e-9; t += 0.2) { g.beginPath(); g.moveTo(X(t), T - 4); g.lineTo(X(t), h - 18); g.stroke(); axisText(g, (t >= 0 ? "+" : "") + Math.round(t * 1000), X(t), h - 5); }
    axisText(g, "request frame / event time — ms from the inferred onset", L, 12, "left", C.ink);
    let hit = null;
    rows.forEach(({ o, s }, i) => { const y = T + i * RH, step = 4 / 240, gst = o.gesture;
      axisText(g, `#${o.n} ${s.tech === "BODY_FEINT" ? "BODY FEINT" : "CROQUETA"} · ${s.variant}`, L - 6, y + 10, "right", s.variant === "CANONICAL" ? C.ink : C.dim);
      for (const r of s.rows) { const x = X(r.tq), x2 = X(r.tq + step); g.fillStyle = r.result === "PLAYED" ? C.ok : r.result === "CANCELLED" ? C.warn : "#33403a"; g.fillRect(x, y + 2, Math.max(1, x2 - x - 0.5), RH - 5);
        if (m && m.x >= x && m.x < x2 && m.y >= y && m.y < y + RH) hit = { o, s, r }; }
      const mk = (t, glyph) => { if (t == null) return; const x = X(t); g.fillStyle = C.ink; g.font = "10px Menlo,monospace"; g.textAlign = "center"; g.fillText(glyph, x, y + 11); };
      g.strokeStyle = C.acc; g.beginPath(); g.moveTo(X(0), y + 1); g.lineTo(X(0), y + RH - 2); g.stroke(); mk(gst.peak1.t, "◇"); mk(gst.tSide2 ?? gst.settle, "▼");
      if (s.recog && s.recog.stance != null) { mk(s.recog.stance, "▲"); mk(s.recog.touch, "●"); } });
    if (hit) { const r = hit.r; tip(g, w, h, m, [`#${hit.o.n} ${hit.s.tech} · ${hit.s.variant}`, `request at ${r.tq >= 0 ? "+" : ""}${ms(r.tq)} ms from the onset`, r.result === "PLAYED" ? `PLAYED ${r.played} — first stance +${ms(r.tq + r.start)} · touch +${ms(r.tq + r.contact)} (from the onset)` : `${r.result}: ${r.why || "—"}`]); } }); }
// ── ONE ATTEMPT: the offline overlays ─────────────────────────────────────────────────────────────────────────────────────────────────────
function renderDetailSelect() { const sel = $("detSel"); sel.innerHTML = real().map((o) => `<option value="${o.n}" ${o.n === UI.detail ? "selected" : ""}>#${o.n} ${esc(o.label)}</option>`).join(""); sel.onchange = (e) => { UI.detail = +e.target.value; renderDetail(); }; }
function renderDetail() { const o = real().find((x) => x.n === UI.detail) || real()[0], g = o.gesture;
  if (!o.f) { $("detInfo").innerHTML = neutralHtml([o]); $("cvDetail").style.display = "none"; $("detProbes").innerHTML = ""; return; } $("cvDetail").style.display = "";
  $("detInfo").innerHTML = `<b>#${o.n} ${esc(o.label)}</b> · ${o.f.kind} · approach heading ${f(g.H0)}° world (screen-up = toward the coaches) held from ${f(g.approachHeldFrom, 2)} s · <b>inferred onset ${f(g.onset, 3)} s</b> (no G mark) · ` +
    `first side ${g.side1} peak ${f(g.peak1.rel)}° at +${ms(g.peak1.t)} ms · ${g.tSide2 != null ? `exit side ${g.side2} at +${ms(g.tSide2)} ms via ${g.transit.via} · ` : ""}settled +${ms(g.settle)} ms at ${f(g.exit && g.exit.rel)}° · held ${ms(g.exitHold)} ms${g.exitReleased ? " then released" : ""}`;
  const P = o.probes || [], T0 = -0.5, T1 = 2.0, cv = $("cvDetail");
  hoverable(cv, (m) => { const { g: c, w, h } = fit(cv), L = 84, Rm = 12, T = 18, X = (t) => L + (t - T0) / (T1 - T0) * (w - L - Rm), H1 = h * 0.44, rTop = T + H1 + 16, rH = 30, evTop = rTop + rH + 12, opTop = evTop + 62;
    let lo = -30, hi = 30; o.track.rel.forEach((v) => { if (v != null) { lo = Math.min(lo, v - 10); hi = Math.max(hi, v + 10); } }); lo = Math.max(-185, Math.floor(lo / 30) * 30); hi = Math.min(185, Math.ceil(hi / 30) * 30);
    const Y = (v) => T + H1 - (v - lo) / (hi - lo) * H1, YR = (r) => rTop + rH - r * rH;
    c.fillStyle = C.surf; c.fillRect(0, 0, w, h);
    // the gesture interval, the axis, the grid
    c.fillStyle = "rgba(255,212,94,0.08)"; c.fillRect(X(0), T, X(g.settle) - X(0), opTop + 40 - T);
    c.strokeStyle = C.grid; c.lineWidth = 1; for (let t = -0.5; t <= T1 + 1e-9; t += 0.25) { c.beginPath(); c.moveTo(X(t), T); c.lineTo(X(t), opTop + 40); c.stroke(); axisText(c, (t >= 0 ? "+" : "") + Math.round(t * 1000), X(t), h - 4); }
    for (let v = Math.ceil(lo / 30) * 30; v <= hi + 1e-9; v += 30) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - Rm, Y(v)); c.stroke(); axisText(c, f(v) + "°", L - 5, Y(v) + 3, "right"); }
    c.strokeStyle = C.dim; c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(w - Rm, Y(0)); c.stroke();
    axisText(c, "stick vs the approach line (+ = the player's right) · the shaded band = the inferred gesture (onset → settled)", L + 4, T - 6, "left", C.ink);
    // the stick (edge-pinned samples marked ×) and its radius
    c.strokeStyle = famCol(o.family); c.lineWidth = 2; c.beginPath(); let pen = false; o.track.t.forEach((t, i) => { const v = o.track.rel[i]; if (v == null) { pen = false; return; } pen ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v)); pen = true; }); c.stroke();
    for (const tc of o.clip.times || []) { const i = o.track.t.findIndex((t) => Math.abs(t - tc) < 0.009); if (i < 0 || o.track.rel[i] == null) continue; const x = X(o.track.t[i]), y = Y(o.track.rel[i]); c.strokeStyle = C.ink; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 3, y - 3); c.lineTo(x + 3, y + 3); c.moveTo(x + 3, y - 3); c.lineTo(x - 3, y + 3); c.stroke(); }
    c.strokeStyle = C.dim; c.lineWidth = 1.5; c.beginPath(); o.track.t.forEach((t, i) => (i ? c.lineTo(X(t), YR(o.track.r[i])) : c.moveTo(X(t), YR(o.track.r[i])))); c.stroke(); axisText(c, "radius", L - 5, rTop + rH / 2 + 3, "right");
    // the candidate moments (offline analysis overlays — nothing here ran live)
    const mom = [[0, C.acc, "candidate gesture start (inferred onset)"], [g.peak1.t, C.s2, g.tSide2 != null ? "candidate reversal (first-side peak)" : "peak"], [g.tSide2, C.s6, "candidate recognition point (exit side ≥ 10°)"], [g.settle, C.dim, "settled"]];
    mom.forEach(([t, col, lab], k) => { if (t == null) return; c.strokeStyle = col; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X(t), T); c.lineTo(X(t), opTop + 40); c.stroke(); c.setLineDash([]); axisText(c, lab, X(t) + 3, T + 10 + k * 11, "left", col); });
    axisText(c, "G: none recorded", w - Rm - 2, T + 10, "right", C.mute);
    // the stride and the ball (the canonical sim's own record), the plan's actions
    axisText(c, "feet", L - 5, evTop + 10, "right"); axisText(c, "ball", L - 5, evTop + 26, "right"); axisText(c, "action", L - 5, evTop + 44, "right");
    const actRow = [-1e9, -1e9]; c.strokeStyle = C.line; c.beginPath(); c.moveTo(L, rTop + rH + 0.5); c.lineTo(w - Rm, rTop + rH + 0.5); c.stroke();
    for (const e of o.timeline) { const x = X(e.t); if (e.t < T0 || e.t > T1) continue;
      if (e.kind === "touchdown") { c.fillStyle = e.F === "L" ? C.s1 : C.s3; c.fillRect(x - 1, evTop + (e.F === "L" ? 2 : 9), 2, 7); }
      else if (e.kind === "contact") { c.fillStyle = e.decisive ? C.acc : C.ink; c.beginPath(); c.arc(x, evTop + 24, e.decisive ? 4 : 2.5, 0, 2 * Math.PI); c.fill(); }
      else if (e.kind === "action" || e.kind === "select") { c.strokeStyle = C.dim; c.beginPath(); c.moveTo(x, evTop + 34); c.lineTo(x, evTop + 52); c.stroke();
        // (labels only where there is room — two rows, the rest by hover)
        const row = actRow.findIndex((xr) => x - xr > 118); if (row >= 0) { axisText(c, (e.label || "").slice(0, 20), x + 2, evTop + 44 + row * 11, "left", C.dim); actRow[row] = x; } } }
    axisText(c, "touchdowns: L upper · R lower", w - Rm - 2, evTop + 10, "right", C.mute);
    // the next physical opportunity: the canonical gates' answer if the request had been made at the recognition point (CANONICAL — the owner's
    // input as recorded; HELD — steering withheld from the onset), and the earliest first stance any request at or after the onset reaches
    const lanes = P.filter((s) => s.variant !== "OWNER"); axisText(c, "opportunity", L - 5, opTop + 10, "right");
    lanes.forEach((s, k) => { const y = opTop + 4 + k * 11, lab = `${s.tech === "BODY_FEINT" ? "BF" : "CROQ"} ${s.variant === "HELD" ? "held" : "as played"}`; axisText(c, lab, L + 2, y + 8, "left", C.mute);
      if (s.recog && s.recog.stance != null) { const xa = X(s.tRecog), xs = X(s.recog.stance), xt = X(s.recog.touch); c.strokeStyle = C.ok; c.lineWidth = 1.5; c.beginPath(); c.moveTo(xa, y + 5); c.lineTo(xt, y + 5); c.stroke(); c.fillStyle = C.ok; c.font = "10px Menlo,monospace"; c.textAlign = "center"; c.fillText("▲", xs, y + 9); c.fillText("●", xt, y + 9); }
      else if (s.recog) axisText(c, `request at the recognition point: ${s.recog.result} — ${s.recog.why || ""}`.slice(0, 90), X(s.tRecog ?? 0) + 4, y + 8, "left", C.bad); });
    if (m && m.x >= L && m.x <= w - Rm) { const t = T0 + (m.x - L) / (w - L - Rm) * (T1 - T0); let i = 0; while (i < o.track.t.length - 1 && o.track.t[i + 1] <= t) i++;
      c.strokeStyle = "rgba(230,239,233,0.35)"; c.beginPath(); c.moveTo(m.x, T); c.lineTo(m.x, opTop + 40); c.stroke();
      const near = o.timeline.filter((e) => Math.abs(e.t - t) < 0.03).map((e) => e.kind === "touchdown" ? `touchdown ${e.F}` : e.kind === "contact" ? `contact ${e.F} ${e.surface || ""} ${e.decisive ? "(decisive)" : ""}` : e.label || e.kind);
      tip(c, w, h, m, [`${t >= 0 ? "+" : ""}${ms(t)} ms from the onset`, o.track.rel[i] == null ? "stick released / in the deadzone" : `stick ${f(o.track.rel[i])}° · radius ${f(o.track.r[i], 2)}`].concat(near.slice(0, 3))); } });
  $("detProbes").innerHTML = P.length ? `<table class="t"><tr><th>technique</th><th>variant</th><th>request at the onset</th><th>request at the recognition point (+${ms(P[0].tRecog)} ms)</th><th>earliest first stance from any request ≥ onset</th><th>request frames that play</th></tr>` + P.map((s) => {
    const one = (x) => (!x ? "—" : x.stance != null ? `<span class="ok">PLAYED</span> ${esc(x.played || "")} · stance +${ms(x.stance)} · touch +${ms(x.touch)}` : `<span class="bad">${esc(x.result)}</span> — ${esc(x.why || "")}`);
    return `<tr><td>${s.tech === "BODY_FEINT" ? "BODY FEINT" : "CROQUETA"}</td><td>${s.variant}</td><td>${one(s.onset)}</td><td>${one(s.recog)}</td><td>${s.earliest && s.earliest.stance != null ? `request +${ms(s.earliest.tq)} → stance +${ms(s.earliest.stance)} · touch +${ms(s.earliest.touch)}` : "never"}</td><td class="num">${s.playedFrames} / ${s.frames}</td></tr>`; }).join("") + `</table><p class="mut">All times from the inferred onset. CANONICAL: the owner's input as recorded, then the sandbox's explicit request (its validated exit angle). OWNER: his own stick after the request. HELD: counterfactual — the movement input held on the approach line from the onset (the first phase not steered). The gates are the canonical vocab2 resolver's, untouched.</p>` : `<p class="mut">No probes for this attempt.</p>`; }
window.addEventListener("resize", () => { for (const [cv, d] of HOV) d(null); });
load();

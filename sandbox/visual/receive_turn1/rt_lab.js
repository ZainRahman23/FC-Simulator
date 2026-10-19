// ═══ receive_turn1/rt_lab.js — RECEIVE-TURN-1: the RECEIVE-AND-TURN LAB ════════════════════════════════════════════════════════════════════════════
// One stationary receive-and-turn at a time, every input on a control: the desired turn angle (− left, + right), the pass's arrival speed, the
// ball's lateral line, Ball Control, the execution draw (typical / perfect / keyed seed), the family / foot / contact variant (AUTO or forced), the
// preparation time (clean = he read the pass early) and the preferred foot. Views: 3D (the real character on the placeholder body, the ball, the
// ideal ball as a green ghost, the vectors) and the TOP view (initial facing, incoming ball, desired exit, planned rotation, ideal vs actual
// first-touch vector, ideal vs actual ball path, the reconnection point, the meeting, the receiver's path), plus the BC ladder (the same draws at
// BC 30 … 99: each rating's meeting point). The page runs the same chain as the Node evidence (rt_sim.js).
// URL: ?theta=135&v=12&lat=0&bc=70&draw=TYPICAL|seed3&family=AUTO&foot=AUTO&variant=AUTO&prep=clean&pref=R&cam=high&t=…&rate=0.5&paused=1&external=1&compare=1
import { prepareTurn, runTurn, FAMILIES, FAMILY_ORDER, TEX_EXAMPLES, DEG } from "./rt_sim.js";
import { DT } from "./rk_sim.js";
import { relErr, gBC } from "./rk_model.js";
import { TurnBody } from "./rt_body.js";
import { turnTop, turnData, turnExtents, TCOL } from "./rt_draw.js";
import { groundProg, ballProg, camLocal, proj3 } from "./rt_gl.js";
import { toW } from "./rk_sim.js";
const W = window, M4G = typeof M4 !== "undefined" ? M4 : W.M4, Q = new URLSearchParams(location.search), $ = (s) => document.querySelector(s), fmt = (x, n = 2) => (x == null || !isFinite(x) ? "–" : x.toFixed(n));
const L = { cond: { theta: +(Q.get("theta") || 135), v: +(Q.get("v") || 12), lat: +(Q.get("lat") || 0), family: Q.get("family") || "AUTO", foot: Q.get("foot") || "AUTO", variant: Q.get("variant") || "AUTO", prep: Q.get("prep") || "clean", pref: Q.get("pref") || "R" },
  bc: +(Q.get("bc") || 70), draw: Q.get("draw") || "TYPICAL", t: 0, rate: +(Q.get("rate") || 0.5), playing: Q.get("paused") !== "1", cam: Q.get("cam") || "auto", ladder: Q.get("ladder") !== "0", ready: false };
const LADDER = [30, 50, 60, 70, 80, 90, 99], ladderCol = (bc) => { const t = (bc - 30) / 69; return `hsl(${(t * 130).toFixed(0)}, 80%, ${(55 + 10 * t).toFixed(0)}%)`; };
function condFor(c) { return { theta: c.theta, v: c.v, lat: c.lat, family: c.family === "AUTO" ? undefined : c.family, foot: c.foot === "AUTO" ? undefined : c.foot, variant: c.variant === "AUTO" ? undefined : c.variant, prep: c.prep === "clean" ? undefined : +c.prep, pref: c.pref === "both" ? null : c.pref }; }
const drawSpec = () => (L.draw.startsWith("seed") ? { seed: +L.draw.slice(4) } : { example: L.draw });
// cameras (local). "auto": elevated, looking across the EXIT line (heading θ − 90° · σ) at the action's centre — the ball arrives from one side, the
// receiver turns and leaves across the picture; a left turn's camera is the mirror image of the right turn's
function cam(w, h) {
  const th = L.cond.theta * DEG, sg = L.cond.theta < 0 ? -1 : 1, ch = th - sg * Math.PI / 2, u = [Math.cos(th), Math.sin(th)], ctr = [u[0] * 0.45 + 0.2, u[1] * 0.45], d = 4.4;
  const C = { auto: [[ctr[0] + Math.cos(ch) * d, ctr[1] + Math.sin(ch) * d, 2.6], [ctr[0], ctr[1], 0.6], 36], overhead: [[ctr[0] + 0.2, ctr[1] + 0.01, 10.5], [ctr[0], ctr[1], 0], 38],
    side: [[-0.2, 6.4 * sg, 1.5], [-0.2, 0, 0.8], 34], passer: [[6.2, 1.2 * sg, 2.3], [-0.2, 0, 0.6], 34], behind: [[-5.6, -1.4 * sg, 2.4], [0.4, 0, 0.6], 34] }[L.cam] || null;
  const c = C || [[ctr[0] + Math.cos(ch) * d, ctr[1] + Math.sin(ch) * d, 2.6], [ctr[0], ctr[1], 0.6], 36]; return camLocal(c[0], c[1], c[2], w, h); }
function compute() {
  const t0 = performance.now(), P = prepareTurn(condFor(L.cond)); L.P = P;
  if (P.A.none) { L.ep = null; L.body = null; L.lad = []; L.dur = 2; L.t0 = 0; L.tc = 1; L.simMs = performance.now() - t0; return; }
  const spec = drawSpec(); L.ep = runTurn(P, L.bc, spec, { every: 1 }); L.IE = runTurn(P, 99, { example: "PERFECT" }, { every: 2 });
  L.lad = L.ladder ? LADDER.map((bc) => ({ bc, ep: runTurn(P, bc, spec, { every: 6, carry: false }) })) : [];
  L.body = W.RUN1_V13 && L.skel ? new TurnBody(W.RUN1_V13, M4G, L.skel, P, L.ep) : null; L.tc = P.kc * DT; L.t0 = Math.max(0, L.tc - 1.0); L.dur = L.tc + 2.6;
  if (L.t < L.t0 || L.t > L.dur) L.t = L.t0; L.simMs = performance.now() - t0;
  // the fingerprint (Chrome = Node): the plan, the executed launch, the continuation, the ball at the end
  let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  mix(P.kc); for (const x of L.ep.ex.v) mix(x); mix(L.ep.m.tCont == null ? -1 : L.ep.m.tCont); for (const x of L.ep.rec[L.ep.rec.length - 1].p) mix(x); L.hash = h.toString(16);
}
function ballAt(t) { const P = L.P, k = Math.round(t / DT); if (!L.ep || k <= P.kc) { const s = P.inc.pred.P[Math.min(P.inc.pred.P.length - 1, Math.max(0, k))]; return { a: s.p, i: s.p }; } const i = k - P.kc, r = L.ep.rec, ri = L.IE.rec, pick = (rec, j) => rec[Math.min(rec.length - 1, Math.max(0, Math.round(j / (rec[1].i - rec[0].i))))].p; return { a: pick(r, i), i: pick(ri, i) }; }
function render() {
  if (!L.ready) return; const P = L.P, gl = L.gl, cv = L.cv, dpr = L.dpr || W.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); L.ov.width = cv.width; L.ov.height = cv.height; }
  const ctx = L.ov.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, L.ov.width, L.ov.height); ctx.scale(dpr, dpr);
  gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const C = cam(w, h), none = P.A.none, bs = none ? null : ballAt(L.t), pose = L.body && bs ? L.body.poseAt(L.t, bs.a) : null;
  const sh = new Float32Array(32); let ns = 0; const push = (p, s, wt) => { if (ns < 8) { sh.set([toW(p)[0], -toW(p)[2], s, wt], ns * 4); ns++; } };
  if (bs) push([bs.a[0], bs.a[1], 0], 0.12 + Math.max(0, bs.a[2] - 0.11) * 0.4, 0.6 * Math.exp(-Math.max(0, bs.a[2] - 0.11) * 4)); if (pose) push([pose.S[0], pose.S[1], 0], 0.42, 0.4);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
  const G = L.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, C.view); gl.uniformMatrix4fv(G.u.proj, false, C.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  if (pose && L.ent) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); W.ofCharDraw(L.R, L.ent, pose.skin, C.view, C.proj); gl.disable(gl.CULL_FACE); }
  const B = L.ball, drawBall = (p, tint) => { gl.useProgram(B.p); gl.uniformMatrix4fv(B.u.view, false, C.view); gl.uniformMatrix4fv(B.u.proj, false, C.proj); gl.uniform3fv(B.u.c, toW(p)); gl.uniform4fv(B.u.q, [0, 0, 0, 1]); gl.uniform1f(B.u.r, 0.11); gl.uniform3fv(B.u.tint, tint); gl.bindVertexArray(B.vao); gl.drawElements(gl.TRIANGLES, B.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null); };
  if (bs) { if (L.t > L.tc + 1e-6) drawBall(bs.i, [0.45, 1.0, 0.6]); drawBall(bs.a, [1, 1, 1]); }
  if (!none) {
    const D = turnData(P, L.ep, { body: L.body }), pr = (p) => proj3(C, w, h, toW([p[0], p[1], p[2] != null ? p[2] : 0.01])), z = 0.012;
    const line = (pts, col, wd, dash) => { if (!pts) return; ctx.beginPath(); let s = false; for (const p of pts) { const q = pr([p[0], p[1], p[2] != null ? p[2] : z]); if (!q) continue; if (!s) { ctx.moveTo(q[0], q[1]); s = true; } else ctx.lineTo(q[0], q[1]); } ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); };
    const arrow3 = (a, v, col, wd, lbl) => { const b = [a[0] + v[0], a[1] + v[1], z], A = pr([a[0], a[1], z]), Bq = pr(b); if (!A || !Bq) return; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Bq[0], Bq[1]); ctx.stroke(); const an = Math.atan2(Bq[1] - A[1], Bq[0] - A[0]); ctx.beginPath(); ctx.moveTo(Bq[0], Bq[1]); ctx.lineTo(Bq[0] - 10 * Math.cos(an - 0.4), Bq[1] - 10 * Math.sin(an - 0.4)); ctx.lineTo(Bq[0] - 10 * Math.cos(an + 0.4), Bq[1] - 10 * Math.sin(an + 0.4)); ctx.closePath(); ctx.fill(); if (lbl) { ctx.font = "11px Menlo, monospace"; ctx.fillText(lbl, Bq[0] + 5, Bq[1] - 5); } };
    line(D.inc, TCOL.incoming, 1.5, [4, 4]); arrow3([0, 0], [0.9, 0], TCOL.facing, 2, "initial facing");
    line([D.exit.from, [D.exit.from[0] + D.exit.u[0] * 4, D.exit.from[1] + D.exit.u[1] * 4]], TCOL.exit, 2.4, [9, 5]); { const q = pr([D.exit.from[0] + D.exit.u[0] * 3.2, D.exit.from[1] + D.exit.u[1] * 3.2, z]); if (q) { ctx.fillStyle = TCOL.exit; ctx.font = "12px Menlo, monospace"; ctx.fillText(`exit ${L.cond.theta}°`, q[0] + 6, q[1] - 6); } }
    { const pts = []; for (let i = 0; i <= 24; i++) { const a = D.rot.a0 + (D.rot.a1 - D.rot.a0) * i / 24; pts.push([D.rot.c[0] + Math.cos(a) * 0.6, D.rot.c[1] + Math.sin(a) * 0.6]); } line(pts, TCOL.rot, 1.8, [3, 3]); }
    if (L.t > L.tc - 0.4) { line(D.ideal, TCOL.ideal, 1.8, [6, 4]); }
    if (L.t > L.tc) { line(D.actual && D.actual.filter((p, j) => j * 1 <= (L.t - L.tc) / DT), TCOL.actual, 2.2); arrow3(D.C, [D.vIdeal[0] * 0.35, D.vIdeal[1] * 0.35], TCOL.vIdeal, 3, "ideal touch"); arrow3(D.C, [D.vActual[0] * 0.35, D.vActual[1] * 0.35], TCOL.vActual, 3, "actual touch"); }
    const rq = pr([D.Prec[0], D.Prec[1], z]); if (rq) { ctx.strokeStyle = TCOL.ideal; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(rq[0], rq[1], 8, 0, 2 * Math.PI); ctx.stroke(); }
    if (D.meet && L.t > L.tc + L.ep.meet.t - 0.05) { const q = pr([D.meet[0], D.meet[1], z]); if (q) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0], q[1] - 8); ctx.lineTo(q[0] + 8, q[1]); ctx.lineTo(q[0], q[1] + 8); ctx.lineTo(q[0] - 8, q[1]); ctx.closePath(); ctx.stroke(); } }
    if (D.ctrl) { const q = pr([D.ctrl[0], D.ctrl[1], z]); if (q) { ctx.strokeStyle = TCOL.ctrl; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], 8, 0, 2 * Math.PI); ctx.stroke(); } }
    const cq = pr([D.C[0], D.C[1], 0.11]); if (cq && L.t < L.tc + 0.6) { ctx.beginPath(); ctx.arc(cq[0], cq[1], 7, 0, 2 * Math.PI); ctx.strokeStyle = TCOL.surf.FOOT; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = TCOL.surf.FOOT; ctx.font = "11px Menlo, monospace"; ctx.fillText(`CONTACT · ${P.A.F} ${P.A.surface.toLowerCase()}`, cq[0] + 10, cq[1] - 8); }
    if (L.lad && L.ladder) for (const rn of L.lad) { const m = rn.ep.m, p = m.meet ? m.meet.ball : rn.ep.follow ? rn.ep.follow.contact : null; if (!p) continue; const q = pr([p[0], p[1], z]); if (q) { ctx.fillStyle = ladderCol(rn.bc); ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, 2 * Math.PI); ctx.fill(); ctx.font = "10px Menlo, monospace"; ctx.fillText(rn.bc, q[0] + 4, q[1] - 3); } }
    const m = L.ep.m, fam = FAMILIES[P.A.fid].label;
    if (document.body.classList.contains("compare")) { const lbl = `${L.cond.theta > 0 ? "+" : ""}${L.cond.theta}° · BC ${L.bc}${L.draw.startsWith("seed") ? " · seed " + L.draw.slice(4) : ""}`, sub = `${m.cls} · ${P.A.fid.replace("_", " ").toLowerCase()} · ${P.A.F} ${P.A.surface.toLowerCase()} · step ${m.extraAdj == null ? "—" : fmt(m.extraAdj) + " m"} · go ${m.tCont == null ? "—" : fmt(m.tCont) + " s"}`;
      ctx.fillStyle = "rgba(10,14,12,0.72)"; ctx.fillRect(0, 0, w, 58); ctx.fillStyle = "#ffffff"; ctx.font = "bold 24px -apple-system, Helvetica, sans-serif"; ctx.fillText(lbl, 12, 30); ctx.fillStyle = TCOL.cls[m.cls]; ctx.font = "bold 14px -apple-system, Helvetica, sans-serif"; ctx.fillText(sub, 12, 50);
      ctx.fillStyle = "#e6efe9"; ctx.font = "13px Menlo, monospace"; ctx.fillText(`t ${L.t - L.tc >= 0 ? "+" : ""}${fmt(L.t - L.tc, 2)} s`, w - 110, 30); }
    else { ctx.fillStyle = "#e6efe9"; ctx.font = "12px Menlo, monospace"; ctx.fillText(`t ${fmt(L.t - L.tc, 2)} s from the contact · ${L.cond.theta}° · ${fam} · ${P.A.F} ${P.A.surface.toLowerCase()} · BC ${L.bc} · ${m.cls}`, 10, 18); }
  }
  // TOP view
  const c = $("#top"), cw = c.clientWidth, chh = c.clientHeight; if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(chh * dpr); }
  const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, cw, chh);
  if (none) { x.fillStyle = TCOL.dim; x.font = "12px Menlo, monospace"; x.fillText("no feasible receive-turn action for this ball and these constraints: " + JSON.stringify(P.A.rej), 12, 20); return; }
  const D = turnData(P, L.ep, { body: L.body }); D.J = pose ? pose.J : null; D.ball = bs ? bs.a : null; D.ballIdeal = bs && L.t > L.tc ? bs.i : null;
  if (L.lad && L.ladder) D.ghosts = L.lad.map((rn) => ({ path: rn.ep.rec.filter((r) => r.i <= 2.2 * 240).map((r) => r.p), col: ladderCol(rn.bc), end: rn.ep.m.meet ? rn.ep.m.meet.ball : null }));
  const ext = L.extCache || (L.extCache = turnExtents(D)); turnTop(x, { x: 0, y: 0, w: cw, h: chh }, ext, D, { font: 11, title: "TOP — the passer is up", sub: `${FAMILIES[P.A.fid].label} · ${P.A.F} ${P.A.surface.toLowerCase()}${P.A.fid === "THROUGH_TURN" ? " (" + P.A.vid + " the standing leg)" : ""}` });
}
function hud() {
  const P = L.P, el = $("#hud"); if (!P) return; if (P.A.none) { el.innerHTML = `<b>No feasible receive-turn action</b>: <pre>${JSON.stringify(P.A.rej, null, 1)}</pre>`; return; }
  const A = P.A, ex = L.ep.ex, m = L.ep.m, I = L.IE.m, v = (a) => `(${a.map((q) => fmt(q)).join(", ")})`;
  const cands = A.cands.map((c) => `<tr${c.fid === A.fid ? ' style="color:#ffd45e"' : ""}><td>${c.fid}</td><td>${c.F} ${c.surface.toLowerCase()}${c.vid !== "front" && c.vid !== "back" && c.vid !== "side" ? " · " + c.vid : ""}</td><td>J ${fmt(c.J)}</td><td>D ${fmt(c.D)}</td><td>open ${c.psiC}°</td><td>contact ${fmt(c.t)} s</td><td>meet +${fmt(c.tRec)} s</td><td>touch ${fmt(c.s0)} m/s</td></tr>`).join("");
  el.innerHTML = `<div class="cols"><div><h3>The action (Ball Control never enters)</h3><b>${FAMILIES[A.fid].label}</b> · contact foot <b>${A.F}</b> · surface <b>${A.surface.toLowerCase()}</b>${A.fid === "THROUGH_TURN" ? " · " + A.vid + " the standing leg" : ""}<br>
    body open at the contact ${fmt(A.psiC / DEG, 0)}° · rotation after it ${fmt(A.dPsi / DEG, 0)}° (${fmt(A.path.Trot)} s) · stance shift ${fmt(Math.hypot(A.S[0], A.S[1]))} m · CONTACT ${fmt(P.kc * DT, 3)} s<br>
    D ${fmt(A.D, 3)} (the ball's ${fmt(A.Dk, 3)} × family ${fmt(FAMILIES[A.fid].m)} × (1 + rotation ${fmt(0.55 * A.rotIn, 3)} + glance ${fmt(0.008 * A.glance, 3)} + surface + pace)) · selection ${fmt(P.cpu.select, 1)} ms, ${A.nEval} evaluated, ${A.nFeasible} feasible
    <h3>Ideal first touch</h3>${v(A.vIdeal.slice(0, 2))} m/s (${fmt(A.s0)}) toward the reconnection point ${v(A.Prec)} at +${fmt(A.tRec)} s · the exit line from ${v(A.path.endRoot)} at ${L.cond.theta}° · the touch vector is ${fmt(Math.abs(((Math.atan2(A.dHat[1], A.dHat[0]) - A.theta) / DEG + 540) % 360 - 180), 0)}° off the exit vector
    <h3>Feasible action set (best per family)</h3><table class="lad">${cands}</table></div>
   <div><h3>Ball Control ${L.bc} (curve B: executes like current BC ${fmt(gBC(L.bc), 1)})</h3>E ${fmt(ex.E, 4)} · σ damping ${fmt(ex.sigma.damping)} · weight ${fmt(ex.sigma.weight)} · direction ${fmt(ex.sigma.direction)} · vertical ${fmt(ex.sigma.vertical)} m/s<br>
    draws (bounded) damping ${fmt(L.ep.N.damping)} · weight ${fmt(L.ep.N.weight)} · direction ${fmt(L.ep.N.direction)} · vertical ${fmt(L.ep.N.vertical)} <span class="dim">${L.ep.N.source}</span><br>
    actual touch ${v(ex.v)} m/s · speed error ${fmt(m.touchSpeedErr)} m/s · direction error ${fmt(m.dirErrDeg, 1)}° (+ = toward the turn side) · lift ${fmt(m.lift)} m/s${m.capped ? " · capped " + m.capped : ""}
    <h3>CONTINUATION</h3><b style="color:${TCOL.cls[m.cls]}">${m.cls}</b> · touches ${m.contacts} · continuing at ${m.tCont == null ? "—" : "+" + fmt(m.tCont) + " s"} (ideal +${fmt(I.tCont)}) · correction ${m.extraAdj == null ? "—" : fmt(m.extraAdj) + " m"} · later ${m.extraT == null ? "—" : fmt(m.extraT) + " s"} · ball ${m.offLine == null ? "—" : fmt(Math.abs(m.offLine)) + " m off the exit line"} · placement error at the planned meeting ${fmt(m.place)} m${m.notes.length ? "<br><span class='dim'>" + m.notes.join("; ") + "</span>" : ""}</div>
   <div><h3>BC ladder (the same draws)</h3>${L.lad.length ? `<table class="lad"><tr><td></td>${L.lad.map((r) => `<td style="color:${ladderCol(r.bc)}">${r.bc}</td>`).join("")}</tr><tr><td class="dim">class</td>${L.lad.map((r) => `<td style="color:${TCOL.cls[r.ep.m.cls]}">${r.ep.m.cls.slice(0, 3)}</td>`).join("")}</tr><tr><td class="dim">correction m</td>${L.lad.map((r) => `<td>${r.ep.m.extraAdj == null ? "—" : fmt(r.ep.m.extraAdj)}</td>`).join("")}</tr><tr><td class="dim">go s</td>${L.lad.map((r) => `<td>${r.ep.m.tCont == null ? "—" : fmt(r.ep.m.tCont)}</td>`).join("")}</tr><tr><td class="dim">touches</td>${L.lad.map((r) => `<td>${r.ep.m.contacts}</td>`).join("")}</tr></table>` : "off"}
   <span class="dim">computed in ${fmt(L.simMs, 0)} ms · fingerprint ${L.hash}</span></div></div>`;
}
const SL = [["theta", "turn °", -180, 180, 5], ["v", "pass m/s", 2, 24, 0.5], ["lat", "ball line m", -0.6, 0.6, 0.05], ["bc", "Ball Control", 1, 99, 1]];
function controls() {
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map((o) => `<option value="${o[0]}" ${String(o[0]) === String(cur) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`;
  $("#ctl").innerHTML = `<b class="t">Receive-turn lab · RECEIVE-TURN-1</b>` + SL.map(([k, l, a, b, s]) => `<label class="sl">${l} <input type="range" id="s_${k}" min="${a}" max="${b}" step="${s}" value="${k === "bc" ? L.bc : L.cond[k]}"><output id="o_${k}">${k === "bc" ? L.bc : L.cond[k]}</output></label>`).join("") +
    `<label>draw ${sel("drw", [["TYPICAL", "typical"], ["HEAVY", "heavy (p75)"], ["PERFECT", "perfect"]].concat(Array.from({ length: 40 }, (_, i) => ["seed" + (i + 1), "seed " + (i + 1)])), L.draw)}</label>
     <label>family ${sel("fam", [["AUTO", "AUTO"]].concat(FAMILY_ORDER.map((f) => [f, f.toLowerCase()])), L.cond.family)}</label><label>foot ${sel("ft", [["AUTO", "AUTO"], ["R", "right"], ["L", "left"]], L.cond.foot)}</label>
     <label>variant ${sel("vr", [["AUTO", "AUTO"], ["across", "across"], ["behind", "behind"]], L.cond.variant)}</label><label>preparation ${sel("prp", [["clean", "clean (early read)"], ["0.6", "0.6 s"], ["0.45", "0.45 s"], ["0.3", "0.3 s"]], L.cond.prep)}</label>
     <label>preferred ${sel("prf", [["R", "right"], ["L", "left"], ["both", "two-footed"]], L.cond.pref)}</label><label>camera ${sel("cam", [["auto", "auto (across the exit)"], ["overhead", "overhead"], ["side", "side"], ["passer", "passer"], ["behind", "behind"]], L.cam)}</label>
     <button id="play">${L.playing ? "❚❚" : "▶"}</button>${[1, 0.5, 0.25, 0.1].map((r) => `<button class="rt ${r === L.rate ? "on" : ""}" data-r="${r}">${r}×</button>`).join("")}<button id="rst">⟲</button>
     <label><input type="checkbox" id="lad" ${L.ladder ? "checked" : ""}> BC ladder</label><input type="range" id="scrub" min="0" max="1000" value="0" style="width:200px"><a href="receive_turn1.html" target="_blank">matrix ↗</a> <a href="receive_turn1_var.html" target="_blank">variance ↗</a>`;
  const upd = () => { const u = new URL(location.href); for (const [k] of SL) u.searchParams.set(k, k === "bc" ? L.bc : L.cond[k]); for (const k of ["family", "foot", "variant", "prep", "pref"]) u.searchParams.set(k, L.cond[k]); u.searchParams.set("draw", L.draw); u.searchParams.set("cam", L.cam); history.replaceState(null, "", u.toString()); };
  let pend = null; const recompute = () => { if (pend) clearTimeout(pend); pend = setTimeout(() => { L.extCache = null; compute(); hud(); render(); upd(); }, 30); };
  for (const [k] of SL) $("#s_" + k).oninput = (e) => { const x = +e.target.value; $("#o_" + k).textContent = x; if (k === "bc") L.bc = x; else L.cond[k] = x; recompute(); };
  $("#drw").onchange = (e) => { L.draw = e.target.value; recompute(); };
  for (const [id, k] of [["fam", "family"], ["ft", "foot"], ["vr", "variant"], ["prp", "prep"], ["prf", "pref"]]) $("#" + id).onchange = (e) => { L.cond[k] = e.target.value; recompute(); };
  $("#cam").onchange = (e) => { L.cam = e.target.value; upd(); };
  $("#play").onclick = () => { L.playing = !L.playing; $("#play").textContent = L.playing ? "❚❚" : "▶"; }; $("#rst").onclick = () => { L.t = L.t0; };
  document.querySelectorAll(".rt").forEach((b) => (b.onclick = () => { L.rate = +b.dataset.r; document.querySelectorAll(".rt").forEach((q) => q.classList.toggle("on", q === b)); }));
  $("#lad").onchange = (e) => { L.ladder = e.target.checked; recompute(); };
  $("#scrub").oninput = (e) => { L.playing = false; $("#play").textContent = "▶"; L.t = L.t0 + (L.dur - L.t0) * (+e.target.value / 1000); };
  W.addEventListener("keydown", (e) => { if (e.target.tagName === "INPUT" && e.target.type !== "range") return; if (e.key === " ") { L.playing = !L.playing; e.preventDefault(); } if (e.key === ".") { L.playing = false; L.t += 1 / 60; } if (e.key === ",") { L.playing = false; L.t -= 1 / 60; } if (e.key === "r") L.t = L.t0; });
}
function frame(now) { if (L.last == null) L.last = now; const dt = Math.min(0.05, (now - L.last) / 1000); L.last = now; if (L.playing) { L.t += dt * L.rate; if (L.t > L.dur) L.t = L.t0; } const sc = $("#scrub"); if (sc && L.dur > L.t0) sc.value = String(Math.round(1000 * (L.t - L.t0) / (L.dur - L.t0))); render(); requestAnimationFrame(frame); }
async function boot() {
  L.cv = $("#gl"); L.ov = $("#ov"); const gl = L.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) throw new Error("WebGL2 unavailable");
  L.gl = gl; L.R = { gl }; L.ground = groundProg(gl); L.ball = ballProg(gl);
  try { L.ent = await W.ofCharLoad("vinicius"); L.skel = L.ent.skel; } catch (e) { console.warn("character", e); }
  controls(); compute(); hud(); L.ready = true; if (Q.get("t")) L.t = L.tc + +Q.get("t");
  if (Q.get("compare") === "1") document.body.classList.add("compare");
  W.RTL = { state: L, setRel(dt) { L.t = L.tc + dt; render(); return true; },
    // Chrome = Node: one case through the page's own chain (no reload)
    evalCase(c, bc, draw) { L.cond = Object.assign({ theta: 0, v: 12, lat: 0, family: "AUTO", foot: "AUTO", variant: "AUTO", prep: "clean", pref: "R" }, c); L.bc = bc; L.draw = draw; L.extCache = null; L.ladder = false; compute(); const P = L.P; if (P.A.none) return { none: true };
      const e = L.ep; return { hash: L.hash, fid: P.A.fid, F: P.A.F, surface: P.A.surface, kc: P.kc, v: e.ex.v, cls: e.m.cls, tCont: e.m.tCont, extraAdj: e.m.extraAdj, contacts: e.m.contacts, end: e.rec[e.rec.length - 1].p, launched: e.launched }; } };
  W.RTL_READY = true;
  if (Q.get("external") === "1") { L.playing = false; render(); } else requestAnimationFrame(frame);
}
boot().catch((e) => { $("#hud").textContent = "lab failed: " + (e && e.stack || e); console.error(e); });

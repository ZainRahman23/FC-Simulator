// ═══ physchar2/viewer/v2_cf5_replay.js — CF-5 continuous-walk REPLAY page (presentation only; nothing is simulated here) ═══════════════════════════════════
// Plays back recorded full-body states of one CF-5 run (tools/cf5_pose_record.mjs: the unmodified harness re-executed, accepted only because every per-second state
// hash and the end hash equal the authoritative evidence). Each displayed frame is one recorded 60 Hz sample (every 4th physics tick), drawn exactly as recorded
// (sample-and-hold: no interpolation, no smoothing, no randomness). Overlays (COM, DCM ξ and its reference, measured CoP, contact states, loads, forward COM velocity,
// step events) are the authoritative evidence telemetry, copied verbatim into the replay file. Renderer, colours, cameras and controls follow the G3 review page.
import { V, Q } from "../core/v2_math.js";
import { createGL } from "./v2_gl.js";

const $ = (id) => document.getElementById(id), qp = new URLSearchParams(location.search), D = 180 / Math.PI;
const BASE = "../../../../review_artifacts/physical_character_v2/diagnostics/loco_cf5_2026-10-08/replay/", BASE6 = "../../../../review_artifacts/physical_character_v2/diagnostics/loco_cf6_2026-10-08/replay/";
const RUNS = [{ id: "V2-REF_s20", label: "CF-5 · V2-REF — 20 physical / 19 continuous steps, 0.034 m/s (Tst 1 s, S 0.06 m)", file: BASE + "V2-REF_s20_replay.json.gz" },
  { id: "cf6_B0.1_V2-REF_s60", label: "CF-6 · V2-REF — 60 physical / 59 continuous steps, 0.10 m/s (fastest clean walk; bracket 0.1 m/s)", file: BASE6 + "B0.1_V2-REF_L_s60_replay.json.gz" },
  { id: "cf6_B0.2_V2-REF_s20", label: "CF-6 · V2-REF — 0.20 m/s attempt: 8 physical steps, fails at step 9 (bracket 0.2 m/s)", file: BASE6 + "B0.2_V2-REF_L_s20_replay.json.gz" }];
const bodyColor = (b) => { if (b.side === "L") return [0.32, 0.55, 0.95]; if (b.side === "R") return [0.95, 0.42, 0.32]; return { pelvis: [0.55, 0.72, 0.5], abdomen: [0.5, 0.66, 0.6], thorax: [0.45, 0.62, 0.68], head: [0.75, 0.68, 0.5] }[b.name] || [0.6, 0.6, 0.6]; };
const STATE_COL = { SUPPORT: "#4cd27a", LOAD_ACCEPT: "#8be0a4", UNLOADING: "#ffd34d", TOUCHING: "#5aa0ff", LIFTOFF: "#b48cff", AIRBORNE: "#ff9a3c", TOUCHDOWN: "#ff6b5b" };
const CAMS = { side: { yaw: 90, pitch: 8, dist: 3.6 }, front: { yaw: 0, pitch: 6, dist: 3.6 }, three: { yaw: 45, pitch: 14, dist: 3.8 }, top: { yaw: 0, pitch: 88, dist: 3.0 }, feet: { yaw: 70, pitch: 30, dist: 1.1 } };
const ST = { playing: false, speed: 1, fpos: 0, idx: 0, last: null, cam: { ...CAMS.three, target: [0, 0.8, 0], fov: 0.62, follow: true }, show: { bodies: true, edges: false, com: true, xi: true, cop: true, prints: true, hud: true } };
const canvas = $("gl"), ov = $("ov"), R = createGL(canvas), g2 = ov.getContext("2d");
let RP = null, MESH = [], FR = [], TEL = [], TI = {}, W = [0, 1], FPS = 60, dirty = true, SPH = null;

async function load(run) {
  $("verify").className = "hdr"; $("verify").textContent = "loading " + run.id + " …";
  const res = await fetch(new URL(run.file, import.meta.url)); if (!res.ok) throw new Error(`${run.file}: HTTP ${res.status}`);
  RP = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).json();
  MESH = RP.bodies.map((b) => R.mesh(new Float32Array(b.tris)));
  const nb = RP.bodies.length; FR = RP.frames.map((f) => ({ t: f[0], pose: Array.from({ length: nb }, (_, i) => ({ pos: [f[1 + i * 7], f[2 + i * 7], f[3 + i * 7]], rot: [f[4 + i * 7], f[5 + i * 7], f[6 + i * 7], f[7 + i * 7]] })) }));
  TI = Object.fromEntries(RP.telemetry.cols.map((c, i) => [c, i])); const rows = RP.telemetry.rows;   // same 4-tick cadence: joined by index, each pair checked against the evidence's own time stamp
  TEL = FR.map((f, i) => (rows[i] && Math.abs(rows[i][0] - f.t) < 1e-3 ? rows[i] : rows.find((r) => Math.abs(r[0] - f.t) < 1e-3) || null)); W = RP.walkingFrame ? RP.walkingFrame.w : [0, 1]; FPS = 1 / (RP.dt * RP.frameEveryTicks);
  const v = RP.verification; $("verify").className = "hdr " + (v.identical ? "ok" : "bad");
  $("verify").innerHTML = `${v.identical ? "✓" : "✗"} recorded poses = authoritative run: per-second state hashes ${v.perSecondHashes}, end hash ${v.regeneratedHashEnd} = ${v.hashEnd}<br><span class="note" style="font-weight:400">source: ${RP.source} · ${RP.physicalSteps} physical steps · ${FR.length} frames at ${FPS.toFixed(0)} Hz · ${RP.endT} s</span>`;
  $("jump").innerHTML = ""; $("jump").add(new Option("—", "")); for (const s of RP.steps.filter((s) => !s.tail)) $("jump").add(new Option(`step ${s.k} (${s.swing} swing)`, s.k));
  $("steps").innerHTML = "<tr><th>step</th><th>swing</th><th>liftoff s</th><th>touchdown s</th><th>physical</th><th>COM fwd at TD mm/s</th></tr>" + RP.steps.map((s) => `<tr data-k="${s.k}" style="cursor:pointer"><td>${s.k}${s.tail ? " (tail)" : ""}</td><td>${s.swing}</td><td>${s.tLiftoff != null ? s.tLiftoff.toFixed(3) : "—"}</td><td>${s.tTouchdown != null ? s.tTouchdown.toFixed(3) : "—"}</td><td>${s.tail ? "—" : s.physical ? "✓" : "✗"}</td><td>${s.comFwdAtTouchdown != null ? (s.comFwdAtTouchdown * 1000).toFixed(1) : "—"}</td></tr>`).join("");
  for (const tr of $("steps").querySelectorAll("tr[data-k]")) tr.onclick = () => jumpTo(+tr.dataset.k);
  ST.fpos = 0; ST.idx = 0; ST.playing = false; updPlay(); dirty = true;
}
const frameAt = (t) => Math.max(0, Math.min(FR.length - 1, Math.round((t - FR[0].t) * FPS)));
function jumpTo(k) { const s = RP.steps.find((x) => x.k === k); if (!s) return; const t = (s.tLiftoff ?? s.tCommand ?? FR[0].t) - 0.5; ST.fpos = ST.idx = frameAt(t); dirty = true; }
function setIdx(i) { ST.idx = Math.max(0, Math.min(FR.length - 1, i)); ST.fpos = ST.idx; dirty = true; }
function toggle() { if (ST.idx >= FR.length - 1) setIdx(0); ST.playing = !ST.playing; ST.last = null; updPlay(); }
function updPlay() { $("play").textContent = ST.playing ? "❚❚ pause" : "▶ play"; $("play").classList.toggle("on", ST.playing); }
const tv = (row, c) => (row ? row[TI[c]] : null), fwdOf = (v) => v[0] * W[0] + v[2] * W[1], latOf = (v) => v[0] * W[1] - v[2] * W[0];

function frame() {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio; if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; ov.width = canvas.width; ov.height = canvas.height; }
  const F = FR[ST.idx], S = F.pose, row = TEL[ST.idx], L = [], push = (a, b, col) => L.push(a[0], a[1], a[2], ...col, b[0], b[1], b[2], ...col), y0 = 0.002, g = (p) => [p[0], y0, p[1]];
  const com = tv(row, "com") || S[0].pos, fl = S[RP.feet[0]].pos, fr = S[RP.feet[1]].pos;
  if (ST.cam.follow) ST.cam.target = ST.cam.dist < 1.5 ? [(fl[0] + fr[0]) / 2, 0.05, (fl[2] + fr[2]) / 2] : [com[0], Math.max(0.5, com[1] * 0.88), com[2]];
  const c = ST.cam, cp = Math.cos(c.pitch / D), eye = [c.target[0] + c.dist * Math.sin(c.yaw / D) * cp, c.target[1] + c.dist * Math.sin(c.pitch / D), c.target[2] + c.dist * Math.cos(c.yaw / D) * cp];
  R.begin({ eye, target: c.target, fov: c.fov }, canvas.width, canvas.height);
  for (let i = -20; i <= 20; i++) { const cx = Math.round(com[0] * 2) / 2, cz = Math.round(com[2] * 2) / 2, x = cx + i * 0.1, z = cz + i * 0.1, col = i % 5 === 0 ? [0.42, 0.45, 0.48, 0.9] : [0.28, 0.3, 0.33, 0.7]; push([x, 0, cz - 2], [x, 0, cz + 2], col); push([cx - 2, 0, z], [cx + 2, 0, z], col); }
  const sph = (p, r, col) => { if (!SPH) SPH = R.icosphere(1, 2); R.drawMesh(SPH, R.m4.trs(p, [0, 0, 0, 1], r), col); };
  RP.bodies.forEach((b, i) => { const col = bodyColor(b); if (ST.show.bodies) R.drawMesh(MESH[i], R.m4.trs(S[i].pos, S[i].rot), [...col, 0.9]); if (ST.show.edges) for (let k = 0; k < MESH[i].edges.length; k += 2) push(V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k])), V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k + 1])), [...col, 0.8]); });
  if (ST.show.prints) for (const s of RP.steps) { if (s.tTouchdown == null || s.tTouchdown > F.t + 1e-9) continue; const p = FR[frameAt(s.tTouchdown)].pose[RP.feet[s.swing === "L" ? 0 : 1]].pos, col = s.swing === "L" ? [0.4, 0.6, 1, 0.9] : [1, 0.5, 0.4, 0.9], r = 0.025;
    push([p[0] - r, y0, p[2]], [p[0] + r, y0, p[2]], col); push([p[0], y0, p[2] - r], [p[0], y0, p[2] + r], col); }
  if (ST.show.com && row) { sph(com, 0.02, [1, 0.2, 0.85, 1]); push(com, [com[0], 0, com[2]], [1, 0.3, 0.9, 0.7]); }
  if (ST.show.xi && row) { const xi = tv(row, "xi"), xr = tv(row, "xiRef"); sph(g(xi), 0.012, [1, 0.6, 0.1, 1]); if (xr) { sph(g(xr), 0.008, [0.6, 0.6, 0.6, 1]); push(g(xr), g(xi), [1, 0.6, 0.1, 0.9]); } }
  if (ST.show.cop && row && tv(row, "cop")) sph(g(tv(row, "cop")), 0.01, [1, 1, 1, 1]);
  R.drawLines(L);
  // HUD (2-D overlay): recorded telemetry only
  g2.clearRect(0, 0, ov.width, ov.height);
  if (ST.show.hud && row) { const st = tv(row, "states"), fz = tv(row, "FzBW"), v = tv(row, "comV"), s = dpr; g2.font = `${12 * s}px ui-monospace, Menlo, monospace`; g2.fillStyle = "rgba(20,22,26,0.78)"; g2.fillRect(8 * s, 8 * s, 330 * s, 92 * s);
    const lines = [[`t ${F.t.toFixed(3)} s   step ${tv(row, "step")}   ${tv(row, "ph")}${tv(row, "seq") ? " / " + tv(row, "seq") : ""}`, "#e7e9ee"], [`L ${st[0]}  ${(fz[0] * 100).toFixed(1)} % BW`, STATE_COL[st[0]] || "#ccc"], [`R ${st[1]}  ${(fz[1] * 100).toFixed(1)} % BW`, STATE_COL[st[1]] || "#ccc"],
      [`COM forward ${(fwdOf(v) * 1000).toFixed(1)} mm/s   lateral ${(latOf(v) * 1000).toFixed(1)} mm/s`, "#ffd34d"], [`speed ${ST.speed}×   frame ${ST.idx + 1}/${FR.length}`, "#9aa1ad"]];
    lines.forEach(([t, col], i) => { g2.fillStyle = col; g2.fillText(t, 16 * s, (26 + i * 16) * s); }); }
  $("clock").textContent = `t = ${F.t.toFixed(3)} s · frame ${ST.idx + 1} / ${FR.length}`; $("seek").value = Math.round(ST.idx / (FR.length - 1) * 1000);
  nowTable(row, F); plot(F);
}
function nowTable(row, F) { if (!row) { $("now").innerHTML = ""; return; } const st = tv(row, "states"), fz = tv(row, "FzBW"), v = tv(row, "comV"), cur = RP.steps.find((s) => s.k === tv(row, "step"));
  const r = [["time", `${F.t.toFixed(3)} s`], ["step", `${tv(row, "step")}${cur ? ` (${cur.swing} swing${cur.tail ? ", run tail" : ""})` : ""}`], ["gait phase (harness / sequencer)", `${tv(row, "ph")} / ${tv(row, "seq") ?? "—"}`],
    ["left foot", `<span style="color:${STATE_COL[st[0]] || "#ccc"}">${st[0]}</span> · ${(fz[0] * 100).toFixed(1)} % BW`], ["right foot", `<span style="color:${STATE_COL[st[1]] || "#ccc"}">${st[1]}</span> · ${(fz[1] * 100).toFixed(1)} % BW`],
    ["COM velocity forward / lateral", `${(fwdOf(v) * 1000).toFixed(1)} / ${(latOf(v) * 1000).toFixed(1)} mm/s`], ["DCM margin to support", `${tv(row, "xiSupMarginMm")} mm`]];
  $("now").innerHTML = r.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join(""); }
function plot(F) { const cv = $("plot"), w = cv.clientWidth * devicePixelRatio, h = cv.clientHeight * devicePixelRatio; if (cv.width !== w) { cv.width = w; cv.height = h; } const p = cv.getContext("2d"); p.clearRect(0, 0, w, h);
  const rows = RP.telemetry.rows, t0 = rows[0][0], t1 = rows[rows.length - 1][0], vmax = Math.max(0.07, ...rows.map((r) => fwdOf(r[TI.comV]))) * 1.05, sx = (t) => (t - t0) / (t1 - t0) * w, sy = (v) => h - 6 - (v + 0.01) / (vmax + 0.01) * (h - 12);
  for (const [lv, col] of [[0, "rgba(255,255,255,0.25)"], [0.01, "rgba(255,255,255,0.12)"]]) { p.strokeStyle = col; p.beginPath(); p.moveTo(0, sy(lv)); p.lineTo(w, sy(lv)); p.stroke(); }
  p.strokeStyle = "#4cd27a"; for (const s of RP.steps) if (s.tTouchdown != null) { p.beginPath(); p.moveTo(sx(s.tTouchdown), 0); p.lineTo(sx(s.tTouchdown), h); p.stroke(); }
  p.strokeStyle = "#ffd34d"; p.lineWidth = devicePixelRatio; p.beginPath(); rows.forEach((r, i) => { const X = sx(r[0]), Y = sy(fwdOf(r[TI.comV])); i ? p.lineTo(X, Y) : p.moveTo(X, Y); }); p.stroke();
  p.strokeStyle = "#fff"; p.beginPath(); p.moveTo(sx(F.t), 0); p.lineTo(sx(F.t), h); p.stroke(); }
function orbit() {
  let drag = null; canvas.onmousedown = (e) => { drag = { x: e.clientX, y: e.clientY }; e.preventDefault(); }; window.onmouseup = () => { drag = null; };
  window.onmousemove = (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; ST.cam.yaw -= dx * 0.4; ST.cam.pitch = Math.max(-80, Math.min(89, ST.cam.pitch + dy * 0.3)); dirty = true; };
  canvas.onwheel = (e) => { ST.cam.dist = Math.max(0.3, Math.min(12, ST.cam.dist * Math.exp(e.deltaY * 0.001))); dirty = true; e.preventDefault(); };
  const cam = (k) => { Object.assign(ST.cam, CAMS[k]); dirty = true; };
  window.onkeydown = (e) => { if (e.target.tagName === "SELECT") return; const k = { 1: "side", 2: "front", 3: "three", 4: "top", 6: "feet" }[e.key]; if (k) cam(k); if (e.key === "5") { ST.cam.follow = !ST.cam.follow; $("c_follow").classList.toggle("on", ST.cam.follow); dirty = true; }
    if (e.key === " ") { toggle(); e.preventDefault(); } if (e.key === ".") { ST.playing = false; updPlay(); setIdx(ST.idx + 1); } if (e.key === ",") { ST.playing = false; updPlay(); setIdx(ST.idx - 1); } if (e.key === "r") { setIdx(0); } };
  for (const k of Object.keys(CAMS)) $("c_" + k).onclick = () => cam(k);
  $("c_follow").onclick = () => { ST.cam.follow = !ST.cam.follow; $("c_follow").classList.toggle("on", ST.cam.follow); dirty = true; };
}
function loop(now) {
  if (RP && ST.playing) { if (ST.last != null) { ST.fpos += (now - ST.last) / 1000 * ST.speed * FPS; const i = Math.min(FR.length - 1, Math.floor(ST.fpos)); if (i !== ST.idx) { ST.idx = i; dirty = true; } if (ST.idx >= FR.length - 1) { ST.playing = false; updPlay(); } } ST.last = now; }
  if (RP && dirty) { dirty = false; frame(); } requestAnimationFrame(loop);
}
window.addEventListener("resize", () => { dirty = true; });
(async () => {
  for (const r of RUNS) $("run").add(new Option(r.label, r.id)); $("run").value = qp.get("run") || RUNS[0].id; $("run").onchange = () => load(RUNS.find((r) => r.id === $("run").value)).catch(err);
  $("play").onclick = () => toggle(); $("step").onclick = () => { ST.playing = false; updPlay(); setIdx(ST.idx + 1); }; $("back").onclick = () => { ST.playing = false; updPlay(); setIdx(ST.idx - 1); };
  $("restart").onclick = () => setIdx(0); $("speed").onchange = () => { ST.speed = +$("speed").value; dirty = true; }; $("seek").oninput = () => setIdx(Math.round(+$("seek").value / 1000 * (FR.length - 1)));
  $("jump").onchange = () => { if ($("jump").value) jumpTo(+$("jump").value); };
  for (const k of Object.keys(ST.show)) { const el = $("t_" + k); if (!el) continue; el.checked = ST.show[k]; el.onchange = () => { ST.show[k] = el.checked; dirty = true; }; }
  orbit(); await load(RUNS.find((r) => r.id === $("run").value) || RUNS[0]); if (qp.get("t") != null) setIdx(frameAt(+qp.get("t"))); requestAnimationFrame(loop);   // ?t=<s>: open at that recorded time
})().catch(err);
function err(e) { $("verify").className = "hdr bad"; $("verify").textContent = "ERROR " + e.message; console.error(e); }

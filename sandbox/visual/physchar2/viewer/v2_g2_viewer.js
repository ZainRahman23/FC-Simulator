// ═══ physchar2/viewer/v2_g2_viewer.js — V2-G2 active-standing review page (presentation only; the simulation is the gate's own G2Sim) ═══
// Playback / pause / slow motion / frame step / restart / cameras; overlays: COM + its turf projection, extrapolated COM ξ and its target,
// commanded and measured CoP (net + per foot), support polygon and each foot's usable region, per-foot ground reaction, the test impulse,
// whole-body angular momentum, foot-piece contacts; panels: phase (QUIET / RECOVERY / EXHAUSTED = step required / FALLEN), actuator torque
// and saturation per axis, joint target vs actual for a selected joint. ?check=1 runs the curated set and compares hashes with Node.
import { V, Q } from "../core/v2_math.js";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { VARIATION_SET } from "../spec/v2_human.js";
import { G2Sim, pushScenario, torqueScenario, offsetScenario, DIRS } from "../gates/v2_g2.js";
import { createGL } from "./v2_gl.js";

const $ = (id) => document.getElementById(id), D = 180 / Math.PI, qp = new URLSearchParams(location.search);
const canvas = $("gl"), ov = $("ov"), R = createGL(canvas), g2 = ov.getContext("2d");
const OFFSETS = { "knees 12°": { stance: { kneeFlexDeg: 12 } }, "hips 10°": { stance: { hipFlexDeg: 10 } }, "COM over ankles": { stance: { comAheadOfAnklesM: 0.0 } }, "COM 7 cm ahead": { stance: { comAheadOfAnklesM: 0.07 } },
  "trunk 10° flexed": { stance: { lumbar: { flex: 10 } } }, "arms 30° abducted": { stance: { shoulderAbdDeg: 30 } }, "head 20° flexed": { stance: { neck: { flex: 20 } } },
  "COM 5 cm/s forward": { v: [0, 0, 0.05] }, "COM 5 cm/s right": { v: [0.05, 0, 0] }, "COM 5 cm/s back-left": { v: [-0.035, 0, -0.035] } };
// scenario keys: quiet:60 | push:F:15[:pelvis:0.05] | torque:pitch:8 | offset:<name>
export function scenarioOf(key) { const p = key.split(":");
  if (p[0] === "quiet") return { title: `Quiet stance (${p[1]} s)`, seconds: +p[1] };
  if (p[0] === "push") return pushScenario(p[1], +p[2], p[3] ? { body: p[3], dur: +(p[4] || 0.1) } : {});
  if (p[0] === "torque") return torqueScenario(p[1], +p[2]);
  if (p[0] === "offset") return offsetScenario(p[1], OFFSETS[p[1]]);
  throw new Error("scenario " + key); }
const CURATED = ["quiet:10", "push:F:15", "push:R:15", "push:BL:10", "torque:pitch:8", "offset:COM over ankles"];
const LIST = [["quiet:60", "S0 quiet stance 60 s"], ["quiet:10", "S0 quiet stance 10 s"], ...["F", "B", "L", "R", "FL", "FR", "BL", "BR"].flatMap(d => [5, 10, 15, 20, 25, 30].map(m => [`push:${d}:${m}`, `push ${d} ${m} N·s (thorax, 100 ms)`])),
  ...["yaw", "pitch", "roll"].flatMap(a => [4, 8, 12].map(h => [`torque:${a}:${h}`, `angular ${a} ${h} N·m·s (thorax)`])), ...Object.keys(OFFSETS).map(n => [`offset:${n}`, `initial offset: ${n}`])];
const PHASE_COL = { QUIET: "#4cd27a", RECOVERY: "#ffd34d", EXHAUSTED: "#ff9a3c", FALLEN: "#ff5b5b" };
const bodyColor = (b) => { if (b.side === "L") return [0.32, 0.55, 0.95]; if (b.side === "R") return [0.95, 0.42, 0.32]; return { pelvis: [0.55, 0.72, 0.5], abdomen: [0.5, 0.66, 0.6], thorax: [0.45, 0.62, 0.68], head: [0.75, 0.68, 0.5] }[b.name] || [0.6, 0.6, 0.6]; };
const ST = { key: "push:F:15", human: "V2-REF", playing: false, speed: 1, acc: 0, cam: { yaw: 60, pitch: 14, dist: 3.2, target: [0, 0.8, 0], fov: 0.62, follow: true }, joint: "ankle_R",
  show: { bodies: true, colliders: false, com: true, xi: true, cop: true, support: true, grf: true, push: true, L: true, pieces: true, contacts: false } };
const CAMS = { front: { yaw: 0, pitch: 6 }, side: { yaw: 90, pitch: 6 }, three: { yaw: 50, pitch: 16 }, top: { yaw: 0, pitch: 88 } };
let J = null, NODE = null, SPEC = null, SIM = null, MESH = [], dirty = true, done = false, HIST = [];
async function init() {
  J = await loadJolt(new URL("../vendor/jolt-physics.wasm-compat.js", import.meta.url).href);
  try { NODE = await (await fetch(new URL("../../../../review_artifacts/physical_character_v2/g2/json/g2_results.json", import.meta.url))).json(); } catch (e) { NODE = null; }
  for (const [k, t] of LIST) $("scen").add(new Option(t, k)); for (const h of VARIATION_SET) $("human").add(new Option(`${h.id} (${h.H} m, ${h.M} kg)`, h.id));
  $("scen").value = ST.key; $("human").value = ST.human; $("scen").onchange = () => { ST.key = $("scen").value; build(); }; $("human").onchange = () => { ST.human = $("human").value; build(); };
  $("play").onclick = () => toggle(); $("step").onclick = () => { ST.playing = false; tick(1); updPlay(); }; $("restart").onclick = () => build(); $("speed").onchange = () => { ST.speed = +$("speed").value; };
  $("seek").oninput = () => seek(+$("seek").value / 1000 * SIM.N);
  for (const k of Object.keys(ST.show)) { const el = $("t_" + k); if (!el) continue; el.checked = ST.show[k]; el.onchange = () => { ST.show[k] = el.checked; dirty = true; }; }
  for (const k of Object.keys(CAMS)) $("c_" + k).onclick = () => { Object.assign(ST.cam, CAMS[k], { follow: false }); dirty = true; }; $("c_follow").onclick = () => { ST.cam.follow = true; dirty = true; };
  orbit();
}
function toggle() { if (done) build(); ST.playing = !ST.playing; updPlay(); }
function updPlay() { $("play").textContent = ST.playing ? "❚❚ pause" : "▶ play"; $("play").classList.toggle("on", ST.playing); }
function build() {
  if (SIM) SIM.destroy(); SPEC = generateSpec(VARIATION_SET.find(h => h.id === ST.human)); SIM = new G2Sim(J, SPEC, scenarioOf(ST.key), {}); done = false; ST.acc = 0; HIST = [];
  MESH = SPEC.bodies.map((b, i) => R.mesh(SIM.w.bodyTriangles(i)));
  $("joint").innerHTML = ""; for (const j of SPEC.joints) $("joint").add(new Option(j.name, j.name)); $("joint").value = ST.joint; $("joint").onchange = () => { ST.joint = $("joint").value; dirty = true; };
  $("hash").textContent = "run the scenario to the end to compare"; $("hash").className = "mono"; dirty = true; nodePanel();
}
function tick(n) { for (let i = 0; i < n; i++) { if (!SIM.tick()) { finish(); break; } const r = SIM.lastRow; HIST.push([r.t, r.phase, Math.hypot(r.xi[0] - r.xiRef[0], r.xi[1] - r.xiRef[1]), Math.hypot(r.r[0], r.r[1])]); } dirty = true; }
function seek(n) { const was = ST.playing; build(); ST.playing = false; tick(Math.round(n)); ST.playing = was && !done; updPlay(); }
function nodeRun() { if (!NODE) return null; const [k, a, b] = ST.key.split(":"); return NODE.jobs.find(j => j.res && j.human === ST.human && ((k === "push" && j.group === "push" && j.sc.dir === a && j.sc.J === +b) || (k === "quiet" && j.group === "S0" && +a === 60) || (k === "torque" && j.group === "S4" && j.sc.axis === a && j.sc.H === +b) || (k === "offset" && j.group === "S5" && j.sc.name === a))) || null; }
function nodePanel() { const j = nodeRun(); $("node").innerHTML = j ? `<div class="hdr ${j.res.outcome === "recovered" || j.res.outcome === "stood" ? "ok" : "warn"}">Node final run: ${j.res.outcome}${j.res.recoveryT != null ? ` in ${j.res.recoveryT.toFixed(2)} s` : ""}</div><div class="note">hash ${j.res.hash} · ξ max ${j.res.xiDevMaxCm.toFixed(1)} cm · foot slip ${Math.max(...j.res.feet.slipMaxMm).toFixed(1)} mm · ${j.res.cause ? j.res.cause.causes.join(", ") : ""}</div>` : `<div class="hdr warn">no Node run for this combination</div>`; }
function finish() { if (done) return; done = true; ST.playing = false; updPlay(); const r = SIM.g2summary(), j = nodeRun(); const ok = j && j.res.hash === r.hash;
  $("hash").className = "mono " + (j ? (ok ? "ok" : "bad") : ""); $("hash").innerHTML = j ? `<b>${ok ? "BROWSER = NODE" : "BROWSER ≠ NODE"}</b><br>browser ${r.hash} · node ${j.res.hash}` : `browser ${r.hash} (no Node run for this combination)`; }
// ── render ──
function frame() {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio; if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; ov.width = canvas.width; ov.height = canvas.height; }
  const S = SIM.st, I = SIM.ctrl.info, row = SIM.lastRow, L = [], push = (a, b, col) => L.push(a[0], a[1], a[2], ...col, b[0], b[1], b[2], ...col), labels = [], y0 = 0.002;
  const com = I.c; if (ST.cam.follow) ST.cam.target = [com[0], Math.max(0.5, com[1] * 0.8), com[2]];
  const c = ST.cam, cp = Math.cos(c.pitch / D), eye = [c.target[0] + c.dist * Math.sin(c.yaw / D) * cp, c.target[1] + c.dist * Math.sin(c.pitch / D), c.target[2] + c.dist * Math.cos(c.yaw / D) * cp];
  R.begin({ eye, target: c.target, fov: c.fov }, canvas.width, canvas.height);
  for (let i = -20; i <= 20; i++) { const cx = Math.round(com[0] * 2) / 2, cz = Math.round(com[2] * 2) / 2, x = cx + i * 0.1, z = cz + i * 0.1, col = i % 5 === 0 ? [0.42, 0.45, 0.48, 0.9] : [0.28, 0.3, 0.33, 0.7]; push([x, 0, cz - 2], [x, 0, cz + 2], col); push([cx - 2, 0, z], [cx + 2, 0, z], col); }
  const sph = (p, r, col) => { if (!sph.m) sph.m = R.icosphere(1, 2); R.drawMesh(sph.m, R.m4.trs(p, [0, 0, 0, 1], r), col); };
  SPEC.bodies.forEach((b, i) => { const M = R.m4.trs(S[i].pos, S[i].rot), col = bodyColor(b); if (ST.show.bodies) R.drawMesh(MESH[i], M, [...col, 0.85]); if (ST.show.colliders) for (let k = 0; k < MESH[i].edges.length; k += 2) push(V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k])), V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k + 1])), [...col, 0.8]); });
  const g = (p) => [p[0], y0, p[1]];
  if (ST.show.support) { const poly = (P, col) => { for (let k = 0; k < P.length; k++) push(g(P[k]), g(P[(k + 1) % P.length]), col); }; poly(I.support, [0.9, 0.9, 0.9, 0.9]); I.polys.forEach(P => poly(P, [0.55, 0.75, 1, 0.8])); }
  if (ST.show.com) { sph(com, 0.02, [1, 0.2, 0.85, 1]); push(com, [com[0], 0, com[2]], [1, 0.3, 0.9, 0.7]); }
  if (ST.show.xi) { sph(g(I.xi), 0.012, [1, 0.6, 0.1, 1]); sph(g(I.xiRef), 0.008, [0.6, 0.6, 0.6, 1]); push(g(I.xiRef), g(I.xi), [1, 0.6, 0.1, 0.9]); labels.push({ p: g(I.xi), t: "ξ", c: "#fa3" }); }
  if (ST.show.cop) { sph(g(I.p), 0.01, [0.3, 1, 1, 1]); if (I.r[0] || I.r[1]) push(g(I.p), g(I.pRaw), [1, 0.3, 0.3, 1]); if (row.cop) { sph(g(row.cop), 0.009, [1, 1, 1, 1]); labels.push({ p: g(row.cop), t: "CoP", c: "#fff" }); } I.cop.forEach(q => sph(g(q), 0.006, [0.3, 0.8, 1, 1])); }
  if (ST.show.grf && SIM.probeRows) SIM.probeRows.forEach(pr => { if (pr && pr.cop && pr.JyN > 5) { const F = pr.Jc.map(x => x / pr.dt), mg = SIM.ctrl.M * 9.81; push(pr.cop, V.add(pr.cop, V.sc(F, 0.6 / mg)), [0.3, 1, 0.5, 1]); } });
  if (ST.show.pieces && SIM.probes) SIM.probes.forEach((P, n) => { const fi = P.fi, rows = SIM.probeRows && SIM.probeRows[n]; if (!rows) return; for (const pc of rows.pieces) { const pp = P.pieces.find(x => x.sub === pc.sub), lo = pp.P.reduce((a, q) => (q[1] < a[1] ? q : a), pp.P[0]), wp = V.add(S[fi].pos, Q.rot(S[fi].rot, [pp.cx, lo[1], pp.cz]));
    sph(wp, pc.touch ? 0.005 : 0.003, pc.touch ? [0.3, 0.55, 1, 1] : pc.spec ? [0.6, 0.6, 0.6, 0.9] : [0.25, 0.25, 0.25, 0.5]); } });
  if (ST.show.push && SIM.lastDist && SIM.lastDist.body >= 0 && SIM.lastDist.at) { const F = SIM.lastDist.F, at = SIM.lastDist.at; push(V.sub(at, V.sc(F, 0.0015)), at, [1, 0.25, 0.25, 1]); labels.push({ p: at, t: `push ${V.len(F).toFixed(0)} N`, c: "#f66", bg: true }); }
  if (ST.show.L && row.L) push(com, V.add(com, V.sc(row.L, 0.05)), [0.8, 0.5, 1, 1]);
  if (ST.show.contacts) for (const k of SIM.lastContacts || []) for (const p of k.pts2) sph(p, k.depth > -0.0005 ? 0.005 : 0.003, k.depth > -0.0005 ? [1, 0.83, 0.3, 1] : [0.48, 0.51, 0.56, 0.8]);
  R.drawLines(L); g2.clearRect(0, 0, ov.width, ov.height); g2.font = `${12 * dpr}px ui-sans-serif, system-ui`;
  for (const lb of labels) { const s = R.project(lb.p, ov.width, ov.height); if (!s) continue; if (lb.bg) { const wd = g2.measureText(lb.t).width; g2.fillStyle = "rgba(0,0,0,0.6)"; g2.fillRect(s[0] + 4, s[1] - 13 * dpr, wd + 6, 16 * dpr); } g2.fillStyle = lb.c; g2.fillText(lb.t, s[0] + 6, s[1]); }
  const ph = row.phase, phName = { QUIET: "QUIET BALANCE", RECOVERY: "ACTIVE RECOVERY", EXHAUSTED: "STANDING RECOVERY EXHAUSTED — STEP REQUIRED", FALLEN: "FALLEN (physically unrecoverable)" }[ph];
  g2.fillStyle = PHASE_COL[ph]; g2.fillRect(10 * dpr, 30 * dpr, 12 * dpr, 12 * dpr); g2.font = `bold ${14 * dpr}px ui-sans-serif, system-ui`; g2.fillText(phName, 28 * dpr, 41 * dpr);
  g2.font = `${12 * dpr}px ui-sans-serif, system-ui`; g2.fillStyle = "rgba(255,255,255,0.8)"; g2.fillText(`${SPEC.human.id} · ${SIM.base.title} · t = ${row.t.toFixed(3)} s${done ? " (end)" : ""}`, 10 * dpr, 20 * dpr);
  panels(); $("clock").textContent = `t = ${row.t.toFixed(3)} s · tick ${SIM.n} / ${SIM.N} · ${SIM.cfg.hz} Hz · ${SIM.cfg.velSteps} it`; $("seek").value = Math.round(SIM.n / SIM.N * 1000);
}
function panels() { const I = SIM.ctrl.info, row = SIM.lastRow, res = SIM.actRes || [], f = (x, n = 1) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(n)), hd = I.heading, lat = [hd[1], -hd[0]], rel = (p) => [(p[0] - I.mid[0]) * lat[0] + (p[1] - I.mid[1]) * lat[1], (p[0] - I.mid[0]) * hd[0] + (p[1] - I.mid[1]) * hd[1]];
  const L = SIM.ledger, rows = [["phase", `<b style="color:${PHASE_COL[row.phase]}">${row.phase}</b>`], ["ξ − target (right, fwd)", `${rel([row.xi[0] - I.xiRef[0] + I.mid[0], row.xi[1] - I.xiRef[1] + I.mid[1]]).map(x => f(x * 100)).join(", ")} cm`],
    ["ξ margin to support edge", `${f(row.marginXi * 100)} cm`], ["CoP command (right, fwd of ankles)", `${rel(I.p).map(x => f(x * 100)).join(", ")} cm${I.r[0] || I.r[1] ? ` · residual ${f(Math.hypot(I.r[0], I.r[1]) * 100)} cm` : ""}`],
    ["CoP measured", row.cop ? `${rel(row.cop).map(x => f(x * 100)).join(", ")} cm` : "—"], ["foot load L / R", `${row.Fy ? row.Fy.map(x => f(x, 0)).join(" / ") : "—"} N (command ${f(I.share[0] * 100, 0)} / ${f(I.share[1] * 100, 0)} %)`],
    ["COM height · speed", `${f(I.c[1], 3)} m · ${f(Math.hypot(I.v[0], I.v[2]) * 100)} cm/s`], ["whole-body angular momentum", `${row.L ? f(V.len(row.L), 2) : "—"} N·m·s`],
    ["ledger: active work · damping · test impulse", `${f(L.Wact, 2)} J · ${f(L.damping, 2)} J · ${f(V.len(L.Jext), 1)} N·s`], ["authority writes", `${L.authorityWrites}`]];
  $("live").innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join("");
  const top = res.slice().sort((a, b) => b.frac - a.frac).slice(0, 14);
  $("act").innerHTML = `<tr><th>axis</th><th>τ N·m</th><th>% cap</th><th>act +/−</th></tr>` + top.map(a => `<tr${a.sat ? ' style="color:#ff6b5b"' : ""}><td>${SPEC.joints[a.k].name}.${SPEC.joints[a.k].def.axes["xyz"[a.i]].key}</td><td class="mono">${f(a.tau, 1)}</td><td class="mono"><span class="bar" style="width:${Math.min(100, a.frac * 100)}px"></span> ${f(a.frac * 100, 0)}${a.sat ? " SAT" : ""}</td><td class="mono">${a.a.map(x => f(x, 2)).join(" / ")}</td></tr>`).join("");
  const k = SPEC.joints.findIndex(j => j.name === ST.joint), P = SIM.P, d = P.jd[k], q = SIM.up.ev.qs[k], keys = ["x", "y", "z"].map(x => d.j.def.axes[x]).filter(Boolean);
  const qr = SIM.ctrl.qref[k]; const tgt = keys.map(a => { const qq = [qr[0], qr[1], qr[2], qr[3]]; return [a.key, P.anat(d, q, a.key), P.anat(d, qq, a.key)]; });
  $("jt").innerHTML = `<tr><th>${ST.joint}</th><th>actual °</th><th>stance ref °</th></tr>` + tgt.map(t => `<tr><td>${t[0]}</td><td class="mono">${f(t[1])}</td><td class="mono">${f(t[2])}</td></tr>`).join("") + `<tr><td colspan="3" class="note">${/ankle/.test(ST.joint) ? "ankle: no posture target — its angle follows balance" : /hip|knee/.test(ST.joint) ? "legs servo toward the leg-IK target (foot where it is, pelvis at reference height / orientation); stance ref shown" : "posture preference toward the stance reference"}</td></tr>`;
  const c = $("plot"), pg = c.getContext("2d"), w = c.width = c.clientWidth * devicePixelRatio, h = c.height = c.clientHeight * devicePixelRatio; pg.clearRect(0, 0, w, h); if (HIST.length < 2) return;
  const T = SIM.N * SIM.dt, sx = (t) => t / T * w; for (let i = 1; i < HIST.length; i++) { pg.fillStyle = PHASE_COL[HIST[i][1]]; pg.fillRect(sx(HIST[i - 1][0]), h - 6, Math.max(1, sx(HIST[i][0]) - sx(HIST[i - 1][0])), 6); }
  for (const [k2, col, sc] of [[2, "#fa3", 0.15], [3, "#f55", 0.15]]) { pg.strokeStyle = col; pg.lineWidth = devicePixelRatio; pg.beginPath(); HIST.forEach((r, i) => { const X = sx(r[0]), Y = h - 8 - Math.min(1, r[k2] / sc) * (h - 12); i ? pg.lineTo(X, Y) : pg.moveTo(X, Y); }); pg.stroke(); } }
function orbit() {
  let drag = null; canvas.onmousedown = (e) => { drag = { x: e.clientX, y: e.clientY }; e.preventDefault(); }; window.onmouseup = () => { drag = null; };
  window.onmousemove = (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; ST.cam.yaw -= dx * 0.4; ST.cam.pitch = Math.max(-80, Math.min(89, ST.cam.pitch + dy * 0.3)); dirty = true; };
  canvas.onwheel = (e) => { ST.cam.dist = Math.max(0.3, Math.min(12, ST.cam.dist * Math.exp(e.deltaY * 0.001))); dirty = true; e.preventDefault(); };
  window.onkeydown = (e) => { if (e.target.tagName === "SELECT") return; const k = { 1: "front", 2: "side", 3: "three", 4: "top" }[e.key]; if (k) { Object.assign(ST.cam, CAMS[k], { follow: false }); dirty = true; } if (e.key === "5") { ST.cam.follow = true; dirty = true; }
    if (e.key === " ") { toggle(); e.preventDefault(); } if (e.key === ".") { ST.playing = false; tick(1); updPlay(); } if (e.key === "r") build(); };
}
function loop() { if (ST.playing && SIM) { ST.acc += ST.speed * SIM.cfg.hz / 60; const n = Math.floor(ST.acc); ST.acc -= n; if (n > 0) tick(n); } if (dirty && SIM) { dirty = false; frame(); } requestAnimationFrame(loop); }
window.addEventListener("resize", () => { dirty = true; });
init().then(async () => {
  if (qp.get("check")) { const rows = [], KEYS = qp.get("keys") ? qp.get("keys").split("|") : CURATED;
    for (const k of KEYS) { await new Promise(r => setTimeout(r, 0)); const s = new G2Sim(J, generateSpec(VARIATION_SET.find(x => x.id === "V2-REF")), scenarioOf(k), {}); while (s.tick()) { if (s.g2acc.fallT != null && s.n * s.dt > s.g2acc.fallT + 0.5) break; }
      const hb = s.g2summary().hash, sc = k.split(":"), nd = NODE && NODE.jobs.find(j => j.group === "determinism" && j.res && ((sc[0] === "quiet" && j.sc.kind === "quiet") || (sc[0] === "push" && j.sc.kind === "push" && j.sc.dir === sc[1] && j.sc.J === +sc[2]) || (sc[0] === "torque" && j.sc.kind === "torque" && j.sc.axis === sc[1] && j.sc.H === +sc[2]) || (sc[0] === "offset" && j.sc.kind === "offset" && j.sc.name === sc[1])));
      rows.push({ k, b: hb, n: nd ? nd.res.hash : "—" }); s.destroy(); $("hash").textContent = `checking … ${rows.length}/${KEYS.length}`; }
    const all = rows.every(r => r.b === r.n); $("hash").className = "mono " + (all ? "ok" : "bad"); $("hash").innerHTML = `<b id="hash-status">${all ? "BROWSER = NODE" : "BROWSER ≠ NODE"}</b> (${rows.filter(r => r.b === r.n).length}/${rows.length})<br>` + rows.map(r => `${r.b === r.n ? "✓" : "✗"} ${r.k}: ${r.b} / ${r.n}`).join("<br>");
    document.body.dataset.ready = "1"; return; }
  if (qp.get("human")) { ST.human = qp.get("human"); $("human").value = ST.human; } if (qp.get("scenario")) { ST.key = qp.get("scenario"); $("scen").value = ST.key; } if (qp.get("joint")) ST.joint = qp.get("joint");
  for (const k of (qp.get("show") || "").split(",").filter(Boolean)) { ST.show[k] = true; if ($("t_" + k)) $("t_" + k).checked = true; } for (const k of (qp.get("hide") || "").split(",").filter(Boolean)) { ST.show[k] = false; if ($("t_" + k)) $("t_" + k).checked = false; }
  build(); if (qp.get("t")) { ST.playing = false; tick(Math.round(+qp.get("t") * SIM.cfg.hz)); }
  const cam = qp.get("cam"); if (cam && CAMS[cam]) Object.assign(ST.cam, CAMS[cam], { follow: !qp.get("nofollow") }); for (const k of ["dist", "yaw", "pitch"]) if (qp.get(k)) ST.cam[k] = +qp.get(k);
  dirty = false; frame(); loop(); document.body.dataset.ready = "1";
}).catch(e => { document.body.dataset.ready = "error"; $("hash").textContent = "ERROR: " + (e && e.stack || e); console.error(e); });

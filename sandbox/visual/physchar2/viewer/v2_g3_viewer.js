// ═══ physchar2/viewer/v2_g3_viewer.js — V2-G3 weight-transfer review page (presentation only; the simulation is the gate's own G3Sim) ═══════════
// Playback / pause / slow motion / frame step / seek / restart / cameras; overlays: COM, ξ and its target, commanded / measured CoP (net + per
// foot), the ACTIVE support geometry (feet with touching pieces; an excluded / unloaded foot drawn red / amber), boot pieces, per-foot ground
// reaction, the test impulse, whole-body angular momentum; HUD: per-foot load bars with the requested share and the transfer class; panels:
// transfer state, λ vs load timeline, balance / posture (pelvis roll, trunk lean, yaw, leg twist), actuators, joint target vs actual.
// ?check=1 runs the curated set and compares hashes with the Node final run.
import { V, Q } from "../core/v2_math.js";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { setAnkleNeutralKOverride } from "../spec/v2_joints.js";
import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { createGL } from "./v2_gl.js";

const $ = (id) => document.getElementById(id), D = 180 / Math.PI, qp = new URLSearchParams(location.search);
// close-decisions stage: check-mode configuration from the URL (defaults = the gate configuration, unchanged): knee=v2k, ankleK=<N·m/°>,
// stand=<json> (controller options), results=<file in this gate's json dir> (the Node run of the same configuration to compare with)
const QCFG = (() => { const st = qp.get("stand"); return { knee: qp.get("knee") || null, ankleK: qp.get("ankleK"), stand: st ? JSON.parse(st) : null, results: qp.get("results") || null }; })();
if (QCFG.ankleK != null) setAnkleNeutralKOverride(+QCFG.ankleK);
const qOpts = () => ({ ...(QCFG.stand ? { stand: QCFG.stand } : {}), ...(QCFG.knee ? { passiveOpts: { kneeModel: QCFG.knee } } : {}) });
const canvas = $("gl"), ov = $("ov"), R = createGL(canvas), g2 = ov.getContext("2d");
const CURATED = ["T5", "U:R", "T3", "T8:hold:R:R:10"];
const LIST = [["T0", "T0 bilateral baseline (20 s)"], ["T1", "T1 strong transfer 50 → R 85 % → 50"], ["T2", "T2 strong transfer 50 → L 85 % → 50"], ["T3", "T3 cycle R 85 → 50 → L 85 → 50"], ["T4", "T4 five repeated cycles (drift)"],
  ["T5", "T5 near-single-support R (97 %, hold 10 s)"], ["T6", "T6 near-single-support L (97 %, hold 10 s)"], ["U:R", "U unload the LEFT foot (λ_R 1.0, hold 6 s)"], ["U:L", "U unload the RIGHT foot (λ_R 0.0, hold 6 s)"],
  ...["R", "L"].flatMap(s => [4, 2, 1, 0.75, 0.5, 0.25].map(T => [`T7:${s}:${T}`, `T7 speed ${s}: 0.95 in ${T} s (supervised)`])),
  ...["hold", "ramp"].flatMap(w => ["F", "B", "L", "R", "FL", "FR", "BL", "BR"].flatMap(d => [5, 10, 15, 20].map(m => [`T8:${w}:R:${d}:${m}`, `T8 ${w === "hold" ? "hold" : "mid-ramp"} R: push ${d} ${m} N·s`]))),
  ...["F", "R", "L"].flatMap(d => [10, 15].map(m => [`T8:hold:R:${d}:${m}:nosup`, `T8 hold R: push ${d} ${m} N·s — NO supervisor`])),
  ...VARIATION_SET.map(h => [`T9:${h.id}`, `T9 ${h.id}: near-single-support cycle`]), ["T11:over:1.4", "T11 excessive λ_R 1.4"], ["T11:over:1.2", "T11 excessive λ_R 1.2"], ["T11:over:1.4:sup", "T11 excessive λ_R 1.4 (supervised)"], ["T11:fast:0.25", "T11 rate: 0.97 in 0.25 s"],
  ["FA", "diag: heel ↔ forefoot on the stance foot (spec 3.2)"], ...[1, 2, 3].map(s => [`PS:${s}`, `diag: perturbed start ${s} (spec 3.5)`]), ["Y:0.95:2", "diag: 2 N·m pelvis yaw torque at 95 % (transverse stiffness)"]];
const CLS_COL = { bilateral: "#9aa1ad", partial: "#5aa0ff", strong: "#b48cff", "near-single-support": "#4cd27a", unloaded: "#ffd34d", "contact loss": "#ff6b5b" };
const PHASE_COL = { QUIET: "#4cd27a", RECOVERY: "#ffd34d", EXHAUSTED: "#ff9a3c", FALLEN: "#ff5b5b" };
const bodyColor = (b) => { if (b.side === "L") return [0.32, 0.55, 0.95]; if (b.side === "R") return [0.95, 0.42, 0.32]; return { pelvis: [0.55, 0.72, 0.5], abdomen: [0.5, 0.66, 0.6], thorax: [0.45, 0.62, 0.68], head: [0.75, 0.68, 0.5] }[b.name] || [0.6, 0.6, 0.6]; };
const ST = { key: "T5", human: "V2-REF", playing: false, speed: 1, acc: 0, cam: { yaw: 20, pitch: 12, dist: 3.0, target: [0, 0.8, 0], fov: 0.62, follow: true }, joint: "hip_R",
  show: { bodies: true, colliders: false, com: true, xi: true, cop: true, support: true, grf: true, push: true, L: false, pieces: true, contacts: false, hud: true } };
const CAMS = { front: { yaw: 0, pitch: 6, dist: 3.0 }, side: { yaw: 90, pitch: 6, dist: 3.0 }, three: { yaw: 40, pitch: 16, dist: 3.0 }, top: { yaw: 0, pitch: 88, dist: 2.6 }, feet: { yaw: 25, pitch: 35, dist: 1.1 } };
let J = null, NODE = null, SPEC = null, SIM = null, MESH = [], dirty = true, done = false, HIST = [];
async function init() {
  J = await loadJolt(new URL("../vendor/jolt-physics.wasm-compat.js", import.meta.url).href);
  try { NODE = await (await fetch(new URL("../../../../review_artifacts/physical_character_v2/g3/json/" + (QCFG.results || "g3_results.json"), import.meta.url))).json(); } catch (e) { NODE = null; }
  for (const [k, t] of LIST) $("scen").add(new Option(t, k)); for (const h of VARIATION_SET) $("human").add(new Option(`${h.id} (${h.H} m, ${h.M} kg)`, h.id));
  $("scen").value = ST.key; $("human").value = ST.human; $("scen").onchange = () => { ST.key = $("scen").value; build(); }; $("human").onchange = () => { ST.human = $("human").value; build(); };
  $("play").onclick = () => toggle(); $("step").onclick = () => { ST.playing = false; tick(1); updPlay(); }; $("restart").onclick = () => build(); $("speed").onchange = () => { ST.speed = +$("speed").value; };
  $("seek").oninput = () => seek(+$("seek").value / 1000 * SIM.N);
  for (const k of Object.keys(ST.show)) { const el = $("t_" + k); if (!el) continue; el.checked = ST.show[k]; el.onchange = () => { ST.show[k] = el.checked; dirty = true; }; }
  for (const k of Object.keys(CAMS)) $("c_" + k).onclick = () => { Object.assign(ST.cam, CAMS[k], { follow: k !== "feet" ? false : true }); dirty = true; }; $("c_follow").onclick = () => { ST.cam.follow = true; dirty = true; };
  orbit();
}
function toggle() { if (done) build(); ST.playing = !ST.playing; updPlay(); }
function updPlay() { $("play").textContent = ST.playing ? "❚❚ pause" : "▶ play"; $("play").classList.toggle("on", ST.playing); }
function defOf() { const d = g3Def(ST.key); return d; }
function build() {
  if (SIM) SIM.destroy(); const d = defOf(); if (d.human) { ST.human = d.human; $("human").value = d.human; }
  SPEC = generateSpec(VARIATION_SET.find(h => h.id === ST.human)); SIM = new G3Sim(J, SPEC, d, {}); done = false; ST.acc = 0; HIST = [];
  MESH = SPEC.bodies.map((b, i) => R.mesh(SIM.w.bodyTriangles(i)));
  $("joint").innerHTML = ""; for (const j of SPEC.joints) $("joint").add(new Option(j.name, j.name)); $("joint").value = ST.joint; $("joint").onchange = () => { ST.joint = $("joint").value; dirty = true; };
  $("hash").textContent = "run the scenario to the end to compare"; $("hash").className = "mono"; dirty = true; nodePanel();
}
function tick(n) { for (let i = 0; i < n; i++) { if (!SIM.tick()) { finish(); break; } const r = SIM.g3.last; if (r) HIST.push([r.t, r.lam, r.load[1], r.cls, r.yaw]); } dirty = true; }
function seek(n) { const was = ST.playing; build(); ST.playing = false; tick(Math.round(n)); ST.playing = was && !done; updPlay(); }
function nodeRun(k = ST.key, h = ST.human) { if (!NODE) return null; return NODE.jobs.find(j => j.res && j.key === k && (j.human === h || (g3Def(k).human === h)) && !j.stand && !j.stance && !j.sup && j.group !== "determinism" && j.group !== "snapshot") || null; }
function nodePanel() { const j = nodeRun(); if (!j) { $("node").innerHTML = `<div class="hdr warn">no Node run for this combination</div>`; return; } const r = j.res, a = r.g3, okc = r.outcome === "stood" || r.outcome === "recovered";
  const hs = Object.entries(a.holds).slice(0, 4).map(([k, h]) => `${k}: min ${h.loadMin.toFixed(3)} mean ${h.loadMean.toFixed(3)}, other ≤ ${(h.otherMaxBW * 100).toFixed(1)} % BW`).join("<br>");
  $("node").innerHTML = `<div class="hdr ${okc ? "ok" : "warn"}">Node final run: ${r.outcome}${a.abortT != null ? ` · supervisor abort at ${a.abortT.toFixed(2)} s` : ""}</div><div class="note">hash ${r.hash} · tracking RMS ${a.trackRms != null ? a.trackRms.toFixed(3) : "—"} · slip ${Math.max(...a.feet.map(f => f.slipMm)).toFixed(2)} mm · pelvis roll ${a.pelvisRollMaxDeg.toFixed(1)}° · trunk lean ${a.trunkLeanMaxDeg.toFixed(1)}° · yaw max ${a.yawMaxDeg.toFixed(1)}°${a.twistMaxDeg ? ` · ankle ab/adduction twist ${a.twistMaxDeg.ankleFabd.map(x => x.toFixed(1)).join("/")}°` : ""}<br>${hs}</div>`; }
function finish() { if (done) return; done = true; ST.playing = false; updPlay(); const r = SIM.g3summary(), j = nodeRun(); const ok = j && j.res.hash === r.hash;
  $("hash").className = "mono " + (j ? (ok ? "ok" : "bad") : ""); $("hash").innerHTML = j ? `<b>${ok ? "BROWSER = NODE" : "BROWSER ≠ NODE"}</b><br>browser ${r.hash} · node ${j.res.hash}` : `browser ${r.hash} (no Node run for this combination)`; }
// ── render ──
function frame() {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio; if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; ov.width = canvas.width; ov.height = canvas.height; }
  const S = SIM.st, I = SIM.ctrl.info, row = SIM.lastRow, G3 = SIM.g3.last, L = [], push = (a, b, col) => L.push(a[0], a[1], a[2], ...col, b[0], b[1], b[2], ...col), labels = [], y0 = 0.002;
  const com = I.c; if (ST.cam.follow) ST.cam.target = ST.cam.dist < 1.5 ? [(S[SIM.ctrl.feet[0]].pos[0] + S[SIM.ctrl.feet[1]].pos[0]) / 2, 0.05, (S[SIM.ctrl.feet[0]].pos[2] + S[SIM.ctrl.feet[1]].pos[2]) / 2] : [com[0], Math.max(0.5, com[1] * 0.8), com[2]];
  const c = ST.cam, cp = Math.cos(c.pitch / D), eye = [c.target[0] + c.dist * Math.sin(c.yaw / D) * cp, c.target[1] + c.dist * Math.sin(c.pitch / D), c.target[2] + c.dist * Math.cos(c.yaw / D) * cp];
  R.begin({ eye, target: c.target, fov: c.fov }, canvas.width, canvas.height);
  for (let i = -20; i <= 20; i++) { const cx = Math.round(com[0] * 2) / 2, cz = Math.round(com[2] * 2) / 2, x = cx + i * 0.1, z = cz + i * 0.1, col = i % 5 === 0 ? [0.42, 0.45, 0.48, 0.9] : [0.28, 0.3, 0.33, 0.7]; push([x, 0, cz - 2], [x, 0, cz + 2], col); push([cx - 2, 0, z], [cx + 2, 0, z], col); }
  const sph = (p, r, col) => { if (!sph.m) sph.m = R.icosphere(1, 2); R.drawMesh(sph.m, R.m4.trs(p, [0, 0, 0, 1], r), col); };
  SPEC.bodies.forEach((b, i) => { const M = R.m4.trs(S[i].pos, S[i].rot), col = bodyColor(b); if (ST.show.bodies) R.drawMesh(MESH[i], M, [...col, 0.85]); if (ST.show.colliders) for (let k = 0; k < MESH[i].edges.length; k += 2) push(V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k])), V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k + 1])), [...col, 0.8]); });
  const g = (p) => [p[0], y0, p[1]];
  if (ST.show.support) { const poly = (P, col) => { for (let k = 0; k < P.length; k++) push(g(P[k]), g(P[(k + 1) % P.length]), col); }; poly(I.support, [0.95, 0.95, 0.95, 0.95]);
    I.polys.forEach((P, n) => { const unl = I.unl && I.unl[n], inS = !I.inSup || I.inSup[n]; poly(P, !inS ? [1, 0.35, 0.3, 0.95] : unl ? [1, 0.8, 0.25, 0.95] : [0.55, 0.75, 1, 0.8]); }); }
  if (ST.show.com) { sph(com, 0.02, [1, 0.2, 0.85, 1]); push(com, [com[0], 0, com[2]], [1, 0.3, 0.9, 0.7]); }
  if (ST.show.xi) { sph(g(I.xi), 0.012, [1, 0.6, 0.1, 1]); sph(g(I.xiRef), 0.008, [0.6, 0.6, 0.6, 1]); push(g(I.xiRef), g(I.xi), [1, 0.6, 0.1, 0.9]); labels.push({ p: g(I.xi), t: "ξ", c: "#fa3" }); }
  if (ST.show.cop) { sph(g(I.p), 0.01, [0.3, 1, 1, 1]); if (I.r[0] || I.r[1]) push(g(I.p), g(I.pRaw), [1, 0.3, 0.3, 1]); if (row.cop) { sph(g(row.cop), 0.009, [1, 1, 1, 1]); labels.push({ p: g(row.cop), t: "CoP", c: "#fff" }); }
    if (SIM.probeRows) SIM.probeRows.forEach(pr => { if (pr && pr.cop) sph([pr.cop[0], y0, pr.cop[2]], 0.006, [0.85, 0.85, 0.85, 1]); }); }
  if (ST.show.grf && SIM.probeRows) SIM.probeRows.forEach(pr => { if (pr && pr.cop && pr.JyN > 2) { const F = pr.Jc.map(x => x / pr.dt), mg = SIM.ctrl.M * 9.81; push(pr.cop, V.add(pr.cop, V.sc(F, 0.8 / mg)), [0.3, 1, 0.5, 1]); } });
  if (ST.show.pieces && SIM.probes) SIM.probes.forEach((P, n) => { const fi = P.fi, rows = SIM.probeRows && SIM.probeRows[n]; if (!rows) return; for (const pc of rows.pieces) { const pp = P.pieces.find(x => x.sub === pc.sub), lo = pp.P.reduce((a, q) => (q[1] < a[1] ? q : a), pp.P[0]), wp = V.add(S[fi].pos, Q.rot(S[fi].rot, [pp.cx, lo[1], pp.cz]));
    sph(wp, pc.touch ? 0.005 : 0.003, pc.touch ? [0.3, 0.55, 1, 1] : pc.spec ? [0.6, 0.6, 0.6, 0.9] : [0.25, 0.25, 0.25, 0.5]); } });
  if (ST.show.push && SIM.lastDist && SIM.lastDist.body >= 0 && SIM.lastDist.at) { const F = SIM.lastDist.F, at = SIM.lastDist.at; push(V.sub(at, V.sc(F, 0.0015)), at, [1, 0.25, 0.25, 1]); labels.push({ p: at, t: `push ${V.len(F).toFixed(0)} N`, c: "#f66", bg: true }); }
  if (ST.show.L && row.L) push(com, V.add(com, V.sc(row.L, 0.05)), [0.8, 0.5, 1, 1]);
  if (ST.show.contacts) for (const k of SIM.lastContacts || []) for (const p of k.pts2) sph(p, k.depth > -0.0005 ? 0.005 : 0.003, k.depth > -0.0005 ? [1, 0.83, 0.3, 1] : [0.48, 0.51, 0.56, 0.8]);
  R.drawLines(L); g2.clearRect(0, 0, ov.width, ov.height); g2.font = `${12 * dpr}px ui-sans-serif, system-ui`;
  for (const lb of labels) { const s = R.project(lb.p, ov.width, ov.height); if (!s) continue; if (lb.bg) { const wd = g2.measureText(lb.t).width; g2.fillStyle = "rgba(0,0,0,0.6)"; g2.fillRect(s[0] + 4, s[1] - 13 * dpr, wd + 6, 16 * dpr); } g2.fillStyle = lb.c; g2.fillText(lb.t, s[0] + 6, s[1]); }
  g2.fillStyle = "rgba(255,255,255,0.8)"; g2.fillText(`${SPEC.human.id} · ${SIM.def.title} · t = ${row.t.toFixed(3)} s${done ? " (end)" : ""}`, 10 * dpr, 20 * dpr);
  if (G3) { const cl = G3.cls, side = G3.side, txt = cl === "bilateral" ? "BILATERAL SUPPORT" : `${cl.toUpperCase()} — on the ${side === "R" ? "RIGHT" : "LEFT"} foot`;
    g2.fillStyle = CLS_COL[cl]; g2.fillRect(10 * dpr, 30 * dpr, 12 * dpr, 12 * dpr); g2.font = `bold ${15 * dpr}px ui-sans-serif, system-ui`; g2.fillText(txt, 28 * dpr, 42 * dpr);
    g2.font = `${12 * dpr}px ui-sans-serif, system-ui`; g2.fillStyle = PHASE_COL[row.phase]; g2.fillText(`balance: ${row.phase}${SIM.ctrl.g3 && SIM.ctrl.g3.aborted != null ? ` · SUPERVISOR ABORT at ${SIM.ctrl.g3.aborted.toFixed(2)} s → bilateral` : ""}`, 28 * dpr, 60 * dpr);
    if (ST.show.hud) hud(G3, dpr); }
  panels(); $("clock").textContent = `t = ${row.t.toFixed(3)} s · tick ${SIM.n} / ${SIM.N} · ${SIM.cfg.hz} Hz · ${SIM.cfg.velSteps} it`; $("seek").value = Math.round(SIM.n / SIM.N * 1000);
}
// per-foot load bars (measured, % of the total vertical force) with the requested share marked; touching pieces and held / unloaded flags
function hud(r, dpr) { const W = ov.width, H = ov.height, bw = 38 * dpr, bh = Math.min(240 * dpr, H * 0.42), x0 = W - 2 * bw - 46 * dpr, yb = H - 44 * dpr;
  g2.fillStyle = "rgba(20,22,26,0.75)"; g2.fillRect(x0 - 12 * dpr, yb - bh - 52 * dpr, 2 * bw + 50 * dpr, bh + 86 * dpr);
  [0, 1].forEach(n => { const x = x0 + n * (bw + 22 * dpr), ld = r.load[n], req = n === 1 ? r.lam : 1 - r.lam;
    g2.strokeStyle = "#555"; g2.lineWidth = dpr; g2.strokeRect(x, yb - bh, bw, bh); g2.fillStyle = r.touch[n] === 0 ? "#ff6b5b" : r.Fz[n] <= 0.01 * SIM.ctrl.M * 9.81 ? "#ffd34d" : ld >= 0.95 ? "#4cd27a" : ld >= 0.85 ? "#b48cff" : ld >= 0.6 ? "#5aa0ff" : "#9aa1ad";
    g2.fillRect(x, yb - bh * Math.max(0, Math.min(1, ld)), bw, bh * Math.max(0, Math.min(1, ld)));
    const yr = yb - bh * Math.max(0, Math.min(1, req)); g2.strokeStyle = "#ffd34d"; g2.lineWidth = 2 * dpr; g2.beginPath(); g2.moveTo(x - 6 * dpr, yr); g2.lineTo(x + bw + 6 * dpr, yr); g2.stroke();
    for (const t of [0.6, 0.85, 0.95]) { const yy = yb - bh * t; g2.strokeStyle = "rgba(255,255,255,0.25)"; g2.lineWidth = dpr; g2.beginPath(); g2.moveTo(x, yy); g2.lineTo(x + bw, yy); g2.stroke(); }
    g2.fillStyle = "#e7e9ee"; g2.font = `bold ${13 * dpr}px ui-sans-serif, system-ui`; g2.fillText(`${(ld * 100).toFixed(1)}%`, x - 2 * dpr, yb - bh - 30 * dpr); g2.font = `${11 * dpr}px ui-sans-serif, system-ui`;
    g2.fillText(`${n ? "R" : "L"} ${r.Fz[n].toFixed(0)} N`, x - 2 * dpr, yb - bh - 16 * dpr); g2.fillText(`${r.touch[n]}/8 pcs`, x - 2 * dpr, yb - bh - 3 * dpr); g2.fillText(n ? "right" : "left", x + 4 * dpr, yb + 14 * dpr); if (r.unl && r.unl[n]) { g2.fillStyle = "#ffd34d"; g2.fillText("HELD", x + 4 * dpr, yb + 26 * dpr); } });
  g2.fillStyle = "#ffd34d"; g2.fillText("— requested", x0 - 6 * dpr, yb + 38 * dpr); }
function panels() { const I = SIM.ctrl.info, row = SIM.lastRow, r = SIM.g3.last, res = SIM.actRes || [], f = (x, n = 1) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(n)), hd = I.heading, lat = [hd[1], -hd[0]], rel = (p) => [(p[0] - I.mid[0]) * lat[0] + (p[1] - I.mid[1]) * lat[1], (p[0] - I.mid[0]) * hd[0] + (p[1] - I.mid[1]) * hd[1]];
  if (!r) return; const W = SIM.ctrl.M * 9.81, a = SIM.g3, tw = a.twMax;
  const xr = [["requested λ_R", `<b style="color:#ffd34d">${f(r.lam * 100, 1)} %</b>`], ["measured load L / R", `<b>${f(r.load[0] * 100, 1)} / ${f(r.load[1] * 100, 1)} %</b> (${r.Fz.map(x => f(x, 0)).join(" / ")} N; ${f((r.Fz[0] + r.Fz[1]) / W * 100, 0)} % BW)`],
    ["class", `<b style="color:${CLS_COL[r.cls]}">${r.cls}</b>${r.cls !== "bilateral" ? " on " + r.side : ""}`], ["touching pieces L / R", `${r.touch.join(" / ")} of 8`], ["in support L / R · held (unloaded)", `${r.inSup.map(x => (x ? "yes" : "NO")).join(" / ")} · ${r.unl.map(x => (x ? "HELD" : "—")).join(" / ")}`],
    ["supervisor", SIM.ctrl.g3 && SIM.ctrl.g3.aborted != null ? `<span style="color:#ffd34d">ABORT at ${f(SIM.ctrl.g3.aborted, 2)} s → bilateral (ξ in two-foot hull: ${SIM.ctrl.g3.bilateralOk})</span>` : SIM.def.supervise ? "continuing" : "off"],
    ["foot slip L / R", `${r.slip.map(x => f(x * 1000, 2)).join(" / ")} mm`]];
  $("xfer").innerHTML = xr.map(x => `<tr><td>${x[0]}</td><td class="mono">${x[1]}</td></tr>`).join("");
  const L = SIM.ledger, rows = [["phase", `<b style="color:${PHASE_COL[row.phase]}">${row.phase}</b>`], ["ξ − target (right, fwd)", `${rel([row.xi[0] - I.xiRef[0] + I.mid[0], row.xi[1] - I.xiRef[1] + I.mid[1]]).map(x => f(x * 100)).join(", ")} cm`],
    ["ξ margin to support edge", `${f(row.marginXi * 100)} cm`], ["CoP command (right, fwd of mid-ankle)", `${rel(I.p).map(x => f(x * 100)).join(", ")} cm${I.r[0] || I.r[1] ? ` · residual ${f(Math.hypot(I.r[0], I.r[1]) * 100)} cm` : ""}`],
    ["CoP measured", row.cop ? `${rel(row.cop).map(x => f(x * 100)).join(", ")} cm` : "—"], ["pelvis roll · trunk lean · pelvis yaw", `${f(r.pelRoll, 2)}° · ${f(r.trunkLean, 2)}° · ${f(r.yaw, 2)}°`],
    ["leg twist max (ankle ab/add L/R · hip rot L/R)", tw ? `${f(tw[0])} / ${f(tw[1])}° · ${f(tw[4])} / ${f(tw[5])}°` : "—"], ["COM height · speed", `${f(I.c[1], 3)} m · ${f(Math.hypot(I.v[0], I.v[2]) * 100)} cm/s`],
    ["whole-body angular momentum", `${row.L ? f(V.len(row.L), 3) : "—"} N·m·s`], ["ledger: active work · damping · test impulse", `${f(L.Wact, 2)} J · ${f(L.damping, 2)} J · ${f(V.len(L.Jext), 1)} N·s`], ["authority writes", `${L.authorityWrites}`]];
  $("live").innerHTML = rows.map(x => `<tr><td>${x[0]}</td><td class="mono">${x[1]}</td></tr>`).join("");
  const top = res.slice().sort((p, q) => q.frac - p.frac).slice(0, 12);
  $("act").innerHTML = `<tr><th>axis</th><th>τ N·m</th><th>% cap</th></tr>` + top.map(x => `<tr${x.sat ? ' style="color:#ff6b5b"' : ""}><td>${SPEC.joints[x.k].name}.${SPEC.joints[x.k].def.axes["xyz"[x.i]].key}</td><td class="mono">${f(x.tau, 1)}</td><td class="mono"><span class="bar" style="width:${Math.min(100, x.frac * 100)}px"></span> ${f(x.frac * 100, 0)}${x.sat ? " SAT" : ""}</td></tr>`).join("");
  const k = SPEC.joints.findIndex(j => j.name === ST.joint), P = SIM.P, d = P.jd[k], q = SIM.up.ev.qs[k], keys = ["x", "y", "z"].map(x => d.j.def.axes[x]).filter(Boolean), qr = SIM.ctrl.qref[k];
  $("jt").innerHTML = `<tr><th>${ST.joint}</th><th>actual °</th><th>stance ref °</th></tr>` + keys.map(ax => `<tr><td>${ax.key}${ax.passiveOnly ? " (passive)" : ""}</td><td class="mono">${f(P.anat(d, q, ax.key))}</td><td class="mono">${f(P.anat(d, qr, ax.key))}</td></tr>`).join("");
  const c = $("plot"), pg = c.getContext("2d"), w = c.width = c.clientWidth * devicePixelRatio, h = c.height = c.clientHeight * devicePixelRatio; pg.clearRect(0, 0, w, h); if (HIST.length < 2) return;
  const T = SIM.N * SIM.dt, sx = (t) => t / T * w, sy = (v) => h - 8 - Math.max(0, Math.min(1.05, v)) / 1.05 * (h - 12);
  for (let i = 1; i < HIST.length; i += 2) { pg.fillStyle = CLS_COL[HIST[i][3]]; pg.fillRect(sx(HIST[i - 1][0]), h - 6, Math.max(1, sx(HIST[i][0]) - sx(HIST[i - 1][0]) + 1), 6); }
  for (const lv of [0.5, 0.85, 0.95]) { pg.strokeStyle = "rgba(255,255,255,0.12)"; pg.beginPath(); pg.moveTo(0, sy(lv)); pg.lineTo(w, sy(lv)); pg.stroke(); }
  for (const [k2, col, fn] of [[1, "#ffd34d", (v) => sy(v)], [2, "#ffffff", (v) => sy(v)], [4, "#f88", (v) => h / 2 - 8 - (v / 10) * (h / 2 - 12)]]) { pg.strokeStyle = col; pg.lineWidth = devicePixelRatio; pg.beginPath(); HIST.forEach((rr, i) => { const X = sx(rr[0]), Y = fn(rr[k2]); i ? pg.lineTo(X, Y) : pg.moveTo(X, Y); }); pg.stroke(); } }
function orbit() {
  let drag = null; canvas.onmousedown = (e) => { drag = { x: e.clientX, y: e.clientY }; e.preventDefault(); }; window.onmouseup = () => { drag = null; };
  window.onmousemove = (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; ST.cam.yaw -= dx * 0.4; ST.cam.pitch = Math.max(-80, Math.min(89, ST.cam.pitch + dy * 0.3)); dirty = true; };
  canvas.onwheel = (e) => { ST.cam.dist = Math.max(0.3, Math.min(12, ST.cam.dist * Math.exp(e.deltaY * 0.001))); dirty = true; e.preventDefault(); };
  window.onkeydown = (e) => { if (e.target.tagName === "SELECT") return; const k = { 1: "front", 2: "side", 3: "three", 4: "top", 6: "feet" }[e.key]; if (k) { Object.assign(ST.cam, CAMS[k], { follow: k === "feet" }); dirty = true; } if (e.key === "5") { ST.cam.follow = true; dirty = true; }
    if (e.key === " ") { toggle(); e.preventDefault(); } if (e.key === ".") { ST.playing = false; tick(1); updPlay(); } if (e.key === "r") build(); };
}
function loop() { if (ST.playing && SIM) { ST.acc += ST.speed * SIM.cfg.hz / 60; const n = Math.floor(ST.acc); ST.acc -= n; if (n > 0) tick(n); } if (dirty && SIM) { dirty = false; frame(); } requestAnimationFrame(loop); }
window.addEventListener("resize", () => { dirty = true; });
init().then(async () => {
  if (qp.get("tickhash")) {   // DIAGNOSTIC (cross-engine determinism): per-tick physics hash + controller probe values of one scenario → window.__H
    const k = qp.get("tickhash"), d = g3Def(k), s = new G3Sim(J, generateSpec(VARIATION_SET.find(x => x.id === (d.human || "V2-REF"))), d, {}); window.__H = [];
    while (s.tick()) { const I = s.ctrl.info; window.__H.push([s.n, s.h >>> 0, I.pRaw[0], I.pRaw[1], I.xi[0], I.xi[1], I.lam, s.ctrl.g3 ? s.ctrl.g3.out : 0, (qp.get("dump") || "").split("-").map(Number).length === 2 && s.n >= +qp.get("dump").split("-")[0] && s.n <= +qp.get("dump").split("-")[1] ? { plan: s.aplan.joints.map(j => j.rows.map(r => (r && !r.off ? [r.tau0, r.K, r.D, r.hi, r.lo] : null))), ik: s.ctrl.ikRes, unl: s.ctrl.unl.slice(), sense: s.ctrl.sense, st: s.st.map(b => [...b.pos, ...b.rot, ...b.v, ...b.w]) } : null]); if (s.g2acc.fallT != null && s.n * s.dt > s.g2acc.fallT + 0.5) break; }
    s.destroy(); $("hash").textContent = "tickhash done " + window.__H.length; document.body.dataset.ready = "1"; return; }
  if (qp.get("check")) { const rows = [], KEYS = qp.get("keys") ? qp.get("keys").split("|") : CURATED;
    for (const k of KEYS) { await new Promise(r => setTimeout(r, 0)); const d = g3Def(k), s = new G3Sim(J, generateSpec(VARIATION_SET.find(x => x.id === (d.human || "V2-REF"))), d, qOpts()); while (s.tick()) { if (s.g2acc.fallT != null && s.n * s.dt > s.g2acc.fallT + 0.5) break; }
      const hb = s.g3summary().hash, nd = NODE && NODE.jobs.find(j => j.group === "determinism" && j.rep === 0 && j.key === k && j.res); rows.push({ k, b: hb, n: nd ? nd.res.hash : "—" }); s.destroy(); $("hash").textContent = `checking … ${rows.length}/${KEYS.length}`; }
    const all = rows.every(r => r.b === r.n); $("hash").className = "mono " + (all ? "ok" : "bad"); $("hash").innerHTML = `<b id="hash-status">${all ? "BROWSER = NODE" : "BROWSER ≠ NODE"}</b> (${rows.filter(r => r.b === r.n).length}/${rows.length})<br>` + rows.map(r => `${r.b === r.n ? "✓" : "✗"} ${r.k}: ${r.b} / ${r.n}`).join("<br>");
    document.body.dataset.ready = "1"; return; }
  if (qp.get("human")) { ST.human = qp.get("human"); $("human").value = ST.human; } if (qp.get("scenario")) { ST.key = qp.get("scenario"); if (![...$("scen").options].some(o => o.value === ST.key)) $("scen").add(new Option(ST.key, ST.key)); $("scen").value = ST.key; } if (qp.get("joint")) ST.joint = qp.get("joint");
  for (const k of (qp.get("show") || "").split(",").filter(Boolean)) { ST.show[k] = true; if ($("t_" + k)) $("t_" + k).checked = true; } for (const k of (qp.get("hide") || "").split(",").filter(Boolean)) { ST.show[k] = false; if ($("t_" + k)) $("t_" + k).checked = false; }
  build(); if (qp.get("t")) { ST.playing = false; tick(Math.round(+qp.get("t") * SIM.cfg.hz)); }
  const cam = qp.get("cam"); if (cam && CAMS[cam]) Object.assign(ST.cam, CAMS[cam], { follow: cam === "feet" || !qp.get("nofollow") }); for (const k of ["dist", "yaw", "pitch"]) if (qp.get(k)) ST.cam[k] = +qp.get(k);
  dirty = false; frame(); loop(); document.body.dataset.ready = "1";
}).catch(e => { document.body.dataset.ready = "error"; $("hash").textContent = "ERROR: " + (e && e.stack || e); console.error(e); });

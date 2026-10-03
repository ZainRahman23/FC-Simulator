// ═══ physchar2/viewer/v2_g1_viewer.js — V2-G1 passive-physics review page (presentation only; the simulation is the gate's own G1Sim) ═══
import { V, Q } from "../core/v2_math.js";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { VARIATION_SET } from "../spec/v2_human.js";
import { BONES } from "../spec/v2_skeleton.js";
import { bindData, evaluateSkeleton } from "../map/v2_render_map.js";
import { G1Sim, SCENARIOS, SCENARIO_ORDER, HS_ORDER, CURATED, ESSENTIAL, G1_WORLD } from "../gates/v2_g1.js";
import { scenarioChecks, hsChecks } from "../gates/v2_g1_checks.js";
import { engineLimits } from "../spec/v2_joints.js";
import { DX_CONFIGS, applyMods } from "../gates/v2_g1_dx.js";
import { createGL } from "./v2_gl.js";
import { AnkleProbe } from "../gates/v2_g1_ankle.js";

const $ = (id) => document.getElementById(id), D = 180 / Math.PI;
const canvas = $("gl"), ov = $("ov"), R = createGL(canvas), g2 = ov.getContext("2d"), plot = $("plot"), pg = plot.getContext("2d");
const bodyColor = (b) => { if (b.side === "L") return [0.32, 0.55, 0.95]; if (b.side === "R") return [0.95, 0.42, 0.32]; return { pelvis: [0.55, 0.72, 0.5], abdomen: [0.5, 0.66, 0.6], thorax: [0.45, 0.62, 0.68], head: [0.75, 0.68, 0.5] }[b.name] || [0.6, 0.6, 0.6]; };
const ST = { key: "upright", human: "V2-REF", cfg: "ref", playing: false, speed: 1, acc: 0, cam: { yaw: 35, pitch: 14, dist: 3.4, target: [0, 0.6, 0], fov: 0.62, follow: true }, joint: "knee_R",
  show: { bodies: true, skeleton: false, colliders: false, centres: true, axes: false, limits: false, contacts: true, normals: true, pen: true, com: true, coms: false, vel: false, ground: true, names: false } };
let PROBE = null, PSIDE = null, J = null, NODE = null, SPEC = null, SIM = null, MESH = [], BIND = null, dirty = true, done = false, REFCFG = { velSteps: G1_WORLD.velSteps }, CAND_MARGINS = null;
const checksFor = (r, key) => (SCENARIOS[key].group === "envelope" ? hsChecks(r, SCENARIOS[key]) : scenarioChecks(r, SCENARIOS[key]));
PSIDE = ((p) => (p === "L" || p === "R" ? p : null))(new URLSearchParams(location.search).get("probe"));
const CAMS = { front: { yaw: 0, pitch: 6 }, side: { yaw: 90, pitch: 6 }, three: { yaw: 35, pitch: 16 }, top: { yaw: 0, pitch: 88 } };
const CONFIGS = () => ({ ref: { label: `G1 gate — validated baseline (240 Hz, ${REFCFG.velSteps} velocity iterations, 10-piece boot)`, cfg: { ...REFCFG }, mods: [] },
  "DX-PREV": { label: "diagnostic: previous baseline (C3 two-piece boot, 60 iterations)", ...pick("DX-PREV") }, "DX-C3": { label: "diagnostic: C3 two-piece boot (150 iterations)", ...pick("DX-C3") },
  "DX-R1": { label: "diagnostic: the approved single boot hull", ...pick("DX-R1") }, "DX-60": { label: "diagnostic: 60 velocity iterations", ...pick("DX-60") },
  "DX-W0": { label: "diagnostic: warm starting off", ...pick("DX-W0") } });
const pick = (id) => { const d = DX_CONFIGS.find(x => x.id === id); return { cfg: { ...REFCFG, ...d.cfg }, mods: d.mods || [], dx: id }; };

async function init() {
  J = await loadJolt(new URL("../vendor/jolt-physics.wasm-compat.js", import.meta.url).href);
  try { NODE = await (await fetch(new URL("../../../../review_artifacts/physical_character_v2/g1/json/g1_results.json", import.meta.url))).json(); REFCFG = { velSteps: NODE.reference.velSteps }; } catch (e) { NODE = null; }
  try { CAND_MARGINS = (await (await fetch(new URL("../../../../review_artifacts/physical_character_v2/g1/json/g1_margins_candidate.json", import.meta.url))).json()).table; } catch (e) { CAND_MARGINS = null; }
  const order = [...CURATED, ...SCENARIO_ORDER.filter(k => !CURATED.includes(k)), ...HS_ORDER];
  for (const k of order) $("scen").add(new Option(`${CURATED.includes(k) ? "★ " : ""}${SCENARIOS[k].title}`, k));
  for (const h of VARIATION_SET) $("human").add(new Option(`${h.id} (${h.H} m, ${h.M} kg)`, h.id));
  for (const [k, c] of Object.entries(CONFIGS())) $("cfg").add(new Option(c.label, k));
  $("scen").value = ST.key; $("human").value = ST.human; $("cfg").value = ST.cfg;
  $("scen").onchange = () => { ST.key = $("scen").value; build(); }; $("human").onchange = () => { ST.human = $("human").value; build(); }; $("cfg").onchange = () => { ST.cfg = $("cfg").value; build(); };
  $("play").onclick = () => toggle(); $("step").onclick = () => { ST.playing = false; tick(1); updPlay(); }; $("restart").onclick = () => build(); $("speed").onchange = () => { ST.speed = +$("speed").value; };
  $("seek").oninput = () => seek(+$("seek").value / 1000 * SIM.N);
  for (const k of Object.keys(ST.show)) { const el = $("t_" + k); if (!el) continue; el.checked = ST.show[k]; el.onchange = () => { ST.show[k] = el.checked; dirty = true; }; }
  for (const k of Object.keys(CAMS)) $("c_" + k).onclick = () => { Object.assign(ST.cam, CAMS[k], { follow: false }); dirty = true; };
  $("c_follow").onclick = () => { ST.cam.follow = true; dirty = true; };
  orbit(); build(); if (!new URLSearchParams(location.search).get("check")) loop();   // check mode: no render loop, so a headless run goes idle (virtual time) once the hashes are in
}
function toggle() { if (done) build(); ST.playing = !ST.playing; updPlay(); }
function updPlay() { $("play").textContent = ST.playing ? "❚❚ pause" : "▶ play"; $("play").classList.toggle("on", ST.playing); }
function build() {
  if (SIM) SIM.destroy(); const h = VARIATION_SET.find(x => x.id === ST.human), C = CONFIGS()[ST.cfg];
  const HZ = +new URLSearchParams(location.search).get("hz"); if (HZ) C.cfg = { ...C.cfg, hz: HZ };   // review: ?hz= shows a scenario at another physics rate (D4a)
  SPEC = applyMods(generateSpec(h), C.mods); if (C.cand && CAND_MARGINS) for (const j of SPEC.joints) j.limits.engine = engineLimits(j, CAND_MARGINS); BIND = bindData(SPEC); SIM = new G1Sim(J, SPEC, ST.key, { cfg: C.cfg, series: true }); done = false; ST.acc = 0;
  PROBE = PSIDE ? new AnkleProbe(SIM, PSIDE) : null; $("probe_box").style.display = PROBE ? "" : "none";   // ?probe=L|R: foot / ankle instrument (measurement only: reads the state after each tick)
  MESH = SPEC.bodies.map((b, i) => R.mesh(SIM.w.bodyTriangles(i)));
  $("joint").innerHTML = ""; for (const j of SPEC.joints) $("joint").add(new Option(j.name, j.name)); $("joint").value = ST.joint; $("joint").onchange = () => { ST.joint = $("joint").value; dirty = true; };
  $("scnote").textContent = SCENARIOS[ST.key].note; $("hash").textContent = "run the scenario to the end to compare"; $("hash").className = "mono"; $("live_checks").textContent = "—";
  nodePanel(); dirty = true;
}
function tick(n) { for (let i = 0; i < n; i++) { if (PROBE) PROBE.before(); if (!SIM.tick()) { if (PROBE) PROBE.pre = null; finish(); break; } if (PROBE) PROBE.after(); } dirty = true; }
function seek(n) { const was = ST.playing; build(); ST.playing = false; tick(Math.round(n)); ST.playing = was && !done; updPlay(); }
function finish() { if (done) return; done = true; ST.playing = false; updPlay(); const r = SIM.summary(), cs = checksFor(r, ST.key), nr = nodeRun();
  const ok = nr && nr.hash === r.hash; $("hash").className = "mono " + (nr ? (ok ? "ok" : "bad") : ""); $("hash").innerHTML = nr ? `<b>${ok ? "BROWSER = NODE" : "BROWSER ≠ NODE"}</b><br>browser ${r.hash} · node ${nr.hash}` : `browser ${r.hash} (no Node run for this combination)`;
  $("live_checks").innerHTML = checksHtml(cs, `browser run: ${cs.filter(c => c.pass || c.reportOnly).length}/${cs.length} pass`); }
// Node results for this scenario / body / configuration
function nodeRun() { if (!NODE) return null; const C = CONFIGS()[ST.cfg], env = SCENARIOS[ST.key].group === "envelope";
  if (C.cand) { const c = NODE.candidate; if (!c) return null; return (env ? c.envelope : c.runs).find(r => r.human === ST.human && r.key === ST.key) || null; }
  if (env) return ST.human === "V2-REF" && !C.dx ? (NODE.envelope || []).find(r => r.key === ST.key) || null : null;
  if (C.dx) { if (ST.human !== "V2-REF") return null; const d = NODE.diagnostics.find(x => x.id === C.dx); const r = d && d.runs.find(x => x.key === ST.key); return r ? { hash: r.hash, dx: r } : null; }
  return NODE.runs.find(r => r.human === ST.human && r.key === ST.key) || null; }
function checksHtml(cs, head) { const nF = cs.filter(c => !c.pass && !c.reportOnly).length;
  return `<div class="hdr ${nF ? "bad" : "ok"}">${head}${nF ? ` — ${nF} FAIL` : ""}</div>` + cs.map(c => `<div class="chk ${c.pass ? "" : "bad"}"><b>${c.pass ? (c.reportOnly ? "REPORT" : "PASS") : "FAIL"} ${c.id}</b> ${c.name}<br><span>${c.value}</span> <i>[${c.limit}]</i></div>`).join(""); }
function nodePanel() { const r = nodeRun(); if (!r) { $("node").innerHTML = `<div class="hdr warn">no Node run for this combination${NODE ? "" : " (run tools/g1_run.js)"}</div>`; return; }
  if (r.dx) { $("node").innerHTML = `<div class="hdr ${r.dx.pass ? "ok" : "bad"}">diagnostic ${CONFIGS()[ST.cfg].dx}: ${r.dx.pass ? "passes" : "fails " + r.dx.failing.join(", ")}</div><div class="note">rise ${r.dx.rise.toFixed(2)} J · sep ${r.dx.sep.toFixed(1)} mm · hard ${r.dx.hard.toFixed(1)}° · turf ${r.dx.turf.toFixed(1)} / rest ${r.dx.turfRest.toFixed(1)} mm · hash ${r.hash}</div>`; return; }
  $("node").innerHTML = checksHtml(r.checks, `Node gate (${r.human}, ${NODE.reference.velSteps} it): ${r.checks.filter(c => c.pass || c.reportOnly).length}/${r.checks.length} pass · hash ${r.hash}`); }
// ── render ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function frame() {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio; if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; ov.width = canvas.width; ov.height = canvas.height; }
  const S = SIM.st, H = SPEC.human.H, L = [], push = (a, b, col) => L.push(a[0], a[1], a[2], ...col, b[0], b[1], b[2], ...col), labels = [];
  const com = SIM.last.com, fb = ST.cam.followBody != null ? SPEC.bodies.findIndex(b => b.name === ST.cam.followBody) : -1;
  if (fb >= 0) ST.cam.target = S[fb].com.slice(); else if (ST.cam.follow) ST.cam.target = [com[0], Math.max(0.35, com[1]), com[2]];
  const c = ST.cam, cp = Math.cos(c.pitch / D), eye = [c.target[0] + c.dist * Math.sin(c.yaw / D) * cp, c.target[1] + c.dist * Math.sin(c.pitch / D), c.target[2] + c.dist * Math.cos(c.yaw / D) * cp];
  R.begin({ eye, target: c.target, fov: c.fov }, canvas.width, canvas.height);
  if (ST.show.ground) { const cx = Math.round(com[0] * 2) / 2, cz = Math.round(com[2] * 2) / 2; for (let i = -20; i <= 20; i++) { const x = cx + i * 0.1, z = cz + i * 0.1, col = i % 5 === 0 ? [0.42, 0.45, 0.48, 0.9] : [0.28, 0.3, 0.33, 0.7]; push([x, 0, cz - 2], [x, 0, cz + 2], col); push([cx - 2, 0, z], [cx + 2, 0, z], col); } }
  const sph = (p, r, col) => { if (!sph.m) sph.m = R.icosphere(1, 2); R.drawMesh(sph.m, R.m4.trs(p, [0, 0, 0, 1], r), col); };
  SPEC.bodies.forEach((b, i) => { const M = R.m4.trs(S[i].pos, S[i].rot), col = bodyColor(b);
    if (ST.show.bodies) R.drawMesh(MESH[i], M, [...col, ST.show.skeleton ? 0.5 : 0.9]); else if (ST.show.colliders) R.drawMesh(MESH[i], M, [...col, 0.15]);
    if (ST.show.colliders) for (let k = 0; k < MESH[i].edges.length; k += 2) push(V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k])), V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k + 1])), [...col.map(x => Math.min(1, x + 0.25)), 0.85]);
    if (ST.show.names) labels.push({ p: V.add(S[i].pos, Q.rot(S[i].rot, b.comLocal)), t: b.name, c: "#fff" });
    if (ST.show.coms) sph(V.add(S[i].pos, Q.rot(S[i].rot, b.comLocal)), 0.009 * H / 1.82, [0.95, 0.25, 0.9, 1]);
    if (ST.show.vel) { const cw = S[i].com; push(cw, V.add(cw, V.sc(S[i].v, 0.1)), [0.35, 0.6, 1, 1]); push(cw, V.add(cw, V.sc(S[i].w, 0.05)), [1, 0.4, 0.85, 1]); } });
  if (ST.show.skeleton) { const W = evaluateSkeleton(SPEC, BIND, S); for (const bone of BONES) { const p = W[bone.name].pos; sph(p, 0.006 * H / 1.82, [1, 0.82, 0.15, 1]); if (bone.parent && bone.parent !== "root") push(W[bone.parent].pos, p, [1, 0.85, 0.2, 1]); } }
  const at = (j) => V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, V.sub(j.at, SPEC.bodies[j.parentIndex].origin)));
  if (ST.show.centres) for (const j of SPEC.joints) sph(at(j), 0.012 * H / 1.82, [0.97, 0.97, 0.97, 1]);
  if (ST.show.axes) for (const j of SPEC.joints) { const p = at(j), l = 0.08, F1w = Q.mul(S[j.parentIndex].rot, j.F1), F2w = Q.mul(S[j.childIndex].rot, j.F2);
    push(p, V.add(p, V.sc(Q.rot(F2w, [1, 0, 0]), l)), [1, 0.3, 0.3, 1]); push(p, V.add(p, V.sc(Q.rot(F1w, [0, 1, 0]), l)), [0.3, 1, 0.3, 1]); if (!j.locked.includes("z")) push(p, V.add(p, V.sc(Q.rot(F1w, [0, 0, 1]), l * 0.8)), [0.35, 0.55, 1, 1]); }
  if (ST.show.limits) { const j = SPEC.joints.find(x => x.name === ST.joint); if (j) drawLimits(j, S, push, at(j), labels); }
  if (PROBE && PROBE.rows.length) probeOverlay(PROBE.rows.at(-1), S, push, sph, labels, H);
  // contacts of the last step (pre-solve manifolds): points, normals, depth
  const C = SIM.lastContacts || [], slop = SPEC.contact.slop; let deepest = null;
  if (ST.show.contacts || ST.show.normals || ST.show.pen) for (const k of C) { const col = k.depth > slop ? [1, 0.3, 0.3, 1] : k.depth > -0.0005 ? [1, 0.83, 0.3, 1] : [0.48, 0.51, 0.56, 0.8];
    for (const p of k.pts2) { if (ST.show.contacts) sph(p, k.depth > -0.0005 ? 0.007 : 0.004, col); if (ST.show.normals && k.depth > -0.0005) push(p, V.add(p, V.sc(k.normal, k.a < 0 || k.b < 0 ? 0.12 : 0.08)), col); }
    if (!deepest || k.depth > deepest.depth) deepest = k; }
  if (ST.show.pen && deepest && deepest.depth > 0.002) labels.push({ p: deepest.pts2[0], t: `${(deepest.depth * 1000).toFixed(1)} mm ${name(deepest.a)}–${name(deepest.b)}`, c: deepest.depth > slop ? "#ff6b5b" : "#ffd34d", bg: true });
  if (ST.show.com) { sph(com, 0.022 * H / 1.82, [1, 0.2, 0.85, 1]); push(com, [com[0], 0, com[2]], [1, 0.3, 0.9, 0.9]); }
  if (ST.show.ground) { if (!frame.turf) frame.turf = R.mesh(new Float32Array([-3, 0, -3, 3, 0, -3, 3, 0, 3, -3, 0, -3, 3, 0, 3, -3, 0, 3])); const cx = Math.round(com[0] * 2) / 2, cz = Math.round(com[2] * 2) / 2;
    R.drawMesh(frame.turf, R.m4.trs([cx, 0, cz], [0, 0, 0, 1], 1), [0.24, 0.42, 0.28, 0.55], { light: [0, 1, 0] }); }
  R.drawLines(L);
  g2.clearRect(0, 0, ov.width, ov.height);
  for (const lb of labels) { const s = R.project(lb.p, ov.width, ov.height); if (!s) continue; g2.font = `${12 * dpr}px ui-sans-serif, system-ui`; if (lb.bg) { const wd = g2.measureText(lb.t).width; g2.fillStyle = "rgba(0,0,0,0.6)"; g2.fillRect(s[0] + 4, s[1] - 13 * dpr, wd + 6, 16 * dpr); } g2.fillStyle = lb.c; g2.fillText(lb.t, s[0] + 6, s[1]); }
  g2.fillStyle = "rgba(255,255,255,0.8)"; g2.font = `${12 * dpr}px ui-sans-serif, system-ui`;
  g2.fillText(`${SPEC.human.id} · ${SCENARIOS[ST.key].title} · ${CONFIGS()[ST.cfg].label} · t = ${SIM.last.t.toFixed(3)} s${done ? " (end)" : ""}`, 10 * dpr, 20 * dpr);
  readout(); drawPlot(); if (PROBE) probePanel(); $("clock").textContent = `t = ${SIM.last.t.toFixed(3)} s · tick ${SIM.n} / ${SIM.N} · ${SIM.cfg.hz} Hz · ${SIM.cfg.velSteps} velocity iterations`; $("seek").value = Math.round(SIM.n / SIM.N * 1000);
}
const name = (i) => (i < 0 ? "turf" : SPEC.bodies[i].name), sub = (i, k) => (i >= 0 && SPEC.bodies[i].shapes.length > 1 ? `[${k}]` : "");
function drawLimits(j, S, push, p, labels) {
  const F1w = Q.mul(S[j.parentIndex].rot, j.F1), child = SPEC.bodies[j.childIndex], vLoc = child.distal ? V.sub(child.distal, child.origin) : /^foot/.test(child.name) ? [0, -0.04, child.boot.tipAheadAJC] : [0, child.length * 0.8, 0];
  const q = SIM.up.ev.per[j.index].q, tw = 2 * Math.atan2(q[0], q[3]), pyr = (t, sy, sz) => Q.norm(Q.mul(Q.norm([0, Math.tan(sy / 2), Math.tan(sz / 2), 1]), Q.axis([1, 0, 0], t)));
  const dirAt = (sy, sz) => V.add(p, Q.rot(Q.mul(Q.mul(F1w, pyr(tw, sy, sz)), Q.conj(j.F2)), vLoc));
  for (const [box, col] of [[j.limits.hard, [1, 0.25, 0.25, 0.95]], [j.limits.soft, [1, 0.75, 0.2, 0.9]]]) { const [y0, z0] = [box.lo[1], box.lo[2]], [y1, z1] = [box.hi[1], box.hi[2]], P = [], N = 20;
    for (let i = 0; i <= N; i++) P.push([y0 + (y1 - y0) * i / N, z0]); for (let i = 0; i <= N; i++) P.push([y1, z0 + (z1 - z0) * i / N]); for (let i = 0; i <= N; i++) P.push([y1 - (y1 - y0) * i / N, z1]); for (let i = 0; i <= N; i++) P.push([y0, z1 - (z1 - z0) * i / N]);
    for (let i = 1; i < P.length; i++) push(dirAt(...P[i - 1]), dirAt(...P[i]), col); }
  push(p, V.add(S[j.childIndex].pos, Q.rot(S[j.childIndex].rot, vLoc)), [1, 1, 1, 1]);
  const th = SIM.up.ev.per[j.index].th; labels.push({ p: V.add(p, [0.03, 0.03, 0]), t: `${j.name} θ = (${th.map(x => (x * D).toFixed(1)).join(", ")})° hard [${j.limits.hard.lo.map(x => (x * D).toFixed(0))}]…[${j.limits.hard.hi.map(x => (x * D).toFixed(0))}]`, c: "#ddd", bg: true });
}
function readout() { const l = SIM.last, A = SIM.A, cnt = (SIM.lastContacts || []).filter(c => c.depth > -0.0005);
  const rows = [["E = KE + PE + U", `${l.E.toFixed(2)} J (ΔE from start ${(l.E - A.E[0]).toFixed(2)})`], ["KE / PE / U", `${l.ke.toFixed(2)} / ${l.pe.toFixed(1)} / ${l.U.toFixed(3)} J`], ["damping loss (cum.)", `${SIM.Dcum.toFixed(2)} J`],
    ["COM", l.com.map(x => x.toFixed(3)).join(", ") + " m"], ["max joint separation now / run", `${(l.sepMax * 1000).toFixed(2)} / ${(A.sepMax * 1000).toFixed(2)} mm`], ["max hard-limit excursion now / run", `${(l.hardExc * D).toFixed(2)} / ${(A.hardExcMax * D).toFixed(2)}°`],
    ["turf penetration now / run (geometry)", `${(l.pen * 1000).toFixed(1)} / ${(A.turfPenMax * 1000).toFixed(1)} mm`], ["self-penetration run max", `${(A.selfPenMax * 1000).toFixed(1)} mm`], ["contacts touching", `${cnt.length} (${cnt.filter(c => c.a < 0 || c.b < 0).length} turf)`], ["max body speed (run)", `${A.maxSpeed.toFixed(2)} m/s`]];
  $("live").innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join("");
  $("ctab").innerHTML = `<tr><th>pair</th><th>depth mm</th><th>μ</th><th>normal</th></tr>` + cnt.sort((a, b) => b.depth - a.depth).slice(0, 14).map(c => `<tr><td>${name(c.a)}${sub(c.a, c.sa)} – ${name(c.b)}${sub(c.b, c.sb)}</td><td>${(c.depth * 1000).toFixed(1)}</td><td>${c.mu}</td><td>${c.normal.map(x => x.toFixed(2)).join(",")}</td></tr>`).join(""); }
function drawPlot() { const s = SIM.series, w = plot.width = plot.clientWidth * devicePixelRatio, h = plot.height = plot.clientHeight * devicePixelRatio; pg.clearRect(0, 0, w, h); if (!s || s.t.length < 2) return;
  const E0 = s.E[0], T = SIM.N * SIM.dt, ser = [[s.E.map(x => x - E0), "#fff"], [s.KE, "#6cf"], [s.U, "#fc6"], [s.D.map(x => -x), "#f77"]];
  let lo = 0, hi = 0; for (const [a] of ser) for (const x of a) { lo = Math.min(lo, x); hi = Math.max(hi, x); } const sy = (v) => h - 6 - (v - lo) / Math.max(1e-6, hi - lo) * (h - 12), sx = (t) => t / T * w;
  pg.strokeStyle = "#333"; pg.beginPath(); pg.moveTo(0, sy(0)); pg.lineTo(w, sy(0)); pg.stroke();
  for (const [a, col] of ser) { pg.strokeStyle = col; pg.lineWidth = devicePixelRatio; pg.beginPath(); a.forEach((v, i) => { const X = sx(s.t[i]), Y = sy(v); i ? pg.lineTo(X, Y) : pg.moveTo(X, Y); }); pg.stroke(); }
  pg.fillStyle = "#9aa1ad"; pg.font = `${10 * devicePixelRatio}px ui-sans-serif`; pg.fillText(`${hi.toFixed(0)} J`, 4, 12 * devicePixelRatio); pg.fillText(`${lo.toFixed(0)} J`, 4, h - 4); }
// ── ankle probe (?probe=L|R): CoP, turf force, the CoP → ankle strut line, piece contact states, torque decomposition ──
function probeOverlay(r, S, push, sph, labels, H) {
  const fi = PROBE.fi, ank = S[fi].pos, F = r.Jc.map(x => x / r.dt), Fn = Math.hypot(...F), mg = SPEC.bodies.reduce((a, b) => a + b.mass, 0) * 9.81;
  if (r.cop && r.JyN > 20) { const cop = r.cop; sph(cop, 0.011, [1, 0.2, 0.9, 1]);
    push(cop, V.add(cop, V.sc(F, 0.5 / mg)), [1, 0.35, 0.95, 1]);                                       // turf force on the foot, 0.5 m = body weight
    push(cop, ank, [0.4, 1, 1, 0.9]);                                                                    // strut line CoP → ankle (aligned with the force = torque-free)
    labels.push({ p: V.add(cop, [0.02, 0.05, 0]), t: `CoP ${(r.copFrac * 100).toFixed(0)} % · F ${Fn.toFixed(0)} N · line of action ${(Math.abs(r.McA_pitch) / Fn * 1000).toFixed(0)} mm from ankle`, c: "#f9c", bg: true }); }
  const pcs = PROBE.pieces, Rq = S[fi].rot; for (const pc of r.pieces) { const P = pcs.find(x => x.sub === pc.sub); if (!P) continue; const lo = P.P.reduce((a, q) => (q[1] < a[1] ? q : a), P.P[0]), wp = V.add(ank, Q.rot(Rq, [P.cx, lo[1], P.cz]));
    sph(wp, pc.touch ? 0.006 : 0.004, pc.touch ? [0.3, 0.55, 1, 1] : pc.spec ? [0.6, 0.6, 0.6, 0.9] : [0.25, 0.25, 0.25, 0.5]); }
  sph(ank, 0.013, [0.4, 1, 1, 1]);
  labels.push({ p: V.add(ank, [0.03, 0.08, 0]), t: `foot_${PROBE.side}: heel ${r.heelMm.toFixed(0)} mm · pitch ${r.pitchDeg.toFixed(1)}° · ankle ${r.dfDeg.toFixed(1)}° (${r.dfDeg >= 0 ? "DF" : "PF"})`, c: "#9ff", bg: true });
}
function probePanel() { const R = PROBE.rows, r = R.at(-1); if (!r) { $("probe").innerHTML = ""; return; } const i0 = R.findIndex(x => x.pieces.some(p => p.touch)), cum = (k) => (i0 < 0 ? 0 : R.slice(i0).reduce((a, x) => a + x[k], 0));
  const f = (x, n = 1) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(n)), Fn = Math.hypot(r.JyN, r.JxzN);
  const rows = [["heel / forefoot / ankle height", `${f(r.heelMm, 0)} / ${f(r.foreMm, 1)} / ${f(r.ankleYmm, 0)} mm`], ["foot pitch (+ heel up) · rate", `${f(r.pitchDeg)}° · ${f(r.footPitchRate, 2)} rad/s`], ["shank tilt · knee flexion", `${f(r.shankPitchDeg)}° · ${f(r.kneeDeg, 0)}°`],
    ["ankle DF (+) / PF (−) · ω_DF", `${f(r.dfDeg)}° · ${f(r.wDF, 2)} rad/s`], ["turf force on foot vertical / horizontal", `${f(r.JyN, 0)} / ${f(r.JxzN, 0)} N`], ["CoP along boot (0 heel → 1 toe)", r.copFrac != null && r.JyN > 20 ? `${f(r.copFrac, 2)} (ankle at ${f(-PROBE.z0 / PROBE.len, 2)})` : "—"],
    ["contact moment about ankle (+ heel up)", `${f(r.McA_pitch, 2)} N·m${Fn > 20 ? ` · line of action ${f(Math.abs(r.McA_pitch) / Fn * 1000, 0)} mm` : ""}`],
    ["ankle drive applied (DF+)", `${f(r.motorDF, 2)} N·m`], ["… elastic law · end-stop part", `${f(r.lawTau, 2)} · ${f(r.stopTau, 2)} N·m`], ["… damping", `${f(r.dampDF, 2)} N·m`], ["emergency stop (Jolt limit)", `${f(r.limDF, 2)} N·m${r.limAny ? " ACTIVE" : ""}`],
    ["ankle elastic energy U", `${f(r.U_ankle, 3)} J`], ["work on foot since contact: shank point / ankle rows / turf+self", `${f(cum("W_point"), 2)} / ${f(cum("W_rows"), 2)} / ${f(cum("W_ext"), 2)} J`],
    ["boot pieces touching (speculative)", `${r.pieces.filter(p => p.touch).map(p => p.sub).join(" ") || "—"} (${r.pieces.filter(p => p.spec && !p.touch).map(p => p.sub).join(" ") || "—"})`], ["other manifolds on the foot", r.otherContacts.join(", ") || "—"]];
  $("probe").innerHTML = rows.map(x => `<tr><td>${x[0]}</td><td class="mono">${x[1]}</td></tr>`).join("");
  const c = $("aplot"), g = c.getContext("2d"), w = c.width = c.clientWidth * devicePixelRatio, h = c.height = c.clientHeight * devicePixelRatio; g.clearRect(0, 0, w, h); if (R.length < 2) return;
  const T0 = R[0].t, T1 = Math.max(R.at(-1).t, T0 + 0.5), sx = (t) => (t - T0) / (T1 - T0) * w, ser = [["heelMm", 0, 300, "#9ff"], ["pitchDeg", 0, 90, "#fff"], ["dfDeg", -80, 20, "#fc6"], ["JyN", 0, 1500, "#f9c"], ["motorDF", -40, 120, "#7f7"]];
  for (const [k, lo, hi, col] of ser) { g.strokeStyle = col; g.lineWidth = devicePixelRatio; g.beginPath(); R.forEach((x, i) => { const Y = h - 4 - (Math.max(lo, Math.min(hi, x[k])) - lo) / (hi - lo) * (h - 8), X = sx(x.t); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); }
}
function orbit() {
  let drag = null; canvas.onmousedown = (e) => { drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 }; e.preventDefault(); }; canvas.oncontextmenu = (e) => e.preventDefault(); window.onmouseup = () => { drag = null; };
  window.onmousemove = (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) { ST.cam.follow = false; const s = ST.cam.dist * 0.0015, yw = ST.cam.yaw / D, r = [-Math.cos(yw), 0, Math.sin(yw)]; ST.cam.target = V.add(V.add(ST.cam.target, V.sc(r, dx * s)), [0, dy * s, 0]); }
    else { ST.cam.yaw -= dx * 0.4; ST.cam.pitch = Math.max(-80, Math.min(89, ST.cam.pitch + dy * 0.3)); } dirty = true; };
  canvas.onwheel = (e) => { ST.cam.dist = Math.max(0.3, Math.min(12, ST.cam.dist * Math.exp(e.deltaY * 0.001))); dirty = true; e.preventDefault(); };
  window.onkeydown = (e) => { if (e.target.tagName === "SELECT") return; const k = { 1: "front", 2: "side", 3: "three", 4: "top" }[e.key]; if (k) { Object.assign(ST.cam, CAMS[k], { follow: false }); dirty = true; }
    if (e.key === "5") { ST.cam.follow = true; dirty = true; } if (e.key === " ") { toggle(); e.preventDefault(); } if (e.key === ".") { ST.playing = false; tick(1); updPlay(); } if (e.key === "r") build(); };
}
function loop() { if (ST.playing && SIM) { ST.acc += ST.speed * SIM.cfg.hz / 60; const n = Math.floor(ST.acc); ST.acc -= n; if (n > 0) tick(n); } if (dirty && SIM) { dirty = false; frame(); } requestAnimationFrame(loop); }
window.addEventListener("resize", () => { dirty = true; });
// URL parameters for scripted captures / the headless browser = Node check:
//   ?scenario=&human=&cfg=ref|DX-PREV|DX-C3|DX-R1|DX-60|DX-W0&t=<s>&cam=front|side|three|top|follow&dist=&yaw=&pitch=&show=a,b&hide=a,b&joint=   ·   ?check=1 runs every curated scenario
//   ?probe=L|R  foot / ankle instrument overlay (CoP, turf force, CoP → ankle strut line, boot pieces, torque decomposition) — e.g. ?scenario=drop1m&probe=R&t=0.6&cam=side
const qp = new URLSearchParams(location.search);
init().then(async () => {
  if (qp.get("check")) { const C = CONFIGS().ref, rows = [], KEYS = qp.get("keys") ? qp.get("keys").split(",") : CURATED; for (const k of KEYS) { await new Promise(r => setTimeout(r, 0)); const spec = generateSpec(VARIATION_SET.find(x => x.id === "V2-REF")), s = new G1Sim(J, spec, k, { cfg: C.cfg }); while (s.tick()); const n = NODE && NODE.runs.find(r => r.human === "V2-REF" && r.key === k);
      rows.push({ k, b: s.h.toString(16).padStart(8, "0"), n: n ? n.hash : "—" }); s.destroy(); $("hash").textContent = `checking … ${rows.length}/${KEYS.length}`; }
    const all = rows.every(r => r.b === r.n); $("hash").className = "mono " + (all ? "ok" : "bad"); $("hash").innerHTML = `<b id="hash-status">${all ? "BROWSER = NODE" : "BROWSER ≠ NODE"}</b> (${rows.filter(r => r.b === r.n).length}/${rows.length} curated scenarios, V2-REF, reference configuration)<br>` + rows.map(r => `${r.b === r.n ? "✓" : "✗"} ${r.k}: ${r.b}${r.b === r.n ? "" : " vs Node " + r.n}`).join("<br>"); }
  if (qp.get("human")) { ST.human = qp.get("human"); $("human").value = ST.human; } if (qp.get("cfg")) { ST.cfg = qp.get("cfg"); $("cfg").value = ST.cfg; }
  if (qp.get("scenario")) { ST.key = qp.get("scenario"); $("scen").value = ST.key; } if (qp.get("joint")) ST.joint = qp.get("joint");
  for (const k of (qp.get("show") || "").split(",").filter(Boolean)) { ST.show[k] = true; if ($("t_" + k)) $("t_" + k).checked = true; }
  for (const k of (qp.get("hide") || "").split(",").filter(Boolean)) { ST.show[k] = false; if ($("t_" + k)) $("t_" + k).checked = false; }
  if (qp.get("human") || qp.get("cfg") || qp.get("scenario")) build();
  if (qp.get("t")) { ST.playing = false; tick(Math.round(+qp.get("t") * SIM.cfg.hz)); }
  const cam = qp.get("cam"); if (cam && CAMS[cam]) Object.assign(ST.cam, CAMS[cam], { follow: !!qp.get("follow") }); if (cam === "follow") ST.cam.follow = true;
  for (const k of ["dist", "yaw", "pitch"]) if (qp.get(k)) ST.cam[k] = +qp.get(k);
  if (qp.get("focus")) ST.cam.followBody = qp.get("focus");
  if (qp.get("target")) { ST.cam.target = qp.get("target").split(",").map(Number); ST.cam.follow = false; }
  dirty = false; frame(); if (PROBE) $("probe_box").scrollIntoView(); document.body.dataset.ready = "1";
}).catch(e => { document.body.dataset.ready = "error"; $("hash").textContent = "ERROR: " + (e && e.stack || e); console.error(e); });

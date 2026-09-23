// ═══ anim3d/of_scene.js — OUTFIELD RIG SCENE: line-up review + population benchmark on the live Touchline scene (review / benchmark tooling) ═══
// ?ofScene=lineup[&motion=WALK|RUN|STAND|READY|SINGLE_LEG|PUNT|TURN][&facing=deg]   six generic bodies in a row, the same motion, gameplay camera
// ?ofScene=bench&n=22[&motion=RUN][&fps=60]                                       N generic bodies (bodies cycle through the six) running deterministic
//   laps in front of the camera; per-frame timing split (mover / animation+IK / render submission / GPU when the timer extension exists),
//   draw calls, triangles, vertices, bones, memory. OF.report() returns the running summary. No RNG (positions from the index), no
//   simulation coupling (a tiny deterministic mover stands in for the authoritative displacement; it is INPUT to the presentation).
const OF = { on: false, mode: null, actors: [], acc: 0, stats: null, motion: "RUN", n: 0, R: null, gpuTimer: null, t: 0, frame: 0 };
function ofSceneWanted() { return new URLSearchParams(location.search).get("ofScene"); }
function ofSceneBoot() {
  const mode = ofSceneWanted(); if (!mode) return; const q = new URLSearchParams(location.search);
  const start = () => {
    const el = document.getElementById("loading"); if (!(el && el.style.display === "none" && typeof draw === "function")) { setTimeout(start, 150); return; }
    S.pb.playing = false; RIG.mode = "manual"; RIG.manualX = 88; RIG.x = 88; RIG.targetX = 88; RIG.zoom = q.get("zoom") ? +q.get("zoom") : 1.25; RIG.zoomTarget = RIG.zoom;
    OF.mode = mode; OF.motion = (q.get("motion") || (mode === "lineup" ? "WALK" : "RUN")).toUpperCase(); OF.n = +(q.get("n") || 6); OF.facing = q.get("facing") != null ? +q.get("facing") * DEG : Math.PI / 2; OF.char = (q.get("char") || "generic").toLowerCase();
    if (OF.char === "courtois") { const e = typeof GK_CHAR !== "undefined" ? GK_CHAR.get("COURTOIS") : null; if (!e || e.status !== "ready") { if (e && e.status === "idle") gkCharLoad("COURTOIS").catch(() => {}); setTimeout(start, 150); return; } }   // Courtois clones: the finished character's own program per actor (the current production path)
    OF.R = glCreateRenderer(); const gl = OF.R.gl; OF.gpuTimer = gl.getExtension("EXT_disjoint_timer_query_webgl2") || null;
    OF.actors = []; const mk = (id, x, y, f) => { if (OF.char !== "courtois") return ofActorMake(id, x, y, f); const e = GK_CHAR.get("COURTOIS"), skel = gkCharSkeleton(e); const B = skel.byName; skel.legLen = B.thigh_R.len + B.shin_R.len; skel.ankleH = skel.contact.foot.soleBelowAnkleM; skel.hipY = B.pelvis.off[1]; skel.morph = { id: "COURTOIS" }; return { body: "COURTOIS", skel, x, y, facing: f, speed: 0, phase: 0, state: { feet: {} }, motion: "STAND", entry: e }; };
    if (mode === "lineup") { OF_BODY_ORDER.forEach((id, i) => { const a = mk(id, 92 + (i - 2.5) * 1.35, 34, OF.facing); a.motion = OF.motion === "WALK" || OF.motion === "RUN" || OF.motion === "TURN" ? "LOCO" : OF.motion; a.lane = i; OF.actors.push(a); }); }
    else { for (let i = 0; i < OF.n; i++) { const id = OF_BODY_ORDER[i % OF_BODY_ORDER.length]; const a = mk(id, 84 + (i % 6) * 2.6, 24 + Math.floor(i / 6) * 4.5, Math.PI); a.motion = OF.motion === "WALK" || OF.motion === "RUN" ? "LOCO" : OF.motion; a.lane = i; a.lap = { cx: 84 + (i % 6) * 2.6, cy: 24 + Math.floor(i / 6) * 4.5, r: 3.0 + (i % 3) * 0.6, w: (OF.motion === "RUN" ? 5.5 : 1.4) / (3.0 + (i % 3) * 0.6), ph: i * 0.7 }; OF.actors.push(a); } }
    OF.stats = { frames: 0, t0: performance.now(), sim: [], anim: [], submit: [], gpu: [], frame: [], draws: 0, tris: 0, verts: 0, bones: 0, meshes: 0, mem: [] };
    const _draw = draw; draw = function (sample, dt) { _draw(sample, dt); ofSceneFrame(OF.paused ? 0 : dt); }; OF.on = true;   // OF.paused: the page loop only re-composites the last solved state; capture tools advance with ofSceneStep() console.log("[of_scene]", mode, OF.motion, OF.actors.length, "actors; gpu timer", !!OF.gpuTimer);
  };
  start();
}
function ofSceneFrame(dt) {
  const st = OF.stats; const tA0 = performance.now(); const step = 1 / 60; OF.acc += Math.min(0.05, dt); let nSteps = 0; if (OF.paused) OF.acc = 0;
  // 1. the stand-in "simulation": a deterministic mover advances every actor's authoritative root / facing / speed at 60 Hz (INPUT to the presentation)
  const t0s = performance.now();
  while (OF.acc >= step) { OF.acc -= step; OF.t += step; nSteps++;
    for (const a of OF.actors) { if (OF.mode === "lineup") { if (a.motion === "LOCO") { const v = OF.motion === "RUN" ? 5.5 : OF.motion === "TURN" ? 1.2 : 1.4; a.speed = v; if (OF.motion === "TURN") a.facing = OF.facing + Math.sin(OF.t * 1.2) * 1.2; a.x += Math.cos(a.facing) * v * step * 0; a.y += 0; } continue; }   // line-up: treadmill (root fixed; the gait still plants and the IK exposes the slide as the diagnostic)
      const L = a.lap, ang = L.ph + OF.t * L.w; const nx = L.cx + Math.cos(ang) * L.r, ny = L.cy + Math.sin(ang) * L.r; a.facing = Math.atan2(ny - a.y, nx - a.x); a.speed = Math.hypot(nx - a.x, ny - a.y) / step; a.x = nx; a.y = ny; } }
  const tSim = performance.now() - t0s;
  // 2. animation + retarget + contact solve + skin matrices (per actor, per simulated step only when a step happened; otherwise the last solve is reused)
  const t0a = performance.now(); if (nSteps > 0 || !OF.actors[0].sol) for (const a of OF.actors) ofActorTick(a, step, OF.t); const tAnim = performance.now() - t0a;
  // 3. render submission: every actor in ONE pass (one skinned draw per actor), composited over the 2D frame at the canvas density
  const t0r = performance.now(); let q = null; if (OF.gpuTimer) { q = OF.R.gl.createQuery(); OF.R.gl.beginQuery(OF.gpuTimer.TIME_ELAPSED_EXT, q); }
  let out, drawsTot = 0;
  if (OF.char === "courtois") {                                                                  // the production path: one ROI layer render per character (own FBO clear, 4-sample resolve, ROI composite)
    ctx.save(); ctx.imageSmoothingEnabled = false;
    for (const a of OF.actors) { const roi = gkCharROI(a.sol.fk, a.skel, null, cv.width, cv.height, RES, 0.45); const o = gkCharRender(OF.R, a.entry, a.skinMats, roi, RES, cv.width, cv.height, RES, null); drawsTot += o.draws; ctx.drawImage(o.canvas, 0, 0, o.w, o.h, roi.x * RES, roi.y * RES, roi.w * RES, roi.h * RES); }
    ctx.restore(); out = { draws: drawsTot };
  } else {
    const prevChar = GL3D.character; GL3D.character = "SKINNED"; const chars = OF.actors.map(a => ({ skel: a.skel, fk: a.sol.fk, skinMats: a.skinMats, palette: SKEL_PARTS }));
    out = glRenderCharacters(OF.R, chars, cv.width, cv.height, {}); GL3D.character = prevChar;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(out.canvas, 0, 0, out.w, out.h, 0, 0, cv.width, cv.height); ctx.restore();
  }
  if (q) { OF.R.gl.endQuery(OF.gpuTimer.TIME_ELAPSED_EXT); (OF.pendingQ = OF.pendingQ || []).push(q); }
  const tSubmit = performance.now() - t0r;
  if (OF.pendingQ) { const gl = OF.R.gl; while (OF.pendingQ.length && gl.getQueryParameter(OF.pendingQ[0], gl.QUERY_RESULT_AVAILABLE)) { const qq = OF.pendingQ.shift(); if (!gl.getParameter(OF.gpuTimer.GPU_DISJOINT_EXT)) st.gpu.push(gl.getQueryParameter(qq, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(qq); } }
  // stats
  st.frames++; st.sim.push(tSim); st.anim.push(tAnim); st.submit.push(tSubmit); st.frame.push(performance.now() - tA0); for (const k of ["sim", "anim", "submit", "frame", "gpu"]) if (st[k].length > 1800) st[k].shift();
  st.draws = out.draws; st.meshes = OF.actors.length; st.verts = OF.char === "courtois" ? OF.actors.length * (OF.actors[0].entry.asset.vertices || 306504) : OF.actors.reduce((s, a) => s + (a.skel._glMesh ? a.skel._glMesh.nVerts : 0), 0); st.tris = OF.char === "courtois" ? OF.actors.length * (OF.actors[0].entry.asset.triangles || 102168) : OF.actors.reduce((s, a) => s + (a.skel._glMesh ? a.skel._glMesh.nTris : 0), 0); st.bones = OF.actors.length * 23;
  if (st.frames % 60 === 0 && performance.memory) st.mem.push(performance.memory.usedJSHeapSize / 1048576);
  if (OF.mode === "lineup" && S.dbg && S.dbg.ofLabels !== false) { ctx.save(); ctx.font = `${12 * RES}px Menlo`; ctx.fillStyle = "#ffe36a"; for (const a of OF.actors) { const sp = sproj3(a.x, 0, a.y); ctx.fillText(a.body + " " + a.skel.H.toFixed(2) + " m", sp.x - 30 * RES, sp.y + 14 * RES); } ctx.restore(); }
}
function ofReport() {
  const st = OF.stats; if (!st) return null; const mean = (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, p95 = (v) => { if (!v.length) return null; const s = v.slice().sort((a, b) => a - b); return s[Math.floor(s.length * 0.95)]; };
  const fs = S.frameStat || {}; const iv = fs.intervals || [];
  return { mode: OF.mode, motion: OF.motion, actors: OF.actors.length, frames: st.frames, seconds: +((performance.now() - st.t0) / 1000).toFixed(1), fps: +(st.frames / ((performance.now() - st.t0) / 1000)).toFixed(1), rafIntervalMs: iv.length ? +mean(iv).toFixed(2) : null, rafIntervalP95: iv.length ? +p95(iv).toFixed(2) : null, fpsCap: S.fpsCap || null,
    ms: { simMean: +mean(st.sim).toFixed(3), animMean: +mean(st.anim).toFixed(3), animP95: +p95(st.anim).toFixed(3), submitMean: +mean(st.submit).toFixed(3), submitP95: +p95(st.submit).toFixed(3), gpuMean: st.gpu.length ? +mean(st.gpu).toFixed(3) : null, gpuP95: st.gpu.length ? +p95(st.gpu).toFixed(3) : null, ofFrameMean: +mean(st.frame).toFixed(3), pageDrawMean: S.perfT && S.perfT.length ? +mean(S.perfT).toFixed(3) : null, pageDrawP95: S.perfT && S.perfT.length ? +p95(S.perfT).toFixed(3) : null },
    draws: st.draws, meshes: st.meshes, verts: st.verts, tris: st.tris, bones: st.bones, memMB: st.mem.length ? { first: +st.mem[0].toFixed(1), last: +st.mem[st.mem.length - 1].toFixed(1), max: +Math.max(...st.mem).toFixed(1) } : null, canvas: [cv.width, cv.height], gpuTimer: !!OF.gpuTimer };
}
window.addEventListener("load", () => setTimeout(ofSceneBoot, 300));

function ofSceneStep() {                                                                         // one deterministic 60 Hz step of the stand-in mover + animation (capture tools; the page loop is paused)
  const step = 1 / 60; OF.t += step;
  for (const a of OF.actors) { if (OF.mode === "lineup") { if (a.motion === "LOCO") { const v = OF.motion === "RUN" ? 5.5 : OF.motion === "TURN" ? 1.2 : 1.4; a.speed = v; if (OF.motion === "TURN") a.facing = OF.facing + Math.sin(OF.t * 1.2) * 1.2; } continue; }
    const L = a.lap, ang = L.ph + OF.t * L.w; const nx = L.cx + Math.cos(ang) * L.r, ny = L.cy + Math.sin(ang) * L.r; a.facing = Math.atan2(ny - a.y, nx - a.x); a.speed = Math.hypot(nx - a.x, ny - a.y) / step; a.x = nx; a.y = ny; }
  for (const a of OF.actors) ofActorTick(a, step, OF.t);
}

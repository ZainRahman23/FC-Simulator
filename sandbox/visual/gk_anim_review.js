// GOALKEEPER ANIMATION REVIEW PAGE (Animation V1.2) — drives the shared match.js runtime.
//   physics replay: a goal-line synthetic arrival (SAVE SIDE × contact height × lateral demand [× reach norm], ball speed) is
//                   fired through the real simulation (ptGkFire + the existing `synth` fixture); the runtime classifies and draws as in play.
//   art playback:   a chosen representation (clip frames, camera-space save pose for the SAVE SIDE, SET, diagnostic) is drawn at
//                   the keeper root with no physics (GK_ANIM.reviewOverride); RAW authored placement vs bounded IK.
// Nothing here writes simulation state except firing the fixture and pausing/stepping the deterministic loop.
(function () {
  const RV = { gside: "GOAL_LEFT", facing: "W", lat: 1.5, z: 1.0, depth: 0, v: 24, loop: false, family: null, ik: false, pos: 0, artPlay: true, fps: 10, lastSpec: null, t0: 0 };
  const FACING_DEG = { W: 180, SW: 135, NW: 225, S: 90, N: 270 };
  const CAND11 = { manifest: "../../review_artifacts/gk_anim_v1_1/poses/GK_POSES_CANDIDATES.json", root: "../../review_artifacts/gk_anim_v1_1/poses/" };
  const SAVEPOSES = { manifest: "../../review_artifacts/gk_anim_v1_2/save_poses/GK_SAVE_POSES_CANDIDATES.json", root: "../../review_artifacts/gk_anim_v1_2/save_poses/" };
  const $ = id => document.getElementById(id);
  function ready() { const el = $("loading"); return el && el.style.display === "none" && typeof ptEnter === "function" && S.gkAnim && S.gkAnim.loaded; }
  function camera(rail, zoom) { RIG.mode = "manual"; RIG.manualX = rail; RIG.targetX = rail; RIG.x = rail; RIG.zoom = zoom; RIG.zoomTarget = zoom; }
  function laty() { return RV.gside === "GOAL_LEFT" ? -RV.lat : RV.lat; }                       // −goal line (north) = GOAL_LEFT
  function spec() {
    const F = FACING_DEG[RV.facing] * Math.PI / 180, dist = 14, anchor = [101.7, 34];
    const origin = [anchor[0] + Math.cos(F) * dist, anchor[1] + Math.sin(F) * dist];
    return { name: "REVIEW " + RV.gside + " lat " + RV.lat + " z " + RV.z + " v " + RV.v + " facing " + RV.facing, origin, aim: [105, 34], tech: "LACES", c: 0.5, synth: { lat: laty(), z: RV.z, v: RV.v } };
  }
  function envNormFor(L, z) { const t = S.pt, gk = t && t.gk; if (!gk || typeof gkEnvelope !== "function") return null; const env = gkEnvelope(t, gk, gkHeightM(t, gk)); return { norm: gkEnvNorm(env, L, z), env }; }
  function latForNorm(norm, z) { const t = S.pt, gk = t && t.gk; if (!gk) return null; const env = gkEnvelope(t, gk, gkHeightM(t, gk)); const dz = z - env.comfortZ, vMax = dz >= 0 ? env.maxVertUp : env.maxVertDown, p = GK_REACH.envExp; const vt = Math.abs(dz / vMax); const inner = Math.pow(norm, p) - Math.pow(vt, p); return inner <= 0 ? 0 : env.maxLat * Math.pow(inner, 1 / p); }
  function fire() {
    GK_ANIM.reviewOverride = null; RV.family = null; setOn("[data-fam]", null);
    ptReset(); S.pt.paused = false; const sc = spec(); RV.lastSpec = sc; ptGkFire(sc); if (typeof gkAnimResetView === "function") gkAnimResetView(); S.gkAnim.flags = []; RV.t0 = performance.now();
  }
  function setOn(sel, val, attr) { document.querySelectorAll(sel).forEach(b => { const a = attr || Object.keys(b.dataset)[0]; b.classList.toggle("on", val != null && b.dataset[a] === String(val)); }); }
  function heightClass() { const gk = S.pt && S.pt.gk; const H = gk ? gk.height : 1.83, zH = RV.z / H; return zH < GK_ANIM.zLow ? "LOW-MID" : zH < GK_ANIM.zMid ? "MID" : zH < GK_ANIM.zTop ? "HIGH" : "TOP"; }
  function artMode(fam) { RV.family = fam; setOn("[data-fam]", fam); RV.pos = 0; if (fam === "OFF" || !fam) { GK_ANIM.reviewOverride = null; RV.family = null; return; } S.pt.paused = true; updateOverride(); }
  function nominalTarget() { const gk = S.pt.gk; return [gk.x - RV.depth * Math.cos(gk.facing) * 0 + (RV.depth ? Math.cos(gk.facing) * RV.depth : 0), gk.y + laty(), RV.z]; }
  function updateOverride() {
    const gk = S.pt && S.pt.gk; if (!gk || !RV.family) return;
    const facingDeg = gk.facing * 180 / Math.PI, dir = headingToDir(facingDeg), A = S.gkAnim, fam = RV.family;
    const kside = (laty() < 0) === (Math.sin(gk.facing) < 0) ? "LEFT" : "RIGHT";     // keeper-frame lead arm for the clips (debug only)
    const tgt = nominalTarget(); const hs = sproj3(tgt[0], tgt[2], tgt[1]); const simHand = { x: hs.x, y: hs.y };
    let o;
    if (fam === "SET") o = { kind: "state", state: "set", dir, label: "SET" };
    else if (fam === "LOW_GATHER" || fam === "CHEST_CATCH" || fam === "FOOT_SAVE" || fam === "SHUFFLE" || fam === "RECOVER") {
      const clipName = { LOW_GATHER: "low_gather", CHEST_CATCH: "chest_catch", FOOT_SAVE: "foot_save", SHUFFLE: "shuffle", RECOVER: "recover" }[fam];
      o = { kind: "clip", clip: clipName, dir, side: kside, pos: RV.pos, label: fam + " (authored clip; facing-driven)" };
    } else if (fam === "LOW_COLLAPSE" || fam === "AIRBORNE_DIVE" || fam === "LAND") {
      const f2 = fam === "LAND" ? "AIRBORNE_DIVE" : fam; const key = fam === "LOW_COLLAPSE" ? "LOW" : heightClass();
      if ($("rv-savepose").checked && A.savePoses[f2] && A.savePoses[f2][RV.gside]) o = { kind: "savepose", family: f2, side: RV.gside, key, ik: RV.ik, simHand, target: tgt, label: (fam === "LAND" ? "LAND (no LAND art: contact pose held) " : "") + fam + " " + RV.gside };
      else if ($("rv-cand").checked && A.poses[fam === "LOW_COLLAPSE" ? "LOW_COLLAPSE" : (key === "TOP" || key === "HIGH" ? "HIGH_DIVE" : "MEDIUM_DIVE")]) { const pf = fam === "LOW_COLLAPSE" ? "LOW_COLLAPSE" : (key === "TOP" || key === "HIGH" ? "HIGH_DIVE" : "MEDIUM_DIVE"); o = { kind: "pose", family: pf, side: kside, saveAngleDeg: Math.atan2(tgt[1] - gk.y, tgt[0] - gk.x) * 180 / Math.PI, lat: RV.lat, z: RV.z, label: fam + " (V1.1 ROTATION candidate — comparison only)" }; }
      else if ($("rv-retired").checked && A.byFamily && A.byFamily[fam === "AIRBORNE_DIVE" ? "MEDIUM_DIVE" : fam]) o = { kind: "clip", clip: A.byFamily[fam === "AIRBORNE_DIVE" ? "MEDIUM_DIVE" : fam].name, dir, side: kside, pos: RV.pos, label: fam + " (RETIRED V1 clip — comparison only)" };
      else o = { kind: "diag", family: fam, side: kside, saveAngleDeg: Math.atan2(tgt[1] - gk.y, tgt[0] - gk.x) * 180 / Math.PI, lat: RV.lat, z: RV.z, u: 1, label: fam + " " + RV.gside };
    }
    GK_ANIM.reviewOverride = o;
  }
  function clipLen() { const o = GK_ANIM.reviewOverride; if (!o || o.kind !== "clip") return 0; const c = S.gkAnim.clips[o.clip]; return c ? c.variants[0].frames.length : 0; }
  function normReadout() { const r = envNormFor(RV.lat, RV.z); if (r) { $("rv-norm-v").textContent = r.norm.toFixed(2) + "  (maxLat " + r.env.maxLat.toFixed(2) + " m, comfort z " + r.env.comfortZ.toFixed(2) + ")"; $("rv-norm").value = Math.max(0.2, Math.min(1.2, r.norm)).toFixed(2); } }
  function readout() {
    const t = S.pt, gk = t && t.gk, A = S.gkAnim, cur = A.cur, cls = cur && cur.cls, lc = A.lastContact;
    const lines = [];
    lines.push("MODE " + (RV.family ? "ART PLAYBACK: " + RV.family + " " + RV.gside + " (" + (RV.ik ? "bounded IK" : "RAW") + ", height class " + heightClass() + ")" : "PHYSICS REPLAY") + "   slow-mo " + (S.pt.slow || 1) + "x" + (S.pt.paused ? "  PAUSED" : "") + "   t " + (t ? t.now.toFixed(2) : "-") + " s");
    if (gk) lines.push("keeper (" + gk.x.toFixed(2) + ", " + gk.y.toFixed(2) + ")  FACING (debug) " + (gk.facing * 180 / Math.PI).toFixed(0) + "° = " + headingToDir(gk.facing * 180 / Math.PI) + "  phase " + gk.phase + "  height " + gk.height + " m");
    if (cur) lines.push("anim " + cur.state + "  phase " + cur.phase + "  u " + cur.u + "  art " + (cur.artLabel || "-"));
    if (cls) lines.push("CLASSIFY  goal-line Δy " + cls.dy + " → SAVE SIDE " + cls.goalSide + "   lat(keeper) " + cls.lat + "  depth " + cls.depth + "  dz " + cls.dz + "  z " + cls.z + " (" + cls.zClass + ", " + cls.zH + " H)  L " + cls.L + " / maxLat " + cls.maxLat + "  norm " + cls.norm + "  exec " + cls.exec + " s\n          feet " + (cls.feetPlanted ? "PLANTED" : "DIVE") + (cls.airborne ? "  AIRBORNE" : "") + "  dArm " + cls.dArm + " dBody " + cls.dBody + "  sim " + cls.action + " / " + cls.tier + (cls.bestEffort ? " (best effort)" : "") + "\n          → FAMILY " + cls.family + (cls.expr ? "  [" + cls.expr.heightClass + " intensity " + cls.expr.intensity + " extension " + cls.expr.extension + " launch " + cls.expr.launch + (cls.expr.nearMax ? " NEAR-MAX" : "") + "]" : "") + "   (lead arm " + cls.side + ")");
    if (cur && cur.place && cur.place.w > 0) lines.push("placement raw " + cur.place.rawErrPx + " px → correction " + cur.place.corrPx + " px → residual " + cur.place.finalErrPx + " px" + (cur.place.capped ? "  CAPPED → WRONG_CLIP" : ""));
    if (lc) lines.push("CONTACT " + lc.volume + " " + lc.outcome + " @" + lc.tickT + " s  visual error " + lc.errPx + " px / " + lc.errM + " m" + (lc.flagged ? " FLAG" : "") + (lc.artMissing ? "  ART_MISSING" : "") + (lc.wrongClip ? "  WRONG_CLIP" : "") + "  touch gap " + lc.touchGapM + " m  (" + lc.source + ")");
    if (A.flags.length) lines.push("flags: " + A.flags.slice(-3).map(f => f.why).join(" | "));
    if (t && t.last) lines.push(t.last);
    $("rv-read").textContent = lines.join("\n");
  }
  function bind() {
    document.querySelectorAll("[data-gside]").forEach(b => b.onclick = () => { RV.gside = b.dataset.gside; setOn("[data-gside]", RV.gside); if (RV.family) updateOverride(); else fire(); });
    document.querySelectorAll("[data-facing]").forEach(b => b.onclick = () => { RV.facing = b.dataset.facing; setOn("[data-facing]", RV.facing); fire(); });
    document.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => { const [l, z] = b.dataset.preset.split(",").map(Number); RV.lat = l; RV.z = z; $("rv-lat").value = l; $("rv-z").value = z; $("rv-lat-v").textContent = l.toFixed(2); $("rv-z-v").textContent = z.toFixed(2); normReadout(); if (RV.family) updateOverride(); else fire(); });
    document.querySelectorAll("[data-ik]").forEach(b => b.onclick = () => { RV.ik = b.dataset.ik === "ik"; setOn("[data-ik]", b.dataset.ik); GK_ANIM.savePoseIK = RV.ik; updateOverride(); });
    const slider = (id, key, fmt, after) => { const el = $(id); el.oninput = () => { RV[key] = +el.value; $(id + "-v").textContent = fmt(+el.value); if (after) after(); } };
    slider("rv-lat", "lat", v => v.toFixed(2), () => { normReadout(); if (RV.family) updateOverride(); }); slider("rv-z", "z", v => v.toFixed(2), () => { normReadout(); if (RV.family) updateOverride(); });
    slider("rv-depth", "depth", v => v.toFixed(2), () => { if (RV.family) updateOverride(); }); slider("rv-v", "v", v => String(v));
    $("rv-norm").oninput = () => { const n = +$("rv-norm").value; const L = latForNorm(n, RV.z); if (L != null) { RV.lat = +Math.min(2.8, L).toFixed(2); $("rv-lat").value = RV.lat; $("rv-lat-v").textContent = RV.lat.toFixed(2); } $("rv-norm-v").textContent = n.toFixed(2) + " → lateral " + RV.lat.toFixed(2) + " m"; if (RV.family) updateOverride(); };
    $("rv-fire").onclick = fire; $("rv-refire").onclick = () => { if (RV.lastSpec) { GK_ANIM.reviewOverride = null; RV.family = null; setOn("[data-fam]", null); ptReset(); S.pt.paused = false; ptGkFire(RV.lastSpec); gkAnimResetView(); S.gkAnim.flags = []; RV.t0 = performance.now(); } };
    $("rv-loop").onchange = e => RV.loop = e.target.checked;
    document.querySelectorAll("[data-fam]").forEach(b => b.onclick = () => artMode(b.dataset.fam));
    $("rv-prev").onclick = () => { RV.pos = Math.max(0, RV.pos - 1); RV.artPlay = false; $("rv-artplay").checked = false; updateOverride(); };
    $("rv-next").onclick = () => { const n = clipLen(); RV.pos = n ? (RV.pos + 1) % n : 0; RV.artPlay = false; $("rv-artplay").checked = false; updateOverride(); };
    $("rv-artplay").onchange = e => RV.artPlay = e.target.checked;
    $("rv-savepose").onchange = () => updateOverride();
    $("rv-cand").onchange = e => { GK_ANIM.candidatePoses = e.target.checked; updateOverride(); };
    $("rv-retired").onchange = e => { GK_ANIM.reviewRetiredArt = e.target.checked; updateOverride(); };
    $("rv-diag").onchange = e => { GK_ANIM.diagnosticDives = e.target.checked; };
    document.querySelectorAll("[data-speed]").forEach(b => b.onclick = () => { S.pt.slow = +b.dataset.speed; setOn("[data-speed]", b.dataset.speed); });
    $("rv-pause").onclick = () => { S.pt.paused = !S.pt.paused; $("rv-pause").textContent = S.pt.paused ? "Resume" : "Pause"; };
    $("rv-step").onclick = () => { S.pt.paused = true; $("rv-pause").textContent = "Resume"; ptStep(); };
    $("rv-overlay").onchange = e => { S.dbg.anim = e.target.checked; };
    $("rv-stick").onchange = e => { S.dbg.gkstick = e.target.checked; };
    $("rv-rail").oninput = e => { $("rv-rail-v").textContent = (+e.target.value).toFixed(1); camera(+e.target.value, RIG.zoomTarget); };
    $("rv-zoom").oninput = e => { $("rv-zoom-v").textContent = (+e.target.value).toFixed(1); camera(RIG.manualX, +e.target.value); };
  }
  async function init() {
    if (!ready()) { setTimeout(init, 150); return; }
    try { await gkAnimLoadSavePoses(S.gkAnim, SAVEPOSES.manifest, SAVEPOSES.root); } catch (e) { console.warn("V1.2 save poses not available yet", e); }
    try { await gkAnimLoadPoses(S.gkAnim, CAND11.manifest, CAND11.root, true); } catch (e) { console.warn("V1.1 rotation candidates not available", e); }
    GK_ANIM.candidatePoses = false; GK_ANIM.diagnosticDives = true; GK_ANIM.savePoseIK = false;
    if (!(S.pt && S.pt.on)) ptEnter();
    camera(100, 2.0); S.dbg.anim = true; S.dbg.cam = false;
    bind(); fire(); setTimeout(normReadout, 300);
    let lastAdv = performance.now();
    setInterval(() => {
      readout();
      const now = performance.now();
      if (RV.family && RV.artPlay && GK_ANIM.reviewOverride && GK_ANIM.reviewOverride.kind === "clip") { const n = clipLen(); if (n && now - lastAdv > 1000 / (RV.fps * (S.pt.slow || 1))) { RV.pos = (RV.pos + 1) % n; lastAdv = now; updateOverride(); } }
      if (!RV.family && RV.loop && S.pt && !S.pt.paused && (now - RV.t0) / 1000 * (S.pt.slow || 1) > 3.2) { $("rv-refire").onclick(); }
    }, 60);
    window.GK_REVIEW = RV;
  }
  init();
})();

// GOALKEEPER ANIMATION REVIEW PAGE (Animation V1.1) — drives the shared match.js runtime. Two modes:
//   physics replay: a synthetic arrival at a chosen lateral / height / depth / speed for a chosen shooter direction is fired
//                   through the real simulation (ptGkFire + synthK fixture); the runtime classifies and draws as in play.
//   art playback:   a chosen representation (clip frames, candidate contact pose along a save angle, SET, diagnostic) is
//                   drawn at the keeper root with no physics (GK_ANIM.reviewOverride).
// Nothing here writes simulation state except firing the fixture and pausing/stepping the deterministic loop.
(function () {
  const RV = { facing: "W", side: "RIGHT", lat: 1.2, z: 1.0, depth: 0, v: 16, loop: false, family: null, ang: 90, pos: 0, artPlay: true, fps: 10, lastFire: null, lastSpec: null, t0: 0 };
  const FACING_DEG = { W: 180, SW: 135, NW: 225, S: 90, N: 270 };   // bearing keeper → shooter (y-down degrees)
  const CAND = { manifest: "../../review_artifacts/gk_anim_v1_1/poses/GK_POSES_CANDIDATES.json", root: "../../review_artifacts/gk_anim_v1_1/poses/" };
  const $ = id => document.getElementById(id);
  function ready() { const el = $("loading"); return el && el.style.display === "none" && typeof ptEnter === "function" && S.gkAnim && S.gkAnim.loaded; }
  function camera(rail, zoom) { RIG.mode = "manual"; RIG.manualX = rail; RIG.targetX = rail; RIG.x = rail; RIG.zoom = zoom; RIG.zoomTarget = zoom; }
  function spec() {
    const F = FACING_DEG[RV.facing] * Math.PI / 180, dist = 14, anchor = [101.7, 34];
    const origin = [anchor[0] + Math.cos(F) * dist, anchor[1] + Math.sin(F) * dist];
    return { name: "REVIEW " + RV.facing + " " + RV.side + " lat " + RV.lat + " z " + RV.z + " d " + RV.depth + " v " + RV.v, origin, aim: [105, 34], tech: "LACES", c: 0.5,
             synthK: { lat: RV.side === "RIGHT" ? RV.lat : -RV.lat, z: RV.z, v: RV.v, depth: RV.depth } };
  }
  function fire() {
    GK_ANIM.reviewOverride = null; RV.family = null; setOn("[data-fam]", null);
    ptReset(); S.pt.paused = false; const sc = spec(); RV.lastSpec = sc; ptGkFire(sc); if (typeof gkAnimResetView === "function") gkAnimResetView(); S.gkAnim.flags = []; RV.t0 = performance.now();
  }
  function setOn(sel, val, attr) { document.querySelectorAll(sel).forEach(b => { const a = attr || Object.keys(b.dataset)[0]; b.classList.toggle("on", val != null && b.dataset[a] === String(val)); }); }
  function artMode(fam) {
    RV.family = fam; setOn("[data-fam]", fam); RV.pos = 0;
    if (fam === "OFF" || !fam) { GK_ANIM.reviewOverride = null; RV.family = null; return; }
    S.pt.paused = true; updateOverride();
  }
  function updateOverride() {
    const gk = S.pt && S.pt.gk; if (!gk || !RV.family) return;
    const facingDeg = gk.facing * 180 / Math.PI, saveAngle = facingDeg + RV.ang * (RV.side === "RIGHT" ? 1 : -1) * (Math.abs(RV.ang) === 90 ? 1 : 1);
    const ang = facingDeg + RV.ang;                       // slider is relative to facing (+ = clockwise on screen = keeper's right for a west-facing keeper)
    const side = RV.ang >= 0 ? "RIGHT" : "LEFT";
    const A = S.gkAnim, fam = RV.family, dir = headingToDir(facingDeg);
    let o;
    if (fam === "SET") o = { kind: "state", state: "set", dir, label: "SET" };
    else if (fam === "LOW_GATHER" || fam === "CHEST_CATCH" || fam === "FOOT_SAVE" || fam === "SHUFFLE" || fam === "RECOVER") {
      const clipName = { LOW_GATHER: "low_gather", CHEST_CATCH: "chest_catch", FOOT_SAVE: "foot_save", SHUFFLE: "shuffle", RECOVER: "recover" }[fam];
      o = { kind: "clip", clip: clipName, dir, side, pos: RV.pos, label: fam + " (authored clip)" };
    } else if (fam === "LAND") { o = A.poses.MEDIUM_DIVE && $("rv-cand").checked ? { kind: "pose", family: "MEDIUM_DIVE", side, saveAngleDeg: ang, label: "LAND — no LAND art: contact pose held (ART_MISSING LAND)" } : { kind: "diag", family: "LAND", side, saveAngleDeg: ang, lat: RV.lat, z: 0.2, label: "LAND" }; }
    else {   // dive families: candidate pose (if allowed) → retired clip (if allowed) → diagnostic
      if (A.poses[fam] && $("rv-cand").checked) o = { kind: "pose", family: fam, side, saveAngleDeg: ang, lat: RV.lat, z: RV.z, label: fam };
      else if ($("rv-retired").checked && A.byFamily && A.byFamily[fam]) o = { kind: "clip", clip: A.byFamily[fam].name, dir, side, pos: RV.pos, label: fam + " (RETIRED V1 clip — comparison only)" };
      else o = { kind: "diag", family: fam, side, saveAngleDeg: ang, lat: RV.lat, z: RV.z, u: 1, label: fam };
    }
    GK_ANIM.reviewOverride = o;
  }
  function clipLen() { const o = GK_ANIM.reviewOverride; if (!o || o.kind !== "clip") return 0; const c = S.gkAnim.clips[o.clip]; return c ? c.variants[0].frames.length : 0; }
  function readout() {
    const t = S.pt, gk = t && t.gk, A = S.gkAnim, cur = A.cur, cls = cur && cur.cls, lc = A.lastContact;
    const lines = [];
    lines.push("MODE " + (RV.family ? "ART PLAYBACK: " + RV.family + " (angle " + (RV.ang >= 0 ? "+" : "") + RV.ang + "° rel. facing)" : "PHYSICS REPLAY") + "   slow-mo " + (S.pt.slow || 1) + "x" + (S.pt.paused ? "  PAUSED" : "") + "   t " + (t ? t.now.toFixed(2) : "-") + " s");
    if (gk) lines.push("keeper (" + gk.x.toFixed(2) + ", " + gk.y.toFixed(2) + ") facing " + (gk.facing * 180 / Math.PI).toFixed(0) + "°  phase " + gk.phase + "  height " + gk.height + " m");
    if (cur) lines.push("anim " + cur.state + "  phase " + cur.phase + "  u " + cur.u + "  art " + (cur.artLabel || "-"));
    if (cls) lines.push("CLASSIFY  lat " + cls.lat + "  depth " + cls.depth + "  dz " + cls.dz + "  z " + cls.z + " (" + cls.zClass + ", " + cls.zH + " H)  L " + cls.L + " / maxLat " + cls.maxLat + "  norm " + cls.norm + "  exec " + cls.exec + " s  v0 " + cls.v0 + "\n          feet " + (cls.feetPlanted ? "PLANTED" : "DIVE") + (cls.airborne ? "  AIRBORNE" : "") + "  dArm " + cls.dArm + " dBody " + cls.dBody + "  sim " + cls.action + " / " + cls.tier + (cls.bestEffort ? " (best effort)" : "") + "\n          → FAMILY " + cls.family + " " + cls.side + "   save vector " + cls.saveDir + " (" + cls.saveAngle.toFixed(0) + "°)");
    if (cur && cur.place && cur.place.w > 0) lines.push("placement raw " + cur.place.rawErrPx + " px → correction " + cur.place.corrPx + " px → residual " + cur.place.finalErrPx + " px" + (cur.place.capped ? "  CAPPED → WRONG_CLIP" : ""));
    if (lc) lines.push("CONTACT " + lc.volume + " " + lc.outcome + " @" + lc.tickT + " s  visual error " + lc.errPx + " px / " + lc.errM + " m" + (lc.flagged ? " FLAG" : "") + (lc.artMissing ? "  ART_MISSING" : "") + (lc.wrongClip ? "  WRONG_CLIP" : "") + "  touch gap " + lc.touchGapM + " m  (" + lc.source + ")");
    if (A.flags.length) lines.push("flags: " + A.flags.slice(-3).map(f => f.why).join(" | "));
    if (t && t.last) lines.push(t.last);
    $("rv-read").textContent = lines.join("\n");
  }
  function bind() {
    document.querySelectorAll("[data-facing]").forEach(b => b.onclick = () => { RV.facing = b.dataset.facing; setOn("[data-facing]", RV.facing); fire(); });
    document.querySelectorAll("[data-side]").forEach(b => b.onclick = () => { RV.side = b.dataset.side; setOn("[data-side]", RV.side); if (RV.family) { RV.ang = Math.abs(RV.ang) * (RV.side === "RIGHT" ? 1 : -1); $("rv-ang").value = RV.ang; $("rv-ang-v").textContent = (RV.ang >= 0 ? "+" : "") + RV.ang; updateOverride(); } });
    document.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => { const [l, z] = b.dataset.preset.split(",").map(Number); RV.lat = l; RV.z = z; $("rv-lat").value = l; $("rv-z").value = z; $("rv-lat-v").textContent = l.toFixed(2); $("rv-z-v").textContent = z.toFixed(2); fire(); });
    const slider = (id, key, fmt, after) => { const el = $(id); el.oninput = () => { RV[key] = +el.value; $(id + "-v").textContent = fmt(+el.value); if (after) after(); }; };
    slider("rv-lat", "lat", v => v.toFixed(2)); slider("rv-z", "z", v => v.toFixed(2)); slider("rv-depth", "depth", v => v.toFixed(2)); slider("rv-v", "v", v => String(v));
    slider("rv-ang", "ang", v => (v >= 0 ? "+" : "") + v, () => { RV.side = RV.ang >= 0 ? "RIGHT" : "LEFT"; setOn("[data-side]", RV.side); updateOverride(); });
    $("rv-fire").onclick = fire; $("rv-refire").onclick = () => { if (RV.lastSpec) { GK_ANIM.reviewOverride = null; RV.family = null; setOn("[data-fam]", null); ptReset(); S.pt.paused = false; ptGkFire(RV.lastSpec); gkAnimResetView(); S.gkAnim.flags = []; RV.t0 = performance.now(); } };
    $("rv-loop").onchange = e => RV.loop = e.target.checked;
    document.querySelectorAll("[data-fam]").forEach(b => b.onclick = () => artMode(b.dataset.fam));
    $("rv-prev").onclick = () => { RV.pos = Math.max(0, RV.pos - 1); RV.artPlay = false; $("rv-artplay").checked = false; updateOverride(); };
    $("rv-next").onclick = () => { const n = clipLen(); RV.pos = n ? (RV.pos + 1) % n : 0; RV.artPlay = false; $("rv-artplay").checked = false; updateOverride(); };
    $("rv-artplay").onchange = e => RV.artPlay = e.target.checked;
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
    try { await gkAnimLoadPoses(S.gkAnim, CAND.manifest, CAND.root, true); } catch (e) { console.warn("candidate poses not available", e); }
    GK_ANIM.candidatePoses = true; GK_ANIM.diagnosticDives = true;
    if (!(S.pt && S.pt.on)) ptEnter();
    camera(100, 2.0); S.dbg.anim = true; S.dbg.cam = false;
    bind(); fire();
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

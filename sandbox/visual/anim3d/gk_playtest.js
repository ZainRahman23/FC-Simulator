// ═══ anim3d/gk_playtest.js — PLAYABLE LOCAL TEST HARNESS for the finished goalkeeper character (Courtois) ═══
// Presentation / integration test harness on the EXISTING single-player playtest (S.pt): it never adds goalkeeper mechanics,
// never writes the ball, never changes simulation outcomes and uses no RNG. What it does:
//   • keeper INTENT input — the keyboard replaces the keeper AI's idle positioning intent (the `gkPosition` target the simulation's own
//     `gkMove` locomotion law already consumes) and the idle "face the ball" rule; every authoritative action (a shot, a dive, a catch,
//     a distribution plan, BALL_AT_FEET) takes the keeper back exactly as before — the harness input is ignored there;
//   • the action library is reachable ONLY through its authoritative triggers: the existing deterministic fixtures (`ptGkScenario`,
//     which reposition the keeper deterministically — labelled), a distribution REQUEST for the next held catch (`t.gkDist`, the same
//     request the fixtures / free-play tool use; the simulation decides if and when the ball is released), and real shots from the
//     existing shooter controls (TAB switches the keyboard to the shooter);
//   • the approved Mixed presentation on the live scene: the page's own 2D environment pass at its native density, nearest ×2, the
//     character re-rendered at twice the canvas density inside its render ROI (the approved 2 / 4 composition on a 2× display) and
//     composited one native character pixel per output pixel, the view following the keeper. Camera = the unchanged playtest rig.
// Enable with  ?gkPlay=1&gkBackend=3d&gkChar=courtois  on match.html.
const GKPLAY = { on: false, control: "KEEPER", manual: true, keys: {}, facing: null, mixed: true, lastFixture: null, dist: null, firing: false, follow: true, out: null, octx: null, panel: null, _origPosition: null, turnRate: 2.2, carry: 1.6, carrySprint: 3.2 };
GKPLAY.GROUPS = [
  { name: "READY / footwork", note: "free: move with W A S D (arrows), Shift sprint · Q / E turn · F face the ball · C AI positioning on/off", fixtures: [] },
  { name: "V6 far dive", fixtures: [42, 49, 50, 12, 15] },
  { name: "low dives", fixtures: [43, 44, 51, 1, 21] },
  { name: "catches", fixtures: [45, 26, 46, 33, 47, 54, 61, 62, 63] },
  { name: "gathers / body", fixtures: [27, 30, 31, 16, 17, 18] },
  { name: "foot saves", fixtures: [19, 20, 29, 48, 55, 56, 57, 58, 59, 60] },
  { name: "parries / tips", fixtures: [28, 32, 34, 35, 36, 37, 38, 39, 41] },
  { name: "put-down", fixtures: [64, 72, 79] },
  { name: "hand roll", fixtures: [65, 66, 74, 78] },
  { name: "overarm throw", fixtures: [67, 68, 69, 73, 77] },
  { name: "punt", fixtures: [70, 71, 75, 76] }];
GKPLAY.QUICK = { "1": 42, "2": 49, "3": 45, "4": 46, "5": 55, "6": 64, "7": 65, "8": 67, "9": 70 };
GKPLAY.DIST = [{ id: "none", label: "no request", req: null }, { id: "PUTDOWN", label: "PUT DOWN", req: { kind: "PUTDOWN" } }, { id: "ROLL_R", label: "ROLL right", req: { kind: "ROLL", target: [96, 26], side: "R" } }, { id: "ROLL_L", label: "ROLL left", req: { kind: "ROLL", target: [96, 42], side: "L" } },
  { id: "THROW_R", label: "THROW right", req: { kind: "THROW", target: [78, 24], side: "R" } }, { id: "THROW_L", label: "THROW left", req: { kind: "THROW", target: [78, 44], side: "L" } }, { id: "THROW_FAR", label: "THROW far", req: { kind: "THROW", target: [62, 34] } }, { id: "PUNT_R", label: "PUNT right foot", req: { kind: "PUNT", target: [55, 34], foot: "R" } }, { id: "PUNT_L", label: "PUNT left foot", req: { kind: "PUNT", target: [55, 34], foot: "L" } }];
function gkPlayWanted() { return new URLSearchParams(location.search).get("gkPlay") === "1"; }
function gkPlayIdle(gk) { return !!gk && !gk.dist && !gk.shotActive && (gk.state === "SET" || gk.state === "TRACKING"); }   // the only state in which the harness intent applies
function gkPlayInstall() {
  if (GKPLAY.on) return; GKPLAY.on = true;
  // 1. keeper intent: the idle positioning target. `gkPosition` is the simulation's own intent function; the harness returns a keyboard carrot
  //    (a point a short distance ahead in the pressed direction — the simulation's `gkMove` accelerates / brakes toward it with the keeper's
  //    own vmax / accel / arrive-brake law) or the current position (brake to a stop). Fixture set-up (`ptGkFire`) and AI mode use the original.
  GKPLAY._origPosition = gkPosition;
  gkPosition = function (t, bx, by, q) {
    const gk = t && t.gk;
    if (!GKPLAY.manual || GKPLAY.firing || GKPLAY.control !== "KEEPER" || !gk || !gkPlayIdle(gk)) return GKPLAY._origPosition(t, bx, by, q);
    const k = GKPLAY.keys; let dx = 0, dy = 0; if (k.up) dy -= 1; if (k.down) dy += 1; if (k.left) dx -= 1; if (k.right) dx += 1;
    const m = Math.hypot(dx, dy); if (m < 1e-6) return [gk.x, gk.y];
    const L = k.sprint ? GKPLAY.carrySprint : GKPLAY.carry;
    return [Math.max(-2, Math.min(107, gk.x + dx / m * L)), Math.max(-2, Math.min(70, gk.y + dy / m * L))];   // the playtest's world bounds
  };
  const _fire = ptGkFire; ptGkFire = function (sc, i, n) { GKPLAY.firing = true; try { _fire(sc, i, n); } finally { GKPLAY.firing = false; } GKPLAY.lastFixture = i; GKPLAY.facing = null; if (!sc.dist && GKPLAY.dist && GKPLAY.dist.req && S.pt) S.pt.gkDist = Object.assign({}, GKPLAY.dist.req); };   // a fixture without its own distribution keeps the harness request (the fixture's own request wins)
  // 2. keeper intent: facing. Q / E turn a manual facing that replaces the idle "face the ball" rule only while the keeper is idle; any
  //    authoritative action (shot, dive, catch, distribution, BALL_AT_FEET) overrides it exactly as before.
  const _upd = ptGkUpdate; ptGkUpdate = function (t) {
    _upd(t); const gk = t.gk; if (!gk || GKPLAY.control !== "KEEPER" || !gkPlayIdle(gk)) return;
    if (GKPLAY.keys.turnL || GKPLAY.keys.turnR) { if (GKPLAY.facing == null) GKPLAY.facing = gk.facing; GKPLAY.facing += (GKPLAY.keys.turnR ? -1 : 1) * GKPLAY.turnRate * PT_DT; }
    if (GKPLAY.facing != null) gk.facing = Math.atan2(Math.sin(GKPLAY.facing), Math.cos(GKPLAY.facing));
  };
  // 3. Mixed presentation: wrap the frame draw — the character layer is hidden in the page's own pass and re-rendered at 2× the canvas density
  const _draw = draw; draw = function (sample, dt) { GK3D.hideCharacter = GKPLAY.mixed && GK_PRESENTATION.backend === "SKELETAL_3D"; try { _draw(sample, dt); } finally { GK3D.hideCharacter = false; } if (GKPLAY.mixed) gkPlayComposite(); else if (GKPLAY.out) GKPLAY.out.style.display = "none"; gkPlayHud(); };
  gkPlayDom(); gkPlayKeys();
}
function gkPlayComposite() {
  const t = S.pt; if (!GKPLAY.out) return; const out = GKPLAY.out, octx = GKPLAY.octx; out.style.display = "block";
  const W = Math.round(out.clientWidth * RES), H = Math.round(out.clientHeight * RES); if (out.width !== W || out.height !== H) { out.width = W; out.height = H; }
  const Z = 2;                                                                               // environment: nearest ×2 of the page's native pass; character: density 2·RES = one layer px per output px
  let cx = cv.width / 2, cy = cv.height / 2; if (GKPLAY.follow && t && t.gk) { const sp = sproj3(t.gk.x, 0, t.gk.y); cx = sp.x; cy = sp.y - 40 * RES; }
  const sw = W / Z, sh = H / Z; let sx = Math.round(cx - sw / 2), sy = Math.round(cy - sh / 2); sx = Math.max(0, Math.min(cv.width - sw, sx)); sy = Math.max(0, Math.min(cv.height - sh, sy)); GKPLAY.view = { sx, sy, sw, sh, Z };
  octx.imageSmoothingEnabled = false; octx.fillStyle = "#0b0e12"; octx.fillRect(0, 0, W, H); octx.drawImage(cv, sx, sy, sw, sh, 0, 0, W, H);
  const e = typeof GK_CHAR !== "undefined" ? GK_CHAR.get("COURTOIS") : null, L = GK3D.lastLayer;
  if (t && t.on && e && e.status === "ready" && L && GK3D.R && GK_PRESENTATION.backend === "SKELETAL_3D" && GK3D.skelKey === "COURTOIS") {
    const dens = Z * RES, lay = gkCharRender(GK3D.R, e, L.skinMats, L.roi, dens, cv.width, cv.height, RES, L.ballP ? { p: L.ballP, r: L.ballR } : null);
    const dx = (L.roi.x * RES - sx) * Z, dy = (L.roi.y * RES - sy) * Z;                        // layer px = output px (density 2·RES over base px, view zoom 2 over canvas px)
    octx.drawImage(lay.canvas, 0, 0, lay.w, lay.h, Math.round(dx), Math.round(dy), lay.w, lay.h); GKPLAY.lastLayerInfo = { w: lay.w, h: lay.h, dens, draws: lay.draws };
  }
}
function gkPlayKeys() {
  const MAP = { w: "up", arrowup: "up", s: "down", arrowdown: "down", a: "left", arrowleft: "left", d: "right", arrowright: "right", shift: "sprint", q: "turnL", e: "turnR" };
  const mine = (e) => GKPLAY.on && S.pt && S.pt.on && GKPLAY.control === "KEEPER" && !(e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON"));
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "tab" && GKPLAY.on && S.pt && S.pt.on) { e.preventDefault(); e.stopImmediatePropagation(); gkPlaySetControl(GKPLAY.control === "KEEPER" ? "SHOOTER" : "KEEPER"); return; }
    if (!mine(e)) return;
    if (MAP[k]) { GKPLAY.keys[MAP[k]] = true; e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (k === "f") { GKPLAY.facing = null; S.pt.last = "KEEPER FACING -> the ball (idle rule)"; }
    else if (k === "c") { GKPLAY.manual = !GKPLAY.manual; S.pt.last = "KEEPER POSITIONING -> " + (GKPLAY.manual ? "KEYBOARD intent" : "AI (goal positioning)"); }
    else if (k === "x") { GKPLAY.mixed = !GKPLAY.mixed; S.pt.last = "PRESENTATION -> " + (GKPLAY.mixed ? "MIXED (env native ×2 nearest, character 2·RES)" : "page canvas"); }
    else if (k === "z") { if (GKPLAY.lastFixture != null) ptGkScenario(GKPLAY.lastFixture); }
    else if (k === "g") { GKPLAY.follow = !GKPLAY.follow; S.pt.last = "VIEW FOLLOWS KEEPER -> " + (GKPLAY.follow ? "ON" : "OFF"); }
    else if (GKPLAY.QUICK[k] != null) ptGkScenario(GKPLAY.QUICK[k]);
    else if (k === "0") gkPlayDist("none");
    else return;                                                                             // everything else (r reset, m pause, , slow-mo, . step, l profile, escape …) still belongs to the playtest
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  window.addEventListener("keyup", (e) => { const k = e.key.toLowerCase(); if (MAP[k]) { GKPLAY.keys[MAP[k]] = false; if (mine(e)) { e.preventDefault(); e.stopImmediatePropagation(); } } }, true);
  window.addEventListener("blur", () => { GKPLAY.keys = {}; });
}
function gkPlaySetControl(c) { GKPLAY.control = c; GKPLAY.keys = {}; if (S.pt) { S.pt.keys = {}; S.pt.last = "KEYBOARD -> " + (c === "KEEPER" ? "COURTOIS (keeper intent)" : "SHOOTER (the existing playtest: arrows / WASD move, x z c kicks, 1–5 showcase kicks)"); } gkPlayHud(); }
function gkPlayDist(id) {
  const d = GKPLAY.DIST.find(x => x.id === id) || GKPLAY.DIST[0]; GKPLAY.dist = d.id === "none" ? null : d;
  if (S.pt) { S.pt.gkDist = d.req ? Object.assign({}, d.req) : null; if (S.pt.gk && !S.pt.gk.dist) S.pt.gk.distDone = null; S.pt.last = "DISTRIBUTION REQUEST for the next held catch -> " + d.label + " (the simulation decides if / when the ball is released)"; }
  gkPlayHud();
}
function gkPlayDom() {
  const css = document.createElement("style"); css.textContent = `
  #gkplay-out{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5;image-rendering:pixelated;background:#0b0e12;display:none}
  #gkplay-panel{position:fixed;right:0;top:0;width:360px;max-height:100vh;overflow:auto;z-index:20;background:rgba(10,12,16,.92);color:#e8e6e0;font:12px/1.4 Menlo,monospace;padding:10px 12px;box-sizing:border-box;border-left:1px solid #333}
  #gkplay-panel h3{margin:8px 0 4px;color:#ffe36a;font-size:12px}#gkplay-panel b{color:#ffe36a}#gkplay-panel .ok{color:#38ff9a}#gkplay-panel .bad{color:#ff5a5a}#gkplay-panel .dim{color:#9aa0a8}
  #gkplay-panel button{background:#1c2430;color:#e8e6e0;border:1px solid #3a4658;border-radius:3px;padding:2px 6px;margin:2px 2px 2px 0;font:11px Menlo,monospace;cursor:pointer}#gkplay-panel button:hover{background:#2a3648}#gkplay-panel button.on{background:#1d7a3d;border-color:#2fa35a}
  #gkplay-status{white-space:pre;font-size:11px;background:#0f1114;border:1px solid #2a2d33;padding:6px;margin:4px 0}`; document.head.appendChild(css);
  const out = document.createElement("canvas"); out.id = "gkplay-out"; document.body.appendChild(out); GKPLAY.out = out; GKPLAY.octx = out.getContext("2d");
  const p = document.createElement("div"); p.id = "gkplay-panel"; document.body.appendChild(p); GKPLAY.panel = p;
  let h = `<h3>COURTOIS — playable test harness</h3><div class="dim">simulation decides · animation presents · harness = intent input + fixture triggers + Mixed view</div><div id="gkplay-status"></div>
  <div><button id="gkp-ctl"></button> <button id="gkp-mixed"></button> <button id="gkp-manual"></button> <button id="gkp-follow"></button></div>
  <h3>keys (keyboard on COURTOIS)</h3><div class="dim">W A S D / arrows move · Shift sprint · Q / E turn · F face the ball · C keyboard / AI positioning · TAB keyboard → shooter · X Mixed / page view · G follow · 1–9 quick fixtures · Z re-fire last fixture · 0 clear distribution request · R reset · M pause · , slow-mo · . step · L keeper profile · Esc exit playtest</div>
  <h3>distribution request for the NEXT held catch <span class="dim">(t.gkDist — the simulation releases the ball on its own contract)</span></h3><div id="gkp-dist"></div>
  <h3>action triggers — deterministic fixtures <span class="dim">(each fixture repositions the keeper and fires an authoritative shot; the action is the simulation's response)</span></h3><div id="gkp-groups"></div>`;
  p.innerHTML = h;
  const G = p.querySelector("#gkp-groups");
  for (const g of GKPLAY.GROUPS) { const d = document.createElement("div"); d.innerHTML = `<b>${g.name}</b>${g.note ? ` <span class="dim">${g.note}</span>` : ""}<br>`; for (const i of g.fixtures) { const b = document.createElement("button"); const sc = GK_SCENARIOS[i]; b.textContent = i + " " + (sc ? sc.name.slice(0, 34) : "?"); b.title = sc ? sc.name : ""; b.addEventListener("click", () => { ptGkScenario(i); gkPlayHud(); }); d.appendChild(b); } G.appendChild(d); }
  const D = p.querySelector("#gkp-dist"); for (const d of GKPLAY.DIST) { const b = document.createElement("button"); b.textContent = d.label; b.dataset.id = d.id; b.addEventListener("click", () => gkPlayDist(d.id)); D.appendChild(b); }
  p.querySelector("#gkp-ctl").addEventListener("click", () => gkPlaySetControl(GKPLAY.control === "KEEPER" ? "SHOOTER" : "KEEPER"));
  p.querySelector("#gkp-mixed").addEventListener("click", () => { GKPLAY.mixed = !GKPLAY.mixed; gkPlayHud(); });
  p.querySelector("#gkp-manual").addEventListener("click", () => { GKPLAY.manual = !GKPLAY.manual; gkPlayHud(); });
  p.querySelector("#gkp-follow").addEventListener("click", () => { GKPLAY.follow = !GKPLAY.follow; gkPlayHud(); });
  p.addEventListener("mousedown", (e) => { if (e.target.tagName === "BUTTON") setTimeout(() => e.target.blur(), 0); });   // buttons never keep the keyboard focus
}
function gkPlayHud() {
  const p = GKPLAY.panel; if (!p) return; const t = S.pt, gk = t && t.gk, b = t && t.b; const e = typeof GK_CHAR !== "undefined" ? GK_CHAR.get("COURTOIS") : null; const L = GK3D.last, g = L && L.g;
  const rig = GK3D.skelKey === "COURTOIS" && GK3D.skel ? `<span class="ok">COURTOIS true rig H ${GK3D.skel.H} m</span>` : `<span class="bad">NOT the Courtois rig (${GK3D.skelKey || "-"}; asset ${e ? e.status : "missing"})</span>`;
  const deg = (r) => (r * 180 / Math.PI).toFixed(0) + "°"; const f3 = (v) => (+v).toFixed(2);
  const sc = t && t.gkScenario != null ? GK_SCENARIOS[t.gkScenario] : null;
  p.querySelector("#gkplay-status").innerHTML = !t || !t.on ? "playtest not active" :
    `character   ${rig}\nkeyboard    <b>${GKPLAY.control}</b>   positioning ${GKPLAY.manual ? "KEYBOARD intent" : "AI"}   facing ${GKPLAY.facing == null ? "ball (idle rule)" : "manual"}\nsim state   <b>${gk ? gk.state : "-"}</b>   motion ${g ? (g.motion || "-") + " " + g.phase + (g.sub && g.sub !== g.phase ? "/" + g.sub : "") : "-"}\nkeeper      x ${gk ? f3(gk.x) : "-"} y ${gk ? f3(gk.y) : "-"}  v ${gk ? f3(Math.hypot(gk.vx, gk.vy)) : "-"} m/s  facing ${gk ? deg(gk.facing) : "-"}\nball        x ${b ? f3(b.x) : "-"} y ${b ? f3(b.y) : "-"} z ${b ? f3(b.z) : "-"}  ${b && b.held ? "HELD by " + b.held : b && b.ctrl ? "at the shooter's feet" : "free"}${gk && gk.dist ? "  plan " + gk.dist.kind : ""}\ndist req    ${GKPLAY.dist ? GKPLAY.dist.label : "none"}${t.gkDist && !GKPLAY.dist ? " (fixture: " + t.gkDist.kind + ")" : ""}\nfixture     ${sc ? t.gkScenario + " " + sc.name.slice(0, 44) : "free play"}\nview        ${GKPLAY.mixed ? "MIXED env ×2 nearest / character density " + (2 * RES) + (GKPLAY.lastLayerInfo ? " (" + GKPLAY.lastLayerInfo.w + "×" + GKPLAY.lastLayerInfo.h + " layer px)" : "") : "page canvas (density " + RES + ")"}   ${t.paused ? "PAUSED" : (t.slow && t.slow !== 1 ? "slow " + t.slow + "×" : "60 Hz")}\nlast        ${t.last || ""}`;
  const set = (id, on, txt) => { const el = p.querySelector(id); el.textContent = txt; el.classList.toggle("on", !!on); };
  set("#gkp-ctl", GKPLAY.control === "KEEPER", GKPLAY.control === "KEEPER" ? "keyboard: COURTOIS (TAB → shooter)" : "keyboard: SHOOTER (TAB → Courtois)");
  set("#gkp-mixed", GKPLAY.mixed, GKPLAY.mixed ? "Mixed view ON (X)" : "Mixed view OFF (X)"); set("#gkp-manual", GKPLAY.manual, GKPLAY.manual ? "positioning: keyboard (C)" : "positioning: AI (C)"); set("#gkp-follow", GKPLAY.follow, GKPLAY.follow ? "follow keeper (G)" : "fixed view (G)");
  for (const bt of p.querySelectorAll("#gkp-dist button")) bt.classList.toggle("on", (GKPLAY.dist ? GKPLAY.dist.id : "none") === bt.dataset.id);
}
function gkPlayBoot() {
  if (!gkPlayWanted()) return;
  const ready = () => { const el = document.getElementById("loading"); const e = typeof GK_CHAR !== "undefined" ? GK_CHAR.get("COURTOIS") : null; return el && el.style.display === "none" && typeof ptEnter === "function" && e && e.status === "ready"; };
  const tryStart = () => {
    if (!ready()) { if (typeof GK_CHAR !== "undefined" && GK_CHAR.get("COURTOIS") && GK_CHAR.get("COURTOIS").status === "idle") gkCharLoad("COURTOIS").catch(() => {}); setTimeout(tryStart, 150); return; }
    GK_PRESENTATION.set("SKELETAL_3D"); GL3D.character = "COURTOIS"; const ce = document.getElementById("gk3d-character"); if (ce) ce.value = "COURTOIS";
    if (!(S.pt && S.pt.on)) ptEnter(); ptReset(); gkAnimResetView(); if (typeof gk3dReset === "function") gk3dReset();
    gkPlayInstall(); gkPlaySetControl("KEEPER"); S.pt.last = "COURTOIS PLAYTEST — keyboard on the keeper (TAB for the shooter)"; gkPlayHud();
  };
  tryStart();
}
window.addEventListener("load", () => setTimeout(gkPlayBoot, 300));

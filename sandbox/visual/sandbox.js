/* Touchline Visual V1 — renderer + camera sandbox.
 *
 * Presentation-only. Consumes the frozen assets under assets/visual_v1/
 * (addressed via MANIFEST.json, never hardcoded frame lists) and its own
 * fixture data. No engine code is imported and no simulation runs here.
 *
 * World space: metres. Pitch x∈[0,105] (goals left/right), y∈[0,68]
 * with y=0 the far touchline (top of screen). The camera is a pure
 * presentation transform: screen = (world - cam) * zoom, with the y axis
 * additionally compressed by `tilt` (FC-style high sideline broadcast look).
 * Sprites are drawn upright and undistorted; tilt applies to the ground
 * plane only. Sprites are never scaled by screen depth.
 */
"use strict";

const ASSET_ROOT = "../../assets/visual_v1/";
const REF_ZOOM = 32;            // px per metre at which tiles & sprites are 1:1 native
const SPRITE_M_PER_PX = 1 / REF_ZOOM;
const PITCH = { w: 105, h: 68 };
const GRASS_ZONE = { x0: -3, x1: 108, y0: -3, y1: 71 };   // pitch-grass texture zone (extends past lines)
const APRON = { x0: -8, x1: 113, y0: -8, y1: 76 };        // perimeter turf beyond that
const DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];

const DEFAULTS = {
  tilt: 0.75, zoom: 1.0, cov: 42, smooth: 0.35,
  pscale: 1.0, jogfps: 10, sprintfps: 12, rate: 1.0,
};

// ---------------------------------------------------------------- state
const S = {
  manifest: null, pivots: null, tilesMeta: null,
  images: {},          // path -> HTMLImageElement
  anims: null,         // {idle:{dir:[img]}, jog:{dir:[img...]}, sprint:{dir:[img...]}}
  cam: { x: 52.5, y: 34, mode: "static" },
  ui: { ...DEFAULTS },
  dbg: { anchors: false, grid: false, track: false },
  pause: false, snap: true,
  scene: "midfield",
  players: [],         // {x,y,heading,state,team,frame,ft,test}
  ball: { x: 52.5, y: 34 },
  test: { state: "idle", autorot: false, heading: 90, ballmove: false, ramp: { t: 0 }, speed: 0 },
  time: 0,
  ground: null,        // prerendered ground canvas @ REF_ZOOM px/m
};

const cv = document.getElementById("view");
const ctx = cv.getContext("2d");

// ---------------------------------------------------------------- loading
async function loadJSON(p) {
  const r = await fetch(p);
  if (!r.ok) throw new Error(`fetch failed: ${p} (${r.status})`);
  return r.json();
}
function loadImage(p) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("image failed: " + p));
    im.src = p;
  });
}

function framePaths(manifest) {
  // Build all frame paths from the manifest (templates use {direction}/{frame}).
  const jobs = [];   // {key:[kind,dir,idx], path}
  const sub = (tpl, dir, frame) =>
    ASSET_ROOT + tpl.replace("{direction}", dir).replace("{frame}", frame);

  for (const d of DIRS)
    jobs.push({ key: ["idle", d, 0], path: sub(manifest.idle.local_path, d, 0) });

  const groupTpl = {};
  groupTpl[manifest.jog.base_group.animation_group_id] = manifest.jog.base_group.local_path;
  groupTpl[manifest.jog.se_fill_group.animation_group_id] = manifest.jog.se_fill_group.local_path;
  for (const d of DIRS) {
    const m = manifest.jog.runtime_mapping[d];
    for (let i = 0; i < m.frames; i++)
      jobs.push({ key: ["jog", d, i], path: sub(groupTpl[m.animation_group_id], d, i) });
  }
  const spf = manifest.sprint.frames_per_direction;
  for (const d of DIRS)
    for (let i = 0; i < spf; i++)
      jobs.push({ key: ["sprint", d, i], path: sub(manifest.sprint.local_path, d, i) });
  return jobs;
}

async function boot() {
  const pctEl = document.getElementById("loadpct");
  S.manifest = await loadJSON(ASSET_ROOT + "MANIFEST.json");
  S.pivots = await loadJSON("pivots.json");
  const tmeta = await loadJSON(ASSET_ROOT + S.manifest.grass_tileset.local_paths.metadata);
  S.tilesMeta = tmeta.tileset_data.tiles;

  const jobs = framePaths(S.manifest);
  jobs.push({ key: ["sheet", "-", 0], path: ASSET_ROOT + S.manifest.grass_tileset.local_paths.sheet });

  let done = 0;
  const anims = { idle: {}, jog: {}, sprint: {} };
  await Promise.all(jobs.map(async (j) => {
    const im = await loadImage(j.path);
    done++; pctEl.textContent = Math.round((done / jobs.length) * 100) + "%";
    const [kind, dir, idx] = j.key;
    if (kind === "sheet") { S.images.sheet = im; return; }
    (anims[kind][dir] ||= [])[idx] = im;
  }));
  S.anims = anims;

  buildGround();
  bindUI();
  setScene("midfield");
  document.getElementById("loading").style.display = "none";
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- ground prerender
function buildGround() {
  const W = (APRON.x1 - APRON.x0) * REF_ZOOM, H = (APRON.y1 - APRON.y0) * REF_ZOOM;
  const g = document.createElement("canvas");
  g.width = W; g.height = H;
  const c = g.getContext("2d");
  c.imageSmoothingEnabled = false;

  // world (m) -> ground-canvas px
  const gx = (x) => (x - APRON.x0) * REF_ZOOM;
  const gy = (y) => (y - APRON.y0) * REF_ZOOM;
  const M = REF_ZOOM; // px per metre

  // 1) Wang-tiled grass. Corner label: inside GRASS_ZONE => "upper" (pitch grass),
  //    else "lower" (perimeter turf). Tiles sliced strictly by metadata bounding_box.
  const inZone = (x, y) =>
    x >= GRASS_ZONE.x0 && x <= GRASS_ZONE.x1 && y >= GRASS_ZONE.y0 && y <= GRASS_ZONE.y1;
  const byCorners = {};
  for (const t of S.tilesMeta)
    byCorners[[t.corners.NW, t.corners.NE, t.corners.SW, t.corners.SE].join("|")] = t.bounding_box;
  for (let ty = APRON.y0; ty < APRON.y1; ty++) {
    for (let tx = APRON.x0; tx < APRON.x1; tx++) {
      const key = [
        inZone(tx, ty) ? "upper" : "lower",
        inZone(tx + 1, ty) ? "upper" : "lower",
        inZone(tx, ty + 1) ? "upper" : "lower",
        inZone(tx + 1, ty + 1) ? "upper" : "lower",
      ].join("|");
      const b = byCorners[key];
      c.drawImage(S.images.sheet, b.x, b.y, b.width, b.height, gx(tx), gy(ty), M, M);
    }
  }

  // 2) Pitch-scale mowing bands (14 bands across the 105 m length, extended over the zone).
  const bandW = PITCH.w / 14;
  for (let x = GRASS_ZONE.x0; x < GRASS_ZONE.x1; x += 0.0001) {
    const k = Math.floor((x - 0) / bandW + 1e-9);
    const x0 = Math.max(GRASS_ZONE.x0, k * bandW), x1 = Math.min(GRASS_ZONE.x1, (k + 1) * bandW);
    c.fillStyle = ((k % 2 + 2) % 2) === 0 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.05)";
    c.fillRect(gx(x0), gy(GRASS_ZONE.y0), (x1 - x0) * M, (GRASS_ZONE.y1 - GRASS_ZONE.y0) * M);
    x = x1;
  }

  // 3) Procedural markings (authoritative geometry — independent of the texture).
  c.strokeStyle = "rgba(250,250,250,0.92)";
  c.fillStyle = "rgba(250,250,250,0.92)";
  c.lineWidth = 0.12 * M;
  const line = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(gx(x0), gy(y0)); c.lineTo(gx(x1), gy(y1)); c.stroke(); };
  const arc = (x, y, r, a0, a1) => { c.beginPath(); c.arc(gx(x), gy(y), r * M, a0, a1); c.stroke(); };
  const spot = (x, y) => { c.beginPath(); c.arc(gx(x), gy(y), 0.22 * M, 0, Math.PI * 2); c.fill(); };

  c.strokeRect(gx(0), gy(0), PITCH.w * M, PITCH.h * M);       // touch + goal lines
  line(52.5, 0, 52.5, 68);                                     // halfway
  arc(52.5, 34, 9.15, 0, Math.PI * 2);                         // centre circle
  spot(52.5, 34);                                              // centre spot
  for (const side of [0, 1]) {                                 // 0 = left, 1 = right
    const sx = (x) => side ? 105 - x : x;
    c.strokeRect(gx(sx(side ? 16.5 : 0)), gy(34 - 20.16), 16.5 * M * (side ? 1 : 1), 40.32 * M); // penalty area
    c.strokeRect(gx(sx(side ? 5.5 : 0)), gy(34 - 9.16), 5.5 * M, 18.32 * M);                      // six-yard
    spot(sx(11), 34);                                          // penalty spot
    const t = Math.acos((16.5 - 11) / 9.15);                   // penalty arc (outside area only)
    if (side === 0) arc(11, 34, 9.15, -t, t); else arc(94, 34, 9.15, Math.PI - t, Math.PI + t);
  }
  arc(0, 0, 1, 0, Math.PI / 2); arc(105, 0, 1, Math.PI / 2, Math.PI);          // corner arcs
  arc(105, 68, 1, Math.PI, Math.PI * 1.5); arc(0, 68, 1, Math.PI * 1.5, Math.PI * 2);

  // 4) Simple temporary goals (procedural — spatial/camera evaluation only).
  c.lineWidth = 0.14 * M;
  for (const side of [0, 1]) {
    const gxl = side ? 105 : -2, x0 = side ? 105 : -2;
    const yTop = 34 - 3.66, yBot = 34 + 3.66;
    c.strokeStyle = "rgba(255,255,255,0.9)";
    c.strokeRect(gx(x0), gy(yTop), 2 * M, 7.32 * M);
    c.strokeStyle = "rgba(255,255,255,0.30)";                  // net impression
    c.lineWidth = 0.04 * M;
    for (let nx = 0.5; nx < 2; nx += 0.5) line(x0 + nx, yTop, x0 + nx, yBot);
    for (let ny = yTop + 0.6; ny < yBot; ny += 0.6) line(x0, ny, x0 + 2, ny);
    c.lineWidth = 0.14 * M;
  }
  S.ground = g;
}

// ---------------------------------------------------------------- camera / projection
function zoomPx() { return (cv.width / S.ui.cov) * S.ui.zoom; }   // px per metre
function w2sx(wx) { return (wx - S.cam.x) * zoomPx() + cv.width / 2; }
function w2sy(wy) { return (wy - S.cam.y) * zoomPx() * S.ui.tilt + cv.height / 2; }

function camTarget() {
  if (S.cam.mode === "static") return { x: 52.5, y: 34 };
  if (S.cam.mode === "ball") return { x: S.ball.x, y: S.ball.y };
  // play follow: weighted centre of ball + players within 18 m of the ball
  let sx = 0, sy = 0, n = 0;
  for (const p of S.players) {
    const d = Math.hypot(p.x - S.ball.x, p.y - S.ball.y);
    if (d < 18) { sx += p.x; sy += p.y; n++; }
  }
  if (!n) return { x: S.ball.x, y: S.ball.y };
  return { x: 0.55 * S.ball.x + 0.45 * (sx / n), y: 0.55 * S.ball.y + 0.45 * (sy / n) };
}

function updateCamera(dt) {
  const t = camTarget();
  S.cam.target = t;
  // clamp so framing stays around the pitch
  const hw = cv.width / 2 / zoomPx(), hh = cv.height / 2 / (zoomPx() * S.ui.tilt);
  const cl = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const tx = cl(t.x, Math.min(hw - 8, 52.5), Math.max(105 - hw + 8, 52.5));
  const ty = cl(t.y, Math.min(hh - 8, 34), Math.max(68 - hh + 8, 34));
  const tau = S.ui.smooth;
  const k = tau <= 0.001 ? 1 : 1 - Math.exp(-dt / tau);
  S.cam.x += (tx - S.cam.x) * k;
  S.cam.y += (ty - S.cam.y) * k;
}

// ---------------------------------------------------------------- fixtures (scenes)
function P(x, y, heading, state, team, test) {
  return { x, y, heading, state, team, frame: 0, ft: Math.random() * 0.1, test: !!test };
}
const SCENES = {
  midfield() {
    const a = [P(6, 34, 0, "idle", 0)], b = [P(99, 34, 180, "idle", 1)];
    for (const y of [12, 26, 42, 56]) a.push(P(20, y, 0, "idle", 0));
    for (const y of [22, 34, 46]) a.push(P(38, y, 0, "jog", 0));
    for (const y of [14, 34, 54]) a.push(P(50, y, 0, "idle", 0));
    for (const y of [12, 26, 42, 56]) b.push(P(85, y, 180, "idle", 1));
    for (const y of [12, 28, 40, 56]) b.push(P(67, y, 180, "jog", 1));
    for (const y of [28, 40]) b.push(P(56, y, 180, "idle", 1));
    return { players: [...a, ...b], ball: { x: 52.5, y: 34 } };
  },
  attacking() {
    const ps = [
      P(6, 34, 0, "idle", 0), P(55, 14, 45, "jog", 0), P(58, 30, 20, "jog", 0),
      P(56, 44, 0, "idle", 0), P(60, 56, 340 % 360, "jog", 0),
      P(74, 20, 30, "sprint", 0), P(78, 34, 0, "sprint", 0), P(75, 48, 330, "jog", 0),
      P(88, 14, 60, "sprint", 0), P(92, 28, 15, "sprint", 0), P(86, 46, 300, "sprint", 0),
      P(102, 34, 180, "idle", 1), P(97, 22, 200, "jog", 1), P(95, 34, 180, "jog", 1),
      P(96, 46, 160, "jog", 1), P(90, 16, 220, "sprint", 1), P(89, 40, 180, "sprint", 1),
      P(84, 28, 200, "jog", 1), P(80, 52, 150, "jog", 1), P(70, 34, 180, "idle", 1),
      P(62, 20, 180, "idle", 1), P(58, 50, 180, "idle", 1),
    ];
    return { players: ps, ball: { x: 88, y: 30 } };
  },
  touchline() {
    const ps = [
      P(6, 34, 0, "idle", 0), P(30, 40, 0, "idle", 0), P(40, 52, 45, "jog", 0),
      P(55, 58, 45, "jog", 0), P(62, 63, 90, "sprint", 0), P(68, 66, 0, "sprint", 0),
      P(74, 62, 315, "jog", 0), P(80, 55, 0, "idle", 0), P(52, 44, 45, "jog", 0),
      P(45, 30, 0, "idle", 0), P(60, 20, 0, "idle", 0),
      P(99, 34, 180, "idle", 1), P(88, 45, 180, "idle", 1), P(78, 60, 225, "jog", 1),
      P(72, 64, 180, "sprint", 1), P(66, 62, 135, "sprint", 1), P(60, 65, 90, "jog", 1),
      P(56, 55, 180, "jog", 1), P(48, 48, 180, "idle", 1), P(65, 40, 200, "idle", 1),
      P(75, 30, 180, "idle", 1), P(85, 20, 180, "idle", 1),
    ];
    return { players: ps, ball: { x: 66, y: 67 } };
  },
  goalmouth() {
    const ps = [
      P(103.5, 34, 180, "idle", 1),                                   // GK on the line
      P(101, 28, 200, "idle", 1), P(100, 40, 160, "idle", 1),
      P(98, 32, 180, "jog", 1), P(98, 37, 180, "jog", 1),
      P(95, 25, 200, "jog", 1), P(95, 43, 160, "jog", 1), P(92, 34, 180, "idle", 1),
      P(99, 31, 0, "jog", 0), P(99, 36, 45, "jog", 0), P(97, 29, 20, "sprint", 0),
      P(96, 39, 340, "sprint", 0), P(93, 30, 0, "jog", 0), P(93, 38, 0, "jog", 0),
      P(89, 34, 0, "idle", 0), P(88, 22, 45, "jog", 0), P(88, 46, 315, "jog", 0),
      P(80, 34, 0, "idle", 0), P(78, 20, 0, "idle", 0), P(78, 48, 0, "idle", 0),
      P(60, 34, 0, "idle", 0), P(6, 34, 0, "idle", 0),
    ];
    return { players: ps, ball: { x: 99, y: 33 } };
  },
  dirtest() {
    return { players: [P(52.5, 34, 90, "jog", 0, true)], ball: { x: 52.5, y: 39 }, autorot: true };
  },
  locotest() {
    return { players: [P(35, 34, 0, "idle", 0, true)], ball: { x: 35, y: 38 }, ramp: true };
  },
};

function setScene(name) {
  S.scene = name;
  const sc = SCENES[name]();
  S.players = sc.players;
  S.ball = sc.ball;
  document.querySelectorAll(".scenes button").forEach(b =>
    b.classList.toggle("active", b.dataset.scene === name));
  const auto = document.getElementById("autorot");
  auto.checked = !!sc.autorot;
  S.test.autorot = !!sc.autorot;
  if (name === "locotest") {
    document.querySelector('input[name=tstate][value=ramp]').checked = true;
    S.test.state = "ramp"; S.test.ramp.t = 0;
  }
  S.cam.x = 52.5; S.cam.y = 34;
}

// ---------------------------------------------------------------- per-frame update
function headingToDir(h) { return DIRS[Math.round(((h % 360) + 360) % 360 / 45) % 8]; }

function update(dt) {
  S.time += dt;
  const test = S.players.find(p => p.test);

  if (!S.pause) {
    // test player behaviour
    if (test) {
      if (S.test.autorot) { S.test.heading = (S.test.heading + 15 * dt) % 360; setHeadingUI(); }
      test.heading = S.test.heading;
      if (S.test.state === "ramp") {
        S.test.ramp.t += dt;
        const ph = (1 - Math.cos((2 * Math.PI * S.test.ramp.t) / 16)) / 2; // 0→1→0 over 16 s
        const speed = 9 * ph;
        S.test.speed = speed;
        test.state = speed < 0.3 ? "idle" : speed < 5.8 ? "jog" : "sprint";
        if (S.scene === "locotest") {                     // fixture translation, not simulation
          test.x += Math.cos(test.heading * Math.PI / 180) * speed * dt;
          test.y += Math.sin(test.heading * Math.PI / 180) * speed * dt;
          if (test.x > 80) { test.x = 80; test.heading = 180; S.test.heading = 180; setHeadingUI(); }
          if (test.x < 28) { test.x = 28; test.heading = 0; S.test.heading = 0; setHeadingUI(); }
        }
      } else {
        test.state = S.test.state; S.test.speed = 0;
      }
    }
    if (S.test.ballmove) {
      S.ball.x = 52.5 + 25 * Math.sin(S.time * 0.35);
      S.ball.y = 34 + 16 * Math.sin(S.time * 0.7);
    }
    // animation clocks
    for (const p of S.players) {
      if (p.state === "idle") { p.frame = 0; continue; }
      const fps = (p.state === "jog" ? S.ui.jogfps : S.ui.sprintfps) * S.ui.rate;
      p.ft += dt * fps;
      p.frame = Math.floor(p.ft) % 8;
    }
  }
  updateCamera(dt);
}

// ---------------------------------------------------------------- drawing
function spriteScale() {
  const s = (zoomPx() / REF_ZOOM) * S.ui.pscale;
  return S.snap ? Math.max(1, Math.round(s)) : s;
}

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0e130e";
  ctx.fillRect(0, 0, cv.width, cv.height);

  // ground (prerendered @ REF_ZOOM), one nearest-neighbour blit with tilt compression
  const z = zoomPx();
  ctx.drawImage(S.ground,
    Math.round(w2sx(APRON.x0)), Math.round(w2sy(APRON.y0)),
    Math.round((APRON.x1 - APRON.x0) * z), Math.round((APRON.y1 - APRON.y0) * z * S.ui.tilt));

  if (S.dbg.grid) drawGrid();

  // ball shadow + players (painter's order by world y) + ball
  const order = [...S.players].sort((a, b) => a.y - b.y);
  const s = spriteScale();
  for (const p of order) drawPlayer(p, s);
  drawBall();
  if (S.dbg.anchors) for (const p of order) drawAnchors(p, s);
  if (S.dbg.track && S.cam.target) {
    const x = w2sx(S.cam.target.x), y = w2sy(S.cam.target.y);
    ctx.strokeStyle = "#ff5ce0"; ctx.lineWidth = 2;
    ctx.strokeRect(x - 7, y - 7, 14, 14);
    ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x + 11, y);
    ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 11); ctx.stroke();
  }
  drawReadout();
}

function drawPlayer(p, s) {
  const dir = headingToDir(p.heading);
  const frames = S.anims[p.state][dir];
  const im = frames[p.state === "idle" ? 0 : p.frame % frames.length];
  const ax = Math.round(w2sx(p.x)), ay = Math.round(w2sy(p.y));

  // ground contact: team ring + soft shadow (presentation only, PNGs untouched)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ax, ay, 9 * s, 4 * s * S.ui.tilt + 1, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
  ctx.lineWidth = Math.max(1, Math.round(s));
  ctx.strokeStyle = p.team === 0 ? "rgba(80,220,255,0.9)" : "rgba(255,225,70,0.9)";
  ctx.stroke();
  ctx.restore();

  const w = im.width, h = im.height;
  const foot = h / 2 + S.pivots.foot_offset_base128;   // canvas-centre pivot + constant foot offset
  ctx.drawImage(im, Math.round(ax - (w / 2) * s), Math.round(ay - foot * s),
    Math.round(w * s), Math.round(h * s));
}

function drawBall() {
  const x = Math.round(w2sx(S.ball.x)), y = Math.round(w2sy(S.ball.y));
  const r = Math.max(3, 0.16 * zoomPx());
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 1.1, r * 0.5 * S.ui.tilt + 1, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f2f2f2"; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = "#333"; ctx.stroke();
  ctx.fillStyle = "#444";
  ctx.fillRect(x - 1, y - 1, Math.max(1, r * 0.4), Math.max(1, r * 0.4));
}

function drawAnchors(p, s) {
  const dir = headingToDir(p.heading);
  const frames = S.anims[p.state][dir];
  const im = frames[p.state === "idle" ? 0 : p.frame % frames.length];
  const ax = Math.round(w2sx(p.x)), ay = Math.round(w2sy(p.y));
  const w = im.width, h = im.height;
  const foot = h / 2 + S.pivots.foot_offset_base128;
  const bx = Math.round(ax - (w / 2) * s), by = Math.round(ay - foot * s);

  ctx.strokeStyle = "rgba(120,200,255,0.85)"; ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, Math.round(w * s), Math.round(h * s));     // sprite bbox
  ctx.strokeStyle = "#ff4040";                                                   // world ground point
  ctx.beginPath(); ctx.moveTo(ax - 6, ay); ctx.lineTo(ax + 6, ay);
  ctx.moveTo(ax, ay - 6); ctx.lineTo(ax, ay + 6); ctx.stroke();
  const px = ax, py = Math.round(by + (h / 2) * s);                              // canvas-centre pivot
  ctx.fillStyle = "#ffd23c"; ctx.fillRect(px - 2, py - 2, 4, 4);
  const hr = p.heading * Math.PI / 180;                                          // facing arrow
  ctx.strokeStyle = "#5cff8a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ax, ay);
  ctx.lineTo(ax + Math.cos(hr) * 22, ay + Math.sin(hr) * 22 * S.ui.tilt); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "11px monospace"; ctx.textAlign = "center";
  ctx.fillText(`${p.state} ${dir} f${p.state === "idle" ? 0 : p.frame % frames.length} ${im.width}×${im.height}`,
    ax, by - 4);
}

function drawGrid() {
  const z = zoomPx();
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px monospace"; ctx.textAlign = "left";
  for (let x = 0; x <= 105; x += 5) {
    const sx = Math.round(w2sx(x));
    ctx.beginPath(); ctx.moveTo(sx, w2sy(0)); ctx.lineTo(sx, w2sy(68)); ctx.stroke();
    ctx.fillText(String(x), sx + 2, w2sy(0) - 3);
  }
  for (let y = 0; y <= 68; y += 5) {
    const sy = Math.round(w2sy(y));
    ctx.beginPath(); ctx.moveTo(w2sx(0), sy); ctx.lineTo(w2sx(105), sy); ctx.stroke();
    ctx.fillText(String(y), w2sx(0) - 22, sy + 3);
  }
}

function drawReadout() {
  const el = document.getElementById("readout");
  const z = zoomPx();
  el.textContent =
    `scene    ${S.scene}\n` +
    `camera   mode=${S.cam.mode}  pos=(${S.cam.x.toFixed(1)}, ${S.cam.y.toFixed(1)}) m\n` +
    `zoom     ${z.toFixed(1)} px/m  (native 1:1 at ${REF_ZOOM})\n` +
    `sprite×  ${spriteScale().toFixed(2)}${S.snap ? " (snapped)" : ""}\n` +
    `ball     (${S.ball.x.toFixed(1)}, ${S.ball.y.toFixed(1)}) m\n` +
    `test     heading=${Math.round(S.test.heading)}°  facing=${headingToDir(S.test.heading)}` +
    (S.test.state === "ramp" ? `  speed=${S.test.speed.toFixed(1)} m/s` : "");
}

// ---------------------------------------------------------------- UI
function setHeadingUI() {
  document.getElementById("heading").value = Math.round(S.test.heading);
  document.getElementById("v-heading").textContent = Math.round(S.test.heading);
}

function bindUI() {
  const bindRange = (id, key, fmt = (v) => v) => {
    const el = document.getElementById(id), out = document.getElementById("v-" + id);
    el.value = S.ui[key];
    out.textContent = fmt(S.ui[key]);
    el.addEventListener("input", () => { S.ui[key] = parseFloat(el.value); out.textContent = fmt(S.ui[key]); });
    return el;
  };
  bindRange("tilt", "tilt", v => v.toFixed(2));
  bindRange("zoom", "zoom", v => v.toFixed(2));
  bindRange("cov", "cov", v => v + " m");
  bindRange("smooth", "smooth", v => v.toFixed(2));
  bindRange("pscale", "pscale", v => v.toFixed(2));
  bindRange("jogfps", "jogfps");
  bindRange("sprintfps", "sprintfps");
  bindRange("rate", "rate", v => v.toFixed(2));

  document.getElementById("reset").addEventListener("click", () => {
    S.ui = { ...DEFAULTS };
    for (const [id, key, fmt] of [["tilt", "tilt", v => v.toFixed(2)], ["zoom", "zoom", v => v.toFixed(2)],
      ["cov", "cov", v => v + " m"], ["smooth", "smooth", v => v.toFixed(2)],
      ["pscale", "pscale", v => v.toFixed(2)], ["jogfps", "jogfps", v => v], ["sprintfps", "sprintfps", v => v],
      ["rate", "rate", v => v.toFixed(2)]]) {
      document.getElementById(id).value = S.ui[key];
      document.getElementById("v-" + id).textContent = fmt(S.ui[key]);
    }
  });

  for (const r of document.querySelectorAll("input[name=cammode]"))
    r.addEventListener("change", () => { if (r.checked) S.cam.mode = r.value; });
  for (const r of document.querySelectorAll("input[name=tstate]"))
    r.addEventListener("change", () => {
      if (r.checked) { S.test.state = r.value; if (r.value === "ramp") S.test.ramp.t = 0; }
    });

  const cb = (id, fn) => document.getElementById(id).addEventListener("change", (e) => fn(e.target.checked));
  cb("pause", v => S.pause = v);
  cb("snap", v => S.snap = v);
  cb("autorot", v => S.test.autorot = v);
  cb("ballmove", v => S.test.ballmove = v);
  cb("dbg-anchors", v => S.dbg.anchors = v);
  cb("dbg-grid", v => S.dbg.grid = v);
  cb("dbg-track", v => S.dbg.track = v);

  const hd = document.getElementById("heading");
  hd.value = S.test.heading;
  document.getElementById("v-heading").textContent = S.test.heading;
  hd.addEventListener("input", () => {
    S.test.heading = parseFloat(hd.value);
    document.getElementById("v-heading").textContent = Math.round(S.test.heading);
  });

  for (const b of document.querySelectorAll(".scenes button"))
    b.addEventListener("click", () => setScene(b.dataset.scene));

  const resize = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; };
  window.addEventListener("resize", resize);
  resize();
}

// ---------------------------------------------------------------- main loop
let last = 0;
function tick(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts;
  update(dt);
  draw();
  requestAnimationFrame(tick);
}

boot().catch(err => {
  document.getElementById("loading").innerHTML =
    "Failed to load assets.<br>" + err.message +
    "<br><br>Serve the repo root over HTTP, e.g.:<br><code>python3 -m http.server 8123</code>" +
    "<br>then open <code>http://localhost:8123/sandbox/visual/</code>";
});

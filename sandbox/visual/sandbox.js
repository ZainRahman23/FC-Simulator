/* Touchline Visual V1 — renderer + camera sandbox.
 *
 * Presentation-only. Consumes the frozen assets under assets/visual_v1/
 * (addressed via MANIFEST.json, never hardcoded frame lists) and its own
 * fixture data. No engine code is imported and no simulation runs here.
 *
 * CAMERA: true perspective projection of a flat 3D pitch. Authoritative
 * simulator coordinates (x, y) are treated as points on the world ground
 * plane: world = (x, 0, y), with y=0 the FAR touchline and y=68 the NEAR
 * touchline. A virtual perspective camera sits above and outside the near
 * sideline at (trackX, HEIGHT, 68 + SIDELINE_DIST), looking diagonally down
 * at a target on the pitch. The camera pans by translating along the
 * sideline (no yaw, no roll) — the conventional high broadcast/EA-FC-style
 * gameplay view. Goals stay screen-left/right.
 *
 * All ground geometry passes through this one projection:
 *  - grass texture: per-scanline homography resampling of the prerendered
 *    plane (for a no-roll camera every screen row maps affinely to one
 *    world line, so this is mathematically identical to projecting every
 *    plane point — NOT an affine squash of a finished top-down image);
 *  - markings/goals/grid: vector geometry projected vertex-by-vertex each
 *    frame (world circles become true perspective conics).
 * Player sprites remain unwarped, unsquashed, screen-facing billboards
 * anchored at their projected foot point, nearest-neighbour only, constant
 * screen size with depth.
 */
"use strict";

const ASSET_ROOT = "../../assets/visual_v1/";
const REF_ZOOM = 32;            // px per metre of the prerendered ground texture
const SPRITE_M_PER_PX = 1 / REF_ZOOM;
const PITCH = { w: 105, h: 68 };
const GRASS_ZONE = { x0: -3, x1: 108, y0: -3, y1: 71 };   // pitch-grass texture zone (extends past lines)
const APRON = { x0: -8, x1: 113, y0: -8, y1: 76 };        // perimeter turf beyond that
const DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];

// CAMERA_V1 — accepted working production defaults (2026-08-27 visual review).
// Working defaults, not immutable constants: the developer controls stay live.
const DEFAULTS = {
  height: 30, dist: 43, fov: 28, depthoff: 3, smooth: 0.35,
  pscale: 0.85, jogfps: 10, sprintfps: 12, rate: 1.0,
};

// ---------------------------------------------------------------- state
const S = {
  manifest: null, pivots: null, tilesMeta: null,
  images: {},          // path -> HTMLImageElement
  anims: null,         // {idle:{dir:[img]}, jog:{dir:[img...]}, sprint:{dir:[img...]}}
  cam: { x: 52.5, z: 34, mode: "static", target: null },
  ui: { ...DEFAULTS },
  dbg: { anchors: false, grid: false, track: false },
  // snap defaults OFF: CAMERA_V1 was reviewed with fractional sprite scale
  // (0.85×), which integer snapping would override.
  pause: false, snap: false,
  scene: "midfield",
  players: [],         // {x,y,heading,state,team,frame,ft,test}
  ball: { x: 52.5, y: 34 },
  test: { state: "idle", autorot: false, heading: 90, ballmove: false, ramp: { t: 0 }, speed: 0 },
  time: 0,
  ground: null,        // prerendered ground canvas @ REF_ZOOM px/m (grass + mowing only)
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
  jobs.push({ key: ["goalart", "-", 0], path: ASSET_ROOT + S.manifest.goal_art.local_path });
  jobs.push({ key: ["standart", "-", 0], path: ASSET_ROOT + S.manifest.stadium_art.local_path });

  let done = 0;
  const anims = { idle: {}, jog: {}, sprint: {} };
  await Promise.all(jobs.map(async (j) => {
    const im = await loadImage(j.path);
    done++; pctEl.textContent = Math.round((done / jobs.length) * 100) + "%";
    const [kind, dir, idx] = j.key;
    if (kind === "sheet") { S.images.sheet = im; return; }
    if (kind === "goalart") { S.images.goalRaw = im; return; }
    if (kind === "standart") { S.images.stand = im; return; }
    (anims[kind][dir] ||= [])[idx] = im;
  }));
  S.anims = anims;
  // Derived presentation copies (stored originals untouched): strip the baked
  // grass mound from the goal art (deterministic chroma rule), and mirror it
  // for the right-hand goal instead of spending a second generation.
  S.images.goalClean = chromaStripGreen(S.images.goalRaw);
  S.images.goalMirror = mirrorCanvas(S.images.goalClean);

  buildGround();
  bindUI();
  setScene("midfield");
  document.getElementById("loading").style.display = "none";
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- derived art
// Goal art content bbox after the grass-strip pass (measured 2026-08-27; see
// MANIFEST.json goal_art.content_bbox_after_grass_strip).
const GOAL_ART = { x0: 8, x1: 129, y0: 46, y1: 149 };
const GOAL_TARGET_H_M = 2.6;      // rendered goal height in player-metric terms
const PLAYER_PX_PER_M = 52.8;     // measured: 95px idle content = 1.8 m
const WALL_H_M = 12;              // stadium stand wall height (scenery only)

function chromaStripGreen(img) {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const cc = c.getContext("2d", { willReadFrequently: true });
  cc.imageSmoothingEnabled = false;
  cc.drawImage(img, 0, 0);
  const id = cc.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4)
    if (d[i + 3] > 0 && d[i + 1] > d[i] + 20 && d[i + 1] > d[i + 2] + 20) d[i + 3] = 0;
  cc.putImageData(id, 0, 0);
  return c;
}
function mirrorCanvas(src) {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const cc = c.getContext("2d");
  cc.imageSmoothingEnabled = false;
  cc.translate(src.width, 0); cc.scale(-1, 1);
  cc.drawImage(src, 0, 0);
  return c;
}

// ---------------------------------------------------------------- ground prerender
// Deterministic integer hash -> [0,1). Same output every load (no Math.random).
function hash01(x, y) {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}
// Smooth deterministic value noise on a unit lattice.
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash01(xi, yi), b = hash01(xi + 1, yi);
  const cc = hash01(xi, yi + 1), dd = hash01(xi + 1, yi + 1);
  return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + dd) * sx * sy;
}
// Read one tile out of the frozen sheet (by its metadata bounding_box) and
// return its exact pixel-art palette, luminance-sorted, with a pick(n) that
// reproduces the tile's original colour proportions. Read-only: the source
// sheet is only sampled, never modified.
function extractPalette(bb) {
  const t = document.createElement("canvas");
  t.width = bb.width; t.height = bb.height;
  const tc = t.getContext("2d", { willReadFrequently: true });
  tc.imageSmoothingEnabled = false;
  tc.drawImage(S.images.sheet, bb.x, bb.y, bb.width, bb.height, 0, 0, bb.width, bb.height);
  const px = tc.getImageData(0, 0, bb.width, bb.height).data;
  const counts = new Map();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const lum = (k) => 0.299 * (k >> 16 & 255) + 0.587 * (k >> 8 & 255) + 0.114 * (k & 255);
  const entries = [...counts.entries()].sort((a, b) => lum(a[0]) - lum(b[0]));
  const total = entries.reduce((s, e) => s + e[1], 0);
  let acc = 0;
  const cdf = entries.map(([k, n]) => {
    acc += n;
    return { cum: acc / total, rgb: [k >> 16 & 255, k >> 8 & 255, k & 255] };
  });
  return {
    pick(n) {
      if (n <= 0) return cdf[0].rgb;
      for (const e of cdf) if (n <= e.cum) return e.rgb;
      return cdf[cdf.length - 1].rgb;
    },
  };
}

function buildGround() {
  // Grass surface + mowing bands only. Markings/goals are vector geometry
  // projected per frame so they pass through the perspective camera directly.
  const W = (APRON.x1 - APRON.x0) * REF_ZOOM, H = (APRON.y1 - APRON.y0) * REF_ZOOM;
  const g = document.createElement("canvas");
  g.width = W; g.height = H;
  const c = g.getContext("2d");
  c.imageSmoothingEnabled = false;

  const gx = (x) => (x - APRON.x0) * REF_ZOOM;
  const gy = (y) => (y - APRON.y0) * REF_ZOOM;
  const M = REF_ZOOM;

  // 1) Continuous grass surface synthesized from the frozen tileset's palettes.
  //    (Derived presentation texture; source PNGs untouched. See phase-2 notes:
  //    per-metre tile stamping exposed the tile's internal micro-stripes.)
  const byCorners = {};
  for (const t of S.tilesMeta)
    byCorners[[t.corners.NW, t.corners.NE, t.corners.SW, t.corners.SE].join("|")] = t.bounding_box;
  const palUpper = extractPalette(byCorners["upper|upper|upper|upper"]);
  const palLower = extractPalette(byCorners["lower|lower|lower|lower"]);

  const img = c.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    const wy = APRON.y0 + py / M;
    for (let px = 0; px < W; px++) {
      const wx = APRON.x0 + px / M;
      const dist = Math.max(GRASS_ZONE.x0 - wx, wx - GRASS_ZONE.x1,
                            GRASS_ZONE.y0 - wy, wy - GRASS_ZONE.y1);
      let pal = palUpper;
      if (dist > 0.5) pal = palLower;
      else if (dist > -0.5) pal = (hash01(px, py) < 0.5 - dist) ? palUpper : palLower;
      let n = 0.55 * vnoise(wx / 7, wy / 7)
            + 0.30 * vnoise(wx / 1.8 + 91.7, wy / 1.8 + 33.3)
            + 0.15 * hash01(px + 7349, py + 1201);
      const col = pal.pick(n);
      const o = (py * W + px) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);

  // 2) Pitch-scale mowing bands (14 bands across the 105 m length, extended over the zone).
  const bandW = PITCH.w / 14;
  for (let x = GRASS_ZONE.x0; x < GRASS_ZONE.x1; x += 0.0001) {
    const k = Math.floor((x - 0) / bandW + 1e-9);
    const x0 = Math.max(GRASS_ZONE.x0, k * bandW), x1 = Math.min(GRASS_ZONE.x1, (k + 1) * bandW);
    c.fillStyle = ((k % 2 + 2) % 2) === 0 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.05)";
    c.fillRect(gx(x0), gy(GRASS_ZONE.y0), (x1 - x0) * M, (GRASS_ZONE.y1 - GRASS_ZONE.y0) * M);
    x = x1;
  }
  S.ground = g;
}

// ---------------------------------------------------------------- perspective camera
// Basis rebuilt each frame from the physical controls. No yaw, no roll:
// forward has no world-x component, so screen rows map affinely to world lines.
const CAM = { C: null, f: null, u: null, fpx: 0, czTarget: 1, lookAngle: 0 };

function rebuildCamera() {
  const h = S.ui.height;
  const C = { x: S.cam.x, y: h, z: PITCH.h + S.ui.dist };
  const T = { x: S.cam.x, y: 0, z: S.cam.z + S.ui.depthoff };
  const dz = T.z - C.z;                       // negative (looking toward far side)
  const len = Math.hypot(h, dz);
  const f = { y: -h / len, z: dz / len };     // forward (unit, x component = 0)
  const u = { y: -f.z, z: f.y };              // up = right × forward (unit)
  CAM.C = C; CAM.f = f; CAM.u = u;
  CAM.fpx = (cv.height / 2) / Math.tan((S.ui.fov * Math.PI / 180) / 2);
  CAM.czTarget = -h * f.y + dz * f.z;         // depth of the look target
  CAM.lookAngle = Math.atan2(h, -dz) * 180 / Math.PI;
}

// Project a ground-plane point (sim x, sim y) -> screen px. d = camera depth.
function project(wx, wz) {
  const vx = wx - CAM.C.x, vy = -CAM.C.y, vz = wz - CAM.C.z;
  const cy = vy * CAM.u.y + vz * CAM.u.z;
  const cz = vy * CAM.f.y + vz * CAM.f.z;
  return { x: cv.width / 2 + CAM.fpx * vx / cz, y: cv.height / 2 - CAM.fpx * cy / cz, d: cz };
}
// px per metre (horizontal) at a given camera depth; constant sprite sizing
// uses the look-target depth so framing controls stay coherent.
function pxPerMeter(depth) { return CAM.fpx / depth; }

function camTarget() {
  if (S.cam.mode === "static") return { x: 52.5, y: 34 };
  if (S.cam.mode === "ball") return { x: S.ball.x, y: S.ball.y };
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
  // clamp framing around the pitch using visible half-width at target depth
  const hw = (cv.width / 2) * CAM.czTarget / CAM.fpx;
  const cl = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const tx = cl(t.x, Math.min(hw - 8, 52.5), Math.max(105 - hw + 8, 52.5));
  const tz = cl(t.y, 14, 54);
  const tau = S.ui.smooth;
  const k = tau <= 0.001 ? 1 : 1 - Math.exp(-dt / tau);
  S.cam.x += (tx - S.cam.x) * k;
  S.cam.z += (tz - S.cam.z) * k;
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
      P(103.5, 34, 180, "idle", 1),
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
  camcal() {
    // Perspective validation: full centre circle, halfway line, players at
    // near / middle / far depth, both touchlines when framing permits.
    const ps = [];
    for (const y of [6, 20, 34, 48, 62])              // far -> near rows
      for (const x of [40, 52.5, 65])
        ps.push(P(x, y, x < 52 ? 0 : 180, y === 34 ? "jog" : "idle", x < 52 ? 0 : 1));
    return { players: ps, ball: { x: 52.5, y: 34 }, grid: true };
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
  if (sc.grid) { S.dbg.grid = true; document.getElementById("dbg-grid").checked = true; }
  if (name === "locotest") {
    document.querySelector('input[name=tstate][value=ramp]').checked = true;
    S.test.state = "ramp"; S.test.ramp.t = 0;
  }
  S.cam.x = 52.5; S.cam.z = 34;
}

// ---------------------------------------------------------------- per-frame update
function headingToDir(h) { return DIRS[Math.round(((h % 360) + 360) % 360 / 45) % 8]; }

function update(dt) {
  S.time += dt;
  const test = S.players.find(p => p.test);

  if (!S.pause) {
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
    for (const p of S.players) {
      if (p.state === "idle") { p.frame = 0; continue; }
      const fps = (p.state === "jog" ? S.ui.jogfps : S.ui.sprintfps) * S.ui.rate;
      p.ft += dt * fps;
      p.frame = Math.floor(p.ft) % 8;
    }
  }
  rebuildCamera();
  updateCamera(dt);
  rebuildCamera();   // basis follows the smoothed position within the same frame
}

// ---------------------------------------------------------------- drawing
function spriteScale() {
  const s = (pxPerMeter(CAM.czTarget) / REF_ZOOM) * S.ui.pscale;
  return S.snap ? Math.max(1, Math.round(s)) : s;
}

// Perspective ground: one affine texture row per screen scanline (exact
// homography for a no-roll camera). Nearest-neighbour, no smoothing.
function drawGroundPerspective() {
  const W = cv.width, H = cv.height;
  const h = CAM.C.y, zc = CAM.C.z, f = CAM.f, u = CAM.u, fpx = CAM.fpx;
  const gW = S.ground.width, gH = S.ground.height;
  for (let sy = 0; sy < H; sy++) {
    const s = (H / 2 - sy) / fpx;
    const denom = u.z - s * f.z;
    if (Math.abs(denom) < 1e-8) continue;
    const z = zc + h * (u.y - s * f.y) / denom;          // world depth line for this row
    if (z < APRON.y0 || z >= APRON.y1) continue;
    const cz = -h * f.y + (z - zc) * f.z;                // camera depth of that line
    if (cz < 0.5) continue;
    const halfWm = (W / 2) * cz / fpx;
    const xL = CAM.C.x - halfWm, xR = CAM.C.x + halfWm;  // world x visible on this row
    let srcX = (xL - APRON.x0) * REF_ZOOM;
    let srcW = (xR - xL) * REF_ZOOM;
    let dstX = 0, dstW = W;
    if (srcX < 0) { const cut = -srcX / srcW; dstX += cut * W; dstW -= cut * W; srcW += srcX; srcX = 0; }
    if (srcX + srcW > gW) { const cut = (srcX + srcW - gW) / ((xR - xL) * REF_ZOOM); dstW -= cut * W; srcW = gW - srcX; }
    if (srcW <= 0 || dstW <= 0) continue;
    const srcY = Math.min(gH - 1, Math.max(0, Math.floor((z - APRON.y0) * REF_ZOOM)));
    ctx.drawImage(S.ground, srcX, srcY, srcW, 1, dstX, sy, dstW, 1);
  }
}

// -- projected vector helpers (markings, goals, grid) --
function strokeWorldPoly(pts, close) {
  ctx.beginPath();
  let started = false;
  for (const [wx, wz] of pts) {
    const p = project(wx, wz);
    if (p.d < 0.5) { started = false; continue; }
    if (!started) { ctx.moveTo(p.x, p.y); started = true; }
    else ctx.lineTo(p.x, p.y);
  }
  if (close) ctx.closePath();
  ctx.stroke();
}
function circlePts(cx, cz, r, a0 = 0, a1 = Math.PI * 2) {
  const pts = [];
  const n = Math.max(8, Math.ceil((a1 - a0) / (Math.PI / 45)));   // ~4° steps
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return pts;
}
function fillWorldSpot(wx, wz, r) {
  ctx.beginPath();
  let first = true;
  for (const [x, z] of circlePts(wx, wz, r)) {
    const p = project(x, z);
    if (p.d < 0.5) return;
    if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawMarkings() {
  ctx.strokeStyle = "rgba(250,250,250,0.92)";
  ctx.fillStyle = "rgba(250,250,250,0.92)";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  const rect = (x, z, w, d) =>
    strokeWorldPoly([[x, z], [x + w, z], [x + w, z + d], [x, z + d]], true);

  rect(0, 0, PITCH.w, PITCH.h);                                   // touch + goal lines
  strokeWorldPoly([[52.5, 0], [52.5, 68]]);                       // halfway line
  strokeWorldPoly(circlePts(52.5, 34, 9.15));                     // centre circle (true conic)
  fillWorldSpot(52.5, 34, 0.25);                                  // centre spot
  for (const side of [0, 1]) {
    const mx = (x) => side ? 105 - x : x;
    rect(side ? 105 - 16.5 : 0, 34 - 20.16, 16.5, 40.32);         // penalty area
    rect(side ? 105 - 5.5 : 0, 34 - 9.16, 5.5, 18.32);            // six-yard box
    fillWorldSpot(mx(11), 34, 0.25);                              // penalty spot
    const t = Math.acos((16.5 - 11) / 9.15);                      // arc outside the area
    if (side === 0) strokeWorldPoly(circlePts(11, 34, 9.15, -t, t));
    else strokeWorldPoly(circlePts(94, 34, 9.15, Math.PI - t, Math.PI + t));
  }
  strokeWorldPoly(circlePts(0, 0, 1, 0, Math.PI / 2));            // corner arcs
  strokeWorldPoly(circlePts(105, 0, 1, Math.PI / 2, Math.PI));
  strokeWorldPoly(circlePts(105, 68, 1, Math.PI, Math.PI * 1.5));
  strokeWorldPoly(circlePts(0, 68, 1, Math.PI * 1.5, Math.PI * 2));

  // Authoritative goal footprint (7.32 m mouth, 2 m net box) — debug only now
  // that the goal artwork is rendered; geometry itself never changes.
  if (S.dbg.anchors) {
    ctx.strokeStyle = "rgba(255,80,80,0.8)";
    ctx.lineWidth = 1;
    for (const side of [0, 1]) {
      const x0 = side ? 105 : -2;
      strokeWorldPoly([[x0, 30.34], [x0 + 2, 30.34], [x0 + 2, 37.66], [x0, 37.66]], true);
    }
  }
}

// Stadium stand: a perspective-correct vertical wall on the plane z = APRON.y0
// (outside the playing surface). For a planar wall at constant depth the
// projection is a uniform scale, so one drawImage per tile is exact.
// Mirror-tiling (alternate copies flipped) guarantees seamless panning.
function drawStadium() {
  const im = S.images.stand;
  const zW = APRON.y0;
  const czW = -CAM.C.y * CAM.f.y + (zW - CAM.C.z) * CAM.f.z;
  if (czW < 0.5) return;
  const k = CAM.fpx / czW;                       // px per metre at the wall
  const baseY = Math.round(project(CAM.C.x, zW).y);
  const hpx = Math.round(WALL_H_M * k);
  if (baseY < 0) return;
  const tileWm = im.width * WALL_H_M / im.height; // world metres per strip copy
  const halfWm = (cv.width / 2) * czW / CAM.fpx;
  const i0 = Math.floor((CAM.C.x - halfWm) / tileWm);
  const i1 = Math.floor((CAM.C.x + halfWm) / tileWm);
  for (let i = i0; i <= i1; i++) {
    const sx = Math.floor(cv.width / 2 + CAM.fpx * (i * tileWm - CAM.C.x) / czW);
    const w = Math.ceil(tileWm * k) + 1;         // 1px overlap kills rounding gaps
    if (((i % 2) + 2) % 2 === 1) {
      ctx.save(); ctx.translate(sx + w / 2, 0); ctx.scale(-1, 1);
      ctx.drawImage(im, -w / 2, baseY - hpx, w, hpx); ctx.restore();
    } else {
      ctx.drawImage(im, sx, baseY - hpx, w, hpx);
    }
  }
}

// Goal artwork: unwarped billboard anchored to the authoritative goal centre,
// scaled to player-metric height. Right goal is the mirrored derived copy.
function drawGoalArt(side, s) {
  const img = side ? S.images.goalMirror : S.images.goalClean;
  const anchor = project(side ? 106.2 : -1.2, 34);
  if (anchor.d < 0.5) return;
  const gs = s * (GOAL_TARGET_H_M * PLAYER_PX_PER_M) / (GOAL_ART.y1 - GOAL_ART.y0 + 1);
  const cx = (GOAL_ART.x0 + GOAL_ART.x1 + 1) / 2;
  const cxm = side ? img.width - cx : cx;        // content centre in (mirrored) art coords
  ctx.drawImage(img,
    Math.round(anchor.x - cxm * gs),
    Math.round(anchor.y - (GOAL_ART.y1 + 1) * gs),
    Math.round(img.width * gs), Math.round(img.height * gs));
}

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0b0e12";
  ctx.fillRect(0, 0, cv.width, cv.height);

  drawStadium();
  drawGroundPerspective();
  drawMarkings();
  if (S.dbg.grid) drawGrid();

  // painter's order over players + goal billboards (goals sort just behind
  // the mouth line so keepers/attackers at y>=34 draw in front of the net)
  const s = spriteScale();
  const ents = [
    ...S.players.map(p => ({ y: p.y, p })),
    { y: 33.5, goal: 0 }, { y: 33.5, goal: 1 },
  ].sort((a, b) => a.y - b.y);
  const order = [...S.players].sort((a, b) => a.y - b.y);
  for (const e of ents) (e.p ? drawPlayer(e.p, s) : drawGoalArt(e.goal, s));
  drawBall();
  if (S.dbg.anchors) for (const p of order) drawAnchors(p, s);
  if (S.dbg.track && S.cam.target) {
    const t = project(S.cam.target.x, S.cam.target.y);
    if (t.d > 0.5) {
      ctx.strokeStyle = "#ff5ce0"; ctx.lineWidth = 2;
      ctx.strokeRect(t.x - 7, t.y - 7, 14, 14);
      ctx.beginPath(); ctx.moveTo(t.x - 11, t.y); ctx.lineTo(t.x + 11, t.y);
      ctx.moveTo(t.x, t.y - 11); ctx.lineTo(t.x, t.y + 11); ctx.stroke();
    }
  }
  drawReadout();
}

// local ground foreshortening (screen px per world metre in x and z) at a point
function groundBasis(wx, wz) {
  const p0 = project(wx, wz);
  const px = project(wx + 0.5, wz), pz = project(wx, wz + 0.5);
  return { p0, dxm: Math.abs(px.x - p0.x) * 2, dzm: Math.abs(pz.y - p0.y) * 2 };
}

function drawPlayer(p, s) {
  const dir = headingToDir(p.heading);
  const frames = S.anims[p.state][dir];
  const im = frames[p.state === "idle" ? 0 : p.frame % frames.length];
  const gb = groundBasis(p.x, p.y);
  if (gb.p0.d < 0.5) return;
  const ax = Math.round(gb.p0.x), ay = Math.round(gb.p0.y);

  // ground contact: team ring + soft shadow, foreshortened by the local
  // ground projection (presentation only, PNGs untouched)
  const flat = gb.dxm > 0.01 ? gb.dzm / gb.dxm : 0.4;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ax, ay, 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
  ctx.lineWidth = Math.max(1, Math.round(s));
  ctx.strokeStyle = p.team === 0 ? "rgba(80,220,255,0.9)" : "rgba(255,225,70,0.9)";
  ctx.stroke();
  ctx.restore();

  // unwarped, unsquashed screen-facing billboard; constant size with depth
  const w = im.width, h = im.height;
  const foot = h / 2 + S.pivots.foot_offset_base128;
  ctx.drawImage(im, Math.round(ax - (w / 2) * s), Math.round(ay - foot * s),
    Math.round(w * s), Math.round(h * s));
}

function drawBall() {
  const gb = groundBasis(S.ball.x, S.ball.y);
  if (gb.p0.d < 0.5) return;
  const x = Math.round(gb.p0.x), y = Math.round(gb.p0.y);
  const r = Math.max(3, 0.16 * pxPerMeter(CAM.czTarget));
  const flat = gb.dxm > 0.01 ? gb.dzm / gb.dxm : 0.4;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 1.1, Math.max(1, r * 1.1 * flat), 0, 0, Math.PI * 2);
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
  const pr = project(p.x, p.y);
  if (pr.d < 0.5) return;
  const ax = Math.round(pr.x), ay = Math.round(pr.y);
  const w = im.width, h = im.height;
  const foot = h / 2 + S.pivots.foot_offset_base128;
  const bx = Math.round(ax - (w / 2) * s), by = Math.round(ay - foot * s);

  ctx.strokeStyle = "rgba(120,200,255,0.85)"; ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, Math.round(w * s), Math.round(h * s));     // sprite bbox
  ctx.strokeStyle = "#ff4040";                                                   // world ground point
  ctx.beginPath(); ctx.moveTo(ax - 6, ay); ctx.lineTo(ax + 6, ay);
  ctx.moveTo(ax, ay - 6); ctx.lineTo(ax, ay + 6); ctx.stroke();
  const px2 = ax, py2 = Math.round(by + (h / 2) * s);                            // canvas-centre pivot
  ctx.fillStyle = "#ffd23c"; ctx.fillRect(px2 - 2, py2 - 2, 4, 4);
  const hr = p.heading * Math.PI / 180;                                          // facing arrow (on ground)
  const tip = project(p.x + Math.cos(hr) * 1.5, p.y + Math.sin(hr) * 1.5);
  ctx.strokeStyle = "#5cff8a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "11px monospace"; ctx.textAlign = "center";
  ctx.fillText(`${p.state} ${dir} f${p.state === "idle" ? 0 : p.frame % frames.length} ${im.width}×${im.height}`,
    ax, by - 4);
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px monospace"; ctx.textAlign = "left";
  for (let x = 0; x <= 105; x += 5) {
    strokeWorldPoly([[x, 0], [x, 68]]);
    const p = project(x, 67);
    if (p.d > 0.5) ctx.fillText(String(x), p.x + 2, p.y - 3);
  }
  for (let y = 0; y <= 68; y += 5) {
    strokeWorldPoly([[0, y], [105, y]]);
    const p = project(1, y);
    if (p.d > 0.5) ctx.fillText(String(y), p.x - 20, p.y + 3);
  }
}

function drawReadout() {
  const el = document.getElementById("readout");
  el.textContent =
    `scene    ${S.scene}\n` +
    `camera   mode=${S.cam.mode}\n` +
    `         pos=(${S.cam.x.toFixed(1)}, ${S.ui.height.toFixed(0)}, ${(PITCH.h + S.ui.dist).toFixed(1)}) m\n` +
    `         look=(${S.cam.x.toFixed(1)}, 0, ${(S.cam.z + S.ui.depthoff).toFixed(1)}) m\n` +
    `         look angle ${CAM.lookAngle.toFixed(1)}° down  fov ${S.ui.fov}°\n` +
    `scale    ${pxPerMeter(CAM.czTarget).toFixed(1)} px/m @target  sprite×${spriteScale().toFixed(2)}${S.snap ? " (snapped)" : ""}\n` +
    `ball     (${S.ball.x.toFixed(1)}, ${S.ball.y.toFixed(1)}) m\n` +
    `test     heading=${Math.round(S.test.heading)}°  facing=${headingToDir(S.test.heading)}` +
    (S.test.state === "ramp" ? `  speed=${S.test.speed.toFixed(1)} m/s` : "");
}

// ---------------------------------------------------------------- UI
function setHeadingUI() {
  document.getElementById("heading").value = Math.round(S.test.heading);
  document.getElementById("v-heading").textContent = Math.round(S.test.heading);
}

const RANGE_FMT = {
  height: v => v.toFixed(0) + " m", dist: v => v.toFixed(0) + " m",
  fov: v => v.toFixed(0) + "°", depthoff: v => v.toFixed(0) + " m",
  smooth: v => v.toFixed(2) + " s",
  pscale: v => "×" + v.toFixed(2), jogfps: v => v, sprintfps: v => v,
  rate: v => "×" + v.toFixed(2),
};

function syncRanges() {
  for (const key of Object.keys(RANGE_FMT)) {
    const el = document.getElementById(key);
    el.value = S.ui[key];
    document.getElementById("v-" + key).textContent = RANGE_FMT[key](S.ui[key]);
  }
}

function bindUI() {
  for (const key of Object.keys(RANGE_FMT)) {
    const el = document.getElementById(key), out = document.getElementById("v-" + key);
    el.addEventListener("input", () => {
      S.ui[key] = parseFloat(el.value);
      out.textContent = RANGE_FMT[key](S.ui[key]);
    });
  }
  syncRanges();

  document.getElementById("reset").addEventListener("click", () => {
    S.ui = { ...DEFAULTS };
    syncRanges();
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

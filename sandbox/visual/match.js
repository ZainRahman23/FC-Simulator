/* Touchline — LIVE MATCH VISUAL PREVIEW (RAIL CAMERA).
 *
 * The accepted CAMERA_V1 midfield pose is the single authored camera. At
 * runtime the ONLY pose variable is the rig's longitudinal position along
 * the touchline (a broadcast camera on a rail): cameraPos and its look
 * target translate together along x; orientation, lens, height, sideline
 * distance and the camera→target vector are INVARIANT. Implemented via the
 * exact identity render(pos0+travel) == projectFixed(world − travel).
 * Runtime zoom is a uniform scale about the screen centre. Goals are
 * temporarily hidden pending rail approval + re-bake.
 *
 * ENGINE BOUNDARY unchanged: renderer is read-only over the Touchline API's
 * authoritative per-second keyframes. Presentation only.
 */
"use strict";

const ASSET_ROOT = "../../assets/visual_v1/";
const API = "/api";
const REF_ZOOM = 32;                        // px/m of the ground source texture
const PITCH = { w: 105, h: 68 };
const SIM2W = { x: PITCH.w / 100, y: PITCH.h / 100 };
const GRASS_ZONE = { x0: -3, x1: 108, y0: -3, y1: 71 };
const APRON = { x0: -8, x1: 113, y0: -8, y1: 76 };
const DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
const VIEW = { w: 1280, h: 720 };           // reference viewport defining V-space units

// CAMERA_V1 — the authored projection (frozen; sliders re-freeze, not animate)
const AUTHOR_DEFAULTS = {
  height: 30, dist: 43, fov: 28, depthoff: 3, pitch: 22, yaw: 0, pscale: 0.85,
};
const RUNTIME_DEFAULTS = { zoom: 1.0, smooth: 0.35 };
const JOG_FPS = 10, SPRINT_FPS = 12;
const IDLE_MAX = 0.5, JOG_MAX = 5.2, TELEPORT = 12;

// Goal V2.2 sprite (unmodified art). Front-post ground contacts re-measured
// from the actual PNG pixels (2026-08-28): the far post continues below its
// (30,182) joint knob to a ground stub at (44,194); the near post foot is at
// (94,327). NOTE: img2img displaced the goal ~40-55px left of the source
// photo's goal line, so photo-derived coordinates were invalid.
const GOAL_SPRITE = {
  W: 312, H: 332,
  footFar: [44, 194], footNear: [94, 327],
};
// World-placement trims only (authoring). There is NO goal visual scale:
// goal size comes from the regulation 7.32×2.44×2.0 m world geometry and
// changes on screen only through the global zoom, like everything else.
const GOAL_CFG = { mirrorL: true, mirrorR: false, offX: 0, offDepth: 0 };

const ENV = {
  farBarrierZ: -2.5, barrierH: 1.0, boardPanelM: 6,
  standFrontZ: -5.0, frontWallH: 1.2,
  lowerRows: 16, lowerRowDepth: 0.8, lowerRowRise: 0.5,
  walkDepth: 1.6, upperRows: 12, upperRowDepth: 0.8, upperRowRise: 0.65,
  backWallH: 3.0, aisleEveryM: 12, aisleW: 0.9, nearBarrierZ: 70.5,
  texWorldM: 42,
};
const ENV_COL = {
  backing: "#31313d", roofEdge: "#a9abb1", frontWall: "#908d91",
  board: "#262c34", boardTop: "#5a636e", rail: "rgba(245,245,245,0.75)",
  aisle: "rgba(24,24,30,0.8)",
};

const S = {
  manifest: null, pivots: null, tilesMeta: null,
  images: {}, anims: null, standTex: null, standPat: null,
  author: { ...AUTHOR_DEFAULTS },
  camV: { x: 0, y: 0, zoom: RUNTIME_DEFAULTS.zoom, zoomTarget: RUNTIME_DEFAULTS.zoom,
          mode: "ball", smooth: RUNTIME_DEFAULTS.smooth, lead: 0, manualX: 52.5,
          target: null },
  dbg: { anchors: false, ids: false, vel: false, state: false,
         ball: false, track: false, goalgeo: false, grid: false, xform: false,
         cam: true },
  groundTex: null,                     // 32px/m world texture (built once)
  frozen: null,                        // the frozen projection + layers + constants
  pb: { frames: [], roster: [], acts: [], meta: {}, head: 0, playing: true,
        speed: 1, matchId: null, fetching: false, finished: false,
        lastEventIndex: 0, events: [], score: [0, 0], minute: 0, half: 1,
        possession: null, players: {} },
  view: [], time: 0,
};

const cv = document.getElementById("view");
const ctx = cv.getContext("2d");

// ═══ loading (unchanged pipeline) ════════════════════════════════════════════
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
  const jobs = [];
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
  for (const d of DIRS)
    for (let i = 0; i < manifest.sprint.frames_per_direction; i++)
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
  jobs.push({ key: ["standart", "-", 0], path: ASSET_ROOT + S.manifest.stadium_art.local_path });
  jobs.push({ key: ["goal22", "-", 0], path: ASSET_ROOT + S.manifest.goal_art_v2_2_surgical.local_paths.asset });
  jobs.push({ key: ["goalbake", "-", 0], path: ASSET_ROOT + "originals/goal_v2_oblique/goal_v2_3_frozen_bake.png" });
  let done = 0;
  const anims = { idle: {}, jog: {}, sprint: {} };
  await Promise.all(jobs.map(async (j) => {
    const im = await loadImage(j.path);
    done++; pctEl.textContent = Math.round((done / jobs.length) * 100) + "%";
    const [kind, dir, idx] = j.key;
    if (kind === "sheet") { S.images.sheet = im; return; }
    if (kind === "standart") { S.images.stand = im; return; }
    if (kind === "goal22") { S.images.goal22 = im; return; }
    if (kind === "goalbake") { S.images.goalBake = im; return; }
    (anims[kind][dir] ||= [])[idx] = im;
  }));
  S.goalBakeMeta = await loadJSON(ASSET_ROOT + "originals/goal_v2_oblique/goal_v2_3_frozen_bake.json");
  const gb = S.images.goalBake;
  const gm = document.createElement("canvas");
  gm.width = gb.width; gm.height = gb.height;
  const gmc = gm.getContext("2d");
  gmc.imageSmoothingEnabled = false;
  gmc.translate(gb.width, 0); gmc.scale(-1, 1); gmc.drawImage(gb, 0, 0);
  S.images.goalBakeM = gm;
  S.anims = anims;
  S.standTex = deriveStandMaterial(S.images.stand);
  const g = S.images.goal22;
  const mc = document.createElement("canvas");
  mc.width = g.width; mc.height = g.height;
  const mctx = mc.getContext("2d");
  mctx.imageSmoothingEnabled = false;
  mctx.translate(g.width, 0); mctx.scale(-1, 1); mctx.drawImage(g, 0, 0);
  S.images.goal22m = mc;
  // Mouth-panel texture: the art with the through-the-mouth far-side-net
  // triangle (art (42,40)-(105,183)-(44,194), inset 3 px so the crossbar and
  // post pixels survive) cleared to transparent. Those pixels image the
  // PERPENDICULAR far-side net; they now live on the dedicated farside panel,
  // and clearing them here keeps that net from being drawn twice. Derived
  // in-memory like goal22m — the V2.2 file stays byte-untouched.
  const mo = document.createElement("canvas");
  mo.width = g.width; mo.height = g.height;
  const moctx = mo.getContext("2d");
  moctx.imageSmoothingEnabled = false;
  moctx.drawImage(g, 0, 0);
  moctx.globalCompositeOperation = "destination-out";
  moctx.beginPath();
  moctx.moveTo(43, 43); moctx.lineTo(103, 181); moctx.lineTo(45, 191);
  moctx.closePath(); moctx.fill();
  S.images.goal22mouth = mo;
  const mom = document.createElement("canvas");
  mom.width = g.width; mom.height = g.height;
  const momctx = mom.getContext("2d");
  momctx.imageSmoothingEnabled = false;
  momctx.translate(g.width, 0); momctx.scale(-1, 1); momctx.drawImage(mo, 0, 0);
  S.images.goal22mouthM = mom;
  // Far-side net texture: V2.2's cleanest regular weave — the cord-aligned
  // 24x16 px two-cell patch at art (120,211) — tiled over 121x97 so cord
  // lines land exactly on all four borders. Mapped onto the farside world
  // rect its cells become ~0.2 m squares; the shared projection supplies ALL
  // perspective (none is baked in, unlike the composite art regions, whose
  // baked drape/occlusion made them unusable for this panel). Uniform weave,
  // so one unmirrored texture serves both goals. V2.2 file stays untouched.
  const ft = document.createElement("canvas");
  ft.width = 121; ft.height = 97;
  const ftx = ft.getContext("2d");
  ftx.imageSmoothingEnabled = false;
  for (let ty = 0; ty < 7; ty++)
    for (let tx = 0; tx < 6; tx++)
      ftx.drawImage(g, 120, 211, 24, 16, tx * 24, ty * 16, 24, 16);
  S.images.goalNetTex = ft;

  buildGroundTexture();
  recomputeAuthoring();               // authored CAMERA_V1 basis + constants
  bindUI();
  await startMatch();
  document.getElementById("loading").style.display = "none";
  requestAnimationFrame(tick);
}

// ═══ match driver (unchanged, read-only) ═════════════════════════════════════
async function startMatch() {
  const fixture = await loadJSON("fixture_liv_eve.json");
  const r = await fetch(API + "/matches/start", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fixture),
  }).then(x => x.json());
  S.pb.matchId = r.match_id;
  S.pb.meta = { fixture: fixture.fixture_id, seed: fixture.seed,
                home: fixture.home_team.name, away: fixture.away_team.name };
  if (r.players) for (const [pid, p] of Object.entries(r.players)) S.pb.players[pid] = p;
  hudSub(`${S.pb.meta.fixture} seed ${S.pb.meta.seed} · match ${r.match_id} · buffering…`);
  ensureBuffer();
}
function bufferedSeconds() { return S.pb.frames.length; }
async function ensureBuffer() {
  const pb = S.pb;
  if (pb.fetching || pb.finished || !pb.matchId) return;
  if (bufferedSeconds() - pb.head > 60) return;
  pb.fetching = true;
  try {
    const r = await fetch(`${API}/matches/${pb.matchId}/advance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds: 60, frames: true, last_event_index: pb.lastEventIndex }),
    }).then(x => x.json());
    if (r.frames) {
      if (!pb.roster.length) { pb.roster = r.roster; pb.acts = r.act_names; }
      for (const f of r.frames) pb.frames.push(f);
    }
    if (r.players) for (const [pid, p] of Object.entries(r.players)) pb.players[pid] = p;
    pb.minute = r.minute; pb.half = r.half; pb.possession = r.possession;
    if (r.score) pb.score = [r.score.home ?? 0, r.score.away ?? 0];
    if (Array.isArray(r.new_events)) {
      const NOTABLE = /GOAL|SHOT|SAVE|FOUL|CARD|KICKOFF|HALF|PENALTY|CORNER|OFFSIDE|SUB/i;
      for (const ev of r.new_events)
        if (NOTABLE.test(ev.event_type || "")) pb.events.push(ev);
      pb.lastEventIndex = r.event_count ?? pb.lastEventIndex;
    }
    if (r.full_time || r.status === "ft") pb.finished = true;
    updateHUD();
  } catch (e) {
    hudSub("engine unreachable — retrying… (" + e.message + ")");
  } finally {
    pb.fetching = false;
  }
}
function hudSub(t) { document.getElementById("hud-sub").textContent = t; }
function updateHUD() {
  const pb = S.pb;
  document.getElementById("hud-score").textContent =
    `${pb.meta.home || "HOME"}  ${pb.score[0]} : ${pb.score[1]}  ${pb.meta.away || "AWAY"}`;
  const clock = pb.frames.length ? pb.frames[Math.min(Math.floor(pb.head), pb.frames.length - 1)][0] : 0;
  const mm = String(Math.floor(clock / 60)).padStart(2, "0");
  const ss = String(Math.floor(clock % 60)).padStart(2, "0");
  hudSub(`H${pb.half} ${mm}:${ss} · seed ${pb.meta.seed} · buffered ${bufferedSeconds()}s`
    + (pb.finished ? " · FULL TIME" : ""));
  const last = pb.events.slice(-3).map(e =>
    `${Math.floor((e.timestamp ?? 0) / 60)}' ${e.event_type} — ${e.actor_name ?? ""} (${e.team_id ?? ""})`);
  document.getElementById("ticker").innerHTML = last.join("<br>");
}
function sampleAt(head) {
  const pb = S.pb;
  if (!pb.frames.length) return null;
  const i = Math.max(0, Math.min(pb.frames.length - 1, Math.floor(head)));
  const j = Math.min(pb.frames.length - 1, i + 1);
  const t = Math.max(0, Math.min(1, head - i));
  const A = pb.frames[i], B = pb.frames[j];
  const dt = Math.max(0.001, B[0] - A[0]);
  const ball = { x: (A[1] + (B[1] - A[1]) * t) * SIM2W.x,
                 y: (A[2] + (B[2] - A[2]) * t) * SIM2W.y,
                 vx: (B[1] - A[1]) * SIM2W.x / dt,
                 vy: (B[2] - A[2]) * SIM2W.y / dt };
  const players = [];
  for (let k = 0; k < pb.roster.length; k++) {
    const a = A[4][k], b = B[4][k];
    if (!a || !b || (!a[3] && !b[3])) continue;
    const ax = a[0] * SIM2W.x, ay = a[1] * SIM2W.y;
    const bx = b[0] * SIM2W.x, by = b[1] * SIM2W.y;
    let vx = (bx - ax) / dt, vy = (by - ay) / dt;
    let x, y;
    const sp = Math.hypot(vx, vy);
    if (sp > TELEPORT) { x = t < 0.5 ? ax : bx; y = t < 0.5 ? ay : by; vx = 0; vy = 0; }
    else { x = ax + (bx - ax) * t; y = ay + (by - ay) * t; }
    players.push({ idx: k, pid: pb.roster[k], x, y, vx, vy,
                   speed: Math.hypot(vx, vy), act: b[2], active: b[3] });
  }
  return { clock: A[0] + t * dt, ball, players };
}

// ═══ world ground texture (32 px/m, camera-independent, built once) ══════════
function hash01(x, y) {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash01(xi, yi), b = hash01(xi + 1, yi);
  const cc = hash01(xi, yi + 1), dd = hash01(xi + 1, yi + 1);
  return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + dd) * sx * sy;
}
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
  return { pick(n) {
    if (n <= 0) return cdf[0].rgb;
    for (const e of cdf) if (n <= e.cum) return e.rgb;
    return cdf[cdf.length - 1].rgb;
  } };
}
function deriveStandMaterial(img) {
  const band = (sy, sh) => {
    const c = document.createElement("canvas");
    c.width = img.width * 2; c.height = sh;
    const cc = c.getContext("2d");
    cc.imageSmoothingEnabled = false;
    cc.drawImage(img, 0, sy, img.width, sh, 0, 0, img.width, sh);
    cc.save(); cc.translate(img.width * 2, 0); cc.scale(-1, 1);
    cc.drawImage(img, 0, sy, img.width, sh, 0, 0, img.width, sh);
    cc.restore();
    return c;
  };
  return { upper: band(42, 18), lower: band(66, 23) };
}
function buildGroundTexture() {
  const W = (APRON.x1 - APRON.x0) * REF_ZOOM, H = (APRON.y1 - APRON.y0) * REF_ZOOM;
  const g = document.createElement("canvas");
  g.width = W; g.height = H;
  const c = g.getContext("2d");
  c.imageSmoothingEnabled = false;
  const gx = (x) => (x - APRON.x0) * REF_ZOOM;
  const gy = (y) => (y - APRON.y0) * REF_ZOOM;
  const M = REF_ZOOM;
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
  const bandW = PITCH.w / 14;
  for (let x = GRASS_ZONE.x0; x < GRASS_ZONE.x1; x += 0.0001) {
    const k = Math.floor(x / bandW + 1e-9);
    const x0 = Math.max(GRASS_ZONE.x0, k * bandW), x1 = Math.min(GRASS_ZONE.x1, (k + 1) * bandW);
    c.fillStyle = ((k % 2 + 2) % 2) === 0 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.05)";
    c.fillRect(gx(x0), gy(GRASS_ZONE.y0), (x1 - x0) * M, (GRASS_ZONE.y1 - GRASS_ZONE.y0) * M);
    x = x1;
  }
  S.groundTex = g;
}

// ═══ RAIL CAMERA ARCHITECTURE ════════════════════════════════════════════════
// The accepted CAMERA_V1 midfield pose is the single authored camera. At
// runtime the ONLY pose variable is the rig's longitudinal position along
// the touchline:
//     cameraPos = cameraPos0 + (travel, 0, 0)
//     target    = target0    + (travel, 0, 0)
// Orientation, lens (pitch/yaw/FOV), height, sideline distance and the
// camera→target vector are INVARIANT. Implementation uses the exact
// identity  render(pos0 + travel) == projectFixed(world − travel):
// every world point is shifted by −travel and projected through the
// byte-identical CAMERA_V1 basis, then uniform zoom about screen centre.
const PROJ = { C: null, f: null, u: null, r: null, fpx: 0, czRef: 1 };
function buildFrozenBasis() {
  const a = S.author;
  const h = a.height;
  const C = { x: 52.5, y: h, z: PITCH.h + a.dist };       // authored midfield pose
  const dz = (34 + a.depthoff) - C.z;
  const th = a.pitch * Math.PI / 180;
  const yawR = a.yaw * Math.PI / 180;
  const fy = -Math.sin(th), fh = Math.cos(th);
  const f = { x: fh * Math.sin(yawR), y: fy, z: -fh * Math.cos(yawR) };
  const r = { x: -f.z / fh, y: 0, z: f.x / fh };
  const u = { x: -r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y };
  PROJ.C = C; PROJ.f = f; PROJ.u = u; PROJ.r = r;
  PROJ.fpx = (VIEW.h / 2) / Math.tan((a.fov * Math.PI / 180) / 2);
  PROJ.czRef = Math.hypot(h, dz);
}
function fproj3(wx, wy, wz) {           // the fixed CAMERA_V1 projection (VIEW space)
  const vx = wx - PROJ.C.x, vy = wy - PROJ.C.y, vz = wz - PROJ.C.z;
  const cx = vx * PROJ.r.x + vz * PROJ.r.z;
  const cy = vx * PROJ.u.x + vy * PROJ.u.y + vz * PROJ.u.z;
  const cz = vx * PROJ.f.x + vy * PROJ.f.y + vz * PROJ.f.z;
  return { x: VIEW.w / 2 + PROJ.fpx * cx / cz, y: VIEW.h / 2 - PROJ.fpx * cy / cz, d: cz };
}
// runtime rig state — ONE pose variable (longitudinal position) + view zoom
const RIG = { x: 52.5, mode: "ball", smooth: RUNTIME_DEFAULTS.smooth, lead: 0,
              manualX: 52.5, zoom: RUNTIME_DEFAULTS.zoom,
              zoomTarget: RUNTIME_DEFAULTS.zoom, targetX: 52.5 };
let TRAVEL = 0;
function sproj3(wx, wy, wz) {           // world → screen (rig-translated + zoom)
  const p = fproj3(wx - TRAVEL, wy, wz);
  return { x: (p.x - VIEW.w / 2) * RIG.zoom + cv.width / 2,
           y: (p.y - VIEW.h / 2) * RIG.zoom + cv.height / 2, d: p.d };
}
function sproj(wx, wz) { return sproj3(wx, 0, wz); }

function recomputeAuthoring() {
  buildFrozenBasis();
  S.playerVScale = ((PROJ.fpx / PROJ.czRef) / REF_ZOOM) * S.author.pscale;
  S.pxPerM = PROJ.fpx / PROJ.czRef;
  if (!S.standPat) S.standPat = {
    upper: ctx.createPattern(S.standTex.upper, "repeat"),
    lower: ctx.createPattern(S.standTex.lower, "repeat"),
  };
  buildGoalPanels();
}

// ── per-frame painters (all world-space, all through sproj3) ──
function strokeSeg3(x1, h1, z1, x2, h2, z2) {
  const a = sproj3(x1, h1, z1), b = sproj3(x2, h2, z2);
  if (a.d < 0.5 || b.d < 0.5) return;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function strokeWorldPoly(pts, close) {
  ctx.beginPath();
  let started = false;
  for (const [wx, wz] of pts) {
    const p = sproj(wx, wz);
    if (p.d < 0.5) { started = false; continue; }
    if (!started) { ctx.moveTo(p.x, p.y); started = true; }
    else ctx.lineTo(p.x, p.y);
  }
  if (close) ctx.closePath();
  ctx.stroke();
}
function circlePts(cx, cz, r, a0 = 0, a1 = Math.PI * 2) {
  const pts = [];
  const n = Math.max(8, Math.ceil((a1 - a0) / (Math.PI / 45)));
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
    const p = sproj(x, z);
    if (p.d < 0.5) return;
    if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath(); ctx.fill();
}
function envXRangeAt(h, z) {
  // visible x range around the rig; depth-clip relative to the SHIFTED world
  let xL = RIG.x - 220, xR = RIG.x + 220;
  const k = (h - PROJ.C.y) * PROJ.f.y + (z - PROJ.C.z) * PROJ.f.z;
  const fx = PROJ.f.x;
  if (Math.abs(fx) > 1e-6) {
    const xLim = TRAVEL + PROJ.C.x + (0.8 - k) / fx;
    if (fx > 0) xL = Math.max(xL, xLim); else xR = Math.min(xR, xLim);
  }
  return { xL, xR };
}
function envXRange2(hA, zA, hB, zB) {
  const a = envXRangeAt(hA, zA), b = envXRangeAt(hB, zB);
  return { xL: Math.max(a.xL, b.xL), xR: Math.min(a.xR, b.xR) };
}
function fillStructQuad(color, hA, zA, hB, zB) {
  const { xL, xR } = envXRange2(hA, zA, hB, zB);
  if (xL >= xR) return null;
  const p = [sproj3(xL, hA, zA), sproj3(xR, hA, zA),
             sproj3(xR, hB, zB), sproj3(xL, hB, zB)];
  if (p.some(q => q.d < 0.5)) return null;
  if (color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y);
    ctx.lineTo(p[2].x, p[2].y); ctx.lineTo(p[3].x, p[3].y);
    ctx.closePath(); ctx.fill();
  }
  return p;
}
function railLine(h, z, width = 2, color = ENV_COL.rail) {
  const { xL, xR } = envXRangeAt(h, z);
  if (xL >= xR) return;
  ctx.strokeStyle = color; ctx.lineWidth = width;
  strokeSeg3(xL, h, z, xR, h, z);
}
function fillSeatQuad(patKey, hF, zF, hB, zB) {
  const { xL, xR } = envXRange2(hF, zF, hB, zB);
  if (xL >= xR) return;
  const tex = S.standTex[patKey], pat = S.standPat[patKey];
  const BL = sproj3(xL, hB, zB), BR = sproj3(xR, hB, zB);
  const FL = sproj3(xL, hF, zF), FR = sproj3(xR, hF, zF);
  if ([BL, BR, FL, FR].some(q => q.d < 0.5)) return;
  const ppm = tex.width / (2 * ENV.texWorldM);
  const T0x = xL * ppm, T1x = xR * ppm;       // anchored to ACTUAL world x
  const u1x = T1x - T0x, u2y = tex.height;
  const a = (BR.x - BL.x) / u1x, b2 = (BR.y - BL.y) / u1x;
  const c = (FL.x - BL.x) / u2y, d = (FL.y - BL.y) / u2y;
  const e = BL.x - a * T0x, f2 = BL.y - b2 * T0x;
  pat.setTransform(new DOMMatrix([a, b2, c, d, e, f2]));
  ctx.fillStyle = pat;
  ctx.beginPath();
  ctx.moveTo(BL.x, BL.y); ctx.lineTo(BR.x, BR.y);
  ctx.lineTo(FR.x, FR.y); ctx.lineTo(FL.x, FL.y);
  ctx.closePath(); ctx.fill();
}
function cutAisles(hF, zF, hB, zB) {
  const { xL, xR } = envXRange2(hF, zF, hB, zB);
  if (xL >= xR) return;
  ctx.fillStyle = ENV_COL.aisle;
  const k0 = Math.ceil((xL - 6) / ENV.aisleEveryM), k1 = Math.floor((xR - 6) / ENV.aisleEveryM);
  for (let k = k0; k <= k1; k++) {
    const wx = k * ENV.aisleEveryM + 6, hw = ENV.aisleW / 2;
    const p = [sproj3(wx - hw, hB, zB), sproj3(wx + hw, hB, zB),
               sproj3(wx + hw, hF, zF), sproj3(wx - hw, hF, zF)];
    if (p.some(q => q.d < 0.5)) continue;
    if (p[0].x > cv.width + 40 || p[1].x < -40) continue;
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y);
    ctx.lineTo(p[2].x, p[2].y); ctx.lineTo(p[3].x, p[3].y);
    ctx.closePath(); ctx.fill();
  }
}
function drawStadium() {
  const tiers = [
    { rows: ENV.lowerRows, dz: ENV.lowerRowDepth, dh: ENV.lowerRowRise,
      z0: ENV.standFrontZ, h0: ENV.frontWallH, pat: "lower" },
    { rows: ENV.upperRows, dz: ENV.upperRowDepth, dh: ENV.upperRowRise,
      z0: ENV.standFrontZ - ENV.lowerRows * ENV.lowerRowDepth - ENV.walkDepth,
      h0: ENV.frontWallH + ENV.lowerRows * ENV.lowerRowRise + 1.0, pat: "upper" },
  ];
  const backTier = tiers[tiers.length - 1];
  const topH = backTier.h0 + backTier.rows * backTier.dh;
  const topZ = backTier.z0 - backTier.rows * backTier.dz;
  const bw = fillStructQuad(ENV_COL.backing, topH, topZ, topH + ENV.backWallH, topZ);
  if (bw) {
    ctx.fillStyle = "#101218";
    ctx.beginPath();
    ctx.moveTo(bw[3].x, bw[3].y); ctx.lineTo(bw[2].x, bw[2].y);
    ctx.lineTo(bw[2].x, -8); ctx.lineTo(bw[3].x, -8);
    ctx.closePath(); ctx.fill();
  }
  railLine(topH + ENV.backWallH, topZ, 3, ENV_COL.roofEdge);
  for (let t = tiers.length - 1; t >= 0; t--) {
    const tier = tiers[t];
    for (let i = tier.rows - 1; i >= 0; i--) {
      const zF = tier.z0 - i * tier.dz, hF = tier.h0 + i * tier.dh;
      const zB = zF - tier.dz, hB = hF + tier.dh;
      fillSeatQuad(tier.pat, hF, zF, hB, zB);
      if (i % 2 === 0) fillStructQuad("rgba(0,0,0,0.08)", hF, zF, hB, zB);
      cutAisles(hF, zF, hB, zB);
    }
    railLine(tier.h0, tier.z0, 2);
  }
  fillStructQuad("#3a3a46",
    tiers[0].h0 + tiers[0].rows * tiers[0].dh, tiers[0].z0 - tiers[0].rows * tiers[0].dz,
    tiers[1].h0, tiers[1].z0 + 0.01);
  railLine(tiers[1].h0, tiers[1].z0 + 0.01, 2);
  fillStructQuad(ENV_COL.frontWall, 0, ENV.standFrontZ, ENV.frontWallH, ENV.standFrontZ);
  railLine(ENV.frontWallH, ENV.standFrontZ, 2);
}
function drawFarBarrier() {
  fillStructQuad(ENV_COL.board, 0, ENV.farBarrierZ, ENV.barrierH, ENV.farBarrierZ);
  const { xL, xR } = envXRange2(0, ENV.farBarrierZ, ENV.barrierH, ENV.farBarrierZ);
  if (xL >= xR) return;
  ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1;
  const k0 = Math.ceil(xL / ENV.boardPanelM), k1 = Math.floor(xR / ENV.boardPanelM);
  for (let k = k0; k <= k1; k++)
    strokeSeg3(k * ENV.boardPanelM, 0, ENV.farBarrierZ, k * ENV.boardPanelM, ENV.barrierH, ENV.farBarrierZ);
  railLine(ENV.barrierH, ENV.farBarrierZ, 2, ENV_COL.boardTop);
}
function drawNearBarrier() {
  fillStructQuad("#20262e", 0, ENV.nearBarrierZ, ENV.barrierH, ENV.nearBarrierZ);
  railLine(ENV.barrierH, ENV.nearBarrierZ, 2, ENV_COL.boardTop);
}
function drawMarkings() {
  ctx.strokeStyle = "rgba(250,250,250,0.92)";
  ctx.fillStyle = "rgba(250,250,250,0.92)";
  ctx.lineWidth = Math.max(1, 2 * RIG.zoom);
  ctx.lineJoin = "round";
  const rect = (x, z, w, d) =>
    strokeWorldPoly([[x, z], [x + w, z], [x + w, z + d], [x, z + d]], true);
  rect(0, 0, PITCH.w, PITCH.h);
  strokeWorldPoly([[52.5, 0], [52.5, 68]]);
  strokeWorldPoly(circlePts(52.5, 34, 9.15));
  fillWorldSpot(52.5, 34, 0.25);
  for (const side of [0, 1]) {
    const mx = (x) => side ? 105 - x : x;
    rect(side ? 105 - 16.5 : 0, 34 - 20.16, 16.5, 40.32);
    rect(side ? 105 - 5.5 : 0, 34 - 9.16, 5.5, 18.32);
    fillWorldSpot(mx(11), 34, 0.25);
    const t = Math.acos((16.5 - 11) / 9.15);
    if (side === 0) strokeWorldPoly(circlePts(11, 34, 9.15, -t, t));
    else strokeWorldPoly(circlePts(94, 34, 9.15, Math.PI - t, Math.PI + t));
  }
  strokeWorldPoly(circlePts(0, 0, 1, 0, Math.PI / 2));
  strokeWorldPoly(circlePts(105, 0, 1, Math.PI / 2, Math.PI));
  strokeWorldPoly(circlePts(105, 68, 1, Math.PI, Math.PI * 1.5));
  strokeWorldPoly(circlePts(0, 68, 1, Math.PI * 1.5, Math.PI * 2));
}
function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1;
  for (let x = 0; x <= 105; x += 5) strokeWorldPoly([[x, 0], [x, 68]]);
  for (let y = 0; y <= 68; y += 5) strokeWorldPoly([[0, y], [105, y]]);
}
// rail diagnostic: 10x10 m square centred across the touchline from the rig.
// By construction its shifted-world coords are rig-invariant, so its projected
// shape must be identical at every rail position — visible proof the camera
// translates instead of panning.
function drawRailSquare() {
  const cxm = RIG.x, cy = 34;
  ctx.strokeStyle = "rgba(80,220,255,0.9)"; ctx.lineWidth = 2;
  strokeWorldPoly([[cxm - 5, cy - 5], [cxm + 5, cy - 5], [cxm + 5, cy + 5], [cxm - 5, cy + 5]], true);
  ctx.strokeStyle = "rgba(80,220,255,0.5)"; ctx.lineWidth = 1;
  strokeWorldPoly([[cxm - 5, cy], [cxm + 5, cy]]);
  strokeWorldPoly([[cxm, cy - 5], [cxm, cy + 5]]);
}

// per-frame perspective ground (band homography over the SHIFTED world; the
// texture is indexed by actual world coords so content stays put)
function drawGroundPerspective() {
  const W = cv.width, H = cv.height, BH = 3;
  const gW = S.groundTex.width, gH = S.groundTex.height;
  const tx = (x) => (x + TRAVEL - APRON.x0) * REF_ZOOM;   // shifted → actual world
  const tz = (z) => (z - APRON.y0) * REF_ZOOM;
  const rowWorld = (sy) => {
    const vy = (sy - cv.height / 2) / RIG.zoom + VIEW.h / 2;
    const qy = (VIEW.h / 2 - vy) / PROJ.fpx;
    const dy = PROJ.f.y + qy * PROJ.u.y;
    if (dy >= -1e-6) return null;
    const lam = -PROJ.C.y / dy;
    const bx = PROJ.f.x + qy * PROJ.u.x, bz = PROJ.f.z + qy * PROJ.u.z;
    const Ax = PROJ.C.x + lam * bx, Az = PROJ.C.z + lam * bz;
    const st = lam / PROJ.fpx;
    return (sx) => {
      const vx = (sx - cv.width / 2) / RIG.zoom + VIEW.w / 2;
      return { x: Ax + (vx - VIEW.w / 2) * st * PROJ.r.x,
               z: Az + (vx - VIEW.w / 2) * st * PROJ.r.z };
    };
  };
  for (let sy = 0; sy < H; sy += BH) {
    const b = Math.min(H, sy + BH);
    const rt = rowWorld(sy), rb = rowWorld(b);
    if (!rt || !rb) continue;
    const L0 = rt(0), R0 = rt(W), L1 = rb(0);
    const T0x = tx(L0.x), T0y = tz(L0.z);
    const T1x = tx(R0.x), T1y = tz(R0.z);
    const T2x = tx(L1.x), T2y = tz(L1.z);
    const u1x = T1x - T0x, u1y = T1y - T0y, u2x = T2x - T0x, u2y = T2y - T0y;
    const det = u1x * u2y - u1y * u2x;
    if (Math.abs(det) < 1e-9) continue;
    const bh = b - sy;
    const a = (W * u2y) / det, b2 = (-bh * u1y) / det;
    const c = (-W * u2x) / det, d = (bh * u1x) / det;
    const e = 0 - (a * T0x + c * T0y);
    const f2 = sy - (b2 * T0x + d * T0y);
    const R1 = rb(W);
    const T3x = tx(R1.x), T3y = tz(R1.z);
    const bx0 = Math.max(0, Math.floor(Math.min(T0x, T1x, T2x, T3x)) - 2);
    const bx1 = Math.min(gW, Math.ceil(Math.max(T0x, T1x, T2x, T3x)) + 2);
    const by0 = Math.max(0, Math.floor(Math.min(T0y, T1y, T2y, T3y)) - 2);
    const by1 = Math.min(gH, Math.ceil(Math.max(T0y, T1y, T2y, T3y)) + 2);
    if (bx1 <= bx0 || by1 <= by0) continue;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, sy, W, bh); ctx.clip();
    ctx.setTransform(a, b2, c, d, e, f2);
    ctx.drawImage(S.groundTex, bx0, by0, bx1 - bx0, by1 - by0, bx0, by0, bx1 - bx0, by1 - by0);
    ctx.restore();
  }
}

// ═══ GOALS: V2.2 art as world-anchored textured panels ═══════════════════════
// One-time authoring (at freeze time): the accepted V2.2 surgical artwork's
// measured panels are mapped by exact 4-point homographies onto the
// authoritative 3D goal quads — mouth plane ON the goal line spanning the
// 7.32 m mouth, roof, near-side and far-side nets over the 2.0 m cage
// extending OUTWARD. At runtime each panel is ordinary world geometry rendered
// through the SAME shared sproj3 the goal line and six-yard box use:
// no goal-specific camera compensation, no tracking, no billboard fitting,
// no goal-only scaling. Cells are texture triangles whose WORLD corners
// are plain world points — the future net-ripple displaces those corners
// exactly like the sandbox spring mesh (netImpact contract unchanged).
function homog(srcPts, dstPts) {           // 4-point homography, returns (u,v)->[x,y]
  const A = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = srcPts[i], [X, Y] = dstPts[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y, X]);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y, Y]);
  }
  for (let i = 0; i < 8; i++) {
    let p = i;
    for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    for (let r = 0; r < 8; r++) {
      if (r === i || A[r][i] === 0) continue;
      const f = A[r][i] / A[i][i];
      for (let c = i; c < 9; c++) A[r][c] -= f * A[i][c];
    }
  }
  const h = [];
  for (let i = 0; i < 8; i++) h.push(A[i][8] / A[i][i]);
  h.push(1);
  return (x, y) => {
    const d = h[6] * x + h[7] * y + h[8];
    return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d];
  };
}
// Measured V2.2 panel quads (right-goal orientation, art px) and their
// authoritative world quads. Corner order is matched 1:1 art<->world.
// u/v are the panel's parametric axes; ranges beyond [0,1] are outer
// margins so net sag that bulges past the frame in the art is kept.
const GOAL_ART_PANELS = [
  { name: "farside",                    // u: front->rear (depth), v: top->ground
    // The V2.2 art has NO usable far-side source region: the far side appears
    // only through the mouth, and every candidate area is a baked composite
    // (drape folds, occlusion boundaries, back-net layering) that reads as a
    // pinched wedge when transplanted. So this panel samples the derived
    // goalNetTex — V2.2's own weave tiled into a regular mesh (see boot) —
    // mapped edge-to-edge (no margins) so the net terminates exactly on the
    // post / rear upright / top rail / ground lines. Listed first so it draws
    // beneath the others: from the authored south rail (camera z>68) this
    // plane is always the goal's farthest surface.
    netTex: true,
    art: [[0, 0], [121, 0], [121, 97], [0, 97]],
    world: (gx, out) => [[gx, 2.44, 30.34], [gx + out * 2, 2.44, 30.34],
                         [gx + out * 2, 0, 30.34], [gx, 0, 30.34]],
    u0: 0, u1: 1, v0: 0, v1: 1 },
  { name: "roof",                       // u: front->rear (depth), v: far->near
    art: [[42, 40], [168, 40], [232, 186], [105, 183]],
    world: (gx, out) => [[gx, 2.44, 30.34], [gx + out * 2, 2.44, 30.34],
                         [gx + out * 2, 2.44, 37.66], [gx, 2.44, 37.66]],
    u0: -0.02, u1: 1.15, v0: -0.02, v1: 1.02 },
  { name: "side",                       // u: front->rear (depth), v: top->ground
    art: [[105, 183], [232, 186], [222, 320], [94, 327]],
    world: (gx, out) => [[gx, 2.44, 37.66], [gx + out * 2, 2.44, 37.66],
                         [gx + out * 2, 0, 37.66], [gx, 0, 37.66]],
    u0: -0.02, u1: 1.15, v0: -0.02, v1: 1.0 },
  { name: "mouth",                      // u: far->near post, v: crossbar->ground
    art: [[42, 40], [105, 183], [94, 327], [44, 194]],
    world: (gx, out) => [[gx, 2.44, 30.34], [gx, 2.44, 37.66],
                         [gx, 0, 37.66], [gx, 0, 30.34]],
    u0: -0.03, u1: 1.02, v0: -0.03, v1: 1.0, mouthTex: true },
];
const GOAL_GRID = 3;                    // cells per panel axis (triangulated)
function buildGoalPanels() {
  const W = GOAL_SPRITE.W;
  S.goalPanels = [0, 1].map(side => {
    const gx = (side ? 105 : 0) + (side ? 1 : -1) * GOAL_CFG.offX;
    const out = side ? 1 : -1;
    const mirrored = side ? GOAL_CFG.mirrorR : GOAL_CFG.mirrorL;
    const panels = GOAL_ART_PANELS.map(P => {
      // mouth uses the derived texture with the far-side triangle cleared;
      // farside uses the derived net texture (own coordinate space, uniform
      // weave — never mirrored)
      const img = P.netTex ? S.images.goalNetTex
        : P.mouthTex
          ? (mirrored ? S.images.goal22mouthM : S.images.goal22mouth)
          : (mirrored ? S.images.goal22m : S.images.goal22);
      const art = (mirrored && !P.netTex)
        ? P.art.map(([x, y]) => [W - 1 - x, y]) : P.art;
      const H = homog([[0, 0], [1, 0], [1, 1], [0, 1]], art);
      const wq = P.world(gx, out);
      const worldAt = (u, v) => {           // bilinear on the planar world rect
        const [a, b, c, d] = wq;
        return [
          (1 - v) * ((1 - u) * a[0] + u * b[0]) + v * ((1 - u) * d[0] + u * c[0]),
          (1 - v) * ((1 - u) * a[1] + u * b[1]) + v * ((1 - u) * d[1] + u * c[1]),
          (1 - v) * ((1 - u) * a[2] + u * b[2]) + v * ((1 - u) * d[2] + u * c[2])
            + GOAL_CFG.offDepth,
        ];
      };
      // Grid lines ALWAYS include the exact panel edges (0 and 1) so panel
      // corners — the post feet among them — are exact triangle vertices,
      // never affine-interpolated. Margins become extra outer cells.
      const lines = (lo, hi) => {
        const L = [];
        if (lo < 0) L.push(lo);
        for (let k = 0; k <= GOAL_GRID; k++) L.push(k / GOAL_GRID);
        if (hi > 1) L.push(hi);
        return L;
      };
      const uL = lines(P.u0, P.u1), vL = lines(P.v0, P.v1);
      const cells = [];
      for (let i = 0; i < uL.length - 1; i++)
        for (let j = 0; j < vL.length - 1; j++) {
          const u0 = uL[i], u1 = uL[i + 1], v0 = vL[j], v1 = vL[j + 1];
          cells.push({
            artC: [H(u0, v0), H(u1, v0), H(u1, v1), H(u0, v1)],
            worldC: [worldAt(u0, v0), worldAt(u1, v0),
                     worldAt(u1, v1), worldAt(u0, v1)],
          });
        }
      return { name: P.name, img, cells };
    });
    return { side, panels, sortY: 33.5 };
  });
}
function drawTexTri(img, a0, a1, a2, s0, s1, s2) {
  // affine texture triangle: exact art->screen on all 3 corners
  const den = (a1[0] - a0[0]) * (a2[1] - a0[1]) - (a2[0] - a0[0]) * (a1[1] - a0[1]);
  if (Math.abs(den) < 1e-9) return;
  const m11 = ((s1.x - s0.x) * (a2[1] - a0[1]) - (s2.x - s0.x) * (a1[1] - a0[1])) / den;
  const m21 = ((s2.x - s0.x) * (a1[0] - a0[0]) - (s1.x - s0.x) * (a2[0] - a0[0])) / den;
  const m12 = ((s1.y - s0.y) * (a2[1] - a0[1]) - (s2.y - s0.y) * (a1[1] - a0[1])) / den;
  const m22 = ((s2.y - s0.y) * (a1[0] - a0[0]) - (s1.y - s0.y) * (a2[0] - a0[0])) / den;
  const dx = s0.x - m11 * a0[0] - m21 * a0[1];
  const dy = s0.y - m12 * a0[0] - m22 * a0[1];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y);
  ctx.closePath(); ctx.clip();
  ctx.setTransform(m11, m12, m21, m22, dx, dy);
  const bx0 = Math.max(0, Math.floor(Math.min(a0[0], a1[0], a2[0])) - 2);
  const bx1 = Math.min(img.width, Math.ceil(Math.max(a0[0], a1[0], a2[0])) + 2);
  const by0 = Math.max(0, Math.floor(Math.min(a0[1], a1[1], a2[1])) - 2);
  const by1 = Math.min(img.height, Math.ceil(Math.max(a0[1], a1[1], a2[1])) + 2);
  if (bx1 > bx0 && by1 > by0)
    ctx.drawImage(img, bx0, by0, bx1 - bx0, by1 - by0, bx0, by0, bx1 - bx0, by1 - by0);
  ctx.restore();
}
function drawGoal(goal) {
  for (const panel of goal.panels)
    for (const cell of panel.cells) {
      const s = cell.worldC.map(w => sproj3(w[0], w[1], w[2]));
      if (s.some(p => p.d < 0.5)) continue;
      if (Math.max(s[0].x, s[1].x, s[2].x, s[3].x) < -20 ||
          Math.min(s[0].x, s[1].x, s[2].x, s[3].x) > cv.width + 20) continue;
      const a = cell.artC;
      drawTexTri(panel.img, a[0], a[1], a[2], s[0], s[1], s[2]);
      drawTexTri(panel.img, a[0], a[2], a[3], s[0], s[2], s[3]);
    }
}

// ═══ runtime rig update (ONE pose variable: longitudinal position) ═══════════
function rigTargetX(sample) {
  if (RIG.mode === "manual") return RIG.manualX;
  if (RIG.mode === "static" || !sample) return 52.5;
  const sp = Math.hypot(sample.ball.vx || 0, sample.ball.vy || 0);
  const lead = RIG.lead > 0 && sp > 0.5 ? RIG.lead * (sample.ball.vx / sp) : 0;
  if (RIG.mode === "ball") return sample.ball.x + lead;
  let sx = 0, n = 0;
  for (const p of sample.players)
    if (Math.hypot(p.x - sample.ball.x, p.y - sample.ball.y) < 18) { sx += p.x; n++; }
  if (!n) return sample.ball.x + lead;
  return 0.55 * (sample.ball.x + lead) + 0.45 * (sx / n);
}
function updateRig(dt, sample) {
  const t = Math.max(0, Math.min(105, rigTargetX(sample)));
  RIG.targetX = t;
  const k = RIG.smooth <= 0.001 ? 1 : 1 - Math.exp(-dt / RIG.smooth);
  RIG.x += (t - RIG.x) * k;
  RIG.zoom += (RIG.zoomTarget - RIG.zoom) * k;
  TRAVEL = RIG.x - 52.5;
}

// ═══ frame loop ══════════════════════════════════════════════════════════════
let lastTs = 0;
function tick(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  const pb = S.pb;
  if (pb.playing && pb.frames.length > 1)
    pb.head = Math.min(pb.head + dt * pb.speed, pb.frames.length - 1.001);
  ensureBuffer();
  const sample = sampleAt(pb.head);
  updateRig(dt, sample);
  draw(sample, dt);
  if ((ts | 0) % 500 < 20) updateHUD();
  requestAnimationFrame(tick);
}
function headingToDir(h) { return DIRS[Math.round(((h % 360) + 360) % 360 / 45) % 8]; }
function viewState(idx) {
  return S.view[idx] ||= { heading: 90, ft: Math.random() * 0.1, frame: 0, state: "idle" };
}
function flattenAt(wx, wz) {
  const p0 = fproj3(wx - TRAVEL, 0, wz);
  const p2 = fproj3(wx - TRAVEL, 0, wz + 0.5);
  return Math.max(0.15, Math.min(0.8, Math.abs(p2.y - p0.y) * 2 / S.pxPerM));
}
function drawPlayer(p, dt) {
  const vs = viewState(p.idx);
  const st = p.speed < IDLE_MAX ? "idle" : p.speed < JOG_MAX ? "jog" : "sprint";
  if (p.speed > 0.3) vs.heading = Math.atan2(p.vy, p.vx) * 180 / Math.PI;
  vs.state = st;
  if (st === "idle") vs.frame = 0;
  else { vs.ft += dt * (st === "jog" ? JOG_FPS : SPRINT_FPS); vs.frame = Math.floor(vs.ft) % 8; }
  const dir = headingToDir(vs.heading);
  const frames = S.anims[vs.state][dir];
  const im = frames[vs.state === "idle" ? 0 : vs.frame % frames.length];
  const sp = sproj(p.x, p.y);
  if (sp.d < 0.5) return;
  const ax = Math.round(sp.x), ay = Math.round(sp.y);
  const s = S.playerVScale * RIG.zoom;
  const team = (S.pb.players[p.pid] || {}).team === "AWAY" ? 1 : 0;
  const flat = flattenAt(p.x, p.y);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ax, ay, 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
  ctx.lineWidth = Math.max(1, Math.round(s));
  ctx.strokeStyle = team === 0 ? "rgba(80,220,255,0.9)" : "rgba(255,225,70,0.9)";
  ctx.stroke();
  ctx.restore();
  const w = im.width, h = im.height;
  const foot = h / 2 + S.pivots.foot_offset_base128;
  ctx.drawImage(im, Math.round(ax - (w / 2) * s), Math.round(ay - foot * s),
    Math.round(w * s), Math.round(h * s));
  if (S.dbg.anchors) {
    ctx.strokeStyle = "#ff4040"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax - 5, ay); ctx.lineTo(ax + 5, ay);
    ctx.moveTo(ax, ay - 5); ctx.lineTo(ax, ay + 5); ctx.stroke();
  }
  if (S.dbg.vel && p.speed > 0.2) {
    const tip = sproj(p.x + p.vx * 0.8, p.y + p.vy * 0.8);
    ctx.strokeStyle = "#5cff8a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  }
  if (S.dbg.ids || S.dbg.state) {
    ctx.fillStyle = "#fff"; ctx.font = "10px monospace"; ctx.textAlign = "center";
    let ty = ay - Math.round((im.height / 2 + 40) * s) - 4;
    if (S.dbg.ids) {
      const nm = (S.pb.players[p.pid] || {}).name || p.pid;
      ctx.fillText(nm, ax, ty); ty -= 11;
    }
    if (S.dbg.state)
      ctx.fillText(`${vs.state}/${dir} ${p.speed.toFixed(1)}m/s [${S.pb.acts[p.act] || p.act}]`, ax, ty);
  }
}
function drawBall(ball) {
  const sp = sproj(ball.x, ball.y);
  if (sp.d < 0.5) return;
  const x = Math.round(sp.x), y = Math.round(sp.y);
  const r = Math.max(2, 0.16 * S.pxPerM * RIG.zoom);
  const flat = flattenAt(ball.x, ball.y);
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 1.1, Math.max(1, r * 1.1 * flat), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f2f2f2"; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = "#333"; ctx.stroke();
  if (S.dbg.ball) {
    ctx.fillStyle = "#ffd23c"; ctx.font = "10px monospace"; ctx.textAlign = "center";
    ctx.fillText(`ball (${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}) m`, x, y - r - 5);
  }
}
function drawGoalGeoDebug(side) {
  const gx = side ? 105 : 0, dir = side ? 1 : -1;
  ctx.strokeStyle = "rgba(255,80,80,0.9)"; ctx.lineWidth = 1.5;
  strokeWorldPoly([[gx, 26], [gx, 42]]);
  strokeWorldPoly([[gx, 30.34], [gx + dir * 2, 30.34], [gx + dir * 2, 37.66], [gx, 37.66]], true);
  ctx.lineWidth = 2;
  strokeSeg3(gx, 0, 30.34, gx, 2.44, 30.34);
  strokeSeg3(gx, 0, 37.66, gx, 2.44, 37.66);
  strokeSeg3(gx, 2.44, 30.34, gx, 2.44, 37.66);
}
function draw(sample, dt) {
  ctx.imageSmoothingEnabled = false;
  const bg = ctx.createLinearGradient(0, 0, 0, cv.height);
  bg.addColorStop(0, "#0a0b10"); bg.addColorStop(0.5, "#12141b"); bg.addColorStop(1, "#0b0e12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cv.width, cv.height);
  drawGroundPerspective();
  drawStadium();
  drawFarBarrier();
  drawMarkings();
  if (S.dbg.grid) drawGrid();
  const ents = [];
  if (sample) {
    for (const p of sample.players) ents.push({ y: p.y, p });
    ents.push({ y: sample.ball.y, ball: sample.ball });
  }
  for (const g of S.goalPanels) ents.push({ y: g.sortY, goal: g });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.p) drawPlayer(e.p, dt);
    else if (e.ball) drawBall(e.ball);
    else drawGoal(e.goal);
  }
  if (S.dbg.goalgeo) { drawGoalGeoDebug(0); drawGoalGeoDebug(1); }
  if (S.dbg.cam) drawRailSquare();       // rail diagnostic overlay (toggleable)
  if (S.dbg.track) {
    const t = sproj(RIG.targetX, 34);
    ctx.strokeStyle = "#ff5ce0"; ctx.lineWidth = 2;
    ctx.strokeRect(t.x - 7, t.y - 7, 14, 14);
  }
  drawNearBarrier();
  drawReadout(sample);
}
function drawReadout(sample) {
  const el = document.getElementById("readout");
  const a = S.author;
  const camPos = [RIG.x, a.height, PITCH.h + a.dist];
  const tgt = [RIG.x, 0, 34 + a.depthoff];
  const dvec = [tgt[0] - camPos[0], tgt[1] - camPos[1], tgt[2] - camPos[2]];
  el.textContent =
    `head     ${S.pb.head.toFixed(1)}s / buffered ${bufferedSeconds()}s${S.pb.finished ? " (FT)" : ""}\n` +
    `RAIL CAMERA · goals: V2.2 world-panels (shared projection)\n` +
    `camera   (${camPos[0].toFixed(2)}, ${camPos[1]}, ${camPos[2]})\n` +
    `target   (${tgt[0].toFixed(2)}, ${tgt[1]}, ${tgt[2]})\n` +
    `tgt−cam  (${dvec[0].toFixed(2)}, ${dvec[1]}, ${dvec[2]})  [INVARIANT]\n` +
    `forward  (${PROJ.f.x.toFixed(4)}, ${PROJ.f.y.toFixed(4)}, ${PROJ.f.z.toFixed(4)})  [INVARIANT]\n` +
    `pitch ${a.pitch}°  yaw ${a.yaw}°  fov ${a.fov}°  zoom ×${RIG.zoom.toFixed(2)}\n` +
    `mode ${RIG.mode}  rig ${RIG.x.toFixed(2)}m  target ${RIG.targetX.toFixed(2)}m  lead ${RIG.lead.toFixed(1)}m\n` +
    (sample ? `ball     (${sample.ball.x.toFixed(1)}, ${sample.ball.y.toFixed(1)}) m\n` : "") +
    `players  ${sample ? sample.players.length : 0} active`;
}

// ═══ UI ══════════════════════════════════════════════════════════════════════
const AUTHOR_FMT = {
  height: v => v.toFixed(0) + " m", dist: v => v.toFixed(0) + " m",
  fov: v => v.toFixed(0) + "°", depthoff: v => v.toFixed(0) + " m",
  yaw: v => (v > 0 ? "+" : "") + v.toFixed(0) + "°", pitch: v => v.toFixed(0) + "°",
  pscale: v => "×" + v.toFixed(2),
};
function bindUI() {
  for (const key of Object.keys(AUTHOR_FMT)) {
    const el = document.getElementById(key), out = document.getElementById("v-" + key);
    el.value = S.author[key];
    out.textContent = AUTHOR_FMT[key](S.author[key]);
    el.addEventListener("change", () => {        // authoring: RE-FREEZES the world
      S.author[key] = parseFloat(el.value);
      out.textContent = AUTHOR_FMT[key](S.author[key]);
      recomputeAuthoring();
    });
    el.addEventListener("input", () => {
      out.textContent = AUTHOR_FMT[key](parseFloat(el.value));
    });
  }
  const zoomEl = document.getElementById("rzoom"), zoomOut = document.getElementById("v-rzoom");
  zoomEl.value = RIG.zoomTarget;
  zoomOut.textContent = "×" + RIG.zoomTarget.toFixed(2);
  zoomEl.addEventListener("input", () => {
    RIG.zoomTarget = parseFloat(zoomEl.value);
    zoomOut.textContent = "×" + RIG.zoomTarget.toFixed(2);
  });
  const smEl = document.getElementById("smooth"), smOut = document.getElementById("v-smooth");
  smEl.value = RIG.smooth;
  smOut.textContent = RIG.smooth.toFixed(2) + " s";
  smEl.addEventListener("input", () => {
    RIG.smooth = parseFloat(smEl.value);
    smOut.textContent = RIG.smooth.toFixed(2) + " s";
  });
  document.getElementById("refreeze").addEventListener("click", recomputeAuthoring);
  document.getElementById("resetauthor").addEventListener("click", () => {
    S.author = { ...AUTHOR_DEFAULTS };
    for (const key of Object.keys(AUTHOR_FMT)) {
      document.getElementById(key).value = S.author[key];
      document.getElementById("v-" + key).textContent = AUTHOR_FMT[key](S.author[key]);
    }
    recomputeAuthoring();
  });
  for (const r of document.querySelectorAll("input[name=cammode]"))
    r.addEventListener("change", () => { if (r.checked) RIG.mode = r.value; });
  const pp = document.getElementById("playpause");
  pp.addEventListener("click", () => {
    S.pb.playing = !S.pb.playing;
    pp.textContent = S.pb.playing ? "Pause" : "Play";
  });
  document.getElementById("pbspeed").addEventListener("change", (e) => {
    S.pb.speed = parseFloat(e.target.value);
  });
  for (const id of ["anchors", "ids", "vel", "state", "ball", "track", "goalgeo", "grid", "xform", "cam"])
    document.getElementById("dbg-" + id)?.addEventListener("change", (e) => {
      S.dbg[id] = e.target.checked;
    });
  const cxEl = document.getElementById("camx"), cxOut = document.getElementById("v-camx");
  cxEl.value = RIG.manualX;
  cxOut.textContent = RIG.manualX.toFixed(1) + " m";
  cxEl.addEventListener("input", () => {
    RIG.manualX = parseFloat(cxEl.value);
    cxOut.textContent = RIG.manualX.toFixed(1) + " m";
  });
  const leadEl = document.getElementById("lead"), leadOut = document.getElementById("v-lead");
  leadEl.value = RIG.lead;
  leadOut.textContent = RIG.lead.toFixed(1) + " m";
  leadEl.addEventListener("input", () => {
    RIG.lead = parseFloat(leadEl.value);
    leadOut.textContent = RIG.lead.toFixed(1) + " m";
  });
  const gbind = (id, key, fmt) => {
    const el = document.getElementById(id), out = document.getElementById("v-" + id);
    el.value = GOAL_CFG[key]; out.textContent = fmt(GOAL_CFG[key]);
    el.addEventListener("input", () => {
      GOAL_CFG[key] = parseFloat(el.value);
      out.textContent = fmt(GOAL_CFG[key]);
      buildGoalPanels();                 // re-author the world panels
    });
  };
  gbind("goffx", "offX", v => v.toFixed(2) + " m");
  gbind("goffd", "offDepth", v => v.toFixed(2) + " m");
  document.getElementById("gleft").addEventListener("change",
    (e) => { GOAL_CFG.mirrorL = e.target.value === "mirror"; buildGoalPanels(); });
  document.getElementById("gright").addEventListener("change",
    (e) => { GOAL_CFG.mirrorR = e.target.value === "mirror"; buildGoalPanels(); });
  const resize = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; };
  window.addEventListener("resize", resize);
  resize();
}

boot().catch(err => {
  document.getElementById("loading").innerHTML =
    "Failed to start: " + err.message +
    "<br><br>1) engine server:  .venv/bin/python server.py" +
    "<br>2) proxy:  python3 sandbox/visual/serve_match.py" +
    "<br>then open <code>http://127.0.0.1:8124/sandbox/visual/match.html</code>";
});

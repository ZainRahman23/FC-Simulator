/* Touchline — LIVE MATCH VISUAL PREVIEW (PCS-style frozen projection).
 *
 * ARCHITECTURE:
 *   simulator metres → ONE FROZEN AUTHORED PROJECTION → coherent 2D visual
 *   world ("V-space") → runtime camera = pan + uniform zoom only:
 *
 *       screen = (V − cameraCentre) · zoom + viewportCentre
 *
 * The projection is authored from the accepted CAMERA_V1 pose and frozen at
 * boot (re-frozen only when an authoring slider changes — never during
 * gameplay). Pitch, markings, mowing bands, stadium, barriers, goals,
 * players, ball, shadows: ALL live in the same V-space and receive the same
 * single translation + uniform zoom. No object recomputes perspective at
 * runtime and no object-specific camera compensation exists.
 *
 * Removed gameplay-time paths (obsolete live-perspective debt):
 *   - per-frame rebuildCamera / variable perspective
 *   - player constant-screen-size presentation-depth scaling (players now
 *     have a stable authored V-space size; zoom scales everything in tandem)
 *   - per-frame goal projected-post scaling / perspective registration
 *     (V2.2 is calibrated ONCE against the frozen projection, then it is an
 *     ordinary member of the 2D scene)
 *
 * ENGINE BOUNDARY unchanged: the renderer is read-only over the Touchline
 * API's authoritative per-second keyframes. Presentation only.
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
const GOAL_CFG = { scale: 1.0, mirrorL: true, mirrorR: false, offX: 0, offDepth: 0 };

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
          mode: "ball", smooth: RUNTIME_DEFAULTS.smooth, lead: 0, target: null },
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

  buildGroundTexture();
  freezeProjection();                 // ← the authored projection, built once
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

// ═══ THE FROZEN PROJECTION (authoring; runs at boot / on authoring change) ═══
// World (x metres, h metres up, y metres depth) → V-space (2D). This is the
// ONLY place perspective mathematics exist. Nothing here runs per frame.
// STRIP / RAIL projection ("pushbroom"): the authored rig travels on a rail
// parallel to the touchline. Every world point is projected AS IF the rig
// stood at that point's own longitudinal position (full perspective in
// depth/height, authored yaw giving a uniform oblique everywhere), then
// placed along the strip linearly by its true x. The projection is therefore
// TRANSLATION-INVARIANT along the pitch: moving the runtime viewport centre
// is mathematically identical to the rig physically travelling the rail.
const PROJ = { C: null, f: null, u: null, r: null, fpx: 0, czRef: 1, Sx: 1 };
function buildFrozenBasis() {
  const a = S.author;
  const h = a.height;
  const C = { x: 52.5, y: h, z: PITCH.h + a.dist };       // rig height/offset (rail)
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
  PROJ.Sx = PROJ.fpx / PROJ.czRef;      // strip px per metre of rail travel
}
function vproj3(wx, wy, wz) {           // world → V-space (frozen strip projection)
  const vy = wy - PROJ.C.y, vz = wz - PROJ.C.z;   // reference column (rig at wx)
  const cx = vz * PROJ.r.z;                        // yaw shear (r.y = 0, vx = 0)
  const cy = vy * PROJ.u.y + vz * PROJ.u.z;
  const cz = vy * PROJ.f.y + vz * PROJ.f.z;
  return { x: VIEW.w / 2 + PROJ.fpx * cx / cz + PROJ.Sx * (wx - PROJ.C.x),
           y: VIEW.h / 2 - PROJ.fpx * cy / cz, d: cz };
}
function vproj(wx, wz) { return vproj3(wx, 0, wz); }

// ── freeze-time helpers reused by the layer painters (draw in V coords) ──
let LCTX = null;                        // layer context during freezing
function strokeSeg3(x1, h1, z1, x2, h2, z2) {
  const a = vproj3(x1, h1, z1), b = vproj3(x2, h2, z2);
  if (a.d < 0.5 || b.d < 0.5) return;
  LCTX.beginPath(); LCTX.moveTo(a.x, a.y); LCTX.lineTo(b.x, b.y); LCTX.stroke();
}
function strokeWorldPoly(pts, close) {
  LCTX.beginPath();
  let started = false;
  for (const [wx, wz] of pts) {
    const p = vproj(wx, wz);
    if (p.d < 0.5) { started = false; continue; }
    if (!started) { LCTX.moveTo(p.x, p.y); started = true; }
    else LCTX.lineTo(p.x, p.y);
  }
  if (close) LCTX.closePath();
  LCTX.stroke();
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
  LCTX.beginPath();
  let first = true;
  for (const [x, z] of circlePts(wx, wz, r)) {
    const p = vproj(x, z);
    if (p.d < 0.5) return;
    if (first) { LCTX.moveTo(p.x, p.y); first = false; } else LCTX.lineTo(p.x, p.y);
  }
  LCTX.closePath(); LCTX.fill();
}
function envXRangeAt(h, z) {
  // strip projection: depth is independent of wx — no clipping needed, just
  // enough rail length to cover every runtime pan position
  return { xL: PROJ.C.x - 150, xR: PROJ.C.x + 150 };
}
function envXRange2(hA, zA, hB, zB) {
  const a = envXRangeAt(hA, zA), b = envXRangeAt(hB, zB);
  return { xL: Math.max(a.xL, b.xL), xR: Math.min(a.xR, b.xR) };
}
function fillStructQuad(color, hA, zA, hB, zB) {
  const { xL, xR } = envXRange2(hA, zA, hB, zB);
  if (xL >= xR) return null;
  const p = [vproj3(xL, hA, zA), vproj3(xR, hA, zA),
             vproj3(xR, hB, zB), vproj3(xL, hB, zB)];
  if (p.some(q => q.d < 0.5)) return null;
  if (color) {
    LCTX.fillStyle = color;
    LCTX.beginPath();
    LCTX.moveTo(p[0].x, p[0].y); LCTX.lineTo(p[1].x, p[1].y);
    LCTX.lineTo(p[2].x, p[2].y); LCTX.lineTo(p[3].x, p[3].y);
    LCTX.closePath(); LCTX.fill();
  }
  return p;
}
function railLine(h, z, width = 2, color = ENV_COL.rail) {
  const { xL, xR } = envXRangeAt(h, z);
  if (xL >= xR) return;
  LCTX.strokeStyle = color; LCTX.lineWidth = width;
  strokeSeg3(xL, h, z, xR, h, z);
}
function fillSeatQuad(patKey, hF, zF, hB, zB) {
  const { xL, xR } = envXRange2(hF, zF, hB, zB);
  if (xL >= xR) return;
  const tex = S.standTex[patKey], pat = S.standPat[patKey];
  const BL = vproj3(xL, hB, zB), BR = vproj3(xR, hB, zB);
  const FL = vproj3(xL, hF, zF), FR = vproj3(xR, hF, zF);
  if ([BL, BR, FL, FR].some(q => q.d < 0.5)) return;
  const ppm = tex.width / (2 * ENV.texWorldM);
  const T0x = xL * ppm, T1x = xR * ppm;
  const u1x = T1x - T0x, u2y = tex.height;
  const a = (BR.x - BL.x) / u1x, b2 = (BR.y - BL.y) / u1x;
  const c = (FL.x - BL.x) / u2y, d = (FL.y - BL.y) / u2y;
  const e = BL.x - a * T0x, f2 = BL.y - b2 * T0x;
  pat.setTransform(new DOMMatrix([a, b2, c, d, e, f2]).multiply(
    new DOMMatrix()));                 // pattern space == layer space pre-translate
  LCTX.fillStyle = pat;
  LCTX.beginPath();
  LCTX.moveTo(BL.x, BL.y); LCTX.lineTo(BR.x, BR.y);
  LCTX.lineTo(FR.x, FR.y); LCTX.lineTo(FL.x, FL.y);
  LCTX.closePath(); LCTX.fill();
}
function cutAisles(hF, zF, hB, zB) {
  const { xL, xR } = envXRange2(hF, zF, hB, zB);
  if (xL >= xR) return;
  LCTX.fillStyle = ENV_COL.aisle;
  const k0 = Math.ceil((xL - 6) / ENV.aisleEveryM), k1 = Math.floor((xR - 6) / ENV.aisleEveryM);
  for (let k = k0; k <= k1; k++) {
    const wx = k * ENV.aisleEveryM + 6, hw = ENV.aisleW / 2;
    const p = [vproj3(wx - hw, hB, zB), vproj3(wx + hw, hB, zB),
               vproj3(wx + hw, hF, zF), vproj3(wx - hw, hF, zF)];
    if (p.some(q => q.d < 0.5)) continue;
    LCTX.beginPath();
    LCTX.moveTo(p[0].x, p[0].y); LCTX.lineTo(p[1].x, p[1].y);
    LCTX.lineTo(p[2].x, p[2].y); LCTX.lineTo(p[3].x, p[3].y);
    LCTX.closePath(); LCTX.fill();
  }
}
function paintStadium() {
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
    LCTX.fillStyle = "#101218";
    LCTX.beginPath();
    LCTX.moveTo(bw[3].x, bw[3].y); LCTX.lineTo(bw[2].x, bw[2].y);
    LCTX.lineTo(bw[2].x, bw[2].y - 4000); LCTX.lineTo(bw[3].x, bw[3].y - 4000);
    LCTX.closePath(); LCTX.fill();
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
  // far barrier boards
  fillStructQuad(ENV_COL.board, 0, ENV.farBarrierZ, ENV.barrierH, ENV.farBarrierZ);
  const { xL, xR } = envXRange2(0, ENV.farBarrierZ, ENV.barrierH, ENV.farBarrierZ);
  if (xL < xR) {
    LCTX.strokeStyle = "rgba(255,255,255,0.10)"; LCTX.lineWidth = 1;
    const k0 = Math.ceil(xL / ENV.boardPanelM), k1 = Math.floor(xR / ENV.boardPanelM);
    for (let k = k0; k <= k1; k++)
      strokeSeg3(k * ENV.boardPanelM, 0, ENV.farBarrierZ, k * ENV.boardPanelM, ENV.barrierH, ENV.farBarrierZ);
    railLine(ENV.barrierH, ENV.farBarrierZ, 2, ENV_COL.boardTop);
  }
}
function paintMarkings() {
  LCTX.strokeStyle = "rgba(250,250,250,0.92)";
  LCTX.fillStyle = "rgba(250,250,250,0.92)";
  LCTX.lineWidth = 2;
  LCTX.lineJoin = "round";
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
function paintGround(bb) {
  // exact per-band homography of the world ground texture into V-space rows
  const gW = S.groundTex.width, gH = S.groundTex.height;
  const tx = (x) => (x - APRON.x0) * REF_ZOOM, tz = (z) => (z - APRON.y0) * REF_ZOOM;
  const BH = 3;
  const rowWorld = (vy) => {
    // strip model: a V row is a constant-depth world line; invert vy -> wz in
    // the reference column, then wx maps linearly with slope 1/Sx
    const qy = (VIEW.h / 2 - vy) / PROJ.fpx;
    const dy = PROJ.f.y + qy * PROJ.u.y;
    if (dy >= -1e-6) return null;
    const lam = -PROJ.C.y / dy;
    const wz = PROJ.C.z + lam * (PROJ.f.z + qy * PROJ.u.z);
    const xref = vproj(PROJ.C.x, wz).x;             // strip x of the reference column
    const at = (vx) => ({ x: PROJ.C.x + (vx - xref) / PROJ.Sx, z: wz });
    return at;
  };
  for (let vy = Math.floor(bb.y0); vy < bb.y1; vy += BH) {
    const b = vy + BH;
    const rt = rowWorld(vy), rb = rowWorld(b);
    if (!rt || !rb) continue;
    const L0 = rt(bb.x0), R0 = rt(bb.x1), L1 = rb(bb.x0);
    const T0x = tx(L0.x), T0y = tz(L0.z);
    const T1x = tx(R0.x), T1y = tz(R0.z);
    const T2x = tx(L1.x), T2y = tz(L1.z);
    const u1x = T1x - T0x, u1y = T1y - T0y, u2x = T2x - T0x, u2y = T2y - T0y;
    const det = u1x * u2y - u1y * u2x;
    if (Math.abs(det) < 1e-9) continue;
    const w = bb.x1 - bb.x0, bh = BH;
    const a = (w * u2y) / det, b2 = (-bh * u1y) / det;
    const c = (-w * u2x) / det, d = (bh * u1x) / det;
    const e = bb.x0 - (a * T0x + c * T0y);
    const f2 = vy - (b2 * T0x + d * T0y);
    const R1 = rb(bb.x1);
    const T3x = tx(R1.x), T3y = tz(R1.z);
    const bx0 = Math.max(0, Math.floor(Math.min(T0x, T1x, T2x, T3x)) - 2);
    const bx1 = Math.min(gW, Math.ceil(Math.max(T0x, T1x, T2x, T3x)) + 2);
    const by0 = Math.max(0, Math.floor(Math.min(T0y, T1y, T2y, T3y)) - 2);
    const by1 = Math.min(gH, Math.ceil(Math.max(T0y, T1y, T2y, T3y)) + 2);
    if (bx1 <= bx0 || by1 <= by0) continue;
    LCTX.save();
    LCTX.beginPath(); LCTX.rect(bb.x0, vy, w, bh); LCTX.clip();
    const base = LCTX.getTransform();
    LCTX.setTransform(base.multiply(new DOMMatrix([a, b2, c, d, e, f2])));
    LCTX.drawImage(S.groundTex, bx0, by0, bx1 - bx0, by1 - by0, bx0, by0, bx1 - bx0, by1 - by0);
    LCTX.restore();
  }
}

function makeLayer(bb) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(bb.x1 - bb.x0);
  c.height = Math.ceil(bb.y1 - bb.y0);
  const lc = c.getContext("2d");
  lc.imageSmoothingEnabled = false;
  lc.translate(-bb.x0, -bb.y0);        // draw in V coords directly
  return { canvas: c, ctx: lc, bb };
}

function freezeProjection() {
  buildFrozenBasis();
  S.standPat = {
    upper: null, lower: null,          // patterns must belong to a live context
  };
  // ── V-space bounds ──
  const groundPts = [
    vproj(APRON.x0, APRON.y0), vproj(APRON.x1, APRON.y0),
    vproj(APRON.x0, APRON.y1), vproj(APRON.x1, APRON.y1),
    vproj(52.5, APRON.y1),
  ];
  const gbb = {
    x0: Math.min(...groundPts.map(p => p.x)) - 4, x1: Math.max(...groundPts.map(p => p.x)) + 4,
    y0: Math.min(...groundPts.map(p => p.y)) - 4, y1: Math.max(...groundPts.map(p => p.y)) + 4,
  };
  const standTopZ = ENV.standFrontZ - ENV.lowerRows * ENV.lowerRowDepth - ENV.walkDepth
                    - ENV.upperRows * ENV.upperRowDepth;
  const standTopH = ENV.frontWallH + ENV.lowerRows * ENV.lowerRowRise + 1.0
                    + ENV.upperRows * ENV.upperRowRise + ENV.backWallH;
  const backPts = [];
  for (const wx of [52.5 - 220, 52.5, 52.5 + 220])
    for (const [h, z] of [[0, ENV.farBarrierZ], [standTopH + 2, standTopZ], [0, APRON.y0]])
      backPts.push(vproj3(wx, h, z));
  const bbb = {
    x0: Math.min(gbb.x0, ...backPts.map(p => p.x)) - 4,
    x1: Math.max(gbb.x1, ...backPts.map(p => p.x)) + 4,
    y0: Math.min(...backPts.map(p => p.y)) - 40,
    y1: Math.max(...backPts.map(p => p.y)) + 4,
  };
  const frontPts = [];
  for (const wx of [52.5 - 260, 52.5 + 260])
    for (const h of [0, ENV.barrierH + 0.2])
      frontPts.push(vproj3(wx, h, ENV.nearBarrierZ));
  const fbb = {
    x0: Math.min(...frontPts.map(p => p.x)) - 4, x1: Math.max(...frontPts.map(p => p.x)) + 4,
    y0: Math.min(...frontPts.map(p => p.y)) - 4, y1: Math.max(...frontPts.map(p => p.y)) + 4,
  };
  // ── paint layers (all drawing goes through the frozen projection once) ──
  const back = makeLayer(bbb);
  LCTX = back.ctx;
  S.standPat = {
    upper: LCTX.createPattern(S.standTex.upper, "repeat"),
    lower: LCTX.createPattern(S.standTex.lower, "repeat"),
  };
  paintStadium();
  const ground = makeLayer(gbb);
  LCTX = ground.ctx;
  paintGround(gbb);
  paintMarkings();
  const front = makeLayer(fbb);
  LCTX = front.ctx;
  fillStructQuad("#20262e", 0, ENV.nearBarrierZ, ENV.barrierH, ENV.nearBarrierZ);
  railLine(ENV.barrierH, ENV.nearBarrierZ, 2, ENV_COL.boardTop);
  LCTX = null;
  // ── frozen entity constants ──
  const pxPerM = PROJ.fpx / PROJ.czRef;                 // authored reference density
  const playerVScale = (pxPerM / REF_ZOOM) * S.author.pscale;
  // Goal placement. PREFERRED: the one-time authoring bake
  // (goal_v2_3_frozen_bake) — V2.2 panels rectified into THIS frozen
  // projection offline; at runtime it is an ordinary rigid 2D scene member
  // with exact post-foot registration. The bake is valid only for the
  // authoring parameters it was made with; if the projection is re-authored
  // differently, we fall back to the optimal rigid V2.2 fit (residual shown).
  const bm = S.goalBakeMeta;
  const bakeValid = bm && S.images.goalBake &&
    bm.projection_model === "strip-v1" &&
    ["height", "dist", "fov", "depthoff", "pitch", "yaw"]
      .every(k => S.author[k] === bm.author_projection[k]);
  let goals;
  if (bakeValid) {
    const [bx0, by0] = bm.v_offset, [bw, bh] = bm.size;
    goals = [0, 1].map(side => {
      const gx = side ? 105 : 0, out = side ? 1 : -1;
      const tF = vproj(gx, 30.34), tN = vproj(gx, 37.66);
      const base = vproj(gx, 34);
      const off = vproj(gx + out * GOAL_CFG.offX, 34 + GOAL_CFG.offDepth);
      const dx = off.x - base.x, dy = off.y - base.y;   // world-offset trim (V delta)
      const k = GOAL_CFG.scale;
      const mid = [(tF.x + tN.x) / 2 + dx, (tF.y + tN.y) / 2 + dy];
      const rawX = side ? bx0 : (2 * (VIEW.w / 2) - bx0 - bw);  // left = mirror about V x=640
      const x0 = mid[0] + ((rawX + dx) - mid[0]) * k;           // scale trim about mouth mid
      const y0 = mid[1] + ((by0 + dy) - mid[1]) * k;
      const fit = (t) => [mid[0] + (t.x + dx - mid[0]) * k, mid[1] + (t.y + dy - mid[1]) * k];
      const fFar = fit(tF), fNear = fit(tN);
      return { side, img: side ? S.images.goalBake : S.images.goalBakeM,
               vx: x0, vy: y0, w: bw * k, h: bh * k, sortY: 33.5,
               tF: { x: tF.x + dx, y: tF.y + dy }, tN: { x: tN.x + dx, y: tN.y + dy },
               fFar, fNear, baked: true,
               eFar: Math.hypot(fFar[0] - tF.x - dx, fFar[1] - tF.y - dy),
               eNear: Math.hypot(fNear[0] - tN.x - dx, fNear[1] - tN.y - dy) };
    });
    S.frozen_goalMode = "baked (goal_v2_3_frozen_bake)";
  } else {
    console.warn("goal bake not valid for this projection (calibration in progress) — rigid V2.2 fit active; re-bake after the projection is finalized");
    S.frozen_goalMode = "rigid V2.2 fit (re-bake pending for calibrated projection)";
    goals = [0, 1].map(side => {
    const gx = side ? 105 : 0, out = side ? 1 : -1;
    const mirrored = side ? GOAL_CFG.mirrorR : GOAL_CFG.mirrorL;
    const mx = (p) => mirrored ? [GOAL_SPRITE.W - 1 - p[0], p[1]] : [p[0], p[1]];
    const aF = mx(GOAL_SPRITE.footFar), aN = mx(GOAL_SPRITE.footNear);
    const tF = vproj(gx + out * GOAL_CFG.offX, 30.34 + GOAL_CFG.offDepth);
    const tN = vproj(gx + out * GOAL_CFG.offX, 37.66 + GOAL_CFG.offDepth);
    const am = [(aF[0] + aN[0]) / 2, (aF[1] + aN[1]) / 2];
    const tm = [(tF.x + tN.x) / 2, (tF.y + tN.y) / 2];
    const c1 = [aF[0] - am[0], aF[1] - am[1]], c2 = [aN[0] - am[0], aN[1] - am[1]];
    const d1 = [tF.x - tm[0], tF.y - tm[1]], d2 = [tN.x - tm[0], tN.y - tm[1]];
    const s0 = (c1[0] * d1[0] + c1[1] * d1[1] + c2[0] * d2[0] + c2[1] * d2[1])
             / (c1[0] ** 2 + c1[1] ** 2 + c2[0] ** 2 + c2[1] ** 2);
    const s = s0 * GOAL_CFG.scale;
    const T = [tm[0] - s * am[0], tm[1] - s * am[1]];      // trim scales about midpoint
    const fFar = [s * aF[0] + T[0], s * aF[1] + T[1]];     // fitted feet (V-space)
    const fNear = [s * aN[0] + T[0], s * aN[1] + T[1]];
    return { side, img: mirrored ? S.images.goal22m : S.images.goal22,
             vx: T[0], vy: T[1], w: GOAL_SPRITE.W * s, h: GOAL_SPRITE.H * s,
             sortY: 33.5, tF, tN, fFar, fNear, baked: false,
             eFar: Math.hypot(fFar[0] - tF.x, fFar[1] - tF.y),
             eNear: Math.hypot(fNear[0] - tN.x, fNear[1] - tN.y) };
    });
  }
  S.frozen = { back, ground, front, playerVScale, pxPerM, goals,
               author: { ...S.author },
               vbb: { x0: Math.min(bbb.x0, gbb.x0, fbb.x0), x1: Math.max(bbb.x1, gbb.x1, fbb.x1),
                      y0: bbb.y0, y1: fbb.y1 },
               gbb };
  // start the camera at pitch centre
  const c0 = vproj(52.5, 34);
  S.camV.x = c0.x; S.camV.y = c0.y;
}

// ═══ runtime camera: pan + uniform zoom ONLY ═════════════════════════════════
function v2s(v) {
  return { x: (v.x - S.camV.x) * S.camV.zoom + cv.width / 2,
           y: (v.y - S.camV.y) * S.camV.zoom + cv.height / 2 };
}
function camTargetV(sample) {
  if (S.camV.mode === "static" || !sample) return vproj(52.5, 34);
  // optional tracking look-ahead: lead the target along the ball's motion
  const sp = Math.hypot(sample.ball.vx || 0, sample.ball.vy || 0);
  const lead = S.camV.lead > 0 && sp > 0.5 ? S.camV.lead : 0;
  const bx = sample.ball.x + (lead ? sample.ball.vx / sp * lead : 0);
  const by = sample.ball.y + (lead ? sample.ball.vy / sp * lead : 0);
  if (S.camV.mode === "ball") return vproj(bx, by);
  let sx = 0, sy = 0, n = 0;
  for (const p of sample.players)
    if (Math.hypot(p.x - sample.ball.x, p.y - sample.ball.y) < 18) { sx += p.x; sy += p.y; n++; }
  if (!n) return vproj(bx, by);
  return vproj(0.55 * bx + 0.45 * (sx / n), 0.55 * by + 0.45 * (sy / n));
}
function updateCameraV(dt, sample) {
  const t = camTargetV(sample);
  S.camV.target = t;
  const z = S.camV.zoom, g = S.frozen.gbb;
  const hw = cv.width / (2 * z), hh = cv.height / (2 * z);
  const cl = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const tx = cl(t.x, g.x0 + hw - 60, g.x1 - hw + 60);
  const ty = cl(t.y, S.frozen.vbb.y0 + hh - 40, S.frozen.vbb.y1 - hh + 40);
  const k = S.camV.smooth <= 0.001 ? 1 : 1 - Math.exp(-dt / S.camV.smooth);
  S.camV.x += (tx - S.camV.x) * k;
  S.camV.y += (ty - S.camV.y) * k;
  S.camV.zoom += (S.camV.zoomTarget - S.camV.zoom) * k;   // structured for dynamic zoom
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
  updateCameraV(dt, sample);
  draw(sample, dt);
  if ((ts | 0) % 500 < 20) updateHUD();
  requestAnimationFrame(tick);
}

function drawLayer(layer) {
  const z = S.camV.zoom;
  ctx.drawImage(layer.canvas,
    Math.round((layer.bb.x0 - S.camV.x) * z + cv.width / 2),
    Math.round((layer.bb.y0 - S.camV.y) * z + cv.height / 2),
    Math.round(layer.canvas.width * z), Math.round(layer.canvas.height * z));
}
function headingToDir(h) { return DIRS[Math.round(((h % 360) + 360) % 360 / 45) % 8]; }
function viewState(idx) {
  return S.view[idx] ||= { heading: 90, ft: Math.random() * 0.1, frame: 0, state: "idle" };
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
  const vpos = vproj(p.x, p.y);
  const sp = v2s(vpos);
  const ax = Math.round(sp.x), ay = Math.round(sp.y);
  const s = S.frozen.playerVScale * S.camV.zoom;    // authored size × shared zoom
  const team = (S.pb.players[p.pid] || {}).team === "AWAY" ? 1 : 0;
  // ground ring/shadow: foreshortening from the FROZEN projection (authored,
  // position-dependent world property — not camera compensation)
  const p2 = vproj(p.x, p.y + 0.5);
  const flat = Math.max(0.15, Math.min(0.8, Math.abs(p2.y - vpos.y) * 2 / (S.frozen.pxPerM)));
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
    const tip = v2s(vproj(p.x + p.vx * 0.8, p.y + p.vy * 0.8));
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
  const vpos = vproj(ball.x, ball.y);
  const sp = v2s(vpos);
  const x = Math.round(sp.x), y = Math.round(sp.y);
  const r = Math.max(2, 0.16 * S.frozen.pxPerM * S.camV.zoom);
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 1.1, Math.max(1, r * 0.5), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f2f2f2"; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = "#333"; ctx.stroke();
  if (S.dbg.ball) {
    ctx.fillStyle = "#ffd23c"; ctx.font = "10px monospace"; ctx.textAlign = "center";
    ctx.fillText(`ball (${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}) m`, x, y - r - 5);
  }
}
function drawGoal(gz) {
  const z = S.camV.zoom;
  ctx.drawImage(gz.img,
    Math.round((gz.vx - S.camV.x) * z + cv.width / 2),
    Math.round((gz.vy - S.camV.y) * z + cv.height / 2),
    Math.round(gz.w * z), Math.round(gz.h * z));
}
function drawGoalGeoDebug(side) {
  // Goal calibration debug: authoritative frozen geometry (red), the
  // artwork's calibrated post feet (magenta), mouth midpoint (yellow), and
  // the INDEPENDENT per-post pixel errors of the frozen calibration.
  const gx = side ? 105 : 0, dir = side ? 1 : -1;
  const seg = (aw, bw) => {
    const a = v2s(vproj3(...aw)), b = v2s(vproj3(...bw));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  ctx.strokeStyle = "rgba(255,80,80,0.9)"; ctx.lineWidth = 1.5;
  seg([gx, 0, 26], [gx, 0, 42]);                                 // goal line
  seg([gx, 0, 30.34], [gx + dir * 2, 0, 30.34]);                 // net footprint
  seg([gx + dir * 2, 0, 30.34], [gx + dir * 2, 0, 37.66]);
  seg([gx + dir * 2, 0, 37.66], [gx, 0, 37.66]);
  ctx.lineWidth = 2;
  seg([gx, 0, 30.34], [gx, 2.44, 30.34]);                        // authoritative frame
  seg([gx, 0, 37.66], [gx, 2.44, 37.66]);
  seg([gx, 2.44, 30.34], [gx, 2.44, 37.66]);
  const gz = S.frozen.goals[side];
  const dot = (v, col, r = 4) => {
    const p = v2s({ x: v[0] ?? v.x, y: v[1] ?? v.y });
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    return p;
  };
  dot(gz.tF, "#ff5050");                       // authoritative projected post feet
  dot(gz.tN, "#ff5050");
  dot(gz.fFar, "#ff5ce0");                     // artwork feet after frozen calibration
  dot(gz.fNear, "#ff5ce0");
  const mid = dot([(gz.fFar[0] + gz.fNear[0]) / 2, (gz.fFar[1] + gz.fNear[1]) / 2], "#ffd23c", 3);
  const z = S.camV.zoom;
  ctx.fillStyle = "#fff"; ctx.font = "11px monospace"; ctx.textAlign = "left";
  const tx0 = Math.min(cv.width - 300, Math.max(8, mid.x + 18));
  ctx.fillText(`far-post err  ${gz.eFar.toFixed(2)}Vpx (${(gz.eFar * z).toFixed(1)}px @z${z.toFixed(2)})`, tx0, mid.y - 26);
  ctx.fillText(`near-post err ${gz.eNear.toFixed(2)}Vpx (${(gz.eNear * z).toFixed(1)}px)  ${gz.baked ? "FROZEN BAKE" : "rigid fallback"}`, tx0, mid.y - 14);
}
function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1;
  const line = (aw, bw) => {
    const a = v2s(vproj(...aw)), b = v2s(vproj(...bw));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  for (let x = 0; x <= 105; x += 5) line([x, 0], [x, 68]);
  for (let y = 0; y <= 68; y += 5) line([0, y], [105, y]);
}

function draw(sample, dt) {
  ctx.imageSmoothingEnabled = false;
  const bg = ctx.createLinearGradient(0, 0, 0, cv.height);
  bg.addColorStop(0, "#0a0b10"); bg.addColorStop(0.5, "#12141b"); bg.addColorStop(1, "#0b0e12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cv.width, cv.height);
  drawLayer(S.frozen.back);
  drawLayer(S.frozen.ground);
  if (S.dbg.grid) drawGrid();
  const ents = [];
  if (sample) {
    for (const p of sample.players) ents.push({ y: p.y, p });
    ents.push({ y: sample.ball.y, ball: sample.ball });
  }
  for (const gz of S.frozen.goals) ents.push({ y: gz.sortY, gz });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.p) drawPlayer(e.p, dt);
    else if (e.ball) drawBall(e.ball);
    else drawGoal(e.gz);
  }
  if (S.dbg.goalgeo) { drawGoalGeoDebug(0); drawGoalGeoDebug(1); }
  if (S.dbg.track && S.camV.target) {
    const t = v2s(S.camV.target);
    ctx.strokeStyle = "#ff5ce0"; ctx.lineWidth = 2;
    ctx.strokeRect(t.x - 7, t.y - 7, 14, 14);
  }
  drawLayer(S.frozen.front);
  drawReadout(sample);
}
function drawReadout(sample) {
  const el = document.getElementById("readout");
  const a = S.frozen.author;
  // rig longitudinal position: the world x whose column sits at the view centre
  const xref34 = vproj(PROJ.C.x, 34).x;
  const rigM = PROJ.C.x + (S.camV.x - xref34) / PROJ.Sx;
  let camdbg = "";
  if (S.dbg.cam && sample) {
    const bV = vproj(sample.ball.x, sample.ball.y);
    const t = S.camV.target || bV;
    camdbg =
      `── camera travel debug ──\n` +
      `ball V   (${bV.x.toFixed(1)}, ${bV.y.toFixed(1)})\n` +
      `target V (${t.x.toFixed(1)}, ${t.y.toFixed(1)})\n` +
      `camera V (${S.camV.x.toFixed(1)}, ${S.camV.y.toFixed(1)})\n` +
      `rig at   ${rigM.toFixed(1)} m along touchline (0 = left goal line)\n`;
  }
  el.textContent =
    `head     ${S.pb.head.toFixed(1)}s / buffered ${bufferedSeconds()}s${S.pb.finished ? " (FT)" : ""}\n` +
    `frozen   h${a.height} d${a.dist} fov${a.fov} pitch${a.pitch} yaw${a.yaw} [strip/rail]\n` +
    `camera   ${S.camV.mode}  rig ${rigM.toFixed(1)}m  zoom ×${S.camV.zoom.toFixed(2)}  lead ${S.camV.lead.toFixed(1)}m\n` +
    `goals    ${S.frozen_goalMode}\n` +
    (sample ? `ball     (${sample.ball.x.toFixed(1)}, ${sample.ball.y.toFixed(1)}) m\n` : "") +
    camdbg +
    (S.dbg.xform ? `xform    screen = (V − cam)·zoom + centre  [shared by all]\n` : "") +
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
      freezeProjection();
    });
    el.addEventListener("input", () => {
      out.textContent = AUTHOR_FMT[key](parseFloat(el.value));
    });
  }
  const zoomEl = document.getElementById("rzoom"), zoomOut = document.getElementById("v-rzoom");
  zoomEl.value = S.camV.zoomTarget;
  zoomOut.textContent = "×" + S.camV.zoomTarget.toFixed(2);
  zoomEl.addEventListener("input", () => {
    S.camV.zoomTarget = parseFloat(zoomEl.value);
    zoomOut.textContent = "×" + S.camV.zoomTarget.toFixed(2);
  });
  const smEl = document.getElementById("smooth"), smOut = document.getElementById("v-smooth");
  smEl.value = S.camV.smooth;
  smOut.textContent = S.camV.smooth.toFixed(2) + " s";
  smEl.addEventListener("input", () => {
    S.camV.smooth = parseFloat(smEl.value);
    smOut.textContent = S.camV.smooth.toFixed(2) + " s";
  });
  document.getElementById("refreeze").addEventListener("click", freezeProjection);
  document.getElementById("resetauthor").addEventListener("click", () => {
    S.author = { ...AUTHOR_DEFAULTS };
    for (const key of Object.keys(AUTHOR_FMT)) {
      document.getElementById(key).value = S.author[key];
      document.getElementById("v-" + key).textContent = AUTHOR_FMT[key](S.author[key]);
    }
    freezeProjection();
  });
  for (const r of document.querySelectorAll("input[name=cammode]"))
    r.addEventListener("change", () => { if (r.checked) S.camV.mode = r.value; });
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
  const leadEl = document.getElementById("lead"), leadOut = document.getElementById("v-lead");
  leadEl.value = S.camV.lead;
  leadOut.textContent = S.camV.lead.toFixed(1) + " m";
  leadEl.addEventListener("input", () => {
    S.camV.lead = parseFloat(leadEl.value);
    leadOut.textContent = S.camV.lead.toFixed(1) + " m";
  });
  const gbind = (id, key, fmt) => {
    const el = document.getElementById(id), out = document.getElementById("v-" + id);
    el.value = GOAL_CFG[key]; out.textContent = fmt(GOAL_CFG[key]);
    el.addEventListener("input", () => {
      GOAL_CFG[key] = parseFloat(el.value);
      out.textContent = fmt(GOAL_CFG[key]);
      freezeProjection();                       // recalibrate against frozen world
    });
  };
  gbind("gscale", "scale", v => "×" + v.toFixed(2));
  gbind("goffx", "offX", v => v.toFixed(2) + " m");
  gbind("goffd", "offDepth", v => v.toFixed(2) + " m");
  document.getElementById("gleft").addEventListener("change",
    (e) => { GOAL_CFG.mirrorL = e.target.value === "mirror"; freezeProjection(); });
  document.getElementById("gright").addEventListener("change",
    (e) => { GOAL_CFG.mirrorR = e.target.value === "mirror"; freezeProjection(); });
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

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

// ═══ 2X DPR-AWARE BACKING STORE ══════════════════════════════════════════════
// ONE authoritative backing-resolution factor. The canvas backing raster is
// CSS size x RES while CSS/display dimensions are untouched, and the world
// projection scales by RES — so normalized screen composition is IDENTICAL
// (u = x/backW is RES-invariant by construction) and every world object
// simply gains real raster samples. Capped at 2: the study showed 3x buys
// little for 9x pixels, and 2 matches Retina DPR exactly (1:1 device px).
// Pixel-art discipline: strokes quantize to PXQ backing px (= 1 CSS px), so
// chunky edges survive; sprites keep nearest-neighbour sampling and now draw
// from their sources at up to native resolution (players 128px -> ~123px).
const RES = Math.min(window.devicePixelRatio || 1, 2);
const PXQ = Math.max(1, Math.round(RES));   // stroke quantum (1 CSS px)
const qw = (cssw) => Math.max(PXQ, Math.round(cssw * RES / PXQ) * PXQ);
const uipx = (v) => Math.round(v * RES);    // HUD/debug sizes in backing px

// CAMERA_V1 — the authored projection (frozen; sliders re-freeze, not animate)
// pscale 0.60 = 2X SCALE CALIBRATION: the 128px sprite body (100px opaque)
// then implies a 1.88 m standing player (was 2.66 m at 0.85 — taller than
// the 2.44 m goal). Drawn player/goal ratio 0.84 vs real 0.74: slight
// pixel-art oversize kept for readability. BALL_VIS_R 0.19 m (visual only;
// physical radius stays 0.11 m; selected from the six-candidate boot-
// reference study) = 6.9 CSS px diameter at zoom 1.
const AUTHOR_DEFAULTS = {
  height: 30, dist: 43, fov: 28, depthoff: 3, pitch: 22, yaw: 0, pscale: 0.60,
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
         netphys: false,
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
  jobs.push({ key: ["ballsheet", "-", 0], path: ASSET_ROOT + "originals/ball_pixellab/ball_sheet_24x8.png" });
  for (const n of [7, 8, 9, 10, 11])
    jobs.push({ key: ["ballmicro", String(n), 0], path: ASSET_ROOT + "originals/ball_pixellab/ball_micro_" + n + "_4ph.png" });
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
    if (kind === "ballsheet") { S.images.ballSheet = im; return; }
    if (kind === "ballmicro") { (S.images.ballMicro ||= {})[+dir] = im; return; }
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
  // Near-side texture: the art with its ENTIRE interior net area replaced by
  // the single-layer V2.2 weave. The interior was baked composite: back net
  // photographed through the side net (dense, left) meeting the bare drape
  // (bright, right) along an occlusion boundary — a diagonal that visually
  // sliced the goal's back into a false triangle. The real rear panel now
  // provides the back net; the interior of the near side becomes one
  // uniform translucent veil. Kept byte-identical: the top/ground rails,
  // both post columns, and everything beyond the rear upright — the outer
  // drape bulge that forms the goal's accepted right-hand silhouette. The
  // quad below is inset 3-5 px from those members so their pixels survive.
  const SIDE_INT = [[108, 189], [228, 192], [218, 317], [98, 322]];
  const so = document.createElement("canvas");
  so.width = g.width; so.height = g.height;
  const soctx = so.getContext("2d");
  soctx.imageSmoothingEnabled = false;
  soctx.drawImage(g, 0, 0);
  soctx.globalCompositeOperation = "destination-out";
  soctx.beginPath();
  soctx.moveTo(...SIDE_INT[0]); soctx.lineTo(...SIDE_INT[1]);
  soctx.lineTo(...SIDE_INT[2]); soctx.lineTo(...SIDE_INT[3]);
  soctx.closePath(); soctx.fill();
  S.images.goal22side = so;   // frame-only: rails/posts/outer bulge; net comes
                              // from the shared wrap band sampled by sideNet
  const som = document.createElement("canvas");
  som.width = g.width; som.height = g.height;
  const somctx = som.getContext("2d");
  somctx.imageSmoothingEnabled = false;
  somctx.translate(g.width, 0); somctx.scale(-1, 1); somctx.drawImage(so, 0, 0);
  S.images.goal22sideM = som;
  // Roof frame: the V2.2 roof art with its fuzzy interior cleared — keeps the
  // organic rail edges (far top rail, rear top bar, near rail, crossbar edge)
  // as the secondary frame; the roof MESH comes from goalNetRoof beneath.
  const ro = document.createElement("canvas");
  ro.width = g.width; ro.height = g.height;
  const roctx = ro.getContext("2d");
  roctx.imageSmoothingEnabled = false;
  roctx.drawImage(g, 0, 0);
  roctx.globalCompositeOperation = "destination-out";
  roctx.beginPath();
  roctx.moveTo(50, 47); roctx.lineTo(160, 47);
  roctx.lineTo(222, 179); roctx.lineTo(110, 176);
  roctx.closePath(); roctx.fill();
  S.images.goal22roof = ro;
  const rom = document.createElement("canvas");
  rom.width = g.width; rom.height = g.height;
  const romctx = rom.getContext("2d");
  romctx.imageSmoothingEnabled = false;
  romctx.translate(g.width, 0); romctx.scale(-1, 1); romctx.drawImage(ro, 0, 0);
  S.images.goal22roofM = rom;

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
                 vy: (B[2] - A[2]) * SIM2W.y / dt,
                 z: 0, vz: 0, grounded: 1 };
  // authoritative continuous ball: row[5] = [z, vz, grounded, z6, x6, y6,
  // state]. Position AND height within the A->B second come from the
  // engine's sub-second track — kicks, flights and bounces appear exactly
  // where the physical ball was. Nothing is derived renderer-side; a jump
  // larger than physics allows is a dead-ball placement and is snapped,
  // never interpolated.
  const FB = B[5];
  if (FB) {
    const zseq = [A[5] ? A[5][0] : 0].concat(FB[3]);
    const u = Math.max(0, Math.min(5.999, t * 6));
    const i0 = Math.floor(u), f = u - i0;
    ball.z = zseq[i0] + (zseq[i0 + 1] - zseq[i0]) * f;
    ball.vz = FB[1]; ball.grounded = FB[2]; ball.state = FB[6];
    if (FB[4]) {
      const xseq = [A[1]].concat(FB[4]), yseq = [A[2]].concat(FB[5]);
      const dxm = (xseq[i0 + 1] - xseq[i0]) * SIM2W.x;
      const dym = (yseq[i0 + 1] - yseq[i0]) * SIM2W.y;
      if (Math.hypot(dxm, dym) > 8) {          // placement: snap, don't glide
        ball.x = (f < 0.5 ? xseq[i0] : xseq[i0 + 1]) * SIM2W.x;
        ball.y = (f < 0.5 ? yseq[i0] : yseq[i0 + 1]) * SIM2W.y;
        ball.vx = 0; ball.vy = 0;
      } else {
        ball.x = (xseq[i0] + (xseq[i0 + 1] - xseq[i0]) * f) * SIM2W.x;
        ball.y = (yseq[i0] + (yseq[i0 + 1] - yseq[i0]) * f) * SIM2W.y;
        ball.vx = dxm * 6; ball.vy = dym * 6;
      }
    }
  }
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
                   speed: Math.hypot(vx, vy), act: b[2], active: b[3],
                   face: b.length > 4 ? b[4] : undefined });
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
  return { x: (p.x - VIEW.w / 2) * (RIG.zoom * RES) + cv.width / 2,
           y: (p.y - VIEW.h / 2) * (RIG.zoom * RES) + cv.height / 2, d: p.d };
}
function sproj(wx, wz) { return sproj3(wx, 0, wz); }
// BILLBOARD PERSPECTIVE COMPRESSION (sprites only — world projection is
// untouched): apparent sprite size falls off with true camera depth as
// (czRef/d)^DEPTH_ALPHA. alpha 1 = full physical perspective (visually
// too aggressive for this pixel-art game), alpha 0 = rejected flat
// billboards. 0.40 is the accepted stylized middle (near/far span 1.35x;
// user-selected from the seven-candidate study). Player and ball MUST
// share this exponent so their relative scale stays coherent. Sizes at
// the reference depth czRef are exactly the accepted calibrations.
const DEPTH_ALPHA = 0.40;
function depthScale(d) { return Math.pow(PROJ.czRef / d, DEPTH_ALPHA); }

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
  ctx.strokeStyle = color; ctx.lineWidth = qw(width);
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
    if (p[0].x > cv.width + 40 * RES || p[1].x < -40 * RES) continue;
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
  ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = PXQ;
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
  ctx.lineWidth = qw(2 * RIG.zoom);
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
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = PXQ;
  for (let x = 0; x <= 105; x += 5) strokeWorldPoly([[x, 0], [x, 68]]);
  for (let y = 0; y <= 68; y += 5) strokeWorldPoly([[0, y], [105, y]]);
}
// rail diagnostic: 10x10 m square centred across the touchline from the rig.
// By construction its shifted-world coords are rig-invariant, so its projected
// shape must be identical at every rail position — visible proof the camera
// translates instead of panning.
function drawRailSquare() {
  const cxm = RIG.x, cy = 34;
  ctx.strokeStyle = "rgba(80,220,255,0.9)"; ctx.lineWidth = uipx(2);
  strokeWorldPoly([[cxm - 5, cy - 5], [cxm + 5, cy - 5], [cxm + 5, cy + 5], [cxm - 5, cy + 5]], true);
  ctx.strokeStyle = "rgba(80,220,255,0.5)"; ctx.lineWidth = PXQ;
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
    const vy = (sy - cv.height / 2) / (RIG.zoom * RES) + VIEW.h / 2;
    const qy = (VIEW.h / 2 - vy) / PROJ.fpx;
    const dy = PROJ.f.y + qy * PROJ.u.y;
    if (dy >= -1e-6) return null;
    const lam = -PROJ.C.y / dy;
    const bx = PROJ.f.x + qy * PROJ.u.x, bz = PROJ.f.z + qy * PROJ.u.z;
    const Ax = PROJ.C.x + lam * bx, Az = PROJ.C.z + lam * bz;
    const st = lam / PROJ.fpx;
    return (sx) => {
      const vx = (sx - cv.width / 2) / (RIG.zoom * RES) + VIEW.w / 2;
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
        { name: "roof",                       // frame-only art (rails + silhouette)
    tex: "roofframe",
    art: [[42, 40], [168, 40], [232, 186], [105, 183]],
    world: (gx, out) => [[gx, 2.44, 30.34], [gx + out * 2, 2.44, 30.34],
                         [gx + out * 2, 2.44, 37.66], [gx, 2.44, 37.66]],
    u0: -0.02, u1: 1.15, v0: -0.02, v1: 1.02 },
    { name: "side",                       // frame-only art (rails/posts/bulge)
    tex: "sideframe",
    art: [[105, 183], [232, 186], [222, 320], [94, 327]],
    world: (gx, out) => [[gx, 2.44, 37.66], [gx + out * 2, 2.44, 37.66],
                         [gx + out * 2, 0, 37.66], [gx, 0, 37.66]],
    u0: -0.02, u1: 1.15, v0: -0.02, v1: 1.0,
    sag: "side", gridU: 8, gridV: 10 },
  { name: "mouth",                      // u: far->near post, v: crossbar->ground
    tex: "mouthframe",
    art: [[42, 40], [105, 183], [94, 327], [44, 194]],
    world: (gx, out) => [[gx, 2.44, 30.34], [gx, 2.44, 37.66],
                         [gx, 0, 37.66], [gx, 0, 30.34]],
    u0: -0.03, u1: 1.02, v0: -0.03, v1: 1.0 },
];
const GOAL_GRID = 3;                    // cells per panel axis (triangulated)
// Net rest-shape sag — the flexible net's RESTING geometry (the rigid cage
// stays exact). One continuous field over the FULL cage plan path s: far
// post (0) -> rear-far corner (2) -> rear-near corner (9.32) -> near post
// (11.32), so far side, rear and near side read as ONE hanging bag.
// Displacement = amp*sin(pi*s/sEnd)*v^vExp along a face-inward direction
// that smoothstep-rotates 90deg across each corner blend window: both rear
// corners wrap continuously (no pin, no kink). Zero at every pinned
// attachment: both posts (s=0, s=sEnd) and all top rails (v=0). These
// sagged positions are the net's rest state: the future ball-impact
// springs displace cell corners from here and relax back to here.
const GOAL_SAG = { amp: 0.22, blend: 3.0, sEnd: 11.32, vExp: 1.5 };
function goalNetSag(x, y, z, s, out) {
  const v = 1 - y / 2.44;
  if (s <= 0 || s >= GOAL_SAG.sEnd || v <= 0) return [x, y, z];
  const m = GOAL_SAG.amp * Math.sin(Math.PI * s / GOAL_SAG.sEnd)
          * Math.pow(v, GOAL_SAG.vExp);
  const ss = (c) => {
    const t = Math.min(1, Math.max(0, (s - (c - GOAL_SAG.blend)) / (2 * GOAL_SAG.blend)));
    return t * t * (3 - 2 * t);
  };
  const phi = (Math.PI / 2) * (1 + ss(2) + ss(9.32));
  return [x + m * out * Math.cos(phi), y, z + m * Math.sin(phi)];
}

// ═══ STRAND NET: one hexagonal mesh wrapped over the whole cage ══════════════
// The visible net is no longer a texture: it is the logical net itself —
// honeycomb strands generated in the continuous net coordinate system
// (S along the far-post -> rear -> near-post path, T down from the top
// rails; the roof is the matching patch over the cage top), placed at their
// sagged REST positions, projected through the shared sproj3 and stroked as
// connected paths. Strands can never lose pixels mid-run (minimum 1 px
// width), every vertical link starts and ends on chain vertices, and the
// same node graph is the future ball-impact spring mesh. Where perspective
// compresses the mesh below legibility, segments drop to quantized lower
// alpha (coverage-correct translucent sheen instead of a solid white mass —
// within one level, overdraw does not accumulate).
const NET = { ell: 0.095, cord: 0.022, seg: 0.10, droop: 0.09,
              col: "#e2e2dc", levels: [1, 0.68, 0.45, 0.28] };
function hexStrands(A, B, ell) {         // honeycomb over [0,A]x[0,B]
  const w2 = Math.sqrt(3) * ell / 2, rowp = 1.5 * ell;
  const nrow = Math.floor(B / rowp) + 1, nk = Math.floor(A / w2) + 1;
  const out = [];
  for (let r = 0; r <= nrow; r++) {      // zigzag chains (continuous strands)
    const pts = [];
    for (let k = 0; k <= nk; k++)
      pts.push([Math.min(A, k * w2),
                Math.min(B, r * rowp + ((k + r) % 2 ? ell / 2 : 0))]);
    out.push(pts);
  }
  for (let r = 0; r < nrow; r++)         // vertical links between chains
    for (let k = 0; k <= nk; k++)
      if ((k + r) % 2 === 1 && (r + 1) * rowp <= B + 1e-9)
        out.push([[Math.min(A, k * w2), r * rowp + ell / 2],
                  [Math.min(A, k * w2), (r + 1) * rowp]]);
  return out;
}
function buildGoalNet(gx, out) {
  const wallPt = (S, T) => {
    let x, z;
    if (S <= 2) { x = gx + out * S; z = 30.34; }
    else if (S <= 9.32) { x = gx + out * 2; z = 30.34 + (S - 2); }
    else { x = gx + out * (11.32 - S); z = 37.66; }
    return goalNetSag(x, 2.44 - T, z, S, out);
  };
  const roofPt = (zp, xp) => [gx + out * xp,   // gentle fabric droop, rails pinned
    2.44 - NET.droop * Math.sin(Math.PI * xp / 2) * Math.sin(Math.PI * zp / 7.32),
    30.34 + zp];
  // ── topology vertices are BOTH the render strand joints and the physics
  // nodes: one graph, one truth. Pinned (inverse mass 0): wall band nodes on
  // the posts (S=0 / S=11.32) and top rails (T=0); every roof edge node
  // (crossbar, side rails, rear top bar). Everything else is movable fabric.
  const idOf = new Map(), restA = [], invA = [];
  const addNode = (surf, a, b) => {
    const k = surf + "|" + a.toFixed(4) + "|" + b.toFixed(4);
    let id = idOf.get(k);
    if (id !== undefined) return id;
    id = invA.length;
    const pt = surf === 0 ? wallPt(a, b) : roofPt(a, b);
    restA.push(pt[0], pt[1], pt[2]);
    const pinned = surf === 0
      ? (b < 1e-6 || a < 1e-6 || a > 11.32 - 1e-6)
      : (a < 1e-6 || a > 7.32 - 1e-6 || b < 1e-6 || b > 2.0 - 1e-6);
    invA.push(pinned ? 0 : 1);
    idOf.set(k, id);
    return id;
  };
  const springPairs = [], strands = [];
  const addStrand = (surf, pts) => {
    const sp = [];
    let prevId = -1, prev = null;
    for (const [a, b] of pts) {
      const id = addNode(surf, a, b);
      if (prevId >= 0) {
        springPairs.push(prevId, id);
        if (surf === 0) {                // resample so sag curvature shows
          const nseg = Math.floor(Math.abs(a - prev[0]) / NET.seg);
          for (let t = 1; t <= nseg; t++) {
            const f = t / (nseg + 1);
            const aa = prev[0] + (a - prev[0]) * f, bb = prev[1] + (b - prev[1]) * f;
            sp.push({ iA: prevId, iB: id, t: f, r: wallPt(aa, bb), par: [aa, bb] });
          }
        }
      }
      sp.push({ n: id, par: [a, b] });
      prevId = id; prev = [a, b];
    }
    strands.push(sp);
  };
  for (const pts of hexStrands(11.32, 2.44, NET.ell)) addStrand(0, pts);
  for (const pts of hexStrands(7.32, 2.0, NET.ell)) addStrand(1, pts);
  const rest = Float64Array.from(restA);
  const springs = Int32Array.from(springPairs);
  const L0 = new Float64Array(springs.length / 2);
  for (let i = 0; i < L0.length; i++) {
    const a = springs[2 * i] * 3, b = springs[2 * i + 1] * 3;
    L0[i] = Math.hypot(rest[b] - rest[a], rest[b + 1] - rest[a + 1], rest[b + 2] - rest[a + 2]);
  }
  return { rest, pos: Float64Array.from(rest), vel: new Float64Array(rest.length),
           inv: Int8Array.from(invA), springs, L0, strands,
           active: false, dirty: false, energy: 0, quiet: 0 };
}
let NET_LAYERS = null;
function drawGoalNet(goal) {
  const c0 = sproj3(goal.gx, 1.2, 34);   // whole-goal cull
  if (c0.x < -900 * RES || c0.x > cv.width + 900 * RES) return;
  if (!NET_LAYERS || NET_LAYERS[0].width !== cv.width || NET_LAYERS[0].height !== cv.height)
    NET_LAYERS = NET.levels.map(() => {
      const c = document.createElement("canvas");
      c.width = cv.width; c.height = cv.height;
      return c;
    });
  const w = qw(NET.cord * S.pxPerM * RIG.zoom);
  const lctx = NET_LAYERS.map(c => {
    const x = c.getContext("2d");
    x.clearRect(0, 0, c.width, c.height);
    x.strokeStyle = NET.col; x.lineCap = "round"; x.lineWidth = w;
    x.beginPath();
    return x;
  });
  const pitchW = Math.sqrt(3) * NET.ell;
  const G = goal.net, pos = G.pos, restp = G.rest, live = G.dirty;
  const ptPos = (pt) => {
    if (pt.n !== undefined) {
      const j = pt.n * 3;
      return live ? sproj3(pos[j], pos[j + 1], pos[j + 2])
                  : sproj3(restp[j], restp[j + 1], restp[j + 2]);
    }
    if (!live) return sproj3(pt.r[0], pt.r[1], pt.r[2]);
    const a = pt.iA * 3, b = pt.iB * 3, t = pt.t;   // rest curve + lerped displacement
    return sproj3(
      pt.r[0] + (pos[a] - restp[a]) * (1 - t) + (pos[b] - restp[b]) * t,
      pt.r[1] + (pos[a + 1] - restp[a + 1]) * (1 - t) + (pos[b + 1] - restp[b + 1]) * t,
      pt.r[2] + (pos[a + 2] - restp[a + 2]) * (1 - t) + (pos[b + 2] - restp[b + 2]) * t);
  };
  for (const st of G.strands) {
    const prj = st.map(ptPos);
    // Per-VERTEX density scale, averaged over adjacent segments and smoothed
    // along the strand. Bucketing per raw segment made alternating zigzag
    // orientations land in different alpha levels — a bright/dim dashing
    // that read as holes. The smoothed metric varies slowly, so a strand
    // keeps one level for long runs and every joint stays connected.
    const n = prj.length;
    const g = new Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0, cnt = 0;
      for (const j of [i - 1, i]) {
        if (j < 0 || j + 1 >= n) continue;
        const dpar = Math.hypot(st[j + 1].par[0] - st[j].par[0], st[j + 1].par[1] - st[j].par[1]);
        if (dpar < 1e-9) continue;
        sum += Math.hypot(prj[j + 1].x - prj[j].x, prj[j + 1].y - prj[j].y) / dpar;
        cnt++;
      }
      g[i] = cnt ? sum / cnt : 0;
    }
    for (let pass = 0; pass < 2; pass++)
      for (let i = 1; i + 1 < n; i++) g[i] = (g[i - 1] + 2 * g[i] + g[i + 1]) / 4;
    let cur = -1;
    for (let i = 0; i + 1 < n; i++) {
      const a = Math.max(0.32, Math.min(1,
        Math.min(g[i], g[i + 1]) * pitchW / (3 * w)));
      let li = 0, best = 1e9;
      for (let k = 0; k < NET.levels.length; k++)
        if (Math.abs(NET.levels[k] - a) < best) { best = Math.abs(NET.levels[k] - a); li = k; }
      if (li !== cur) { lctx[li].moveTo(prj[i].x, prj[i].y); cur = li; }
      lctx[li].lineTo(prj[i + 1].x, prj[i + 1].y);
      // when the level changes mid-strand, re-anchor the new run at the
      // shared vertex so the two runs always share raster pixels
    }
  }
  for (let k = 0; k < NET.levels.length; k++) {
    lctx[k].stroke();
    ctx.globalAlpha = NET.levels[k];
    ctx.drawImage(NET_LAYERS[k], 0, 0);
    ctx.globalAlpha = 1;
  }
}
function buildGoalPanels() {
  const W = GOAL_SPRITE.W;
  S.goalPanels = [0, 1].map(side => {
    const gx = (side ? 105 : 0) + (side ? 1 : -1) * GOAL_CFG.offX;
    const out = side ? 1 : -1;
    const mirrored = side ? GOAL_CFG.mirrorR : GOAL_CFG.mirrorL;
    const panels = GOAL_ART_PANELS.map(P => {
      // frame-art textures only — the net itself is the strand system
      const img = P.tex === "sideframe" ? (mirrored ? S.images.goal22sideM : S.images.goal22side)
        : P.tex === "roofframe" ? (mirrored ? S.images.goal22roofM : S.images.goal22roof)
        : P.tex === "mouthframe"
          ? (mirrored ? S.images.goal22mouthM : S.images.goal22mouth)
          : (mirrored ? S.images.goal22m : S.images.goal22);
      const art = mirrored ? P.art.map(([x, y]) => [W - 1 - x, y]) : P.art;
      const H = homog([[0, 0], [1, 0], [1, 1], [0, 1]], art);
      const wq = P.world(gx, out);
      const worldAt = (u, v) => {           // bilinear on the planar world rect
        const [a, b, c, d] = wq;
        let x = (1 - v) * ((1 - u) * a[0] + u * b[0]) + v * ((1 - u) * d[0] + u * c[0]);
        let y = (1 - v) * ((1 - u) * a[1] + u * b[1]) + v * ((1 - u) * d[1] + u * c[1]);
        let z = (1 - v) * ((1 - u) * a[2] + u * b[2]) + v * ((1 - u) * d[2] + u * c[2]);
        if (P.sag) {                        // net rest-shape (cage stays exact)
          const s = P.sag === "farside" ? 2 * u
                  : P.sag === "rear" ? 2 + 7.32 * u
                  : 11.32 - 2 * u;          // side: u runs front->rear
          [x, y, z] = goalNetSag(x, y, z, s, out);
        }
        return [x, y, z + GOAL_CFG.offDepth];
      };
      // Grid lines ALWAYS include the exact panel edges (0 and 1) so panel
      // corners — the post feet among them — are exact triangle vertices,
      // never affine-interpolated. Margins become extra outer cells. Sagged
      // panels carry per-axis grids sized so the piecewise-linear mesh stays
      // within 0.5 screen px of the continuous rest shape at close-up zoom.
      const lines = (lo, hi, G) => {
        const L = [];
        if (lo < 0) L.push(lo);
        for (let k = 0; k <= G; k++) L.push(k / G);
        if (hi > 1) L.push(hi);
        return L;
      };
      const uL = lines(P.u0, P.u1, P.gridU || GOAL_GRID);
      const vL = lines(P.v0, P.v1, P.gridV || GOAL_GRID);
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
    return { side, panels, sortY: 33.5, gx, net: buildGoalNet(gx, out) };
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
// ═══ NET PHYSICS (renderer-only; deterministic fixed step) ═══════════════════
// Mass-spring dynamics on the SAME node graph the strands render from.
// Springs = every hex edge (structural, along the visible cords), rest
// lengths taken from the authored sagged rest shape, plus a weak anchor
// spring to the rest position representing the pre-tensioned gravity
// equilibrium (the authored sag IS the equilibrium; gravity is baked into
// it, so dynamics happen AROUND it and settle back to it exactly).
// Integration: semi-implicit Euler at a fixed 240 Hz (framerate never
// changes the result; the accumulator is clamped, never rescaled).
// No randomness anywhere; the simulator and its RNG are untouched.
//
// FUTURE ENGINE HOOK: when the authoritative simulator reports a shot
// reaching the net, call netImpact(side, [x,y,z], [vx,vy,vz], strength)
// from the playback event handling — same entry point the synthetic tests
// use below. Nothing else needs to change.
const NETPHYS = { dt: 1 / 240, k: 2500, kd: 2, kAnchor: 3, damp: 1.5,
                  maxAcc: 0.12, settleE: 4e-5, ballR: 0.11 };
function netActivate(net) { net.active = true; net.dirty = true; net.quiet = 0; }
function netImpact(side, p, v, strength = 1) {
  const net = S.goalPanels[side].net;
  netActivate(net);
  net.lastImpact = p.slice();
  const R = 0.5;
  for (let i = 0; i < net.inv.length; i++) {
    if (!net.inv[i]) continue;
    const j = i * 3;
    const d = Math.hypot(net.pos[j] - p[0], net.pos[j + 1] - p[1], net.pos[j + 2] - p[2]);
    if (d >= R) continue;
    const w = (1 - d / R) * (1 - d / R) * 0.45 * strength;
    net.vel[j] += v[0] * w; net.vel[j + 1] += v[1] * w; net.vel[j + 2] += v[2] * w;
  }
}
function netPhysStep(net, ball) {          // ONE fixed 240 Hz substep
  const { rest, pos, vel, inv, springs, L0 } = net, dt = NETPHYS.dt;
  for (let sI = 0; sI < L0.length; sI++) {
    const na = springs[2 * sI], nb = springs[2 * sI + 1];
    const ia = na * 3, ib = nb * 3;
    let dx = pos[ib] - pos[ia], dy = pos[ib + 1] - pos[ia + 1], dz = pos[ib + 2] - pos[ia + 2];
    const L = Math.hypot(dx, dy, dz);
    if (L < 1e-9) continue;
    dx /= L; dy /= L; dz /= L;
    const rel = (vel[ib] - vel[ia]) * dx + (vel[ib + 1] - vel[ia + 1]) * dy
              + (vel[ib + 2] - vel[ia + 2]) * dz;
    const f = (NETPHYS.k * (L - L0[sI]) + NETPHYS.kd * rel) * dt;
    if (inv[na]) { vel[ia] += f * dx; vel[ia + 1] += f * dy; vel[ia + 2] += f * dz; }
    if (inv[nb]) { vel[ib] -= f * dx; vel[ib + 1] -= f * dy; vel[ib + 2] -= f * dz; }
  }
  const dampf = Math.max(0, 1 - NETPHYS.damp * dt);
  let e = 0, maxd = 0;
  const R = ball ? NETPHYS.ballR + 0.02 : 0;
  for (let i = 0; i < inv.length; i++) {
    if (!inv[i]) continue;
    const j = i * 3;
    vel[j] = (vel[j] + NETPHYS.kAnchor * (rest[j] - pos[j]) * dt) * dampf;
    vel[j + 1] = (vel[j + 1] + NETPHYS.kAnchor * (rest[j + 1] - pos[j + 1]) * dt) * dampf;
    vel[j + 2] = (vel[j + 2] + NETPHYS.kAnchor * (rest[j + 2] - pos[j + 2]) * dt) * dampf;
    pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
    if (pos[j + 1] < 0.005) { pos[j + 1] = 0.005; if (vel[j + 1] < 0) vel[j + 1] = 0; }
    if (ball) {                            // kinematic sphere: ball carves the pocket
      const ddx = pos[j] - ball.p[0], ddy = pos[j + 1] - ball.p[1], ddz = pos[j + 2] - ball.p[2];
      const d = Math.hypot(ddx, ddy, ddz);
      if (d < R && d > 1e-9) {
        const push = (R - d) / d;
        pos[j] += ddx * push; pos[j + 1] += ddy * push; pos[j + 2] += ddz * push;
        const rv = (vel[j] - ball.v[0]) * ddx / d + (vel[j + 1] - ball.v[1]) * ddy / d
                 + (vel[j + 2] - ball.v[2]) * ddz / d;
        if (rv < 0) {
          vel[j] -= rv * ddx / d; vel[j + 1] -= rv * ddy / d; vel[j + 2] -= rv * ddz / d;
        }
      }
    }
    const dsp = Math.hypot(pos[j] - rest[j], pos[j + 1] - rest[j + 1], pos[j + 2] - rest[j + 2]);
    if (dsp > maxd) maxd = dsp;
    e += vel[j] * vel[j] + vel[j + 1] * vel[j + 1] + vel[j + 2] * vel[j + 2];
  }
  net.energy = e; net.maxDisp = maxd;
  if (!ball && e < NETPHYS.settleE) {
    if (++net.quiet > 90) {                // settled: snap EXACTLY to rest
      net.pos.set(net.rest); net.vel.fill(0);
      net.active = false; net.dirty = false;
    }
  } else net.quiet = 0;
}

// ── NET PHYSICS TEST — SYNTHETIC BALL TRAJECTORY (renderer-only harness).
// Keys 1-4 fire tests at the right goal; key 5 cycles slow/normal/power on
// the central strike. Prescribed analytic ball path (never touches the
// match engine); the net response is computed entirely by the springs.
const NETTESTS = {
  1: { p0: [96.0, 1.00, 34.0], aim: [107.35, 0.85, 34.0], v: 17, label: "central rear strike" },
  2: { p0: [97.0, 0.90, 32.6], aim: [107.25, 0.28, 30.9], v: 15, label: "low far corner" },
  3: { p0: [96.5, 1.20, 34.4], aim: [107.25, 2.15, 33.8], v: 15, label: "upper rear / roof" },
  4: { p0: [99.0, 0.80, 35.2], aim: [106.20, 0.70, 37.95], v: 13, label: "inside side net" },
};
const NETTEST_POWERS = [7, 17, 27];
let netTestPowerIdx = 1;
function startNetTest(id, speed) {
  const T = NETTESTS[id];
  const d = [T.aim[0] - T.p0[0], T.aim[1] - T.p0[1], T.aim[2] - T.p0[2]];
  const L = Math.hypot(d[0], d[1], d[2]);
  const v = speed || T.v;
  S.netTest = { id, label: T.label, speed: v,
                p: T.p0.slice(), v: [d[0] / L * v, d[1] / L * v, d[2] / L * v],
                phase: "fly", age: 0, contactAge: -1 };
}
function netTestStep() {                   // advances WITH the fixed physics step
  const t = S.netTest, dt = NETPHYS.dt;
  if (!t) return null;
  t.age += dt;
  if (t.phase === "fly") {
    t.p[0] += t.v[0] * dt; t.p[1] += t.v[1] * dt; t.p[2] += t.v[2] * dt;
    const net = S.goalPanels[1].net;       // contact check vs movable nodes
    if (t.p[0] > 104.5) {
      const R = NETPHYS.ballR + 0.06;
      for (let i = 0; i < net.inv.length; i++) {
        if (!net.inv[i]) continue;
        const j = i * 3;
        if (Math.hypot(net.pos[j] - t.p[0], net.pos[j + 1] - t.p[1],
                       net.pos[j + 2] - t.p[2]) < R) {
          t.phase = "push"; t.contactAge = t.age; t.vEntry = t.v.slice();
          netImpact(1, t.p, t.v, Math.min(1.6, 0.35 + t.speed / 20));
          break;
        }
      }
      if (t.p[0] > 108.5) t.phase = "done";
    }
  } else if (t.phase === "push") {
    const dec = Math.exp(-dt / 0.05);      // net "catches" the ball
    t.v[0] *= dec; t.v[1] *= dec; t.v[2] *= dec;
    t.p[0] += t.v[0] * dt; t.p[1] += t.v[1] * dt; t.p[2] += t.v[2] * dt;
    if (Math.hypot(t.v[0], t.v[1], t.v[2]) < 1.3) {
      t.phase = "drop";
      t.v[0] = -0.18 * t.vEntry[0]; t.v[2] = -0.18 * t.vEntry[2]; t.v[1] = 0.4;
    }
  } else if (t.phase === "drop") {
    t.v[1] -= 9.8 * dt;
    t.p[0] += t.v[0] * dt; t.p[1] += t.v[1] * dt; t.p[2] += t.v[2] * dt;
    t.v[0] *= (1 - 1.2 * dt); t.v[2] *= (1 - 1.2 * dt);
    if (t.p[1] < NETPHYS.ballR) {
      t.p[1] = NETPHYS.ballR;
      if (Math.abs(t.v[1]) > 0.6) t.v[1] = -0.35 * t.v[1];
      else { t.v[1] = 0; if (Math.hypot(t.v[0], t.v[2]) < 0.15) t.phase = "rest"; }
    }
  }
  if (t.age > 7) S.netTest = null;
  return (t.phase === "push" || t.phase === "fly") ? { p: t.p, v: t.v } :
         (t.phase === "drop" || t.phase === "rest") ? { p: t.p, v: t.v } : null;
}
// ── BALL PHYSICS TEST — SYNTHETIC (renderer-only harness; labeled on
// screen; never touches the match engine). Full 3D integrator at the same
// fixed 240 Hz step as the net physics: real gravity, restitution 0.55,
// 0.8 horizontal keep on bounce, rolling friction 4.2 m/s^2, settle
// thresholds — the same physical model the authoritative flight layer and
// the accepted world.py body use. Keys: 6 drop, 7 roll, 8 lofted pass,
// 9 elevated shot, C high chip.
const BALLTESTS = {
  6: { label: "drop", p: [86, 34, 4.0], v: [0, 0, 0] },
  7: { label: "rolling", p: [78, 34, 0], v: [9, 0, 0] },
  8: { label: "lofted pass", p: [76, 30, 0], v: [11, 2.5, 6] },
  9: { label: "elevated shot", p: [86, 34, 0], v: [24, 0.5, 2] },
  c: { label: "high chip", p: [82, 34, 0], v: [7, 0, 8] },
  v: { label: "SPIN SHOWCASE: rest, slow, normal, driven, loft, bounce, settle",
       p: [30, 44, 0], v: [0, 0, 0],
       script: [[1.0, [2.2, 0, 0]], [3.2, [8, 0, 0]], [5.4, [16, 0, 0]],
                [7.6, [11, 0.5, 6.5]]] },
};
function startBallTest(id) {
  const T = BALLTESTS[id];
  S.ballTest = { id, label: T.label, p: T.p.slice(), v: T.v.slice(),
                 grounded: T.p[2] <= 0 && T.v[2] <= 0, age: 0, trail: [],
                 script: T.script ? T.script.map(e => [e[0], e[1].slice()]) : undefined };
}
function ballTestStep() {
  const t = S.ballTest, dt = NETPHYS.dt;
  if (!t) return;
  t.age += dt;
  if (t.script)                       // showcase: scripted impulses on a timeline
    while (t.script.length && t.age >= t.script[0][0]) {
      const [, v] = t.script.shift();
      t.v = v.slice(); t.grounded = t.v[2] <= 0;
    }
  const G = 9.81, REST = 0.55, KEEP = 0.8, MU = 4.2, SETTLE = 0.9;
  if (!t.grounded) {
    t.p[0] += t.v[0] * dt; t.p[1] += t.v[1] * dt; t.p[2] += t.v[2] * dt;
    t.v[2] -= G * dt;
    if (t.p[2] <= 0 && t.v[2] < 0) {
      t.p[2] = 0;
      const r = -t.v[2] * REST;
      t.v[0] *= KEEP; t.v[1] *= KEEP;
      if (r < SETTLE) { t.v[2] = 0; t.grounded = true; }
      else t.v[2] = r;
    }
  } else {
    const sp = Math.hypot(t.v[0], t.v[1]);
    if (sp > 0.02) {
      const ns = Math.max(0, sp - MU * dt);
      t.v[0] *= ns / sp; t.v[1] *= ns / sp;
      t.p[0] += t.v[0] * dt; t.p[1] += t.v[1] * dt;
    } else { t.v[0] = t.v[1] = 0; }
  }
  if ((t.trail.length === 0 ||
       Math.hypot(t.p[0] - t.trail[t.trail.length - 1][0],
                  t.p[2] - t.trail[t.trail.length - 1][2]) > 0.12) && t.trail.length < 600)
    t.trail.push(t.p.slice());
  if (t.age > (t.script || t.id === "v" ? 16 : 9)) S.ballTest = null;
}
function drawBallTest(dt) {
  const t = S.ballTest;
  if (!t) return;
  if (S.dbg.ball && t.trail.length > 1) {
    ctx.strokeStyle = "rgba(255,210,60,0.55)"; ctx.lineWidth = PXQ;
    ctx.beginPath();
    for (let i = 0; i < t.trail.length; i++) {
      const q = sproj3(t.trail[i][0], t.trail[i][2], t.trail[i][1]);
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
  }
  drawBallAt(t.p[0], t.p[1], t.p[2], Math.hypot(t.v[0], t.v[1]), dt);
  ctx.fillStyle = "#ffd34d"; ctx.font = "bold " + uipx(13) + "px ui-monospace, monospace";
  ctx.fillText((S.netSlow ? "[SLOW-MO 0.15x]  " : "") +
    "BALL PHYSICS TEST \u2014 SYNTHETIC (" + t.label + ")", uipx(14), cv.height - uipx(52));
  ctx.fillStyle = "#9fe8ff"; ctx.font = uipx(12) + "px ui-monospace, monospace";
  ctx.fillText("pos " + t.p.map(v => v.toFixed(2)).join(" / ") +
    "   vel " + t.v.map(v => v.toFixed(2)).join(" / ") +
    "   speed " + Math.hypot(t.v[0], t.v[1], t.v[2]).toFixed(2) +
    " m/s   grounded " + (t.grounded ? "yes" : "no"), uipx(14), cv.height - uipx(68));
}
// ── BALL TRANSPORT TEST: plays the engine's scripted body sequence
// (/api/balltest/sequence) through the real camera. Deterministic engine
// physics; the viewer only replays the returned track. Key T.
async function startBallSeq() {
  try {
    const r = await fetch(API + "/balltest/sequence").then(x => x.json());
    S.ballSeq = { actions: r.actions, idx: 0, t: -0.8, done: false };
  } catch (e) { console.warn("balltest fetch failed", e); }
}
function ballSeqStep(dt) {
  const q = S.ballSeq;
  if (!q || q.done) return;
  q.t += dt;
  const a = q.actions[q.idx];
  const last = a.track[a.track.length - 1][0];
  if (q.t > last + 1.2) {
    q.idx++; q.t = -0.8;
    if (q.idx >= q.actions.length) { S.ballSeq = null; return; }
  }
}
function drawBallSeq(dt) {
  const q = S.ballSeq;
  if (!q) return;
  const a = q.actions[q.idx];
  const tr = a.track;
  const t = Math.max(0, q.t);
  let i = 0;
  while (i + 1 < tr.length && tr[i + 1][0] <= t) i++;
  let x = tr[i][1], y = tr[i][2], z = tr[i][3];
  if (i + 1 < tr.length) {
    const f = Math.min(1, (t - tr[i][0]) / Math.max(1e-6, tr[i + 1][0] - tr[i][0]));
    x += (tr[i + 1][1] - x) * f; y += (tr[i + 1][2] - y) * f; z += (tr[i + 1][3] - z) * f;
  }
  drawBallAt(x, y, z, 8, dt);
  ctx.fillStyle = "#ffd34d"; ctx.font = "bold " + uipx(13) + "px ui-monospace, monospace";
  ctx.fillText("BALL TRANSPORT TEST \u2014 ENGINE BODY SEQUENCE  (" + (q.idx + 1) + "/" +
    q.actions.length + ": " + a.label + ")", uipx(14), cv.height - uipx(88));
  ctx.fillStyle = "#9fe8ff"; ctx.font = uipx(12) + "px ui-monospace, monospace";
  ctx.fillText("launch " + a.launch_speed + " m/s  (vh " + a.horizontal_speed +
    ", vz " + a.vz + ")   maxH " + a.max_height + " m   flight " + a.flight_s +
    " s   land (" + a.landing[0] + ", " + a.landing[1] + ")   1st bounce " +
    a.first_bounce_h + " m", uipx(14), cv.height - uipx(104));
}
let netAcc = 0;
function netPhysUpdate(dtReal) {
  netAcc = Math.min(netAcc + dtReal, NETPHYS.maxAcc);
  while (netAcc >= NETPHYS.dt) {
    netAcc -= NETPHYS.dt;
    const ball = netTestStep();
    ballTestStep();
    ballSeqStep(NETPHYS.dt);
    for (const g of S.goalPanels || []) {
      if (!g.net) continue;
      const useBall = ball && g.side === 1 &&
        Math.abs(ball.p[0] - g.gx) < 3.5 ? ball : null;
      if (g.net.active || useBall) {
        if (useBall) netActivate(g.net);
        netPhysStep(g.net, useBall);
      }
    }
  }
}

function drawGoal(goal) {
  drawGoalNet(goal);
  for (const panel of goal.panels)
    for (const cell of panel.cells) {
      const s = cell.worldC.map(w => sproj3(w[0], w[1], w[2]));
      if (s.some(p => p.d < 0.5)) continue;
      if (Math.max(s[0].x, s[1].x, s[2].x, s[3].x) < -20 * RES ||
          Math.min(s[0].x, s[1].x, s[2].x, s[3].x) > cv.width + 20 * RES) continue;
      const a = cell.artC;
      drawTexTri(panel.img, a[0], a[1], a[2], s[0], s[1], s[2]);
      drawTexTri(panel.img, a[0], a[2], a[3], s[0], s[2], s[3]);
    }
  drawGoalFrame(goal.gx);
}
// Front frame: posts + crossbar stroked as world geometry, solid and crisp
// on top of the nets (physically the nearest goal structure to the camera).
// Width follows the shared projection scale — real 0.12 m members — so the
// frame reads strongest, art rails stay secondary, net cords finest.
function drawGoalFrame(gx) {
  const pts = [sproj3(gx, 0, 30.34), sproj3(gx, 2.44, 30.34),
               sproj3(gx, 2.44, 37.66), sproj3(gx, 0, 37.66)];
  if (pts.every(p => p.x < -20 * RES) || pts.every(p => p.x > cv.width + 20 * RES)) return;
  const w = qw(Math.max(3, 0.12 * S.pxPerM * RIG.zoom));
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  // pixel-art definition: solid 1px darker rim under an opaque white core —
  // fully covers any strand behind the members, corners join round and clean
  ctx.strokeStyle = "#9aa19b"; ctx.lineWidth = w + 2 * PXQ; ctx.stroke();
  ctx.strokeStyle = "#fbfbf8"; ctx.lineWidth = w; ctx.stroke();
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
  netPhysUpdate(S.netSlow ? dt * 0.15 : dt);   // key 0: slow motion (same
                                               // fixed steps, fewer per frame)
  const __t0 = performance.now();
  draw(sample, dt);
  const __ms = performance.now() - __t0;
  (S.perfT ||= []).push(__ms);
  if (S.perfT.length > 240) S.perfT.shift();
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
  // facing: moving players face actual movement (15-degree hysteresis kills
  // frame-to-frame flicker near thresholds); idle players use the engine's
  // authoritative facing (attacking-direction default, carrier/dead-zone
  // rules applied server-side). No renderer-invented orientation.
  if (st !== "idle" && p.speed > 0.5) {
    const h = Math.atan2(p.vy, p.vx) * 180 / Math.PI;
    const d = vs.heading === undefined ? 999 :
      Math.abs(((h - vs.heading + 540) % 360) - 180);
    if (d > 15) vs.heading = h;
  } else if (p.face !== undefined) {
    vs.heading = p.face;
  }
  vs.state = st;
  if (st === "idle") vs.frame = 0;
  else { vs.ft += dt * (st === "jog" ? JOG_FPS : SPRINT_FPS); vs.frame = Math.floor(vs.ft) % 8; }
  const dir = headingToDir(vs.heading);
  const frames = S.anims[vs.state][dir];
  const im = frames[vs.state === "idle" ? 0 : vs.frame % frames.length];
  const sp = sproj(p.x, p.y);
  if (sp.d < 0.5) return;
  const ax = Math.round(sp.x), ay = Math.round(sp.y);
  // COMPRESSED TRUE-DEPTH PERSPECTIVE: playerVScale is calibrated at the
  // reference depth czRef; depthScale(sp.d) (sp.d = the player's actual
  // camera-space ground depth from sproj3) leaves the accepted pscale=0.60
  // size unchanged at czRef and applies the shared stylized depth falloff
  // everywhere else. No screen-Y heuristics, no clamps.
  const s = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES;
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
    ctx.strokeStyle = "#ff4040"; ctx.lineWidth = PXQ;
    ctx.beginPath(); ctx.moveTo(ax - 5, ay); ctx.lineTo(ax + 5, ay);
    ctx.moveTo(ax, ay - 5); ctx.lineTo(ax, ay + 5); ctx.stroke();
  }
  if (S.dbg.vel && p.speed > 0.2) {
    const tip = sproj(p.x + p.vx * 0.8, p.y + p.vy * 0.8);
    ctx.strokeStyle = "#5cff8a"; ctx.lineWidth = uipx(2);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  }
  if (S.dbg.ids || S.dbg.state) {
    ctx.fillStyle = "#fff"; ctx.font = uipx(10) + "px monospace"; ctx.textAlign = "center";
    let ty = ay - Math.round((im.height / 2 + 40) * s) - 4;
    if (S.dbg.ids) {
      const nm = (S.pb.players[p.pid] || {}).name || p.pid;
      ctx.fillText(nm, ax, ty); ty -= 11;
    }
    if (S.dbg.state)
      ctx.fillText(`${vs.state}/${dir} ${p.speed.toFixed(1)}m/s [${S.pb.acts[p.act] || p.act}]`, ax, ty);
  }
}
// ═══ BALL: procedural crisp pixel-art football + true height rendering ═════
// Physical radius stays authoritative (0.11 m); the sprite uses its own
// readability calibration. Sprites are built per-pixel on tiny grids and
// nearest-upscaled — no antialiasing, no raster asset. 4 spin phases give
// perceivable rotation from travel distance (cosmetic, renderer-owned).
const BALL_VIS_R = 0.19;
// PIXELLAB ANIMATED BALL SPRITE: 8 authored rotational phases of one
// football (assets/visual_v1/originals/ball_pixellab, 24x24 each, sheet
// 192x24; see RECORD.json for full generation provenance). Runtime only
// SELECTS among the discrete authored frames — never rotates the bitmap.
// Visual rotation derives from authoritative physical motion:
//   rolling:  omega = horizontal speed / physical radius (0.11 m),
//             display-capped so phase stepping stays readable;
//   airborne: the launch omega is retained through flight and bounce;
//   at rest:  rotation stops and the last orientation is preserved.
const BALL_FRAMES = 8, BALL_SRC = 24;
const BALL_PHYS_R = 0.11;             // authoritative; never used for visuals sizing
const BALL_OMEGA_MAX = 16;            // rad/s display cap (~2.5 rev/s legible)
const _ballRot = { th: 0, om: 0 };
function drawBallAt(xw, yw, z, speed, dt) {
  const grounded = z <= 0.02;
  if (grounded) _ballRot.om = speed > 0.05 ? Math.min(speed / BALL_PHYS_R, BALL_OMEGA_MAX) : 0;
  _ballRot.th += _ballRot.om * (dt || 0);   // airborne keeps its spin; bounce never resets
  const phase = ((Math.floor(_ballRot.th / (2 * Math.PI) * BALL_FRAMES) % BALL_FRAMES) + BALL_FRAMES) % BALL_FRAMES;
  const gpos = sproj3(xw, 0, yw);           // shadow stays on the pitch
  const bpos = sproj3(xw, z, yw);           // true projected height
  if (bpos.d < 0.5) return;
  // COMPRESSED TRUE-DEPTH PERSPECTIVE: sprite radius from the ball's
  // actual 3D camera-space depth (bpos.d — includes airborne height);
  // shadow radius from the ground point's depth (gpos.d) so the shadow
  // stays visually attached while its position remains the authoritative
  // (x,y,0). Same shared depthScale law as players. BALL_VIS_R 0.19
  // keeps its accepted size at czRef exactly.
  const r = Math.max(2, Math.round(BALL_VIS_R * S.pxPerM * depthScale(bpos.d) * RIG.zoom * RES));
  const rg = Math.max(2, Math.round(BALL_VIS_R * S.pxPerM * depthScale(gpos.d) * RIG.zoom * RES));
  const flat = flattenAt(xw, yw);
  const sh = 1 / (1 + z * 0.55);            // higher ball: smaller, fainter
  ctx.beginPath();
  ctx.ellipse(Math.round(gpos.x), Math.round(gpos.y) + rg * 0.7,
              rg * 1.15 * sh, Math.max(1, rg * 1.15 * flat * sh), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0," + (0.22 * sh).toFixed(3) + ")";   // shadow B
  ctx.fill();
  // BALL LOD by PROJECTED DIAMETER (not zoom labels): below ~12 px the
  // 24x24 art cannot resolve, so an independently authored micro football
  // (7-11 px native, 4 rotation phases) is drawn 1:1 — same world size,
  // same continuous theta, no resampling. At >=12 px the accepted
  // detailed 24x24 8-phase sprite renders exactly as before.
  // dpx is the TRUE-DEPTH projected backing-raster diameter (same depth
  // the sprite draws at): near balls get the detailed 24px master, far
  // balls legitimately engage the micro LOD when they genuinely project
  // below 7 backing px.
  const dpx = 2 * BALL_VIS_R * S.pxPerM * depthScale(bpos.d) * RIG.zoom * RES;
  if (dpx < 7 && S.images.ballMicro) {
    const n = Math.max(7, Math.min(11, Math.round(dpx)));
    const m = S.images.ballMicro[n];
    const ph4 = ((Math.floor(_ballRot.th / (2 * Math.PI) * 4) % 4) + 4) % 4;
    if (m) {
      ctx.drawImage(m, ph4 * n, 0, n, n,
                    Math.round(bpos.x - n / 2), Math.round(bpos.y - n / 2), n, n);
      return;
    }
  }
  const out = r * 2 + 2;
  if (S.images.ballSheet)
    ctx.drawImage(S.images.ballSheet, phase * BALL_SRC, 0, BALL_SRC, BALL_SRC,
                  Math.round(bpos.x - out / 2), Math.round(bpos.y - out / 2), out, out);
}
function drawBall(ball, dt) {
  drawBallAt(ball.x, ball.y, ball.z || 0, Math.hypot(ball.vx, ball.vy), dt);
  if (S.dbg.ball) {
    const sp = sproj3(ball.x, ball.z || 0, ball.y);
    ctx.fillStyle = "#ffd23c"; ctx.font = uipx(10) + "px monospace"; ctx.textAlign = "center";
    ctx.fillText(`ball (${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}, z ${(ball.z || 0).toFixed(2)}) m`,
                 sp.x, sp.y - 14);
    ctx.textAlign = "left";
  }
}

function drawNetTestBall() {
  const t = S.netTest;
  if (!t) return;
  const p = sproj3(t.p[0], t.p[1], t.p[2]);
  const r = Math.max(2.5, NETPHYS.ballR * S.pxPerM * RIG.zoom * RES);
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f4f4f0"; ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.22); ctx.strokeStyle = "#3a3d42"; ctx.stroke();
  ctx.fillStyle = "#ffd34d"; ctx.font = "bold " + uipx(13) + "px ui-monospace, monospace";
  ctx.fillText((S.netSlow ? "[SLOW-MO 0.15x]  " : "") +
    "NET PHYSICS TEST \u2014 SYNTHETIC BALL TRAJECTORY  " +
    "(test " + t.id + ": " + t.label + ", " + t.speed + " m/s, " + t.phase + ")",
    uipx(14), cv.height - uipx(14));
}
function drawNetPhysDebug() {
  const net = S.goalPanels[1] && S.goalPanels[1].net;
  if (!net) return;
  const { rest, pos, inv } = net;
  for (let i = 0; i < inv.length; i += 2) {
    const j = i * 3;
    if (!inv[i]) {
      const q = sproj3(rest[j], rest[j + 1], rest[j + 2]);
      ctx.fillStyle = "rgba(255,70,70,0.8)";
      ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
      continue;
    }
    const dx = pos[j] - rest[j], dy = pos[j + 1] - rest[j + 1], dz = pos[j + 2] - rest[j + 2];
    if (dx * dx + dy * dy + dz * dz > 1e-4) {
      const q0 = sproj3(rest[j], rest[j + 1], rest[j + 2]);
      const q1 = sproj3(pos[j], pos[j + 1], pos[j + 2]);
      ctx.strokeStyle = "rgba(0,240,255,0.85)"; ctx.lineWidth = PXQ;
      ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
    }
  }
  if (net.lastImpact) {
    const c = sproj3(net.lastImpact[0], net.lastImpact[1], net.lastImpact[2]);
    ctx.strokeStyle = "#ff5ce0"; ctx.lineWidth = uipx(2);
    ctx.beginPath(); ctx.moveTo(c.x - 7, c.y); ctx.lineTo(c.x + 7, c.y);
    ctx.moveTo(c.x, c.y - 7); ctx.lineTo(c.x, c.y + 7); ctx.stroke();
  }
  ctx.fillStyle = "#9fe8ff"; ctx.font = uipx(12) + "px ui-monospace, monospace";
  ctx.fillText("net: active=" + net.active + "  maxDisp=" +
    (net.maxDisp || 0).toFixed(3) + " m  KE=" + net.energy.toExponential(2),
    uipx(14), cv.height - uipx(32));
}
function drawGoalGeoDebug(side) {
  const gx = side ? 105 : 0, dir = side ? 1 : -1;
  ctx.strokeStyle = "rgba(255,80,80,0.9)"; ctx.lineWidth = uipx(1.5);
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
    else if (e.ball) drawBall(e.ball, dt);
    else drawGoal(e.goal);
  }
  drawNetTestBall();
  drawBallTest(dt);
  drawBallSeq(dt);
  if (S.dbg.netphys) drawNetPhysDebug();
  if (S.dbg.goalgeo) { drawGoalGeoDebug(0); drawGoalGeoDebug(1); }
  if (S.dbg.cam) drawRailSquare();       // rail diagnostic overlay (toggleable)
  if (S.dbg.track) {
    const t = sproj(RIG.targetX, 34);
    ctx.strokeStyle = "#ff5ce0"; ctx.lineWidth = uipx(2);
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
    `players  ${sample ? sample.players.length : 0} active\n` +
    (S.perfT && S.perfT.length > 30 ? (() => {
      const a = [...S.perfT].sort((x, y) => x - y);
      const mean = a.reduce((x, y) => x + y, 0) / a.length;
      return `render   ${mean.toFixed(2)}ms mean / ${a[Math.floor(a.length * 0.95)].toFixed(2)}ms p95 · backing ${cv.width}x${cv.height} · RES ${RES}`;
    })() : "");
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
  document.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
    if (e.key === "0") S.netSlow = !S.netSlow;
    if (e.key === "t") startBallSeq();
    if (e.key >= "6" && e.key <= "9") startBallTest(+e.key);
    else if (e.key === "c") startBallTest("c");
    else if (e.key === "v") startBallTest("v");
    if (e.key >= "1" && e.key <= "4") startNetTest(+e.key);
    else if (e.key === "5") {
      startNetTest(1, NETTEST_POWERS[netTestPowerIdx]);
      netTestPowerIdx = (netTestPowerIdx + 1) % NETTEST_POWERS.length;
    }
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
  for (const id of ["anchors", "ids", "vel", "state", "ball", "track", "goalgeo", "grid", "xform", "cam", "netphys"])
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
  const resize = () => { cv.width = Math.round(cv.clientWidth * RES); cv.height = Math.round(cv.clientHeight * RES); };
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

/* Touchline — LIVE MATCH VISUAL PREVIEW.
 *
 * Renders an actual simulator match (deterministic fixture + seed) with the
 * accepted Visual V1 systems: frozen PixelLab players, grass, stadium,
 * CAMERA_V1 perspective camera (pitch/yaw), and Goal V2.2 artwork.
 *
 * ENGINE BOUNDARY: the renderer is strictly read-only. It starts a match via
 * the untouched Touchline API and consumes the server's renderer-keyframe
 * stream (POST /api/matches/{id}/advance {frames:true} — per-second
 * authoritative [clock, ball.x, ball.y, possession, [[x,y,act,active]..]]
 * sampled read-only inside the engine's own advance loop). Nothing here
 * writes into simulator state; playback, interpolation, animation choice,
 * facing quantization and the camera are presentation only.
 *
 * Simulator coordinates are percent-of-pitch (0..100 both axes) and are
 * mapped to the authoritative 105 x 68 m world here (x*1.05, y*0.68).
 *
 * FUTURE NET-RIPPLE CONNECTION POINT: goal art is static in this preview.
 * When authorized, ball/net contacts (shot-on-goal / goal events with ball
 * trajectory) map to netImpact(side, pos, vel, strength?) — see sandbox.js —
 * either via a deformable overlay or by warping the sprite's panel quads.
 */
"use strict";

const ASSET_ROOT = "../../assets/visual_v1/";
const API = "/api";
const REF_ZOOM = 32;
const PITCH = { w: 105, h: 68 };
const SIM2W = { x: PITCH.w / 100, y: PITCH.h / 100 };   // percent -> metres
const GRASS_ZONE = { x0: -3, x1: 108, y0: -3, y1: 71 };
const APRON = { x0: -8, x1: 113, y0: -8, y1: 76 };
const DIRS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];

// CAMERA_V1 working defaults (unlocked)
const DEFAULTS = {
  height: 30, dist: 43, fov: 28, depthoff: 3, smooth: 0.35, pscale: 0.85,
  yaw: 0, pitch: 22,
};
const JOG_FPS = 10, SPRINT_FPS = 12;
// presentation speed thresholds (m/s) from authoritative displacement
const IDLE_MAX = 0.5, JOG_MAX = 5.2, TELEPORT = 12;

// Goal V2.2 sprite anchors: post-base points in sprite space (measured)
const GOAL_SPRITE = { SN: [95, 325], SF: [222, 320], W: 312, H: 332 };

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
  cam: { x: 52.5, z: 34, mode: "ball", target: null },
  ui: { ...DEFAULTS },
  dbg: { anchors: false, ids: false, vel: false, state: false,
         ball: false, track: false, goalgeo: false, grid: false },
  ground: null,
  // playback of authoritative keyframes
  pb: { frames: [], roster: [], acts: [], meta: {}, head: 0, playing: true,
        speed: 1, matchId: null, fetching: false, finished: false,
        lastEventIndex: 0, events: [], score: [0, 0], minute: 0, half: 1,
        possession: null, players: {} },
  view: [],          // per-player presentation state (facing, anim clock)
  time: 0,
};

const cv = document.getElementById("view");
const ctx = cv.getContext("2d");

// ═══ loading ═════════════════════════════════════════════════════════════════
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
  let done = 0;
  const anims = { idle: {}, jog: {}, sprint: {} };
  await Promise.all(jobs.map(async (j) => {
    const im = await loadImage(j.path);
    done++; pctEl.textContent = Math.round((done / jobs.length) * 100) + "%";
    const [kind, dir, idx] = j.key;
    if (kind === "sheet") { S.images.sheet = im; return; }
    if (kind === "standart") { S.images.stand = im; return; }
    if (kind === "goal22") { S.images.goal22 = im; return; }
    (anims[kind][dir] ||= [])[idx] = im;
  }));
  S.anims = anims;
  S.standTex = deriveStandMaterial(S.images.stand);
  S.standPat = {
    upper: ctx.createPattern(S.standTex.upper, "repeat"),
    lower: ctx.createPattern(S.standTex.lower, "repeat"),
  };
  // mirrored goal sprite for the opposite end (derived at load; source untouched)
  const g = S.images.goal22;
  const mc = document.createElement("canvas");
  mc.width = g.width; mc.height = g.height;
  const mctx = mc.getContext("2d");
  mctx.imageSmoothingEnabled = false;
  mctx.translate(g.width, 0); mctx.scale(-1, 1); mctx.drawImage(g, 0, 0);
  S.images.goal22m = mc;

  buildGround();
  bindUI();
  await startMatch();
  document.getElementById("loading").style.display = "none";
  requestAnimationFrame(tick);
}

// ═══ match driver (read-only API client) ═════════════════════════════════════
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
    if (r.score) pb.score = [r.score.home ?? 0, r.score.away ?? 0];   // authoritative
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
    `${S.pb.meta.home || "HOME"}  ${pb.score[0]} : ${pb.score[1]}  ${S.pb.meta.away || "AWAY"}`;
  const clock = pb.frames.length ? pb.frames[Math.min(Math.floor(pb.head), pb.frames.length - 1)][0] : 0;
  const mm = String(Math.floor(clock / 60)).padStart(2, "0");
  const ss = String(Math.floor(clock % 60)).padStart(2, "0");
  hudSub(`H${pb.half} ${mm}:${ss} · seed ${pb.meta.seed} · buffered ${bufferedSeconds()}s`
    + (pb.finished ? " · FULL TIME" : ""));
  const last = pb.events.slice(-3).map(e =>
    `${Math.floor((e.timestamp ?? 0) / 60)}' ${e.event_type} — ${e.actor_name ?? ""} (${e.team_id ?? ""})`);
  document.getElementById("ticker").innerHTML = last.join("<br>");
}

// interpolated authoritative sample at playhead
function sampleAt(head) {
  const pb = S.pb;
  if (!pb.frames.length) return null;
  const i = Math.max(0, Math.min(pb.frames.length - 1, Math.floor(head)));
  const j = Math.min(pb.frames.length - 1, i + 1);
  const t = Math.max(0, Math.min(1, head - i));
  const A = pb.frames[i], B = pb.frames[j];
  const dt = Math.max(0.001, B[0] - A[0]);
  const ball = {
    x: (A[1] + (B[1] - A[1]) * t) * SIM2W.x,
    y: (A[2] + (B[2] - A[2]) * t) * SIM2W.y,
  };
  const players = [];
  for (let k = 0; k < pb.roster.length; k++) {
    const a = A[4][k], b = B[4][k];
    if (!a || !b || (!a[3] && !b[3])) continue;      // inactive (bench/sent off)
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

// ═══ shared renderer (ported verbatim from the accepted sandbox) ═════════════
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
function buildGround() {
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
  S.ground = g;
}

const CAM = { C: null, f: null, u: null, r: null, fpx: 0, czTarget: 1, lookAngle: 0 };
function rebuildCamera() {
  const h = S.ui.height;
  const C = { x: S.cam.x, y: h, z: PITCH.h + S.ui.dist };
  const dz = (S.cam.z + S.ui.depthoff) - C.z;
  const len = Math.hypot(h, dz);
  const yawR = (S.ui.yaw || 0) * Math.PI / 180;
  const refDz = (34 + S.ui.depthoff) - C.z;
  const trim = Math.atan2(h, -dz) - Math.atan2(h, -refDz);
  const theta = (S.ui.pitch * Math.PI / 180) + trim;
  const fy = -Math.sin(theta), fh = Math.cos(theta);
  const f = { x: fh * Math.sin(yawR), y: fy, z: -fh * Math.cos(yawR) };
  const r = { x: -f.z / fh, y: 0, z: f.x / fh };
  const u = { x: -r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y };
  CAM.C = C; CAM.f = f; CAM.u = u; CAM.r = r;
  CAM.fpx = (cv.height / 2) / Math.tan((S.ui.fov * Math.PI / 180) / 2);
  CAM.czTarget = len;
  CAM.lookAngle = theta * 180 / Math.PI;
}
function project3(wx, wy, wz) {
  const vx = wx - CAM.C.x, vy = wy - CAM.C.y, vz = wz - CAM.C.z;
  const cx = vx * CAM.r.x + vz * CAM.r.z;
  const cy = vx * CAM.u.x + vy * CAM.u.y + vz * CAM.u.z;
  const cz = vx * CAM.f.x + vy * CAM.f.y + vz * CAM.f.z;
  return { x: cv.width / 2 + CAM.fpx * cx / cz, y: cv.height / 2 - CAM.fpx * cy / cz, d: cz };
}
function project(wx, wz) { return project3(wx, 0, wz); }
function pxPerMeter(depth) { return CAM.fpx / depth; }

function camTarget(sample) {
  if (S.cam.mode === "static" || !sample) return { x: 52.5, y: 34 };
  if (S.cam.mode === "ball") return { x: sample.ball.x, y: sample.ball.y };
  let sx = 0, sy = 0, n = 0;
  for (const p of sample.players) {
    if (Math.hypot(p.x - sample.ball.x, p.y - sample.ball.y) < 18) { sx += p.x; sy += p.y; n++; }
  }
  if (!n) return { x: sample.ball.x, y: sample.ball.y };
  return { x: 0.55 * sample.ball.x + 0.45 * (sx / n), y: 0.55 * sample.ball.y + 0.45 * (sy / n) };
}
function updateCamera(dt, sample) {
  const t = camTarget(sample);
  S.cam.target = t;
  const hw = (cv.width / 2) * CAM.czTarget / CAM.fpx;
  const cl = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const tx = cl(t.x, Math.min(hw - 8, 52.5), Math.max(105 - hw + 8, 52.5));
  const tz = cl(t.y, 14, 54);
  const k = S.ui.smooth <= 0.001 ? 1 : 1 - Math.exp(-dt / S.ui.smooth);
  S.cam.x += (tx - S.cam.x) * k;
  S.cam.z += (tz - S.cam.z) * k;
}

function envXRangeAt(h, z) {
  let xL = CAM.C.x - 200, xR = CAM.C.x + 200;
  const k = (h - CAM.C.y) * CAM.f.y + (z - CAM.C.z) * CAM.f.z;
  const fx = CAM.f.x;
  if (Math.abs(fx) > 1e-6) {
    const xLim = CAM.C.x + (0.8 - k) / fx;
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
  const p = [project3(xL, hA, zA), project3(xR, hA, zA),
             project3(xR, hB, zB), project3(xL, hB, zB)];
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
function strokeSeg3(x1, h1, z1, x2, h2, z2) {
  const a = project3(x1, h1, z1), b = project3(x2, h2, z2);
  if (a.d < 0.5 || b.d < 0.5) return;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
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
  const BL = project3(xL, hB, zB), BR = project3(xR, hB, zB);
  const FL = project3(xL, hF, zF), FR = project3(xR, hF, zF);
  if ([BL, BR, FL, FR].some(q => q.d < 0.5)) return;
  const ppm = tex.width / (2 * ENV.texWorldM);
  const T0x = xL * ppm, T1x = xR * ppm;
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
    const p = [project3(wx - hw, hB, zB), project3(wx + hw, hB, zB),
               project3(wx + hw, hF, zF), project3(wx - hw, hF, zF)];
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

function groundRowWorld(sy) {
  const qy = (cv.height / 2 - sy) / CAM.fpx;
  const dy = CAM.f.y + qy * CAM.u.y;
  if (dy >= -1e-6) return null;
  const lam = -CAM.C.y / dy;
  const bx = CAM.f.x + qy * CAM.u.x, bz = CAM.f.z + qy * CAM.u.z;
  const Ax = CAM.C.x + lam * bx, Az = CAM.C.z + lam * bz;
  const st = lam / CAM.fpx;
  const hx = (cv.width / 2) * st * CAM.r.x, hz = (cv.width / 2) * st * CAM.r.z;
  return { Lx: Ax - hx, Lz: Az - hz, Rx: Ax + hx, Rz: Az + hz };
}
function drawGroundPerspective() {
  const W = cv.width, H = cv.height, BH = 3;
  const gW = S.ground.width, gH = S.ground.height;
  const tx = (x) => (x - APRON.x0) * REF_ZOOM, tz = (z) => (z - APRON.y0) * REF_ZOOM;
  for (let sy = 0; sy < H; sy += BH) {
    const b = Math.min(H, sy + BH);
    const rt = groundRowWorld(sy), rb = groundRowWorld(b);
    if (!rt || !rb) continue;
    const T0x = tx(rt.Lx), T0y = tz(rt.Lz);
    const T1x = tx(rt.Rx), T1y = tz(rt.Rz);
    const T2x = tx(rb.Lx), T2y = tz(rb.Lz);
    const u1x = T1x - T0x, u1y = T1y - T0y, u2x = T2x - T0x, u2y = T2y - T0y;
    const det = u1x * u2y - u1y * u2x;
    if (Math.abs(det) < 1e-9) continue;
    const bh = b - sy;
    const a = (W * u2y) / det, b2 = (-bh * u1y) / det;
    const c = (-W * u2x) / det, d = (bh * u1x) / det;
    const e = 0 - (a * T0x + c * T0y);
    const f2 = sy - (b2 * T0x + d * T0y);
    const T3x = tx(rb.Rx), T3y = tz(rb.Rz);
    const bx0 = Math.max(0, Math.floor(Math.min(T0x, T1x, T2x, T3x)) - 2);
    const bx1 = Math.min(gW, Math.ceil(Math.max(T0x, T1x, T2x, T3x)) + 2);
    const by0 = Math.max(0, Math.floor(Math.min(T0y, T1y, T2y, T3y)) - 2);
    const by1 = Math.min(gH, Math.ceil(Math.max(T0y, T1y, T2y, T3y)) + 2);
    if (bx1 <= bx0 || by1 <= by0) continue;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, sy, W, bh); ctx.clip();
    ctx.setTransform(a, b2, c, d, e, f2);
    ctx.drawImage(S.ground, bx0, by0, bx1 - bx0, by1 - by0, bx0, by0, bx1 - bx0, by1 - by0);
    ctx.restore();
  }
}

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
    const p = project(x, z);
    if (p.d < 0.5) return;
    if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath(); ctx.fill();
}
function drawMarkings() {
  ctx.strokeStyle = "rgba(250,250,250,0.92)";
  ctx.fillStyle = "rgba(250,250,250,0.92)";
  ctx.lineWidth = 2;
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
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px monospace"; ctx.textAlign = "left";
  for (let x = 0; x <= 105; x += 5) strokeWorldPoly([[x, 0], [x, 68]]);
  for (let y = 0; y <= 68; y += 5) strokeWorldPoly([[0, y], [105, y]]);
}

// ═══ Goal V2.2 sprite placement (authoritative geometry anchored) ═══════════
// The sprite is anchored by its two post-base points onto the projected
// authoritative post bases (7.32 m mouth on the goal line). Uniform scale,
// billboard, mirrored for whichever end needs the opposite handedness —
// the art never redefines football geometry.
function drawGoalSprite(side) {
  const gx = side ? 105 : 0;
  const PN = project(gx, 34 + 3.66);         // near post base (world)
  const PF = project(gx, 34 - 3.66);         // far post base
  if (PN.d < 0.5 || PF.d < 0.5) return;
  if (Math.max(PN.x, PF.x) < -420 || Math.min(PN.x, PF.x) > cv.width + 420) return;
  const [SNx, SNy] = GOAL_SPRITE.SN, [SFx, SFy] = GOAL_SPRITE.SF;
  const dxp = PF.x - PN.x;
  const mirrored = (dxp >= 0) !== (SFx - SNx >= 0);
  const img = mirrored ? S.images.goal22m : S.images.goal22;
  const sN = mirrored ? [GOAL_SPRITE.W - 1 - SNx, SNy] : [SNx, SNy];
  const sF = mirrored ? [GOAL_SPRITE.W - 1 - SFx, SFy] : [SFx, SFy];
  const s = Math.hypot(PF.x - PN.x, PF.y - PN.y) / Math.hypot(sF[0] - sN[0], sF[1] - sN[1]);
  const ox = PN.x - sN[0] * s, oy = PN.y - sN[1] * s;
  ctx.drawImage(img, Math.round(ox), Math.round(oy),
    Math.round(GOAL_SPRITE.W * s), Math.round(GOAL_SPRITE.H * s));
}
function drawGoalGeoDebug(side) {
  const gx = side ? 105 : 0, dir = side ? 1 : -1;
  ctx.strokeStyle = "rgba(255,80,80,0.9)"; ctx.lineWidth = 1.5;
  strokeWorldPoly([[gx, 30.34], [gx, 37.66]]);                       // mouth on goal line
  strokeWorldPoly([[gx, 30.34], [gx + dir * 2, 30.34], [gx + dir * 2, 37.66], [gx, 37.66]], true);
  ctx.strokeStyle = "rgba(255,80,80,0.9)"; ctx.lineWidth = 2;
  strokeSeg3(gx, 0, 30.34, gx, 2.44, 30.34);
  strokeSeg3(gx, 0, 37.66, gx, 2.44, 37.66);
  strokeSeg3(gx, 2.44, 30.34, gx, 2.44, 37.66);
}

// ═══ players + ball ══════════════════════════════════════════════════════════
function headingToDir(h) { return DIRS[Math.round(((h % 360) + 360) % 360 / 45) % 8]; }
function spriteScale() {
  return (pxPerMeter(CAM.czTarget) / REF_ZOOM) * S.ui.pscale;
}
function groundBasis(wx, wz) {
  const p0 = project(wx, wz);
  const px = project(wx + 0.5, wz), pz = project(wx, wz + 0.5);
  return { p0, dxm: Math.abs(px.x - p0.x) * 2, dzm: Math.abs(pz.y - p0.y) * 2 };
}
function viewState(idx) {
  return S.view[idx] ||= { heading: 90, ft: Math.random() * 0.1, frame: 0, state: "idle" };
}
function drawPlayer(p, s, dt) {
  const vs = viewState(p.idx);
  // presentation state from authoritative movement (speed thresholds)
  const st = p.speed < IDLE_MAX ? "idle" : p.speed < JOG_MAX ? "jog" : "sprint";
  if (p.speed > 0.3) vs.heading = Math.atan2(p.vy, p.vx) * 180 / Math.PI;
  vs.state = st;
  if (st === "idle") vs.frame = 0;
  else { vs.ft += dt * (st === "jog" ? JOG_FPS : SPRINT_FPS); vs.frame = Math.floor(vs.ft) % 8; }
  const dir = headingToDir(vs.heading);
  const frames = S.anims[vs.state][dir];
  const im = frames[vs.state === "idle" ? 0 : vs.frame % frames.length];
  const gb = groundBasis(p.x, p.y);
  if (gb.p0.d < 0.5) return;
  const ax = Math.round(gb.p0.x), ay = Math.round(gb.p0.y);
  const team = (S.pb.players[p.pid] || {}).team === "AWAY" ? 1 : 0;
  const flat = gb.dxm > 0.01 ? gb.dzm / gb.dxm : 0.4;
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
  // debug overlays
  if (S.dbg.anchors) {
    ctx.strokeStyle = "#ff4040"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax - 5, ay); ctx.lineTo(ax + 5, ay);
    ctx.moveTo(ax, ay - 5); ctx.lineTo(ax, ay + 5); ctx.stroke();
  }
  if (S.dbg.vel && p.speed > 0.2) {
    const tip = project(p.x + p.vx * 0.8, p.y + p.vy * 0.8);
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
  const gb = groundBasis(ball.x, ball.y);
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
  if (S.dbg.ball) {
    ctx.fillStyle = "#ffd23c"; ctx.font = "10px monospace"; ctx.textAlign = "center";
    ctx.fillText(`ball (${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}) m`, x, y - r - 5);
  }
}

// ═══ frame loop ══════════════════════════════════════════════════════════════
let lastTs = 0, lastDt = 0.016;
function tick(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts; lastDt = dt;
  const pb = S.pb;
  if (pb.playing && pb.frames.length > 1) {
    pb.head = Math.min(pb.head + dt * pb.speed, pb.frames.length - 1.001);
  }
  ensureBuffer();
  const sample = sampleAt(pb.head);
  rebuildCamera();
  updateCamera(dt, sample);
  rebuildCamera();
  draw(sample, dt);
  if ((ts | 0) % 500 < 20) updateHUD();
  requestAnimationFrame(tick);
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
  const s = spriteScale();
  const ents = [];
  if (sample) {
    for (const p of sample.players) ents.push({ y: p.y, p });
    ents.push({ y: sample.ball.y, ball: sample.ball });
  }
  ents.push({ y: 33.5, goal: 0 }, { y: 33.5, goal: 1 });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.p) drawPlayer(e.p, s, dt);
    else if (e.ball) drawBall(e.ball);
    else drawGoalSprite(e.goal);
  }
  if (S.dbg.goalgeo) { drawGoalGeoDebug(0); drawGoalGeoDebug(1); }
  if (S.dbg.track && S.cam.target) {
    const t = project(S.cam.target.x, S.cam.target.y);
    if (t.d > 0.5) {
      ctx.strokeStyle = "#ff5ce0"; ctx.lineWidth = 2;
      ctx.strokeRect(t.x - 7, t.y - 7, 14, 14);
    }
  }
  drawNearBarrier();
  drawReadout(sample);
}
function drawReadout(sample) {
  const el = document.getElementById("readout");
  el.textContent =
    `head     ${S.pb.head.toFixed(1)}s / buffered ${bufferedSeconds()}s${S.pb.finished ? " (FT)" : ""}\n` +
    `camera   ${S.cam.mode}  pitch ${S.ui.pitch}° (eff ${CAM.lookAngle.toFixed(1)}°)  yaw ${S.ui.yaw}°\n` +
    (sample ? `ball     (${sample.ball.x.toFixed(1)}, ${sample.ball.y.toFixed(1)}) m  clock ${sample.clock.toFixed(0)}s\n` : "") +
    `players  ${sample ? sample.players.length : 0} active`;
}

// ═══ UI ══════════════════════════════════════════════════════════════════════
const RANGE_FMT = {
  height: v => v.toFixed(0) + " m", dist: v => v.toFixed(0) + " m",
  fov: v => v.toFixed(0) + "°", depthoff: v => v.toFixed(0) + " m",
  yaw: v => (v > 0 ? "+" : "") + v.toFixed(0) + "°", pitch: v => v.toFixed(0) + "°",
  smooth: v => v.toFixed(2) + " s", pscale: v => "×" + v.toFixed(2),
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
    S.ui = { ...DEFAULTS }; syncRanges();
  });
  for (const r of document.querySelectorAll("input[name=cammode]"))
    r.addEventListener("change", () => { if (r.checked) S.cam.mode = r.value; });
  const pp = document.getElementById("playpause");
  pp.addEventListener("click", () => {
    S.pb.playing = !S.pb.playing;
    pp.textContent = S.pb.playing ? "Pause" : "Play";
  });
  document.getElementById("pbspeed").addEventListener("change", (e) => {
    S.pb.speed = parseFloat(e.target.value);
  });
  for (const id of ["anchors", "ids", "vel", "state", "ball", "track", "goalgeo", "grid"])
    document.getElementById("dbg-" + id).addEventListener("change", (e) => {
      S.dbg[id] = e.target.checked;
    });
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

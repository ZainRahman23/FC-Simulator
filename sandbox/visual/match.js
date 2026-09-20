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
  animTest: null,
  dbg: { dribsync: false, occ: false, anchors: false, ids: false, vel: false, state: false, anim: false, gkstick: false,
         ball: false, track: false, goalgeo: false, grid: false, xform: false,
         netphys: false, gk: false,
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
  const anims = { idle: {}, jog: {}, sprint: {}, dribble: {}, shoot: {} };
  // ANIMATION PROTOTYPE V1 (east only): PixelLab dribble (8f, ball-free by
  // design — the authoritative ball supplies real touch travel) and shoot
  // (10f, contact frame 6). See proto_anim/PROTO_RECORD.json for provenance.
  for (let i = 0; i < 8; i++)
    jobs.push({ key: ["dribble", "east", i],
                path: ASSET_ROOT + "originals/character_31a11357/proto_anim/dribble/east/" + i + ".png" });
  for (let i = 0; i < 10; i++)
    jobs.push({ key: ["shoot", "east", i],
                path: ASSET_ROOT + "originals/character_31a11357/proto_anim/shoot/east/" + i + ".png" });
  // KICK ANIMATION V2: technique sequences (east; west mirrors, foot flips)
  for (const [ks, kn] of [["in4_R", 12], ["in4_L", 12], ["la_R", 10], ["la_L", 10],
                          ["ou_R", 8], ["ou_L", 8], ["ch_R", 8], ["pw_R", 12]])
    for (let i = 0; i < kn; i++)
      jobs.push({ key: ["kick", ks + "|" + i, 0],
                  path: ASSET_ROOT + "originals/character_31a11357/proto_anim/kick/east/" + ks + "_" + i + ".png" });
  // DRIBBLE ANIMATION V3: directional touch libraries (n/ne/se/s; w/nw/sw mirror)
  for (const [d3, f3] of [["north", "n_dr_6.png"], ["north", "n_dr_5.png"], ["north", "n_dr_4.png"], ["north", "n_dr_2.png"], ["north", "n_sp_6.png"], ["north", "n_sp_4.png"], ["north", "n_dr_0.png"], ["north", "n_dr_1.png"], ["north", "n_dr_3.png"], ["north", "n_dr_7.png"], ["north-east", "ne_dr_6.png"], ["north-east", "ne_dr_0.png"], ["north-east", "ne_dr_5.png"], ["north-east", "ne_dr_1.png"], ["north-east", "ne_sp_2.png"], ["north-east", "ne_sp_1.png"], ["north-east", "ne_dr_2.png"], ["north-east", "ne_dr_3.png"], ["north-east", "ne_dr_4.png"], ["north-east", "ne_dr_7.png"], ["south-east", "se_dr_2.png"], ["south-east", "se_dr_1.png"], ["south-east", "se_dr_6.png"], ["south-east", "se_dr_7.png"], ["south-east", "se_sp_3.png"], ["south-east", "se_sp_4.png"], ["south-east", "se_dr_0.png"], ["south-east", "se_dr_3.png"], ["south-east", "se_dr_4.png"], ["south-east", "se_dr_5.png"], ["south", "s_dr_6.png"], ["south", "s_dr_7.png"], ["south", "s_dr_5.png"], ["south", "s_dr_3.png"], ["south", "s_sp_4.png"], ["south", "s_sp_2.png"], ["south", "s_dr_0.png"], ["south", "s_dr_1.png"], ["south", "s_dr_2.png"], ["south", "s_dr_4.png"]])
    jobs.push({ key: ["drib3", d3 + "|" + f3, 0],
                path: ASSET_ROOT + "originals/character_31a11357/proto_anim/dribble3/" + d3 + "/" + f3 });
  // DRIBBLE ANIMATION V2: touch-library extras (ball-free, east)
  for (const k of ["cc_4", "cc_5", "cc_6", "cc_7", "cut_5", "cut_6",
                   "sr_0", "sr_1", "sr_2", "sr_6", "sr_7", "db_2", "db_4", "db_5"])
    jobs.push({ key: ["drib2", k, 0],
                path: ASSET_ROOT + "originals/character_31a11357/proto_anim/dribble2/east/" + k + ".png" });
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
    if (kind === "drib2") { (S.images.drib2 ||= {})[dir] = im; return; }
    if (kind === "kick") {
      const [ks, ki] = dir.split("|");
      ((S.images.kick ||= {})[ks] ||= [])[+ki] = im; return;
    }
    if (kind === "drib3") {
      const [d3, f3] = dir.split("|");
      ((S.images.drib3 ||= {})[d3] ||= {})[f3] = im; return;
    }
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
  await gkAnimLoad();                                   // GOALKEEPER ANIMATION V1 assets (non-fatal: placeholder if missing)
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
  return { clock: A[0] + t * dt, ball, players, occ: A[6] || null };
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
function drawGoalNet(goal, yLo, yHi) {
  // GOAL FRAME V1: optional [yLo,yHi) window — the net is depth-sorted in
  // world-y patches; each patch draws ONLY strand segments whose CURRENT
  // (deformed) midpoint y falls in its window, so ball/net ordering follows
  // the live geometry even while the net is displaced. Undefined window =
  // whole net in one call (the pre-occlusion baseline path).
  const winLo = yLo === undefined ? -1e9 : yLo, winHi = yHi === undefined ? 1e9 : yHi;
  const c0 = sproj3(goal.gx, 1.2, 34);   // whole-goal cull
  if (c0.x < -900 * RES || c0.x > cv.width + 900 * RES) return;
  if (!NET_LAYERS || NET_LAYERS[0].width !== cv.width || NET_LAYERS[0].height !== cv.height)
    NET_LAYERS = NET.levels.map(() => {
      const c = document.createElement("canvas");
      c.width = cv.width; c.height = cv.height;
      return c;
    });
  const w = qw(NET.cord * S.pxPerM * RIG.zoom);
  const pitchW = Math.sqrt(3) * NET.ell;
  const G = goal.net, pos = G.pos, restp = G.rest, live = G.dirty;
  const ptData = (pt) => {
    if (pt.n !== undefined) {
      const j = pt.n * 3;
      const wy = live ? pos[j + 2] : restp[j + 2];
      return { p: live ? sproj3(pos[j], pos[j + 1], pos[j + 2])
                       : sproj3(restp[j], restp[j + 1], restp[j + 2]), wy };
    }
    if (!live) return { p: sproj3(pt.r[0], pt.r[1], pt.r[2]), wy: pt.r[2] };
    const a = pt.iA * 3, b = pt.iB * 3, t = pt.t;   // rest curve + lerped displacement
    const wy = pt.r[2] + (pos[a + 2] - restp[a + 2]) * (1 - t) + (pos[b + 2] - restp[b + 2]) * t;
    return { p: sproj3(
      pt.r[0] + (pos[a] - restp[a]) * (1 - t) + (pos[b] - restp[b]) * t,
      pt.r[1] + (pos[a + 1] - restp[a + 1]) * (1 - t) + (pos[b + 1] - restp[b + 1]) * t,
      wy), wy };
  };
  // pass 1: project + collect the bbox of the segments in this window.
  // Projections are cached per frame — the five depth patches of one goal
  // reuse one projection pass, so occlusion costs no extra projection work.
  let strandData;
  if (G._prjFrame === S.frameNo && G._prjZoom === RIG.zoom && G._prjX === RIG.x) {
    strandData = G._prjCache;
  } else {
    strandData = G.strands.map(st => st.map(ptData));
    G._prjCache = strandData; G._prjFrame = S.frameNo;
    G._prjZoom = RIG.zoom; G._prjX = RIG.x;
  }
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, any = false;
  for (const dat of strandData) {
    for (let i = 0; i + 1 < dat.length; i++) {
      const my = (dat[i].wy + dat[i + 1].wy) / 2;
      if (my >= winLo && my < winHi) {
        any = true;
        for (const q of [dat[i].p, dat[i + 1].p]) {
          bx0 = Math.min(bx0, q.x); bx1 = Math.max(bx1, q.x);
          by0 = Math.min(by0, q.y); by1 = Math.max(by1, q.y);
        }
      }
    }
  }
  if (!any) return;
  const pad = w + 4 * RES;
  const cx0 = Math.max(0, Math.floor(bx0 - pad)), cy0 = Math.max(0, Math.floor(by0 - pad));
  const cx1 = Math.min(cv.width, Math.ceil(bx1 + pad)), cy1 = Math.min(cv.height, Math.ceil(by1 + pad));
  if (cx1 <= cx0 || cy1 <= cy0) return;
  const lctx = NET_LAYERS.map(c => {
    const x = c.getContext("2d");
    x.clearRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    x.strokeStyle = NET.col; x.lineCap = "round"; x.lineWidth = w;
    x.beginPath();
    return x;
  });
  for (let sI = 0; sI < G.strands.length; sI++) {
    const st = G.strands[sI];
    const dat = strandData[sI];
    const prj = dat.map(q => q.p);
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
      const my = (dat[i].wy + dat[i + 1].wy) / 2;
      if (my < winLo || my >= winHi) { cur = -1; continue; }
      if (li !== cur) { lctx[li].moveTo(prj[i].x, prj[i].y); cur = li; }
      lctx[li].lineTo(prj[i + 1].x, prj[i + 1].y);
      // when the level changes mid-strand, re-anchor the new run at the
      // shared vertex so the two runs always share raster pixels
    }
  }
  for (let k = 0; k < NET.levels.length; k++) {
    lctx[k].stroke();
    ctx.globalAlpha = NET.levels[k];
    ctx.drawImage(NET_LAYERS[k], cx0, cy0, cx1 - cx0, cy1 - cy0, cx0, cy0, cx1 - cx0, cy1 - cy0);
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

// ═══ NET PHYSICS V2 — continuous, bidirectional, swept ball↔net collision ════
// The production net collision: the deformable membrane as a real two-sided
// collision surface (replacing the retired discrete node-proximity + scripted
// catch, which leaked slow balls, tunneled fast ones, and was one-directional).
//
// The membrane is the existing mass-spring hex mesh (node graph unchanged,
// material constants frozen). The ball collides against the CURRENT deformed
// MOVABLE node cloud: node spacing (<=0.14 m) is smaller than the ball
// diameter (0.22 m), so the sphere cannot slip between strands — the nearest
// deformed node within ballR is a faithful membrane sample. Two-sided (normal
// derived from ball-vs-membrane geometry, no triangle side rejection), swept
// (path sampled finer than the ball radius -> no tunneling), and persistent
// (residual penetration corrected every step -> no slow leak). Pinned frame-
// edge nodes are excluded: the rigid frame capsules already cover that band,
// so the seam has neither a hole nor a double impulse. Net stepped in lockstep
// with the ball's fixed sim (deterministic). Goal status never consulted.
const NETV2 = {         // production net collision constants (V2)
  e: 0.12,            // ball<->net restitution (low = dead catch, ball dies in net)
  keepT: 0.5,         // tangential velocity kept on a net contact
  massRatio: 0.4,     // fraction of an IMPACT's normal momentum fed to the net
  impactMin: 3.5,     // only impacts faster than this deform the net; a resting/
                      // dropping ball injects nothing, so the membrane cannot run
                      // away under sustained load (fixes roof sink/leak + rest)
  sub: 4,             // deterministic net substeps per 60Hz ball step under V2
  sweepStep: 0.04,    // swept path sampling (m) < ballR
  band: 0.03,         // extra detection margin (m) beyond ballR for resting contact
  // ── V2.1 RIPPLE EXCITATION (decoupled from containment) ──────────────────
  // Containment = reflection + depenetration in netV2Resolve (unchanged).
  // Excitation = a broad, once-per-impact velocity kick fed to the movable
  // nodes around the contact (in the ball's travel direction), scaled by the
  // impact normal speed — the mass-spring net then propagates it as a wave.
  // This is what V1's netImpact did over a 0.5 m radius; V2's tight 0.14 m
  // normal-only injection lost it. APPROVED CANDIDATE C: a pronounced, broad,
  // visible ripple; strength scales continuously with impact speed and the
  // mass-spring net propagates + settles it. Containment (netV2Resolve) is
  // decoupled and unaffected.
  exciteR: 0.62,      // excitation radius (m)
  exciteGain: 0.60,   // node velocity = travelDir * |vn| * exciteGain * w^2
};
// Broad ripple excitation: velocity kick to movable nodes within exciteR of the
// membrane contact, along the ball's travel direction, ~|vn|*gain*w^2. Fired
// ONCE per impact onset (not per substep) so it reads as a single traveling
// wave, not a sustained shove. Never affects the ball -> containment untouched.
function netExcite(net, cP, dir, speed) {
  const R = NETV2.exciteR, gain = NETV2.exciteGain;
  if (R <= 0 || gain <= 0 || speed <= 0) return;
  netActivate(net);
  const pos = net.pos, vel = net.vel, inv = net.inv, R2 = R * R;
  for (let i = 0; i < inv.length; i++) {
    if (!inv[i]) continue;
    const j = i * 3;
    const dx = pos[j] - cP[0], dy = pos[j + 1] - cP[1], dz = pos[j + 2] - cP[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= R2) continue;
    const w = 1 - Math.sqrt(d2) / R, ww = w * w * speed * gain;
    vel[j] += dir[0] * ww; vel[j + 1] += dir[1] * ww; vel[j + 2] += dir[2] * ww;
  }
}
function netBBox(net) {
  if (net._bb) return net._bb;
  const p = net.rest; let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (let j = 0; j < p.length; j += 3) {
    x0 = Math.min(x0, p[j]); x1 = Math.max(x1, p[j]);
    y0 = Math.min(y0, p[j + 1]); y1 = Math.max(y1, p[j + 1]);
    z0 = Math.min(z0, p[j + 2]); z1 = Math.max(z1, p[j + 2]);
  }
  const m = 0.7;   // deformation slack
  return (net._bb = [x0 - m, y0 - m, z0 - m, x1 + m, y1 + m, z1 + m]);
}
// Resolve/depenetrate the ball (net-space P, velocity Vn) against the movable
// membrane at its CURRENT deformed positions. Returns true on contact.
// P/Vn are 3-arrays in net space (X, height, Y-depth). Mutates them + the net.
function netV2Resolve(net, P, Vn) {
  const R = NETV2.e >= 0 ? NETPHYS.ballR : NETPHYS.ballR; // (ballR; kept explicit)
  const det = NETPHYS.ballR, reach = det + NETV2.band;
  const pos = net.pos, vel = net.vel, inv = net.inv;
  // gather movable nodes within reach; find nearest; accumulate outward normal
  let nx = 0, ny = 0, nz = 0, dmin = 1e9, near = [], sw = 0;
  for (let i = 0; i < inv.length; i++) {
    if (!inv[i]) continue;                 // movable only (frame band = rigid)
    const j = i * 3;
    const dx = P[0] - pos[j], dy = P[1] - pos[j + 1], dz = P[2] - pos[j + 2];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= reach * reach) continue;
    const d = Math.sqrt(d2) || 1e-9;
    if (d < dmin) dmin = d;
    const w = 1 - d / reach;               // proximity weight
    nx += (dx / d) * w; ny += (dy / d) * w; nz += (dz / d) * w; sw += w;
    near.push(i, d, w);
  }
  if (dmin >= det || sw < 1e-9) return false;   // no penetration
  let nl = Math.hypot(nx, ny, nz);
  if (nl < 1e-6) { nx = 0; ny = 1; nz = 0; nl = 1; }   // degenerate -> up
  nx /= nl; ny /= nl; nz /= nl;                 // outward membrane normal (-> ball)
  // depenetrate: push the ball out along N so the nearest node is exactly ballR
  const pen = det - dmin;
  P[0] += nx * pen; P[1] += ny * pen; P[2] += nz * pen;
  // reflect relative to the local membrane velocity at the contact
  let mvx = 0, mvy = 0, mvz = 0, mw = 0;
  for (let n = 0; n < near.length; n += 3) {
    const j = near[n] * 3, w = near[n + 2];
    mvx += vel[j] * w; mvy += vel[j + 1] * w; mvz += vel[j + 2] * w; mw += w;
  }
  mvx /= mw; mvy /= mw; mvz /= mw;
  const rvx = Vn[0] - mvx, rvy = Vn[1] - mvy, rvz = Vn[2] - mvz;
  const vn = rvx * nx + rvy * ny + rvz * nz;    // relative normal speed
  if (vn < 0) {                                 // approaching the membrane
    const tvx = rvx - vn * nx, tvy = rvy - vn * ny, tvz = rvz - vn * nz;
    // reflected relative velocity: damped tangential + restituted normal
    const rx = tvx * NETV2.keepT - NETV2.e * vn * nx;
    const ry = tvy * NETV2.keepT - NETV2.e * vn * ny;
    const rz = tvz * NETV2.keepT - NETV2.e * vn * nz;
    Vn[0] = rx + mvx; Vn[1] = ry + mvy; Vn[2] = rz + mvz;
    // feed the removed normal momentum into the net (bulge inward, -N) — ONLY
    // for real impacts; a slow/resting/dropping ball injects nothing so the
    // membrane holds near its rest shape and cannot be pushed away underfoot.
    if (-vn > NETV2.impactMin) {
      netActivate(net);
      const imp = -(1 + NETV2.e) * vn * NETV2.massRatio;   // >0
      for (let n = 0; n < near.length; n += 3) {
        const j = near[n] * 3, w = near[n + 2] / sw;
        vel[j] += -nx * imp * w; vel[j + 1] += -ny * imp * w; vel[j + 2] += -nz * imp * w;
      }
      // stash the impact for the broad ripple excitation (fired once per onset
      // in netV2Collide): contact point on the membrane + normal impact speed
      net._cvn = vn;
      net._cP = [P[0] - nx * det, P[1] - ny * det, P[2] - nz * det];
    }
  }
  return true;
}
// Swept ball↔net for one 60Hz step: p0/p1 are WORLD pre/post positions.
// Advances along the path finer than ballR, resolves at the earliest contact,
// then keeps resolving residual penetration at the final position (persistent).
function netV2Collide(b, p0) {
  for (const g of S.goalPanels || []) {
    const net = g.net; if (!net) continue;
    // ball world (x,y,z) -> net space (X, height, Y-depth)
    const P1 = [b.x, b.z, b.y], P0 = [p0.x, p0.z, p0.y];
    const bb = netBBox(net);
    const loX = Math.min(P0[0], P1[0]) - NETPHYS.ballR, hiX = Math.max(P0[0], P1[0]) + NETPHYS.ballR;
    if (hiX < bb[0] || loX > bb[3]) continue;   // broad-phase reject (X)
    const loY = Math.min(P0[2], P1[2]) - NETPHYS.ballR, hiY = Math.max(P0[2], P1[2]) + NETPHYS.ballR;
    if (hiY < bb[2] || loY > bb[5]) continue;
    const dx = P1[0] - P0[0], dy = P1[1] - P0[1], dz = P1[2] - P0[2];
    const dist = Math.hypot(dx, dy, dz);
    const nsamp = Math.max(1, Math.ceil(dist / NETV2.sweepStep));
    const vmag = Math.hypot(b.vx, b.vz, b.vy);   // ball travel dir (net space) for excitation
    const vdir = vmag > 1e-6 ? [b.vx / vmag, b.vz / vmag, b.vy / vmag] : [0, 0, 0];
    let Vn = [b.vx, b.vz, b.vy], contacted = false, cInfo = null;
    net._cvn = 0;
    for (let s = 1; s <= nsamp; s++) {          // swept: earliest contact wins
      const f = s / nsamp;
      const P = [P0[0] + dx * f, P0[1] + dy * f, P0[2] + dz * f];
      if (netV2Resolve(net, P, Vn)) {
        // land the ball at the corrected contact, keep the resolved velocity,
        // do not advance further this step (no tunneling past the membrane)
        b.x = P[0]; b.z = P[1]; b.y = P[2];
        b.vx = Vn[0]; b.vz = Vn[1]; b.vy = Vn[2];
        contacted = true;
        cInfo = { cap: g.gx ? "R-net" : "L-net", n: 0 };
        break;
      }
    }
    if (!contacted) {                            // persistent: resolve residual
      const P = [b.x, b.z, b.y];
      if (netV2Resolve(net, P, Vn)) {
        b.x = P[0]; b.z = P[1]; b.y = P[2];
        b.vx = Vn[0]; b.vz = Vn[1]; b.vy = Vn[2];
        contacted = true;
      }
    }
    if (contacted) {
      b.netHit = { t: S.pt ? S.pt.now : 0, side: g.side };
      // RIPPLE: broad excitation fired ONCE per impact onset (rising edge of a
      // strong contact) so a hard shot sends a single traveling wave rather
      // than a sustained shove. Uses the stashed contact point + impact speed.
      if (net._cvn < -NETV2.impactMin && !b._netTouch)
        netExcite(net, net._cP || [b.x, b.z, b.y], vdir, -net._cvn);
      b._netTouch = true;
    } else if (b._netTouch) b._netTouch = false;   // left contact -> re-arm onset
  }
  // Step EVERY active net in lockstep with the ball's fixed sim, whether or not
  // the ball is currently touching it — so the membrane keeps rippling and
  // settling after the ball leaves (the missing relaxation that made V2 look
  // dead). Deterministic; netPhysUpdate skips _ptV2 nets to avoid double-step,
  // and a settled net is handed back to it.
  for (const g of S.goalPanels || []) {
    const net = g.net; if (!net || !net.active) continue;
    net._ptV2 = true;
    for (let s = 0; s < NETV2.sub; s++) netPhysStep(net, null);
    if (!net.active) net._ptV2 = false;
  }
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
      if (g.net._ptV2) continue;   // NET V2 steps this net in lockstep with ptStep
      const useBall = ball && g.side === 1 &&
        Math.abs(ball.p[0] - g.gx) < 3.5 ? ball : null;
      if (g.net.active || useBall) {
        if (useBall) netActivate(g.net);
        netPhysStep(g.net, useBall);
      }
    }
  }
}

function drawGoalArtCells(goal, panelName, yLo, yHi) {
  // one y-band of one art panel (cells classified by their world-y centre)
  for (const panel of goal.panels) {
    if (panelName && panel.name !== panelName) continue;
    for (const cell of panel.cells) {
      if (yLo !== undefined) {
        const my = (cell.worldC[0][2] + cell.worldC[1][2] + cell.worldC[2][2] + cell.worldC[3][2]) / 4;
        if (my < yLo || my >= yHi) continue;
      }
      const s = cell.worldC.map(w => sproj3(w[0], w[1], w[2]));
      if (s.some(p => p.d < 0.5)) continue;
      if (Math.max(s[0].x, s[1].x, s[2].x, s[3].x) < -20 * RES ||
          Math.min(s[0].x, s[1].x, s[2].x, s[3].x) > cv.width + 20 * RES) continue;
      const a = cell.artC;
      drawTexTri(panel.img, a[0], a[1], a[2], s[0], s[1], s[2]);
      drawTexTri(panel.img, a[0], a[2], a[3], s[0], s[2], s[3]);
    }
  }
}
function drawGoal(goal) {   // pre-occlusion baseline: whole goal, one entity
  drawGoalNet(goal);
  drawGoalArtCells(goal);
  if (!GOALFX.occlusion) drawGoalFrame(goal.gx);
}
// GOAL FRAME V1 depth members: the frame is drawn as individual world-space
// strokes so each participates in the depth sort, WITHOUT clipping (clipping
// far/foreshortened members produced degenerate band boundaries -> gaps).
// A POST is at constant world-y, so it needs ONE depth and draws as a single
// continuous stroke. Only the CROSSBAR spans y and is split for depth; its
// segments OVERLAP their neighbours and share the exact endpoints of the
// original path, so joints are seamless (no rings) and the corners meet the
// posts. Same rim(#9aa19b)+core(#fbfbf8) style and 0.12 m width as the
// single-path drawGoalFrame — visually one continuous rigid structure.
function drawGoalFrameMember(pts, cap) {
  // cap "round" for a member's TRUE ends (posts, whole bar ends); "butt" for
  // internal crossbar-segment joints — colinear butt ends share endpoints and
  // meet flush, so the segmented bar reads as one continuous straight member
  // (round caps on foreshortened segments looked like beads).
  const s = pts.map(w => sproj3(w[0], w[1], w[2]));
  if (s.some(q => q.d < 0.5)) return;
  if (s.every(q => q.x < -20 * RES) || s.every(q => q.x > cv.width + 20 * RES)) return;
  const w = qw(Math.max(3, 0.12 * S.pxPerM * RIG.zoom));
  ctx.lineJoin = "round"; ctx.lineCap = cap || "round";
  ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
  for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
  ctx.strokeStyle = "#9aa19b"; ctx.lineWidth = w + 2 * PXQ; ctx.stroke();
  ctx.strokeStyle = "#fbfbf8"; ctx.lineWidth = w; ctx.stroke();
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
  if (S.pt && S.pt.on) {
    if (S.pt._stepOne) { ptStep(); S.pt._stepOne = false; S._ptAcc = 0; }   // '.' single-step
    const mul = S.pt.paused ? 0 : (S.pt.slow || 1);                         // 'm' pause · ',' slow-mo
    let pacc = (S._ptAcc || 0) + dt * mul;
    while (pacc >= PT_DT) { ptStep(); pacc -= PT_DT; if (S.pt.paused) { pacc = 0; break; } }   // pause-at-contact (key V) stops mid-frame
    S._ptAcc = pacc; }
  if (S.animTest) { let acc = (S._atAcc || 0) + (S.netSlow ? dt * 0.15 : dt);
    while (acc >= NETPHYS.dt) { animTestStep(); acc -= NETPHYS.dt; }
    S._atAcc = acc; }
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
// ═══ DRIBBLE ANIMATION V2 — FOOT-SYNC TOUCH LIBRARY (east + mirrored west) ═══
// Modular pose library: contacts (L/R x reach/normal/compact variants),
// strides, and cut poses. PHYSICS OWNS TIMING: an authoritative carry-touch
// event selects foot + variant deterministically (zero RNG) and schedules
// the pose sequence toward the next expected touch. The animation never
// moves the ball. contact point (cx,cy) = boot toe in 140-canvas art px;
// dy = draw-time vertical alignment (originals untouched).
const DRIB_LIB = {
  R_A: { src: ["dribble", 1], foot: "R", cx: 96, cy: 111, dy: -2, cls: "contact" },
  R_B: { src: ["dribble", 2], foot: "R", cx: 92, cy: 112, dy: 0,  cls: "contact" },
  R_C: { src: ["drib2", "cc_6"], foot: "R", cx: 92, cy: 116, dy: 0, cls: "contact" },
  L_A: { src: ["dribble", 6], foot: "L", cx: 96, cy: 116, dy: 0,  cls: "contact" },
  L_B: { src: ["dribble", 7], foot: "L", cx: 95, cy: 118, dy: 0,  cls: "contact" },
  L_C: { src: ["drib2", "cc_5"], foot: "L", cx: 86, cy: 116, dy: 0, cls: "contact" },
  CUT_P: { src: ["drib2", "cut_5"], foot: "*", cx: 85, cy: 113, dy: 2, cls: "cut" },
  CUT_X: { src: ["drib2", "cut_6"], foot: "*", cx: 95, cy: 110, dy: 5, cls: "cut" },
  ST_A: { src: ["dribble", 0], dy: -2, cls: "stride" },
  ST_B: { src: ["dribble", 5], dy: 0, cls: "stride" },
  ST_C: { src: ["drib2", "cc_4"], dy: 0, cls: "stride" },
  ST_D: { src: ["drib2", "cc_7"], dy: 0, cls: "stride" },
  ST_X: { src: ["dribble", 3], dy: 0, cls: "stride" },
  ST_Y: { src: ["dribble", 4], dy: 0, cls: "stride" },
  // V2.1: long-reach sprint contacts (physics contacts ~0.73 m ahead at
  // sprint; these reach +0.60..0.66 m) and drag-back turn coverage
  SPR_A: { src: ["drib2", "sr_2"], foot: "R", cx: 103, cy: 115, dy: 2, cls: "contact", reach: "long" },
  SPR_B: { src: ["drib2", "sr_7"], foot: "L", cx: 102, cy: 117, dy: 0, cls: "contact", reach: "long" },
  SPR_C: { src: ["drib2", "sr_1"], foot: "R", cx: 100, cy: 118, dy: 0, cls: "contact", reach: "long" },
  DRAG_A: { src: ["drib2", "db_4"], foot: "*", cx: 80, cy: 112, dy: 0, cls: "drag" },
  DRAG_X: { src: ["drib2", "db_5"], foot: "*", cx: 80, cy: 112, dy: 3, cls: "drag" },
  SPR_ST_A: { src: ["drib2", "sr_0"], dy: 0, cls: "stride" },
  SPR_ST_B: { src: ["drib2", "sr_6"], dy: 3, cls: "stride" },
  DB_ST: { src: ["drib2", "db_2"], dy: 0, cls: "stride" },
};
const DRIB_POOLS = {   // variant pools per foot x speed band (deterministic pick)
  R: { slow: ["R_C", "R_B"], jog: ["R_B", "R_C", "R_A"], sprint: ["SPR_A", "SPR_C", "R_A"] },
  L: { slow: ["L_C", "L_B"], jog: ["L_B", "L_C", "L_A"], sprint: ["SPR_B", "L_A", "L_B"] },
};
const DRIB_STRIDES = { slow: ["ST_C", "ST_D"], jog: ["ST_A", "ST_X", "ST_B", "ST_Y"],
                       sprint: ["SPR_ST_A", "SPR_ST_B"] };
// V3: directional contact libraries (auto-measured metadata; see
// dribble3/CONTACT_META.json). w/nw/sw present the mirrored e/ne/se art
// (accepted E->W mirror precedent; foot labels flip with the mirror).
const DRIB3 = {"north": {"contacts": [{"f": "n_dr_6.png", "foot": "L", "cx": 69, "cy": 123, "dy": 0, "spread": 0.8}, {"f": "n_dr_5.png", "foot": "L", "cx": 69, "cy": 123, "dy": 0, "spread": 1.3}, {"f": "n_dr_4.png", "foot": "L", "cx": 68, "cy": 117, "dy": 0, "spread": 1.9}, {"f": "n_dr_2.png", "foot": "R", "cx": 74, "cy": 121, "dy": 0, "spread": 4.2}], "sprs": [{"f": "n_sp_6.png", "foot": "R", "cx": 72, "cy": 118, "dy": 0}, {"f": "n_sp_4.png", "foot": "R", "cx": 72, "cy": 123, "dy": 0}], "strides": ["n_dr_0.png", "n_dr_1.png", "n_dr_3.png", "n_dr_7.png"]}, "north-east": {"contacts": [{"f": "ne_dr_6.png", "foot": "R", "cx": 81, "cy": 115, "dy": 5, "spread": 0.6}, {"f": "ne_dr_0.png", "foot": "L", "cx": 80, "cy": 123, "dy": 0, "spread": 2.3}, {"f": "ne_dr_5.png", "foot": "R", "cx": 75, "cy": 121, "dy": 0, "spread": 7.1}, {"f": "ne_dr_1.png", "foot": "R", "cx": 73, "cy": 126, "dy": 0, "spread": 8.9}], "sprs": [{"f": "ne_sp_2.png", "foot": "R", "cx": 74, "cy": 126, "dy": 0}, {"f": "ne_sp_1.png", "foot": "R", "cx": 73, "cy": 125, "dy": 0}], "strides": ["ne_dr_2.png", "ne_dr_3.png", "ne_dr_4.png", "ne_dr_7.png"]}, "south-east": {"contacts": [{"f": "se_dr_2.png", "foot": "L", "cx": 82, "cy": 118, "dy": 0, "spread": 0.4}, {"f": "se_dr_1.png", "foot": "R", "cx": 88, "cy": 117, "dy": 0, "spread": 6.4}, {"f": "se_dr_6.png", "foot": "L", "cx": 71, "cy": 122, "dy": 0, "spread": 11.2}, {"f": "se_dr_7.png", "foot": "L", "cx": 71, "cy": 125, "dy": 0, "spread": 11.3}], "sprs": [{"f": "se_sp_3.png", "foot": "L", "cx": 77, "cy": 119, "dy": 0}, {"f": "se_sp_4.png", "foot": "R", "cx": 68, "cy": 119, "dy": 0}], "strides": ["se_dr_0.png", "se_dr_3.png", "se_dr_4.png", "se_dr_5.png"]}, "south": {"contacts": [{"f": "s_dr_6.png", "foot": "R", "cx": 70, "cy": 125, "dy": 0, "spread": 0.3}, {"f": "s_dr_7.png", "foot": "L", "cx": 70, "cy": 120, "dy": 0, "spread": 0.3}, {"f": "s_dr_5.png", "foot": "R", "cx": 69, "cy": 124, "dy": 0, "spread": 1.3}, {"f": "s_dr_3.png", "foot": "R", "cx": 69, "cy": 115, "dy": 5, "spread": 1.4}], "sprs": [{"f": "s_sp_4.png", "foot": "L", "cx": 70, "cy": 122, "dy": 0}, {"f": "s_sp_2.png", "foot": "R", "cx": 68, "cy": 116, "dy": 0}], "strides": ["s_dr_0.png", "s_dr_1.png", "s_dr_2.png", "s_dr_4.png"]}};
const DRIB3_MIRROR = { "west": "east", "north-west": "north-east", "south-west": "south-east" };
function ptPresDir(t) {
  // continuous facing -> nearest 8-direction presentation with 10-deg
  // hysteresis so E<->NE boundaries do not flicker (visual quantisation
  // only; locomotion stays continuous)
  const deg = ((t.p.facing * 180 / Math.PI) % 360 + 360) % 360;
  const cand = headingToDir(deg);
  if (!t.presDir) { t.presDir = cand; return cand; }
  if (cand !== t.presDir) {
    const centre = DIRS.indexOf(t.presDir) * 45;
    let dd = Math.abs(deg - centre); if (dd > 180) dd = 360 - dd;
    if (dd > 32.5) t.presDir = cand;
  }
  return t.presDir;
}
function drib2Img(pose) {
  const e = DRIB_LIB[pose];
  return e.src[0] === "dribble" ? (S.anims.dribble.east && S.anims.dribble.east[e.src[1]])
                                : (S.images.drib2 && S.images.drib2[e.src[1]]);
}
// deterministic foot + variant selection at an authoritative touch
function drib2Sector(t) {
  // authoritative ball position in the carrier's intended-movement frame:
  // along = ahead(+)/behind(-), lat = right(+)/left(-) of the corridor
  const p = t.p, b = t.b;
  const along = Math.cos(t.corr) * (b.x - p.x) + Math.sin(t.corr) * (b.y - p.y);
  const lat = Math.cos(t.corr) * (b.y - p.y) - Math.sin(t.corr) * (b.x - p.x);
  const a = Math.atan2(lat, along) * 180 / Math.PI;   // 0=FRONT, +90=RIGHT
  const sec = a > -22.5 && a <= 22.5 ? "FRONT" :
              a > 22.5 && a <= 67.5 ? "FRONT_RIGHT" :
              a > 67.5 && a <= 112.5 ? "RIGHT" :
              a > 112.5 && a <= 157.5 ? "BACK_RIGHT" :
              a < -22.5 && a >= -67.5 ? "FRONT_LEFT" :
              a < -67.5 && a >= -112.5 ? "LEFT" :
              a < -112.5 && a >= -157.5 ? "BACK_LEFT" : "BACK";
  return { sec, along, lat };
}
// V3: pick a directional contact entry (n/ne/se/s bases) — deterministic
function drib3Pick(t, corrective, turnA, base, mirrored) {
  const p = t.p, b = t.b;
  const pv = Math.hypot(p.vx, p.vy);
  const band = pv < 2.2 ? "slow" : pv < 6 ? "jog" : "sprint";
  const lat0 = Math.cos(t.corr) * (b.y - p.y) - Math.sin(t.corr) * (b.x - p.x);
  const lat = mirrored ? -lat0 : lat0;      // foot semantics flip with mirror
  let foot;
  if (corrective && turnA > 1.0) foot = lat >= 0 ? "R" : "L";
  else if (Math.abs(lat0) > 0.25) foot = lat >= 0 ? "R" : "L";
  else foot = t.lastFoot === "R" ? "L" : "R";
  t.lastFoot = foot;
  const L = DRIB3[base];
  let pool = band === "sprint" ? L.sprs.slice() : L.contacts.slice();
  if (band === "slow") pool.sort((a2, b2) => a2.spread - b2.spread);   // compact first
  const footPool = pool.filter(e => e.foot === foot);
  if (footPool.length) pool = footPool;                 // preference, not rule
  const turnClass = turnA > 1.9 ? 3 : turnA > 1.0 ? 2 : turnA > 0.52 ? 1 : 0;
  const e = pool[(t.touchN + turnClass) % pool.length];
  return { entry: e, foot: e.foot, band, turnClass,
           sector: drib2Sector(t).sec, pose: e.f.replace(".png", "") };
}
function drib3Schedule(t, pick, T, base) {
  const hold = Math.min(0.14, T * 0.45);
  const seq = [{ kind: "contact3", e: pick.entry, base, until: t.now + hold }];
  // strides resolve at DRAW time from the CURRENT presentation, so a turn
  // rotates through directional art between touches (no library popping)
  seq.push({ kind: "stride3", i: t.touchN, until: t.now + hold + (T - hold) * 0.5 });
  seq.push({ kind: "stride3", i: t.touchN + 1, until: t.now + T + 0.2 });
  t.dribSeq = seq;
}
function drib2Pick(t, corrective, turnA) {
  const p = t.p, b = t.b;
  const pv = Math.hypot(p.vx, p.vy);
  const band = pv < 2.2 ? "slow" : pv < 6 ? "jog" : "sprint";
  // ball side relative to the carry corridor (cross product sign)
  const lat = Math.cos(t.corr) * (b.y - p.y) - Math.sin(t.corr) * (b.x - p.x);
  let foot;
  if (corrective && turnA > 1.0) foot = lat >= 0 ? "R" : "L";       // ball-side foot
  else if (Math.abs(lat) > 0.25) foot = lat >= 0 ? "R" : "L";
  else foot = t.lastFoot === "R" ? "L" : "R";                       // natural alternation
  t.lastFoot = foot;
  const turnClass = turnA > 1.9 ? 3 : turnA > 1.0 ? 2 : turnA > 0.52 ? 1 : 0;
  const info = drib2Sector(t);
  let pose;
  if (corrective && (info.sec.indexOf("BACK") === 0 || info.along < 0.08))
    pose = "DRAG_A";                       // ball beside/behind: drag it through
  else if (corrective && turnClass >= 2) pose = (t.touchN % 2) ? "CUT_P" : "CUT_X";
  else {
    // CONTACT MATCHING: ball's along-corridor offset in art px (53.33 art
    // px per world metre at the authored scale); prefer the pose whose
    // boot-contact zone is nearest, keep variety among near-equals (<=4 px)
    const s0m = Math.cos(t.corr) * (b.x - p.x) + Math.sin(t.corr) * (b.y - p.y);
    const aheadArt = 70 + s0m * (32 / 0.60);
    const pool = DRIB_POOLS[foot][band].slice()
      .sort((a2, b2) => Math.abs(DRIB_LIB[a2].cx - aheadArt) - Math.abs(DRIB_LIB[b2].cx - aheadArt));
    const near = pool.filter(q => Math.abs(DRIB_LIB[q].cx - aheadArt) <=
                                  Math.abs(DRIB_LIB[pool[0]].cx - aheadArt) + 4);
    pose = near[(t.touchN + turnClass) % near.length];
  }
  return { foot, pose, band, turnClass, sector: info.sec };
}
// schedule contact pose at the touch instant + strides toward the next touch
function drib2Schedule(t, pick, T) {
  const hold = Math.min(0.14, T * 0.45);
  const seq = [{ pose: pick.pose, until: t.now + hold }];
  if (pick.pose === "DRAG_A") {            // drag-back plays its own exit
    seq.push({ pose: "DRAG_X", until: t.now + hold + 0.14 });
    seq.push({ pose: "DB_ST", until: t.now + Math.max(T, hold + 0.28) + 0.2 });
    t.dribSeq = seq; return;
  }
  const st = DRIB_STRIDES[pick.band];
  if (T - hold > 0.12) {
    const s1 = st[t.touchN % st.length], s2 = st[(t.touchN + 1) % st.length];
    seq.push({ pose: s1, until: t.now + hold + (T - hold) * 0.5 });
    seq.push({ pose: s2, until: t.now + T + 0.2 });
  } else {
    seq.push({ pose: st[t.touchN % st.length], until: t.now + T + 0.2 });
  }
  t.dribSeq = seq;
}
// ═══ KICK ANIMATION V2 — technique library + deterministic foot selection ═══
// Mirrors world.py Body.select_kick_foot / kick_technique / trivela_plausible
// (presentation only; the engine's kick physics is untouched). East-authored;
// west presents the mirror with flipped foot labels. contact = boot px in the
// 140 canvas at the contact frame; kickAt = t0 + contact/fps.
// cx/cy = TECHNIQUE-SPECIFIC contact point on the 140 canvas: the boot
// surface that strikes (INSIDE -> medial face, LACES -> instep, OUTSIDE ->
// lateral face, CHIP -> under-toe), not the forward-most toe pixel.
// KICK V2.0.3: in4_R/in4_L carry the user-approved F3 FORESHORTENED contact
// frames (hand-pixeled): lowered strike leg, boot shortened in screen-X and
// deepened in screen-Y, toe toward the viewer, restrained medial facet.
// The contact frames are locked pixel-for-pixel — no interpolation may
// regenerate them. Every other frame is the accepted in3 motion (approach,
// low sweep, wrap-across, recovery). Metrics diagnostic only; the user's
// visual review at gameplay scale is the acceptance gate.
// V2.0.4 H3 CONTACT GEOMETRY (user-selected): INSIDE_R draws with an EASED
// PRESENTATION ROOT OFFSET (art px on the 140 canvas) that peaks at exactly
// [+4,+13] on the locked contact frame — the G3 diagonal + H3 height that
// nestles the FIXED authoritative ball into the center of the medial face.
// Pure draw-time motion: physics, ball position and kick timing untouched;
// normal depth order kept (ball in front). rootEase maps frame -> weight.
const KICK_LIB = {
  INSIDE_R: { set: "in4_R", n: 12, fps: 14, contact: 6, cx: 95, cy: 111, surface: "INSIDE",
              rootOff: [4, 13], rootEase: { 3: 0.1, 4: 0.3, 5: 0.65, 6: 1, 7: 0.5, 8: 0.2, 9: 0.05 } },
  INSIDE_L: { set: "in4_L", n: 12, fps: 14, contact: 6, cx: 93, cy: 110, surface: "INSIDE" },
  LACES_R: { set: "la_R", n: 10, fps: 12, contact: 7, cx: 97, cy: 114, surface: "LACES" },
  LACES_L: { set: "la_L", n: 10, fps: 12, contact: 7, cx: 98, cy: 113, surface: "LACES" },
  // POWER V2-BR5 (user-approved): B-body kinetic chain, knee-lead -> shin
  // whip, locked ankle (rel band ±7deg), monotonic rising instep arc with
  // recovery deferred to f11. rootOff/rootEase = the tuned +3/+5/+3/+2/+1/0
  // contact-height presentation offset (player down so the fixed ball nests
  // at MID-LACES). Presentation-only; impulse/timing untouched.
  POWER_R: { set: "pw_R", n: 12, fps: 15, contact: 7, cx: 96, cy: 111, surface: "LACES",
             rootOff: [0, 5], rootEase: { 6: 0.6, 7: 1, 8: 0.6, 9: 0.4, 10: 0.2, 11: 0 } },
  OUTSIDE_R: { set: "ou_R", n: 8, fps: 14, contact: 6, cx: 100, cy: 114, surface: "OUTSIDE" },
  OUTSIDE_L: { set: "ou_L", n: 8, fps: 14, contact: 6, cx: 96, cy: 113, surface: "OUTSIDE" },
  CHIP_R: { set: "ch_R", n: 8, fps: 14, contact: 5, cx: 86, cy: 112, surface: "CHIP" },
};
function ptTech(fam, D, v0) {
  if (fam === "SHORT" || fam === "CUTBACK" || fam === "THROUGH") return "INSIDE";
  if (fam === "DRIVEN") return "LACES";
  if (fam === "LOFT" || fam === "CROSS") return "CHIP";
  if (fam === "CLEAR" || fam === "PUNT") return "LACES_POWER";
  if (fam === "SHOT") return D < 14 ? "INSIDE_FINISH" : (v0 >= 29 ? "LACES_POWER" : "LACES");
  return "LACES";
}
function ptSelectFoot(t, tx, ty) {
  const p = t.p, b = t.b;
  const pf = t.pfoot || "R";
  const v = Math.hypot(p.vx, p.vy);
  const mv = v > 0.7 ? Math.atan2(p.vy, p.vx) : p.facing;
  const lat = Math.cos(mv) * (b.y - p.y) - Math.sin(mv) * (b.x - p.x);
  const tgt = Math.atan2(ty - p.y, tx - p.x);
  const dtg = ((tgt - mv) + Math.PI * 3) % (2 * Math.PI) - Math.PI;
  let best = pf, bestScore = -9;
  for (const [foot, side] of [["R", 1], ["L", -1]]) {
    let sc = foot === pf ? 3.0 : 0.0;
    if (lat * side > 0.12) sc += 2.0;
    if (lat * side < -0.30) sc -= 2.5;
    if (dtg * side < -0.20) sc += 0.6;
    if (sc > bestScore || (sc === bestScore && foot === pf)) { best = foot; bestScore = sc; }
  }
  return { foot: best, lat, dtg, tgt };
}
function ptKickEntry(tech, foot, mirror) {
  // technique+foot -> sequence (deterministic fallback chain, gaps logged).
  // PREFERRED FOOT KICK ROUTING fix: the library is EAST-AUTHORED, so a
  // mirrored (west) presentation flips which physical foot the art shows.
  // To display the SELECTED foot facing west we must load the OPPOSITE
  // foot's east art and mirror it (a mirrored right-foot kick looks
  // left-footed). artFoot = the art actually loaded; the kick descriptor
  // keeps the selected foot. fb marks technique/foot substitutions.
  const artFoot = mirror ? (foot === "R" ? "L" : "R") : foot;
  const map = {
    "INSIDE": "INSIDE_", "INSIDE_FINISH": "INSIDE_",
    "LACES": "LACES_", "LACES_POWER": artFoot === "R" ? "POWER_" : "LACES_",
    "OUTSIDE": "OUTSIDE_", "CHIP": "CHIP_",
  };
  const want = (map[tech] || "LACES_") + artFoot;
  let key = want, fb = false;
  if (!KICK_LIB[key]) { key = (tech === "CHIP" ? "INSIDE_" : "LACES_") + artFoot; fb = true; }
  // LACES_POWER with left art foot has no dedicated power set: substitution
  if (tech === "LACES_POWER" && artFoot === "L") fb = true;
  return { key, e: KICK_LIB[key], artFoot, fb };
}
// ═══ SINGLE PLAYER ANIMATION PLAYTEST — isolated dev harness ═════════════════
// Interactive one-player + authoritative-ball testbed ("Single Player Test"
// button). ARCHITECTURE NOTE: the authoritative Body lives in Python
// (world.py) and has no realtime input channel, so this harness is a
// VERBATIM PORT of its equations — locomote accel/brake/turn limits,
// carry_touch cadence, interact CLEAN control branch, FAM kick families,
// step_ball integration, same constants, same 60 Hz fixed step — exactly
// as the accepted ball tests already port step_ball. Nothing here touches
// match state (S.pb), match AI, or the engine.
const PT = {  // world.py Body constants, ported verbatim — keep in sync
  G: 9.81, MU_ROLL: 4.2, MU_AIR: 0.8, REST: 0.55, KEEP: 0.80, SETTLE: 1.0,
  REACH: 0.9, EXCL: 0.45, ACC: 4.8, BRAKE: 6.5, VMAX: 8.2, RUNV: 5.0,
  // PLAYER LOCOMOTION RESPONSIVENESS V1 (candidate A, world.py mirror)
  ACC_GAIN: 8.5 / 4.8, BRAKE_PLANT: 12.0, ACC_LAT: 10.0, ACC_START: 9.5,
};
const PT_DT = 1 / 60;
// ═══ INSIDE_R BALL CURVE V1 — right-foot inside curl (technique-specific) ══
// Minimal Magnus-style model: spin state stored on the ball at the
// authoritative contact, resolved every flight step as a lateral
// acceleration toward the LEFT perpendicular of the ball's CURRENT travel
// direction (direction-invariant). Additive to the existing integration —
// gravity, drag, bounce, timestep untouched. All coefficients named.
const PT_CURVE = {
  mode: "v2",        // "v1" = diagnosed constant-magnitude model | "v2" = velocity-dependent
  base: 1.6,         // spin at tap charge
  chargeGain: 4.4,   // additional spin at full charge
  fPow: 1.5,         // spin = base + chargeGain * c^fPow (smooth, bounded)
  airZ0: 0.05,       // airborne factor ramps from z=airZ0 ...
  airZ1: 0.50,       // ... to full effect at z=airZ1 (smoothstep, not binary)
  groundFrac: 0.15,  // grounded/rolling keeps this small fraction of the curl
  decay: 0.30,       // spin decay per second in flight (progressive arc, no spiral)
  rollDecay: 1.8,    // v1 rolling decay (the diagnosed 6x double penalty)
  bounceKeep: 0.5,   // spin retained across a ground bounce
  // ── V2: velocity-dependent curve, a = k * spin * |v_horizontal| toward
  // travel-left. Bend-per-metre ~ k*s/v instead of the pathological s/v^2.
  // k 0.22 = APPROVED X3 curve strength (user-selected after the C1-C3 and
  // X1-X3 strength studies; the large solved setups are accepted).
  k: 0.22,
  skimDecay: 0.6,    // v2 rolling decay: a brief skim no longer kills the spin
};
// ═══ INSIDE_R TARGET-SOLVED SETUP SURFACE (approved architecture) ═══════════
// The launch departs RIGHT of the intended target line by a setup angle that
// makes the free V2 curved trajectory re-cross the aim line AT the intended
// target distance. Angles were solved OFFLINE by 20-iteration bisection on
// this exact integrator (oracle in STUDY_RECORD_TARGETSOLVE_APPROX.json);
// runtime is a clamped bilinear lookup — the ~22-simulation solver never
// runs during gameplay, and nothing steers the ball after launch.
//
// PRODUCTION CONTRACT: real match play must pass the AUTHORITATIVE intended
// target distance (engine Body.kick(pid, tx, ty, fam): D = dist(ball,
// target), world.py:187) into the kick as tgtDist. The sandbox preview
// proxy below must never enter real match gameplay.
const PT_CURVE_SETUP = {
  // APPROVED X3 SURFACE — oracle-solved (scan-and-refine on the real
  // integrator, uncapped) against k 0.22 physics. The large angles are the
  // honest target-solved results for the approved strong curvature.
  // 11 x 13 nodes (densified so bilinear error stays within the approved
  // lateral-accuracy band on X3's steeper surface).
  c: [0.15, 0.3, 0.45, 0.6, 0.675, 0.7125, 0.75, 0.7875, 0.825, 0.9, 1.0], // charge nodes
  d: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32, 34], // target-distance nodes (m)
  // solved setup DEGREES [charge row][distance col]; cells beyond a charge's
  // solvable range repeat the max-range solve so interpolation stays smooth
  deg: [[0.62, 0.88, 1.12, 1.12, 1.12, 1.12, 1.12, 1.12, 1.12, 1.12, 1.12, 1.12, 1.12],
        [0.88, 1.12, 1.38, 1.62, 1.62, 1.62, 1.62, 1.62, 1.62, 1.62, 1.62, 1.62, 1.62],
        [1.00, 1.38, 1.62, 1.88, 2.12, 2.38, 2.38, 2.38, 2.38, 2.38, 2.38, 2.38, 2.38],
        [2.12, 3.00, 3.50, 3.88, 4.12, 4.50, 4.50, 4.50, 4.50, 4.50, 4.50, 4.50, 4.50],
        [4.62, 7.75, 9.75, 11.25, 12.25, 13.00, 13.62, 14.12, 14.12, 14.12, 14.12, 14.12, 14.12],
        [5.75, 9.75, 13.38, 16.00, 17.88, 19.25, 20.38, 21.25, 21.25, 21.25, 21.25, 21.25, 21.25],
        [6.38, 10.62, 14.75, 18.62, 21.50, 23.88, 25.75, 27.25, 28.38, 29.38, 29.38, 29.38, 29.38],
        [6.88, 11.12, 15.38, 19.62, 23.62, 26.75, 29.50, 31.75, 33.62, 35.12, 36.38, 37.25, 37.25],
        [7.12, 11.50, 15.88, 20.12, 24.50, 28.38, 31.62, 34.50, 37.00, 39.00, 40.62, 41.88, 42.88],
        [7.62, 12.12, 16.50, 20.88, 25.38, 29.88, 34.25, 38.12, 41.62, 45.00, 47.88, 49.88, 51.62],
        [8.38, 12.88, 17.50, 22.00, 26.50, 31.12, 35.75, 40.50, 45.25, 50.25, 55.25, 59.00, 62.50]],
  // solvable range (m) per charge node: the farthest node distance where a
  // free X3 trajectory can still arrive on the aim line (for strong curl the
  // limit is holding the line, not raw carry). A target beyond it CLAMPS to
  // the max-range solve; kick power is never increased for a distant target.
  reach: [10.5, 13, 18, 18, 23, 23, 28, 32.5, 34.5, 34.5, 34.5],
  reachMargin: 0.5,
  previewCap: 30,   // sandbox preview target ceiling (m)
};

// ═══ TEMPORARY X3 CALIBRATION SELECTOR (REVIEW BUILD ONLY — key "[") ════════
// Live A/B/C/D comparison of the INSIDE_R curve MAGNITUDE. Nothing else changes:
// charge, launch speed, elevation, gravity, friction, bounce, frame, net, the
// curvature accumulation/decay law and every goalkeeper system are untouched.
// Because INSIDE_R is TARGET-SOLVED, each candidate carries its OWN setup surface,
// re-solved with the same scan-and-refine procedure on the same node grid against
// its own effective coefficient k*f — so A/B/C/D all aim at the same target and
// only the route there differs. Candidate D re-uses the production surface and
// f = 1, so selecting D is byte-identical to production.
// Solved 2026-09-04; solver validated against the production surface at f = 1
// (median 0.83 deg, and 0.000-0.6 m target error inside each candidate's reach).
const PT_X3 = {
  active: "B",                       // review default (user request): X3-B 0.55x
  order: ["A", "B", "C", "D"],
  cands: {
    A: { f: 0.50, label: "X3-A 0.50×", deg:
           [[0.48, 0.61, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70],
            [0.64, 0.81, 0.95, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05],
            [0.92, 1.17, 1.33, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40],
            [1.95, 2.75, 3.24, 3.58, 3.83, 4.03, 4.20, 4.20, 4.20, 4.20, 4.20, 4.20, 4.20],
            [2.94, 4.88, 6.33, 7.31, 8.03, 8.56, 8.97, 9.10, 9.10, 9.10, 9.10, 9.10, 9.10],
            [3.21, 5.27, 7.25, 8.74, 9.86, 10.73, 11.41, 11.94, 12.25, 12.25, 12.25, 12.25, 12.25],
            [3.42, 5.52, 7.59, 9.59, 11.17, 12.45, 13.53, 14.39, 15.09, 15.67, 16.10, 16.10, 16.10],
            [3.57, 5.70, 7.80, 9.86, 11.86, 13.48, 14.89, 16.13, 17.15, 18.00, 18.71, 19.20, 19.60],
            [3.65, 5.82, 7.95, 10.04, 12.09, 14.05, 15.67, 17.13, 18.47, 19.60, 20.57, 21.23, 21.82],
            [3.79, 5.99, 8.17, 10.31, 12.41, 14.47, 16.50, 18.43, 20.10, 21.64, 23.10, 24.16, 25.11],
            [3.98, 6.23, 8.45, 10.62, 12.77, 14.89, 16.98, 19.04, 21.07, 23.08, 25.06, 26.63, 28.13]],
         reach: [9.4, 11.9, 11.2, 20, 20.9, 24.2, 29.6, 33.8, 34.8, 34.2, 34.3] },
    B: { f: 0.55, label: "X3-B 0.55×", deg:
           [[0.52, 0.67, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70],
            [0.71, 0.89, 1.04, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05],
            [1.01, 1.28, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40],
            [2.15, 3.03, 3.57, 3.94, 4.21, 4.43, 4.55, 4.55, 4.55, 4.55, 4.55, 4.55, 4.55],
            [3.23, 5.37, 6.97, 8.05, 8.83, 9.42, 9.87, 10.15, 10.15, 10.15, 10.15, 10.15, 10.15],
            [3.54, 5.80, 7.98, 9.62, 10.85, 11.81, 12.56, 13.14, 13.62, 13.65, 13.65, 13.65, 13.65],
            [3.77, 6.08, 8.35, 10.56, 12.30, 13.71, 14.90, 15.85, 16.62, 17.26, 17.50, 17.50, 17.50],
            [3.92, 6.27, 8.59, 10.86, 13.06, 14.85, 16.40, 17.77, 18.89, 19.83, 20.61, 21.15, 21.35],
            [4.02, 6.40, 8.75, 11.05, 13.32, 15.49, 17.27, 18.88, 20.36, 21.61, 22.67, 23.40, 24.05],
            [4.17, 6.60, 8.99, 11.35, 13.67, 15.96, 18.21, 20.34, 22.18, 23.89, 25.51, 26.68, 27.72],
            [4.38, 6.86, 9.30, 11.70, 14.08, 16.42, 18.73, 21.02, 23.28, 25.52, 27.74, 29.50, 31.16]],
         reach: [8.1, 10.1, 9, 19, 21.9, 25.1, 28.6, 32.8, 34.3, 34.6, 34.4] },
    C: { f: 0.60, label: "X3-C 0.60×", deg:
           [[0.57, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70],
            [0.77, 0.97, 1.14, 1.29, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40, 1.40],
            [1.10, 1.40, 1.60, 1.75, 1.75, 1.75, 1.75, 1.75, 1.75, 1.75, 1.75, 1.75, 1.75],
            [2.34, 3.30, 3.89, 4.29, 4.59, 4.83, 4.90, 4.90, 4.90, 4.90, 4.90, 4.90, 4.90],
            [3.53, 5.86, 7.60, 8.78, 9.64, 10.28, 10.77, 10.85, 10.85, 10.85, 10.85, 10.85, 10.85],
            [3.86, 6.32, 8.71, 10.50, 11.85, 12.90, 13.71, 14.35, 14.70, 14.70, 14.70, 14.70, 14.70],
            [4.11, 6.63, 9.12, 11.53, 13.43, 14.98, 16.27, 17.31, 18.15, 18.84, 19.25, 19.25, 19.25],
            [4.28, 6.85, 9.38, 11.86, 14.27, 16.23, 17.93, 19.42, 20.65, 21.66, 22.52, 23.11, 23.45],
            [4.39, 6.99, 9.55, 12.07, 14.56, 16.93, 18.89, 20.65, 22.27, 23.64, 24.79, 25.59, 26.29],
            [4.55, 7.20, 9.82, 12.40, 14.94, 17.45, 19.93, 22.27, 24.29, 26.17, 27.94, 29.22, 30.37],
            [4.78, 7.48, 10.15, 12.79, 15.39, 17.96, 20.51, 23.03, 25.53, 28.01, 30.47, 32.43, 34.26]],
         reach: [7, 14.3, 12.4, 18.3, 20.5, 24.1, 29.2, 33.3, 34.9, 34.2, 34] },
    D: { f: 1.00, label: "X3-D 1.00× PRODUCTION", deg: null, reach: null },   // null = the production surface
  },
};
function ptX3() { return PT_X3.cands[PT_X3.active] || PT_X3.cands.D; }
function ptX3K() { const c = ptX3(); return PT_CURVE.k * (c.f != null ? c.f : 1); }   // effective curve coefficient
function ptX3Deg() { const c = ptX3(); return c.deg || PT_CURVE_SETUP.deg; }
function ptX3Reach() { const c = ptX3(); return c.reach || PT_CURVE_SETUP.reach; }
function ptCurveClampDist(c, D) {
  // the lookup's reachability clamp, exposed for HUD reporting: identical
  // math, no behavior of its own
  const q = PT_CURVE_SETUP, CN = q.c, DN = q.d, RE = ptX3Reach();
  c = Math.max(CN[0], Math.min(CN[CN.length - 1], c));
  let i = 0; while (i < CN.length - 2 && c > CN[i + 1]) i++;
  const fc = (c - CN[i]) / (CN[i + 1] - CN[i]);
  const dmax = Math.min(RE[i] + (RE[i + 1] - RE[i]) * fc - q.reachMargin,
                        DN[DN.length - 1]);
  return Math.max(DN[0], Math.min(dmax, D));
}
function ptCurveSetupLookupDeg(c, D) {
  const q = PT_CURVE_SETUP, CN = q.c, DN = q.d, DG = ptX3Deg();
  D = ptCurveClampDist(c, D);
  c = Math.max(CN[0], Math.min(CN[CN.length - 1], c));
  let i = 0; while (i < CN.length - 2 && c > CN[i + 1]) i++;
  const fc = (c - CN[i]) / (CN[i + 1] - CN[i]);
  let j = 0; while (j < DN.length - 2 && D > DN[j + 1]) j++;
  const fd = (D - DN[j]) / (DN[j + 1] - DN[j]);
  const a = DG[i][j] + (DG[i][j + 1] - DG[i][j]) * fd;
  const b = DG[i + 1][j] + (DG[i + 1][j + 1] - DG[i + 1][j]) * fd;
  return a + (b - a) * fc;
}
// SANDBOX-ONLY preview target: the Single Player Test has no genuine target
// intent (its legacy per-key D is NOT player aim), so for visualization the
// preview target is the launch's natural first-ground carry, capped. This
// synthetic value exists ONLY because the sandbox lacks target input — real
// match gameplay must use the engine's authoritative dist(ball, target).
function ptCurveNaturalRange(v0, vz) {
  let z = 0, d = 0, h = v0, w = vz;
  for (let i = 0; i < 60 * 6; i++) {   // same 60Hz Euler order as the flight
    d += h * PT_DT; z += w * PT_DT;
    if (z > 0) w -= PT.G * PT_DT;
    if (i > 2 && z <= 0) break;
    h = Math.max(0, h - (z > 0.05 ? PT.MU_AIR : PT.MU_ROLL) * PT_DT);
    if (h < 0.3) break;
  }
  return d;
}
// ═══ GOAL FRAME V1 CANDIDATES (review-gated: BOTH FLAGS DEFAULT OFF — with
// them off, rendering and physics are byte-identical to the committed
// baseline 96c7b67). Toggle from the console for live review:
//   GOALFX.occlusion = true   depth-correct goal-frame layering
//   GOALFX.collision = true   rigid swept post/crossbar collision
// ────────────────────────────────────────────────────────────────────────────
// Authoritative frame geometry (shared by BOTH parts, matching the drawn
// frame exactly): mouth plane x = 0 / 105; posts at y 30.34 / 37.66 rising
// z 0..2.44; crossbar along y at z 2.44. Members are 0.12 m round stock
// (frameR 0.06) — the same width drawGoalFrame strokes.
const GOALFX = {
  occlusion: true,       // PART A — depth-correct goal-frame/net/actor ordering
  collision: true,       // PART B — rigid swept post/crossbar collision
  frameR: 0.06,          // member radius (m) — drawn width 0.12
  ballR: 0.11,           // physical ball radius (world/NETPHYS authoritative)
  e: 0.72,               // FINAL frame restitution (F2; hard/lively, < grass 0.55 adds no energy)
  keepT: 0.95,           // tangential keep on frame contact (hard, low-friction)
  spinKeep: 0.8,         // curve spin retained through a frame hit
  // net depth patches [yLo, yHi, sortY]: far side wall / back thirds / near
  // side wall — segments classified by CURRENT deformed y each frame
  // sortY of each patch sits just BEHIND its co-located frame member so the
  // rigid mouth-plane frame (front edge of the whole net region) always wins
  // over the net at the same screen column, while ball<->net ordering by y is
  // preserved (shifts are < the ball-vs-net margins). Far band is pushed
  // fully behind the far post (30.34) to stop it shredding the post.
  netBands: [[-1e9, 31.2, 30.2], [31.2, 33.0, 32.0], [33.0, 34.9, 33.85],
             [34.9, 36.8, 35.75], [36.8, 1e9, 37.4]],
  artBands: [[-1e9, 32.8, 31.5], [32.8, 35.2, 34.0], [35.2, 1e9, 36.9]],
};
// synthetic frame-impact battery (key N cycles + fires; identical setups so
// restitution candidates compare on the same impacts) — review tooling only
const GOALFX_TESTS = [
  { name: "SQUARE POST",        p: [98, 37.66, 0.3],  v: [24, 0, 1.5] },
  { name: "INSIDE-POST GLANCE", p: [98, 37.42, 0.3],  v: [24, 0.6, 1.5] },
  { name: "OUTSIDE-POST GLANCE",p: [98, 37.90, 0.3],  v: [24, -0.6, 1.5] },
  { name: "CENTRAL CROSSBAR",   p: [100, 34, 2.20],   v: [24, 0, 2.17] },
  { name: "UNDERSIDE CROSSBAR", p: [100, 34, 2.05],   v: [24, 0, 2.22] },
  { name: "POWER 31 m/s POST",  p: [92, 37.66, 1.0],  v: [31, 0, 0] },
];
function ptFrameTestFire(t) {
  t.frameTestIdx = ((t.frameTestIdx ?? -1) + 1) % GOALFX_TESTS.length;
  const c = GOALFX_TESTS[t.frameTestIdx];
  const b = t.b;
  t.p.x = 92; t.p.y = 28; t.p.vx = 0; t.p.vy = 0;   // park clear of the flight
  b.x = c.p[0]; b.y = c.p[1]; b.z = c.p[2];
  b.vx = c.v[0]; b.vy = c.v[1]; b.vz = c.v[2];
  b.ctrl = false; b.exclT = t.now + 5; b.curve = null; b.frameHit = null;
  t.kick = null; t.net = null;
  t.last = "FRAME TEST " + (t.frameTestIdx + 1) + "/6: " + c.name;
}
// swept sphere (ball centre, radius ballR) vs capsule (axis A->B, frameR):
// earliest time-of-impact in [0,1] along the step displacement, or null.
// Expanded-radius formulation: point vs capsule of radius frameR+ballR.
function goalCapsuleTOI(p0, d, A, B, R) {
  const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const ao = [p0[0] - A[0], p0[1] - A[1], p0[2] - A[2]];
  const abd = ab[0] * d[0] + ab[1] * d[1] + ab[2] * d[2];
  const abo = ab[0] * ao[0] + ab[1] * ao[1] + ab[2] * ao[2];
  const ab2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  // infinite-cylinder part: components perpendicular to the axis
  const dp = [d[0] - ab[0] * abd / ab2, d[1] - ab[1] * abd / ab2, d[2] - ab[2] * abd / ab2];
  const op = [ao[0] - ab[0] * abo / ab2, ao[1] - ab[1] * abo / ab2, ao[2] - ab[2] * abo / ab2];
  const a = dp[0] * dp[0] + dp[1] * dp[1] + dp[2] * dp[2];
  const bq = 2 * (dp[0] * op[0] + dp[1] * op[1] + dp[2] * op[2]);
  const c = op[0] * op[0] + op[1] * op[1] + op[2] * op[2] - R * R;
  let best = null;
  if (a > 1e-12) {
    const disc = bq * bq - 4 * a * c;
    if (disc >= 0) {
      const t = (-bq - Math.sqrt(disc)) / (2 * a);
      if (t >= 0 && t <= 1) {
        const s = (abo + abd * t) / ab2;             // axis parameter at contact
        if (s >= 0 && s <= 1) best = { t, s };
      }
    }
  }
  // end caps (spheres at A and B) — also the post/crossbar junction knobs
  for (const [C, sc] of [[A, 0], [B, 1]]) {
    const co = [p0[0] - C[0], p0[1] - C[1], p0[2] - C[2]];
    const aa = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    if (aa < 1e-12) continue;
    const bb = 2 * (d[0] * co[0] + d[1] * co[1] + d[2] * co[2]);
    const cc = co[0] * co[0] + co[1] * co[1] + co[2] * co[2] - R * R;
    const disc = bb * bb - 4 * aa * cc;
    if (disc < 0) continue;
    const t = (-bb - Math.sqrt(disc)) / (2 * aa);
    if (t >= 0 && t <= 1 && (best === null || t < best.t)) best = { t, s: sc };
  }
  if (!best) return null;
  const cp = [p0[0] + d[0] * best.t, p0[1] + d[1] * best.t, p0[2] + d[2] * best.t];
  const ax = [A[0] + ab[0] * best.s, A[1] + ab[1] * best.s, A[2] + ab[2] * best.s];
  const nl = Math.hypot(cp[0] - ax[0], cp[1] - ax[1], cp[2] - ax[2]) || 1e-9;
  return { t: best.t, n: [(cp[0] - ax[0]) / nl, (cp[1] - ax[1]) / nl, (cp[2] - ax[2]) / nl],
           point: [ax[0] + (cp[0] - ax[0]) * (GOALFX.frameR / (GOALFX.frameR + GOALFX.ballR)) / 1,
                   ax[1], ax[2]], axisPt: ax };
}
function goalFrameCapsules() {
  const caps = [];
  for (const gx of [0, 105]) {
    caps.push({ name: (gx ? "R" : "L") + "-farPost", A: [gx, 30.34, 0], B: [gx, 30.34, 2.44] });
    caps.push({ name: (gx ? "R" : "L") + "-nearPost", A: [gx, 37.66, 0], B: [gx, 37.66, 2.44] });
    caps.push({ name: (gx ? "R" : "L") + "-crossbar", A: [gx, 30.34, 2.44], B: [gx, 37.66, 2.44] });
  }
  return caps;
}
const GOAL_CAPSULES = goalFrameCapsules();
// PART B step: advance the free ball over PT_DT with continuous collision
// against the six frame capsules. Earliest TOI wins; velocity resolves into
// normal (reversed by restitution e) + tangential (keepT) about the LOCAL
// surface normal — every outcome (rebound out, deflect in, drop under the
// bar) emerges from geometry, never from scripted cases. Deterministic.
function ptGoalFrameStep(b, dt) {
  let rem = dt != null ? dt : PT_DT;
  for (let iter = 0; iter < 3 && rem > 1e-9; iter++) {
    const p0 = [b.x, b.y, b.z];
    const d = [b.vx * rem, b.vy * rem, b.vz * rem];
    const R = GOALFX.frameR + GOALFX.ballR;
    let hit = null, hc = null;
    for (const cap of GOAL_CAPSULES) {
      const h = goalCapsuleTOI(p0, d, cap.A, cap.B, R);
      if (h && (hit === null || h.t < hit.t)) { hit = h; hc = cap; }
    }
    if (!hit) { b.x += d[0]; b.y += d[1]; b.z += d[2]; return; }
    // advance to contact, resolve, continue the remainder of the step
    b.x = p0[0] + d[0] * hit.t + hit.n[0] * 1e-4;
    b.y = p0[1] + d[1] * hit.t + hit.n[1] * 1e-4;
    b.z = p0[2] + d[2] * hit.t + hit.n[2] * 1e-4;
    const n = hit.n;
    const vn = b.vx * n[0] + b.vy * n[1] + b.vz * n[2];
    if (vn < 0) {
      const vIn = [b.vx, b.vy, b.vz];
      const vt = [b.vx - vn * n[0], b.vy - vn * n[1], b.vz - vn * n[2]];
      b.vx = vt[0] * GOALFX.keepT - GOALFX.e * vn * n[0];
      b.vy = vt[1] * GOALFX.keepT - GOALFX.e * vn * n[1];
      b.vz = vt[2] * GOALFX.keepT - GOALFX.e * vn * n[2];
      if (b.curve) b.curve.s *= GOALFX.spinKeep;
      b.frameHit = { cap: hc.name, t: S.pt ? S.pt.now : 0,
                     point: [b.x - n[0] * GOALFX.ballR, b.y - n[1] * GOALFX.ballR, b.z - n[2] * GOALFX.ballR],
                     n: n.slice(), vIn, vnIn: vn, vOut: [b.vx, b.vy, b.vz] };
    }
    rem *= (1 - hit.t);
  }
}
function ptFam(fam, D) {          // world.py FAM launch families (port)
  const c = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  if (fam === "SHORT") return [c(Math.sqrt(2 * PT.MU_ROLL * D + 6.5 * 6.5), 8, 19), 0];
  if (fam === "DRIVEN") return [c(Math.sqrt(2 * PT.MU_ROLL * D + 7.0 * 7.0), 14, 26), 0];
  if (fam === "LOFT") { const T = c(D / 16, 0.8, 2.2); return [D / T, PT.G * T / 2]; }
  if (fam === "CLEAR") { const T = c(D / 11, 1.2, 2.6); return [D / T, PT.G * T / 2 * 1.15]; }
  return [c(24 + D * 0.3, 24, 31), c(0.5 + D * 0.06, 0.5, 2.2)];   // SHOT
}
function ptReset() {
  const t = S.pt;
  t.now = 0;
  t.p = { x: 76.0, y: 34.0, vx: 0, vy: 0, facing: 0, touchT: 0 };
  t.b = { x: 76.8, y: 34.0, z: 0, vx: 0, vy: 0, vz: 0, ctrl: true, exclT: 0 };
  t.ctrlSince = 0;
  t.shoot = null; t.kick = null; t.kickLog = t.kickLog || []; t.net = null; t.touchN = 0;
  t.pfoot = t.pfoot || "R";
  t.dribT = 0; t.dribF0 = 0;
  t.last = "RESET";
  t.gk = ptGkMake();               // Goalkeeper V1 entity (always present in the playtest)
  t.gkScenario = null;             // null = free play (not in a shot scenario)
  t.gkStudy = null;                // positioning-study mode off
  t.gkStudyIdx = t.gkStudyIdx != null ? t.gkStudyIdx : null;
  t.gkPos = t.gkPos != null ? t.gkPos : GK_CFG.attrs.gk_positioning;  // live gk_positioning (persists across resets)
  // CAPABILITY — K1 is the REFERENCE V1 keeper (item A). K1/K2/K3 bands OWN the
  // four physical attrs; "manual" keeps per-attr overrides. Default = K1, and a
  // band re-asserts its attrs every reset so capability is never silently buffed.
  t.gkCap = t.gkCap || "K1";
  if (GK_CAP[t.gkCap]) {                                                     // a band drives reflexes/diving/height/jump
    const cap = GK_CAP[t.gkCap];
    t.gkReflex = cap.reflex; t.gkDiving = cap.diving; t.gkHeight = cap.height; t.gkJump = cap.jump;
    t.gkHandling = cap.handling;                                             // Stage 4: post-contact control only
    // A profile MAY also carry physical/movement attributes (weight, acceleration, sprint speed, strength).
    // A band that does not define them CLEARS the overrides, so K1/K2/K3 read the unchanged GK_CFG reference
    // values exactly as before. This selects which numbers are read; no mechanism changes.
    t.gkWeight = cap.weight != null ? cap.weight : null;
    t.gkAccel = cap.acceleration != null ? cap.acceleration : null;
    t.gkSpeed = cap.sprint_speed != null ? cap.sprint_speed : null;
    t.gkStrength = cap.strength != null ? cap.strength : null;
  } else {                                                                   // manual: persist per-attr values
    t.gkReflex = t.gkReflex != null ? t.gkReflex : GK_CFG.attrs.gk_reflexes;
    t.gkDiving = t.gkDiving != null ? t.gkDiving : GK_CFG.attrs.gk_diving;
    t.gkHeight = t.gkHeight != null ? t.gkHeight : GK_CFG.height_m * 100;
    t.gkJump = t.gkJump != null ? t.gkJump : GK_CFG.attrs.jumping;
    t.gkHandling = t.gkHandling != null ? t.gkHandling : GK_CFG.attrs.gk_handling;
  }
  t.pauseAtContact = !!t.pauseAtContact;                                   // Stage-4 review aid (key V)
  t.gkMomentum = t.gkMomentum != null ? t.gkMomentum : "SET";               // wrong-way study preset
  t.gkPosCand = t.gkPosCand || "P4";                                        // legacy 1D depth family (P4 = chosen baseline for the 2D surface)
  t.gkDepth = GK_DEPTH_CANDS[t.gkPosCand];
  t.gkPosQ = t.gkPosQ || "Q25";                                            // aperture positioning candidate (Q2.5 = user's preferred)
  t.gkHand = t.gkHand || "H4";                                             // hand-contact volume (H4 = smaller anatomical palm)
  t.gkMovePolicy = t.gkMovePolicy || "M6";                                  // READ→PREPARE→COMMIT (M6 default); M2..M5 kept for comparison
  for (const g of S.goalPanels || []) if (g.net) g.net._ptV2 = false;   // hand nets back to netPhysUpdate
}
function ptEnter() {
  S._ptPrevCam = { mode: RIG.mode, zoom: RIG.zoomTarget, mx: RIG.manualX };
  S.pb.playing = false;
  RIG.mode = "manual"; RIG.manualX = 88; RIG.x = 88; RIG.targetX = 88;
  RIG.zoom = 1.25; RIG.zoomTarget = 1.25;
  S.pt = { on: true, keys: {} };
  ptReset();
  const btn = document.getElementById("ptbtn");
  if (btn) { btn.textContent = "Exit Single Player Test"; btn.style.background = "#8a2a2a"; btn.style.borderColor = "#b34b4b"; }
}
function ptExit() {
  if (S._ptPrevCam) {
    RIG.mode = S._ptPrevCam.mode; RIG.zoomTarget = S._ptPrevCam.zoom;
    RIG.manualX = S._ptPrevCam.mx;
  }
  S.pt = null;
  const btn = document.getElementById("ptbtn");
  if (btn) { btn.textContent = "Single Player Test"; btn.style.background = "#1d7a3d"; btn.style.borderColor = "#2fa35a"; }
}

// ══════════════════ GOALKEEPER V1 — STAGE 0 (harness + skeleton) ═══════════
// Deterministic JS goalkeeper prototype (checkpoint0 2a5ebfc baseline). STAGE 0
// builds ONLY the keeper entity, a placeholder diagnostic drawing, and a
// deterministic scenario harness that fires the SAME authoritative shots normal
// play uses. There is NO save/positioning/reaction/dive/catch logic yet, and the
// keeper NEVER touches the ball — the ball is byte-identical to the approved
// build whether or not the keeper exists. RNG-free by design.
const GK_CFG = {
  // One calibration block. TEMPORARY/REFERENCE values, clearly named. Stage 0
  // reads ONLY the geometry/position/size fields to place & draw the keeper.
  // The reaction/dive/reach-action fields are DEFINED for the later stages'
  // architecture but are NOT read by any Stage-0 logic.
  defendGoalX: 105,           // right-goal mouth plane (playtest shoots toward +x)
  goalCenterY: 34,            // mouth centre (posts at y 30.34 / 37.66)
  setDepth: 0.6,              // metres the keeper sets OFF his goal line
  // physical body / reach geometry (metres) — used by Stage 0 for drawing/size
  height_m: 1.88,             // stature (188 cm ref; matches engine GK reference)
  bodyR: 0.32,                // torso disc radius (matches world.py BODY_R)
  handReachFrac: 0.78,        // reach-origin (shoulder/hands) height = height*frac
  standingReachZ: 2.55,       // fingertip ceiling standing, arm up
  armSpan: 0.72,              // shoulder→fingertip, one arm
  restHandSpread: 0.35,       // resting half-spread of the hands (world-y), drawing
  // ── reserved for LATER stages (defined here, NOT used in Stage 0) ──
  reachLateral: 1.6,          // GK_REACH: max standing lateral hand reach
  diveSpan: 2.9,              // max full-stretch dive span
  diveSpeed: 6.8,             // dive hand-extension speed (m/s)
  reactionBase: 0.30,         // perception latency base (s)
  reactionReflexGain: 0.18,   // reflexes reduction of latency (s)
  footworkSpeed: 4.5,         // set/shuffle speed (m/s)
  coastDamp: 3.0,             // Stage-0 velocity coast decay (presentation only)
  // reference attributes (0..99) for the keeper, all in one place
  attrs: { gk_positioning: 72, gk_reflexes: 74, gk_diving: 70, gk_handling: 71,
           jumping: 74, strength: 72, acceleration: 68, sprint_speed: 62, agility: 73 },
};
// ── Stage 1 positioning calibration (named; separated responsibilities) ──
const GK_MOUTH = { lineX: 105, centerY: 34, postA: 30.34, postB: 37.66, yMargin: 0.2 };
const GK_DEPTH = {
  minDepth: 0.5,   // never hug the exact line for every ball
  maxDepth: 3.2,   // most aggressive standoff when the ball is close
  closeDist: 6.0,  // ball-to-goal distance mapped to maxDepth
  farDist: 30.0,   // ball-to-goal distance mapped to minDepth
  naiveDepth: 0.9, // shallow reference depth a POORLY-positioned keeper uses
};
// PART D — three positioning-DEPTH candidates for live comparison (you choose).
// Position is still DERIVED from ball+goal geometry (angle bisector); only the
// depth-off-line curve differs. Six-yard/small-box line ≈ 5.5 m (reference only).
const GK_DEPTH_CANDS = {
  P1: { minDepth: 0.5, maxDepth: 3.2, closeDist: 6.0, farDist: 30.0, naiveDepth: 0.9 },  // CURRENT
  P2: { minDepth: 1.3, maxDepth: 4.3, closeDist: 6.0, farDist: 32.0, naiveDepth: 1.1 },  // MODERATELY ADVANCED
  P3: { minDepth: 2.2, maxDepth: 5.5, closeDist: 8.0, farDist: 34.0, naiveDepth: 1.6 },  // AGGRESSIVE / FC-like
  P4: { minDepth: 3.2, maxDepth: 7.0, closeDist: 9.0, farDist: 36.0, naiveDepth: 2.2 },  // ADVANCED (more assertive angle-closing)
  P5: { minDepth: 4.5, maxDepth: 9.0, closeDist: 11.0, farDist: 38.0, naiveDepth: 3.0 }, // VERY ADVANCED / STRESS (toward/past six-yard where geometry allows)
};
// PART E — three keeper CAPABILITY bands via existing causal attributes (no hidden
// save modifier). reflexes->reaction, diving->reach span, height/jump->vertical reach.
// Stage 4 adds `handling` (gk_handling) to each band: it acts ONLY after a physical contact
// (catch security / parry control) and never on reach, reaction, positioning or movement.
// ── KEEPER PROFILES (continuous-attribute pass, 2026-09-05). Every entry is a plain bundle of individual 1–99 attributes
// plus physical metadata; the goalkeeper mechanics read ONLY these numbers through the same accessors every keeper uses.
// A profile NAME has no mechanical meaning anywhere (K1/K2/K3 are debug fixtures kept for continuity; K1 is the weak-
// keeper calibration anchor). Previously K1/K2/K3 listed only reflex/diving/height/jump/handling and silently inherited
// acceleration 68 / sprint 62 / strength 72 / 80 kg from GK_CFG.attrs — those values are now written out explicitly
// (behaviour identical). There is no OVR field on any engine profile.
const GK_CAP = {
  K1: { reflex: 45, diving: 45, height: 183, jump: 48, handling: 45, weight: 80, acceleration: 68, sprint_speed: 62, strength: 72 },   // weak-keeper ANCHOR fixture (= POOR)
  K2: { reflex: 72, diving: 72, height: 190, jump: 72, handling: 72, weight: 80, acceleration: 68, sprint_speed: 62, strength: 72 },   // debug fixture
  K3: { reflex: 92, diving: 92, height: 197, jump: 92, handling: 92, weight: 80, acceleration: 68, sprint_speed: 62, strength: 72 },   // debug fixture
  // tier-free reference fixtures (conceptual ~60 / ~70 / ~80 / ~90+, labels only — attributes are all the engine sees)
  POOR:    { reflex: 45, diving: 45, height: 183, jump: 48, handling: 45, weight: 80, acceleration: 68, sprint_speed: 62, strength: 72 },
  AVERAGE: { reflex: 68, diving: 68, height: 188, jump: 66, handling: 68, weight: 83, acceleration: 70, sprint_speed: 63, strength: 73 },
  GOOD:    { reflex: 78, diving: 78, height: 190, jump: 74, handling: 78, weight: 85, acceleration: 72, sprint_speed: 64, strength: 74 },
  ELITE:   { reflex: 90, diving: 90, height: 192, jump: 82, handling: 90, weight: 88, acceleration: 74, sprint_speed: 65, strength: 76 },
  // DIAGNOSTIC / REVIEW ONLY — Thibaut Courtois as a REAL-PLAYER PHYSICAL PROFILE on OUR attribute scale.
  // Ratings source: this simulator's own player database (simulator/data/players.json, player p001) — NOT EA
  // FC 26. Physical metadata (height/weight) is his real stature from the same record. There is no OVR term
  // in goalkeeper execution (`ovr` is descriptive metadata read by nothing), no name check, no multiplier:
  // the engine sees only the same 1–99 attributes every keeper has.
  //   consumed here: gk_reflexes 96, gk_diving 91, gk_handling 95, jumping 68, height 199, weight 96,
  //                  acceleration 42, sprint_speed 52, strength 70
  //   in the record but NOT consumed by Goalkeeper V1: reactions 94, agility 63, gk_kicking 82, balance 45,
  //                  composure 66, stamina 38. gk_positioning 94 is carried as metadata but HELD at the band
  //                  value (72) so a profile change never moves the D2 SET geometry.
  COURTOIS: { reflex: 96, diving: 91, height: 199, jump: 68, handling: 95,
              weight: 96, acceleration: 42, sprint_speed: 52, strength: 70,
              positioning: 94, reactions: 94, agility: 63, source: "simulator/data/players.json p001 (OVR 93 in the record; not carried here, never read)" },
};
// ── Q positioning candidates: 2D aperture-based surface around P4 depth ──────
// Position solves depth AND lateral TOGETHER on the ball->near/far-post aperture,
// ── FIRST-PRINCIPLES aperture positioning (items E–G) ───────────────────────
// OBJECTIVE (item G): minimise the LARGEST remaining open scoring window. For a
// fixed keeper coverage width the minimise-max solution is the ANGULAR BISECTOR of
// the ball→near-post and ball→far-post rays (equal windows either side). A near-post
// bias rotates the aim toward the near post, but it FADES to zero (a) at the centre
// (continuity) and (b) at acute angles (invariant F: never hug the near post and
// throw the whole far side open). depthCand = P4-family base; angleAdvance deepens
// the position at wider angles to cut the aperture. bias here is a FRACTION of the
// half-aperture (0 = pure bisector, 1 = aim right at the near post).
const GK_Q = {
  Q1:  { bias: 0.00, depthCand: "P4", angleAdvance: 0.6,  name: "pure bisector (min-max)" },
  Q2:  { bias: 0.18, depthCand: "P4", angleAdvance: 1.2,  name: "balanced (slight near-post)" },
  // Q2.5 — PARAMETER interpolation 65% of the way from Q2 toward Q3 (item 2). Interpolating
  // the underlying bias/angle-advance keeps the surface geometry-derived & continuous.
  Q25: { bias: 0.27, depthCand: "P4", angleAdvance: 1.85, name: "Q2→Q3 65% (preferred)" },
  Q3:  { bias: 0.32, depthCand: "P4", angleAdvance: 2.2,  name: "near-post protective" },
  Q4:  { bias: 0.45, depthCand: "P4", angleAdvance: 3.4,  name: "aggressive near-post (stress)" },
};
// K1 static coverage half-width (m): body radius + set arm reach the keeper
// GUARANTEES from a position without diving (0.32 + 0.75 == GK_CFG.bodyR +
// GK_REACH.standingArm). Used to project coverage into the aperture (item G).
const GK_COVER_HALF = GK_CFG.bodyR + 0.75;
function gkAperture(bx, by) {
  const M = GK_MOUTH;
  const nearY = by >= M.centerY ? M.postB : M.postA;   // near post = ball's side
  const farY = by >= M.centerY ? M.postA : M.postB;
  const aN = Math.atan2(nearY - by, M.lineX - bx), aF = Math.atan2(farY - by, M.lineX - bx);
  return { nearY, farY, aN, aF, bis: (aN + aF) / 2, half: Math.abs(aF - aN) / 2, aperture: Math.abs(aF - aN) };
}
// remaining OPEN angular windows (radians) either side of the keeper's projected
// coverage, given a keeper centre. near/far named by the ball's side. Pure geometry
// (item E/G) — no save probability. coverHalf defaults to the K1 static block.
function gkCoverageWindows(bx, by, kx, ky, coverHalf) {
  const ap = gkAperture(bx, by), ch = coverHalf != null ? coverHalf : GK_COVER_HALF;
  const aK = Math.atan2(ky - by, kx - bx);
  const dist = Math.hypot(kx - bx, ky - by) || 1e-6;
  const dA = Math.asin(Math.max(0, Math.min(1, ch / dist)));    // half-angle the keeper subtends
  const lo = Math.min(ap.aN, ap.aF), hi = Math.max(ap.aN, ap.aF);
  const cLo = Math.max(lo, aK - dA), cHi = Math.min(hi, aK + dA);   // covered ∩ aperture
  const nearIsHi = ap.aN >= ap.aF;                                  // which end is the near post
  const winTowardN = nearIsHi ? Math.max(0, hi - cHi) : Math.max(0, cLo - lo);
  const winTowardF = nearIsHi ? Math.max(0, cLo - lo) : Math.max(0, hi - cHi);
  return { nearWin: winTowardN, farWin: winTowardF, aperture: hi - lo, aK, dA,
           largest: Math.max(winTowardN, winTowardF) };
}
// ═══ GK POSITIONING V2 — "FC-inspired" DISTANCE × ANGLE SURFACE (review A/B vs Q2.5) ═══
// Solves depth and lateral TOGETHER from goal geometry instead of "depth = f(distance),
// lateral = aperture correction". Three geometric quantities do all the work:
//
//   1. APERTURE BISECTOR  — the angle bisector of the ball→nearPost / ball→farPost rays
//      (unchanged production helper gkAperture). The keeper always stands ON this ray, so
//      he covers the two shooting windows equally; the bisector is naturally near-post
//      biased for wide balls (angle-bisector theorem), which is where the lateral shift
//      toward the near post comes from — no authored near-post bonus.
//   2. CENTRAL DEPTH CURVE — how far off the line the keeper may come when the ball is
//      dead central. This is the UNCHANGED production P4 curve, so central feel is preserved.
//   3. TWO GEOMETRIC CEILINGS that cut that depth down as the angle sharpens:
//        a) APERTURE RATIO: the ball's real aperture divided by the aperture a central ball
//           would see at the same distance, raised to angleExp. Continuous, symmetric, 1.0
//           dead centre, falling monotonically with angle.
//        b) MOUTH CORRIDOR: advancing along an oblique bisector walks the keeper sideways;
//           he may only advance as far as the point where the bisector ray leaves the
//           goal-mouth corridor (the 7.32 m band in front of the goal, minus a body margin).
//           This is what produces the near-post "retreat" at acute angles and the U-shaped
//           family of positions — it is pure geometry, not a tuned angle table.
//   plus  c) BALL CEILING: never advance past the ball's own distance from the goal line.
//
// Depth peaks centrally and falls to ~0 as the ball approaches the goal line, so the family
// of set positions traces a shallow bowl around the mouth. Post-shot behaviour (SHOT/READ/
// PREPARE/COMMIT/SAVE, M6), reach, reaction and every other keeper system are untouched.
const GK_POS_FC = {
  angleExp: 1.5,       // aperture-ratio exponent: how quickly angle suppresses depth (1 = linear in aperture)
  bodyMargin: 0.30,    // the keeper's set position stays this far inside the posts (m)
  ballMargin: 1.20,    // never closer to the goal line than (ball's distance from the line) − this (m)
  minDepth: 0.40,      // never stand exactly on the line (m)
  maxDepth: 7.00,      // absolute ceiling (m) — the P4 family's own maximum
};
const GK_POSMODEL = { active: "NEW", order: ["NEW", "OLD"],   // NEW = PRODUCTION (approved 2026-09-04); OLD = Q2.5 review control
  label: { NEW: "NEW FC distance×angle surface (PRODUCTION)", OLD: "OLD Q2.5 (control)" } };
// ── NORMAL SET DEPTH candidates (review A/B/C/D, key "="). These change ONLY the CENTRAL depth
// the surface is allowed to reach; the approved geometry (aperture bisector, aperture-ratio
// suppression, mouth-corridor ceiling, ball ceiling, lateral solution) transforms this baseline
// unchanged, so the U shape is identical for every candidate. This is the ordinary shot-stopping
// SET position — a 1v1 close/rush is a separate future decision state and is NOT implemented here.
//   D0  the inherited P4 line: 7.0 → 3.2 m, LINEAR over 9…36 m (kept as the aggressive control)
//   D1/D2/D3  one smooth curve, depth = dNear + (dFar − dNear)·smoothstep((d − nearD)/(farD − nearD)),
//             flat at both ends, steepest in mid-range, and it PLATEAUS inside 8 m instead of
//             exploding, so a close attacker does not become an automatic rush.
const GK_SETDEPTH = {
  active: "D2", order: ["D0", "D1", "D2", "D3"],
  nearD: 8.0, farD: 30.0,                       // smoothstep span for D1..D3 (m from the goal centre)
  cands: {
    D0: { label: "D0 LEGACY P4 line (control)", p4: "P4" },
    D1: { label: "D1 CONSERVATIVE",           dNear: 3.30, dFar: 1.55 },
    D2: { label: "D2 BALANCED (PRODUCTION)",  dNear: 3.90, dFar: 2.05 },   // approved normal-SET baseline (2026-09-04)
    D3: { label: "D3 MODERATELY AGGRESSIVE",  dNear: 4.45, dFar: 2.50 },
  },
};
function gkCentralDepth(ballDist) {
  const c = GK_SETDEPTH.cands[GK_SETDEPTH.active] || GK_SETDEPTH.cands.D2;
  if (c.p4) {                                    // D0: the inherited linear P4 curve, unchanged
    const D = GK_DEPTH_CANDS[c.p4] || GK_DEPTH_CANDS.P4;
    const f = Math.max(0, Math.min(1, (ballDist - D.closeDist) / (D.farDist - D.closeDist)));
    return D.maxDepth + (D.minDepth - D.maxDepth) * f;
  }
  const u = Math.max(0, Math.min(1, (ballDist - GK_SETDEPTH.nearD) / (GK_SETDEPTH.farD - GK_SETDEPTH.nearD)));
  return c.dNear + (c.dFar - c.dNear) * (u * u * (3 - 2 * u));
}
// depth the bisector ray can reach before it leaves the goal-mouth corridor (m off the line)
function gkCorridorCeiling(bx, by, aim) {
  const M = GK_MOUTH, edge = (by >= M.centerY ? M.postB - GK_POS_FC.bodyMargin : M.postA + GK_POS_FC.bodyMargin);
  const ux = Math.cos(aim), uy = Math.sin(aim);
  if (Math.abs(uy) < 1e-6 || Math.abs(ux) < 1e-6) return Infinity;   // perpendicular ray: never leaves
  const t = (edge - by) / uy;                                        // ray parameter at the corridor edge
  if (t <= 0) return Infinity;                                       // moving away from that edge
  const xEdge = bx + ux * t;
  return M.lineX - xEdge;                                            // depth (off the line) at that point
}
function gkDesiredFC(bx, by, q) {
  const M = GK_MOUTH, cx = M.lineX, P = GK_POS_FC;
  const ap = gkAperture(bx, by);
  const half = (M.postB - M.postA) / 2;
  // 2 — central depth for this ball distance (NORMAL SET depth candidate, key "=")
  const ballDist = Math.hypot(cx - bx, by - M.centerY);
  const dCentral = gkCentralDepth(ballDist);
  // 3a — aperture ratio: how much of a central ball's view this ball still has
  const apCentral = 2 * Math.atan2(half, Math.max(0.5, ballDist));
  const ratio = Math.max(0, Math.min(1, ap.aperture / Math.max(1e-6, apCentral)));
  let depth = dCentral * Math.pow(ratio, P.angleExp);
  // 3b/3c — geometric ceilings: the mouth corridor and the ball's own distance
  depth = Math.min(depth, gkCorridorCeiling(bx, by, ap.bis), (cx - bx) - P.ballMargin, P.maxDepth);
  depth = Math.max(P.minDepth, depth);
  // 1 — stand on the aperture bisector at that depth
  const ux = Math.cos(ap.bis);
  const L = Math.abs(ux) > 1e-4 ? (cx - depth - bx) / ux : 0;
  let kx = cx - depth, ky = by + Math.sin(ap.bis) * L;
  // gk_positioning attribute: a poor keeper degrades toward the naive ball→centre line
  const ncx = (cx - bx) || 1e-3, Ln = (cx - depth - bx) / ncx, ny = by + (M.centerY - by) * Ln;
  ky = ny + (ky - ny) * q;
  // hard invariant: the set position never leaves the mouth corridor
  ky = Math.max(M.postA + P.bodyMargin, Math.min(M.postB - P.bodyMargin, ky));
  return [kx, ky];
}
function gkDesiredQ(bx, by, q, Qc) {
  const M = GK_MOUTH, cx = M.lineX, ap = gkAperture(bx, by);
  // aim ANGLE starts on the bisector (equal-window optimum), then a near-post bias
  // that fades to zero at the centre (continuity) and at acute angles (invariant F).
  const wCentre = Math.min(1, Math.abs(by - M.centerY) / 6.0);
  const wAcute = Math.min(1, ap.half / (12 * Math.PI / 180));       // fade bias below ~12° half-aperture (acute)
  const nearDir = Math.sign(ap.aN - ap.bis) || 0;                   // bisector → near post direction
  const biasFrac = Qc.bias * wCentre * wAcute;
  const aim = ap.bis + nearDir * biasFrac * ap.half;
  // depth: P4 family + angle-advance (deeper/more advanced at wider angles)
  const D = GK_DEPTH_CANDS[Qc.depthCand] || GK_DEPTH_CANDS.P4;
  const ballDist = Math.hypot(cx - bx, by - M.centerY);
  const f = Math.max(0, Math.min(1, (ballDist - D.closeDist) / (D.farDist - D.closeDist)));
  let depth = D.maxDepth + (D.minDepth - D.maxDepth) * f;
  depth += Qc.angleAdvance * Math.min(1, Math.abs(by - M.centerY) / 18);
  depth = Math.max(D.minDepth, Math.min(D.maxDepth + Qc.angleAdvance, depth));
  // keeper on the ball→aim RAY at horizontal depth (x = cx − depth)
  const ux = Math.cos(aim);
  const L = Math.abs(ux) > 1e-4 ? (cx - depth - bx) / ux : 0;
  let kx = cx - depth, ky = by + Math.sin(aim) * L;
  // low-q keeper degrades toward the naive ball→centre line (causal, no RNG)
  const ncx = (cx - bx) || 1e-3, Ln = (cx - depth - bx) / ncx, ny = by + (M.centerY - by) * Ln;
  ky = ny + (ky - ny) * q;
  // ── INVARIANTS (item F) ────────────────────────────────────────────────────
  // (1) keeper stays in a sensible region in front of goal (depth band);
  kx = Math.max(cx - (D.maxDepth + Qc.angleAdvance), Math.min(cx - D.minDepth, kx));
  // (2) keeper cannot drift OUTSIDE the shooter's useful post-to-post aperture at
  //     the keeper's depth, and never past a post (no abandoning goal). Project the
  //     ball→post rays to the keeper plane and clamp ky between them (+ small body margin).
  const projPost = (postY) => by + (postY - by) * ((cx - depth - bx) / ((cx - bx) || 1e-3));
  const pAy = projPost(M.postA), pBy = projPost(M.postB);
  const loY = Math.min(pAy, pBy) - 0.15, hiY = Math.max(pAy, pBy) + 0.15;   // within aperture ± body margin
  ky = Math.max(loY, Math.min(hiY, ky));
  // (3) hard mouth clamp so the keeper never stands implausibly wide of the frame
  ky = Math.max(M.postA - 1.2, Math.min(M.postB + 1.2, ky));
  return [kx, ky];
}
function gkPosition(t, bx, by, q) {
  // REVIEW A/B: NEW = the FC-inspired distance x angle surface, OLD = Q2.5 exactly as before.
  if (GK_POSMODEL.active === "NEW") return gkDesiredFC(bx, by, q);
  if (t && t.gkPosQ && GK_Q[t.gkPosQ]) return gkDesiredQ(bx, by, q, GK_Q[t.gkPosQ]);
  return gkDesired(bx, by, q);
}
// ── hand collision candidates (radius in m; diameter shown in cm). Ball radius
// (0.11 m) is added SEPARATELY at contact and never double-counted here. ──
// hand-CONTACT volume (palm thickness/area at the ball), NOT the keeper's reach. The
// ball radius (0.11 m) is added exactly once at contact. H4/H5 are smaller anatomical
// palm/fingertip volumes (item 10): a fingertip save must actually graze the hand's end.
const GK_HAND = { H1: 0.12, H2: 0.09, H3: 0.06, H4: 0.045, H5: 0.03 };  // ⌀ 24 / 18 / 12 / 9 / 6 cm
const GK_MOVE = {
  // movement attributes — DISTINCT from gk_positioning (which only picks WHERE
  // to stand, never how fast). accel = velocity change rate; vmax = ceiling.
  accelBase: 6.0, accelGain: 6.0,     // accel(m/s^2) = base + gain*norm01(acceleration)
  vmaxBase: 3.5, vmaxGain: 3.5,       // vmax(m/s)   = base + gain*norm01(sprint_speed)
  arriveBrake: 9.0,                   // arrival-braking decel so the keeper SETTLES (SET)
  setDistThresh: 0.20, setVelThresh: 0.35,   // SET when close to desired AND slow
  // pre-commit movement policies (how the PHYSICAL foot target responds to the
  // evolving prediction — NOT smoothing the prediction itself):
  m2Shuffle: 0.6,     // M2 SET-disciplined: max shuffle (m) off the SET position before commit
  m3Deadband: 0.35,   // M3 damped: ignore prediction changes smaller than this (m)
  m3Alpha: 0.12,      // M3 damped: low-pass rate toward the (deadbanded) prediction
  // M3/M4/M5 DAMPED family — the physical foot target is a discretely-tracked
  // filter of the raw prediction. deadband = min prediction move (m) before the
  // foot target shifts at all; alpha = per-step fraction closed toward the
  // (deadbanded) prediction (persistence — lower = calmer/slower); reversal =
  // deadband MULTIPLIER when the prediction flips to the opposite side of the
  // current foot target (>1 => the keeper resists reversing on evolving curl).
  // Explosive commit is UNAFFECTED: this only governs the pre-commit shuffle.
  damp: {
    M3: { deadband: 0.35, alpha: 0.12, reversal: 1.0 },   // M3: original damped tracking (baseline for comparison)
    M4: { deadband: 0.55, alpha: 0.06, reversal: 3.0 },   // M4: strongly SET-disciplined — wide deadband, slow, strong reversal resistance
    M5: { deadband: 0.90, alpha: 0.03, reversal: 6.0 },   // M5: near-locked SET — barely tracks pre-commit
  },
  // M6 READ→PREPARE→COMMIT — the intended V1 architecture. After SHOT the keeper
  // does NOT continuously steer toward the prediction: it stays essentially SET
  // (coasting only on legitimate pre-shot momentum) while READING, then takes at
  // most ONE deliberate preparation step once the save side is confidently known.
  m6SettleBand: 0.30,   // crossing-y spread over the obs window below which the read is "confident" enough to prepare (m)
  m6PrepHorizon: 0.42,  // if availableTime falls below this, decide the prep step NOW (s)
  m6PrepStepMax: 1.0,   // hard cap on the SINGLE preparation step off the SET position (m) — not continuous tracking
  m6PrepMinInfo: 0.05,  // require at least this much reaction-elapsed settling before preparing (s)
};
// ── ATTRIBUTE TRANSFORM (continuous-attribute pass, 2026-09-05). Linear (a − 20)/70 up to the knee, then a C¹ soft
// saturation with diminishing returns — one map for every mechanical quantity, no tier steps, no discontinuity:
//   x(a) = (a − 20)/70                                   a ≤ knee (75)          → identical to the old map (K1 45, K2 72 unchanged)
//   x(a) = 1 − (1 − x_k)·exp(−(a − knee)/(70·(1 − x_k)))  a > knee               → slope continuous at the knee, x → 1 asymptotically
// Old map: (a − 20)/70 clamped at 90 — 90, 92, 95 and 99 were all 1.0 (a 99 keeper was mechanically a 90 keeper, and the
// slope jumped from 1/70 to 0 at 90). New values: 80 0.847 (was 0.857), 90 0.921 (was 1), 95 0.944, 99 0.957.
const GK_ATTR_MAP = { knee: 75, floor: 20, span: 70 };
function gkNorm01(a) {
  const M = GK_ATTR_MAP, xk = (M.knee - M.floor) / M.span;
  if (a <= M.knee) return Math.max(0, (a - M.floor) / M.span);
  return 1 - (1 - xk) * Math.exp(-(a - M.knee) / (M.span * (1 - xk)));
}
// bounded, monotone, mildly S-shaped attribute response for timing/handling quantities (extremes compressed,
// mid-range differences matter most): 0.5·x + 0.5·smoothstep(x) on the same soft-saturating x, so every quantity
// keeps improving (slowly) all the way to 99.
function gkShape01(a) { const x = gkNorm01(a); return 0.5 * x + 0.5 * x * x * (3 - 2 * x); }
// live attribute lookup: a playtest override (t.gkAccel / t.gkSpeed / t.gkStrength) beats the keeper's own attrs.
// Movement/strength are NOT part of the K bands — evaluation injects them explicitly (profiles), like height.
function gkAttr(t, gk, name) {
  if (t) { if (name === "acceleration" && t.gkAccel != null) return t.gkAccel;
           if (name === "sprint_speed" && t.gkSpeed != null) return t.gkSpeed;
           if (name === "strength" && t.gkStrength != null) return t.gkStrength; }
  return gk.attrs[name];
}
// technique → launch family + nominal D (mirrors PT_SHOWCASE, so scenarios reuse
// the identical charge-launch path as normal play)
const GK_TECH_FAM = {
  INSIDE:      { fam: "SHORT",  D: 14 },
  LACES:       { fam: "DRIVEN", D: 20 },
  LACES_POWER: { fam: "CLEAR",  D: 35 },
  OUTSIDE:     { fam: "SHORT",  D: 14 },
  CHIP:        { fam: "LOFT",   D: 22 },
};
// Deterministic scenario battery. Each resets to an EXACT initial state and
// fires a real shot; Stage 0 shots simply pass the keeper (no interception yet).
// origin/aim/gk are world (x,y) metres; c is charge 0..1; gkv optional start vel.
const GK_SCENARIOS = [
  { name: "central ground",     origin: [88, 34], aim: [105, 34],   tech: "LACES",       c: 0.45, gk: [104.4, 34] },
  { name: "low corner",         origin: [90, 34], aim: [105, 31],   tech: "LACES",       c: 0.55, gk: [104.4, 34] },
  { name: "high corner",        origin: [86, 34], aim: [105, 31.5], tech: "LACES_POWER", c: 0.70, gk: [104.4, 34] },
  { name: "near post",          origin: [92, 38], aim: [105, 37],   tech: "LACES",       c: 0.50, gk: [104.4, 34] },
  { name: "far post",           origin: [92, 30], aim: [105, 37],   tech: "LACES",       c: 0.62, gk: [104.4, 34] },
  { name: "close POWER",        origin: [99, 34], aim: [105, 34],   tech: "LACES_POWER", c: 0.55, gk: [104.4, 34] },
  { name: "long POWER",         origin: [78, 34], aim: [105, 34],   tech: "LACES_POWER", c: 0.95, gk: [104.4, 34] },
  { name: "curved INSIDE_R",    origin: [86, 40], aim: [105, 34],   tech: "INSIDE",      c: 0.70, gk: [104.4, 34] },
  { name: "CHIP",               origin: [90, 34], aim: [105, 34],   tech: "CHIP",        c: 0.60, gk: [104.4, 34] },
  { name: "keeper set (centre)",origin: [88, 34], aim: [105, 34],   tech: "LACES",       c: 0.50, gk: [104.4, 34] },
  { name: "keeper mispositioned",origin: [88, 34],aim: [105, 34],   tech: "LACES",       c: 0.50, gkMis: [103.0, 38.0] },
  { name: "keeper already moving",origin: [88,34],aim: [105, 34],   tech: "LACES",       c: 0.50, gk: [104.4, 34], gkv: [0, 4.0] },
  { name: "future max-reach",   origin: [90, 34], aim: [105, 31.2], tech: "LACES",       c: 0.65, gk: [104.4, 34] },
  { name: "legal under-bar top corner", origin: [93, 34], aim: [105, 31], tech: "LACES_POWER", c: 0.60, gk: [104.4, 34] },
  { name: "medium-height far side",     origin: [92, 30], aim: [105, 37], tech: "LACES_POWER", c: 0.52, gk: [104.4, 34] },
  { name: "rocket top corner (unreachable)", origin: [95, 34], aim: [105, 30.7], tech: "LACES_POWER", c: 1.0, gk: [104.4, 34] },
  // ── LOW-SHOT / FOOT-SAVE battery (item L). Low driven shots from straight in front
  // so the ball reaches the CENTRED keeper near the ground; fine aim offsets probe the
  // FOOT / LEG / BODY / HANDS / MISS boundary. lowZ launches keep the ball on the deck.
  { name: "at left foot (low)",       origin: [92, 34], aim: [105, 33.6], tech: "LACES", c: 0.42, lowZ: true },
  { name: "at right foot (low)",      origin: [92, 34], aim: [105, 34.4], tech: "LACES", c: 0.42, lowZ: true },
  { name: "between legs (low)",       origin: [92, 34], aim: [105, 34.0], tech: "LACES", c: 0.42, lowZ: true },
  { name: "20cm outside L foot",      origin: [92, 34], aim: [105, 33.2], tech: "LACES", c: 0.44, lowZ: true },
  { name: "20cm outside R foot",      origin: [92, 34], aim: [105, 34.8], tech: "LACES", c: 0.44, lowZ: true },
  { name: "ankle-height low corner",  origin: [90, 34], aim: [105, 31.5], tech: "LACES", c: 0.55, lowZ: true },
  { name: "close POWER at feet",      origin: [98, 34], aim: [105, 34.0], tech: "LACES_POWER", c: 0.5, lowZ: true },
  { name: "low INSIDE_R at foot",     origin: [88, 38], aim: [105, 34.5], tech: "INSIDE", c: 0.6, lowZ: true },
  { name: "just beyond foot (hand)",  origin: [90, 34], aim: [105, 32.2], tech: "LACES", c: 0.6, lowZ: true },
  { name: "beyond both -> goal",      origin: [90, 34], aim: [105, 30.9], tech: "LACES", c: 0.8, lowZ: true },
  // ── STAGE 4 ACCEPTANCE BATTERY (item 14) — key Q cycles this group. Real shots through the
  // production charge-launch path unless `synth` (a straight ball solved to pass the keeper's
  // SET plane at lateral/height/speed — used where K1's frozen Stage-3 timing cannot deliver the
  // contact type from a real kick family). Outcomes are NOT scripted: they emerge from the
  // Stage-3 TOI + Stage-4 contact quality. `band` pins K2 for the one high-ball comparison.
  { stage4: true, name: "S4 easy central catch (CHIP lob into the hands)",     origin: [92, 34], aim: [105, 34],   tech: "CHIP",        c: 0.35 },
  { stage4: true, name: "S4 chest gather (CHIP, hands+chest)",                origin: [91, 34], aim: [105, 34],   tech: "CHIP",        c: 0.30 },
  { stage4: true, name: "S4 central hard shot parry (LACES 24 m/s)",          origin: [89, 34], aim: [105, 34.2], tech: "LACES",       c: 0.9 },
  { stage4: true, name: "S4 low foot save (20 cm outside R foot)",            origin: [92, 34], aim: [105, 34.8], tech: "LACES",       c: 0.44, lowZ: true },
  { stage4: true, name: "S4 shin block (synthetic lat 0.4 z 0.4 18 m/s)",     origin: [88, 34], aim: [105, 34],   tech: "LACES",       c: 0.5, synth: { lat: 0.4, z: 0.4, v: 18 } },
  { stage4: true, name: "S4 body block (POWER 26 m/s at the chest)",          origin: [91, 34], aim: [105, 34],   tech: "LACES_POWER", c: 0.5 },
  { stage4: true, name: "S4 comfortable lateral hand save (LACES 19 m/s)",    origin: [88, 34], aim: [105, 32.8], tech: "LACES",       c: 0.7 },
  { stage4: true, name: "S4 lateral catch (synthetic lat 1.2 z 1.3 13 m/s)",  origin: [88, 34], aim: [105, 34],   tech: "LACES",       c: 0.5, synth: { lat: 1.2, z: 1.3, v: 13 } },
  { stage4: true, name: "S4 full-extension controlled parry (norm ~0.96)",    origin: [88, 34], aim: [105, 31.6], tech: "LACES",       c: 0.5 },
  { stage4: true, name: "S4 fingertip around the post (LACES 15 m/s)",        origin: [88, 34], aim: [105, 31.0], tech: "LACES",       c: 0.45 },
  { stage4: true, name: "S4 fingertip over the bar (synthetic lat 1.4 z 2.45 17 m/s)", origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, synth: { lat: 1.4, z: 2.45, v: 17 } },
  { stage4: true, name: "S4 awkward spill — weak parry (POWER 27 m/s)",       origin: [89, 34], aim: [105, 33.7], tech: "LACES_POWER", c: 0.6 },
  { stage4: true, name: "S4 awkward spill — body block into the D",           origin: [88, 34], aim: [105, 34],   tech: "LACES",       c: 0.85 },
  { stage4: true, name: "S4 fingertip deflection into the net (synthetic lat 2.02 z 1.2 21 m/s)", origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, synth: { lat: 2.02, z: 1.2, v: 21 } },
  { stage4: true, name: "S4 unreachable rocket stays untouched",              origin: [95, 34], aim: [105, 30.7], tech: "LACES_POWER", c: 1.0 },
  { stage4: true, name: "S4 handling probe (synthetic lat 1.0 z 1.2 21 m/s — T cycles handling)", origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, synth: { lat: 1.0, z: 1.2, v: 21 } },
  { stage4: true, name: "S4 K2 high tip-up (POWER 28 m/s under the bar)",     origin: [86, 34], aim: [105, 32.5], tech: "LACES_POWER", c: 0.66, band: "K2" },
  // ── M3 MOTION-LIBRARY COVERAGE FIXTURES (2026-09-20): one deterministic case per skeletal motion family and per world facing.
  // synthK offsets are in the KEEPER frame (positive lateral = his right); real kicks from off-centre origins turn the keeper to
  // south-west / north-west / south / north facings. Outcomes are NOT scripted (Stage-3 TOI + Stage-4 quality as always).
  { name: "M3 low dive LEFT, hand (synthK lat -1.4 z 0.35 15 m/s)",   origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, synthK: { lat: -1.4, z: 0.35, v: 15 } },
  { name: "M3 low dive RIGHT, hand (synthK lat 1.4 z 0.35 15 m/s)",   origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, synthK: { lat: 1.4, z: 0.35, v: 15 } },
  { name: "M3 chest catch (synthK lat 0.05 z 1.15 15 m/s)",           origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, synthK: { lat: 0.05, z: 1.15, v: 15 } },
  { name: "M3 high ball, real chip (CHIP 0.55)",                       origin: [90, 34], aim: [105, 34], tech: "CHIP", c: 0.55 },   // a high central ball through the real kick path (the synthetic lob variants did not register as a shot from a fresh page)
  { name: "M3 near-body LEFT (synthK lat -0.9 z 1.3 17 m/s)",         origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, synthK: { lat: -0.9, z: 1.3, v: 17 } },
  { name: "M3 foot save RIGHT wide (synthK lat 0.55 z 0.05 14 m/s)",  origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, synthK: { lat: 0.55, z: 0.05, v: 14 } },
  { name: "M3 far dive LEFT TOP (synthK lat -1.6 z 2.0 18 m/s)",      origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, synthK: { lat: -1.6, z: 2.0, v: 18 } },
  { name: "M3 SW-facing far dive (from the south)",                   origin: [100, 42], aim: [105, 31.5], tech: "LACES", c: 0.62 },
  { name: "M3 NW-facing low dive (from the north)",                   origin: [100, 26], aim: [105, 36.2], tech: "LACES", c: 0.55, lowZ: true },
  { name: "M3 S-facing tight angle, high across",                     origin: [104, 44], aim: [105, 33], tech: "LACES", c: 0.6 },
  { name: "M3 N-facing tight angle, low across",                      origin: [104, 24], aim: [105, 35], tech: "LACES", c: 0.5, lowZ: true },
  { name: "M3 moving keeper into a chest catch (gkv 0,-3)",           origin: [88, 34], aim: [105, 34], tech: "LACES", c: 0.5, gkv: [0, -3], synthK: { lat: 0, z: 1.2, v: 12 } },
  // ── M3b FOOT_SAVE (spread block) coverage (2026-09-20): both sides, close (16 / 17) and wide leg blocks, angled world facings (real low LACES shots) ──
  { name: "M3b foot save RIGHT wide (aim 33.2, lat +0.59)",            origin: [92, 34],  aim: [105, 33.2],  tech: "LACES", c: 0.42, lowZ: true },
  { name: "M3b foot save LEFT wide (aim 34.78, lat -0.58)",            origin: [92, 34],  aim: [105, 34.78], tech: "LACES", c: 0.42, lowZ: true },
  { name: "M3b SW-facing foot save RIGHT (from the south, aim 34.2)",  origin: [100, 42], aim: [105, 34.2],  tech: "LACES", c: 0.5,  lowZ: true },
  { name: "M3b NW-facing foot save LEFT (from the north, aim 33.8)",   origin: [100, 26], aim: [105, 33.8],  tech: "LACES", c: 0.5,  lowZ: true },
  { name: "M3b SSW-facing foot save RIGHT (from [96,40], aim 33.9)",   origin: [96, 40],  aim: [105, 33.9],  tech: "LACES", c: 0.48, lowZ: true },
  { name: "M3b NNW-facing foot save LEFT (from [96,28], aim 34.1)",    origin: [96, 28],  aim: [105, 34.1],  tech: "LACES", c: 0.48, lowZ: true },
  // ── M3c CATCH group coverage (2026-09-20): chest catches under angled world facings (synthK offsets are in the keeper frame) ──
  { name: "M3c SW-facing chest catch (from the south, synthK z 1.15)",   origin: [100, 42], aim: [105, 34], tech: "LACES", c: 0.5, synthK: { lat: 0.05, z: 1.15, v: 15 } },
  { name: "M3c NW-facing chest catch (from the north, synthK z 1.2)",    origin: [100, 26], aim: [105, 34], tech: "LACES", c: 0.5, synthK: { lat: -0.05, z: 1.2, v: 15 } },
  { name: "M3c SSW-facing chest catch (from [96,40], synthK z 1.1)",     origin: [96, 40],  aim: [105, 34], tech: "LACES", c: 0.5, synthK: { lat: 0.0, z: 1.1, v: 14 } },
];
function ptGkMake() {
  const c = GK_CFG;
  return {
    x: c.defendGoalX - c.setDepth, y: c.goalCenterY,     // feet / root world pos
    vx: 0, vy: 0,
    facing: Math.PI,                                      // faces -x (out toward the field)
    height: c.height_m, weight: 80,                       // physical metadata (cm/kg live via t.gkHeight / t.gkWeight); weight never touches agility/pace/reach
    handZ: c.height_m * c.handReachFrac,                 // reach origin height
    bodyR: c.bodyR, armSpan: c.armSpan, standingReachZ: c.standingReachZ,
    reachLateral: c.reachLateral,                        // reserved (later stages)
    attrs: { ...c.attrs },
    state: "SET",                                        // SET / TRACKING (Stage 1)
    desired: [c.defendGoalX - c.setDepth, c.goalCenterY],// current desired position (set each tick)
    q: null, posError: 0, depth: c.setDepth,             // positioning diagnostics
    shotT0: null, _armed: true, _prevKicked: false,      // shot-recognition clock
    // Stage 2 perception / prediction / reachability
    obs: [], trail: [], predict: null, reach: null, predHist: [], _snapped: null,
    shotActive: false, latency: null, reactRemain: 0, atShot: null,
    // Stage 3 committed movement + swept contact geometry
    committed: null, contacted: false, contact: null, diveU: 0,
    // three-target architecture (A set / B predicted / C commit) + move diagnostics
    setPos: [c.defendGoalX - c.setDepth, c.goalCenterY], predInt: null,
    moveTarget: [c.defendGoalX - c.setDepth, c.goalCenterY], moveReversals: 0, preCommitDist: 0, _lastMoveSgn: null,
    handNow: [c.defendGoalX - c.setDepth, c.goalCenterY, c.height_m * c.handReachFrac], handPrev: null,
    bodyNow: [c.defendGoalX - c.setDepth, c.goalCenterY], bodyPrev: null,
    home: { x: c.defendGoalX - c.setDepth, y: c.goalCenterY },
  };
}
// ── Stage 1 geometric positioning ──────────────────────────────────────────
function gkDesired(bx, by, q) {
  // q = positioning quality 0..1. desired = blend( naive shallow ball->centre
  // line , optimal angle-BISECTOR at a distance-scaled depth ). A poorly
  // positioning keeper approximates a worse line + depth (causal, no RNG); a
  // good one sits on the true bisector so neither post is casually exposed.
  const M = GK_MOUTH, cx = M.lineX, cy = M.centerY;
  const aX = cx - bx, aYa = M.postA - by, aYb = M.postB - by;        // ball->each post
  const la = Math.hypot(aX, aYa) || 1, lb = Math.hypot(aX, aYb) || 1;
  let bxu = aX / la + aX / lb, byu = aYa / la + aYb / lb;            // bisector direction
  const bl = Math.hypot(bxu, byu) || 1; bxu /= bl; byu /= bl;
  const D = (typeof S !== "undefined" && S.pt && S.pt.gkDepth) || GK_DEPTH;   // active P1/P2/P3 depth candidate
  const ballDist = Math.hypot(cx - bx, cy - by);
  const f = Math.max(0, Math.min(1, (ballDist - D.closeDist) / (D.farDist - D.closeDist)));
  const optimalDepth = D.maxDepth + (D.minDepth - D.maxDepth) * f;   // closer -> deeper
  const Lo = bxu > 1e-3 ? (cx - optimalDepth - bx) / bxu : 0;
  const ox = bx + bxu * Lo, oy = by + byu * Lo;                     // optimal bisector point
  let ncx = cx - bx, ncy = cy - by; const nl = Math.hypot(ncx, ncy) || 1; ncx /= nl; ncy /= nl;
  const Ln = ncx > 1e-3 ? (cx - D.naiveDepth - bx) / ncx : 0;
  const nx = bx + ncx * Ln, ny = by + ncy * Ln;                     // naive (shallow, centre-line) point
  let dx = nx + (ox - nx) * q, dy = ny + (oy - ny) * q;             // blend by positioning quality
  dy = Math.max(M.postA - M.yMargin, Math.min(M.postB + M.yMargin, dy));
  dx = Math.max(cx - D.maxDepth, Math.min(cx - D.minDepth, dx));
  return [dx, dy];
}
function gkMove(gk) {
  // desired -> acceleration -> velocity -> position. accel/vmax from movement
  // attributes ONLY (never gk_positioning). accel-limited dv preserves wrong-way
  // momentum; arrival braking settles the keeper (SET). No teleport/snap.
  const des = gk.desired, toX = des[0] - gk.x, toY = des[1] - gk.y, d = Math.hypot(toX, toY);
  const _t = (typeof S !== "undefined" && S.pt) || null;
  const vmax = GK_MOVE.vmaxBase + GK_MOVE.vmaxGain * gkNorm01(gkAttr(_t, gk, "sprint_speed"));
  const accel = GK_MOVE.accelBase + GK_MOVE.accelGain * gkNorm01(gkAttr(_t, gk, "acceleration"));
  const tgt = d < 1e-4 ? 0 : Math.min(vmax, Math.sqrt(2 * GK_MOVE.arriveBrake * d));
  const wvx = d < 1e-4 ? 0 : toX / d * tgt, wvy = d < 1e-4 ? 0 : toY / d * tgt;
  let dvx = wvx - gk.vx, dvy = wvy - gk.vy; const dvm = Math.hypot(dvx, dvy), lim = accel * PT_DT;
  if (dvm > lim) { dvx = dvx / dvm * lim; dvy = dvy / dvm * lim; }
  gk.vx += dvx; gk.vy += dvy;
  gk.x += gk.vx * PT_DT; gk.y += gk.vy * PT_DT;
}
// ── Stage 2 perception / prediction / reachability calibration ──────────────
const GK_REACH = {
  reactionBase: 0.30, reactionReflexGain: 0.18,   // latency(s) = base - gain*norm01(gk_reflexes)
  standingArm: 0.75,        // reach beyond the hand origin without diving (m)
  lowBandZ: 0.9, midBandZ: 1.7,                   // ball-height dive bands (m) — execTime tiers only
  fingertipFrac: 1.10,      // envelope norm 1.0..frac == FINGERTIP-LIMIT (must graze the extremity)
  vertReachStand: 1.30,     // standingReachZ = height_m*vertReachStand (arm up) — corrected (was 1.34, ~too tall vs 2.44m bar)
  jumpReachGain: 0.85,      // LINEAR (legacy) jump model: highReachZ = standingReachZ + jumpReachGain*norm01(jumping)
  // ── upper-reach calibration (ground/chest/reach pass, 2026-09-04): the jump gain is a BOUNDED, concave map of
  //    norm01(jumping) — one formula for every keeper (no per-profile constants): base + span·(1 − (1−x)^exp), i.e.
  //    0.15 + 0.40·(1 − (1−x)^1.3): K1 (jumping 48) 0.344 m — unchanged from the linear 0.340; K2 (72) 0.48 (was 0.63);
  //    K3 (92) 0.55 (was 0.85); Courtois (68) 0.46 (was 0.58). Diminishing returns at the top: elite but human. The
  //    lateral span from gk_diving is bounded the same way, anchored so K1 is unchanged (2.248 m): 1.10·(1 − (1−dv)^1.372)
  //    → K2 2.72 (was 2.83), K3 2.93 (was 3.23), Courtois 2.94 (was 3.24). The envelope exponent stays 2.2: the A/B on the
  //    matched goal-face corpus (1.8/2.0/2.1/2.2) showed every lower exponent costing K1 (the anchor) and 1.8 re-creating
  //    monotonicity inversions; 2.2 leaves K1 identical and lets the two maps do the calibration. LINEAR keeps the legacy maps.
  jumpModel: "BOUNDED", jumpReachBase: 0.15, jumpReachSpan: 0.40, jumpReachExp: 1.30,
  latModel: "BOUNDED", latSpanBounded: 1.10, latSpanExp: 1.372,   // BOUNDED lateral: latSpanBounded·(1 − (1−dv)^exp) replaces latSpanGain·dv
  // ── COUPLED REACH ENVELOPE (items 6–7). The reachable hand set is NOT an isotropic
  // sphere (which grants max lateral AND max vertical together). It is an ellipse/
  // superellipse centred at the keeper's COMFORT height, whose LATERAL axis (a full
  // side dive) is larger than its VERTICAL axes, so lateral and vertical DEMANDS
  // COMPETE:  (L/maxLat)^p + (Δz/maxVert)^p <= 1. Max lateral reach bulges at comfort
  // height and contracts toward floor and crossbar — no z-based save multiplier.
  comfortFrac: 0.62,        // comfortZ = height_m*comfortFrac — height of MAXIMUM lateral reach (~half goal)
  latSpanBase: 1.70, latSpanGain: 1.40, latHeightTerm: 0.60,  // maxLat = base + gain*norm01(gk_diving) + heightTerm*(h-1.75)
  vertDownBase: 1.35, vertDownGain: 0.40,         // maxVertDown (getting down from comfortZ) = (base + gain*norm01(gk_diving))·(h/vertDownRefH) — larger than up (falling low is easier than jumping high); true bottom CORNERS still hard via lateral coupling
  vertDownRefH: 1.83,       // stature at which the down axis equals base + gain·dv (the K1 anchor); scales with h like the lateral height term
  vertUpFloor: 0.45,        // maxVertUp = max(this, highReachZ - comfortZ)
  envExp: 2.2,              // envelope exponent p (2=ellipse, >2=fuller mid-height superellipse)
  selectPolicy: "S2",       // interception selection: S2 = earliest point reachable with margin (default); S3 = most comfortable (rejected: retreats); S1 = legacy (A/B, key ;)
  selectStrictNorm: 0.95,   // S2: a candidate counts as reachable only with this envelope margin (norm ≤ 0.95 ≈ 0.11 m inside the boundary); 0.95<norm≤1.10 is the marginal fallback band
  selectBackMax: 1.0,       // S2/S3: an interception may lie at most this far BEHIND the keeper's current feet (m) — no backward dive
  handFwd: 0.30,            // the hand meets a ball this far AHEAD of the feet without a step (candidate floor + PREPARE depth allowance)
  selectTimeFeasible: true, // S2: prefer the earliest strictly-reachable point the hand can ARRIVE at in time (GK_ACTION timing); fallback = earliest by envelope
  feasGapFrac: 0.5,         // "arrives in time" = hand shortfall at ball arrival ≤ this × (handR + ballR) — prefers full-extension arrivals over grazes
  lobTakeLower: true, lobSpare: 0.30,   // dropping ball met above the catch band → take the first feasible point inside it, if ≥ lobSpare s to spare (review toggle)
  predHorizon: 2.6, predMaxSteps: 170,  // forward predictor (curve decay/bounce bleed come from the real ball's PT_CURVE law)
  obsWindow: 6,             // observed-velocity samples used to estimate turn rate
  snapMs: [50, 100, 200, 300],   // prediction-evolution snapshot times after contact
};
// Coupled reach envelope for the keeper's hand: semi-axes derived causally from
// height (geometry), gk_diving (span), and jumping (vertical). Lateral > vertical.
function gkJumpReach(x) {        // vertical reach gained by a jump (m) vs x = norm01(jumping); monotone, bounded
  const R = GK_REACH;
  if (R.jumpModel === "LINEAR") return R.jumpReachGain * x;
  return R.jumpReachBase + R.jumpReachSpan * (1 - Math.pow(1 - x, R.jumpReachExp));
}
function gkLatSpan(dv) {         // lateral span gained from gk_diving (m) vs dv = norm01(gk_diving); monotone, bounded
  const R = GK_REACH;
  if (R.latModel === "LINEAR") return R.latSpanGain * dv;
  return R.latSpanBounded * (1 - Math.pow(1 - dv, R.latSpanExp));
}
function gkEnvelope(t, gk, heightM) {
  const h = heightM;
  const comfortZ = h * GK_REACH.comfortFrac;
  const standingReachZ = h * GK_REACH.vertReachStand;
  const highReachZ = standingReachZ + gkJumpReach(gkNorm01(t.gkJump != null ? t.gkJump : gk.attrs.jumping));
  const dv = gkNorm01(t.gkDiving != null ? t.gkDiving : gk.attrs.gk_diving);
  const maxLat = GK_REACH.latSpanBase + gkLatSpan(dv) + GK_REACH.latHeightTerm * (h - 1.75);
  const maxVertUp = Math.max(GK_REACH.vertUpFloor, highReachZ - comfortZ);
  // DOWN axis scales with stature like every other anatomical length (continuous-attribute pass, 2026-09-05): without it the
  // comfort height (0.62·h) rose with height while the get-down span did not, so a 200 cm keeper reached LESS along the
  // ground (1.93 m ball-centre) than a 175 cm one (1.98 m) and graded the same low contact a fingertip instead of a parry.
  // Anchored at the 183 cm reference: K1 unchanged; 200 cm → ×1.093.
  const maxVertDown = (GK_REACH.vertDownBase + GK_REACH.vertDownGain * dv) * (h / GK_REACH.vertDownRefH);
  return { comfortZ, standingReachZ, highReachZ, handRestZ: h * GK_CFG.handReachFrac, maxLat, maxVertUp, maxVertDown };
}
// normalized coupled-envelope reach for a hand target at horizontal distance L (m)
// and height z (m): <1 inside, ==1 on the boundary, >1 unreachable. Lateral and
// vertical compete — max lateral and max vertical cannot both be had for free.
function gkEnvNorm(env, L, z) {
  const dz = z - env.comfortZ;
  const vMax = dz >= 0 ? env.maxVertUp : env.maxVertDown;
  const lt = L / env.maxLat, vt = dz / (vMax || 1e-6), p = GK_REACH.envExp;
  return Math.pow(Math.pow(Math.abs(lt), p) + Math.pow(Math.abs(vt), p), 1 / p);
}
function gkReactionLatency(t, gk) {
  const r = gkShape01(t.gkReflex != null ? t.gkReflex : gk.attrs.gk_reflexes);
  return GK_REACH.reactionBase - GK_REACH.reactionReflexGain * r;   // continuous, bounded, monotone; no tiers, no RNG
}
function gkHeightM(t, gk) { return (t.gkHeight != null ? t.gkHeight : gk.height * 100) / 100; }
function gkObserve(gk, t, b) {
  // record ONLY physically-available ball state up through this tick (position,
  // velocity, height). Used to estimate the turn rate from OBSERVED motion — the
  // keeper does not read the ball's internal spin scalar, so curve predictions
  // honestly evolve as the swerve reveals itself.
  if (!gk.obs) gk.obs = [];
  if (!b.ctrl) {
    gk.obs.push({ t: t.now, x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz });
    if (gk.obs.length > GK_REACH.obsWindow) gk.obs.shift();
    // OBSERVED instability (ground/chest pass, 2026-09-04): the change of the ball's acceleration between
    // consecutive airborne observations. Gravity, drag and a smooth curve cancel out of the difference; only
    // an erratic (knuckling) flight would leave a residual. Read by Stage-4 catch quality (cStable). Samples
    // touching the ground are skipped — a bounce is a discrete, expected event, not instability.
    const o = gk.obs, m = o.length;
    if (m >= 3) {
      const a = o[m - 3], c = o[m - 2], d = o[m - 1], zMin = GOALFX.ballR + 0.05;
      const dt1 = c.t - a.t, dt2 = d.t - c.t;
      if (a.z > zMin && c.z > zMin && d.z > zMin && dt1 > 1e-5 && dt2 > 1e-5) {
        const ax1 = (c.vx - a.vx) / dt1, ay1 = (c.vy - a.vy) / dt1, az1 = (c.vz - a.vz) / dt1;
        const ax2 = (d.vx - c.vx) / dt2, ay2 = (d.vy - c.vy) / dt2, az2 = (d.vz - c.vz) / dt2;
        const j = Math.hypot(ax2 - ax1, ay2 - ay1, az2 - az1);
        gk.obsJitter = Math.max(gk.obsJitter || 0, j);
      }
    }
    if (!gk.trail) gk.trail = [];
    gk.trail.push([b.x, b.y, b.z]); if (gk.trail.length > 120) gk.trail.shift();
  }
}
function gkEstTurnRate(gk) {
  // mean angular velocity of the OBSERVED horizontal velocity over the window
  const o = gk.obs; if (!o || o.length < 3) return 0;
  let sum = 0, n = 0;
  for (let i = 1; i < o.length; i++) {
    const a0 = Math.atan2(o[i - 1].vy, o[i - 1].vx), a1 = Math.atan2(o[i].vy, o[i].vx);
    let d = ((a1 - a0) + Math.PI * 3) % (2 * Math.PI) - Math.PI;
    const dt = o[i].t - o[i - 1].t; if (dt > 1e-5) { sum += d / dt; n++; }
  }
  return n ? sum / n : 0;
}
function gkCurveAir(z) {   // the real ball's airborne curve gate (PT_CURVE): rolling/skimming balls keep only groundFrac of the curl
  const u = Math.max(0, Math.min(1, (z - PT_CURVE.airZ0) / (PT_CURVE.airZ1 - PT_CURVE.airZ0)));
  return PT_CURVE.groundFrac + (1 - PT_CURVE.groundFrac) * u * u * (3 - 2 * u);
}
function gkEstSpin(gk) {
  // IMPLIED signed curve spin from the OBSERVED heading changes. The keeper sees the ball bend — he
  // never reads the internal spin scalar — but he knows how a ball behaves: each observed turn rate
  // w is inverted through the SAME curve law the real ball obeys (v2: a = k·s·|v|·air(z) ⇒ w = k·s·air(z)),
  // so a bend seen in the air is not extrapolated as if the ball kept bending at that rate along the
  // ground. (Stage-3 interception audit: the raw turn-rate predictor was 0.7–1.4 m wrong within
  // 0.3–0.5 s for low INSIDE_R balls after their bounce; air balls were within 0.07 m.)
  const o = gk.obs; if (!o || o.length < 3) return 0;
  let sum = 0, n = 0;
  for (let i = 1; i < o.length; i++) {
    const p = o[i - 1], q = o[i]; const dt = q.t - p.t; if (dt <= 1e-5) continue;
    const sp = Math.hypot(q.vx, q.vy); if (sp <= 0.5) continue;      // the real curve law is inactive below this speed
    const a0 = Math.atan2(p.vy, p.vx), a1 = Math.atan2(q.vy, q.vx);
    const d = ((a1 - a0) + Math.PI * 3) % (2 * Math.PI) - Math.PI; const w = d / dt;
    const air = gkCurveAir(q.z);
    // sign: the real law pushes along the LEFT-perp (vy, -vx)/|v|, which turns the heading atan2(vy,vx)
    // NEGATIVE for positive spin — so an observed heading rate w implies spin −w/(k·air) (v2) / −w·|v|/air (v1)
    sum += (PT_CURVE.mode === "v2") ? -w / (ptX3K() * air) : -w * sp / air; n++;
  }
  return n ? sum / n : 0;
}
function gkPredict(gk, b) {
  // forward-integrate a COPY of the CURRENT observed ball with the SAME physics and the SAME
  // integration order as the real free-ball (advance → gravity → ground bounce → friction → curve),
  // with the curve driven by the spin IMPLIED by the observed bend (gkEstSpin) — never the internal
  // spin scalar. Never touches the real ball. Recomputed every tick, so INSIDE_R predictions evolve
  // as observed. (Stage-3 audit fix: the old loop integrated gravity before the position advance,
  // a systematic G·dt² per-step vertical bias ≈ 6–11 cm at typical horizons, and applied a raw
  // turn rate with an ad-hoc decay instead of the ball's height-gated / bounce-bled curve.)
  if (b.ctrl) return null;
  let px = b.x, py = b.y, pz = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
  let sObs = gkEstSpin(gk);
  const dt = PT_DT, gx = GK_MOUTH.lineX;
  // TIME ORIGIN (integration pass, 2026-09-04): the keeper updates BEFORE the ball integrates in the same
  // tick, so the ball state read here is where the ball was at the END of the previous tick — one dt
  // behind the keeper's clock. Sample i therefore arrives at keeper time (i − 1)·dt, not i·dt. Stamping
  // i·dt made every availableTime one tick optimistic: the keeper committed one tick late and the
  // hand met the ball one smoothstep step short of the target (traced on a 12 m / 0.6 m reach: hand
  // 0.20 m short at ball arrival where the prediction said 0.12 m).
  const samples = [{ t: -dt, x: px, y: py, z: pz }];
  let crossing = null;
  for (let i = 1; i <= GK_REACH.predMaxSteps; i++) {
    const t = (i - 1) * dt;
    const px0 = px;
    px += vx * dt; py += vy * dt; pz += vz * dt;   // (1) advance (same as the real ball)
    if (pz > 0) vz -= PT.G * dt;                  // (2) gravity
    if (pz <= 0) {                                // (3) ground bounce (same REST/KEEP/SETTLE; spin bleeds)
      if (vz < 0) { const r = -vz * PT.REST; if (r < PT.SETTLE) vz = 0; else { vz = r; vx *= PT.KEEP; vy *= PT.KEEP; } sObs *= PT_CURVE.bounceKeep; }
      pz = Math.max(0, pz);
    }
    const sp2 = Math.hypot(vx, vy);               // (4) friction (air vs roll by height)
    if (sp2 > 1e-6) { const mu = pz > 0.05 ? PT.MU_AIR : PT.MU_ROLL; const ns = Math.max(0, sp2 - mu * dt); vx *= ns / sp2; vy *= ns / sp2; }
    if (Math.abs(sObs) > 0.02) {                  // (5) curve: height-gated, velocity-dependent, decaying — the real law
      const spc = Math.hypot(vx, vy);
      if (spc > 0.5) {
        const air = gkCurveAir(pz);
        const a = (PT_CURVE.mode === "v2" ? ptX3K() * sObs * spc : sObs) * air;   // same coefficient the ball is flying with
        const lx = vy / spc, ly = -vx / spc;
        vx += lx * a * dt; vy += ly * a * dt;
        const rollD = PT_CURVE.mode === "v2" ? PT_CURVE.skimDecay : PT_CURVE.rollDecay;
        sObs *= 1 - (pz > 0.05 ? PT_CURVE.decay : rollD) * dt;
      }
    }
    samples.push({ t, x: px, y: py, z: pz });
    if (px0 < gx && px >= gx) {           // goal-plane crossing (interpolated)
      const f = (gx - px0) / (px - px0 || 1);
      const cy = py - vy * dt * (1 - f), cz = pz - vz * dt * (1 - f);
      crossing = { y: cy, z: Math.max(0, cz), t: t - dt * (1 - f),
                   inMouth: cy > GK_MOUTH.postA && cy < GK_MOUTH.postB && cz < 2.44 && cz >= -0.05 };
      break;
    }
    if (t > GK_REACH.predHorizon || (sp2 < 0.2 && pz < 0.05)) break;
  }
  const w0 = -(PT_CURVE.mode === "v2" ? ptX3K() * sObs * gkCurveAir(b.z) : (Math.hypot(b.vx, b.vy) > 0.5 ? sObs * gkCurveAir(b.z) / Math.hypot(b.vx, b.vy) : 0));   // heading rate implied now (HUD)
  return { samples, crossing, turnRate: w0, spin: sObs };
}
const GK_TIERS = ["STANDING REACHABLE", "LOW-DIVE REACHABLE", "MEDIUM-DIVE REACHABLE",
                  "HIGH/FULL-STRETCH REACHABLE", "FINGERTIP-LIMIT", "UNREACHABLE", "NO PREDICTION"];
function gkTierRank(tier) { const i = GK_TIERS.indexOf(tier); return i < 0 ? 99 : i; }
function gkEvalPoint(t, gk, c, reactRemain) {
  // geometry-only reachability of interception point c={x,y,z,t}. No contact.
  const heightM = gkHeightM(t, gk);
  const env = gkEnvelope(t, gk, heightM);
  const handRestZ = env.handRestZ, standingReachZ = env.standingReachZ, highReachZ = env.highReachZ;
  const availableTime = c.t - reactRemain;      // usable movement time (reaction consumed)
  // feet displacement toward the point under movement attrs, from CURRENT velocity
  // (wrong-way momentum makes vAlong negative -> less/negative progress). No hidden penalty.
  const dxp = c.x - gk.x, dyp = c.y - gk.y, distH = Math.hypot(dxp, dyp) || 1e-6;
  const dirx = dxp / distH, diry = dyp / distH;
  const vAlong = gk.vx * dirx + gk.vy * diry;
  const accel = GK_MOVE.accelBase + GK_MOVE.accelGain * gkNorm01(gkAttr(t, gk, "acceleration"));
  const vmax = GK_MOVE.vmaxBase + GK_MOVE.vmaxGain * gkNorm01(gkAttr(t, gk, "sprint_speed"));
  // RECONCILIATION (Part C): the keeper's feet only SPRINT during the pre-commit
  // phase; the final dive (time-to-extension for this ball's height band) is the
  // reach, not extra feet travel. So the eval credits feet for (availableTime -
  // diveTime), matching Stage-3 execution — not the full flight. This removes the
  // Stage-2/Stage-3 disagreement without buffing the keeper.
  const diveTime = GK_ACTION.model === "TIER" ? (c.z < GK_REACH.lowBandZ ? 0.28 : c.z < GK_REACH.midBandZ ? 0.34 : 0.42)
                 : gkActionTime(t, gk, [c.x, c.y, c.z], vAlong).execT;
  const aT = Math.max(0, availableTime - diveTime); let v = vAlong, d = 0; const h = aT / 10;
  for (let k = 0; k < 10 && aT > 0; k++) { v = Math.max(-vmax, Math.min(vmax, v + accel * h)); d += v * h; }
  d = Math.min(d, distH);                        // feet cannot overshoot the point (may be negative if wrong-way)
  // M6 RECONCILIATION: under READ→PREPARE the keeper does NOT sprint pre-commit — it
  // takes at most ONE capped prep step. So the eval credits feet for only that step
  // (plus legitimate coasting momentum), matching M6 execution instead of a sprint.
  if ((t.gkMovePolicy || "M6") === "M6") { const coast = Math.max(0, vAlong) * availableTime; d = Math.min(d, GK_MOVE.m6PrepStepMax + coast); }
  const fx = gk.x + dirx * d, fy = gk.y + diry * d;
  // COUPLED ENVELOPE reachability (items 6–7): lateral demand L and vertical demand
  // (c.z vs comfort height) COMPETE via the ellipse/superellipse — not an isotropic
  // sphere. requiredSpan kept only for reporting.
  const L = Math.hypot(c.x - fx, c.y - fy);
  const norm = gkEnvNorm(env, L, c.z);
  const requiredSpan = Math.hypot(c.x - fx, c.y - fy, c.z - handRestZ);
  let tier, margin;
  const isStanding = L <= GK_REACH.standingArm && c.z <= standingReachZ && c.z >= env.comfortZ - GK_REACH.standingArm;
  if (isStanding) { tier = "STANDING REACHABLE"; margin = (1 - norm) * env.maxLat; }
  else if (norm <= 1.0) {
    const band = c.z < GK_REACH.lowBandZ ? "LOW" : c.z < GK_REACH.midBandZ ? "MEDIUM" : "HIGH/FULL-STRETCH";
    tier = band === "HIGH/FULL-STRETCH" ? "HIGH/FULL-STRETCH REACHABLE" : band + "-DIVE REACHABLE";
    margin = (1 - norm) * env.maxLat;
  } else if (norm <= GK_REACH.fingertipFrac) { tier = "FINGERTIP-LIMIT"; margin = (GK_REACH.fingertipFrac - norm) * env.maxLat; }
  else { tier = "UNREACHABLE"; margin = (1 - norm) * env.maxLat; }
  const diveSpanMax = env.maxLat;   // retained field name; now the LATERAL semi-axis
  // EXPECTED SAVE SURFACE (item N) — classify by the SAME anatomy the Stage-3 contact
  // test uses (feet/legs low, torso at body height, hands otherwise), so Stage 2 and
  // Stage 3 agree on what makes the save. Horizontal distance is measured from the
  // keeper's projected feet (the reach origin for low balls is the legs, not the hand).
  const hipZ = heightM * GK_BODY.hipFrac, shZ = heightM * GK_BODY.shoulderFrac;
  // measure from the keeper's CURRENT feet (M6 does not sprint pre-commit), so a low
  // ball counts as a FOOT/LEG save only when it genuinely arrives AT the standing feet
  // (or one short lunge). Anything needing a real dive is a HAND save — this is what
  // the Stage-3 contact test produces (the diving hand leads), so the two now agree.
  const dFootStand = Math.hypot(c.x - gk.x, c.y - gk.y);
  const footReach = GK_BODY.footSpread + GK_BODY.legR + GOALFX.ballR;         // ~0.42 m: standing foot/leg volume
  let surface;
  if (tier === "UNREACHABLE") surface = "UNREACHABLE";
  else if (c.z < GK_BODY.ankleZ && dFootStand <= footReach + 0.08) surface = "FOOT";       // ball AT the standing foot
  else if (c.z < GK_BODY.kneeZ && dFootStand <= footReach + 0.08) surface = "LEG";         // ball AT the standing leg (no dive)
  else if (c.z >= hipZ && c.z <= shZ && dFootStand <= GK_BODY.torsoR + GOALFX.ballR + 0.10) surface = "BODY";
  // anything requiring lateral travel is a DIVE — led by the hand (matches Stage-3 first-contact)
  else surface = tier === "FINGERTIP-LIMIT" ? "FINGERTIP" : c.z < GK_REACH.lowBandZ ? "HAND-LOW" : c.z < GK_REACH.midBandZ ? "HAND-MED" : "HAND-HIGH";
  // time feasibility: the hand, following the committed smoothstep over execT, must be within the contact
  // tolerance of the point when the ball is there (an action that cannot finish is not a save option)
  const execT = diveTime, Dh = Math.hypot(c.x - gk.x, c.y - gk.y, c.z - gk.handZ);
  const arrivalGap = gkArrivalGap(Dh, execT, availableTime);
  const handR = GK_HAND[t.gkHand] != null ? GK_HAND[t.gkHand] : GK_DIVE.handR;
  const timeFeasible = availableTime > 0 && arrivalGap <= GK_REACH.feasGapFrac * (handR + GOALFX.ballR);   // hand well inside the contact tolerance, not grazing
  return { tier, surface, requiredSpan, diveSpanMax, standingArm: GK_REACH.standingArm, margin,
           availableTime, feet: [fx, fy], vAlong, highReachZ, standingReachZ, point: c, env, norm, reachL: L,
           execT, arrivalGap, timeFeasible };
}
function gkReachEval(t, gk, reactRemain) {
  const pr = gk.predict; if (!pr) return { tier: "NO PREDICTION" };
  const cands = [];
  if (pr.crossing) cands.push({ x: GK_MOUTH.lineX, y: pr.crossing.y, z: pr.crossing.z, t: pr.crossing.t, where: "line", inMouth: pr.crossing.inMouth });
  for (const s of pr.samples) if (s.x >= gk.x - GK_REACH.handFwd && s.x <= GK_MOUTH.lineX && s.t > 0) cands.push({ x: s.x, y: s.y, z: s.z, t: s.t, where: "pre-line" });
  // HANDS-PLANE candidate (ground/chest pass, 2026-09-04): the exact point where the path crosses the plane handFwd ahead of
  // the feet, interpolated between the bracketing samples. At 24 m/s the samples are 0.40 m apart, so the earliest sample
  // could fall anywhere from 0.3 m ahead to 0.1 m BEHIND the feet — the hands were then committed at the body line and
  // the torso's side met a ball 0.4 m beside the body before the hands did (chest battery: BODY DEFLECTION, not a hand contact).
  { const hp = gk.x - GK_REACH.handFwd;
    for (let i = 1; i < pr.samples.length; i++) { const a = pr.samples[i - 1], b2 = pr.samples[i];
      if (a.x < hp && b2.x >= hp && b2.t > 0 && hp <= GK_MOUTH.lineX) { const f = (hp - a.x) / ((b2.x - a.x) || 1e-9);
        cands.push({ x: hp, y: a.y + (b2.y - a.y) * f, z: a.z + (b2.z - a.z) * f, t: a.t + (b2.t - a.t) * f, where: "hands-plane" }); break; } } }
  if (!cands.length) return { tier: "NO PREDICTION" };
  const line = pr.crossing ? gkEvalPoint(t, gk, cands[0], reactRemain) : null;
  // Choose the EARLIEST physically reachable interception (item 7): meeting the ball
  // sooner maximises available time AND the ball is closer to the keeper laterally
  // earlier in its flight, so an earlier interception is strictly better. The old
  // tier-rank-then-margin rule preferred a LOWER-Z point deeper in the flight (a
  // "nicer" tier) over an earlier reachable one, throwing away time on every dive.
  // Fall back to best-margin only when NOTHING is reachable (best-effort stretch).
  // INTERCEPTION-SELECTION POLICY (Stage-3 interception audit, 2026-09-03):
  //   S1 (legacy) — earliest candidate whose tier is not UNREACHABLE. FINGERTIP-LIMIT (norm 1.0–1.1)
  //        counted as reachable, so the keeper committed to a fingertip-band point at its own plane
  //        while a strictly reachable point 0.5–1.0 m deeper on the SAME prediction was discarded;
  //        gkTryCommit then treated norm > 1 as unreachable (best-effort) — selection and commit disagreed.
  //   S2 (root-cause fix, default) — earliest STRICTLY reachable point (norm ≤ 1, hand no more than
  //        selectBackMax behind the projected feet: no backward dive); the fingertip band is only a
  //        fallback when nothing strict exists, then the tier-rank fallback as before. Same candidates,
  //        same envelope, same reaction, same M6 timing — only the choice among candidates changes.
  //   S2 detail — "strictly reachable" requires an envelope margin (norm ≤ selectStrictNorm): validation with a bare
  //        norm ≤ 1.0 showed the earliest strict point is the first sample just inside the boundary (0.994–0.999),
  //        reached late and touched only with the fingertips; 0.95 < norm ≤ 1.10 is the marginal fallback band.
  //   S3 (REJECTED, kept for A/B review) — among STRICTLY reachable, TIME-FEASIBLE (available time ≥ dive time) candidates
  //        within selectBackMax, take the most COMFORTABLE one (lowest envelope norm; earlier on ties).
  //        Validation showed S2's earliest strict point is the first sample with norm just under 1.0,
  //        reached late (negative time margin) and touched only with the fingertips; on the same honest
  //        prediction a point 0.5–1.0 m deeper at norm 0.85–0.94 exists with time to spare. Falls back
  //        to S2's earliest strict point when nothing is time-feasible, then fingertip, then tier-rank.
  const pol = (t && t.gkSelect) || GK_REACH.selectPolicy;
  let best = null, bestReach = null, bestFinger = null, bestComfort = null, bestFeasible = null, bestEffort = null, bestLob = null;
  const earlier = (e, b) => !b || e.point.t < b.point.t - 1e-4 || (Math.abs(e.point.t - b.point.t) <= 1e-4 && e.margin > b.margin);
  const comfier = (e, b) => !b || e.norm < b.norm - 1e-4 || (Math.abs(e.norm - b.norm) <= 1e-4 && e.point.t < b.point.t);
  for (const c of cands) { const e = gkEvalPoint(t, gk, c, reactRemain);
    // S2/S3: never select a backward dive. Measured from the keeper's CURRENT feet (not the projected
    // feet: the projected feet get MORE backward credit for deeper/later points, which loosened the
    // bound exactly where it matters and let the best-effort target drift toward the goal).
    if (pol !== "S1" && (c.x - gk.x) > GK_REACH.selectBackMax) continue;
    if (!best || gkTierRank(e.tier) < gkTierRank(best.tier) || (gkTierRank(e.tier) === gkTierRank(best.tier) && e.margin > best.margin)) best = e;
    if (e.tier !== "UNREACHABLE" && e.availableTime > 0) {
      if (pol === "S1") { if (earlier(e, bestReach)) bestReach = e; }
      else if (e.tier !== "FINGERTIP-LIMIT" && (pol === "S3" || e.norm <= GK_REACH.selectStrictNorm)) {
        if (earlier(e, bestReach)) bestReach = e;
        // S2 time feasibility (integration pass): among strictly reachable points prefer the earliest the hand
        // can actually ARRIVE at in time; the earliest-by-envelope point stays the fallback when none can
        if (GK_REACH.selectTimeFeasible && e.timeFeasible && earlier(e, bestFeasible)) bestFeasible = e;
        // LOB rule (integration pass): a DROPPING ball that the earliest point would meet above the catching band is
        // taken at the first feasible point INSIDE the band instead — only with ample spare time (never on a fast
        // shot; this is not the rejected comfort-seeking S3, which retreated on drives). The keeper waits under the
        // lob and catches at chest/head height rather than fingertipping it at full stretch.
        if (GK_REACH.lobTakeLower && e.timeFeasible && c.z <= GK_CONTACT.zComfortHi && c.z >= GK_CONTACT.zComfortLo && earlier(e, bestLob)) bestLob = e;
        // no feasible point: the honest best effort is the point the hand gets CLOSEST to when the ball is there
        if (GK_REACH.selectTimeFeasible && (!bestEffort || e.arrivalGap < bestEffort.arrivalGap - 1e-6)) bestEffort = e;
        if (pol === "S3") {
          const execT = (GK_DIVE.execTime[gkTierKey(e.tier)] || 0.3) * Math.max(GK_DIVE.execMinFrac, Math.min(1, e.norm));
          if (e.availableTime >= execT - 0.02 && comfier(e, bestComfort)) bestComfort = e;
        }
      }
      else if (earlier(e, bestFinger)) bestFinger = e;
    }
  }
  // the lob rule only overrides when the earliest feasible point is ABOVE the catching band (a dropping ball) AND that
  // earliest point still has ≥ lobSpare of slack (the keeper can afford to wait) — the slack is judged on the point he
  // would otherwise take, so the choice is stable tick to tick
  // The decision is LATCHED: it is taken while there is slack (READ/PREPARE) and then kept, because at the commit
  // instant the earliest point's slack is by construction ~0 (commit fires when it runs out) — without the latch the
  // keeper would abandon the lower point at the last tick and stretch for the high one after all.
  let lobPick = (bestLob && bestFeasible && bestFeasible.point.z > GK_CONTACT.zComfortHi && bestLob.point.t > bestFeasible.point.t &&
                 (bestFeasible.availableTime - bestFeasible.execT) >= GK_REACH.lobSpare) ? bestLob : null;
  if (lobPick) gk.lobLatched = true; else if (gk.lobLatched && bestLob && !gk.committed) lobPick = bestLob;
  // ── GATHER (ground/low-ball pass, 2026-09-04). A low ball the keeper can get his body BEHIND is collected at the
  // body — hands set just ahead of the feet, chest/knees down behind them — not lunged at. The earliest-reachable rule
  // is right for a drive (meet it early) but for a slow ball it dives the hands 1–2 m upfield at ground level, leading
  // with the extended leg, and the foot took every roller (ground battery: 100 % FOOT DEFLECTION at 1–15 m/s, into
  // the goal at ≥ 10 m/s). Causal gates, all from geometry/timing/attributes; none is a speed threshold by itself:
  //   • the ball is LOW at the body (z < GK_GATHER.zMax) and passes within GK_GATHER.latMax of the current feet;
  //   • the ball's speed there relative to the body is inside the keeper's SECURE-HOLD band (the Stage-4 absorb
  //     capacity from gk_handling/strength: vSecure + band·speedBandFrac) — a harder ball is a dive/block, not a gather;
  //   • the hands can be down and set before the ball arrives (time-feasible with GK_GATHER.lead to spare).
  const gatherPick = gkGatherCandidate(t, gk, pr, reactRemain);
  return { line, best: gatherPick || bestComfort || lobPick || bestFeasible || bestEffort || bestReach || bestFinger || best, inMouth: pr.crossing ? pr.crossing.inMouth : false };
}
function gkGatherCandidate(t, gk, pr, reactRemain) {
  const G = GK_GATHER; if (!G.enabled || gk.committed) return null;
  const planeX = gk.x - GK_REACH.handFwd;                       // hands just ahead of the feet
  let bi = -1, bd = Infinity; const S = pr.samples;
  for (let i = 1; i < S.length; i++) { const d = Math.abs(S[i].x - planeX); if (S[i].t > 0 && d < bd) { bd = d; bi = i; } }
  if (bi < 0 || bd > G.planeTol) return null;
  const c = S[bi];
  if (c.z >= G.zMax) return null;
  // TWO-PHASE feasibility: the single M6 preparation step (capped) brings the feet under the ball line, THEN the hands
  // get down from there. Judged from the PROJECTED feet — a slow ball passing a metre wide is gathered after the step.
  const dyStep = c.y - gk.y, stepY = Math.sign(dyStep) * Math.min(Math.abs(dyStep), GK_MOVE.m6PrepStepMax);
  const feetProj = [gk.x, gk.y + stepY];
  if (Math.abs(c.y - feetProj[1]) > G.latMax) return null;
  const vmax = GK_MOVE.vmaxBase + GK_MOVE.vmaxGain * gkNorm01(gkAttr(t, gk, "sprint_speed"));
  const accel = GK_MOVE.accelBase + GK_MOVE.accelGain * gkNorm01(gkAttr(t, gk, "acceleration"));
  const v0s = Math.max(0, gk.vy * Math.sign(dyStep || 1)), dStep = Math.abs(stepY);           // current speed toward the step
  const dAcc = Math.max(0, (vmax * vmax - v0s * v0s) / (2 * accel));
  const tStep = dStep <= 1e-6 ? 0 : dStep <= dAcc ? (Math.sqrt(v0s * v0s + 2 * accel * dStep) - v0s) / accel : (vmax - v0s) / accel + (dStep - dAcc) / vmax;
  const axG = gkActionTime(t, { x: feetProj[0], y: feetProj[1], handZ: gk.handZ, attrs: gk.attrs }, [c.x, c.y, c.z], 0);   // get-down time from the projected feet
  const availableTime = c.t - reactRemain;
  if (availableTime < tStep + axG.execT) return null;   // cannot be under it AND down in time: the ordinary save decides (the lead is a commit margin, not a feasibility demand)
  const e = gkEvalPoint(t, gk, { x: c.x, y: c.y, z: c.z, t: c.t, where: "gather" }, reactRemain);
  const i0 = Math.max(1, bi - 1), i1 = Math.min(S.length - 1, bi + 1), tt = S[i1].t - S[i0].t;
  const sp = tt > 1e-6 ? Math.hypot(S[i1].x - S[i0].x, S[i1].y - S[i0].y, S[i1].z - S[i0].z) / tt : Math.hypot(gk.vx, gk.vy);
  const sRel = Math.hypot(sp + Math.max(0, gk.vx), gk.vy);       // ball speed relative to the body at the gather point (root drift counts against the hold)
  const C = GK_CONTACT, h01 = gkShape01(gkHandling(t, gk)), s01 = gkShape01(gkAttr(t, gk, "strength"));
  const vSecure = C.secureSpeedBase + C.secureSpeedGain * h01 + C.secureStrengthGain * s01;
  if (sRel > vSecure + C.secureSpeedBand * G.speedBandFrac) return null;
  if (e.tier === "UNREACHABLE" || e.norm > GK_REACH.selectStrictNorm) return null;
  e.gather = true; e.surface = "GATHER"; e.gatherSpeed = +sp.toFixed(2); e.gatherRel = +sRel.toFixed(2); e.gatherSecure = +vSecure.toFixed(2);
  e.gatherStepT = +tStep.toFixed(3); e.gatherDownT = +axG.execT.toFixed(3); e.gatherFeet = feetProj;
  return e;
}
// ── Stage 3 committed movement / dive tiers + swept keeper->ball contact ─────
let GK_COLLIDE = true;    // master keeper-collision switch (regression sets false -> byte-identical)
const GK_DIVE = {
  execTime: { STANDING: 0.12, LOW: 0.28, MEDIUM: 0.34, HIGH: 0.42, FINGERTIP: 0.44 },  // time-to-extension per tier
  handR: 0.12, bodyR: 0.22, shoulderFrac: 0.82,   // collision geometry (m) — body tightened to torso width (~44cm); handR is the H1/H2/H3 candidate (see GK_HAND)
  footFrac: 0.45,            // fraction of the way the root/feet travel during a committed dive
  footFracStandingLat: 0.25, // a STANDING reach shuffles the feet only this fraction laterally and NOT forward (ground/chest pass, 2026-09-04:
                             //   the old 0.45 lunge in x put the torso's side in front of the reaching hand on balls 0.3–0.4 m beside the body —
                             //   every such chest-high ball became a BODY DEFLECTION off the ribs instead of a hand contact)
  commitBuffer: 0.02,        // commit when availableTime <= execTime + buffer (as late as feasible)
  execMinFrac: 0.30,         // floor on the dive-duration scale for a short reflex reach (× the tier's full-dive execTime)
  // (the Stage-3 TEMPORARY eTemp / minClear neutral deflection is REMOVED — GK_CONTACT (Stage 4) owns the post-contact response)
  contactSubsteps: 12,       // swept-contact sub-sampling per tick (no tunnelling for POWER)
  reContactExcl: 0.05,       // per-VOLUME same-touch guard after a keeper contact (s); approach-direction test does the physical work — a rebound may hit him again
  reContactMinGap: 0.01,     // no second contact of ANY volume within the SAME tick as the last (the same touch is never processed twice; the
                             //   per-volume exclusion + approach test do the physical work). Was 0.03 (2 ticks): a ball squirting through a weak
                             //   hand at 12 m/s travelled 0.36 m in the blind window and passed the shin that was directly behind the glove
                             //   (ground battery: K2's leg blocked what K3's faster hand let through — hands then body is one physical sequence)
  pickupExcl: 0.4,           // player pickup exclusion after a keeper contact (s) — unchanged behaviour
  nearBox: 9.0,              // only test contact when the ball is within this x of the goal line
};
// ── SAVE-ACTION EXECUTION TIME (integration pass, 2026-09-04). How long the hand needs to reach a
// point is built from the ACTUAL displacement and the mechanism that produces it — not a per-tier
// constant. Two mechanisms act in parallel and the slower one sets the time:
//   ARM  — the hand travels up to armReach (+ a torso lean) from its rest origin by arm motion alone:
//          bounded hand acceleration / speed (fast; a small "very-short-time response" gain from reflexes).
//   BODY — beyond that the shoulders must move: a load/crouch, then a leg-driven launch whose effective
//          acceleration depends on DIRECTION — lateral drive (gk_diving), getting DOWN (gravity-assisted,
//          gk_diving), getting UP (a jump against gravity, jumping).
// This replaces `GK_DIVE.execTime[tier] × max(0.30, norm)`: that floor let a 0.6 m standing reach complete in
// 0.036 s (a 17 m/s hand) and produced impossible instant contacts at 6–8 m, while a 1.8 m medium dive was
// credited 0.27 s. Reference points (measured/literature): full-extension dive to contact ≈ 0.45–0.65 s;
// arm-only block/reach ≈ 0.15–0.25 s; hand peak speed 6–10 m/s. Inferred: load time, drive accelerations.
// `model: "TIER"` keeps the legacy constants selectable for A/B review.
const GK_ACTION = {
  model: "CAUSAL",                  // CAUSAL (default) | TIER (legacy per-tier constants)
  armReach: 0.72,                   // hand travel by arm motion alone (= GK_CFG.armSpan)
  leanReach: 0.25,                  // extra hand travel from a torso lean without moving the feet
  handAccelBase: 52, handAccelReflexGain: 16,   // hand acceleration (m/s²) = base + gain·norm01(gk_reflexes)
  handVmax: 8.0,                    // hand speed cap (m/s)
  loadTime: 0.11, loadDivingGain: 0.04,         // crouch/load before a launch (s) = loadTime − gain·norm01(gk_diving); scales down for short shifts
  loadFullAt: 0.5,                  // body shift (m) at which the full load time applies
  latAccelBase: 8.0, latAccelGain: 6.0,         // lateral leg drive (m/s²) = base + gain·norm01(gk_diving)
  downAccelBase: 8.0, downAccelGain: 6.0,       // getting DOWN (m/s²) = base + gain·norm01(gk_diving). Gravity assists the fall, but the hand
                                                //   reaches ground level LAST (the torso must collapse first): net hand drive taken equal to the lateral
                                                //   leg drive — INFERRED; empirical save maps put bottom corners at least as hard as mid-lateral
  upAccelBase: 4.5, upAccelGain: 4.5,           // net upward drive against gravity (m/s²) = base + gain·norm01(jumping)
  minExec: 0.06,                    // absolute floor (s): no zero-time action
};
function gkActionTime(t, gk, target, vAlong) {
  // returns { execT, action, dArm, dBody, tArm, tBody } for the hand travelling from its rest origin
  // (feet, handZ) to target; vAlong = current hand/root speed toward the target (a head start, ≥ 0)
  const A = GK_ACTION;
  const dx = target[0] - gk.x, dy = target[1] - gk.y, dz = target[2] - gk.handZ;
  const lat = Math.hypot(dx, dy), D = Math.hypot(dx, dy, dz);
  const v0 = Math.max(0, vAlong || 0);
  const bang = (d, a, vmax) => {                   // accelerate from v0 (cap vmax) until the hand arrives — no braking, it meets the ball
    if (d <= 1e-6) return 0;
    const dAcc = Math.max(0, (vmax * vmax - v0 * v0) / (2 * a));
    if (d <= dAcc) return (Math.sqrt(v0 * v0 + 2 * a * d) - v0) / a;
    return (vmax - v0) / a + (d - dAcc) / vmax;
  };
  const rf = gkShape01(t.gkReflex != null ? t.gkReflex : gk.attrs.gk_reflexes);
  const dv = gkShape01(t.gkDiving != null ? t.gkDiving : gk.attrs.gk_diving);
  const jp = gkShape01(t.gkJump != null ? t.gkJump : gk.attrs.jumping);
  const reach = A.armReach + A.leanReach;
  const dArm = Math.min(D, reach), dBody = Math.max(0, D - reach);
  const tArm = bang(dArm, A.handAccelBase + A.handAccelReflexGain * rf, A.handVmax);
  let tBody = 0, action;
  if (dBody <= 1e-6) action = D <= A.armReach ? "STANDING" : "LEAN";
  else {
    // direction weights PARTITION the displacement (lat + |dz| = the L1 path the body has to produce), so a
    // diagonal (corner) reach gets the blended drive, never more than either axis alone
    const l1 = lat + Math.abs(dz) || 1e-6;
    const fl = lat / l1, fu = Math.max(0, dz) / l1, fd = Math.max(0, -dz) / l1;
    const aEff = fl * (A.latAccelBase + A.latAccelGain * dv) + fu * (A.upAccelBase + A.upAccelGain * jp) + fd * (A.downAccelBase + A.downAccelGain * dv);
    const load = (A.loadTime - A.loadDivingGain * dv) * Math.min(1, dBody / A.loadFullAt);
    // launch from the head-start speed: dBody = v0·t + ½·a·t²
    const tl = (Math.sqrt(v0 * v0 + 2 * aEff * dBody) - v0) / aEff;
    tBody = load + tl;
    action = target[2] < GK_REACH.lowBandZ ? "DIVE-LOW" : target[2] < GK_REACH.midBandZ ? "DIVE-MID" : "DIVE-HIGH";
  }
  const execT = Math.max(A.minExec, tArm, tBody);
  return { execT, action, dArm, dBody, tArm, tBody, D, lat };
}
// execution time for a committed reach: causal model, or the legacy per-tier constant × reach fraction
function gkExecTime(t, gk, tier, norm, target, vAlong) {
  if (GK_ACTION.model === "TIER" || !target) {
    const reachFrac = Math.max(GK_DIVE.execMinFrac, Math.min(1, norm));
    return { execT: (GK_DIVE.execTime[gkTierKey(tier)] || 0.3) * reachFrac, action: gkTierKey(tier) };
  }
  return gkActionTime(t, gk, target, vAlong);
}
// hand shortfall at ball arrival if it follows the committed smoothstep to `target` over execT but only
// `avail` seconds elapse: the action is time-feasible when this is inside the contact tolerance
function gkArrivalGap(D, execT, avail) {
  const u = Math.max(0, Math.min(1, avail / Math.max(1e-6, execT))), e = u * u * (3 - 2 * u);
  return D * (1 - e);
}
// ── keeper ANATOMY (items I–J): distinct collision volumes that correspond to the
// eventual visible keeper — NOT one giant capsule. The save surface EMERGES from
// which volume the swept keeper→ball TOI reaches first (item J); geometry is never
// inflated to manufacture a save (item M). Heights are fractions of live height.
const GK_BODY = {
  torsoR: 0.20,              // torso half-width (~40 cm) — central block volume
  hipFrac: 0.44,            // torso capsule bottom (z = hipFrac*height). Overlaps the standing-leg capsules (top = thighFrac 0.48):
                            //   the old 0.50 left a 4 cm hip gap where a square 22 m/s ball met only the capsule END caps, got an oblique
                            //   normal and was stamped forward into the goal as a "BODY DEFLECTION" (integration pass trace, 8 m chest ball)
  shoulderFrac: 0.82,       // torso capsule top   (z = shoulderFrac*height)
  legR: 0.11,               // leg/foot radius (~22 cm)
  footSpread: 0.20,         // half stance width — each foot offset ±this in the lateral (y) from the root
  thighFrac: 0.48,          // top of the standing leg capsule (z = thighFrac*height)
  ankleZ: 0.22, kneeZ: 0.55,// height bands: contact below ankleZ => FOOT, below kneeZ => LEG
  legExtendMax: 0.75,       // max lateral reach of the LEAD leg beyond the near foot during a low dive (m)
  legExtendZ: 0.20,         // the lead-leg tip stays low (ground/ankle height) when extended
  lowDiveZ: 0.75,           // a committed dive whose target is below this height extends the lead leg (a leg/foot save)
  legLeadFwd: 0.10,         // the extended lead foot sits this far ahead of the hip line (m)
  legCloseFrac: 0.75,       // a low dive at a ball INSIDE the stance closes the legs behind it: stance half-width → footSpread·(1 − this·u)
                            //   (ground/chest pass: a low ball straight at the body used to squeeze between the two leg capsules and glance on)
};
// ── LOW GATHER (ground/low-ball pass, 2026-09-04): possession action for a low ball the keeper can get behind.
// Selection is causal (see gkGatherCandidate); execution differs from a low dive in three physical ways:
// no lead-leg extension (the hands, not the foot, meet a ball the keeper is collecting), the root steps
// behind the ball rather than launching, and the hands own a ball they reach in the same tick as a leg
// (they are in front of it). Legs remain live emergency surfaces when the hands do not get there.
const GK_GATHER = {
  enabled: true,
  zMax: 0.75,               // a ball below this at the body is gatherable (same band that would otherwise extend the lead leg)
  latMax: 0.75,             // lateral pass distance from the current feet within which the keeper gets down behind it (= standingArm)
  planeTol: 0.35,           // the path sample must cross the hands plane within this (m)
  speedBandFrac: 0.5,       // gatherable up to vSecure + secureSpeedBand·this (cSpeedCatch ≥ 0.5): faster low balls are dived at / blocked
  lead: 0.25,               // the gather commits this much before "as late as feasible": hands down and SET, waiting (s)
  footFrac: 0.75,           // root travel toward the gather point (the body steps BEHIND a slow ball; a dive launches GK_DIVE.footFrac)
};
function gkContactSurfaceLabel(name, z) {   // FOOT/LEG/BODY/HANDS from volume + contact height
  if (name === "HAND") return "HANDS";
  if (name === "TORSO") return "BODY";
  return z < GK_BODY.ankleZ ? "FOOT" : z < GK_BODY.kneeZ ? "LEG" : "LEG";
}
function gkTierKey(tier) {
  if (tier === "STANDING REACHABLE") return "STANDING";
  if (tier === "LOW-DIVE REACHABLE") return "LOW";
  if (tier === "MEDIUM-DIVE REACHABLE") return "MEDIUM";
  if (tier === "HIGH/FULL-STRETCH REACHABLE") return "HIGH";
  if (tier === "FINGERTIP-LIMIT") return "FINGERTIP";
  return "HIGH";
}
// coast on legitimate momentum with natural damping — NO target steering. Used by
// the READ phase so a stationary SET keeper stays put and a keeper with legitimate
// pre-shot momentum decays naturally (never artificially zeroed).
function gkCoast(gk) {
  const d = Math.max(0, 1 - GK_CFG.coastDamp * PT_DT);
  gk.vx *= d; gk.vy *= d; gk.x += gk.vx * PT_DT; gk.y += gk.vy * PT_DT;
}
// accel-limited move toward a target with arrival braking (settles); shared by the
// M6 single prep step and the legacy SET-hold. Returns nothing; mutates gk.
function gkDriveTo(gk, tx, ty, brake) {
  const toX = tx - gk.x, toY = ty - gk.y, d = Math.hypot(toX, toY);
  const _t = (typeof S !== "undefined" && S.pt) || null;
  const vmax = GK_MOVE.vmaxBase + GK_MOVE.vmaxGain * gkNorm01(gkAttr(_t, gk, "sprint_speed"));
  const accel = GK_MOVE.accelBase + GK_MOVE.accelGain * gkNorm01(gkAttr(_t, gk, "acceleration"));
  const tv = d < 1e-3 ? 0 : Math.min(vmax, Math.sqrt(2 * brake * d));
  const wvx = d < 1e-3 ? 0 : toX / d * tv, wvy = d < 1e-3 ? 0 : toY / d * tv;
  let dvx = wvx - gk.vx, dvy = wvy - gk.vy; const dvm = Math.hypot(dvx, dvy), lim = accel * PT_DT;
  if (dvm > lim) { dvx = dvx / dvm * lim; dvy = dvy / dvm * lim; }
  gk.vx += dvx; gk.vy += dvy; gk.x += gk.vx * PT_DT; gk.y += gk.vy * PT_DT;
}
function gkTrackDiag(gk) {   // reversal + pre-commit distance diagnostics
  const sgn = gk.vy > 0.05 ? 1 : gk.vy < -0.05 ? -1 : 0;
  if (sgn !== 0 && gk._lastMoveSgn != null && sgn !== gk._lastMoveSgn) gk.moveReversals = (gk.moveReversals || 0) + 1;
  if (sgn !== 0) gk._lastMoveSgn = sgn;
  gk.preCommitDist = (gk.preCommitDist || 0) + Math.hypot(gk.vx, gk.vy) * PT_DT;
}
// shared COMMIT: choose the best physically reachable interception ONCE, from the
// keeper's CURRENT position, then freeze it (the dive re-aims never). Identical for
// every movement policy — the policy only governs the pre-commit foot motion.
function gkTryCommit(t, gk, ev) {
  const env = ev.env || gkEnvelope(t, gk, gkHeightM(t, gk));
  const ho = [gk.x, gk.y, gk.handZ], tp = [ev.point.x, ev.point.y, ev.point.z];
  const L = Math.hypot(tp[0] - gk.x, tp[1] - gk.y);           // lateral demand from CURRENT feet
  const norm = gkEnvNorm(env, L, tp[2]);                      // coupled-envelope reach (lateral vs vertical compete)
  const reachable = norm <= 1.0;
  const tier = (L <= GK_REACH.standingArm && tp[2] <= env.standingReachZ && tp[2] >= env.comfortZ - GK_REACH.standingArm) ? "STANDING REACHABLE"
             : (tp[2] < GK_REACH.lowBandZ ? "LOW-DIVE REACHABLE" : tp[2] < GK_REACH.midBandZ ? "MEDIUM-DIVE REACHABLE" : "HIGH/FULL-STRETCH REACHABLE");
  // execution time from the ACTUAL hand displacement and mechanism (GK_ACTION; legacy: tier × reach fraction)
  const dirx = tp[0] - gk.x, diry = tp[1] - gk.y, dl = Math.hypot(dirx, diry) || 1e-6;
  const vAlong = (gk.vx * dirx + gk.vy * diry) / dl;
  const ax = gkExecTime(t, gk, tier, norm, tp, vAlong), execT = ax.execT;
  const gather = !!ev.gather, lead = gather ? GK_GATHER.lead : 0;   // a gather commits early: hands down and set before the ball
  // a gather with time in hand lets the single M6 preparation step be decided first (step under the ball, then get down)
  if (gather && !gk.prepared && (t.gkMovePolicy || "M6") === "M6" && ev.availableTime > GK_MOVE.m6PrepHorizon) return;
  const thr = execT + GK_DIVE.commitBuffer + lead;
  if (ev.availableTime <= thr && ev.availableTime > -0.2) {
    // SUB-TICK COMMIT ORIGIN (continuous-attribute pass, 2026-09-05). The decision is evaluated once per 60 Hz tick, but
    // the instant it became true lies inside the tick: at the READ end when the keeper is reaction-bound (the condition
    // already held when the reaction elapsed), otherwise where the shrinking available time crossed the threshold. The
    // action starts there (never before the READ end, never more than one tick back). Evaluating the origin only at tick
    // boundaries made the reaction latency a 16.7 ms staircase: reflex ratings 90 and 99 were identical, 45 and 50 often
    // identical, and no timing attribute could be continuous.
    const readEnd = gk.shotT0 + gk.latency;
    const cross = t.now - Math.max(0, thr - ev.availableTime);
    const t0 = Math.max(readEnd, cross, t.now - PT_DT);
    // committed hand target: the interception if reachable, else the farthest point ON
    // the envelope boundary toward the ball (best-effort stretch — will miss, shows reach).
    let tx = tp[0], ty = tp[1], tz = tp[2];
    if (!reachable && norm > 1e-6) {
      const s = 1 / norm, dxl = tp[0] - gk.x, dyl = tp[1] - gk.y;
      tx = gk.x + dxl * s; ty = gk.y + dyl * s; tz = env.comfortZ + (tp[2] - env.comfortZ) * s;
    }
    tz = Math.max(0, Math.min(env.highReachZ, tz));
    gk.committed = { t0, tier: reachable ? tier : "UNREACHABLE", execTime: execT, bestEffort: !reachable,
      action: gather ? "GATHER" : ax.action, gather, gatherSpeed: gather ? ev.gatherSpeed : null, gatherRel: gather ? ev.gatherRel : null, gatherSecure: gather ? ev.gatherSecure : null,
      actionDetail: { dArm: ax.dArm, dBody: ax.dBody, tArm: ax.tArm, tBody: ax.tBody },
      target: [tx, ty, tz], feet: [gk.x, gk.y], handOrigin: ho,
      reachMargin: +((1 - norm) * env.maxLat).toFixed(2), diveSpanMax: env.maxLat, envNorm: +norm.toFixed(3),
      tShotToReact: gk.latency, tReactToCommit: t0 - (gk.shotT0 + gk.latency), commitTime: t0, commitTick: t.now };
    gk.phase = "COMMIT";
  }
}
function gkStage3Move(t, gk, reactRemain) {
  // ── STRICT STATE MACHINE (item B): POSITION happens ONLY pre-shot in the Stage-1
  // branch; after SHOT the tactical positioning controller NEVER runs again. Here we
  // pass through READ → PREPARE → COMMIT → SAVE. Only COMMIT/SAVE (and one deliberate
  // PREPARE step) may translate the keeper; READ never steers toward the prediction.
  if (gk.committed) {                                   // ── SAVE: ballistic dive to the FROZEN target, no re-aim
    const c = gk.committed, dtc = t.now - c.t0, u = Math.max(0, Math.min(1, dtc / c.execTime)), e = u * u * (3 - 2 * u);
    gk.handNow = [c.handOrigin[0] + (c.target[0] - c.handOrigin[0]) * e,
                  c.handOrigin[1] + (c.target[1] - c.handOrigin[1]) * e,
                  c.handOrigin[2] + (c.target[2] - c.handOrigin[2]) * e];
    // root travel: a GATHER steps behind the ball; a STANDING reach keeps the feet planted (hands reach, a small lateral
    // shuffle only — no forward lunge into the ball's path); a dive launches the body toward the target
    const standing = c.tier === "STANDING REACHABLE" && !c.gather;
    const ffx = c.gather ? GK_GATHER.footFrac : standing ? 0 : GK_DIVE.footFrac;
    const ffy = c.gather ? GK_GATHER.footFrac : standing ? GK_DIVE.footFracStandingLat : GK_DIVE.footFrac;
    const fx = c.feet[0] + (c.target[0] - c.feet[0]) * ffx * e;
    const fy = c.feet[1] + (c.target[1] - c.feet[1]) * ffy * e;
    gk.vx = (fx - gk.x) / PT_DT; gk.vy = (fy - gk.y) / PT_DT; gk.x = fx; gk.y = fy; gk.diveU = u;
    // LEAD LEG: a low committed dive (target below lowDiveZ) extends the near leg/foot
    // toward the ball at ground/ankle height — this is what actually reaches a low ball
    // just beyond the feet (a leg/foot save), separate from the reaching hand.
    // A GATHER never extends it: the keeper is collecting the ball with his hands, body behind them
    // (ground battery: the extended foot met every gatherable roller first and deflected it on).
    // The tip travels TO the target (never past it — the old fixed 0.95 m lunge overshot a ball 0.75 m out and left
    // its contact to timing luck between profiles), and a ball INSIDE the stance closes the legs instead.
    gk.legSpreadNow = GK_BODY.footSpread;
    if (!c.gather && c.target[2] < GK_BODY.lowDiveZ) {
      const dyh = c.target[1] - c.feet[1];
      if (Math.abs(dyh) > GK_BODY.footSpread) {
        // the leg sweeps LATERALLY across the ball's path at the keeper's own body plane (a small forward lead of the
        // foot), out to the ball's line — never toward a hand target upfield: aimed at the hand target, a keeper who
        // (with a faster read) took an earlier, more upfield point swept his leg diagonally and left the ball's line
        // uncovered at his body while a slower keeper's lateral sweep blocked it (ground battery inversions).
        const ext = Math.min(GK_BODY.footSpread + GK_BODY.legExtendMax, Math.abs(dyh)) * e;
        gk.legTipNow = [fx - GK_BODY.legLeadFwd, fy + Math.sign(dyh) * ext, GK_BODY.legExtendZ];
      } else { gk.legTipNow = null; gk.legSpreadNow = GK_BODY.footSpread * (1 - GK_BODY.legCloseFrac * e); }
    } else gk.legTipNow = null;
    gk.phase = "SAVE"; return;
  }
  // predInt (raw evolving read) is INFORMATION for every policy/phase — never a steer target by itself.
  const ev = (gk.reach && gk.reach.best) || (gk.reach && gk.reach.line);
  if (ev && ev.point) gk.predInt = [ev.point.x, ev.point.y, ev.point.z];
  const setX = gk.setPos ? gk.setPos[0] : gk.x, setY = gk.setPos ? gk.setPos[1] : gk.y;

  if (reactRemain > 0) {                                // ── READ (reaction not yet elapsed): coast only, no steering
    gk.phase = "READ"; gk.moveTarget = [setX, setY]; gk.desired = [setX, setY];
    gkCoast(gk); return;                               // cannot act yet; do NOT commit
  }

  const pol = t.gkMovePolicy || "M6";
  if (pol === "M6") {
    // ── M6 READ → PREPARE: stay essentially SET while reading; take at most ONE
    // deliberate preparation step once the save side is confidently known.
    let cr = gk.predict && gk.predict.crossing ? gk.predict.crossing : null;
    // a gatherable ball that never reaches the line (a roller that will stop short) has no crossing to read: the
    // preparation step is taken on the GATHER point instead (ground/low-ball pass) — same single capped step
    if (!cr && ev && ev.gather && ev.point) cr = { y: ev.point.y, t: ev.point.t, gather: true };
    if (cr) { (gk._crossHist = gk._crossHist || []).push(cr.y); if (gk._crossHist.length > GK_REACH.obsWindow) gk._crossHist.shift(); }
    const hist = gk._crossHist || [];
    const settled = hist.length >= 4 && (Math.max(...hist) - Math.min(...hist)) < GK_MOVE.m6SettleBand;
    const avail = ev ? ev.availableTime : 99;
    const infoElapsed = (t.now - (gk.shotT0 + gk.latency)) >= GK_MOVE.m6PrepMinInfo;
    if (!gk.prepared && cr && ev && ev.point && infoElapsed && (settled || avail <= GK_MOVE.m6PrepHorizon)) {
      // ONE step toward where the FEET should stand to play the read. Laterally: under the read.
      // In depth: only what the interception itself demands — the hand meets a ball up to
      // GK_REACH.handFwd ahead of the feet without a step (the same allowance the candidate
      // generation in gkReachEval uses), so a point inside that forward reach asks for NO forward
      // step; a point behind the feet asks for a drop step toward it. Bounds are the keeper's own
      // geometry (never a positioning-candidate depth band: the inherited P4 band's 3.2 m floor sat
      // UPFIELD of the D2 SET position beyond ~17 m and commanded a 0.35–1.00 m forward hop —
      // long-shot movement audit, 2026-09-04).
      const cap = GK_MOVE.m6PrepStepMax;
      const dxp = ev.point.x - setX;                                            // + = the point is behind the feet (toward the line)
      const needX = dxp < 0 ? Math.min(0, dxp + GK_REACH.handFwd) : dxp;
      const wantX = Math.min(GK_MOUTH.lineX - GK_POS_FC.minDepth, setX + needX);
      const sx = Math.max(-cap, Math.min(cap, wantX - setX));
      const sy = Math.max(-cap, Math.min(cap, ev.point.y - setY));   // ONE step toward the read, capped & FROZEN
      gk.prepTarget = [setX + sx, setY + sy]; gk.prepared = true; gk.saveSide = Math.sign(ev.point.y - setY) || 0;
      gk.phase = "PREPARE";
    }
    if (gk.prepared) {                                  // execute/settle the single frozen prep step (arrival-braked)
      gk.phase = gk.phase === "COMMIT" ? gk.phase : "PREPARE";
      gk.moveTarget = gk.prepTarget.slice(); gk.desired = gk.prepTarget.slice();
      gkDriveTo(gk, gk.prepTarget[0], gk.prepTarget[1], GK_MOVE.arriveBrake);
    } else {                                            // READ: coast only, hold SET
      gk.phase = "READ"; gk.moveTarget = [setX, setY]; gk.desired = [setX, setY];
      gkCoast(gk);
    }
    gkTrackDiag(gk);
  } else if (ev && ev.point) {
    // ── M1–M5 LEGACY continuous pre-commit tracking (kept for comparison only) ──
    gk.phase = "TRACK";
    const _D = t.gkDepth || GK_DEPTH;
    const clampX = (x) => Math.max(GK_MOUTH.lineX - _D.maxDepth, Math.min(GK_MOUTH.lineX - _D.minDepth, x));
    const predX = clampX(ev.point.x), predY = ev.point.y;
    let mtX, mtY;
    if (pol === "M1") { mtX = predX; mtY = predY; }
    else if (pol === "M2") { const sh = GK_MOVE.m2Shuffle;
      mtX = setX + Math.max(-sh, Math.min(sh, predX - setX)); mtY = setY + Math.max(-sh, Math.min(sh, predY - setY)); }
    else {
      const P = GK_MOVE.damp[pol] || GK_MOVE.damp.M4;
      if (!gk.moveTarget) gk.moveTarget = [setX, setY];
      if (!gk._mtDir) gk._mtDir = [0, 0];
      const step = (ax, pv) => { const diff = pv - gk.moveTarget[ax]; let db = P.deadband;
        if (gk._mtDir[ax] !== 0 && Math.sign(diff) !== gk._mtDir[ax]) db *= P.reversal;
        if (Math.abs(diff) > db) { gk.moveTarget[ax] += diff * P.alpha; gk._mtDir[ax] = Math.sign(diff); } };
      step(0, predX); step(1, predY); mtX = gk.moveTarget[0]; mtY = gk.moveTarget[1];
    }
    gk.moveTarget = [mtX, mtY]; gk.desired = [mtX, mtY];
    const ddx = mtX - gk.x, ddy = mtY - gk.y, dd = Math.hypot(ddx, ddy) || 1e-6;
    const vmax = GK_MOVE.vmaxBase + GK_MOVE.vmaxGain * gkNorm01(gk.attrs.sprint_speed);
    const accel = GK_MOVE.accelBase + GK_MOVE.accelGain * gkNorm01(gk.attrs.acceleration);
    const want = dd < 0.15 ? 0 : vmax;
    let dvx = ddx / dd * want - gk.vx, dvy = ddy / dd * want - gk.vy;
    const dvm = Math.hypot(dvx, dvy), lim = accel * PT_DT;
    if (dvm > lim) { dvx = dvx / dvm * lim; dvy = dvy / dvm * lim; }
    gk.vx += dvx; gk.vy += dvy; gk.x += gk.vx * PT_DT; gk.y += gk.vy * PT_DT;
    gkTrackDiag(gk);
  } else {
    gk.phase = "READ"; gkCoast(gk);
  }

  // ── COMMIT (shared): from the keeper's CURRENT position, as late as feasible.
  if (ev && ev.point) gkTryCommit(t, gk, ev);
}
function gkTryContact(t, b) {
  // genuine swept keeper->ball TOI over DISTINCT anatomy volumes (item I/J). The save
  // surface EMERGES from whichever volume the ball reaches first — earliest substep
  // wins; the moving keeper geometry decides, we never pick a surface then move to it.
  // Returns a contact record (and mutates the ball) ONLY on a real intersection.
  const gk = t.gk;
  if (!GK_COLLIDE || !gk || !gk.shotActive) return null;
  if (gk.lastContactT != null && t.now - gk.lastContactT < GK_DIVE.reContactMinGap) return null;   // never re-process the same touch
  if (b.x < GK_MOUTH.lineX - GK_DIVE.nearBox || !gk.handNow || !gk.handPrev) return null;
  const dt = PT_DT, K = GK_DIVE.contactSubsteps, br = GOALFX.ballR, H = gk.height;
  const p0 = [b.x, b.y, b.z], p1 = [b.x + b.vx * dt, b.y + b.vy * dt, b.z + b.vz * dt];
  const handR = GK_HAND[t.gkHand] != null ? GK_HAND[t.gkHand] : GK_DIVE.handR; gk.handRActive = handR;
  const hipZ = GK_BODY.hipFrac * H, shZ = GK_BODY.shoulderFrac * H, thighZ = GK_BODY.thighFrac * H;
  const r0 = gk.bodyPrev, r1 = gk.bodyNow;
  const sp0 = gk.legSpreadPrev != null ? gk.legSpreadPrev : GK_BODY.footSpread, sp1 = gk.legSpreadNow != null ? gk.legSpreadNow : GK_BODY.footSpread;   // stance half-width (legs close on a central low ball)
  // surface list. Order is only a SAME-SUBSTEP tie-break; distinct geometry does the
  // real work (earliest substep across all volumes wins). The reaching hand is tested
  // first because it is the keeper's primary active save surface; feet/legs/torso then
  // catch the low/central balls the hand does not (foot saves emerge for balls at the
  // feet — see the low-shot battery).
  const surf = [
    { name: "HAND",  sphere: true,  p0: gk.handPrev, p1: gk.handNow, R: handR },
    { name: "TORSO", sphere: false, p0: r0, p1: r1, R: GK_BODY.torsoR, zLo: hipZ, zHi: shZ },
    { name: "LEG+",  sphere: false, p0: [r0[0], r0[1] + sp0], p1: [r1[0], r1[1] + sp1], R: GK_BODY.legR, zLo: 0, zHi: thighZ },
    { name: "LEG-",  sphere: false, p0: [r0[0], r0[1] - sp0], p1: [r1[0], r1[1] - sp1], R: GK_BODY.legR, zLo: 0, zHi: thighZ },
  ];
  if (gk.legTipNow && gk.legTipPrev) surf.push({ name: "LEGTIP", sphere: true, p0: gk.legTipPrev, p1: gk.legTipNow, R: GK_BODY.legR });
  let hit = null;
  const exclVol = gk.lastContactByVol || {};
  const sweep = (list) => {
    for (let s = 1; s <= K; s++) {
      const f = s / K;
      const bx = p0[0] + (p1[0] - p0[0]) * f, by = p0[1] + (p1[1] - p0[1]) * f, bz = p0[2] + (p1[2] - p0[2]) * f;
      for (const su of list) {
        if (exclVol[su.name] != null && t.now - exclVol[su.name] < GK_DIVE.reContactExcl) continue;   // this volume just touched the ball; another volume (or a frame rebound later) may
        const kx = su.p0[0] + (su.p1[0] - su.p0[0]) * f, ky = su.p0[1] + (su.p1[1] - su.p0[1]) * f;
        const kz = su.sphere ? su.p0[2] + (su.p1[2] - su.p0[2]) * f : Math.max(su.zLo, Math.min(su.zHi, bz));
        if (Math.hypot(bx - kx, by - ky, bz - kz) <= su.R + br) {
          // a collision needs APPROACH: ball velocity relative to the surface pointing into it. A ball already
          // separating (just deflected, or overtaking a hand that follows it) is not struck again.
          const svx = (su.p1[0] - su.p0[0]) / dt, svy = (su.p1[1] - su.p0[1]) / dt, svz = su.sphere ? (su.p1[2] - su.p0[2]) / dt : 0;
          let nx = bx - kx, ny = by - ky, nz = bz - kz; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
          const approach = (b.vx - svx) * nx + (b.vy - svy) * ny + (b.vz - svz) * nz;
          if (approach >= 0) continue;
          return { su, f, ballPt: [bx, by, bz], keeperPt: [kx, ky, kz] }; }
      }
    }
    return null;
  };
  // GATHER ordering (ground/low-ball pass): while collecting a low ball the hands are IN FRONT of the legs, so a
  // hand that reaches the ball within this tick owns it even if a standing leg would have brushed it a substep
  // earlier (the same tick, ≤ 1/60 s). If the hands do not get there, every other surface stays live — an
  // emergency leg/foot block is never disabled.
  if (gk.committed && gk.committed.gather) { hit = sweep([surf[0]]) || sweep(surf.slice(1)); }
  else hit = sweep(surf);
  if (!hit) return null;
  const su = hit.su;
  const sv = [(su.p1[0] - su.p0[0]) / dt, (su.p1[1] - su.p0[1]) / dt, (su.sphere ? (su.p1[2] - su.p0[2]) : 0) / dt];  // moving-surface velocity (item K)
  const label = gkContactSurfaceLabel(su.name, hit.ballPt[2]) +
    (su.name === "LEG+" ? "-R" : su.name === "LEG-" ? "-L" : su.name === "LEGTIP" ? "-LEAD" : "");
  return gkApplyContact(t, b, label, hit.ballPt, hit.keeperPt, hit.f, su.R, sv, su.name);
}
// ══════════════════ GOALKEEPER V1 — STAGE 4 (CONTACT QUALITY) ═══════════════
// Stage 3 (FROZEN) decides WHETHER / WHERE / WHEN the keeper physically meets the
// ball: positioning, READ, prediction, PREPARE, COMMIT, reach envelope and the swept
// anatomy TOI above are untouched. Stage 4 decides WHAT HAPPENS AFTER that legitimate
// contact, from continuous geometry and timing ONLY — no p_save, no Bernoulli roll,
// no scripted rebound destination:
//   CONTACT TOI → CONTACT QUALITY → CATCH / CONTROLLED PARRY / WEAK PARRY /
//   FINGERTIP / BODY BLOCK / FOOT SAVE / LEG SAVE → live authoritative ball physics.
// gk_handling acts here and ONLY here (post-contact control): secure-catch tolerance,
// absorption of incoming speed, parry control, and whether marginal hand contacts stay
// useful. It never touches reaction, reach, positioning or movement.
const GK_CONTACT = {
  // ── bounded physical surface speeds (m/s). The Stage-3 dive interpolates the hand
  // kinematically over a short execTime and can report transient hand speeds of
  // 15–20 m/s; a real hand/limb transfers momentum at bounded speed.
  handSpeedMax: 7.0, rootSpeedMax: 4.5, legTipSpeedMax: 4.0,
  // ── passive surface response: restitution e (normal), tangential retention kt, and for UN-BRACED
  //    surfaces a bounded normal impulse jMax (+ jMaxHand·h01) m/s — a fingertip or an unset wrist
  //    cannot reverse a fast ball like a wall, so the ball can leak through with a small deflection
  surf: {
    HAND:      { e: 0.30, kt: 0.80 },                          // braced palm/glove absorbs (a CONTROLLED parry adds the bounded push below)
    HAND_WEAK: { e: 0.22, kt: 0.85, jMax: 14, jMaxHand: 6 },   // unset / poorly aligned palm: little control; slow balls spill, fast balls leak through
    FINGERTIP: { e: 0.55, kt: 0.97, jMax: 3.5 },               // glancing extremity: a small, bounded change of path
    BODY:      { e: 0.35, kt: 0.75 },                          // torso / ribs (body mass)
    LEG:       { e: 0.50, kt: 0.80 },                          // shin
    FOOT:      { e: 0.55, kt: 0.72 },                          // boot
  },
  // ── contact-quality geometry (all inputs physical; each factor is 0..1)
  catchReachFull: 0.55, catchReachZero: 1.0,   // envelope norm of the ACTUAL contact: full catch cap ≤ full; cap → 0 at the boundary (item 12)
  ctrlReachFull: 0.70, ctrlReachFloor: 0.50,   // parry-control reach factor: 1 ≤ full, → floor at the boundary (a well-timed full-stretch parry stays controllable)
  setFloor: 0.45,           // hand "set" factor = floor + (1−floor)·u², u = dive progress at contact (1 = arm extended & braced; <1 = met the ball mid-swing)
  handAssistR: 0.35,        // a TORSO contact with the reaching hand within this of the ball is a hands+chest gather (catch possible), else a body block
  standingRootStill: true,  // a STANDING-tier reach moves the root only via the short dive interpolation (an animation artefact, not body momentum): treat the body as set
  alignZero: 0.35,          // cosθ (−v̂rel·n) at/below which a palm contact has zero alignment (pure edge)
  edgeSin: 0.90,            // palm offset sinθ ≥ this ⇒ the ball met the hand's edge/fingers ⇒ FINGERTIP
  twoHandNear: 0.30, twoHandFar: 0.80,   // lateral offset of the contact from the body line: both hands ≤ near, one hand ≥ far (m)
  balanceRootV: 4.0,        // body speed at which balance is fully compromised (m/s)
  zComfortLo: 0.5, zComfortHi: 1.9, zHighMax: 2.6,   // comfortable catching heights (m); above/below degrade
  trajElev0: 25, trajElev1: 60,                       // steep incoming elevation (deg) degrades control (dipping / rising balls)
  // ── gk_handling (post-contact ONLY)
  secureSpeedBase: 10.0, secureSpeedGain: 9.0, secureSpeedBand: 9.0,   // body-relative speed absorbed into a secure hold: base + gain·h01 (+band fade)
  secureStrengthGain: 2.0, weakHandStrengthGain: 3.0,                  // strength: +absorbed speed for a secure hold; +bounded impulse an un-braced hand can give (m/s)
  ballMass: 0.43,                                                       // kg — body/leg/foot responses use the true two-body mass factor W/(W+m) (keeper weight is physical metadata)
  ctrlSpeed0Base: 14.0, ctrlSpeed0Gain: 6.0, ctrlSpeed1Base: 26.0, ctrlSpeed1Gain: 10.0, ctrlSpeedFloor: 0.15,   // parry control vs body-relative speed: full ≤ s0(h), floor ≥ s1(h) — a better handler steers faster balls
  catchThreshBase: 0.62, catchThreshGain: 0.17,   // catchScore needed for CATCH: base − gain·h01 (secure-catch tolerance)
  ctrlThreshBase: 0.55, ctrlThreshGain: 0.17,     // controlScore needed for CONTROLLED PARRY (marginal contacts stay useful)
  // ── controlled-parry push: bounded keeper impulse (m/s) along the palm normal (angled ≤ palmTiltMax·control toward
  //    the safe side = away from the mouth centre) blended with the hand's own sweep direction
  pushBase: 2.5, pushGain: 4.0, pushHandGain: 0.4, palmTiltMax: 35, sweepBlend: 0.6,
  fingertipFlick: 1.2,      // bounded fingertip flick impulse (m/s) × (0.5 + 0.5·h01)
  // ── sensitivities: score = cap · Π factor^w (multiplicative — a near-zero factor kills the score; no additive bonuses)
  // ── BODY-SUPPORTED CATCH (ground/chest pass, 2026-09-04): hands in front of the chest with the torso directly behind
  //    them absorb far more pace than hands alone — the chest is the backstop, the arms give. Pure geometry gates it
  //    (ball inside the torso width between hip and shoulder, both hands, hands on the ball, body directly behind);
  //    it raises the SECURE-HOLD speed only. It never widens contact, never adds reach, never reads a shot family.
  supportLatMargin: 0.12,   // support fades over this beyond the torso half-width (m)
  supportZRamp: 0.12,       // support ramps in over this above the hip and out over this below the shoulder line (m)
  supportDepth: 1.00,       // support fades to zero this far in front of the chest surface (set hands 0.3–0.45 m ahead of the chest keep ≥ 85 %: the arms give and bring the ball in) (m)
  chestSupportBase: 6.0, chestSupportStrengthGain: 2.0,   // extra absorbed speed (m/s) with full support: base + gain·s01(strength)
  // ── OBSERVED trajectory instability (knuckling hook): catch quality falls as the observed change of acceleration
  //    between airborne samples exceeds jitter0 (fully unstable at jitter1). Smooth physics (gravity, drag, curve)
  //    leave ~0; a future erratic flight would register here from the ball's OBSERVED behaviour, never from a label.
  jitter0: 6.0, jitter1: 25.0,
  gatherArriveU: 0.90,      // a low HAND contact made with the dive this far complete (hands down, body behind) is judged in the gather posture
  wCatch: { align: 0.5, speed: 0.8, hands: 0.5, balance: 0.4, height: 0.5, set: 0.5, stable: 0.5 },
  wCtrl:  { reach: 0.5, align: 0.8, hands: 0.4, balance: 0.3, speed: 0.5, set: 0.5 },
  separation: 0.02,         // post-contact positional separation along the response normal (m)
};
function gkSmooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
function gkCapVec3(v, max) { const m = Math.hypot(v[0], v[1], v[2]); return (m > max && m > 1e-9) ? [v[0] / m * max, v[1] / m * max, v[2] / m * max] : [v[0], v[1], v[2]]; }
function gkRotateToward(n, s, maxDeg) {   // rotate unit n toward unit s by at most maxDeg; returns a unit vector
  const dot = Math.max(-1, Math.min(1, n[0] * s[0] + n[1] * s[1] + n[2] * s[2]));
  const phi = Math.acos(dot), lim = maxDeg * Math.PI / 180;
  if (phi <= lim + 1e-9) return [s[0], s[1], s[2]];
  let ux = s[0] - dot * n[0], uy = s[1] - dot * n[1], uz = s[2] - dot * n[2]; const ul = Math.hypot(ux, uy, uz);
  if (ul < 1e-9) return [n[0], n[1], n[2]];
  ux /= ul; uy /= ul; uz /= ul; const c = Math.cos(lim), si = Math.sin(lim);
  return [n[0] * c + ux * si, n[1] * c + uy * si, n[2] * c + uz * si];
}
function gkHandling(t, gk) { return t.gkHandling != null ? t.gkHandling : gk.attrs.gk_handling; }
// CONTACT QUALITY — continuous scores from physically meaningful contact variables.
//   n        response normal (unit, keeper surface → ball)
//   handVel  bounded velocity of the contacting surface (alignment is judged in ITS frame — the sweep geometry)
//   rootVel  bounded body velocity (the speed the keeper must ABSORB is ball-vs-body: the hand gives)
function gkContactQuality(t, gk, volume, ballPt, n, vIn, handVel, rootVel, u) {
  const C = GK_CONTACT, h01 = gkShape01(gkHandling(t, gk)), s01 = gkShape01(gkAttr(t, gk, "strength"));
  const cSet = C.setFloor + (1 - C.setFloor) * u * u;                          // arm extended & braced (u→1) vs met mid-swing / before commit
  const env = gkEnvelope(t, gk, gkHeightM(t, gk));
  const origin = gk.committed ? gk.committed.feet : [gk.x, gk.y];            // reach origin = feet at commit (exactly what Stage-3 commit measured)
  const L = Math.hypot(ballPt[0] - origin[0], ballPt[1] - origin[1]);
  const norm = gkEnvNorm(env, L, ballPt[2]);                                   // coupled-envelope reach demand of the ACTUAL contact point
  const vr = [vIn[0] - handVel[0], vIn[1] - handVel[1], vIn[2] - handVel[2]]; const vrm = Math.hypot(vr[0], vr[1], vr[2]) || 1e-9;
  const cos = Math.max(-1, Math.min(1, -(vr[0] * n[0] + vr[1] * n[1] + vr[2] * n[2]) / vrm));   // 1 = ball meets the palm centre head-on
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos));                                          // palm offset: 0 centre of palm … 1 extreme edge
  const cAlign = Math.max(0, Math.min(1, (cos - C.alignZero) / (1 - C.alignZero)));
  const vb = [vIn[0] - rootVel[0], vIn[1] - rootVel[1], vIn[2] - rootVel[2]]; const sRel = Math.hypot(vb[0], vb[1], vb[2]);
  const vSecure = C.secureSpeedBase + C.secureSpeedGain * h01 + C.secureStrengthGain * s01;   // strength: absorbing a hard ball into a secure hold (bracing), never reach
  const body0 = gk.bodyNow || [gk.x, gk.y];
  const Lbody0 = Math.hypot(ballPt[0] - body0[0], ballPt[1] - body0[1]);
  // body-supported catch geometry (see GK_CONTACT): chest corridor × hands on the ball × body behind the hands
  const Hm = gkHeightM(t, gk), hipZ = GK_BODY.hipFrac * Hm, shZ = GK_BODY.shoulderFrac * Hm;
  const vh = Math.hypot(vb[0], vb[1]) || 1e-9, ex = vb[0] / vh, ey = vb[1] / vh;            // approach direction in the body frame
  const bdx = ballPt[0] - body0[0], bdy = ballPt[1] - body0[1];
  const latOff = Math.abs(bdx * ey - bdy * ex);                                              // ball offset from the body line, across the approach
  const ahead = -(bdx * ex + bdy * ey);                                                      // ball distance in FRONT of the body axis along the approach
  // two hands available: judged on the LATERAL offset from the body line (a ball dead in front of the chest, met by set
  // hands 0.45 m ahead of it, is a two-hand ball; the old full-distance measure called it one-and-a-half hands)
  const two0 = Math.max(0, Math.min(1, 1 - (latOff - C.twoHandNear) / (C.twoHandFar - C.twoHandNear)));
  const corridor = Math.max(0, Math.min(1, (GK_BODY.torsoR + C.supportLatMargin - latOff) / C.supportLatMargin));
  const zb = ballPt[2], zr = C.supportZRamp;
  const zWin = zb < hipZ ? 0 : zb < hipZ + zr ? (zb - hipZ) / zr : zb <= shZ - zr ? 1 : zb < shZ ? (shZ - zb) / zr : 0;
  const hn = gk.handNow || [gk.x, gk.y, gk.handZ], handRq = gk.handRActive != null ? gk.handRActive : GK_DIVE.handR;
  const dHand = Math.hypot(hn[0] - ballPt[0], hn[1] - ballPt[1], hn[2] - ballPt[2]);
  const hAx = Math.hypot(hn[0] - body0[0], hn[1] - body0[1]);                       // hands held AT the chest (inside the torso width) meet a ball
  const chestAdj = hAx <= GK_BODY.torsoR + 0.05 ? GK_BODY.torsoR : 0;               //   on the chest SURFACE — the hand point sits one torso radius behind it
  const handsOn = Math.max(0, Math.min(1, 1 - (Math.max(0, dHand - chestAdj) - (handRq + GOALFX.ballR)) / C.handAssistR));
  const behind = Math.max(0, Math.min(1, 1 - Math.max(0, ahead - (GK_BODY.torsoR + GOALFX.ballR)) / C.supportDepth));
  const support = corridor * zWin * two0 * handsOn * behind;
  const vSecureEff = vSecure + (C.chestSupportBase + C.chestSupportStrengthGain * s01) * support;
  const cSpeedCatch = Math.max(0, Math.min(1, (vSecureEff + C.secureSpeedBand - sRel) / C.secureSpeedBand));
  const jitter = gk.obsJitter || 0;
  const stable = 1 - Math.max(0, Math.min(1, (jitter - C.jitter0) / (C.jitter1 - C.jitter0)));
  // GATHER POSTURE: a committed gather, or a low dive whose HANDS arrived with the body behind them (the same collapse —
  // a selection margin of one tick must not flip a held ball into a parry): hands-first contact below the gather band,
  // ball within the two-hand span of the body, hands down (u ≥ gatherArriveU). Legs/torso contacts never qualify.
  const gatherMode = !!(gk.committed && gk.committed.gather) ||
    (volume === "HAND" && ballPt[2] < GK_GATHER.zMax && Lbody0 <= C.twoHandFar && u >= C.gatherArriveU && !!gk.committed && gk.committed.tier !== "UNREACHABLE");
  const s0 = C.ctrlSpeed0Base + C.ctrlSpeed0Gain * h01, s1 = C.ctrlSpeed1Base + C.ctrlSpeed1Gain * h01;
  const cSpeedCtrl = Math.max(C.ctrlSpeedFloor, Math.min(1, (s1 - sRel) / (s1 - s0)));
  const Lbody = Lbody0, two = two0;
  const rootSp = Math.hypot(rootVel[0], rootVel[1]);
  const cBal = 1 - 0.7 * Math.max(0, Math.min(1, rootSp / C.balanceRootV));
  const z = ballPt[2]; let cZ;
  if (gatherMode) cZ = 1;                                     // body down behind the ball: a low ball is not a control problem in a gather
  else if (z < C.zComfortLo) cZ = 0.65 + 0.35 * z / C.zComfortLo;
  else if (z <= C.zComfortHi) cZ = 1;
  else cZ = Math.max(0.5, 1 - 0.5 * (z - C.zComfortHi) / (C.zHighMax - C.zComfortHi));
  const elev = Math.atan2(Math.abs(vb[2]), Math.hypot(vb[0], vb[1]) || 1e-9) * 180 / Math.PI;
  const cTraj = 1 - 0.5 * Math.max(0, Math.min(1, (elev - C.trajElev0) / (C.trajElev1 - C.trajElev0)));
  const cHeight = cZ * cTraj;
  const normCatch = gatherMode ? L / env.maxLat : norm;   // a gather gets DOWN to the ball (not a stretch): only its lateral demand bounds the catch
  const rCatch = 1 - gkSmooth01((normCatch - C.catchReachFull) / (C.catchReachZero - C.catchReachFull));   // item 12: reach bounds quality
  const rCtrl = 1 - (1 - C.ctrlReachFloor) * gkSmooth01((norm - C.ctrlReachFull) / (1 - C.ctrlReachFull));
  const W = C.wCatch, V = C.wCtrl;
  const catchScore = rCatch * Math.pow(cAlign, W.align) * Math.pow(cSpeedCatch, W.speed) * Math.pow(0.5 + 0.5 * two, W.hands) * Math.pow(cBal, W.balance) * Math.pow(cHeight, W.height) * Math.pow(cSet, W.set) * Math.pow(stable, W.stable);
  const controlScore = Math.pow(rCtrl, V.reach) * Math.pow(cAlign, V.align) * Math.pow(0.5 + 0.5 * two, V.hands) * Math.pow(cBal, V.balance) * Math.pow(cSpeedCtrl, V.speed) * Math.pow(cSet, V.set);
  const catchThresh = C.catchThreshBase - C.catchThreshGain * h01, ctrlThresh = C.ctrlThreshBase - C.ctrlThreshGain * h01;
  const fingertip = norm >= C.catchReachZero || sin >= C.edgeSin;
  const r = (v) => +v.toFixed(3);
  return { volume, norm: r(norm), reachMargin: r((1 - norm) * env.maxLat), cos: r(cos), sin: r(sin), cAlign: r(cAlign), sRel: r(sRel), vSecure: r(vSecure), vSecureEff: r(vSecureEff), u: r(u), cSet: r(cSet),
           support: r(support), corridor: r(corridor), zWin: r(zWin), handsOn: r(handsOn), behind: r(behind), latOff: r(latOff), ahead: r(ahead), stable: r(stable), jitter: r(jitter), gather: gatherMode,
           cSpeedCatch: r(cSpeedCatch), cSpeedCtrl: r(cSpeedCtrl), Lbody: r(Lbody), two: r(two), rootSp: r(rootSp), cBal: r(cBal), z: r(z), cZ: r(cZ), elev: r(elev), cTraj: r(cTraj), cHeight: r(cHeight),
           rCatch: r(rCatch), rCtrl: r(rCtrl), catchScore: r(catchScore), controlScore: r(controlScore), catchThresh: r(catchThresh), ctrlThresh: r(ctrlThresh), fingertip, h01: r(h01), handling: gkHandling(t, gk) };
}
function gkParryPush(C, q, n, handVel, ballPt) {   // controlled-parry push: bounded keeper impulse along the palm normal angled away from the mouth centre
  const sx = ballPt[0] - GK_MOUTH.lineX, sy = ballPt[1] - GK_MOUTH.centerY, sl = Math.hypot(sx, sy) || 1e-9;
  const tiltDeg = +(C.palmTiltMax * q.controlScore).toFixed(1);
  const palm = gkRotateToward(n, [sx / sl, sy / sl, 0], tiltDeg);            // palm angled (bounded by control) away from the mouth centre
  const hm = Math.hypot(handVel[0], handVel[1]);                              // the hand's LATERAL sweep carries the ball; its drop toward a low ball is not a push
  let dx = palm[0], dy = palm[1], dz = Math.max(0, palm[2]);                  // no deliberate push into the turf
  if (hm > 1.5) { dx += C.sweepBlend * handVel[0] / hm; dy += C.sweepBlend * handVel[1] / hm; }
  const dl = Math.hypot(dx, dy, dz) || 1e-9;
  return { push: (C.pushBase + C.pushGain * q.controlScore) * (1 - C.pushHandGain + C.pushHandGain * q.h01), pushDir: [dx / dl, dy / dl, dz / dl], tiltDeg };
}
function gkApplyContact(t, b, surface, ballPt, keeperPt, f, surfR, surfVel, volume) {
  const gk = t.gk, C = GK_CONTACT;
  const vol = volume || "HAND";
  // geometric contact normal from the Stage-3 TOI (contact point / time / volume are Stage-3's and unchanged)
  let gx = ballPt[0] - keeperPt[0], gy = ballPt[1] - keeperPt[1], gz = ballPt[2] - keeperPt[2];
  const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
  // RESPONSE normal. Leg-as-ground-cylinder rule: the lead-leg/foot volumes are sphere/
  // capsule stand-ins for a limb lying along the turf; a ball on the deck meets the limb's
  // SIDE face, so the response normal is horizontal (the old downward normal stamped the
  // ball into the ground and it squirted on into the goal — a "save" that scored).
  let nx = gx, ny = gy, nz = gz, nCorr = false;
  if ((vol === "LEGTIP" || vol === "LEG+" || vol === "LEG-") && ballPt[2] <= GK_BODY.legR + GOALFX.ballR + 0.02 && Math.abs(nz) > 1e-6) {
    nz = 0; const hl = Math.hypot(nx, ny); if (hl < 1e-6) { nx = -1; ny = 0; } else { nx /= hl; ny /= hl; } nCorr = true;
  }
  const vIn = [b.vx, b.vy, b.vz];
  const standing = !!(gk.committed && gk.committed.tier === "STANDING REACHABLE");
  const rootVel = (standing && C.standingRootStill) ? [0, 0, 0] : gkCapVec3([gk.vx || 0, gk.vy || 0, 0], C.rootSpeedMax);
  const handVel = vol === "HAND" ? gkCapVec3(surfVel || [0, 0, 0], C.handSpeedMax)
                : vol === "LEGTIP" ? gkCapVec3(surfVel || [0, 0, 0], C.legTipSpeedMax) : rootVel;
  // surface velocity that actually carries the ball: the BODY for hand/torso/standing legs (the
  // hand gives — its sweep enters only a controlled parry's push direction), the sliding limb for the lead leg
  const sv = vol === "LEGTIP" ? handVel : rootVel;
  const u = standing ? 1 : (gk.committed ? Math.max(0, Math.min(1, gk.diveU || 0)) : 0);   // dive progress at contact (0 = not yet committed)
  const q = gkContactQuality(t, gk, vol, ballPt, [nx, ny, nz], vIn, handVel, rootVel, u);
  // ── outcome vocabulary ──
  let outcome, key, push = 0, pushDir = null, tiltDeg = 0, handOnBall = null, via = null;
  if (vol === "HAND") {
    if (q.fingertip) { outcome = "FINGERTIP"; key = "FINGERTIP"; push = C.fingertipFlick * (0.5 + 0.5 * q.h01); pushDir = [nx, ny, nz]; }
    else if (q.catchScore >= q.catchThresh) { outcome = q.gather ? "GATHER" : q.support >= 0.5 ? "SUPPORTED CATCH" : "CATCH"; key = "HAND"; }
    else if (q.controlScore >= q.ctrlThresh) {
      outcome = "CONTROLLED PARRY"; key = "HAND";
      const pp = gkParryPush(C, q, [nx, ny, nz], handVel, ballPt); push = pp.push; pushDir = pp.pushDir; tiltDeg = pp.tiltDeg;
    } else { outcome = "WEAK PARRY"; key = "HAND_WEAK"; }
  } else if (vol === "TORSO") {
    // hands+chest gather: the reaching hand is ON the ball at the torso TOI (the ball met the
    // chest with the hands there), so a secure hold is possible; hands that cannot hold it still
    // PARRY it (they are on the ball) when they have the control; otherwise an uncontrolled block
    const hn = gk.handNow || [gk.x, gk.y, gk.handZ];
    handOnBall = Math.hypot(hn[0] - ballPt[0], hn[1] - ballPt[1], hn[2] - ballPt[2]) <= C.handAssistR + GOALFX.ballR;
    if (handOnBall && q.catchScore >= q.catchThresh) { outcome = q.gather ? "GATHER" : "CHEST CATCH"; key = "HAND"; via = "chest"; }
    else if (handOnBall && q.controlScore >= q.ctrlThresh) {
      outcome = "CONTROLLED PARRY"; key = "HAND"; via = "chest";
      const pp = gkParryPush(C, q, [nx, ny, nz], handVel, ballPt); push = pp.push; pushDir = pp.pushDir; tiltDeg = pp.tiltDeg;
    }
    else { outcome = "BODY BLOCK"; key = "BODY"; }
  }
  else { key = surface.startsWith("FOOT") ? "FOOT" : "LEG"; outcome = key + " SAVE"; }
  // ── physical response: reflect the surface-relative velocity about the response normal
  //    with the surface's restitution, keep kt of the tangential part, add the bounded push
  let vOut;
  const caught = outcome === "CATCH" || outcome === "SUPPORTED CATCH" || outcome === "CHEST CATCH" || outcome === "GATHER";   // possession vocabulary (all keeper-owned)
  if (caught) vOut = [0, 0, 0];
  else {
    const P = C.surf[key];
    const vr = [vIn[0] - sv[0], vIn[1] - sv[1], vIn[2] - sv[2]];
    const vn = vr[0] * nx + vr[1] * ny + vr[2] * nz;
    const vt = [vr[0] - vn * nx, vr[1] - vn * ny, vr[2] - vn * nz];
    let dvn = vn < 0 ? -(1 + P.e) * vn : 0;                                  // braced surface: the approach is reversed with restitution
    if (P.jMax != null) {                                                    // un-braced surface: bounded impulse (fast balls leak through)
      let jm = P.jMax + (P.jMaxHand || 0) * q.h01 + (key === "HAND_WEAK" ? C.weakHandStrengthGain * gkShape01(gkAttr(t, gk, "strength")) : 0);
      if (key === "HAND_WEAK") jm *= (1 + q.two) * (0.5 + 0.5 * q.cSet);      // bracing: two hands with the body behind, and an extended arm, hold far more than one unset hand
      dvn = Math.min(dvn, jm);
    }
    if (key === "BODY" || key === "LEG" || key === "FOOT") {                // two-body normal collision: the keeper's mass W vs the ball (≈1 % effect; physical, not a bonus)
      const W = (t.gkWeight != null ? t.gkWeight : (gk.weight || 80)); dvn *= W / (W + C.ballMass); }
    const vnOut = vn + dvn;
    vOut = [sv[0] + vnOut * nx + P.kt * vt[0], sv[1] + vnOut * ny + P.kt * vt[1], sv[2] + vnOut * nz + P.kt * vt[2]];
    if (push > 0 && pushDir) { vOut[0] += push * pushDir[0]; vOut[1] += push * pushDir[1]; vOut[2] += push * pushDir[2]; }
    // label honesty: a contact that leaves the ball still travelling toward the goal line is a deflection, not a save
    if (vOut[0] > 0.5) outcome = vol === "HAND" ? (outcome + " (through)") : (key + " DEFLECTION");
  }
  // ── release into the authoritative ball physics (or take ownership on a CATCH)
  const held = caught;
  if (held) {
    b.x = ballPt[0]; b.y = ballPt[1]; b.z = Math.max(GOALFX.ballR, ballPt[2]);
    b.vx = 0; b.vy = 0; b.vz = 0; b.held = "GK"; b.exclT = Infinity;     // keeper-owned: no integration / frame / crossing / net / player pickup
  } else {
    const rem = (1 - f) * PT_DT;                                         // the ball's remaining sub-tick: finished by the free-ball block (frame / ground / crossing / net)
    b.vx = vOut[0]; b.vy = vOut[1]; b.vz = vOut[2];
    b.x = ballPt[0] + nx * C.separation; b.y = ballPt[1] + ny * C.separation;
    b.z = Math.max(0, ballPt[2] + nz * C.separation);
    b.exclT = t.now + GK_DIVE.pickupExcl;                                // player pickup exclusion (unchanged)
    var _remDt = rem;
  }
  b.curve = null;
  gk.contacted = true; gk.state = held ? "CATCH" : "CONTACT";
  gk.lastContactT = t.now; (gk.lastContactByVol = gk.lastContactByVol || {})[vol] = t.now;   // re-contact exclusion is per VOLUME and short — a rebound may hit him again
  if (t.pauseAtContact) t.paused = true;                                  // review aid (key V): stop here, then '.' step / ',' slow-mo
  t.last = "GK " + outcome;
  const c = gk.committed || {}, P = C.surf[key];
  gk.contact = { toiFrac: +f.toFixed(3), tickT: +t.now.toFixed(3), surface, volume: vol, outcome, held, via, handOnBall, standing,
    point: ballPt.map(v => +v.toFixed(3)), keeperPt: keeperPt.map(v => +v.toFixed(3)), root: [+gk.x.toFixed(2), +gk.y.toFixed(2)],
    normal: [+gx.toFixed(3), +gy.toFixed(3), +gz.toFixed(3)], respNormal: [+nx.toFixed(3), +ny.toFixed(3), +nz.toFixed(3)], normalCorrected: nCorr,
    surfaceVertZ: +ballPt[2].toFixed(2), surfaceVel: (surfVel || [0, 0, 0]).map(v => +v.toFixed(2)),
    vIn: vIn.map(v => +v.toFixed(2)), vOut: [+b.vx.toFixed(2), +b.vy.toFixed(2), +b.vz.toFixed(2)], speedOut: +Math.hypot(b.vx, b.vy, b.vz).toFixed(2),
    relSpeed: +Math.hypot(vIn[0] - (gk.vx || 0), vIn[1] - (gk.vy || 0), vIn[2]).toFixed(2),
    q, resp: { key, e: P.e, kt: P.kt, sv: sv.map(v => +v.toFixed(2)), handVel: handVel.map(v => +v.toFixed(2)), push: +push.toFixed(2), pushDir: pushDir ? pushDir.map(v => +v.toFixed(3)) : null, tiltDeg },
    tier: c.tier || "-", reachMarginAtCommit: c.reachMargin != null ? +c.reachMargin.toFixed(2) : null,
    tShotToReact: c.tShotToReact != null ? +c.tShotToReact.toFixed(3) : (gk.latency != null ? +gk.latency.toFixed(3) : null),
    tReactToCommit: c.tReactToCommit != null ? +c.tReactToCommit.toFixed(3) : null,
    tCommitToContact: c.commitTime != null ? +(t.now - c.commitTime).toFixed(3) : null,
    remDt: held ? null : _remDt, seq: (gk.contacts ? gk.contacts.length : 0) + 1 };
  (gk.contacts = gk.contacts || []).push(gk.contact);
  return gk.contact;
}
// CATCH state: the securely held ball is keeper-owned. It rides the (still completing)
// save hand, never integrates, and never reaches frame / crossing / net / player pickup.
// Deterministic; release/distribution is a later stage (V1 review: the ball stays held).
function gkHeldBallStep(t, b) {
  const gk = t.gk; if (!gk || !gk.handNow) return true;
  b.x = gk.handNow[0]; b.y = gk.handNow[1]; b.z = Math.max(GOALFX.ballR, gk.handNow[2]);
  b.vx = 0; b.vy = 0; b.vz = 0;
  return true;
}
function ptGkUpdate(t) {
  const gk = t.gk; if (!gk) return;
  const b = t.b;
  gk.height = gkHeightM(t, gk); gk.handZ = gk.height * GK_CFG.handReachFrac;   // live height affects reach envelope + drawing
  gk.handPrev = gk.handNow || [gk.x, gk.y, gk.handZ];   // swept-contact geometry: last tick -> this tick
  gk.bodyPrev = gk.bodyNow || [gk.x, gk.y];
  gk.legTipPrev = gk.legTipNow || null;                 // lead-leg swept geometry (null unless a low dive extends it)
  gk.legSpreadPrev = gk.legSpreadNow != null ? gk.legSpreadNow : GK_BODY.footSpread;   // stance half-width swept with the legs
  gkObserve(gk, t, b);
  // SHOT RECOGNITION: rising edge of the authoritative kick impulse (never animation)
  const kicked = !!(t.kick && t.kick.kicked);
  if (kicked && !gk._prevKicked) {                 // <-- shot contact event
    gk.shotActive = true; gk.shotT0 = t.now;
    gk.latency = gkReactionLatency(t, gk);
    gk.atShot = { x: gk.x, y: gk.y, vx: gk.vx, vy: gk.vy };
    gk.predHist = []; gk.committed = null; gk.contacted = false; gk.contact = null; gk.contacts = []; gk.lastContactT = null; gk.lastContactByVol = {}; gk._snapped = null; gk.lobLatched = false; gk.obsJitter = 0;
    gkAnimResetView();                              // GK Animation V1: per-shot view state (flags are kept for the review log)
    gk.setPos = [gk.x, gk.y];                        // A) freeze SET at the shot instant — POSITION controller stops here
    gk.moveTarget = [gk.x, gk.y]; gk.moveReversals = 0; gk.preCommitDist = 0; gk._lastMoveSgn = null;
    gk.prepared = false; gk.prepTarget = null; gk.saveSide = 0; gk._crossHist = []; gk._mtDir = [0, 0]; gk.phase = "READ";
    // wrong-way momentum study preset — ONLY for the explicit TOWARD/AWAY cases.
    // (Bug fix: "SET" is truthy, so the old `if (t.gkMomentum)` guard wrongly ran
    // this for a SET keeper and injected -side*spd = AWAY velocity at every shot,
    // making a centered/stationary keeper jerk opposite the shot then correct.)
    if (t.gkMomentum === "TOWARD" || t.gkMomentum === "AWAY") gkApplyMomentum(gk, t);
    // LOW-SHOT test fixture (item L): ground the launch once so the ball drives along
    // the deck to the keeper's feet. Keeper-TEST setup only (like gkMomentum) — it does
    // NOT alter the shooting/charge model, only these foot-save probe scenarios.
    const _sc = t.gkScenario != null ? GK_SCENARIOS[t.gkScenario] : null;
    if (_sc && _sc.lowZ) { b.vz = 0; b.z = GOALFX.ballR; }
  }
  gk._prevKicked = kicked;

  if (gk.shotActive && !b.ctrl) {
    // STAGE 2 perceive/predict/reach + STAGE 3 commit/dive movement. The keeper
    // may now touch the ball, but ONLY via the swept gkTryContact TOI resolved in
    // ptStep; this function moves the keeper's root/hands and NEVER writes the ball.
    const reactRemain = Math.max(0, (gk.shotT0 + gk.latency) - t.now);
    gk.reactRemain = reactRemain;
    gk.predict = gkPredict(gk, b);                               // continuously updated
    gk.reach = gkReachEval(t, gk, reactRemain);
    gkStage3Move(t, gk, reactRemain);                            // REACTING coast / footwork / commit / ballistic dive
    if (!gk.committed) { gk.handNow = [gk.x, gk.y, gk.handZ]; gk.legTipNow = null; gk.legSpreadNow = GK_BODY.footSpread; }   // (committed dive sets hand + lead-leg itself)
    gk.bodyNow = [gk.x, gk.y];
    if (!gk.contacted) gk.state = gk.committed ? (gk.committed.bestEffort ? "COMMITTED*" : "COMMITTED")
                                               : (reactRemain > 0 ? "READ(react)" : gk.prepared ? "PREPARE" : "READ");
    const elMs = (t.now - gk.shotT0) * 1000;                     // prediction-evolution snapshots
    if (gk.predict && gk.predict.crossing) for (const ms of GK_REACH.snapMs)
      if (!(gk._snapped && gk._snapped[ms]) && elMs >= ms) { (gk._snapped = gk._snapped || {})[ms] = true; gk.predHist.push({ ms, y: gk.predict.crossing.y, z: gk.predict.crossing.z }); }
    gk.facing = Math.atan2(b.y - gk.y, b.x - gk.x);
    gk.depth = GK_MOUTH.lineX - gk.x;
  } else {
    // STAGE 1 positioning (unchanged) — active pre-shot / between shots
    if (gk.shotActive && b.ctrl) { gk.shotActive = false; gk._snapped = null; gk.committed = null; }   // ball re-controlled: reset
    const q = gkNorm01(t.gkPos != null ? t.gkPos : gk.attrs.gk_positioning);
    gk.q = q; gk.desired = gkPosition(t, b.x, b.y, q); gkMove(gk);
    gk.setPos = gk.desired.slice(); gk.predInt = null; gk.moveTarget = gk.desired.slice();   // pre-shot: SET is the live desired
    gk.posError = Math.hypot(gk.desired[0] - gk.x, gk.desired[1] - gk.y);
    const slow = Math.hypot(gk.vx, gk.vy) < GK_MOVE.setVelThresh;
    gk.state = (gk.posError < GK_MOVE.setDistThresh && slow) ? "SET" : "TRACKING";
    gk.facing = Math.atan2(b.y - gk.y, b.x - gk.x);
    gk.depth = GK_MOUTH.lineX - gk.x; gk.predict = null; gk.reach = null;
    gk.handNow = [gk.x, gk.y, gk.handZ]; gk.bodyNow = [gk.x, gk.y]; gk.legTipNow = null;
  }
}
function gkApplyMomentum(gk, t) {
  // wrong-way momentum study: at the shot, give the keeper lateral velocity
  // TOWARD or AWAY from the shot's target side. Not a hidden penalty — just a
  // real initial velocity the reachability then accounts for.
  const sc = t.gkScenario != null ? GK_SCENARIOS[t.gkScenario] : null;
  const aimY = sc ? sc.aim[1] : 34;
  const side = aimY >= GK_MOUTH.centerY ? 1 : -1;      // +y is the shot's side
  const spd = 4.0;
  gk.vy = (t.gkMomentum === "TOWARD" ? side : -side) * spd; gk.vx = 0;
}
// ── Stage 1 positioning-study fixtures (review only; isolated from shots) ────
const GK_POS_STUDY = [
  { name: "central 30 m",       ball: [75, 34] },
  { name: "central 20 m",       ball: [85, 34] },
  { name: "central 10 m",       ball: [95, 34] },
  { name: "wide 20 m",          ball: [85, 44] },
  { name: "wide 10 m",          ball: [95, 44] },
  { name: "extreme near-post",  ball: [101, 41] },
  { name: "dynamic: lateral track", dyn: "lateral" },
  { name: "dynamic: reversal",      dyn: "reversal" },
];
function ptGkStudy(idx) {
  const t = S.pt; if (!t || !t.on) return;
  const n = GK_POS_STUDY.length, i = ((idx % n) + n) % n, sc = GK_POS_STUDY[i];
  t.gkStudyIdx = i; t.gkScenario = null; t.now = 0; t.kick = null; t.shoot = null; t.net = null;
  t.p = { x: 60, y: 12, vx: 0, vy: 0, facing: 0, touchT: 0 };        // shooter parked aside
  t.gk = ptGkMake();                                                 // keeper starts on the line, centre
  t.gk.x = GK_MOUTH.lineX - GK_DEPTH.minDepth; t.gk.y = GK_MOUTH.centerY;
  for (const g of S.goalPanels || []) if (g.net) { g.net.pos.set(g.net.rest); g.net.vel.fill(0); g.net.active = false; g.net._ptV2 = false; }
  if (sc.dyn) {
    t.gkStudy = { active: true, kind: sc.dyn, t0: 0 };
    t.b = { x: 88, y: sc.dyn === "reversal" ? 30 : 26, z: 0, vx: 0, vy: 0, vz: 0, ctrl: false, exclT: 0 };
  } else {
    t.gkStudy = null;
    t.b = { x: sc.ball[0], y: sc.ball[1], z: 0, vx: 0, vy: 0, vz: 0, ctrl: false, exclT: 0 };
  }
  t.last = "GK POS STUDY " + (i + 1) + "/" + n + ": " + sc.name;
}
function ptGkStudyStep(t) {
  // KINEMATIC study ball — a REVIEW FIXTURE that runs ONLY in study mode (never
  // during a real shot), so it cannot affect shot regression. Scripts a moving
  // ball for the lateral-tracking / reversal demonstrations.
  const s = t.gkStudy, b = t.b, tt = t.now - s.t0;
  if (s.kind === "lateral") b.y = Math.max(26, Math.min(42, 26 + 6 * tt));
  else if (s.kind === "reversal") b.y = tt < 1.43 ? Math.min(40, 30 + 7 * tt) : Math.max(28, 40 - 7 * (tt - 1.43));
  b.x = 88; b.z = 0; b.vx = 0; b.vy = 0; b.vz = 0; b.ctrl = false;
}
function ptGkScenario(idx) {
  const t = S.pt; if (!t || !t.on) return;
  const n = GK_SCENARIOS.length, i = ((idx % n) + n) % n, sc = GK_SCENARIOS[i];
  t.gkScenario = i; ptGkFire(sc, i, n);
}
// fire one scenario object (built-in or ad-hoc from the animation review page) — the SAME fixture path for both
function ptGkFire(sc, i, n) {
  const t = S.pt; if (!t || !t.on) return;
  if (i == null) { i = 0; n = 1; }
  t.gkStudy = null;          // firing a shot exits positioning-study mode
  if (sc.band && GK_CAP[sc.band]) {            // Stage-4 acceptance fixtures may pin a capability band (shown live; L cycles it afterwards)
    const cap = GK_CAP[sc.band]; t.gkCap = sc.band;
    t.gkReflex = cap.reflex; t.gkDiving = cap.diving; t.gkHeight = cap.height; t.gkJump = cap.jump; t.gkHandling = cap.handling;
  }
  t.now = 0; t.kick = null; t.shoot = null; t.net = null; t.pfoot = sc.foot || "R";
  const facing = Math.atan2(sc.aim[1] - sc.origin[1], sc.aim[0] - sc.origin[0]);
  t.p = { x: sc.origin[0], y: sc.origin[1], vx: 0, vy: 0, facing, touchT: 0 };
  t.b = { x: sc.origin[0] + Math.cos(facing) * 0.3, y: sc.origin[1] + Math.sin(facing) * 0.3,
          z: 0, vx: 0, vy: 0, vz: 0, ctrl: true, exclT: 0 };
  for (const g of S.goalPanels || []) if (g.net) {       // deterministic net reset
    g.net.pos.set(g.net.rest); g.net.vel.fill(0); g.net.active = false; g.net._ptV2 = false;
  }
  t.gk = ptGkMake();
  // place the keeper genuinely SET (v=0) at its Stage-1 position for the pre-shot
  // ball, so it is not spuriously drifting when the shot fires. sc.gkMis forces a
  // mispositioned start; sc.gkv gives a deliberate wrong-way momentum start.
  const _q = gkNorm01(t.gkPos != null ? t.gkPos : t.gk.attrs.gk_positioning);
  const _des = gkPosition(t, t.b.x, t.b.y, _q);
  t.gk.x = sc.gkMis ? sc.gkMis[0] : _des[0];
  t.gk.y = sc.gkMis ? sc.gkMis[1] : _des[1];
  t.gk.vx = sc.gkv ? sc.gkv[0] : 0; t.gk.vy = sc.gkv ? sc.gkv[1] : 0;
  t.gk.handNow = [t.gk.x, t.gk.y, t.gk.handZ]; t.gk.bodyNow = [t.gk.x, t.gk.y];
  t.gk.shotT0 = null; t.gk._armed = true;
  if (sc.synthK) {
    // ANIMATION REVIEW FIXTURE (2026-09-04): like `synth` below but the lateral offset is in the KEEPER frame (positive =
    // his RIGHT for the facing he has when the ball is fired) so the review page / decision matrix can drive any save
    // vector independently of the goal's y axis. Review tooling only — nothing in the shooting model is used or altered.
    const sy = sc.synthK, gk0 = t.gk, f0 = Math.atan2(t.b.y - gk0.y, t.b.x - gk0.x), rx = -Math.sin(f0), ry = Math.cos(f0);
    const gx = gk0.x + rx * (sy.lat || 0) + Math.cos(f0) * (sy.depth || 0), gy = gk0.y + ry * (sy.lat || 0) + Math.sin(f0) * (sy.depth || 0), z0 = GOALFX.ballR;
    const dH = Math.hypot(gx - t.b.x, gy - t.b.y) || 1e-6, T = dH / sy.v;
    t.b.ctrl = false; t.b.exclT = 0; t.b.curve = null; t.b.z = z0;
    t.b.vx = (gx - t.b.x) / T; t.b.vy = (gy - t.b.y) / T; t.b.vz = (sy.z - z0 + 0.5 * PT.G * T * T) / T;
    t.kick = { t0: t.now, kickAt: t.now, end: t.now + 0.3, kicked: true, noAnim: true, fam: "SYNTH", v0: sy.v, vz: t.b.vz,
               dir: facing, tech: "LACES", foot: "R", label: "GKTEST " + sc.name, charge: null, tgtD: null };
  } else if (sc.synth) {
    // STAGE-4 CONTROLLED-CONTACT FIXTURE (review only): a straight synthetic ball solved to
    // pass the keeper's SET plane at a given lateral offset / height / horizontal speed, so a
    // contact type (fingertip, spill, frame rebound) can be pinned exactly. Shot recognition
    // sees an already-fired kick record; nothing in the shooting model is used or altered.
    const sy = sc.synth, gx = t.gk.x, gy = t.gk.y + (sy.lat || 0), z0 = GOALFX.ballR;
    const dH = Math.hypot(gx - t.b.x, gy - t.b.y) || 1e-6, T = dH / sy.v;
    t.b.ctrl = false; t.b.exclT = 0; t.b.curve = null; t.b.z = z0;
    t.b.vx = (gx - t.b.x) / T; t.b.vy = (gy - t.b.y) / T; t.b.vz = (sy.z - z0 + 0.5 * PT.G * T * T) / T;
    t.kick = { t0: t.now, kickAt: t.now, end: t.now + 0.3, kicked: true, noAnim: true, fam: "SYNTH", v0: sy.v, vz: t.b.vz,
               dir: facing, tech: "LACES", foot: "R", label: "GKTEST " + sc.name, charge: null, tgtD: null };
  } else {
    // fire the REAL shot through the SAME charge-launch path as normal play
    const map = GK_TECH_FAM[sc.tech] || GK_TECH_FAM.LACES;
    const tgtDist = Math.hypot(sc.aim[0] - t.b.x, sc.aim[1] - t.b.y);
    ptKick(map.fam, "GKTEST " + sc.name, map.D, { tech: sc.tech, foot: sc.foot || "R" },
           { c: sc.c, holdMs: 0 }, sc.tech === "INSIDE" ? tgtDist : undefined);
  }
  t.last = "GK SCENARIO " + (i + 1) + "/" + n + ": " + sc.name;
}

// ═══════════════════════ GOALKEEPER ANIMATION V1 (read-only view of keeper state) ═══════════════════════
// SIMULATION DETERMINES WHAT HAPPENS; ANIMATION REPRESENTS IT. This section never writes gk/ball state and never
// decides reachability, contact, outcome or rebound. It reads: gk.state/phase, gk.committed (t0, execTime, target, feet,
// action, tier, gather, bestEffort, envNorm), gk.diveU, gk.handNow, gk.legTipNow, gk.contact, gk.x/y/vx/vy, gk.facing,
// gk.prepTarget, ball.held — and turns them into an animation state, a frame choice, pixel-snapped draw offsets, semantic
// anchors and a contact-synchronisation metric. Assets: assets/visual_v1/goalkeeper/GK_ANIM_V1.json (GK_BASE_V1 identity
// frozen in GK_BASE_V1.json). Where authored art for a state does not exist yet, a clearly labelled TEMPORARY
// representation of the SAME sprite is drawn (pixel-exact row shear / integer offsets / procedural glove & boot markers
// at the simulation's own hand and leg-tip positions) — never a different character.
const GK_ANIM = {
  enabled: true,
  manifest: ASSET_ROOT + "goalkeeper/GK_ANIM_V1.json",
  candidateManifest: null,                     // review page only: a second manifest of CANDIDATE (unapproved) pose states
  reviewRetiredArt: false,                     // review page only: allow variants marked live:false (the rejected V1 dive clips) for comparison
  candidatePoses: false,                       // review page only: draw CANDIDATE contact poses for the dive families (never in normal play until approved)
  diagnosticDives: true,                       // dive families without approved art → DIAGNOSTIC figure (never a wrong dive, never a standing sprite)
  idleBobPeriod: 3.6, idleBobPx: 1,           // IDLE living motion: 1 px breathing on a 3.6 s cycle (integer offsets only)
  idleFarM: 26,                                // ball farther than this (and not in flight at the keeper) → IDLE instead of SET
  footworkAuthoredOrderDirs: ["south-west", "north-west"],   // added facings: the footwork loop plays the authored variant in its authored order for BOTH sides (WEST's structure; see gkAnimUpdate)
  shuffleMinSpeed: 0.05, crossoverSpeed: 2.2,  // footwork classification
  strideM: 0.9,                                // loop clips: metres of ROOT travel per full cycle (odometer-driven: no moonwalking)
  loadPhase: 0.30,                             // dive families: LOAD/PUSH for u < loadPhase, then extension toward contact
  landDur: 0.45, recoverDur: 0.60, riseDur: 0.40,   // LAND → RECOVER after a dive; RISE after a gather/catch/near-body save
  footSaveHold: 0.30,
  armMinM: 0.30,                               // draw the procedural glove marker (standing families without art) when the simulation hand is this far from its rest
  corrMaxPx: 12,                               // HAND-LED PLACEMENT: max whole-frame translation (sprite px ≈ 0.23 m = hand+ball radius) toward the simulation hand; above → WRONG_CLIP flag, translation capped
  ikMaxPx: 12,                                 // residual (sprite px) above which the drawn glove is flagged as missing the simulation hand
  ikWindow: 1,                                 // frames either side of the phase-mapped frame the frame-selection IK may choose from (height-only variants)
  dirApproxMaxSteps: 1,                        // a clip authored ≤ this many 45° steps from the facing may stand in (flagged); beyond → temporary representation
  markerPx: 3,                                 // procedural glove / boot marker size (sprite px)
  // SAVE TAXONOMY (contact height classes × keeper height; full stretch = near-envelope AND large displacement)
  zLow: 0.45, zMid: 0.75, zTop: 1.05,          // z/H < zLow → LOW (below hip); < zMid → MID (waist/chest); < zTop → HIGH (shoulder/head); else TOP (above the head)
  fullStretchNorm: 0.90, fullStretchLatFrac: 0.60,   // FULL_STRETCH: envNorm ≥ 0.90 (or best effort) AND horizontal demand ≥ 0.60·maxLat
  footSaveLegFrac: 0.7,                        // FOOT_SAVE pre-contact: ankle-height ball beyond the stance within 70 % of the leg sweep
  standingBodyMax: 0.20,                       // body displacement beyond arm+lean (simulation dBody) up to this is a "tiny adjustment": feet stay planted, NO DIVE
  collapseLatFrac: 0.65, collapseNormMax: 0.85, // LOW_COLLAPSE: low ball within this fraction of the lateral envelope and below this reach norm; beyond → AIRBORNE_DIVE (low-mid expression)
  savePoseManifest: null, savePoseRoot: "",    // camera-space SAVE POSES (GOAL_LEFT / GOAL_RIGHT authored in the gameplay camera) — candidate manifest set by the review page
  savePoseIK: true,                            // hand-led bounded placement of save poses (false = RAW authored placement, for the raw-vs-IK review)
  sequences: true,                             // full authored dive SEQUENCES (2026-09-06, first: LEFT_FAR): the whole physical action around a contact pose; false = the contact-pose-only behaviour
  seqShadowFollows: true,                      // the keeper's shadow follows the PRESENTATION root during a sequence's post-contact continuation (presentation only)
  axisMismatchMaxDeg: 35,                      // pose rotation whose measured body axis is further than this from the projected save vector → AXIS_MISMATCH flag
  reviewOverride: null,                        // review page only: {kind, family, side, saveAngleDeg, dir, pos, label} — draw a chosen representation instead of the live state
};
const GK_ANIM_MIRROR = { east: "west", west: "east", "north-east": "north-west", "north-west": "north-east", "south-east": "south-west", "south-west": "south-east", north: "north", south: "south" };
const GK_ANIM_DIVES = { LOW_COLLAPSE: 1, AIRBORNE_DIVE: 1, MEDIUM_DIVE: 1, HIGH_DIVE: 1, FULL_STRETCH: 1 };   // MEDIUM/HIGH/FULL_STRETCH: retired V1.1 labels (never produced by the classifier now)
const GK_ANIM_SIDED = { SHUFFLE: 1, CROSSOVER: 1, NEAR_BODY_SAVE: 1, LOW_COLLAPSE: 1, MEDIUM_DIVE: 1, HIGH_DIVE: 1, FULL_STRETCH: 1, FOOT_SAVE: 1, HIGH_CATCH: 0, LOW_REACH: 1 };
S.gkAnim = { loaded: false, manifest: null, states: {}, anchors: {}, clips: {}, poses: {}, savePoses: {}, cache: {}, cur: null, lastContact: null, perf: { n: 0, ms: 0, max: 0 }, log: [], odo: 0, prevRoot: null, flags: [], commit: null };
// per-shot / per-reset view state (never touches the simulation)
function gkAnimResetView() { const A = S.gkAnim; if (!A) return; A.cur = null; A.lastContact = null; A.log = []; A.odo = 0; A.prevRoot = null; A.commit = null; }
async function gkAnimLoadPoses(A, manifestUrl, root, candidate) {
  const m = await loadJSON(manifestUrl);
  for (const [fam, ps] of Object.entries(m.poses || {})) {
    const imgs = {}; let ok = true;
    for (const d of DIRS) { try { imgs[d] = await loadImage(root + ps.path.replace("{direction}", d)); } catch (e) { ok = false; break; } }
    if (!ok) { console.warn("GK pose missing", fam); continue; }
    let anchors = null; try { anchors = await loadJSON(root + ps.anchors); } catch (e) { anchors = null; }
    const axes = {};
    for (const d of DIRS) {
      const an = anchors && anchors[d]; if (!an) continue;
      const cx = an.body_centre ? an.body_centre[0] : an.content_cx, cy = an.body_centre ? an.body_centre[1] : (an.bbox[1] + an.bbox[3]) / 2;
      const gl = an.gloves && an.gloves.length ? an.gloves : (an.hands ? [an.hands.screenLeft, an.hands.screenRight].filter(Boolean) : []);
      let lead = an.lead_glove || null, best = lead ? Math.hypot(lead[0] - cx, lead[1] - cy) : -1; if (!lead) for (const g of gl) { const dd = Math.hypot(g[0] - cx, g[1] - cy); if (dd > best) { best = dd; lead = g; } }
      axes[d] = lead ? { deg: Math.atan2(lead[1] - cy, lead[0] - cx) * 180 / Math.PI, len: best, lead, centre: [cx, cy] } : null;
    }
    A.poses[fam] = { family: fam, side: ps.side || "RIGHT", imgs, anchors, axes, candidate: candidate || !!ps.candidate, approved: !!ps.approved, id: ps.pixellab_state_id || null, note: ps.note || "" };
  }
}
async function gkAnimLoadSavePoses(A, manifestUrl, root) {
  const m = await loadJSON(manifestUrl); A.savePoseManifest = m;
  for (const [fam, sides] of Object.entries(m.save_poses || {})) {
    A.savePoses[fam] = A.savePoses[fam] || {};
    for (const [side, spec] of Object.entries(sides)) {
      A.savePoses[fam][side] = A.savePoses[fam][side] || {};
      for (const [cls, smp] of Object.entries(spec.samples || {})) {
        try {
          const img = await loadImage(root + smp.path); let an = null; try { an = await loadJSON(root + smp.anchors); } catch (e) { an = null; }
          A.savePoses[fam][side][cls] = { img, anchors: an, mirror: !!smp.mirror, candidate: smp.candidate !== false && !smp.approved, approved: !!smp.approved, note: smp.note || "", id: smp.id || null };
        } catch (e) { console.warn("save pose not loaded", fam, side, cls, e); }
      }
    }
  }
  // CONTEXTUAL POSES (pose salvage, 2026-09-05): salvaged stills with authored metadata (role, facing, near/far post, height classes,
  // screen-space reach direction of the raised glove). Presentation candidates only; selected by gkAnimContextualPick from the
  // simulation's committed geometry. Loaded only from a manifest that carries `contextual_poses` (review / candidate manifests).
  if (m.contextual_poses && m.contextual_poses.length) {
    A.contextual = m.contextual_poses.map(cp => ({ ...cp, sample: A.savePoses.CONTEXTUAL && A.savePoses.CONTEXTUAL.ANY ? A.savePoses.CONTEXTUAL.ANY[cp.id] : null })).filter(cp => cp.sample);
  }
  // SEQUENCES (2026-09-06): full authored dive animations keyed to a contact pose (baked component-rig frames + per-frame anchors).
  // Presentation only: the schedule is read against the simulation's own commit/contact/execEnd; nothing here feeds the simulation.
  A.sequences = A.sequences || {};
  for (const [id, sq] of Object.entries(m.sequences || {})) {
    try {
      const one = async (e) => { const img = await loadImage(root + e.path), anchors = await loadJSON(root + e.anchors); const r = { ...e, img, anchors }; if (e.moderate) r.moderate = { img: await loadImage(root + e.moderate.path), anchors: await loadJSON(root + e.moderate.anchors) };
        if (e.byFacing) { r.byFacing = {}; for (const [d, v] of Object.entries(e.byFacing)) { const fv = { img: await loadImage(root + v.path), anchors: await loadJSON(root + v.anchors) }; if (v.moderate) fv.moderate = { img: await loadImage(root + v.moderate.path), anchors: await loadJSON(root + v.moderate.anchors) }; r.byFacing[d] = fv; } }
        return r; };
      const pre = [], post = [];
      for (const e of sq.pre || []) pre.push(await one(e));
      for (const e of sq.post || []) post.push(await one(e));
      A.sequences[id] = { ...sq, pre, post };
    } catch (e) { console.warn("GK sequence not loaded", id, e); }
  }
}
// SEQUENCE PICK (once per commit): the sequence whose contact pose the selector chose, for its families / height classes.
// variant "moderate" (envelope demand below moderateBelow) uses the less-extended flight frames; extreme saves use the full ones.
function gkAnimSeqPick(A, cls, ctx, c) {
  if (!A.sequences || !ctx || !cls) return null;
  for (const sq of Object.values(A.sequences)) {
    if (sq.pose !== ctx.id || (sq.families || []).indexOf(cls.family) < 0) continue;
    const h = cls.expr ? cls.expr.heightClass : cls.zClass; if ((sq.heights || []).indexOf(h) < 0) continue;
    const norm = cls.norm != null ? cls.norm : (c && c.envNorm != null ? c.envNorm : 1);
    return { id: sq.id, def: sq, variant: norm < (sq.moderateBelow != null ? sq.moderateBelow : 0) ? "moderate" : "full", norm };
  }
  return null;
}
// PRESENTATION ROOT after execEnd (presentation only — the simulation root is frozen and untouched): the body keeps the dive's momentum,
// d(t) = V0·tau·(1−e^(−t/tau)) along the dive direction (V0 = the root's mean dive speed = travel / execTime), then eases back to the
// simulation root by tEnd so the live SET is reached without a jump. Returned in metres and as a screen offset.
// a sequence keeps its commit context alive while it still has post-contact frames to draw (presentation only: the simulation's
// own state is untouched; the legacy LAND/RECOVER/RISE timers still drive the state label). Without this a non-dive family's
// sequence (the vertical jump's landing) would be cut off at riseDur.
function gkAnimSeqPostPending(A, tl) {
  const sq = A.commit && A.commit.seq && A.commit.seq.def; if (!GK_ANIM.sequences || !sq || !sq.post || !sq.post.length) return false;
  return sq.post.some(p => tl < p.to);
}
function gkAnimSeqPres(gk, c, P, tl) {
  if (!P || !c || !c.feet) return null;
  const ex = gk.x - c.feet[0], ey = gk.y - c.feet[1], trav = Math.hypot(ex, ey); if (trav < 1e-6) return null;
  const ux = ex / trav, uy = ey / trav, V0 = trav / Math.max(1e-6, c.execTime), dLand = V0 * P.tau * (1 - Math.exp(-P.tLand / P.tau));
  let d; if (tl <= P.tLand) d = V0 * P.tau * (1 - Math.exp(-tl / P.tau)); else if (tl < P.tEnd) d = dLand * (0.5 + 0.5 * Math.cos(Math.PI * (tl - P.tLand) / (P.tEnd - P.tLand))); else d = 0;
  const q0 = sproj3(gk.x, 0, gk.y), q1 = sproj3(gk.x + ux * d, 0, gk.y + uy * d);
  return { dm: d, x: gk.x + ux * d, y: gk.y + uy * d, sx: q1.x - q0.x, sy: q1.y - q0.y, V0 };
}
async function gkAnimLoad() {
  const A = S.gkAnim;
  try {
    const m = await loadJSON(GK_ANIM.manifest); A.manifest = m;
    for (const [name, st] of Object.entries(m.states || {})) {
      const imgs = {}; let ok = true;
      for (const d of DIRS) {
        try { imgs[d] = await loadImage(ASSET_ROOT + st.path.replace("{direction}", d)); }
        catch (e) { ok = false; break; }
      }
      if (!ok) { if (!st.optional) throw new Error("GK state missing: " + name); continue; }
      A.states[name] = imgs;
      if (st.anchors) { try { A.anchors[name] = await loadJSON(ASSET_ROOT + st.anchors); } catch (e) { A.anchors[name] = null; } }
    }
    // clips: authored frame sequences. variant = one authored direction (+ side for lateral actions). Frames are measured
    // per frame (anchors JSON); the runtime never hardcodes per-sprite numbers. live:false variants are RETIRED from play.
    for (const [name, clip] of Object.entries(m.clips || {})) {
      const c = { name, family: clip.family, families: clip.families || [clip.family], kind: clip.kind || "action", variants: [], note: clip.note || "", live: clip.live !== false };
      for (const v of clip.variants || []) {
        try {
          const meta = await loadJSON(ASSET_ROOT + v.anchors);
          const use = v.use || meta.frames.map((f, i) => i);
          const frames = [];
          for (const i of use) {
            const img = await loadImage(ASSET_ROOT + v.frames.replace("{i}", i)); const f = meta.frames[i];
            const onGround = f.feet && f.feet.some(ft => ft[1] >= meta.ground_row - 2);
            const anchorX = v.anchor === "pivot" ? img.width / 2 : (onGround && f.feet.length ? f.feet.reduce((a, ft) => a + ft[0], 0) / f.feet.length : f.content_cx);
            const groundY = v.ground === "bottom" ? f.bottom_row : meta.ground_row;
            frames.push({ img, idx: i, ax: anchorX, ay: groundY, meta: f });
          }
          c.variants.push({ dir: v.dir, side: v.side || null, frames, contact: v.contact != null ? v.contact : frames.length - 1, hold: v.hold != null ? v.hold : frames.length - 1, note: v.note || "", strideM: v.stride_m || GK_ANIM.strideM, ik: v.ik === undefined ? true : v.ik, live: v.live !== false && c.live });
        } catch (e) { console.warn("GK clip variant not loaded", name, v.dir, e); }
      }
      if (c.variants.length) A.clips[name] = c;
    }
    A.byFamily = {}; for (const c of Object.values(A.clips)) for (const fam of (c.families || [c.family])) if (fam) A.byFamily[fam] = c;
    if (m.poses) await gkAnimLoadPoses(A, GK_ANIM.manifest, ASSET_ROOT, false);
    if (GK_ANIM.candidateManifest) { try { await gkAnimLoadPoses(A, GK_ANIM.candidateManifest, GK_ANIM.candidateRoot || "", true); } catch (e) { console.warn("GK candidate poses not loaded", e); } }
    if (m.save_poses) await gkAnimLoadSavePoses(A, GK_ANIM.manifest, ASSET_ROOT);
    // ?savePoses=1 (or =<manifest url>) loads the V1.2 camera-space save-pose CANDIDATES on the playtest page (review only; candidates are not assets)
    try { const q = new URLSearchParams(location.search).get("savePoses"); if (q && !GK_ANIM.savePoseManifest) { const u = q === "1" ? "../../review_artifacts/gk_anim_v1_2/save_poses/GK_SAVE_POSES_CANDIDATES.json" : q; GK_ANIM.savePoseManifest = u; GK_ANIM.savePoseRoot = u.slice(0, u.lastIndexOf("/") + 1); } } catch (e) {}
    if (GK_ANIM.savePoseManifest) { try { await gkAnimLoadSavePoses(A, GK_ANIM.savePoseManifest, GK_ANIM.savePoseRoot || ""); } catch (e) { console.warn("GK save poses not loaded", e); } }
    A.loaded = !!A.states.base;
  } catch (e) { console.warn("GK Animation V1: assets not loaded — placeholder keeper", e); A.loaded = false; }
}
// pick the authored clip variant for (facing dir, side): exact → mirrored (a horizontal flip turns his RIGHT into his LEFT in every
// view) → same clip with the other side (flagged 'side approx') → a variant authored ≤ dirApproxMaxSteps away (flagged).
// Retired (live:false) variants are skipped unless the review page asks for them.
function gkAnimResolve(clip, dir, side) {
  const di = DIRS.indexOf(dir); let best = null;
  for (const v of clip.variants) for (const mir of [false, true]) {
    if (!v.live && !GK_ANIM.reviewRetiredArt) continue;
    const vd = mir ? GK_ANIM_MIRROR[v.dir] : v.dir; if (mir && vd === v.dir && !v.side) continue;
    const vs = v.side ? (mir ? (v.side === "RIGHT" ? "LEFT" : "RIGHT") : v.side) : null;
    const steps = Math.min((DIRS.indexOf(vd) - di + 8) % 8, (di - DIRS.indexOf(vd) + 8) % 8);
    if (steps > GK_ANIM.dirApproxMaxSteps) continue;
    const sideApprox = !!(side && vs && vs !== side);
    const score = steps * 10 + (sideApprox ? 2 : 0) + (mir ? 1 : 0);
    if (!best || score < best.score) best = { v, mirrored: mir, sideApprox, dirSteps: steps, score, reverse: sideApprox && clip.kind === "loop" && !mir, retired: !v.live };
  }
  return best;
}
// ── SAVE VECTOR (Part 4): the dive direction is the horizontal vector from the feet at commit to the committed target —
// NOT the facing. A pose authored as "dive to his RIGHT" rendered in PixelLab rotation r has its chest facing r and its
// body axis along r + 90° (y-down angles: 0° east, 90° south). To lay the body along the save angle B: RIGHT-lead →
// rotation r = B − 90°; LEFT-lead → horizontal mirror of rotation r' = 90° − B (a mirror maps chest r' → 180° − r' and
// body 90° + r' → 90° − r'). Pure lateral saves reduce to r = facing (RIGHT) / mirror(mirror-dir(facing)) (LEFT).
function gkAnimDirFromAngle(deg) { return DIRS[Math.round(((deg % 360) + 360) % 360 / 45) % 8]; }
function gkAnimResolvePose(pose, saveAngleDeg, side, screenVec) {
  // world-angle rule (used when no screen vector is given): body along B = saveAngle; RIGHT → rotation B−90°, LEFT → mirror(90°−B)
  if (!screenVec) { const B = saveAngleDeg; if (side === "LEFT") { const dir = gkAnimDirFromAngle(90 - B); return { dir, mirrored: true, bodyDeg: B, mismatchDeg: null }; } const dir = gkAnimDirFromAngle(B - 90); return { dir, mirrored: false, bodyDeg: B, mismatchDeg: null }; }
  const want = Math.atan2(screenVec.y, screenVec.x) * 180 / Math.PI; let best = null;
  const mir = side === "LEFT";
  for (const d of DIRS) {
    const ax = pose.axes && pose.axes[d]; if (!ax) continue;
    const deg = mir ? Math.atan2(Math.sin(ax.deg * Math.PI / 180), -Math.cos(ax.deg * Math.PI / 180)) * 180 / Math.PI : ax.deg;
    let diff = Math.abs(((deg - want) % 360 + 540) % 360 - 180);
    if (!best || diff < best.mismatchDeg) best = { dir: d, mirrored: mir, bodyDeg: deg, mismatchDeg: +diff.toFixed(0), wantDeg: +want.toFixed(0) };
  }
  return best || { dir: mir ? "east" : "west", mirrored: mir, bodyDeg: want, mismatchDeg: null };
}
// projected save vector on screen (px) for a hand displacement from the root: world (dx, dy, dz) → screen delta at the keeper
function gkAnimScreenVec(gk, dx, dy, dz) { const a = sproj3(gk.x, 0, gk.y), b = sproj3(gk.x + dx, dz, gk.y + dy); return { x: b.x - a.x, y: b.y - a.y }; }
// keeper-relative geometry: right-hand vector for a facing angle (screen y grows southward, so facing west ⇒ right = north = up-screen)
function gkAnimSide(gk, tx, ty) {
  const fx = Math.cos(gk.facing), fy = Math.sin(gk.facing), rx = -fy, ry = fx;
  const dx = tx - gk.x, dy = ty - gk.y;
  return { lat: dx * rx + dy * ry, fwd: dx * fx + dy * fy };
}
// ── SAVE-FAMILY CLASSIFICATION (Part 5/6): from the keeper's REQUIRED PHYSICAL ACTION at commit — never from shot type or
// "air/ground". Inputs are the simulation's own commit record (feet, target, hand origin, execTime, action, tier, envNorm,
// maxLat, actionDetail.dBody, gather) plus the frozen facing, the keeper height and the root velocity at commit.
function gkAnimClassify(gk, c, facing) {
  const fx = Math.cos(facing), fy = Math.sin(facing), rx = -fy, ry = fx;
  const dx = c.target[0] - c.feet[0], dy = c.target[1] - c.feet[1];
  const lat = dx * rx + dy * ry, depth = dx * fx + dy * fy, L = Math.hypot(dx, dy);
  const H = gk.height || 1.83, z = c.target[2], hz = c.handOrigin ? c.handOrigin[2] : gk.handZ, dz = z - hz, zH = z / H;
  const zClass = zH < GK_ANIM.zLow ? "LOW" : zH < GK_ANIM.zMid ? "MID" : zH < GK_ANIM.zTop ? "HIGH" : "TOP";
  const maxLat = c.diveSpanMax || 2.0, norm = c.envNorm != null ? c.envNorm : L / maxLat;
  const dBody = c.actionDetail ? c.actionDetail.dBody : 0, dArm = c.actionDetail ? c.actionDetail.dArm : L;
  const act = c.action || "";
  const feetPlanted = !!c.gather || act === "STANDING" || act === "LEAN" || dBody <= GK_ANIM.standingBodyMax;
  const saveAngle = L > 1e-6 ? Math.atan2(dy, dx) * 180 / Math.PI : facing * 180 / Math.PI;
  const side = lat >= 0 ? "RIGHT" : "LEFT";
  const v0 = Math.hypot(gk.vx, gk.vy);
  let family, sub = null, airborne = false, expr = null;
  // SAVE SIDE as seen through the gameplay camera: the goal line is world y; −y (north) projects up-left = GOAL_LEFT, +y (south) down-right = GOAL_RIGHT
  const goalSide = dy < -1e-6 ? "GOAL_LEFT" : dy > 1e-6 ? "GOAL_RIGHT" : (lat >= 0 ? (fy > 0 ? "GOAL_RIGHT" : "GOAL_LEFT") : (fy > 0 ? "GOAL_LEFT" : "GOAL_RIGHT"));
  const hClass = zH < GK_ANIM.zLow ? "LOW-MID" : zH < GK_ANIM.zMid ? "MID" : zH < GK_ANIM.zTop ? "HIGH" : "TOP";
  if (c.gather) family = "LOW_GATHER";
  else if (feetPlanted) {
    // A. STANDING / NEAR-BODY: feet stay planted (or one small adjustment); sub-visual by where the hands go
    const hipZ = GK_BODY.hipFrac * H, shZ = GK_BODY.shoulderFrac * H;
    if (Math.abs(lat) <= 0.35 && z >= hipZ && z <= shZ) { family = depth > 0.12 ? "SUPPORTED_CATCH" : "CHEST_CATCH"; }
    else if (z > shZ && Math.abs(lat) <= 0.45) { family = "HIGH_CATCH"; }
    else if (z <= GK_BODY.legExtendZ && Math.abs(lat) > GK_BODY.footSpread && Math.abs(lat) <= GK_BODY.footSpread + GK_ANIM.footSaveLegFrac * GK_BODY.legExtendMax) { family = "FOOT_SAVE"; }
    else family = "NEAR_BODY_SAVE";
  } else {
    // a dive is required (body displacement beyond arm + lean)
    if (z <= GK_BODY.legExtendZ && Math.abs(lat) > GK_BODY.footSpread && Math.abs(lat) <= GK_BODY.footSpread + GK_ANIM.footSaveLegFrac * GK_BODY.legExtendMax && L < 0.5 * maxLat) { family = "FOOT_SAVE"; }
    else if (zClass === "LOW" && L <= GK_ANIM.collapseLatFrac * maxLat && norm < GK_ANIM.collapseNormMax) { family = "LOW_COLLAPSE"; airborne = false; }
    else {
      // ONE continuous airborne family (Phase 7): the expression follows the simulation's demand, never a canned tier
      family = "AIRBORNE_DIVE"; airborne = true;
      const intensity = Math.max(0, Math.min(1, (norm - 0.45) / 0.55));
      expr = { heightClass: hClass, intensity: +intensity.toFixed(3), latFrac: +(L / maxLat).toFixed(3), vertDemand: +dz.toFixed(3), depthDemand: +depth.toFixed(3), nearMax: norm >= GK_ANIM.fullStretchNorm || !!c.bestEffort, exec: +c.execTime.toFixed(3),
               extension: +Math.min(1, 0.35 + 0.65 * intensity).toFixed(3), launch: +Math.max(0, Math.min(1, (dz + 0.3) / 1.2)).toFixed(3) };
    }
  }
  return { family, sub, side, goalSide, hClass, expr, saveAngle, saveDir: gkAnimDirFromAngle(saveAngle), lat: +lat.toFixed(3), depth: +depth.toFixed(3), dz: +dz.toFixed(3), z: +z.toFixed(3), zH: +zH.toFixed(3), zClass, L: +L.toFixed(3), norm: +norm.toFixed(3), maxLat: +maxLat.toFixed(2), exec: +c.execTime.toFixed(3), v0: +v0.toFixed(2), feetPlanted, airborne, dArm: +dArm.toFixed(3), dBody: +dBody.toFixed(3), action: act, tier: c.tier, bestEffort: !!c.bestEffort, dy: +dy.toFixed(3) };
}
// net root travel between the newest sample and the newest sample at least `windowS` of SIMULATION time older (null until spanned)
// side of the live variant authored exactly in this facing (no mirror), or null when the facing only has mirrored/approximate art
function gkAnimAuthoredSide(clip, dir) { if (!clip) return null; for (const v of clip.variants) if (v.live && v.dir === dir && v.side) return v.side; return null; }
// CONTEXTUAL SAVE-POSE PICK (pose salvage, 2026-09-05). Art follows simulation: every input below is read from the committed action
// (target, feet), the frozen facing, the shooter's position and the camera — nothing is written back. Continuous scores, no hard
// angle switch: a salvaged still becomes the preferred art as the attack tightens and the requested reach resembles its authored reach.
//   reach   = cosine between the desired SCREEN-space reach (feet → contact target through the gameplay camera) and the pose's
//             authored root → raised-glove direction (metadata `reach_screen_unit`, y down);
//   facing  = cosine of the keeper's frozen facing vs the pose's authored facing (tight_high poses only);
//   tight   = smoothstep of |attacker angle off the goal-line normal| between tightMinDeg and tightFullDeg (tight_high only);
//   post    = near/far post of the contact vs the shooter's side of the goal centre (tight_high only; centre = neither);
//   height  = the classifier's height class must be one the pose was salvaged for;
//   overhead: vertical demand (target above the standing hand) ramps up, lateral demand (L / maxLat) ramps the score down —
//             HIGH vertical + LOW lateral → OVERHEAD_REACH; HIGH vertical + HIGH lateral stays with the lateral full-stretch art;
//   far     = smoothstep of the simulation's committed envelope demand (norm = required span / reach envelope, 1 = full stretch,
//             above 1 = unreachable best effort) — the far-dive pose's only distance measure (dive_north).
// Roles carry a priority: the specialised stills (tight-angle, overhead) keep their own case whenever they qualify; the generalist
// far-dive pose and the ground stills are ranked against each other by score.
// A candidate wins only above minScore and only if it beats the default camera-space sample's own reach similarity.
const GK_CTX = { tightMinDeg: 45, tightFullDeg: 65, overheadDzLo: 0.4, overheadDzHi: 0.8, overheadLatLo: 0.25, overheadLatHi: 0.5, minScore: 0.5,
  lowZHi: 0.45, lowZOff: 0.6,                                                          // low_side stills: full weight below z/H 0.45, gone by 0.6
  farLo: 0.5, farHi: 0.8, farFloor: 0.6, diveGroundLo: 0.06, diveGroundHi: 0.22,
  stretchLo: 0.85, stretchHi: 1.0, cornerLatLo: 0.35, cornerLatHi: 0.6, lowFarLo: 0.82, lowFarHi: 0.95,
  farFallbackMin: 0.25,                                                                // far-dive fallback: the goal side's far-dive pose still takes an unclaimed MID/HIGH/TOP airborne dive down to this score (facing-only shortfall)
  facingCorrectDeg: 90, farFacingCorrectDeg: 45,                                       // tracked facing further than this from the bearing to the shooter = the ball beside/behind the keeper, not a body turn → use the bearing (all roles / the far-dive poses)   // low_far_dive: only a low dive at or beyond full stretch                // top_corner: only a genuinely full-stretch TOP contact with real lateral demand     // dive_north fades out as the contact reaches the ground (z/H): its hands are drawn at head height, so a ball on the deck stays with the ground stills                                               // dive_north: the simulation's own envelope demand (norm = required span / reach envelope) weights the far-dive pose from farFloor
                                                                                       // (a modest but real dive) up to 1 (full stretch, or an unreachable best-effort attempt) — a preference weight, never an on/off gate
  families: { AIRBORNE_DIVE: 1, HIGH_CATCH: 1, LOW_COLLAPSE: 1 } };   // families a salvaged still may represent: the airborne dive and the standing high reach (which has no authored art at all)
function gkAnimContextualPick(A, t, gk, cls, c, facing, defaultSample) {
  if (!A.contextual || !A.contextual.length || !cls || !c || !c.target) return null;
  const smooth = (x, a, b) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const pf = sproj3(c.feet[0], 0, c.feet[1]), pt = sproj3(c.target[0], c.target[2], c.target[1]);
  const rx = pt.x - pf.x, ry = pt.y - pf.y, rn = Math.hypot(rx, ry) || 1e-6, reach = [rx / rn, ry / rn];
  const cosR = (u) => u ? Math.max(0, reach[0] * u[0] + reach[1] * u[1]) : 0;
  const shooter = t.p ? [t.p.x, t.p.y] : [t.b.x, t.b.y];
  const attackerDeg = Math.abs(Math.atan2(shooter[1] - GK_MOUTH.centerY, -(shooter[0] - GK_MOUTH.lineX)) * 180 / Math.PI);   // 0 = straight in front of goal, 90 = on the goal line
  // the keeper's presentation facing for these stills is the side the attack comes from: the bearing from the committed feet to the
  // shooter (at commit the frozen facing already tracks the ball, which on a far-post shot has crossed to the other side)
  const facingDeg = Math.atan2(shooter[1] - c.feet[1], shooter[0] - c.feet[0]) * 180 / Math.PI, facingTrackedDeg = facing * 180 / Math.PI, hClass = cls.expr ? cls.expr.heightClass : cls.zClass;
  // KEEPER ORIENTATION for the facing terms (2026-09-06): the frozen facing is the simulation's ball-tracking value. On a late best-effort
  // dive or a rebound the ball is already beside/behind the keeper at commit, so that value points AWAY from the shooter (up to 180 deg
  // off) — no body turns its back on a shot in the flight time, and every facing-based pose scored 0 (the live ART_MISSING cases). When the
  // tracked facing is more than 90 deg from the bearing to the shooter, the keeper's orientation is the bearing; otherwise it is unchanged.
  const facingMismatchDeg = Math.abs(((facingTrackedDeg - facingDeg + 540) % 360) - 180);
  const facingCorrected = facingMismatchDeg > GK_CTX.facingCorrectDeg, facingAtCommitDeg = facingCorrected ? facingDeg : facingTrackedDeg;
  // the two far-dive poses (the only art of their family per side) accept a tighter bound: past farFacingCorrectDeg the tracked value is
  // the ball beside the keeper on a flank shot, not a body turn; the ground stills keep the wider bound so none of their picks move
  const facingFarCorrected = facingMismatchDeg > GK_CTX.farFacingCorrectDeg, facingFarDeg = facingFarCorrected ? facingDeg : facingTrackedDeg;
  // near/far post = the side of the KEEPER the committed reach goes, relative to the shooter's side (the keeper at a tight angle already
  // stands at the near post; a reach straight above him or toward the shooter's side is "near", away from the shooter is "far")
  const shooterSide = Math.sign(shooter[1] - c.feet[1]), reachSide = Math.sign(c.target[1] - c.feet[1]);
  const post = shooterSide === 0 ? "centre" : (Math.abs(c.target[1] - c.feet[1]) < 0.3 || reachSide === shooterSide ? "near" : "far");
  const latFrac = cls.L / (c.diveSpanMax || 2.0), dz = cls.dz;
  const situation = { reach: reach.map(v => +v.toFixed(3)), attackerDeg: +attackerDeg.toFixed(1), facingDeg: +facingDeg.toFixed(1), facingAtCommitDeg: +facingAtCommitDeg.toFixed(1), facingTrackedDeg: +facingTrackedDeg.toFixed(1), facingCorrected, facingFarDeg: +facingFarDeg.toFixed(1), facingFarCorrected, facingMismatchDeg: +facingMismatchDeg.toFixed(1), post, hClass, latFrac: +latFrac.toFixed(3), dz: +dz.toFixed(3) };
  let best = null; const scored = [];
  for (const cp of A.contextual) {
    if (cp.height_classes && cp.height_classes.indexOf(hClass) < 0) { scored.push({ id: cp.id, score: 0, why: "height " + hClass }); continue; }
    let score = 0, why = "";
    if (cp.role === "tight_high") {
      const sReach = cosR(cp.reach_screen_unit), sFacing = Math.max(0, Math.cos((facingDeg - cp.facing_deg) * Math.PI / 180)), sTight = smooth(attackerDeg, GK_CTX.tightMinDeg, GK_CTX.tightFullDeg), sPost = cp.post === post ? 1 : 0;
      score = sTight * sFacing * (0.5 * sReach + 0.5 * sPost); why = "reach " + sReach.toFixed(2) + " facing " + sFacing.toFixed(2) + " tight " + sTight.toFixed(2) + " post " + sPost;
    } else if (cp.role === "low_side") {
      // ground-level side save (LOW_COLLAPSE, or an AIRBORNE_DIVE whose contact height class is LOW-MID): the keeper's own facing at commit
      // picks the perspective family (SW / W / NW, smooth cosine), the classifier's goal side picks the ORIGINAL or MIRRORED orientation
      // (validated per side in the gameplay camera), lowness fades the still out above z/H 0.45. Gathers and foot saves never reach here.
      const famOK = cls.family === "LOW_COLLAPSE" || (cls.family === "AIRBORNE_DIVE" && hClass === "LOW-MID");
      const sFacing = Math.max(0, Math.cos((facingAtCommitDeg - cp.facing_deg) * Math.PI / 180)), sLow = 1 - smooth(cls.zH, GK_CTX.lowZHi, GK_CTX.lowZOff), sSide = cls.goalSide === cp.side ? 1 : 0;
      const sReach = cp.reach_screen_unit ? 0.5 * (1 + reach[0] * cp.reach_screen_unit[0] + reach[1] * cp.reach_screen_unit[1]) : 0.5;
      score = famOK ? sFacing * sLow * sSide * (0.5 + 0.5 * sReach) : 0; why = "family " + (famOK ? "ok" : cls.family) + " facing " + sFacing.toFixed(2) + " low " + sLow.toFixed(2) + " side " + sSide + " reach " + sReach.toFixed(2);
    } else if (cp.role === "top_corner") {
      // FAR / FULL-STRETCH TOP CORNER: the height class gate above already restricts this to TOP contacts. On top of that the simulation's
      // own envelope demand must be at or near full stretch, the lateral demand must be real (a mostly-vertical reach stays with the
      // overhead still) and the attack must not be from a tight angle (those keep the tight-angle stills). Ordinary medium/high dives,
      // low saves and near-body saves never reach here.
      const famOK = cls.family === "AIRBORNE_DIVE";
      const sFacing = Math.max(0, Math.cos((facingAtCommitDeg - cp.facing_deg) * Math.PI / 180)), sSide = cls.goalSide === cp.side ? 1 : 0;
      const sStretch = smooth(cls.norm, GK_CTX.stretchLo, GK_CTX.stretchHi), sLat = smooth(latFrac, GK_CTX.cornerLatLo, GK_CTX.cornerLatHi);
      const sOpen = 1 - smooth(attackerDeg, GK_CTX.tightMinDeg, GK_CTX.tightFullDeg);
      const sReach = cp.reach_screen_unit ? 0.5 * (1 + reach[0] * cp.reach_screen_unit[0] + reach[1] * cp.reach_screen_unit[1]) : 0.5;
      score = famOK ? sFacing * sSide * sStretch * sLat * sOpen * (0.5 + 0.5 * sReach) : 0;
      why = "family " + (famOK ? "ok" : cls.family) + " side " + sSide + " stretch " + sStretch.toFixed(2) + " (norm " + cls.norm + ") lat " + sLat.toFixed(2) + " open " + sOpen.toFixed(2) + " reach " + sReach.toFixed(2);
    } else if (cp.role === "low_far_dive") {
      // FAR / EXTREME LOW DIVE: an AIRBORNE_DIVE whose contact is low (the height gate above) to the keeper's own side, at or beyond a
      // full stretch. Ordinary low balls stay LOW_COLLAPSE — the simulation's own "this is a ground-save action" call — and keep the
      // ground stills; a modest low dive falls below the stretch ramp and keeps them too.
      const famOK = cls.family === "AIRBORNE_DIVE";
      const sSide = cls.side === cp.keeper_side ? 1 : 0;
      const sStretch = (cls.expr && cls.expr.nearMax) || cls.bestEffort ? 1 : smooth(cls.norm, GK_CTX.lowFarLo, GK_CTX.lowFarHi);
      const sReach = cp.reach_screen_unit ? 0.5 * (1 + reach[0] * cp.reach_screen_unit[0] + reach[1] * cp.reach_screen_unit[1]) : 0.5;
      score = famOK ? sSide * sStretch * (0.5 + 0.5 * sReach) : 0;
      why = "family " + (famOK ? "ok" : cls.family) + " keeperSide " + cls.side + "/" + sSide + " stretch " + sStretch.toFixed(2) + " (norm " + cls.norm + ") reach " + sReach.toFixed(2);
    } else if (cp.role === "sw_far_dive") {
      // SOUTH-WEST facing far dive: matched on the keeper's OWN side (the classifier's keeper-frame RIGHT/LEFT), so it is independent of
      // where the goal happens to be. Same far/extension weighting and ground fade as the north far dive; the facing cosine hands ordinary
      // west-facing dives back to that pose. Ground actions, gathers and planted saves never reach here.
      const famOK = cls.family === "AIRBORNE_DIVE";
      // the three-quarter SOUTH-WEST view is a narrow band: cubing the facing cosine keeps a west-facing dive (45 deg away) below minScore,
      // so it stays with the north far-dive pose or the diagnostic exactly as before this pose existed
      const cf = Math.max(0, Math.cos((facingAtCommitDeg - cp.facing_deg) * Math.PI / 180)), sFacing = cf * cf * cf, sSide = cls.side === cp.keeper_side ? 1 : 0;
      const far = (cls.expr && cls.expr.nearMax) || cls.bestEffort ? 1 : smooth(cls.norm, GK_CTX.farLo, GK_CTX.farHi);
      const sFar = GK_CTX.farFloor + (1 - GK_CTX.farFloor) * far, sOffGround = smooth(cls.zH, GK_CTX.diveGroundLo, GK_CTX.diveGroundHi);
      const sReach = cp.reach_screen_unit ? 0.5 * (1 + reach[0] * cp.reach_screen_unit[0] + reach[1] * cp.reach_screen_unit[1]) : 0.5;
      score = famOK ? sFacing * sSide * sFar * sOffGround * (0.5 + 0.5 * sReach) : 0;
      why = "family " + (famOK ? "ok" : cls.family) + " facing " + sFacing.toFixed(2) + " keeperSide " + cls.side + "/" + sSide + " far " + sFar.toFixed(2) + " reach " + sReach.toFixed(2);
    } else if (cp.role === "dive_north" || cp.role === "dive_south") {
      // canonical medium/high airborne dive to the keeper's right (north / GOAL_LEFT) or, since 2026-09-06, its GOAL_RIGHT counterpart
      // (dive_south): one authored contact pose per goal side, scored identically — the pose row's own `side` decides which classifier
      // goal side it serves. The height-class gate above keeps them off low dives (the ground stills own those) and off TOP reaches
      // (the tight/overhead stills do).
      const famOK = cls.family === "AIRBORNE_DIVE";                                    // never LOW_COLLAPSE / gathers / planted saves — those keep their own art
      const sFacing = Math.max(0, Math.cos((facingFarDeg - cp.facing_deg) * Math.PI / 180)), sSide = cls.goalSide === cp.side ? 1 : 0;
      // FAR / HIGH-EXTENSION: the simulation's own committed demand against the keeper's reach envelope (norm = required span / envelope).
      // A dive at or beyond full stretch — including an unreachable best-effort attempt — saturates the ramp, so the keeper is still shown
      // making the whole attempt. No shooter distance, no pitch coordinates.
      const far = (cls.expr && cls.expr.nearMax) || cls.bestEffort ? 1 : smooth(cls.norm, GK_CTX.farLo, GK_CTX.farHi);
      const sFar = GK_CTX.farFloor + (1 - GK_CTX.farFloor) * far;                       // every real airborne dive keeps art; the far ones outrank the ground stills
      const sReach = cp.reach_screen_unit ? 0.5 * (1 + reach[0] * cp.reach_screen_unit[0] + reach[1] * cp.reach_screen_unit[1]) : 0.5;
      const sOffGround = smooth(cls.zH, GK_CTX.diveGroundLo, GK_CTX.diveGroundHi);      // a ball on the deck belongs to the ground stills whatever the extension
      score = famOK ? sFacing * sSide * sFar * sOffGround * (0.5 + 0.5 * sReach) : 0;
      why = "family " + (famOK ? "ok" : cls.family) + " facing " + sFacing.toFixed(2) + " side " + sSide + " far " + sFar.toFixed(2) + " (norm " + cls.norm + ") offGround " + sOffGround.toFixed(2) + " reach " + sReach.toFixed(2);
    } else if (cp.role === "overhead") {
      // the overhead still is for the open/central ball over the keeper; at a tight attacker angle the tight-angle stills own the high reach
      const sVert = smooth(dz, GK_CTX.overheadDzLo, GK_CTX.overheadDzHi), sLat = 1 - smooth(latFrac, GK_CTX.overheadLatLo, GK_CTX.overheadLatHi), sReach = cosR(cp.reach_screen_unit), sOpen = 1 - smooth(attackerDeg, GK_CTX.tightMinDeg, GK_CTX.tightFullDeg);
      score = sVert * sLat * sOpen * (0.5 + 0.5 * sReach); why = "vert " + sVert.toFixed(2) + " lat " + sLat.toFixed(2) + " open " + sOpen.toFixed(2) + " reach " + sReach.toFixed(2);
    }
    const prio = cp.priority != null ? cp.priority : 1;
    scored.push({ id: cp.id, score: +score.toFixed(3), why, priority: prio, role: cp.role });
    const qualifies = score >= GK_CTX.minScore;
    const better = !best || (qualifies && !best.qualifies) || (qualifies === best.qualifies && (prio > best.prio || (prio === best.prio && score > best.score)));
    if (score > 0 && better) best = { cp, score, why, prio, qualifies };
  }
  const baseline = defaultSample && defaultSample.anchors && defaultSample.anchors.root && defaultSample.anchors.lead_glove ? (() => { const r = defaultSample.anchors.root, g = defaultSample.anchors.lead_glove, dx = g[0] - r[0], dy = g[1] - r[1], n = Math.hypot(dx, dy) || 1e-6; return 0.5 * cosR([dx / n, dy / n]); })() : 0;
  let pick = best && best.score >= GK_CTX.minScore && best.score > baseline ? best : null;
  // FAR-DIVE FALLBACK (2026-09-06): an AIRBORNE_DIVE at MID/HIGH/TOP with no qualifying art keeps the goal side's far-dive pose when that
  // pose is otherwise eligible (family, side, off the ground, some reach agreement) but fell under minScore only through the facing cosine —
  // the keeper facing a flank shooter 30–65 deg off the pose's authored west. It is the family's only art for that side; the alternative
  // is the diagnostic figure. Nothing changes for any case that already had a pick.
  let fallback = false;
  if (!pick && cls.family === "AIRBORNE_DIVE" && (hClass === "MID" || hClass === "HIGH" || hClass === "TOP")) {
    let fb = null;
    for (const cp of A.contextual) {
      if (cp.role !== "dive_north" && cp.role !== "dive_south") continue;
      const sc = scored.find(q => q.id === cp.id);
      if (sc && sc.score >= GK_CTX.farFallbackMin && sc.score > baseline && (!fb || sc.score > fb.score)) fb = { cp, score: sc.score, why: sc.why + " FALLBACK (facing below minScore; the side's only far-dive art)", prio: 1, qualifies: false };
    }
    if (fb) { pick = fb; fallback = true; }
  }
  // HARD SIDE FALLBACK (2026-09-06, from live free-play misses): the keeper-frame side of an airborne dive (the /LEFT or /RIGHT the
  // overlay reports) is authoritative for the art. A far airborne MID/HIGH/TOP dive that no more specific approved pose won (the
  // tight-angle, top-corner and SW stills keep their cases whenever they qualify) must never fall to the diagnostic through a facing
  // cosine, a goal-side conversion or the threshold: it takes the generic far-dive sprite of its side — LEFT → the south far dive,
  // RIGHT → the north far dive. A LOW-MID airborne dive takes the best-scoring ground / low-far still that serves it, then the same
  // generic art. Presentation only (the simulated save is untouched); flagged FORCED in the reason and the art label.
  let forced = false;
  if (!pick && cls.family === "AIRBORNE_DIVE" && (cls.side === "LEFT" || cls.side === "RIGHT")) {
    const wantRole = cls.side === "LEFT" ? "dive_south" : "dive_north";
    let fb = null;
    if (hClass === "LOW-MID") {
      for (const cp of A.contextual) {
        if (cp.role !== "low_side" && cp.role !== "low_far_dive") continue;
        const sc = scored.find(q => q.id === cp.id);
        if (sc && sc.score > 0 && (!fb || sc.score > fb.score)) fb = { cp, score: sc.score, why: sc.why + " FORCED (LOW-MID airborne dive, keeper-frame " + cls.side + ": best ground/low-far still serving the side)" };
      }
    }
    if (!fb) {
      const cp = A.contextual.find(c => c.role === wantRole);
      if (cp) { const sc = scored.find(q => q.id === cp.id); fb = { cp, score: sc ? sc.score : 0, why: (sc ? sc.why : "gated") + " FORCED (keeper-frame " + cls.side + " far airborne dive: the side's generic far-dive art; no more specific approved pose qualified)" }; }
    }
    if (fb) { pick = { cp: fb.cp, score: fb.score, why: fb.why, prio: 0, qualifies: false }; forced = true; }
  }
  return { pick: pick ? { id: pick.cp.id, inventory_id: pick.cp.inventory_id || null, transform: pick.cp.sample && pick.cp.sample.mirror ? "MIRRORED" : "ORIGINAL", sample: pick.cp.sample, score: +pick.score.toFixed(3), why: pick.why, fallback, forced } : null, situation, scored, baseline: +baseline.toFixed(3) };
}
// STATE MACHINE — a pure function of (simulation time, keeper state) plus the view odometer for loops and the commit-tick freeze
function gkAnimUpdate(t, gk) {
  const A = S.gkAnim, now = t.now, b = t.b;
  // COMMIT FREEZE: facing/direction and the save classification are fixed at the commit tick (the simulation facing keeps
  // tracking the ball past the keeper; the drawn body must not spin mid-dive). Keyed by the commit tick — deterministic.
  if (gk.committed) { if (!A.commit || A.commit.key !== gk.committed.commitTick) A.commit = { key: gk.committed.commitTick, facing: gk.facing, dir: headingToDir(gk.facing * 180 / Math.PI), cls: gkAnimClassify(gk, gk.committed, gk.facing), reachPos: null, place: null }; }
  else if (A.commit && !gk.shotActive) A.commit = null;
  const frozen = gk.committed && A.commit ? A.commit : null;
  const dir = frozen ? frozen.dir : headingToDir(gk.facing * 180 / Math.PI);
  const gkF = frozen ? { x: gk.x, y: gk.y, facing: frozen.facing, height: gk.height, committed: gk.committed } : gk;
  const speed = Math.hypot(gk.vx, gk.vy);                      // the decision input — identical for every facing
  // FOOTWORK FRAME ORDER for the added facings (SOUTH-WEST / NORTH-WEST, 2026-09-05). Facts: at many ball positions the positioning
  // controller never converges exactly — it settles into a ±0.7 mm step (|v| = accel·dt ≈ 0.084 m/s, its own state SET, no net travel)
  // and the footwork decision (|v| > shuffleMinSpeed) keeps the shuffle loop advancing with the odometer at ≈ one frame per 1.4 s. That
  // slow cycle IS the readiness motion seen in play for the pre-existing facings. Its LEFT/RIGHT flip-flop every tick is harmless for
  // WEST because both sides resolve to the same mirrored-east frames in the same order. The SW/NW clips are authored in their own
  // facing (side RIGHT), so the resolver's side approximation would play the cycle in REVERSE for LEFT — alternating authored and
  // reversed order every tick (a 30 Hz two-frame flicker: the original "static" report) and popping at every braking reversal. For
  // these facings the footwork loop therefore uses the authored variant in its authored order for both sides — WEST's structure.
  // The decision itself (footwork / IDLE / SET) is untouched for every facing; nothing else is read or changed.
  const pinFootworkOrder = (req) => { if (!req || GK_ANIM.footworkAuthoredOrderDirs.indexOf(dir) < 0) return req; const ex = gkAnimAuthoredSide(A.byFamily[req.family], dir); if (ex && req.side !== ex) { req.sidePinned = req.side; req.side = ex; } return req; };
  let state = "SET", family = null, side = null, u = 0, phase = "-", temp = null, arm = false, boot = false, holdPose = false, cls = null, seqFrame = null, seqCtx = null;
  let clipReq = null;       // {family, side, mode: "reach"|"hold"|"post"|"loop", k (0..1 within the mode)}
  const footwork = () => {
    const g = gkAnimSide(gk, gk.x + gk.vx, gk.y + gk.vy);
    if (Math.abs(g.lat) >= Math.abs(g.fwd)) return (speed > GK_ANIM.crossoverSpeed ? "CROSSOVER_" : "SHUFFLE_") + (g.lat >= 0 ? "RIGHT" : "LEFT");
    return g.fwd >= 0 ? "STEP_FORWARD" : "STEP_BACKWARD";
  };
  const footworkClip = (st) => {
    const fam = st.startsWith("SHUFFLE") ? "SHUFFLE" : st.startsWith("CROSSOVER") ? "CROSSOVER" : st;
    const sd = st.endsWith("RIGHT") ? "RIGHT" : st.endsWith("LEFT") ? "LEFT" : null;
    if (A.byFamily && A.byFamily[fam]) return { family: fam, side: sd, mode: "loop" };
    if (A.byFamily && A.byFamily.SHUFFLE) { const g = gkAnimSide(gk, gk.x + gk.vx, gk.y + gk.vy); return { family: "SHUFFLE", side: sd || (g.lat >= 0 ? "RIGHT" : "LEFT"), mode: "loop", approx: "shuffle frames stand in for " + st }; }
    return null;
  };
  if (!gk.shotActive && !gk.committed) {
    if (speed > GK_ANIM.shuffleMinSpeed) { state = footwork(); phase = "loop"; clipReq = pinFootworkOrder(footworkClip(state)); if (!clipReq) temp = "no authored footwork frames: SET pose + root motion"; }
    else {
      const far = b && b.ctrl && Math.hypot(b.x - gk.x, b.y - gk.y) > GK_ANIM.idleFarM;
      state = far ? "IDLE" : "SET"; phase = far ? "living" : "hold";
    }
  } else if (!gk.committed) {                                             // READ / PREPARE (reaction elapsed, footwork toward the read)
    if (speed > GK_ANIM.shuffleMinSpeed) { state = footwork(); phase = gk.phase === "PREPARE" ? "prepare" : "read"; clipReq = pinFootworkOrder(footworkClip(state)); if (!clipReq) temp = "no authored footwork frames"; }
    else { state = "SET"; phase = gk.phase === "READ" ? "read (head tracks)" : "prepare"; }
  } else {
    const c = gk.committed; cls = frozen.cls; family = cls.family; side = cls.side; let clipFamily = family;
    const ct = gk.contact, contactT = ct ? ct.tickT : null;
    const legSurf = ct && (ct.volume === "LEGTIP" || ct.volume === "LEG+" || ct.volume === "LEG-");
    // the actual contact surface corrects a pre-contact guess between the leg-led and the hand-led low visuals
    if (ct && family === "FOOT_SAVE" && !legSurf) { family = cls.feetPlanted ? "NEAR_BODY_SAVE" : "LOW_COLLAPSE"; clipFamily = family; }
    const dtc = now - c.t0; u = Math.max(0, Math.min(1, dtc / Math.max(1e-6, c.execTime)));
    const held = b && b.held === "GK";
    const isDive = !!GK_ANIM_DIVES[family];
    const execEnd = c.t0 + c.execTime;
    const endT = isDive ? Math.max(execEnd, contactT != null ? contactT : -1) : (contactT != null ? Math.max(execEnd, contactT) : Infinity);
    seqCtx = { u, endT, c, held };                                        // the sequence frame is resolved after the pick (below)
    if (legSurf && now - contactT < GK_ANIM.footSaveHold) { const g = gkAnimSide(gkF, ct.point[0], ct.point[1]); side = g.lat >= 0 ? "RIGHT" : "LEFT"; family = "FOOT_SAVE"; state = "FOOT_SAVE_" + side; phase = "contact"; boot = true; clipReq = { family: "FOOT_SAVE", side, mode: "hold" }; }
    else if (held) { state = family === "LOW_GATHER" ? "LOW_GATHER" : (family === "CHEST_CATCH" || family === "SUPPORTED_CATCH" || family === "HIGH_CATCH") ? family : "CATCH_HOLD"; phase = "hold"; holdPose = true; arm = true; clipReq = { family: clipFamily, side, mode: "hold" }; }
    else if (now < endT) {                                                // the action is being executed (SAVE) or held at the target (wait)
      if (family === "LOW_GATHER") { state = "LOW_GATHER"; phase = u < 0.6 ? "get-down" : "secure"; arm = true; }
      else if (family === "CHEST_CATCH" || family === "SUPPORTED_CATCH" || family === "HIGH_CATCH") { state = family; phase = u < 0.7 ? "hands-out" : "absorb"; arm = true; }
      else if (family === "NEAR_BODY_SAVE") { state = "NEAR_BODY_SAVE_" + side; phase = "reach"; arm = true; }
      else if (family === "FOOT_SAVE") { state = "FOOT_SAVE_" + side; phase = "leg out"; boot = true; arm = true; }
      else { state = family + "_" + cls.goalSide + (cls.expr ? " " + cls.expr.heightClass : ""); phase = u < GK_ANIM.loadPhase ? "load/push" : (u < 0.8 ? "extend" : "contact"); arm = true; }
      if (now >= execEnd && !isDive) phase = "wait at target";
      clipReq = { family: clipFamily, side, mode: "reach", k: u };
    } else if (isDive) {                                                  // LAND → RECOVER → SET
      const tl = now - endT;
      if (tl < GK_ANIM.landDur) { state = "LAND"; phase = "land"; arm = tl < 0.15; clipReq = { family: clipFamily, side, mode: "post", k: tl / GK_ANIM.landDur }; }
      else if (tl < GK_ANIM.landDur + GK_ANIM.recoverDur) { state = "RECOVER"; phase = "rise"; const k = (tl - GK_ANIM.landDur) / GK_ANIM.recoverDur; clipReq = { family: "RECOVER", side, mode: "post", k }; }
      else { state = "SET"; phase = "hold"; if (!gkAnimSeqPostPending(A, tl)) A.commit = null; }
    } else {                                                              // gather / chest / near-body / foot: RISE back to SET
      const tl = now - endT;
      if (tl < GK_ANIM.riseDur) { state = "RECOVER"; phase = "rise"; clipReq = { family: clipFamily, side, mode: "post", k: tl / GK_ANIM.riseDur }; }
      else { state = "SET"; phase = "hold"; if (!gkAnimSeqPostPending(A, tl)) A.commit = null; }
    }
  }
  // resolve the art for the request: authored clip (live) → contact POSE (approved, or candidate when the review page asks)
  // → temporary representation (standing families) → DIAGNOSTIC figure (dive families: never a wrong dive)
  let clip = null, pose = null, diagnostic = null, savePose = null;
  if (clipReq && A.byFamily) {
    const c = A.byFamily[clipReq.family];
    const r = c ? gkAnimResolve(c, dir, clipReq.side) : null;
    const isDiveFam = !!GK_ANIM_DIVES[clipReq.family];
    // CAMERA-SPACE SAVE POSE (V1.2): authored for GOAL_LEFT / GOAL_RIGHT in the gameplay camera — no rotation, no mirror
    const spFam = A.savePoses[clipReq.family], spSide = spFam && cls ? spFam[cls.goalSide] : null;
    const spKey = cls && cls.expr ? cls.expr.heightClass : (clipReq.family === "LOW_COLLAPSE" ? "LOW" : null);
    let spSample = spSide ? (spSide[spKey] || spSide.MID || spSide.LOW || Object.values(spSide)[0]) : null;
    // CONTEXTUAL salvaged still (candidate manifests only): evaluated once per commit from the committed geometry, then frozen
    let ctx = null;
    if (A.contextual && frozen && GK_CTX.families[clipReq.family] && clipReq.mode !== "loop") {
      if (A.commit.ctx === undefined) A.commit.ctx = gkAnimContextualPick(A, t, gk, cls, gk.committed, frozen.facing, spSample);
      ctx = A.commit.ctx && A.commit.ctx.pick ? A.commit.ctx.pick : null;
      if (ctx) spSample = ctx.sample;
      if (A.commit.seq === undefined) { A.commit.seq = ctx ? gkAnimSeqPick(A, cls, ctx, gk.committed) : null;
      // FACING VARIANTS (2026-09-07): a sequence may carry per-facing anticipation frames; the facing is the one the selector judged the
      // keeper to present at commit (bearing-corrected), binned to the eight sprite facings, so the animation starts from the sprite he was showing
      const fdeg = ctx && ctx.situation ? ctx.situation.facingAtCommitDeg : (frozen && frozen.facing != null ? frozen.facing * 180 / Math.PI : gk.facing * 180 / Math.PI);
      A.commit.seqDir = headingToDir(fdeg); }
    }
    if ((isDiveFam || ctx) && spSample && clipReq.mode !== "loop" && clipReq.family !== "RECOVER") {
      savePose = { family: clipReq.family, side: cls.goalSide, key: ctx ? ctx.id : spKey, sample: spSample, mode: clipReq.mode, k: clipReq.k, candidate: spSample.candidate, showFrom: GK_ANIM.loadPhase, exact: ctx ? true : !!spSide[spKey], contextual: ctx || null }; temp = null;
    } else if (r) {
      const v = r.v, n = v.frames.length; let pos = 0, cands = null;
      if (clipReq.mode === "loop") { const cyc = (A.odo / v.strideM) * n; pos = Math.floor(cyc) % n; if (r.reverse) pos = (n - 1 - pos + n) % n; }
      else if (clipReq.mode === "reach") {
        const floor = A.commit && A.commit.reachPos != null ? A.commit.reachPos : 0; const mapped = Math.round(clipReq.k * v.contact); pos = Math.max(floor, mapped);
        if (v.ik && clipReq.k >= GK_ANIM.loadPhase) {
          const lo = v.ik === "y" ? Math.max(floor, mapped - GK_ANIM.ikWindow) : floor, hi = v.ik === "y" ? Math.min(v.contact, mapped + GK_ANIM.ikWindow) : v.contact;
          cands = []; for (let q = lo; q <= hi; q++) cands.push(q);
        }
      }
      else if (clipReq.mode === "hold") { pos = v.hold; if (v.ik) { const floor = Math.min(v.contact, A.commit && A.commit.reachPos != null ? A.commit.reachPos : v.contact); cands = []; for (let q = floor; q < n; q++) cands.push(q); } }
      else { const span = n - 1 - v.contact; pos = span > 0 ? v.contact + Math.min(span, Math.max(1, Math.round(clipReq.k * span + 0.5))) : n - 1; if (c.kind === "recover") pos = Math.min(n - 1, Math.floor(clipReq.k * n)); }
      clip = { name: c.name, kind: c.kind, v, pos: Math.max(0, Math.min(n - 1, pos)), cands, mirrored: r.mirrored, sideApprox: r.sideApprox || !!clipReq.sidePinned, dirSteps: r.dirSteps, approx: clipReq.approx || null, mode: clipReq.mode, retired: r.retired };
      temp = null;
    } else if (isDiveFam && A.poses[clipReq.family] && (A.poses[clipReq.family].approved || GK_ANIM.candidatePoses) && clipReq.mode !== "loop") {
      // CONTACT POSE (8-rotation still): laid along the SAVE VECTOR, hand-led (Part 4 / Part 12)
      const ps = A.poses[clipReq.family]; const c0 = gk.committed;
      const sv = c0 ? gkAnimScreenVec({ x: c0.feet[0], y: c0.feet[1] }, c0.target[0] - c0.feet[0], c0.target[1] - c0.feet[1], c0.target[2]) : null;
      const rp = gkAnimResolvePose(ps, cls ? cls.saveAngle : (gk.facing * 180 / Math.PI), clipReq.side, sv);
      pose = { family: clipReq.family, ps, dir: rp.dir, mirrored: rp.mirrored, bodyDeg: rp.bodyDeg, mismatchDeg: rp.mismatchDeg, wantDeg: rp.wantDeg, mode: clipReq.mode, k: clipReq.k, candidate: !ps.approved, showFrom: GK_ANIM.loadPhase };
      temp = null;
    } else if (isDiveFam && GK_ANIM.diagnosticDives && clipReq.mode !== "loop" && clipReq.family !== "RECOVER") {
      diagnostic = { family: clipReq.family, side: clipReq.side, reason: "ART_MISSING" }; temp = null;
    } else if (clipReq.mode !== "loop") temp = "no authored " + clipReq.family + (clipReq.side ? "/" + clipReq.side : "") + " frames for " + dir + ": SET pose + procedural " + (boot ? "boot" : "glove") + " at the simulation " + (boot ? "leg tip" : "hand");
    else temp = "no authored footwork frames for " + dir + ": SET pose + root motion";
  }
  // SEQUENCE frame for this tick (the pick is made once per commit in the resolve block above): pre-contact frames by the simulation's
  // own u, the contact window (liveFrom → endT + contactHold) left to the untouched save-pose path, post-contact frames by seconds after endT
  if (GK_ANIM.sequences && seqCtx && A.commit && A.commit.seq) {
    const sq = A.commit.seq.def, tl = now - seqCtx.endT, uu = seqCtx.u;
    // a contact of THIS action (its tick at/after the commit origin) hands the frame to the approved contact pose from the contact
    // tick on: the ball can meet the moving hand a tick before full extension (u < liveFrom), and the frozen contact keyframe must
    // sit on the actual contact tick, never on the last pre-contact frame (a stale contact from an earlier shot has tickT < t0;
    // the contact exists only once it has happened, so its presence alone is the signal)
    const ct = gk.contact, touched = !!(ct && ct.tickT != null && ct.tickT >= seqCtx.c.t0 - 1e-3);   // tickT is rounded to 3 dp: never compare it with now
    if (now < seqCtx.endT + (sq.contactHold || 0)) { if (uu < sq.liveFrom && !touched) { const fr = sq.pre.find(x => uu >= x.from && uu < x.to); if (fr) seqFrame = { id: sq.id, key: fr.key, e: fr, mode: "pre", ikW: fr.ikW || 0 }; } }
    else if (!seqCtx.held) { const pf = sq.post.find(x => tl >= x.from && tl < x.to); if (pf) seqFrame = { id: sq.id, key: pf.key, e: pf, mode: "post", carry: pf.carry != null ? pf.carry : 1, tl, pres: gkAnimSeqPres(gk, seqCtx.c, sq.pres, tl) }; }
    // a CAUGHT ball (held by the keeper) keeps the untouched hold path: the landing/recovery frames would carry the drawn keeper away from
    // the ball, which the simulation keeps in the frozen hand — a landing-with-ball continuation is future work
  }
  const prev = A.cur;
  A.cur = { state, family, side, u: +u.toFixed(3), phase, dir, temp, arm, boot, holdPose, speed, clip, pose, diagnostic, savePose, cls, seq: seqFrame };
  if (!prev || prev.state !== state) { A.log.push({ t: +now.toFixed(3), state, family, side }); if (A.log.length > 24) A.log.shift(); }
  return A.cur;
}
function gkAnimAnchorsFor(stateName, dir) { const a = S.gkAnim.anchors[stateName]; return a && a[dir] ? a[dir] : null; }
// draw one pixel frame with its (ax, ay) anchor on the screen point; optional horizontal mirror. Returns the sprite→screen map.
function gkAnimBlit(img, mirror, ax, ay, s, sx, sy, g) {
  g = g || ctx;
  const W = img.width, H = img.height, dw = Math.round(W * s), dh = Math.round(H * s);
  g.imageSmoothingEnabled = false;
  if (!mirror) { const dx = Math.round(sx - ax * s), dy = Math.round(sy - ay * s); g.drawImage(img, dx, dy, dw, dh); return { dx, dy, dw, dh, toScreen: (px, py) => ({ x: dx + Math.round(px * s), y: dy + Math.round(py * s) }) }; }
  const dx = Math.round(sx - (W - ax) * s), dy = Math.round(sy - ay * s);
  g.save(); g.translate(dx + dw, dy); g.scale(-1, 1); g.drawImage(img, 0, 0, dw, dh); g.restore();
  return { dx, dy, dw, dh, toScreen: (px, py) => ({ x: dx + Math.round((W - px) * s), y: dy + Math.round(py * s) }) };
}
// glove positions of a frame/pose given a placement transform; nearest to the simulation hand wins (2-D or height-only)
function gkAnimGloves(gloveList, map, simHand, yOnly) {
  let g = null;
  for (const gl of gloveList) { const p = map(gl[0], gl[1]); const d = simHand ? (yOnly ? Math.abs(p.y - simHand.y) + 0.05 * Math.abs(p.x - simHand.x) : Math.hypot(p.x - simHand.x, p.y - simHand.y)) : 0; if (!g || d < g.d) g = { x: p.x, y: p.y, d, d2: simHand ? Math.hypot(p.x - simHand.x, p.y - simHand.y) : 0 }; }
  return g;
}
// HAND-LED PLACEMENT (Part 12): during a committed save the whole frame may translate toward the simulation hand by at most
// corrMaxPx (sprite px) with weight w (0 before loadPhase → 1 at contact). Raw error, correction and residual are recorded;
// a capped correction means the art's geometry does not fit → WRONG_CLIP flag (the body is never stretched or re-shaped).
function gkAnimPlace(rawGlove, simHand, w, s, frozenPlace) {
  if (frozenPlace) return { dx: frozenPlace.dx, dy: frozenPlace.dy, rawErrPx: frozenPlace.rawErrPx, corrPx: frozenPlace.corrPx, finalErrPx: frozenPlace.finalErrPx, capped: frozenPlace.capped, w: 1, frozen: true };
  if (!rawGlove || !simHand || w <= 0) return { dx: 0, dy: 0, rawErrPx: rawGlove && simHand ? +(rawGlove.d2 / s).toFixed(1) : null, corrPx: 0, finalErrPx: rawGlove && simHand ? +(rawGlove.d2 / s).toFixed(1) : null, capped: false, w };
  let cx = (simHand.x - rawGlove.x) * w, cy = (simHand.y - rawGlove.y) * w;
  const mag = Math.hypot(cx, cy) / s, cap = GK_ANIM.corrMaxPx; let capped = false;
  if (mag > cap) { const k = cap / mag; cx *= k; cy *= k; capped = true; }
  const fin = Math.hypot(rawGlove.x + cx - simHand.x, rawGlove.y + cy - simHand.y) / s;
  return { dx: Math.round(cx), dy: Math.round(cy), rawErrPx: +(rawGlove.d2 / s).toFixed(1), corrPx: +(Math.hypot(cx, cy) / s).toFixed(1), finalErrPx: +fin.toFixed(1), capped, w };
}
// DIAGNOSTIC figure for a dive family without approved art: simulation-driven stick figure + save vector + ART_MISSING label.
// Deliberately not a sprite: a standing sprite or a wrong dive would misrepresent the save.
function gkAnimDrawDiagnostic(t, gk, cur, sp, s) {
  const cls = cur.cls; const P = (x, y, z) => sproj3(x, z || 0, y);
  const hn = gk.handNow || [gk.x, gk.y, gk.handZ];
  const H = gk.height, hipZ = GK_BODY.hipFrac * H, shZ = GK_BODY.shoulderFrac * H;
  const k = Math.max(0, Math.min(1, (cur.u - GK_ANIM.loadPhase) / (1 - GK_ANIM.loadPhase)));           // body extension along the reach
  // pelvis follows the root with a lateral lead; shoulder sits on the line from the pelvis toward the hand (torso length)
  const pel = [gk.x, gk.y, Math.max(0.25, hipZ * (1 - 0.55 * k))];
  const toHand = [hn[0] - pel[0], hn[1] - pel[1], hn[2] - pel[2]], tl = Math.hypot(toHand[0], toHand[1], toHand[2]) || 1e-6, torso = 0.55;
  const sh = [pel[0] + toHand[0] / tl * torso, pel[1] + toHand[1] / tl * torso, pel[2] + toHand[2] / tl * torso];
  const head = [sh[0] + toHand[0] / tl * 0.22, sh[1] + toHand[1] / tl * 0.22, sh[2] + toHand[2] / tl * 0.22 + 0.06];
  const lt = gk.legTipNow; const feet = [[gk.x, gk.y - GK_BODY.footSpread, 0], [gk.x, gk.y + GK_BODY.footSpread, 0]];
  const L = (a, b, col, w) => { const pa = P(a[0], a[1], a[2]), pb = P(b[0], b[1], b[2]); ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, Math.round(w * s)); ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); };
  const D = (a, col, r) => { const p = P(a[0], a[1], a[2]); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, Math.round(r * s)), 0, Math.PI * 2); ctx.fill(); };
  ctx.save();
  L(feet[0], pel, "#101010", 5); L(feet[1], pel, "#101010", 5);                                       // legs (black shorts/socks)
  if (lt) L(pel, lt, "#101010", 5);
  L(pel, sh, "#38e01c", 8);                                                                            // torso (jersey green)
  L(sh, hn, "#38e01c", 5);                                                                             // leading arm
  D(head, "#d8a070", 5); D(hn, "#f4f4f4", 4); D(pel, "#c080ff", 3);                                    // head (skin), glove (white), pelvis
  if (lt) D(lt, "#101010", 3);
  // save vector: feet at commit → committed target (world), drawn as an arrow along the ground + the vertical rise
  if (cls && gk.committed) {
    const c = gk.committed; const a = P(c.feet[0], c.feet[1], 0), bpt = P(c.target[0], c.target[1], 0), tt = P(c.target[0], c.target[1], c.target[2]);
    ctx.setLineDash([4, 3]); ctx.strokeStyle = "#ff4fd8"; ctx.lineWidth = Math.max(1, PXQ * 2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bpt.x, bpt.y); ctx.lineTo(tt.x, tt.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ff4fd8"; ctx.beginPath(); ctx.arc(tt.x, tt.y, uipx(3), 0, Math.PI * 2); ctx.fill();
  }
  const hp = P(head[0], head[1], head[2]); ctx.fillStyle = "#ff9a3c"; ctx.font = uipx(9) + "px monospace"; ctx.textAlign = "center";
  ctx.fillText("ART_MISSING " + cur.family + (cur.side ? "/" + cur.side : ""), hp.x, hp.y - uipx(10)); ctx.textAlign = "left";
  ctx.restore();
  return { root: { x: Math.round(sp.x), y: Math.round(sp.y) }, pelvis: (p => ({ x: Math.round(p.x), y: Math.round(p.y) }))(P(pel[0], pel[1], pel[2])), head: (p => ({ x: Math.round(p.x), y: Math.round(p.y) }))(P(head[0], head[1], head[2])), shoulder: (p => ({ x: Math.round(p.x), y: Math.round(p.y) }))(P(sh[0], sh[1], sh[2])) };
}
// DRAW — returns true when the keeper was drawn by the animation system (the Stage-0 stick figure is then skipped unless dbg.gkstick)
function gkAnimDraw(t, gk, dt) {
  const A = S.gkAnim; if (!A.loaded) return false;
  const t0 = performance.now();
  if (A.prevRoot) A.odo += Math.hypot(gk.x - A.prevRoot.x, gk.y - A.prevRoot.y); A.prevRoot = { x: gk.x, y: gk.y };
  const cur = gkAnimUpdate(t, gk);
  const sp = sproj3(gk.x, 0, gk.y); if (sp.d < 0.5) return true;
  const s = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES;
  const flat = flattenAt(gk.x, gk.y);
  const shOff = (cur.seq && cur.seq.pres && GK_ANIM.seqShadowFollows) ? cur.seq.pres : ((GK_ANIM.reviewOverride && GK_ANIM.reviewOverride.shadow && GK_ANIM.seqShadowFollows) ? GK_ANIM.reviewOverride.shadow : null);     // the shadow stays under the PRESENTED keeper during the post-contact continuation (live sequence, or a review override carrying the same offset)
  ctx.save(); ctx.beginPath(); ctx.ellipse(Math.round(sp.x + (shOff ? shOff.sx : 0)), Math.round(sp.y + (shOff ? shOff.sy : 0)), 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill(); ctx.restore();
  if (GK_ANIM.reviewOverride) { gkAnimDrawReview(t, gk, sp, s, GK_ANIM.reviewOverride); return true; }
  let anchors = { root: { x: Math.round(sp.x), y: Math.round(sp.y) } }, handScreen = null, gloveScreen = null, ik = null, place = null, artLabel = "";
  const simHand = (cur.arm || cur.holdPose) && gk.handNow ? sproj3(gk.handNow[0], gk.handNow[2], gk.handNow[1]) : null;
  const wReach = cur.u >= GK_ANIM.loadPhase ? Math.min(1, (cur.u - GK_ANIM.loadPhase) / (1 - GK_ANIM.loadPhase)) : 0;
  if (cur.seq) {
    // ── SEQUENCE FRAME (full authored dive animation around a contact pose): drawn at the simulation root. Pre-contact frames use the
    // same bounded hand-led placement as the save poses (weight ramping in over the flight); post-contact frames carry a fading share of
    // the contact placement plus the presentation-root continuation. The contact window itself is the untouched save-pose path.
    const sf = cur.seq, e0 = sf.e, fv = e0.byFacing && A.commit && A.commit.seqDir ? e0.byFacing[A.commit.seqDir] : null, e = fv || e0;
    const useMod = sf.mode === "pre" && A.commit && A.commit.seq && A.commit.seq.variant === "moderate" && e.moderate;
    const img = useMod ? e.moderate.img : e.img, an = (useMod ? e.moderate.anchors : e.anchors) || {};
    const ax = an.root ? an.root[0] : img.width / 2, ay = an.root ? an.root[1] : img.height - 1, ps = s * (an.pixel_scale || 1);
    const gl = an.gloves && an.gloves.length ? an.gloves : (an.lead_glove ? [an.lead_glove] : []);
    let dx = 0, dy = 0;
    if (sf.mode === "pre") {
      if (sf.ikW > 0 && simHand && gl.length) { const dx0 = Math.round(sp.x - ax * ps), dy0 = Math.round(sp.y - ay * ps); const raw = gkAnimGloves(gl, (px, py) => ({ x: dx0 + Math.round(px * ps), y: dy0 + Math.round(py * ps) }), simHand, false); place = gkAnimPlace(raw, simHand, sf.ikW, s, null); dx = place.dx; dy = place.dy; }
    } else {
      const pl = A.commit && A.commit.place ? A.commit.place : null; const k = sf.carry;
      dx = (pl ? Math.round((pl.dx || 0) * k) : 0) + (sf.pres ? Math.round(sf.pres.sx) : 0); dy = (pl ? Math.round((pl.dy || 0) * k) : 0) + (sf.pres ? Math.round(sf.pres.sy) : 0);
    }
    const blit = gkAnimBlit(img, false, ax, ay, ps, sp.x + dx, sp.y + dy);
    anchors = { root: anchors.root, pelvis: an.pelvis ? blit.toScreen(an.pelvis[0], an.pelvis[1]) : null, head: an.head ? blit.toScreen(an.head[0], an.head[1]) : null, shoulder: an.shoulder ? blit.toScreen(an.shoulder[0], an.shoulder[1]) : null,
      handL: gl[0] ? blit.toScreen(gl[0][0], gl[0][1]) : null, handR: gl[1] ? blit.toScreen(gl[1][0], gl[1][1]) : null, footL: an.foot_L ? blit.toScreen(an.foot_L[0], an.foot_L[1]) : null, footR: an.foot_R ? blit.toScreen(an.foot_R[0], an.foot_R[1]) : null };
    gloveScreen = gl.length ? gkAnimGloves(gl, blit.toScreen, simHand, false) : null; if (gloveScreen && simHand) handScreen = { x: gloveScreen.x, y: gloveScreen.y };
    artLabel = "SEQ " + sf.id + " " + sf.key + (fv ? " [" + A.commit.seqDir + "]" : "") + (useMod ? " (moderate)" : "") + (sf.mode === "pre" ? "  u " + cur.u.toFixed(2) + (sf.ikW ? " hand-led " + sf.ikW : "") : "  +" + sf.tl.toFixed(2) + " s" + (sf.pres ? " pres +" + sf.pres.dm.toFixed(2) + " m" : "") + " carry " + sf.carry);
  } else if (cur.clip) {
    // ── AUTHORED FRAME: bounded frame-selection IK (nearest glove among allowed candidates) + hand-led translation (recorded, capped)
    const v = cur.clip.v; let pos = cur.clip.pos, best = null; const yOnly = v.ik === "y";
    const probe = (q) => { const fr = v.frames[q]; const W = fr.img.width; const dx = cur.clip.mirrored ? Math.round(sp.x - (W - fr.ax) * s) : Math.round(sp.x - fr.ax * s), dy = Math.round(sp.y - fr.ay * s); return gkAnimGloves(fr.meta.gloves || [], (px, py) => ({ x: dx + Math.round((cur.clip.mirrored ? W - px : px) * s), y: dy + Math.round(py * s) }), simHand, yOnly); };
    if (cur.clip.cands && simHand) { for (const q of cur.clip.cands) { const g = probe(q); if (g && (!best || g.d < best.g.d)) best = { q, g }; } if (best) { ik = { from: pos, to: best.q, mode: yOnly ? "height" : "2d", residualPx: +(best.g.d2 / s).toFixed(1) }; pos = best.q; } }
    const fr = v.frames[pos]; const raw = probe(pos);
    const w = cur.clip.mode === "loop" ? 0 : (cur.clip.mode === "reach" ? wReach : 1);
    place = gkAnimPlace(raw, simHand, w, s, cur.clip.mode === "post" && A.commit ? A.commit.place : null);
    if (cur.clip.mode === "hold" && A.commit && place) A.commit.place = place;                         // freeze the placement through the hold/land
    const blit = gkAnimBlit(fr.img, cur.clip.mirrored, fr.ax, fr.ay, s, sp.x + place.dx, sp.y + place.dy);
    const m = fr.meta;
    anchors = { root: anchors.root, pelvis: blit.toScreen(m.content_cx, m.pelvis_row_est), head: m.head ? blit.toScreen(m.head[0], m.head[1]) : null, shoulder: blit.toScreen(m.content_cx, m.shoulder_row_est),
      handL: m.gloves && m.gloves[0] ? blit.toScreen(m.gloves[0][0], m.gloves[0][1]) : null, handR: m.gloves && m.gloves[1] ? blit.toScreen(m.gloves[1][0], m.gloves[1][1]) : null,
      footL: m.feet && m.feet[0] ? blit.toScreen(m.feet[0][0], m.feet[0][1]) : null, footR: m.feet && m.feet[1] ? blit.toScreen(m.feet[1][0], m.feet[1][1]) : null };
    gloveScreen = gkAnimGloves(m.gloves || [], blit.toScreen, simHand, false); if (gloveScreen && simHand) handScreen = { x: gloveScreen.x, y: gloveScreen.y };
    cur.frame = pos; cur.frameIdx = fr.idx; if (cur.clip.mode === "reach" && A.commit) A.commit.reachPos = Math.max(A.commit.reachPos || 0, pos);
    artLabel = cur.clip.name + "/" + v.dir + " f" + fr.idx + " (" + (pos + 1) + "/" + v.frames.length + ")" + (cur.clip.mirrored ? " mirrored" : "") + (cur.clip.retired ? " RETIRED-ART(review)" : "") + (cur.clip.sideApprox ? " SIDE-APPROX" : "") + (cur.clip.dirSteps ? " DIR-APPROX(" + cur.clip.dirSteps * 45 + "°)" : "") + (cur.clip.approx ? " [" + cur.clip.approx + "]" : "") + (ik ? " ik " + ik.from + "→" + ik.to : "") + (place && place.w > 0 ? " place raw " + place.rawErrPx + " corr " + place.corrPx + " res " + place.finalErrPx + "px" + (place.capped ? " WRONG_CLIP" : "") : "");
    if (cur.boot && gk.legTipNow && cur.clip.name.indexOf("foot") < 0) { const lt = sproj3(gk.legTipNow[0], gk.legTipNow[2], gk.legTipNow[1]); const mk = Math.max(2, Math.round(GK_ANIM.markerPx * s)); ctx.fillStyle = "#101010"; ctx.fillRect(Math.round(lt.x) - mk, Math.round(lt.y) - mk, 2 * mk, 2 * mk); }
  } else if (cur.savePose) {
    // ── CAMERA-SPACE SAVE POSE: drawn exactly where it was authored relative to the SET root (RAW), then hand-led bounded placement (IK)
    const smp = cur.savePose.sample, an = smp.anchors || {}; const showPose = cur.u >= cur.savePose.showFrom || cur.savePose.mode !== "reach";
    if (!showPose) {
      const img = A.states.set ? A.states.set[cur.dir] : A.states.base[cur.dir], an0 = gkAnimAnchorsFor(A.states.set ? "set" : "base", cur.dir);
      const blit = gkAnimBlit(img, false, an0 ? an0.content_cx : img.width / 2, an0 ? an0.foot_row : img.height / 2 + S.pivots.foot_offset_base128, s, sp.x, sp.y);
      anchors = an0 ? { root: anchors.root, pelvis: blit.toScreen(an0.content_cx, an0.pelvis_row_est), head: an0.head ? blit.toScreen(an0.head[0], an0.head[1]) : null, shoulder: blit.toScreen(an0.content_cx, an0.shoulder_row_est) } : anchors;
      artLabel = "SET/" + cur.dir + " (load) → save pose " + cur.savePose.family + " " + cur.savePose.side + " " + cur.savePose.key;
    } else {
      const img = smp.img, ax = an.root ? an.root[0] : img.width / 2, ay = an.root ? an.root[1] : img.height - 1, mir = !!smp.mirror, mx = (px) => mir ? img.width - px : px;   // mirror = presentation transform (pose salvage)
      // BODY SCALE: a still may be drawn at a different pixel density than GK_BASE_V1 (its own art, not its canvas). `pixel_scale` is the
      // measured ratio of the keeper's body proportions to the standing sprite's, so the same person is the same size in every pose.
      // Placement errors and the correction cap stay in canonical (GK_BASE_V1) sprite px, so corrMaxPx keeps its world meaning.
      const ps = s * (an.pixel_scale || 1);
      const gl = an.gloves && an.gloves.length ? an.gloves : (an.lead_glove ? [an.lead_glove] : []);
      const dx0 = mir ? Math.round(sp.x - (img.width - ax) * ps) : Math.round(sp.x - ax * ps), dy0 = Math.round(sp.y - ay * ps);
      const raw = gkAnimGloves(gl, (px, py) => ({ x: dx0 + Math.round(mx(px) * ps), y: dy0 + Math.round(py * ps) }), simHand, false);
      const w = GK_ANIM.savePoseIK ? (cur.savePose.mode === "reach" ? wReach : 1) : 0;
      place = gkAnimPlace(raw, simHand, w, s, cur.savePose.mode === "post" && A.commit ? A.commit.place : null);
      if ((cur.savePose.mode === "hold" || (cur.savePose.mode === "reach" && cur.u >= 0.999)) && A.commit && place) A.commit.place = place;
      const blit = gkAnimBlit(img, mir, ax, ay, ps, sp.x + place.dx, sp.y + place.dy);
      anchors = { root: anchors.root, pelvis: an.pelvis ? blit.toScreen(an.pelvis[0], an.pelvis[1]) : null, head: an.head ? blit.toScreen(an.head[0], an.head[1]) : null, shoulder: an.shoulder ? blit.toScreen(an.shoulder[0], an.shoulder[1]) : null, handL: gl[0] ? blit.toScreen(gl[0][0], gl[0][1]) : null, handR: gl[1] ? blit.toScreen(gl[1][0], gl[1][1]) : null };
      gloveScreen = gkAnimGloves(gl, blit.toScreen, simHand, false); if (gloveScreen && simHand) handScreen = { x: gloveScreen.x, y: gloveScreen.y };
      artLabel = "SAVE POSE " + (cur.savePose.contextual ? "CONTEXTUAL " + cur.savePose.key + " (score " + cur.savePose.contextual.score + (cur.savePose.contextual.forced ? " FORCED-SIDE" : cur.savePose.contextual.fallback ? " FALLBACK" : "") + ") " : cur.savePose.family + " " + cur.savePose.side + " " + cur.savePose.key) + (mir ? " MIRRORED" : "") + (cur.savePose.exact ? "" : " (nearest sample)") + (cur.savePose.candidate ? " CANDIDATE" : " approved") + (place ? (GK_ANIM.savePoseIK ? " place raw " + place.rawErrPx + " corr " + place.corrPx + " res " + place.finalErrPx + "px" + (place.capped ? " WRONG_CLIP" : "") : " RAW (no IK) glove err " + place.rawErrPx + "px") : "");
    }
  } else if (cur.pose) {
    // ── CONTACT POSE (8-rotation still) laid along the save vector; before loadPhase the SET rotation of the frozen facing
    const ps = cur.pose.ps; const showPose = cur.u >= cur.pose.showFrom || cur.pose.mode !== "reach";
    if (!showPose) {
      const img = A.states.set ? A.states.set[cur.dir] : A.states.base[cur.dir], an = gkAnimAnchorsFor(A.states.set ? "set" : "base", cur.dir);
      const blit = gkAnimBlit(img, false, an ? an.content_cx : img.width / 2, an ? an.foot_row : img.height / 2 + S.pivots.foot_offset_base128, s, sp.x, sp.y);
      anchors = an ? { root: anchors.root, pelvis: blit.toScreen(an.content_cx, an.pelvis_row_est), head: an.head ? blit.toScreen(an.head[0], an.head[1]) : null, shoulder: blit.toScreen(an.content_cx, an.shoulder_row_est) } : anchors;
      artLabel = "SET/" + cur.dir + " (load) → pose " + cur.pose.family + " " + (cur.pose.candidate ? "CANDIDATE" : "approved");
    } else {
      const img = ps.imgs[cur.pose.dir], an = ps.anchors && ps.anchors[cur.pose.dir] ? ps.anchors[cur.pose.dir] : null;
      const ax = an ? an.content_cx : img.width / 2, ay = an ? an.foot_row : img.height - 1;
      const gl = an && an.gloves && an.gloves.length ? an.gloves : (an && an.hands ? [an.hands.screenLeft, an.hands.screenRight].filter(Boolean) : []);
      const W = img.width; const dx0 = cur.pose.mirrored ? Math.round(sp.x - (W - ax) * s) : Math.round(sp.x - ax * s), dy0 = Math.round(sp.y - ay * s);
      const raw = gkAnimGloves(gl, (px, py) => ({ x: dx0 + Math.round((cur.pose.mirrored ? W - px : px) * s), y: dy0 + Math.round(py * s) }), simHand, false);
      const w = cur.pose.mode === "reach" ? wReach : 1;
      place = gkAnimPlace(raw, simHand, w, s, cur.pose.mode === "post" && A.commit ? A.commit.place : null);
      if ((cur.pose.mode === "hold" || (cur.pose.mode === "reach" && cur.u >= 0.999)) && A.commit && place) A.commit.place = place;
      const blit = gkAnimBlit(img, cur.pose.mirrored, ax, ay, s, sp.x + place.dx, sp.y + place.dy);
      anchors = { root: anchors.root, pelvis: blit.toScreen(ax, an ? an.pelvis_row_est : ay - 30), head: an && an.head ? blit.toScreen(an.head[0], an.head[1]) : null, shoulder: blit.toScreen(ax, an ? an.shoulder_row_est : ay - 50), handL: gl[0] ? blit.toScreen(gl[0][0], gl[0][1]) : null, handR: gl[1] ? blit.toScreen(gl[1][0], gl[1][1]) : null };
      gloveScreen = gkAnimGloves(gl, blit.toScreen, simHand, false); if (gloveScreen && simHand) handScreen = { x: gloveScreen.x, y: gloveScreen.y };
      artLabel = "POSE " + cur.pose.family + "/" + cur.pose.dir + (cur.pose.mirrored ? " mirrored" : "") + " body " + cur.pose.bodyDeg.toFixed(0) + "° vs save " + (cur.pose.wantDeg != null ? cur.pose.wantDeg + "°" : "—") + (cur.pose.mismatchDeg != null ? " (Δ " + cur.pose.mismatchDeg + "°" + (cur.pose.mismatchDeg > GK_ANIM.axisMismatchMaxDeg ? " AXIS_MISMATCH" : "") + ")" : "") + " " + (cur.pose.candidate ? "CANDIDATE" : "approved") + (place ? " place raw " + place.rawErrPx + " corr " + place.corrPx + " res " + place.finalErrPx + "px" + (place.capped ? " WRONG_CLIP" : "") : "");
    }
  } else if (cur.diagnostic) {
    anchors = gkAnimDrawDiagnostic(t, gk, cur, sp, s) || anchors;
    if (simHand) handScreen = { x: Math.round(simHand.x), y: Math.round(simHand.y) };
    artLabel = "DIAGNOSTIC (ART_MISSING " + cur.diagnostic.family + "/" + cur.diagnostic.side + ")";
  } else {
    // ── STANDING representation: SET/base rotation at the root (no whole-sprite offsets) + procedural glove marker at the simulation hand
    const stateName = (A.states.set && cur.state !== "IDLE") ? "set" : "base";
    const img = A.states[stateName][cur.dir], an = gkAnimAnchorsFor(stateName, cur.dir) || gkAnimAnchorsFor("base", cur.dir);
    const cx = an ? an.content_cx : img.width / 2, footRow = an ? an.foot_row : (img.height / 2 + S.pivots.foot_offset_base128);
    const dyPx = cur.state === "IDLE" ? Math.round(GK_ANIM.idleBobPx * (0.5 - 0.5 * Math.cos(2 * Math.PI * t.now / GK_ANIM.idleBobPeriod))) : 0;
    const blit = gkAnimBlit(img, false, cx, footRow - dyPx, s, sp.x, sp.y);
    anchors = an ? { root: anchors.root, pelvis: blit.toScreen(an.content_cx, an.pelvis_row_est), head: an.head ? blit.toScreen(an.head[0], an.head[1]) : null,
      handL: an.hands && an.hands.screenLeft ? blit.toScreen(an.hands.screenLeft[0], an.hands.screenLeft[1]) : null, handR: an.hands && an.hands.screenRight ? blit.toScreen(an.hands.screenRight[0], an.hands.screenRight[1]) : null,
      footL: an.feet && an.feet.screenLeft ? blit.toScreen(an.feet.screenLeft[0], an.feet.screenLeft[1]) : null, footR: an.feet && an.feet.screenRight ? blit.toScreen(an.feet.screenRight[0], an.feet.screenRight[1]) : null,
      shoulder: blit.toScreen(an.content_cx, an.shoulder_row_est) } : anchors;
    if (simHand) {
      const disp = Math.hypot(gk.handNow[0] - gk.x, gk.handNow[1] - gk.y, gk.handNow[2] - gk.handZ);
      if (disp > GK_ANIM.armMinM || cur.holdPose) {
        handScreen = { x: Math.round(simHand.x), y: Math.round(simHand.y) };
        const sh = anchors.shoulder || anchors.root;
        ctx.strokeStyle = "#38e01c"; ctx.lineWidth = Math.max(1, Math.round(2 * s));
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(handScreen.x, handScreen.y); ctx.stroke();
        const mk = Math.max(2, Math.round(GK_ANIM.markerPx * s));
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(handScreen.x - mk, handScreen.y - mk, 2 * mk, 2 * mk);
        ctx.fillStyle = "#f4f4f4"; ctx.fillRect(handScreen.x - mk + 1, handScreen.y - mk + 1, 2 * mk - 2, 2 * mk - 2);
      }
    }
    if (cur.boot && gk.legTipNow) { const lt = sproj3(gk.legTipNow[0], gk.legTipNow[2], gk.legTipNow[1]); const mk = Math.max(2, Math.round(GK_ANIM.markerPx * s)); ctx.fillStyle = "#101010"; ctx.fillRect(Math.round(lt.x) - mk, Math.round(lt.y) - mk, 2 * mk, 2 * mk); }
    artLabel = (S.gkAnim.states.set ? "GK_BASE_V1 SET/" : "GK_BASE_V1 base/") + cur.dir + (cur.temp ? "  [TEMP: " + cur.temp + "]" : "");
  }
  cur.artLabel = artLabel; cur.ik = ik; cur.place = place;
  // CONTACT SYNCHRONISATION metric at the contact tick: DRAWN save surface vs the SIMULATION contact surface (hand centre / leg tip)
  if (gk.contact && (!A.lastContact || A.lastContact.tickT !== gk.contact.tickT)) {
    const cp = gk.contact.point; const cs = sproj3(cp[0], cp[2], cp[1]);
    const vol = gk.contact.volume, isHand = vol === "HAND" || vol === "TORSO";
    const simSurf = isHand ? gk.handNow : gk.legTipNow;
    const radius = isHand ? ((GK_HAND[t.gkHand] != null ? GK_HAND[t.gkHand] : GK_DIVE.handR) + GOALFX.ballR) : (GK_BODY.legR + GOALFX.ballR);
    let vis = null, source = "none";
    if (simSurf) {
      const sn = sproj3(simSurf[0], simSurf[2], simSurf[1]);
      let drawn;
      if (isHand) { drawn = (cur.clip || cur.pose || cur.savePose) ? (gloveScreen || null) : { x: sn.x, y: sn.y }; source = cur.clip ? "authored glove (" + cur.clip.name + " f" + cur.frameIdx + ") vs sim hand" : cur.savePose ? "save pose glove (" + cur.savePose.family + " " + cur.savePose.side + " " + cur.savePose.key + ") vs sim hand" : cur.pose ? "pose glove (" + cur.pose.family + "/" + cur.pose.dir + ") vs sim hand" : cur.diagnostic ? "diagnostic figure (glove = sim hand)" : "procedural glove vs sim hand"; }
      else { drawn = { x: sn.x, y: sn.y }; source = cur.clip && cur.clip.name.indexOf("foot") >= 0 ? "authored foot-save frame; boot metric = sim leg tip" : "boot marker = sim leg tip"; }
      if (drawn) vis = { dx: drawn.x - sn.x, dy: drawn.y - sn.y };
    }
    const errPx = vis ? Math.hypot(vis.dx, vis.dy) : null;
    const pxPerM = Math.abs(sproj3(cp[0], cp[2] + 1, cp[1]).y - cs.y) || 1;
    const touchGap = simSurf ? +(Math.hypot(simSurf[0] - cp[0], simSurf[1] - cp[1], simSurf[2] - cp[2]) - radius).toFixed(3) : null;
    const flagged = errPx != null && errPx / s > GK_ANIM.ikMaxPx;
    A.lastContact = { tickT: gk.contact.tickT, outcome: gk.contact.outcome, volume: vol, state: cur.state, family: cur.family, side: cur.side, dir: cur.dir, art: artLabel, cls: cur.cls, errPx: errPx != null ? +errPx.toFixed(1) : null, errM: errPx != null ? +(errPx / pxPerM).toFixed(3) : null, spritePx: errPx != null ? +(errPx / s).toFixed(1) : null, touchGapM: touchGap, source, ik, place, flagged, artMissing: !!cur.diagnostic, wrongClip: !!(place && place.capped) };
    const why = [];
    if (flagged) why.push("visual error beyond limit"); if (cur.diagnostic) why.push("ART_MISSING"); if (place && place.capped) why.push("WRONG_CLIP (correction capped)"); if (cur.clip && (cur.clip.sideApprox || cur.clip.dirSteps)) why.push("approximate direction/side art"); if (cur.pose && cur.pose.candidate) why.push("CANDIDATE pose");
    if (cur.pose && cur.pose.mismatchDeg != null && cur.pose.mismatchDeg > GK_ANIM.axisMismatchMaxDeg) { why.push("AXIS_MISMATCH " + cur.pose.mismatchDeg + "°"); A.lastContact.axisMismatchDeg = cur.pose.mismatchDeg; }
    if (cur.savePose && cur.savePose.candidate) why.push("CANDIDATE save pose"); if (cur.savePose && !cur.savePose.exact) why.push("nearest height sample");
    if (why.length) { A.flags.push({ t: gk.contact.tickT, why: why.join("; "), rec: A.lastContact }); if (A.flags.length > 50) A.flags.shift(); }
  }
  A.perf.n++; const ms = performance.now() - t0; A.perf.ms += ms; if (ms > A.perf.max) A.perf.max = ms;
  if (S.dbg.anim) gkAnimOverlay(t, gk, cur, anchors, handScreen, s);
  return true;
}
// REVIEW PAGE: draw a chosen representation at the keeper root (no physics): clip frame / contact pose / state / diagnostic
function gkAnimDrawReview(t, gk, sp, s, o) {
  const A = S.gkAnim; let label = o.label || "", res = null;
  if (o.kind === "clip" && A.clips[o.clip]) { res = gkAnimDebugPose(o.clip, o.dir || headingToDir(gk.facing * 180 / Math.PI), o.side || null, o.pos || 0, sp.x, sp.y, s); if (res) label += "  " + o.clip + "/" + res.variant + " f" + res.frameIdx + (res.mirrored ? " mirrored" : "") + (res.retired ? " RETIRED-ART" : "") + (res.sideApprox ? " SIDE-APPROX" : "") + (res.dirSteps ? " DIR-APPROX" : ""); }
  else if (o.kind === "pose" && A.poses[o.family]) {
    const ang = (o.saveAngleDeg != null ? o.saveAngleDeg : (gk.facing * 180 / Math.PI + (o.side === "LEFT" ? -90 : 90))) * Math.PI / 180, lat = o.lat != null ? o.lat : 1.5, z = o.z != null ? o.z : 1.0;
    const sv = gkAnimScreenVec(gk, Math.cos(ang) * lat, Math.sin(ang) * lat, z);
    res = gkAnimDebugPoseState(o.family, ang * 180 / Math.PI, o.side || "RIGHT", sp.x, sp.y, s, null, sv);
    const tip = sproj3(gk.x + Math.cos(ang) * lat, z, gk.y + Math.sin(ang) * lat); ctx.strokeStyle = "#ff4fd8"; ctx.lineWidth = Math.max(1, PXQ * 2); ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(tip.x, tip.y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#ff4fd8"; ctx.beginPath(); ctx.arc(tip.x, tip.y, uipx(3), 0, Math.PI * 2); ctx.fill();
    if (res) label += "  POSE " + o.family + "/" + res.dir + (res.mirrored ? " mirrored" : "") + " body " + res.bodyDeg.toFixed(0) + "° vs save " + res.wantDeg + "° (Δ " + res.mismatchDeg + "°" + (res.mismatchDeg > GK_ANIM.axisMismatchMaxDeg ? " AXIS_MISMATCH" : "") + ")" + (res.candidate ? " CANDIDATE" : ""); }
  else if (o.kind === "savepose" && A.savePoses[o.family] && A.savePoses[o.family][o.side]) {
    const sides = A.savePoses[o.family][o.side]; const smp = sides[o.key] || sides.MID || Object.values(sides)[0]; const an = smp.anchors || {};
    const ax = an.root ? an.root[0] : smp.img.width / 2, ay = an.root ? an.root[1] : smp.img.height - 1; const gl = an.gloves && an.gloves.length ? an.gloves : (an.lead_glove ? [an.lead_glove] : []);
    const mir = o.mirror != null ? !!o.mirror : !!smp.mirror, mx = (px) => mir ? smp.img.width - px : px;
    const ps = s * (an.pixel_scale || 1);                                          // same body scale the live path uses
    let dx = o.dx || 0, dy = o.dy || 0, info = mir ? " RAW MIRRORED" : " RAW";     // review only: o.dx/o.dy = a fixed screen offset (e.g. a frozen hand-led placement carried into post-contact frames)
    if (o.ik && o.simHand) { const dx0 = mir ? Math.round(sp.x - (smp.img.width - ax) * ps) : Math.round(sp.x - ax * ps), dy0 = Math.round(sp.y - ay * ps); const raw = gkAnimGloves(gl, (px, py) => ({ x: dx0 + Math.round(mx(px) * ps), y: dy0 + Math.round(py * ps) }), o.simHand, false); const pl = gkAnimPlace(raw, o.simHand, o.ikW != null ? o.ikW : 1, s, null); dx = pl.dx; dy = pl.dy; info = " IK raw " + pl.rawErrPx + " corr " + pl.corrPx + " res " + pl.finalErrPx + "px" + (pl.capped ? " CAPPED" : ""); }
    const blit = gkAnimBlit(smp.img, mir, ax, ay, ps, sp.x + dx, sp.y + dy); res = { gloves: gl.map(q => blit.toScreen(q[0], q[1])) };
    label += "  SAVE POSE " + o.family + " " + o.side + " " + (o.key || "") + (smp.candidate ? " CANDIDATE" : "") + info;
    if (o.target) { const tp = sproj3(o.target[0], o.target[2], o.target[1]); ctx.strokeStyle = "#ff4fd8"; ctx.lineWidth = Math.max(1, PXQ * 2); ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(tp.x, tp.y); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = "#ffffff"; ctx.beginPath(); ctx.arc(tp.x, tp.y, uipx(4), 0, Math.PI * 2); ctx.stroke(); }
  }
  else if (o.kind === "state") {
    // presentation of a standing state. o.living reproduces the live IDLE readiness motion (same constants: idleBobPx on idleBobPeriod,
    // integer sprite-px offsets) on a continuous clock (o.clock seconds, else wall-clock) so a facing change never resets the phase.
    const st = A.states[o.state || "set"] ? (o.state || "set") : "base"; const d = o.dir || headingToDir(gk.facing * 180 / Math.PI);
    const img = A.states[st][d]; const an = gkAnimAnchorsFor(st, d);
    const clock = o.clock != null ? o.clock : performance.now() / 1000; const phase = o.living ? (0.5 - 0.5 * Math.cos(2 * Math.PI * clock / GK_ANIM.idleBobPeriod)) : 0;
    const dyPx = o.living ? Math.round(GK_ANIM.idleBobPx * phase) : 0;
    gkAnimBlit(img, false, an ? an.content_cx : img.width / 2, (an ? an.foot_row : img.height / 2 + S.pivots.foot_offset_base128) - dyPx, s, sp.x, sp.y);
    label += "  " + st.toUpperCase() + "/" + d + (o.living ? " living phase " + phase.toFixed(2) + " dy " + dyPx : " (hold)"); }
  else {
    const fam = o.family || "MEDIUM_DIVE", side = o.side || "RIGHT", ang = (o.saveAngleDeg != null ? o.saveAngleDeg : gk.facing * 180 / Math.PI + (side === "LEFT" ? -90 : 90)) * Math.PI / 180;
    const lat = o.lat != null ? o.lat : 1.5, z = o.z != null ? o.z : 1.0;
    const hand = [gk.x + Math.cos(ang) * lat, gk.y + Math.sin(ang) * lat, z];
    const cur = { u: o.u != null ? o.u : 1, family: fam, side, cls: null };
    const saved = gk.handNow; gk.handNow = hand; gkAnimDrawDiagnostic(t, gk, cur, sp, s); gk.handNow = saved;     // read-only: restored immediately
    label += "  DIAGNOSTIC " + fam + "/" + side + " (ART_MISSING)";
  }
  if (S.dbg.anim || o.showLabel !== false) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.font = uipx(10) + "px monospace"; const w = ctx.measureText(label).width + uipx(8); ctx.fillRect(uipx(6), uipx(64), w, uipx(16)); ctx.fillStyle = "#d8ffe8"; ctx.textAlign = "left"; ctx.fillText(label, uipx(10), uipx(76)); }
  if (res && res.gloves && S.dbg.anim) for (const g of res.gloves) { ctx.strokeStyle = "#38ff9a"; ctx.lineWidth = Math.max(1, PXQ); ctx.beginPath(); ctx.arc(g.x, g.y, uipx(4), 0, Math.PI * 2); ctx.stroke(); }
  if (S.dbg.anim) { ctx.strokeStyle = "#ff4040"; ctx.lineWidth = Math.max(1, PXQ); ctx.beginPath(); ctx.arc(sp.x, sp.y, uipx(3), 0, Math.PI * 2); ctx.stroke(); }
}
function gkAnimDebugPose(clipName, dir, side, pos, sx, sy, s, g) {
  const A = S.gkAnim, c = A.clips[clipName]; if (!c) return null;
  const keep = GK_ANIM.reviewRetiredArt; GK_ANIM.reviewRetiredArt = true; const r = gkAnimResolve(c, dir, side); GK_ANIM.reviewRetiredArt = keep; if (!r) return null;
  const v = r.v, fr = v.frames[Math.max(0, Math.min(v.frames.length - 1, pos))];
  const blit = gkAnimBlit(fr.img, r.mirrored, fr.ax, fr.ay, s, sx, sy, g);
  return { variant: v.dir + (v.side ? "/" + v.side : ""), mirrored: r.mirrored, sideApprox: r.sideApprox, dirSteps: r.dirSteps, retired: r.retired, frameIdx: fr.idx, n: v.frames.length, blit: { dx: blit.dx, dy: blit.dy, dw: blit.dw, dh: blit.dh }, gloves: (fr.meta.gloves || []).map(gl => blit.toScreen(gl[0], gl[1])) };
}
// review tooling: draw a contact POSE laid along a save angle (deg, y-down) with a lead side, at a screen point
function gkAnimDebugPoseState(family, saveAngleDeg, side, sx, sy, s, g, screenVec) {
  const A = S.gkAnim, ps = A.poses[family]; if (!ps) return null;
  const rp = gkAnimResolvePose(ps, saveAngleDeg, side, screenVec || null); const img = ps.imgs[rp.dir], an = ps.anchors && ps.anchors[rp.dir] ? ps.anchors[rp.dir] : null;
  const ax = an ? an.content_cx : img.width / 2, ay = an ? an.foot_row : img.height - 1;
  const blit = gkAnimBlit(img, rp.mirrored, ax, ay, s, sx, sy, g);
  const gl = an && an.gloves && an.gloves.length ? an.gloves : (an && an.hands ? [an.hands.screenLeft, an.hands.screenRight].filter(Boolean) : []);
  return { dir: rp.dir, mirrored: rp.mirrored, bodyDeg: rp.bodyDeg, mismatchDeg: rp.mismatchDeg, wantDeg: rp.wantDeg, candidate: !ps.approved, blit: { dx: blit.dx, dy: blit.dy, dw: blit.dw, dh: blit.dh }, gloves: gl.map(q => blit.toScreen(q[0], q[1])), head: an && an.head ? blit.toScreen(an.head[0], an.head[1]) : null };
}
function gkAnimOverlay(t, gk, cur, anchors, handScreen, s) {
  const A = S.gkAnim;
  const dot = (p, col, r) => { if (!p) return; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, PXQ); ctx.beginPath(); ctx.arc(p.x, p.y, r || uipx(3), 0, Math.PI * 2); ctx.stroke(); };
  dot(anchors.root, "#ff4040"); dot(anchors.pelvis, "#c080ff"); dot(anchors.head, "#ffd24a"); dot(anchors.handL, "#7fd0ff"); dot(anchors.handR, "#7fd0ff"); dot(anchors.footL, "#ff9a3c"); dot(anchors.footR, "#ff9a3c");
  if (gk.contact) { const cp = gk.contact.point, cs = sproj3(cp[0], cp[2], cp[1]); dot({ x: cs.x, y: cs.y }, "#ff3b3b", uipx(6)); }
  if (gk.handNow && (cur.arm || cur.holdPose)) { const hn = sproj3(gk.handNow[0], gk.handNow[2], gk.handNow[1]); dot({ x: hn.x, y: hn.y }, "#ffffff", uipx(2)); }
  if (handScreen) dot(handScreen, "#38ff9a", uipx(5));
  if (gk.committed) { const tg = gk.committed.target, ts = sproj3(tg[0], tg[2], tg[1]); dot({ x: ts.x, y: ts.y }, "#38e0ff", uipx(4));
    // save vector on the ground (feet at commit → target) + the world axes at the keeper: lateral (goal line) / depth / vertical
    const c = gk.committed, a = sproj3(c.feet[0], 0, c.feet[1]), bpt = sproj3(c.target[0], 0, c.target[1]);
    ctx.strokeStyle = "#ff4fd8"; ctx.lineWidth = Math.max(1, PXQ * 2); ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bpt.x, bpt.y); ctx.stroke(); ctx.setLineDash([]);
    const ax = (vx, vy, vz, col) => { const p = sproj3(c.feet[0] + vx, vz, c.feet[1] + vy); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, PXQ); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    ax(0, 1, 0, "#ffd24a"); ax(1, 0, 0, "#7fd0ff"); ax(0, 0, 1, "#ffffff");                       // yellow = +y (goal line), blue = +x (depth), white = up
  }
  const lc = A.lastContact, cls = cur.cls, pl = cur.place;
  const ctxPick = cur.savePose && cur.savePose.contextual ? cur.savePose.contextual : null;
  const lines = [
    "ANIM " + cur.state + (cur.family ? "  fam " + cur.family + "/" + cur.side : "") + "  phase " + cur.phase + "  u " + cur.u + "  odo " + A.odo.toFixed(2) + " m",
    "GK ANIM: " + (ctxPick ? ctxPick.id + "   source " + (ctxPick.inventory_id || "—") + "   transform " + (ctxPick.transform || "ORIGINAL") + "   score " + ctxPick.score + "   (" + ctxPick.why + ")" : (A.commit && A.commit.ctx ? "no contextual pose (best " + (A.commit.ctx.scored.length ? A.commit.ctx.scored.reduce((a, b) => b.score > a.score ? b : a).id + " " + A.commit.ctx.scored.reduce((a, b) => b.score > a.score ? b : a).score : "—") + ", baseline " + A.commit.ctx.baseline + ")" : "no contextual pose")),
    "dir " + cur.dir + "  facing " + (gk.facing * 180 / Math.PI).toFixed(0) + "°  art " + cur.artLabel,
    cls ? "SAVE VECTOR lat " + (cls.lat >= 0 ? "+" : "") + cls.lat + " depth " + (cls.depth >= 0 ? "+" : "") + cls.depth + " dz " + (cls.dz >= 0 ? "+" : "") + cls.dz + " m  z " + cls.z + " (" + cls.zClass + " " + cls.zH + "H)  L " + cls.L + " / maxLat " + cls.maxLat + "  norm " + cls.norm + "  exec " + cls.exec + " s  v0 " + cls.v0 + "  feet " + (cls.feetPlanted ? "PLANTED" : "DIVE") + (cls.airborne ? " AIRBORNE" : "") + "  sim " + cls.action + "/" + cls.tier + (cls.bestEffort ? " best-effort" : "") + "  → " + cls.family + " " + cls.goalSide + (cls.expr ? " [" + cls.expr.heightClass + " intensity " + cls.expr.intensity + " ext " + cls.expr.extension + " launch " + cls.expr.launch + (cls.expr.nearMax ? " NEAR-MAX" : "") + "]" : "") + "  (lead arm " + cls.side + ", facing " + cur.dir + ")" : "SAVE VECTOR —",
    "anchors: root(" + anchors.root.x + "," + anchors.root.y + ")" + (anchors.pelvis ? " pelvis(" + anchors.pelvis.x + "," + anchors.pelvis.y + ")" : "") + (anchors.head ? " head(" + anchors.head.x + "," + anchors.head.y + ")" : "") + (anchors.handL ? " hands(" + anchors.handL.x + "," + anchors.handL.y + (anchors.handR ? "|" + anchors.handR.x + "," + anchors.handR.y : "") + ")" : "") + (anchors.footL ? " feet(" + anchors.footL.x + "," + anchors.footL.y + (anchors.footR ? "|" + anchors.footR.x + "," + anchors.footR.y : "") + ")" : "") + (pl && pl.w > 0 ? "   placement raw " + pl.rawErrPx + " px → corr " + pl.corrPx + " px → residual " + pl.finalErrPx + " px" + (pl.capped ? " CAPPED/WRONG_CLIP" : "") : ""),
    "sim contact " + (gk.contact ? gk.contact.volume + " " + gk.contact.outcome + " @" + gk.contact.tickT : "—") + "   drawn glove " + (handScreen ? "(" + handScreen.x + "," + handScreen.y + ")" : "—") + "   visual error " + (lc ? lc.errPx + " px / " + lc.errM + " m" + (lc.flagged ? " FLAG" : "") + " (" + lc.source + "), touch gap " + lc.touchGapM + " m" : "—"),
    "perf keeper draw avg " + (A.perf.n ? (A.perf.ms / A.perf.n).toFixed(3) : "—") + " ms  max " + A.perf.max.toFixed(2) + " ms   slow-mo " + (S.pt.slow || 1) + "x   flags " + A.flags.length + "   log " + A.log.slice(-5).map(l => l.state + "@" + l.t).join(" → "),
    "legend: red root · violet pelvis · yellow head · blue gloves(frame) · orange feet · white sim hand · green drawn glove · cyan commit target · magenta save vector · axes yellow +y goal line / blue +x depth / white up",
  ];
  ctx.font = uipx(9) + "px monospace"; ctx.textAlign = "left";
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + uipx(8);
  const bx = uipx(6), by = uipx(64);
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx, by, w, lines.length * uipx(11) + uipx(4));
  ctx.fillStyle = "#d8ffe8";
  lines.forEach((l, i) => ctx.fillText(l, bx + uipx(4), by + uipx(10) + i * uipx(11)));
}
function ptDrawKeeper(dt) {
  const t = S.pt, gk = t && t.gk; if (!gk) return;
  // GOALKEEPER ANIMATION V1: sprite view of the same keeper state (read-only). The Stage-0 diagnostic stick figure below is
  // kept for review (dbg "gkstick") and as the fallback when the GK assets are not loaded.
  // PRESENTATION BACKEND (prototype/3d-animation-pipeline): SPRITE (default, unchanged path) or SKELETAL_3D; see anim3d/gk_backend.js
  const spriteDrawn = GK_ANIM.enabled && (typeof gkPresentationDraw === "function" ? gkPresentationDraw(t, gk, dt) : gkAnimDraw(t, gk, dt));
  if (spriteDrawn && !S.dbg.gkstick) return;
  // STAGE-0 PLACEHOLDER (deliberately simple diagnostic — NOT final art):
  // feet/root, body spine, head, hands/reach origin + rest spread, facing, state.
  const foot = sproj3(gk.x, 0, gk.y), head = sproj3(gk.x, gk.height, gk.y),
        hz = sproj3(gk.x, gk.handZ, gk.y);
  if (foot.d < 0.5) return;
  const hs = GK_CFG.restHandSpread;
  const handL = sproj3(gk.x, gk.handZ, gk.y - hs), handR = sproj3(gk.x, gk.handZ, gk.y + hs);
  ctx.beginPath();                                          // shadow
  ctx.ellipse(Math.round(foot.x), Math.round(foot.y), Math.max(3, uipx(7)), Math.max(2, uipx(3)), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fill();
  ctx.strokeStyle = "rgba(90,220,180,0.95)"; ctx.lineWidth = Math.max(3, uipx(6));   // spine
  ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(head.x, head.y); ctx.stroke();
  ctx.fillStyle = "rgba(120,240,200,0.95)";                 // head
  ctx.beginPath(); ctx.arc(head.x, head.y, Math.max(3, uipx(5)), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,210,90,0.95)"; ctx.lineWidth = Math.max(2, uipx(3));   // arms/hands
  ctx.beginPath(); ctx.moveTo(handL.x, handL.y); ctx.lineTo(hz.x, hz.y); ctx.lineTo(handR.x, handR.y); ctx.stroke();
  for (const h of [handL, handR, hz]) { ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(2, uipx(3)), 0, Math.PI * 2); ctx.fillStyle = "rgba(255,210,90,0.95)"; ctx.fill(); }
  if (gk.shotActive && gk.handNow) {   // STAGE 3: the extending reach/dive hand (from body to actual hand)
    const hn = sproj3(gk.handNow[0], gk.handNow[2], gk.handNow[1]);
    ctx.strokeStyle = gk.committed ? "rgba(120,255,120,0.95)" : "rgba(255,210,90,0.95)"; ctx.lineWidth = Math.max(2, uipx(4));
    ctx.beginPath(); ctx.moveTo(hz.x, hz.y); ctx.lineTo(hn.x, hn.y); ctx.stroke();
    ctx.fillStyle = "rgba(150,255,150,0.98)"; ctx.beginPath(); ctx.arc(hn.x, hn.y, Math.max(3, uipx(4)), 0, Math.PI * 2); ctx.fill();
  }
  if (gk.contact) {                    // STAGE 3: contact point + contact normal markers
    const cp = sproj3(gk.contact.point[0], gk.contact.point[2], gk.contact.point[1]);
    const nn = gk.contact.normal, ne = sproj3(gk.contact.point[0] + nn[0] * 0.8, gk.contact.point[2] + nn[2] * 0.8, gk.contact.point[1] + nn[1] * 0.8);
    ctx.strokeStyle = "#ff3b3b"; ctx.lineWidth = Math.max(2, uipx(3));
    ctx.beginPath(); ctx.arc(cp.x, cp.y, uipx(6), 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(ne.x, ne.y); ctx.stroke();
    ctx.fillStyle = "#ffbdbd"; ctx.font = uipx(9) + "px monospace"; ctx.fillText(gk.contact.surface, cp.x + 8, cp.y - 6);
  }
  const fx = sproj3(gk.x + Math.cos(gk.facing) * 0.9, 0, gk.y + Math.sin(gk.facing) * 0.9);   // facing tick
  ctx.strokeStyle = "rgba(90,220,180,0.8)"; ctx.lineWidth = Math.max(1, PXQ);
  ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(fx.x, fx.y); ctx.stroke();
  const sv = Math.hypot(gk.vx, gk.vy);                       // keeper velocity vector (physical movement direction)
  if (sv > 0.05) { const vv = sproj3(gk.x + gk.vx * 0.25, 0, gk.y + gk.vy * 0.25);
    ctx.strokeStyle = "#ff8c1a"; ctx.lineWidth = Math.max(2, uipx(3));
    ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(vv.x, vv.y); ctx.stroke();
    ctx.fillStyle = "#ff8c1a"; ctx.beginPath(); ctx.arc(vv.x, vv.y, Math.max(2, uipx(3)), 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#8affd8"; ctx.font = uipx(10) + "px monospace"; ctx.textAlign = "center";
  ctx.fillText("GK:" + gk.state, head.x, head.y - uipx(8)); ctx.textAlign = "left";
  if (S.dbg.gk) {                                           // read-only overlay (OFF by default)
    const b = t.b, M = GK_MOUTH, P = (x, y, z) => sproj3(x, z || 0, y);
    const bs = P(b.x, b.y), pa = P(M.lineX, M.postA), pb = P(M.lineX, M.postB), cc = P(M.lineX, M.centerY);
    ctx.strokeStyle = "rgba(255,210,90,0.7)"; ctx.lineWidth = Math.max(1, PXQ);    // ball -> posts (covered angle)
    ctx.beginPath(); ctx.moveTo(bs.x, bs.y); ctx.lineTo(pa.x, pa.y); ctx.moveTo(bs.x, bs.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    ctx.strokeStyle = "rgba(120,200,255,0.5)";                                     // ball -> goal centre
    ctx.beginPath(); ctx.moveTo(bs.x, bs.y); ctx.lineTo(cc.x, cc.y); ctx.stroke();
    if (!gk.shotActive && gk.desired) {                                           // Stage-1 desired vs actual (pre-shot)
      const de = P(gk.desired[0], gk.desired[1]), ac = P(gk.x, gk.y);
      ctx.strokeStyle = "rgba(255,80,220,0.9)"; ctx.lineWidth = Math.max(1, PXQ);
      ctx.beginPath(); ctx.moveTo(ac.x, ac.y); ctx.lineTo(de.x, de.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(de.x - 6, de.y); ctx.lineTo(de.x + 6, de.y); ctx.moveTo(de.x, de.y - 6); ctx.lineTo(de.x, de.y + 6); ctx.stroke();
    }
    if (gk.shotActive) {
      if (gk.trail && gk.trail.length > 1) {                                       // real path observed so far
        ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = Math.max(1, PXQ);
        ctx.beginPath(); gk.trail.forEach((p, i) => { const s = P(p[0], p[1], p[2]); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.stroke();
      }
      if (gk.predict && gk.predict.samples.length > 1) {                           // current predicted continuation
        ctx.strokeStyle = "rgba(80,220,255,0.9)"; ctx.lineWidth = Math.max(1, PXQ); ctx.setLineDash([4, 3]);
        ctx.beginPath(); gk.predict.samples.forEach((p, i) => { const s = P(p.x, p.y, p.z); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.stroke(); ctx.setLineDash([]);
      }
      if (gk.predict && gk.predict.crossing) {                                     // current predicted interception (at mouth plane)
        const cr = P(M.lineX, gk.predict.crossing.y, gk.predict.crossing.z);
        ctx.strokeStyle = "#4ff"; ctx.lineWidth = Math.max(2, PXQ * 2);
        ctx.beginPath(); ctx.arc(cr.x, cr.y, uipx(5), 0, Math.PI * 2); ctx.stroke();
      }
      for (const h of gk.predHist || []) {                                         // PREVIOUS prediction snapshots (evolution)
        const s = P(M.lineX, h.y, h.z); ctx.fillStyle = "rgba(120,160,255,0.55)";
        ctx.beginPath(); ctx.arc(s.x, s.y, uipx(3), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(200,220,255,0.8)"; ctx.font = uipx(9) + "px monospace"; ctx.fillText("+" + h.ms, s.x + 6, s.y - 4);
      }
      // ── THREE-TARGET MARKERS ──  A SET (green sq) · B predInt raw (cyan diamond) · move target (orange X) · C commit (magenta star)
      if (gk.setPos) { const s = P(gk.setPos[0], gk.setPos[1]); ctx.strokeStyle = "#39d98a"; ctx.lineWidth = Math.max(1, uipx(2));
        ctx.strokeRect(s.x - uipx(4), s.y - uipx(4), uipx(8), uipx(8)); ctx.fillStyle = "#39d98a"; ctx.font = uipx(9) + "px monospace"; ctx.fillText("SET", s.x + uipx(5), s.y - uipx(5)); }
      if (gk.predInt) { const s = P(gk.predInt[0], gk.predInt[1], gk.predInt[2]); ctx.strokeStyle = "#4ff"; ctx.lineWidth = Math.max(1, uipx(2));
        ctx.beginPath(); ctx.moveTo(s.x, s.y - uipx(5)); ctx.lineTo(s.x + uipx(5), s.y); ctx.lineTo(s.x, s.y + uipx(5)); ctx.lineTo(s.x - uipx(5), s.y); ctx.closePath(); ctx.stroke(); }
      if (gk.moveTarget) { const s = P(gk.moveTarget[0], gk.moveTarget[1]); ctx.strokeStyle = "#ffb020"; ctx.lineWidth = Math.max(1, uipx(2));
        ctx.beginPath(); ctx.moveTo(s.x - uipx(5), s.y - uipx(5)); ctx.lineTo(s.x + uipx(5), s.y + uipx(5)); ctx.moveTo(s.x + uipx(5), s.y - uipx(5)); ctx.lineTo(s.x - uipx(5), s.y + uipx(5)); ctx.stroke();
        ctx.fillStyle = "#ffb020"; ctx.font = uipx(9) + "px monospace"; ctx.fillText("MOVE", s.x + uipx(6), s.y + uipx(10)); }
      if (gk.committed) { const s = P(gk.committed.target[0], gk.committed.target[1], gk.committed.target[2]); ctx.fillStyle = "#ff5cf0";
        ctx.beginPath(); for (let a = 0; a < 10; a++) { const an = a / 10 * Math.PI * 2, rr = a % 2 ? uipx(3) : uipx(6); const px = s.x + Math.cos(an) * rr, py = s.y + Math.sin(an) * rr; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ff5cf0"; ctx.font = uipx(9) + "px monospace"; ctx.fillText("COMMIT", s.x + uipx(7), s.y); }
      // ── PHYSICAL COLLISION GEOMETRY ── actual hand-collision circle (active H radius, ball radius NOT included here)
      // and body-collision circle (GK_DIVE.bodyR) — both drawn as true world-radius rings, so the reviewer sees the
      // real contact envelope rather than the generous reserved reach ring above.
      const handR = GK_HAND[t.gkHand] != null ? GK_HAND[t.gkHand] : GK_DIVE.handR;
      const worldRing = (cx, cy, cz, r, stroke, fill) => {
        ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, uipx(1.5)); ctx.beginPath();
        for (let a = 0; a <= 28; a++) { const an = a / 28 * Math.PI * 2;
          const pp = sproj3(cx + Math.cos(an) * r, cz || 0, cy + Math.sin(an) * r); a ? ctx.lineTo(pp.x, pp.y) : ctx.moveTo(pp.x, pp.y); }
        ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.stroke();
      };
      // DISTINCT ANATOMY VOLUMES (item I) — hand (white), torso (blue), two feet/legs
      // (amber), and the lead-leg tip (orange) when a low dive extends it.
      const rt = gk.bodyNow || [gk.x, gk.y];
      worldRing(rt[0], rt[1] + GK_BODY.footSpread, 0, GK_BODY.legR, "rgba(255,180,60,0.85)", "rgba(255,180,60,0.10)");
      worldRing(rt[0], rt[1] - GK_BODY.footSpread, 0, GK_BODY.legR, "rgba(255,180,60,0.85)", "rgba(255,180,60,0.10)");
      worldRing(rt[0], rt[1], 0, GK_BODY.torsoR, "rgba(150,170,255,0.8)", "rgba(150,170,255,0.10)");
      if (gk.legTipNow) worldRing(gk.legTipNow[0], gk.legTipNow[1], gk.legTipNow[2], GK_BODY.legR, "rgba(255,140,40,0.95)", "rgba(255,140,40,0.18)");
      if (gk.handNow) { worldRing(gk.handNow[0], gk.handNow[1], gk.handNow[2], handR, "rgba(255,255,255,0.95)", "rgba(255,255,255,0.12)");
        const hs = P(gk.handNow[0], gk.handNow[1], gk.handNow[2]); ctx.fillStyle = "#fff"; ctx.font = uipx(8) + "px monospace";
        ctx.fillText(t.gkHand + " hand ⌀" + (handR * 200).toFixed(0) + "cm", hs.x + uipx(6), hs.y - uipx(6)); }
      const bsy = P(rt[0], rt[1]); ctx.fillStyle = "rgba(200,180,255,0.95)"; ctx.font = uipx(8) + "px monospace";
      ctx.fillText("torso ⌀" + (GK_BODY.torsoR * 200).toFixed(0) + " · feet ⌀" + (GK_BODY.legR * 200).toFixed(0) + "cm", bsy.x + uipx(6), bsy.y + uipx(12));
      if (gk.contact) { const cp = P(gk.contact.point[0], gk.contact.point[1], gk.contact.point[2]);   // last contact surface label
        ctx.fillStyle = "#ffd24a"; ctx.font = uipx(10) + "px monospace"; ctx.fillText("◉ " + gk.contact.surface, cp.x + uipx(6), cp.y); }
    }
    ctx.strokeStyle = "rgba(90,220,180,0.22)"; ctx.lineWidth = Math.max(1, PXQ);    // reserved reach ring
    ctx.beginPath();
    for (let a = 0; a <= 32; a++) { const an = a / 32 * Math.PI * 2;
      const pp = sproj3(gk.x + Math.cos(an) * gk.reachLateral, 0, gk.y + Math.sin(an) * gk.reachLateral);
      a ? ctx.lineTo(pp.x, pp.y) : ctx.moveTo(pp.x, pp.y); }
    ctx.closePath(); ctx.stroke();
    // ── text ──
    const A = (v) => (v <= 30 ? "LOW" : v >= 90 ? "HIGH" : "MED") + "(" + v + ")";
    const latMs = (gkReactionLatency(t, gk) * 1000).toFixed(0);   // the keeper's actual latency law (gkShape01), not the linear map
    const mode = t.gkStudy ? ("STUDY " + (t.gkStudyIdx + 1) + " " + GK_POS_STUDY[t.gkStudyIdx].name)
               : t.gkScenario != null ? ("SHOT " + (t.gkScenario + 1) + "/" + GK_SCENARIOS.length + " " + GK_SCENARIOS[t.gkScenario].name)
               : "(free play)";
    let lines;
    if (gk.shotActive && gk.reach) {
      const r = gk.reach, be = r.best, cr = gk.predict && gk.predict.crossing, cm = gk.committed, ct = gk.contact;
      lines = [
        "GK V1 (Stage 4 — CONTACT QUALITY: catch / supported catch / chest catch / gather / parry / fingertip / block from geometry+timing; Stage 3 frozen)",
        "state " + gk.state + "   reflexes " + A(t.gkReflex) + " latency " + latMs + "ms   react-remain " + gk.reactRemain.toFixed(3) + "s",
        "profile " + t.gkCap + "  height " + t.gkHeight + "cm  weight " + (t.gkWeight != null ? t.gkWeight : gk.weight) + "kg  refl " + A(t.gkReflex) + " div " + A(t.gkDiving) + " jump " + A(t.gkJump) + " hand " + A(t.gkHandling) + " str " + A(t.gkStrength != null ? t.gkStrength : gk.attrs.strength) + " acc " + A(gkAttr(t, gk, "acceleration")) + " spd " + A(gkAttr(t, gk, "sprint_speed")) +
          "  pos " + GK_POSMODEL.active + "/" + GK_SETDEPTH.active + "  action " + GK_ACTION.model + "  reach " + GK_REACH.jumpModel + "/" + GK_REACH.latModel + " p" + GK_REACH.envExp + "  hand " + t.gkHand + (t.pauseAtContact ? "  [pause-at-contact ON]" : ""),
        "policy " + t.gkMovePolicy + "  select " + (t.gkSelect || GK_REACH.selectPolicy) + "  PHASE " + (gk.phase || "-") + "   revs " + (gk.moveReversals || 0) + "  preCommit " + (gk.preCommitDist || 0).toFixed(2) + "m  expSurface " + (gk.reach && gk.reach.best ? gk.reach.best.surface : "-"),
        // ── POST-SHOT MOVEMENT DIAGNOSTIC (read-only; long-shot movement audit).
        // FORWARD + = upfield (toward the shooter, decreasing x); LATERAL + = +y.
        "MOVE  PHASE " + (gk.phase || "-") + "  t+" + (t.now - gk.shotT0).toFixed(3) + "s" +
          "  flightLeft " + (cr ? cr.t.toFixed(3) + "s" : "—") + "  usable " + (be ? be.availableTime.toFixed(3) + "s" : "—") +
          "  SETdepth " + (gk.setPos ? (GK_MOUTH.lineX - gk.setPos[0]).toFixed(2) : "—") + "m  rootDepth " + (GK_MOUTH.lineX - gk.x).toFixed(2) + "m",
        "MOVE  Δfwd " + (gk.setPos ? (gk.setPos[0] - gk.x).toFixed(3) : "—") + "m  Δlat " + (gk.setPos ? (gk.y - gk.setPos[1]).toFixed(3) : "—") +
          "m   vFwd " + (-gk.vx).toFixed(2) + "  vLat " + gk.vy.toFixed(2) + " m/s" +
          "   PREPtgt " + (gk.prepTarget ? "(" + gk.prepTarget[0].toFixed(2) + "," + gk.prepTarget[1].toFixed(2) + ")" : "—") +
          "  COMMITtgt " + (cm ? "(" + cm.target[0].toFixed(2) + "," + cm.target[1].toFixed(2) + ",z" + cm.target[2].toFixed(2) + ")" : "—") +
          "  dive ends t+" + (cm ? (cm.commitTime - gk.shotT0 + cm.execTime).toFixed(3) + "s" : "—"),
        "targets  SET(" + (gk.setPos ? gk.setPos[0].toFixed(1) + "," + gk.setPos[1].toFixed(1) : "-") + ")  predInt(" + (gk.predInt ? gk.predInt[0].toFixed(1) + "," + gk.predInt[1].toFixed(1) : "-") + ")  move(" + (gk.moveTarget ? gk.moveTarget[0].toFixed(1) + "," + gk.moveTarget[1].toFixed(1) : "-") + ")",
        "ball   (" + b.x.toFixed(2) + "," + b.y.toFixed(2) + "," + b.z.toFixed(2) + ") vel (" + b.vx.toFixed(1) + "," + b.vy.toFixed(1) + "," + b.vz.toFixed(1) + ")  obsTurn " + (gk.predict ? gk.predict.turnRate.toFixed(2) : "—"),
        "predicted crossing  " + (cr ? "y=" + cr.y.toFixed(2) + " z=" + cr.z.toFixed(2) + " in " + cr.t.toFixed(2) + "s  " + (cr.inMouth ? "IN MOUTH" : "off target") : "—"),
        "BEST reach " + (be ? be.tier + " reqSpan " + be.requiredSpan.toFixed(2) + "/" + be.diveSpanMax.toFixed(2) + " margin " + be.margin.toFixed(2) + " avail " + be.availableTime.toFixed(2) + "s" : "—"),
        cm ? ("COMMITTED " + cm.tier + (cm.bestEffort ? " (best-effort)" : "") + (cm.gather ? "  ● LOW GATHER (hands set ahead of the feet, no lead leg; ball " + cm.gatherSpeed + " m/s rel " + cm.gatherRel + " ≤ secure " + cm.gatherSecure + "+band/2)" : "") + "  ACTION " + (cm.action || "-") + " exec " + cm.execTime.toFixed(3) + "s" +
              (cm.actionDetail ? " (arm " + cm.actionDetail.dArm.toFixed(2) + "m/" + cm.actionDetail.tArm.toFixed(2) + "s · body " + cm.actionDetail.dBody.toFixed(2) + "m/" + cm.actionDetail.tBody.toFixed(2) + "s)" : "") +
              "  target(" + cm.target[0].toFixed(1) + "," + cm.target[1].toFixed(1) + ",z" + cm.target[2].toFixed(2) + ") diveU " + (gk.diveU || 0).toFixed(2) + " margin@commit " + (cm.reachMargin != null ? cm.reachMargin.toFixed(2) : "—"))
           : "not committed yet (footwork/reacting)" + (be && be.execT != null ? "   sel action " + (be.timeFeasible ? "feasible" : "NOT feasible") + " execT " + be.execT.toFixed(3) + "s gap " + (be.arrivalGap != null ? be.arrivalGap.toFixed(2) : "-") + "m" : ""),
        ct ? ("CONTACT " + ct.surface + " toi " + ct.toiFrac + " pt(" + ct.point[0] + "," + ct.point[1] + "," + ct.point[2] + ") n[" + ct.respNormal + (ct.normalCorrected ? " leg-cyl" : "") + "] vIn[" + ct.vIn + "]->vOut[" + ct.vOut + "] |" + ct.speedOut + "|")
           : "no keeper contact " + (gk.contacted ? "" : "(ball passing / not reached)"),
        ct ? ("OUTCOME " + ct.outcome + (ct.held ? "  ● HELD (keeper-owned)" : "") + "   reachNorm " + ct.q.norm + " (margin " + ct.q.reachMargin + "m)  align " + ct.q.cos + " palm-off " + ct.q.sin + "  relV " + ct.q.sRel + "m/s (secure≤" + ct.q.vSecure + ")  2hands " + ct.q.two + "  balance " + ct.q.cBal + "  z/traj " + ct.q.cHeight)
           : "",
        ct ? ("support  chest " + ct.q.support + " (corridor " + ct.q.corridor + " zWin " + ct.q.zWin + " handsOn " + ct.q.handsOn + " behind " + ct.q.behind + " latOff " + ct.q.latOff + "m)  secure " + ct.q.vSecure + "→" + ct.q.vSecureEff + " m/s   stable " + ct.q.stable + " (jitter " + ct.q.jitter + " m/s²)" + (ct.q.gather ? "   GATHER posture" : "")) : "",
        ct ? ("quality  catch " + ct.q.catchScore + " / " + ct.q.catchThresh + "   control " + ct.q.controlScore + " / " + ct.q.ctrlThresh + "   handling " + ct.q.handling + "   resp " + ct.resp.key + " e" + ct.resp.e + " kt" + ct.resp.kt + "  push " + ct.resp.push + "m/s tilt " + ct.resp.tiltDeg + "°  surfV[" + ct.resp.sv + "] handV[" + ct.resp.handVel + "]")
           : "",
        ct ? ("timings  shot->react " + ct.tShotToReact + "s  react->commit " + ct.tReactToCommit + "s  commit->contact " + ct.tCommitToContact + "s   mode " + mode)
           : ("keeper (" + gk.x.toFixed(2) + "," + gk.y.toFixed(2) + ")  mode " + mode),
      ];
    } else {
      lines = [
        "GK V1 (Stage 2 — pre-shot: SET/TRACKING positioning; awaiting shot)",
        "state " + gk.state + "   positioning " + A(t.gkPos) + " (q=" + (gk.q != null ? gk.q.toFixed(2) : "—") + ")   reflexes " + A(t.gkReflex) + " (" + latMs + "ms)",
        "attrs  diving " + A(t.gkDiving) + "  height " + t.gkHeight + "cm  handling " + A(t.gkHandling) + " (post-contact only)   momentum(next shot) " + t.gkMomentum + (t.pauseAtContact ? "   [pause-at-contact ON]" : ""),
        "desired (" + gk.desired[0].toFixed(2) + "," + gk.desired[1].toFixed(2) + ")  actual (" + gk.x.toFixed(2) + "," + gk.y.toFixed(2) + ")  posErr " + gk.posError.toFixed(3),
        "depth off line " + gk.depth.toFixed(2) + "m   ball (" + b.x.toFixed(2) + "," + b.y.toFixed(2) + "," + b.z.toFixed(2) + ")   mode " + mode,
      ];
    }
    ctx.font = uipx(11) + "px monospace"; ctx.textAlign = "left"; let yy = uipx(20);
    for (const l of lines) {
      if (!l) continue;
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(uipx(6), yy - uipx(11), uipx(6.1) * l.length + 8, uipx(14));
      ctx.fillStyle = "#8affd8"; ctx.fillText(l, uipx(8), yy); yy += uipx(15);
    }
  }
}
function ptKick(fam, label, Dopt, force, charge, tgtDist) {
  // tgtDist = AUTHORITATIVE intended target distance (m) for the target-
  // solved INSIDE_R setup — the engine-integration path (world.py kicks
  // carry dist(ball, target)). The legacy Dopt nominal is NOT player aim
  // and is never used for setup. Sandbox callers omit tgtDist; the contact
  // block then derives the documented preview-only proxy.
  // KICK ANIMATION V2: every kick is SCHEDULED — technique + foot chosen
  // deterministically, animation enters now, authoritative impulse fires
  // exactly at the contact frame instant. Physics families untouched.
  // `force` ({tech, foot}) is the V2.0.2 SHOWCASE override: playtest-only
  // debug control that pins technique/foot for visual inspection. Ball
  // physics still comes from the same ptFam family — nothing gameplay
  // (match AI, engine, trivela geometry selection) reads this path.
  const t = S.pt, p = t.p, b = t.b;
  if (!b.ctrl || t.kick) return;
  const D = Dopt || (fam === "SHORT" ? 14 : fam === "LOFT" ? 22 : 20);
  let [v0, vz] = ptFam(fam, D);
  const tx = p.x + Math.cos(p.facing) * D, ty = p.y + Math.sin(p.facing) * D;
  const sel = force && force.foot
    ? { foot: force.foot, lat: 0, dtg: 0, tgt: p.facing }
    : ptSelectFoot(t, tx, ty);
  let tech = force && force.tech ? force.tech : ptTech(fam, D, v0);
  if (!force && (tech === "INSIDE" || tech === "LACES") &&
      ((sel.foot === "R" && sel.lat > -0.05 && sel.dtg > 0.26 && sel.dtg < 0.88) ||
       (sel.foot === "L" && sel.lat < 0.05 && sel.dtg < -0.26 && sel.dtg > -0.88)))
    tech = "OUTSIDE";
  // VARIABLE SHOT CHARGE V1: the charge stored at release replaces the
  // family's nominal launch with the technique-specific curve value.
  // Technique classification above intentionally used the family nominal.
  if (charge) {
    const L = ptChargeLaunch(tech, charge.c);
    v0 = L.v0; vz = L.vz;
  }
  const pres = ptPresDir(t);
  const ew = pres === "east" || pres === "west";
  const mirror = pres === "west";
  const ent = ptKickEntry(tech, sel.foot, mirror);
  if (!ew || !ent.e) {                        // directional art gap: minimal delay
    t.kickFbN = (t.kickFbN || 0) + 1;
    t.kick = { t0: t.now, kickAt: t.now + 0.2, end: t.now + 0.45, fam, v0, vz,
               dir: p.facing, kicked: false, tech, foot: sel.foot, noAnim: true, label,
               charge: charge ? charge.c : null,
               tgtD: tgtDist != null ? tgtDist : null };
  } else {
    // FIRST-TIME BRANCH (spec 22): a moving carrier skips the approach and
    // enters at the plant -> swing -> contact tail; a stationary kick plays
    // the full approach. The ball is never frozen or parented.
    const pv0 = Math.hypot(p.vx, p.vy);
    const f0 = pv0 > 2.0 ? Math.max(0, ent.e.contact - 3) : 0;
    const kickAt = t.now + (ent.e.contact - f0) / ent.e.fps;
    t.kick = { t0: t.now, kickAt, end: t.now + (ent.e.n - f0) / ent.e.fps + 0.12, fam, v0, vz,
               dir: p.facing, kicked: false, tech, foot: sel.foot, f0,
               key: ent.key, e: ent.e, mirror, artFoot: ent.artFoot, fb: ent.fb, label,
               charge: charge ? charge.c : null,
               tgtD: tgtDist != null ? tgtDist : null };
  }
  t.kickInfo = { pfoot: t.pfoot || "R", foot: sel.foot, tech, fam,
                 asset: ent.e ? ent.e.set || ent.e.legacy : "none",
                 contactFoot: sel.foot, fb: ent.e ? ent.fb : true, noAnim: !ew || !ent.e,
                 holdMs: charge ? Math.round(charge.holdMs) : null,
                 charge: charge ? +charge.c.toFixed(3) : null,
                 v0: +v0.toFixed(2), vz: +vz.toFixed(2),
                 elevDeg: +(Math.atan2(vz, v0) * 57.296).toFixed(1),
                 tgtDeg: +(((p.facing * 57.296) % 360 + 360) % 360).toFixed(0) };
  t.last = label + " scheduled (" + tech + " " + sel.foot + ")";
}
function ptShoot() { ptKick("SHOT", "SHOT"); }
// ═══ VARIABLE SHOT CHARGE V1 — hold duration -> technique-specific launch ══
// Playtest input feature: kick keys charge while held (sim-time, no RNG,
// deterministic) and fire on release. The stored charge at release maps to
// a launch vector through per-technique curves; animations, contact timing,
// routing and ball physics are untouched. All constants live here.
const KICK_CHARGE = {
  // PER-TECHNIQUE charge timing: c = clamp(tapChargeMin, bias + hold/ms, 1).
  // LACES is FC-style fast (full at 325ms: 75ms=0.25, 125=0.40, 175=0.55,
  // 225=0.70, 275=0.85); POWER keeps 500ms; others temporarily keep 500ms.
  // Tap floor small and universal; technique identity lives in the curves.
  tapChargeMin: 0.10,
  timing: {
    LACES:   { bias: 0.025, ms: 1000 / 3 },
    POWER:   { bias: 0.05,  ms: 500 },
    INSIDE:  { bias: 0.05,  ms: 500 },
    OUTSIDE: { bias: 0.05,  ms: 500 },
    CHIP:    { bias: 0.05,  ms: 500 },
  },
  showcaseSeqCharge: 0.6, // key-6 deterministic sequence uses a fixed charge
  // Two-phase (INSIDE/LACES/OUTSIDE): early charge mostly adds horizontal
  // speed; past the knee a nonlinear late^p term adds strong lift.
  //   H(c) = h0 + (h1-h0)*c + hLate*late^p
  //   V(c) = v0 + (vKnee-v0)*c + vLate*late^p,  late = clamp((c-knee)/(1-knee))
  // INSIDE late-charge loft: APPROVED L2. c<=loftC0 keeps the original
  // two-phase vertical exactly; above it the vertical smoothly re-targets
  // vzFull at c=1 (smoothstep blend, C1 at the join, horizontal untouched).
  // Full charge: 20.0 m/s @ vz 8.50 -> ~23 deg, ~3.75 m peak.
  INSIDE:  { h0: 8,  h1: 17, hLate: 3, v0: 0.4, vKnee: 2.0, vLate: 9,  knee: 0.45, p: 2.2,
             loftC0: 0.75, vzFull: 8.5 },
  // LACES vLate reduced 11 -> 7 (approved pending loft cut): full-charge
  // vz 9.5 -> peak ~4.6 m instead of the rejected ~9.4 m balloon.
  LACES:   { h0: 10, h1: 22, hLate: 4, v0: 0.5, vKnee: 2.5, vLate: 7,  knee: 0.45, p: 2.2 },
  OUTSIDE: { h0: 9,  h1: 18, hLate: 3, v0: 0.5, vKnee: 2.2, vLate: 9,  knee: 0.48, p: 2.2 },
  // POWER: magnitude scaling of ONE driven trajectory family. POWER starts
  // POWERFUL: tap ~21 m/s, full ~31 m/s (highest conventional-shot ceiling);
  // vz = v0 * ratio keeps the elevation EXACTLY constant (~15.2 deg, the
  // approved driven family) at every charge — more power, never steeper.
  POWER:   { hMin: 21, hMax: 31, ratio: 0.271, g: 1.15 },
  // CHIP: range and loft both grow; loft slightly faster (vp > 1).
  CHIP:    { h0: 5, h1: 14, v0: 4, v1: 11, vp: 1.25 },
};
function ptChargeLaunch(tech, c) {
  const fam2 = (tech === "INSIDE" || tech === "INSIDE_FINISH") ? "INSIDE"
             : tech === "LACES_POWER" ? "POWER"
             : tech === "OUTSIDE" ? "OUTSIDE"
             : tech === "CHIP" ? "CHIP" : "LACES";
  const q = KICK_CHARGE[fam2];
  if (fam2 === "POWER") {
    const h = q.hMin + (q.hMax - q.hMin) * Math.pow(c, q.g);
    return { v0: h, vz: h * q.ratio };
  }
  if (fam2 === "CHIP")
    return { v0: q.h0 + (q.h1 - q.h0) * c, vz: q.v0 + (q.v1 - q.v0) * Math.pow(c, q.vp) };
  const late = Math.max(0, Math.min(1, (c - q.knee) / (1 - q.knee)));
  const lift = Math.pow(late, q.p);
  const L = { v0: q.h0 + (q.h1 - q.h0) * c + q.hLate * lift,
              vz: q.v0 + (q.vKnee - q.v0) * c + q.vLate * lift };
  if (q.loftC0 != null && c > q.loftC0) {           // INSIDE L2 loft reshape
    const t2 = (c - q.loftC0) / (1 - q.loftC0), w = t2 * t2 * (3 - 2 * t2);
    L.vz += (q.vzFull - (q.v0 + (q.vKnee - q.v0) + q.vLate)) * w;
  }
  return L;
}
function ptKickSpec(k, t) {   // key -> chargeable kick descriptor
  // chargeFam picks the per-technique timing (bias/ms) used while holding
  if (k === "x") return { fam: "SHORT", label: "SHORT PASS", D: 14, chargeFam: "INSIDE" };
  if (k === "z") return { fam: "SHOT", label: "SHOT", chargeFam: "LACES" };
  if (k === "c") return { fam: "LOFT", label: "LOFTED PASS", D: 22, chargeFam: "CHIP" };
  const s = PT_SHOWCASE[k];
  if (s) {
    const cf = s.tech === "LACES_POWER" ? "POWER"
             : (s.tech === "INSIDE" || s.tech === "INSIDE_FINISH") ? "INSIDE"
             : s.tech === "OUTSIDE" ? "OUTSIDE"
             : s.tech === "CHIP" ? "CHIP" : "LACES";
    return { fam: s.fam, label: s.label + " (" + (t.pfoot || "R") + ")", D: s.D,
             force: { tech: s.tech, foot: t.pfoot || "R" }, chargeFam: cf };
  }
  return null;
}
function ptChargeValue(spec, holdMs) {
  const tm = KICK_CHARGE.timing[spec.chargeFam] || KICK_CHARGE.timing.LACES;
  return Math.max(KICK_CHARGE.tapChargeMin, Math.min(1, tm.bias + holdMs / tm.ms));
}
function ptChargeBegin(t, k, spec) {
  if (t.kick || t.charge || !t.b.ctrl) return;
  t.charge = { key: k, spec, t0: t.now };
}
function ptChargeRelease(t, k) {
  const ch = t.charge;
  if (!ch || ch.key !== k) return;
  t.charge = null;
  const holdMs = Math.max(0, (t.now - ch.t0) * 1000);
  const c = ptChargeValue(ch.spec, holdMs);
  ptKick(ch.spec.fam, ch.spec.label, ch.spec.D, ch.spec.force, { c, holdMs });
}
// ═══ KICK V2.0.2 — TECHNIQUE SHOWCASE (playtest-only debug controls) ═══════
// Keys 1-5 pin a technique directly (foot = preferred-foot toggle, F key);
// key 6 runs the deterministic side-by-side sequence. These are inspection
// controls: same ball families, same contact scheduling, zero gameplay use.
const PT_SHOWCASE = {
  "1": { tech: "INSIDE", fam: "SHORT", D: 14, label: "SHOWCASE INSIDE" },
  "2": { tech: "LACES", fam: "DRIVEN", D: 20, label: "SHOWCASE LACES" },
  "3": { tech: "LACES_POWER", fam: "CLEAR", D: 35, label: "SHOWCASE POWER LACES" },
  "4": { tech: "OUTSIDE", fam: "SHORT", D: 14, label: "SHOWCASE TRIVELA/OUTSIDE" },
  "5": { tech: "CHIP", fam: "LOFT", D: 22, label: "SHOWCASE CHIP" },
};
function ptShowcaseKick(k) {
  // used by the deterministic key-6 sequence: fixed charge, no hold
  const t = S.pt, c = PT_SHOWCASE[k];
  if (!t || !c) return;
  const foot = t.pfoot || "R";
  const cc = KICK_CHARGE.showcaseSeqCharge;
  ptKick(c.fam, c.label + " (" + foot + ")", c.D, { tech: c.tech, foot },
         { c: cc, holdMs: cc * KICK_CHARGE.fullChargeMs });
}
function ptShowcaseSeq() {
  const t = S.pt;
  if (!t || t.show) return;
  t.show = { queue: ["1", "2", "3", "4", "5"], idx: 0, nextAt: t.now + 0.3 };
  t.last = "SHOWCASE SEQUENCE: INSIDE > LACES > POWER > TRIVELA > CHIP";
}
function ptShowcaseStep(t) {
  // advance the deterministic showcase: re-stage the same spot, same facing,
  // same ball placement, fire the next technique after a short pause
  const sh = t.show;
  if (!sh || t.kick) return;
  if (sh.idx >= sh.queue.length) { t.show = null; t.last = "SHOWCASE DONE"; return; }
  if (t.now < sh.nextAt) return;
  const p = t.p, b = t.b;
  p.x = 84; p.y = 34; p.vx = 0; p.vy = 0; p.facing = 0;
  const foot = t.pfoot || "R";
  b.x = p.x + 0.42; b.y = p.y + (foot === "R" ? 0.12 : -0.12); b.z = 0;
  b.vx = 0; b.vy = 0; b.vz = 0; b.ctrl = "PT"; b.curve = null;
  ptShowcaseKick(sh.queue[sh.idx]);
  sh.idx++;
  sh.nextAt = t.now + 2.4;          // anim (<=1 s) + readable pause
}
function ptStep() {
  const t = S.pt;
  if (!t || !t.on) return;
  t.now += PT_DT;
  if (t.gkStudy && t.gkStudy.active) { ptGkStudyStep(t); ptGkUpdate(t); return; }  // GK positioning study (kinematic ball) — isolated from shots
  ptShowcaseStep(t);               // V2.0.2 showcase sequencer (debug-only)
  const p = t.p, b = t.b;
  // input -> desired velocity (kicker plants during the shoot animation)
  let dx = 0, dy = 0;
  if (!t.kick) {
    if (t.keys.up) dy -= 1;
    if (t.keys.down) dy += 1;
    if (t.keys.left) dx -= 1;
    if (t.keys.right) dx += 1;
  }
  const m = Math.hypot(dx, dy), spd = t.keys.sprint ? PT.VMAX : PT.RUNV;
  const inCorr = m > 0 ? Math.atan2(dy, dx) : null;   // desired input corridor
  let dvx = 0, dvy = 0;
  if (m > 0 && b.ctrl && !t.kick) {
    // CARRY steering — the authoritative execution (continuous.py CARRY):
    // run THROUGH the ball toward a point 2 m along the desired corridor,
    // so touches and turns funnel the carrier onto the ball instead of a
    // parallel line 1 m beside it. Input stays the intent; this is the
    // same desired-vs-achievable movement split the engine uses.
    const s0c = (b.x - p.x) * Math.cos(inCorr) + (b.y - p.y) * Math.sin(inCorr);
    const dball = Math.hypot(b.x - p.x, b.y - p.y);
    const tx = (s0c < 0.15 && dball > 0.55) ? b.x : b.x + Math.cos(inCorr) * 2;
    const ty = (s0c < 0.15 && dball > 0.55) ? b.y : b.y + Math.sin(inCorr) * 2;
    const dd = Math.hypot(tx - p.x, ty - p.y);
    // brake into unfinished turns (V1.1, mirrors continuous.py CARRY)
    const ceS = t.corr !== undefined ?
      Math.abs(((inCorr - t.corr) + Math.PI * 3) % (2 * Math.PI) - Math.PI) : 0;
    const spdC = spd * Math.max(0.4, Math.min(1.0, 1.0 - 0.45 * ceS));
    if (dd > 0.12) { dvx = (tx - p.x) / dd * spdC; dvy = (ty - p.y) / dd * spdC; }
  } else if (m > 0) { dvx = dx / m * spd; dvy = dy / m * spd; }
  // world.locomote LOCOMOTION V1 limiter (direction-decomposed, mirror)
  const cur = Math.hypot(p.vx, p.vy);
  const ax = dvx - p.vx, ay = dvy - p.vy;
  if (cur > 0.5) {
    const uvx = p.vx / cur, uvy = p.vy / cur;
    const aPar = ax * uvx + ay * uvy;
    const aPx = ax - aPar * uvx, aPy = ay - aPar * uvy;
    const aLat = Math.hypot(aPx, aPy);
    const limPar = aPar >= 0 ? PT.ACC * PT.ACC_GAIN : PT.BRAKE_PLANT;
    const fPar = Math.min(1, limPar * PT_DT / Math.max(1e-9, Math.abs(aPar)));
    const fLat = Math.min(1, PT.ACC_LAT * PT_DT / Math.max(1e-9, aLat));
    p.vx += aPar * fPar * uvx + aPx * fLat;
    p.vy += aPar * fPar * uvy + aPy * fLat;
  } else {
    const am = Math.hypot(ax, ay), stp = Math.max(PT.ACC_START, PT.ACC * PT.ACC_GAIN) * PT_DT;
    if (am > stp) { p.vx += ax / am * stp; p.vy += ay / am * stp; }
    else { p.vx = dvx; p.vy = dvy; }
  }
  t.inDir = m > 0 ? inCorr : null;
  p.x = Math.max(-2, Math.min(107, p.x + p.vx * PT_DT));   // world bounds (ported)
  p.y = Math.max(-2, Math.min(70, p.y + p.vy * PT_DT));
  // facing (ported): faces velocity when moving, else the ball
  const v = Math.hypot(p.vx, p.vy);
  const want = v > 0.7 ? Math.atan2(p.vy, p.vx) : Math.atan2(b.y - p.y, b.x - p.x);
  const df = ((want - p.facing) + Math.PI * 3) % (2 * Math.PI) - Math.PI;
  const rate = Math.max(4.0, Math.min(7.0, 7.0 - v * 0.30)) * PT_DT;  // athletic hips (V1)
  p.facing += Math.abs(df) <= rate ? df : Math.sign(df) * rate;
  // scheduled shot: impulse fires exactly at the contact instant
  if (t.kick) {
    const k = t.kick;
    if (!k.kicked && t.now >= k.kickAt) {
      k.kicked = true;
      // CONTACT: authoritative impulse along the direction frozen at the
      // decision instant — physics families unchanged
      // INSIDE_R CURVE (TARGET-SOLVED): k.dir is the INTENDED TARGET
      // direction. A right-foot inside strike launches rotated RIGHT by the
      // setup angle interpolated from PT_CURVE_SETUP for (charge, intended
      // target distance); the free in-flight spin then swings the ball back
      // LEFT to re-cross the aim line at the target. After this rotation the
      // flight is completely free — no steering, no homing.
      let launchDir = k.dir;
      if ((k.tech === "INSIDE" || k.tech === "INSIDE_FINISH") && k.foot === "R") {
        const cc = k.charge != null ? k.charge : 0.5;
        if (PT_CURVE.mode === "v2") {
          let tgtD = k.tgtD;              // authoritative intended target distance
          if (tgtD == null) {             // SANDBOX ONLY: synthetic preview target
            // review override (key G) replaces only this synthetic preview
            // distance; AUTO = natural-carry proxy. Never a production input.
            tgtD = t.tgtOverride != null ? t.tgtOverride
                 : Math.min(ptCurveNaturalRange(k.v0, k.vz), PT_CURVE_SETUP.previewCap);
            k.tgtDPreview = tgtD;
          }
          const solvedD = ptCurveClampDist(cc, tgtD);   // reachability clamp (report only)
          k.setupRad = ptCurveSetupLookupDeg(cc, tgtD) * Math.PI / 180;
          launchDir = k.dir + k.setupRad;
          t.kickInfo = Object.assign(t.kickInfo || {}, {
            tgtD: +tgtD.toFixed(1), tgtPreview: k.tgtD == null,
            tgtSolved: +solvedD.toFixed(1), tgtClamped: tgtD - solvedD > 0.05,
            setupDeg: +(k.setupRad * 180 / Math.PI).toFixed(2) });
        }
        b.curve = { s: PT_CURVE.base + PT_CURVE.chargeGain * Math.pow(cc, PT_CURVE.fPow), sgn: 1 };
      } else b.curve = null;
      b.vx = Math.cos(launchDir) * k.v0; b.vy = Math.sin(launchDir) * k.v0; b.vz = k.vz;
      b.ctrl = false; b.exclT = t.now + PT.EXCL; p.touchT = 0;
      t.last = k.label + " " + k.v0.toFixed(0) + " m/s (" + k.tech + " " + k.foot + ")";
      if (k.e) {
        const sp2 = sproj(p.x, p.y);
        const scl2 = S.playerVScale * depthScale(sp2.d) * RIG.zoom * RES;
        const fx = sp2.x + (k.mirror ? -(k.e.cx - 70) : (k.e.cx - 70)) * scl2;
        const fy = sp2.y + (k.e.cy - 117) * scl2;
        const bp2 = sproj3(b.x, b.z, b.y);
        const br2 = Math.max(2, BALL_VIS_R * S.pxPerM * depthScale(bp2.d) * RIG.zoom * RES);
        const dpx = Math.hypot(fx - bp2.x, fy - bp2.y);
        const rec = { tech: k.tech, foot: k.foot, fam: k.fam,
                      radii: +(dpx / br2).toFixed(2), px: +dpx.toFixed(1) };
        (t.kickLog ||= []).push(rec);
        t.kickInfo = Object.assign(t.kickInfo || {}, { errR: rec.radii });
        t.dbgTouch = { fx, fy, bx: bp2.x, by: bp2.y, until: t.now + 0.6, rec:
          { n: t.kickLog.length, foot: k.foot, pose: k.key || "-", kind: k.tech,
            px: rec.px, radii: rec.radii, turn: 0 } };
      }
    }
    if (t.now >= k.end) t.kick = null;
  }
  // carry (world.carry_touch port; solo pitch: no opponent shortening)
  if (b.ctrl) {
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    // PERSISTENT POSSESSION (mirror of world.py update_control): SECURE at
    // feet; EXPOSED inside the 4.2 m carry envelope or while actively
    // closing; ESCAPING = separating beyond 2.6 m; explicit loss only when
    // the ball escapes the envelope and the carrier is not recovering it.
    const sep = ((b.x - p.x) * (b.vx - p.vx) + (b.y - p.y) * (b.vy - p.vy)) / Math.max(d, 1e-9);
    if (d <= 0.95) t.ctrlState = "SECURE";
    else if (d <= 4.2 || sep < -0.3) t.ctrlState = (d > 2.6 && sep > 0.3) ? "ESCAPING" : "EXPOSED";
    else { b.ctrl = false; t.ctrlState = null; t.last = "LOOSE (escaped control envelope)"; }
    if (b.ctrl && t.kick) { /* wind-up: no carry touches; the ball keeps
        rolling under normal physics until the authoritative contact */ }
    else if (b.ctrl) {
      p.touchT -= PT_DT;
      // CONTROLLED DRIBBLING V1 — mirror of world.py carry_touch: solved
      // impulse, speed curves T(v)/s_c(v), smooth turn factor, corrective
      // early touches (0.10 s min spacing), settle behaviour at rest.
      // CORRIDOR SLEW (V1.1 mirror): carry corridor rotates at 7 rad/s
      const tgtC = inCorr !== null ? inCorr : p.facing;
      if (t.corrT === undefined || t.now - t.corrT > 0.6) t.corr = tgtC;
      const ceT = ((tgtC - t.corr) + Math.PI * 3) % (2 * Math.PI) - Math.PI;
      const slew = 7.0 * PT_DT;
      t.corr = ((t.corr + Math.max(-slew, Math.min(slew, ceT))) + Math.PI * 3) % (2 * Math.PI) - Math.PI;
      t.corrT = t.now;
      const corr = t.corr;
      if (d <= 0.85) {
        const pv = Math.hypot(p.vx, p.vy), bsp = Math.hypot(b.vx, b.vy);
        const spacing = t.now - (t.lastTouchT !== undefined ? t.lastTouchT : -9);
        if (pv < 0.4) {
          if (bsp < 0.5 && d < 0.55) { p.touchT = 0; t.liveTurn = 0; }
          else if (bsp < 0.5 && spacing >= 0.10) {
            const ux = (p.x - b.x) / Math.max(d, 1e-9), uy = (p.y - b.y) / Math.max(d, 1e-9);
            const u = Math.min(1.6, Math.sqrt(2 * PT.MU_ROLL * Math.max(0.05, d - 0.30)));
            b.vx = ux * u; b.vy = uy * u; b.vz = 0;
            p.touchT = 0.18; t.lastTouchT = t.now;
            t.touchN++;
            t.last = "SETTLE TOUCH";
            t.touchInfo = { d, u, T: 0.18, sc: 0.30, turn: 0, kind: "SETTLE" };
            const presS = ptPresDir(t);
            const baseS = DRIB3_MIRROR[presS] || presS;
            if (DRIB3[baseS]) {
              const pk = drib3Pick(t, false, 0, baseS, !!DRIB3_MIRROR[presS]);
              drib3Schedule(t, pk, 0.3, baseS);
              t.touchInfo.foot = pk.foot; t.touchInfo.pose = pk.pose;
              drib3LogContact(t, pk, presS, baseS);
            } else {
              const pk = drib2Pick(t, false, 0);
              drib2Schedule(t, pk, 0.3);
              t.touchInfo.foot = pk.foot; t.touchInfo.pose = pk.pose;
              drib2LogContact(t, pk);
            }
          }
        } else {
          const bdir = bsp > 0.5 ? Math.atan2(b.vy, b.vx) : Math.atan2(b.y - p.y, b.x - p.x);
          const turnA = Math.abs(((corr - bdir) + Math.PI * 3) % (2 * Math.PI) - Math.PI);
          t.liveTurn = turnA;
          const corrective = turnA > 0.52 && spacing >= 0.10;
          if (p.touchT <= 0 || corrective) {
            const tt = Math.max(0, Math.min(1, (turnA - 0.52) / 1.40));
            const tf = 1 - 0.7 * tt * tt * (3 - 2 * tt);
            const T = Math.max(0.18, Math.min(0.48, 0.18 + 0.036 * pv));
            const sc = Math.max(0.28, Math.min(0.75, 0.28 + 0.055 * pv)) * tf;
            const ux = Math.cos(corr), uy = Math.sin(corr);
            const s0 = (b.x - p.x) * ux + (b.y - p.y) * uy;
            const pvA = Math.max(0, p.vx * ux + p.vy * uy);
            let u = pvA + (sc - s0 + 0.5 * PT.MU_ROLL * T * T) / T;
            u = Math.max(0.5, Math.min(pv + 3.5, u));
            const rpx = b.vx - (b.vx * ux + b.vy * uy) * ux;
            const rpy = b.vy - (b.vx * ux + b.vy * uy) * uy;
            b.vx = ux * u + 0.15 * rpx; b.vy = uy * u + 0.15 * rpy; b.vz = 0;
            p.touchT = T; t.lastTouchT = t.now;
            t.touchN++;
            t.last = corrective ? "CORRECTIVE TOUCH" : "DRIBBLE TOUCH";
            t.touchInfo = { d, u, T, sc, turn: turnA, kind: corrective ? "CORRECTIVE" : "NORMAL" };
            // DRIBBLE ANIMATION V2/V3: physics event -> pose selection
            const presT = ptPresDir(t);
            const baseT = DRIB3_MIRROR[presT] || presT;
            if (DRIB3[baseT]) {
              const pick = drib3Pick(t, corrective, turnA, baseT, !!DRIB3_MIRROR[presT]);
              drib3Schedule(t, pick, T, baseT);
              t.touchInfo.foot = pick.foot; t.touchInfo.pose = pick.pose;
              drib3LogContact(t, pick, presT, baseT);
            } else {
              const pick = drib2Pick(t, corrective, turnA);
              drib2Schedule(t, pick, T);
              t.touchInfo.foot = pick.foot; t.touchInfo.pose = pick.pose;
              drib2LogContact(t, pick);
            }
          }
        }
      }
    }
  } else if (t.now >= b.exclT) {
    // regain control: world.interact CLEAN branch (port), rv < 5.5
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    const rv = Math.hypot(b.vx - p.vx, b.vy - p.vy);
    if (d < PT.REACH && b.z < 1.4 && rv >= 5.5 && rv < 12 &&
        t.now - (t.looseT || -9) > 0.3) {
      // too hot to control (world.interact TOUCH_LOOSE, deterministic mirror):
      // the ball squirts ahead instead of ghosting through the player
      const a = Math.atan2(b.vy - p.vy, b.vx - p.vx);
      const spd2 = rv * 0.35;
      b.vx = Math.cos(a) * spd2 + p.vx * 0.4;
      b.vy = Math.sin(a) * spd2 + p.vy * 0.4;
      b.exclT = t.now + 0.12; t.looseT = t.now;
      t.last = "LOOSE TOUCH (too fast to control)";
    } else if (d < PT.REACH && b.z < 1.4 && rv < 5.5) {
      b.ctrl = true;
      b.curve = null;                        // regaining control clears spin
      t.ctrlSince = t.now;
      b.vx = p.vx * 0.7 + Math.cos(p.facing) * 1.1;
      b.vy = p.vy * 0.7 + Math.sin(p.facing) * 1.1;
      if (b.z > 0 && b.z < 1.6) b.vz = Math.min(b.vz, 0.4);
      p.touchT = 0.30;
      t.last = "CONTROL";
    }
  }
  ptGkUpdate(t);   // GK V1 Stage 3: keeper perceives/commits/MOVES before the ball advances, so the swept keeper->ball TOI competes in physical order
  // ball physics (world.step_ball port) + accepted net-catch behaviour
  if (t.net) {
    if (t.net.phase === "push") {
      const dec = Math.exp(-PT_DT / 0.05);
      b.vx *= dec; b.vy *= dec; b.vz *= dec;
      b.x += b.vx * PT_DT; b.y += b.vy * PT_DT; b.z += b.vz * PT_DT;
      if (Math.hypot(b.vx, b.vy, b.vz) < 1.3) {
        t.net.phase = "drop";
        b.vx = -0.18 * t.net.vE[0]; b.vy = -0.18 * t.net.vE[1]; b.vz = 0.4;
      }
    } else {
      b.vz -= PT.G * PT_DT;
      b.x += b.vx * PT_DT; b.y += b.vy * PT_DT; b.z += b.vz * PT_DT;
      b.vx *= (1 - 1.2 * PT_DT); b.vy *= (1 - 1.2 * PT_DT);
      if (b.z <= 0.11) { b.z = 0.0; b.vz = 0; t.net = null; }
    }
  } else {
    if (!b.ctrl) {
      // STAGE 4: a securely CAUGHT ball is keeper-owned (rides the hands; no integration / frame / crossing / net while held).
      // STAGE 3: otherwise the swept keeper->ball TOI runs BEFORE frame/crossing/net. Null if no genuine contact -> existing physics run unchanged (byte-identical).
      const _kc = b.held === "GK" ? gkHeldBallStep(t, b) : gkTryContact(t, b);
      // INTEGRATION PASS (2026-09-04): a keeper contact no longer swallows the rest of the tick. The ball is
      // placed at the contact point with its new velocity and then continues through the SAME frame / ground /
      // friction / curve / crossing / net physics for the remaining sub-tick (dtB = the fraction after the TOI),
      // so a deflection into a post or across the line inside the contact tick is resolved, never skipped.
      // A held (caught) ball skips everything. No contact: dtB = PT_DT, byte-identical to before.
      if (!b.held && (!_kc || _kc.remDt != null)) {
      const dtB = _kc && _kc.remDt != null ? _kc.remDt : PT_DT;
      const _p0 = { x: b.x, y: b.y, z: b.z };   // NET V2 swept: pre-advance pos
      // GOAL FRAME V1 (gated): swept post/crossbar collision replaces the
      // plain position advance; with the flag off this is byte-identical.
      if (GOALFX.collision) ptGoalFrameStep(b, dtB);
      else { b.x += b.vx * dtB; b.y += b.vy * dtB; b.z += b.vz * dtB; }
      if (b.z > 0) b.vz -= PT.G * dtB;
      if (b.z <= 0) {
        if (b.vz < 0) {
          const r = -b.vz * PT.REST;
          if (r < PT.SETTLE) b.vz = 0;
          else { b.vz = r; b.vx *= PT.KEEP; b.vy *= PT.KEEP; }
          if (b.curve) b.curve.s *= PT_CURVE.bounceKeep;   // ground contact bleeds spin
        }
        b.z = Math.max(0, b.z);
      }
      const sp2 = Math.hypot(b.vx, b.vy);
      if (sp2 > 0) {
        const mu = b.z > 0.05 ? PT.MU_AIR : PT.MU_ROLL;
        const ns = Math.max(0, sp2 - mu * dtB);
        b.vx *= ns / sp2; b.vy *= ns / sp2;
      }
      // INSIDE_R CURVE V1: lateral accel toward the travel-left perpendicular,
      // smoothly gated by how airborne the ball is; spin decays continuously.
      if (b.curve && b.curve.s > 0.02) {
        const spc = Math.hypot(b.vx, b.vy);
        if (spc > 0.5) {
          const u = Math.max(0, Math.min(1, (b.z - PT_CURVE.airZ0) / (PT_CURVE.airZ1 - PT_CURVE.airZ0)));
          const air = PT_CURVE.groundFrac + (1 - PT_CURVE.groundFrac) * u * u * (3 - 2 * u);
          const a = (PT_CURVE.mode === "v2" ? ptX3K() * b.curve.s * spc
                                            : b.curve.s) * air * b.curve.sgn;
          const lx = b.vy / spc, ly = -b.vx / spc;   // left-perp of travel (pitch y grows south)
          b.vx += lx * a * dtB; b.vy += ly * a * dtB;
          const rollD = PT_CURVE.mode === "v2" ? PT_CURVE.skimDecay : PT_CURVE.rollDecay;
          b.curve.s *= 1 - (b.z > 0.05 ? PT_CURVE.decay : rollD) * dtB;
        }
      }
      // GOAL FRAME V1 (gated): WHOLE-BALL goal crossing. The trailing-most
      // point of the physical sphere relative to the goal-plane normal
      // (+x right goal, -x left goal) must be beyond the plane: for the
      // right goal that point is (b.x - ballR); left goal (b.x + ballR).
      // Derived from the physical radius — never a tuned threshold, never
      // sprite dimensions. Event ordering within the step is inherent: the
      // swept frame TOI resolves any post/crossbar contact BEFORE the ball
      // can advance across the plane, so a frame hit always precedes (and
      // can prevent) the crossing; once the whole ball is across, later
      // net/frame interaction cannot revoke the award (label latches).
      if (GOALFX.collision && t.last !== "GOAL!") {
        // ── GOAL = a WHOLE-BALL MOUTH-CROSSING EVENT (continuous TOI) ──────
        // A goal iff the entire physical ball passes from the field side to
        // the goal side THROUGH the legal mouth aperture. We solve the in-step
        // time-of-impact at which the ball's trailing-most point (centre ∓ rB
        // along the plane normal) clears the authoritative goal plane, then
        // require the WHOLE ball to fit the aperture AT THAT INSTANT: between
        // the posts and beneath the crossbar, each with ball radius. It is a
        // crossing EVENT, not a position/occupancy test — a ball on the sagging
        // roof, above the bar, or outside a post never produces a valid
        // crossing, so it is never a goal. Latched once true (a later net
        // throw-back through the mouth cannot revoke it). Frame TOI resolves
        // earlier in the step, so a post/bar rebound never reaches a crossing.
        const rB = GOALFX.ballR;
        const tr0R = _p0.x - rB, tr1R = b.x - rB;   // trailing pt vs right plane x=105
        const tr0L = _p0.x + rB, tr1L = b.x + rB;   // trailing pt vs left plane x=0
        let f = -1;
        if (tr0R <= 105 && tr1R > 105) f = (105 - tr0R) / (tr1R - tr0R);
        else if (tr0L >= 0 && tr1L < 0) f = tr0L / (tr0L - tr1L);
        if (f >= 0 && f <= 1) {                      // crossing this step: check aperture at TOI
          const yc = _p0.y + (b.y - _p0.y) * f, zc = _p0.z + (b.z - _p0.z) * f;
          if (yc - rB >= 30.34 && yc + rB <= 37.66 && zc + rB <= 2.44 && zc >= 0)
            t.last = "GOAL!";
        }
      }
      // NET PHYSICS V2: continuous two-sided swept membrane collision. Runs
      // for BOTH goals; goal status is never consulted (containment is purely
      // the membrane). The old discrete node-proximity + scripted t.net catch
      // is retired.
      netV2Collide(b, _p0);
      }   // end free-ball block (no keeper contact, or the remainder of a contact tick)
    } else if (Math.hypot(b.vx, b.vy) > 0.02) {   // controlled rolling touch travel
      b.x += b.vx * PT_DT; b.y += b.vy * PT_DT;
      const sp2 = Math.hypot(b.vx, b.vy);
      const ns = Math.max(0, sp2 - PT.MU_ROLL * PT_DT);
      b.vx *= ns / sp2; b.vy *= ns / sp2;
    }
  }
}
function drib2LogContact(t, pick) {
  // CONTACT QUALITY METRIC: projected boot contact point vs authoritative
  // ball centre at the touch instant (backing px and apparent ball radii)
  const e = DRIB_LIB[pick.pose];
  const p = t.p, b = t.b;
  const sp = sproj(p.x, p.y);
  const scl = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES;
  const mirror = Math.cos(p.facing) < -0.3;
  const fx = sp.x + (mirror ? -(e.cx - 70) : (e.cx - 70)) * scl;
  const fy = sp.y + (e.cy - 117 + (e.dy || 0)) * scl;
  const bp = sproj3(b.x, b.z, b.y);
  const br = Math.max(2, BALL_VIS_R * S.pxPerM * depthScale(bp.d) * RIG.zoom * RES);
  const distPx = Math.hypot(fx - bp.x, fy - bp.y);
  const rec = { band: t.touchInfo ? (Math.hypot(p.vx, p.vy) < 2.2 ? "slow" :
                Math.hypot(p.vx, p.vy) < 6 ? "jog" : "sprint") : "?",
                kind: t.touchInfo.kind, pose: pick.pose, foot: pick.foot,
                px: +distPx.toFixed(1), radii: +(distPx / br).toFixed(2),
                sector: pick.sector || "-",
                turn: +(t.touchInfo.turn * 57.3).toFixed(0), n: t.touchN };
  (t.contactLog ||= []).push(rec);
  if (t.contactLog.length > 500) t.contactLog.shift();
  t.dbgTouch = { fx, fy, bx: bp.x, by: bp.y, until: t.now + 0.5, rec };
}
function drib3LogContact(t, pick, pres, base) {
  const e = pick.entry;
  const p = t.p, b = t.b;
  const sp = sproj(p.x, p.y);
  const scl = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES;
  const mirror = !!DRIB3_MIRROR[pres];
  const fx = sp.x + (mirror ? -(e.cx - 70) : (e.cx - 70)) * scl;
  const fy = sp.y + (e.cy - 117 + (e.dy || 0)) * scl;
  const bp = sproj3(b.x, b.z, b.y);
  const br = Math.max(2, BALL_VIS_R * S.pxPerM * depthScale(bp.d) * RIG.zoom * RES);
  const distPx = Math.hypot(fx - bp.x, fy - bp.y);
  const rec = { band: pick.band, kind: t.touchInfo.kind, pose: pick.pose, foot: pick.foot,
                dir: pres, px: +distPx.toFixed(1), radii: +(distPx / br).toFixed(2),
                sector: pick.sector, turn: +(t.touchInfo.turn * 57.3).toFixed(0), n: t.touchN };
  (t.contactLog ||= []).push(rec);
  if (t.contactLog.length > 900) t.contactLog.shift();
  t.dbgTouch = { fx, fy, bx: bp.x, by: bp.y, until: t.now + 0.5, rec };
}
function ptView() {   // animation state + artwork choice (pure function)
  const t = S.pt, p = t.p;
  const spd = Math.hypot(p.vx, p.vy);
  const cosf = Math.cos(p.facing);
  if (t.kick) {
    const k = t.kick;
    if (k.noAnim) return { st: "KICK", anim: "idle", f: 0, proto: false };
    const f = Math.min(k.e.n - 1, (k.f0 || 0) + Math.floor((t.now - k.t0) * k.e.fps));
    const st = f < k.e.contact ? "KICK_PREP" :
               f === k.e.contact ? "KICK_CONTACT" : "KICK_FOLLOW";
    return { st, kick: k, f, proto: true, mirror: k.mirror };
  }
  if (t.b.ctrl && spd > IDLE_MAX) {
    const pres = ptPresDir(t);
    const base = DRIB3_MIRROR[pres] || pres;
    const mirror = !!DRIB3_MIRROR[pres];
    let act = null;
    if (t.dribSeq) {
      for (const e2 of t.dribSeq) if (t.now <= e2.until) { act = e2; break; }
      if (!act) act = t.dribSeq[t.dribSeq.length - 1];
    }
    if (base === "east" || pres === "east" || pres === "west") {
      // V2.1 east library (cuts/drags live here)
      if (act && act.pose) return { st: "DRIBBLE", lib: act.pose, proto: true, mirror: pres === "west" };
      if (act && act.kind === "contact3")   // touch happened under another presentation
        return { st: "DRIBBLE", anim: "dribble", f: Math.floor(t.now * DRIBBLE_FPS) % 8, proto: true, mirror: pres === "west" };
      const f = Math.floor(t.now * DRIBBLE_FPS) % 8;
      return { st: "DRIBBLE", anim: "dribble", f, proto: true, mirror: pres === "west" };
    }
    if (DRIB3[base]) {
      if (act && act.kind === "contact3")
        return { st: "DRIBBLE", lib3: act.e, base: act.base, mirror, proto: true };
      // strides: current presentation's dribble stride frames (touch-paced)
      const strides = DRIB3[base].strides;
      const i = act && act.kind === "stride3" ? act.i : Math.floor(t.now * DRIBBLE_FPS);
      return { st: "DRIBBLE", lib3s: strides[((i % strides.length) + strides.length) % strides.length],
               base, mirror, proto: true };
    }
    t.fbN = (t.fbN || 0) + 1;                     // fallback counter (report, §19)
    const f = Math.floor(t.now * JOG_FPS) % 8;
    return { st: "DRIBBLE", anim: spd > JOG_MAX ? "sprint" : "jog", f, proto: false };
  }
  if (spd > IDLE_MAX) {
    const anim = spd > JOG_MAX ? "sprint" : "jog";
    const f = Math.floor(t.now * (anim === "jog" ? JOG_FPS : SPRINT_FPS)) % 8;
    return { st: "RUN", anim, f, proto: false };
  }
  return { st: "IDLE", anim: "idle", f: 0, proto: false };
}
function ptDrawPlayerSprite(dt) {
  const t = S.pt;
  if (!t || !t.on) return;
  const p = t.p, b = t.b;
  const view = ptView();
  const deg = ((p.facing * 180 / Math.PI) % 360 + 360) % 360;
  const sp = sproj(p.x, p.y);
  const s = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES;
  // KICK V2.0.4: eased presentation root offset (H3 geometry). Draw-only —
  // the authoritative player/ball positions and kick physics never move.
  let rDx = 0, rDy = 0;
  if (view.kick && view.kick.e && view.kick.e.rootOff) {
    const w = (view.kick.e.rootEase && view.kick.e.rootEase[view.f]) || 0;
    rDx = view.kick.e.rootOff[0] * w * s;
    rDy = view.kick.e.rootOff[1] * w * s;
  }
  const ax = Math.round(sp.x + (view.mirror ? -rDx : rDx)), ay = Math.round(sp.y + rDy);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ax, ay, 9 * s, Math.max(1.5, 9 * s * flattenAt(p.x, p.y)), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
  ctx.restore();
  let im = null;
  let libDy = null;
  if (view.kick) {
    const k = view.kick;
    im = k.e.legacy ? (S.anims[k.e.legacy].east && S.anims[k.e.legacy].east[view.f])
                    : (S.images.kick && S.images.kick[k.e.set] && S.images.kick[k.e.set][view.f]);
    libDy = 0;
  }
  if (view.lib3) { im = S.images.drib3 && S.images.drib3[view.base] && S.images.drib3[view.base][view.e ? view.e.f : ""]; }
  if (view.lib3 && !im && view.lib3.f) im = S.images.drib3 && S.images.drib3[view.base] && S.images.drib3[view.base][view.lib3.f];
  if (view.lib3 && im) libDy = (view.lib3.dy || 0);
  if (!im && view.lib3s) { im = S.images.drib3 && S.images.drib3[view.base] && S.images.drib3[view.base][view.lib3s]; libDy = 0; }
  if (!im && view.lib) im = drib2Img(view.lib);
  else if (!im && view.proto && view.anim) im = S.anims[view.anim].east && S.anims[view.anim].east[view.f];
  else if (view.anim) {
    const frames = S.anims[view.anim] && S.anims[view.anim][headingToDir(deg)];
    im = frames && frames[view.f % frames.length];
  }
  if (im) {
    const foot = im.height / 2 + S.pivots.foot_offset_base128;
    const dy = libDy !== null ? libDy * s :
      view.lib ? (DRIB_LIB[view.lib].dy || 0) * s :
      (view.proto && ANIM_ALIGN[view.anim] ? (ANIM_ALIGN[view.anim][view.f] || 0) * s : 0);
    if (view.mirror) {
      ctx.save(); ctx.scale(-1, 1);
      ctx.drawImage(im, Math.round(-ax - (im.width / 2) * s), Math.round(ay - foot * s + dy),
                    Math.round(im.width * s), Math.round(im.height * s));
      ctx.restore();
    } else {
      ctx.drawImage(im, Math.round(ax - (im.width / 2) * s), Math.round(ay - foot * s + dy),
                    Math.round(im.width * s), Math.round(im.height * s));
    }
  }
}
function drawPlaytest(dt) {
  const t = S.pt;
  if (!t || !t.on) return;
  const p = t.p, b = t.b;
  // GOAL FRAME V1 (gated): with depth-correct occlusion on, the player and
  // ball sprites are drawn from the main depth-sorted entity loop instead
  // of on top of everything; this block keeps the HUD/debug overlays only.
  if (!GOALFX.occlusion) {
    // depth order: a ball north of the player is BEHIND him — draw it first
    t._ballBehind = b.y < p.y - 0.05 && b.z < 1.6;
    if (t._ballBehind) drawBallAt(b.x, b.y, b.z, Math.hypot(b.vx, b.vy), dt);
    ptDrawPlayerSprite(dt);
    if (!t._ballBehind) drawBallAt(b.x, b.y, b.z, Math.hypot(b.vx, b.vy), dt);
  }
  if (S.dbg.dribsync && t.dbgTouch && t.now <= t.dbgTouch.until) {
    const g = t.dbgTouch;
    ctx.strokeStyle = "rgba(120,255,160,0.95)"; ctx.lineWidth = PXQ;
    ctx.beginPath(); ctx.moveTo(g.fx, g.fy); ctx.lineTo(g.bx, g.by); ctx.stroke();
    ctx.fillStyle = "#8dffb0";
    ctx.beginPath(); ctx.arc(g.fx, g.fy, 3 * PXQ, 0, Math.PI * 2); ctx.fill();
    ctx.font = uipx(10) + "px monospace";
    ctx.fillText(`#${g.rec.n} ${g.rec.foot} ${g.rec.pose} ${g.rec.kind} ` +
      `${g.rec.px}px ${g.rec.radii}R turn ${g.rec.turn}°`, g.bx + 8, g.by - 8);
  }
  // HUD readout
  const view = ptView();
  const art = view.proto ? ("PROTOTYPE EAST ANIM" + (view.mirror ? " (MIRRORED WEST)" : ""))
                         : "FALLBACK directional art";
  const cd = t.kick && !t.kick.kicked ? ("contact in " + (t.kick.kickAt - t.now).toFixed(2) + " s")
           : t.kick ? "KICKED (follow-through)" : "-";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd34d"; ctx.font = "bold " + uipx(20) + "px ui-monospace, monospace";
  ctx.fillText("SINGLE PLAYER TEST", cv.width / 2, uipx(78));
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffd34d"; ctx.font = "bold " + uipx(13) + "px ui-monospace, monospace";
  ctx.fillText("PLAYER TEST — SINGLE PLAYER  (WASD move · Shift sprint · X pass · Z shoot · C loft · F foot · R reset · Esc exit · SHOWCASE 1 inside 2 laces 3 power 4 trivela 5 chip 6 sequence)",
               uipx(14), cv.height - uipx(120));
  ctx.fillStyle = "#9fe8ff"; ctx.font = uipx(12) + "px ui-monospace, monospace";
  ctx.fillText(`anim ${view.st}  f${view.f}   art: ${art}`, uipx(14), cv.height - uipx(102));
  ctx.fillText(`has ball ${b.ctrl ? "YES" : "no"}   player ${Math.hypot(p.vx, p.vy).toFixed(1)} m/s` +
               `   ball ${Math.hypot(b.vx, b.vy).toFixed(1)} m/s  z ${b.z.toFixed(2)} m`,
               uipx(14), cv.height - uipx(86));
  ctx.fillText(`last action: ${t.last}   kick sync: ${cd}`, uipx(14), cv.height - uipx(70));
  {                                    // TEMPORARY review readouts (X3 curve + GK positioning/SET depth)
    const prev = ctx.fillStyle, xc = ptX3();
    const _gk = S.pt && S.pt.gk, _b = S.pt && S.pt.b, M = GK_MOUTH;
    const _ang = _b ? Math.abs(Math.atan2(_b.y - M.centerY, M.lineX - _b.x)) * 180 / Math.PI : 0;
    ctx.save();                                                     // own backdrop: these rows sit over the pitch
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(uipx(8), cv.height - uipx(260), uipx(720), uipx(72));
    ctx.restore();
    ctx.fillStyle = GK_POSMODEL.active === "NEW" ? "#b0ffd0" : "#ffd0a0";
    ctx.fillText(`GK POSITION: ${GK_POSMODEL.active}   (${GK_POSMODEL.label[GK_POSMODEL.active]}   ] toggles)`,
                 uipx(14), cv.height - uipx(248));
    ctx.fillText(`SET DEPTH: ${GK_SETDEPTH.cands[GK_SETDEPTH.active].label}   (= cycles D0/D1/D2/D3)`,
                 uipx(14), cv.height - uipx(232));
    ctx.fillText(`depth = ${_gk ? (M.lineX - _gk.x).toFixed(2) : "-.--"} m      angle = ${_ang.toFixed(1)}\u00b0` +
                 `      ball ${_b ? Math.hypot(M.lineX - _b.x, _b.y - M.centerY).toFixed(2) : "-.--"} m` +
                 `      off-centre ${_gk ? (_gk.y - M.centerY).toFixed(2) : "-.--"} m`,
                 uipx(14), cv.height - uipx(216));
    ctx.fillStyle = PT_X3.active === "D" ? "#9fe8ff" : "#ffb0f0";
    ctx.fillText(`INSIDE_R curve: ${xc.label}   k ${ptX3K().toFixed(4)}   ([ cycles A 0.50 / B 0.55 / C 0.60 / D 1.00 PROD)`,
                 uipx(14), cv.height - uipx(200));
    ctx.fillStyle = prev;
  }
  // authoritative possession readout (audit tooling): state is the ball's
  // own ctrl/flight fields, never inferred from proximity
  const bstate = t.net ? "IN_NET" : b.ctrl ? "CONTROLLED" :
                 (b.z > 0.05 || b.vz > 0.001) ? "IN_FLIGHT" : "LOOSE";
  const bfd = Math.hypot(p.x - b.x, p.y - b.y);
  ctx.fillStyle = "#b7ffb7";
  const deg2 = (a) => a === null || a === undefined ? "-" : ((a * 57.296 % 360 + 360) % 360).toFixed(0);
  const velDir = Math.hypot(p.vx, p.vy) > 0.3 ? Math.atan2(p.vy, p.vx) : null;
  ctx.fillStyle = "#9fc4ff";
  ctx.fillText(`LOCO  input ${deg2(t.inDir)}° · facing ${deg2(p.facing)}° · vel ${deg2(velDir)}° · ` +
    `speed ${Math.hypot(p.vx, p.vy).toFixed(1)} m/s · turn ${t.inDir !== null && velDir !== null ?
      (Math.abs(((t.inDir - velDir) + Math.PI * 3) % (2 * Math.PI) - Math.PI) * 57.3).toFixed(0) : "-"}°`,
    uipx(14), cv.height - uipx(22));
  const ki = t.kickInfo || {};
  ctx.fillStyle = "#ffc4e0";
  // PREFERRED FOOT KICK ROUTING readout (explicit; persists after the kick)
  ctx.fillText(`KICK  technique ${ki.tech || "-"} · PREFERRED ${t.pfoot || "R"} (F toggles) · SELECTED ${ki.foot || "-"} · ` +
    `ASSET ${ki.asset || "-"} · CONTACT FOOT ${ki.contactFoot || "-"} · FALLBACK ${ki.fb === undefined ? "-" : ki.fb ? "YES" : "no"}` +
    `${ki.noAnim ? " (NO-ANIM)" : ""} · action ${ki.fam || "-"} · contact err ${ki.errR !== undefined ? ki.errR + "R" : "-"}`,
    uipx(14), cv.height - uipx(6));
  // VARIABLE SHOT CHARGE readout: live while holding, stored after release
  ctx.fillStyle = "#c9f0a8";
  const liveC = t.charge ? ptChargeValue(t.charge.spec, (t.now - t.charge.t0) * 1000) : null;
  ctx.fillText(t.charge
    ? `CHARGE  holding ${t.charge.key.toUpperCase()} · ${((t.now - t.charge.t0) * 1000).toFixed(0)} ms · c=${liveC.toFixed(2)} (release to kick)`
    : `CHARGE  last: hold ${ki.holdMs !== null && ki.holdMs !== undefined ? ki.holdMs + " ms" : "-"} · c=${ki.charge ?? "-"} · ` +
      `v0 ${ki.v0 !== undefined ? ki.v0 + " m/s" : "-"} · vz ${ki.vz !== undefined ? ki.vz + " m/s" : "-"} · elev ${ki.elevDeg !== undefined ? ki.elevDeg + "°" : "-"}`,
    uipx(14), cv.height - uipx(136));
  // TARGET-SOLVED INSIDE_R readout: the preview target is a sandbox-only
  // proxy (natural carry or the G-key review override) — NOT real aim input
  ctx.fillStyle = "#a8d8f0";
  const tgtMode = t.tgtOverride == null ? "AUTO" : t.tgtOverride + "m";
  let tline = `PREVIEW TARGET: ${tgtMode} (G cycles AUTO/10/15/20/25/30 — sandbox review only)`;
  if (ki.tgtD !== undefined) {
    if (ki.tgtPreview && ki.tgtClamped)
      tline += ` · TARGET ${ki.tgtD}m — UNREACHABLE AT THIS CHARGE — SOLVING AT MAX REACH ${ki.tgtSolved}m · SETUP: ${ki.setupDeg}°`;
    else if (ki.tgtPreview)
      tline += ` · SOLVED DISTANCE: ${ki.tgtSolved}m · SETUP: ${ki.setupDeg}°`;
    else
      tline = `TARGET: ${ki.tgtD}m (authoritative) · SOLVED DISTANCE: ${ki.tgtSolved}m · SETUP: ${ki.setupDeg}°`;
  }
  ctx.fillText(tline, uipx(14), cv.height - uipx(152));
  // GOAL FRAME V1 review readout: active restitution candidate + last impact
  ctx.fillStyle = "#ffd9a8";
  const fh = t.b && t.b.frameHit;
  ctx.fillText(`FRAME  rigid post/crossbar · e=${GOALFX.e.toFixed(2)} · N fires synthetic impact` +
    (fh ? ` · last hit ${fh.cap}: in ${Math.hypot(...fh.vIn).toFixed(1)} -> out ${Math.hypot(...fh.vOut).toFixed(1)} m/s (n ${fh.n.map(v => v.toFixed(2)).join(",")})` : " · last hit -"),
    uipx(14), cv.height - uipx(168));
  // NET readout: continuous membrane contact status
  ctx.fillStyle = "#a8f0c4";
  const nh = t.b && t.b.netHit;
  ctx.fillText(`NET  continuous membrane (swept, two-sided, persistent, rippling)` +
    (nh ? ` · last contact goal ${nh.side}` : ""),
    uipx(14), cv.height - uipx(184));
  const ti = t.touchInfo || {};
  ctx.fillStyle = "#ffe9a8";
  ctx.fillText(`TOUCH  desired ${ti.sc !== undefined ? ti.sc.toFixed(2) : "-"} m · last dist ` +
    `${ti.d !== undefined ? ti.d.toFixed(2) : "-"} m · interval ${ti.T !== undefined ? ti.T.toFixed(2) : "-"} s · ` +
    `turn ${((t.liveTurn || 0) * 57.3).toFixed(0)}° · ${ti.kind || "-"} ${ti.foot || ""} ${ti.pose || ""} · timer ${Math.max(0, p.touchT).toFixed(2)}`,
    uipx(14), cv.height - uipx(38));
  ctx.fillStyle = "#b7ffb7";
  ctx.fillText(`BALL STATE: ${bstate}` +
    (b.ctrl ? `   CARRIER: PLAYER 1   CONTROL TIME ${(t.now - t.ctrlSince).toFixed(1)} s` +
              `   CONTROL: ${t.ctrlState || "-"}` : "") +
    `   BALL-TO-FOOT ${bfd.toFixed(2)} m`, uipx(14), cv.height - uipx(54));
}
// ═══ ANIMATION PROTOTYPE SHOWCASE (key P) — renderer-local, deterministic ═══
// Synthetic test puppet demonstrating the explicit animation states
//   IDLE / RUN / DRIBBLE / SHOOT_APPROACH / SHOOT_CONTACT / SHOOT_FOLLOWTHROUGH
// on a fixed timeline. The puppet NEVER touches authoritative match state;
// its ball is a synthetic visual (same deterministic physics constants as
// the ball tests). SYNC ARCHITECTURE: the kick instant is scheduled first
// (kickT); the shoot animation is entered at kickT - CONTACT_FRAME/SHOOT_FPS
// so the authored contact frame is on screen exactly when the (synthetic)
// kick impulse launches the ball — the same contract a real engine kick
// event will use. Zero RNG: every timing below is a fixed constant.
const ANIM_ALIGN = {   // per-frame vertical alignment, source px (draw-time
  // translation only; frozen originals untouched). +down. Brings each
  // frame's ground row into the accepted 115-119 band (anchor row 117).
  dribble: [-2, -2, 0, 0, 0, 0, 0, 0],
  shoot:   [0, 0, 0, 5, 5, 5, 5, 5, 5, 0],
};
const SHOOT_FPS = 12, DRIBBLE_FPS = 10, SHOOT_CONTACT_FRAME = 6;
const AT = {           // timeline (seconds from test start; all fixed)
  idle0: 0.0, run: 1.5, dribble: 4.0, approach: 7.6,
  kickT: 7.6 + SHOOT_CONTACT_FRAME / SHOOT_FPS,          // 8.1
  end: 12.0,
  runFrom: 71.0, dribFrom: 79.75, strike: 87.5, y: 34.0,
};
function startAnimTest() {
  S.animTest = { age: 0, ball: { p: [AT.dribFrom + 0.6, AT.y, 0], v: [0, 0, 0] },
                 touches: 0, launched: false };
}
function animTestState(age) {
  if (age < AT.run) return { st: "IDLE", anim: "idle", f: 0, x: AT.runFrom, moving: false };
  if (age < AT.dribble) {
    const u = age - AT.run;
    return { st: "RUN", anim: "jog", f: Math.floor(u * JOG_FPS) % 8,
             x: AT.runFrom + u * 3.5, moving: true };
  }
  if (age < AT.approach) {
    const u = age - AT.dribble;
    return { st: "DRIBBLE", anim: "dribble", f: Math.floor(u * DRIBBLE_FPS) % 8,
             x: AT.dribFrom + u * 2.0, moving: true };
  }
  const u = age - AT.approach;
  const f = Math.min(9, Math.floor(u * SHOOT_FPS));
  const st = f < SHOOT_CONTACT_FRAME ? "SHOOT_APPROACH" :
             f === SHOOT_CONTACT_FRAME ? "SHOOT_CONTACT" : "SHOOT_FOLLOWTHROUGH";
  return { st, anim: "shoot", f, x: AT.strike - 0.55, moving: false };
}
function animTestStep() {
  const t = S.animTest, dt = NETPHYS.dt;
  if (!t) return;
  t.age += dt;
  const b = t.ball;
  // dribble touches: fixed cadence, ball nudged ahead like carry_touch
  if (t.age >= AT.dribble && t.age < AT.approach) {
    const k = Math.floor((t.age - AT.dribble) / 0.4);       // a touch each 0.4 s
    if (k > t.touches) { t.touches = k; b.v[0] = 3.1; }
  }
  if (t.age >= AT.approach && t.age < AT.kickT && !t.launched) {
    b.p[0] = AT.strike; b.p[1] = AT.y; b.v[0] = b.v[1] = 0;  // teed for the strike
  }
  if (t.age >= AT.kickT && !t.launched) {                    // CONTACT: launch
    t.launched = true;
    b.v[0] = 19.0; b.v[1] = 0.4; b.v[2] = 2.4;
  }
  const G = 9.81, REST = 0.55, MU = 4.2, SETTLE = 0.9;       // ball-test constants
  if (b.p[2] > 0 || b.v[2] > 0) {
    b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt; b.p[2] += b.v[2] * dt;
    b.v[2] -= G * dt;
    if (b.p[2] <= 0 && b.v[2] < 0) {
      b.p[2] = 0;
      const r = -b.v[2] * REST;
      if (r < SETTLE) b.v[2] = 0; else { b.v[2] = r; b.v[0] *= 0.8; b.v[1] *= 0.8; }
    }
  } else {
    const sp = Math.hypot(b.v[0], b.v[1]);
    if (sp > 0.02) {
      const ns = Math.max(0, sp - MU * dt);
      b.v[0] *= ns / sp; b.v[1] *= ns / sp;
      b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt;
    } else { b.v[0] = b.v[1] = 0; }
  }
  if (t.age > AT.end) S.animTest = null;
}
function drawAnimTest(dt) {
  const t = S.animTest;
  if (!t) return;
  const v = animTestState(t.age);
  const frames = S.anims[v.anim] && S.anims[v.anim].east;
  const sp = sproj(v.x, AT.y);
  const s = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES;
  const ax = Math.round(sp.x), ay = Math.round(sp.y);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ax, ay, 9 * s, Math.max(1.5, 9 * s * flattenAt(v.x, AT.y)), 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
  ctx.restore();
  if (frames && frames[v.f]) {
    const im = frames[v.f];
    const foot = im.height / 2 + S.pivots.foot_offset_base128;
    const dy = (ANIM_ALIGN[v.anim] ? ANIM_ALIGN[v.anim][v.f] || 0 : 0) * s;
    ctx.drawImage(im, Math.round(ax - (im.width / 2) * s),
                  Math.round(ay - foot * s + dy),
                  Math.round(im.width * s), Math.round(im.height * s));
  }
  drawBallAt(t.ball.p[0], t.ball.p[1], t.ball.p[2],
             Math.hypot(t.ball.v[0], t.ball.v[1]), dt);
  ctx.fillStyle = "#ffd34d"; ctx.font = "bold " + uipx(13) + "px ui-monospace, monospace";
  ctx.fillText("ANIMATION PROTOTYPE — SYNTHETIC (" + v.st + "  frame " + v.f +
    (t.age < AT.kickT ? "  kick in " + (AT.kickT - t.age).toFixed(2) + "s" : "  KICKED") + ")",
    uipx(14), cv.height - uipx(88));
}
// ═══ PLAYER PHYSICAL OCCUPANCY debug overlay (engine-authoritative data) ═════
// Mirrors world.py BODY_R — keep in sync with the engine constant.
const OCC_BODY_R = 0.32;
function drawOccDebug(sample) {
  const occ = sample.occ;
  const byIdx = {};
  for (const p of sample.players) byIdx[p.idx] = p;
  for (const p of sample.players) {
    const st = occ && occ.p && occ.p[p.idx] ? occ.p[p.idx][4] : 0;
    ctx.strokeStyle = st === 2 ? "rgba(255,80,80,0.95)" :
                      st === 1 ? "rgba(255,220,80,0.95)" : "rgba(200,200,200,0.55)";
    ctx.lineWidth = PXQ;
    ctx.beginPath();
    for (let k = 0; k <= 14; k++) {
      const a = k / 14 * Math.PI * 2;
      const q = sproj3(p.x + OCC_BODY_R * Math.cos(a), 0, p.y + OCC_BODY_R * Math.sin(a));
      if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    if (occ && occ.p && occ.p[p.idx]) {
      const [dvx, dvy, avx, avy] = occ.p[p.idx];
      const o = sproj3(p.x, 0, p.y);
      const dtip = sproj3(p.x + dvx * 0.6, 0, p.y + dvy * 0.6);
      const atip = sproj3(p.x + avx * 0.6, 0, p.y + avy * 0.6);
      ctx.strokeStyle = "rgba(255,220,80,0.9)"; ctx.lineWidth = PXQ;        // desired
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(dtip.x, dtip.y); ctx.stroke();
      ctx.strokeStyle = "rgba(110,255,140,0.9)"; ctx.lineWidth = PXQ * 2;   // resolved
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(atip.x, atip.y); ctx.stroke();
    }
  }
  if (occ && occ.c) for (const [ia, ic, penmm] of occ.c) {
    const a = byIdx[ia], c = byIdx[ic];
    if (!a || !c) continue;
    const pa = sproj3(a.x, 0, a.y), pc = sproj3(c.x, 0, c.y);
    ctx.strokeStyle = "rgba(255,90,90,0.9)"; ctx.lineWidth = PXQ;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pc.x, pc.y); ctx.stroke();
    if (penmm > 0.5) {
      ctx.fillStyle = "#ff9a9a"; ctx.font = uipx(9) + "px monospace"; ctx.textAlign = "center";
      ctx.fillText(penmm.toFixed(1) + "mm", (pa.x + pc.x) / 2, (pa.y + pc.y) / 2 - 4);
      ctx.textAlign = "left";
    }
  }
  ctx.fillStyle = "#cfe8cf"; ctx.font = uipx(11) + "px ui-monospace, monospace";
  ctx.fillText("OCCUPANCY DEBUG — circle 0.32 m body · yellow=desired v · green=resolved v · " +
               "red ring=blocked, yellow ring=sliding · red link=contact (1 Hz sample)",
               uipx(14), cv.height - uipx(70));
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
  if (typeof gk3dOwnsBall === "function" && gk3dOwnsBall()) return;   // SKELETAL_3D backend renders the ball as 3D geometry near / in the keeper's hands (presentation only)
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
  S.frameNo = (S.frameNo || 0) + 1;    // per-frame cache key (net projections)
  ctx.imageSmoothingEnabled = false;
  const bg = ctx.createLinearGradient(0, 0, 0, cv.height);
  bg.addColorStop(0, "#0a0b10"); bg.addColorStop(0.5, "#12141b"); bg.addColorStop(1, "#0b0e12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cv.width, cv.height);
  drawGroundPerspective();
  drawStadium();
  drawFarBarrier();
  drawMarkings();
  if (S.dbg.occ && sample) drawOccDebug(sample);
  if (S.dbg.grid) drawGrid();
  const ents = [];
  if (sample && !(S.pt && S.pt.on)) {
    for (const p of sample.players) ents.push({ y: p.y, p });
    ents.push({ y: sample.ball.y, ball: sample.ball });
  }
  for (const g of S.goalPanels) {
    if (!GOALFX.occlusion) { ents.push({ y: g.sortY, goal: g }); continue; }
    // GOAL FRAME V1: the goal participates in world depth as PARTS —
    // net strand patches (classified per segment by CURRENT deformed y, so
    // ordering stays correct while the net displaces), art-panel y-bands,
    // and continuous-path frame slices. Nearer geometry wins everywhere.
    const gx = g.gx;
    for (const [lo, hi, sy] of GOALFX.netBands)
      ents.push({ y: sy, netPatch: { g, lo, hi } });
    ents.push({ y: 37.66 - 0.001, artPart: { g, panel: "side", lo: -1e9, hi: 1e9 } });
    // roof/mouth rail art is co-planar with the white frame, so it is banded
    // with the SAME boundaries as the frame slices and biased to draw just
    // BEFORE the frame in each band — the frame stays the nearest structure
    // within its own depth band, exactly as in the single-path renderer.
    // roof/mouth rail art in y-bands, each drawn just before the frame there
    for (const [lo, hi, sy] of GOALFX.artBands)
      for (const pn of ["roof", "mouth"])
        ents.push({ y: sy - 0.001, artPart: { g, panel: pn, lo, hi } });
    // FRAME AS CONTINUOUS POLYLINES (single strokes -> zero internal seams,
    // round JOINS at corners exactly like the original single-path
    // drawGoalFrame). Per-segment crossbar rendering was the sole source of
    // the dark-rim seam ticks AND the far-junction kink (two separate round
    // CAPS meeting at an angle notched); diagnosed 2026-09-01, net/art/depth
    // ruled out. The frame is the mouth-plane rigid structure, always in
    // front of the net it fronts, so it sorts AFTER every net patch (max net
    // sortY 37.4).
    //   Member A = far post + crossbar as ONE path (clean round join at the
    //   far-post/crossbar junction). Drawn at 37.5 (front of all net).
    //   Member B = near post, its OWN depth (37.66) so a ball/player at the
    //   near post still interleaves correctly (the approved occlusion case).
    // The near junction is two round caps meeting (unchanged, already clean).
    ents.push({ y: 37.5, frameMember: [[gx, 0, 30.34], [gx, 2.44, 30.34], [gx, 2.44, 37.66]], cap: "round" });
    ents.push({ y: 37.66, frameMember: [[gx, 0, 37.66], [gx, 2.44, 37.66]], cap: "round" });
  }
  if (GOALFX.occlusion && S.pt && S.pt.on) {
    // playtest sprites join the SAME depth sort instead of drawing on top
    ents.push({ y: S.pt.p.y, ptP: true });
    ents.push({ y: S.pt.b.y, ptB: true });
    if (S.pt.gk) ents.push({ y: S.pt.gk.y, ptGk: true });   // GK V1 placeholder joins depth sort
  }
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.p) drawPlayer(e.p, dt);
    else if (e.ball) drawBall(e.ball, dt);
    else if (e.netPatch) drawGoalNet(e.netPatch.g, e.netPatch.lo, e.netPatch.hi);
    else if (e.artPart) drawGoalArtCells(e.artPart.g, e.artPart.panel, e.artPart.lo, e.artPart.hi);
    else if (e.frameMember) drawGoalFrameMember(e.frameMember, e.cap);
    else if (e.ptP) ptDrawPlayerSprite(dt);
    else if (e.ptB) { const b = S.pt.b; drawBallAt(b.x, b.y, b.z, Math.hypot(b.vx, b.vy), dt); }
    else if (e.ptGk) ptDrawKeeper(dt);
    else drawGoal(e.goal);
  }
  drawNetTestBall();
  drawBallTest(dt);
  drawAnimTest(dt);
  drawBallSeq(dt);
  drawPlaytest(dt);
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
  const PT_KEYMAP = { w: "up", arrowup: "up", s: "down", arrowdown: "down",
                      a: "left", arrowleft: "left", d: "right", arrowright: "right",
                      shift: "sprint" };
  document.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
    if (S.pt && S.pt.on) {           // inside the playtest ALL keys belong to it
      const k = e.key.toLowerCase();
      if (PT_KEYMAP[k]) { S.pt.keys[PT_KEYMAP[k]] = true; e.preventDefault(); }
      else if (k === "escape") ptExit();
      else if (k === "r") ptReset();
      else if (k === "f") { S.pt.pfoot = (S.pt.pfoot === "L" ? "R" : "L");
        S.pt.last = "PREFERRED FOOT -> " + S.pt.pfoot; }
      else if (k === "6") ptShowcaseSeq();            // side-by-side sequence
      else if (k === "n") ptFrameTestFire(S.pt);   // synthetic frame-impact tester (review tooling)
      else if (k === "g") {
        // REVIEW-ONLY preview-target cycle (sandbox test tooling — never a
        // production input): overrides only the synthetic preview distance
        // fed to the INSIDE_R setup lookup. AUTO = natural-carry proxy.
        const seq = [null, 10, 15, 20, 25, 30];
        S.pt.tgtOverride = seq[(seq.indexOf(S.pt.tgtOverride ?? null) + 1) % seq.length];
        S.pt.last = "PREVIEW TARGET -> " + (S.pt.tgtOverride == null ? "AUTO" : S.pt.tgtOverride + "m");
      }
      else if (k === "k") ptGkScenario(S.pt.gkScenario == null ? 0 : S.pt.gkScenario + 1);  // GK shot scenario cycle
      else if (k === "q") {                                                                   // Stage-4 acceptance battery cycle (the stage4-flagged group)
        const first = GK_SCENARIOS.findIndex(s => s.stage4), n4 = GK_SCENARIOS.length - first, cur = S.pt.gkScenario;
        ptGkScenario((cur == null || cur < first) ? first : first + ((cur - first + 1) % n4));
      }
      else if (k === "j") ptGkStudy(S.pt.gkStudyIdx == null ? 0 : S.pt.gkStudyIdx + 1);      // GK positioning-study cycle
      else if (k === "=") {                                                                   // normal SET depth candidate (review): D0/D1/D2/D3
        const O = GK_SETDEPTH.order; GK_SETDEPTH.active = O[(O.indexOf(GK_SETDEPTH.active) + 1) % O.length];
        S.pt.last = "GK SET DEPTH -> " + GK_SETDEPTH.cands[GK_SETDEPTH.active].label;
      }
      else if (k === "]") {                                                                   // positioning model A/B (review): NEW surface vs OLD Q2.5
        const O = GK_POSMODEL.order; GK_POSMODEL.active = O[(O.indexOf(GK_POSMODEL.active) + 1) % O.length];
        S.pt.last = "GK POSITIONING MODEL -> " + GK_POSMODEL.label[GK_POSMODEL.active];
      }
      else if (k === "[") {                                                                   // TEMPORARY X3 curve-magnitude calibration (review only)
        const O = PT_X3.order; PT_X3.active = O[(O.indexOf(PT_X3.active) + 1) % O.length];
        const c = ptX3();
        S.pt.last = "INSIDE_R CURVE -> " + c.label + "  (k " + ptX3K().toFixed(4) + ", target setup surface re-solved)";
      }
      else if (k === "o") {                                                                   // gk_positioning LOW/MED/HIGH
        const L = [30, 60, 90], cur = L.indexOf(S.pt.gkPos);
        S.pt.gkPos = L[(cur + 1) % L.length];
        S.pt.last = "GK POSITIONING -> " + (S.pt.gkPos <= 30 ? "LOW" : S.pt.gkPos >= 90 ? "HIGH" : "MED") + " (" + S.pt.gkPos + ")";
      }
      else if (k === "i") {                                                                   // gk_reflexes LOW/MED/HIGH (reaction latency)
        const L = [30, 60, 90], cur = L.indexOf(S.pt.gkReflex); S.pt.gkReflex = L[(cur + 1) % L.length]; S.pt.gkCap = "manual";
        const lat = (GK_REACH.reactionBase - GK_REACH.reactionReflexGain * gkNorm01(S.pt.gkReflex)) * 1000;
        S.pt.last = "GK REFLEXES -> " + (S.pt.gkReflex <= 30 ? "LOW" : S.pt.gkReflex >= 90 ? "HIGH" : "MED") + " (" + S.pt.gkReflex + ") latency " + lat.toFixed(0) + " ms [manual]";
      }
      else if (k === "u") {                                                                   // gk_diving LOW/MED/HIGH (reach envelope)
        const L = [30, 60, 90], cur = L.indexOf(S.pt.gkDiving); S.pt.gkDiving = L[(cur + 1) % L.length]; S.pt.gkCap = "manual";
        S.pt.last = "GK DIVING -> " + (S.pt.gkDiving <= 30 ? "LOW" : S.pt.gkDiving >= 90 ? "HIGH" : "MED") + " (" + S.pt.gkDiving + ") [manual]";
      }
      else if (k === "y") {                                                                   // keeper height short/avg/tall
        const L = [178, 188, 198], cur = L.indexOf(S.pt.gkHeight); S.pt.gkHeight = L[(cur + 1) % L.length]; S.pt.gkCap = "manual";
        S.pt.last = "GK HEIGHT -> " + (S.pt.gkHeight <= 178 ? "SHORT" : S.pt.gkHeight >= 198 ? "TALL" : "AVG") + " (" + S.pt.gkHeight + " cm) [manual]";
      }
      else if (k === "h") {                                                                   // wrong-way momentum preset (applied at next shot)
        const L = ["SET", "TOWARD", "AWAY"], cur = L.indexOf(S.pt.gkMomentum); S.pt.gkMomentum = L[(cur + 1) % L.length];
        S.pt.last = "GK MOMENTUM (next shot) -> " + S.pt.gkMomentum;
      }
      else if (k === "m") { S.pt.paused = !S.pt.paused; S.pt.last = "PLAYTEST " + (S.pt.paused ? "PAUSED" : "RESUMED"); e.preventDefault(); }  // pause
      else if (k === ",") { const L = [1, 0.5, 0.25, 0.1], cur = L.indexOf(S.pt.slow || 1); S.pt.slow = L[(cur + 1) % L.length]; S.pt.last = "SLOW-MO " + S.pt.slow + "x (review playback only — the 60 Hz simulation step is unchanged)"; }  // slow-mo (GK Animation V1 review: 1 / 0.5 / 0.25 / 0.1)
      else if (k === ".") { S.pt._stepOne = true; S.pt.last = "STEP 1 frame"; }               // single-step (use while paused)
      else if (k === "p") {                                                                    // positioning candidate — review set Q2 / Q2.5 / Q3
        const L = ["Q2", "Q25", "Q3"], cur = L.indexOf(S.pt.gkPosQ); S.pt.gkPosQ = L[(cur + 1) % L.length] || "Q25";
        const Qc = GK_Q[S.pt.gkPosQ];
        S.pt.gkPosCand = Qc.depthCand; S.pt.gkDepth = GK_DEPTH_CANDS[Qc.depthCand];           // Q sets its own depth family (P4 baseline)
        S.pt.last = "GK POSITIONING -> " + (S.pt.gkPosQ === "Q25" ? "Q2.5" : S.pt.gkPosQ) + " (" + Qc.name + ")";
      }
      else if (k === "b") {                                                                    // pre-commit response policy (M6 reference; M2–M5 comparison)
        const L = ["M6", "M2", "M3", "M4", "M5"], cur = L.indexOf(S.pt.gkMovePolicy); S.pt.gkMovePolicy = L[(cur + 1) % L.length] || "M6";
        const desc = { M6: "READ→PREPARE→COMMIT (no post-shot tracking)", M2: "SET-disciplined shuffle (legacy)", M3: "damped tracking (legacy)", M4: "strongly damped (legacy)", M5: "near-locked (legacy)" };
        S.pt.last = "GK PRE-COMMIT -> " + S.pt.gkMovePolicy + " (" + desc[S.pt.gkMovePolicy] + ")";
      }
      else if (k === "e") {                                                                    // hand-contact volume — review set H3 / H4 / H5
        const L = ["H3", "H4", "H5"], cur = L.indexOf(S.pt.gkHand); S.pt.gkHand = L[(cur + 1) % L.length] || "H4";
        const r = GK_HAND[S.pt.gkHand], dia = (r * 200).toFixed(0);
        const desc = { H3: "anatomical", H4: "smaller palm", H5: "conservative" };
        S.pt.last = "GK HAND -> " + S.pt.gkHand + " (" + desc[S.pt.gkHand] + ", ⌀ " + dia + " cm, ball ⌀ 22 cm added separately)";
      }
      else if (k === "l") {                                                                    // keeper PROFILE: K1(reference)/K2/K3 + COURTOIS (diagnostic)
        const L = ["K1", "K2", "K3", "COURTOIS", "POOR", "AVERAGE", "GOOD", "ELITE"], cur = L.indexOf(S.pt.gkCap); S.pt.gkCap = L[(cur + 1) % L.length]; const c = GK_CAP[S.pt.gkCap];
        S.pt.gkReflex = c.reflex; S.pt.gkDiving = c.diving; S.pt.gkHeight = c.height; S.pt.gkJump = c.jump; S.pt.gkHandling = c.handling;
        S.pt.gkWeight = c.weight != null ? c.weight : null;                  // profile-carried physical/movement attributes;
        S.pt.gkAccel = c.acceleration != null ? c.acceleration : null;       // cleared for the bands that do not define them
        S.pt.gkSpeed = c.sprint_speed != null ? c.sprint_speed : null;
        S.pt.gkStrength = c.strength != null ? c.strength : null;
        // FULL goalkeeper reset on a profile change — no state (prediction, commit, contacts, momentum,
        // dive progress) survives from the previous keeper. Mechanics are untouched.
        S.pt.gk = ptGkMake(); S.pt.gk.height = c.height / 100; S.pt.gk.handZ = S.pt.gk.height * GK_CFG.handReachFrac; gkAnimResetView();
        const mv = c.acceleration != null ? "  acc " + c.acceleration + " spd " + c.sprint_speed + " str " + c.strength + " " + c.weight + "kg"
                                          : "  acc/spd/str = reference (band-constant)";
        S.pt.last = "GK PROFILE -> " + S.pt.gkCap + (S.pt.gkCap === "K1" || S.pt.gkCap === "POOR" ? " (weak-keeper anchor fixture)" : S.pt.gkCap === "COURTOIS" ? " (our players.json ratings + real stature; no OVR)" : " (fixture — attributes only, the name means nothing)") +
          "  refl " + c.reflex + " dive " + c.diving + " h " + c.height + "cm jump " + c.jump + " handling " + c.handling + mv + "  [keeper fully reset]";
      }
      else if (k === "t") {                                                                    // gk_handling LOW/MED/HIGH — Stage 4 post-contact control ONLY
        const L = [30, 60, 90], cur = L.indexOf(S.pt.gkHandling); S.pt.gkHandling = L[(cur + 1) % L.length]; S.pt.gkCap = "manual";
        S.pt.last = "GK HANDLING -> " + (S.pt.gkHandling <= 30 ? "LOW" : S.pt.gkHandling >= 90 ? "HIGH" : "MED") + " (" + S.pt.gkHandling + ") [manual] — acts only after contact";
      }
      else if (k === ";") {                                                                    // interception-selection policy A/B: S2 (strict-first, default) / S1 (legacy earliest incl. fingertip band)
        const L = ["S2", "S3", "S1"], cur = L.indexOf(S.pt.gkSelect || GK_REACH.selectPolicy); S.pt.gkSelect = L[(cur + 1) % L.length];
        const desc = { S2: "EARLIEST point reachable with margin (norm ≤ " + GK_REACH.selectStrictNorm + "), marginal band fallback, no backward dive [default]", S3: "most COMFORTABLE point (REJECTED in validation: retreats/passive body contacts)", S1: "LEGACY: earliest non-unreachable incl. fingertip band" };
        S.pt.last = "GK INTERCEPTION SELECT -> " + S.pt.gkSelect + " (" + desc[S.pt.gkSelect] + ")";
      }
      else if (k === "v") {                                                                    // Stage-4 review aid: auto-pause at the keeper contact tick
        S.pt.pauseAtContact = !S.pt.pauseAtContact;
        S.pt.last = "PAUSE AT KEEPER CONTACT -> " + (S.pt.pauseAtContact ? "ON (then . step-frame / , slow-mo / M resume)" : "OFF");
      }
      else {
        // VARIABLE SHOT CHARGE V1: kick keys (x/z/c, showcase 1-5) begin
        // charging on keydown and fire on keyup. Auto-repeat is ignored.
        const spec = ptKickSpec(k, S.pt);
        if (spec && !e.repeat) ptChargeBegin(S.pt, k, spec);
      }
      return;
    }
    if (e.key === "0") S.netSlow = !S.netSlow;
    if (e.key === "t") startBallSeq();
    if (e.key === "p") startAnimTest();
    if (e.key >= "6" && e.key <= "9") startBallTest(+e.key);
    else if (e.key === "c") startBallTest("c");
    else if (e.key === "v") startBallTest("v");
    if (e.key >= "1" && e.key <= "4") startNetTest(+e.key);
    else if (e.key === "5") {
      startNetTest(1, NETTEST_POWERS[netTestPowerIdx]);
      netTestPowerIdx = (netTestPowerIdx + 1) % NETTEST_POWERS.length;
    }
  });
  document.addEventListener("keyup", (e) => {
    if (S.pt && S.pt.on) {
      const k = e.key.toLowerCase();
      if (PT_KEYMAP[k]) S.pt.keys[PT_KEYMAP[k]] = false;
      else ptChargeRelease(S.pt, k);                  // charged kick fires here
    }
  });
  window.addEventListener("blur", () => {
    if (S.pt && S.pt.on) { S.pt.keys = {}; S.pt.charge = null; }
  });
  document.getElementById("ptbtn")?.addEventListener("click", () => {
    if (S.pt && S.pt.on) ptExit(); else ptEnter();
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
  for (const id of ["anchors", "ids", "vel", "state", "ball", "track", "goalgeo", "grid", "xform", "cam", "netphys", "occ", "dribsync", "gk", "anim", "gkstick"])
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

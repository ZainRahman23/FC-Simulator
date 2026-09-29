/* Touchline — BROADCAST VIEW EMBED BRIDGE (?embed=1 only).
 *
 * Loaded last by match.html. Inert in the standalone preview (returns at the
 * first line). In embed mode the page becomes a pure renderer driven by the
 * Touchline app through window.TouchlineBroadcast:
 *
 *   ready                         Promise, resolves once assets are loaded and the loop runs
 *   init({home, away, players, roster, act_names, weather, ball})   full reset (new match)
 *   ingest(rows, roster?)         append authoritative frame rows (clock-deduplicated)
 *   reset(clock)                  drop the buffer (rewind / seek / branch)
 *   setClock(clock, {playing, speed})   the app's presentation clock, authoritative per rAF
 *   setPlayers(players)           merge name/team/number/position updates (subs)
 *   setOptions({labels, highlight, weather, ball, visible, quality, zoom})
 *   onPlayerClick = fn(pid)       optional
 *   stats()                       {fps, renderMs, renderP95, frames, head, clock} (diagnostics)
 *
 * PRINCIPLES: presentation only — nothing here writes to the engine or makes
 * a football decision; the app's rows are never mutated. Team kits are a
 * deterministic runtime palette swap into DERIVED canvases (cached per kit x
 * source frame); the frozen PixelLab originals are never modified.
 */
"use strict";
(function () {
  if (typeof EMBED === "undefined" || !EMBED) return;

  // ── state ────────────────────────────────────────────────────────────────
  const DEFAULT_KITS = {
    HOME: { primary: "#d21a16", secondary: "#d21a16", gk: "#2fbf4a" },
    AWAY: { primary: "#1f4fd1", secondary: "#f4f4f4", gk: "#e8d31c" },
  };
  const NEUTRAL_KIT = { primary: "#8e97a3", secondary: "#6b737e", gk: "#8e97a3" };
  const BEHIND_KEEP_S = 30;            // buffer rows kept behind the presentation clock
  const E = {
    booted: false, inited: false, visible: true,
    clock: 0, prevClock: null, playing: false, speed: 1, snap: true,
    labels: "off", highlight: new Set(), zoom: 1, quality: "high",
    teams: { HOME: null, AWAY: null }, players: {}, lastRowClock: -Infinity,
    gkFallback: {}, drawn: [], lastDrawn: [], carrierActs: new Set(),
  };
  const pb = S.pb;
  pb.playing = false;                  // tick() must never advance the head itself
  pb.players = E.players;
  S.dbg.cam = false;                   // rail diagnostic overlay is review-only

  // ── loading / waiting UI ────────────────────────────────────────────────
  const loadEl = document.getElementById("loading");
  if (loadEl && loadEl.firstChild && loadEl.firstChild.nodeType === 3)
    loadEl.firstChild.nodeValue = "Loading broadcast view…";
  const waitEl = document.createElement("div");
  waitEl.id = "embed-wait";
  waitEl.textContent = "Waiting for match…";
  waitEl.style.cssText = "position:absolute;left:50%;bottom:14px;transform:translateX(-50%);" +
    "padding:4px 10px;border-radius:10px;background:rgba(10,14,18,.72);color:#cfd8e2;" +
    "font:11px/1.3 -apple-system,system-ui,sans-serif;pointer-events:none;z-index:4;display:none";
  (document.getElementById("stage") || document.body).appendChild(waitEl);
  function syncWait() {
    const show = E.booted && E.visible && !pb.frames.length;
    const v = show ? "block" : "none";
    if (waitEl.style.display !== v) waitEl.style.display = v;
  }

  // keyboard belongs to the app, never to the review/test hotkeys of the preview
  const eat = (e) => { e.stopImmediatePropagation(); };
  window.addEventListener("keydown", eat, true);
  window.addEventListener("keyup", eat, true);

  // ── colour helpers ──────────────────────────────────────────────────────
  function parseHex(h, fallback) {
    if (typeof h !== "string") return fallback;
    let s = h.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(s)) s = s.split("").map(c => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(s)) return fallback;
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hsl2rgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, hp = ((h % 360) + 360) % 360 / 60;
    const x = c * (1 - Math.abs(hp % 2 - 1)), m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  const cdist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const darken = (c, k) => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];

  // ── KIT MASK (per frozen source frame, deterministic) ───────────────────
  // The accepted character wears a red kit: shirt + shorts share one red
  // ramp (hue <= 8 deg or >= 345 deg, saturation >= 0.6, lightness >= 0.10;
  // measured over every idle/jog/sprint frame). Skin, hair and boots sit at
  // hue 10-35 deg, socks/trim are neutral, outlines are near-black (< 0.10),
  // so none of them match. 4-connected components of the mask: the kit is the
  // big body; stray red-hued specks ABOVE the kit top (lips/eyes) are
  // excluded, specks on/below it (anti-aliased trim) are kept. Shorts vs
  // shirt: pixels below the figure's mid-height (opaque bbox) are shorts —
  // validated visually across all 8 directions of idle/jog/sprint.
  const KIT_REF_L = 0.45;              // lightness of the flat kit red (218,22,19)
  const maskCache = new WeakMap();
  function kitMask(img) {
    let m = maskCache.get(img);
    if (m) return m;
    const W = img.width, H = img.height;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, W, H).data;
    const cand = new Uint8Array(W * H), L = new Float32Array(W * H);
    let top = H, bot = -1;
    for (let i = 0; i < W * H; i++) {
      const o = i * 4;
      if (!data[o + 3]) continue;
      const y = (i / W) | 0;
      if (y < top) top = y; if (y > bot) bot = y;
      const [h, s, l] = rgb2hsl(data[o], data[o + 1], data[o + 2]);
      if ((h <= 8 || h >= 345) && s >= 0.6 && l >= 0.10) { cand[i] = 1; L[i] = l; }
    }
    const lab = new Int32Array(W * H), comps = [];
    const stack = new Int32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (!cand[i] || lab[i]) continue;
      const id = comps.length + 1, pts = [];
      let sp = 0; stack[sp++] = i; lab[i] = id;
      while (sp) {
        const k = stack[--sp]; pts.push(k);
        const x = k % W, y = (k / W) | 0;
        if (x > 0 && cand[k - 1] && !lab[k - 1]) { lab[k - 1] = id; stack[sp++] = k - 1; }
        if (x < W - 1 && cand[k + 1] && !lab[k + 1]) { lab[k + 1] = id; stack[sp++] = k + 1; }
        if (y > 0 && cand[k - W] && !lab[k - W]) { lab[k - W] = id; stack[sp++] = k - W; }
        if (y < H - 1 && cand[k + W] && !lab[k + W]) { lab[k + W] = id; stack[sp++] = k + W; }
      }
      comps.push(pts);
    }
    let big = null;
    for (const p of comps) if (!big || p.length > big.length) big = p;
    let kitTop = H;
    if (big) for (const k of big) kitTop = Math.min(kitTop, (k / W) | 0);
    const waist = top + 0.5 * (bot - top);
    const idx = [], lv = [], shorts = [];
    for (const p of comps) {
      let cy = 0; for (const k of p) cy += (k / W) | 0; cy /= p.length;
      if (p.length < 20 && cy < kitTop + 3) continue;
      for (const k of p) { idx.push(k); lv.push(L[k]); shorts.push(((k / W) | 0) >= waist ? 1 : 0); }
    }
    m = { W, H, data, idx: Int32Array.from(idx), l: Float32Array.from(lv), shorts: Uint8Array.from(shorts) };
    maskCache.set(img, m);
    return m;
  }
  function shadeTo(target, l) {        // keep the art's shading ramp, move it onto the kit colour
    const [h, s, lt] = target;
    const L = l <= KIT_REF_L ? lt * (l / KIT_REF_L)
      : lt + (1 - lt) * ((l - KIT_REF_L) / (1 - KIT_REF_L)) * 0.8;
    return hsl2rgb(h, s, Math.max(0, Math.min(1, L)));
  }
  // derived canvases: kitKey -> Map(sourceImage -> canvas)
  const derived = new Map();
  function kitSpec(shirt, shorts) {
    return { key: shirt.join(",") + "/" + shorts.join(","),
             shirt: rgb2hsl(...shirt), shorts: rgb2hsl(...shorts) };
  }
  function recolored(img, spec) {
    let per = derived.get(spec.key);
    if (!per) { per = new Map(); derived.set(spec.key, per); }
    let out = per.get(img);
    if (out) return out;
    const m = kitMask(img);
    out = document.createElement("canvas"); out.width = m.W; out.height = m.H;
    const g = out.getContext("2d");
    const id = g.createImageData(m.W, m.H);
    id.data.set(m.data);
    const ramp = new Map();            // lightness quantised -> rgb (per kit part)
    for (let n = 0; n < m.idx.length; n++) {
      const part = m.shorts[n] ? spec.shorts : spec.shirt;
      const q = Math.round(m.l[n] * 255), rk = (m.shorts[n] << 8) | q;
      let c = ramp.get(rk);
      if (!c) { c = shadeTo(part, q / 255); ramp.set(rk, c); }
      const o = m.idx[n] * 4;
      id.data[o] = c[0]; id.data[o + 1] = c[1]; id.data[o + 2] = c[2];
    }
    g.putImageData(id, 0, 0);
    per.set(img, out);
    return out;
  }

  // ── teams / kits / keepers ──────────────────────────────────────────────
  function buildTeam(side, t) {
    t = t || {};
    const d = DEFAULT_KITS[side], k = t.kit || {};
    const primary = parseHex(k.primary, parseHex(d.primary));
    const secondary = parseHex(k.secondary, primary);
    const gk = parseHex(k.gk, parseHex(d.gk));
    return { name: t.name || side, short: t.short || side.slice(0, 3), primary, secondary, gk };
  }
  function finalizeTeams() {
    const H = E.teams.HOME, A = E.teams.AWAY;
    // presentation safety net: two near-identical shirts -> away wears its
    // secondary as the shirt (the app is expected to send distinct kits)
    if (cdist(H.primary, A.primary) < 70 && cdist(H.primary, A.secondary) >= 70)
      A.shirt = A.secondary, A.shortsC = A.primary;
    else A.shirt = A.primary, A.shortsC = A.secondary;
    H.shirt = H.primary; H.shortsC = H.secondary;
    for (const T of [H, A]) {
      T.spec = kitSpec(T.shirt, T.shortsC);
      T.gkSpec = kitSpec(T.gk, darken(T.gk, 0.82));
      // ring follows the shirt; a shirt that disappears on grass (dark or
      // green) uses the other kit colour instead
      const [h, s, l] = rgb2hsl(...T.shirt);
      const grassy = h > 70 && h < 170 && s > 0.25;
      T.ring = (lum(T.shirt) < 0.12 || grassy) ? T.shortsC : T.shirt;
      if (lum(T.ring) < 0.12) T.ring = [235, 235, 235];
    }
    if (derived.size > 12) derived.clear();
  }
  const NEUTRAL = (() => { const n = parseHex(NEUTRAL_KIT.primary); return kitSpec(n, parseHex(NEUTRAL_KIT.secondary)); })();
  function flaggedGK(info) {
    if (!info) return false;
    const pos = String(info.position || info.slot || info.pos || info.role || "").toUpperCase();
    return info.is_gk === true || pos === "GK" || pos === "G" || pos === "GOALKEEPER";
  }
  function isKeeper(pid, info) {
    if (flaggedGK(info)) return true;
    const team = info && info.team;
    return !!team && E.gkFallback[team] === pid;
  }
  function computeGkFallback(row) {
    // only for a team with NO flagged keeper. Each goal line's nearest active
    // player (of either team) marks that team as the line's owner; the owner's
    // player nearest that line is its keeper. Stable: an assigned fallback is
    // kept while he stays active.
    if (!row || !row[4] || !pb.roster.length) return;
    const act = [];
    for (let k = 0; k < pb.roster.length; k++) {
      const p = row[4][k], info = E.players[pb.roster[k]];
      if (p && p[3] && info && (info.team === "HOME" || info.team === "AWAY")) act.push([pb.roster[k], info.team, p[0]]);
    }
    for (const team of ["HOME", "AWAY"]) {
      let flagged = false;
      for (const info of Object.values(E.players)) if (info && info.team === team && flaggedGK(info)) { flagged = true; break; }
      if (flagged) { delete E.gkFallback[team]; continue; }
      if (E.gkFallback[team] && act.some(a => a[0] === E.gkFallback[team])) continue;
      for (const line of [0, 100]) {
        const near = act.slice().sort((a, b) => Math.abs(a[2] - line) - Math.abs(b[2] - line));
        if (near.length && near[0][1] === team) { E.gkFallback[team] = near[0][0]; break; }
      }
    }
  }
  function mergePlayers(players) {
    if (!players || typeof players !== "object") return;
    for (const [pid, p] of Object.entries(players))
      if (p && typeof p === "object") E.players[pid] = Object.assign(E.players[pid] || {}, p);
  }
  function shortName(info, pid) {
    if (info.short_name) return String(info.short_name);
    const nm = String(info.name || pid).trim(), tok = nm.split(/\s+/);
    if (tok.length === 1) return nm;
    const PART = /^(van|von|de|da|di|dos|das|du|del|della|der|den|le|la|el|al|ten|ter)$/;   // lowercase particles only
    let i = tok.length - 1;
    while (i > 0 && PART.test(tok[i - 1])) i--;
    return tok.slice(i).join(" ");
  }

  // ── buffer ──────────────────────────────────────────────────────────────
  function sameRoster(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function adoptRoster(roster) {
    if (!Array.isArray(roster) || sameRoster(roster, pb.roster)) return;
    const old = pb.roster, pos = new Map(roster.map((pid, k) => [pid, k]));
    if (old.length && pb.frames.length) {
      // re-align buffered rows to the new roster (new arrays; app rows untouched)
      const map = old.map(pid => pos.has(pid) ? pos.get(pid) : -1);
      pb.frames = pb.frames.map(r => {
        const pl = new Array(roster.length).fill(null);
        const src = r[4] || [];
        for (let k = 0; k < map.length; k++) if (map[k] >= 0 && k < src.length) pl[map[k]] = src[k];
        const nr = r.slice(); nr[4] = pl; return nr;
      });
    }
    pb.roster = roster.slice();
    S.view = [];                        // per-index gait state follows the new indexing
  }
  function trimBehind() {
    const fr = pb.frames;
    if (fr.length < 2 || fr[0][0] >= E.clock - BEHIND_KEEP_S - 15) return;
    let n = 0;                          // keep one row at/behind the cut so interpolation stays valid
    while (n < fr.length - 1 && fr[n + 1][0] < E.clock - BEHIND_KEEP_S) n++;
    if (n > 0) fr.splice(0, n);
  }
  function headFor(clock) {
    const fr = pb.frames, n = fr.length;
    if (n <= 1 || clock <= fr[0][0]) return 0;
    if (clock >= fr[n - 1][0]) return n - 1;
    let lo = 0, hi = n - 1;             // fr[lo][0] <= clock < fr[hi][0]
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (fr[mid][0] <= clock) lo = mid; else hi = mid; }
    const a = fr[lo][0], b = fr[hi][0];
    return lo + (b > a ? (clock - a) / (b - a) : 0);
  }

  // ── hooks into the preview (function declarations are global bindings) ──
  updateHUD = function () {};
  hudSub = function () {};
  drawReadout = function () {};
  const _sampleAt = sampleAt;
  sampleAt = function () {
    if (!pb.frames.length || !pb.roster.length) return null;
    pb.head = headFor(E.clock);
    return _sampleAt(pb.head);
  };
  let readyResolve;
  const ready = new Promise(res => { readyResolve = res; });
  window.addEventListener("touchline:booted", () => { E.booted = true; });
  const _updateRig = updateRig;
  updateRig = function (dt, sample) {
    const fit = Math.max(cv.clientWidth / VIEW.w, cv.clientHeight / VIEW.h) || 1;
    RIG.zoomTarget = fit * E.zoom;
    if (E.snap && sample) {             // first frame / seek: cut, don't glide
      const sm = RIG.smooth; RIG.smooth = 0; RIG.zoom = RIG.zoomTarget;
      _updateRig(dt, sample); RIG.smooth = sm; E.snap = false;
    } else _updateRig(dt, sample);
    if (E.booted && readyResolve) { readyResolve(true); readyResolve = null; }
    syncWait();
  };
  const _drawBall = drawBall;
  drawBall = function (ball, dt) { _drawBall(ball, dt * animScale()); };
  function animScale() { return E.playing ? Math.min(Math.max(E.speed, 0), 3) : 0; }

  // team-kit player draw (replaces the single-kit preview draw in embed only)
  drawPlayer = function (p, dt) {
    const adt = dt * animScale();
    const vs = viewState(p.idx);
    const st = p.speed < IDLE_MAX ? "idle" : p.speed < JOG_MAX ? "jog" : "sprint";
    if (st !== "idle" && p.speed > 0.5) {
      const h = Math.atan2(p.vy, p.vx) * 180 / Math.PI;
      const d = vs.heading === undefined ? 999 : Math.abs(((h - vs.heading + 540) % 360) - 180);
      if (d > 15) vs.heading = h;
    } else if (p.face !== undefined) {
      vs.heading = p.face;
    }
    vs.state = st;
    if (st === "idle") vs.frame = 0;
    else { vs.ft += adt * (st === "jog" ? JOG_FPS : SPRINT_FPS); vs.frame = Math.floor(vs.ft) % 8; }
    const dir = headingToDir(vs.heading);
    const frames = S.anims[vs.state][dir];
    const src = frames[vs.state === "idle" ? 0 : vs.frame % frames.length];
    const sp = sproj(p.x, p.y);
    if (sp.d < 0.5) return;
    const ax = Math.round(sp.x), ay = Math.round(sp.y);
    const s = S.playerVScale * depthScale(sp.d) * RIG.zoom * RES;
    const info = E.players[p.pid] || {};
    const T = info.team === "HOME" || info.team === "AWAY" ? E.teams[info.team] : null;
    const gk = T && isKeeper(p.pid, info);
    const im = recolored(src, T ? (gk ? T.gkSpec : T.spec) : NEUTRAL);
    const flat = flattenAt(p.x, p.y);
    const hi = E.highlight.has(p.pid);
    const carrier = E.carrierActs.has(p.act);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ax, ay, 9 * s, Math.max(1.5, 9 * s * flat), 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
    ctx.lineWidth = Math.max(1, Math.round(s));
    ctx.strokeStyle = T ? rgba(gk ? T.gk : T.ring, 0.9) : "rgba(200,200,200,0.8)";
    ctx.stroke();
    if (carrier) {
      ctx.beginPath();
      ctx.ellipse(ax, ay, 13 * s, Math.max(2, 13 * s * flat), 0, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, Math.round(s * 0.8));
      ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.stroke();
    }
    if (hi) {
      const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 180);
      ctx.beginPath();
      ctx.ellipse(ax, ay, 16 * s, Math.max(2.5, 16 * s * flat), 0, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, Math.round(2.2 * s));
      ctx.strokeStyle = `rgba(255,210,60,${pulse.toFixed(3)})`; ctx.stroke();
    }
    ctx.restore();
    const w = im.width, h = im.height;
    const foot = h / 2 + S.pivots.foot_offset_base128;
    ctx.drawImage(im, Math.round(ax - (w / 2) * s), Math.round(ay - foot * s),
      Math.round(w * s), Math.round(h * s));
    E.drawn.push({ pid: p.pid, ax, ay, s, hi, info });
  };

  // overlay pass: labels + highlight markers above everything in the scene
  function labelText(info, pid) {
    if (E.labels === "numbers") return info.number != null && info.number !== "" ? String(info.number) : "";
    if (E.labels === "names") return shortName(info, pid);
    return "";
  }
  function drawOverlays() {
    const list = E.drawn;
    if (!list.length) return;
    const placed = [];
    const overlaps = (r) => placed.some(q => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    // nearest (drawn last) first so near players win label space; highlighted first of all
    const order = list.slice().reverse().sort((a, b) => (b.hi ? 1 : 0) - (a.hi ? 1 : 0));
    for (const e of order) {
      const cssS = e.s / RES;
      const fpx = Math.round(Math.max(9, Math.min(16, cssS * 32)) * RES);
      let y = Math.round(e.ay - 102 * e.s - 3 * RES);
      const txt = labelText(e.info, e.pid);
      if (txt) {
        ctx.font = `700 ${fpx}px -apple-system, "Segoe UI", system-ui, sans-serif`;
        const tw = ctx.measureText(txt).width, pad = 2 * RES;
        let r = { x0: e.ax - tw / 2 - pad, x1: e.ax + tw / 2 + pad, y0: y - fpx, y1: y + pad };
        if (overlaps(r)) {
          const up = fpx + pad;
          const r2 = { x0: r.x0, x1: r.x1, y0: r.y0 - up, y1: r.y1 - up };
          if (!overlaps(r2)) { r = r2; y -= up; }
          else if (!e.hi) r = null;
        }
        if (r) {
          placed.push(r);
          ctx.lineWidth = Math.max(2, Math.round(fpx * 0.28));
          ctx.strokeStyle = "rgba(0,0,0,0.85)";
          ctx.strokeText(txt, e.ax, y);
          ctx.fillStyle = e.hi ? "#ffd23c" : "#ffffff";
          ctx.fillText(txt, e.ax, y);
          y -= fpx + 2 * RES;
        }
      }
      if (e.hi) {                        // downward chevron above head / label
        const a = Math.round(Math.max(5, Math.min(9, cssS * 18)) * RES);
        const bob = Math.round(Math.sin(performance.now() / 220) * 1.5 * RES);
        const ty = y - 2 * RES + bob;
        ctx.beginPath();
        ctx.moveTo(e.ax - a, ty - a * 1.2); ctx.lineTo(e.ax + a, ty - a * 1.2); ctx.lineTo(e.ax, ty);
        ctx.closePath();
        ctx.fillStyle = "#ffd23c"; ctx.fill();
        ctx.lineWidth = Math.max(1, Math.round(RES * 1.2)); ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.stroke();
      }
    }
    ctx.restore();
  }
  const _draw = draw;
  draw = function (sample, dt) {
    if (!E.visible) return;              // hidden: no drawing at all
    E.drawn = [];
    _draw(sample, dt);
    drawOverlays();
    E.lastDrawn = E.drawn;
  };

  // ── picking ─────────────────────────────────────────────────────────────
  function pick(ev) {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const x = (ev.clientX - r.left) * (cv.width / r.width), y = (ev.clientY - r.top) * (cv.height / r.height);
    const tol = 4 * RES;
    const L = E.lastDrawn;
    for (let i = L.length - 1; i >= 0; i--) {  // last drawn = nearest the camera
      const e = L[i], hw = 20 * e.s + tol;
      if (x >= e.ax - hw && x <= e.ax + hw && y >= e.ay - 102 * e.s - tol && y <= e.ay + 6 * e.s + tol) return e.pid;
    }
    return null;
  }
  cv.addEventListener("click", (ev) => {
    const fn = API.onPlayerClick;
    if (typeof fn !== "function") return;
    const pid = pick(ev);
    if (pid != null) { try { fn(pid); } catch (err) { console.warn("onPlayerClick handler failed", err); } }
  });
  cv.addEventListener("mousemove", (ev) => {
    const c = typeof API.onPlayerClick === "function" && pick(ev) != null ? "pointer" : "";
    if (cv.style.cursor !== c) cv.style.cursor = c;
  });

  // ── options ─────────────────────────────────────────────────────────────
  function applyWeather(v) { if (v && typeof TouchlineRain !== "undefined") TouchlineRain.setWeather(v); }
  function applyBall(v) { if (v && typeof TouchlineBall !== "undefined") TouchlineBall.setDesign(v); }
  function setActs(names) {
    if (!Array.isArray(names)) return;
    pb.acts = names.slice();
    E.carrierActs = new Set();
    names.forEach((n, i) => { if (/^(on_ball|on_ball_evade|carry|dribble_burst|dribble_partial)$/.test(n)) E.carrierActs.add(i); });
  }

  // quality: "high" = DPR-aware backing store (up to 2x, the preview default);
  // "low" = 1x backing store (a quarter of the pixels on Retina)
  const HIGH_RES = RES;
  function setQuality(q) {
    if (q === E.quality) return;
    E.quality = q;
    RES = q === "low" ? 1 : HIGH_RES;
    PXQ = Math.max(1, Math.round(RES));
    cv.width = Math.round(cv.clientWidth * RES); cv.height = Math.round(cv.clientHeight * RES);
  }

  // ── public API ──────────────────────────────────────────────────────────
  const API = {
    version: 1,
    ready,
    onPlayerClick: null,
    init(cfg) {
      cfg = cfg || {};
      pb.frames = []; pb.roster = []; pb.head = 0;
      E.lastRowClock = -Infinity; E.prevClock = null; E.snap = true;
      for (const k of Object.keys(E.players)) delete E.players[k];
      E.gkFallback = {}; E.highlight = new Set(); E.drawn = []; E.lastDrawn = [];
      S.view = [];
      E.teams.HOME = buildTeam("HOME", cfg.home);
      E.teams.AWAY = buildTeam("AWAY", cfg.away);
      finalizeTeams();
      mergePlayers(cfg.players);
      if (Array.isArray(cfg.roster)) pb.roster = cfg.roster.slice();
      setActs(cfg.act_names);
      applyWeather(cfg.weather);
      applyBall(cfg.ball);
      E.inited = true;
    },
    ingest(rows, roster) {
      if (!E.inited) API.init({});
      if (roster) adoptRoster(roster);
      if (!Array.isArray(rows) || !rows.length) return pb.frames.length;
      const first = !pb.frames.length;
      for (const r of rows) {
        if (!Array.isArray(r) || typeof r[0] !== "number") continue;
        if (r[0] <= E.lastRowClock) continue;
        pb.frames.push(r); E.lastRowClock = r[0];
      }
      if (first && pb.frames.length) { computeGkFallback(pb.frames[0]); E.snap = true; }
      trimBehind();
      return pb.frames.length;
    },
    reset(clock) {
      pb.frames = []; pb.head = 0; E.lastRowClock = -Infinity; E.snap = true;
      if (typeof clock === "number" && isFinite(clock)) E.clock = clock;
    },
    setClock(clock, o) {
      if (typeof clock === "number" && isFinite(clock)) {
        if (E.prevClock != null && Math.abs(clock - E.prevClock) > 4 * Math.max(1, E.speed)) E.snap = true;
        E.prevClock = E.clock = clock;
      }
      if (o) {
        if (o.playing != null) E.playing = !!o.playing;
        if (typeof o.speed === "number" && isFinite(o.speed)) E.speed = o.speed;
      }
      trimBehind();
    },
    setPlayers(players) {
      mergePlayers(players);
      if (pb.frames.length) computeGkFallback(pb.frames[pb.frames.length - 1]);
    },
    setOptions(o) {
      o = o || {};
      if (o.labels === "off" || o.labels === "numbers" || o.labels === "names") E.labels = o.labels;
      if (Array.isArray(o.highlight)) E.highlight = new Set(o.highlight);
      if (o.weather) applyWeather(o.weather);
      if (o.ball) applyBall(o.ball);
      if (o.quality === "low" || o.quality === "high") setQuality(o.quality);
      if (typeof o.zoom === "number" && o.zoom > 0.3 && o.zoom < 3) E.zoom = o.zoom;
      if (o.visible != null) {
        const v = !!o.visible;
        if (v && !E.visible) E.snap = true;
        E.visible = v;
        syncWait();
      }
    },
    _drawn() { return E.lastDrawn.map(e => ({ pid: e.pid, ax: e.ax, ay: e.ay, s: e.s })); },   // harness/diagnostics
    stats() {
      const fs = S.frameStat, iv = fs ? fs.intervals.slice(-120).filter(x => x > 0) : [];
      const mean = iv.length ? iv.reduce((a, b) => a + b, 0) / iv.length : 0;
      const pt = (S.perfT || []).slice().sort((a, b) => a - b);
      return {
        fps: mean ? 1000 / mean : 0,
        renderMs: pt.length ? pt.reduce((a, b) => a + b, 0) / pt.length : 0,
        renderP95: pt.length ? pt[Math.floor(pt.length * 0.95)] : 0,
        frames: pb.frames.length, head: pb.head, clock: E.clock, res: RES,
        backing: [cv.width, cv.height], visible: E.visible, quality: E.quality,
        keeperFallback: Object.assign({}, E.gkFallback),
      };
    },
  };
  window.TouchlineBroadcast = API;
})();

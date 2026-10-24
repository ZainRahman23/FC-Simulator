// ═══ lsi1/lsr_lab.js — TOUCHLINE — LEFT-STICK INPUT LAB V1 (owner, 24 Oct 2026) ════════════════════════════════════════════════════════════════════
// An INSTRUMENT. It frames the canonical joystick sandbox (vocab2_sandbox.html, the milestone f775daac, UNMODIFIED) with ?external=1 and drives
// its frames itself through the page's own automation surface (window.PT): each animation frame the lab (1) reads the input sources (the
// diagnostic virtual stick, a gamepad, the keyboard), (2) hands the stick to the canonical pipeline exactly as the sandbox's own stick does
// (PT.stick → pt_input.js stickVector, the canonical deadzone and zones), (3) advances one canonical frame (PT.tick: request() once, the 240 Hz
// ticks, the render), (4) records. The physical state is read from the simulation's own 12 s history when an attempt stops (lsr_state.js) — the
// recorder runs no code inside the simulation's tick and the simulation never reads anything the lab computes.
// NO INTENT RECOGNIZER EXISTS. Nothing here selects, triggers or buffers a technique. The intent labels are the owner's annotations only.
// The sandbox's own explicit requests (7 / 8 BODY FEINT, 9 / 0 CROQUETA, E, U CRUISE, its buttons) stay available; any attempt that used one is
// flagged. The sandbox keys that would reset, replay or switch the session under the recorder (R Q B X M N T V P K Space .) are taken by the lab.
import { StickAnalyzer, analyzeSamples, DERIVED_FIELDS, MARKERS, ZONES, EVENT_NAMES, wrapDeg, angleDeg, zoneOf, LSR_SIGNALS_VERSION } from "./lsr_signals.js";
import { sampleState, sampleTicks, STATE_FIELDS, STATE_EVERY, DT, MODES, SUPPORT, POSS, LSR_STATE_VERSION } from "./lsr_state.js";
import { toCols, rowOf, col, rleInput, unrleInput, newId, dataset, validateDataset, PRESET_LABELS, round, MILESTONE, SIMULATION, LAB_VERSION } from "./lsr_schema.js";
import { summarize, anchorOf, ANCHORS, stateAt, labelStats, SUMMARY_COLUMNS, describe } from "./lsr_summary.js";
import { SYNTH, SYNTH_BY_ID } from "./lsr_synth.js";
import * as PL from "./lsr_plots.js";
const $ = (id) => document.getElementById(id), R2D = 180 / Math.PI, D2R = Math.PI / 180, hyp = Math.hypot, C = PL.C;
const SRC = ["none", "mouse", "touch", "pen", "gamepad", "keys", "synthetic"], SRC_NAME = { none: "—", mouse: "VIRTUAL STICK · mouse", touch: "VIRTUAL STICK · touch", pen: "VIRTUAL STICK · pen", gamepad: "GAMEPAD", keys: "KEYBOARD (WASD)", synthetic: "SYNTHETIC TEST TRACE" };
const RAWK = ["down", "move", "coalesced", "up", "gamepad", "keydown", "keyup", "synthetic"];
export const FRAME_FIELDS = ["tHost", "tSim", "k", "n", "rx", "ry", "px", "py", "m", "src", "latch", "camH", "btn", "reqH", "mode", "rate"];
export const RAW_FIELDS = ["tHost", "x", "y", "kind", "src", "code", "rt", "lt", "appliedK"];
const FWD_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight", "Digit1", "Digit2", "Digit3", "Digit4", "Digit7", "Digit8", "Digit9", "Digit0", "KeyU", "KeyE", "KeyC", "KeyH"]);
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight"]);
const BLOCK_KEYS = new Set(["KeyR", "KeyQ", "KeyB", "KeyX", "KeyM", "KeyN", "KeyT", "KeyV", "KeyP", "KeyK", "Space", "Period"]);
const MAX_DUR = 11.5, PRE_ROLL = 1.5, RING_S = 3.2, LIVE_SPAN = 3.0, HIST_SPAN = 2.0;
const L = { st: "BOOT", diag: true, capture: "RESET", padR: 84, pad: { pid: null, ptype: null }, btnHeld: { sprint: false, walk: false }, gp: { id: "", active: false, lastTs: null, prev: [], sprint: false, walk: false },
  keysDown: new Set(), fwdDown: new Set(), synth: null, ring: { frames: [], raw: [] }, live: { an: null, ev: [], tl: null, row: null, lastState: 0 }, rec: null, att: null, replay: null, attempts: [], sel: new Set(),
  tags: new WeakMap(), nextTag: 1, sessionOf: new Map(), perf: { tick: [], host: [], frame: [] }, lastTs: null, hoverT: null, hoverWhere: null, frameN: 0, rRate: 1, cmp: { label: "", anchor: "auto", win: 0.75, hi: "" }, dbOk: true, sumCache: new Map() };
window.LSR = { L };
// ── utilities ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const fmt = (v, d = 2, sign = false) => (v == null || !Number.isFinite(+v) ? "—" : (sign && v > 0 ? "+" : "") + (+v).toFixed(d));
const fdeg = (v, d = 0) => (v == null ? "—" : fmt(v, d, true) + "°");
const clone = (o) => JSON.parse(JSON.stringify(o));
const roundObj = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = typeof v === "number" ? round(v, 5) : v; return r; };
const strip = (a) => { const o = {}; for (const [k, v] of Object.entries(a)) if (!k.startsWith("_")) o[k] = v; return o; };
const esc = (x) => String(x == null ? "" : x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let toastT = 0; function toast(msg, ms = 2600) { const el = $("toast"); el.textContent = msg; el.style.display = "block"; clearTimeout(toastT); toastT = setTimeout(() => (el.style.display = "none"), ms); }
const tagOf = (S) => { if (!L.tags.has(S)) L.tags.set(S, L.nextTag++); return L.tags.get(S); };
const keyVec = (K) => { const f = (K.has("KeyW") ? 1 : 0) - (K.has("KeyS") ? 1 : 0), r = (K.has("KeyD") ? 1 : 0) - (K.has("KeyA") ? 1 : 0), n = hyp(f, r); return n ? { x: r / n, y: f / n } : { x: 0, y: 0 }; };
const localTime = (iso) => { const d = new Date(iso || 0); return isNaN(d) ? "" : d.toLocaleTimeString([], { hour12: false }); };
const reviewing = () => L.st === "REVIEW" || L.st === "REPLAY";
function currentLabel() { const c = $("customLabel").value.trim(); return c || $("selLabel").value; }
// ── the attempt store (IndexedDB, this page's origin; export / import JSON for anything durable) ───────────────────────────────────────────────
const DB = { db: null,
  open() { return new Promise((res, rej) => { try { const q = indexedDB.open("touchline-left-stick-lab-v1", 1); q.onupgradeneeded = () => q.result.createObjectStore("attempts", { keyPath: "id" }); q.onsuccess = () => res((this.db = q.result)); q.onerror = () => rej(q.error); } catch (e) { rej(e); } }); },
  st(mode) { return this.db.transaction("attempts", mode).objectStore("attempts"); },
  req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async all() { return this.db ? this.req(this.st("readonly").getAll()) : []; }, async put(a) { if (this.db) await this.req(this.st("readwrite").put(strip(a))); }, async del(id) { if (this.db) await this.req(this.st("readwrite").delete(id)); } };
// ══ BOOT ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function boot() {
  buildUI(); layoutTop(); window.addEventListener("resize", layoutTop);
  try { await DB.open(); L.attempts = (await DB.all()).sort((a, b) => (a.created < b.created ? -1 : 1)); } catch (e) { L.dbOk = false; console.warn("IndexedDB unavailable", e); toast("Browser storage unavailable — attempts live in memory only: EXPORT before closing.", 6000); }
  renderList(); setState("BOOT");
  const fr = $("sim"), q = new URLSearchParams(location.search), extra = ["char", "foot", "cam"].filter((k) => q.get(k)).map((k) => `&${k}=${encodeURIComponent(q.get(k))}`).join("");
  fr.src = "vocab2_sandbox.html?external=1" + extra; await new Promise((r) => fr.addEventListener("load", r, { once: true }));
  L.W = fr.contentWindow; const t0 = performance.now(); while (!(L.W.PT && L.W.PT.ready())) { if (performance.now() - t0 > 120000) { toast("the sandbox did not load", 10000); return; } await new Promise((r) => setTimeout(r, 50)); }
  L.PT = L.W.PT; L.V = L.PT.V; L.timeOffset = L.W.performance.timeOrigin - performance.timeOrigin;
  const st = L.W.document.createElement("style"); st.textContent = "#ver,#stickBox,#stickBtns,#help,#skillBox,#keys,#replay{display:none!important}#bar .grp:has(#bReplay),#bar .grp:has(#selTest){display:none!important}"; L.W.document.head.appendChild(st);
  for (const ty of ["keydown", "keyup"]) L.W.addEventListener(ty, frameKey, true);
  L.W.addEventListener("blur", () => releaseForwarded());
  L.simRef = L.V.sim; tagOf(L.V.sim); resetLive();
  // (the experiment's preconditions, from the running page: the old analog feint off, no AUTO Body Feint / Croqueta)
  L.checks = { analogFeint: !!L.V.o0.analogFeint, engine: L.V.engine, vocab: L.V.vocab, pace: L.V.pace, control: L.V.control, carry: L.V.carry, ballOn: L.V.ballOn };
  if (L.checks.analogFeint) toast("WARNING: the old analog feint is ON in the sandbox — measurements would be contaminated", 8000);
  setState("LIVE"); requestAnimationFrame(loop);
}
function layoutTop() { const h = $("top").getBoundingClientRect().height; $("main").style.top = h + "px"; }
function resetLive() { L.live.an = new StickAnalyzer({ deadzone: L.V ? L.V.stick.cfg.deadzone : ZONES.deadzone }); L.live.ev = []; L.live.tl = null; L.ring.frames.forEach((f) => (f.d = null)); }
// ══ THE LOOP: input → the canonical frame → the record → the drawings ═══════════════════════════════════════════════════════════════════════════
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = L.lastTs == null ? 0 : Math.min(0.1, (ts - L.lastTs) / 1000); L.lastTs = ts; const h0 = performance.now();
  const V = L.V; if (V.sim !== L.simRef) onSessionChange();
  pollGamepad(ts); if (L.synth) synthStep(ts);
  const S0 = V.sim, k0 = S0.k, t0 = performance.now(); L.PT.tick(dt); const t1 = performance.now();
  if (V.sim !== S0) onSessionChange();
  const fr = frameRecord(ts, V.sim === S0 ? k0 : V.sim.k, V.sim === S0 ? V.sim.k - k0 : 0); ringPush(fr);
  if (L.st === "REC" && L.rec) { L.rec.frames.push(fr); if ((V.sim.k - L.rec.k0) * DT >= MAX_DUR) stopRecording(true); }
  if (L.diag && !reviewing()) liveAnalyze(fr);
  draw(ts);
  const P = L.perf; P.tick.push(t1 - t0); P.host.push(performance.now() - h0 - (t1 - t0)); P.frame.push(dt * 1000); for (const k in P) if (P[k].length > 1200) P[k].shift();
}
function srcNow() { const V = L.V; if (L.synth) return "synthetic"; if (L.pad.pid != null) return L.pad.ptype || "mouse"; if (L.gp.active) return "gamepad"; if (V.src === "keys" && ["KeyW", "KeyA", "KeyS", "KeyD"].some((k) => V.keys.has(k))) return "keys"; return "none"; }
// one frame's input record: the stick the pipeline read (raw, before the deadzone · the processed vector after it), its frame, the request
// delivered to movement for this frame's ticks (the record's own S.log.input — every tick of a frame carries the same request)
function frameRecord(ts, kA, n) {
  const V = L.V, S = V.sim, st = V.stick, keys = V.src === "keys", kv = keys ? keyVec(V.keys) : null, I = S.log.input, h = n > 0 ? I[3 * kA] : null;
  const sh = V.keys.has("ShiftLeft") || V.keys.has("ShiftRight"), al = V.keys.has("AltLeft") || V.keys.has("AltRight");
  return { tHost: ts, k: kA, n, rx: keys ? kv.x : st.raw.x, ry: keys ? kv.y : st.raw.y, px: keys ? 0 : st.v.x, py: keys ? 0 : st.v.y, m: keys ? (kv.x || kv.y ? 1 : 0) : st.v.m, src: SRC.indexOf(srcNow()),
    latch: (keys ? V.latch.h : st.latch) * R2D, camH: (V.camH || 0) * R2D, btn: (V.btn.sprint || sh ? 1 : 0) | (V.btn.walk || al ? 2 : 0) | (V.btn.lock ? 4 : 0), reqH: h == null || h === -99 ? null : h * R2D, mode: n > 0 ? I[3 * kA + 1] : null, rate: V.rate };
}
function ringPush(fr) { const R = L.ring, kMin = L.V.sim.k - Math.round(RING_S / DT); R.frames.push(fr); while (R.frames.length > 2 && (R.frames[0].k < kMin || R.frames.length > 2400)) R.frames.shift();
  const tMin = R.frames[0].tHost - 600; while (R.raw.length && R.raw[0].tHost < tMin) R.raw.shift(); }
function logRaw(o) { L.ring.raw.push(o); if (L.st === "REC" && L.rec) L.rec.raw.push(o); }
function liveAnalyze(fr) { const { row, ev } = L.live.an.push(fr.tHost / 1000, fr.rx, fr.ry); fr.d = row; for (const e of ev) L.live.ev.push(Object.assign(e, { tSim: fr.k * DT })); while (L.live.ev.length && L.live.ev[0].t < fr.tHost / 1000 - RING_S) L.live.ev.shift(); }
function onSessionChange() { const V = L.V; L.simRef = V.sim; tagOf(V.sim); resetLive(); L.ring.frames.length = 0;
  if (L.st === "REC") { L.rec = null; L.synth = null; setState("LIVE"); toast("The session was reset during the recording (a sandbox control) — that attempt was dropped.", 4500); }
  else if (reviewing()) { L.att = null; L.replay = null; setState("LIVE"); toast("The sandbox's session changed — back to LIVE.", 3500); } }
// ══ INPUT SOURCES ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DIAGNOSTIC VIRTUAL STICK: pointer capture while dragging; raw = the pointer's offset from the pad's centre in thumb-travel radii (+x right,
// +y up), logged unclamped (every coalesced pointer sample); handed to the pipeline clamped to the unit circle, as the sandbox's own stick does
function padRaw(e) { const b = $("pad").getBoundingClientRect(); return { x: (e.clientX - (b.left + b.width / 2)) / L.padR, y: -(e.clientY - (b.top + b.height / 2)) / L.padR }; }
function padApply(e) { if (reviewing()) return; let { x, y } = padRaw(e); const r = hyp(x, y); if (r > 1) { x /= r; y /= r; } L.PT.stick(x, y); }
function bindPad() { const pad = $("pad");
  pad.addEventListener("pointerdown", (e) => { if (L.pad.pid != null || !L.PT) return; if (reviewing()) { toast(L.st === "REVIEW" ? "REVIEW — SAVE or DISCARD the attempt first" : "REPLAY — LIVE ▸ (Esc) to play again"); return; } e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (_) {}
    L.pad.pid = e.pointerId; L.pad.ptype = e.pointerType || "mouse"; L.gp.active = false; const p = padRaw(e); logRaw({ tHost: e.timeStamp, x: p.x, y: p.y, kind: 0, src: SRC.indexOf(L.pad.ptype) }); padApply(e); });
  pad.addEventListener("pointermove", (e) => { if (e.pointerId !== L.pad.pid) return; e.preventDefault(); const cs = e.getCoalescedEvents ? e.getCoalescedEvents() : [], s = SRC.indexOf(L.pad.ptype);
    if (cs.length) for (const c of cs) { const p = padRaw(c); logRaw({ tHost: c.timeStamp, x: p.x, y: p.y, kind: 2, src: s }); } else { const p = padRaw(e); logRaw({ tHost: e.timeStamp, x: p.x, y: p.y, kind: 1, src: s }); } padApply(e); });
  const end = (e) => { if (e.pointerId !== L.pad.pid) return; const p = padRaw(e); logRaw({ tHost: e.timeStamp, x: p.x, y: p.y, kind: 3, src: SRC.indexOf(L.pad.ptype) }); L.pad.pid = null; if (!reviewing()) L.PT.stick(null); };
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) pad.addEventListener(ev, end);
  const hold = (el, key) => { let pid = null; el.addEventListener("pointerdown", (e) => { e.preventDefault(); pid = e.pointerId; try { el.setPointerCapture(pid); } catch (_) {} L.btnHeld[key] = true; el.classList.add("on"); applyBtns(); });
    const up = (e) => { if (e.pointerId !== pid) return; pid = null; L.btnHeld[key] = false; el.classList.remove("on"); applyBtns(); }; for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, up); };
  hold($("bSprint"), "sprint"); hold($("bWalk"), "walk"); sizePad(); }
// (the canonical sandbox's SPRINT / WALK buttons set V.btn.sprint / .walk while held — the same fields here, from the lab's buttons or the gamepad)
function applyBtns() { if (!L.V) return; L.V.btn.sprint = L.btnHeld.sprint || L.gp.sprint; L.V.btn.walk = L.btnHeld.walk || L.gp.walk; }
function sizePad() { const cv = $("pad"), s = 2 * (L.padR + 20); cv.style.width = s + "px"; cv.style.height = s + "px"; }
// THE GAMEPAD (standard mapping): left stick = the stick (axes 0 / 1, up = forward), RT = sprint, LT = walk; Menu = START / STOP; in REVIEW A = SAVE,
// B = DISCARD, X = MARK INTENT, Y = play / pause. Raw axes logged whenever the pad reports a new state (its own timestamp)
function pollGamepad(ts) { const G = L.gp, list = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const p of list) if (p && p.connected && p.axes.length >= 2) { gp = p; break; }
  if (!gp) { if (G.id) { G.id = ""; if (G.active) { G.active = false; G.sprint = G.walk = false; applyBtns(); if (L.pad.pid == null && !reviewing()) L.PT.stick(null); } } return; }
  G.id = gp.id; const ax = gp.axes[0], ay = -gp.axes[1], r = hyp(ax, ay), b = gp.buttons.map((x) => (x ? x.value : 0)), press = (i) => b[i] > 0.5 && !(G.prev[i] > 0.5);
  if (!G.active && L.pad.pid == null && !L.synth && (r > 0.2 || b.some((v) => v > 0.5))) G.active = true;
  if (gp.timestamp !== G.lastTs) { G.lastTs = gp.timestamp; logRaw({ tHost: gp.timestamp || ts, x: ax, y: ay, kind: 4, src: 4, rt: b[7] || 0, lt: b[6] || 0 }); }
  if (press(9)) toggleRec(); if (L.st === "REVIEW") { if (press(0)) save(); else if (press(1)) discard(); } if (reviewing()) { if (press(2)) setMark(); if (press(3)) togglePlay(); }
  G.prev = b;
  if (G.active && !reviewing() && !L.synth) { const c = r > 1 ? 1 / r : 1; L.PT.stick(ax * c, ay * c); G.sprint = (b[7] || 0) > 0.5; G.walk = (b[6] || 0) > 0.5; applyBtns(); } }
// THE KEYBOARD: the sandbox's own WASD path (forwarded into its frame when the lab has the focus; read natively when the frame has it)
function labKey(e) { if (e.repeat) return ["Enter", "KeyY", "Backspace", "Delete", "KeyG", "Escape", "KeyL", "Space"].includes(e.code);
  switch (e.code) { case "Enter": toggleRec(); return true; case "KeyY": if (L.st === "REVIEW") save(); return true; case "Backspace": case "Delete": if (L.st === "REVIEW") discard(); return true;
    case "KeyG": if (reviewing()) setMark(); return true; case "Escape": if (L.st === "REPLAY") goLive(); return true; case "KeyL": if (reviewing()) togglePlay(); return true;
    case "Space": if (reviewing()) togglePlay(); else if (L.st === "LIVE" && L.V) { L.V.paused = !L.V.paused; toast(L.V.paused ? "PAUSED (Space)" : "running", 1200); } return true; } return false; }
function trackKey(e) { if (!MOVE_KEYS.has(e.code)) return; if (e.type === "keydown") L.keysDown.add(e.code); else L.keysDown.delete(e.code); const v = keyVec(L.keysDown);
  logRaw({ tHost: e.timeStamp + (e.view === L.W ? L.timeOffset : 0), x: v.x, y: v.y, kind: e.type === "keydown" ? 5 : 6, src: 5, code: e.code }); }
function hostKey(e) { const tg = e.target; if (tg && (tg.tagName === "SELECT" || (tg.tagName === "INPUT" && tg.type === "text"))) { if (e.code === "Escape" || e.code === "Enter") tg.blur(); return; }
  if (e.type === "keydown" && labKey(e)) { e.preventDefault(); return; }
  if (!L.W || !FWD_KEYS.has(e.code)) return; if (reviewing() && MOVE_KEYS.has(e.code) && e.type === "keydown") return;
  if (!e.repeat) trackKey(e); if (e.type === "keydown") L.fwdDown.add(e.code); else L.fwdDown.delete(e.code);
  L.W.dispatchEvent(new L.W.KeyboardEvent(e.type, { code: e.code, key: e.key, repeat: e.repeat, shiftKey: e.shiftKey, altKey: e.altKey, bubbles: true, cancelable: true })); e.preventDefault(); }
function frameKey(e) { if (!e.isTrusted) return;   // (forwarded by the lab: already logged)
  if (e.type === "keydown" && labKey(e)) { e.stopImmediatePropagation(); e.preventDefault(); return; }
  if (BLOCK_KEYS.has(e.code)) { e.stopImmediatePropagation(); e.preventDefault(); if (e.type === "keydown" && !e.repeat) toast(`${e.code.replace("Key", "")}: a sandbox page key — disabled in the lab (it would reset / replay / switch the session)`, 2200); return; }
  if (reviewing() && MOVE_KEYS.has(e.code) && e.type === "keydown") { e.stopImmediatePropagation(); e.preventDefault(); return; }
  if (!e.repeat) trackKey(e); }
function releaseForwarded() { if (!L.W) return; for (const code of L.fwdDown) L.W.dispatchEvent(new L.W.KeyboardEvent("keyup", { code, bubbles: true })); L.fwdDown.clear(); L.keysDown.clear(); }
// THE SYNTHETIC RECORDER-TEST TRACES (lsr_synth.js): played frame by frame through the same stick path (PT.stick) into the real footballer
function synthStep(ts) { const Y = L.synth; if (Y.t0 == null) Y.t0 = ts; const t = (ts - Y.t0) / 1000;
  if (t > Y.T.dur) { L.synth = null; L.PT.stick(null); if (L.st === "REC") stopRecording(false); return; }
  const p = Y.T.f(t); if (p) L.PT.stick(p.x, p.y); else L.PT.stick(null); logRaw({ tHost: ts, x: p ? p.x : 0, y: p ? p.y : 0, kind: 7, src: 6 }); }
function startSynth(id) { const T = SYNTH_BY_ID[id]; if (!T || L.st !== "LIVE") return; L.pad.pid = null; L.gp.active = false; startRecording({ label: "RECORDER TEST · " + T.name, capture: "RESET", synth: T }); L.synth = { T, t0: null }; }
// ══ RECORD / STOP / REVIEW / SAVE / DISCARD / REPLAY ════════════════════════════════════════════════════════════════════════════════════════════
function toggleRec() { if (L.st === "REPLAY") goLive(); if (L.st === "LIVE") startRecording(); else if (L.st === "REC") stopRecording(false); else if (L.st === "REVIEW") toast("REVIEW — SAVE (Y) or DISCARD (Backspace) first"); }
function startRecording(o = {}) { if (L.st !== "LIVE" || !L.PT) return; const V = L.V, mode = o.capture || L.capture; if (V.replay) L.PT.live(); V.paused = false;
  let k0, kStart, frames = [], raw = [];
  if (mode === "RESET") { L.PT.reset(); L.simRef = V.sim; tagOf(V.sim); resetLive(); L.ring.frames.length = 0; k0 = kStart = 0; }
  else { const S = V.sim; kStart = S.k; k0 = Math.max(0, S.k - Math.round(PRE_ROLL / DT)); frames = L.ring.frames.filter((f) => f.k >= k0); const tz = frames.length ? frames[0].tHost : 0; raw = L.ring.raw.filter((e) => e.tHost >= tz - 400); }
  L.rec = { label: o.label || currentLabel(), mode, k0, kStart, sim: V.sim, frames, raw, wall: new Date().toISOString(), synth: o.synth ? o.synth.id : null };
  setState("REC"); }
function stopRecording(auto) { const R = L.rec, V = L.V, S = V.sim; if (!R || L.st !== "REC") return; L.rec = null; L.synth = null;
  if (S !== R.sim) { setState("LIVE"); return; } const k1 = S.k - 1;
  if (k1 - R.k0 < 48) { setState("LIVE"); toast("Too short (< 0.2 s) — nothing recorded."); return; }
  V.paused = true; const att = buildAttempt(R, S, k1, auto); L.att = att; L.replay = { att, saved: false, resim: false, det: null };
  startWindow(att); setState("REVIEW"); if (auto) toast(`Auto-stopped at the ${MAX_DUR} s limit (the simulation keeps 12 s of history).`, 4000); }
// THE ATTEMPT (lsr_schema.js TOUCHLINE_LEFT_STICK_RECORDING_V1)
function buildAttempt(R, S, k1, auto) {
  const V = L.V, fr = R.frames.filter((f) => f.k >= R.k0 && f.k <= k1), z = fr.length ? fr[0].tHost : performance.now(), lastTs = fr.length ? fr[fr.length - 1].tHost : z;
  const frames = fr.map((f) => Object.assign({}, f, { tHost: (f.tHost - z) / 1000, tSim: f.k * DT }));
  const raw = R.raw.filter((e) => e.tHost >= z - 400 && e.tHost <= lastTs + 1).map((e) => { let ap = null; for (const f of fr) if (f.tHost >= e.tHost - 1e-6 && f.n > 0) { ap = f.k; break; } return Object.assign({ code: "", rt: null, lt: null }, e, { tHost: (e.tHost - z) / 1000, appliedK: ap }); });
  // (the derived signals from the frames AS STORED — rounded — so they are a pure function of the file: a re-analysis reproduces them exactly)
  const fc = toCols(frames, FRAME_FIELDS), dz = V.stick.cfg.deadzone, { rows, events } = analyzeSamples(fc.data.tHost.map((t, i) => ({ t, x: fc.data.rx[i], y: fc.data.ry[i] })), { deadzone: dz });
  const st = sampleState(S, R.k0, k1, STATE_EVERY), ticks = sampleTicks(S, R.k0, k1), dur = (k1 - R.k0) * DT;
  const counts = {}; for (const f of frames) { const s = SRC[f.src]; counts[s] = (counts[s] || 0) + 1; } const dominant = Object.entries(counts).filter(([k]) => k !== "none").sort((a, b) => b[1] - a[1])[0];
  const att = { id: newId(), label: R.label, labelKind: PRESET_LABELS.includes(R.label) ? "preset" : "custom", created: R.wall, status: "unsaved",
    input: { source: dominant ? dominant[0] : "none", sourceFrames: counts, gamepad: L.gp.id || null, padRadiusPx: L.padR, devicePixelRatio: window.devicePixelRatio || 1, deadzone: dz, zones: { walkTo: V.stick.cfg.walkTo, jogTo: V.stick.cfg.jogTo },
      frameHz: frames.length > 1 ? (frames.length - 1) / Math.max(1e-6, frames[frames.length - 1].tHost - frames[0].tHost) : null, tickHz: 240, stateHz: 240 / STATE_EVERY, simRate: V.rate, synthetic: R.synth, userAgent: navigator.userAgent },
    capture: { mode: R.mode, preRoll: R.mode === "CONTINUOUS" ? PRE_ROLL : 0, k0: R.k0, kStart: R.kStart, k1, t0: R.k0 * DT, tStart: R.kStart * DT, t1: k1 * DT, duration: dur, autoStopped: !!auto },
    markers: { levels: MARKERS, signalsVersion: LSR_SIGNALS_VERSION, stateVersion: LSR_STATE_VERSION }, owner: { mark: null, note: "" },
    session: { engine: V.engine, o0: clone(V.o0), k: S.k, hash: S.hash, inputRLE: rleInput(S.log.input, S.k), events: clone(S.log.events.filter((e) => e.k < S.k)) },
    frames: fc, raw: toCols(raw, RAW_FIELDS), derived: toCols(rows, DERIVED_FIELDS), stickEvents: events.map((e) => roundObj(Object.assign(e, { tSim: fc.data.tSim[e.i] }))),
    ticks: { k0: ticks.k0, reqH: ticks.reqH.map((v) => round(v, 4)), mode: ticks.mode, keys: ticks.keys }, state: toCols(st.rows, STATE_FIELDS), dict: st.dict, timeline: st.timeline.map(roundObj),
    sandbox: Object.assign({}, L.checks, { cruise: !!V.cruise }) };
  att.flags = { explicitRequests: att.timeline.filter((e) => e.kind === "request").length };
  att.summary = summarize(att); att.flags.autoVocab = att.summary.autoVocab; L.sessionOf.set(att.id, tagOf(S)); return att; }
// the window's replay on the canonical page: its own replay state (the same one its REPLAY uses), the simulation paused
function startWindow(att) { const V = L.V; V.paused = true; V.replay = { t0: att.capture.t0, t1: att.capture.t1, t: att.capture.t0, rate: L.rRate, playing: true, wasPaused: true, kind: "lsr", loop: true, title: "LEFT-STICK LAB" }; V.lastShown = null; V.cam = null; L.hoverT = null; }
async function save() { if (L.st !== "REVIEW" || !L.att) return; const a = L.att; a.status = "saved"; a.savedAt = new Date().toISOString(); a.summary = summarize(a);
  try { await DB.put(a); } catch (e) { toast("Could not store it in the browser — EXPORT it now.", 5000); } L.attempts.push(a); renderList(); toast(`SAVED · ${a.label} · ${L.attempts.filter((x) => x.label === a.label).length} of this label`); goLive(); }
function discard() { if (L.st !== "REVIEW") return; toast("Discarded."); goLive(); }
function goLive() { const V = L.V; if (V.replay) L.PT.live(); if (L.replay && L.replay.resim) { L.PT.reset(); L.simRef = V.sim; tagOf(V.sim); resetLive(); L.ring.frames.length = 0; } V.paused = false; L.att = null; L.replay = null; setState("LIVE"); }
// a saved attempt's replay: on the live session when it is still there (same session, inside its 12 s history), else re-simulated from its
// record (o0 + the run-length request record + the events) through the page's own loader (PT.load) — the hash must match the recording's
async function replaySaved(id) { const a = L.attempts.find((x) => x.id === id); if (!a || !L.PT) return; if (L.st === "REC" || L.st === "REVIEW") { toast("Finish the current attempt first (STOP, then SAVE or DISCARD)."); return; }
  if (L.st === "REPLAY") goLive(); const V = L.V, S = V.sim;
  if (L.sessionOf.get(a.id) === tagOf(S) && S.k > a.capture.k1 && S.t - a.capture.t0 < 11.8) { L.att = a; L.replay = { att: a, saved: true, resim: false, det: "the live session (no re-simulation needed)" }; startWindow(a); setState("REPLAY"); return; }
  toast(`Re-simulating ${a.session.k} ticks from the record…`, 1500); await new Promise((r) => setTimeout(r, 30)); resimInto(a); }
function resimInto(a) { const V = L.V, t0 = performance.now();
  const r = L.PT.load({ o0: clone(a.session.o0), input: unrleInput(a.session.inputRLE), events: clone(a.session.events || []), stick: [] }, a.session.engine || "layered", a.session.o0.layers || null);
  const ms = performance.now() - t0, S = V.sim; L.simRef = S; tagOf(S); resetLive(); L.ring.frames.length = 0;
  const st = sampleState(S, a.capture.k0, a.capture.k1, STATE_EVERY), same = JSON.stringify(toCols(st.rows, STATE_FIELDS).data) === JSON.stringify(a.state.data);
  const det = `re-simulated ${a.session.k} ticks in ${ms.toFixed(0)} ms · hash ${S.hash.toString(16)} vs recorded ${a.session.hash.toString(16)} → ${S.hash === a.session.hash ? "IDENTICAL" : "DIFFERENT"} · state track ${same ? "identical" : "DIFFERENT"}`;
  L.att = a; L.replay = { att: a, saved: a.status === "saved", resim: true, det, ok: S.hash === a.session.hash && same }; startWindow(a); setState(a.status === "saved" ? "REPLAY" : "REVIEW"); return L.replay; }
function setMark() { if (!reviewing() || !L.att || !L.V.replay) return; const a = L.att; a.owner.mark = round(Math.round(L.V.replay.t / DT) * DT, 5); a.summary = summarize(a); L.sumCache.delete(a.id); L.lastTxt = 0; if (a.status === "saved") DB.put(a).catch(() => {}); renderList(); toast(`Intent mark at ${(a.owner.mark - a.capture.tStart).toFixed(3)} s`); }
function clearMark() { if (!L.att) return; L.lastTxt = 0; L.att.owner.mark = null; L.att.summary = summarize(L.att); L.sumCache.delete(L.att.id); if (L.att.status === "saved") DB.put(L.att).catch(() => {}); renderList(); }
function togglePlay() { const R = L.V && L.V.replay; if (!R) return; R.playing = !R.playing; if (R.playing && R.t >= R.t1 - 1e-9) R.t = R.t0; }
function setState(s) { L.st = s; const el = $("state"); el.textContent = s === "REC" ? "● REC" : s; el.className = s; const rec = s === "REC", rev = s === "REVIEW";
  $("bStart").textContent = rec ? "■ STOP RECORDING" : "● START RECORDING"; $("bStart").classList.toggle("rec", rec); $("bStart").disabled = !(s === "LIVE" || rec || s === "REPLAY");
  $("bSave").disabled = !rev; $("bDiscard").disabled = !rev; $("recBanner").style.display = rec ? "block" : "none"; $("transport").classList.toggle("on", rev || s === "REPLAY"); $("bSynth").disabled = s !== "LIVE";
  if (rec) $("recBanner").textContent = `● RECORDING · ${L.rec ? L.rec.label : ""}`; if (s === "LIVE") L.hoverT = null; }
// ══ DRAWING ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function draw(ts) { L.frameN++; const rev = reviewing() && L.att && L.V.replay; drawPad(rev);
  if (!$("tab-live").classList.contains("on")) { if (rev && ts - (L.lastTxt || 0) > 100) { L.lastTxt = ts; transportText(L.att, Math.round(L.V.replay.t / DT) * DT); } return; }   // (the plots draw only while their tab is shown)
  if (rev) { const a = L.att, t = Math.round(L.V.replay.t / DT) * DT; viewOf(a); drawAttHist(a, t); if (L.frameN % 2 === 0 || L.hoverT != null) drawAttPlots(a, t); if (ts - (L.lastTxt || 0) > 100) { L.lastTxt = ts; attText(a, t); transportText(a, t); } return; }
  if (L.st === "REC") { const R = L.rec; $("recBanner").textContent = `● RECORDING · ${R ? R.label : ""} · ${R ? ((L.V.sim.k - R.k0) * DT).toFixed(1) : ""} s / ${MAX_DUR} s`; }
  if (!L.diag) { if (ts - (L.lastTxt || 0) > 250) { L.lastTxt = ts; $("src").textContent = SRC_NAME[srcNow()] + (L.gp.id && !L.gp.active ? " · gamepad connected" : ""); $("attHead").textContent = "diagnostics OFF — the lab only forwards input (recording still works)."; } return; }
  drawLiveHist(ts); if (L.frameN % 2 === 0 || L.hoverT != null) drawLivePlots();
  if (ts - (L.lastTxt || 0) > 100) { L.lastTxt = ts; liveText(); } }
function drawPad(rev) { const cv = $("pad"), { g, w, h } = PL.fit(cv), cx = w / 2, cy = h / 2, R = L.padR, Z = L.V ? L.V.stick.cfg : ZONES; let p = null, on = false;
  if (rev) { const a = L.att, i = frameAt(a, L.V.replay.t); if (i >= 0) { p = { x: a.frames.data.rx[i], y: a.frames.data.ry[i] }; on = true; } }
  else if (L.V) { const V = L.V; if (V.src === "keys") { p = keyVec(V.keys); on = !!(p.x || p.y); } else { p = { x: V.stick.raw.x, y: V.stick.raw.y }; on = L.pad.pid != null || L.gp.active || !!L.synth; } }
  g.fillStyle = "rgba(20,28,24,0.62)"; g.strokeStyle = "rgba(200,230,215,0.4)"; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R + 16, 0, 2 * Math.PI); g.fill(); g.stroke();
  for (const [f, col] of [[1, "rgba(160,220,255,0.40)"], [Z.jogTo, "rgba(160,220,255,0.22)"], [Z.walkTo, "rgba(160,220,255,0.22)"], [Z.deadzone, "rgba(255,255,255,0.40)"]]) { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, f * R, 0, 2 * Math.PI); g.stroke(); }
  g.fillStyle = C.acc; g.beginPath(); g.moveTo(cx, cy - R - 13); g.lineTo(cx - 4, cy - R - 6); g.lineTo(cx + 4, cy - R - 6); g.fill();
  if (!rev && L.diag) { const F = L.ring.frames; g.strokeStyle = "rgba(255,212,94,0.35)"; g.lineWidth = 2; g.beginPath(); let first = true; for (const f of F) { if (f.tHost < (L.lastTs || 0) - 600) continue; const x = cx + f.rx * R, y = cy - f.ry * R; if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); } g.stroke(); }
  if (p) { const x = cx + p.x * R, y = cy - p.y * R; if (on && hyp(p.x, p.y) > 0.01) { g.strokeStyle = C.acc; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); } g.fillStyle = on ? "rgba(255,212,94,0.92)" : "rgba(220,235,228,0.5)"; g.beginPath(); g.arc(x, y, R * 0.3, 0, 2 * Math.PI); g.fill(); }
  const r = p ? hyp(p.x, p.y) : 0, a = p && r >= Z.deadzone ? angleDeg(p.x, p.y) : null;
  $("padInfo").textContent = rev ? `REPLAY · ${a == null ? "centre" : fdeg(a, 1)} · r ${r.toFixed(2)}` : on ? (a == null ? `deadzone · r ${r.toFixed(2)}` : `${fdeg(a, 1)} · r ${r.toFixed(2)} · ${zoneOf(r, Z)}`) : "drag to move"; }
// the attempt's arrays for drawing (built once per attempt)
function viewOf(a) { if (a._v) return a._v; const F = a.frames.data, D = a.derived.data, n = a.frames.n, t = F.tSim, pts = [];
  for (let i = 0; i < n; i++) pts.push({ t: t[i], x: F.rx[i], y: F.ry[i] });
  const st = a.state.data, rows = []; for (let i = 0; i < a.state.n; i++) rows.push(rowOf(a.state, i));
  a._v = { t, pts, rows, ser: { x: F.rx.map((v, i) => [t[i], v]), y: F.ry.map((v, i) => [t[i], v]), r: D.r.map((v, i) => [t[i], v]), m: D.m.map((v, i) => [t[i], v]), th: D.th.map((v, i) => [t[i], v]), om: D.om.map((v, i) => [t[i], v]) },
    ev: (a.stickEvents || []).map((e) => Object.assign({}, e, { t: e.tSim })) }; return a._v; }
function frameAt(a, t) { const T = a.frames.data.tSim; if (!T.length) return -1; let lo = 0, hi = T.length - 1; if (t < T[0]) return 0; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t + 1e-9) lo = m; else hi = m; } return T[hi] <= t + 1e-9 ? hi : lo; }
function refsFor(row, latchDeg) { if (!row || latchDeg == null) return []; const out = [{ deg: wrapDeg(row.psi - latchDeg), label: "face", col: C.s3 }, { deg: wrapDeg(row.travel - latchDeg), label: "trav", col: C.s1 }];
  const bb = Math.atan2(row.by - row.y, row.bx - row.x) * R2D; if (hyp(row.bx - row.x, row.by - row.y) > 0.05) out.push({ deg: wrapDeg(bb - latchDeg), label: "ball", col: C.ink }); if (row.reqH != null) out.push({ deg: wrapDeg(row.reqH - latchDeg), label: "req", col: C.acc }); return out; }
function drawAttHist(a, t) { const v = viewOf(a), i = frameAt(a, t), Z = a.input, row = stateAt(a, t);
  PL.drawStickHistory($("hist"), { pts: v.pts, tNow: t, span: HIST_SPAN, dz: Z.deadzone, zones: Z.zones, nn: MARKERS.nearNeutral, events: v.ev, cur: i >= 0 ? v.pts[i] : null, refs: refsFor(row, i >= 0 ? a.frames.data.latch[i] : null), title: "STICK — the last 2 s (replay)", sub: `${(t - a.capture.tStart).toFixed(2)} s` }); }
function drawLiveHist(ts) { const V = L.V, F = L.ring.frames, tNow = ts / 1000, pts = []; for (const f of F) if (f.tHost / 1000 >= tNow - HIST_SPAN - 0.05) pts.push({ t: f.tHost / 1000, x: f.rx, y: f.ry });
  const keys = V.src === "keys", latch = (keys ? V.latch.h : V.stick.latch) * R2D, cur = pts.length ? pts[pts.length - 1] : null;
  PL.drawStickHistory($("hist"), { pts, tNow, span: HIST_SPAN, dz: V.stick.cfg.deadzone, zones: V.stick.cfg, nn: MARKERS.nearNeutral, events: L.live.ev, cur, refs: refsFor(L.live.row, latch), title: L.st === "REC" ? "STICK — the last 2 s (recording)" : "STICK — the last 2 s (live)", sub: SRC_NAME[srcNow()] }); }
const PANELS = (s, refsM) => [
  { title: "stick X · Y (raw)", ticks: [-1, 0, 1], yMin: -1.05, yMax: 1.05, series: [{ name: "x", col: C.s1, pts: s.x }, { name: "y", col: C.s2, pts: s.y }] },
  { title: "magnitude", ticks: [0, 0.5, 1], yMin: 0, yMax: 1.05, series: [{ name: "raw r", col: C.s1, pts: s.r }, { name: "processed m (after dz)", col: C.s2, pts: s.m }], refs: refsM },
  { title: "angle θ (stick frame, + right)", ticks: [-180, -90, 0, 90, 180], yMin: -185, yMax: 185, series: [{ name: "θ", col: C.s3, pts: s.th }] },
  { title: "angular velocity ω (°/s)", ticks: [-1000, 0, 1000], yMin: -1600, yMax: 1600, series: [{ name: "ω", col: C.s6, pts: s.om }], refs: [{ v: 0, col: C.grid, dash: [] }] }];
function stickVlines(ev) { return ev.filter((e) => e.kind !== "dir_hold").map((e) => ({ t: e.tSim != null ? e.tSim : e.t, col: (PL.EV_STYLE[e.kind] || [C.ink])[0] })); }
function timelineRows(stickEv, rows, tl, dict, t0, t1) {
  const R = [], seg = (pred, lab, col, extra = {}) => { const out = []; let s = null; for (const r of rows) { const on = pred(r); if (on && s == null) s = r.t; if (!on && s != null) { out.push(Object.assign({ t: s, t2: r.t, col, label: lab }, extra)); s = null; } } if (s != null) out.push(Object.assign({ t: s, t2: t1, col, label: lab }, extra)); return out; };
  R.push({ name: "STICK", items: stickEv.filter((e) => e.kind !== "dir_hold").map((e) => ({ t: e.tSim != null ? e.tSim : e.t, col: (PL.EV_STYLE[e.kind] || [C.ink])[0], label: (PL.EV_STYLE[e.kind] || ["", e.kind])[1] })) });
  const req = []; let pm = null; for (const r of rows) { if (r.mode != null && r.mode !== pm && pm != null) req.push({ t: r.t, col: C.dim, label: MODES[r.mode] || "", glyph: "tick" }); pm = r.mode; }
  for (const e of tl) { if (e.kind === "replan" && /request/.test(e.reason)) req.push({ t: e.t, col: C.s1, glyph: "tick" }); if (e.kind === "request") req.push({ t: e.t, col: C.warn, label: "REQ " + e.intent }); if (e.kind === "request_end") req.push({ t: e.t, col: C.warn, label: e.result }); }
  R.push({ name: "REQUEST", items: req });
  R.push({ name: "SUPPORT", items: [...seg((r) => r.sup === 1 || r.sup === 3, "L", C.s3, { lane: 0, lanes: 2, ink: C.bg }), ...seg((r) => r.sup === 2 || r.sup === 3, "R", C.s1, { lane: 1, lanes: 2, ink: C.bg })] });
  R.push({ name: "BALL", items: tl.filter((e) => e.kind === "contact" || e.kind === "miss").map((e) => ({ t: e.t, col: e.kind === "miss" ? C.bad : e.tech && e.tech !== "CARRY" ? C.s2 : C.s4, label: e.F + (e.kind === "miss" ? " MISS" : e.tech && e.tech !== "CARRY" ? " " + String(e.role || "").slice(0, 10) : "") })) });
  const acts = tl.filter((e) => e.kind === "action"), ai = []; acts.forEach((e, i) => ai.push({ t: e.t, t2: i + 1 < acts.length ? acts[i + 1].t : t1, col: e.akind === "CARRY" ? "#3a4a42" : e.akind === "GENERIC" ? C.s3 : C.s2, label: e.label, ink: e.akind === "CARRY" ? C.ink : C.bg }));
  if (!acts.length && rows.length && dict) ai.push({ t: rows[0].t, t2: t1, col: "#3a4a42", label: dict.act[rows[0].act] || "", ink: C.ink });
  for (const e of tl) if (e.kind === "control") ai.push({ t: e.t, col: C.ok, label: "ctl", glyph: "tick" }); R.push({ name: "ACTION", items: ai });
  R.push({ name: "POSSESSION", items: [...seg((r) => r.poss === 1, "CONTROLLED", "#2f6b47", { ink: C.ink }), ...seg((r) => r.poss === 0, "FREE", "#6b3a2f", { ink: C.ink })] });
  return R; }
function moments(a) { const s = a.summary || summarize(a), A = s.anchor, out = [{ t: A.t, col: C.s5, label: A.kind === "mark" ? "INTENT (mark)" : "INTENT (auto)" }];
  if (s.nextTDA != null) out.push({ t: A.t + s.nextTDA, col: C.s3, label: "SUPPORT" }); if (s.firstAction) out.push({ t: A.t + s.firstAction.dt, col: C.s4, label: "ACTION" }); if (a.capture.tStart > a.capture.t0) out.push({ t: a.capture.tStart, col: C.dim, label: "START" }); return out; }
function drawAttPlots(a, t) { const v = viewOf(a), Z = a.input, t0 = a.capture.t0, t1 = a.capture.t1, ax = (x) => (x - a.capture.tStart).toFixed(1);
  const refsM = [{ v: Z.deadzone, col: "rgba(255,255,255,0.35)" }, { v: Z.zones.walkTo, col: "rgba(160,220,255,0.25)" }, { v: Z.zones.jogTo, col: "rgba(160,220,255,0.25)" }];
  PL.drawSeries($("ts"), { t0, t1, panels: PANELS(v.ser, refsM), vlines: stickVlines(v.ev), playhead: t, hoverT: L.hoverWhere === "ts" ? L.hoverT : null, readout: (x) => readoutAtt(a, x), axisFmt: ax });
  PL.drawTimeline($("tl"), { t0, t1, rows: timelineRows(v.ev, v.rows, a.timeline, a.dict, t0, t1), playhead: t, moments: moments(a), hoverT: L.hoverWhere === "tl" ? L.hoverT : null, readout: (x) => readoutTl(a.timeline, stateAt(a, x), a.dict, x, a.capture.tStart), axisFmt: ax }); }
function drawLivePlots() { const V = L.V, S = V.sim, tN = S.t, t0 = tN - LIVE_SPAN, F = L.ring.frames.filter((f) => f.k * DT >= t0 - 0.1), s = { x: [], y: [], r: [], m: [], th: [], om: [] };
  for (const f of F) { const t = f.k * DT, d = f.d; s.x.push([t, f.rx]); s.y.push([t, f.ry]); if (d) { s.r.push([t, d.r]); s.m.push([t, d.m]); s.th.push([t, d.th]); s.om.push([t, d.om]); } }
  const Z = V.stick.cfg, refsM = [{ v: Z.deadzone, col: "rgba(255,255,255,0.35)" }, { v: Z.walkTo, col: "rgba(160,220,255,0.25)" }, { v: Z.jogTo, col: "rgba(160,220,255,0.25)" }], ax = (x) => (x - tN).toFixed(1);
  PL.drawSeries($("ts"), { t0, t1: tN, panels: PANELS(s, refsM), vlines: stickVlines(L.live.ev), hoverT: L.hoverWhere === "ts" ? L.hoverT : null, readout: (x) => readoutLive(x), axisFmt: ax });
  const T = L.live.tl; PL.drawTimeline($("tl"), { t0, t1: tN, rows: T ? timelineRows(L.live.ev, T.rows, T.timeline, T.dict, t0, tN) : [], hoverT: L.hoverWhere === "tl" ? L.hoverT : null, readout: T ? (x) => readoutTl(T.timeline, nearestRow(T.rows, x), T.dict, x, tN) : null, axisFmt: ax }); }
const nearestRow = (rows, t) => { let b = null; for (const r of rows) if (r.t <= t + 1e-9) b = r; else break; return b || rows[0] || null; };
function readoutAtt(a, t) { const i = frameAt(a, t); if (i < 0) return []; const D = rowOf(a.derived, i), F = rowOf(a.frames, i);
  return [`t ${(t - a.capture.tStart).toFixed(3)} s (sim ${t.toFixed(3)})`, `raw x ${fmt(F.rx, 3, true)}  y ${fmt(F.ry, 3, true)}  r ${fmt(D.r, 3)}`, `processed m ${fmt(D.m, 3)} · zone ${zoneOf(D.r, a.input.zones && Object.assign({ deadzone: a.input.deadzone }, a.input.zones))}`,
    `θ ${fdeg(D.th, 1)} · ω ${fmt(D.om, 0, true)}°/s · ṙ ${fmt(D.rd, 2, true)}/s`, `Δ50 ${fdeg(D.d50)} Δ100 ${fdeg(D.d100)} Δ150 ${fdeg(D.d150)} Δ250 ${fdeg(D.d250)} Δ500 ${fdeg(D.d500)} · max 500 ms ${fdeg(D.maxRecent)}`,
    `since dir change ${fmt(D.tSinceDir, 2)} s · since neutral ${fmt(D.tSinceNeutral, 2)} s · in ±${MARKERS.corridorDeg}° ${fmt(D.tCorr, 2)} s`, `held ≥ .40 ${fmt(D.tAbove40, 2)} s · ≥ .72 ${fmt(D.tAbove72, 2)} s · ≥ .95 ${fmt(D.tAbove95, 2)} s`,
    `delivered: ${F.reqH == null ? "no direction" : fdeg(F.reqH, 1) + " world"} · ${F.mode != null ? MODES[F.mode] : "—"} · ${SRC[F.src]}`]; }
function readoutLive(t) { let b = null; for (const f of L.ring.frames) if (f.k * DT <= t + 1e-9) b = f; if (!b || !b.d) return []; const D = b.d;
  return [`t ${(t - L.V.sim.t).toFixed(3)} s`, `raw x ${fmt(b.rx, 3, true)}  y ${fmt(b.ry, 3, true)}  r ${fmt(D.r, 3)} · m ${fmt(D.m, 3)}`, `θ ${fdeg(D.th, 1)} · ω ${fmt(D.om, 0, true)}°/s`, `Δ50 ${fdeg(D.d50)} Δ150 ${fdeg(D.d150)} Δ500 ${fdeg(D.d500)}`, `delivered: ${b.reqH == null ? "no direction" : fdeg(b.reqH, 1)} · ${b.mode != null ? MODES[b.mode] : "—"}`]; }
function readoutTl(tl, row, dict, t, tz) { const out = [`t ${(t - tz).toFixed(3)} s`]; let near = null; for (const e of tl) if (e.kind !== "replan" && Math.abs(e.t - t) < 0.04 && (!near || Math.abs(e.t - t) < Math.abs(near.t - t))) near = e;
  if (near) out.push(evText(near)); if (row) { out.push(`support ${SUPPORT[row.sup]} · step φ ${fmt(row.stepPhase, 2)} · next TD ${row.nextTD != null ? "+" + (row.nextTD - t).toFixed(3) + " s " + (dict.F[row.nextTDF] || "") : "—"}`); out.push(`${dict.act[row.act] || "—"} · ${dict.phase[row.phase] || "—"}${row.committed ? " · COMMITTED" : ""} · ${POSS[row.poss]}`); } return out; }
function evText(e) { switch (e.kind) { case "contact": return `touch ${e.F} · ${String(e.surface).toLowerCase()} · ${e.role} · ${e.tech}`; case "miss": return `MISSED contact ${e.F}`; case "touchdown": return `touchdown ${e.F}`; case "liftoff": return `lift-off ${e.F}`;
  case "action": return `action → ${e.label}`; case "select": return `selected ${e.label}`; case "control": return `control return · ${e.label}`; case "poss": return `possession ${e.from} → ${e.to} (${e.why})`; case "request": return `EXPLICIT REQUEST ${e.intent}`;
  case "request_end": return `request ${e.intent} → ${e.result}${e.played ? " " + e.played : ""}`; default: return e.kind; } }
// the dense state panel (one state row + the dictionary)
function stateText(r, dict, t, extra = "") { if (!r) return "—"; const F = (i) => (i == null ? "—" : dict.F[i]), dt = (x) => (x == null ? "—" : (x - t >= 0 ? "+" : "") + (x - t).toFixed(3) + " s"), sw = r.sup === 1 ? "R" : r.sup === 2 ? "L" : r.sup === 0 ? "both (flight)" : "— (double support)";
  const tv = (v, pos, neg) => (v == null ? "—" : v > 0 ? pos : neg);
  return `<span class="hd">${extra}t ${r.t.toFixed(3)} s · k ${r.k}</span>
<span class="k">mode</span> ${r.mode != null && r.mode >= 0 ? MODES[r.mode] : "—"} <span class="k">speed</span> ${fmt(r.s, 2)} m/s
<span class="k">player</span> (${fmt(r.x, 2)}, ${fmt(r.y, 2)})
<span class="k">velocity</span> (${fmt(r.vx, 2, true)}, ${fmt(r.vy, 2, true)}) m/s
<span class="k">facing</span> ${fdeg(r.psi, 1)} <span class="k">travel</span> ${fdeg(r.travel, 1)}
<span class="k">desired</span> ${fdeg(r.reqH, 1)} <span class="k">plan for</span> ${fdeg(r.planReqH, 1)}
<span class="k">turn asked</span> ${fdeg(r.turn, 1)} <span class="k">vs facing</span> ${fdeg(r.relFacing, 1)}
<span class="k">vs velocity</span> ${fdeg(r.relVel, 1)}
<span class="k">turn → ball side</span> ${tv(r.turnVsBall, "toward", "away")}
<span class="k">turn → support side</span> ${tv(r.turnVsSupport, "toward", "away")}
<span class="k">ball</span> (${fmt(r.bx, 2)}, ${fmt(r.by, 2)}, ${fmt(r.bz, 2)})
<span class="k">ball speed</span> ${fmt(hyp(r.bvx, r.bvy), 2)} m/s <span class="k">dist</span> ${fmt(r.bDist, 2)}
<span class="k">ball rel</span> fwd ${fmt(r.bFwd, 2, true)} lat ${fmt(r.bLat, 2, true)} (${r.bLat >= 0 ? "R" : "L"})
<span class="k">support</span> ${SUPPORT[r.sup]} <span class="k">swing</span> ${sw}
<span class="k">step φ</span> ${fmt(r.stepPhase, 2)} <span class="k">last step</span> ${fmt(r.stepDur, 3)} s
<span class="k">last TD</span> ${F(r.lastTDF)} ${dt(r.lastTD)}
<span class="k">next TD</span> ${F(r.nextTDF)} ${dt(r.nextTD)} <span class="k">L/R</span> ${dt(r.nextTDL)} / ${dt(r.nextTDR)}
<span class="k">technical foot</span> ${F(r.techF)} <span class="k">next touch</span> ${dt(r.nextC)}
<span class="k">last touch</span> ${F(r.lastCF)} ${dt(r.lastC)}
<span class="k">possession</span> ${POSS[r.poss]}
<span class="k">committed</span> ${r.committed ? `<span class="w">YES</span> until ${dt(r.commitUntil)}` : "no"}
<span class="k">action</span> ${esc(dict.act[r.act] || "—")}
<span class="k">phase</span> ${esc(dict.phase[r.phase] || "—")}
<span class="k">explicit request</span> ${esc(dict.skill[r.skill] || "—")}`; }
function liveText() { const V = L.V, S = V.sim; $("src").textContent = SRC_NAME[srcNow()] + (L.gp.id && !L.gp.active ? " · gamepad connected (move it to use it)" : "");
  if (S.k > 2) { const kB = S.k - 1, kA = Math.max(0, kB - 4 * Math.floor(Math.min(kB, Math.round(LIVE_SPAN / DT)) / 4)); L.live.tl = sampleState(S, kA, kB, 4); L.live.row = L.live.tl.rows[L.live.tl.rows.length - 1]; }
  $("statePanel").innerHTML = L.live.row ? stateText(L.live.row, L.live.tl.dict, L.live.row.t, V.paused ? "PAUSED · " : "LIVE · ") : "—";
  $("attHead").innerHTML = L.st === "REC" ? `<b style="color:var(--bad)">● RECORDING</b> “${esc(L.rec.label)}” · ${L.rec.mode}${L.rec.synth ? " · synthetic test trace" : ""} · STOP with Enter / ■ (gamepad Menu)` :
    `LIVE · next attempt: <b>${esc(currentLabel())}</b> · ${L.capture === "RESET" ? "RESET start (kick-off from rest)" : "CONTINUOUS start (+1.5 s pre-roll)"} · ● START with Enter`;
  $("timing").innerHTML = ""; $("sumGrid").innerHTML = ""; }
function transportText(a, t) { const R = L.V.replay; if (!R) return; $("rPlay").textContent = R.playing ? "❚❚" : "▶"; $("rScrub").value = String(Math.round(((t - R.t0) / Math.max(1e-6, R.t1 - R.t0)) * 1000)); $("rT").textContent = `${(t - a.capture.tStart).toFixed(2)} / ${(a.capture.t1 - a.capture.tStart).toFixed(2)} s`; }
function attText(a, t) { const s = a.summary || summarize(a), A = s.anchor, row = stateAt(a, t);
  $("statePanel").innerHTML = stateText(row, a.dict, t, L.st === "REVIEW" ? "REVIEW · " : "REPLAY · ");
  const flags = [a.flags && a.flags.explicitRequests ? `<span class="flag">EXPLICIT REQUEST used ×${a.flags.explicitRequests}</span>` : "", a.flags && a.flags.autoVocab ? `<span class="flag">AUTO BF / CROQUETA SEEN ×${a.flags.autoVocab}</span>` : "", a.capture.autoStopped ? `<span class="flag">auto-stopped</span>` : "", a.input.simRate !== 1 ? `<span class="flag">recorded at ${a.input.simRate}×</span>` : ""].filter(Boolean).join(" · ");
  $("attHead").innerHTML = `<b>${L.st === "REVIEW" ? "UNSAVED ATTEMPT" : "SAVED ATTEMPT"}</b> “${esc(a.label)}” · ${a.capture.mode} · ${a.capture.duration.toFixed(2)} s · ${esc(a.input.source)} · ${a.frames.n} frames (${fmt(a.input.frameHz, 0)} Hz) · ${a.raw.n} raw events${flags ? " · " + flags : ""}` + (L.replay && L.replay.det ? `<br><span style="color:${L.replay.ok === false ? "var(--bad)" : "var(--ok)"}">${esc(L.replay.det)}</span>` : "");
  const f = (x, d = 3) => (x == null ? "—" : "+" + x.toFixed(d) + " s");
  $("timing").innerHTML = `<span class="i">INPUT INTENT MOMENT</span> ${(A.t - a.capture.tStart).toFixed(3)} s (${esc(ANCHORS[A.kind] || A.kind)}) · speed ${fmt(s.speedA, 2)} m/s · support ${s.supA || "—"} · step φ ${fmt(s.stepPhaseA, 2)} · ball ${s.ballSideA || "—"} · ${esc(s.actA || "")}\n` +
    `<span class="s">SUPPORT / STRIDE OPPORTUNITY</span> next touchdown ${f(s.nextTDA)} (${s.nextTDFA || "—"}) · next planned touch ${f(s.nextCA)} (${s.nextCFA || "—"})${s.committedA ? " · an action was COMMITTED at the moment" : ""}\n` +
    `<span class="a">ACTUAL ACTION START</span> ${s.firstAction ? `${esc(s.firstAction.label)} selected ${f(s.firstAction.dt, 2)}` : "no new action after it (the carry went on)"} · first touch after it ${s.firstContact ? f(s.firstContact.dt) + " (" + s.firstContact.F + ")" : "—"}`;
  $("sumGrid").innerHTML = SUMMARY_COLUMNS.map(([, hd, u, g, d]) => { const v = g(s); return `<div><span>${hd}</span> ${d == null ? esc(v ?? "—") : fmt(v, d)}${u && v != null ? " " + u : ""}</div>`; }).join(""); }
// ══ THE ATTEMPT LIST · THE PER-LABEL STATISTICS · EXPORT / IMPORT ═══════════════════════════════════════════════════════════════════════════════
function sumOf(a) { const k = a.id + "|" + (a.owner && a.owner.mark); if (!L.sumCache.has(k)) L.sumCache.set(k, summarize(a)); return L.sumCache.get(k); }
function labelsAll() { const s = new Set(PRESET_LABELS); for (const a of L.attempts) s.add(a.label); return [...s]; }
function renderList() { $("nAtt").textContent = L.attempts.length; const f = $("selFilter"), cur = f.value, labs = [...new Set(L.attempts.map((a) => a.label))];
  f.innerHTML = `<option value="">all labels (${L.attempts.length})</option>` + labs.map((l) => `<option value="${esc(l)}">${esc(l)} (${L.attempts.filter((a) => a.label === l).length})</option>`).join(""); f.value = labs.includes(cur) ? cur : "";
  const shown = L.attempts.filter((a) => !f.value || a.label === f.value);
  $("listNote").textContent = L.dbOk ? `Stored in this browser (IndexedDB, ${location.origin}). EXPORT to keep a file — future sessions analyse the exported JSON (schema TOUCHLINE_LEFT_STICK_RECORDING_V1).` : "Browser storage unavailable: attempts are in memory only — EXPORT before closing.";
  const cols = SUMMARY_COLUMNS.filter(([k]) => ["duration", "startDir", "maxR", "travel", "d150", "peakOm", "crossings", "speed0", "speedA", "supA", "stepPhaseA", "nextTDA"].includes(k));
  $("attTable").innerHTML = `<tr><th></th><th>#</th><th class="l">label</th><th class="l">saved</th><th class="l">input</th>${cols.map(([, h, u]) => `<th>${h}${u ? " " + u : ""}</th>`).join("")}<th class="l">flags</th><th></th></tr>` +
    shown.map((a, i) => { const s = sumOf(a), fl = [a.flags && a.flags.explicitRequests ? "REQ" : "", a.owner && a.owner.mark != null ? "mark" : "", a.input.synthetic ? "test" : "", a.capture.mode === "CONTINUOUS" ? "cont" : ""].filter(Boolean).join(" ");
      return `<tr class="${L.att && L.att.id === a.id ? "cur" : ""}"><td><input type="checkbox" data-sel="${a.id}" ${L.sel.has(a.id) ? "checked" : ""}></td><td>${i + 1}</td><td class="l">${esc(a.label)}</td><td class="l">${esc(localTime(a.savedAt || a.created))}</td><td class="l">${esc(a.input.source)}</td>` +
        cols.map(([, , , g, d]) => { const v = g(s); return `<td>${d == null ? esc(v ?? "—") : fmt(v, d)}</td>`; }).join("") + `<td class="l flag">${fl}</td><td><button data-rep="${a.id}" title="replay">▶</button><button data-exp="${a.id}" title="export this attempt">⤓</button><button data-del="${a.id}" title="delete">⨯</button></td></tr>`; }).join("");
  $("attTable").querySelectorAll("[data-rep]").forEach((b) => (b.onclick = () => { setTab("live"); replaySaved(b.dataset.rep); }));
  $("attTable").querySelectorAll("[data-exp]").forEach((b) => (b.onclick = () => exportList(L.attempts.filter((a) => a.id === b.dataset.exp), "attempt")));
  $("attTable").querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => { if (!confirm("Delete this attempt?")) return; await DB.del(b.dataset.del).catch(() => {}); L.attempts = L.attempts.filter((a) => a.id !== b.dataset.del); L.sel.delete(b.dataset.del); renderList(); }));
  $("attTable").querySelectorAll("[data-sel]").forEach((c) => (c.onchange = () => { if (c.checked) L.sel.add(c.dataset.sel); else L.sel.delete(c.dataset.sel); }));
  const S = labelStats(L.attempts), keys = ["duration", "d150", "peakOm", "travel", "speedA", "stepPhaseA", "nextTDA"], md = (x, d) => (x ? `${fmt(x.median, d)} [${fmt(x.min, d)} – ${fmt(x.max, d)}]` : "—");
  $("statTable").innerHTML = `<tr><th class="l">label</th><th>n</th>${keys.map((k) => `<th>${SUMMARY_COLUMNS.find((c) => c[0] === k)[1]}</th>`).join("")}<th class="l">support @A</th></tr>` +
    Object.entries(S).map(([lab, o]) => `<tr><td class="l">${esc(lab)}</td><td>${o.n}</td>${keys.map((k) => `<td>${md(o.num[k], SUMMARY_COLUMNS.find((c) => c[0] === k)[4])}</td>`).join("")}<td class="l">${Object.entries(o.cat.supA || {}).map(([k, v]) => `${k} ${v}`).join(" · ")}</td></tr>`).join("");
  fillLabelSelect(); renderCompare(); }
function exportList(list, what) { if (!list.length) { toast("Nothing to export."); return; } const d = dataset(list.map(strip), { exported: what, sandboxChecks: L.checks || null }), blob = new Blob([JSON.stringify(d)], { type: "application/json" });
  const lab = what === "attempt" ? list[0].label : new Set(list.map((a) => a.label)).size === 1 ? list[0].label : "all", a = document.createElement("a"), ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  a.href = URL.createObjectURL(blob); a.download = `touchline_lsr_v1_${lab.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase()}_${list.length}_${ts}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`Exported ${list.length} attempt(s) · ${(blob.size / 1024).toFixed(0)} KB`); }
async function importFiles(files) { let added = 0, skipped = 0; const errs = [];
  for (const f of files) { try { const o = JSON.parse(await f.text()), v = validateDataset(o); if (!v.ok) errs.push(`${f.name}: ${v.errors.slice(0, 3).join("; ")}`);
      for (const a of v.attempts) { if (!a.id || !a.frames) continue; if (L.attempts.some((x) => x.id === a.id)) { skipped++; continue; } a.status = "saved"; a.imported = a.imported || new Date().toISOString(); await DB.put(a).catch(() => {}); L.attempts.push(a); added++; } }
    catch (e) { errs.push(`${f.name}: ${e.message}`); } }
  renderList(); toast(`Imported ${added} attempt(s)${skipped ? ` · ${skipped} already here` : ""}${errs.length ? " · " + errs.join(" | ") : ""}`, errs.length ? 8000 : 3000); return { added, skipped, errs }; }
// ══ COMPARE: the attempts of one label, aligned at an anchor ═════════════════════════════════════════════════════════════════════════════════════
function fillLabelSelect() { const sel = $("cmpLabel"), labs = [...new Set(L.attempts.map((a) => a.label))]; const cur = L.cmp.label && labs.includes(L.cmp.label) ? L.cmp.label : labs[0] || ""; sel.innerHTML = labs.map((l) => `<option value="${esc(l)}">${esc(l)} (${L.attempts.filter((a) => a.label === l).length})</option>`).join(""); sel.value = cur; L.cmp.label = cur;
  const atts = L.attempts.filter((a) => a.label === cur), hi = $("cmpHi"); hi.innerHTML = `<option value="">none</option>` + atts.map((a, i) => `<option value="${a.id}">#${i + 1} ${esc(localTime(a.savedAt || a.created))}</option>`).join(""); hi.value = atts.some((a) => a.id === L.cmp.hi) ? L.cmp.hi : ""; }
function renderCompare() { if (!$("tab-cmp").classList.contains("on")) return; const atts = L.attempts.filter((a) => a.label === L.cmp.label), W = L.cmp.win;
  if (!atts.length) { PL.fit($("cmpPaths")); PL.fit($("cmpTs")); $("cmpStats").innerHTML = ""; $("cmpEntry").innerHTML = `<tr><td class="l">No saved attempts yet.</td></tr>`; return; }
  const paths = [], ser = { th: [], r: [], om: [] }, Z = atts[0].input;
  for (const a of atts) { const A = anchorOf(a, L.cmp.anchor), F = a.frames.data, D = a.derived.data, hi = a.id === L.cmp.hi, pts = [], th = [], r = [], om = [];
    for (let i = 0; i < a.frames.n; i++) { const t = F.tSim[i] - A.t; if (t < -W || t > W) continue; pts.push({ x: F.rx[i], y: F.ry[i], t }); th.push([t, D.th[i]]); r.push([t, D.r[i]]); om.push([t, D.om[i]]); }
    const ai = A.i >= 0 ? A.i : 0; paths.push({ pts, hi, anchor: { x: F.rx[ai], y: F.ry[ai] } }); const col = hi ? C.acc : "rgba(57,135,229,0.55)"; ser.th.push({ name: "", col, pts: th, hi }); ser.r.push({ name: "", col, pts: r, hi }); ser.om.push({ name: "", col, pts: om, hi }); }
  const ord = (L2) => L2.filter((s) => !s.hi).concat(L2.filter((s) => s.hi));
  PL.drawOverlayPaths($("cmpPaths"), { paths, dz: Z.deadzone, zones: Z.zones, nn: MARKERS.nearNeutral, title: `${atts.length} × ${L.cmp.label}` });
  PL.drawSeries($("cmpTs"), { t0: -W, t1: W, axisFmt: (t) => (t >= 0 ? "+" : "") + t.toFixed(2), vlines: [{ t: 0, col: C.s5 }], panels: [
    { title: "angle θ (stick frame)", ticks: [-180, -90, 0, 90, 180], yMin: -185, yMax: 185, series: ord(ser.th), legend: false },
    { title: "magnitude r (raw)", ticks: [0, 0.5, 1], yMin: 0, yMax: 1.05, series: ord(ser.r), legend: false, refs: [{ v: Z.deadzone, col: "rgba(255,255,255,0.35)" }] },
    { title: "angular velocity ω (°/s)", ticks: [-1000, 0, 1000], yMin: -1600, yMax: 1600, series: ord(ser.om), legend: false }] });
  const S = atts.map((a) => summarize(a, L.cmp.anchor)), num = SUMMARY_COLUMNS.filter((c) => c[4] != null);
  $("cmpStats").innerHTML = `<tr><th class="l">diagnostic</th><th>n</th><th>min</th><th>q25</th><th>median</th><th>q75</th><th>max</th><th>sd</th></tr>` + num.map(([k, hd, u, g, d]) => { const x = describe(S.map(g)); return `<tr><td class="l">${hd}${u ? " (" + u + ")" : ""}</td>${x ? [x.n, x.min, x.q25, x.median, x.q75, x.max, x.sd].map((v, j) => `<td>${j ? fmt(v, d) : v}</td>`).join("") : `<td colspan="7">—</td>`}</tr>`; }).join("");
  $("cmpEntry").innerHTML = `<tr><th>#</th><th class="l">anchor</th><th>v m/s</th><th>mode</th><th>support</th><th>step φ</th><th>→ next TD</th><th>→ next touch</th><th>ball</th><th>turn</th><th class="l">action at A</th><th class="l">→ 1st action</th></tr>` +
    S.map((s, i) => `<tr class="${atts[i].id === L.cmp.hi ? "cur" : ""}"><td>${i + 1}</td><td class="l">${s.anchor.kind}</td><td>${fmt(s.speedA, 2)}</td><td>${s.modeA || "—"}</td><td>${s.supA || "—"}</td><td>${fmt(s.stepPhaseA, 2)}</td><td>${s.nextTDA != null ? fmt(s.nextTDA, 3) + " " + (s.nextTDFA || "") : "—"}</td><td>${s.nextCA != null ? fmt(s.nextCA, 3) + " " + (s.nextCFA || "") : "—"}</td><td>${s.ballSideA || "—"} ${fmt(s.ballLatA, 2, true)}</td><td>${fdeg(s.turnA)}</td><td class="l">${esc(s.actA || "—")}</td><td class="l">${s.firstAction ? esc(s.firstAction.label) + " +" + s.firstAction.dt.toFixed(2) : "—"}</td></tr>`).join(""); }
// ══ UI ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function setTab(id) { document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === id)); document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.id === "tab-" + id)); if (id === "cmp") renderCompare(); }
function buildUI() {
  $("selLabel").innerHTML = PRESET_LABELS.map((l) => `<option>${esc(l)}</option>`).join(""); $("selSynth").innerHTML = `<option value="">recorder test trace…</option>` + SYNTH.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
  $("cmpAnchor").innerHTML = Object.entries(ANCHORS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
  $("bStart").onclick = (e) => { toggleRec(); e.target.blur(); }; $("bSave").onclick = (e) => { save(); e.target.blur(); }; $("bDiscard").onclick = (e) => { discard(); e.target.blur(); };
  $("selCapture").onchange = (e) => { L.capture = e.target.value; e.target.blur(); }; $("selPad").onchange = (e) => { L.padR = +e.target.value; sizePad(); e.target.blur(); };
  $("cDiag").onchange = (e) => { L.diag = e.target.checked; if (!L.diag) { for (const id of ["hist", "ts", "tl"]) PL.fit($(id)); $("statePanel").textContent = ""; $("timing").textContent = ""; $("sumGrid").textContent = ""; } else resetLive(); e.target.blur(); };
  $("bSynth").onclick = (e) => { const id = $("selSynth").value; if (!id) { toast("Choose a recorder test trace first."); return; } startSynth(id); e.target.blur(); };
  $("rPlay").onclick = () => togglePlay(); document.querySelectorAll("[data-rr]").forEach((b) => (b.onclick = () => { L.rRate = +b.dataset.rr; if (L.V && L.V.replay) L.V.replay.rate = L.rRate; document.querySelectorAll("[data-rr]").forEach((x) => x.classList.toggle("on", x === b)); }));
  $("rScrub").oninput = (e) => { const R = L.V && L.V.replay; if (!R) return; R.playing = false; R.t = R.t0 + (+e.target.value / 1000) * (R.t1 - R.t0); };
  $("bVerify").onclick = () => { if (!L.att || !reviewing()) return; toast("Re-simulating the attempt from its record…", 1200); setTimeout(() => resimInto(L.att), 30); };
  $("bMark").onclick = () => setMark(); $("bClearMark").onclick = () => clearMark(); $("bLive").onclick = () => { if (L.st === "REPLAY") goLive(); else toast("REVIEW — SAVE or DISCARD first"); };
  document.querySelectorAll("#tabs button").forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
  $("selFilter").onchange = () => renderList(); $("bExportShown").onclick = () => exportList(L.attempts.filter((a) => !$("selFilter").value || a.label === $("selFilter").value), "shown");
  $("bExportSel").onclick = () => exportList(L.attempts.filter((a) => L.sel.has(a.id)), "selected"); $("bExportAll").onclick = () => exportList(L.attempts, "all");
  $("bImport").onclick = () => $("fImport").click(); $("fImport").onchange = (e) => { importFiles([...e.target.files]); e.target.value = ""; };
  $("bDelSel").onclick = async () => { if (!L.sel.size || !confirm(`Delete ${L.sel.size} selected attempt(s)?`)) return; for (const id of L.sel) await DB.del(id).catch(() => {}); L.attempts = L.attempts.filter((a) => !L.sel.has(a.id)); L.sel.clear(); renderList(); };
  $("cmpLabel").onchange = (e) => { L.cmp.label = e.target.value; L.cmp.hi = ""; fillLabelSelect(); renderCompare(); }; $("cmpAnchor").onchange = (e) => { L.cmp.anchor = e.target.value; renderCompare(); };
  $("cmpWin").onchange = (e) => { L.cmp.win = +e.target.value; renderCompare(); }; $("cmpHi").onchange = (e) => { L.cmp.hi = e.target.value; renderCompare(); };
  for (const id of ["ts", "tl"]) { const cv = $(id); cv.addEventListener("mousemove", (e) => { const T = plotT(cv, e); L.hoverT = T; L.hoverWhere = id; }); cv.addEventListener("mouseleave", () => { L.hoverT = null; L.hoverWhere = null; });
    cv.addEventListener("click", (e) => { const R = L.V && L.V.replay; if (!R || !reviewing()) return; R.playing = false; R.t = Math.max(R.t0, Math.min(R.t1, plotT(cv, e))); }); }
  window.addEventListener("keydown", hostKey); window.addEventListener("keyup", hostKey); window.addEventListener("blur", () => releaseForwarded());
  bindPad(); helpText(); }
function plotT(cv, e) { const b = cv.getBoundingClientRect(), x = e.clientX - b.left, Lm = PL.PLOT_L, Rm = PL.PLOT_R, u = (x - Lm) / Math.max(1, b.width - Lm - Rm);
  if (reviewing() && L.att) return L.att.capture.t0 + u * (L.att.capture.t1 - L.att.capture.t0); const tN = L.V ? L.V.sim.t : 0; return tN - LIVE_SPAN + u * LIVE_SPAN; }
function helpText() { $("help").innerHTML = `<p><b>NO INTENT RECOGNIZER EXISTS.</b> This lab records what your thumb does and what the canonical footballer (the DRIBBLING VOCABULARY milestone f775daac, unmodified) was doing. Nothing here selects or triggers a technique; the label is your note and the simulation never reads it.</p>
<p><b>Workflow</b> — 1 choose what you are trying to do (or type a custom label) · 2 <kbd>Enter</kbd> / ● START · 3 dribble naturally and do the gesture · 4 <kbd>Enter</kbd> / ■ STOP · 5 the attempt replays (the stick moves through the circle with the footballer) · 6 inspect; <kbd>G</kbd> marks the instant you meant the gesture (optional) · 7 <kbd>Y</kbd> SAVE or <kbd>⌫</kbd> DISCARD · 8 repeat — 10–20 per label, naturally, not one perfect gesture.</p>
<p><b>Start</b> — RESET: START puts the footballer standing on the spot with the ball (every attempt from rest, self-contained, cheap to re-simulate). CONTINUOUS: START keeps the dribble going and the attempt includes the 1.5 s before START. An attempt stops by itself at ${MAX_DUR} s (the simulation keeps 12 s of history).</p>
<p><b>Inputs</b> — the virtual stick (press and drag; release = neutral; never snapped), the keyboard (WASD, Shift sprint, Alt walk, 1–4 mode — the sandbox's own path), a gamepad (left stick; RT sprint, LT walk; Menu = START / STOP; in review A save, B discard, X mark, Y play). The input line in the top bar shows which one is driving.</p>
<p><b>Replay</b> — <kbd>Space</kbd> / <kbd>L</kbd> play / pause · click a plot to jump · 1× / 0.5× / 0.25× · <kbd>Esc</kbd> back to LIVE from a saved attempt's replay. A saved attempt replays on the live session while it is still there, else it is re-simulated from its record and the hash is checked.</p>
<p><b>Compare</b> — all attempts of a label, aligned at the anchor (your mark when set, else the largest 150 ms direction change; or another anchor), their paths overlaid, θ / r / ω against the time from the anchor, descriptive ranges and the entry state.</p>
<p><b>Markers</b> — the coloured events (entered / left deadzone, near neutral, crossed centre, rapid reversal, large turn, magnitude spike / release, direction hold) are drawn at DISPLAY levels (lsr_signals.js MARKERS: near-neutral 0.30, crossing ≥ 135°, reversal |Δ150| ≥ 135°, large turn |Δ250| ≥ 60°, spike |ṙ| ≥ 5 /s, hold ±10° for 300 ms at r ≥ 0.40). They are not thresholds; every raw sample is recorded.</p>
<p><b>Sandbox keys taken by the lab</b> — R Q B X M N T V P K Space and . would reset, replay or switch the session under the recorder. The temporary explicit requests (7 / 8 BODY FEINT, 9 / 0 CROQUETA, E, U CRUISE) still work; an attempt that used one is flagged REQ.</p>
<p><b>Storage</b> — attempts are kept in this browser (${location.origin}); EXPORT writes TOUCHLINE_LEFT_STICK_RECORDING_V1 JSON (the dataset for analysis), IMPORT reads it back.</p>`; }
window.LSR = Object.assign(window.LSR, { L, start: (o) => startRecording(o), stop: () => stopRecording(false), save: () => save(), discard: () => discard(), live: () => goLive(), replay: (id) => replaySaved(id), resim: (a) => resimInto(a || L.att),
  synth: (id) => startSynth(id), mark: () => setMark(), setDiag: (on) => { $("cDiag").checked = !!on; $("cDiag").onchange({ target: $("cDiag") }); }, capture: (m) => { L.capture = m; $("selCapture").value = m; }, label: (s) => { $("customLabel").value = s || ""; },
  attempts: () => L.attempts, current: () => L.att, dataset: (ids) => dataset((ids ? L.attempts.filter((a) => ids.includes(a.id)) : L.attempts).map(strip)), importObj: async (o) => importFiles([{ name: "obj", text: async () => JSON.stringify(o) }]),
  perf: () => { const q = (A, x) => { const s = A.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(x * s.length))] : 0; }, avg = (A) => (A.length ? A.reduce((a, b) => a + b, 0) / A.length : 0), o = {}; for (const [k, A] of Object.entries(L.perf)) o[k] = { n: A.length, avg: avg(A), p95: q(A, 0.95), p99: q(A, 0.99), max: A.length ? Math.max(...A) : 0 }; return o; },
  resetPerf: () => { for (const k in L.perf) L.perf[k].length = 0; }, state: () => L.st, version: LAB_VERSION, milestone: MILESTONE, simulation: SIMULATION });
boot().catch((e) => { console.error(e); toast("Lab failed: " + (e && e.message), 10000); });

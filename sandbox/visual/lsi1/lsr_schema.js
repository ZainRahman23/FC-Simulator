// ═══ lsi1/lsr_schema.js — LEFT-STICK INPUT LAB V1: THE RECORDING FORMAT (TOUCHLINE_LEFT_STICK_RECORDING_V1) ════════════════════════════════════════
// Pure (browser and node). A file is a DATASET: { schema, version, created, meta, attempts: [ATTEMPT, …] }. Every table inside an attempt is
// COLUMNAR — { n, fields: [names], data: { name: [values] } } — numbers rounded per field (below), null where undefined. The full field list and
// the meaning of every column: review_artifacts/left_stick_lab1/LEFT_STICK_LAB_REPORT.md §5.
export const SCHEMA = "TOUCHLINE_LEFT_STICK_RECORDING_V1";
export const SCHEMA_VERSION = 1;
export const LAB_VERSION = "LEFT-STICK INPUT LAB V1";
export const MILESTONE = { repository: "ZainRahman23/FC-Simulator", branch: "milestone/feint-croqueta-vocab-v1", tag: "checkpoint/touchline-feint-croqueta-vocab-v1-2026-10-24", commit: "f775daac80bb58f214f7ae011705162e4d4e9e95" };
export const SIMULATION = { build: "sandbox/visual/vocab2/", page: "sandbox/visual/vocab2_sandbox.html", engine: "layered (vocab2 ControlledSim, FULL stack)", dtS: 1 / 240, tickHz: 240,
  note: "the canonical sandbox page, unmodified, framed by the lab with ?external=1 (the lab advances its frames through window.PT.tick)" };
export const LAB = { page: "sandbox/visual/lsi1_lab.html", modules: "sandbox/visual/lsi1/", branch: "prototype/left-stick-intent-v1" };
// the owner's intent labels (HUMAN annotations — never read by the simulation); any free text is allowed too
export const PRESET_LABELS = ["NORMAL CARRY", "GENTLE LEFT", "GENTLE RIGHT", "SHARP LEFT", "SHARP RIGHT", "HARD REVERSAL", "FEINT LEFT → EXIT RIGHT", "FEINT RIGHT → EXIT LEFT",
  "LATERAL LEFT", "LATERAL RIGHT", "CROQUETA LEFT INTENT", "CROQUETA RIGHT INTENT", "STOP", "STOP → GO"];
// rounding (decimals) per column; anything else: 4
const DEC = { rx: 6, ry: 6, px: 6, py: 6, t: 5, tHost: 5, tSim: 5, th: 3, thu: 3, dth: 3, d50: 3, d100: 3, d150: 3, d250: 3, d500: 3, maxRecent: 3, om: 1, al: 0, rd: 3, psi: 3, h: 3, travel: 3, reqH: 3, planReqH: 3,
  turn: 3, relFacing: 3, relVel: 3, latch: 3, camH: 3, x: 4, y: 4, vx: 3, vy: 3, s: 3, bx: 3, by: 3, bz: 3, bvx: 3, bvy: 3, bFwd: 3, bLat: 3, bDist: 3, lastTD: 5, nextTD: 5, nextTDL: 5, nextTDR: 5, nextC: 5, lastC: 5, commitUntil: 5, stepPhase: 4, stepDur: 4 };
export const round = (v, d = 4) => (v == null || typeof v !== "number" || !Number.isFinite(v) ? (typeof v === "string" ? v : null) : Number(v.toFixed(d)));
// rows [{…}] → a columnar table (the fields in order; rounded)
export function toCols(rows, fields) { const data = {}; for (const f of fields) { const d = DEC[f] != null ? DEC[f] : 4; data[f] = rows.map((r) => round(r[f], d)); } return { n: rows.length, fields: fields.slice(), data }; }
export function rowOf(C, i) { const o = {}; for (const f of C.fields) o[f] = C.data[f][i]; return o; }
export function rowsOf(C) { const out = []; for (let i = 0; i < C.n; i++) out.push(rowOf(C, i)); return out; }
export const col = (C, f) => (C && C.data[f]) || [];
// the session's request record (S.log.input: per tick h (rad, −99 = none, quantised by the sim to 1e-6), mode index, input bits) run-length
// encoded: [[count, h, mode, bits], …] — exact (JSON keeps the quantised doubles), enough to re-simulate the session bit for bit
export function rleInput(flat, nTicks = flat.length / 3) { const out = []; for (let k = 0; k < nTicks; k++) { const h = flat[3 * k], m = flat[3 * k + 1], b = flat[3 * k + 2], L = out[out.length - 1]; if (L && L[1] === h && L[2] === m && L[3] === b) L[0]++; else out.push([1, h, m, b]); } return out; }
export function unrleInput(rle) { const out = []; for (const [n, h, m, b] of rle) for (let i = 0; i < n; i++) out.push(h, m, b); return out; }
export function newId(d = new Date()) { const p = (x, n = 2) => String(x).padStart(n, "0"); return `lsr-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2, 6)}`; }
export function dataset(attempts, extra = {}) { return Object.assign({ schema: SCHEMA, version: SCHEMA_VERSION, created: new Date().toISOString(), meta: { lab: LAB_VERSION, milestone: MILESTONE, simulation: SIMULATION, labBuild: LAB }, attempts }, extra); }
// a light structural check of an imported file (or a single attempt) → { ok, attempts, errors }
export function validateDataset(o) { const errors = [], need = ["id", "label", "capture", "input", "session", "frames", "derived", "state", "timeline"]; let atts = null;
  if (!o || typeof o !== "object") return { ok: false, attempts: [], errors: ["not a JSON object"] };
  if (o.schema !== SCHEMA) errors.push(`schema "${o.schema}" — expected "${SCHEMA}"`); if (o.version !== SCHEMA_VERSION) errors.push(`version ${o.version} — expected ${SCHEMA_VERSION}`);
  if (Array.isArray(o.attempts)) atts = o.attempts; else if (o.id && o.frames) atts = [o]; else errors.push("no attempts[]");
  for (const a of atts || []) { const miss = need.filter((k) => a[k] == null); if (miss.length) errors.push(`${a.id || "?"}: missing ${miss.join(", ")}`); for (const T of ["frames", "derived", "state", "raw"]) if (a[T] && (!Array.isArray(a[T].fields) || typeof a[T].data !== "object")) errors.push(`${a.id}: ${T} is not columnar`); }
  return { ok: errors.length === 0, attempts: atts || [], errors }; }

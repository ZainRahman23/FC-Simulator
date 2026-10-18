// ═══ receive_kill1/rk_conditions.js — RECEIVE-KILL-1: the calibration matrices and benchmarks ══════════════════════════════════════════════════════
// Every row is ONE incoming ball (speed v m/s at the receiver's reach plane, descent `drop` deg (+ dropping, − rising after a bounce), ball-centre
// height h m, bearing deg, lateral offset m); every column is a Ball Control step with the SAME standardised execution draws. Speeds follow the
// owner's range and Touchline's passes (BALL-FEEL-1.3: soft ~5–8, normal pass 13 m/s at launch, firm ~16–20, driven 30–33, shots 34.5).
export { BC_STEPS } from "./rk_model.js";
const rows = (vs, o) => vs.map((v) => Object.assign({ v }, o));
export const MATRICES = [
  { id: "GROUND", title: "Ground ball — rolling, straight at the player", group: "FOOT", surface: "AUTO", note: "Speed at the contact. AUTO picks the foot surface (inside / sole).", rows: rows([2, 5, 8, 12, 16, 20, 25, 30], {}) },
  { id: "BOUNCE", title: "Bouncing ball — rising at shin height (0.30 m) just after a bounce", group: "FOOT", surface: "AUTO", note: "The pass bounced ~1–2 m in front; AUTO decides where to take it.", rows: rows([3, 5, 8, 12, 16, 20], { drop: -12, h: 0.30 }) },
  { id: "LOW", title: "Low aerial — shin / ankle height (0.40 m), dropping 25°", group: "FOOT", surface: "AUTO", note: "AUTO: raised inside foot, instep cushion or sole on the landing.", rows: rows([3, 5, 8, 12, 16, 20], { drop: 25, h: 0.40 }) },
  { id: "THIGH", title: "Thigh control — thigh height (0.95 m), dropping 35°", group: "THIGH", surface: "THIGH", note: "Forced THIGH (the AUTO choice is shown per row).", rows: rows([3, 5, 8, 12, 16, 20, 24], { drop: 35, h: 0.95 }) },
  { id: "CHEST", title: "Chest control — chest height (1.32 m), dropping 20°", group: "CHEST", surface: "CHEST", note: "Forced CHEST.", rows: rows([4, 6, 8, 12, 16, 20, 25], { drop: 20, h: 1.32 }) },
  { id: "HEAD", title: "Head control — high ball (1.78 m), dropping 15°", group: "HEAD", surface: "HEAD", note: "Forced HEAD: a cushioned header that drops the ball in front.", rows: rows([3, 5, 8, 12, 16, 20], { drop: 15, h: 1.78 }) },
  { id: "HEIGHT", title: "Arrival height sweep — 10 m/s, AUTO surface", group: "AUTO", surface: "AUTO", note: "Ground ball first, then dropping 20°. Shows which surface AUTO chooses and what Ball Control does with it.", rows: [0.11, 0.30, 0.50, 0.70, 0.90, 1.10, 1.30, 1.50, 1.75, 2.00].map((h) => ({ v: 10, h, drop: h <= 0.111 ? 0 : 20 })) },
  { id: "DROP", title: "Descent angle — chest height (1.30 m), 12 m/s, AUTO", group: "AUTO", surface: "AUTO", note: "Same speed, from nearly flat to dropping steeply: vertical speed raises the difficulty (a flat ball at chest height can only be a short chip, so the sweep starts at 10°).", rows: [10, 20, 35, 50, 65].map((d) => ({ v: 12, h: 1.30, drop: d })) },
  { id: "ENERGY", title: "Speed is not the whole story — 3 m/s roller · 25 m/s at the foot · 25 m/s dropping steeply", group: "AUTO", surface: "AUTO", note: "The owner's example: both 25 m/s balls are far harder than the roller, and differ from each other.", rows: [{ v: 3 }, { v: 25 }, { v: 25, h: 0.25, drop: 50 }, { v: 25, h: 1.32, drop: 15 }, { v: 25, h: 1.32, drop: 50 }] },
  { id: "SIDE", title: "Arrival direction — 12 m/s ground ball from straight ahead to the side", group: "FOOT", surface: "AUTO", note: "The receiver keeps his facing; the ball comes from the bearing shown (+ = from his right).", rows: [0, 30, 60, 90, -60].map((b) => ({ v: 12, bear: b })) },
];
export const BENCHMARKS = [
  { id: "EASY", title: "Easy ball — 2 m/s ground roller, straight, preferred foot, stationary, clean", cond: { v: 2 } },
  { id: "HARD", title: "Hard ground pass — 22 m/s, straight, preferred foot, stationary, clean", cond: { v: 22 } },
  { id: "HARD25", title: "Hard ground pass — 25 m/s", cond: { v: 25 } },
  { id: "THIGH_M", title: "Thigh — manageable: 6 m/s dropping 35° at 0.95 m", cond: { v: 6, drop: 35, h: 0.95, surface: "THIGH" } },
  { id: "THIGH_H", title: "Thigh — hard: 16 m/s dropping 35° at 0.95 m", cond: { v: 16, drop: 35, h: 0.95, surface: "THIGH" } },
  { id: "CHEST_M", title: "Chest — manageable: 8 m/s dropping 20° at 1.32 m", cond: { v: 8, drop: 20, h: 1.32, surface: "CHEST" } },
  { id: "CHEST_H", title: "Chest — hard: 20 m/s dropping 20° at 1.32 m", cond: { v: 20, drop: 20, h: 1.32, surface: "CHEST" } },
  { id: "HEAD_M", title: "Head — manageable: 6 m/s dropping 15° at 1.78 m", cond: { v: 6, drop: 15, h: 1.78, surface: "HEAD" } },
  { id: "HEAD_H", title: "Head — hard: 15 m/s dropping 25° at 1.78 m", cond: { v: 15, drop: 25, h: 1.78, surface: "HEAD" } },
];
// one condition from a matrix row: the matrix's surface unless the row sets one
export const condOf = (M, r) => Object.assign({ surface: M.surface }, r);
export const condLabel = (c) => `${c.v} m/s` + (c.h != null && c.h > 0.111 ? ` · ${c.h.toFixed(2)} m` : " · ground") + (c.drop ? ` · ${c.drop > 0 ? "dropping" : "rising"} ${Math.abs(c.drop)}°` : "") + (c.bear ? ` · from ${c.bear > 0 ? "right" : "left"} ${Math.abs(c.bear)}°` : "") + (c.lat ? ` · lateral ${c.lat} m` : "");
// RECEIVE-KILL-1.2: the three-scale comparison benchmarks (the owner's list: 2 / 12 / 22 m/s ground + thigh, chest, head — manageable and hard)
export const THREE_BENCH = [
  { id: "EASY", title: "2 m/s ground roller", cond: { v: 2 } },
  { id: "NORMAL", title: "12 m/s normal ground pass", cond: { v: 12 } },
  { id: "HARD", title: "22 m/s hard ground pass", cond: { v: 22 } },
  { id: "THIGH_M", title: "Thigh — 6 m/s dropping 35° at 0.95 m", cond: { v: 6, drop: 35, h: 0.95, surface: "THIGH" } },
  { id: "THIGH_H", title: "Thigh — 16 m/s dropping 35° (hard)", cond: { v: 16, drop: 35, h: 0.95, surface: "THIGH" } },
  { id: "CHEST_M", title: "Chest — 8 m/s dropping 20° at 1.32 m", cond: { v: 8, drop: 20, h: 1.32, surface: "CHEST" } },
  { id: "CHEST_H", title: "Chest — 20 m/s dropping 20° (hard)", cond: { v: 20, drop: 20, h: 1.32, surface: "CHEST" } },
  { id: "HEAD_M", title: "Head — 6 m/s dropping 15° at 1.78 m", cond: { v: 6, drop: 15, h: 1.78, surface: "HEAD" } },
  { id: "HEAD_H", title: "Head — 15 m/s dropping 25° (hard, forced)", cond: { v: 15, drop: 25, h: 1.78, surface: "HEAD" } },
];

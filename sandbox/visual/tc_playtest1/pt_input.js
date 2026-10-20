// ═══ tc_playtest1/pt_input.js — TECHNICAL-CONTROL PLAYTEST-1: the movement REQUEST from the player's input (keys or the on-screen stick) ════════
// Input only (owner: "an input / UI addition only"): both sources author the same request the simulation already takes — a desired heading
// (or none) and a mode — and nothing else; the simulation, the resolver, the ball, the attributes are untouched.
//   · the frame: the camera's forward at the moment the input starts (WASD: the key combination changes; the stick: it leaves its deadzone),
//     held while it continues — the camera turning under a held input never turns the request (the same convention for both sources)
//   · the direction: from that forward, + = right — WASD's eight, the stick's continuous angle (never quantised)
//   · the magnitude: WASD has none (the base mode); the stick's distance from the centre picks WALK / JOG / RUN by zone — never SPRINT (sprint
//     stays a separate intent: Shift, or the SPRINT button); Alt / Option or the WALK button = walk
import { dsin, dcos, datan2, dacos, dnorm } from "../physchar2/core/v2_math.js";
export const STICK = { deadzone: 0.08, walkTo: 0.40, jogTo: 0.72 };   // fractions of the stick's radius (raw distance from the centre)
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
// the stick: raw displacement (x right, y forward / up), each in −1 … 1 of the radius → the normalised analog vector beyond the deadzone
export function stickVector(rx, ry, dz = STICK.deadzone) {
  const r = dnorm(rx, ry), rc = Math.min(1, r); if (rc < dz || r < 1e-9) return { x: 0, y: 0, m: 0, r: rc };
  const m = (rc - dz) / (1 - dz); return { x: (rx / r) * m, y: (ry / r) * m, m, r: rc };
}
// the stick's zone (raw distance): the mode it requests
export function stickMode(r, cfg = STICK) { return r < cfg.walkTo ? "WALK" : r < cfg.jogTo ? "JOG" : "RUN"; }
// the request's heading from a frame heading and a direction (right, forward) — the keys' (unnormalised) and the stick's alike
export function headingFrom(frameH, right, fwd) { return right || fwd ? wrap(frameH + datan2(right, fwd)) : null; }
// the angle of a stick vector from the frame's forward (deg, + = right), for the diagnostics
export function stickAngleDeg(v) { return v.m > 0 ? (datan2(v.x, v.y) * 180) / Math.PI : null; }
// the record's input bits (for the record only — the simulation never reads them)
export const BITS = { W: 1, A: 2, S: 4, D: 8, SHIFT: 16, ALT: 32, STICK: 64, SPRINT_BTN: 128, WALK_BTN: 256 };

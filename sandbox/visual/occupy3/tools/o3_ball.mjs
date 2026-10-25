// occupy3/tools/o3_ball.mjs — §10 BALL / POSSESSION STAY SEPARATE: proof that a physical collision assigns nothing.
//   (1) THE SOURCE: Stage 3 (o3_world.js) never writes the authority (no auth.set / claim / state / owner assignment) and never launches the ball
//   (2) THE BALL: every change of the ball's velocity beyond its free roll (> 0.25 m/s in a tick) coincides with a contact the canonical laws made
//       (the world's contact log: a touch, a tackle's boot) — none from an impact
//   (3) THE AUTHORITY: every transition's cause is the canonical one (a touch, a tackle contact, a controller failure, a COLLECTED claim) — listed;
//       none names an impact. Its own checks (dual ownership, unaware, possession without a touch, blind claims) stay 0
//   (4) WHAT THE PHYSICS DID DO, explicitly: the touches it denied (the foot was the recovery step; the leg could not reach from the displaced
//       hips), the technical actions it ended — each with its reason — and the tackle outcomes that changed from Stage 2, with their cause
//   node o3_ball.mjs --set matrix|review|search|moves [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { setOf } from "./o3_identity.mjs";
import { runO3, outcomeO3 } from "../o3_run.js";
import "../o3_world.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "matrix"), DT = 1 / 240, hyp = Math.hypot;
// (1) the source
const src = fs.readFileSync(new URL("../o3_world.js", import.meta.url), "utf8"), writes = (src.match(/\bauth\s*\.\s*(set|claim|blindMiss|tick)\s*\(|\bauth\s*\.\s*(state|owner)\s*=|\.launch\s*\(|\bball\s*\.\s*(p|v)\s*\[\s*\d\s*\]\s*=/g) || []);
const L = setOf(SET), rows = []; let ballOdd = 0, ballChanges = 0, tr = 0, causes = {}, checks = { dual: 0, unaware: 0, noTouch: 0, blindClaim: 0 }, denied = {}, ended = {}, changed = [];
for (const tc of L) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  const bl = []; const R3 = runO3(ENV, tc, "S3", { record: false, onTick: (W) => { const b = W.trueTrack(W.t); bl.push([W.k, b.v[0], b.v[1], b.p[2]]); } }), W = R3.W, R2 = runO3(ENV, tc, "S2D", { record: false });
  // (2) the ball: a velocity change beyond the free roll, with no contact within ± 2 ticks (the kernel's own bounce off the turf excluded: airborne)
  const ck = new Set(); for (const c of W.contactLog) for (let d = -2; d <= 2; d++) ck.add(c.k + d); for (const e of W.att.extLog || []) for (let d = -2; d <= 2; d++) ck.add(Math.round(e.t / DT) + d);
  for (let i = 1; i < bl.length; i++) { const dv = hyp(bl[i][1] - bl[i - 1][1], bl[i][2] - bl[i - 1][2]); if (dv > 0.25) { ballChanges++; if (!ck.has(bl[i][0]) && bl[i][3] < 0.2) ballOdd++; } }
  // (3) the authority
  for (const e of W.auth.log) { if (!e.to) continue; tr++; const c = `${e.to.replace(/\(.*\)/, "")} · ${e.why}`.replace(/ at [\d.]+.*$/, "").slice(0, 90); causes[c] = (causes[c] || 0) + 1; }
  for (const k of Object.keys(checks)) checks[k] += W.auth.checks[k] || 0;
  // (4) what the physics did
  for (const e of W.imp.events) { if (/DENIED/.test(e.kind)) { const k = `${e.kind} · ${e.why.replace(/\(.*\)/, "").trim()}`; denied[k] = (denied[k] || 0) + 1; } if (/INTERRUPTED|RECOVERY REPLACED/.test(e.kind)) { const k = `${e.who} ${e.kind}`; ended[k] = (ended[k] || 0) + 1; } }
  const o2 = outcomeO3(R2.W), o3 = outcomeO3(W); if ((o2 && o2.kind) !== (o3 && o3.kind)) changed.push({ id: tc.id, S2: o2 && o2.kind, S3: o3 && o3.kind, why: W.imp.events.filter((e) => /DENIED|INTERRUPTED|RECOVERY REPLACED|RECOVERY STEP/.test(e.kind)).slice(0, 3).map((e) => `${e.who} ${e.kind}`).join(" · ") || (W.imp.episodes.length ? "the bodies' displacement (an impact)" : "—") });
  rows.push({ id: tc.id, transitions: W.auth.log.filter((e) => e.to).map((e) => ({ t: +(e.t - R3.t0).toFixed(3), to: e.to, why: e.why, cause: e.cause })), denied: W.imp.events.filter((e) => /DENIED/.test(e.kind)), out: [o2 && o2.kind, o3 && o3.kind] }); process.stderr.write("."); }
console.log(`\n§10 BALL / POSSESSION — set ${SET} (${rows.length} encounters), STAGE 3`);
console.log(`(1) THE SOURCE: o3_world.js writes to the authority or launches the ball: ${writes.length ? writes.join(", ") : "NEVER (no auth.set / claim / state / owner, no launch, no ball state written)"}`);
console.log(`(2) THE BALL: velocity changes > 0.25 m/s in a tick: ${ballChanges} · of them with no canonical contact within ± 2 ticks (ball on the ground): ${ballOdd}`);
console.log(`(3) THE AUTHORITY: ${tr} transitions, by their canonical cause:`); for (const [k, v] of Object.entries(causes).sort((a, b) => b[1] - a[1])) console.log(`      ${String(v).padStart(4)}  ${k}`);
console.log(`    an impact named as a cause: ${Object.keys(causes).filter((k) => /impact|collision|balance/i.test(k)).length} · the authority's own checks: dual ${checks.dual} · unaware ${checks.unaware} · without a touch ${checks.noTouch} · granted blind ${checks.blindClaim}`);
console.log(`(4) WHAT THE PHYSICS DID (geometry, each with its reason):`); for (const [k, v] of Object.entries(denied).sort((a, b) => b[1] - a[1])) console.log(`      ${String(v).padStart(4)}  ${k}`); for (const [k, v] of Object.entries(ended).sort((a, b) => b[1] - a[1])) console.log(`      ${String(v).padStart(4)}  ${k}`);
console.log(`    tackle outcomes changed from Stage 2: ${changed.length}${changed.length ? "" : " (none)"}`); for (const c of changed.slice(0, 30)) console.log(`      ${c.id.padEnd(26)} ${c.S2} → ${c.S3}   (${c.why})`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ set: SET, writes, ballChanges, ballOdd, transitions: tr, causes, checks, denied, ended, changed, rows }, null, 0));

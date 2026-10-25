// occupy3b/tools/l3_ball.mjs — §12 THE BALL / POSSESSION FIREWALL: proof that the limb layer assigns nothing.
//   (1) THE SOURCE: Stage 3B (l3_world.js, l3_limb.js, l3_body.js) and the Stage 3 it feeds (o3_world.js) never write the authority (no auth.set /
//       claim / state / owner) and never launch the ball or write its state
//   (2) THE BALL: every change of the ball's velocity beyond its free roll (> 0.25 m/s in a tick) coincides with a contact the canonical laws made
//       (the world's contact log: a touch, a tackle's boot) — none from a limb contact or an impact
//   (3) THE AUTHORITY: every transition's cause is the canonical one — listed; none names a limb contact or an impact; its own checks stay 0
//   (4) WHAT THE PHYSICS DID DO, explicitly: the touches / boots the limb layer denied (the foot displaced by a limb contact) and Stage 3's, the
//       actions ended — each with its reason — and the tackle outcomes that differ from STAGE 2 and from OLD STAGE 3, with their cause
//   node l3_ball.mjs --set matrix|review|search|moves|l3 [--json f]
import { ENV, runO3, setOf, arg, DT, hyp } from "./l3_common.mjs";
import { outcomeO3 } from "../../occupy3/o3_run.js";
import fs from "node:fs";
const SET = arg("set", "matrix");
const RX = /\bauth\s*\.\s*(set|claim|blindMiss|tick)\s*\(|\bauth\s*\.\s*(state|owner)\s*=|\.launch\s*\(|\bball\s*\.\s*(p|v)\s*\[\s*\d\s*\]\s*=|\bball\s*\.\s*(p|v)\s*=/g;
const files = ["../l3_world.js", "../l3_limb.js", "../l3_body.js", "../../occupy3/o3_world.js"], writes = files.flatMap((f) => (fs.readFileSync(new URL(f, import.meta.url), "utf8").match(RX) || []).map((m) => f + ": " + m));
const L = setOf(SET), rows = []; let ballOdd = 0, ballChanges = 0, tr = 0; const causes = {}, checks = { dual: 0, unaware: 0, noTouch: 0, blindClaim: 0 }, denied = {}, ended = {}, changed2 = [], changed3 = [];
for (const tc of L) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  const bl = []; const RB = runO3(ENV, tc, "S3B", { record: false, onTick: (W) => { const b = W.trueTrack(W.t); bl.push([W.k, b.v[0], b.v[1], b.p[2]]); } }), W = RB.W, R2 = runO3(ENV, tc, "S2D", { record: false }), R3 = runO3(ENV, tc, "S3", { record: false });
  const ck = new Set(); for (const c of W.contactLog) for (let d = -2; d <= 2; d++) ck.add(c.k + d); for (const e of W.att.extLog || []) for (let d = -2; d <= 2; d++) ck.add(Math.round(e.t / DT) + d);
  for (let i = 1; i < bl.length; i++) { const dv = hyp(bl[i][1] - bl[i - 1][1], bl[i][2] - bl[i - 1][2]); if (dv > 0.25) { ballChanges++; if (!ck.has(bl[i][0]) && bl[i][3] < 0.2) ballOdd++; } }
  for (const e of W.auth.log) { if (!e.to) continue; tr++; const c = `${e.to.replace(/\(.*\)/, "")} · ${e.why}`.replace(/ at [\d.]+.*$/, "").slice(0, 90); causes[c] = (causes[c] || 0) + 1; }
  for (const k of Object.keys(checks)) checks[k] += W.auth.checks[k] || 0;
  const EV = W.imp.events.concat(W.l3.events);
  for (const e of EV) { if (/DENIED/.test(e.kind)) { const k = `${e.kind} · ${e.why.replace(/[\d.]+ cm/g, "x cm").replace(/\(.*\)/, "").trim()}`; denied[k] = (denied[k] || 0) + 1; } if (/INTERRUPTED|RECOVERY REPLACED/.test(e.kind)) { const k = `${e.who} ${e.kind}`; ended[k] = (ended[k] || 0) + 1; } }
  const o2 = outcomeO3(R2.W), o3 = outcomeO3(R3.W), ob = outcomeO3(W), why = EV.filter((e) => /DENIED|INTERRUPTED|RECOVERY REPLACED|RECOVERY STEP/.test(e.kind)).slice(0, 3).map((e) => `${e.who} ${e.kind}`).join(" · ") || (W.imp.episodes.length ? "the bodies' displacement (an impact)" : "—");
  if ((o2 && o2.kind) !== (ob && ob.kind)) changed2.push({ id: tc.id, S2: o2 && o2.kind, S3B: ob && ob.kind, why });
  if ((o3 && o3.kind) !== (ob && ob.kind)) changed3.push({ id: tc.id, S3: o3 && o3.kind, S3B: ob && ob.kind, why });
  rows.push({ id: tc.id, transitions: W.auth.log.filter((e) => e.to).map((e) => ({ t: +(e.t - RB.t0).toFixed(3), to: e.to, why: e.why, cause: e.cause })), denied: EV.filter((e) => /DENIED/.test(e.kind)), out: [o2 && o2.kind, o3 && o3.kind, ob && ob.kind] }); process.stderr.write("."); }
console.log(`\n§12 BALL / POSSESSION — set ${SET} (${rows.length} encounters), STAGE 3B`);
console.log(`(1) THE SOURCE (${files.map((f) => f.replace(/^.*\//, "")).join(", ")}): writes to the authority / launches / ball state: ${writes.length ? writes.join("; ") : "NONE"}`);
console.log(`(2) THE BALL: velocity changes > 0.25 m/s in a tick: ${ballChanges} · of them with no canonical contact within ± 2 ticks (ball on the ground): ${ballOdd}`);
console.log(`(3) THE AUTHORITY: ${tr} transitions, by their canonical cause:`); for (const [k, v] of Object.entries(causes).sort((a, b) => b[1] - a[1])) console.log(`      ${String(v).padStart(4)}  ${k}`);
console.log(`    a limb contact / an impact named as a cause: ${Object.keys(causes).filter((k) => /impact|collision|balance|limb/i.test(k)).length} · the authority's own checks: dual ${checks.dual} · unaware ${checks.unaware} · without a touch ${checks.noTouch} · granted blind ${checks.blindClaim}`);
console.log(`(4) WHAT THE PHYSICS DID (geometry, each with its reason):`); for (const [k, v] of Object.entries(denied).sort((a, b) => b[1] - a[1])) console.log(`      ${String(v).padStart(4)}  ${k}`); for (const [k, v] of Object.entries(ended).sort((a, b) => b[1] - a[1])) console.log(`      ${String(v).padStart(4)}  ${k}`);
console.log(`    tackle outcomes different from STAGE 2: ${changed2.length}`); for (const c of changed2.slice(0, 40)) console.log(`      ${c.id.padEnd(26)} ${c.S2} → ${c.S3B}   (${c.why})`);
console.log(`    tackle outcomes different from OLD STAGE 3: ${changed3.length}`); for (const c of changed3.slice(0, 40)) console.log(`      ${c.id.padEnd(26)} ${c.S3} → ${c.S3B}   (${c.why})`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ set: SET, writes, ballChanges, ballOdd, transitions: tr, causes, checks, denied, ended, changed2, changed3, rows }, null, 0));

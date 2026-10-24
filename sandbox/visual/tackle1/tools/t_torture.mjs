// tackle1/tools/t_torture.mjs — STANDING TACKLE V1 TORTURE (deterministic, seeded). Each trial: a random honest set-up (t_matrix's generator — the
// carry at a walk / jog, cuts, the left-footed twin, the Body Feint, the Croqueta; the defender set or walking in, either side) and a REQUEST
// PATTERN: one request at a random moment · a burst of rapid repeated requests (every 0.06 – 0.12 s) · requests timed onto the defender's own
// footfalls (stride boundaries) · requests deliberately invalid (the ball behind / far). Checked per trial:
//   the request lifecycle (every request ends COMMITTED / DECLINED / IGNORED / CANCELLED with a reason; none while committed is accepted)
//   STUCK COMMITMENT / FAILURE TO RETURN CONTROL (after control-ready the tackle no longer owns the body and the defender's plan is ordinary)
//   DUPLICATE BALL CONTACTS (two of one action's contacts within 0.10 s) · DUPLICATE POSSESSION CHANGES (two carrier exits within 0.10 s)
//   THE BODY (t_body.js on the posed defender: foot jumps, knee pops, plant slides, legs crossed, pelvis / trunk spikes — inside the tackle and in
//   the same footballer's ordinary movement outside it, as rates per second) · DETERMINISM (every trial run twice: both players' hashes, the record)
//   node t_torture.mjs [--n 60] [--seed 3] [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { runCase } from "../t_run.js";
import { bodyAudit } from "../t_body.js";
import { trialCase, rng } from "./t_matrix.mjs";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const env = Object.assign({}, ENV, { colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) });
const N = +arg("n", 60), seed = +arg("seed", 3), PAT = ["single", "rapid", "stride", "invalid"];
const T = { trials: 0, requests: {}, acts: 0, hits: 0, stuck: 0, noReturn: 0, dupHits: 0, dupPoss: 0, acceptedWhileCommitted: 0, nondet: 0, inSec: 0, outSec: 0, attSec: 0, evIn: {}, evOut: {}, evAtt: {}, max: {}, outcomes: {}, families: {}, feet: {} }, bad = [];
// the stride-boundary times: the defender's footfalls in a first run without requests (the requests then land on them, ± one tick)
function footfalls(tc) { const r = runCase(env, Object.assign({}, tc, { tackle: [] })), L = []; for (const X of ["R", "L"]) for (const s of r.W.def.plans[r.W.def.plans.length - 1].stances[X]) if (s.t0 > r.t0 && s.t0 < r.t0 + 1.4) L.push(s.t0 - r.t0);
  for (const P of r.W.def.plans) for (const X of ["R", "L"]) for (const s of P.stances[X]) if (s.t0 > r.t0 && s.t0 < r.t0 + 1.4) L.push(s.t0 - r.t0); return [...new Set(L.map((x) => +x.toFixed(4)))].sort((a, b) => a - b); }
// (each trial's set-up gets a request moment that COMMITS — the first of 0 … 1.4 s that does — so the patterns test tackles, not only declines)
function commitTime(tc) { for (let q = 0; q <= 28; q++) { const tq = +(q * 0.05).toFixed(2), r = runCase(env, Object.assign({}, tc, { tackle: [tq] })); if (r.W.tk.act) return tq; } return null; }
let skipped = 0;
for (let i = 0, j = 0; i < N; j++) { if (j > 6 * N) break; const R = rng(seed * 7919 + j), base = trialCase(j, seed), pat = PAT[i % PAT.length]; let tq;
  const tC = pat === "invalid" ? 0 : commitTime(base); if (tC == null) { skipped++; continue; } i++;
  if (pat === "single") tq = [+(tC + 0.12 * R()).toFixed(4)];
  else if (pat === "rapid") { const t0 = Math.max(0, tC - 0.3 * R()), dt = 0.06 + 0.06 * R(); tq = []; for (let t = t0; t < t0 + 1.8; t += dt) tq.push(+t.toFixed(4)); }
  else if (pat === "stride") { const F = footfalls(base).filter((x) => x > tC - 0.4 && x < tC + 0.6); tq = F.slice(0, 3).map((x, k) => +(x + (k % 3 - 1) * DT).toFixed(4)); if (!tq.length) tq = [tC]; }
  else tq = [0.0, 1.8, 2.2];   // (the ball far, then behind)
  const tc = Object.assign({}, base, { tackle: tq }), run = () => { const r = runCase(env, tc); return r; }, r1 = run(), r2 = run(), W = r1.W, tk = W.tk;
  T.trials++; const det = r1.W.att.hash === r2.W.att.hash && r1.W.def.hash === r2.W.def.hash && JSON.stringify(r1.W.tk.acts.map((a) => [a.t0, a.hits.length, a.outcome && a.outcome.kind])) === JSON.stringify(r2.W.tk.acts.map((a) => [a.t0, a.hits.length, a.outcome && a.outcome.kind])); if (!det) { T.nondet++; bad.push({ i, kind: "NONDETERMINISTIC" }); }
  for (const q of tk.log) { T.requests[q.state] = (T.requests[q.state] || 0) + 1; const busy = tk.acts.find((a) => q.tReq >= a.t0 - 1e-9 && q.tReq < a.tCtl - 1e-9 && q.state === "COMMITTED" && q.tCommit !== a.t0); if (busy) { T.acceptedWhileCommitted++; bad.push({ i, kind: "ACCEPTED WHILE COMMITTED", q }); } }
  for (const A of tk.acts) { T.acts++; T.hits += A.hits.length; T.families[A.fam] = (T.families[A.fam] || 0) + 1; T.feet[A.F] = (T.feet[A.F] || 0) + 1; const k = A.outcome ? A.outcome.kind : "—"; T.outcomes[k] = (T.outcomes[k] || 0) + 1;
    T.impulses = (T.impulses || 0) + A.hits.length; const E = []; for (const h of A.hits) { if (!E.length || E[E.length - 1].id !== h.episode) E.push({ id: h.episode, t0: h.t, t1: h.t }); else E[E.length - 1].t1 = h.t; } T.episodes = (T.episodes || 0) + E.length;
    for (let k = 1; k < E.length; k++) if (E[k].t0 - E[k - 1].t1 < 0.1) { T.dupHits++; bad.push({ i, j, pat, tq, kind: "RE-CONTACT WITHIN 0.1 s (a separate episode)", t: E[k].t0, gap: +(E[k].t0 - E[k - 1].t1).toFixed(4) }); }
    const tAfter = A.tCtl + 4 * DT; if (tAfter < W.t) { if (tk.owns(tAfter) || !A.released) { T.stuck++; bad.push({ i, kind: "STUCK COMMITMENT", t: A.tCtl }); }
      const P = W.def.planAt(tAfter + 0.05); if (P.action && P.action.tackle && P.action.id === W.def.planAt(A.t0 + 0.06).action.id) { T.noReturn++; bad.push({ i, kind: "CONTROL NOT RETURNED", t: A.tCtl }); } } }
  const ex = W.att.poss.log.filter((e) => e.from === "CONTROLLED" && e.to === "FREE"); for (let j = 1; j < ex.length; j++) if (ex[j].t - ex[j - 1].t < 0.1) { T.dupPoss++; bad.push({ i, kind: "DUPLICATE POSSESSION CHANGE", t: ex[j].t }); }
  // the body: inside the tackle windows vs the same footballer's ordinary movement outside them
  const B = bodyAudit(env, W, r1.clip[0], W.t, { keep: 60, att: true }); for (const [k, v] of Object.entries(B.evAtt)) T.evAtt[k] = (T.evAtt[k] || 0) + v; T.attSec += W.t - r1.clip[0]; let inS = 0; for (const A of tk.acts) inS += Math.min(A.tCtl, W.t) - A.t0; const outS = (W.t - r1.clip[0]) - inS; T.inSec += inS; T.outSec += outS;
  for (const [k, v] of Object.entries(B.ev.in)) if (k !== "PLAYER OVERLAP") T.evIn[k] = (T.evIn[k] || 0) + v; for (const [k, v] of Object.entries(B.ev.out)) if (k !== "PLAYER OVERLAP") T.evOut[k] = (T.evOut[k] || 0) + v;
  T.overlapIn = (T.overlapIn || 0) + (B.ev.in["PLAYER OVERLAP"] || 0); T.overlapMax = Math.max(T.overlapMax || 0, B.max.overlap);
  for (const [k, v] of Object.entries(B.max)) T.max[k] = Math.max(T.max[k] || 0, v);
  for (const e of B.list) if (e.kind === "PLANT SLIDE" && (!T.worstSlide || e.v > T.worstSlide.v)) T.worstSlide = Object.assign({ i, j, pat, tq, name: base.name }, e);
  if (i % 10 === 0) process.stderr.write(`${i} `); }
const rate = (o, s) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, `${v} (${(v / Math.max(1e-9, s)).toFixed(2)}/s)`]));
console.log(`\nSTANDING TACKLE V1 TORTURE — ${T.trials} trials (seed ${seed}; patterns ${PAT.join(" / ")}; ${skipped} set-ups skipped — no request time commits), each run twice`);
console.log(`requests: ${JSON.stringify(T.requests)} · committed actions ${T.acts} (${JSON.stringify(T.families)}; feet ${JSON.stringify(T.feet)}) · ball contacts ${T.hits}`);
console.log(`outcomes: ${JSON.stringify(T.outcomes)}`);
console.log(`ball contact impulses ${T.impulses} in ${T.episodes} contact episodes (impulses on consecutive ticks = one sustained contact)`);
console.log(`worst plant slide: ${JSON.stringify(T.worstSlide)}`);
console.log(`STUCK COMMITMENT ${T.stuck} · CONTROL NOT RETURNED ${T.noReturn} · ACCEPTED WHILE COMMITTED ${T.acceptedWhileCommitted} · RE-CONTACTS < 0.1 s (separate episodes) ${T.dupHits} · DUPLICATE POSSESSION CHANGES ${T.dupPoss} · NONDETERMINISTIC ${T.nondet}`);
console.log(`BODY inside the tackles (${T.inSec.toFixed(1)} s): ${JSON.stringify(rate(T.evIn, T.inSec))}`);
console.log(`BODY the same footballer outside them (${T.outSec.toFixed(1)} s): ${JSON.stringify(rate(T.evOut, T.outSec))}`);
console.log(`REFERENCE — the canonical carrier's own body, same measures (${T.attSec.toFixed(1)} s): ${JSON.stringify(rate(T.evAtt, T.attSec))}`);
console.log(`player overlap > 3 cm inside the tackles: ${T.overlapIn} ticks · deepest overlap ${(T.overlapMax * 100).toFixed(1)} cm (no player collision exists)`);
console.log(`worst: ${JSON.stringify(T.max)}`);
if (bad.length) console.log("FINDINGS", JSON.stringify(bad.slice(0, 20)));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ T, bad }, null, 1));

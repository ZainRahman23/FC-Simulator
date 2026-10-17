// dribble13/tools/d13_ref.mjs — the DRIBBLE-1.2 BEHAVIOURAL TWIN SUITE (the owner's DRIBBLE-1.3 §3): a deterministic reference of what DRIBBLE-1.2
// decides and what physically happens, per scenario × seed, and the comparison of any core against it.
//   record:  every plan the resolver installs (tick, contact tick, foot, surface, hull, swing, role — set-up / stage / cut / release-now / line —, the
//            set-up's planned decisive contact, the planned launch and next window); every deliberate touch (tick, foot, surface, hull, role, launched
//            or cancelled, the ball's state at the touch — position, velocity, spin —, the planned and the executed launch, the execution-error draws,
//            the post-launch velocity and spin, the next window it aimed at); TURN-1.2's state at each touch (COM position / velocity, heading, both
//            legs' stance / swing phase); the cut timeline (holds, stages, releases); the kernel's contacts; the control classification; the outcome
//            (taken with the ball / cleanly, final control); and a bit-exact digest of the whole 240 Hz trajectory (ball, COM, heading).
//   compare: per run IDENTICAL (every list and the trajectory digest bit for bit) or the FIRST DIVERGENCE: which list, which entry, the reference and
//            the new value, the tick — and, for a 1.3 core, the planner's own decision log entries around that tick (why it decided differently).
// usage: node d13_ref.mjs record ver "IDs|all" seeds out.json            node d13_ref.mjs compare ref.json ver [out.json] [opts-json]
import fs from "fs"; import crypto from "crypto"; import { makeSim, DT, PROFILES } from "./d13_env.mjs"; import { get, list } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "./d13_quality.mjs";
const bits = (x) => (typeof x === "number" ? (Object.is(x, -0) ? "-0" : String(x)) : Array.isArray(x) ? "[" + x.map(bits).join(",") + "]" : x == null ? String(x) : typeof x === "object" ? "{" + Object.keys(x).sort().map((k) => k + ":" + bits(x[k])).join(",") + "}" : String(x));
const D = 180 / Math.PI, hd = (v) => Math.atan2(-v[2], v[0]) * D;
export function runRef(ver, id, seed, opts = {}) {
  const scn = get(id), S = makeSim(scn, { ver, seed, player: PROFILES.HIGH, opts: Object.assign({ record: true, recBones: true }, opts) });
  const plans = [], st = S.step.bind(S); let last = null;
  S.step = function () { const r = st(); const P = S.plan;
    if (P && P !== last) { const L = P.launch || {}; plans.push({ k: S.k - 1, kc: P.kc, F: P.F, reg: P.reg, hull: P.hull, swing: P.swing, role: P.setupSw ? "setup" : P.relNow ? (P.stage != null ? "staged-now" : "cut-now") : P.release ? (P.stage != null ? "stage" : "cut") : P.cutQ ? P.cutQ.kind : "dribble",
      dec: P.dec ? { kc: P.dec.kc, F: P.dec.F, reg: P.dec.reg, dir: P.dec.dir, speed: P.dec.speed } : null, launch: { speed: L.speed, dir: L.n ? hd(L.n) : null, kNext: L.kNext ?? null, F2: L.F2 ?? null, target: L.target || null } }); }
    last = P; return r; };
  S.run();
  const touches = S.touches.map((T) => { const r = S.rec[T.k] || S.rec[S.rec.length - 1];
    return { k: T.k, F: T.F, reg: T.reg, hull: T.hull, swing: T.swing, role: T.role, setupSw: !!T.setupSw, launched: !!T.launched, cancelled: T.cancelled || null, ball: T.ball, ballV: T.pre.v, ballW: T.pre.w,
      desired: { speed: T.desired.speed, v: T.desired.v, kNext: T.desired.kNext, F2: T.desired.F2, target: T.desired.target || null }, executed: T.executed, err: [T.error.eS, T.error.eD, T.error.eL], post: T.post || null,
      dec: T.dec || null, turn12: { P: r.P, V: r.V, psi: r.psi, wR: r.bones ? r.bones.wR : null, wL: r.bones ? r.bones.wL : null } }; });
  const h = crypto.createHash("sha256"); for (const r of S.rec) h.update(bits([r.k, r.ball.p, r.ball.v, r.ball.q, r.P, r.V, r.psi, r.dir, r.ctrl, r.held]));
  const q = cutQuality(S, scn), endCtrl = S.rec[S.rec.length - 1].ctrl;
  const events = S.W.events.filter((e) => e.kind !== "PHYSICAL_CONTACT" || e.collider !== "turf").map((e) => ({ kind: e.kind, tick: e.tick, id: e.id || null, collider: e.collider || null }));
  return { S, ref: { id, seed, ver, plans, touches, turnLog: S.turnLog.map((e) => ({ k: e.k, kind: e.kind, by: e.by || null, dir: e.dir ?? null })), events, ctrl: S.ctrl.changes.map((c) => [c.k, c.to]), fault: S.fault || null,
    outcome: { endCtrl, taken: q ? q.taken : null, clean: q ? q.takenCleanly : null, toBall20S: q ? q.toBall20S : null }, digest: h.digest("hex"), ticks: S.rec.length } };
}
const LISTS = ["plans", "touches", "turnLog", "events", "ctrl"];
const tickOf = (name, e) => e == null ? Infinity : name === "ctrl" ? e[0] : name === "events" ? e.tick : e.k;
export function compareRef(A, B) {
  const out = { identical: true, first: null, perList: {} };
  for (const name of LISTS) { const a = A[name], b = B[name], n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) { const x = a[i] ? bits(a[i]) : "∅", y = b[i] ? bits(b[i]) : "∅";
      if (x !== y) { const t = Math.min(tickOf(name, a[i]), tickOf(name, b[i])); out.perList[name] = { i, tick: t };
        if (!out.first || t < out.first.tick) out.first = { list: name, i, tick: t, ref: a[i] || null, now: b[i] || null }; out.identical = false; break; } } }
  if (A.digest !== B.digest) { out.identical = false; out.digest = false; } else out.digest = true;
  if (bits(A.fault) !== bits(B.fault)) out.identical = false;
  return out;
}
const [mode, a1, a2, a3, a4, a5] = process.argv.slice(2);
if (mode === "record") {
  const ver = a1, ids = a2 === "all" ? list().map((s) => s.id) : a2.split(","), seeds = a3.includes("-") ? a3.split("-").map(Number) : [1, +a3], out = [];
  for (const id of ids) for (let sd = seeds[0]; sd <= seeds[1]; sd++) { const { ref } = runRef(ver, id, sd); out.push(ref); console.log(id.padEnd(16), sd, "plans", ref.plans.length, "touches", ref.touches.length, "taken", ref.outcome.taken, ref.digest.slice(0, 12)); }
  fs.writeFileSync(a4, JSON.stringify({ ver, made: new Date().toISOString(), runs: out }));
} else if (mode === "compare") {
  const R = JSON.parse(fs.readFileSync(a1, "utf8")), ver = a2, opts = a4 ? JSON.parse(a4) : {}, rows = []; let same = 0;
  for (const A of R.runs) { const { S, ref: B0 } = runRef(ver, A.id, A.seed, opts), B = JSON.parse(JSON.stringify(B0)), c = compareRef(A, B); if (c.identical) same++;   // (the reference went through JSON: compare like with like)
    const why = c.first && S.decLog ? S.decLog.filter((d) => Math.abs(d.k - c.first.tick) <= 30).slice(0, 12) : null;
    rows.push({ id: A.id, seed: A.seed, identical: c.identical, digest: c.digest, first: c.first, why, outcomeRef: A.outcome, outcomeNow: B.outcome });
    console.log(`${A.id}:${A.seed}`.padEnd(20), c.identical ? "IDENTICAL" : `DIVERGES at tick ${c.first ? c.first.tick : "?"} (${c.first ? c.first.list + "#" + c.first.i : "digest"})`, "taken", A.outcome.taken, "→", B.outcome.taken); }
  const sum = { ver, ref: R.ver, identical: same, total: R.runs.length };
  console.log("REF", JSON.stringify(sum)); if (a3) fs.writeFileSync(a3, JSON.stringify({ summary: sum, rows }, null, 1));
}

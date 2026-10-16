// dribble11/tools/d11_twin.mjs — the OPTIMISATION TWIN: the DRIBBLE-1 resolver (frozen d1_core.js) and the DRIBBLE-1.1 core run the same scenario /
// seed / player / architecture; every decision and every physical outcome is compared bit for bit: deliberate touches (tick, foot, region, hull,
// swing, contact gap, desired and executed launch, follow-through floor, cut release), the kernel's events (launches, cancellations, contacts with
// their impulses), the cut timeline, the control classification, and the full 240 Hz record (ball position / velocity / spin, COM, heading).
// usage: node d11_twin.mjs "IDs|all" seeds [arch] [prof] [out.json]      (D11 feature flags off: the twin of DRIBBLE-1's football)
import fs from "fs"; import { makeSim, DT, PROFILES } from "./d11_env.mjs"; import { get, list } from "../../dribble1/d1_scenarios.js";
const [idsArg = "all", seedsArg = "2", arch = "B", prof = "HIGH", outFile] = process.argv.slice(2);
const ids = idsArg === "all" ? list().map((x) => x.id) : idsArg.split(","), N = +seedsArg, opts11 = JSON.parse(process.env.TWIN_OPTS || '{"twin":true}');
const bits = (x) => (typeof x === "number" ? (Object.is(x, -0) ? "-0" : String(x)) : Array.isArray(x) ? "[" + x.map(bits).join(",") + "]" : x == null ? String(x) : typeof x === "object" ? "{" + Object.keys(x).sort().map((k) => k + ":" + bits(x[k])).join(",") + "}" : String(x));
const touchSig = (T) => bits({ k: T.k, F: T.F, reg: T.reg, hull: T.hull, swing: T.swing, gap: T.gap, desired: T.desired && { v: T.desired.v, speed: T.desired.speed, kNext: T.desired.kNext, F2: T.desired.F2 }, executed: T.executed, floorK: T.floorK, release: T.release, launched: T.launched, cancelled: T.cancelled || null, post: T.post || null });
const recSig = (r) => bits([r.k, r.ball.p, r.ball.v, r.ball.q, r.P, r.V, r.psi, r.dir, r.ctrl, r.held]);
const res = {}; let same = 0, total = 0; const cpu = { d1: { wall: 0, plan: 0, predTicks: 0 }, d11: { wall: 0, plan: 0, predTicks: 0 } }; let sim = 0;
for (const id of ids) for (let seed = 1; seed <= N; seed++) {
  const run = (ver) => { const S = makeSim(get(id), { ver, seed, arch, player: PROFILES[prof], opts: ver === "d11" ? opts11 : {} }), t0 = performance.now(); S.run(); return { S, wall: performance.now() - t0 }; };
  const a = run("d1"), b = run("d11"); total++; sim += a.S.k * DT;
  cpu.d1.wall += a.wall; cpu.d11.wall += b.wall; cpu.d1.plan += a.wall - a.S.cpu.loco - a.S.cpu.ball; cpu.d11.plan += b.wall - b.S.cpu.loco - b.S.cpu.ball; cpu.d11.predTicks += b.S.cpu.predTicks || 0;
  const diffs = [];
  const cmpList = (name, A, B, sig) => { const n = Math.max(A.length, B.length); for (let i = 0; i < n; i++) { const x = A[i] ? sig(A[i]) : "∅", y = B[i] ? sig(B[i]) : "∅"; if (x !== y) { diffs.push({ what: name, i, d1: x.slice(0, 300), d11: y.slice(0, 300) }); return; } } };
  cmpList("touch", a.S.touches, b.S.touches, touchSig);
  cmpList("event", a.S.W.events, b.S.W.events, (e) => bits(e));
  cmpList("turnLog", a.S.turnLog, b.S.turnLog, (e) => bits(e));
  cmpList("ctrl", a.S.ctrl.changes, b.S.ctrl.changes, (e) => bits(e));
  cmpList("record", a.S.rec, b.S.rec, recSig);
  if (bits(a.S.fault || null) !== bits(b.S.fault || null)) diffs.push({ what: "fault", d1: a.S.fault, d11: b.S.fault });
  const ok = diffs.length === 0; if (ok) same++;
  res[id + ":" + seed] = { identical: ok, touches: a.S.touches.length, events: a.S.W.events.length, ticks: a.S.rec.length, firstDiff: diffs[0] || null, msD1: +a.wall.toFixed(0), msD11: +b.wall.toFixed(0) };
  console.log((id + ":" + seed).padEnd(20), ok ? "IDENTICAL" : "DIFFERENT " + JSON.stringify(diffs[0]).slice(0, 400), `touches ${a.S.touches.length} events ${a.S.W.events.length} · d1 ${a.wall.toFixed(0)} ms · d11 ${b.wall.toFixed(0)} ms`);
}
const per = (x) => +(x / sim).toFixed(1);
const summary = { identical: same, total, simSeconds: +sim.toFixed(1), msPerSimSecond: { d1Total: per(cpu.d1.wall), d11Total: per(cpu.d11.wall), d1Resolver: per(cpu.d1.plan), d11Resolver: per(cpu.d11.plan) }, resolverSpeedup: +(cpu.d1.plan / cpu.d11.plan).toFixed(2), d11PredictedTicksPerSimSecond: per(cpu.d11.predTicks), node: process.version };
console.log("TWIN", JSON.stringify(summary));
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ summary, runs: res }, null, 1));

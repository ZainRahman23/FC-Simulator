// PVP-1A(-DX) CPU (prereg §11): construction timed separately; 1 untimed warm-up + 20 replays per mode with instrumentation OFF; per-step medians /
// p95 / max over steps 1–36 and 1–260 (the plant's own component timers by differencing); 50 / 150 ms event totals; X2 branch overhead (snapshot +
// restore). Measured two-receiver island; no extrapolation claim.
// usage: V2_KNEE_MODEL=v2k node pvp1a_cpu.mjs <fixture.json> <out.json>
import fs from "fs"; import os from "os";
const PL = await import(new URL("./pvp1a_lib.mjs", import.meta.url).href), { PV } = PL, { PvpPlant } = await import(new URL("./pvp1a_sim.mjs", import.meta.url).href), { Jolt } = await import(new URL("./pvp1a_run.mjs", import.meta.url).href);
const [FIXF, OUT] = process.argv.slice(2), FIX = JSON.parse(fs.readFileSync(FIXF)), q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; }, now = () => performance.now();
const res = { cpu: os.cpus()[0].model, node: process.version, loadStart: os.loadavg(), replays: 20, modes: {} };
for (const mode of ["C0", "N2"]) { const once = () => { const t0 = now(), sim = new PvpPlant(Jolt, { runner: FIX.write.runner, tackler: FIX.write.tackler }, FIX.flags, mode, { O: FIX.O, instrument: false }), tc = now() - t0, per = []; let c = { ...sim.cpu };
    while (sim.n < PV.steps) { const t1 = now(); sim.tick(); const dt = now() - t1, c2 = { ...sim.cpu }; per.push({ total: dt, jolt: c2.step - c.step, passive: c2.passive - c.passive, act: c2.act - c.act, tone: c2.tone - c.tone }); c = c2; }
    let snapMs = null; if (mode === "N2") { const t2 = now(), s = sim.snapshot(); sim.restore(s); snapMs = now() - t2; } sim.destroy(); return { tc, per, snapMs }; };
  once(); const reps = []; for (let k = 0; k < 20; k++) reps.push(once());
  const stat = (a) => ({ median: q(a, 0.5), p95: q(a, 0.95), max: Math.max(...a) }), steps = (n) => reps.flatMap(r => r.per.slice(0, n).map(p => p.total)), comp = (k, n) => stat(reps.flatMap(r => r.per.slice(0, n).map(p => p[k])));
  const ev = (n) => stat(reps.map(r => r.per.slice(0, n).reduce((s, p) => s + p.total, 0)));
  res.modes[mode] = { construction: stat(reps.map(r => r.tc)), step36: stat(steps(36)), step260: stat(steps(PV.steps)), components36: { jolt: comp("jolt", 36), passive: comp("passive", 36), act: comp("act", 36), tone: comp("tone", 36) },
    event50ms: ev(12), event150ms: ev(36), event260steps: ev(PV.steps), x2SnapshotRestoreMs: mode === "N2" ? stat(reps.map(r => r.snapMs)) : null };
  console.log(mode, "step median", res.modes[mode].step36.median.toFixed(3), "ms · 150 ms event", res.modes[mode].event150ms.median.toFixed(2), "ms · construction", res.modes[mode].construction.median.toFixed(1), "ms"); }
res.loadEnd = os.loadavg(); fs.writeFileSync(OUT, JSON.stringify(res, null, 1));

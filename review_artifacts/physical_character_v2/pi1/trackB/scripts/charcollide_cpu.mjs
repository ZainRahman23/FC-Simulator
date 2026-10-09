// CPU of the runner contact model: legacy ptRxBody + ptRxSegments (e2c98ec) vs CHARCOLLIDE-1 (V1.3), vm-loaded, single thread; medians of 5 trials
import { loadSim } from "./charcollide_sim.mjs";
const [V13, OLD] = process.argv.slice(2), S = loadSim(V13), Lg = loadSim(OLD, { charcollide: false }), N = 20000;
const cases = []; for (let i = 0; i < 64; i++) cases.push({ v: [0, 0.5, 3, 5.5, 7.5][i % 5], ph: (i * 0.137) % 1, dt: -((i % 4) / 240) });
const bench = (sim, ch) => { const t = []; for (let r = 0; r < 5; r++) { const t0 = performance.now(); for (let n = 0; n < N; n++) { const c = cases[n % 64], ctx = { char: ch, p: { x: 50, y: 34, vx: c.v, vy: 0, facing: 0, legLen: 0.865, gaitPhase: c.ph } }; sim.segs(sim.body(ctx, c.dt, 0.27)); } t.push((performance.now() - t0) / N * 1000); } t.sort((a, b) => a - b); return t[2]; };
bench(S, "vinicius"); bench(Lg, null);   // warm-up
const us13 = bench(S, "vinicius"), usOld = bench(Lg, null);
console.log(JSON.stringify({ microsecondsPerBodyCall: { legacy: +usOld.toFixed(2), charcollide: +us13.toFixed(2), ratio: +(us13 / usOld).toFixed(1) },
  perContactTestTick: { note: "ptRxDetect: 4 sub-steps per tackler–runner pair within 2.6 m (+ predictor 25 calls / tick in the AIR tool, presentation-side)", legacyUs: +(4 * usOld).toFixed(1), charcollideUs: +(4 * us13).toFixed(1) } }));

// POST-HOC CPU (labelled): the prereg §11 entry costs that the DX CPU harness (pvp1a_cpu.mjs) omitted — MC-1 runner entry and the primary tackler fit
// (36 deterministic starts) at τ_act. Geometry only; no Jolt. 1 warm-up + 20 replays (MC-1); 1 warm-up + 5 replays (fit, ~seconds each).
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node pvp1a_entry_cpu.mjs <out.json>
import fs from "fs"; import os from "os";
const PL = await import(new URL("../scripts/pvp1a_lib.mjs", import.meta.url).href), { IL, PV } = PL, { performance } = await import("perf_hooks");
const { OFF, LOCO } = PL.records(), sR = PL.SPEC_R(), sT = PL.SPEC_T(), RG = IL.rigOf(IL.loadLV2()), FIX = JSON.parse(fs.readFileSync(new URL("../fixture/PVP1A_FIXTURE.json", import.meta.url)));
const stat = (a) => { const s = [...a].sort((x, y) => x - y); return { median: s[Math.floor(s.length / 2)], p95: s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)], max: s[s.length - 1], n: s.length }; };
const time = (f, n) => { f(); const t = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); f(); t.push(performance.now() - t0); } return stat(t); };
const P = PL.primsAt(OFF, FIX.tauAct);
const out = { tool: "pvp1a_entry_cpu.mjs", label: "POST-HOC — prereg §11 entry costs omitted by the DX CPU harness", cpu: os.cpus()[0].model, node: process.version, tauAct: FIX.tauAct,
  mc1RunnerEntryMs: time(() => PL.runnerEntry(sR, LOCO, RG.RIG, 50), 20), primaryTacklerFitMs: time(() => PL.fitTackler(sT, P), 5) };
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));

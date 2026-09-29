// POPULATION BENCHMARK on the live Touchline scene (review / measurement tooling): loads ?ofScene=bench&n=N for each population,
// warms up, samples ofReport() at intervals (degradation over a sustained run), and writes one JSON.
//   node of_bench.js --out <json> [--pops 1,2,5,11,22] [--secs 40] [--sustain 22:120] [--motion RUN] [--char generic|courtois] [--fps 60] [--dpr 2]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "of_bench.json"), POPS = opt("--pops", "1,2,5,11,22").split(",").map(Number), SECS = +opt("--secs", 40), SUST = opt("--sustain", "22:120"), MOTION = opt("--motion", "RUN"), CHAR = opt("--char", "generic"), FPS = opt("--fps", ""), DPR = +opt("--dpr", 2), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), UDD = opt("--udd", "chrome-ofbench");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: UDD, args: ["--no-sandbox", "--enable-gpu-rasterization"] });
  const runs = [];
  const runOne = async (n, secs, label) => {
    const p = await b.newPage(); await p.setViewport({ width: 1500, height: 950, deviceScaleFactor: DPR }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
    await p.goto(URL + `?ofScene=bench&n=${n}&motion=${MOTION}&char=${CHAR}${FPS ? "&fps=" + FPS : ""}${CHAR === "courtois" ? "&gkChar=courtois" : ""}&r=` + Date.now(), { waitUntil: "load", timeout: 180000 });
    for (let i = 0; i < 1200; i++) { if (await p.evaluate(() => typeof OF !== "undefined" && OF.on && OF.stats && OF.stats.frames > 30)) break; await new Promise(r => setTimeout(r, 100)); }
    await p.evaluate(() => { OF.stats.frames = 0; OF.stats.t0 = performance.now(); for (const k of ["sim", "anim", "submit", "frame", "gpu", "mem"]) OF.stats[k].length = 0; if (S.frameStat) { S.frameStat.intervals.length = 0; } S.perfT = []; });   // warm-up discarded
    const samples = []; const step = Math.min(15, secs); for (let t = 0; t < secs; t += step) { await new Promise(r => setTimeout(r, step * 1000)); samples.push(await p.evaluate(() => ofReport())); }
    const last = samples[samples.length - 1]; console.log(label, "n", n, "fps", last.fps, "raf", last.rafIntervalMs, "ms anim", last.ms.animMean, "submit", last.ms.submitMean, "gpu", last.ms.gpuMean, "pageDraw", last.ms.pageDrawMean, "draws", last.draws, "tris", last.tris, "mem", JSON.stringify(last.memMB), "errors", errs.length);
    runs.push({ label, n, secs, samples, errors: errs }); await p.close();
  };
  for (const n of POPS) await runOne(n, SECS, "pop");
  if (SUST) { const [n, s] = SUST.split(":").map(Number); await runOne(n, s, "sustained"); }
  fs.writeFileSync(OUT, JSON.stringify({ motion: MOTION, char: CHAR, fpsCap: FPS || null, dpr: DPR, runs }, null, 1)); await b.close();
})();

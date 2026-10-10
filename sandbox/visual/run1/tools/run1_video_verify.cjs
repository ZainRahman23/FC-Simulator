// run1/tools/run1_video_verify.cjs — VERIFIES an archival capture (run1_video.cjs) twice over:
//  1. LOCOMOTION: an independent replay of the viewer itself in Node (the page's own scripts in the page's order, minus the GL renderer; the clip's
//     lanes and times) must give every lane, every frame, the same joint-matrix fingerprint the browser captured — i.e. the video shows exactly what
//     the viewer computes, at exactly the stated times (t = t0 + k / fps, no dropped or repeated animation time).
//  2. PLAYBACK: the encoded MP4 decodes to the stated frame count / rate / duration, each decoded frame matches its source frame (PSNR per frame:
//     a dropped, repeated or reordered frame would collapse it), and no decoded frame repeats its predecessor (mpdecimate).
// usage: FFMPEG=<ffmpeg> node run1_video_verify.cjs --meta <dir>/<FILE>.capture.json --frames <scratch frames dir> [--stills <dir>] [--engine v13]
//   --engine v13: the replay runs the RUN-1.3 lanes on the FROZEN baseline file (run1_gait_v13.js, RUN1_V13) instead of run1_gait.js — proving the
//   captures show the frozen implementation. --skip-playback 1: the locomotion half only.
const fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
const { CLIPS } = require("./run1_video_clips.cjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const META = JSON.parse(fs.readFileSync(arg("meta"), "utf8")), C = CLIPS[META.clip], FR = arg("frames"), FF = process.env.FFMPEG || "ffmpeg";
const VIS = path.resolve(__dirname, "../.."), REPO = path.resolve(VIS, "../..");
// ── 1. independent replay of the viewer (same scripts as run1.html, in order; of_char_gl.js is GPU drawing only and is not needed for poses) ──
const ctx = { console, Math, Float32Array, Uint16Array, Uint32Array, Uint8Array, Int32Array, Array, Object, JSON, Number, Set, Map, Promise, performance: { now: () => 0 },
  window: { addEventListener() {}, devicePixelRatio: 2 } };
vm.createContext(ctx);
for (const f of ["anim3d/m4.js", "anim3d/skeleton.js", "anim3d/ik.js", "anim3d/of_rig.js", "anim3d/of_motion.js", "anim3d/of_loco.js", "anim3d/of_loco_cont.js", "anim3d/of_character.js",
  "run1/run1_gait.js", "run1/run1_gait_orig.js", "run1/run1_gait_v11.js", "run1/run1_gait_v12.js", "run1/run1_gait_v13.js", "run1/run1_viewer.js"])
  vm.runInContext(fs.readFileSync(path.join(VIS, f), "utf8"), ctx, { filename: f });
ctx.__rig = JSON.parse(fs.readFileSync(path.join(REPO, "assets/characters/outfield/vinicius/rig.json"), "utf8")); ctx.__C = C; ctx.__N = META.frames.length; ctx.__ENGINE = arg("engine", "run1_gait.js");
const rep = vm.runInContext(`(() => {
  const C = __C; if (C.inject) RV1_PRESETS[C.preset] = C.inject;
  if (__ENGINE === "v13") { RV1_ENG.run1.api = () => RUN1_V13; RV1_ENG.run1.own = true; }   // the frozen baseline in place of run1_gait.js
  RV1.entry = { skel: ofCharSkeleton({ rig: __rig }) };
  Object.assign(RV1, { preset: C.preset, zoom: C.zoom, dir: C.dir, v1Mode: C.v1Mode, rate: 1, labels: false, blind: 0, speedMode: "const", sampleTicks: false });
  rv1Reset(); RV1.t = C.t0; rv1Update(C.t0);
  const fnv = (h, u) => { for (let b = 0; b < 4; b++) { h ^= (u >>> (b * 8)) & 255; h = Math.imul(h, 16777619) >>> 0; } return h; };
  const N = __N, out = [];
  for (let k = 0; k < N; k++) { const t = C.t0 + k / C.fps; for (const ps of C.passes) { RV1.t = t; rv1Update(t); }
    out.push(RV1.lanes.map(L => { let h = 2166136261; for (const m of L.fk.world) { const u = new Uint32Array(Float32Array.from(m).buffer); for (let i = 0; i < 16; i++) h = fnv(h, u[i]); } return { key: L.key, v: L.sim.v, h: h.toString(16), W: [].concat(...L.fk.world.map(m => Array.from(Float32Array.from(m)))) }; })); }
  return { out, lanes: RV1.lanes.map(L => ({ key: L.key, eng: L.eng, label: L.label, v: L.v })) };
})()`, ctx);
// the browser's matrices (pose.f64, written by the capture) against the replay's, number by number. Both are the renderer's float32 matrices. Chrome's and
// Node's V8 builds can differ in the last bits of a float64 intermediate (~1e-16); after the float32 rounding that shows as at most ONE float32 ulp of a
// term at the matrix's own scale (rotation terms are unit scale; translations are metres). Terms that are mathematically zero can come out as 0 in one
// engine and ~1e-16 in the other, so each difference is measured in float32 ulps of max(|value|, 1): bit-identity where it holds, every other term
// within one such ulp, and the largest absolute difference
const PB = new Float64Array(fs.readFileSync(path.join(FR, "pose.f64")).buffer.slice(0)); let off = 0, same = 0, diff = 0, maxD = 0, nD = 0, nAll = 0, keyBad = 0, dtBad = 0, overUlp = 0, maxUlp = 0;
const ulp32 = (x) => { const a = Math.abs(x); if (a < 1.1754943508222875e-38) return 1.401298464324817e-45; return Math.pow(2, Math.floor(Math.log2(a)) - 23); };
META.frames.forEach((F, k) => { if (Math.abs(F.viewerT - (C.t0 + k / C.fps)) > 1e-9) dtBad++;
  F.lanes.forEach((L, i) => { const R = rep.out[k][i]; if (R.key !== L.key) keyBad++; let any = false;
    for (let q = 0; q < R.W.length; q++) { const d = Math.abs(PB[off + q] - R.W[q]); nAll++; if (d > 0) { any = true; nD++; maxD = Math.max(maxD, d); const u = d / ulp32(Math.max(Math.abs(PB[off + q]), Math.abs(R.W[q]), 1)); maxUlp = Math.max(maxUlp, u); if (u > 1.0000001) overUlp++; } }
    off += R.W.length; if (any) diff++; else same++; }); });
const res = { clip: META.clip, file: META.file, replayEngine: arg("engine") === "v13" ? "RUN-1.3 lanes on the frozen baseline run1_gait_v13.js (RUN1_V13)" : "run1_gait.js", lanes: rep.lanes, frames: META.frames.length, laneFrames: same + diff,
  locomotion: keyBad === 0 && off === PB.length && overUlp === 0 && maxD < 1e-6 ? `MATCH: ${same} of ${same + diff} lane-frames bit-identical to the independent replay; in the rest ${nD} of ${nAll} float32 matrix terms differ, each by at most ${maxUlp.toFixed(3)} float32 ulp at the matrix scale (largest absolute ${maxD.toExponential(1)}) — last-bit rounding between Chrome's and Node's V8 math, not a different pose` : `MISMATCH: ${overUlp} terms beyond 1 float32 ulp (max ${maxUlp.toFixed(1)} ulp), max |Δ| ${maxD.toExponential(2)}, ${diff} lane-frames, key errors ${keyBad}, size ${off}/${PB.length}`,
  animationTime: dtBad === 0 ? `every frame at exactly t0 + k / ${C.fps} s (t ${C.t0.toFixed(3)} … ${(C.t0 + (META.frames.length - 1) / C.fps).toFixed(3)} s): no dropped or repeated animation time` : `${dtBad} frames off the 1/${C.fps} s grid` };
// ── 2. playback of the encoded files ──
const run = (args) => { const r = cp.spawnSync(FF, args, { encoding: "utf8", maxBuffer: 1 << 28 }); return (r.stdout || "") + (r.stderr || ""); };   // ffmpeg reports on stderr
res.playback = arg("skip-playback") ? [] : META.encoded.map(E => {
  const f = path.join(path.dirname(arg("meta")), E.file), src = path.join(FR, /UNLABELED/.test(E.file) ? "bare" : "lab", "%05d.png");
  const info = run(["-hide_banner", "-i", f]), dur = (info.match(/Duration: ([0-9:.]+)/) || [])[1], stream = (info.match(/Stream #0:0[^\n]*Video: [^\n]*/) || [""])[0];
  const count = run(["-hide_banner", "-i", f, "-map", "0:v", "-f", "null", "-"]), nDec = +((count.match(/frame=\s*(\d+)/g) || []).pop() || "frame=0").replace(/\D/g, "");
  const stats = path.join(FR, E.file + ".psnr.txt"); run(["-hide_banner", "-i", f, "-framerate", String(C.fps), "-i", src, "-lavfi", `[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]psnr=stats_file=${stats}`, "-f", "null", "-"]);
  const P = fs.readFileSync(stats, "utf8").trim().split("\n").map(l => { const m = l.match(/psnr_avg:([0-9.inf]+)/); return m ? (m[1] === "inf" ? 99 : +m[1]) : NaN; });
  const dec = run(["-hide_banner", "-i", f, "-vf", "mpdecimate=hi=64:lo=32:frac=0.0,showinfo", "-f", "null", "-"]), kept = (dec.match(/\bn:\s*\d+/g) || []).length;
  const sz = fs.statSync(f).size;
  if (arg("stills")) { fs.mkdirSync(arg("stills"), { recursive: true }); for (const ts of [0, 3.5, 6.98]) run(["-hide_banner", "-y", "-ss", String(ts), "-i", f, "-frames:v", "1", path.join(arg("stills"), `${E.file}_t${ts}.png`)]); }
  return { file: E.file, bytes: sz, duration: dur, stream, decodedFrames: nDec, expectedFrames: META.frames.length, psnrMinDb: +Math.min(...P).toFixed(2), psnrMeanDb: +(P.reduce((a, b) => a + b, 0) / P.length).toFixed(2), psnrFrames: P.length,
    duplicatesDropped: META.frames.length - kept, verdict: nDec === META.frames.length && P.length === META.frames.length && Math.min(...P) > 35 && kept === META.frames.length ? "PASS" : "CHECK" };
});
console.log(JSON.stringify(res, null, 1));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(res, null, 1));

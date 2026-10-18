// dribble15/tools/d15_strip.mjs — the follow-through still strip for one touch: finds the touch (scenario / seed / touch time ±0.02 s) in a Node run,
// the touching foot's touchdown after it, then captures the lab page (diagnostics on, a close view) at: 50 ms before the contact, the contact, +50,
// +100, +200 ms, and the touchdown, and tiles them (3 × 2) with labels. env: S (scratch: ffmpeg, node_r), OUT (stills dir)
// usage: node d15_strip.mjs SCENARIO seed touchTime name [view nearC] [prof HIGH]
import fs from "fs"; import path from "path"; import { execFileSync } from "child_process"; import { fileURLToPath } from "url"; import { makeSim, DT, PROFILES } from "./d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [id, seedA, tA, name, view = "nearC", prof = "HIGH"] = process.argv.slice(2), S = makeSim(get(id), { seed: +seedA, player: PROFILES[prof], opts: { record: true } }); S.run();
const T = S.touches.find((t) => t.launched && Math.abs(t.t - +tA) < 0.021); if (!T) { console.error("touch not found", S.touches.map((t) => t.t.toFixed(3))); process.exit(1); }
let kTD = null; for (let k = T.k + 1; k < S.rec.length; k++) { const r = S.rec[k]; if (r.bones === undefined) break; }
// touchdown: re-run with bones recorded to find the first stance tick of the touching foot after the contact
const S2 = makeSim(get(id), { seed: +seedA, player: PROFILES[prof], opts: { record: true, recBones: true } }); S2.run(T.t + 0.6);
for (let k = T.k + 1; k < S2.rec.length; k++) { const b = S2.rec[k].bones; if (b && (T.F === "R" ? b.wR : b.wL) < 0) { kTD = k; break; } }
const times = [[T.k - 12, "50 ms before"], [T.k, "contact"], [T.k + 12, "+50 ms"], [T.k + 24, "+100 ms"], [T.k + 48, "+200 ms"], [kTD, "TURN-1.2 landing (touchdown)"]].sort((a, b) => a[0] - b[0]);
const OUT = process.env.OUT, tmp = path.join(OUT, name + "_parts"); fs.mkdirSync(tmp, { recursive: true });
const ts = times.map(([k]) => (k * DT).toFixed(4)).join(",");
execFileSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), "d15_capture.cjs"), "--page", "dribble15.html", "--q", `scn=${id}&seed=${seedA}&prof=${prof}&diag=1`, "--out", tmp, "--stills", ts, "--single", view, "--w", "900", "--h", "620", "--profile", path.join(process.env.S, "d12", "chrome_prof_s")], { stdio: "inherit", env: process.env });
const FF = path.join(process.env.S, "ffmpeg"), FONT = "/System/Library/Fonts/Helvetica.ttc", files = times.map(([k]) => path.join(tmp, `t${(+(k * DT).toFixed(4)).toFixed(3)}.jpg`));
const lab = times.map(([k, l], i) => `[${i}:v]drawtext=fontfile=${FONT}:text='${l} (t ${(k * DT).toFixed(3)} s)':x=14:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6[v${i}]`).join(";");
execFileSync(FF, ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", `${lab};[v0][v1][v2]hstack=inputs=3[r0];[v3][v4][v5]hstack=inputs=3[r1];[r0][r1]vstack=inputs=2`, "-q:v", "3", path.join(OUT, name + ".jpg")]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ file: name + ".jpg", scenario: id, seed: +seedA, touch: { t: +T.t.toFixed(3), F: T.F, reg: T.reg, speed: +T.executed.speed.toFixed(2), ft: T.caft || null, minClearMm: T.minClear != null ? +(T.minClear * 1000).toFixed(1) : null }, touchdownS: kTD != null ? +(kTD * DT).toFixed(3) : null }));

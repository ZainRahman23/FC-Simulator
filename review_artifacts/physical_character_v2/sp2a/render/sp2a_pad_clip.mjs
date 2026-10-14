// presentation helper: give a clip without a run-in (SP2 begins in its committed-entry state at the plant touchdown) frames for negative steps
// by HOLDING its first frame, labelled — so it can sit beside SP2A's run-in in one synchronised video. Nothing is simulated or interpolated.
// usage: node sp2a_pad_clip.mjs <clips dir> <key> <fromStep (negative)> <label>
import fs from "fs"; import path from "path";
const [dir, key, from, label] = process.argv.slice(2), f = path.join(dir, key + ".json"), d = JSON.parse(fs.readFileSync(f)), first = d.frames.find(x => x.n >= 1) || d.frames[0], pad = [];
for (let n = +from; n < first.n; n++) pad.push({ ...first, n, t: Math.round(n / 240 * 1e5) / 1e5, turf: [], hud: { kin: true, label }, intentSkel: undefined });
d.frames = [...pad, ...d.frames.filter(x => x.n >= first.n)]; fs.writeFileSync(f, JSON.stringify(d)); console.log(key, "padded", pad.length, "frames");

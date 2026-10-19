// technical_control11/tools/tc11_scan.mjs — finds the review cases for the feet / ankle pass: TECHNICAL-CONTROL-1's gameplay only (animation off),
// every contact's time / foot / surface / action, over sections × styles × feet × seeds at the given ratings.
//   node tc11_scan.mjs <out.jsonl> <ratings B99_D99_A99> [shard/of]
import fs from "fs"; import { makeTech } from "../../technical_control1/tools/tc_env.mjs"; import { anyCase } from "../../technical_control1/tc_course.js"; import { STYLES } from "../../technical_control1/tc_attrs.js";
const out = process.argv[2], rt = process.argv[3] || "B99_D99_A99", [sh, of] = (process.argv[4] || "0/1").split("/").map(Number);
const SEC = ["STRAIGHT", "ACCEL", "TURN0_V3", "TURN0_V4", "TURN0_V7", "TURN0_V8", "CUT30", "CUT60", "CUT90", "CUT120", "CUT150", "CUT180", "CUT60_L", "CUT90_L", "CUT150_L", "LR", "CONTEST45", "TURN20_V7", "TURN45_V3", "TURN75_V7", "TURN100_V4", "TURN135_V2", "STOP"];
const jobs = []; for (const s of SEC) for (const st of Object.keys(STYLES)) for (const foot of ["R", "L", "B"]) for (const seed of [1, 2, 3]) jobs.push({ s, st, foot, seed });
const fd = fs.openSync(out, "a");
for (const [j, J] of jobs.entries()) { if (j % of !== sh) continue; const id = `${J.s}_${rt}_S${J.st}`; let cs; try { cs = anyCase(id, J.seed); } catch (e) { continue; }
  const S = makeTech(cs, { seed: J.seed, foot: J.foot }); try { S.run(); } catch (e) { fs.writeSync(fd, JSON.stringify({ id, seed: J.seed, foot: J.foot, err: String(e) }) + "\n"); continue; }
  const ep = S.rc2 && S.rc2.ep; if (!ep) continue; const acts = (ep.techLog || []).filter((e) => e.ev === "action").map((e) => ({ fam: e.fam, t: +e.t.toFixed(3), tc: +(e.tc || 0).toFixed(3) }));
  const C = ep.contacts.map((c) => ({ t: +c.t.toFixed(3), F: c.F, s: c.surface, r: c.role || null }));
  fs.writeSync(fd, JSON.stringify({ id, seed: J.seed, foot: J.foot, C, acts }) + "\n"); }

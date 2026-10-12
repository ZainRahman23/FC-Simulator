// BALANCE-2 VISUAL PREPARATION (§18; presentation only; frozen with the successor preregistration): deterministic runs for the review clips of
// four systems — A: CURRENT V2 (law A) | S2P2: PPR-3 S2 + old P2 (frozen) | B1: M1b + BALANCE-1 B (frozen) | C2: M1b + BALANCE-2 C2 (frozen).
// Seven scenarios at the matched battery's own onset (step 480, t = 2 s; 50 ms pelvis pulse; motor noise as each controller's own):
//   QUIET  undisturbed 0–6 s
//   SMALLF small forward, B2M 4.82 N·s
//   F12    the BALANCE-1 moderate forward push, 12.0 N·s (the case that failed BALANCE-1 P2)
//   BACKM  matched moderate backward, B2M 11.69 N·s
//   LATM   matched moderate lateral (left), B2M 15.0 N·s
//   NEARF  near-limit forward, 14.0 N·s (0.94 × the matched T_fwd 14.83; below both M1b systems' measured thresholds)
//   OVERF  unrecoverable forward, B2M over-limit 21.50 N·s
// usage (worktree root): V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node b2_save_runs.mjs --out <records dir>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const R = new URL("../../", import.meta.url).href, BT = await import(R + "ppr3/scripts/ppr3_battery.mjs"), P3 = await import(R + "ppr3/scripts/ppr3_run.mjs"), B1 = await import(R + "balance1/scripts/b1_run.mjs");
const CT = await import(R + "balance1/scripts/b1_ctrl.mjs"), C2M = await import(R + "balance2/successor/b2_ctrl.mjs"), J = (p) => JSON.parse(fs.readFileSync(new URL(p, R)));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const S2 = J("ppr3/params/PPR3_S2_CANDIDATE.json"), P2 = J("ppr3/params/PPR3_P2_CANDIDATE.json"), BP = J("balance1/params/B1_BODY.json"), B1P = J("balance1/params/B1_B.json"), C2P = J("balance2/successor/params/C2.json");
export const SCEN = [["QUIET", null, 0], ["SMALLF", "fwd", 4.82], ["F12", "fwd", 12.0], ["BACKM", "back", 11.69], ["LATM", "left", 15.0], ["NEARF", "fwd", 14.0], ["OVERF", "fwd", 21.5]], ONSET = 480, STEPS = 1440;
const save = (k, o) => { fs.writeFileSync(path.join(OUT, k + ".json.gz"), zlib.gzipSync(JSON.stringify(o))); console.log(k, o.recs.length, o.finalHash, o.stop ? "stop " + o.stop.reason : ""); return o.finalHash; };
const sys = (perturb) => ({ A: () => P3.runOne(BT.makeJob("A", { body: S2, ctrl: P2 }, { steps: STEPS, perturb })), S2P2: () => P3.runOne(BT.makeJob("S2P2", { body: S2, ctrl: P2 }, { steps: STEPS, perturb })),
  B1: () => B1.runOne({ law: "M1B", params: BP, ctrl: () => new CT.BalanceController(B1P), steps: STEPS, perturb }), C2: () => B1.runOne({ law: "M1B", params: BP, ctrl: () => new C2M.SuccessorController(C2P), steps: STEPS, perturb }) });
const hashes = []; for (const [key, dir, Jn] of SCEN) for (const [k, f] of Object.entries(sys(dir ? BT.pushJob(dir, Jn, ONSET, 12) : []))) hashes.push(`${key}_${k} ${save(key + "_" + k, await f())}`);
fs.writeFileSync(path.join(OUT, "FINAL_HASHES.txt"), hashes.join("\n") + "\n");

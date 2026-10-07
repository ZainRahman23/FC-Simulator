// ═══ physchar2/tools/dvg_wrap.mjs — runs a FROZEN harness with DVG (d1Guard: 2; e2/DVG_PREREG.md CQ-1) enabled, the tool itself unchanged:
//   --dvgcfg=<CFG name>   the named configuration of gates/v2_e2.js gets d1Guard: 2 (tools that read CFG: swing_servo_val2, td2b_val, …);
//   --dvginject           every StandController constructed in the process gets d1Guard: 2 (tools with internal configurations: e1a_run, e1b_run). The sim passes its actuator
//                         layer when the option is on (gates/v2_g2.js), so the injection is made at the controller's construction.
// Prints the guard's evaluation / invalid counts after the tool's own output line, and with --dvglog=<file.json.gz> writes the guard trace (per evaluation: tick, leg, state, weight,
// V1–V4, torque ratio, commanded rate, source tick, slew reference, the applied joint-rate command's force–velocity ratio, per-axis applied / source / fresh unit contributions).
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/dvg_wrap.mjs --dvgcfg=PSTAR5CH [--dvglog=<file>] tools/swing_servo_val2.mjs --human=V2-REF --side=L --hz=240 --ff=on --traj=R-F --out=<file>
import fs from "fs"; import zlib from "zlib"; import path from "path"; import { pathToFileURL } from "url"; import { CFG } from "../gates/v2_e2.js"; import { StandController } from "../ctrl/v2_stand.js";
const opt = (k) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : null; }, inject = process.argv.includes("--dvginject"), name = opt("dvgcfg"), logf = opt("dvglog");
const tool = process.argv.slice(2).find(a => a.endsWith(".mjs"));
if (!tool || (!inject && !(name && CFG[name])) || (inject && name)) throw new Error("usage: (--dvgcfg=<CFG name> | --dvginject) [--dvglog=<file>] <tool.mjs> [args]");
if (name) CFG[name] = { ...CFG[name], d1Guard: 2 };
if (inject) Object.defineProperty(StandController.prototype, "o", { configurable: true, get() { return undefined; }, set(v) { Object.defineProperty(this, "o", { value: { ...v, d1Guard: 2 }, writable: true, enumerable: true, configurable: true }); } });
let ev = 0, inv = 0; const log = [], step0 = StandController.prototype.dvgStep, axis0 = StandController.prototype.dvgAxis;
StandController.prototype.dvgStep = function (n, ...a) { step0.call(this, n, ...a); const G = this.dvg[n]; ev++; if (!G.valid) inv++;
  if (logf) { G.axLog = []; log.push({ G, n, hz: Math.round(1 / a[1]) }); } };
StandController.prototype.dvgAxis = function (n, k, i, ...a) { const r = axis0.call(this, n, k, i, ...a); if (logf && r && this.dvg[n].axLog) this.dvg[n].axLog.push([k, i, r.dvx, r.dvu, r.dvf]); return r; };
process.on("exit", () => {
  if (logf) { const rows = log.map(({ G, n, hz }) => ({ tick: G.tick, n, hz, mode: G.mode, w: G.w, valid: G.valid, okR: G.okR, okC: G.okC, okF: G.okF, okT: G.okT, tRatio: G.tRatio, err: G.err, lam: G.lam, wq: G.wq, srcTick: G.srcTick, Cprev: G.Cprev, rateEnv: G.rateEnv, pw: G.pw || 0, ax: G.axLog }));
    fs.writeFileSync(logf, zlib.gzipSync(JSON.stringify({ generated: "tools/dvg_wrap.mjs", tool, args: process.argv.slice(2), evaluations: ev, invalid: inv, rows }))); }
  console.log(`DVG-WRAP ${name || "inject"}: evaluations ${ev}, invalid ${inv}`); });
await import(pathToFileURL(path.resolve(tool)).href);

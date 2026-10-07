// ═══ physchar2/tools/d1g_wrap.mjs — runs a FROZEN harness with the D1 guard enabled on one named configuration (e2/D1G_TD2C_PREREG.md DG-1 (c): the SV-2 servo-on runs on PSTAR5CH +
// d1Guard), the tool itself unchanged. Counts the guard's D1 evaluations and invalid ones over the process and prints them after the tool's own output line.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/d1g_wrap.mjs --d1gcfg=PSTAR5CH tools/swing_servo_val2.mjs --human=V2-REF --side=L --hz=240 --ff=on --traj=R-F --out=<file>
import path from "path"; import { pathToFileURL } from "url"; import { CFG } from "../gates/v2_e2.js"; import { StandController } from "../ctrl/v2_stand.js";
const name = (process.argv.find(a => a.startsWith("--d1gcfg=")) || "").split("=")[1], tool = process.argv.slice(2).find(a => a.endsWith(".mjs"));
if (!name || !CFG[name] || !tool) throw new Error("usage: --d1gcfg=<CFG name> <tool.mjs> [args]");
CFG[name] = { ...CFG[name], d1Guard: true };
let ev = 0, inv = 0; const orig = StandController.prototype.d1GuardStep; StandController.prototype.d1GuardStep = function (...a) { const out = orig.apply(this, a); ev++; if (!this.d1g[a[0]].valid) inv++; return out; };
process.on("exit", () => console.log(`D1G-WRAP ${name}: evaluations ${ev}, invalid ${inv}`));
await import(pathToFileURL(path.resolve(tool)).href);

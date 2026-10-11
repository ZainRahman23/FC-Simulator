// PVP-1A(-DX) determinism: the base modes once more in REVERSE order in ONE process (fresh world + plants per run); final hashes per mode.
// usage: V2_KNEE_MODEL=v2k node pvp1a_batch.mjs <fixture.json> <out.json>
import fs from "fs";
const { runOne } = await import(new URL("./pvp1a_run.mjs", import.meta.url).href);
const [FIXF, OUT] = process.argv.slice(2), FIX = JSON.parse(fs.readFileSync(FIXF)), res = {};
for (const mode of ["SOLO_T", "SOLO_R", "N2", "C0"]) { const o = runOne({ mode, fixtureObj: FIX }); res[mode] = o.finalHash; console.log(mode, o.finalHash, o.status); }
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));

// physchar2/tools/b_native/dump2bits.mjs — convert a b_narrow.mjs --dump JSON into float32 bit patterns for b_query (exact transfer). DIAGNOSTIC.
import fs from "fs"; const d = JSON.parse(fs.readFileSync(process.argv[2])), b = (x) => { const f = new Float32Array([x]); return new Uint32Array(f.buffer)[0]; };
const L = [String(d.points.length), ...d.points.map(p => p.map(b).join(" ")), [b(d.cr), d.hullTol != null ? 1 : 0, d.hullTol != null ? b(d.hullTol) : 0].join(" "), d.q.map(b).join(" "), d.p.map(b).join(" "), d.turf.map(b).join(" "), String(b(d.sep))];
fs.writeFileSync(process.argv[3], L.join("\n") + "\n");

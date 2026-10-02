import { spec, M } from "./lib.mjs";
let top = -1, bot = 9; for (const b of spec.bodies) { for (const sh of b.shapes || []) { const y = (b.pos ? b.pos[1] : 0); } }
console.log(Object.keys(spec.bodies[0])); const hd = spec.bodies.find(b => b.name === "head"); console.log(JSON.stringify(hd).slice(0, 400)); console.log("mass", spec.totalMass);

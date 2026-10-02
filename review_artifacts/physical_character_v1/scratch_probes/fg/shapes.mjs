import { body } from "./lib.mjs";
const { spec } = body("F2"); for (const b of spec.bodies) console.log(b.name, b.mass.toFixed(3), JSON.stringify(b.shapes.map(s => ({ t: s.type || s.kind, ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== "type" && k !== "kind").map(([k, v]) => [k, Array.isArray(v) ? v.map(x => +(+x).toFixed(3)) : v])) }))).slice(0, 300));

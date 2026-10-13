// SUPPORT-1 recipient candidates. Each = { id, describe, ctrl (null → frozen C3; a function (plant, c) → controller | null), body (null → canonical M1b),
// contactRule (null → frozen contact model) }. Diagnostics (not candidates) are labelled DIAG.
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, C3P = JSON.parse(fs.readFileSync(new URL("balance2/c3/params/C3.json", RA)));
const { C3SCController } = await import(new URL("./s1_c3sc.mjs", import.meta.url).href);
const C = {};
C.V2 = { id: "V2", describe: "current V2 recipient: frozen C3 on canonical M1b, frozen contact model (boot|turf 1.2)", ctrl: null, body: null, contactRule: null };
C.DIAG_TONIC = { id: "DIAG_TONIC", describe: "DIAGNOSTIC: canonical M1b with its tonic standing intent only (no balance controller) — what the body does without C3", ctrl: () => null, body: null, contactRule: null };
C.C3SC = { id: "C3SC", describe: "C3 + support confidence (per-leg loadability from the leg's own sensed load / slip / tilt scales that leg's stance intent)", ctrl: () => new C3SCController(C3P), body: null, contactRule: null };
export function get(id) { if (!C[id]) throw new Error("unknown candidate " + id); return C[id]; }
export function register(c) { C[c.id] = c; }
export const ALL = C;
const { C3URController } = await import(new URL("./s1_c3ur.mjs", import.meta.url).href);
C.C3UR = { id: "C3UR", describe: "C3 + unloading response to sudden ankle rotation (Konradsen & Ravn 1990; 67 ms proprioceptive channel; graded 85–300 °/s; stance intent withdrawn; peroneal reflex 0.3 × capacity)", ctrl: () => new C3URController(C3P), body: null, contactRule: null };
// LDG contact model (literature §1, §11.1): studded-boot translational traction coefficient falls with normal load — fitted through Blackburn 2012
// (studded foot, dynamic shear rig): ≈ 2.2 at 0.3 kN (Table 6.8, means 1.86–2.70 at 185–443 N) and 0.92 at 2.2 kN (Table 6.10, 0.91–0.94 at 1.98–2.43 kN):
// µ(N) = 0.718 + 444.6 N / N, capped at 2.7 (the highest low-load mean); natural-grass release by turf shear (divot) caps the horizontal force per foot at
// 3.0 kN (Kent 2015/2021: 2.5–4.2 kN) — µ_eff = min(µ(N), 3000 / N). N = that foot's total turf normal load at the previous step (all its boot pieces).
export const LDG = Object.freeze({ a: 444.6, b: 0.718, muMax: 2.7, divotN: 3000 });
export function ldgMu(N) { if (!(N > 1)) return LDG.muMax; return Math.min(LDG.muMax, LDG.b + LDG.a / N, LDG.divotN / N); }
const ldgRule = (ctx) => { const N = ctx.plant.footN ? ctx.plant.footN[ctx.foot] : null; return N == null ? null : ldgMu(N); }; ldgRule.label = "LDG (load-dependent studded traction + grass divot cap)";
C.LDG = { id: "LDG", describe: "V2 + load-dependent studded-boot traction (Blackburn 2012 fit, µ 2.7 cap) + natural-grass divot cap 3 kN per foot", ctrl: null, body: null, contactRule: ldgRule };
C.LDG_C3UR = { id: "LDG_C3UR", describe: "LDG contact model + C3-UR controller", ctrl: () => new C3URController(C3P), body: null, contactRule: ldgRule };

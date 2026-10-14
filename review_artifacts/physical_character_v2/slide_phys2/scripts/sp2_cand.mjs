// SLIDE-PHYS-2 full-tackle candidates (SP2 generations). Each is SP1 (search-2 best, evidence/SP1_cand_dump.json: same committed entry
// E-PLANT5B, same plant support objective, same commit choreography, M1c tackler, TCF-1 boots, A5 authority) with EXPLAINED changes to the ground
// entry and the slide organisation. Built on slide_phys1's G23 controller (SlideTracker + plant VF + optional press + optional seat objective).
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href;
const CD = await import(S1 + "sp_cand.mjs"), AU = await import(S1 + "sp_authority.mjs");
const SP1 = JSON.parse(fs.readFileSync(new URL("../evidence/SP1_cand_dump.json", import.meta.url)));
const clone = (x) => JSON.parse(JSON.stringify(x));
export function base(speed = 5) { const d = clone(SP1); const entry = { ...d.entry, id: "E-PLANT5B@" + speed, vRoot: [d.entry.vRoot[0], d.entry.vRoot[1], speed] };
  return { ...CD.G23, id: "SP1", entry, chor: { name: "SP1", tracks: d.tracks }, couple: d.couple, pelvis: d.pelvis, vfPlan: d.vfPlan, press: d.press, gains: d.gains, lead: d.lead, ffLead: d.ffLead,
    ff: CD.G23.ff, muscle: d.muscle, soleRule: d.soleRule, steps: 480 }; }
const OFF = [9, 9];
// H1 — the first SP2 hypothesis test. (1) Tackling leg held up: thigh to 85° and the knee kept at 45° (coupling map ends at 45, not 15) until
// the fold side has landed, then extended 0.55→0.8 s (boot clear by geometry, not by switching anything off). (2) No tackling-leg press (it was
// the kickstand). (3) Slide organisation from the fold side: the pelvis-orientation objective realised through the fold hip while the fold leg is
// on the turf (sp_vf "seat", no support force), progressive trunk recline, fold arm posted earlier.
export function H1(speed = 5) { const c = base(speed), tr = c.chor.tracks;
  tr["hip_R.flex"] = [[0, 0], [0.08, 35], [0.13, 65.3], [0.22, 85], [0.5, 85], [0.75, 72], [1.6, 65]];
  tr["knee_R.flex"] = [[0, 118], [0.08, 92], [0.16, 60], [0.26, 45], [0.55, 45], [0.8, 15], [1.6, 12]];
  c.couple = [{ ...c.couple[0], map: [[38, 115], [46.5, 70], [55, 45]], window: [0, 0.55] }];
  tr["lumbar.flex"] = [[0, 3], [0.12, 0], [0.3, -15], [0.6, -25], [1.1, -15], [1.6, -10]];
  tr["shoulder_L.flex"] = [[0, -35], [0.12, -50], [0.3, -55], [1.6, -50]]; tr["shoulder_L.abd"] = [[0, 12], [0.15, 25], [0.3, 45]]; tr["elbow_L.flex"] = [[0, 95], [0.2, 30], [0.35, 8]];
  c.press = { ...c.press, window: OFF };
  c.seat = { side: "L", window: [0.35, 1.6], ramp: 0.05, gains: { ko: 500, do: 70 }, pelvis: { pitch: [[0, 0], [0.4, -20], [1.6, -20]], roll: [[0, 0], [0.4, 25], [1.6, 28]], yaw: [[0, 0], [1.6, 0]] } };
  return { ...c, id: "H1", chor: { name: "H1", tracks: tr } }; }
// H1 RESULT (rejected): tackling boot still first (0.363 s, 95 % of the glide) — the pelvis pitches FORWARD 9–11° through the commit flight (the body
// leaves the plant with forward pitch momentum, ≈ −10 N·m·s as SP1) and the fold leg lags its targets by 30–40° (hip 6–20 vs 36–62), so the hanging
// tackling boot (thigh 85°, knee 45°) is the lowest point; its knee then buckles to 144° and the body rolls over it (belly −0.68, head 1.14 s).
// H2 — boot clear by GEOMETRY: the tackling leg driven to ≈ horizontal (hip 98°, knee extended to 25° through the coupling) so the boot is at about
// hip height; the plant's pelvis objective asks for a stronger sit-back (−15° instead of −7°) to turn the plant's ground reaction into backward pitch;
// the fold leg's fold starts earlier (knee 90 by 0.15 s, hip 45 by 0.22 s).
export function H2(speed = 5) { const c = H1(speed), tr = c.chor.tracks;
  tr["hip_R.flex"] = [[0, 0], [0.08, 40], [0.13, 75], [0.22, 98], [0.55, 98], [0.85, 80], [1.6, 70]];
  tr["knee_R.flex"] = [[0, 118], [0.08, 92], [0.16, 55], [0.26, 25], [0.6, 22], [0.9, 12], [1.6, 10]];
  c.couple = [{ ...c.couple[0], map: [[40, 115], [55, 60], [75, 25]], window: [0, 0.55] }];
  tr["knee_L.flex"] = [[0, 22], [0.05, 32], [0.1, 60], [0.15, 90], [0.25, 118], [0.5, 125], [1.6, 118]];
  tr["hip_L.flex"] = [[0, 30], [0.05, 22], [0.1, 22], [0.22, 45], [0.35, 60], [1.6, 58]];
  c.pelvis = { ...c.pelvis, pitch: [[0, 2], [0.09, -15]] };
  return { ...c, id: "H2", chor: { name: "H2", tracks: tr } }; }
export const CANDS = { SP1: base, H1, H2 };
export const make = (id, speed = 5, authority = "A5") => AU.apply(CANDS[id](speed), authority);

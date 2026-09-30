// ═══ physchar/pc_d6x.js — the D6 DIAGNOSTIC matrix (D6X): controlled variants of D6_slide (pure data) ════════════════════════════════
// Each variant changes ONE physical condition of D6 (or, as a labelled diagnostic, the victim's controller); everything else is D6_slide.
// Nothing here encodes an outcome: minor contact → local disturbance → recoverable → step → fall must emerge from the same bodies, contacts,
// finite motors and support controller. Knobs: pc_gated.js (D6 DIAGNOSTIC). Merged onto D6_slide by pc_gated.js (TESTS_D6X).
// The baseline itself is D6_slide (not duplicated here). Arrival speeds are measured (the slider decelerates on the turf before contact).
const S = (g) => "D6X " + g;
export const D6X_VARIANTS = {
  // ── slide speed (initial speed at the seat landing; the arrival speed at B is the physics' answer) ──
  D6X_v45: { group: S("speed"), title: "slide 4.5 m/s at the seat landing (arrives ≈ 1.4 m/s): minor contact", A: { init: { speed: 4.5 } } },
  D6X_v50: { group: S("speed"), title: "slide 5.0 m/s (arrives ≈ 2.6 m/s)", A: { init: { speed: 5.0 } } },
  D6X_v60: { group: S("speed"), title: "slide 6.0 m/s (arrives ≈ 4.0 m/s)", A: { init: { speed: 6.0 } } },
  D6X_v65: { group: S("speed"), title: "slide 6.5 m/s (arrives ≈ 4.8 m/s)", A: { init: { speed: 6.5 } } },
  D6X_v70: { group: S("speed"), title: "slide 7.0 m/s (arrives ≈ 5.8 m/s)", A: { init: { speed: 7.0 } } },
  // ── impact height: the slider's lead leg raised (extra hip flexion, straighter knee; ROM-clamped) so it meets B's leg higher ──
  D6X_hLowShin: { group: S("height"), title: "lead leg raised 23°: first contact on B's lower shin (≈ 0.25 m)", A: { leadMod: { hip_R: { y: -23 } } } },
  D6X_hUpShin: { group: S("height"), title: "lead leg raised 32°, knee −8°: first contact on B's upper shin (≈ 0.47 m)", A: { leadMod: { hip_R: { y: -32 }, knee_R: { a: -8 } } } },
  D6X_hKnee: { group: S("height"), title: "lead leg raised 35°, knee −8°: first contact at B's knee (≈ 0.50 m; knee centre 0.53 m)", A: { leadMod: { hip_R: { y: -35 }, knee_R: { a: -8 } } } },
  D6X_hThigh: { group: S("height"), title: "lead leg raised 40°, knee −8°: first contact on B's lower thigh (≈ 0.63 m)", A: { leadMod: { hip_R: { y: -40 }, knee_R: { a: -8 } } } },
  // ── impact direction: B turned relative to the slide (the slider still meets his left boot) ──
  D6X_dirFront: { group: S("direction"), title: "B turned −30°: the slide comes from his front-left (diagonal)", Byaw: -30 },
  D6X_dirRear: { group: S("direction"), title: "B turned +30°: the slide comes from his rear-left (diagonal)", Byaw: 30 },
  // ── the struck leg's support condition (share of body weight on the struck LEFT foot) and stance width — B stands this way from t = 0 ──
  D6X_load20: { group: S("support"), title: "struck foot lightly loaded: 20 % of body weight on the left foot", Bstand: { loadL: 0.2 } },
  D6X_load70: { group: S("support"), title: "struck foot loaded: 70 % of body weight on the left foot", Bstand: { loadL: 0.7 } },
  D6X_load80: { group: S("support"), title: "struck foot loaded: 80 % of body weight on the left foot", Bstand: { loadL: 0.8 } },
  D6X_w22: { group: S("support"), title: "narrow stance: ankles 22 cm apart (nominal 32)", Bstand: { width: 0.22 } },
  D6X_w44: { group: S("support"), title: "wide stance: ankles 44 cm apart (nominal 32)", Bstand: { width: 0.44 } },
  // ── the victim's controller (DIAGNOSTIC — never a production behaviour) ──
  D6X_freeze: { group: S("controller (diagnostic)"), title: "B's controller FROZEN at 0.17 s (keeps its last standing targets, no balance feedback) — the same hit", Bctrl: { freezeAt: 0.17 } },
  D6X_freezeNoHit: { group: S("controller (diagnostic)"), title: "control for the freeze: B frozen at 0.17 s, the slider stops short (3.5 m/s, no contact)", Bctrl: { freezeAt: 0.17 }, A: { init: { speed: 3.5 } } },
  D6X_delay100: { group: S("controller (diagnostic)"), title: "B's controller sees the world 100 ms late (sensing delay, as the C1 / C3 delay tests)", Bdelay: 0.1 },
  D6X_noStep: { group: S("controller (diagnostic)"), title: "B without C3 corrective stepping (C1 balance only)", B_cfg: { noStep: true } },
  // ── the contact model ──
  D6X_mu05: { group: S("contact model"), title: "B's boot-on-turf friction 0.5 (nominal 0.9)", muB: { bootTurf: 0.5 } },
  D6X_bootHuman: { group: S("contact model"), title: "boot-sized foot colliders on both players (29 × 10.5 × 8.8 cm instead of the art-fitted 36 × 16 × 15 cm)", geo: { boot: "human" } },
  D6X_inflate: { group: S("contact model"), title: "shin + thigh colliders grown 1.5 cm toward the rendered mesh surface (both players)", geo: { inflate: 0.015 } },
};
// the representative comparison set for the review (suite D, "D6 diagnostic" panel)
export const D6X_COMPARE = [
  ["D6X_v45", "mild impact, absorbed"], ["D6X_v50", "local disturbance"], ["D6_slide", "current D6 baseline"], ["D6X_v60", "meaningful impact, recovered"],
  ["D6X_hKnee", "stumble: corrective step"], ["D6X_load80", "loaded foot swept → fall"], ["D6X_v70", "fast slide → fall"],
  ["D6X_freeze", "controller frozen at impact (diagnostic)"], ["D6X_freezeNoHit", "frozen, no hit (control)"],
];

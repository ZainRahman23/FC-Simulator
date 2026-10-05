# User instruction (2026-10-05, after the touch-rest runway report) — verbatim

(Supplied as pasted text in the user's message, after `touch_semantics/RUNWAY_REPORT.md`.)

> Continue, but do not tune Candidate C to make the current criteria pass and do not rerun E1a yet.
> The vertical release/touching problem appears converged. Focus now on closing the remaining pre-swing/contact-boundary issues in a principled way, because these directly affect G4 walking.
> For the resting/released foot's horizontal behavior, do not simply accept the observed ~1 mm drag and do not arbitrarily anchor the foot. Research established humanoid locomotion, biomechanics/contact models, and practical physics-controller implementations for how a lightly loaded foot behaves during terminal stance/pre-swing while it remains in ground contact. Determine what should be controlled versus what should emerge from friction/contact. Compare at least:
> - the present free horizontal behavior;
> - a compliant, force-bounded horizontal hold;
> - vertical-only anchoring;
> - any better established approach you find.
> Evaluate them specifically for football locomotion: no artificial world-space pinning, no hidden support force, no suppression of legitimate pivots/slips, no energy creation, and clean transition into swing. Use evidence rather than choosing whichever passes the existing gate.
> For R3, redesign the contact-boundary test so the commanded hover is not exactly on the touching threshold. Determine whether hysteresis is physically/numerically justified and whether servo accuracy itself needs improvement. Do not select a threshold from the observed failure.
> For R1, investigate the straight-leg rebound enough to determine whether it is genuinely pre-existing debt, whether it can affect E1/G4, and whether it should block walking. Do not fix unrelated passive-fall behavior merely to obtain a pass.
> B1 is a separately verified controller bug fix; preserve that distinction and evaluate adoption on its own merits rather than requiring it to solve E1a by itself.
> Then preregister one final validation for the chosen contact/pre-swing design, including unseen cases, all 8 bodies, both feet, perturbations, fast body motion over the planted/released foot, pivots/turning where relevant, G0-G3 regression, determinism/browser=Node, and the unchanged E1a test.
> If that candidate genuinely passes, adopt the justified fixes and rerun E1a exactly as frozen. If E1a passes, proceed directly to E1b under its existing preregistration. Do not begin general walking/G4 yet.
> Give yourself a long runway. Investigate and implement without stopping for me unless a decision would alter approved anatomy, loosen a substantive physical criterion, introduce nonphysical authority/world-space pinning, or choose between two genuinely defensible architectures. Commit locally at clean checkpoints, do not push, and preserve all failed experiments and preregistrations.

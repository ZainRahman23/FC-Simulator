# Stage 3 vs Astra Physical Duel V2 — the audit this milestone builds on (25 Oct 2026)

The owner approved the audit's architectural conclusion (instruction of 25 Oct ≈ 15:25 EET, this folder). Below is a summary of the audit's measured findings and recommendations. The full text is the session message of 25 Oct ≈ 15:00 EET. The harness that produced the numbers is in `astra_audit_harness/` (read-only, run from a scratchpad; Astra's own verify scripts were not run).

## Where Astra's work lives (outside Git)
- `~/Documents/Codex/2026-10-19/files-pasted-by-the-user-touchline/work/shoulder-duel-v1/` (21 Oct) and `physical-duel-v2/` (22 Oct; forward-position fix).
- Design notes: `work/research_notes/Shoulder duel physical design/`.
- Built on Astra's A99 support timeline (`agility99_c_support_v11`) and the RUN-1.3 body.

## Measured findings
- **Astra's leg capsules are about half our thickness.** Thigh r 6.1 cm, shin 4.8, foot 3.8; Stage 1's mesh-measured values are 11.5 / 7.0 / 7.0. Measured with Stage 1's volumes on Astra's own posed joints:
  - its "0 cm leg overlap" becomes thigh–thigh 9.6–10.7 cm in every oblique, crossing, head-on and stationary case;
  - 5.2 cm in the parallel sprint.
- **Astra's fall gate never fires.** 0 of its 39 presets, 0 of 168 swept configurations; the longest unsupported time is 42 ms (the gate needs 160 ms). There is no fall execution.
- **Astra deadlocks on leg contact.**
  - Head-on at 4 m/s, both players stop and stand locked ≈ 5.5 s, with feet held airborne for 668 / 885 ticks.
  - Rear crossing: locked together at 1.9 m/s for 5 s.
  - Rear contact: the faster runner is glued behind the slower one.
  - Cause: every leg contact is a rigid root constraint.
- **Astra's forward-lead failure and fix.**
  - Pre-fix, `solve()` added the shoulder/arm capsules' animated surface velocity and a penetration bias to the closing speed, on local (animated) normals. The result was 83.6 cm of unearned lead at equal speed.
  - The fix: root-only passive impulses; a body-face normal for near-parallel bodies; limb reactions capped by the approaching root momentum; per-source accounting; forward / energy / rotation invariant tests.
- **Stage 3 has the same failure class in its limb channel.**
  - All 39 matrix impacts were triggered by LIMB STRIKES, which carry 94 % of the matrix impulse (1439 of 1538 N·s); in the review set the share is 90 %.
  - 68 strikes: median 19.7 N·s, max 51.6.
  - A strike's speed is the animated limb's articulated speed, while the limb keeps its authored path.
  - `side` (equal-speed jog, shoulder to shoulder): a thigh/thigh strike at 1.79 m/s articulated speed, while the bodies close at only 0.20 m/s, gives 13.1 N·s. The impact's own root shifts are ATT +5.4 cm and DEF −8.7 cm along the heading, a 14.1 cm lead.
  - With penMin 0 (any touch): 29.8 N·s, recovery steps for both, 54 cm the other way. `overtake`: 20.5 N·s, 35 cm.
- **Stage 3's legs measured to Astra's radii:** in-croq 11.9 cm, head-on jog shin–shin 8.9, bf-fake 7.2, oblique-firm 3.4.
- **Stage 3's recovery steps ignore the opponent's legs:** head-on jog shin–shin 11.2 → 13.3 cm; croq-hip thigh–thigh 3.8 → 7.1 cm.

## Recommendation (approved): Option 4
- **Stage 3 stays the decision layer:** classification, LIP balance, action rules, ball independence.
- **Stage 3B adds a limb-contact layer between Stage 2 and Stage 3.**
  - Built in our architecture, on Stage 1's volumes, from Astra's limb principles: `constrainSwing`, `resolveSwingContact`, `blockedSwingTension`, `kneeAvoid`, opponent leg prediction, landings that avoid the opponent.
  - It **replaces** Stage 3's articulated-speed limb strikes.
  - Only the momentum a limb actually loses reaches the bodies, capped so animation never powers a root.
- **Not used:** Astra's A99 support timeline, its ground controller, its root-level rigid leg constraint, hovering plants, its Strength curve, its flight ground force.
- **Order:**
  - 3B.0 — accounting + invariants;
  - 3B.1 — the limb layer;
  - 3B.2 — recovery / gait landings that avoid the opponent and never cross;
  - 3B.3 — the trip pull + multi-step stagger;
  - 3B.4 — falls, ground contact, get-up.

  The sustained shoulder duel is a separate later stage.

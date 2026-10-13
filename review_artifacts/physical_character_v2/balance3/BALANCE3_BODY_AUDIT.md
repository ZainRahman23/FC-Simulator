# BALANCE-3 body and controller audit (before any design)

**Status.** Read-only audit plus open-loop identification. The scripts are in `balance3/scripts/`, the data in `balance3/evidence/`. No candidate exists yet.

**Instruction:** `sources/2026-10-13_user_instruction_balance3_coordinated_ankle_hip.md`.

## 1. The two-segment rigid reduction (`b3_sagittal_model.mjs`, `B3_SAGITTAL_MODEL.json`)

Built from the entry masses, COMs and inertia tensors.

| | Value |
|---|---|
| Legs | 27.2 kg, COM 0.545 m above the ankles |
| HAT | 44.3 kg, COM 0.332 m above the hips |
| Hip height | 0.825 m above the ankles |
| **Ankle mode** (in-phase) | shape (legs, HAT) = (0.59, 0.81); unstable rate 2.99 s⁻¹ |
| **Hip mode** (anti-phase) | (0.37, −0.93); unstable rate 7.59 s⁻¹ |

These are qualitatively Alexandrov's eigenmovements.

**Prediction of the rigid model:**
- hip-only torque accelerates the COM at −0.0227 m/s² per N·m, 1.21 × the ankle-only effect (+0.0187) and opposite in sign;
- a COM-neutral pattern would need τa = 1.21 τh.

## 2. The real body's open-loop response (`b3_pattern_check.mjs`, `B3_PATTERN_CHECK.json`)

**Method.** Deafferented replay: the frozen C3 twin's own commands, replayed exactly (identity check passed), plus a 200 ms, 10 N·m intent pulse through the canonical M1b path. No feedback can confound the response.

| Pulse | COM at 300 / 400 ms | Pelvis / thorax pitch at 400 ms |
|---|---|---|
| Ankle only (legs forward) | +3.07 / +5.19 mm | +0.0 / −1.3° (the trunk lags behind) |
| Hip only (HAT forward) | **−0.66 / −0.79 mm** | +0.8 / +1.0° |
| Rigid-model "COM-neutral" pattern (τa = 1.21 τh) | +3.07 / +5.52 mm | +0.8 / −0.5° |
| Rigid-model hip modal pattern | −1.53 / −2.24 mm | +0.8 / +1.4° |

**Finding: the rigid two-segment model is wrong for this body.**
- Hip torque moves the COM about 7 × less than predicted: the compliant knees and spine absorb the reaction.
- Ankle torque, by contrast, pitches the trunk backward (trunk lag).
- Any coordination rule must come from the body's identified response, not from a rigid reduction.

## 3. Intrinsic vs gravitational stiffness (`b3_stiffness_audit.mjs`, `B3_STIFFNESS_AUDIT.json`)

Gravitational stiffness is that of the supported mass, from a pivot-fixed rotation (statics).

M1b intrinsic stiffness has three arms:
- the short-range stiffness K, with arms weighted 0.15 (persistent), 0.30 (τ 0.5 s) and 0.55 (τ 0.02 s);
- plus passive B;
- beyond ≈ 0.5 s only the persistent arm and B remain.

| Group | Gravity (N·m/rad) | Intrinsic, 0.02–0.5 s | Intrinsic, > 0.5 s | C3 active (kP × gravity) | **Net at low frequency** |
|---|---|---|---|---|---|
| Body about the ankles | 647.9 | 0.48 × | 0.25 × | 1.33 × (COM objective) | **0.58 ×** |
| **HAT about the hips** | 145.9 | 2.50 × | **1.01 ×** | **≈ 0** (map defect) | **≈ 0.01 ×: neutral** |
| Trunk about the lumbar joint | 86.9 | 0.84 × | 0.36 × | 1.3 × | 0.66 × |
| Upper trunk about the thoracic joint | 21.8 | 2.18 × | 0.73 × | 1.3 × | 1.03 × |
| Head about the neck | 6.1 | 2.06 × | 0.86 × | 1.3 × | 1.16 × |

**Cross-check:** the ankle's 0.25 × matches the low-frequency intrinsic share C2 measured independently from the body's response (0.279).

**This is the P8 mechanism, quantified.**
- At low frequency the HAT lean about the hips has essentially zero net stiffness. Gravity is balanced almost exactly by M1b's persistent strain arm plus passive B, and the controller adds nothing because of the map defect.
- After a push the HAT settles where it was left and drifts back over seconds (τ ≈ 9 s).
- Removing the persistent arm makes the net negative, which is why the P8 diagnostic's body variant was worse (0.477).

## 4. Why the C4 repair failed (`b3_h1_mechanism.mjs`, `B3_H1_MECHANISM_DEV.json`; DEV back 6 N·s / 100 ms)

**Under H1** (the HAT objective at the hips with the corrected map):
- the hips and pelvis are held (≤ 0.3°);
- the **lumbar and thoracic spine flex instead**: lumbar +1.8°, thorax +4.2° at 3 s, then −1.1° / −1.6° at 5.5 s;
- the legs swing (shank −0.6° → +1.5°);
- hip and ankle torques run in anti-phase (−12.5 / +8.7 N·m at 3 s, +10.6 / −16.4 at 5.5 s): a **slow ≈ 5 s whole-body oscillation**.

**Cause: overlapping objectives.**
- The hips regulate the composite COM of pelvis + trunk + head + arms.
- The lumbar joint regulates the composite of trunk + head + arms; the thoracic joint the upper trunk; the ankles the whole-body COM.
- Each loop has its own delay and gain, and their objectives share mass.
- Once the hips are stiffened, the weakest link, the lumbar at 0.66 ×, absorbs the counter-rotation. The hip and spine loops then satisfy their composites by bending the spine against each other, and the ankle loop chases the resulting COM motion.

This is exactly the failure the owner's architectural requirement names.

**Earlier evidence for the same structure:** BALANCE-1 D10 had already seen a deterministic "ankle–hip anti-phase 1.6°" slow drift below 0.2 Hz. Segment-frame observation did not cure it, but at that time the hip map was ≈ 0, so the hips were unregulated either way.

## 5. What the design must satisfy (from this audit, before any literature reading)

1. **A hip-lean (HAT-in-space) objective must exist.** The body is neutral there; this is a missing control term, not a body defect.
2. **It must not fight the other objectives.**
   - **Spine:** the HAT objective, the lumbar / thoracic objectives and the COM objective must not regulate overlapping composites with independent loops.
   - **COM:** the hip pathway barely moves the COM on this body, so the hip ↔ COM coupling is weak. The ankle pathway disturbs the trunk orientation (trunk lag).
3. **Coordination must be derived from this body's identified response**, not from a rigid two-segment reduction.
4. **Delays:** the hip / trunk channels (75 ms) are faster than the COM-to-ankle channel (100 ms), and the trunk rate channel is 30 ms.

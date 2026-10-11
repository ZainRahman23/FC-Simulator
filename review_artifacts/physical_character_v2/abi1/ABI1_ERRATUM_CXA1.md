# ABI-1 erratum from the CXA-1 collision-exclusion audit (11 Oct 2026)

**Source:** `cxa1/CXA1_REPORT.md` (instruction `f1933adb`).

**Scope:** ABI-1's frozen results and files are left as committed. This note records what the audit invalidates and what it corrects.

## E1. The EXT diagnostic continuation is physically invalid after step 60

**What happened:**
- EXT rejected every cross-character pair other than runner leg ↔ tackler leg, from t = 0.
- ABI1_PREREGISTRATION §7.1 ended an EXT window at the first cross *contact* outside the authoritative set.
- Filtered pairs never create contacts, so that rule could not see them.

**Measured** (`cxa1/evidence/CXA1_ABI_{A,B,C}_EXT.json.gz`):
- From **step 61 (254 ms)** the tackler's head, then thorax, abdomen and arms geometrically interpenetrate the runner's pelvis and legs.
- Depth reaches up to **133 / 139 / 154 mm** (A / B / C), with side crossings and no contact, for ≈ 200 steps.
- Through step 60, EXT is geometrically valid: ≤ 3.5 mm, identical to the frozen contact set.

**Consequence.** Every ABI-1 EXT statement about steps ≥ 61 is withdrawn as physical evidence. That covers:
- the EXT visibility of the arm / trunk response (3.4 px);
- C's repeated EXT steps;
- the EXT end states;
- the EXT rows of S-TONE, S-DELAY, S-DX and S-IMPACT.

The runner in EXT was not pushed by the phantom torso, but the scenario it describes is impossible.

**Correct rule:** an EXT-type window ends at the first geometric overlap of a filtered pair.

## E2. What stands

**The physics:**
- **W1 (0–250 ms), primary A / B / C:** ≤ 3.5 mm, no filtering, no crossing.
- **S-IMPACT 0.75×:** the whole 1.08 s, frozen contact set, ≤ 3.0 mm, only authoritative pairs.
- **Validity rows V1–V8, the C0 standing results, and the delay / ablation results in W1.**

**But every visual judgement is confounded.** The tackler is rendered 54–87 mm from its physics skeleton, and the meshes extend 25–80 mm beyond the inscribed colliders. The A / B / C visual comparison must be re-viewed once the presentation is corrected.

## E3. "Boot under the planted foot" was wrong

The sustained 61.6 N·s contact is the tackler's left boot hulls pushing on the **back and top of the runner's right boot heel**.
- Contact normals point backward and upward from the runner's boot; the points sit ≈ 60 mm above the turf.
- It slides the runner's foot 659 mm along the turf, with ≤ 42 mm lift.

The phrase appears in the PVP-1A-DX post-hoc diagnostics, the PVP-1A morning report and ABI-1. Read it as "heel sweep from behind".

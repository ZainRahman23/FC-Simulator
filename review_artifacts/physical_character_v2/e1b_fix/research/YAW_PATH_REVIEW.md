# Stance-ankle yaw: evidence review (delegated; recorded unchanged in substance)

**What this is:** a review by a research subagent, 2026-10-05, for the E1b-17 fix.
- Sources were reached through DOI / PMC / code lookups after the web-search quota ran out, so coverage is not exhaustive.
- Tags: [FT] full text, [ABS] abstract only, [code] model or source file, [PR] the project's earlier reviews (`../../final_pre_e1a/literature/`), [D] the reviewer's own arithmetic, [I] inference.

## Bottom line

- **(a) The missing mechanism is an active, finite-torque yaw path.**
  - In humans it is the yaw component of subtalar supination / pronation torque, plus load-dependent restraint from the joint surfaces.
  - **No robot or long-stance character relies on a passive foot-yaw spring alone.**
- **(b) Capacity:** about **20–28 N·m toward foot adduction** and **about 18–23 N·m toward abduction**, with a sensitivity range of 15–35 N·m. It should **share** budget with the inversion actuator.
- **(c) Whole-body angular-momentum strategies complement the ankle path; they do not replace it.**
- **(d) Controller (derived, not measured):** K ≈ 15–40 N·m/rad, B ≈ 5–14 N·m·s/rad. Damping alone (B 3–6) on the existing spring gives a 3.4–5.6° peak and settles in about 1.1 s.
- **Measured anchor:** unloaded axial damping B = 2.25 N·m·s/rad (Ficanha 2015).

## 1. Subtalar axis geometry

Sheehan 2010 comparison table [FT] (elevation / medial deviation):
- Manter 42° / 16°;
- Root 41 ± 8° / 17 ± 2°;
- **Inman 42 ± 9° / 23 ± 11°**;
- Lundberg 34 ± 16° / 32 ± 16°;
- Leardini 43.5–60.8° / 32.8–46.5°;
- Arndt 31–36° / 16–24°;
- gait2392 37.2° / 8.7°.

**Direction cosines [D]** (inversion / adduction / plantarflexion):
- Inman 0.684 / **0.669** / 0.290;
- gait2392 0.787 / 0.605 / 0.121.

**So about 0.60–0.67 of a subtalar moment is a foot axial moment** (0.56–0.79 across study means). The axial : inversion ratio is about 0.98 for the Inman axis.

## 2. Capacity versus demand

**Moment arms about the subtalar axis** (Klein 1996 [ABS]): tibialis posterior −19.1 mm, peroneus longus 21.8 mm, peroneus brevis 20.5 mm, tibialis anterior −3.8 mm.

**Inversion / eversion capacity:**
- the spec (Maciel 2022): 39 / 35 N·m;
- bottom-up [D]: about 42 / 32 N·m;
- gait2392 path-based upper bound: 54–61 / 48–50 N·m.

**Axial capacity [D]** (× 0.60–0.67): 21–28 N·m adduction / 18–23 N·m abduction; upper bound about 35 / 30 N·m.
- **Nominal 25 / 21 N·m, or 0.32 / 0.27 N·m/kg at 78 kg.**
- There is no direct isometric measurement of foot ad/abduction torque about the shank.

**Demand:**
- ankle axial moment in a 45° sidestep: 0.08–0.12 N·m/kg;
- running: 0.09–0.16 N·m/kg, i.e. 6–12 N·m typical and about 20 N·m at the high end;
- walking free moment 3.4 ± 1.4 N·m;
- whole-chain ceiling (one foot resisting a trunk twist): median 53 N·m (Carrier 2017 [FT]).

## 3. Active axial stiffness and damping

- **Direct axial measurement** (seated, unloaded): K 4.7–5.8 N·m/rad, **B 2.25 N·m·s/rad** (Ficanha 2015 [FT]).
- **Inversion / eversion** at 30 % effort: 21–36 N·m/rad (Lee, Krebs & Hogan 2014 [FT]).
- **Whole limb, weight-bearing, active:** about 20–25 N·m/rad (Lee 2014 [PR]).
- **No loaded, active axial damping measurement exists.**

## 4. How robot controllers handle stance yaw

- **Robots:** Atlas, Valkyrie, Draco, the MIT Humanoid and Cassie all have **foot yaw rigid relative to the shank**; the hip yaw actuator reacts against ground friction. The yaw-torque bound of a rectangular foot is about ±83 N·m (Caron 2015 [FT]); BLF and TSID implement it.
- **IHMC:** the stance foot gets a zero-acceleration command; yaw switches to PD when the foot is lightly loaded; yaw momentum is weighted.
- **Upper-body compensation:** reduces yaw moment (Ugurlu 2012 [ABS]).
- **No robot has a passive foot yaw.**
  - Prosthetic rotation adapters (0.25–2.7 N·m/°) are passive yaw springs; the softer settings raised angular-momentum swings.
  - They work in gait because stance is short.

## 5. Physics-based characters

- **Geijtenbeek 2013:** passive axial ankle spring-dampers (walking).
- **Jiang 2019:** no subtalar joint.
- **DeepMimic:** spherical ankle, 90 N·m limit.
- **AMP / ASE:** ankle yaw ±40°, 90 N·m.
- **dm_control CMU humanoid:** foot axial hinge with a 20 N·m motor + 10 N·m/rad passive stiffness + 2 N·m·s/rad damping.
- **MuJoCo humanoid:** oblique ankle axis, 20 N·m.
- **OpenSim gait2392 / MyoLeg:** subtalar joint muscle-driven.

## Conclusions

- **(a) The missing mechanism is supported.**
- **(b) Capacity:** use nominal 25 / 21 N·m (0.32 / 0.27 N·m/kg) and test 15 and 35 N·m. **Share with inversion:** conservative budget |τ_inv|/T_inv + |τ_yaw|/T_yaw ≤ 1, or one oblique subtalar actuator.
- **(c) Whole-body strategies:** a complement for large impulses.
- **(d) Controller numbers:** as above.

## Gaps

- No direct foot axial strength measurement.
- No loaded, active axial impedance measurement.
- Some sources were reached as abstracts only.
- Subtalar axis variability is large.

## Sources

The full numbered list (39 sources with DOIs / URLs) is in the delegated report. Key sources:
- Sheehan 2010 (PMC2912255);
- Krähenbühl 2017 (PMC5549175);
- Klein 1996 (doi:10.1016/0021-9290(95)00025-9);
- McCullough 2011 (doi:10.3113/FAI.2011.0300);
- Ficanha 2015 (PMC4672054);
- Lee, Krebs & Hogan 2014 (PMC4699290);
- Lee 2014 MSSE (PMC4140528);
- Carrier & Cunningham 2017 (PMC5312108);
- Arefin 2024 (PMC10903810);
- Caron 2015 (arXiv:1501.04719);
- IHMC, BLF, TSID and PyPnC repositories;
- dm_control, MuJoCo, DeepMimic and ASE model files;
- Geijtenbeek 2013;
- Jiang 2019 (arXiv:1904.13041).

## Addendum: the reviewer's final report (2026-10-05, supersedes the earlier hand-back where they differ)

Same conclusions; these points are new or sharper:

- **Capacity:** about **25 N·m on the supination side** (foot adduction relative to the shank; the body rotating externally over the planted foot) and **about 20 N·m on the pronation side**; range 18–35 N·m (0.23–0.45 N·m/kg). Derivation T_yaw = sin(elevation) × T_subtalar. Consistent with the nominal 25 / 21 N·m above.
- **Shared budget with inversion (the reviewer's inference):** same-sign pairs (inversion with adduction, eversion with abduction — one muscle group produces both components): max of the two capacity fractions ≤ 1. Opposite-sign pairs (co-contraction): sum of the fractions ≤ 1. The sum rule is the conservative bound for both.
- **"Don't let the shared budget starve frontal balance":** part of the inversion cap stands in for passive joint-surface stability (Stormont 1985; Watanabe 2012: joint surfaces provide 30–60 % of rotational stability under load).
- **Stance yaw torque from the subtalar path comes with a roughly equal inversion moment** (balanced by a CoP shift of about 1 cm per 7.5 N·m). A pure-yaw actuator only approximates the coupled human path.
- **Chain check:** if the whole 0.5 N·m·s impulse entered that mode, ±6–8° at a 2 s period implies 11–15 N·m/rad and 1.1–1.5 kg·m², stiffer than the 7.4 N·m/rad passive spring alone, so other chain compliance / stiffness participates.
- **Only Geijtenbeek 2013 keeps axial ankle rotation passive** among the characters checked (values unpublished); dm_control's CMU humanoid uses a 20 N·m axial motor + 10 N·m/rad passive spring + 2 N·m·s/rad damping.
- Wannop 2010 (abstract only) reports 80–90 N·m of ankle external rotation in V-cuts with an unclear definition; unresolved.

# D-1F1 jump-step probes (scratch probes used for report §5, preserved unchanged)

Run from `sandbox/visual/physchar2/` (they import relative to the current directory):

```
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node ../../../review_artifacts/physical_character_v2/pi1/f1/probes/f1_jump_per_body.mjs drop1m   # every step with ΔE > 0.05 J: per-body ΔKE+PE, ΔU, turf contacts
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node ../../../review_artifacts/physical_character_v2/pi1/f1/probes/f1_jump_per_joint.mjs leanF 0.44 0.48   # per-joint ΔU, ankle / MTP angles, turf contacts in a window
```

# CHARCOLLIDE-1 profile: vinicius (generated; old → new runner gameplay geometry)

**Inputs:**
- `assets/characters/outfield/vinicius/rig.json`: SHA-256 `b8e67cff7849198b225725a5b52b67ff48ebefd9bc160955a57ad9c76da68a2e`; config `21fe34f6932aed17cc81f8d1c48e9248afb1e43f7b201b45a549baefffe2691b`.
- The D-1 runner's V2 colliders (`spec/v2_pi1_runner.js`). The record-length boot is the D-1F1 geometry; the articulation is not used.

**Profile:** SHA-256 `d23df74cdaf32b3d10cc1d4ba96ea3b7646f047f4b63f4453bd1e0aff128a4b3` (compact JSON). It is embedded in the simulation data file `sandbox/visual/pt_charcollide.js` on `prototype/slide-contact-v1.3-charcollide`.

| quantity | old (legacy ptRxBody) | new (CHARCOLLIDE-1) | source |
|---|---|---|---|
| leg length used for the leg segments | 865.0 mm (PT.LEG_REF) | thigh 434.9 mm + shin 398.7 mm = 833.6 mm | rig.json bones thigh_L / shin_L lengthM; legLenM |
| hip joint height | 934.2 mm (1.08 × leg) | 921.6 mm (pelvis offset + cycle bob) | rig.json hipHeightM; ofLocoCycle pelvis |
| hip half-width | 86.5 mm (0.10 × leg) | 152.5 mm | rig.json thigh_L offsetLocal |
| thigh / shin split | 441.1 mm / 423.9 mm | 434.9 mm / 398.7 mm | rig.json |
| ankle height at rest | 80.0 mm | 88.0 mm | rig.json ankleHeightM |
| swing pose | own lift law (0.10 – 0.34 m peak) + two-link knee | ofLocoCycle on the character's skeleton (the presentation's pure law), skelFK | of_loco.js / skeleton.js |
| foot capsule | ankle → toe point 0.20 m (V1.2 far slides 0.27 m) ahead, r 50.0 mm | heel-end → MTP-end centres, r 29.5 mm → 24.8 mm | record-length V2 boot hull: design radius min(½ width, ½ height) of the end-plane sections (heel-end centre plane, MTP plane, toe-box tip-end centre plane); TRACKB_PREREG A1 largest inscribed sphere on the centre line in each plane (capped at the design value) + common cone-band scale |
| toe capsule | — (part of the foot capsule) | MTP-end → tip-end centre, r 9.4 mm | record-length V2 boot hull: design radius min(½ width, ½ height) of the end-plane sections (heel-end centre plane, MTP plane, toe-box tip-end centre plane); TRACKB_PREREG A1 largest inscribed sphere on the centre line in each plane (capped at the design value) + common cone-band scale |
| shin capsule | r 60.0 mm | tapered 53.6 mm → 36.1 mm | V2 shank_L tapered collider rTop / rBot (volume-matched frustum (density 1090), calf 1 cm posterior) |
| thigh capsule | r 80.0 mm | tapered 84.5 mm → 59.8 mm | V2 thigh_L tapered collider rTop / rBot (girth-based (proximal 0.048 H, lateral axis offset)) |
| pelvis / torso capsules | r 150 / 170 mm on the legacy hip height | unchanged | CORRECTION_DESIGN §1 scope |
| planted rule | stride clock: up < stance | unchanged | CORRECTION_DESIGN §1 |

## Boot sections and inscription (TRACKB_PREREG §2.3 + amendment A1)

| capsule end | section plane (foot frame z) | section width × height | design radius (§2.3) | A1 inscribed sphere |
|---|---|---|---|---|
| heel end | -48.1 mm | 76.6 mm × 65.4 mm | 32.7 mm | centre height 29.0 mm above the studs; largest inscribed 29.5 mm; × band scale 1.0000 → 29.5 mm |
| MTP end | 180.5 mm | 109.2 mm × 52.7 mm | 26.4 mm | centre height 24.5 mm above the studs; largest inscribed 24.8 mm; × band scale 1.0000 → 24.8 mm |
| toe tip end | 259.1 mm | 47.8 mm × 32.2 mm | 16.1 mm | centre height 19.0 mm above the studs; largest inscribed 9.4 mm; × band scale 1.0000 → 9.4 mm |

Left and right are identical. All capsules lie on the foot's centre line (x = 0 in the foot frame). The final capsules pass the 2,000-sample check: foot true, toe true.

## Known residual, recorded and not adjusted

The thigh and shank capsules use the V2 radii on the joint axes (hip → knee, knee → ankle), as frozen. The V2 colliders sit off those axes: the thigh has a lateral axis offset of 9.7 mm, the shank a posterior calf offset of 9.7 mm. The gameplay limb capsules are therefore not strictly inscribed in the physical ones, by up to about that offset.

This also stands: the F0 promoted body's anatomical boot is shorter than this record-length foot / toe geometry. The consequences are gated by CG-1 / CG-4 / CG-5 and PCG-F0 P-9 (TRACKB_PREREG §1).

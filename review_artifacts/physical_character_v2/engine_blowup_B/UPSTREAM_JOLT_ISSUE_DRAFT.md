# DRAFT — not sent. For the user's review: a possible upstream report to JoltPhysics.

**Title:** EPA can return an unconverged, opposite-facing triangle (reversed penetration axis) for a convex hull nearly flush with a large box; ContactConstraintManager then teleports the body.

**Version:** Jolt v5.6.0. Reproduced in JoltPhysics.js 1.1.0 (WASM, scalar) and in a native build with `CROSS_PLATFORM_DETERMINISTIC=ON`, bit-for-bit.

## Summary

Collide an irregular convex hull with a static box turf: `ConvexHullShape`, ~5 cm, 15–28 points, convex radius 5 mm, with a face nearly parallel to the box top (1–10 mm away or slightly penetrating), against e.g. a 100 × 2 × 100 m box. `CollideShape` occasionally returns a **reversed** penetration axis, as if the box had to move *up* to separate. The reported depth magnitude is still correct.

`GetSupportingFace` then returns the box's **bottom** face, so the manifold's contact points lie 2 m below the top face.

During `SolvePositionConstraints` each point's separation is clamped to `-mMaxPenetrationDistance` (0.2 m) and corrected with Baumgarte. The body is moved 2.5–16 cm and rotated up to ~170° in one step, with no velocity change.

## Rate

- **Irregular hulls, face-flush poses:** ~1 reversal per 10⁶ random poses.
- **Plain cuboids:** none in 8 × 10⁷ poses.
- **Box sizes:** occurs with boxes from 8 m to 400 m wide. It is more frequent for some hulls on 20 m boxes.

## Path (traced)

1. `GetPenetrationDepthStepGJK` returns `Indeterminate` although the cores are 1–20 mm apart. The cause is either:
   - the relative termination `v_len_sq <= FLT_EPSILON * GetMaxYLengthSq()` (large box; for a 100 m box max|y| ≈ 71 m), or
   - "origin inside tetrahedron" (smaller boxes).
2. `GetPenetrationDepthStepEPA` starts from a slab-shaped polytope (box-top corners ± hull support).
3. EPA processes the correct face (normal ≈ −Y) but `dist_sq − mClosestLenSq < mClosestLenSq · tolerance` is not met, because of float noise.
4. It then pops a triangle with the **opposite** normal whose `mClosestLenSq` is numerically equal: e.g. 3.91358e-4 vs `closest_dist_sq` 3.91375e-4.
   - `last` is replaced and the converged triangle is freed.
   - The new support point is the box's bottom, 2 m away, so `AddPoint(t, …, closest_dist_sq, …)` queues nothing.
5. The loop ends because `HasNextTriangle()` is false. `last`, which is unconverged and opposite-facing, is used for `outV`. `flip_v_sign` is not involved.
6. A related variant ends on "next triangle further than `closest_dist_sq`" with a sliver triangle and a **tilted** axis (normal toward a far box corner).

## Diagnostic patch that removes every observed reversal

Track the triangle with the smallest `dist_sq` (support distance along its normal: an upper bound of the penetration along that normal). Do not free it when `last` is replaced, and return it instead of `last` if they differ, clearing `flip_v_sign` when substituting.

On our test sets this reduced reversals from 1,634 / 41,616 near-event queries (and up to 546 per 5 × 10⁶ flush poses on other box sizes) to **0**, with no new ones in 3 × 10⁵ random / flush poses and 1.75 × 10⁸ flush poses across 7 hulls × 5 boxes.

## Attachments (from `engine_blowup_B/`)

- `fixtures/*.bits`: hull points + transform as float32 bit patterns;
- `tools/b_native/b_query.cpp`: a single-file harness against Jolt v5.6.0;
- `native/trace_*.txt`: traces;
- `native/jolt_v5.6.0_trace_and_P1_P2_instrumentation.diff`: the instrumentation and patches.

The workaround on our side would be a `PlaneShape` ground; convex-vs-plane collision is analytic.

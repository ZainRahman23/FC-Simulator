#!/usr/bin/env python3
"""V2-G1 boot contact-generation study: Jolt's supporting-face rule on the boot's convex pieces.

Mechanism (Jolt 5.6.0 source, verified):
  * ConvexHullShape::GetSupportingFace picks the hull face whose normal is most anti-parallel to the contact
    direction and returns that face's vertices (ConvexHullShape.cpp, GetSupportingFace).
  * ManifoldBetweenTwoFaces clips that face against the other shape's face and keeps every clipped point whose
    distance is < speculative distance + manifold tolerance (0.02 + 0.001 m). Only if NO point survives does it
    fall back to the deepest (GJK/EPA) contact point (ManifoldBetweenTwoFaces.cpp, the final `if`).
  * The contact solver acts on the manifold points, not on the EPA depth.
So when the chosen face does not contain the piece's deepest vertex but lies within 21 mm of the contact plane, the
deepest point is dropped. The boot then sinks until that face reaches the surface. The sink equals
(lowest vertex of the chosen face) - (lowest vertex of the piece), the "face offset".

For a composite boot (several convex pieces, one manifold each) the boot engages when the first piece's chosen face
reaches the turf, so the composite offset is  min_p(face_low_p) - min_p(vertex_low_p).

This script models that rule exactly: the convex hull of each piece, coplanar triangles merged within Jolt's hull
tolerance of 1 mm, and the face choice by normal. It then measures the offset over uniformly random boot orientations
against a horizontal turf plane. It is validated against Jolt: at the orientation of the singleLeg rest defect the
model gives 11.0 / 12.3 mm for the two C3 pieces, and Jolt gives 11.0 / 12.3 mm (scratch test side2.mjs, lone boot).

usage: python3 boot_face_model.py [spec.json] [out.json]
       defaults: ../g0/json/v2_ref_spec.json → ../g1/json/boot_face_model.json
"""
import json, sys, os
import numpy as np
from scipy.spatial import ConvexHull
from scipy.spatial.transform import Rotation as Rot

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "../g0/json/v2_ref_spec.json")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "../g1/json/boot_face_model.json")
TOL = 1e-3                     # Jolt ConvexHullShapeSettings::mHullTolerance default
Q_STAR = [-0.100, 0.187, -0.458, 0.863]   # foot_R world rotation at the singleLeg rest defect (t = 1.35 s)

def faces_of(P, tol=TOL):
    h = ConvexHull(P); tris = h.simplices; eq = h.equations; n = len(tris); used = [False] * n; faces = []; adj = {}
    for i, t in enumerate(tris):
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): adj.setdefault(frozenset((a, b)), []).append(i)
    for i in range(n):
        if used[i]: continue
        grp = [i]; used[i] = True; nrm = eq[i, :3]; d = eq[i, 3]; stack = [i]
        while stack:
            j = stack.pop(); t = tris[j]
            for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                for k in adj[frozenset((a, b))]:
                    if not used[k] and all(abs(P[v] @ nrm + d) <= tol for v in tris[k]):
                        used[k] = True; grp.append(k); stack.append(k)
        verts = sorted(set(int(v) for k in grp for v in tris[k])); nn = sum(eq[k, :3] for k in grp); nn /= np.linalg.norm(nn)
        faces.append((nn, verts))
    return P, faces

def cut(P, axis, c):
    a = P[P[:, axis] <= c + 1e-12]; b = P[P[:, axis] >= c - 1e-12]; X = []
    for i in range(len(P)):
        for j in range(i + 1, len(P)):
            if (P[i, axis] - c) * (P[j, axis] - c) < 0:
                t = (c - P[i, axis]) / (P[j, axis] - P[i, axis]); X.append(P[i] + t * (P[j] - P[i]))
    X = np.array(X) if X else np.zeros((0, 3))
    red = lambda Q: Q[ConvexHull(Q).vertices]
    return red(np.vstack([a, X])), red(np.vstack([b, X]))

def split(V0, ap=(), ml=()):
    pieces = [V0]
    for axis, fracs in ((2, ap), (0, ml)):
        lo, hi = V0[:, axis].min(), V0[:, axis].max()
        for fr in fracs:
            c = lo + fr * (hi - lo); new = []
            for Q in pieces:
                if Q[:, axis].min() < c < Q[:, axis].max(): new += list(cut(Q, axis, c))
                else: new.append(Q)
            pieces = new
    return pieces

def offsets(pieces, qs):
    PF = [faces_of(Q) for Q in pieces]; out = []
    for q in qs:
        R = Rot.from_quat(q).as_matrix(); fmin = 1e9; hmin = 1e9
        for P, faces in PF:
            W = P @ R.T; hmin = min(hmin, W[:, 1].min())
            best = min(faces, key=lambda f: (R @ f[0])[1])      # face normal most anti-parallel to +Y (the turf normal)
            fmin = min(fmin, W[best[1], 1].min())
        out.append(fmin - hmin)
    return np.array(out) * 1000.0, [len(P) for P, _ in PF], [len(f) for _, f in PF]

def main():
    spec = json.load(open(SPEC)); foot = next(b for b in spec["bodies"] if b["name"] == "foot_R")
    allP = np.vstack([np.array(s["points"]) for s in foot["shapes"] if s["type"] == "hull"]); V0 = allP[ConvexHull(allP).vertices]
    reps = [
        ("R1: approved single hull", [V0]),
        ("R2: 2 pieces, AP 0.55 (C3, adopted)", split(V0, (0.55,))),
        ("R3: 4 pieces, AP 0.55 x ML 0.5 (C3)", split(V0, (0.55,), (0.5,))),
        ("3 pieces, AP 0.35/0.70", split(V0, (0.35, 0.7))),
        ("4 pieces, AP 0.25/0.5/0.75", split(V0, (0.25, 0.5, 0.75))),
        ("6 pieces, AP sixths", split(V0, tuple(k / 6 for k in range(1, 6)))),
        ("6 pieces, AP 3 x ML 2", split(V0, (1 / 3, 2 / 3), (0.5,))),
        ("8 pieces, AP 4 x ML 2", split(V0, (0.25, 0.5, 0.75), (0.5,))),
        ("8 pieces, AP 4 x ML 2 (ML at 0.45)", split(V0, (0.25, 0.5, 0.75), (0.45,))),
        ("10 pieces, AP 5 x ML 2 (candidate)", split(V0, (0.2, 0.4, 0.6, 0.8), (0.5,))),
        ("12 pieces, AP 4 x ML 3", split(V0, (0.25, 0.5, 0.75), (1 / 3, 2 / 3))),
    ]
    NR = 12000; qs = [np.array(Q_STAR)] + [Rot.random(random_state=700000 + k).as_quat() for k in range(NR)]
    rows = []
    for name, pieces in reps:
        o, nv, nf = offsets(pieces, qs); r = o[1:]
        rows.append({"rep": name, "pieces": len(pieces), "verticesPerPiece": nv, "facesPerPiece": nf, "offsetAtQstarMm": round(float(o[0]), 2),
                     "pOver2mm": round(float(np.mean(r > 2)) * 100, 2), "pOver5mm": round(float(np.mean(r > 5)) * 100, 2), "pOver10mm": round(float(np.mean(r > 10)) * 100, 3),
                     "p99Mm": round(float(np.percentile(r, 99)), 2), "maxMm": round(float(r.max()), 2)})
        x = rows[-1]; print(f"{name:40s} q* {x['offsetAtQstarMm']:5.1f} | >2mm {x['pOver2mm']:5.2f}% >5mm {x['pOver5mm']:5.2f}% >10mm {x['pOver10mm']:6.3f}% p99 {x['p99Mm']:5.1f} max {x['maxMm']:5.1f} mm")
    json.dump({"generated": "calc/boot_face_model.py", "spec": os.path.relpath(SPEC, HERE), "orientations": NR, "hullToleranceM": TOL, "qStar": Q_STAR,
               "mechanism": __doc__.strip().split("\n\n")[1], "rows": rows}, open(OUT, "w"), indent=1)
    print("wrote", os.path.relpath(OUT, HERE))

if __name__ == "__main__":
    main()

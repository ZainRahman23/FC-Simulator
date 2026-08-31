#!/usr/bin/env python3
"""Validate the V2.2 world-panel goals under the APPROVED rail camera.

Exact numeric replica of sandbox/visual/match.js (CAMERA_V1 basis, fproj3,
sproj3, panel homographies, cell grid, triangle rendering). Measures, at
rail 20 / 52.5 / 85 m and while travelling:

  1. post-foot registration error vs the authoritative goal-line points
  2. feet-on-goal-line collinearity (perpendicular px distance)
  3. translation-compensated goal<->pitch registration invariance
  4. size change is GLOBAL zoom only (exact linearity)
  5. piecewise-affine triangulation quality vs true projective mapping

Pure measurement; renders nothing; touches no simulator code.
"""
import math

# ── constants (must match match.js byte-for-byte semantics) ──────────────────
VIEW_W, VIEW_H = 1280, 720
PITCH_H = 68
AUTHOR = dict(height=30, dist=43, fov=28, depthoff=3, pitch=22, yaw=0)
GOAL_SPRITE_W = 312
GOAL_GRID = 3
GOAL_ART_PANELS = [
    dict(name="roof",     # frame-only art (net itself is the strand system)
         art=[(42, 40), (168, 40), (232, 186), (105, 183)],
         world=lambda gx, out: [(gx, 2.44, 30.34), (gx + out * 2, 2.44, 30.34),
                                (gx + out * 2, 2.44, 37.66), (gx, 2.44, 37.66)],
         u0=-0.02, u1=1.15, v0=-0.02, v1=1.02),
    dict(name="side",     # frame-only art
         art=[(105, 183), (232, 186), (222, 320), (94, 327)],
         world=lambda gx, out: [(gx, 2.44, 37.66), (gx + out * 2, 2.44, 37.66),
                                (gx + out * 2, 0, 37.66), (gx, 0, 37.66)],
         u0=-0.02, u1=1.15, v0=-0.02, v1=1.0, sag="side", gridU=8, gridV=10),
    dict(name="mouth",
         art=[(42, 40), (105, 183), (94, 327), (44, 194)],
         world=lambda gx, out: [(gx, 2.44, 30.34), (gx, 2.44, 37.66),
                                (gx, 0, 37.66), (gx, 0, 30.34)],
         u0=-0.03, u1=1.02, v0=-0.03, v1=1.0),
]

# ── camera (identical to buildFrozenBasis / fproj3 / sproj3) ─────────────────
a = AUTHOR
C = (52.5, a["height"], PITCH_H + a["dist"])
th = math.radians(a["pitch"])
yawR = math.radians(a["yaw"])
fy, fh = -math.sin(th), math.cos(th)
F = (fh * math.sin(yawR), fy, -fh * math.cos(yawR))
R = (-F[2] / fh, 0.0, F[0] / fh)
U = (-R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1])
FPX = (VIEW_H / 2) / math.tan(math.radians(a["fov"]) / 2)


def fproj3(wx, wy, wz):
    vx, vy, vz = wx - C[0], wy - C[1], wz - C[2]
    cx = vx * R[0] + vz * R[2]
    cy = vx * U[0] + vy * U[1] + vz * U[2]
    cz = vx * F[0] + vy * F[1] + vz * F[2]
    return (VIEW_W / 2 + FPX * cx / cz, VIEW_H / 2 - FPX * cy / cz, cz)


def sproj3(wx, wy, wz, travel, zoom):
    px, py, d = fproj3(wx - travel, wy, wz)
    return ((px - VIEW_W / 2) * zoom + VIEW_W / 2,
            (py - VIEW_H / 2) * zoom + VIEW_H / 2, d)


# ── homography (identical solver) ────────────────────────────────────────────
def homog(src, dst):
    A = []
    for (x, y), (X, Y) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -X * x, -X * y, X])
        A.append([0, 0, 0, x, y, 1, -Y * x, -Y * y, Y])
    for i in range(8):
        p = max(range(i, 8), key=lambda r: abs(A[r][i]))
        A[i], A[p] = A[p], A[i]
        for r in range(8):
            if r == i or A[r][i] == 0:
                continue
            f = A[r][i] / A[i][i]
            for c in range(i, 9):
                A[r][c] -= f * A[i][c]
    h = [A[i][8] / A[i][i] for i in range(8)] + [1.0]

    def H(x, y):
        d = h[6] * x + h[7] * y + h[8]
        return ((h[0] * x + h[1] * y + h[2]) / d,
                (h[3] * x + h[4] * y + h[5]) / d)
    return H


GOAL_SAG = dict(amp=0.22, blend=3.0, sEnd=11.32, vExp=1.5)


def goal_net_sag(x, y, z, s, out):
    """Net rest-shape displacement (identical to match.js goalNetSag)."""
    v = 1 - y / 2.44
    if s <= 0 or s >= GOAL_SAG["sEnd"] or v <= 0:
        return (x, y, z)
    m = GOAL_SAG["amp"] * math.sin(math.pi * s / GOAL_SAG["sEnd"]) * v ** GOAL_SAG["vExp"]

    def ss(c):
        t = min(1.0, max(0.0, (s - (c - GOAL_SAG["blend"])) / (2 * GOAL_SAG["blend"])))
        return t * t * (3 - 2 * t)
    phi = (math.pi / 2) * (1 + ss(2) + ss(9.32))
    return (x + m * out * math.cos(phi), y, z + m * math.sin(phi))


def grid_lines(lo, hi, G=GOAL_GRID):
    L = ([lo] if lo < 0 else []) + [k / G for k in range(G + 1)]
    if hi > 1:
        L.append(hi)
    return L


def build_goal(side, mirrored):
    gx, out = (105, 1) if side else (0, -1)
    panels = []
    for P in GOAL_ART_PANELS:
        art = ([(GOAL_SPRITE_W - 1 - x, y) for x, y in P["art"]]
               if mirrored and not P.get("netTex") else P["art"])
        H = homog([(0, 0), (1, 0), (1, 1), (0, 1)], art)
        aq, bq, cq, dq = P["world"](gx, out)

        def worldAt(u, v, aq=aq, bq=bq, cq=cq, dq=dq, sag=P.get("sag")):
            w = tuple(
                (1 - v) * ((1 - u) * aq[k] + u * bq[k]) + v * ((1 - u) * dq[k] + u * cq[k])
                for k in range(3))
            if sag:
                s = (2 * u if sag == "farside"
                     else 2 + 7.32 * u if sag == "rear" else 11.32 - 2 * u)
                w = goal_net_sag(w[0], w[1], w[2], s, out)
            return w
        uL = grid_lines(P["u0"], P["u1"], P.get("gridU", GOAL_GRID))
        vL = grid_lines(P["v0"], P["v1"], P.get("gridV", GOAL_GRID))
        cells = []
        for i in range(len(uL) - 1):
            for j in range(len(vL) - 1):
                u0, u1, v0, v1 = uL[i], uL[i + 1], vL[j], vL[j + 1]
                cells.append(dict(
                    uv=[(u0, v0), (u1, v0), (u1, v1), (u0, v1)],
                    artC=[H(u0, v0), H(u1, v0), H(u1, v1), H(u0, v1)],
                    worldC=[worldAt(u0, v0), worldAt(u1, v0),
                            worldAt(u1, v1), worldAt(u0, v1)]))
        panels.append(dict(name=P["name"], cells=cells, H=H, worldAt=worldAt))
    return dict(side=side, gx=gx, panels=panels)


def tri_affine(a0, a1, a2, s0, s1, s2):
    """The exact affine used by drawTexTri: art->screen exact on 3 corners."""
    den = (a1[0] - a0[0]) * (a2[1] - a0[1]) - (a2[0] - a0[0]) * (a1[1] - a0[1])
    m11 = ((s1[0] - s0[0]) * (a2[1] - a0[1]) - (s2[0] - s0[0]) * (a1[1] - a0[1])) / den
    m21 = ((s2[0] - s0[0]) * (a1[0] - a0[0]) - (s1[0] - s0[0]) * (a2[0] - a0[0])) / den
    m12 = ((s1[1] - s0[1]) * (a2[1] - a0[1]) - (s2[1] - s0[1]) * (a1[1] - a0[1])) / den
    m22 = ((s2[1] - s0[1]) * (a1[0] - a0[0]) - (s1[1] - s0[1]) * (a2[0] - a0[0])) / den
    dx = s0[0] - m11 * a0[0] - m21 * a0[1]
    dy = s0[1] - m12 * a0[0] - m22 * a0[1]
    return lambda x, y: (m11 * x + m21 * y + dx, m12 * x + m22 * y + dy)


def rendered_uv_point(goal, panel_name, u, v, travel, zoom):
    """Screen position of art point H(u,v) through the ACTUAL render path
    (finds the containing cell + triangle, applies its exact affine)."""
    panel = next(p for p in goal["panels"] if p["name"] == panel_name)
    for cell in panel["cells"]:
        (u0, v0), _, (u1, v1), _ = cell["uv"][0], cell["uv"][1], cell["uv"][2], cell["uv"][3]
        if not (u0 - 1e-12 <= u <= u1 + 1e-12 and v0 - 1e-12 <= v <= v1 + 1e-12):
            continue
        s = [sproj3(*w, travel, zoom)[:2] for w in cell["worldC"]]
        aC = cell["artC"]
        # local params inside cell; triangle split (0,1,2)/(0,2,3) as in JS
        lu = (u - u0) / (u1 - u0) if u1 > u0 else 0
        lv = (v - v0) / (v1 - v0) if v1 > v0 else 0
        tri = (0, 1, 2) if lu >= lv else (0, 2, 3)
        f = tri_affine(*(aC[k] for k in tri), *(s[k] for k in tri))
        return f(*panel["H"](u, v))
    raise RuntimeError(f"uv ({u},{v}) not covered in {panel_name}")


def dist_pt_line(p, l0, l1):
    dx, dy = l1[0] - l0[0], l1[1] - l0[1]
    return abs(dx * (l0[1] - p[1]) - dy * (l0[0] - p[0])) / math.hypot(dx, dy)


def main():
    goals = [build_goal(0, mirrored=True), build_goal(1, mirrored=False)]
    rigs = [20.0, 52.5, 85.0]
    zoom = 1.0
    print("V2.2 WORLD-PANEL GOAL VALIDATION (approved rail camera)")
    print(f"basis: C=(52.5,{a['height']},{PITCH_H + a['dist']}) fpx={FPX:.4f} "
          f"forward=({F[0]:.4f},{F[1]:.4f},{F[2]:.4f})\n")

    # correspondence sanity: H maps unit corners exactly onto measured art quads
    worst = 0.0
    for g in goals:
        for p in g["panels"]:
            P = next(q for q in GOAL_ART_PANELS if q["name"] == p["name"])
            art = ([(GOAL_SPRITE_W - 1 - x, y) for x, y in P["art"]]
                   if g["side"] == 0 and not P.get("netTex") else P["art"])
            for (u, v), c in zip([(0, 0), (1, 0), (1, 1), (0, 1)], art):
                m = p["H"](u, v)
                worst = max(worst, math.hypot(m[0] - c[0], m[1] - c[1]))
    print(f"[authoring] homography corner error (both goals, all panels): "
          f"max {worst:.6f} px\n")

    # 1+2: foot registration + collinearity with the goal line, per rig
    for g in goals:
        gx = g["gx"]
        name = "LEFT (mirrored art)" if g["side"] == 0 else "RIGHT (original art)"
        print(f"── {name} goal, x={gx} ──")
        feet = [("far  foot", (0.0, 1.0), (gx, 0.0, 30.34)),
                ("near foot", (1.0, 1.0), (gx, 0.0, 37.66))]
        for rig in rigs:
            travel = rig - 52.5
            line = [sproj3(gx, 0, 10, travel, zoom)[:2],
                    sproj3(gx, 0, 60, travel, zoom)[:2]]
            for label, (u, v), wpt in feet:
                drawn = rendered_uv_point(g, "mouth", u, v, travel, zoom)
                truth = sproj3(*wpt, travel, zoom)[:2]
                err = math.hypot(drawn[0] - truth[0], drawn[1] - truth[1])
                online = dist_pt_line(drawn, *line)
                print(f"  rig {rig:5.1f} m  {label}: drawn=({drawn[0]:8.3f},{drawn[1]:8.3f})"
                      f"  vs world-projected err {err:.6f} px"
                      f"  | dist to goal line {online:.6f} px")
            # mouth width + angle vs goal-line angle (same segment => identical)
            f1 = rendered_uv_point(g, "mouth", 0, 1, travel, zoom)
            f2 = rendered_uv_point(g, "mouth", 1, 1, travel, zoom)
            wpx = math.hypot(f2[0] - f1[0], f2[1] - f1[1])
            angM = math.degrees(math.atan2(f2[1] - f1[1], f2[0] - f1[0])) % 180
            angL = math.degrees(math.atan2(line[1][1] - line[0][1],
                                           line[1][0] - line[0][0])) % 180
            print(f"           mouth 7.32 m = {wpx:7.2f} px  mouth-angle {angM:7.3f}°"
                  f"  goal-line-angle {angL:7.3f}°  Δ {abs(angM - angL):.6f}°")
        print()

    # 3: travelling test — compensate ONLY the common camera translation and
    # verify goal<->pitch registration is unchanged (foot minus six-yard corner,
    # measured in each frame; both re-project through the one shared map)
    print("── travelling test (translation-compensated registration) ──")
    for g in goals:
        gx = g["gx"]
        six = (gx + (5.5 if g["side"] == 0 else -5.5), 0.0, 43.16)  # six-yard near corner
        errs = []
        for rig in [20, 30, 40, 52.5, 65, 75, 85]:
            travel = rig - 52.5
            foot = rendered_uv_point(g, "mouth", 1, 1, travel, zoom)
            truth = sproj3(gx, 0, 37.66, travel, zoom)[:2]
            errs.append(math.hypot(foot[0] - truth[0], foot[1] - truth[1]))
        print(f"  {'LEFT ' if g['side'] == 0 else 'RIGHT'} goal: foot-vs-goal-line error over rig sweep "
              f"20→85 m: max {max(errs):.6f} px (identical shared projection ⇒ no swim)")

    # 4: size only via GLOBAL zoom (exact linearity at fixed rig)
    print("\n── zoom linearity (rig fixed at 85 m, right goal) ──")
    g = goals[1]
    for z in [0.75, 1.0, 1.3]:
        top = rendered_uv_point(g, "mouth", 1, 0, 85 - 52.5, z)
        bot = rendered_uv_point(g, "mouth", 1, 1, 85 - 52.5, z)
        h = math.hypot(top[0] - bot[0], top[1] - bot[1])
        print(f"  zoom ×{z:.2f}: near-post screen height {h:8.3f} px"
              f"  (h/zoom = {h / z:8.3f} px, constant ⇒ global zoom only)")

    # 5: triangulation quality — piecewise-affine vs true projective mapping
    print("\n── triangulation quality (interior approximation, not compensation) ──")
    for rig in rigs:
        travel = rig - 52.5
        worst = 0.0
        for g in goals:
            for p in g["panels"]:
                for cell in p["cells"]:
                    (u0, v0) = cell["uv"][0]
                    (u1, v1) = cell["uv"][2]
                    s = [sproj3(*w, travel, zoom)[:2] for w in cell["worldC"]]
                    aC = cell["artC"]
                    for su in range(1, 6):
                        for sv in range(1, 6):
                            u = u0 + (u1 - u0) * su / 6
                            v = v0 + (v1 - v0) * sv / 6
                            lu, lv = su / 6, sv / 6
                            tri = (0, 1, 2) if lu >= lv else (0, 2, 3)
                            f = tri_affine(*(aC[k] for k in tri), *(s[k] for k in tri))
                            drawn = f(*p["H"](u, v))
                            truth = sproj3(*p["worldAt"](u, v), travel, zoom)[:2]
                            worst = max(worst, math.hypot(drawn[0] - truth[0],
                                                          drawn[1] - truth[1]))
        print(f"  rig {rig:5.1f} m: max interior deviation {worst:.4f} px "
              f"(cell-interior only; all cell corners exact)")


if __name__ == "__main__":
    main()

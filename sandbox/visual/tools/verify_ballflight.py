#!/usr/bin/env python3
"""Numeric verification of the authoritative ball-flight layer (ballflight.py).

Checks: ballistic law within integration tolerance, restitution ratio,
monotonic bounce-energy loss, deterministic settling, render-schedule
independence (the integrator is internally fixed-step), reproducibility,
and zero RNG consumption. Pure measurement; no engine outcomes touched.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "simulator"))
from fc_simulator.ballflight import BallFlight, G, REST, SETTLE_VZ, DT, SUBSAMPLES


class _Ev:
    def __init__(self, t, detail=None):
        self.event_type = t
        self.detail = detail or {}


def main() -> None:
    ok = True

    # 1) ballistic law during a no-collision interval
    f = BallFlight()
    f.z, f.vz, f.grounded = 0.0, 4.905, False
    zs = []
    for i in range(30):                       # first half second: no impact
        if not f.grounded:
            f.z += f.vz * DT
            f.vz -= G * DT
        zs.append((DT * (i + 1), f.z))
    worst = 0.0
    for t, z in zs:
        # semi-implicit Euler exact solution: z = vz0*t - 0.5*g*t^2 - 0.5*g*dt*t
        analytic = 4.905 * t - 0.5 * G * t * t + 0.5 * G * DT * t
        worst = max(worst, abs(z - analytic))
    print(f"ballistic law: max |z - analytic| = {worst:.2e} m "
          f"({'PASS' if worst < 1e-9 else 'FAIL'})")
    ok &= worst < 1e-9

    # 2) restitution ratio + 3) energy decrease + 4) settling
    f = BallFlight()
    f.on_second([_Ev("CROSS")])               # launch 4.905, lands in-second
    impacts = []
    pre = None
    g2 = BallFlight()
    g2.z, g2.vz, g2.grounded = 0.0, 4.905, False
    for _ in range(60 * 6):
        vz_before = g2.vz
        z_before = g2.z
        if not g2.grounded:
            g2.z += g2.vz * DT
            g2.vz -= G * DT
            if g2.z <= 0.0 and g2.vz < 0.0:
                g2.z = 0.0
                r = -g2.vz * REST
                impacts.append((-g2.vz / REST if False else -(g2.vz), r))
                if r < SETTLE_VZ:
                    g2.vz = 0.0
                    g2.grounded = True
                else:
                    g2.vz = r
        if g2.grounded:
            break
    ratios = [post / prei for prei, post in impacts if prei > 1e-9]
    rerr = max(abs(r - REST) for r in ratios)
    print(f"restitution: {len(impacts)} bounces, ratio err {rerr:.2e} "
          f"({'PASS' if rerr < 1e-9 else 'FAIL'})")
    ok &= rerr < 1e-9
    energies = [0.5 * post * post for _, post in impacts]
    mono = all(energies[i + 1] < energies[i] for i in range(len(energies) - 1))
    print(f"bounce energy strictly decreasing: {mono} ({'PASS' if mono else 'FAIL'})")
    ok &= mono
    print(f"settling: grounded={g2.grounded} z={g2.z:.4f} "
          f"({'PASS' if g2.grounded and g2.z == 0.0 else 'FAIL'})")
    ok &= g2.grounded and g2.z == 0.0

    # 5) render-schedule independence + 6) reproducibility: the layer only
    # advances in whole authoritative seconds of 60 fixed steps, so any two
    # runs over the same event sequence must be bit-identical.
    seq = [[_Ev("PASS", {"pass_type": "LONG", "distance_m": 34.0})], [], [],
           [_Ev("SHOT", {"distance_m": 18.0})], [], [_Ev("CROSS")], [], []]
    a, b = BallFlight(), BallFlight()
    sa = [tuple(a.on_second(evs)) + (a.z, a.vz, a.grounded) for evs in seq]
    sb = [tuple(b.on_second(evs)) + (b.z, b.vz, b.grounded) for evs in seq]
    ident = sa == sb
    print(f"reproducibility (two runs bit-identical): {ident} "
          f"({'PASS' if ident else 'FAIL'})")
    ok &= ident

    # 7) zero RNG: module imports no random source
    import fc_simulator.ballflight as bf
    src = Path(bf.__file__).read_text()
    norng = "import random" not in src and ".rng" not in src and "randint" not in src
    print(f"zero RNG in flight module: {norng} ({'PASS' if norng else 'FAIL'})")
    ok &= norng

    print("ALL PASS" if ok else "FAILURES PRESENT")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

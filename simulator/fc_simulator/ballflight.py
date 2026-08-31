"""Authoritative ball flight (vertical axis) for match presentation.

The calibrated brain owns ball x/y and every football outcome; it resolves
aerial actions within one authoritative second and never sets a numeric
height. This module gives the ball its missing third dimension WITHOUT
touching outcomes: a deterministic, RNG-free 60 Hz integrator that launches
from the brain's own event stream (event family -> physically meaningful
initial vertical velocity) and then obeys real ballistics:

    z(t) = z0 + vz0*t - 0.5*G*t^2,   bounce: vz' = -vz * REST

Constants are shared in spirit with fc_simulator.world (the accepted CFR
body): G = 9.81 m/s^2, restitution 0.55, settle threshold on impact speed.
Horizontal motion stays exactly the brain's (frames already carry it); the
flight layer integrates z only, so it can NEVER contradict an authoritative
position or consume a random number. Given the same event sequence it
produces bit-identical trajectories at any render framerate (fixed DT).

Read-only helpers expose the state football logic will later reason about
(grounded / foot-playable / header-height / keeper-catchable).
"""
from __future__ import annotations

G = 9.81                 # m/s^2, Earth gravity (no animation-tuned gravity)
REST = 0.55              # bounce restitution (matches world.py REST)
SETTLE_VZ = 0.9          # impact speed below which a bounce is suppressed
DT = 1.0 / 60.0          # fixed integration step (renderer-independent)
SUBSAMPLES = 6           # z samples emitted per authoritative second

FOOT_PLAYABLE_Z = 0.55   # ball controllable with the foot at or below
HEADER_MIN_Z, HEADER_MAX_Z = 1.0, 2.6
GK_CATCH_MAX_Z = 2.6

# Aerial launch families: event -> initial vz in m/s. The brain resolves an
# aerial ball over ONE authoritative second, so full-flight families launch
# with vz = G*T/2 (T = 1 s): the ball leaves the ground and lands exactly as
# the brain hands possession on, with real gravity throughout.
_FULL_FLIGHT_VZ = G * 0.5          # 4.905: touches down at t = 1 s
_AERIAL_EVENTS = {"CROSS", "CORNER", "CLEARANCE", "GOAL_KICK", "GK_PUNCH"}


def _launch_vz_for(event_type: str, detail: dict) -> float | None:
    """Physically meaningful initial vertical velocity for this action.

    Deterministic function of authoritative event fields only. Returns None
    for ground actions. Attribute/execution-quality hooks belong here later.
    """
    d = detail or {}
    if event_type in _AERIAL_EVENTS:
        return _FULL_FLIGHT_VZ
    if event_type == "PASS":
        ptype = d.get("pass_type")
        if ptype == "LONG":
            return _FULL_FLIGHT_VZ                    # lofted long ball
        if ptype == "THROUGH" and float(d.get("distance_m") or 0) >= 27:
            return 2.4                                # clipped ball over the line
        return None                                   # ground families
    if event_type == "SHOT":
        # low drilled to modestly rising with distance (world.py SHOT family)
        dist = float(d.get("distance_m") or 16.0)
        return max(0.5, min(2.2, 0.5 + dist * 0.06))
    if event_type == "FREE_KICK":
        return 3.2
    return None


class BallFlight:
    """Deterministic z-axis state for one match session."""

    def __init__(self) -> None:
        self.z = 0.0
        self.vz = 0.0
        self.grounded = True

    def reset_ground(self) -> None:
        self.z = 0.0
        self.vz = 0.0
        self.grounded = True

    # ── queries (Part E interface) ───────────────────────────────────────────
    def height(self) -> float:
        return self.z

    def is_grounded(self) -> bool:
        return self.grounded

    def is_foot_playable(self) -> bool:
        return self.z <= FOOT_PLAYABLE_Z

    def is_header_playable(self) -> bool:
        return HEADER_MIN_Z <= self.z <= HEADER_MAX_Z

    def is_gk_catchable(self) -> bool:
        return self.z <= GK_CATCH_MAX_Z

    # ── per-authoritative-second update ──────────────────────────────────────
    def on_second(self, new_events) -> list[float]:
        """Advance exactly one second (60 fixed steps).

        new_events: the engine Event objects recorded during this second.
        Returns SUBSAMPLES z values at t = 1/6 .. 6/6 of the second (the
        caller stores them in the frame row; together with the previous
        row's end state they reconstruct bounces sub-second).
        """
        launch = None
        for e in new_events:
            vz = _launch_vz_for(e.event_type, getattr(e, "detail", None))
            if vz is not None and (launch is None or vz > launch):
                launch = vz
            if e.event_type in ("GK_CLAIM", "GOAL", "THROW_IN", "PLACED"):
                self.reset_ground()
        if launch is not None:
            self.z = 0.0
            self.vz = launch
            self.grounded = False

        samples: list[float] = []
        per = 60 // SUBSAMPLES
        for i in range(60):
            if not self.grounded:
                self.z += self.vz * DT
                self.vz -= G * DT
                if self.z <= 0.0 and self.vz < 0.0:
                    self.z = 0.0
                    r = -self.vz * REST
                    if r < SETTLE_VZ:
                        self.vz = 0.0
                        self.grounded = True
                    else:
                        self.vz = r
            if (i + 1) % per == 0:
                samples.append(round(self.z, 3))
        return samples

from __future__ import annotations

import math
from .models import Vec2

PITCH_LENGTH_M = 105.0
PITCH_WIDTH_M = 68.0
GOAL_WIDTH_M = 7.32
GOAL_HALF_Y = (GOAL_WIDTH_M / PITCH_WIDTH_M) * 50.0


def distance_m(a: Vec2, b: Vec2) -> float:
    dx = (a.x - b.x) * PITCH_LENGTH_M / 100.0
    dy = (a.y - b.y) * PITCH_WIDTH_M / 100.0
    return math.hypot(dx, dy)


def move_toward(pos: Vec2, target: Vec2, max_distance_m: float) -> tuple[Vec2, float]:
    d = distance_m(pos, target)
    if d <= 1e-9 or max_distance_m <= 0:
        return pos, 0.0
    ratio = min(1.0, max_distance_m / d)
    nxt = Vec2(pos.x + (target.x - pos.x) * ratio, pos.y + (target.y - pos.y) * ratio).clamp()
    return nxt, distance_m(pos, nxt)


def attack_relative_x(team_id: str, pos: Vec2) -> float:
    return pos.x if team_id == "HOME" else 100.0 - pos.x


def from_attack_frame(team_id: str, x: float, y: float) -> Vec2:
    return Vec2(x if team_id == "HOME" else 100.0 - x, y)


def goal_center(team_id: str) -> Vec2:
    return Vec2(100.0 if team_id == "HOME" else 0.0, 50.0)


def shot_angle_radians(team_id: str, pos: Vec2) -> float:
    gx = 100.0 if team_id == "HOME" else 0.0
    left = Vec2(gx, 50.0 - GOAL_HALF_Y)
    right = Vec2(gx, 50.0 + GOAL_HALF_Y)
    v1 = ((left.x - pos.x) * PITCH_LENGTH_M / 100.0, (left.y - pos.y) * PITCH_WIDTH_M / 100.0)
    v2 = ((right.x - pos.x) * PITCH_LENGTH_M / 100.0, (right.y - pos.y) * PITCH_WIDTH_M / 100.0)
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    n1 = math.hypot(*v1)
    n2 = math.hypot(*v2)
    if n1 == 0 or n2 == 0:
        return math.pi
    c = max(-1.0, min(1.0, dot / (n1 * n2)))
    return math.acos(c)


def point_segment_distance_m(p: Vec2, a: Vec2, b: Vec2) -> tuple[float, float]:
    # Return perpendicular distance and projection fraction along a->b.
    ax, ay = a.x * PITCH_LENGTH_M / 100.0, a.y * PITCH_WIDTH_M / 100.0
    bx, by = b.x * PITCH_LENGTH_M / 100.0, b.y * PITCH_WIDTH_M / 100.0
    px, py = p.x * PITCH_LENGTH_M / 100.0, p.y * PITCH_WIDTH_M / 100.0
    abx, aby = bx - ax, by - ay
    denom = abx * abx + aby * aby
    if denom <= 1e-12:
        return math.hypot(px - ax, py - ay), 0.0
    t = ((px - ax) * abx + (py - ay) * aby) / denom
    tc = max(0.0, min(1.0, t))
    qx, qy = ax + tc * abx, ay + tc * aby
    return math.hypot(px - qx, py - qy), tc

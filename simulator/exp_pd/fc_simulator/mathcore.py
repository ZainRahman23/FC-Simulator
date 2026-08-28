from __future__ import annotations

import math
from dataclasses import dataclass


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def logit(p: float) -> float:
    p = clamp(p, 1e-6, 1 - 1e-6)
    return math.log(p / (1 - p))


def bounded_sigmoid(logit_score: float, floor: float = 0.0, ceiling: float = 1.0) -> float:
    return floor + (ceiling - floor) * sigmoid(logit_score)


@dataclass(frozen=True)
class AttributeStat:
    mean: float
    sd: float


class AttributeNormalizer:
    def __init__(self, stats: dict[str, dict[str, float]] | None = None):
        self.stats = stats or {}

    def g(self, name: str, value: float) -> float:
        stat = self.stats.get(name)
        mean = float(stat.get("mean", 70.0)) if stat else 70.0
        sd = max(4.0, float(stat.get("sd", 12.0))) if stat else 12.0
        z = (float(value) - mean) / sd
        return math.tanh(z / 2.0)


def softmax(values: list[float], temperature: float = 1.0) -> list[float]:
    if not values:
        return []
    t = max(0.05, temperature)
    m = max(values)
    exps = [math.exp((v - m) / t) for v in values]
    total = sum(exps)
    return [e / total for e in exps]

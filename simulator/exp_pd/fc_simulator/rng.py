from __future__ import annotations

import hashlib
import math
from typing import Any


class KeyedRNG:
    """Deterministic semantic child-stream RNG.

    Every draw is a pure function of ``match seed + semantic key parts``.  There is no
    mutable PRNG cursor, so inserting an unrelated draw cannot shift every later result.
    When auditing is enabled the engine retains the semantic key, a compact key digest,
    and the resulting value for post-match inspection.
    """

    def __init__(self, seed: int, audit_enabled: bool = False):
        self.seed = int(seed)
        self.audit_enabled = bool(audit_enabled)
        self.audit_log: list[dict[str, Any]] = []

    def key_text(self, *parts: object) -> str:
        return "|".join([str(self.seed), *(str(p) for p in parts)])

    def key_id(self, *parts: object) -> str:
        return hashlib.blake2b(self.key_text(*parts).encode("utf-8"), digest_size=8).hexdigest()

    def _u64(self, *parts: object) -> int:
        digest = hashlib.blake2b(self.key_text(*parts).encode("utf-8"), digest_size=8).digest()
        return int.from_bytes(digest, "big", signed=False)

    def _base_uniform(self, *parts: object) -> float:
        return (self._u64(*parts) + 0.5) / (2**64)

    def _audit(self, distribution: str, value: float, parts: tuple[object, ...]) -> None:
        if not self.audit_enabled:
            return
        self.audit_log.append({
            "distribution": distribution,
            "key_id": self.key_id(*parts),
            "key": [str(p) for p in parts],
            "value": float(value),
        })

    def uniform(self, *parts: object) -> float:
        value = self._base_uniform(*parts)
        self._audit("uniform", value, parts)
        return value

    def normal(self, *parts: object) -> float:
        # Use private component uniforms so a single requested normal draw produces a
        # single audit entry rather than leaking its Box-Muller implementation details.
        u1 = max(1e-12, self._base_uniform(*parts, "n1"))
        u2 = self._base_uniform(*parts, "n2")
        value = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
        self._audit("normal", value, parts)
        return value

    def choice_index(self, weights: list[float], *parts: object) -> int:
        total = sum(max(0.0, w) for w in weights)
        if total <= 0:
            idx = 0
            self._audit("choice_index", float(idx), parts)
            return idx
        draw = self._base_uniform(*parts) * total
        acc = 0.0
        idx = len(weights) - 1
        for i, w in enumerate(weights):
            acc += max(0.0, w)
            if draw <= acc:
                idx = i
                break
        self._audit("choice_index", float(idx), parts)
        return idx

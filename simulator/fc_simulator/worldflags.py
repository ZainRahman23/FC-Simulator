"""World/architecture flags. Defaults reproduce legacy cal11 bit-for-bit."""
WORLD = {"CONTINUOUS": False}

# accepted cal12 cadence profile (D2) + aerial seam — copied verbatim from the
# accepted candidate; integration must not alter these values
CAD_PROFILE = {"MODE": "D", "AERIAL": True, "ONE_TOUCH_OD": 1.8, "SCAN_MAX": 1.2,
               "REFRACTORY": 0.9, "FALLBACK_BASE": 3.0, "FALLBACK_FT": 1.5,
               "IMPROVE_HOLD": 1.2}

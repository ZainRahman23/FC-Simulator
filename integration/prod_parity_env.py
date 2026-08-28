"""Rebind the candidate harness surface to the PRODUCTION modules.
Import this FIRST in any harness process to run the accepted validation
suites against fc_simulator.continuous/world instead of the lab candidate."""
import sys, json
sys.path.insert(0, '.'); sys.path.insert(0, '..'); sys.path.insert(0, '../simulator')
import bridge
import fc_simulator.engine as ENG
from fc_simulator import continuous as C
from fc_simulator.worldflags import CAD_PROFILE

_SR_CACHE = {}
def _engine(start_request_path, seed):
    sr = _SR_CACHE.get(start_request_path)
    if sr is None:
        sr = _SR_CACHE[start_request_path] = json.load(open(start_request_path))
    return ENG.MatchEngine(bridge.build_team(sr['home_team'], 'HOME'),
                           bridge.build_team(sr['away_team'], 'AWAY'),
                           bridge.ATTRIBUTE_STATS, seed,
                           bridge.build_config(sr.get('config'), sr.get('coach_ai')))

class LabCompat(C.Lab):
    def __init__(self, start_request_path, seed):
        C.Lab.__init__(self, _engine(start_request_path, seed))

class HybridLabCompat(C.HybridLab):
    def __init__(self, start_request_path, seed, steered=False, cad=None):
        C.HybridLab.__init__(self, _engine(start_request_path, seed), steered=steered, cad=cad)

import lab as _lab
import hybrid as _hyb
_lab.Lab = LabCompat
_lab.khash = C.khash
_lab.EX, _lab.EY, _lab.MX, _lab.MY = C.EX, C.EY, C.MX, C.MY
_lab.ACT_SPEED = C.ACT_SPEED
_lab.EL = ENG
_hyb.HybridLab = HybridLabCompat
_hyb.CAL12 = dict(CAD_PROFILE)
_hyb.khash = C.khash
print('[prod_parity_env] harness surface rebound to fc_simulator production modules')

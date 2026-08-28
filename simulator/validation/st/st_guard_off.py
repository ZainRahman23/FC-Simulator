"""cal6 reference (flags OFF) on the same guardrail scenarios."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import st_guardrails as G
G.FLAGS = {}
G.OUT = Path(__file__).parent / "out" / "st_guardrails_off.jsonl"
G.SCEN = ([("matrix", n, i) for n in ("ultra","controlled","balanced","aggressive") for i in range(15)]
          + [("press", n, i) for n in ("PASSIVE","RELENTLESS") for i in range(15)])
G.main()

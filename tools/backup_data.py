#!/usr/bin/env python3
"""Safe online backup of the Touchline SQLite database (uses the SQLite backup API)."""
import os, sqlite3, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
data_dir = Path(os.environ.get("TOUCHLINE_DATA_DIR", ROOT / "data_rc"))
src = data_dir / "touchline.db"
if not src.exists():
    print(f"No database at {src}"); sys.exit(1)
dst = data_dir / f"backup-touchline-{time.strftime('%Y%m%d-%H%M%S')}.db"
with sqlite3.connect(src) as s, sqlite3.connect(dst) as d:
    s.backup(d)
print(f"Backed up to {dst} ({dst.stat().st_size} bytes)")

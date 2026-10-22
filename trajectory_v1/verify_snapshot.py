"""Verify the preserved milestone without editing source or historical evidence."""
from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'trajectory_v1/SOURCE_MANIFEST.json').read_text())
files={**m['transportedFiles'],**m['runtimeDependencies'],**m['canonicalArchive']}
changed=[name for name,digest in files.items() if not (root/name).is_file() or hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest]
print(json.dumps({'status':'FAIL' if changed else 'PASS','files':len(files),'changed':changed},indent=2))
sys.exit(bool(changed))

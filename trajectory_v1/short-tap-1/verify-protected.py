from pathlib import Path
import hashlib,json,subprocess
p=Path(__file__).resolve().parent
m=json.loads((p/'source-manifest.json').read_text());repo=Path(m['repo'])
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
failures=[]
for rel,h in m['hashes'].items():
 f=repo/rel
 if not f.exists() or sha(f)!=h:failures.append(str(f))
protected=json.loads((p/'protected-before.json').read_text())
for path,h in protected.items():
 f=Path(path)
 if not f.exists() or sha(f)!=h:failures.append(path)
for rel,h in m['frozenCopies'].items():
 f=p/'frozen'/rel
 if not f.exists() or sha(f)!=h:failures.append(str(f))
status=subprocess.check_output(['git','status','--porcelain'],cwd=repo,text=True)
result=dict(status='PASS' if not failures and not status else 'FAIL',productionFiles=len(m['hashes']),outputFiles=len(protected),frozenFiles=len(m['frozenCopies']),missingTrackedSources=len(m['missingTrackedSources']),failures=failures,gitStatus=status,baseCommit=m['commit'])
(p/'protected-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
assert result['status']=='PASS'

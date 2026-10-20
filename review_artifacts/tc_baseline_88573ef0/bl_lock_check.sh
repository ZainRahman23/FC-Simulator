#!/bin/bash
# BASELINE-88573ef0 lock check — run from the worktree root: bash review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh
# PASS = the baseline page and code are exactly the locked state (tag tc-baseline-88573ef0-locked), and its code is 88573ef0's (tag
# tc-baseline-88573ef0) except the viewer's one relocated path.
set -u; fail=0
[ "$(git rev-parse tc-baseline-88573ef0^{commit})" = "88573ef09e3d372bd674f0f623317b52f1dc4903" ] || { echo "FAIL: tag tc-baseline-88573ef0 does not point at 88573ef0"; fail=1; }
git diff --quiet tc-baseline-88573ef0-locked -- sandbox/visual/tc_baseline_88573ef0 sandbox/visual/tc_baseline_88573ef0.html || { echo "FAIL: the baseline differs from the locked state:"; git diff --stat tc-baseline-88573ef0-locked -- sandbox/visual/tc_baseline_88573ef0 sandbox/visual/tc_baseline_88573ef0.html; fail=1; }
[ -z "$(git ls-files --others --exclude-standard sandbox/visual/tc_baseline_88573ef0)" ] || { echo "FAIL: untracked files inside the baseline:"; git ls-files --others --exclude-standard sandbox/visual/tc_baseline_88573ef0; fail=1; }
while read -r fmode ftype fblob fpath; do rel=${fpath#sandbox/visual/tc_playtest1/}; h=$(git hash-object "sandbox/visual/tc_baseline_88573ef0/$rel" 2>/dev/null)
  if [ "$h" != "$fblob" ] && [ "$rel" != "pt_viewer.js" ]; then echo "FAIL: $rel differs from 88573ef0"; fail=1; fi
done < <(git ls-tree -r --full-tree 88573ef0 sandbox/visual/tc_playtest1)
d=$(diff <(git show 88573ef0:sandbox/visual/tc_playtest1/pt_viewer.js) sandbox/visual/tc_baseline_88573ef0/pt_viewer.js | grep -c '^[<>]')
[ "$d" = "2" ] || { echo "FAIL: pt_viewer.js differs from 88573ef0 by more than the relocated fetch path ($d lines)"; fail=1; }
# the shared modules the baseline imports / loads from outside its folder (bl_deps.txt): 88573ef0's, unchanged
while read -r dep; do [ -z "$dep" ] && continue; want=$(git rev-parse "88573ef0:$dep" 2>/dev/null); have=$(git hash-object "$dep" 2>/dev/null)
  [ -n "$want" ] && [ "$want" = "$have" ] || { echo "FAIL: shared dependency $dep differs from 88573ef0"; fail=1; }
done < review_artifacts/tc_baseline_88573ef0/bl_deps.txt
[ $fail = 0 ] && echo "PASS: BASELINE-88573ef0 is locked and intact (88573ef0's code; page = the locked state)"; exit $fail

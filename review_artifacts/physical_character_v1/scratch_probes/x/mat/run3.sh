#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar"
S=/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator-worktrees-physical-character-v1/d4761610-c35f-4019-9308-cb83973e7b76/scratchpad/x/mat/stance
for s in R@0.5 L@0.5 L@0.6 R@0.55 R@0.6 L@0.55; do echo "$s"; done | xargs -P ${P:-3} -L 1 zsh -c 'node tools/stepper/oracle_fast.mjs --cfg legacy1 --ctrl "{\"speedI\":{\"max\":0.25}}" --starts $0 --kmax 21 --par 1 --out '$S'/l1sI25_$0.json > '$S'/l1sI25_$0.log 2>&1'
echo ALLDONE3

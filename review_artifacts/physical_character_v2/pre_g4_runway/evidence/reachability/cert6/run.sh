#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2"
G=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad/b/runway/cert
for b in V2-165-62 V2-175-70 V2-REF V2-190-85 V2-198-92 V2-long-legs V2-short-legs V1-matched; do for st in U:R U:L T5 T6; do echo "$b $st"; done; done | xargs -P 9 -L 1 zsh -c 'nice node tools/ik_certificate.mjs --cap=400000000 --body=$0 --state=$1 '$G'/cert_$0_${1/:/}.json > '$G'/cert_$0_${1/:/}.log 2>&1'
echo DONE > $G/done

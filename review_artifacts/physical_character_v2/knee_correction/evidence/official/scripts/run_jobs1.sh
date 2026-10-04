#!/bin/zsh
S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad; C=$S/kc
until [ -f $C/gates.done ]; do sleep 20; done
ls $C/jobs1/*.sh | xargs -P 4 -n 1 zsh
echo "$(date +%H:%M:%S) phase 1 parallel (after gates, 4 at a time) done: $(ls $C/ctrl/*.json | wc -l) ctrl, $(ls $C/yaw/*.json | wc -l) yaw" >> $C/queue.log; touch $C/jobs1.done

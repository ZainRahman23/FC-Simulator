#!/bin/bash
export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13
CFG=${CFG:-PSTAR5CHAB}; H=${HARN:-fb_size.mjs}; P=${PFX:-s}
while read -r hu sd hz tr; do [ -z "$hu" ] && continue; node $H --human=$hu --side=$sd --hz=$hz --cfg=$CFG --traj=$tr --out=${P}_${hu}_${sd}_${hz}_${tr}.json.gz > log_${P}_${hu}_${sd}_${hz}_${tr}.txt 2>&1 & done
wait

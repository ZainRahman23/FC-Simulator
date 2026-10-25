const S3="file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/player-occupancy-v1/sandbox/visual/";
const {ENV}=await import(S3+"occupy1/tools/o_env.mjs");const {MATRIX,O3CASES}=await import(S3+"occupy3/o3_cases.js");const {runO3}=await import(S3+"occupy3/o3_run.js");await import(S3+"occupy3/o3_world.js");
for(const [name,set] of [["matrix",MATRIX],["review",O3CASES]]){let body=0,limb=0,bodyTicks=0,cases=0,limbOnly=0;
 for(const tc of set){const R=runO3(ENV,tc,"S3",{record:false}),W=R.W;let b=0,l=0;for(const rec of W.imp.log){if(rec.imp){b+=rec.imp.j;bodyTicks++;}for(const s of rec.strike||[])l+=s.j;}body+=b;limb+=l;if(b+l>0){cases++;if(b<0.05*(b+l))limbOnly++;}}
 console.log(`${name}: impulse from BODY contact ${body.toFixed(0)} N·s (${bodyTicks} ticks) · from LIMB strikes ${limb.toFixed(0)} N·s → limb share ${(100*limb/(body+limb)).toFixed(0)} % · encounters with impulse ${cases}, of which limb-only (>95 % limb) ${limbOnly}`);}

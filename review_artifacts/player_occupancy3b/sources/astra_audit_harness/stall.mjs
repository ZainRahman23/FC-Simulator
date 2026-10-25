const AST="file:///Users/zainrahman/Documents/Codex/2026-10-19/files-pasted-by-the-user-touchline/work/physical-duel-v2/";
const {env}=await import(AST+"env-node.mjs");const {DuelSim}=await import(AST+"sim.js");
const EQ=[{height:176,mass:73,strength:70},{height:176,mass:73,strength:70}],DT=1/240;
for(const n of ["FRONT_COLLISION","REAR_CROSSING","CROSSING","STATIONARY_B","BACK_CONTACT"])for(const off of [false,true]){const s=new DuelSim(env,n,{profiles:EQ,disableCorridor:off});const line=[];
 for(let k=1;k<=6/DT;k++){s.step();if(k%120===0)line.push(`${(k*DT).toFixed(1)}s ${s.actors.map(a=>Math.hypot(...a.V).toFixed(1)).join("/")} ${s.pair.state.slice(0,8)} d${Math.hypot(s.actors[0].P[0]-s.actors[1].P[0],s.actors[0].P[1]-s.actors[1].P[1]).toFixed(2)}`);}
 console.log(n,off?"corridor OFF":"corridor on");console.log("  "+line.join(" | "));
 console.log("  blocked-plant events A/B:",s.actors.map(a=>a.support.events.filter(e=>e.type==="blocked-plant").length).join("/"),"falls",s.stats.falls,"maxPlantDrift",s.stats.maxPlantDrift);}

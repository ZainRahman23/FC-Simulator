// LV2 local (presentation-only) angular velocities of the bones V2 does not represent — clavicle vs chest, hand vs forearm, neck vs chest — on the
// frozen baseline (git archive of locomotion-v2-straight-baseline-1, LV2_ARCHIVE; LV2_STATE.queryAt only; read-only). 240 half-step instants per stride.
// usage: LV2_ARCHIVE=<dir> node lv2_local_rates.cjs
const path=require("path"), vm=require("vm"); const A=process.env.LV2_ARCHIVE; const {loadRun1}=require(path.join(A,"sandbox/visual/run1/tools/run1_load.cjs"));
const X=loadRun1({extra:["run1/lv2_state.js"]}), LV=vm.runInContext("LV2_STATE",X.ctx), E=X.RUN1_V13, own=()=>{const s=Object.assign({},X.charSkel("vinicius")); delete s._r1body; return s;};
for (const v of [3.0,5.5,7.8,9.5]) { const vOf=()=>v, simAt=(t)=>({x:70+v*t,y:30,heading:0,v}), Ac=E.r1Make(own()); E.r1Replay(Ac,vOf,null,1.9)(); const T=E.r1GaitAt(Ac.body,Ac.prm,v).T; let mx={clav:0,hand:0,neck:0}, sh=0;
 for (let k=0;k<240;k++){ const q=LV.queryAt(E,Ac,simAt,2+(k+.5)/240*T,vOf,null,{provenance:false}), J=Object.fromEntries(q.joints.map(j=>[j.name,j])), d=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
  for (const sd of ["L","R"]) { const wl=d(J["clavicle_"+sd].world.angularVelocity,J.chest.world.angularVelocity); mx.clav=Math.max(mx.clav,wl); sh=Math.max(sh, wl*0.19); mx.hand=Math.max(mx.hand,d(J["hand_"+sd].world.angularVelocity,J["foreArm_"+sd].world.angularVelocity)); }
  mx.neck=Math.max(mx.neck,d(J.neck.world.angularVelocity,J.chest.world.angularVelocity)); }
 console.log(v,"m/s: max LOCAL angular velocity (rad/s) clavicle vs chest",mx.clav.toFixed(3),"(× 0.19 m clavicle =",sh.toFixed(3),"m/s at the shoulder) · hand vs forearm",mx.hand.toFixed(4)," · neck vs chest",mx.neck.toFixed(3)); }

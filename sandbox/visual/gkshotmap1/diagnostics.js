// Read-only clock reconstruction from the unchanged 60 Hz state machine.
// Arms follow the root before commitment; the committed hand path first executes
// on the next update after commitTick. Cross-check against recorded poses in tests.
export function enrichDiagnostics(r){
 if(!r.clock)return r;const c=r.clock,k=r.keeper.commit,dt=1/60,root=('firstRootMovement' in c)?c.firstRootMovement:c.firstMovement;
 const arm=k&&Math.hypot(...k.target.map((v,i)=>v-k.handOrigin[i]))>1e-7?(Math.round(k.commitTick/dt)+1)*dt:null;
 const endClock=Math.ceil((r.end.t-1e-10)/dt)*dt,hand=arm!==null&&arm<=endClock+1e-9?Math.min(root??Infinity,arm):root;
 c.firstRootMovement=root;c.firstHandMovement=Number.isFinite(hand)?hand:null;c.firstMovement=Math.min(root??Infinity,hand??Infinity);if(!Number.isFinite(c.firstMovement))c.firstMovement=null;
 c.movementBeforeInterception=c.contact===null?null:Math.max(0,c.contact-(c.firstMovement??c.contact));
 c.clockPrecision='Keeper decisions and first motion at 60 Hz; physical contact uses exact 12-sample TOI fraction.';
 if(r.goal&&!r.contacts.length&&r.failure.primary==='REACTION LIMITED'&&c.firstMovement!==null&&c.reactionWindow>=.10){
  if(k?.bestEffort)r.failure.primary='REACH LIMITED';
  else if(k&&r.keeper.closest.t<k.t0+k.execTime-.02)r.failure.primary='BALL TOO FAST FOR CURRENT ENVELOPE';
  else r.failure.primary='CONTACT GEOMETRY LIMITED';
 }
 return r;
}

// Controlled-ARRIVAL batteries for the gather / chest-catch pass. The ball is placed a few metres from the keeper
// with a state chosen so that it ARRIVES at the keeper's SET plane with the requested speed / height / lateral
// offset (rolling balls are placed close because MU_ROLL = 4.2 m/s² stops a 3 m/s roller in ~1 m). Production
// keeper, full ptReset per shot, profile injected as explicit attributes (no OVR). Records commit action, every
// contact (volume, outcome, held, Stage-4 quality factors) and the goal outcome.
module.exports.GLIB = `
const M_=GK_MOUTH;
function applyProfile(P){ const t=S.pt; t.gkCap="manual"; t.gkReflex=P.reflexes; t.gkDiving=P.diving; t.gkHandling=P.handling; t.gkJump=P.jumping; t.gkHeight=P.height;
  t.gkPos=P.positioning!=null?P.positioning:72; t.gkAccel=P.acceleration; t.gkSpeed=P.speed; t.gkStrength=P.strength; t.gkWeight=P.weight;
  t.gkMovePolicy="M6"; t.gkPosQ="Q25"; t.gkHand="H4"; t.gkSelect=undefined; t.gkMomentum="SET"; t.gkScenario=null; t.gkStudy=null; t.paused=false; t.pauseAtContact=false;
  GK_POSMODEL.active="NEW"; GK_SETDEPTH.active="D2"; }
const PROFILES={
  K1:{reflexes:45,diving:45,handling:45,jumping:48,height:183,weight:80,acceleration:68,speed:62,strength:72,positioning:72},
  K2:{reflexes:72,diving:72,handling:72,jumping:72,height:190,weight:80,acceleration:68,speed:62,strength:72,positioning:72},
  K3:{reflexes:92,diving:92,handling:92,jumping:92,height:197,weight:80,acceleration:68,speed:62,strength:72,positioning:72},
  COURTOIS:{reflexes:96,diving:91,handling:95,jumping:68,height:199,weight:96,acceleration:42,speed:52,strength:70,positioning:72},
  POOR:    {reflexes:45,diving:45,handling:45,jumping:48,height:183,weight:80,acceleration:68,speed:62,strength:72,positioning:72},
  AVERAGE: {reflexes:68,diving:68,handling:68,jumping:66,height:188,weight:83,acceleration:70,speed:63,strength:73,positioning:72},
  GOOD:    {reflexes:78,diving:78,handling:78,jumping:74,height:190,weight:85,acceleration:72,speed:64,strength:74,positioning:72},
  ELITE:   {reflexes:90,diving:90,handling:90,jumping:82,height:192,weight:88,acceleration:74,speed:65,strength:76,positioning:72},
  TALL_SLOW:       {reflexes:72,diving:78,handling:78,jumping:72,height:200,weight:95,acceleration:50,speed:48,strength:80,positioning:72},
  SHORT_EXPLOSIVE: {reflexes:92,diving:92,handling:70,jumping:88,height:183,weight:78,acceleration:88,speed:80,strength:66,positioning:72},
  HANDLER:         {reflexes:70,diving:70,handling:94,jumping:68,height:188,weight:84,acceleration:62,speed:58,strength:74,positioning:72},
  STOPPER:         {reflexes:92,diving:92,handling:58,jumping:82,height:190,weight:86,acceleration:66,speed:60,strength:72,positioning:72},
};
// shooter distance used only to position the shooter object (out of the way); ball placed independently
function setup(P,shooterDist){ const t=S.pt; ptReset(); applyProfile(P); t.now=0; t.kick=null; t.shoot=null; t.net=null; t.last=""; t.keys={};
  const SX=M_.lineX-shooterDist, SY=M_.centerY; t.p={x:SX,y:SY,vx:0,vy:0,facing:0,touchT:0}; t.b={x:SX,y:SY,z:0.06,vx:0,vy:0,vz:0,ctrl:true,exclT:0,curve:null};
  for(const g of S.goalPanels||[]) if(g.net){ g.net.pos.set(g.net.rest); g.net.vel.fill(0); g.net.active=false; g.net._ptV2=false; }
  t.gk=ptGkMake(); t.gk.height=t.gkHeight/100; t.gk.handZ=t.gk.height*GK_CFG.handReachFrac;
  const q=gkNorm01(t.gkPos); const set=gkPosition(t,SX,SY,q); t.gk.x=set[0]; t.gk.y=set[1]; t.gk.vx=0; t.gk.vy=0;
  t.gk.handNow=[t.gk.x,t.gk.y,t.gk.handZ]; t.gk.bodyNow=[t.gk.x,t.gk.y]; t.gk._prevKicked=false; t.gk.shotT0=null; return set; }
// free flight with keeper inert: does a state (x0,y0,z0,vx,vy,vz) arrive at plane X? returns arrival {y,z,t,sp,bounces}
function arrive(x0,y0,z0,vx,vy,vz,X){ const t=S.pt; const keep=t.gk; t.gk=null; t.now=0; t.kick=null; t.net=null;
  t.b={x:x0,y:y0,z:z0,vx,vy,vz,ctrl:false,exclT:5,curve:null}; let prev=null,a=null,b=0;
  for(let i=0;i<300;i++){ prev={x:t.b.x,y:t.b.y,z:t.b.z,t:t.now}; const zb=t.b.z,vzb=t.b.vz; ptStep(); if(zb<=0.001+GOALFX.ballR&&vzb<0&&t.b.vz>0) b++;
    if(prev.x<X&&t.b.x>=X){ const f=(X-prev.x)/((t.b.x-prev.x)||1e-9); a={y:+(prev.y+f*(t.b.y-prev.y)).toFixed(3),z:+(prev.z+f*(t.b.z-prev.z)).toFixed(3),t:+(prev.t+f*PT_DT).toFixed(4),sp:+Math.hypot(t.b.vx,t.b.vy,t.b.vz).toFixed(2),bounces:b}; break; }
    if(Math.hypot(t.b.vx,t.b.vy)<0.05&&t.b.z<0.12){ break; } if(t.now>4) break; }
  t.gk=keep; return a; }
// solve a launch so the ball arrives at plane X (the keeper's SET x) with speed sp, height z, lateral offset lat.
// mode: "roll" (on the ground, from dist metres), "air" (straight flight, from dist), "bounce" (bounces ~1 m short of the plane),
//       "drop" (descending steeply onto the point from a lob)
function solveArrival(mode,sp,z,lat,X,y0,dist){
  const zR=GOALFX.ballR;
  if(mode==="roll"||mode==="rollNear"){ // rolling: v decays at MU_ROLL; choose start distance d so that arrival speed = sp: v0^2 = sp^2 + 2·mu·d
    // realistic roller: the ball was STRUCK along the ground at v0 = max(14, sp+4) m/s and decelerates at MU_ROLL to arrive at sp —
    // start distance d = (v0² − sp²)/(2·MU) (a slow roller is a long way out; it cannot exist otherwise under a 4.2 m/s² decel).
    // mode "rollNear" keeps the old close placement (0.8–6 m: the ball is at the feet before or just after the reaction — emergency case).
    const v0n=Math.max(14,sp+4); const dLong=Math.min(26,(v0n*v0n-sp*sp)/(2*PT.MU_ROLL));
    const d=(mode==="roll")?dLong:Math.max(0.6,Math.min(8,(sp<=3?0.8:sp<=6?2.0:sp<=10?4.0:6.0))); const v0=Math.sqrt(sp*sp+2*PT.MU_ROLL*d); const x0=X-d;
    // straight line toward the arrival point (y0+lat at X)
    const dy=lat; const L=Math.hypot(d,dy); return {x0,y0:y0,z0:zR,vx:v0*d/L,vy:v0*dy/L,vz:0,d}; }
  if(mode==="air"||mode==="drop"||mode==="bounce"){
    const d=dist!=null?dist:(mode==="drop"?6.0:(sp<=8?3.0:sp<=15?5.0:8.0)); const x0=X-d;
    // Newton on (elevation, speed) so that arrival z and speed match; lateral by aiming straight at the point
    let v0=sp, ph= mode==="drop"?0.75:(mode==="bounce"?0.35:Math.atan2(z-zR,d)+0.02); let best=null;
    for(let it=0;it<40;it++){ const vx=v0*Math.cos(ph), vz=v0*Math.sin(ph); const L=Math.hypot(d,lat); const a=arrive(x0,y0,zR,vx*d/L,vx*lat/L,vz,X); if(!a){ ph-=0.03; continue; }
      let ez=a.z-z, es=a.sp-sp; const err=Math.hypot(ez,es*0.05); if(!best||err<best.err) best={err,ph,v0,a};
      if(mode==="bounce"){ if(a.bounces<1) ph+=0.04; } // want a bounce before the plane
      if(Math.abs(ez)<0.01&&Math.abs(es)<0.15&&(mode!=="bounce"||a.bounces>=1)) break;
      ph-=0.6*ez*(mode==="drop"?0.15:0.25)/Math.max(0.3,d*0.5); v0-=0.5*es; if(v0<0.5) v0=0.5; }
    if(!best) return null; const vx=best.v0*Math.cos(best.ph), vz=best.v0*Math.sin(best.ph); const L=Math.hypot(d,lat);
    return {x0,y0,z0:zR,vx:vx*d/L,vy:vx*lat/L,vz,d,arr:best.a,err:best.err}; }
}
function runArrival(P,L,shooterDist,keepTicks){ const t=S.pt; const set=setup(P,shooterDist);
  t.b={x:L.x0,y:L.y0,z:L.z0,vx:L.vx,vy:L.vy,vz:L.vz,ctrl:false,exclT:5,curve:null};
  t.kick={t0:0,kickAt:0,end:0.3,kicked:true,noAnim:true,fam:"SYNTH",v0:Math.hypot(L.vx,L.vy,L.vz),vz:L.vz,dir:Math.atan2(L.vy,L.vx),tech:"LACES",foot:"R",label:"GATHER",charge:null,tgtD:null};
  const gk=t.gk; let commit=null,contacts=[],goal=false,nC=0,closest=1e9,prep=null,ev=[];
  for(let i=0;i<(keepTicks||300);i++){ ptStep(); const b=t.b;
    if(!prep&&gk.prepared) prep={t:+t.now.toFixed(3),tgt:gk.prepTarget?gk.prepTarget.map(v=>+v.toFixed(3)):null};
    if(!commit&&gk.committed){ const c=gk.committed; commit={t:+t.now.toFixed(3),action:c.action||null,tier:c.tier,execT:+c.execTime.toFixed(3),norm:c.envNorm,target:c.target.map(v=>+v.toFixed(3)),feet:c.feet.map(v=>+v.toFixed(3)),gather:!!c.gather}; }
    if(gk.contacts&&gk.contacts.length>nC){ const c=gk.contacts[gk.contacts.length-1]; nC=gk.contacts.length;
      contacts.push({t:+t.now.toFixed(3),surface:c.surface,volume:c.volume,outcome:c.outcome,held:!!c.held,point:c.point,speedIn:+Math.hypot(...c.vIn).toFixed(2),speedOut:c.speedOut,
        q:c.q?{norm:c.q.norm,catchScore:c.q.catchScore,catchThresh:c.q.catchThresh,controlScore:c.q.controlScore,sRel:c.q.sRel,two:c.q.two,cAlign:c.q.cAlign,u:c.q.u,cBal:c.q.cBal,cHeight:c.q.cHeight,cSet:c.q.cSet,support:c.q.support!=null?c.q.support:null,vSecure:c.q.vSecure,stable:c.q.cStable!=null?c.q.cStable:null,fingertip:c.q.fingertip}:null}); }
    const hn=gk.handNow||[gk.x,gk.y,gk.handZ]; if(!contacts.length){ const dd=Math.hypot(b.x-hn[0],b.y-hn[1],b.z-hn[2]); if(dd<closest) closest=dd; }
    if(t.last==="GOAL!") goal=true;
    if(b.held){ if(t.now>(gk.lastContactT||0)+0.4) break; } else if(b.x>106.8||(contacts.length&&t.now>contacts[contacts.length-1].t+1.2)||(Math.hypot(b.vx,b.vy)<0.05&&b.z<0.12&&t.now>0.5)||t.now>5) break; }
  return {set:[+set[0].toFixed(3),+set[1].toFixed(3)],latency:+gk.latency.toFixed(4),prep,commit,contacts,goal,closest:+closest.toFixed(3),held:!!t.b.held,endBall:[+t.b.x.toFixed(2),+t.b.y.toFixed(2),+t.b.z.toFixed(2)]}; }
`;

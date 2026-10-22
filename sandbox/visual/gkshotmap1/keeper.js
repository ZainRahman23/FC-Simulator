import {createKeeperRuntime} from './frozen/keeper.js';
import {PROFILE} from './config.js';
export function keeperFor(origin,profile=PROFILE){
 const api=createKeeperRuntime(),p=profile,t={now:0,on:true,paused:false,pauseAtContact:false,gkCap:p.name,gkPos:p.positioning,gkReflex:p.reflex,gkDiving:p.diving,gkHandling:p.handling,gkJump:p.jump,gkHeight:p.height,gkWeight:p.weight,gkAccel:p.acceleration,gkSpeed:p.sprint_speed,gkStrength:p.strength,gkMovePolicy:'M6',gkPosQ:'Q25',gkHand:'H4',gkMomentum:'SET',gkScenario:null,gkStudy:null,gkDist:null,last:'',b:{x:origin[0],y:origin[2],z:origin[1],vx:0,vy:0,vz:0,ctrl:true,curve:null},kick:null};
 t.gk=api.make();api.S.pt=t;const g=t.gk;g.height=p.height/100;g.handZ=g.height*api.constants.GK_CFG.handReachFrac;
 const set=api.position(t,origin[0],origin[2],api.norm(p.positioning));Object.assign(g,{x:set[0],y:set[1],vx:0,vy:0,handNow:[...set,g.handZ],bodyNow:set.slice(),setPos:set.slice(),desired:set.slice(),moveTarget:set.slice()});
 return {api,t,set,profile};
}
export function toLegacy(ball){return {x:ball.p[0],y:ball.p[2],z:ball.p[1],vx:ball.v[0],vy:ball.v[2],vz:ball.v[1],ctrl:false,curve:null,exclT:Infinity};}
export function physicalPoint(p){return [p[0],p[2],p[1]];}
export function keeperSnapshot(g){return {root:[g.x,0,g.y],com:[g.x,g.height*.62,g.y],hand:physicalPoint(g.handNow),leg:g.legTipNow?physicalPoint(g.legTipNow):null,height:g.height,state:g.state,phase:g.phase,diveU:g.diveU,commit:g.committed?{target:physicalPoint(g.committed.target),ballPoint:physicalPoint(g.committed.ballPoint),action:g.committed.action,t0:g.committed.t0,execTime:g.committed.execTime,envNorm:g.committed.envNorm}:null,predicted:g.predInt?physicalPoint(g.predInt):null};}

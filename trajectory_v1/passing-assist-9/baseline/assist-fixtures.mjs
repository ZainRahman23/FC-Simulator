import {defaultInput} from './resolver.mjs';
export const ASSIST_SCENARIOS={one:'One receiver',close:'Two close receivers',depth:'Two depths · A 15 m / 8°, B 25 m / 2°',left:'Receiver slightly left',right:'Receiver slightly right',between:'Aim between two receivers',outside:'Just outside assistance',manual:'Deliberate manual miss',crowded:'Crowded penalty area'};
const polar=(id,d,a)=>({id,position:[20+d*Math.cos(a*Math.PI/180),.11,34+d*Math.sin(a*Math.PI/180)],velocity:[0,0,0]});
export function assistanceFixture(family='SHORT',scenario='depth',angle,range){
 const i=defaultInput();i.family=family;i.origin=[20,.11,34];i.facingYaw=0;i.holdMs=family==='SHORT'?0:300;i.seed='20261019';i.drawEventId='assist8-locked';i.passId='assist8';i.attributes={short_passing:80,long_passing:80,crossing:80,vision:80,shot_power:80,curve:80};i.accuracyModel='variation';i.crossCurveModel='newest';i.dominantFoot='right';i.targetAssistance=true;i.manualTargetMode='point';
 const dist=family==='CROSS'?40:20;
 const setups={one:[polar('A',dist,3)],close:[polar('A',dist,-2),polar('B',dist,2)],depth:[polar('A',15,8),polar('B',25,2)],left:[polar('A',dist,-4)],right:[polar('A',dist,4)],between:[polar('A',dist,-3),polar('B',dist,3)],outside:[polar('A',dist,0)],manual:[polar('A',dist,0),polar('B',dist+5,3)],crowded:[polar('A',37,-6),polar('B',42,-1),polar('C',46,3),polar('D',51,7),polar('E',39,12)]};
 i.candidates=setups[scenario]??setups.depth;i.receiver=i.candidates[0];
 const yaw=angle??(scenario==='outside'?(family==='SHORT'?6:5.5):scenario==='manual'?30:0),d=range??(scenario==='depth'?30:dist);
 i.aimPoint=[20+d*Math.cos(yaw*Math.PI/180),.11,34+d*Math.sin(yaw*Math.PI/180)];return i;
}

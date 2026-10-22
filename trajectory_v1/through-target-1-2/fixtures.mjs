import {rangeHold} from '../passing-v1-approved/passing/range-capability.mjs';
const player=(id,x,z,vx=0,vz=0)=>({id,position:[x,0,z],velocity:[vx,0,vz],sprintSpeed:8.2,agility:99,ballControl:99,dribbling:99});
const LEGACY_SCENARIOS=[{id:'closest',label:'30 m · A5 / B9 / C15',description:'Endpoint proximity chooses A among three eligible runners.'},{id:'heading',label:'Closer but wrong heading',description:'A is closer but sprinting away; slightly farther B attacks the space.'},{id:'low-power',label:'45 m request · SP60',description:'Explicit user endpoint stays 45 m; physical capability ends near 38.39 m.'},{id:'inaccurate',label:'Inaccurate through ball',description:'Lower passing accuracy leaves the physical miss visible; runner reacts.'},{id:'no-eligible',label:'No eligible runner',description:'Attackers outside the bounded space do not acquire ownership.'},{id:'sweep',label:'Multiple attackers · aim sweep',description:'Sweep aim and charge to change endpoint-based ownership.'},{id:'stride',label:'Forward receive into stride',description:'Compatible moving run preserves momentum into technical control.'}];
function legacyFixture(id='closest',overrides={}){const base={id,origin:[0,.11,0],aimDeg:0,holdMs:rangeHold('THROUGH',30,99),shotPower:99,longPassing:99,vision:99,seed:1,players:[player('A',27,4),player('B',24,-Math.sqrt(45)),player('C',18,9)]};
 if(id==='heading')base.players=[player('A',27,4,-7,0),player('B',25,3,4,0),player('C',18,-9)];
 if(id==='low-power')Object.assign(base,{shotPower:60,holdMs:400,requestedDistance:45,players:[player('A',33,5),player('B',29,-8),player('C',20,12)]});
 if(id==='inaccurate')Object.assign(base,{longPassing:20,vision:20,seed:4});
 if(id==='no-eligible')base.players=[player('A',12,28),player('B',65,-25),player('C',-9,0)];
 if(id==='sweep')base.players=[player('A',23,-13),player('B',30,-6),player('C',24,4),player('D',36,13),player('E',40,-15)];
 if(id==='stride')base.players=[player('A',10,1,5,0),player('B',8,14),player('C',5,-12)];
 return {...base,...structuredClone(overrides)};}

// Real frozen execution seeds; no launch, ball or attribute-equation overrides.
export const SCENARIOS=[
 {id:'terrible',label:'Terrible pass · abandon',description:'Good 45 m intent, actual ball 15 m wide; react, release the run, neutral recovery.'},
 {id:'easy',label:'Easy reachable · receive',description:'Compatible forward sprint; no abandonment.'},
 {id:'difficult',label:'Difficult reachable error',description:'A 4.84 m lateral execution error remains physically playable.'},
 {id:'overhit',label:'Massive overhit · abandon',description:'Actual endpoint 55.7 m against 45 m intent; slower runner cannot meet the useful trajectory.'},
 {id:'underhit',label:'Massive underhit · receive',description:'Actual endpoint 34.9 m against 45 m intent; standing runner attacks the shorter ball.'},
 {id:'underhit-lost',label:'Underhit · abandon',description:'Same short ball, runner already sprinting away; useful timing is lost.'},
 {id:'out-of-play',label:'Wide ball leaving play',description:'Actual ball crosses the touchline before a controllable meeting.'},
 {id:'low-power',label:'SP60 · capability shortfall',description:'Requested 45 m, physical ideal 38.39 m; chase actual ball.'},
 {id:'marginal',label:'Marginal · keep fighting',description:'Slower 5 m/s runner fights through marginal predictions to receive inside the verified contact tolerance.'}
];
export function fixture(id='terrible',overrides={}){
 let f;
 const p=(x,z,vx=0,vz=0,cap=8.2,ag=99)=>({...player('A',x,z,vx,vz),sprintSpeed:cap,agility:ag});
 const stress={requestedDistance:45,holdMs:400,longPassing:1,vision:1};
 if(id==='terrible')f=legacyFixture('closest',{...stress,seed:22,players:[p(28,13.5,0,6,6,80)]});
 else if(id==='easy')f=legacyFixture('stride');
 else if(id==='difficult')f=legacyFixture('inaccurate');
 else if(id==='overhit')f=legacyFixture('closest',{...stress,seed:19,players:[p(28,12,5,0,5.5,80)]});
 else if(id==='underhit')f=legacyFixture('closest',{...stress,seed:75,players:[p(40,5)]});
 else if(id==='underhit-lost')f=legacyFixture('closest',{...stress,seed:75,players:[p(48,0,8,0,8.2,80)]});
 else if(id==='out-of-play')f=legacyFixture('closest',{...stress,seed:87,origin:[0,.11,28],players:[p(40,31)]});
 else if(id==='marginal')f=legacyFixture('closest',{...stress,seed:22,players:[p(30,12,0,0,5,80)]});
 else f=legacyFixture(id);
 return {...f,id,...structuredClone(overrides)};
}

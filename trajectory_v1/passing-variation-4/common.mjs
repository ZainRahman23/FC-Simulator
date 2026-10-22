import {defaultInput} from '../passing/resolver.mjs';
export const distance=20+50*300/550;
export function fixture(family='CROSS',d=distance,rating=70,model='variation',event='variation4-0'){
 const i={...defaultInput(),family,passId:'variation-4',drawEventId:event,seed:'20261019',dominantFoot:'right',accuracyModel:model,crossCurveModel:'newest',attributes:{short_passing:80,long_passing:family==='THROUGH'?rating:80,crossing:family==='CROSS'?rating:99,shot_power:80,curve:80}};
 i.holdMs=family==='THROUGH'?400*((d-18)/32)**(1/1.08):550*(d-20)/50;
 if(family==='THROUGH'){i.origin=[20,.11,34];i.receiver={id:'A',position:[26,.11,34],velocity:[5,0,0]};i.aimPoint=[50,.11,34];i.facingYaw=0;}else{i.origin=[20,.11,8];i.receiver={id:'A',position:[55,.11,34],velocity:[0,0,0]};i.aimPoint=[55,.11,34];i.facingYaw=Math.atan2(26,35)*180/Math.PI;}return i;
}
export const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
export function stats(a){const sorted=a.slice().sort((a,b)=>a-b),m=mean(a),sd=Math.sqrt(mean(a.map(x=>(x-m)**2))),q=f=>{const k=f*(a.length-1),n=Math.floor(k);return sorted[n]+(sorted[Math.ceil(k)]-sorted[n])*(k-n);};return {n:a.length,mean:m,sd,se:sd/Math.sqrt(a.length),p10:q(.1),p25:q(.25),median:q(.5),p75:q(.75),p90:q(.9),min:sorted[0],max:sorted.at(-1),rms:Math.sqrt(mean(a.map(x=>x*x)))};}
export function correlations(samples,keys){return keys.map(a=>keys.map(b=>{const x=samples.map(s=>s[a]),y=samples.map(s=>s[b]),mx=mean(x),my=mean(y);return mean(x.map((v,k)=>(v-mx)*(y[k]-my)))/(stats(x).sd*stats(y).sd)||0;}));}

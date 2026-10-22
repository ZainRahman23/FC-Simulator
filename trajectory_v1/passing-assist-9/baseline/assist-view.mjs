import {corridorWidth} from './target-assistance.mjs?v=target8c';
export function drawAssistance(canvas,input,a){
 const g=canvas.getContext('2d'),r=canvas.getBoundingClientRect(),w=r.width,h=r.height,dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#123e35';g.fillRect(0,0,w,h);if(!a)return;
 const pts=[input.origin,a.rawTarget,...a.candidates.map(c=>c.receiver.position)],maxD=Math.max(35,...pts.map(p=>Math.hypot(p[0]-input.origin[0],p[2]-input.origin[2])))+8;
 const halfZ=Math.max(8,...pts.map(p=>Math.abs(p[2]-input.origin[2])))+5,s=Math.min((w-90)/maxD,(h-85)/(halfZ*2)),ox=45,oy=h/2,point=p=>[ox+(p[0]-input.origin[0])*s,oy+(p[2]-input.origin[2])*s];
 const line=(points,color,width=1,dash=[])=>{g.beginPath();points.forEach((p,n)=>n?g.lineTo(...point(p)):g.moveTo(...point(p)));g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dash);g.stroke();g.setLineDash([]);};
 const pAt=(d,y=0)=>[input.origin[0]+a.rawDirection[0]*d-a.rawDirection[2]*y,.11,input.origin[2]+a.rawDirection[2]*d+a.rawDirection[0]*y];
 for(let x=0;x<maxD;x+=10)line([[input.origin[0]+x,0,input.origin[2]-maxD],[input.origin[0]+x,0,input.origin[2]+maxD]],'#ffffff0c');
 for(let z=-Math.ceil(maxD/10)*10;z<=maxD;z+=10)line([[input.origin[0],0,input.origin[2]+z],[input.origin[0]+maxD,0,input.origin[2]+z]],'#ffffff0c');
 const boundary=sign=>Array.from({length:101},(_,k)=>{const d=maxD*k/100;const b=corridorWidth(input.family,d);return pAt(Math.sqrt(Math.max(0,d*d-b*b)),sign*b);});
 const band=[...boundary(1),...boundary(-1).reverse()];g.beginPath();band.forEach((p,n)=>n?g.lineTo(...point(p)):g.moveTo(...point(p)));g.closePath();g.fillStyle='#80d6b01c';g.fill();line(boundary(1),'#8bdfb477');line(boundary(-1),'#8bdfb477');
 line([input.origin,pAt(maxD)],'#e9edf3aa',1.5,[7,7]);
 const label=(p,t,col,dy=-13)=>{const [x,y]=point(p);g.font='600 12px system-ui';g.fillStyle=col;const tw=g.measureText(t).width;g.fillText(t,Math.max(8,Math.min(w-tw-8,x+8)),Math.max(18,Math.min(h-8,y+dy)));};
 const dot=(p,col,r=6)=>{g.beginPath();g.arc(...point(p),r,0,Math.PI*2);g.fillStyle=col;g.fill();g.strokeStyle='#0b2820';g.lineWidth=2;g.stroke();};
 for(const c of a.candidates){const p=c.receiver.position,chosen=c.id===a.selectedId,col=chosen?'#ffce74':c.eligible?'#76e4b4':'#8fb3cc';g.beginPath();g.arc(...point(p),c.width*s,0,Math.PI*2);g.fillStyle=chosen?'#ffce7418':'#a5ddff0a';g.fill();g.strokeStyle=col+'88';g.lineWidth=1.5;g.stroke();dot(p,col,chosen?8:6);label(p,c.id+' · '+c.distance.toFixed(0)+' m',col);}
 dot(input.origin,'#f6f7ec',8);label(input.origin,'PASSER','#fff',24);
 const cross=(p,color)=>{const [x,y]=point(p);g.strokeStyle=color;g.lineWidth=2;g.strokeRect(x-5,y-5,10,10);};
 cross(a.rawTarget,'#fff');label(a.rawTarget,'RAW AIM','#e9edf3',26);
 line([input.origin,a.assistedTarget],a.selectedId?'#ffce7477':'#f4a29577',1,[3,4]);
 const [ax,ay]=point(a.assistedTarget);g.strokeStyle=a.selectedId?'#ffce74':'#ffa99a';g.lineWidth=2;g.beginPath();g.arc(ax,ay,12,0,Math.PI*2);g.stroke();label(a.assistedTarget,a.selectedId?'IDEAL INTENT → '+a.selectedId:'MANUAL TARGET',g.strokeStyle,-29);
 g.font='12px system-ui';g.fillStyle='#b8d5ca';g.fillText('TOP DOWN · 10 m grid · circles show each receiver’s acceptance radius',16,h-15);
 return {s,ox,oy,origin:input.origin};
}

import {atTime} from './physics.mjs';
const colors={gold:'#f4cc77',mint:'#76e4b4',blue:'#8bc9ff',line:'#a6c7aa',white:'#f4f7f0'};
export class Scene{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.transform=null;}
 groundAt(clientX,clientY){if(!this.transform||this.transform.mode==='side')return null;const rect=this.canvas.getBoundingClientRect(),t=this.transform;return [t.mx-(clientY-rect.top-t.cy)/(t.s*t.k),.11,t.mz+(clientX-rect.left-t.cx)/t.s];}
 draw(state){
 const {canvas:c,ctx:g}=this,rect=c.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=Math.min(devicePixelRatio,2);if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);g.fillStyle='#203e36';g.fillRect(0,0,w,h);
 const i=state.input,p=state.prepared,flight=state.flight,actual=state.actual,mode=state.view,t=flight?.world.time??(actual?.duration??0),rp=i.receiver.position,rv=i.receiver.velocity,current=rp.map((v,k)=>v+rv[k]*t),target=p?.target??i.aimPoint;
 const predictedTime=p?Math.max(p.arrivalTime+1,2):2,far=rp.map((v,k)=>v+rv[k]*predictedTime),points=[i.origin,i.aimPoint,rp,far,current,target];
 if(p)for(let n=0;n<p.ideal.frames.length;n+=24)points.push(p.ideal.frames[n].p);
 if(flight)for(let n=0;n<flight.frames.length;n+=24)points.push(flight.frames[n].p);
 const minX=Math.min(...points.map(v=>v[0]))-5,maxX=Math.max(...points.map(v=>v[0]))+5,minZ=Math.min(...points.map(v=>v[2]))-7,maxZ=Math.max(...points.map(v=>v[2]))+7,mx=(minX+maxX)/2,mz=(minZ+maxZ)/2,k=mode==='top'?1:.58;
 const axis=[target[0]-i.origin[0],target[2]-i.origin[2]],dist=Math.hypot(...axis)||1,ux=axis[0]/dist,uz=axis[1]/dist,maxDepth=Math.max(20,...points.map(v=>(v[0]-i.origin[0])*ux+(v[2]-i.origin[2])*uz)),maxY=Math.max(5,...points.map(v=>v[1]))+1;
 const s=mode==='side'?Math.min((w-50)/(maxDepth+5),(h-90)/maxY):Math.min((w-40)/Math.max(18,maxZ-minZ),(h-100)/(Math.max(18,maxX-minX)*k+6));
 const sy=(h-110)/maxY,cy=h*.57,cx=w/2;this.transform={mx,mz,k,s,cy,cx,mode};
 const project=v=>mode==='side'?[25+((v[0]-i.origin[0])*ux+(v[2]-i.origin[2])*uz)*s,h-48-v[1]*sy]:[cx+(v[2]-mz)*s,cy+(mx-v[0])*s*k-v[1]*s*(mode==='top'?0:.9)];
 const line=(a,b,color,width=1,dash=[])=>{const pa=project(a),pb=project(b);g.beginPath();g.setLineDash(dash);g.moveTo(...pa);g.lineTo(...pb);g.strokeStyle=color;g.lineWidth=width;g.stroke();g.setLineDash([]);};
 const label=(pos,text,color,dx=7,dy=-8)=>{const a=project(pos);g.font='600 10px system-ui';const tw=g.measureText(text).width,x=Math.max(5,Math.min(w-tw-5,a[0]+dx)),y=Math.max(19,Math.min(h-10,a[1]+dy));g.fillStyle='#112820d9';g.fillRect(x-3,y-10,tw+6,14);g.fillStyle=color;g.fillText(text,x,y);};
 const marker=(v,color,kind='plus')=>{const a=project(v);g.strokeStyle=color;g.lineWidth=2;g.beginPath();if(kind==='plus'){g.moveTo(a[0]-6,a[1]);g.lineTo(a[0]+6,a[1]);g.moveTo(a[0],a[1]-6);g.lineTo(a[0],a[1]+6);}else{g.moveTo(a[0]-5,a[1]-5);g.lineTo(a[0]+5,a[1]+5);g.moveTo(a[0]-5,a[1]+5);g.lineTo(a[0]+5,a[1]-5);}g.stroke();};
 if(mode==='side'){
  line([i.origin[0]-ux*2,0,i.origin[2]-uz*2],[i.origin[0]+ux*(maxDepth+4),0,i.origin[2]+uz*(maxDepth+4)],'#9cbaa0');
  for(let y=1;y<=maxY;y++){line([i.origin[0],y,i.origin[2]],[i.origin[0]+ux*maxDepth,y,i.origin[2]+uz*maxDepth],'#44604e',.5,[3,5]);label([i.origin[0],y,i.origin[2]],y+' m','#98b4a3',0,-2);}
 }else{
  for(let x=0;x<=110;x+=5)line([x,0,0],[x,0,68],x%10===0?'#315346':'#2a493d');
  for(let z=0;z<=70;z+=5)line([0,0,z],[105,0,z],'#315346');
  for(const [a,b] of [[[0,0,0],[105,0,0]],[[105,0,0],[105,0,68]],[[105,0,68],[0,0,68]],[[52.5,0,0],[52.5,0,68]],[[88.5,0,13.84],[88.5,0,54.16]],[[88.5,0,13.84],[105,0,13.84]],[[88.5,0,54.16],[105,0,54.16]]])line(a,b,'#9bb99788',1.4);
  line([105,0,30.34],[105,2.44,30.34],colors.white,2);line([105,2.44,30.34],[105,2.44,37.66],colors.white,2);line([105,2.44,37.66],[105,0,37.66],colors.white,2);
 }
 line(i.origin,i.aimPoint,'#c6d0c080',1,[4,5]);marker(i.aimPoint,'#c6d0c080');if(!p)label(i.aimPoint,'USER AIM','#c6d0c0',8,16);
 line(rp,far,colors.blue,1.6,[6,5]);for(let a=.25;a<=1;a+=.25){const pt=rp.map((v,k)=>v+(far[k]-v)*a),b=project(pt);g.fillStyle=colors.blue;g.beginPath();g.arc(b[0],b[1],2,0,Math.PI*2);g.fill();}
 const path=(frames,color,width)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();for(let n=0;n<frames.length;n+=3){const pp=project(frames[n].p);n===0?g.moveTo(...pp):g.lineTo(...pp);}g.stroke();};
 if(p)path(p.ideal.frames,'#f4cc7777',1.5);if(flight)path(flight.frames,colors.mint,2.5);
 const person=(v,color,name)=>{const b=project(v),top=project([v[0],1.65,v[2]]);g.fillStyle='#071d2260';g.beginPath();g.ellipse(b[0],b[1]+2,8,4,0,0,Math.PI*2);g.fill();g.strokeStyle=color;g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(b[0],b[1]-4);g.lineTo(top[0],top[1]+5);g.stroke();g.lineCap='butt';g.fillStyle='#e1cdb3';g.beginPath();g.arc(top[0],top[1],4,0,Math.PI*2);g.fill();if(name)label(v,name,color,9,19);};
 person(i.origin,colors.white,'PASSER');if(t>0&&Math.hypot(...rv)>0){marker(rp,colors.blue);label(rp,'RECEIVER AT CONTACT',colors.blue,8,15);}person(current,colors.blue,mode==='side'&&p?'':'RECEIVER '+(i.receiver.id??''));
 if(p){marker(target,colors.gold);label(target,i.family==='THROUGH'?'TARGET SPACE':'IDEAL TARGET',colors.gold,8,-12);line([target[0]-uz*4,target[1],target[2]+ux*4],[target[0]+uz*4,target[1],target[2]-ux*4],'#f4cc7755',1,[3,4]);const ghost=atTime(p.ideal.frames,t);const gp=project(ghost.p);g.strokeStyle=colors.gold;g.lineWidth=1.5;g.beginPath();g.arc(...gp,4,0,Math.PI*2);g.stroke();
 if(p.ideal.landing&&i.family==='CROSS'){marker(p.ideal.landing.p,colors.gold);label(p.ideal.landing.p,'IDEAL LANDING',colors.gold,6,22);}}
 const ball=flight?.world.snapshot()??{p:i.origin,q:[0,0,0,1]},bp=project(ball.p),shadow=project([ball.p[0],0,ball.p[2]]);g.fillStyle='#0b1b19aa';g.beginPath();g.ellipse(...shadow,4,2,0,0,Math.PI*2);g.fill();g.fillStyle=colors.white;g.beginPath();g.arc(...bp,Math.max(3,Math.min(6,.11*s)),0,Math.PI*2);g.fill();g.fillStyle='#16302b';g.beginPath();g.arc(bp[0]+Math.sin((ball.q?.[2]??0)*6)*1.5,bp[1],1.4,0,Math.PI*2);g.fill();
 if(actual&&p){const point=actual.plane?.p??actual.atReference?.p??actual.last.p;marker(point,colors.mint,'cross');label(point,actual.plane?'ACTUAL CROSSING':'ACTUAL @ IDEAL TIME',colors.mint,8,18);if(actual.landing&&i.family==='CROSS'){marker(actual.landing.p,colors.mint,'cross');label(actual.landing.p,'ACTUAL LANDING',colors.mint,8,-12);}}
 g.font='600 11px system-ui';g.fillStyle='#cfe0d4';g.fillText(mode==='side'?'SIDE PROFILE · height in metres':mode==='top'?'TOP-DOWN · true ground positions':'TRAINING VIEW · metres · one physical ball',12,22);g.font='11px system-ui';g.fillStyle='#9eb9a9';g.fillText(t>0?t.toFixed(2)+' s after contact':'Receiver motion begins at contact',12,h-14);if(mode==='side'){g.fillStyle='#9eb9a9';g.font='10px system-ui';g.fillText('Independent distance / height scales',12,39);}
 }
}

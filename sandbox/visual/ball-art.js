/* Touchline ball: continuous 32-panel sphere and motion-owned orientation.
 * Rendering never writes authoritative position, velocity, curve or contacts.
 * Coordinates: [pitch X, height, pitch Y]. Physical rolling radius = 0.11 m.
 */
const TouchlineBall = (() => {
  const R=.11, white=[244,242,232], dark=[36,44,48];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const norm=a=>{const l=Math.hypot(...a);return a.map(x=>x/l)};
  const mul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
  function turn(q,w,dt){const m=Math.hypot(...w);if(m<1e-10||!dt)return q;const a=m*dt/2,s=Math.sin(a)/m;return norm(mul([w[0]*s,w[1]*s,w[2]*s,Math.cos(a)],q))}
  function rotate(q,v){const t=[2*(q[1]*v[2]-q[2]*v[1]),2*(q[2]*v[0]-q[0]*v[2]),2*(q[0]*v[1]-q[1]*v[0])];return [v[0]+q[3]*t[0]+q[1]*t[2]-q[2]*t[1],v[1]+q[3]*t[1]+q[2]*t[0]-q[0]*t[2],v[2]+q[3]*t[2]+q[0]*t[1]-q[1]*t[0]]}
  // The face planes of a truncated icosahedron give true pentagon/hexagon boundaries.
  const phi=(1+Math.sqrt(5))/2,V=[];
  for(const a of [-1,1])for(const b of [-phi,phi])V.push([0,a,b],[a,b,0],[b,0,a]);
  const neighbors=V.map(a=>V.map((b,i)=>Math.hypot(...a.map((x,k)=>x-b[k]))<2.001&&a!==b?i:-1).filter(i=>i>=0));
  const faces=[];
  for(let i=0;i<V.length;i++){
    const n=norm(V[i]),j=neighbors[i][0],p=V[i].map((v,k)=>(2*v+V[j][k])/3);
    faces.push({n,d:dot(n,p),black:true});
  }
  for(let i=0;i<12;i++)for(const j of neighbors[i])for(const k of neighbors[j])if(i<j&&j<k&&neighbors[k].includes(i)){
    const n=norm(V[i].map((v,c)=>v+V[j][c]+V[k][c]));faces.push({n,d:dot(n,V[i]),black:false});
  }
  const objects=new WeakMap(),streams=new Map();
  const initial=()=>({q:turn([0,0,0,1],norm([.6,1,.25]),.55),w:[0,0,0],last:null,frame:null,ground:true,dt:0});
  function state(key='main'){const map=key&&typeof key==='object'?objects:streams;if(!map.has(key))map.set(key,initial());return map.get(key)}
  function reset(key='main'){const map=key&&typeof key==='object'?objects:streams;map.delete(key)}
  function update(key,p,dt,frame){
    const s=state(key);if(!Number.isFinite(dt)||dt<=0)return s;
    if(frame!=null&&s.frame===frame)return s;s.frame=frame;
    dt=Math.min(dt,.1);const g=p.z<=.025;const vx=p.vx||0,vy=p.vy||0;
    const last=s.last,dx=last?p.x-last.x:0,dy=last?p.y-last.y:0;
    const dist=Math.hypot(dx,dy),teleport=last&&dist>Math.max(1,Math.hypot(vx,vy)*dt*4+.2);
    if(teleport){s.w=[0,0,0];s.last={x:p.x,y:p.y,z:p.z};s.ground=g;s.dt=0;return s}
    if(Array.isArray(p.omega))s.w=p.omega.slice();
    else if(g){s.w=last&&s.ground?[dy/(R*dt),0,-dx/(R*dt)]:[vy/R,0,-vx/R]}
    else if(!last||s.ground){
      // Linear flight state contains no full launch spin. Use a bounded launch
      // estimate unless the caller supplies angular velocity explicitly.
      const sp=Math.hypot(vx,vy),rate=Math.min(60,sp/R*.30);
      s.w=sp>1e-6?[vy/sp*rate,0,-vx/sp*rate]:[0,0,0];
    }
    if(!g&&p.curve)s.w[1]=(p.curve.sgn||1)*p.curve.s;
    s.q=turn(s.q,s.w,dt);s.last={x:p.x,y:p.y,z:p.z};s.ground=g;s.dt=dt;return s;
  }
  // Skin selection changes only surface colour, never the shared physical sphere.
  const designs=['classic','trionda','yellow','sprite','plain'];
  let design='classic';
  function setDesign(id){if(id==='prism')id='trionda';if(designs.includes(id))design=id;return design}
  if(typeof location!=='undefined')setDesign(new URLSearchParams(location.search).get('ballDesign'));
  // Four spherical regions carry three flowing colour strokes each.
  // Trionda reference: white channels, red / blue / green waves; no lettering.
  const seed=initial().q,invSeed=[-seed[0],-seed[1],-seed[2],seed[3]];
  const viewN=norm(rotate(invSeed,[0,.37,.93])),viewU=norm(rotate(invSeed,[1,0,0])),viewV=[viewN[1]*viewU[2]-viewN[2]*viewU[1],viewN[2]*viewU[0]-viewN[0]*viewU[2],viewN[0]*viewU[1]-viewN[1]*viewU[0]];
  const orient=a=>[0,1,2].map(k=>viewU[k]*a[0]+viewV[k]*a[1]+viewN[k]*a[2]);
  const tetra=[[0,0,1],...[0,2*Math.PI/3,4*Math.PI/3].map(a=>[Math.sqrt(8/9)*Math.cos(a),Math.sqrt(8/9)*Math.sin(a),-1/3])];
  const panels=tetra.map((n,id)=>{
    const u=id?norm([-n[1],n[0],0]):[1,0,0];
    const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
    return {n:orient(n),u:orient(u),v:orient(v),id};
  });
  // Broad silhouette traced from the JD8021 product view: bulbous rounded
  // head, concave neck and long curling tail. No logos / fine pattern.
  // The reference coordinates are normalised against the photographed sphere.
  const outline=[];
  let cursor=[616,351];
  function curve(c1,c2,end){
    const start=cursor;for(let i=0;i<10;i++){const t=i/10,h=1-t;
      const p=[0,1].map(k=>h*h*h*start[k]+3*h*h*t*c1[k]+3*h*t*t*c2[k]+t*t*t*end[k]);
      const x=(p[0]-640)/300,y=(360-p[1])/300,r=Math.hypot(x,y),scale=r>1e-6?Math.asin(Math.min(.995,r))/r:1;
      outline.push([x*scale,y*scale]);
    }cursor=end;
  }
  curve([588,320],[530,303],[480,261]);
  curve([433,219],[442,179],[462,144]);
  curve([417,204],[424,278],[443,341]);
  curve([445,388],[431,425],[437,461]);
  curve([437,546],[490,580],[555,580]);
  curve([597,583],[603,550],[608,498]);
  curve([613,468],[619,433],[622,406]);
  curve([624,380],[623,366],[616,351]);
  function inStroke(x,y){
    let inside=false;
    for(let i=0,j=outline.length-1;i<outline.length;j=i++){
      const a=outline[i],b=outline[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
  }
  const turns=[0,2*Math.PI/3,4*Math.PI/3].map(a=>[Math.cos(a),Math.sin(a)]);
  function triondaColour(local){
    // Each tetrahedral panel has one red, one blue and one green hooked lobe.
    // No hard polygon clipping: the white channels follow the traced curves.
    let best=-Infinity,colour=white;
    for(const panel of panels){
      const z=dot(panel.n,local);if(z<.05)continue;
      const angle=Math.acos(Math.min(1,z)),scale=angle/Math.max(1e-8,Math.sqrt(1-z*z));
      const x=dot(local,panel.u)*scale,y=dot(local,panel.v)*scale;
      for(let i=0;i<3;i++){
        const [c,s]=turns[i];if(z>best&&inStroke(c*x+s*y,-s*x+c*y)){
          colour=[[30,93,177],[205,48,43],[75,151,76]][i];best=z;
        }
      }
    }return colour;
  }
  // Precompute only the surface colours. Rotation and light remain continuous.
  let colourMap=null;const mapW=512,mapH=256;
  function triondaSample(local){
    if(!colourMap){
      colourMap=new Uint8Array(mapW*mapH*3);
      for(let y=0;y<mapH;y++)for(let x=0;x<mapW;x++){
        const lat=(y+.5)/mapH*Math.PI,lon=(x+.5)/mapW*2*Math.PI;
        const col=triondaColour([Math.sin(lat)*Math.cos(lon),Math.cos(lat),Math.sin(lat)*Math.sin(lon)]);
        colourMap.set(col,3*(y*mapW+x));
      }
    }
    const x=Math.min(mapW-1,Math.floor(((Math.atan2(local[2],local[0])+2*Math.PI)%(2*Math.PI))/(2*Math.PI)*mapW));
    const y=Math.min(mapH-1,Math.floor(Math.acos(Math.max(-1,Math.min(1,local[1])))/Math.PI*mapH)),i=3*(y*mapW+x);
    return [colourMap[i],colourMap[i+1],colourMap[i+2]];
  }
  function pigment(local,size,skin){
    if(skin==='yellow')return [247,211,45]; // simple yellow leather, no panel graphics
    if(skin==='plain')return [245,245,240]; // same warm white as the plain 3D physics sphere
    if(skin==='trionda')return triondaSample(local);
    let best=-Infinity,second=-Infinity,face=null;
    for(const f of faces){const v=dot(f.n,local)/f.d;if(v>best){second=best;best=v;face=f}else if(v>second)second=v}
    const seam=size>=18?1-.22*(1-ss(0,.007,best-second)):1;
    return (face.black?dark:white).map(v=>v*seam);
  }
  const surfaces=new Map();
  const ss=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
  function raster(size,s,basis,skin=design){
    const n=Math.max(2,Math.min(192,Math.ceil(size)));
    let surface=surfaces.get(n);if(!surface){const canvas=document.createElement('canvas');canvas.width=canvas.height=n;const ctx=canvas.getContext('2d');surface={canvas,ctx,img:ctx.createImageData(n,n)};surfaces.set(n,surface)}
    const data=surface.img.data;data.fill(0);
    const blur=Math.hypot(...s.w)*s.dt>.45,qs=blur?[-.35,0,.35].map(t=>turn(s.q,s.w,t*s.dt*.5)):[s.q];
    const invs=qs.map(q=>[-q[0],-q[1],-q[2],q[3]]),light=norm([-.42,.72,.54]);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const sx=(2*(x+.5)/n-1),sy=1-2*(y+.5)/n,rr=sx*sx+sy*sy;if(rr>=1)continue;
      const sz=Math.sqrt(1-rr),wn=[0,1,2].map(k=>basis.r[k]*sx+basis.u[k]*sy-basis.f[k]*sz);
      const lum=.12+.72*Math.max(0,dot(wn,light))+.16*(.45+.55*Math.max(0,wn[1]));
      const tone=.24+.36*ss(.25,.48,lum)+.36*ss(.57,.85,lum),factor=.52+.6*tone;
      const rgb=[0,0,0];
      for(const q of invs){
        const local=rotate(q,wn),col=pigment(local,n,skin);
        for(let k=0;k<3;k++)rgb[k]+=col[k]*factor+(k===2?(1-tone)*4:0);
      }
      const idx=4*(y*n+x);for(let k=0;k<3;k++)data[idx+k]=Math.min(255,Math.round(rgb[k]/invs.length));
      data[idx+3]=Math.round(255*Math.min(1,(1-Math.sqrt(rr))*n));
    }
    surface.ctx.putImageData(surface.img,0,0);return surface.canvas;
  }
  function draw(ctx,options){
    const {point,ground,radius,flat,basis,key,motion,dt,frame}=options;
    const s=update(key,motion,dt,frame),z=Math.max(0,motion.z||0);
    const sh=1/(1+.7*z),spread=1+Math.min(z,4)*.10;
    ctx.save();ctx.fillStyle=`rgba(16,27,20,${.26*sh})`;ctx.beginPath();
    ctx.ellipse(ground.x,ground.y,radius*1.1*spread,Math.max(.65,radius*flat*spread),0,0,Math.PI*2);ctx.fill();
    const sprite=raster(radius*2,s,basis),diameter=radius*2;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(sprite,point.x-radius,point.y-radius,diameter,diameter);ctx.restore();
  }
  return {radius:R,faces,panels,designs,setDesign,getDesign:()=>design,pigment,state,reset,update,rotate,turn,raster,draw};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TouchlineBall;

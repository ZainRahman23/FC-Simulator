/* Touchline corner flags. Metres, Y up; project(x,height,pitchY).
 * Presentation only: explicit seconds, no simulation state or random numbers.
 * Cloth uses the Astra Soft Cel transfer and light, with broad fabric folds.
 */
const CornerFlags = (() => {
  const config = Object.freeze({height:1.55, width:.48, drop:.34, radius:.018,
    red:[178,49,66], columns:12, rows:4});
  const corners = Object.freeze([[0,0],[105,0],[0,68],[105,68]].map(Object.freeze));
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
  function shade(rgb,n){
    // World pitch Y is reversed from character Z.
    const l=Math.hypot(...n), lum=.12+.72*Math.max(0,(-.42*n[0]+.72*n[1]+.54*n[2])/l/Math.hypot(.42,.72,.54))+.16*(.45+.55*Math.max(0,n[1]/l));
    const tone=.24+.36*smooth(.25,.48,lum)+.36*smooth(.57,.85,lum);
    return `rgb(${rgb.map((v,i)=>Math.round(v*(.52+.60*tone)+(i===2?(1-tone)*4:0))).join(',')})`;
  }
  function cloth(u,v,time,x,z){
    // Shared wind direction, fixed hoist, softly sagging fly; no pole wobble.
    const wave=6.3*u-time*1.55;
    return [x+.018+config.width*u,
      config.height-.035-config.drop*v-.038*u*u+.013*u*Math.sin(wave+.65*v),
      z+.075*u*Math.sin(wave)+.016*u*Math.sin(wave*1.7+v)];
  }
  function draw(ctx,project,time=0,filter='all'){
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(const [x,z] of corners){
      if(filter==='far'&&z!==0||filter==='near'&&z!==68)continue;
      const foot=project(x,0,z),top=project(x,config.height,z),tip=project(x+config.width,config.height,z);
      if([foot,top,tip].some(p=>p.d<.5)||Math.max(foot.x,tip.x)<-10||Math.min(foot.x,tip.x)>ctx.canvas.width+10||Math.max(foot.y,top.y)<-10||Math.min(foot.y,top.y)>ctx.canvas.height+10)continue;
      const ppm=Math.hypot(top.x-foot.x,top.y-foot.y)/config.height;
      const path=(pts,fill,stroke,width)=>{ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}};
      // Low contrast ground contact; same light direction as the players.
      const sh=project(x+.36,0,z-.46);path([foot,sh],null,'rgba(19,35,21,.23)',Math.max(.7,ppm*.035));
      ctx.fillStyle='rgba(19,35,21,.28)';ctx.beginPath();ctx.ellipse(foot.x,foot.y,Math.max(.75,ppm*.055),Math.max(.5,ppm*.025),0,0,Math.PI*2);ctx.fill();
      path([foot,top],null,'#b9c0b5',Math.max(1,ppm*config.radius*2+.55));
      path([foot,top],null,'#f4f4ee',Math.max(.65,ppm*config.radius*2));
      // Continuous red cloth; folds change shading, never the base colour.
      for(let i=0;i<config.columns;i++)for(let j=0;j<config.rows;j++){
        const u=i/config.columns,v=j/config.rows,du=1/config.columns,dv=1/config.rows;
        const a=cloth(u,v,time,x,z),b=cloth(u+du,v,time,x,z),c=cloth(u+du,v+dv,time,x,z),d=cloth(u,v+dv,time,x,z);
        const U=b.map((q,k)=>q-a[k]),V=d.map((q,k)=>q-a[k]);
        const n=[U[1]*V[2]-U[2]*V[1],U[2]*V[0]-U[0]*V[2],U[0]*V[1]-U[1]*V[0]];
        if(n[2]<0)for(let k=0;k<3;k++)n[k]*=-1;
        const col=shade(config.red,n);
        const pts=[a,b,c,d].map(p=>project(...p));
        path(pts,col,col,.3); // subpixel overlap prevents cracks between quads
      }
    }
    ctx.restore();
  }
  let foreground;
  function compositeNear(ctx,project,time,view,source){
    if(!foreground)foreground=document.createElement('canvas');
    if(foreground.width!==source.width||foreground.height!==source.height){foreground.width=source.width;foreground.height=source.height}
    const fc=foreground.getContext('2d');fc.clearRect(0,0,foreground.width,foreground.height);
    draw(fc,project,time,'near');ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(foreground,view.sx,view.sy,view.sw,view.sh,0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();
  }
  return Object.freeze({config,corners,cloth,shade,draw,compositeNear});
})();

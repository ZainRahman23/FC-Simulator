const encoder=new TextEncoder();
export async function executionDraws({seed,passerId='calibration-passer',drawEventId}){
 const result={contract:'pass-execution-v1',seed:String(seed),passerId,drawEventId:String(drawEventId),uniforms:{},z:{}};
 for(const dimension of ['direction','weight','elevation']){
  const pair=await Promise.all([0,1].map(async i=>{
   const key=JSON.stringify(['pass-execution-v1',String(seed),String(passerId),String(drawEventId),dimension,i]);
   const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(key)));
   const hash=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return {key,hash,u:(parseInt(hash.slice(0,13),16)+.5)/2**52};
  }));result.uniforms[dimension]=pair;result.z[dimension]=Math.sqrt(6)*(pair[0].u-pair[1].u);
 }return result;
}

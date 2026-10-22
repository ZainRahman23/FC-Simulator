import {prepareShot} from './core.mjs';
self.onmessage=async({data})=>{try{const shot=await prepareShot(data.input);self.postMessage({token:data.token,shot});}catch(e){self.postMessage({token:data.token,error:e.message});}};

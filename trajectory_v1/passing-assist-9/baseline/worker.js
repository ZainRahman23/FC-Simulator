import {preparePass} from './pass-router.mjs?v=target8c';
self.onmessage=async({data})=>{try{const prepared=await preparePass(data.input);self.postMessage({id:data.id,prepared});}catch(e){self.postMessage({id:data.id,error:e.message});}};

import {selectionMap} from '../passing/selection-map.mjs?v=depth9b';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,map:selectionMap(data.family,data.scenario)});}catch(e){self.postMessage({id:data.id,error:e.message});}};

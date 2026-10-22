import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const repo=path.resolve('../../../work/touchline-ball-phys1'),out=process.cwd(),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(fs.existsSync('source-manifest.json'))throw Error('The approved snapshot already exists; do not overwrite it. Use the frozen modules for reproducibility.');
const files=execFileSync('git',['ls-files','-z','--','*.js','*.mjs','*.py','*.ts','*.tsx','*.toml','*.html','*.css'],{cwd:repo,maxBuffer:32*1024*1024}).toString().split('\0').filter(f=>/\.(js|mjs|py|ts|tsx|toml|html|css)$/.test(f));
const missing=files.filter(f=>!fs.existsSync(path.join(repo,f)));
const hashes=Object.fromEntries(files.filter(f=>fs.existsSync(path.join(repo,f))).map(f=>[f,hash(fs.readFileSync(path.join(repo,f)))]));
const imports=new Set();function copy(f){if(imports.has(f))return;imports.add(f);const b=fs.readFileSync(path.join(repo,f)),dest=path.join(out,'frozen',f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b);for(const m of b.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))copy(path.normalize(path.join(path.dirname(f),m[1])));}
for(const f of ['sandbox/visual/shotcharge13/resolver.js','sandbox/visual/ballshot12/resolver.js','sandbox/visual/ballfeel14/world.js'])copy(f);
fs.copyFileSync('../model.mjs','locked-model.mjs');fs.copyFileSync('../zones.mjs','geometry.mjs');
const D=JSON.parse(fs.readFileSync('../measurements.json'));D.geometry.sixYardDepth=5.5;D.geometry.sixYardWidth=18.32;
fs.writeFileSync('geometry.json',JSON.stringify(D.geometry,null,2));
fs.writeFileSync('source-manifest.json',JSON.stringify({repo,branch:execFileSync('git',['branch','--show-current'],{cwd:repo,encoding:'utf8'}).trim(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),missingTrackedSources:missing,gitStatus:execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}),hashes,lockedModelHash:hash(fs.readFileSync('locked-model.mjs')),frozenCopies:Object.fromEntries([...imports].map(f=>[f,hash(fs.readFileSync(path.join(repo,f)))]))},null,2));
console.log({protectedSourceFiles:Object.keys(hashes).length,frozenModules:imports.size});

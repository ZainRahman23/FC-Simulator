import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import vm from 'node:vm';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),repo=path.resolve(root,'../../..'),out=path.resolve(process.argv[2]??'../../outputs/BALL-SHOT-1.2');
if(path.basename(out)!=='BALL-SHOT-1.2')throw Error('Package only into the new BALL-SHOT-1.2 folder');
fs.mkdirSync(out,{recursive:true});const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),p=JSON.parse(fs.readFileSync(path.join(root,'evidence/preservation.json')));
for(const f of p.files){const source=path.join(repo,f.file),dest=path.join(out,'source',f.file),bytes=fs.readFileSync(source);if(hash(bytes)!==f.sha256)throw Error('Frozen input changed '+f.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);}
fs.cpSync(root,path.join(out,'source/sandbox/visual/ballshot12'),{recursive:true});fs.writeFileSync(path.join(out,'source/package.json'),'{"type":"module"}\n');
for(const name of ['evidence','videos'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
for(const name of ['README.md','review.html'])fs.copyFileSync(path.join(root,name),path.join(out,name));
const html=fs.readFileSync(path.join(out,'review.html'),'utf8');for(const m of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)){if(!fs.existsSync(path.join(out,m[1])))throw Error('Missing review asset '+m[1]);}
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const files=[];function audit(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,ent.name);if(ent.isDirectory())audit(f);else{const rel=path.relative(path.join(out,'source'),f),source=path.join(repo,rel);if(rel==='package.json')continue;const bytes=fs.readFileSync(f);if(!bytes.equals(fs.readFileSync(source)))throw Error('Source copy mismatch '+rel);files.push({file:rel,sha256:hash(bytes)});}}}audit(path.join(out,'source'));
const result={pass:true,sourceFiles:files.length,sourceCopiesExact:true,reviewLinksExist:true,reviewScriptSyntax:true,videoValidation:JSON.parse(fs.readFileSync(path.join(out,'videos/validation.json'))),sourceChecks:files};
fs.writeFileSync(path.join(out,'PACKAGE-VALIDATION.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,sourceChecks:files.length},null,2));

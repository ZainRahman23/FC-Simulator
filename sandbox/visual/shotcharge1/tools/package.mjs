import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),repo=path.resolve(root,'../../..'),workspace=path.resolve(repo,'../..'),out=path.resolve(process.argv[2]??path.join(workspace,'outputs/SHOT-CHARGE-1'));
if(path.basename(out)!=='SHOT-CHARGE-1')throw Error('Package only into SHOT-CHARGE-1');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),json=p=>JSON.parse(fs.readFileSync(path.join(root,p))),frozen=json('evidence/preservation.json'),tests=json('evidence/tests.json'),videos=json('videos/validation.json'),ui=json('evidence/ui-validation.json');
if(tests.status!=='PASS'||tests.checks.some(c=>c.status!=='PASS')||videos.files.length!==43||!videos.pass||!ui.pass||ui.default.sp!=='80'||ui.default.hold!=='350'||ui.cases.length!==40||ui.comparisons.length!==3)throw Error('Missing successful evidence');
fs.mkdirSync(out,{recursive:true});
for(const f of frozen.files){const source=path.join(repo,f.file),dest=path.join(out,'source',f.file),bytes=fs.readFileSync(source);if(hash(bytes)!==f.sha256)throw Error('Frozen file changed '+f.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);}
for(const f of frozen.historicalOutputs){if(hash(fs.readFileSync(path.join(workspace,f.file)))!==f.sha256)throw Error('Historical output changed '+f.file);}
fs.cpSync(root,path.join(out,'source/sandbox/visual/shotcharge1'),{recursive:true});fs.writeFileSync(path.join(out,'source/package.json'),'{"type":"module"}\n');
for(const n of ['evidence','videos'])fs.cpSync(path.join(root,n),path.join(out,n),{recursive:true});
for(const n of ['README.md','review.html','report.html'])fs.copyFileSync(path.join(root,n),path.join(out,n));
const links=[];for(const name of ['review.html','report.html']){const html=fs.readFileSync(path.join(out,name),'utf8');for(const m of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)){const pathname=m[1].split(/[?#]/)[0];if(!fs.existsSync(path.join(out,pathname)))throw Error('Missing '+m[1]);links.push(m[1]);}for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);}
const files=[];function audit(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,ent.name);if(ent.isDirectory())audit(file);else{const rel=path.relative(path.join(out,'source'),file);if(rel==='package.json')continue;const bytes=fs.readFileSync(file);if(!bytes.equals(fs.readFileSync(path.join(repo,rel))))throw Error('Source copy mismatch '+rel);files.push({file:rel,sha256:hash(bytes)});}}}audit(path.join(out,'source'));
const result={pass:true,sourceFiles:files.length,sourceCopiesExact:true,htmlLinksExist:true,htmlScriptSyntax:true,tests:{pass:true,count:tests.checkCount},frozenSourcesVerified:frozen.files.length,historicalOutputsVerified:frozen.historicalOutputs.length,videoValidation:videos,uiValidation:ui,checkedLinks:links,sourceChecks:files};
fs.writeFileSync(path.join(out,'PACKAGE-VALIDATION.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({pass:true,sourceFiles:files.length,tests:result.tests,videos:videos.files.length,out},null,2));

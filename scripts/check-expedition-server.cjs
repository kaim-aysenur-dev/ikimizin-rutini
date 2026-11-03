// Sürüm kontrollü kayıt, API komut doğrulaması ve hesap yalıtımı.
// Neon sınırı bellek içi SQL adaptörüyle sınanır; gerçek hesaba/veritabanına dokunulmaz.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'ikimizin-cas-'));
const originalLoad=Module._load;
(async()=>{
  try{
    execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'lib/expedition.ts','--outDir',out,'--module','commonjs','--target','es2022','--skipLibCheck','--esModuleInterop'],{cwd:root,stdio:'pipe'});
    fs.writeFileSync(path.join(out,'package.json'),'{"type":"commonjs"}');
    const ts=require('typescript');
    fs.writeFileSync(path.join(out,'expedition-server.js'),ts.transpileModule(fs.readFileSync(path.join(root,'lib/expedition-server.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
    const {xpToLevel}=require(path.join(out,'xp.js'));
    const rows=new Map();let conflicts=0,failMissing=false;
    const query=async(strings,...values)=>{
      await Promise.resolve();
      if(failMissing)throw Object.assign(new Error('missing table'),{code:'42P01'});
      const text=strings.join('?');
      if(text.includes('select state')){const row=rows.get(values[0]);return row?[structuredClone(row)]:[];}
      if(text.includes('insert into expedition_campaigns')){if(!rows.has(values[0]))rows.set(values[0],{state:JSON.parse(values[1]),version:0});return[];}
      if(text.includes('update expedition_campaigns')){const row=rows.get(values[1]);if(row.version!==values[2]){conflicts++;return[];}rows.set(values[1],{state:JSON.parse(values[0]),version:row.version+1});return[{version:row.version+1}];}
      throw new Error(`Unexpected SQL: ${text}`);
    };
    Module._load=function(request,parent,isMain){
      if(parent?.filename===path.join(out,'expedition-server.js')){
        if(request==='server-only')return{};
        if(request==='./db')return{sql:()=>query};
        if(request==='./xp-server')return{adventure:async()=>({xp:xpToLevel(30)})};
        if(request==='./dates')return{todayIstanbul:()=> '2026-11-04'};
        if(request==='./equipment-server')return{equipmentOf:async()=>({one:{armor:'efsane-zirhi',weapon:'kalp-kilici',spells:['buz']},two:{armor:'efsane-zirhi',weapon:'ay-kilici',spells:['sifa']}})};
      }
      return originalLoad.call(this,request,parent,isMain);
    };
    const {parseCommand,updateCampaign,readCampaign,ExpeditionError}=require(path.join(out,'expedition-server.js'));
    const one={id:'one',displayName:'Cengiz',accountId:'account-a'},two={id:'two',displayName:'Ayşenur',accountId:'account-a'};
    for(const input of [null,{op:'hack'},{op:'input',runId:'r',seq:1,input:{di:NaN,dj:0,spell:null}},{op:'input',runId:'r',seq:1,input:{di:2,dj:0,spell:null}},{op:'input',runId:'r',seq:1,input:{di:0,dj:0,spell:4}},{op:'start',region:'x',difficulty:99}])assert.equal(parseCommand(input),null);
    const c=await updateCampaign(one,{op:'start',region:'kul-ormani',difficulty:0}),runId=c.run.id;
    const input={di:0,dj:0,attack:true,dodge:false,interact:false,spell:null};
    assert.equal(c.run.status,'waiting');
    await updateCampaign(one,{op:'join',runId});
    const alone=await updateCampaign(one,{op:'input',runId,seq:0,input});
    assert.equal(alone.run.status,'waiting');assert.equal(alone.run.effects.length,0);assert.equal(alone.shards,0);
    await Promise.all([updateCampaign(two,{op:'join',runId}),updateCampaign(one,{op:'input',runId,seq:1,input})]);
    const combined=await readCampaign('account-a');
    assert.equal(Object.keys(combined.run.players).length,2);assert.equal(combined.run.players.one.lastSeq,1);assert.equal(combined.run.party,2);
    await Promise.all([updateCampaign(one,{op:'input',runId,seq:2,input}),updateCampaign(two,{op:'input',runId,seq:1,input})]);
    const latest=await readCampaign('account-a');assert.equal(latest.run.players.one.lastSeq,2);assert.equal(latest.run.players.two.lastSeq,1);assert.ok(conflicts>0,'sürüm çakışması gerçekten yaşanmalı');
    const count=latest.run.effects.length;await updateCampaign(one,{op:'input',runId,seq:2,input});assert.equal((await readCampaign('account-a')).run.effects.length,count);
    await updateCampaign(one,{op:'leave',runId});
    await assert.rejects(updateCampaign(one,{op:'input',runId,seq:3,input}),e=>e.status===409);
    await updateCampaign(one,{op:'join',runId});await updateCampaign(one,{op:'input',runId,seq:3,input});
    assert.equal((await readCampaign('account-b')).run,null);
    await assert.rejects(updateCampaign({...one,accountId:'account-b'},{op:'input',runId,seq:1,input}),e=>e instanceof ExpeditionError);
    await assert.rejects(updateCampaign(one,{op:'input',runId:'old-run',seq:1,input}),e=>e.status===409);
    failMissing=true;await assert.rejects(readCampaign('account-a'),e=>e.status===503);
    console.log(`PASS: komut sınırları, iki eşzamanlı oyuncu, ${conflicts} kayıt çakışması, tekrar gönderimi, eski sefer ve hesap yalıtımı; eksik migration hatası.`);
  }finally{
    Module._load=originalLoad;
    if(path.dirname(path.resolve(out))===path.resolve(os.tmpdir())&&path.basename(out).startsWith('ikimizin-cas-'))fs.rmSync(out,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});

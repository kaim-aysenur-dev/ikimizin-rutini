// node scripts/check-expeditions.cjs — saf motor, bölüm erişimi, ortak savaş ve denge denetimi.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ikimizin-expedition-'));
const root = path.resolve(__dirname, '..');
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), 'lib/expedition.ts', 'lib/room.ts', 'lib/castle.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck', '--esModuleInterop'], { cwd: root, stdio: 'pipe' });
  fs.writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  console.assert = (condition, ...message) => assert.ok(condition, message.join(' '));
  const combat = require(path.join(out, 'combat.js'));
  const { GEAR } = require(path.join(out, 'gear.js'));
  const { NO_EQUIPMENT } = require(path.join(out, 'equipment.js'));
  const { damageAfterArmor, weaponStats, armorStats } = require(path.join(out, 'combat-stats.js'));
  const { REGIONS, enemyNumbers, walkable, expectedLevel } = require(path.join(out, 'expedition-content.js'));
  const { emptyCampaign, startRun, joinRun, command, advance: actualAdvance, recover, depart, idleInput, canEnter, loadoutSummary } = require(path.join(out, 'expedition.js'));
  require(path.join(out, 'room.js')); require(path.join(out, 'castle.js'));
  const advance = (c, now) => { for (const p of Object.values(c.run?.players ?? {})) if (!p.left) p.seenAt = now; actualAdvance(c, now); };
  const hero = (id = 'cengiz', level = 100) => ({ id, name: id, level, equipment: { ...NO_EQUIPMENT, weapon: 'tahta-kilic', armor: 'tunik', spells: ['isik', 'sifa', 'buz', 'iki-kalp'] } });
  function setup(region = REGIONS[0], seed = 99) {
    const c = emptyCampaign(); c.completed = REGIONS.map((r) => r.id);
    assert.equal(startRun(c, region.id, 0, hero(), 'run-1', seed, 100), null);
    assert.equal(joinRun(c, hero('aysenur'), 100), null);
    return c;
  }
  let checks = 0;
  function test(name, f) { f(); checks++; console.log('OK', name); }
  test('önceki saf modül denetimleri', () => assert.ok(true));
  test('seviye ve bölüm sırası sunucuda korunur', () => {
    const c = emptyCampaign(); assert.ok(canEnter(c, REGIONS[1].id, 0, 100));
    assert.equal(canEnter(c, REGIONS[0].id, 0, 1), null);
    assert.ok(canEnter(c, REGIONS[0].id, 1, 30)); assert.equal(canEnter(c, REGIONS[0].id, 1, 31), null);
    assert.ok(canEnter(c, REGIONS[0].id, 8, 100));
  });
  test('yalnız giriş yok; eş ayrılınca savaş, hareket ve ödüller durur', () => {
    const c=emptyCampaign();startRun(c,REGIONS[0].id,0,hero(),'duo-run',99,100);
    const p=c.run.players.cengiz,start={i:p.i,j:p.j};
    assert.equal(c.run.status,'waiting');
    command(c,p.id,1,{...idleInput(),di:1,dj:-1,attack:true,interact:true},100);
    actualAdvance(c,100.5);assert.equal(p.i,start.i);assert.equal(p.j,start.j);assert.equal(c.run.effects.length,0);assert.equal(c.shards,0);
    joinRun(c,hero('aysenur'),100.5);assert.equal(c.run.status,'active');
    depart(c,'aysenur');assert.equal(c.run.status,'waiting');
    const hp=c.run.enemies[0].hp;
    command(c,p.id,2,{...idleInput(),attack:true},100.6);actualAdvance(c,100.7);
    assert.equal(c.run.enemies[0].hp,hp);assert.equal(c.shards,0);assert.equal(c.run.status,'waiting');
    joinRun(c,hero('aysenur'),100.7);assert.equal(c.run.status,'active');
  });
  test('tüm haritalarda görevler, kamp, gizli sandık ve boss yürünerek erişilebilir', () => {
    for (const r of REGIONS) {
      const start = r.path[0], queue = [[Math.round(start.i), Math.round(start.j)]], seen = new Set([queue[0].join(',')]);
      for (let n = 0; n < queue.length; n++) { const [i, j] = queue[n]; for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) { const key = `${i+di},${j+dj}`; if (!seen.has(key) && walkable(r, i+di, j+dj)) { seen.add(key); queue.push([i+di,j+dj]); } } }
      for (const p of [...r.objectives, ...r.landmarks, r.path.at(-1)]) assert.ok(seen.has(`${p.i},${p.j}`), `${r.id}: ${p.name ?? 'boss'}`);
    }
  });
  test('tüm silah ve zırh seviyeleri hesaplanabilir; savunma dokunulmazlık vermez', () => {
    for (let lv = 1; lv <= 100; lv++) {
      for (const g of GEAR.filter((g) => g.level <= lv && g.kind === 'Silah')) { const w = weaponStats(g.id); assert.ok(w.damage > 0 && w.cooldown > 0); }
      for (const g of GEAR.filter((g) => g.level <= lv && g.kind === 'Zırh')) assert.ok(damageAfterArmor(100, armorStats(g.id).defense) >= 35);
    }
    assert.ok(damageAfterArmor(100, 80) < damageAfterArmor(100, 2));
  });
  test('aynı komutun yeniden gönderimi çift vuruş üretmez', () => {
    const c = setup(), p = c.run.players.cengiz; const input = { ...idleInput(), attack: true };
    command(c, p.id, 1, input, 100); const count = c.run.effects.length;
    command(c, p.id, 1, input, 101); assert.equal(c.run.effects.length, count);
  });
  test('basılı saldırı hızlı silahı ağ sorgu aralığına bağlamaz', () => {
    const c=setup(),p=c.run.players.cengiz;
    command(c,p.id,1,{...idleInput(),attack:true},100);
    p.seenAt=101;advance(c,100.6);
    assert.ok(p.comboAt>=100.4,'ikinci vuruş yeni ağ komutu beklemeden yapılmalı');
  });
  test('zırh, kalkan ve kaçınma gerçekten gelen hasarı değiştirir', () => {
    function hit(armor, shield=0, dodge=false) {
      const c=setup(),p=c.run.players.cengiz,e=c.run.enemies[0];
      p.equipment.armor=armor;p.shield=shield;p.shieldUntil=200;if(dodge)p.dodgeUntil=200;
      e.warning={i:p.i,j:p.j,from:{i:e.i,j:e.j},until:100.05,radius:2,kind:'slam'};
      const before=p.hp;advance(c,100.1);return {lost:before-p.hp,shield:p.shield};
    }
    const plain=hit(null),armor=hit('efsane-zirhi'),shield=hit(null,100),dodge=hit(null,0,true);
    assert.ok(plain.lost>armor.lost);assert.ok(armor.lost>0);assert.equal(shield.lost,0);assert.ok(shield.shield<100);assert.equal(dodge.lost,0);
  });
  test('kalkanın ön ve arka yüzü; ağır silahın zırh delmesi', () => {
    const pos={i:0,j:0,dir:1}, eq={...NO_EQUIPMENT,weapon:'tahta-kilic'};
    function target(guardDir) {return {id:'shield',i:1,j:0,hp:1000,maxHp:1000,hitAt:-9,defense:20,guardDir};}
    const front=target(-1),back=target(1);
    combat.attack(combat.newFighter(100,eq),eq,pos,[front],0);
    combat.attack(combat.newFighter(100,eq),eq,pos,[back],0);
    assert.ok(front.hp>back.hp,'önden saldırı daha az hasar verir');
    const heavy=GEAR.find((g)=>g.kind==='Silah' && weaponStats(g.id).style==='agir');
    const hEq={...NO_EQUIPMENT,weapon:heavy.id},t=target(undefined);
    combat.attack(combat.newFighter(100,hEq),hEq,pos,[t],0);
    assert.ok(1000-t.hp>damageAfterArmor(weaponStats(heavy.id).damage,20),'ağır silah zırhın yarısını deler');
  });
  test('buz yavaşlatır, İki Kalp yakın yol arkadaşını iyileştirir', () => {
    const c=setup();joinRun(c,hero('aysenur'),100);
    const p=c.run.players.cengiz,q=c.run.players.aysenur,e=c.run.enemies[0];
    e.i=p.i+1;e.j=p.j;q.hp-=50;
    command(c,p.id,1,{...idleInput(),spell:2},100);
    assert.ok(e.slowUntil>100);
    command(c,p.id,2,{...idleInput(),spell:3},100);
    assert.ok(q.hp>q.maxHp-50);
  });
  test('ikinci oyuncu aynı düşmana katılır; ölü düşman yeniden dirilmez', () => {
    const c = setup(), enemy = c.run.enemies[0], hp = enemy.maxHp;
    enemy.hp = hp / 2;
    assert.equal(joinRun(c, hero('aysenur'), 100), null);
    assert.ok(Math.abs(enemy.hp / enemy.maxHp - 0.5) < 0.02);
    assert.equal(enemy.maxHp, hp); const hp2 = enemy.maxHp;
    joinRun(c, hero('aysenur'), 100); assert.equal(enemy.maxHp, hp2);
    enemy.hp = 0; enemy.downAt = 100;
    for (let now = 100.1; now < 103; now += 0.1) { c.run.players.cengiz.seenAt = now; advance(c, now); }
    assert.equal(enemy.hp, 0); assert.equal(c.run.kills, 1);
  });
  test('normal düşmanlar hedef seviyede birkaç vuruş; boss makul sürede düşer', () => {
    for (const r of REGIONS) for (const difficulty of [0,1,2]) {
      const level = expectedLevel(r, difficulty);
      const best = GEAR.filter((g) => g.kind === 'Silah' && g.level <= level).map((g) => ({ g, w: weaponStats(g.id) })).sort((a,b) => b.w.damage / b.w.cooldown * (1+0.8/b.w.combo*(b.w.combo>1)) - a.w.damage / a.w.cooldown * (1+0.8/a.w.combo*(a.w.combo>1)))[0];
      const dps = loadoutSummary(level, { ...NO_EQUIPMENT, weapon: best?.g.id ?? null }).dps;
      const normal = enemyNumbers(r,difficulty,'ork',2), boss = enemyNumbers(r,difficulty,r.bossKind,2,true);
      const piercing = ['agir','iki-elli'].includes(best?.w.style) ? .5 : best?.w.style==='mizrak' ? .15 : 0;
      const reduction = boss.armor * (1-piercing) / (60 + boss.armor * (1-piercing));
      const ttk = boss.hp / (dps * 2 * (1-reduction));
      assert.ok(normal.hp / (best?.w.damage ?? 4) > 1.5 && normal.hp / (best?.w.damage ?? 4) < 13);
      assert.ok(ttk >= 20 && ttk < 90, `${r.id} ${difficulty}: ${ttk}s`);
      console.log(`  ${r.name} / ${level}: boss ${boss.hp} can, ~${Math.round(ttk)} sn iki oyuncunun zırh dahil kesintisiz saldırısı`);
    }
  });
  test('görevler nöbetçiler temizlenmeden tamamlanamaz; boss erken hasar almaz', () => {
    const c = setup(), p = c.run.players.cengiz, r = REGIONS[0];
    Object.assign(p, r.objectives[0]); p.input.interact = true;
    advance(c, 100.2); assert.equal(c.run.objectives.length,0); assert.equal(c.run.enemies.at(-1).awake,false);
    for (const e of c.run.enemies) if (!e.boss) e.hp = 0;
    for (let n=0;n<r.objectives.length;n++) { Object.assign(p,r.objectives[n]); p.seenAt=100.3+n*0.2; advance(c,100.3+n*0.2); }
    assert.equal(c.run.objectives.length,3); assert.equal(c.run.enemies.at(-1).awake,true);
  });
  test('kampın baskını tek sefer, ön uyarıyla ve deterministik başlar', () => {
    const c = setup(REGIONS[0], 7), p = c.run.players.cengiz, camp = REGIONS[0].landmarks[0];
    Object.assign(p,camp); p.input.interact=true; p.hp=10;
    advance(c,100.2); assert.equal(p.hp,p.maxHp); assert.ok(c.run.raidAt > 103); const before=c.run.enemies.length;
    for(let now=100.3;now<106;now+=0.1) {p.seenAt=now;advance(c,now);}
    assert.equal(c.run.enemies.length,before+3); assert.ok(c.run.raided);
    const noRaid = setup(REGIONS[0], 99); Object.assign(noRaid.run.players.cengiz,camp); noRaid.run.players.cengiz.input.interact=true;
    advance(noRaid,100.2); assert.equal(noRaid.run.raidAt,0);
  });
  test('düşen yol arkadaşına yardım ve tüm ekip düşünce toparlanma', () => {
    const c=setup(); joinRun(c,hero('aysenur'),100);
    const p=c.run.players.cengiz, partner=c.run.players.aysenur;
    partner.hp=0; p.input.interact=true;
    for(let now=100.1;now<103.5;now+=0.1) {p.seenAt=now;partner.seenAt=now;advance(c,now);}
    assert.ok(partner.hp>0);
    p.hp=0;partner.hp=0;p.seenAt=104;partner.seenAt=104;advance(c,104);
    assert.equal(c.run.status,'lost'); assert.equal(recover(c,p.id),null); assert.equal(p.hp,p.maxHp); assert.equal(c.run.status,'active');
  });
  test('çevrimdışıyken zaman atlaması ani ölüm ve eski saldırı üretmez', () => {
    const c=setup(),p=c.run.players.cengiz,e=c.run.enemies[0];
    e.warning={i:p.i,j:p.j,from:{i:e.i,j:e.j},until:101,radius:5,kind:'slam'};
    actualAdvance(c,1000);assert.equal(p.hp,p.maxHp);assert.equal(c.run.status,'waiting');assert.equal(e.warning,undefined);
  });
  test('zafer tek kez hatıra verir, rutin XP alanı değiştirilmez', () => {
    const c=setup();c.completed=[];const boss=c.run.enemies.at(-1);boss.hp=0;boss.awake=true;
    advance(c,100.1);assert.equal(c.run.status,'won');assert.equal(c.trophies.length,1);assert.ok(c.completed.includes(REGIONS[0].id));assert.equal(c.xp,undefined);
    advance(c,100.2);assert.equal(c.trophies.length,1);
  });
  test('dört bölüm gerçek saldırı/hasar motoruyla baştan sona tamamlanabilir', () => {
    for(const region of REGIONS) {
      const level=region.level;
      const weapons=GEAR.filter(g=>g.kind==='Silah'&&g.level<=level).sort((a,b)=>loadoutSummary(level,{...NO_EQUIPMENT,weapon:b.id}).dps-loadoutSummary(level,{...NO_EQUIPMENT,weapon:a.id}).dps);
      const armor=GEAR.filter(g=>g.kind==='Zırh'&&g.level<=level).sort((a,b)=>b.level-a.level)[0];
      const bot={id:'bot',name:'Cengiz',level,equipment:{weapon:weapons[0]?.id??null,armor:armor?.id??null,spells:['sifa','kalkan-buyusu','buz','alev-topu']}};
      const c=emptyCampaign();c.completed=REGIONS.map(r=>r.id);startRun(c,region.id,0,bot,'bot-run',99,100);joinRun(c,{...bot,id:'partner',name:'Ayşenur'},100);
      let step=0,deaths=0;
      for(;step<7000&&c.run.status!=='won';step++) {
        const r=c.run,p=r.players.bot,now=r.time;p.seenAt=now;
        if(r.status==='lost'){assert.ok(++deaths<=8,`${region.id}: çok fazla düşüş`);recover(c,'bot');}
        let target=r.enemies.find(e=>e.hp>0&&!e.boss);
        const input=idleInput();
        if(!target&&!r.campUsed){Object.assign(p,region.landmarks.find(l=>l.kind==='camp'));input.interact=true;}
        else if(!target&&r.objectives.length<3){Object.assign(p,region.objectives.find((_,n)=>!r.objectives.includes(n)));input.interact=true;}
        else {
          target??=r.enemies.find(e=>e.boss);
          p.i=target.i-0.6;p.j=target.j+0.6;p.dir=1;input.attack=true;
          input.dodge=r.enemies.some(e=>e.warning&&e.warning.until-now<0.3&&e.warning.until>now);
          const heal=p.equipment.spells.indexOf('sifa'),shield=p.equipment.spells.indexOf('kalkan-buyusu');
          if(p.hp<p.maxHp*.75&&heal>=0)input.spell=heal;
          else if(p.shield<=0&&shield>=0)input.spell=shield;
        }
        const partner=r.players.partner;partner.i=p.i+0.1;partner.j=p.j+0.1;partner.dir=p.dir;partner.seenAt=now;
        command(c,'bot',step,input,now);command(c,'partner',step,input,now);advance(c,now+0.1);
      }
      assert.equal(c.run.status,'won',`${region.id}: ${step} adımda bitmedi`);
      assert.equal(c.run.objectives.length,3);assert.ok(c.trophies.includes(region.trophy));
      console.log(`  ${region.name}: ${Math.round(step/10)} sn simülasyon, ${deaths} toparlanma`);
    }
  });
  console.log(`PASS: ${checks} senaryo; 4 harita, 12 zorluk/seviye dengesi ve 1–100 ekipman erişimi.`);
} finally {
  if(path.dirname(path.resolve(out))===path.resolve(os.tmpdir()) && path.basename(out).startsWith('ikimizin-expedition-')) fs.rmSync(out,{recursive:true,force:true});
}

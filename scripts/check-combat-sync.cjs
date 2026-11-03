// node scripts/check-combat-sync.cjs — iki istemci arasındaki görsel olay aktarımı.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ikimizin-combat-sync-'));
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), 'lib/combat-sync.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck', '--esModuleInterop'], { cwd: root, stdio: 'pipe' });
  fs.writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const { attack, cast, newFighter, shotAt, stepEffects } = require(path.join(out, 'combat.js'));
  const { NO_EQUIPMENT } = require(path.join(out, 'equipment.js'));
  const { GEAR } = require(path.join(out, 'gear.js'));
  const { actionHistory, captureAction, parseActionHistory, replayEffects, unseenActions } = require(path.join(out, 'combat-sync.js'));
  const pos = { i: 10, j: 10, dir: -1 };
  const network = (actions) => parseActionHistory(JSON.parse(JSON.stringify(actionHistory(actions, 1200))));
  const seen = new Set();
  const eq = { ...NO_EQUIPMENT, weapon: 'avci-yayi' };
  const fx = attack(newFighter(50, eq), eq, pos, [], 50);
  const first = captureAction('vurus', eq.weapon, 1100, fx);
  assert.equal(unseenActions(network([first]), seen, 1000).length, 1, 'ilk saldırı görünmeli');
  assert.equal(unseenActions(network([first]), seen, 1000).length, 0, 'aynı saldırı yeniden oynatılmamalı');
  const rapid = [first, { ...first, at: 1101 }, { ...first, at: 1102 }];
  assert.equal(unseenActions(network(rapid), seen, 1000).length, 2, 'iki sorgu arasındaki saldırılar kaybolmamalı');
  assert.equal(unseenActions(network(rapid), new Set(), 1200).length, 0, 'yeni kata gelince eski saldırılar oynatılmamalı');
  assert.equal(actionHistory([first], 8000), null, 'eski olay geçmişi temizlenmeli');
  const replay = replayEffects(network([first]).recent[0], 500);
  const arrow = replay.find((e) => e.kind === 'ok');
  assert.ok(arrow && arrow.vi !== undefined && arrow.vj !== undefined, 'karşı ekranda uçan ok olmalı');
  assert.notDeepEqual(shotAt(arrow, 500), shotAt(arrow, 500.2), 'ok hareket etmeli');
  assert.equal(arrow.dir, -1, 'atış anındaki yön korunmalı');
  const [i, j] = shotAt(arrow, 500.2);
  const target = { id: 'remote-target', i, j, hp: 100, maxHp: 100, hitAt: -9 };
  stepEffects(replay, [target], 500.2);
  assert.equal(target.hp, 100, 'uzak ok hedefe ikinci kez hasar vermemeli');
  let cases = 0;
  for (const gear of GEAR.filter((g) => g.kind === 'Silah' || g.kind === 'Büyü')) {
    const isWeapon = gear.kind === 'Silah';
    const equipped = { ...NO_EQUIPMENT, weapon: isWeapon ? gear.id : null, spells: isWeapon ? [] : [gear.id] };
    const fighter = newFighter(100, equipped);
    const original = isWeapon ? attack(fighter, equipped, pos, [], 42) : cast(fighter, equipped, 0, pos, [], 42, true);
    assert.ok(original.length, `${gear.id}: yerel efekt üretilmeli`);
    const action = captureAction(isWeapon ? 'vurus' : 'buyu', gear.id, 1100, original);
    const remote = replayEffects(network([action]).recent[0], 900);
    assert.equal(remote.length, original.length, `${gear.id}: bütün efektler aktarılmalı`);
    for (let n = 0; n < original.length; n++) {
      for (const key of ['kind', 'i', 'j', 'dir', 'vi', 'vj', 'style', 'step', 'value', 'color']) {
        assert.equal(remote[n][key], original[n][key], `${gear.id}: ${key} korunmalı`);
      }
      assert.ok(Math.abs((remote[n].until - remote[n].at) - (original[n].until - original[n].at)) < 1e-9, `${gear.id}: efekt süresi korunmalı`);
      assert.equal(remote[n].visualOnly, true);
      assert.equal(remote[n].damage, undefined);
    }
    cases++;
  }
  assert.equal(parseActionHistory({ kind: 'vurus', id: 'x', at: Infinity }), null);
  const malformed = parseActionHistory({ kind: 'vurus', id: 'x', at: 1100, effects: [{ kind: 'ok', i: NaN, j: 2, dir: 1, until: 1 }] });
  assert.deepEqual(malformed.effects, [], 'geçersiz efektler reddedilmeli');
  console.log(`OK: ilk saldırı, tekrarlar, hızlı saldırılar, kat değişimi, ok uçuşu, hasar yalıtımı ve ${cases} silah/büyü aktarımı.`);
} finally {
  if (path.dirname(path.resolve(out)) === path.resolve(os.tmpdir()) && path.basename(out).startsWith('ikimizin-combat-sync-')) fs.rmSync(out, { recursive: true, force: true });
}

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { Store, fitBounds } = require('../src/core/storage');
const { Session } = require('../src/core/engine');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cron-'));
const model = (name = 'Jogo') => ({ name, stages: [{ name: 'PT', startValue: -30, direction: 'up',
  durationMin: 30, endValue: null, reminders: [{ id: 'r1', minute: -25, text: 'msg' }] }] });

test('salvar e reabrir cronogramas (nova instância do Store)', () => {
  const d = tmp(); const a = new Store(d); const saved = a.saveSchedule(model());
  const got = new Store(d).getSchedule(saved.id);
  assert.equal(got.stages[0].reminders[0].text, 'msg');
  assert.equal(got.stages[0].startValue, -30);
  assert.ok(!fs.readdirSync(path.join(d, 'cronogramas')).some((f) => f.endsWith('.tmp')));
});

test('arquivo corrompido é ignorado sem afetar os demais', () => {
  const d = tmp(); const s = new Store(d); s.saveSchedule(model());
  fs.writeFileSync(path.join(d, 'cronogramas', 'quebrado.json'), '{ nao eh json');
  assert.equal(s.listSchedules().length, 1);
});

test('duplicar e excluir', () => {
  const s = new Store(tmp()); const a = s.saveSchedule(model());
  const b = s.duplicateSchedule(a.id);
  assert.equal(b.name, 'Jogo (cópia)'); assert.notEqual(a.id, b.id);
  s.deleteSchedule(a.id); assert.equal(s.listSchedules().length, 1);
});

test('exportar/importar não sobrescreve existente', () => {
  const s = new Store(tmp()); const a = s.saveSchedule(model());
  const imp = s.importSchedule(s.exportSchedule(a.id));
  assert.equal(imp.name, 'Jogo (importado)');
  assert.equal(s.listSchedules().length, 2);
  assert.equal(s.getSchedule(a.id).name, 'Jogo');
});

test('importação inválida não altera os dados existentes', () => {
  const s = new Store(tmp()); s.saveSchedule(model());
  for (const bad of ['lixo', '{"format":"x"}', '{"format":"cronometro-cronograma","version":99,"schedule":{}}'])
    assert.throws(() => s.importSchedule(bad));
  assert.equal(s.listSchedules().length, 1);
});

test('preferências de tema e volume persistem; valores inválidos são corrigidos', () => {
  const d = tmp(); const s = new Store(d);
  s.setPrefs({ theme: 'dark', volume: 0.3, muted: true });
  assert.deepEqual(new Store(d).getPrefs(), { theme: 'dark', volume: 0.3, muted: true });
  s.setPrefs({ theme: 'neon', volume: 9 });
  assert.deepEqual(s.getPrefs(), { theme: 'system', volume: 1, muted: true });
});

test('sessão em execução é recuperável via disco, sem eventos retroativos', () => {
  const d = tmp(); const s = new Store(d); const T0 = 5e6, M = 60000;
  const sess = new Session(model(), T0); sess.start(T0); sess.tick(T0 + M);
  s.saveSession(sess.snapshot(T0 + M));
  const snap = new Store(d).loadSession();       // “após reiniciar”
  assert.ok(Session.isRecoverable(snap));
  const r = Session.restore(snap, T0 + 40 * M);
  assert.deepEqual(r.tick(T0 + 40 * M), []);
  assert.equal(r.value(T0 + 40 * M), 600);
  s.clearSession(); assert.equal(s.loadSession(), null);
});

test('fitBounds: mantém janela visível; reposiciona se monitor sumiu; limita tamanho', () => {
  const areas = [{ x: 0, y: 0, width: 1920, height: 1040 }];
  assert.deepEqual(fitBounds({ x: 100, y: 50, width: 800, height: 600 }, areas), { x: 100, y: 50, width: 800, height: 600 });
  const off = fitBounds({ x: 4000, y: 100, width: 800, height: 600 }, areas);
  assert.deepEqual(off, { x: 560, y: 220, width: 800, height: 600 });
  const big = fitBounds({ x: 0, y: 0, width: 9000, height: 100 }, areas);
  assert.deepEqual([big.width, big.height], [1920, 320]);
  assert.equal(fitBounds(null, areas).width, 900);
});

test('cronograma de demonstração é semeado só uma vez, mesmo se excluído', () => {
  const { DemoSchedule } = require('../src/core/demo');
  const s = new Store(tmp());
  assert.equal(s.seedDemo(DemoSchedule), true);
  assert.equal(s.listSchedules().length, 1);
  s.deleteSchedule(s.listSchedules()[0].id);
  assert.equal(s.seedDemo(DemoSchedule), false);
  assert.equal(s.listSchedules().length, 0);
});

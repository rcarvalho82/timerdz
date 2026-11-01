'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Session, exportSchedule, parseImport } = require('../src/core/engine');

const M = 60000, T0 = 1_000_000;
const R = (minute, text) => ({ id: text, minute, text });
const st = (o) => ({ name: 'E', startValue: 0, direction: 'up', durationMin: null, endValue: null, reminders: [], ...o });
const sched = (...stages) => ({ name: 'Jogo', stages });
const types = (ev) => ev.map((e) => e.type === 'reminder' ? e.reminder.text : e.type);

test('etapa em −30 inicia parada e alcança 0 após 30 min, gerando fim', () => {
  const s = new Session(sched(st({ startValue: -30, durationMin: 30 })), T0);
  assert.equal(s.value(T0), -1800);
  assert.equal(s.status, 'prepared');
  s.start(T0);
  assert.deepEqual(types(s.tick(T0 + 29 * M)), []);
  assert.deepEqual(types(s.tick(T0 + 30 * M)), ['stageEnd']);
  assert.equal(s.value(T0 + 30 * M), 0);
});

test('próxima etapa começa no valor configurado, parada, sem herdar excedente', () => {
  const s = new Session(sched(st({ durationMin: 45 }), st({ startValue: 46, endValue: 90 })), T0);
  s.start(T0); s.tick(T0 + 55 * M);
  assert.equal(s.value(T0 + 55 * M), 3300);
  assert.ok(s.advance());
  assert.equal(s.status, 'prepared');
  assert.equal(s.value(T0 + 56 * M), 46 * 60);
  assert.equal(s.view(T0).overdue, false);
});

test('valor inicial pode ser ajustado na sessão sem alterar o modelo', () => {
  const model = sched(st({ startValue: 0 }), st({ startValue: 46 }));
  const s = new Session(model, T0);
  s.advance(50);
  assert.equal(s.value(T0), 3000);
  assert.equal(model.stages[1].startValue, 46);
});

test('sem duração/valor final não há alerta de fim; continua contando', () => {
  const s = new Session(sched(st({})), T0);
  s.start(T0);
  assert.deepEqual(types(s.tick(T0 + 500 * M)), []);
  assert.equal(s.view(T0 + 500 * M).overdue, false);
});

test('valor final explícito alerta no ponto certo, uma vez; indicador permanece', () => {
  const s = new Session(sched(st({ startValue: 46, endValue: 90 })), T0);
  s.start(T0);
  assert.deepEqual(types(s.tick(T0 + 43 * M)), []);
  assert.deepEqual(types(s.tick(T0 + 44 * M)), ['stageEnd']); // 46+44=90
  assert.deepEqual(types(s.tick(T0 + 50 * M)), []);
  assert.equal(s.value(T0 + 50 * M), 96 * 60); // continua contando
  assert.equal(s.view(T0 + 50 * M).overdue, true);
});

test('lembrete dispara no minuto; lembrete exatamente no valor inicial dispara ao iniciar', () => {
  const s = new Session(sched(st({ startValue: -30, reminders: [R(-30, 'prep'), R(-25, 'msg')] })), T0);
  assert.deepEqual(types(s.start(T0)), ['prep']);
  assert.deepEqual(types(s.tick(T0 + 4 * M)), []);
  assert.deepEqual(types(s.tick(T0 + 5 * M)), ['msg']);
});

test('lembretes de etapa anterior não disparam após transição', () => {
  const s = new Session(sched(st({ reminders: [R(50, 'velho')] }), st({})), T0);
  s.start(T0); s.advance(); s.start(T0 + M);
  assert.deepEqual(types(s.tick(T0 + 100 * M)), []);
});

test('ajuste manual para além do lembrete não o dispara; retroceder permite redisparo', () => {
  const s = new Session(sched(st({ reminders: [R(28, 'a'), R(30, 'b')] })), T0);
  s.start(T0);
  s.tick(T0 + 27 * M);
  s.adjust(2, T0 + 27 * M); // 27 -> 29, estando rodando
  assert.equal(s.value(T0 + 27 * M), 29 * 60);
  assert.deepEqual(types(s.tick(T0 + 27 * M)), []);
  assert.deepEqual(types(s.tick(T0 + 28 * M)), ['b']); // 30 alcançado naturalmente
  s.adjust(-3, T0 + 28 * M); // volta para 27
  assert.deepEqual(types(s.tick(T0 + 28 * M)), []);
  assert.deepEqual(types(s.tick(T0 + 31 * M)), ['a', 'b']);
});

test('pausa congela o relógio e a avaliação; continuar não refaz disparos', () => {
  const s = new Session(sched(st({ reminders: [R(10, 'x')] })), T0);
  s.start(T0); s.tick(T0 + 5 * M); s.pause(T0 + 5 * M);
  assert.deepEqual(types(s.tick(T0 + 60 * M)), []);
  assert.equal(s.value(T0 + 60 * M), 300);
  s.start(T0 + 60 * M);
  assert.deepEqual(types(s.tick(T0 + 64 * M)), []);
  assert.deepEqual(types(s.tick(T0 + 65 * M)), ['x']);
});

test('recuperação: recalcula pelo tempo real, sem eventos retroativos', () => {
  const s = new Session(sched(st({ durationMin: 20, reminders: [R(5, 'a'), R(10, 'b')] })), T0);
  s.start(T0); s.tick(T0 + 2 * M);
  const snap = JSON.parse(JSON.stringify(s.snapshot(T0 + 2 * M)));
  const r = Session.restore(snap, T0 + 25 * M);
  assert.equal(r.value(T0 + 25 * M), 25 * 60);
  assert.deepEqual(types(r.tick(T0 + 25 * M)), []); // nada retroativo
  assert.equal(r.view(T0 + 25 * M).overdue, true);  // só o indicador visual
  assert.equal(r.view(T0 + 25 * M).current.text, 'b');
});

test('recuperação preserva estado pausado; sessão não iniciada não é recuperável', () => {
  const s = new Session(sched(st({})), T0);
  assert.equal(Session.isRecoverable(s.snapshot(T0)), false);
  s.start(T0); s.pause(T0 + 3 * M);
  const r = Session.restore(s.snapshot(T0 + 3 * M), T0 + 999 * M);
  assert.equal(r.status, 'paused');
  assert.equal(r.value(T0 + 999 * M), 180);
});

test('editar o modelo não altera a sessão carregada', () => {
  const model = sched(st({ reminders: [R(1, 'orig')] }));
  const s = new Session(model, T0);
  model.stages[0].reminders[0].text = 'mudou';
  assert.equal(s.stage.reminders[0].text, 'orig');
});

test('progresso da cor é proporcional ao intervalo entre lembretes', () => {
  const s = new Session(sched(st({ reminders: [R(0, 'a'), R(10, 'b'), R(12, 'c')] })), T0);
  s.start(T0);
  assert.equal(s.view(T0 + 5 * M).progress, 0.5);
  assert.equal(s.view(T0 + 11 * M).progress, 0.5);
  assert.equal(s.view(T0 + 20 * M).progress, 0); // sem próximo: verde
});

test('exportar e importar preserva dados; arquivos inválidos são rejeitados', () => {
  const model = sched(st({ startValue: -30, durationMin: 30, reminders: [R(-25, 'm')] }));
  const back = parseImport(exportSchedule(model));
  assert.equal(back.stages[0].reminders[0].text, 'm');
  assert.equal(back.stages[0].startValue, -30);
  assert.throws(() => parseImport('{{nao-json'), /JSON/);
  assert.throws(() => parseImport('{"format":"outro"}'), /não é um cronograma/);
  assert.throws(() => parseImport(JSON.stringify({ format: 'cronometro-cronograma', version: 1,
    schedule: { name: 'x', stages: [{ name: 'a', startValue: 'zero', direction: 'up', reminders: [] }] } })), /inválido/);
});

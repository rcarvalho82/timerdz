'use strict';
// Núcleo temporal. Sem DOM, sem timers: o tempo "agora" (ms) é sempre injetado.
// Valores do relógio são guardados em SEGUNDOS; lembretes e durações em MINUTOS.

const SCHEMA_VERSION = 1;
const clone = (o) => JSON.parse(JSON.stringify(o));

function stageEnd(stage) {
  if (stage.endValue != null) return stage.endValue;
  if (stage.durationMin != null)
    return stage.startValue + (stage.direction === 'down' ? -1 : 1) * stage.durationMin;
  return null;
}

// Passou por `m` (segundos) ao ir de a para b? Início aberto, fim fechado.
function crossed(a, b, m) {
  return b >= a ? a < m && m <= b : a > m && m >= b;
}

function sortedReminders(stage) {
  const asc = stage.direction !== 'down';
  return [...stage.reminders].sort((x, y) => (asc ? x.minute - y.minute : y.minute - x.minute));
}

class Session {
  constructor(schedule, now, sessionName) {
    this.name = sessionName || schedule.name;
    this.stages = clone(schedule.stages); // cópia independente do modelo
    this.stageIndex = 0;
    this.prepare(0, null);
  }

  get stage() { return this.stages[this.stageIndex]; }

  // Deixa a etapa parada, no valor inicial (padrão ou ajustado só para esta sessão).
  prepare(index, startOverrideMin) {
    this.stageIndex = index;
    const s = this.stage;
    this.status = 'prepared';
    this.base = (startOverrideMin != null ? startOverrideMin : s.startValue) * 60;
    this.anchor = null;
    this.lastValue = this.base;
    this.endAlerted = false;
  }

  value(now) {
    if (this.status !== 'running') return this.base;
    const dir = this.stage.direction === 'down' ? -1 : 1;
    return this.base + (dir * (now - this.anchor)) / 1000;
  }

  start(now) {
    if (this.status === 'running') return [];
    const first = this.status === 'prepared';
    this.status = 'running';
    this.anchor = now;
    if (first) {
      // Na primeira partida, lembretes exatamente no valor inicial disparam.
      const dir = this.stage.direction === 'down' ? -1 : 1;
      this.lastValue = this.base - dir * 1e-3;
      return this.tick(now);
    }
    this.lastValue = this.base; // continuar não dispara nada
    return [];
  }

  pause(now) {
    if (this.status !== 'running') return;
    this.base = this.value(now);
    this.status = 'paused';
    this.anchor = null;
    this.lastValue = this.base;
  }

  // Descarta progresso (a UI deve confirmar antes). Mantém a etapa atual.
  restart(startOverrideMin) { this.prepare(this.stageIndex, startOverrideMin); }

  // Avança e deixa a próxima etapa PARADA. Nada herdado da anterior.
  advance(startOverrideMin) {
    if (this.stageIndex >= this.stages.length - 1) return false;
    this.prepare(this.stageIndex + 1, startOverrideMin);
    return true;
  }

  // Ajuste manual em minutos (pode ser negativo). Não dispara nada, não mexe nos lembretes.
  adjust(deltaMin, now) {
    const v = this.value(now) + deltaMin * 60;
    this.base = v;
    if (this.status === 'running') this.anchor = now;
    this.lastValue = v;
  }

  tick(now) {
    if (this.status !== 'running') return [];
    const v = this.value(now);
    const events = [];
    const sec = (r) => r.minute * 60;
    for (const r of sortedReminders(this.stage))
      if (crossed(this.lastValue, v, sec(r))) events.push({ type: 'reminder', reminder: r });
    const end = stageEnd(this.stage);
    if (end != null && !this.endAlerted && crossed(this.lastValue, v, end * 60)) {
      this.endAlerted = true;
      events.push({ type: 'stageEnd' });
    }
    this.lastValue = v;
    return events;
  }

  // Posição de exibição: lembrete atual/anterior/próximo e progresso (0..1) p/ cor.
  view(now) {
    const v = this.value(now);
    const list = sortedReminders(this.stage);
    const asc = this.stage.direction !== 'down';
    const passed = (r) => (asc ? r.minute * 60 <= v : r.minute * 60 >= v);
    let cur = -1;
    list.forEach((r, i) => { if (passed(r)) cur = i; });
    const next = list[cur + 1] || null;
    let progress = 0;
    if (cur >= 0 && next) {
      const a = list[cur].minute * 60, b = next.minute * 60;
      progress = Math.min(1, Math.max(0, (v - a) / (b - a)));
    }
    return {
      value: v, status: this.status, current: list[cur] || null,
      previous: list[cur - 1] || null, next, progress,
      overdue: this.endAlerted, end: stageEnd(this.stage),
    };
  }

  snapshot(wallNow) {
    return { v: SCHEMA_VERSION, name: this.name, stages: this.stages, stageIndex: this.stageIndex,
      status: this.status, base: this.base, anchor: this.anchor, lastValue: this.lastValue,
      endAlerted: this.endAlerted, savedAt: wallNow };
  }

  // Recuperação: recalcula pelo tempo real e NÃO gera eventos (sem sons retroativos).
  static restore(snap, wallNow) {
    const s = Object.create(Session.prototype);
    Object.assign(s, clone(snap));
    if (s.status === 'running') {
      const v = s.value(wallNow);
      const end = stageEnd(s.stage);
      if (end != null && !s.endAlerted && crossed(s.lastValue, v, end * 60)) s.endAlerted = true; // só o indicador
      s.lastValue = v;
    }
    return s;
  }
  // Só vale oferecer recuperação se houve relógio iniciado.
  static isRecoverable(snap) { return !!snap && snap.status !== 'prepared'; }
}

// ---------- Importação / exportação (JSON versionado) ----------
function validateSchedule(o) {
  const err = (m) => { throw new Error('Cronograma inválido: ' + m); };
  if (!o || typeof o !== 'object') err('não é um objeto');
  if (typeof o.name !== 'string' || !o.name.trim()) err('nome ausente');
  if (!Array.isArray(o.stages) || !o.stages.length) err('sem etapas');
  const num = (x) => typeof x === 'number' && Number.isFinite(x);
  const stages = o.stages.map((s, i) => {
    if (!s || typeof s.name !== 'string') err(`etapa ${i + 1} sem nome`);
    if (!Number.isInteger(s.startValue)) err(`etapa ${i + 1}: valor inicial inválido`);
    if (!['up', 'down'].includes(s.direction)) err(`etapa ${i + 1}: direção inválida`);
    if (s.durationMin != null && !(num(s.durationMin) && s.durationMin > 0)) err(`etapa ${i + 1}: duração inválida`);
    if (s.endValue != null && !Number.isInteger(s.endValue)) err(`etapa ${i + 1}: valor final inválido`);
    if (!Array.isArray(s.reminders)) err(`etapa ${i + 1}: lembretes inválidos`);
    const reminders = s.reminders.map((r, j) => {
      if (!r || !Number.isInteger(r.minute) || typeof r.text !== 'string')
        err(`etapa ${i + 1}, lembrete ${j + 1} inválido`);
      return { id: String(r.id ?? `${i}-${j}`), minute: r.minute, text: r.text };
    });
    return { name: s.name, startValue: s.startValue, direction: s.direction,
      durationMin: s.durationMin ?? null, endValue: s.endValue ?? null, reminders };
  });
  return { name: o.name.trim(), stages };
}

function exportSchedule(schedule) {
  return JSON.stringify({ format: 'cronometro-cronograma', version: SCHEMA_VERSION, schedule }, null, 2);
}

function parseImport(text) {
  let o;
  try { o = JSON.parse(text); } catch { throw new Error('Arquivo não é um JSON válido.'); }
  if (!o || o.format !== 'cronometro-cronograma') throw new Error('Arquivo não é um cronograma deste aplicativo.');
  if (o.version !== SCHEMA_VERSION) throw new Error(`Versão ${o.version} não suportada.`);
  return validateSchedule(o.schedule);
}

const __api = { Session, stageEnd, validateSchedule, exportSchedule, parseImport, SCHEMA_VERSION };
if (typeof module !== "undefined") module.exports = __api; else window.Engine = __api;

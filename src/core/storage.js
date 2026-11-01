'use strict';
// Persistência local em arquivos JSON. Gravação atômica (arquivo temporário + rename).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateSchedule, exportSchedule, parseImport } = require('./engine');

const DEFAULT_PREFS = { theme: 'system', volume: 0.7, muted: false };

function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

class Store {
  constructor(dir) {
    this.dir = dir;
    this.schedDir = path.join(dir, 'cronogramas');
    fs.mkdirSync(this.schedDir, { recursive: true });
  }
  _f(name) { return path.join(this.dir, name); }
  _sf(id) {
    if (!/^[\w-]+$/.test(id)) throw new Error('Identificador inválido.');
    return path.join(this.schedDir, `${id}.json`);
  }

  // ---- cronogramas ----
  listSchedules() {
    const out = [];
    for (const f of fs.readdirSync(this.schedDir).filter((x) => x.endsWith('.json'))) {
      const o = readJson(path.join(this.schedDir, f));
      try { out.push({ id: path.basename(f, '.json'), ...validateSchedule(o) }); } catch { /* arquivo corrompido é ignorado */ }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
  getSchedule(id) { return this.listSchedules().find((s) => s.id === id) || null; }
  saveSchedule(sch) {
    const clean = validateSchedule(sch);
    const id = sch.id || crypto.randomUUID();
    writeAtomic(this._sf(id), JSON.stringify(clean, null, 2));
    return { id, ...clean };
  }
  deleteSchedule(id) { fs.rmSync(this._sf(id), { force: true }); }
  _uniqueName(base) {
    const names = new Set(this.listSchedules().map((s) => s.name));
    if (!names.has(base)) return base;
    for (let n = 2; ; n++) if (!names.has(`${base} ${n}`)) return `${base} ${n}`;
  }
  duplicateSchedule(id) {
    const s = this.getSchedule(id);
    if (!s) throw new Error('Cronograma não encontrado.');
    return this.saveSchedule({ name: this._uniqueName(`${s.name} (cópia)`), stages: s.stages });
  }
  exportSchedule(id) {
    const s = this.getSchedule(id);
    if (!s) throw new Error('Cronograma não encontrado.');
    return exportSchedule({ name: s.name, stages: s.stages });
  }
  // Nunca sobrescreve: nome repetido vira "Nome (importado)". Falha não altera nada.
  importSchedule(text) {
    const parsed = parseImport(text);
    parsed.name = this._uniqueName(
      this.listSchedules().some((s) => s.name === parsed.name) ? `${parsed.name} (importado)` : parsed.name);
    return this.saveSchedule(parsed);
  }

  // Copia o cronograma de demonstração apenas na 1ª execução (não volta se for excluído).
  seedDemo(demo) {
    const m = this._f('demo-semeada');
    if (fs.existsSync(m)) return false;
    this.saveSchedule(demo); writeAtomic(m, '1'); return true;
  }

  // ---- preferências ----
  getPrefs() {
    const p = readJson(this._f('preferencias.json'), {}) || {};
    return {
      theme: ['system', 'light', 'dark'].includes(p.theme) ? p.theme : DEFAULT_PREFS.theme,
      volume: Number.isFinite(p.volume) ? Math.min(1, Math.max(0, p.volume)) : DEFAULT_PREFS.volume,
      muted: typeof p.muted === 'boolean' ? p.muted : DEFAULT_PREFS.muted,
    };
  }
  setPrefs(patch) {
    const next = { ...this.getPrefs(), ...patch };
    writeAtomic(this._f('preferencias.json'), JSON.stringify(next, null, 2));
    return this.getPrefs();
  }

  // ---- janela ----
  getWindow() { return readJson(this._f('janela.json')); }
  setWindow(b) { writeAtomic(this._f('janela.json'), JSON.stringify(b)); }

  // ---- sessão para recuperação ----
  saveSession(snap) { writeAtomic(this._f('sessao-ativa.json'), JSON.stringify(snap)); }
  loadSession() { return readJson(this._f('sessao-ativa.json')); }
  clearSession() { fs.rmSync(this._f('sessao-ativa.json'), { force: true }); }
}

// Ajusta a janela salva à área de trabalho atual (monitor removido, resolução menor etc.).
function fitBounds(b, areas, def = { width: 900, height: 700 }, min = { width: 420, height: 320 }) {
  const primary = areas[0];
  const big = (a) => a.width * a.height;
  const maxArea = areas.reduce((m, a) => (big(a) > big(m) ? a : m), primary);
  if (!b || ![b.width, b.height].every(Number.isFinite)) b = { ...def };
  const width = Math.min(Math.max(b.width, min.width), maxArea.width);
  const height = Math.min(Math.max(b.height, min.height), maxArea.height);
  const visible = Number.isFinite(b.x) && Number.isFinite(b.y) && areas.some((a) =>
    Math.min(b.x + width, a.x + a.width) - Math.max(b.x, a.x) >= 100 &&
    Math.min(b.y + height, a.y + a.height) - Math.max(b.y, a.y) >= 100);
  return visible ? { x: b.x, y: b.y, width, height }
    : { x: primary.x + Math.floor((primary.width - width) / 2), y: primary.y + Math.floor((primary.height - height) / 2), width, height };
}

module.exports = { Store, fitBounds, writeAtomic };

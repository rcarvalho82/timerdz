'use strict';
(() => {
const $ = (id) => document.getElementById(id), api = window.api, E = window.Engine;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (e) => String(e && e.message || e).replace(/^.*Error: /, '');
const num = (v) => (v === '' ? NaN : Number(v));
const uid = () => 'r' + Math.random().toString(36).slice(2, 9);
const blank = () => ({ name: 'Nova etapa', startValue: 0, direction: 'up', durationMin: null, endValue: null, reminders: [] });
let sch, sel = 0, timer = null, dirty = false, status = '', failed = false;

async function open(id) {
  const s = id ? (await api.listSchedules()).find((x) => x.id === id) : null;
  sch = s ? JSON.parse(JSON.stringify(s)) : { name: 'Novo cronograma', stages: [blank()] };
  sel = 0; dirty = false; failed = false; status = s ? 'Salvo' : 'Novo, ainda não salvo';
  window.UI.show('edit'); draw();
}
function setStatus(t) { status = t; const el = $('eStatus'); if (el) el.textContent = t; }
function changed() { dirty = true; setStatus('Alterações não salvas'); clearTimeout(timer); timer = setTimeout(save, 800); }
async function save() {
  clearTimeout(timer);
  try { const r = await api.saveSchedule(sch); sch.id = r.id; dirty = false; failed = false; setStatus('Salvo às ' + new Date().toLocaleTimeString('pt-BR')); return true; }
  catch (e) { failed = true; setStatus('Não salvo: ' + clean(e)); return false; }
}
function hint() {
  const s = sch.stages[sel], el = $('eHint'); if (!el) return;
  const end = E.stageEnd(s);
  el.textContent = end == null ? 'Sem aviso de fim: a etapa só termina quando você avançar.'
    : s.endValue != null ? `Critério: valor final explícito. Aviso ao alcançar ${end}.`
    : `Critério: duração prevista. Aviso ao alcançar ${end} (início ${s.startValue} ${s.direction === 'down' ? '−' : '+'} ${s.durationMin} min).`;
}
function draw() {
  const s = sch.stages[sel], crit = s.endValue != null ? 'end' : s.durationMin != null ? 'dur' : 'none';
  const stages = sch.stages.map((x, i) => `<li class="${i === sel ? 'on' : ''}"><button class="grow left" data-act="sel" data-i="${i}">${i + 1}. ${esc(x.name)}</button>
    <button class="sm" data-act="up" data-i="${i}" aria-label="Subir etapa">↑</button><button class="sm" data-act="down" data-i="${i}" aria-label="Descer etapa">↓</button>
    <button class="sm" data-act="del" data-i="${i}" aria-label="Excluir etapa" ${sch.stages.length < 2 ? 'disabled' : ''}>✕</button></li>`).join('');
  const rems = s.reminders.map((r) => `<tr><td><input type="number" step="1" value="${r.minute}" data-rid="${r.id}" data-f="minute" aria-label="Minuto"></td>
    <td><input type="text" class="wide" value="${esc(r.text)}" data-rid="${r.id}" data-f="text" aria-label="Mensagem"></td>
    <td class="nw"><button class="sm" data-act="rup" data-rid="${r.id}" aria-label="Subir lembrete">↑</button><button class="sm" data-act="rdown" data-rid="${r.id}" aria-label="Descer lembrete">↓</button><button class="sm" data-act="rdel" data-rid="${r.id}" aria-label="Excluir lembrete">✕</button></td></tr>`).join('');
  $('vEdit').innerHTML = `<header><div class="hr grow"><button data-act="back">Voltar</button><input id="eName" class="wide" value="${esc(sch.name)}" aria-label="Nome do cronograma"></div>
    <div class="hr"><span id="eStatus" class="mut" role="status">${esc(status)}</span><button data-act="save" class="primary sm2">Salvar</button></div></header>
    <div class="scroll ed"><aside><ul class="stages">${stages}</ul><button data-act="add">Adicionar etapa</button></aside>
    <section><div class="form">
      <label>Nome da etapa <input class="wide" data-sf="name" value="${esc(s.name)}"></label>
      <label>Valor inicial do relógio (min) <input type="number" step="1" data-sf="startValue" value="${s.startValue}"></label>
      <label>Relógio <select data-sf="direction"><option value="up" ${s.direction === 'up' ? 'selected' : ''}>Crescente</option><option value="down" ${s.direction === 'down' ? 'selected' : ''}>Regressivo</option></select></label>
      <label>Fim previsto <select data-sf="crit"><option value="none" ${crit === 'none' ? 'selected' : ''}>Nenhum</option><option value="dur" ${crit === 'dur' ? 'selected' : ''}>Duração (min)</option><option value="end" ${crit === 'end' ? 'selected' : ''}>Valor final do relógio</option></select>
        ${crit === 'dur' ? `<input type="number" step="any" min="1" data-sf="durationMin" value="${s.durationMin}">` : ''}${crit === 'end' ? `<input type="number" step="1" data-sf="endValue" value="${s.endValue}">` : ''}</label>
      <p id="eHint" class="mut"></p></div>
      <h3>Lembretes</h3><table><thead><tr><th>Tempo (min)</th><th>Mensagem</th><th></th></tr></thead><tbody>${rems}</tbody>
      <tfoot><tr><td><input id="aMin" type="number" step="1" placeholder="min" aria-label="Novo: minuto"></td><td><input id="aTxt" class="wide" placeholder="Mensagem" aria-label="Novo: mensagem"></td><td><button data-act="radd">Adicionar</button></td></tr></tfoot></table>
      <p class="mut">Os lembretes disparam sempre pela ordem do relógio; a ordem manual vale só para esta lista.</p></section></div>`;
  hint();
}
const sortByTime = (s) => { const d = s.direction === 'down' ? -1 : 1; s.reminders.sort((a, b) => d * (a.minute - b.minute)); };
const swap = (a, i, j) => { if (j >= 0 && j < a.length) [a[i], a[j]] = [a[j], a[i]]; };

function addReminder() {
  const m = num($('aMin').value), t = $('aTxt').value.trim(), s = sch.stages[sel];
  if (!Number.isInteger(m) || !t) { setStatus('Informe o minuto (inteiro) e a mensagem.'); return; }
  s.reminders.push({ id: uid(), minute: m, text: t }); sortByTime(s); changed(); draw(); $('aMin').focus();
}
$('vEdit').addEventListener('input', (e) => {
  const t = e.target, s = sch.stages[sel];
  if (t.id === 'eName') sch.name = t.value;
  else if (t.dataset.f) { const r = s.reminders.find((x) => x.id === t.dataset.rid); r[t.dataset.f] = t.dataset.f === 'minute' ? num(t.value) : t.value; }
  else if (t.dataset.sf && t.dataset.sf !== 'crit' && t.dataset.sf !== 'direction') s[t.dataset.sf] = t.dataset.sf === 'name' ? t.value : num(t.value);
  else return;
  changed(); hint();
  if (t.dataset.sf === 'name') document.querySelector('.stages .on .left').textContent = `${sel + 1}. ${t.value}`;
});
$('vEdit').addEventListener('change', (e) => {
  const t = e.target, s = sch.stages[sel];
  if (t.dataset.f === 'minute') { // reordena por tempo e devolve o foco ao mesmo lembrete
    sortByTime(s); draw(); const n = document.querySelector(`[data-rid="${t.dataset.rid}"][data-f="text"]`); if (n) n.focus();
  } else if (t.dataset.sf === 'direction') { s.direction = t.value; sortByTime(s); changed(); draw(); }
  else if (t.dataset.sf === 'crit') {
    s.durationMin = t.value === 'dur' ? (s.durationMin ?? 30) : null;
    s.endValue = t.value === 'end' ? (s.endValue ?? s.startValue + 30) : null; changed(); draw();
  }
});
$('vEdit').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.target.id === 'aMin' || e.target.id === 'aTxt')) { e.preventDefault(); addReminder(); } });
$('vEdit').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const i = Number(b.dataset.i), s = sch.stages[sel], ri = s.reminders.findIndex((x) => x.id === b.dataset.rid);
  switch (b.dataset.act) {
    case 'save': return void (await save());
    case 'back':
      if (dirty && !(await save()) && !(await window.UI.ask('Alterações não salvas', 'O cronograma tem erros e não pôde ser salvo. Sair e descartar as alterações?', 'Descartar'))) return;
      return window.Library.open();
    case 'sel': sel = i; return draw();
    case 'add': sch.stages.push(blank()); sel = sch.stages.length - 1; changed(); return draw();
    case 'up': swap(sch.stages, i, i - 1); if (sel === i) sel = i - 1; else if (sel === i - 1) sel = i; changed(); return draw();
    case 'down': swap(sch.stages, i, i + 1); if (sel === i) sel = i + 1; else if (sel === i + 1) sel = i; changed(); return draw();
    case 'del':
      if (!(await window.UI.ask('Excluir etapa', `Excluir "${sch.stages[i].name}" e seus lembretes?`, 'Excluir'))) return;
      sch.stages.splice(i, 1); sel = Math.min(sel, sch.stages.length - 1); changed(); return draw();
    case 'radd': return addReminder();
    case 'rup': swap(s.reminders, ri, ri - 1); changed(); return draw();
    case 'rdown': swap(s.reminders, ri, ri + 1); changed(); return draw();
    case 'rdel': s.reminders.splice(ri, 1); changed(); return draw();
  }
});
window.Editor = { open };
})();

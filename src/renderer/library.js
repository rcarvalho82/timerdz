'use strict';
(() => {
const $ = (id) => document.getElementById(id), api = window.api;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (e) => String(e && e.message || e).replace(/^.*Error: /, '');
let list = [], msg = '';

function askName(def) {
  return new Promise((res) => {
    const d = $('sdlg'), i = $('sName2'); i.value = def; d.returnValue = 'no';
    d.onclose = () => res(d.returnValue === 'ok' ? (i.value.trim() || def) : null);
    d.showModal(); i.select();
  });
}
$('sCancel').onclick = () => $('sdlg').close('no');


function themeSelect() {
  const cur = window.UI.getTheme(), o = [['system', 'Seguir o Windows'], ['light', 'Claro'], ['dark', 'Escuro']];
  return `<label class="mut">Tema <select id="libTheme" aria-label="Tema">${o.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
}
async function open(note) {
  msg = note || '';
  window.UI.show('lib');
  try { list = await api.listSchedules(); } catch (e) { list = []; msg = 'Não foi possível ler os cronogramas: ' + clean(e); }
  draw();
}
function draw() {
  const rows = list.map((s) => `<li class="item"><div class="grow"><strong>${esc(s.name)}</strong>
    <div class="mut">${s.stages.length} etapas · ${s.stages.reduce((n, x) => n + x.reminders.length, 0)} lembretes</div></div>
    <div class="row"><button class="primary sm2" data-act="load" data-id="${s.id}">Carregar</button>
    <button data-act="edit" data-id="${s.id}">Editar</button><button data-act="dup" data-id="${s.id}">Duplicar</button>
    <button data-act="exp" data-id="${s.id}">Exportar</button><button data-act="del" data-id="${s.id}">Excluir</button></div></li>`).join('');
  $('vLib').innerHTML = `<header><div class="stage">Biblioteca de cronogramas</div>
    <div class="hr">${themeSelect()}<button data-act="new" class="primary sm2">Novo cronograma</button><button data-act="imp">Importar</button></div></header>
    <div class="scroll"><p class="mut" role="status">${esc(msg)}</p>
    <ul class="items">${rows || '<li class="mut">Nenhum cronograma. Crie um novo ou importe um arquivo.</li>'}</ul></div>`;
}
$('vLib').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const id = b.dataset.id, s = list.find((x) => x.id === id);
  try {
    switch (b.dataset.act) {
      case 'new': return window.Editor.open(null);
      case 'edit': return window.Editor.open(id);
      case 'load': { const n = await askName(s.name); if (n) window.UI.startSession(s, n); return; }
      case 'dup': { const c = await api.duplicateSchedule(id); return open(`Duplicado como "${c.name}".`); }
      case 'del': if (await window.UI.ask('Excluir cronograma', `Excluir "${s.name}"? Esta ação não pode ser desfeita.`, 'Excluir')) { await api.deleteSchedule(id); open('Cronograma excluído.'); } return;
      case 'exp': { const r = await api.exportSchedule(id); return open(r.ok ? 'Exportado para ' + r.path : 'Exportação cancelada.'); }
      case 'imp': { const r = await api.importSchedule(); if (r.ok) return open(`Importado como "${r.schedule.name}".`); return open(r.error ? 'Importação rejeitada: ' + r.error : 'Importação cancelada.'); }
    }
  } catch (err) { open('Erro: ' + clean(err)); }
});
$('vLib').addEventListener('change', (e) => { if (e.target.id === 'libTheme') window.UI.setTheme(e.target.value); });
window.Library = { open };
})();

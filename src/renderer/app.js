'use strict';
(() => {
const { Session } = window.Engine, api = window.api;
const $ = (id) => document.getElementById(id);
let session = null, prefs = { theme: 'system', volume: 0.7, muted: false }, ac = null, lastSave = 0;

// ---------- som (sintetizado localmente; sem arquivos externos) ----------
function beep(kind) {
  if (prefs.muted || prefs.volume <= 0) return;
  ac = ac || new AudioContext();
  if (ac.state === 'suspended') ac.resume();
  const notes = kind === 'end' ? [[523, 0], [392, .22], [262, .44]] : [[880, 0], [1175, .16]];
  for (const [f, t] of notes) {
    const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + t;
    o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(prefs.volume * 0.6, t0 + .02);
    g.gain.linearRampToValueAtTime(0, t0 + .2); o.start(t0); o.stop(t0 + .22);
  }
}

// ---------- utilidades ----------
const fmt = (sec) => {
  const n = sec < 0 ? Math.ceil(sec) : Math.floor(sec), a = Math.abs(n);
  return `${n < 0 ? '−' : ''}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
};
const fmtMin = (m) => (m < 0 ? '−' : '') + Math.abs(m) + ' min';
const remText = (r) => (r ? `${fmtMin(r.minute)} · ${r.text}` : '');
function ask(title, msg, ok, no = 'Cancelar') {
  return new Promise((res) => {
    $('dTitle').textContent = title; $('dMsg').textContent = msg; $('dOk').textContent = ok; $('dNo').textContent = no;
    const d = $('dlg'); d.returnValue = 'no'; d.onclose = () => res(d.returnValue === 'ok'); d.showModal();
  });
}
function applyTheme() { document.documentElement.dataset.theme = prefs.theme === 'system' ? '' : prefs.theme; }

// ---------- persistência da sessão ----------
function persist() {
  if (!session) return;
  const active = session.status !== 'prepared';
  api.setSessionActive(active);
  if (active) api.saveSession(session.snapshot(Date.now())); else api.clearSession();
  lastSave = Date.now();
}

// ---------- ações ----------
function handle(events) {
  if (events.some((e) => e.type === 'stageEnd')) beep('end');
  else if (events.length) beep('rem');
  if (events.some((e) => e.type === 'reminder')) { const c = $('cur'); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }
}
function toggle() {
  const now = Date.now();
  if (session.status === 'running') session.pause(now); else handle(session.start(now));
  persist(); render();
}
async function restart() {
  if (session.status !== 'prepared' && !(await ask('Reiniciar etapa', 'O progresso desta etapa será descartado e o relógio voltará ao valor inicial, parado.', 'Reiniciar'))) return;
  session.restart(); persist(); render();
}
async function next() {
  const n = session.stages[session.stageIndex + 1]; if (!n) return;
  if (!(await ask('Próxima etapa', `Encerrar "${session.stage.name}" e preparar "${n.name}"? O relógio da nova etapa ficará parado até você iniciá-lo.`, 'Avançar'))) return;
  session.advance(); persist(); render();
}
function adjust(d) { if (d) { session.adjust(d, Date.now()); persist(); render(); } }
function setMute(v) { prefs.muted = v; api.setPrefs({ muted: v }); render(); }

// ---------- desenho ----------
function render() {
  const now = Date.now(), v = session.view(now), s = session.stage, n = session.stages.length;
  $('sName').textContent = session.name;
  $('stage').textContent = `Etapa ${session.stageIndex + 1} de ${n} · ${s.name}`;
  $('clock').textContent = fmt(v.value);
  $('status').textContent = { prepared: 'PREPARADA', running: 'EM EXECUÇÃO', paused: 'PAUSADA' }[v.status];
  $('bGo').textContent = v.status === 'running' ? 'Pausar' : v.status === 'paused' ? 'Continuar' : 'Iniciar etapa';
  $('bNext').disabled = session.stageIndex >= n - 1;
  $('bMute').textContent = prefs.muted ? 'Som: SILENCIADO' : 'Som: ativo';
  const od = $('overdue'); od.hidden = !v.overdue;
  if (v.overdue) { const dir = s.direction === 'down' ? -1 : 1; od.textContent = `Duração prevista ultrapassada: +${fmt(dir * (v.value - v.end * 60))}`; }
  $('prev').textContent = remText(v.previous); $('nxt').textContent = v.next ? 'A seguir: ' + remText(v.next) : '';
  const c = $('cur'); c.classList.toggle('none', !v.current);
  c.textContent = v.current ? remText(v.current) : 'Nenhum lembrete ativo';
  c.style.background = v.current ? `hsl(${Math.round(130 * (1 - v.progress))} 62% 30%)` : '';
}
function loop() {
  if (!session) return;
  const now = Date.now(), ev = session.tick(now);
  if (ev.length) { handle(ev); persist(); }
  else if (session.status === 'running' && now - lastSave > 2000) persist();
  render();
}

function setTheme(v) { prefs.theme = v; api.setPrefs({ theme: v }); applyTheme(); $('theme').value = v; }

// ---------- navegação ----------
const VIEWS = { run: 'vRun', lib: 'vLib', edit: 'vEdit' };
function show(v) { for (const k in VIEWS) $(VIEWS[k]).hidden = k !== v; }
function startSession(schedule, name) { session = new Session(schedule, Date.now(), name); persist(); show('run'); render(); }
async function leave() {
  if (session.status !== 'prepared' && !(await ask('Encerrar sessão', 'O relógio e os alertas desta sessão serão encerrados e ela não poderá ser recuperada.', 'Encerrar'))) return;
  session = null; api.setSessionActive(false); await api.clearSession(); window.Library.open();
}

// ---------- teclado ----------
document.addEventListener('keydown', (e) => {
  if (!session || $('vRun').hidden || document.querySelector('dialog[open]')) return;
  const t = e.target.tagName; if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(t)) return;
  const k = e.key.toLowerCase();
  if (e.ctrlKey && e.shiftKey && k === 'r') { e.preventDefault(); restart(); }
  else if (e.ctrlKey || e.altKey || e.metaKey) return;
  else if (k === ' ') { e.preventDefault(); toggle(); }
  else if (k === 'm') setMute(!prefs.muted);
  else if (k === 'n') next();
  else if (k === 'arrowleft') adjust(-1);
  else if (k === 'arrowright') adjust(1);
});

// ---------- inicialização ----------
async function init() {
  prefs = await api.getPrefs(); applyTheme();
  $('vol').value = prefs.volume; $('theme').value = prefs.theme;
  document.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => { if (e.detail > 0) b.blur(); }));
  $('bGo').onclick = toggle; $('bRestart').onclick = restart; $('bNext').onclick = next; $('bLib').onclick = leave;
  $('bMute').onclick = () => setMute(!prefs.muted); $('bCfg').onclick = () => $('cfg').showModal();
  document.querySelectorAll('#adj [data-d]').forEach((b) => (b.onclick = () => adjust(Number(b.dataset.d))));
  $('bCustom').onclick = () => { const d = parseInt($('custom').value, 10); if (Number.isInteger(d)) { adjust(d); $('custom').value = ''; } };
  $('vol').oninput = () => { prefs.volume = Number($('vol').value); api.setPrefs({ volume: prefs.volume }); };
  $('vol').onchange = () => beep('rem');
  $('theme').onchange = () => { prefs.theme = $('theme').value; api.setPrefs({ theme: prefs.theme }); applyTheme(); };

  // Recuperação: sempre pergunta; nunca recupera em silêncio.
  const snap = await api.loadSession();
  if (Session.isRecoverable(snap)) {
    const estado = snap.status === 'paused' ? 'estava pausada' : 'estava em execução';
    if (await ask('Sessão interrompida', `Foi encontrada uma sessão que ${estado}: "${snap.name}". Recuperar do ponto atual calculado pelo tempo real (sem repetir alertas) ou descartar?`, 'Recuperar', 'Descartar'))
      session = Session.restore(snap, Date.now());
    else await api.clearSession();
  }
  window.UI = { ask, show, startSession, getTheme: () => prefs.theme, setTheme };
  setInterval(loop, 250);
  if (session) { persist(); show('run'); render(); } else window.Library.open();
}
init();
})();

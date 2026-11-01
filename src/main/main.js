'use strict';
const { app, Menu, BrowserWindow, ipcMain, dialog, nativeTheme, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { Store, fitBounds } = require('../core/storage');
const { DemoSchedule } = require('../core/demo');

let store, win, sessionActive = false, forceClose = false;

// Instância única: evita duas janelas gravando no mesmo diretório.
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

// O relógio e os alertas precisam continuar com a janela oculta ou sem foco.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  const areas = screen.getAllDisplays().map((d) => d.workArea);
  const b = fitBounds(store.getWindow(), areas);
  win = new BrowserWindow({
    ...b, minWidth: 420, minHeight: 320, show: false, title: 'timerdz', icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  const saveBounds = () => { if (!win.isMinimized() && !win.isMaximized()) store.setWindow(win.getBounds()); };
  win.on('resize', saveBounds); win.on('move', saveBounds);
  win.on('close', (e) => {
    if (sessionActive && !forceClose) {
      const r = dialog.showMessageBoxSync(win, {
        type: 'warning', buttons: ['Cancelar', 'Fechar mesmo assim'], defaultId: 0, cancelId: 0,
        title: 'Sessão em andamento', message: 'Há uma sessão em andamento.',
        detail: 'Ao fechar, o relógio e os alertas param. Na próxima abertura você poderá recuperar a sessão.',
      });
      if (r === 0) return e.preventDefault();
    }
  });
  nativeTheme.on('updated', () => win.webContents.send('theme:system', nativeTheme.shouldUseDarkColors));
}

function registerIpc() {
  const h = (ch, fn) => ipcMain.handle(ch, (_e, ...a) => fn(...a));
  h('sched:list', () => store.listSchedules());
  h('sched:save', (s) => store.saveSchedule(s));
  h('sched:delete', (id) => store.deleteSchedule(id));
  h('sched:dup', (id) => store.duplicateSchedule(id));
  h('prefs:get', () => ({ ...store.getPrefs(), systemDark: nativeTheme.shouldUseDarkColors }));
  h('prefs:set', (p) => store.setPrefs(p));
  h('sess:save', (s) => store.saveSession(s));
  h('sess:load', () => store.loadSession());
  h('sess:clear', () => store.clearSession());
  h('sess:active', (v) => { sessionActive = !!v; });
  h('sched:export', async (id) => {
    const s = store.getSchedule(id);
    const r = await dialog.showSaveDialog(win, { defaultPath: `${s.name}.json`, filters: [{ name: 'Cronograma', extensions: ['json'] }] });
    if (r.canceled) return { ok: false };
    fs.writeFileSync(r.filePath, store.exportSchedule(id), 'utf8');
    return { ok: true, path: r.filePath };
  });
  h('sched:import', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Cronograma', extensions: ['json'] }] });
    if (r.canceled) return { ok: false };
    try { return { ok: true, schedule: store.importSchedule(fs.readFileSync(r.filePaths[0], 'utf8')) }; }
    catch (err) { return { ok: false, error: err.message }; } // nada é gravado em caso de erro
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // sem menu padrão: evita atalhos como Ctrl+R (recarregar)
  store = new Store(path.join(app.getPath('userData'), 'dados'));
  store.seedDemo(DemoSchedule);
  registerIpc(); createWindow();
});
app.on('window-all-closed', () => app.quit());

'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('api', {
  listSchedules: call('sched:list'), saveSchedule: call('sched:save'),
  deleteSchedule: call('sched:delete'), duplicateSchedule: call('sched:dup'),
  exportSchedule: call('sched:export'), importSchedule: call('sched:import'),
  getPrefs: call('prefs:get'), setPrefs: call('prefs:set'),
  saveSession: call('sess:save'), loadSession: call('sess:load'), clearSession: call('sess:clear'),
  setSessionActive: call('sess:active'),
  onSystemTheme: (cb) => ipcRenderer.on('theme:system', (_e, dark) => cb(dark)),
});

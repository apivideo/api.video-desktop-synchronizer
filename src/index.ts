import { app, Menu, Tray } from 'electron';
import * as path from 'path';
import ActivityWindow from './activity-window';
import SettingsWindow from './settings-window';
import Synchronizer, { UploadStatuses } from './synchronizer';


let settingsWindow: SettingsWindow;
let activityWindow: ActivityWindow;
let synchronizer: Synchronizer;
let tray: Tray;

require('update-electron-app')();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}


const openSettingsWindow = (message?: string) => settingsWindow.show(message);
const openActivityWindow = () => activityWindow.show();

const clickStart = () => synchronizer.start({ apiKey: settingsWindow.getSettings().apiKey, folder: settingsWindow.getSettings().folder });
const clickPause = () => synchronizer.stop().then((a) => tray.setContextMenu(contextMenuPaused));

const contextMenuPaused = Menu.buildFromTemplate([
  { label: 'api.video synchronizer is paused', type: 'normal', enabled: false, icon: path.join(__dirname, 'assets/orange-dot.png') },
  { label: 'Start synchronizing', type: 'normal', click: () => clickStart() },
  { label: '', type: 'separator' },
  { label: 'Activity...', type: 'normal', enabled: false },
  { label: 'Settings...', type: 'normal', click: () => openSettingsWindow() },
  { label: 'Quit', type: 'normal', click: () => app.quit() },
]);

const contextMenuActive = Menu.buildFromTemplate([
  { label: 'api.video synchronizer is running', type: 'normal', enabled: false, icon: path.join(__dirname, 'assets/green-dot.png') },
  { label: 'Pause', type: 'normal', click: () => clickPause() },
  { label: '', type: 'separator' },
  { label: 'Activity...', type: 'normal', click: () => openActivityWindow() },
  { label: 'Settings...', type: 'normal', enabled: false },
  { label: 'Quit', type: 'normal', click: () => app.quit() },
]);


const contextMenuBusy = Menu.buildFromTemplate([
  { label: '...', type: 'normal', enabled: false },
  { label: '', type: 'separator' },
  { label: 'Activity...', type: 'normal', enabled: false },
  { label: 'Settings...', type: 'normal', enabled: false },
  { label: 'Quit', type: 'normal', click: () => app.quit() },
]);

const createTray = () => {
  const tray = new Tray(path.join(__dirname, 'assets/tray-icon.png'))
  tray.setToolTip('api.video synchronizer')
  tray.setContextMenu(contextMenuPaused);
  return tray;
}


app.on('ready', () => {
  if (app.dock) app.dock.hide();
  tray = createTray();

  settingsWindow = new SettingsWindow();
  activityWindow = new ActivityWindow();
  synchronizer = new Synchronizer();

  if (!settingsWindow.getSettings().apiKey || !settingsWindow.getSettings().folder) {
    settingsWindow.show();
  }

  synchronizer.on('auth-error', () => {
    settingsWindow.show("Please verify your API key");
    clickPause();
  });

  synchronizer.on('upload-status-update', (statuses: UploadStatuses) => activityWindow.setUploadStatuses(statuses));
  synchronizer.on('started', () => tray.setContextMenu(contextMenuActive));
  synchronizer.on('stopped', () => tray.setContextMenu(contextMenuPaused));
  synchronizer.on('busy', () => tray.setContextMenu(contextMenuPaused));
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    //  app.quit();
  }
});

import { BrowserWindow, dialog, ipcMain, IpcMainEvent, WebContents } from "electron";
import Store from 'electron-store';
import * as path from 'path';
import { isApiKeyValid } from "./tools";

export type Settings = {
    apiKey: string;
    folder: string;
}

export default class SettingsWindow {
    private store = new Store();
    private message?: string;
    private browserWindow?: BrowserWindow;

    getSettings(): Settings {
        return {
            apiKey: this.store.get('apiKey') as string,
            folder: this.store.get('folder') as string,
        }
    }

    show(message?: string) {
        this.message = message;
        if (!this.browserWindow) {
            this.browserWindow = this.createBrowserWindow();
            this.browserWindow.setMenu(null);
            this.browserWindow.loadFile('dist/assets/settings.html');
            this.browserWindow.on('close', () => this.onClose());

            ipcMain.on('ready', (e) => this.onReady(e));
            ipcMain.on('update-settings', (event, settings) => this.onUpdateSettings(event, settings));
            ipcMain.on('open-file-dialog-for-file', (event) => this.onOpenFileDialog(event));
        }
        this.browserWindow.show();
    }

    private onReady(event: IpcMainEvent) {
        if(this.message) {
            event.sender.send('show-error-message', this.message);
        }
    }

    private async onOpenFileDialog(event: IpcMainEvent) {
        dialog.showOpenDialog(this.browserWindow, {
            properties: ['openDirectory']
        }).then((res) => {
            if (res) event.sender.send('selected-file', res.filePaths[0]);
        });
    }

    private async onUpdateSettings(event: IpcMainEvent, settings: Settings) {
        if (!settings.folder && !settings.apiKey) {
            event.sender.send('show-error-message', "Please enter a valid API key and chose a folder to synchronize.");
        } else if (!settings.folder) {
            event.sender.send('show-error-message', "Please chose a folder to synchronize.");
        } else if (!settings.apiKey) {
            event.sender.send('show-error-message', "Please enter a valid API key.");
        } else if (!(await isApiKeyValid(settings.apiKey))) {
            event.sender.send('show-error-message', "Please enter a valid API key.");
        } else {
            this.store.set('apiKey', settings.apiKey);
            this.store.set('folder', settings.folder);
            this.browserWindow.close();
        }
    }

    private createBrowserWindow() {
        return new BrowserWindow({
            width: 640,
            height: 420,
            webPreferences: {
                preload: path.join(__dirname, 'settings-client.js'),
                additionalArguments: ["--apiKey="+(this.getSettings().apiKey || ""), "--folder=" + (this.getSettings().folder || "")]
            }
        })
    }

    private onClose() {
        this.browserWindow = undefined;
        ipcMain.removeAllListeners('open-file-dialog-for-file');
        ipcMain.removeAllListeners('update-settings');
    }
}
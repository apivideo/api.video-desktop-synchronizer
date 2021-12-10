import { BrowserWindow, ipcMain, shell } from "electron";
import * as path from 'path';
import { UploadStatuses } from "./synchronizer";


export default class ActivityWindow {
    private browserWindow?: BrowserWindow;
    private uploadStatuses: UploadStatuses = {};

    show() {
        if (!this.browserWindow) {
            this.browserWindow = this.createBrowserWindow();
            this.browserWindow.setMenu(null);
            this.browserWindow.loadFile('dist/assets/activity.html');
            this.browserWindow.on('close', () => this.onClose());

            ipcMain.on('open-in-browser', (event, url) => shell.openExternal(url));
            ipcMain.on('get-statuses', (event, arg) => event.reply('uploadStatuses', this.uploadStatuses));
        }
        this.browserWindow.show();
    }

    setUploadStatuses(uploadStatuses: UploadStatuses) {
        this.uploadStatuses = uploadStatuses;
        if(this.browserWindow) {
            this.browserWindow.webContents.send("uploadStatuses", uploadStatuses);
        }
    }

    private createBrowserWindow() {
        return new BrowserWindow({
            width: 640,
            height: 380,
            webPreferences: {
                preload: path.join(__dirname, 'activity-client.js')
            }
        });
    }

    private onClose() {
        this.browserWindow = undefined;
        ipcMain.removeAllListeners('get-statuses');
        ipcMain.removeAllListeners('open-in-browser');
    }
}
const ipc = require('electron').ipcRenderer;

window.addEventListener('DOMContentLoaded', () => {

    const selectFolderButton = document.getElementById('select-folder-button');
    const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
    const folderText = document.getElementById("folder");
    const applyButton = document.getElementById("apply-button");
    const messageDiv = document.getElementById("message");

    const params: any = {};
    window.process.argv.forEach(t => {
        const match = t.match(/--([^=]+)=(.+)/);
        if(match) {
            params[match[1]] = match[2];
        }
    });

    const apiKey = params["apiKey"] || "";
    const folder = params["folder"] || "";

    apiKeyInput.value = apiKey;
    folderText.innerHTML = folder;


    selectFolderButton.addEventListener('click', (_) => ipc.send('open-file-dialog-for-file'));
    apiKeyInput.addEventListener('change', () => messageDiv.innerHTML = "");


    applyButton.addEventListener('click', () => {
        ipc.send('update-settings', {
            folder: folderText.innerHTML,
            apiKey: apiKeyInput.value
        })
    });

    ipc.send('ready');

    ipc.on('show-error-message', (_, message) => messageDiv.innerHTML = message);

    ipc.on('selected-file', (_, path) => {
        messageDiv.innerHTML = "";
        if (!!path) {
            folderText.innerHTML = path;
        }
    });


    ipc.on('update-status', (_, statuses) => {
        const statusesContainer = document.getElementById("logs");
        statusesContainer.innerHTML = "";
        for (const hash in statuses) {
            const status = statuses[hash];
            const lineDiv = document.createElement("div");
            const filenameDiv = document.createElement("div");
            const statusDiv = document.createElement("div");
            lineDiv.className = "logline";
            filenameDiv.innerHTML = status.filename;
            if (!status.link) {
                statusDiv.innerHTML = status.status === "IN_PROGRESS" ? Math.round(status.percent * 100) + "%" : status.status;
            } else {
                const link = document.createElement("button");
                link.innerHTML = "DONE";
                link.onclick = () => ipc.send('open-in-browser', status.link);
                statusDiv.appendChild(link);
            }
            lineDiv.appendChild(filenameDiv);
            lineDiv.appendChild(statusDiv);
            statusesContainer.appendChild(lineDiv);
        }
    });




})
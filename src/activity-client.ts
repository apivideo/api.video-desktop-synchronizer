import { UploadStatuses } from "./synchronizer";

const ipc = require('electron').ipcRenderer;


const updateStatuses = (statuses: UploadStatuses) => {
    const statusesContainer = document.getElementById("logs");
    statusesContainer.innerHTML = "";
    for (const hash in statuses) {
        const status = statuses[hash];
        const lineDiv = document.createElement("div");
        const filenameDiv = document.createElement("div");
        const dotsDiv = document.createElement("div");
        dotsDiv.className = "dots";
        const statusDiv = document.createElement("div");
        lineDiv.className = "logline";
        filenameDiv.innerHTML = status.filename;
        if (!status.link || status.status == "PROCESSING") {
            statusDiv.innerHTML = status.status === "IN_PROGRESS" ? Math.round(status.percent * 100) + "%" : status.status;
        } else {
            const link = document.createElement("button");
            link.innerHTML = "VIEW";
            link.onclick = () => ipc.send('open-in-browser', status.link);
            statusDiv.appendChild(link);
        }
        lineDiv.appendChild(filenameDiv);
        lineDiv.appendChild(dotsDiv);
        lineDiv.appendChild(statusDiv);
        statusesContainer.appendChild(lineDiv);
    }
}


window.addEventListener('DOMContentLoaded', () => {
    ipc.on('uploadStatuses', (event, arg) => {
        updateStatuses(arg);
    })
    ipc.send('get-statuses');
})
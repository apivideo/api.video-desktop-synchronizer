import ApiVideoClient from "@api.video/nodejs-client";
import { FSWatcher, watch } from "chokidar";
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { createReadStream } from 'fs';
import { Stats } from "original-fs";
import path from 'path';
import Queue from "queue-promise";
import { Settings } from "./settings-window";
import { isApiKeyValid } from "./tools";

type UploadStatus = {
    status: "PENDING" | "DONE" | "IN_PROGRESS" | "PROCESSING";
    percent?: number;
    filename?: string;
    link?: string;
};

export type UploadStatuses = Record<string, UploadStatus>

export default class Synchronizer extends EventEmitter {
    private settings?: Settings;
    private watcher?: FSWatcher;
    private uploadStatuses: UploadStatuses = {};
    private uploadQueue: Queue;

    constructor() {
        super();
    }

    async start(settings: Settings) {
        this.emit("busy");
        this.uploadStatuses = {};
        this.settings = settings;

        if (this.watcher) {
            await this.watcher.close();
            this.watcher = undefined;
        }

        if (!await isApiKeyValid(settings.apiKey)) {
            this.emit("auth-error");
            this.stop();
            return;
        }


        this.uploadQueue = new Queue({
            concurrent: 1,
            interval: 100
        });

        this.watcher = watch(settings.folder, { awaitWriteFinish: true })
            .on('add', async (path, fileStat) => this.onNewFile(path, fileStat));

        this.emit("started");

    }

    private updateUploadStatus(hash: string, status: UploadStatus) {
        this.uploadStatuses[hash] = {
            ...(this.uploadStatuses[hash] ? this.uploadStatuses[hash] : {}),
            ...status
        };
        this.emit('upload-status-update', this.uploadStatuses);
    }

    private async onNewFile(filePath: string, stats?: Stats) {
        if ([".mp4", ".mov"].indexOf(path.extname(filePath).toLowerCase()) === -1) {
            return;
        }

        const hash = await this.computeFileHash(filePath);

        if (!!this.uploadStatuses[hash]) {
            return;
        }

        const filename = filePath.substr(this.settings.folder.length + 1);

        this.updateUploadStatus(hash, { status: 'PENDING', percent: 0, filename });

        const apiVideoClient = new ApiVideoClient({ apiKey: this.settings.apiKey });

        try {
            const existingVideo = await apiVideoClient.videos.list({ metadata: { uploaderhash: hash } });

            if (existingVideo.pagination.itemsTotal === 0) {
                this.updateUploadStatus(hash, { status: 'PENDING', percent: 0, filename });
                this.uploadQueue.enqueue(() => this.uploadFile(filePath, hash, apiVideoClient));
            } else {
                const uploadedChunksMetadata = existingVideo.data[0].metadata.find(m => m.key === 'uploaderuploadstatus' && m.value === "done");
                if(!uploadedChunksMetadata) {
                    await apiVideoClient.videos.delete(existingVideo.data[0].videoId);
                    this.uploadQueue.enqueue(() => this.uploadFile(filePath, hash, apiVideoClient));
                } else {
                    this.updateUploadStatus(hash, { status: 'DONE', percent: 100, filename, link: existingVideo.data[0].assets.player });
                }
            }
        } catch (e) {
            if (e.problemDetails.status == 401) {
                this.emit("auth-error");
                this.stop();
            }
        }
    }
    
    async stop() {
        this.emit("busy");
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = undefined;
        }
        this.emit("stopped");
    }

    private async uploadFile(filePath: string, hash: string, apiVideoClient: ApiVideoClient) {
        this.updateUploadStatus(hash, { status: "IN_PROGRESS" });

        const creationResult = await apiVideoClient.videos.create({
            title: path.basename(filePath),
            metadata: [ { key: "uploaderhash", value: hash } ]
        });

        const uploadResult = await apiVideoClient.videos.upload(
            creationResult.videoId,
            filePath,
            (progress) => this.updateUploadStatus(hash, { status: "IN_PROGRESS", percent: progress.uploadedBytes / progress.totalBytes })
        );

        await apiVideoClient.videos.update(creationResult.videoId, {
            metadata: [
                { key: "uploaderhash", value: hash },
                { key: "uploaderuploadstatus", value: "done" }
            ]
        });

        this.updateUploadStatus(hash, { link: uploadResult.assets.player, status: "PROCESSING", percent: 100 });

        let statusInterval = setInterval(() => {
            apiVideoClient.videos.getStatus(uploadResult.videoId).then((s) => {
                if (s.encoding.playable) {
                    this.updateUploadStatus(hash, { status: "DONE" });
                    clearInterval(statusInterval);
                }
            })
        }, 2000);

    }

    private async computeFileHash(path: string): Promise<string> {
        return await new Promise((resolve, reject) => {
            const hash = createHash('md5');
            const stream = createReadStream(path);
            stream.on('data', (data: string) => hash.update(data, 'utf8'));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
    }

}                   
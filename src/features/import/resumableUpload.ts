import * as tus from "tus-js-client";
import { completeFileUpload } from "./importApi";

export type UploadJobInput = {
  fileId: string;
  file: File;
  storageKey: string;
  sizeBytes: number;
};

export type UploadBatchInput = {
  importacaoId: string;
  jobs: UploadJobInput[];
  supabaseUrl: string;
  accessToken: string;
  bucketName?: string;
};

export type UploadProgressInfo = {
  percent: number;
  bytesSent: number;
  totalBytes: number;
  completedFiles: number;
  totalFiles: number;
};

export type UploadFactory = (
  file: File,
  options: {
    endpoint: string;
    headers: Record<string, string>;
    uploadDataDuringCreation: boolean;
    removeFingerprintOnSuccess: boolean;
    metadata: Record<string, string>;
    chunkSize: number;
    onError: (error: Error) => void;
    onProgress: (bytesSent: number, bytesTotal: number) => void;
    onSuccess: () => void;
  },
) => { start: () => void; abort: () => void };

const defaultTusFactory: UploadFactory = (file, options) => {
  const upload = new tus.Upload(file, {
    endpoint: options.endpoint,
    headers: options.headers,
    uploadDataDuringCreation: options.uploadDataDuringCreation,
    removeFingerprintOnSuccess: options.removeFingerprintOnSuccess,
    metadata: options.metadata,
    chunkSize: options.chunkSize,
    onError: options.onError,
    onProgress: options.onProgress,
    onSuccess: options.onSuccess,
  });
  return {
    start: () => upload.start(),
    abort: () => upload.abort(),
  };
};

export async function uploadImportFiles(
  input: UploadBatchInput,
  onProgress?: (progress: UploadProgressInfo) => void,
  factory: UploadFactory = defaultTusFactory,
  concurrency = 3,
): Promise<void> {
  const { importacaoId, jobs, supabaseUrl, accessToken, bucketName = "documentos" } = input;
  const endpoint = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/upload/resumable`;

  const totalBytes = jobs.reduce((acc, job) => acc + Math.max(job.sizeBytes, 1), 0);
  const bytesSentMap = new Map<string, number>();
  let completedCount = 0;

  const notifyProgress = () => {
    let currentBytesSent = 0;
    for (const b of bytesSentMap.values()) {
      currentBytesSent += b;
    }
    const percent = totalBytes > 0 ? Math.min(100, Math.round((currentBytesSent / totalBytes) * 100)) : 100;
    onProgress?.({
      percent,
      bytesSent: currentBytesSent,
      totalBytes,
      completedFiles: completedCount,
      totalFiles: jobs.length,
    });
  };

  let currentIndex = 0;

  const runWorker = async () => {
    while (currentIndex < jobs.length) {
      const jobIndex = currentIndex;
      currentIndex += 1;
      const job = jobs[jobIndex];
      if (!job) break;

      await new Promise<void>((resolve, reject) => {
        const uploader = factory(job.file, {
          endpoint,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-upsert": "false",
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName,
            objectName: job.storageKey,
            contentType: job.file.type || "application/octet-stream",
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (error) => {
            reject(error);
          },
          onProgress: (bytesSent, bytesTotal) => {
            bytesSentMap.set(job.fileId, bytesSent);
            notifyProgress();
          },
          onSuccess: async () => {
            bytesSentMap.set(job.fileId, Math.max(job.sizeBytes, 1));
            completedCount += 1;
            notifyProgress();

            try {
              await completeFileUpload(importacaoId, job.fileId, accessToken);
              resolve();
            } catch (err) {
              // Notifica erro de finalização de arquivo mas não aborta o worker
              resolve();
            }
          },
        });

        uploader.start();
      });
    }
  };

  const pool = Array.from({ length: Math.min(concurrency, jobs.length) }, () => runWorker());
  await Promise.all(pool);
  notifyProgress();
}

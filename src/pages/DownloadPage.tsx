import React, { useEffect, useState } from 'react';
import {
  startDownloadTask,
  verifyDownloadTask,
} from '../lib/api';
import { TaskState } from '../types';
import { AdBanner } from '../components/AdBanner';
import { ErrorState } from '../components/ErrorState';
import {
  Download,
  Lock,
  Unlock,
  Link2,
  Clock,
  CheckCircle2,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface DownloadPageProps {
  slug: string;
}

export const DownloadPage: React.FC<DownloadPageProps> = ({ slug }) => {
  const [downloadTaskState, setDownloadTaskState] = useState<TaskState>({
    taskNumber: 3,
    status: 'pending',
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Live timer tick
  useEffect(() => {
    let interval: any;
    if (
      downloadTaskState.status === 'in_progress' &&
      (downloadTaskState.countdownRemaining ?? 0) > 0
    ) {
      interval = setInterval(() => {
        setDownloadTaskState((prev) => ({
          ...prev,
          countdownRemaining: Math.max(0, (prev.countdownRemaining ?? 10) - 1),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [downloadTaskState.status, downloadTaskState.countdownRemaining]);

  const handleStartDownloadTask = async () => {
    const res = await startDownloadTask(slug);
    if (res.success && res.sessionToken && res.taskUrl) {
      setDownloadTaskState({
        taskNumber: 3,
        status: 'in_progress',
        sessionToken: res.sessionToken,
        startedAt: Date.now(),
        countdownRemaining: res.durationSeconds || 10,
        errorMessage: undefined,
      });
      window.open(res.taskUrl, '_blank', 'noopener,noreferrer');
    } else {
      setDownloadTaskState((prev) => ({
        ...prev,
        status: 'failed',
        errorMessage: res.error || 'Failed to start download task.',
      }));
    }
  };

  const handleVerifyDownloadTask = async () => {
    if (!downloadTaskState.sessionToken) return;
    setIsVerifying(true);
    const res = await verifyDownloadTask(downloadTaskState.sessionToken, slug);
    setIsVerifying(false);

    if (res.success && res.completed && res.downloadUrl) {
      setDownloadTaskState((prev) => ({
        ...prev,
        status: 'completed',
        errorMessage: undefined,
      }));
      setDownloadUrl(res.downloadUrl);
      setFileName(res.fileName || 'Video_File.mp4');
    } else {
      setDownloadTaskState((prev) => ({
        ...prev,
        status: 'failed',
        errorMessage: res.error || 'Download task verification failed.',
      }));
    }
  };

  const isCompleted = downloadTaskState.status === 'completed';

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-6 space-y-6 animate-fadeIn">
      {/* 1. ADVERTISEMENT BANNER */}
      <AdBanner />

      {/* 2. TITLE SECTION */}
      <div className="text-center space-y-2 py-2">
        <h1 className="font-bold text-[#111111] dark:text-white text-xl sm:text-2xl tracking-tight">
          Unlock Your Download
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
          Complete the sponsored task below to access and download your file.
        </p>
      </div>

      {/* 3. TASK 1 ROW */}
      <div className="flex flex-col gap-2">
        <div
          onClick={
            downloadTaskState.status === 'in_progress'
              ? handleVerifyDownloadTask
              : downloadTaskState.status === 'failed'
              ? handleStartDownloadTask
              : downloadTaskState.status === 'completed'
              ? undefined
              : handleStartDownloadTask
          }
          className={`w-full rounded-[20px] p-5 flex items-center justify-between transition-all duration-200 border cursor-pointer shadow-sm dark:shadow-lg dark:shadow-black/20 ${
            downloadTaskState.status === 'completed'
              ? 'bg-emerald-50 border-emerald-200 dark:bg-[#141416] dark:border-emerald-500/30'
              : downloadTaskState.status === 'failed'
              ? 'bg-rose-50 border-rose-200 dark:bg-[#141416] dark:border-rose-500/30'
              : 'bg-white border-neutral-200 hover:border-neutral-300 dark:bg-[#141416] dark:border-white/[0.08] dark:hover:border-white/[0.16]'
          }`}
          id="download-task-row"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[12px] bg-neutral-100 border border-neutral-200 text-black dark:bg-white/[0.06] dark:border-white/[0.08] dark:text-white flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-bold text-[#111111] dark:text-white text-base tracking-tight">Task 1</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Click & Visit the page</p>
            </div>
          </div>

          <div>
            {downloadTaskState.status === 'pending' && (
              <div className="bg-neutral-100 border border-neutral-200 text-neutral-700 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-neutral-300 font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>10 SEC</span>
              </div>
            )}

            {downloadTaskState.status === 'in_progress' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVerifyDownloadTask();
                }}
                disabled={isVerifying}
                className="bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm cursor-pointer transition-all duration-200"
              >
                {isVerifying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#111111] dark:text-black" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>{downloadTaskState.countdownRemaining && downloadTaskState.countdownRemaining > 0 ? `${downloadTaskState.countdownRemaining}s` : 'VERIFY'}</span>
              </button>
            )}

            {downloadTaskState.status === 'completed' && (
              <div className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>DONE</span>
              </div>
            )}

            {downloadTaskState.status === 'failed' && (
              <div className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-200">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RETRY</span>
              </div>
            )}
          </div>
        </div>

        {/* Failure Alert Box */}
        {downloadTaskState.status === 'failed' && downloadTaskState.errorMessage && (
          <div className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{downloadTaskState.errorMessage}</span>
          </div>
        )}
      </div>

      {/* 4. DOWNLOAD FILE ACTION BOX */}
      <div className="bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-7 text-center flex flex-col items-center shadow-sm dark:shadow-lg dark:shadow-black/20 transition-colors duration-200">
        <div className="w-12 h-12 rounded-[16px] bg-neutral-100 dark:bg-[#1A1A1E] border border-neutral-200 dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center mb-3">
          {isCompleted ? (
            <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          ) : (
            <Lock className="w-5 h-5 text-neutral-500 dark:text-neutral-400" strokeWidth={1.75} />
          )}
        </div>

        <h3 className="font-bold text-[#111111] dark:text-white text-lg tracking-tight mb-1">
          Download File
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
          Complete the task above to unlock the download button
        </p>

        {isCompleted && downloadUrl ? (
          <div className="w-full space-y-3">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="w-full h-12 px-6 rounded-[20px] bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer"
              id="unlocked-download-btn"
            >
              <Download className="w-4 h-4 text-[#111111] dark:text-black" strokeWidth={2} />
              <span>DOWNLOAD FILE</span>
            </a>
            {fileName && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{fileName}</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              if (downloadTaskState.status !== 'completed') {
                handleStartDownloadTask();
              }
            }}
            className="w-full h-12 px-6 rounded-[20px] bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] dark:border-white/[0.08] dark:text-neutral-200 font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
            id="download-file-btn"
          >
            <Lock className="w-4 h-4" strokeWidth={2} />
            <span>DOWNLOAD</span>
          </button>
        )}
      </div>
    </div>
  );
};

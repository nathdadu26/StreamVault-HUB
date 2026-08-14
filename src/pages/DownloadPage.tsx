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
    <div className="max-w-md mx-auto px-4 py-5 space-y-4 animate-fadeIn">
      {/* 1. ADVERTISEMENT BANNER */}
      <AdBanner />

      {/* 2. TITLE SECTION */}
      <div className="text-center space-y-1 py-1">
        <h1 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
          Complete the task to unlock your download
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Follow the instructions carefully to unlock the download button.
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
          className={`w-full rounded-2xl p-4 flex items-center justify-between transition border cursor-pointer ${
            downloadTaskState.status === 'completed'
              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              : downloadTaskState.status === 'failed'
              ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
              : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/60 hover:border-blue-300'
          }`}
          id="download-task-row"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-200/50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Task 1</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click & Visit the page</p>
            </div>
          </div>

          <div>
            {downloadTaskState.status === 'pending' && (
              <div className="bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {isVerifying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>{downloadTaskState.countdownRemaining && downloadTaskState.countdownRemaining > 0 ? `${downloadTaskState.countdownRemaining}s` : 'VERIFY'}</span>
              </button>
            )}

            {downloadTaskState.status === 'completed' && (
              <div className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>DONE</span>
              </div>
            )}

            {downloadTaskState.status === 'failed' && (
              <div className="bg-rose-600 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-2xs">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RETRY</span>
              </div>
            )}
          </div>
        </div>

        {/* Failure Alert Box */}
        {downloadTaskState.status === 'failed' && downloadTaskState.errorMessage && (
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{downloadTaskState.errorMessage}</span>
          </div>
        )}
      </div>

      {/* 4. DOWNLOAD FILE ACTION BOX */}
      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-6 text-center flex flex-col items-center shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-500 flex items-center justify-center mb-3">
          {isCompleted ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
        </div>

        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg mb-1">
          Download File
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Complete the task above to unlock the download button
        </p>

        {isCompleted && downloadUrl ? (
          <div className="w-full space-y-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="w-full py-3.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
              id="unlocked-download-btn"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD FILE</span>
            </a>
            {fileName && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
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
            className="w-full py-3.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-all"
            id="download-file-btn"
          >
            <Lock className="w-4 h-4" />
            <span>DOWNLOAD</span>
          </button>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  fetchResourceInfo,
  startGatewayTask,
  verifyGatewayTask,
} from '../lib/api';
import { ResourceInfoResponse, TaskState } from '../types';
import { AdBanner } from '../components/AdBanner';
import { TaskGatewaySkeleton } from '../components/SkeletonLoaders';
import { ErrorState } from '../components/ErrorState';
import {
  FileText,
  Target,
  Link2,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface AdTaskGatewayPageProps {
  slug: string;
}

export const AdTaskGatewayPage: React.FC<AdTaskGatewayPageProps> = ({ slug }) => {
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState<ResourceInfoResponse | null>(null);

  // Task 1 state
  const [task1State, setTask1State] = useState<TaskState>({
    taskNumber: 1,
    status: 'pending',
  });
  const [isVerifying1, setIsVerifying1] = useState(false);

  // Task 2 state
  const [task2State, setTask2State] = useState<TaskState>({
    taskNumber: 2,
    status: 'pending',
  });
  const [isVerifying2, setIsVerifying2] = useState(false);

  // Unlocked redirect URL
  const [unlockedRedirectUrl, setUnlockedRedirectUrl] = useState<string | null>(null);

  // Timer countdown handler for Task 1
  useEffect(() => {
    let interval: any;
    if (task1State.status === 'in_progress' && (task1State.countdownRemaining ?? 0) > 0) {
      interval = setInterval(() => {
        setTask1State((prev) => ({
          ...prev,
          countdownRemaining: Math.max(0, (prev.countdownRemaining ?? 10) - 1),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [task1State.status, task1State.countdownRemaining]);

  // Timer countdown handler for Task 2
  useEffect(() => {
    let interval: any;
    if (task2State.status === 'in_progress' && (task2State.countdownRemaining ?? 0) > 0) {
      interval = setInterval(() => {
        setTask2State((prev) => ({
          ...prev,
          countdownRemaining: Math.max(0, (prev.countdownRemaining ?? 10) - 1),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [task2State.status, task2State.countdownRemaining]);

  // Load resource info
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const res = await fetchResourceInfo(slug);
      if (isMounted) {
        setResource(res);
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Task 1 Actions
  const handleStartTask1 = async () => {
    const res = await startGatewayTask(slug, 1);
    if (res.success && res.sessionToken && res.taskUrl) {
      setTask1State({
        taskNumber: 1,
        status: 'in_progress',
        sessionToken: res.sessionToken,
        startedAt: Date.now(),
        countdownRemaining: res.durationSeconds || 10,
        errorMessage: undefined,
      });
      window.open(res.taskUrl, '_blank', 'noopener,noreferrer');
    } else {
      setTask1State((prev) => ({
        ...prev,
        status: 'failed',
        errorMessage: res.error || 'Failed to start Task 1.',
      }));
    }
  };

  const handleVerifyTask1 = async () => {
    if (!task1State.sessionToken) return;
    setIsVerifying1(true);
    const res = await verifyGatewayTask(task1State.sessionToken, slug, 1);
    setIsVerifying1(false);

    if (res.success && res.completed) {
      setTask1State((prev) => ({
        ...prev,
        status: 'completed',
        errorMessage: undefined,
      }));
    } else {
      setTask1State((prev) => ({
        ...prev,
        status: 'failed',
        errorMessage: res.error || 'Task 1 verification failed.',
      }));
    }
  };

  // Task 2 Actions
  const handleStartTask2 = async () => {
    if (task1State.status !== 'completed') return;
    const res = await startGatewayTask(slug, 2);
    if (res.success && res.sessionToken && res.taskUrl) {
      setTask2State({
        taskNumber: 2,
        status: 'in_progress',
        sessionToken: res.sessionToken,
        startedAt: Date.now(),
        countdownRemaining: res.durationSeconds || 10,
        errorMessage: undefined,
      });
      window.open(res.taskUrl, '_blank', 'noopener,noreferrer');
    } else {
      setTask2State((prev) => ({
        ...prev,
        status: 'failed',
        errorMessage: res.error || 'Failed to start Task 2.',
      }));
    }
  };

  const handleVerifyTask2 = async () => {
    if (!task2State.sessionToken) return;
    setIsVerifying2(true);
    const res = await verifyGatewayTask(task2State.sessionToken, slug, 2);
    setIsVerifying2(false);

    if (res.success && res.completed) {
      setTask2State((prev) => ({
        ...prev,
        status: 'completed',
        errorMessage: undefined,
      }));
      if (res.redirectUrl) {
        setUnlockedRedirectUrl(res.redirectUrl);
      } else if (resource?.destinationPath) {
        setUnlockedRedirectUrl(resource.destinationPath);
      }
    } else {
      setTask2State((prev) => ({
        ...prev,
        status: 'failed',
        errorMessage: res.error || 'Task 2 verification failed.',
      }));
    }
  };

  if (loading) {
    return (
      <div className="py-8 px-4 max-w-md mx-auto">
        <TaskGatewaySkeleton />
      </div>
    );
  }

  if (!resource || !resource.success || !resource.data) {
    return (
      <ErrorState
        type="404"
        slug={slug}
        title="Resource Not Found"
        message={resource?.error || 'The requested resource slug was not found in blogger_db, telegram_files, or videos_db.'}
      />
    );
  }

  const isVideo = resource.type === 'video' || resource.type === 'blogger';
  const isBothCompleted = task1State.status === 'completed' && task2State.status === 'completed';

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-6 space-y-6 animate-fadeIn">
      {/* 1. INSTRUCTIONS CARD */}
      <div className="bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-6 sm:p-7 shadow-sm dark:shadow-lg dark:shadow-black/20 space-y-5 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[14px] bg-neutral-100 dark:bg-[#1A1A1E] border border-neutral-200 dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <h2 className="font-bold text-[#111111] dark:text-white text-sm uppercase tracking-wider">
            Instructions
          </h2>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-200 text-[#111111] dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <p className="leading-relaxed">
              Click on Task 1. Whatever page or site opens, wait for minimum{' '}
              <strong className="text-[#111111] dark:text-white font-semibold">10 seconds.</strong>
            </p>
          </div>

          <div className="border-t border-neutral-200 dark:border-white/[0.06]" />

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-200 text-[#111111] dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <p className="leading-relaxed">
              After 10 seconds, come back and click on Task 2. Wait for{' '}
              <strong className="text-[#111111] dark:text-white font-semibold">10 seconds.</strong>
            </p>
          </div>

          <div className="border-t border-neutral-200 dark:border-white/[0.06]" />

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-200 text-[#111111] dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <p className="leading-relaxed">
              Now you are <strong className="text-[#111111] dark:text-white font-semibold">Ready!</strong> The Watch Video button will be unlocked.
            </p>
          </div>
        </div>
      </div>

      {/* 2. COMPLETE TASKS CARD */}
      <div className="bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-6 sm:p-7 shadow-sm dark:shadow-lg dark:shadow-black/20 space-y-4 transition-colors duration-200">
        <div className="flex items-center gap-2.5 mb-1">
          <Target className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.75} />
          <h2 className="font-bold text-[#111111] dark:text-white text-sm uppercase tracking-wider">
            Complete Tasks
          </h2>
        </div>

        {/* Task 1 Row */}
        <div className="flex flex-col gap-2">
          <div
            onClick={
              task1State.status === 'in_progress'
                ? handleVerifyTask1
                : task1State.status === 'failed'
                ? handleStartTask1
                : task1State.status === 'completed'
                ? undefined
                : handleStartTask1
            }
            className={`w-full rounded-[16px] p-4 flex items-center justify-between transition-all duration-200 border cursor-pointer ${
              task1State.status === 'completed'
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                : task1State.status === 'failed'
                ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'
                : 'bg-white border-neutral-200 hover:border-neutral-300 dark:bg-[#18181C] dark:border-white/[0.08] dark:hover:border-white/[0.16]'
            }`}
            id="task-1-row"
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
              {task1State.status === 'pending' && (
                <div className="bg-neutral-100 border border-neutral-200 text-neutral-700 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-neutral-300 font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>10 SEC</span>
                </div>
              )}

              {task1State.status === 'in_progress' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVerifyTask1();
                  }}
                  disabled={isVerifying1}
                  className="bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm cursor-pointer transition-all duration-200"
                >
                  {isVerifying1 ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#111111] dark:text-black" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span>{task1State.countdownRemaining && task1State.countdownRemaining > 0 ? `${task1State.countdownRemaining}s` : 'VERIFY'}</span>
                </button>
              )}

              {task1State.status === 'completed' && (
                <div className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>DONE</span>
                </div>
              )}

              {task1State.status === 'failed' && (
                <div className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-200">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RETRY</span>
                </div>
              )}
            </div>
          </div>

          {/* Failure Alert Box for Task 1 */}
          {task1State.status === 'failed' && task1State.errorMessage && (
            <div className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{task1State.errorMessage}</span>
            </div>
          )}
        </div>

        {/* Task 2 Row */}
        <div className="flex flex-col gap-2">
          <div
            onClick={
              task1State.status !== 'completed'
                ? undefined
                : task2State.status === 'in_progress'
                ? handleVerifyTask2
                : task2State.status === 'failed'
                ? handleStartTask2
                : task2State.status === 'completed'
                ? undefined
                : handleStartTask2
            }
            className={`w-full rounded-[16px] p-4 flex items-center justify-between transition-all duration-200 border ${
              task1State.status !== 'completed'
                ? 'bg-neutral-50/50 border-neutral-200/50 dark:bg-[#18181C]/40 dark:border-white/[0.04] opacity-50 cursor-not-allowed'
                : task2State.status === 'completed'
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 cursor-pointer'
                : task2State.status === 'failed'
                ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 cursor-pointer'
                : 'bg-white border-neutral-200 hover:border-neutral-300 dark:bg-[#18181C] dark:border-white/[0.08] dark:hover:border-white/[0.16] cursor-pointer'
            }`}
            id="task-2-row"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[12px] bg-neutral-100 border border-neutral-200 text-black dark:bg-white/[0.06] dark:border-white/[0.08] dark:text-white flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-bold text-[#111111] dark:text-white text-base tracking-tight">Task 2</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Click & Visit the page</p>
              </div>
            </div>

            <div>
              {task2State.status === 'pending' && (
                <div className="bg-neutral-100 border border-neutral-200 text-neutral-700 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-neutral-300 font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>10 SEC</span>
                </div>
              )}

              {task2State.status === 'in_progress' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVerifyTask2();
                  }}
                  disabled={isVerifying2}
                  className="bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm cursor-pointer transition-all duration-200"
                >
                  {isVerifying2 ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#111111] dark:text-black" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span>{task2State.countdownRemaining && task2State.countdownRemaining > 0 ? `${task2State.countdownRemaining}s` : 'VERIFY'}</span>
                </button>
              )}

              {task2State.status === 'completed' && (
                <div className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>DONE</span>
                </div>
              )}

              {task2State.status === 'failed' && (
                <div className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-200">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RETRY</span>
                </div>
              )}
            </div>
          </div>

          {/* Failure Alert Box for Task 2 */}
          {task2State.status === 'failed' && task2State.errorMessage && (
            <div className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{task2State.errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. ADVERTISEMENT BANNER */}
      <AdBanner />

      {/* 4. WATCH VIDEO / GET FILE ACTION BOX */}
      <div className="bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-7 text-center flex flex-col items-center shadow-sm dark:shadow-lg dark:shadow-black/20 transition-colors duration-200">
        <div className="w-12 h-12 rounded-[16px] bg-neutral-100 dark:bg-[#1A1A1E] border border-neutral-200 dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center mb-3">
          {isBothCompleted ? (
            <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          ) : (
            <Lock className="w-5 h-5 text-neutral-500 dark:text-neutral-400" strokeWidth={1.75} />
          )}
        </div>

        <h3 className="font-bold text-[#111111] dark:text-white text-lg tracking-tight mb-1">
          {isVideo ? 'Watch Video' : 'Get Telegram File'}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
          Complete both tasks to unlock the button
        </p>

        {isBothCompleted && unlockedRedirectUrl ? (
          <a
            href={unlockedRedirectUrl}
            className="w-full h-12 px-6 rounded-[20px] bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer"
            id="unlocked-watch-btn"
          >
            <Unlock className="w-4 h-4 text-[#111111] dark:text-black" strokeWidth={2} />
            <span>{isVideo ? 'WATCH VIDEO' : 'GET FILE NOW'}</span>
          </a>
        ) : (
          <button
            onClick={() => {
              if (task1State.status !== 'completed') {
                handleStartTask1();
              } else if (task2State.status !== 'completed') {
                handleStartTask2();
              }
            }}
            className="w-full h-12 px-6 rounded-[20px] bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] dark:border-white/[0.08] dark:text-neutral-200 font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
            id="watch-video-btn"
          >
            <Lock className="w-4 h-4" strokeWidth={2} />
            <span>{isVideo ? 'WATCH VIDEO' : 'GET FILE'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

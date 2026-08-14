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

  // Unlocked master token & redirect URL
  const [masterGatewayToken, setMasterGatewayToken] = useState<string | null>(null);
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
      if (res.gatewayToken && res.redirectUrl) {
        setMasterGatewayToken(res.gatewayToken);
        setUnlockedRedirectUrl(res.redirectUrl);
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
    <div className="max-w-md mx-auto px-4 py-5 space-y-4 animate-fadeIn">
      {/* 1. INSTRUCTIONS CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
            INSTRUCTIONS
          </h2>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <p className="leading-snug">
              Click on Task 1. Whatever page or site opens, wait for minimum{' '}
              <strong className="text-blue-600 dark:text-blue-400 font-bold">10 seconds.</strong>
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80" />

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <p className="leading-snug">
              After 10 seconds, come back and click on Task 2. Wait for{' '}
              <strong className="text-blue-600 dark:text-blue-400 font-bold">10 seconds.</strong>
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80" />

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <p className="leading-snug">
              Now you are <strong className="text-blue-600 dark:text-blue-400 font-bold">Ready!</strong> The Watch Video button will be unlocked.
            </p>
          </div>
        </div>
      </div>

      {/* 2. COMPLETE TASKS CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2.5 mb-1">
          <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
            COMPLETE TASKS
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
            className={`w-full rounded-2xl p-4 flex items-center justify-between transition border cursor-pointer ${
              task1State.status === 'completed'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                : task1State.status === 'failed'
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/60 hover:border-blue-300'
            }`}
            id="task-1-row"
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
              {task1State.status === 'pending' && (
                <div className="bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {isVerifying1 ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span>{task1State.countdownRemaining && task1State.countdownRemaining > 0 ? `${task1State.countdownRemaining}s` : 'VERIFY'}</span>
                </button>
              )}

              {task1State.status === 'completed' && (
                <div className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>DONE</span>
                </div>
              )}

              {task1State.status === 'failed' && (
                <div className="bg-rose-600 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RETRY</span>
                </div>
              )}
            </div>
          </div>

          {/* Failure Alert Box for Task 1 */}
          {task1State.status === 'failed' && task1State.errorMessage && (
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
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
            className={`w-full rounded-2xl p-4 flex items-center justify-between transition border ${
              task1State.status !== 'completed'
                ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200/50 dark:border-emerald-900/40 opacity-75 cursor-not-allowed'
                : task2State.status === 'completed'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 cursor-pointer'
                : task2State.status === 'failed'
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 cursor-pointer'
                : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-300 cursor-pointer'
            }`}
            id="task-2-row"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-200/50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Task 2</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Click & Visit the page</p>
              </div>
            </div>

            <div>
              {task2State.status === 'pending' && (
                <div className="bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {isVerifying2 ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span>{task2State.countdownRemaining && task2State.countdownRemaining > 0 ? `${task2State.countdownRemaining}s` : 'VERIFY'}</span>
                </button>
              )}

              {task2State.status === 'completed' && (
                <div className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>DONE</span>
                </div>
              )}

              {task2State.status === 'failed' && (
                <div className="bg-rose-600 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RETRY</span>
                </div>
              )}
            </div>
          </div>

          {/* Failure Alert Box for Task 2 */}
          {task2State.status === 'failed' && task2State.errorMessage && (
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{task2State.errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. ADVERTISEMENT BANNER */}
      <AdBanner />

      {/* 4. WATCH VIDEO / GET FILE ACTION BOX */}
      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-6 text-center flex flex-col items-center shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-500 flex items-center justify-center mb-3">
          {isBothCompleted ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
        </div>

        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg mb-1">
          {isVideo ? 'Watch Video' : 'Get Telegram File'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Complete both tasks to unlock the button
        </p>

        {isBothCompleted && unlockedRedirectUrl ? (
          <a
            href={unlockedRedirectUrl}
            className="w-full py-3.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
            id="unlocked-watch-btn"
          >
            <Unlock className="w-4 h-4" />
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
            className="w-full py-3.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-all"
            id="watch-video-btn"
          >
            <Lock className="w-4 h-4" />
            <span>{isVideo ? 'WATCH VIDEO' : 'GET FILE'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

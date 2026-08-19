import React from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Lock,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { TaskState } from '../types';

interface TaskCardProps {
  taskNumber: 1 | 2 | 3;
  title: string;
  description: string;
  taskState: TaskState;
  isLocked?: boolean;
  onStartTask: () => void;
  onVerifyTask: () => void;
  onRetryTask: () => void;
  isVerifying?: boolean;
  requiredSeconds?: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  taskNumber,
  title,
  description,
  taskState,
  isLocked = false,
  onStartTask,
  onVerifyTask,
  onRetryTask,
  isVerifying = false,
  requiredSeconds = 10,
}) => {
  const { status, countdownRemaining, errorMessage } = taskState;

  return (
    <div
      className={`relative w-full rounded-[20px] border transition-all duration-200 overflow-hidden shadow-sm dark:shadow-lg dark:shadow-black/20 ${
        isLocked
          ? 'bg-neutral-50/50 border-neutral-200/50 dark:bg-[#141416]/50 dark:border-white/[0.04] opacity-50 cursor-not-allowed'
          : status === 'completed'
          ? 'bg-white border-emerald-500/30 dark:bg-[#141416] dark:border-emerald-500/30'
          : status === 'failed'
          ? 'bg-white border-rose-500/30 dark:bg-[#141416] dark:border-rose-500/30'
          : 'bg-white border-neutral-200 hover:border-neutral-300 dark:bg-[#141416] dark:border-white/[0.08] dark:hover:border-white/[0.16]'
      }`}
      id={`task-card-${taskNumber}`}
    >
      <div className="p-6 flex flex-col gap-4">
        {/* Header row with badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-[10px] font-bold text-[11px] ${
                status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : status === 'failed'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : isLocked
                  ? 'bg-neutral-100 text-neutral-400 dark:bg-white/[0.04] dark:text-neutral-500'
                  : 'bg-[#111111] text-white dark:bg-white dark:text-black'
              }`}
            >
              {taskNumber === 3 ? 'DL' : `0${taskNumber}`}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {taskNumber === 3 ? 'DOWNLOAD TASK' : `TASK ${taskNumber}`}
            </span>
          </div>

          {/* Status badge */}
          {status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          )}

          {status === 'failed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-3.5 h-3.5" />
              Task Failed
            </span>
          )}

          {status === 'in_progress' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200 dark:bg-white/[0.08] dark:text-white dark:border-white/[0.12]">
              <Clock className="w-3.5 h-3.5" />
              In Progress
            </span>
          )}

          {isLocked && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-400 dark:bg-white/[0.04] dark:text-neutral-500">
              <Lock className="w-3.5 h-3.5" />
              Locked
            </span>
          )}
        </div>

        {/* Task Title & Description */}
        <div>
          <h3 className="text-base font-bold text-[#111111] dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Failure Box */}
        {status === 'failed' && errorMessage && (
          <div className="p-3.5 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold block text-rose-800 dark:text-rose-300">Task Incomplete</span>
              <span className="text-rose-700 dark:text-rose-400/90">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* In-Progress Timer Box */}
        {status === 'in_progress' && (
          <div className="p-3.5 rounded-[16px] bg-neutral-50 border border-neutral-200 text-neutral-700 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-neutral-300 text-xs sm:text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-500 dark:text-neutral-400 animate-spin" />
              <span>
                Remain on sponsor page for{' '}
                <strong className="font-mono text-[#111111] dark:text-white font-bold">
                  {requiredSeconds}s
                </strong>
                ...
              </span>
            </div>
            {typeof countdownRemaining === 'number' && countdownRemaining > 0 ? (
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-neutral-200 text-neutral-900 dark:bg-white/[0.08] dark:text-white">
                {countdownRemaining}s
              </span>
            ) : (
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Ready!
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-1">
          {isLocked ? (
            <button
              disabled
              className="w-full h-11 px-5 rounded-[20px] bg-neutral-100 border border-neutral-200 text-neutral-400 dark:bg-white/[0.04] dark:border-white/[0.04] dark:text-neutral-500 font-medium text-sm flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>Complete Previous Task First</span>
            </button>
          ) : status === 'pending' ? (
            <button
              onClick={onStartTask}
              className="w-full h-11 px-5 rounded-[20px] bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
              id={`start-task-${taskNumber}-btn`}
            >
              <span>Start Task {taskNumber === 3 ? '' : taskNumber}</span>
              <ExternalLink className="w-4 h-4 text-[#111111] dark:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          ) : status === 'in_progress' ? (
            <button
              onClick={onVerifyTask}
              disabled={isVerifying}
              className="w-full h-11 px-5 rounded-[20px] bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              id={`verify-task-${taskNumber}-btn`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#111111] dark:text-black" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#111111] dark:text-black" />
                  <span>Verify Task Completion</span>
                  <ArrowRight className="w-4 h-4 text-[#111111] dark:text-black" />
                </>
              )}
            </button>
          ) : status === 'failed' ? (
            <button
              onClick={onRetryTask}
              className="w-full h-11 px-5 rounded-[20px] bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
              id={`retry-task-${taskNumber}-btn`}
            >
              <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform" />
              <span>Try Again</span>
            </button>
          ) : status === 'completed' ? (
            <div className="w-full h-11 px-5 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Task Verified & Completed</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};


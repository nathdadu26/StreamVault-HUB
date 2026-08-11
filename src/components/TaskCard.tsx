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
      className={`relative w-full rounded-2xl border transition-all duration-200 overflow-hidden ${
        isLocked
          ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70 cursor-not-allowed'
          : status === 'completed'
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/70 shadow-xs'
          : status === 'failed'
          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/70 shadow-xs'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-800'
      }`}
      id={`task-card-${taskNumber}`}
    >
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        {/* Header row with badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-bold text-xs shadow-xs ${
                status === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : status === 'failed'
                  ? 'bg-rose-600 text-white'
                  : isLocked
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {taskNumber === 3 ? 'DL' : `0${taskNumber}`}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {taskNumber === 3 ? 'DOWNLOAD TASK' : `TASK ${taskNumber}`}
            </span>
          </div>

          {/* Status badge */}
          {status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Completed
            </span>
          )}

          {status === 'failed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              Task Failed
            </span>
          )}

          {status === 'in_progress' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              In Progress
            </span>
          )}

          {isLocked && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Lock className="w-3.5 h-3.5" />
              Locked
            </span>
          )}
        </div>

        {/* Task Title & Description */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Failure Box inside the same card */}
        {status === 'failed' && errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-100/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold block">Task Failed</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* In-Progress Timer Box */}
        {status === 'in_progress' && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
              <span>
                Remain on sponsor page for{' '}
                <strong className="font-mono text-amber-700 dark:text-amber-300">
                  {requiredSeconds}s
                </strong>
                ...
              </span>
            </div>
            {typeof countdownRemaining === 'number' && countdownRemaining > 0 ? (
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                {countdownRemaining}s
              </span>
            ) : (
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
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
              className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>Complete Previous Task First</span>
            </button>
          ) : status === 'pending' ? (
            <button
              onClick={onStartTask}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group"
              id={`start-task-${taskNumber}-btn`}
            >
              <span>Start Task {taskNumber === 3 ? '' : taskNumber}</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          ) : status === 'in_progress' ? (
            <button
              onClick={onVerifyTask}
              disabled={isVerifying}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-75"
              id={`verify-task-${taskNumber}-btn`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Server Session...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Task Completion</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : status === 'failed' ? (
            <button
              onClick={onRetryTask}
              className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group"
              id={`retry-task-${taskNumber}-btn`}
            >
              <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform" />
              <span>Try Again</span>
            </button>
          ) : status === 'completed' ? (
            <div className="w-full py-3 px-4 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Task Verified & Completed</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

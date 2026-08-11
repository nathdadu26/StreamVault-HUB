import React from 'react';

export const TaskGatewaySkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 animate-pulse">
      {/* Title skeleton */}
      <div className="flex flex-col items-center gap-3 text-center my-4">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-4 w-80 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>

      {/* Task 1 Card Skeleton */}
      <div className="w-full h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>

      {/* Task 2 Card Skeleton */}
      <div className="w-full h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>

      {/* Ad Skeleton */}
      <div className="w-full h-48 border-2 border-dashed border-purple-200 dark:border-purple-900 bg-purple-50/50 rounded-2xl flex items-center justify-center">
        <div className="h-6 w-32 bg-purple-200 dark:bg-purple-900 rounded-md" />
      </div>
    </div>
  );
};

export const PlayerSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-pulse">
      {/* Video Player Box Skeleton */}
      <div className="w-full aspect-video bg-slate-200 dark:bg-slate-800 rounded-2xl" />

      {/* Title & Metadata Skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-7 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="flex gap-4">
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
      </div>

      {/* Download Button Skeleton */}
      <div className="h-14 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl" />

      {/* Ad Banner Skeleton */}
      <div className="w-full h-48 border-2 border-dashed border-purple-200 dark:border-purple-900 bg-purple-50/50 rounded-2xl" />
    </div>
  );
};

export const TelegramPageSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-6 animate-pulse my-8">
      <div className="w-20 h-20 rounded-3xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
      <div className="w-full h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
  );
};

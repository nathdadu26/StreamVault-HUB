import React from 'react';

export const TaskGatewaySkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-5 animate-pulse">
      {/* Title skeleton */}
      <div className="flex flex-col items-center gap-2 text-center my-3">
        <div className="h-7 w-48 bg-neutral-200 dark:bg-white/[0.08] rounded-xl" />
        <div className="h-4 w-72 bg-neutral-100 dark:bg-white/[0.05] rounded-lg" />
      </div>

      {/* Instructions Card Skeleton */}
      <div className="w-full bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-6 space-y-4 shadow-sm dark:shadow-lg dark:shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-white/[0.06]" />
          <div className="h-4 w-28 bg-neutral-100 dark:bg-white/[0.06] rounded-md" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-neutral-100 dark:bg-white/[0.04] rounded-md" />
          <div className="h-4 w-5/6 bg-neutral-100 dark:bg-white/[0.04] rounded-md" />
        </div>
      </div>

      {/* Task 1 & 2 Skeleton */}
      <div className="w-full bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-6 space-y-4 shadow-sm dark:shadow-lg dark:shadow-black/20">
        <div className="h-5 w-36 bg-neutral-200 dark:bg-white/[0.08] rounded-md" />
        <div className="h-16 w-full bg-neutral-100 dark:bg-white/[0.04] rounded-[16px]" />
        <div className="h-16 w-full bg-neutral-100 dark:bg-white/[0.04] rounded-[16px]" />
      </div>

      {/* Ad Skeleton */}
      <div className="w-full h-44 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#141416] rounded-[20px] flex items-center justify-center shadow-sm dark:shadow-lg dark:shadow-black/20">
        <div className="h-5 w-32 bg-neutral-100 dark:bg-white/[0.06] rounded-md" />
      </div>
    </div>
  );
};

export const PlayerSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-5 animate-pulse">
      {/* Video Player Box Skeleton */}
      <div className="w-full aspect-video bg-neutral-200 dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] shadow-sm dark:shadow-lg dark:shadow-black/20" />

      {/* Title & Metadata Skeleton */}
      <div className="bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm dark:shadow-lg dark:shadow-black/20">
        <div className="space-y-2 w-full max-w-md">
          <div className="h-5 w-3/4 bg-neutral-200 dark:bg-white/[0.08] rounded-md" />
          <div className="h-4 w-1/3 bg-neutral-100 dark:bg-white/[0.04] rounded-md" />
        </div>
        <div className="h-11 w-32 bg-neutral-200 dark:bg-white/[0.08] rounded-[20px] shrink-0" />
      </div>

      {/* Ad Banner Skeleton */}
      <div className="w-full h-44 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#141416] rounded-[20px] flex items-center justify-center shadow-sm dark:shadow-lg dark:shadow-black/20" />
    </div>
  );
};

export const TelegramPageSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-5 animate-pulse">
      <div className="w-full h-44 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#141416] rounded-[20px] flex items-center justify-center shadow-sm dark:shadow-lg dark:shadow-black/20" />
      <div className="w-full h-24 bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] shadow-sm dark:shadow-lg dark:shadow-black/20" />
    </div>
  );
};


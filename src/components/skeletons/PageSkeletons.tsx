export function TodaySkeleton() {
  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-7 animate-pulse">
      {/* Greeting skeleton */}
      <div className="mb-6 space-y-2">
        <div className="skeleton h-3 w-32 rounded-md" />
        <div className="skeleton h-8 w-48 rounded-lg" />
      </div>

      {/* Daily Verse skeleton */}
      <div className="skeleton mb-6 h-28 w-full rounded-2xl" />

      {/* Hero skeleton */}
      <div className="skeleton mb-4 h-48 w-full rounded-2xl" />

      {/* At a glance stats */}
      <div className="skeleton mb-8 h-20 w-full rounded-2xl" />

      {/* Chapters header */}
      <div className="mb-3 flex justify-between">
        <div className="skeleton h-4 w-28 rounded-md" />
        <div className="skeleton h-4 w-12 rounded-md" />
      </div>

      {/* 10 Chapters cards */}
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-[76px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ProgressSkeleton() {
  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-7 animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="skeleton h-8 w-36 rounded-lg" />
        <div className="skeleton h-4 w-64 rounded-md" />
      </div>

      {/* Headline stat card */}
      <div className="skeleton mb-8 h-52 w-full rounded-2xl" />

      {/* List items */}
      <div className="space-y-2.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function CommunitySkeleton() {
  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-7 animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="skeleton h-4 w-56 rounded-md" />
      </div>

      {/* Circle card */}
      <div className="skeleton mb-5 h-44 w-full rounded-2xl" />

      {/* Search input */}
      <div className="skeleton mb-6 h-12 w-full rounded-2xl" />

      {/* Standings table */}
      <div className="skeleton mb-6 h-48 w-full rounded-2xl" />

      {/* Friends list */}
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ lines = 3, showAvatar = false }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5"
      style={{ animation: 'none' }}>
      {showAvatar && (
        <div className="flex items-center gap-3 mb-4">
          <div className="skeleton w-9 h-9 rounded-full" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="skeleton h-3 w-2/5" />
            <div className="skeleton h-2.5 w-3/5" />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skeleton h-2.5"
            style={{ width: `${[100, 85, 70, 90, 60][i % 5]}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonMetrics({ count = 4 }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-50 rounded-2xl p-4">
          <div className="skeleton h-2.5 w-1/2 mb-3" />
          <div className="skeleton h-7 w-1/3 mb-2" />
          <div className="skeleton h-2 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
          <div className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <div className="skeleton h-2.5 w-28" />
              <div className="skeleton h-2 w-16" />
            </div>
          </div>
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
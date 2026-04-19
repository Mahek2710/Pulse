export default function PageWrapper({ children, title, subtitle, action }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--pulse-surface)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8 animate-in">
        {(title || action) && (
          <div className="flex items-start justify-between mb-7">
            <div>
              {title && <h1 className="text-2xl font-medium text-slate-900">{title}</h1>}
              {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
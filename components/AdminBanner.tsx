export function AdminBanner() {
  return (
    <div className="w-full bg-white border-b border-brand-200">
      <div className="mx-auto max-w-6xl px-4 py-3 text-xs sm:text-sm text-zinc-900">
        <p className="font-semibold text-brand-700">Demo Mode</p>
        <p className="mt-1">
          Images are stored locally in your browser only. Projects will not be
          accessible from other devices or browsers. Clearing browser data will
          erase all projects.
        </p>
      </div>
    </div>
  );
}


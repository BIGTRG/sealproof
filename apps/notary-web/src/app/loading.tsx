export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-warm">
      <div className="text-center">
        <div className="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gold-400" />
        <p className="mt-4 text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

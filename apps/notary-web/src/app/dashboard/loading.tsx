export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="inline-flex h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-gold-400" />
        <p className="mt-3 text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

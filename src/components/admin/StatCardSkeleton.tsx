export default function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function ExamCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex space-x-2 ml-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
        <div className="text-center">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
        <div className="text-center">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
        <div className="text-center">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

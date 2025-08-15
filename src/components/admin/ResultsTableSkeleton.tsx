export default function ResultRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-4 px-4">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      </td>
      <td className="py-4 px-4">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </td>
      <td className="py-4 px-4">
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
      </td>
      <td className="py-4 px-4">
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
      </td>
      <td className="py-4 px-4">
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
      </td>
      <td className="py-4 px-4">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </td>
      <td className="py-4 px-4">
        <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
      </td>
      <td className="py-4 px-4">
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
      </td>
    </tr>
  );
}

export function ResultsTableSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-4 px-4 font-medium text-gray-700">Student</th>
              <th className="text-left py-4 px-4 font-medium text-gray-700">Exam</th>
              <th className="text-left py-4 px-4 font-medium text-gray-700">Score</th>
              <th className="text-left py-4 px-4 font-medium text-gray-700">Percentage</th>
              <th className="text-left py-4 px-4 font-medium text-gray-700">Duration</th>
              <th className="text-left py-4 px-4 font-medium text-gray-700">Date</th>
              <th className="text-left py-4 px-4 font-medium text-gray-700">Status</th>
              <th className="text-left py-4 px-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, index) => (
              <ResultRowSkeleton key={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Page</h1>
        <p className="text-gray-600">If you can see this, the app is working!</p>
        <div className="mt-4">
          <a href="/login" className="text-blue-600 hover:text-blue-700">
            Go to Login
          </a>
        </div>
      </div>
    </div>
  );
}

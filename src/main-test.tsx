import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Minimal test app
function TestApp() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">App is Working!</h1>
        <p className="text-gray-600">If you can see this, React is rendering correctly.</p>
        <button 
          onClick={() => alert('Button clicked!')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Button
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestApp />
  </StrictMode>,
)

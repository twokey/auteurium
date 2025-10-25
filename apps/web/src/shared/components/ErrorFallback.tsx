/**
 * Error Fallback UI
 * Displays when an error boundary catches an error
 */

interface ErrorFallbackProps {
  error: Error | null
  resetError: () => void
}

export const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-600">
              An unexpected error occurred
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 rounded border border-red-200">
            <p className="text-sm text-red-800 font-mono break-words">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetError}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Go home
          </button>
        </div>

        {import.meta.env.DEV && error?.stack && (
          <details className="mt-4">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
              Stack trace (development only)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-48">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}




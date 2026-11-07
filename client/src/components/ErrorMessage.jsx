import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({
  title = 'Something went wrong',
  message = 'We encountered an error loading this information. Please check your network or try again.',
  suggestion = 'Ensure your connection is stable and reload the page.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-base text-red-950 font-heading">{title}</h4>
          <p className="text-sm text-red-800 mt-0.5">{message}</p>
          {suggestion && (
            <p className="text-xs text-red-700 mt-1.5 bg-red-100/60 p-2 rounded border border-red-200/50">
              <span className="font-medium">Suggestion:</span> {suggestion}
            </p>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

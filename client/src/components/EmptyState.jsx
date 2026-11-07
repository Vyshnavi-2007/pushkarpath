import React from 'react';
import { Search, Inbox, AlertCircle } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are no records matching your current filter or search criteria.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-stone-200 ${className}`}>
      <div className="w-14 h-14 rounded-full bg-sandal flex items-center justify-center text-maroon mb-4 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-stone-900 font-heading mb-1">{title}</h3>
      <p className="text-stone-600 text-sm max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 bg-maroon text-white text-sm font-medium rounded-lg hover:bg-maroon-light transition-colors focus:ring-2 focus:ring-marigold focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

import React from 'react';

export function Skeleton({ className = '', variant = 'rect' }) {
  const baseClasses = 'bg-stone-200 animate-pulse';
  const variantClasses = {
    text: 'h-4 w-full rounded',
    rect: 'rounded-lg',
    circle: 'rounded-full',
  }[variant];

  return <div className={`${baseClasses} ${variantClasses} ${className}`} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-3/5" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-2/5" />
      <div className="space-y-2 pt-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2">
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="border-b border-stone-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-3">
          <Skeleton className={`h-4 ${i === 0 ? 'w-24' : 'w-full'}`} />
        </td>
      ))}
    </tr>
  );
}

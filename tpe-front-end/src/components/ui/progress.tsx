'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value?: number;
  className?: string;
}

const Progress: React.FC<ProgressProps> = ({ value = 0, className }) => {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-gray-200", className)}>
      <div
        className="h-full bg-red-600 transition-all duration-300 ease-in-out"
        style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }}
      />
    </div>
  );
};

export { Progress };
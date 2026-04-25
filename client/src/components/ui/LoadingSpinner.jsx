import React from 'react';
import { cn } from '../../lib/utils';

function LoadingSpinner({ className }) {
  return (
    <svg
      xmlns="http://www.000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin text-primary-600", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default LoadingSpinner;

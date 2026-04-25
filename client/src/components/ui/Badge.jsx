import React from 'react';
import { cn } from '../../lib/utils';

function Badge({ className, variant = 'default', children, ...props }) {
  const variants = {
    default: 'bg-primary-100 text-primary-800 hover:bg-primary-200',
    success: 'bg-green-100 text-green-800 hover:bg-green-200', // Good
    warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', // Fair
    danger: 'bg-orange-100 text-orange-800 hover:bg-orange-200', // Poor
    destructive: 'bg-red-100 text-red-800 hover:bg-red-200', // Damaged
    outline: 'text-slate-950 border border-slate-200',
  };

  return (
    <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2", variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export default Badge;

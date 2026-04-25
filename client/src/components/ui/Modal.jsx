import React, { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, className }) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div 
        className={cn("bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-lg p-6 mx-4 relative transform animate-in zoom-in-95 duration-200", className)}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        {title && <h2 className="text-xl font-semibold text-slate-900 mb-4">{title}</h2>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export default Modal;

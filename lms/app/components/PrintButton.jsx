'use client';

import { IconPrint } from '@/app/components/icons';

export default function PrintButton({ label = 'Print', className = '' }) {
  return (
    <button 
      onClick={() => window.print()} 
      className={`flex items-center gap-2 cursor-pointer print:hidden ${className}`}
    >
      <IconPrint className="w-4 h-4" /> {label}
    </button>
  );
}

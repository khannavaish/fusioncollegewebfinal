'use client';

import { deleteClass } from '@/app/actions/admin';

export default function DeleteClassForm({ id }) {
  const handleSubmit = (e) => {
    if (!confirm('Are you sure you want to delete this class? This will delete all course configurations, exams, and lectures for this class.')) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteClass} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-red-400 text-xs font-medium hover:bg-red-950/20 transition-colors cursor-pointer"
      >
        Delete
      </button>
    </form>
  );
}

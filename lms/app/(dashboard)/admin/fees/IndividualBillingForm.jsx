'use client';

import { useActionState, useState } from 'react';
import { generateIndividualBill } from '@/app/actions/fees';
import { IconBolt, IconCheckCircle, IconXCircle, IconLoader } from '@/app/components/icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function IndividualBillingForm({ month, year, students }) {
  const [state, action, isPending] = useActionState(generateIndividualBill, null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter students based on search
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 50); // limit to 50 for performance in dropdown

  return (
    <>
      <form action={action} className="flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-64 relative">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Select Student</label>
          <input 
            type="text" 
            placeholder="Search by name or roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full mb-2 bg-[#060810] border border-[#1e233d] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-600"
          />
          <select name="studentId" required
            className="w-full bg-[#060810] border border-[#1e233d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer">
            <option value="">Select a student</option>
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
            ))}
            {filteredStudents.length === 0 && <option value="" disabled>No students found</option>}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Billing Month</label>
          <select name="month" defaultValue={month}
            className="w-full sm:w-40 bg-[#060810] border border-[#1e233d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer">
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Fiscal Year</label>
          <select name="year" defaultValue={year}
            className="w-full sm:w-32 bg-[#060810] border border-[#1e233d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer">
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Due Date</label>
          <select name="dueDay" defaultValue={10}
            className="w-full sm:w-48 bg-[#060810] border border-[#1e233d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const suffix = [1, 21, 31].includes(d) ? 'st' : [2, 22].includes(d) ? 'nd' : [3, 23].includes(d) ? 'rd' : 'th';
              return (
                <option key={d} value={d}>{d}{suffix} of the month</option>
              );
            })}
          </select>
        </div>
        <button type="submit" disabled={isPending}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
          {isPending ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconBolt className="w-4 h-4" />}
          {isPending ? 'Generating...' : 'Generate Individual Bill'}
        </button>
      </form>
      
      {state?.error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-950/40 border border-red-700/40 text-red-300 text-sm font-medium flex items-center gap-2">
          <IconXCircle className="w-4 h-4 text-red-400" />
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-sm font-medium flex items-center gap-2">
          <IconCheckCircle className="w-4 h-4 text-emerald-400" />
          Individual bill generated successfully!
        </div>
      )}
    </>
  );
}

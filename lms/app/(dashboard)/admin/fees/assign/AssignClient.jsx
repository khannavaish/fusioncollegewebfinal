'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconSettings,
  IconChevronRight,
  IconUsers,
  IconBuilding,
  IconCheckCircle,
  IconAlertTriangle,
} from '@/app/components/icons';
import AnimatedSection from '@/app/components/AnimatedSection';
import { assignFeePackages } from '@/app/actions/fees';

export default function AssignClient({ students, packages, classes }) {
  const router = useRouter();
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('UNASSIGNED'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'
  
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [customOverride, setCustomOverride] = useState('');
  
  const [isPending, startTransition] = useTransition();

  // Filter students
  const filteredStudents = students.filter(s => {
    if (filterClass !== 'ALL' && s.classId !== filterClass) return false;
    const hasPackage = s.feePackageId || s.feeMonthlyOverride;
    if (filterStatus === 'ASSIGNED' && !hasPackage) return false;
    if (filterStatus === 'UNASSIGNED' && hasPackage) return false;
    return true;
  });

  const toggleStudent = (id) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleAssign = () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student.');
      return;
    }
    if (!selectedPackage && !customOverride) {
      alert('Please select a fee package or enter a custom override amount.');
      return;
    }

    startTransition(async () => {
      const res = await assignFeePackages(
        selectedStudents, 
        selectedPackage || null, 
        customOverride || null
      );
      if (res.error) {
        alert(res.error);
      } else {
        alert('Packages assigned successfully!');
        setSelectedStudents([]);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8 font-sans">
      <AnimatedSection delay={0.05}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
              <Link href="/admin" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
              <IconChevronRight className="w-3 h-3" />
              <Link href="/admin/fees" className="hover:text-cyan-400 transition-colors">Fee Management</Link>
              <IconChevronRight className="w-3 h-3" />
              <span className="text-zinc-300">Assign Packages</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <IconUsers className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Bulk Assign Fee Packages</h1>
            </div>
          </div>
          <div className="bg-[#16192b] border border-[#2b3052] rounded-lg px-4 py-2.5 flex items-center gap-3">
            <IconAlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <div className="font-bold text-white text-sm">
                {students.filter(s => !s.feePackageId && !s.feeMonthlyOverride).length} Unassigned
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Active Students</div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-5 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Class Filter</label>
                <select
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Assignment Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="UNASSIGNED">Unassigned Only</option>
                  <option value="ASSIGNED">Assigned Only</option>
                  <option value="ALL">All Students</option>
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#1e233d] flex items-center justify-between">
                <h2 className="font-bold text-white text-sm">Students List ({filteredStudents.length})</h2>
                <button
                  onClick={selectAll}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#16192b]/80 sticky top-0 backdrop-blur-sm border-b border-[#1e233d]">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">
                        <input 
                          type="checkbox"
                          checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                          onChange={selectAll}
                          className="accent-cyan-500 rounded border-[#1e233d] w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 font-bold text-zinc-400 uppercase tracking-wider text-xs">Student</th>
                      <th className="px-4 py-3 font-bold text-zinc-400 uppercase tracking-wider text-xs">Class</th>
                      <th className="px-4 py-3 font-bold text-zinc-400 uppercase tracking-wider text-xs text-right">Current Package</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e233d]">
                    {filteredStudents.map(s => {
                      const hasPackage = s.feePackageId || s.feeMonthlyOverride;
                      return (
                        <tr key={s.id} 
                            onClick={() => toggleStudent(s.id)}
                            className={`cursor-pointer transition-colors ${selectedStudents.includes(s.id) ? 'bg-cyan-950/20' : 'hover:bg-[#16192b]/50'}`}>
                          <td className="px-4 py-3 text-center">
                            <input 
                              type="checkbox"
                              checked={selectedStudents.includes(s.id)}
                              readOnly
                              className="accent-cyan-500 rounded border-[#1e233d] w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-white">{s.name}</div>
                            <div className="text-xs text-zinc-500 font-mono mt-0.5">{s.rollNumber}</div>
                          </td>
                          <td className="px-4 py-3 text-zinc-300">{s.class?.name || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {s.feePackage ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                <IconCheckCircle className="w-3 h-3" />
                                {s.feePackage.name}
                              </span>
                            ) : s.feeMonthlyOverride ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-950/30 text-amber-400 border border-amber-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                Custom: ₨{s.feeMonthlyOverride}
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-xs italic">None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                          No students found matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#0d0f1a] to-[#16192b] border border-[#1e233d] rounded-2xl p-6 shadow-xl sticky top-6">
              <h2 className="text-lg font-bold text-white mb-1">Assignment Configuration</h2>
              <p className="text-xs text-zinc-400 mb-6">Select a package or set a custom amount for the {selectedStudents.length} selected students.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Select Package</label>
                  <select
                    value={selectedPackage}
                    onChange={e => {
                      setSelectedPackage(e.target.value);
                      if (e.target.value) setCustomOverride('');
                    }}
                    className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="">-- Choose a standard package --</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (₨{p.monthlyFee})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-px bg-[#1e233d] flex-1" />
                  <span className="text-xs font-bold text-zinc-500 uppercase">OR</span>
                  <div className="h-px bg-[#1e233d] flex-1" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Custom Monthly Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₨</span>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={customOverride}
                      onChange={e => {
                        setCustomOverride(e.target.value);
                        if (e.target.value) setSelectedPackage('');
                      }}
                      className="w-full bg-[#0a0c14] border border-[#1e233d] text-white pl-8 pr-3 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder-zinc-700"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">This overrides standard packages</p>
                </div>

                <div className="pt-4 border-t border-[#1e233d]">
                  <button
                    onClick={handleAssign}
                    disabled={isPending || selectedStudents.length === 0}
                    className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isPending ? 'Assigning...' : `Assign to ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}

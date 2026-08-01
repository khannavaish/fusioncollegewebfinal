'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateTeacherSalaries, payTeacherSalary, updateTeacherBaseSalary } from '@/app/actions/payroll';
import AnimatedSection from '@/app/components/AnimatedSection';

export default function PayrollClient({ initialBills, allTeachers, currentMonth, currentYear }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' | 'salaries'
  
  const [payModal, setPayModal] = useState(null); // bill object
  const [editingSalaryId, setEditingSalaryId] = useState(null);

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  const handleMonthChange = (e) => {
    router.push(`/admin/fees/payroll?month=${e.target.value}&year=${currentYear}`);
  };

  const handleYearChange = (e) => {
    router.push(`/admin/fees/payroll?month=${currentMonth}&year=${e.target.value}`);
  };

  const handleGenerate = async () => {
    const confirmGen = confirm(`Generate salary bills for ${months.find(m => m.value === currentMonth).label} ${currentYear}?`);
    if (!confirmGen) return;

    setGenerating(true);
    const fd = new FormData();
    fd.append('month', currentMonth);
    fd.append('year', currentYear);
    
    const res = await generateTeacherSalaries(fd);
    setGenerating(false);
    
    if (res?.error) {
      alert(res.error);
    } else {
      alert(`Successfully generated ${res.generated} salary bills.`);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    startTransition(async () => {
      const res = await payTeacherSalary(fd);
      if (res?.error) {
        alert(res.error);
      } else {
        setPayModal(null);
      }
    });
  };

  const handleUpdateSalary = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    startTransition(async () => {
      const res = await updateTeacherBaseSalary(fd);
      if (res?.error) {
        alert(res.error);
      } else {
        setEditingSalaryId(null);
      }
    });
  };

  const totalPayroll = initialBills.reduce((acc, b) => acc + Number(b.baseAmount), 0);
  const totalPaid = initialBills.reduce((acc, b) => acc + (b.paidAmount ? Number(b.paidAmount) : 0), 0);
  const totalUnpaid = totalPayroll - totalPaid;

  return (
    <AnimatedSection delay={0.1}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Teacher Salaries & Payroll</h1>
          <p className="text-xs text-zinc-400 mt-1">Manage monthly salary distributions and base salaries</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center bg-[#0d0f1a] border border-[#1e233d] p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('bills')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'bills' ? 'bg-[#1e233d] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Monthly Bills
            </button>
            <button 
              onClick={() => setActiveTab('salaries')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'salaries' ? 'bg-[#1e233d] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Manage Base Salaries
            </button>
          </div>
          
          {activeTab === 'bills' && (
            <div className="flex items-center gap-3">
              <select 
                value={currentMonth} 
                onChange={handleMonthChange}
                className="bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white"
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <input 
                type="number" 
                value={currentYear}
                onChange={handleYearChange}
                className="bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white w-24"
              />
              <button 
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
              >
                {generating ? 'Generating...' : 'Generate Salaries'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Payroll</p>
          <p className="text-2xl font-black text-white mt-1">₨ {totalPayroll.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-5">
          <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-wider">Total Disbursed</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">₨ {totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-5">
          <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-wider">Pending Balance</p>
          <p className="text-2xl font-black text-amber-400 mt-1">₨ {totalUnpaid.toLocaleString()}</p>
        </div>
      </div>

      {activeTab === 'bills' && (
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e233d] bg-[#16192b]/50">
                <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Teacher</th>
                <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dept / Role</th>
                <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Base Salary</th>
                <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Paid Amount</th>
                <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialBills.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-sm text-zinc-500">
                    No salary bills generated for this month. Click "Generate Salaries" to populate.
                  </td>
                </tr>
              ) : (
                initialBills.map((bill, i) => (
                  <tr key={bill.id} className={`border-b border-[#1e233d] hover:bg-[#16192b]/30 transition-colors ${i % 2 === 1 ? 'bg-[#16192b]/10' : ''}`}>
                    <td className="px-5 py-4 font-semibold text-sm text-white">{bill.teacher.name}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{bill.teacher.department || '-'}</td>
                    <td className="px-5 py-4 text-sm font-mono text-cyan-400">₨ {Number(bill.baseAmount).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      {bill.status === 'PAID' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border-emerald-500/30">
                          PAID
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider bg-amber-950/40 text-amber-400 border-amber-500/30">
                          UNPAID
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-zinc-300">
                      {bill.paidAmount ? `₨ ${Number(bill.paidAmount).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-4">
                      {bill.status === 'UNPAID' && (
                        <button
                          onClick={() => setPayModal(bill)}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'salaries' && (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e233d] bg-[#16192b]/50">
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Teacher</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dept / Role</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Base Salary</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allTeachers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center text-sm text-zinc-500">
                      No teachers found.
                    </td>
                  </tr>
                ) : (
                  allTeachers.map((teacher, i) => (
                    <tr key={teacher.id} className={`border-b border-[#1e233d] hover:bg-[#16192b]/30 transition-colors ${i % 2 === 1 ? 'bg-[#16192b]/10' : ''}`}>
                      <td className="px-5 py-4 font-semibold text-sm text-white">{teacher.name}</td>
                      <td className="px-5 py-4 text-xs text-zinc-400">{teacher.department || '-'}</td>
                      <td className="px-5 py-4">
                        {editingSalaryId === teacher.id ? (
                          <form id={`form-${teacher.id}`} onSubmit={handleUpdateSalary} className="flex items-center gap-2">
                            <input type="hidden" name="teacherId" value={teacher.id} />
                            <span className="text-zinc-500 font-mono text-sm">₨</span>
                            <input 
                              type="number" 
                              name="baseSalary" 
                              defaultValue={teacher.baseSalary || ''}
                              className="w-24 bg-[#0a0c14] border border-[#1e233d] rounded text-sm px-2 py-1 text-white" 
                              placeholder="0"
                            />
                          </form>
                        ) : (
                          <span className="text-sm font-mono text-cyan-400">
                            {teacher.baseSalary ? `₨ ${Number(teacher.baseSalary).toLocaleString()}` : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {editingSalaryId === teacher.id ? (
                          <div className="flex gap-2">
                            <button form={`form-${teacher.id}`} type="submit" className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded transition-colors">Save</button>
                            <button type="button" onClick={() => setEditingSalaryId(null)} className="px-3 py-1 bg-[#1e233d] hover:bg-[#2a304e] text-zinc-300 text-xs font-semibold rounded transition-colors">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingSalaryId(teacher.id)} className="px-3 py-1 bg-[#1e233d] hover:bg-[#2a304e] text-cyan-400 text-xs font-semibold rounded transition-colors">
                            Edit Salary
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Process Salary</h3>
            <p className="text-xs text-zinc-400 mb-5">Pay salary to {payModal.teacher.name}</p>
            
            <form onSubmit={handlePay} className="space-y-4">
              <input type="hidden" name="billId" value={payModal.id} />
              
              <div>
                <label className="block text-xs text-zinc-500 mb-1 font-medium">Base Salary</label>
                <div className="text-sm font-mono text-white bg-[#0a0c14] border border-[#1e233d] p-2.5 rounded-lg">
                  ₨ {Number(payModal.baseAmount).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1 font-medium">Actual Paid Amount</label>
                <input 
                  type="number" 
                  name="paidAmount" 
                  defaultValue={Number(payModal.baseAmount)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm font-mono text-white" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1 font-medium">Remarks (Optional)</label>
                <input 
                  type="text" 
                  name="remarks" 
                  placeholder="e.g. Paid via Bank Transfer"
                  className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white" 
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setPayModal(null)}
                  className="flex-1 py-2.5 bg-[#16192b] hover:bg-[#1e233d] text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/20"
                >
                  {isPending ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AnimatedSection>
  );
}

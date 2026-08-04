'use client';

import { useState, useTransition } from 'react';
import { getStudentLedger, getTeacherLedger, getClassLedger } from '@/app/actions/ledgers';
import { IconPrint, IconUserTie, IconUsers, IconGraduationCap, IconCheckCircle, IconXCircle } from '@/app/components/icons';

export default function LedgerClient({ students, teachers, classes }) {
  const [activeTab, setActiveTab] = useState('student'); // 'student', 'teacher', 'class'
  const [isPending, startTransition] = useTransition();

  // Selected IDs
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  
  // Date Filters for Class Ledger
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');

  // Fetched Data
  const [studentData, setStudentData] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [classData, setClassData] = useState(null);

  const handleFetchStudent = () => {
    if (!selectedStudent) return;
    startTransition(async () => {
      const res = await getStudentLedger(selectedStudent, filterMonth, filterYear);
      if (res.student) setStudentData(res.student);
    });
  };

  const handleFetchTeacher = () => {
    if (!selectedTeacher) return;
    startTransition(async () => {
      const res = await getTeacherLedger(selectedTeacher, filterMonth, filterYear);
      if (res.teacher) setTeacherData(res.teacher);
    });
  };

  const handleFetchClass = () => {
    if (!selectedClass) return;
    startTransition(async () => {
      const res = await getClassLedger(selectedClass, filterMonth, filterYear);
      if (res.classData) setClassData(res);
    });
  };

  const getMonthName = (m) => new Date(2000, m - 1).toLocaleString('default', { month: 'short' });

  // Print Header
  const PrintHeader = ({ title }) => (
    <div className="hidden print:flex justify-between items-end border-b-2 border-cyan-600 pb-4 mb-8 text-black" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-cyan-800">Fusion College</h1>
          <p className="text-sm font-semibold text-zinc-600">Excellence in Education</p>
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-xl font-bold uppercase tracking-widest text-indigo-900">{title}</h2>
        <p className="text-xs font-medium text-zinc-500">Generated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );

  return (
    <div>
      {/* Tabs - Hidden in Print */}
      <div className="print:hidden flex items-center bg-[#0d0f1a] border border-[#1e233d] p-1 rounded-lg w-fit mb-8">
        <button onClick={() => setActiveTab('student')} className={`px-5 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${activeTab === 'student' ? 'bg-[#1e233d] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <IconGraduationCap className="w-4 h-4" /> Student Ledger
        </button>
        <button onClick={() => setActiveTab('teacher')} className={`px-5 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${activeTab === 'teacher' ? 'bg-[#1e233d] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <IconUserTie className="w-4 h-4" /> Teacher Ledger
        </button>
        <button onClick={() => setActiveTab('class')} className={`px-5 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${activeTab === 'class' ? 'bg-[#1e233d] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <IconUsers className="w-4 h-4" /> Class Fee Ledger
        </button>
      </div>

      {/* --- STUDENT LEDGER --- */}
      {activeTab === 'student' && (
        <div className="space-y-6">
          <div className="print:hidden flex flex-col md:flex-row items-center gap-3 p-4 bg-[#0d0f1a] border border-[#1e233d] rounded-xl shadow-lg">
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="flex-1 w-full bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">-- Select a Student --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>)}
            </select>
            
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full md:w-auto bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">All Months</option>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full md:w-auto bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">All Years</option>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <button onClick={handleFetchStudent} disabled={isPending || !selectedStudent} className="w-full md:w-auto px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap">
              {isPending ? 'Loading...' : 'Load Ledger'}
            </button>
          </div>

          {studentData && (
            <div className="bg-white print:bg-transparent print:shadow-none print:border-none border border-zinc-200 rounded-2xl p-8 print:p-0 shadow-2xl text-black">
              <PrintHeader title="Student Fee Ledger" />
              
              <div className="flex justify-between items-start mb-8 print:mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                  {studentData.photoUrl ? (
                    <img src={studentData.photoUrl} alt={studentData.name} className="w-20 h-20 rounded-full object-cover border-2 border-cyan-600 print:border-black shadow-md flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-800 text-3xl font-black border-2 border-cyan-600 print:border-black shadow-md flex-shrink-0">
                      {studentData.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-cyan-900">{studentData.name}</h3>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-8 gap-y-1 text-sm font-medium text-zinc-700">
                      <p><strong>Roll No:</strong> {studentData.rollNumber}</p>
                      <p><strong>Father:</strong> {studentData.fatherName}</p>
                      <p><strong>Class:</strong> {studentData.class?.name}</p>
                      <p><strong>Address:</strong> {studentData.address || 'N/A'}</p>
                      <p><strong>Contact:</strong> {studentData.whatsappNumber || studentData.telephone || 'N/A'}</p>
                    </div>
                    {(filterMonth !== 'ALL' || filterYear !== 'ALL') && (
                      <p className="text-cyan-700 print:text-cyan-900 bg-cyan-50 print:bg-transparent w-fit px-2 py-0.5 rounded border border-cyan-200 print:border-none mt-3 text-sm">
                        <strong>Period Filter:</strong> {filterMonth !== 'ALL' ? getMonthName(filterMonth) : 'All Months'} {filterYear !== 'ALL' ? filterYear : 'All Years'}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => window.print()} className="print:hidden flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white text-sm font-bold rounded-lg transition-colors shadow-lg mt-2 md:mt-0">
                  <IconPrint className="w-4 h-4" /> Print PDF
                </button>
              </div>

              <div className="overflow-x-auto -mx-4 px-4 print:mx-0 print:px-0 print:overflow-visible">
              <table className="w-full text-left border-collapse mb-8 text-sm min-w-[440px] print:min-w-0">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="py-2 px-2 font-bold uppercase tracking-wider">Date/Period</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider">Description</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Debit (Fee)</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Credit (Paid)</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {studentData.feeBills.length === 0 ? (
                    <tr><td colSpan="5" className="py-4 text-center italic text-zinc-500">No records found.</td></tr>
                  ) : (
                    studentData.feeBills.map((bill, i) => {
                      const debit = Number(bill.totalAmount);
                      const credit = bill.paidAmount ? Number(bill.paidAmount) : 0;
                      return (
                        <tr key={bill.id} className="border-b border-zinc-200 print:border-zinc-300">
                          <td className="py-3 px-2 font-medium">{getMonthName(bill.month)} {bill.year}</td>
                          <td className="py-3 px-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Tuition Fee Bill
                            {bill.status === 'PAID' && <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 print:bg-green-100 print:text-green-800 px-1.5 py-0.5 rounded uppercase">Paid</span>}
                            {bill.status === 'UNPAID' && <span className="ml-2 text-[10px] font-bold bg-red-100 text-red-700 print:bg-red-100 print:text-red-800 px-1.5 py-0.5 rounded uppercase">Unpaid</span>}
                            {bill.status === 'PARTIAL' && <span className="ml-2 text-[10px] font-bold bg-amber-100 text-amber-700 print:bg-amber-100 print:text-amber-800 px-1.5 py-0.5 rounded uppercase">Partial</span>}
                            {bill.status === 'WAIVED' && <span className="ml-2 text-[10px] font-bold bg-blue-100 text-blue-700 print:bg-blue-100 print:text-blue-800 px-1.5 py-0.5 rounded uppercase">Waived</span>}
                          </td>
                          <td className="py-3 px-2 text-right font-mono">₨ {debit.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-mono text-green-700">{credit > 0 ? `₨ ${credit.toLocaleString()}` : '-'}</td>
                          <td className="py-3 px-2 text-right font-mono font-bold">{debit - credit > 0 ? `₨ ${(debit - credit).toLocaleString()}` : '0'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
              </div>
              <div className="flex justify-end pt-4">
                <div className="w-full max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>Total Billed:</span>
                    <span className="font-mono">₨ {studentData.feeBills.reduce((acc, b) => acc + Number(b.totalAmount), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total Paid:</span>
                    <span className="font-mono">₨ {studentData.feeBills.reduce((acc, b) => acc + (b.paidAmount ? Number(b.paidAmount) : 0), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2">
                    <span>Outstanding:</span>
                    <span className="font-mono">₨ {(studentData.feeBills.reduce((acc, b) => acc + Number(b.totalAmount), 0) - studentData.feeBills.reduce((acc, b) => acc + (b.paidAmount ? Number(b.paidAmount) : 0), 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TEACHER LEDGER --- */}
      {activeTab === 'teacher' && (
        <div className="space-y-6">
          <div className="print:hidden flex flex-col md:flex-row items-center gap-3 p-4 bg-[#0d0f1a] border border-[#1e233d] rounded-xl shadow-lg">
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="flex-1 w-full bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">-- Select a Teacher --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name} - {t.department}</option>)}
            </select>
            
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full md:w-auto bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">All Months</option>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full md:w-auto bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">All Years</option>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <button onClick={handleFetchTeacher} disabled={isPending || !selectedTeacher} className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap">
              {isPending ? 'Loading...' : 'Load Ledger'}
            </button>
          </div>

          {teacherData && (
            <div className="bg-white print:bg-transparent print:shadow-none print:border-none border border-zinc-200 rounded-2xl p-8 print:p-0 shadow-2xl text-black">
              <PrintHeader title="Teacher Salary Ledger" />
              
              <div className="flex justify-between items-start mb-8 print:mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 text-3xl font-black border-2 border-emerald-600 print:border-black shadow-md flex-shrink-0">
                    {teacherData.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-emerald-900">{teacherData.name}</h3>
                    <div className="mt-2 space-y-1 text-sm font-medium text-zinc-700">
                      <p><strong>Department:</strong> {teacherData.department || 'N/A'}</p>
                      <p><strong>Base Salary:</strong> ₨ {teacherData.baseSalary?.toLocaleString() || 'N/A'}</p>
                      <p><strong>Address:</strong> {teacherData.address || 'N/A'}</p>
                    </div>
                    {(filterMonth !== 'ALL' || filterYear !== 'ALL') && (
                      <p className="text-emerald-700 print:text-emerald-900 bg-emerald-50 print:bg-transparent w-fit px-2 py-0.5 rounded border border-emerald-200 print:border-none mt-3 text-sm">
                        <strong>Period Filter:</strong> {filterMonth !== 'ALL' ? getMonthName(filterMonth) : 'All Months'} {filterYear !== 'ALL' ? filterYear : 'All Years'}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => window.print()} className="print:hidden flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white text-sm font-bold rounded-lg transition-colors shadow-lg mt-2 md:mt-0">
                  <IconPrint className="w-4 h-4" /> Print PDF
                </button>
              </div>

              <div className="overflow-x-auto -mx-4 px-4 print:mx-0 print:px-0 print:overflow-visible">
              <table className="w-full text-left border-collapse mb-8 text-sm min-w-[440px] print:min-w-0">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="py-2 px-2 font-bold uppercase tracking-wider">Date/Period</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider">Description</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Credit (Salary)</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Debit (Paid Out)</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherData.salaryBills.length === 0 ? (
                    <tr><td colSpan="5" className="py-4 text-center italic text-zinc-500">No records found.</td></tr>
                  ) : (
                    teacherData.salaryBills.map((bill, i) => {
                      const credit = Number(bill.baseAmount);
                      const debit = bill.paidAmount ? Number(bill.paidAmount) : 0;
                      return (
                        <tr key={bill.id} className="border-b border-zinc-200 print:border-zinc-300">
                          <td className="py-3 px-2 font-medium">{getMonthName(bill.month)} {bill.year}</td>
                          <td className="py-3 px-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Monthly Salary
                            {bill.status === 'PAID' && <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 print:bg-green-100 print:text-green-800 px-1.5 py-0.5 rounded uppercase">Paid</span>}
                            {bill.status === 'UNPAID' && <span className="ml-2 text-[10px] font-bold bg-red-100 text-red-700 print:bg-red-100 print:text-red-800 px-1.5 py-0.5 rounded uppercase">Unpaid</span>}
                          </td>
                          <td className="py-3 px-2 text-right font-mono">₨ {credit.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-mono text-red-700">{debit > 0 ? `₨ ${debit.toLocaleString()}` : '-'}</td>
                          <td className="py-3 px-2 text-right font-mono font-bold">{credit - debit > 0 ? `₨ ${(credit - debit).toLocaleString()}` : '0'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
              </div>

              <div className="flex justify-end pt-4">
                <div className="w-full max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>Total Accrued:</span>
                    <span className="font-mono">₨ {teacherData.salaryBills.reduce((acc, b) => acc + Number(b.baseAmount), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total Disbursed:</span>
                    <span className="font-mono">₨ {teacherData.salaryBills.reduce((acc, b) => acc + (b.paidAmount ? Number(b.paidAmount) : 0), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2">
                    <span>Pending Payable:</span>
                    <span className="font-mono">₨ {(teacherData.salaryBills.reduce((acc, b) => acc + Number(b.baseAmount), 0) - teacherData.salaryBills.reduce((acc, b) => acc + (b.paidAmount ? Number(b.paidAmount) : 0), 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- CLASS LEDGER --- */}
      {activeTab === 'class' && (
        <div className="space-y-6">
          <div className="print:hidden flex flex-col md:flex-row items-center gap-3 p-4 bg-[#0d0f1a] border border-[#1e233d] rounded-xl shadow-lg">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="flex-1 w-full bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">-- Select a Class --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full md:w-auto bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">All Months</option>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full md:w-auto bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">All Years</option>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <button onClick={handleFetchClass} disabled={isPending || !selectedClass} className="w-full md:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap">
              {isPending ? 'Loading...' : 'Load Ledger'}
            </button>
          </div>

          {classData && (
            <div className="bg-white print:bg-transparent print:shadow-none print:border-none border border-zinc-200 rounded-2xl p-8 print:p-0 shadow-2xl text-black">
              <PrintHeader title="Class Fee Balances" />
              
              <div className="flex justify-between items-start mb-8 print:mb-6">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">{classData.classData.name}</h3>
                  <div className="mt-2 space-y-1 text-sm font-medium">
                    <p><strong>Total Students:</strong> {classData.studentLedgers.length}</p>
                    <p><strong>Academic Year:</strong> {classData.classData.academicYr}</p>
                    {(filterMonth !== 'ALL' || filterYear !== 'ALL') && (
                      <p className="text-amber-700 print:text-amber-900 bg-amber-50 print:bg-transparent w-fit px-2 py-0.5 rounded border border-amber-200 print:border-none mt-1">
                        <strong>Period Filter:</strong> {filterMonth !== 'ALL' ? getMonthName(filterMonth) : 'All Months'} {filterYear !== 'ALL' ? filterYear : 'All Years'}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => window.print()} className="print:hidden flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white text-sm font-bold rounded-lg transition-colors shadow-lg">
                  <IconPrint className="w-4 h-4" /> Print PDF
                </button>
              </div>

              <div className="overflow-x-auto -mx-4 px-4 print:mx-0 print:px-0 print:overflow-visible">
              <table className="w-full text-left border-collapse mb-8 text-sm min-w-[440px] print:min-w-0">
                <thead>
                  <tr className="border-b-2 border-black bg-zinc-100 print:bg-transparent">
                    <th className="py-2 px-2 font-bold uppercase tracking-wider">Roll No</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider">Student Name</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Total Billed</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Total Paid</th>
                    <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {classData.studentLedgers.length === 0 ? (
                    <tr><td colSpan="5" className="py-4 text-center italic text-zinc-500">No students found in this class.</td></tr>
                  ) : (
                    classData.studentLedgers.map((stu, i) => (
                      <tr key={stu.id} className="border-b border-zinc-200 print:border-zinc-400">
                        <td className="py-2 px-2 font-medium">{stu.rollNumber}</td>
                        <td className="py-2 px-2 font-semibold uppercase">{stu.name}</td>
                        <td className="py-2 px-2 text-right font-mono">₨ {stu.totalBilled.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono text-green-700">₨ {stu.totalPaid.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-red-600">₨ {stu.outstanding.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>

              <div className="flex justify-end pt-4 mt-8 border-t-2 border-black">
                <div className="w-full max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>Class Total Billed:</span>
                    <span className="font-mono">₨ {classData.studentLedgers.reduce((acc, s) => acc + s.totalBilled, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Class Total Paid:</span>
                    <span className="font-mono">₨ {classData.studentLedgers.reduce((acc, s) => acc + s.totalPaid, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2">
                    <span>Class Total Outstanding:</span>
                    <span className="font-mono text-red-600">₨ {classData.studentLedgers.reduce((acc, s) => acc + s.outstanding, 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

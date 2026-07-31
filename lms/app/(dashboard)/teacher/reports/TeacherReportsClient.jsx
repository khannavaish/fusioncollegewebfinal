'use client';

import { useState, useTransition, useRef } from 'react';
import { toPng } from 'html-to-image';
import {
  IconCheckCircle,
  IconAlertTriangle,
  IconDownload,
  IconDocumentText,
  IconSparkles,
  IconStar,
  IconGraduationCap,
  IconSettings,
  IconPlus,
  IconBookOpen,
  IconBuilding,
  IconClipboard,
  IconSave,
} from '@/app/components/icons';
import { getClassAttendanceReport } from '@/app/actions/reports';
import {
  updateExamResult,
  addExamResult,
  createExamForClassSubject,
  updateExam,
  deleteExam
} from '@/app/actions/adminReports';

export default function TeacherReportsClient({ teacherId, classSubjects }) {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'exams'

  // Date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);

  // --- Attendance Grid States ---
  const [selectedClassId, setSelectedClassId] = useState(classSubjects[0]?.classId || '');
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [loadingAttendance, startLoadingAttendance] = useTransition();

  // --- Exam States ---
  const [selectedClassSubId, setSelectedClassSubId] = useState(classSubjects[0]?.id || '');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [examMarks, setExamMarks] = useState({}); // { [studentId]: marksVal }
  const [savingMarks, startSavingMarks] = useTransition();
  const [loadingExams, startLoadingExams] = useTransition();

  // Create Exam Dialog
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examTotalMarks, setExamTotalMarks] = useState('50');
  const [examDate, setExamDate] = useState(todayStr);

  // Export & Print refs
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  // Mapped ClassSubjects
  const currentClassSub = classSubjects.find(cs => cs.id === selectedClassSubId);
  const currentExam = currentClassSub?.exams.find(e => e.id === selectedExamId);

  // Auto-calculated stats
  const students = currentClassSub?.class.students || [];

  // --- Handlers ---
  const fetchAttendance = () => {
    if (!selectedClassId) return;
    startLoadingAttendance(async () => {
      try {
        const res = await getClassAttendanceReport(selectedClassId, dateFrom, dateTo);
        setAttendanceReport(res);
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const handleCreateExamSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClassSubId || !examTitle || !examTotalMarks) return;
    startLoadingExams(async () => {
      const res = await createExamForClassSubject(selectedClassSubId, examTitle, examDate, examTotalMarks);
      if (res.error) {
        alert(res.error);
      } else {
        alert('Test/Exam created! Please refresh the page to start marking.');
        setShowCreateExam(false);
        setExamTitle('');
        window.location.reload();
      }
    });
  };

  const handleMarkChange = (studentId, value) => {
    setExamMarks(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSaveMarks = async () => {
    if (!currentExam) return;
    startSavingMarks(async () => {
      try {
        for (const student of students) {
          const marksVal = examMarks[student.id];
          if (marksVal === undefined || marksVal === '') continue;

          // Find if there is an existing result
          const existingResult = currentExam.results.find(r => r.studentId === student.id);
          if (existingResult) {
            // Update
            await updateExamResult(existingResult.id, marksVal);
          } else {
            // Create
            await addExamResult(currentExam.id, student.id, marksVal);
          }
        }
        alert('All marks saved successfully.');
        window.location.reload();
      } catch (err) {
        alert('Error saving marks: ' + err.message);
      }
    });
  };

  // Grade Boundaries Helper
  const calculateGrade = (marksObt, totalMarks) => {
    if (!totalMarks || totalMarks <= 0 || marksObt === '') return '-';
    const percentage = (Number(marksObt) / Number(totalMarks)) * 100;
    if (percentage >= 95) return 'A+';
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const getAttendanceBadgeClass = (percentage) => {
    const p = parseFloat(percentage);
    if (p >= 75) return 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400';
    if (p >= 60) return 'bg-amber-950/40 border border-amber-500/30 text-amber-400';
    return 'bg-red-950/40 border border-red-500/30 text-red-400';
  };

  const getStatusColor = (status) => {
    if (status === 'PRESENT' || status === 'P') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'ABSENT' || status === 'A') return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (status === 'LATE' || status === 'L') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (status === 'LEAVE' || status === 'LV') return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  };

  // Populate examMarks dictionary once exam changes
  const handleExamSelect = (examId) => {
    setSelectedExamId(examId);
    if (!examId) {
      setExamMarks({});
      return;
    }
    const exam = currentClassSub?.exams.find(e => e.id === examId);
    if (exam) {
      const marks = {};
      exam.results.forEach(r => {
        marks[r.studentId] = r.marksObt.toString();
      });
      setExamMarks(marks);
    }
  };

  const handleExport = async (filename) => {
    if (!exportRef.current) return;
    setExporting(true);
    await new Promise(r => setTimeout(r, 200));
    try {
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: '#070810',
        pixelRatio: 2,
        style: { padding: '20px', borderRadius: '12px' }
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Export failed.');
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Date Filters Header (applicable to attendance grid) */}
      {activeTab === 'attendance' && (
        <div className="flex flex-wrap gap-4 items-center bg-[#0d0f1a] border border-[#1e233d] p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <IconSparkles className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">Date Filters:</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none"
            />
            <span className="text-zinc-500 flex items-center">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#1e233d] gap-2">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 rounded-t-lg -mb-px cursor-pointer flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'border-cyan-500 text-cyan-400 bg-[#0d0f1a]/40'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <IconBuilding className="w-4 h-4" /> Class Attendance Grid
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 rounded-t-lg -mb-px cursor-pointer flex items-center gap-2 ${
            activeTab === 'exams'
              ? 'border-cyan-500 text-cyan-400 bg-[#0d0f1a]/40'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <IconClipboard className="w-4 h-4" /> Test Result Marks Entry
        </button>
      </div>

      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6 min-h-[400px]">
        {/* --- ATTENDANCE GRID VIEW --- */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-[#16192b]/30 p-4 rounded-xl border border-[#1e233d]">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Class (Assigned)</label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Class --</option>
                  {classSubjects.map(cs => (
                    <option key={cs.class.id} value={cs.class.id}>
                      {cs.class.name} ({cs.subject.name})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={fetchAttendance}
                disabled={loadingAttendance || !selectedClassId}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all"
              >
                {loadingAttendance ? 'Loading...' : 'Load Attendance'}
              </button>
            </div>

            {attendanceReport && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => handleExport(`Attendance_${attendanceReport.className.replace(/\s+/g,'_')}.png`)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#16192b] border border-[#2b3052] text-zinc-300 hover:text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <IconDownload className="w-3.5 h-3.5" /> Export PNG
                  </button>
                </div>

                <div ref={exportRef} className="space-y-5 bg-[#070810] p-6 rounded-xl border border-[#1e233d]">
                  {/* Brand Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#1e233d]">
                    <div className="flex items-center gap-4">
                      <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
                      <div>
                        <h2 className="text-lg font-black text-white">{attendanceReport.className} Attendance</h2>
                        <p className="text-xs text-zinc-500">Date Range: {dateFrom} to {dateTo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Class Average</div>
                      <div className="text-xl font-black text-cyan-400">{attendanceReport.classAverage}%</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-center text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-300 font-bold">
                          <th className="px-4 py-3 text-left w-36 border-r border-[#1e233d]">Roll No</th>
                          <th className="px-4 py-3 text-left min-w-[150px] border-r border-[#1e233d]">Student Name</th>
                          {attendanceReport.dates.map(d => (
                            <th key={d} className="px-2 py-3 min-w-[65px] border-r border-[#1e233d] text-xs">
                              {d.split('-').slice(1).reverse().join('/')}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e233d]">
                        {attendanceReport.studentsAttendance.map(s => (
                          <tr key={s.id} className="hover:bg-[#16192b]/10 text-zinc-300">
                            <td className="px-4 py-3 text-left font-mono font-bold text-white border-r border-[#1e233d]">
                              {s.rollNumber}
                            </td>
                            <td className="px-4 py-3 text-left font-bold text-white border-r border-[#1e233d]">
                              {s.name}
                            </td>
                            {attendanceReport.dates.map(d => {
                              const status = s.attendance[d] || '-';
                              return (
                                <td key={d} className="p-1 border-r border-[#1e233d]">
                                  <span className={`inline-block w-8 py-1 rounded text-xs font-bold border ${getStatusColor(status)}`}>
                                    {status}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-right font-extrabold text-white">
                              <span className={`px-2 py-0.5 rounded text-xs ${getAttendanceBadgeClass(s.percentage)}`}>
                                {s.percentage}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TESTS & RESULT MARKS ENTRY --- */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-[#16192b]/30 p-4 rounded-xl border border-[#1e233d]">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Subject / Class</label>
                <select
                  value={selectedClassSubId}
                  onChange={e => {
                    setSelectedClassSubId(e.target.value);
                    setSelectedExamId('');
                    setExamMarks({});
                  }}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Class --</option>
                  {classSubjects.map(cs => (
                    <option key={cs.id} value={cs.id}>
                      {cs.class.name} - {cs.subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Select Test / Exam</label>
                <select
                  value={selectedExamId}
                  onChange={e => handleExamSelect(e.target.value)}
                  disabled={!selectedClassSubId}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">-- Choose Test --</option>
                  {currentClassSub?.exams.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({new Date(e.date).toLocaleDateString('en-PK')}) - / {e.totalMarks} Marks
                    </option>
                  ))}
                </select>
              </div>

              {selectedClassSubId && (
                <button
                  onClick={() => setShowCreateExam(true)}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <IconPlus className="w-4 h-4" /> Create Test
                </button>
              )}
            </div>

            {currentExam && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-[#16192b]/30 p-4 border border-[#1e233d] rounded-xl">
                  <div className="flex items-center gap-3">
                    <IconGraduationCap className="w-6 h-6 text-cyan-400" />
                    <div>
                      <h2 className="text-lg font-black text-white">{currentExam.title}</h2>
                      <p className="text-xs text-zinc-400">Class: {currentClassSub.class.name} | Total Marks: {currentExam.totalMarks}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveMarks}
                      disabled={savingMarks}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider rounded-lg cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      {savingMarks ? 'Saving...' : <><IconSave className="w-3.5 h-3.5" /> Save All Results</>}
                    </button>
                  </div>
                </div>

                <div className="bg-[#070810] p-6 rounded-xl border border-[#1e233d] space-y-4">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold">
                        <th className="px-4 py-3">Roll Number</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3 text-center">Marks Obtained</th>
                        <th className="px-4 py-3 text-center">Percentage</th>
                        <th className="px-4 py-3 text-right">Auto Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e233d]">
                      {students.map(s => {
                        const marksValue = examMarks[s.id] || '';
                        const pct = marksValue !== '' ? ((Number(marksValue) / currentExam.totalMarks) * 100).toFixed(0) : '0';
                        const grade = calculateGrade(marksValue, currentExam.totalMarks);
                        const isUnsaved = !currentExam.results.find(r => r.studentId === s.id && r.marksObt.toString() === marksValue);

                        return (
                          <tr key={s.id} className={`hover:bg-[#16192b]/10 text-zinc-300 ${isUnsaved && marksValue !== '' ? 'bg-amber-950/5' : ''}`}>
                            <td className="px-4 py-3 font-mono font-bold text-white">{s.rollNumber}</td>
                            <td className="px-4 py-3 font-extrabold text-white">{s.name}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={marksValue}
                                  onChange={e => handleMarkChange(s.id, e.target.value)}
                                  placeholder="Enter marks"
                                  max={currentExam.totalMarks}
                                  className="bg-[#0a0c14] border border-[#1e233d] text-center text-white px-2 py-1.5 rounded w-24 text-sm focus:outline-none focus:border-cyan-500 font-bold"
                                />
                                <span className="text-zinc-500">/ {currentExam.totalMarks}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-zinc-400">
                              {marksValue !== '' ? `${pct}%` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-black">
                              {marksValue !== '' ? (
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  Number(marksValue) >= (currentExam.totalMarks * 0.5)
                                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-950/40 text-red-400 border border-red-500/20'
                                }`}>
                                  {grade}
                                </span>
                              ) : (
                                <span className="text-zinc-500 text-xs italic">Pending Marks</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- CREATE EXAM DIALOG DIALOG --- */}
      {showCreateExam && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0f1a] border border-[#1e233d] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-[#16192b] border-b border-[#1e233d] flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <IconPlus className="w-4 h-4 text-cyan-400" /> Create New Test / Exam
              </h3>
              <button onClick={() => setShowCreateExam(false)} className="text-zinc-500 hover:text-white text-lg font-black">&times;</button>
            </div>
            
            <form onSubmit={handleCreateExamSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Class & Course</label>
                <input
                  type="text"
                  disabled
                  value={`${currentClassSub?.class.name} - ${currentClassSub?.subject.name}`}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-zinc-500 px-3 py-2 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Test Title (e.g. Unit Test 1)</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  placeholder="e.g. Mid Term Exam"
                  required
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Total Marks</label>
                  <input
                    type="number"
                    value={examTotalMarks}
                    onChange={e => setExamTotalMarks(e.target.value)}
                    required
                    min="1"
                    className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Test Date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    required
                    className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateExam(false)}
                  className="px-4 py-2 border border-[#1e233d] text-zinc-400 text-xs font-bold uppercase rounded-lg hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingExams}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold uppercase rounded-lg hover:from-emerald-500 cursor-pointer"
                >
                  {loadingExams ? 'Creating...' : 'Create Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

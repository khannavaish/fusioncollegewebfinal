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
  IconClock,
  IconBookOpen,
  IconGraduationCap,
  IconSettings,
  IconUsers,
  IconBuilding,
  IconUserTie,
  IconChatBubble,
  IconEdit,
  IconTrash,
  IconPrint,
  IconChart,
  IconBolt,
  IconUserAbsent,
  IconClipboardCheck,
  IconXCircle,
} from '@/app/components/icons';
import {
  getStudentReport,
  getClassAttendanceReport,
  getTeacherReport,
  getWhatsAppLog,
  getDailyAbsenteeReport,
  getLowAttendanceWarningList,
  getTeacherCompletenessReport,
  getFeeReport
} from '@/app/actions/reports';
import {
  updateAttendanceStatus,
  deleteAttendance,
  updateLectureTopic,
  deleteLecture,
  updateExam,
  deleteExam,
  updateExamResult,
  deleteExamResult,
  addExamResult
} from '@/app/actions/adminReports';

export default function ReportsClient({ students, classes, teachers }) {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'class' | 'teacher' | 'whatsapp' | 'warnings'

  // Common Date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);

  // --- Student Tab States ---
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentReport, setStudentReport] = useState(null);
  const [loadingStudent, startLoadingStudent] = useTransition();

  // --- Class Tab States ---
  const [selectedClass, setSelectedClass] = useState('');
  const [classReport, setClassReport] = useState(null);
  const [loadingClass, startLoadingClass] = useTransition();
  const [cellEditInfo, setCellEditInfo] = useState(null); // { studentId, date, currentStatus, attendanceId }

  // --- Teacher Tab States ---
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherReport, setTeacherReport] = useState(null);
  const [loadingTeacher, startLoadingTeacher] = useTransition();

  // --- WhatsApp Log Tab States ---
  const [selectedClassWA, setSelectedClassWA] = useState('ALL');
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  const [loadingWA, startLoadingWA] = useTransition();

  // --- Fee Tab States ---
  const [selectedFeeClass, setSelectedFeeClass] = useState('ALL');
  const [selectedFeeStudent, setSelectedFeeStudent] = useState('');
  const [selectedFeeStatus, setSelectedFeeStatus] = useState('ALL');
  const [feeReport, setFeeReport] = useState(null);
  const [loadingFee, startLoadingFee] = useTransition();

  // --- Warnings/Issues Tab States ---
  const [warningsSubTab, setWarningsSubTab] = useState('absentees'); // 'absentees' | 'low_attendance' | 'completeness'
  const [selectedDateIssues, setSelectedDateIssues] = useState(todayStr);
  const [absenteesList, setAbsenteesList] = useState([]);
  const [lowAttendanceList, setLowAttendanceList] = useState([]);
  const [completenessList, setCompletenessList] = useState([]);
  const [loadingIssues, startLoadingIssues] = useTransition();

  // --- Edit Modal States (Generic) ---
  const [editModal, setEditModal] = useState(null); // { type, data, onSave }

  // Export Ref
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  // --- Actions & Queries ---
  const fetchStudentReport = () => {
    if (!selectedStudent) return;
    startLoadingStudent(async () => {
      try {
        const res = await getStudentReport(selectedStudent, dateFrom, dateTo);
        setStudentReport(res);
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const fetchClassReport = () => {
    if (!selectedClass) return;
    startLoadingClass(async () => {
      try {
        const res = await getClassAttendanceReport(selectedClass, dateFrom, dateTo);
        setClassReport(res);
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const fetchTeacherReport = () => {
    if (!selectedTeacher) return;
    startLoadingTeacher(async () => {
      try {
        const res = await getTeacherReport(selectedTeacher, dateFrom, dateTo);
        setTeacherReport(res);
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const fetchWhatsAppLogs = () => {
    startLoadingWA(async () => {
      try {
        const res = await getWhatsAppLog(dateFrom, dateTo, selectedClassWA);
        setWhatsappLogs(res);
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const fetchFeeReport = () => {
    startLoadingFee(async () => {
      try {
        const res = await getFeeReport(dateFrom, dateTo, selectedFeeClass, selectedFeeStudent, selectedFeeStatus);
        setFeeReport(res);
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const fetchIssuesReport = () => {
    startLoadingIssues(async () => {
      try {
        if (warningsSubTab === 'absentees') {
          const res = await getDailyAbsenteeReport(selectedDateIssues);
          setAbsenteesList(res);
        } else if (warningsSubTab === 'low_attendance') {
          const res = await getLowAttendanceWarningList(75);
          setLowAttendanceList(res);
        } else if (warningsSubTab === 'completeness') {
          const res = await getTeacherCompletenessReport(selectedDateIssues);
          if (res.error) {
            alert(res.error);
            setCompletenessList([]);
          } else {
            setCompletenessList(res);
          }
        }
      } catch (err) {
        alert(err.message);
      }
    });
  };

  // --- CRUD triggers ---
  const handleUpdateAttendance = async (attendanceId, newStatus) => {
    if (!confirm(`Change attendance status to ${newStatus}?`)) return;
    const res = await updateAttendanceStatus(attendanceId, newStatus);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Attendance updated successfully.');
      if (studentReport) fetchStudentReport();
      if (classReport) fetchClassReport();
    }
  };

  const handleDeleteAttendance = async (attendanceId) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    const res = await deleteAttendance(attendanceId);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Attendance deleted.');
      if (studentReport) fetchStudentReport();
      if (classReport) fetchClassReport();
    }
  };

  const handleUpdateLecture = async (lectureId, topic, date) => {
    const res = await updateLectureTopic(lectureId, topic, date);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Lecture updated.');
      setEditModal(null);
      if (teacherReport) fetchTeacherReport();
      if (classReport) fetchClassReport();
    }
  };

  const handleDeleteLecture = async (lectureId) => {
    if (!confirm('WARNING: Deleting this lecture will delete all attendance records associated with it. Continue?')) return;
    const res = await deleteLecture(lectureId);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Lecture deleted.');
      if (teacherReport) fetchTeacherReport();
      if (classReport) fetchClassReport();
    }
  };

  const handleUpdateExam = async (examId, title, date, totalMarks) => {
    const res = await updateExam(examId, title, date, totalMarks);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Exam updated.');
      setEditModal(null);
      if (teacherReport) fetchTeacherReport();
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!confirm('WARNING: Deleting this exam will delete all student scores for it. Continue?')) return;
    const res = await deleteExam(examId);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Exam deleted.');
      if (teacherReport) fetchTeacherReport();
    }
  };

  const handleUpdateMarks = async (resultId, marks) => {
    const res = await updateExamResult(resultId, marks);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Marks updated.');
      setEditModal(null);
      if (studentReport) fetchStudentReport();
      if (teacherReport) fetchTeacherReport();
    }
  };

  const handleDeleteResult = async (resultId) => {
    if (!confirm('Delete this exam result?')) return;
    const res = await deleteExamResult(resultId);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Result deleted.');
      if (studentReport) fetchStudentReport();
      if (teacherReport) fetchTeacherReport();
    }
  };

  const handleAddMarks = async (examId, studentId, marks) => {
    const res = await addExamResult(examId, studentId, marks);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Result added.');
      setEditModal(null);
      if (teacherReport) fetchTeacherReport();
    }
  };

  // --- Export PDF/PNG helper ---
  const handleExportPNG = async (filename) => {
    if (!exportRef.current) return;
    setExporting(true);
    // wait a small delay to make sure rendering is finished
    await new Promise(r => setTimeout(r, 200));
    try {
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: '#070810',
        pixelRatio: 2,
        style: {
          padding: '20px',
          borderRadius: '12px'
        }
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Export failed.');
    }
    setExporting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Grading Helper
  const getAttendanceBadgeClass = (percentage) => {
    const p = parseFloat(percentage);
    if (p >= 75) return 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400';
    if (p >= 60) return 'bg-amber-950/40 border border-amber-500/30 text-amber-400';
    return 'bg-red-950/40 border border-red-500/30 text-red-400';
  };

  const getStatusColor = (status) => {
    if (status === 'PRESENT' || status === 'P' || status === 'PASSED') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'ABSENT' || status === 'A' || status === 'FAILED') return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (status === 'LATE' || status === 'L') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (status === 'LEAVE' || status === 'LV') return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Date Filters Header (applicable to most reports) */}
      <div className="flex flex-wrap gap-4 items-center bg-[#0d0f1a] border border-[#1e233d] p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <IconSparkles className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Date Filters:</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center text-zinc-500">to</div>
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1e233d] gap-2 overflow-x-auto pb-px">
        {[
          { id: 'student', label: 'Student Report', icon: IconGraduationCap },
          { id: 'class', label: 'Class Attendance', icon: IconBuilding },
          { id: 'teacher', label: 'Teacher Logs', icon: IconUserTie },
          { id: 'fee', label: 'Fee Reports', icon: IconDocumentText },
          { id: 'whatsapp', label: 'WhatsApp Logs', icon: IconChatBubble },
          { id: 'warnings', label: 'Issues & Warnings', icon: IconAlertTriangle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 rounded-t-lg -mb-px cursor-pointer flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-cyan-500 text-cyan-400 bg-[#0d0f1a]/40'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/10'
            }`}
          >
            <tab.icon className="w-4 h-4 flex-shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6 min-h-[400px]">
        {/* --- STUDENT PROGRESS REPORT --- */}
        {activeTab === 'student' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-[#16192b]/30 p-4 rounded-xl border border-[#1e233d]">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Select Student</label>
                <select
                  value={selectedStudent}
                  onChange={e => setSelectedStudent(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNumber}) — {s.class.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={fetchStudentReport}
                disabled={loadingStudent || !selectedStudent}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap"
              >
                {loadingStudent ? 'Generating...' : 'Load Report'}
              </button>
            </div>

            {studentReport && (
              <div className="space-y-6">
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleExportPNG(`Student_Report_${studentReport.student.rollNumber}.png`)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#16192b] border border-[#2b3052] text-zinc-300 hover:text-white hover:border-cyan-500 text-xs font-bold rounded-lg cursor-pointer transition-all"
                  >
                    <IconDownload className="w-3.5 h-3.5" /> Export PNG
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#16192b] border border-[#2b3052] text-zinc-300 hover:text-white hover:border-cyan-500 text-xs font-bold rounded-lg cursor-pointer transition-all"
                  >
                    <IconPrint className="w-3.5 h-3.5" /> Print Report
                  </button>
                </div>

                {/* Printable container */}
                <div ref={exportRef} className="space-y-6 bg-[#070810] p-6 rounded-xl border border-[#1e233d] print:p-0 print:border-none print:bg-white print:text-black">
                  {/* Brand Header */}
                  <div className="flex items-center gap-4 pb-5 border-b border-[#1e233d] print:border-zinc-300">
                    <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain" />
                    <div>
                      <h2 className="text-xl font-black text-white print:text-black">Fusion College Narowal</h2>
                      <p className="text-xs text-cyan-400 font-bold print:text-zinc-600">Student Progress Report — Academic Year 2025-26</p>
                      <p className="text-[10px] text-zinc-500 print:text-zinc-500">Date Range: {dateFrom} to {dateTo}</p>
                    </div>
                  </div>

                  {/* Student Info Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0d0f1a] border border-[#1e233d] p-5 rounded-xl print:bg-zinc-100 print:border-zinc-300 print:text-black">
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Student Name</div>
                      <div className="text-base font-extrabold text-white print:text-black">{studentReport.student.name}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Roll Number</div>
                      <div className="text-base font-extrabold text-white print:text-black">{studentReport.student.rollNumber}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Father Name</div>
                      <div className="text-base font-extrabold text-white print:text-black">{studentReport.student.fatherName}</div>
                    </div>
                    <div className="space-y-1 mt-2">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Class</div>
                      <div className="text-sm font-bold text-zinc-300 print:text-black">{studentReport.student.class.name}</div>
                    </div>
                    <div className="space-y-1 mt-2">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Parent Phone</div>
                      <div className="text-sm font-bold text-zinc-300 print:text-black">
                        {studentReport.student.parents[0]?.parent?.phone || '—'}
                      </div>
                    </div>
                    <div className="space-y-1 mt-2">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Overall Attendance</div>
                      <div>
                        {studentReport.subjectStats.length > 0 ? (
                          (() => {
                            const total = studentReport.subjectStats.reduce((a, b) => a + b.total, 0);
                            const present = studentReport.subjectStats.reduce((a, b) => a + b.present, 0);
                            const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '100';
                            return (
                              <span className={`text-sm font-bold px-2 py-0.5 rounded ${getAttendanceBadgeClass(pct)} print:text-black print:bg-zinc-200`}>
                                {pct}%
                              </span>
                            );
                          })()
                        ) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Attendance Stats Table */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider">Attendance Breakdown</h3>
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold print:bg-zinc-200 print:text-black">
                          <th className="px-4 py-3">Subject</th>
                          <th className="px-4 py-3">Teacher</th>
                          <th className="px-4 py-3 text-center">Lectures Attended</th>
                          <th className="px-4 py-3 text-center">Total Lectures</th>
                          <th className="px-4 py-3 text-right">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e233d] print:divide-zinc-300">
                        {studentReport.subjectStats.map(s => {
                          const pct = s.total > 0 ? ((s.present / s.total) * 100).toFixed(0) : '0';
                          return (
                            <tr key={s.subject} className="hover:bg-[#16192b]/10 text-zinc-300 print:text-black">
                              <td className="px-4 py-3 font-extrabold text-white print:text-black">{s.subject}</td>
                              <td className="px-4 py-3">{s.teacher}</td>
                              <td className="px-4 py-3 text-center">{s.present}</td>
                              <td className="px-4 py-3 text-center">{s.total}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${getAttendanceBadgeClass(pct)} print:text-black`}>
                                  {pct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {studentReport.subjectStats.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">No attendance records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Test Results Table */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider">Test & Exam Results</h3>
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold print:bg-zinc-200 print:text-black">
                          <th className="px-4 py-3">Subject</th>
                          <th className="px-4 py-3">Test Title</th>
                          <th className="px-4 py-3 text-center">Date</th>
                          <th className="px-4 py-3 text-center">Marks</th>
                          <th className="px-4 py-3 text-center">Grade</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e233d] print:divide-zinc-300">
                        {studentReport.examResults.map(er => (
                          <tr key={er.id} className="hover:bg-[#16192b]/10 text-zinc-300 print:text-black">
                            <td className="px-4 py-3 font-extrabold text-white print:text-black">{er.subject}</td>
                            <td className="px-4 py-3">{er.title}</td>
                            <td className="px-4 py-3 text-center">{new Date(er.date).toLocaleDateString('en-PK')}</td>
                            <td className="px-4 py-3 text-center font-bold">
                              {er.marksObt} / {er.totalMarks}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded font-black text-xs ${
                                er.status === 'PASSED' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' : 'bg-red-950/40 text-red-400 border border-red-500/20'
                              } print:text-black`}>
                                {er.grade} ({er.status})
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right print:hidden">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setEditModal({
                                    type: 'marks',
                                    data: er,
                                    onSave: (marks) => handleUpdateMarks(er.id, marks)
                                  })}
                                  className="p-1 hover:bg-zinc-800 rounded text-cyan-400 cursor-pointer"
                                  title="Edit Marks"
                                >
                                  <IconEdit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteResult(er.id)}
                                  className="p-1 hover:bg-red-950/40 rounded text-red-400 cursor-pointer"
                                  title="Delete Marks"
                                >
                                  <IconTrash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {studentReport.examResults.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No test results found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* WhatsApp Notifications History */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider">WhatsApp Alerts History</h3>
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold print:bg-zinc-200 print:text-black">
                          <th className="px-4 py-3">Time Sent</th>
                          <th className="px-4 py-3">Recipient Phone</th>
                          <th className="px-4 py-3">Message Type</th>
                          <th className="px-4 py-3 text-right">Delivery Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e233d] print:divide-zinc-300">
                        {studentReport.whatsAppLogs.map(log => (
                          <tr key={log.id} className="hover:bg-[#16192b]/10 text-zinc-300 print:text-black">
                            <td className="px-4 py-3 text-xs">{new Date(log.sentAt).toLocaleString('en-PK')}</td>
                            <td className="px-4 py-3 font-semibold">{log.parentPhone}</td>
                            <td className="px-4 py-3 text-xs uppercase font-bold tracking-wide">
                              <span className="inline-flex items-center gap-1.5">
                                {log.messageType === 'ARRIVAL' ? (
                                  <><IconBolt className="w-3.5 h-3.5 text-amber-400" /> First Arrival</>
                                ) : (
                                  <><IconChart className="w-3.5 h-3.5 text-cyan-400" /> Daily EOD Summary</>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {log.success ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs border border-emerald-500/20">
                                  <IconCheckCircle className="w-3 h-3" /> Sent
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-xs border border-red-500/20" title={log.errorMessage}>
                                  <IconXCircle className="w-3 h-3" /> Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {studentReport.whatsAppLogs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">No message logs today in date range.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- CLASS ATTENDANCE GRID --- */}
        {activeTab === 'class' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-[#16192b]/30 p-4 rounded-xl border border-[#1e233d]">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Select Class</label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={fetchClassReport}
                disabled={loadingClass || !selectedClass}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap"
              >
                {loadingClass ? 'Generating...' : 'Load Grid'}
              </button>
            </div>

            {classReport && (
              <div className="space-y-6">
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleExportPNG(`Class_Grid_${classReport.className.replace(/\s+/g, '_')}.png`)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#16192b] border border-[#2b3052] text-zinc-300 hover:text-white hover:border-cyan-500 text-xs font-bold rounded-lg cursor-pointer transition-all"
                  >
                    <IconDownload className="w-3.5 h-3.5" /> Export PNG
                  </button>
                </div>

                <div ref={exportRef} className="space-y-6 bg-[#070810] p-6 rounded-xl border border-[#1e233d]">
                  {/* Brand Header */}
                  <div className="flex items-center justify-between pb-5 border-b border-[#1e233d]">
                    <div className="flex items-center gap-4">
                      <img src="/logo.png" alt="Logo" className="h-14 w-auto object-contain" />
                      <div>
                        <h2 className="text-lg font-black text-white">{classReport.className} Attendance Report</h2>
                        <p className="text-xs text-zinc-500">Date Range: {dateFrom} to {dateTo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Class Average</div>
                      <div className="text-2xl font-black text-cyan-400">{classReport.classAverage}%</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#1e233d] rounded-xl">
                    <table className="w-full text-center text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-300 font-bold">
                          <th className="px-4 py-3 text-left w-36 border-r border-[#1e233d]">Roll No</th>
                          <th className="px-4 py-3 text-left min-w-[150px] border-r border-[#1e233d]">Student Name</th>
                          {classReport.dates.map(d => (
                            <th key={d} className="px-3 py-3 min-w-[70px] border-r border-[#1e233d] text-xs">
                              {d.split('-').slice(1).reverse().join('/')}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e233d]">
                        {classReport.studentsAttendance.map(s => (
                          <tr key={s.id} className="hover:bg-[#16192b]/10 text-zinc-300">
                            <td className="px-4 py-3 text-left font-mono font-bold text-white border-r border-[#1e233d]">
                              {s.rollNumber}
                            </td>
                            <td className="px-4 py-3 text-left font-bold text-white border-r border-[#1e233d]">
                              {s.name}
                            </td>
                            {classReport.dates.map(d => {
                              const status = s.attendance[d] || '—';
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

        {/* --- TEACHER PERFORMANCE / LOGS --- */}
        {activeTab === 'teacher' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-[#16192b]/30 p-4 rounded-xl border border-[#1e233d]">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Select Teacher</label>
                <select
                  value={selectedTeacher}
                  onChange={e => setSelectedTeacher(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={fetchTeacherReport}
                disabled={loadingTeacher || !selectedTeacher}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap"
              >
                {loadingTeacher ? 'Generating...' : 'Load Logs'}
              </button>
            </div>

            {teacherReport && (
              <div className="space-y-6">
                {/* Lectures Taught Log Card */}
                <div className="space-y-3 bg-[#070810] p-6 rounded-xl border border-[#1e233d]">
                  <div className="flex items-center gap-3 border-b border-[#1e233d] pb-3 mb-3">
                    <IconBookOpen className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Lectures Log ({teacherReport.teacher.name})</h3>
                  </div>

                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Topic / Notes</th>
                        <th className="px-4 py-3 text-center">Attendance Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e233d]">
                      {teacherReport.lectures.map(l => (
                        <tr key={l.id} className="hover:bg-[#16192b]/10 text-zinc-300">
                          <td className="px-4 py-3 text-xs">{new Date(l.date).toLocaleDateString('en-PK')}</td>
                          <td className="px-4 py-3 font-bold text-white">{l.className}</td>
                          <td className="px-4 py-3 text-cyan-400 font-bold">{l.subject}</td>
                          <td className="px-4 py-3 italic max-w-xs truncate" title={l.topic}>{l.topic}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-[#16192b] border border-[#2b3052] px-2 py-0.5 rounded text-xs text-white">
                              {l.presentCount} / {l.totalCount} Present
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditModal({
                                  type: 'lecture',
                                  data: l,
                                  onSave: (topic, date) => handleUpdateLecture(l.id, topic, date)
                                })}
                                className="p-1 hover:bg-zinc-800 rounded text-cyan-400 cursor-pointer"
                              >
                                <IconEdit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLecture(l.id)}
                                className="p-1 hover:bg-red-950/40 rounded text-red-400 cursor-pointer"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {teacherReport.lectures.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No lectures recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Exams Administered Log Card */}
                <div className="space-y-3 bg-[#070810] p-6 rounded-xl border border-[#1e233d]">
                  <div className="flex items-center gap-3 border-b border-[#1e233d] pb-3 mb-3">
                    <IconGraduationCap className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Tests & Exams Log</h3>
                  </div>

                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Test Title</th>
                        <th className="px-4 py-3 text-center">Total Marks</th>
                        <th className="px-4 py-3 text-center">Class Average</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e233d]">
                      {teacherReport.exams.map(ex => (
                        <tr key={ex.id} className="hover:bg-[#16192b]/10 text-zinc-300">
                          <td className="px-4 py-3 text-xs">{new Date(ex.date).toLocaleDateString('en-PK')}</td>
                          <td className="px-4 py-3 font-bold text-white">{ex.className}</td>
                          <td className="px-4 py-3 text-cyan-400 font-bold">{ex.subject}</td>
                          <td className="px-4 py-3 font-semibold">{ex.title}</td>
                          <td className="px-4 py-3 text-center font-bold">{ex.totalMarks}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-xs font-bold">
                              {ex.avgScore}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditModal({
                                  type: 'exam',
                                  data: ex,
                                  onSave: (title, date, totalMarks) => handleUpdateExam(ex.id, title, date, totalMarks)
                                })}
                                className="p-1 hover:bg-zinc-800 rounded text-cyan-400 cursor-pointer"
                              >
                                <IconEdit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExam(ex.id)}
                                className="p-1 hover:bg-red-950/40 rounded text-red-400 cursor-pointer"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {teacherReport.exams.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">No exams registered in date range.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- FEE REPORTS --- */}
        {activeTab === 'fee' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-[#16192b]/30 p-4 rounded-xl border border-[#1e233d]">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Class Filter</label>
                <select
                  value={selectedFeeClass}
                  onChange={e => setSelectedFeeClass(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Student Filter (Optional)</label>
                <select
                  value={selectedFeeStudent}
                  onChange={e => setSelectedFeeStudent(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">All Students</option>
                  {students
                    .filter(s => selectedFeeClass === 'ALL' || s.class?.id === selectedFeeClass)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                    ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Report Type</label>
                <select
                  value={selectedFeeStatus}
                  onChange={e => setSelectedFeeStatus(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">All Bills (Collection Report)</option>
                  <option value="DEFAULTERS">Fee Defaulters (Unpaid & Partial)</option>
                  <option value="PAID">Paid Only</option>
                  <option value="WAIVED">Waived Only</option>
                </select>
              </div>
              <button
                onClick={fetchFeeReport}
                disabled={loadingFee}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap"
              >
                {loadingFee ? 'Generating...' : 'Load Fee Report'}
              </button>
            </div>

            {feeReport && (
              <div className="space-y-6">
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleExportPNG('Fee_Report.png')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#16192b] border border-[#2b3052] text-zinc-300 hover:text-white hover:border-cyan-500 text-xs font-bold rounded-lg cursor-pointer transition-all"
                  >
                    <IconDownload className="w-3.5 h-3.5" /> Export PNG
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#16192b] border border-[#2b3052] text-zinc-300 hover:text-white hover:border-cyan-500 text-xs font-bold rounded-lg cursor-pointer transition-all"
                  >
                    <IconPrint className="w-3.5 h-3.5" /> Print Report
                  </button>
                </div>

                <div ref={exportRef} className="space-y-6 bg-[#070810] p-6 rounded-xl border border-[#1e233d] print:p-0 print:border-none print:bg-white print:text-black">
                  {/* Brand Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1e233d] print:border-zinc-300">
                    <div className="flex items-center gap-4">
                      <img src="/logo.png" alt="Logo" className="h-14 w-auto object-contain" />
                      <div>
                        <h2 className="text-lg font-black text-white print:text-black">
                          {selectedFeeStatus === 'DEFAULTERS' ? 'Fee Defaulters Report' : 'Fee Collection & Outstanding Report'}
                        </h2>
                        <p className="text-xs text-zinc-500">Date Range: {dateFrom} to {dateTo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Total Billed</div>
                      <div className="text-2xl font-black text-cyan-400">Rs {feeReport.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#1e233d] rounded-xl print:border-zinc-300">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold print:bg-zinc-200 print:text-black">
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Roll No / Class</th>
                          <th className="px-4 py-3">Billing Cycle</th>
                          <th className="px-4 py-3 text-right">Total Billed</th>
                          <th className="px-4 py-3 text-right">Paid Amount</th>
                          <th className="px-4 py-3 text-right">Outstanding</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e233d] print:divide-zinc-300">
                        {feeReport.map(b => {
                          const outstanding = b.totalAmount - b.paidAmount;
                          return (
                            <tr key={b.id} className="hover:bg-[#16192b]/10 text-zinc-300 print:text-black">
                              <td className="px-4 py-3 font-bold text-white print:text-black">{b.studentName}</td>
                              <td className="px-4 py-3">
                                <div>{b.rollNumber}</div>
                                <div className="text-[10px] text-zinc-500 print:text-zinc-600">{b.className}</div>
                              </td>
                              <td className="px-4 py-3 font-semibold">{b.month}/{b.year}</td>
                              <td className="px-4 py-3 text-right">Rs {b.totalAmount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-emerald-400 print:text-emerald-700 font-bold">Rs {b.paidAmount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-red-400 print:text-red-600 font-bold">
                                {outstanding > 0 ? `Rs ${outstanding.toLocaleString()}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  b.status === 'PAID' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' :
                                  b.status === 'PARTIAL' ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' :
                                  b.status === 'WAIVED' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20' :
                                  'bg-red-950/40 text-red-400 border border-red-500/20'
                                } print:text-black`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {feeReport.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">No bills found for the selected criteria.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- GLOBAL WHATSAPP LOGS --- */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-[#16192b]/30 p-4 rounded-xl border border-[#1e233d]">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Class (Filter)</label>
                <select
                  value={selectedClassWA}
                  onChange={e => setSelectedClassWA(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={fetchWhatsAppLogs}
                disabled={loadingWA}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap"
              >
                {loadingWA ? 'Fetching...' : 'Fetch Logs'}
              </button>
            </div>

            <div className="bg-[#070810] p-6 rounded-xl border border-[#1e233d] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e233d] pb-3 mb-3">
                <h3 className="text-base font-black text-white uppercase tracking-wider">WhatsApp Broadcast Logs</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold">
                      <th className="px-4 py-3">Time Broadcasted</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Parent Phone</th>
                      <th className="px-4 py-3">Broadcast Type</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e233d]">
                    {whatsappLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#16192b]/10 text-zinc-300">
                        <td className="px-4 py-3 text-xs">{new Date(log.sentAt).toLocaleString('en-PK')}</td>
                        <td className="px-4 py-3 font-bold text-white">{log.student.name} ({log.student.rollNumber})</td>
                        <td className="px-4 py-3 text-xs">{log.student.class.name}</td>
                        <td className="px-4 py-3 font-mono">{log.parentPhone}</td>
                        <td className="px-4 py-3 text-xs font-extrabold uppercase">
                          <span className="inline-flex items-center gap-1.5">
                            {log.messageType === 'ARRIVAL' ? (
                              <><IconBolt className="w-3.5 h-3.5 text-amber-400" /> First Arrival</>
                            ) : (
                              <><IconChart className="w-3.5 h-3.5 text-cyan-400" /> EOD Summary</>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded text-xs border border-emerald-500/20">
                              <IconCheckCircle className="w-3 h-3" /> Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded text-xs border border-red-500/20" title={log.errorMessage}>
                              <IconXCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {whatsappLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No logs returned in date range. Click Fetch.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- WARNINGS / ISSUES / ABSENTEES / COMPLETENESS --- */}
        {activeTab === 'warnings' && (
          <div className="space-y-6">
            {/* Warnings sub navigation tabs */}
            <div className="flex border-b border-[#2b3052] gap-1 overflow-x-auto">
              {[
                { id: 'absentees', label: 'Daily Absentees', icon: IconUserAbsent },
                { id: 'low_attendance', label: 'Attendance Warnings (<75%)', icon: IconAlertTriangle },
                { id: 'completeness', label: 'Teacher Check List', icon: IconClipboardCheck },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setWarningsSubTab(sub.id)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    warningsSubTab === sub.id
                      ? 'bg-[#16192b] text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <sub.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Filter tools for warnings (only daily sections require date) */}
            {warningsSubTab !== 'low_attendance' && (
              <div className="flex flex-wrap gap-4 items-end bg-[#16192b]/30 p-4 rounded-xl border border-[#1e233d]">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Target Date</label>
                  <input
                    type="date"
                    value={selectedDateIssues}
                    onChange={e => setSelectedDateIssues(e.target.value)}
                    className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  onClick={fetchIssuesReport}
                  disabled={loadingIssues}
                  className="px-6 py-2 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  {loadingIssues ? 'Calculating...' : 'Load Report'}
                </button>
              </div>
            )}

            {/* If warning list: load instantly without needing date */}
            {warningsSubTab === 'low_attendance' && lowAttendanceList.length === 0 && (
              <div className="flex justify-center p-4">
                <button
                  onClick={fetchIssuesReport}
                  disabled={loadingIssues}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                >
                  {loadingIssues ? 'Calculating warnings...' : 'Load Warnings List'}
                </button>
              </div>
            )}

            {/* SUBTAB CONTENT 1: DAILY ABSENTEES */}
            {warningsSubTab === 'absentees' && absenteesList.length > 0 && (
              <div className="bg-[#070810] p-5 rounded-xl border border-[#1e233d] space-y-4">
                <h3 className="text-sm font-black text-red-400 uppercase tracking-wider">Absentee Record — {selectedDateIssues}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold">
                        <th className="px-4 py-3">Roll Number</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Subject / Teacher</th>
                        <th className="px-4 py-3">Parent Contact</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e233d]">
                      {absenteesList.map(a => (
                        <tr key={a.attendanceId} className="hover:bg-[#16192b]/10 text-zinc-300">
                          <td className="px-4 py-3 font-mono text-white font-bold">{a.rollNumber}</td>
                          <td className="px-4 py-3 font-extrabold text-white">{a.studentName}</td>
                          <td className="px-4 py-3 text-xs">{a.className}</td>
                          <td className="px-4 py-3 text-xs">
                            {a.subject} (by <span className="text-zinc-400">{a.teacher}</span>)
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {a.parentName} (<span className="text-cyan-400 font-mono">{a.parentPhone}</span>)
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleUpdateAttendance(a.attendanceId, 'PRESENT')}
                              className="px-2.5 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded cursor-pointer transition-colors inline-flex items-center gap-1"
                            >
                              <IconCheckCircle className="w-3 h-3" /> Mark Present
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB CONTENT 2: LOW ATTENDANCE WARNING */}
            {warningsSubTab === 'low_attendance' && lowAttendanceList.length > 0 && (
              <div className="bg-[#070810] p-5 rounded-xl border border-[#1e233d] space-y-4">
                <div className="flex justify-between items-center border-b border-[#1e233d] pb-2">
                  <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">Students with Attendance below 75%</h3>
                  <span className="text-xs text-zinc-500">Auto generated warning list</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold">
                        <th className="px-4 py-3">Roll Number</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Lectures</th>
                        <th className="px-4 py-3">Parent Info</th>
                        <th className="px-4 py-3 text-right">Overall attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e233d]">
                      {lowAttendanceList.map(s => (
                        <tr key={s.id} className="hover:bg-[#16192b]/10 text-zinc-300">
                          <td className="px-4 py-3 font-mono text-white font-bold">{s.rollNumber}</td>
                          <td className="px-4 py-3 font-extrabold text-white">{s.name}</td>
                          <td className="px-4 py-3 text-xs">{s.className}</td>
                          <td className="px-4 py-3 text-xs font-mono">{s.presentCount} / {s.totalCount}</td>
                          <td className="px-4 py-3 text-xs">
                            {s.parentName} (<span className="text-zinc-400">{s.parentPhone}</span>)
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-xs font-black">
                              {s.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB CONTENT 3: TEACHER COMPLETENESS */}
            {warningsSubTab === 'completeness' && completenessList.length > 0 && (
              <div className="bg-[#070810] p-5 rounded-xl border border-[#1e233d] space-y-4">
                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider">Teacher Timetable Submissions checklist</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#16192b]/60 border-b border-[#1e233d] text-zinc-400 font-bold">
                        <th className="px-4 py-3">Time Slot</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Assigned Teacher</th>
                        <th className="px-4 py-3">Topic Taught</th>
                        <th className="px-4 py-3 text-right">Submission Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e233d]">
                      {completenessList.map(s => (
                        <tr key={s.id} className="hover:bg-[#16192b]/10 text-zinc-300">
                          <td className="px-4 py-3 text-xs font-mono text-zinc-400">{s.timeSlot}</td>
                          <td className="px-4 py-3 font-bold text-white">{s.className}</td>
                          <td className="px-4 py-3 font-bold text-cyan-400">{s.subject}</td>
                          <td className="px-4 py-3">{s.teacher}</td>
                          <td className="px-4 py-3 text-xs italic text-zinc-500 max-w-xs truncate" title={s.topic}>{s.topic}</td>
                          <td className="px-4 py-3 text-right">
                            {s.isMarked ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs border border-emerald-500/20 font-bold">
                                <IconCheckCircle className="w-3 h-3" /> Marked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-xs border border-red-500/20 font-bold">
                                <IconXCircle className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- EDIT MODAL DIALOG --- */}
      {editModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0f1a] border border-[#1e233d] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-[#16192b] border-b border-[#1e233d] flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                <span className="inline-flex items-center gap-2">
                  <IconEdit className="w-4 h-4 text-cyan-400" />
                  {editModal.type === 'marks' ? 'Edit Student Marks' : editModal.type === 'lecture' ? 'Edit Lecture Topic' : 'Edit Exam Settings'}
                </span>
              </h3>
              <button onClick={() => setEditModal(null)} className="text-zinc-500 hover:text-white text-lg font-black">&times;</button>
            </div>
            
            {/* Modal Body */}
            {editModal.type === 'marks' && (
              <form onSubmit={e => {
                e.preventDefault();
                const marksVal = e.target.marks.value;
                editModal.onSave(marksVal);
              }} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Student</label>
                  <input type="text" disabled value={editModal.data.student?.name || 'Student'}
                    className="w-full bg-[#0a0c14] border border-[#1e233d] text-zinc-500 px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Marks Obtained</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" name="marks" defaultValue={editModal.data.marksObt} required
                      className="bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500 w-28" />
                    <span className="text-zinc-400 font-bold">/ {editModal.data.totalMarks}</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setEditModal(null)}
                    className="px-4 py-2 border border-[#1e233d] text-zinc-400 text-xs font-bold uppercase rounded-lg hover:text-white cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold uppercase rounded-lg hover:from-cyan-500 cursor-pointer">
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {editModal.type === 'lecture' && (
              <form onSubmit={e => {
                e.preventDefault();
                const topicVal = e.target.topic.value;
                const dateVal = e.target.date.value;
                editModal.onSave(topicVal, dateVal);
              }} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Lecture Date</label>
                  <input type="date" name="date" defaultValue={new Date(editModal.data.date).toISOString().split('T')[0]} required
                    className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Topic taught / Notes</label>
                  <textarea name="topic" defaultValue={editModal.data.topic} required rows="3"
                    className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500 placeholder-zinc-700" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setEditModal(null)}
                    className="px-4 py-2 border border-[#1e233d] text-zinc-400 text-xs font-bold uppercase rounded-lg hover:text-white cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold uppercase rounded-lg hover:from-cyan-500 cursor-pointer">
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {editModal.type === 'exam' && (
              <form onSubmit={e => {
                e.preventDefault();
                const titleVal = e.target.title.value;
                const dateVal = e.target.date.value;
                const marksVal = e.target.totalMarks.value;
                editModal.onSave(titleVal, dateVal, marksVal);
              }} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Test Title</label>
                  <input type="text" name="title" defaultValue={editModal.data.title} required
                    className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Test Date</label>
                  <input type="date" name="date" defaultValue={new Date(editModal.data.date).toISOString().split('T')[0]} required
                    className="w-full bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Total Marks</label>
                  <input type="number" name="totalMarks" defaultValue={editModal.data.totalMarks} required
                    className="w-28 bg-[#0a0c14] border border-[#1e233d] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setEditModal(null)}
                    className="px-4 py-2 border border-[#1e233d] text-zinc-400 text-xs font-bold uppercase rounded-lg hover:text-white cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold uppercase rounded-lg hover:from-cyan-500 cursor-pointer">
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

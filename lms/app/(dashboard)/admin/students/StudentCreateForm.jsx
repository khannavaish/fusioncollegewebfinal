'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createStudent, checkGuardianName, bulkImportStudents } from '@/app/actions/admin';
import { IconCheckCircle, IconAlertTriangle, IconIdCard, IconMail, IconKey, IconUsers } from '@/app/components/icons';

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner";

export default function StudentCreateForm({ classes, feePackages = [] }) {
  const [state, action, pending] = useActionState(createStudent, null);
  const [guardianNameInput, setGuardianNameInput] = useState('');
  const [matchingParents, setMatchingParents] = useState([]);
  const [admissionPct, setAdmissionPct] = useState('');
  const [suggestedPkg, setSuggestedPkg] = useState(null);
  const [manualPkgId, setManualPkgId] = useState('');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const formRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (state?.success && state?.credentials) {
      formRef.current?.reset();
      setGuardianNameInput('');
      setMatchingParents([]);
      setAdmissionPct('');
      setSuggestedPkg(null);
      setManualPkgId('');
      setIsFormOpen(false);
      dialogRef.current?.showModal();
    }
  }, [state]);

  // Debounced/On-change duplicate check for guardian name
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (guardianNameInput.trim().length >= 3) {
        const matches = await checkGuardianName(guardianNameInput);
        setMatchingParents(matches || []);
      } else {
        setMatchingParents([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [guardianNameInput]);

  // Auto-suggest fee package based on admission percentage
  useEffect(() => {
    if (!admissionPct || feePackages.length === 0) {
      setSuggestedPkg(null);
      return;
    }
    const pct = parseFloat(admissionPct);
    if (isNaN(pct)) return;

    // Find the matching package based on min/max percentage logic in actions/admin.js
    const match = feePackages.find(p => pct >= p.minPercentage && pct <= p.maxPercentage);
    setSuggestedPkg(match || null);
  }, [admissionPct, feePackages]);

  const creds = state?.credentials;

  return (
    <>
      <dialog ref={dialogRef} className="bg-transparent m-auto backdrop:bg-black/60 backdrop:backdrop-blur-md p-4 w-full max-w-md max-h-[calc(100dvh-11rem)] md:max-h-[90vh] overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-emerald-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-emerald-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="bg-[#0c0e1a]/90 backdrop-blur-3xl border border-emerald-500/30 rounded-3xl p-6 shadow-[0_8px_32px_rgba(16,185,129,0.2)] animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 flex-shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <IconCheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">Enrollment Successful</h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">Save these credentials. Passwords are <span className="font-bold text-rose-400">never</span> shown again.</p>
            </div>
          </div>

          {creds && (
            <>
              <div className="bg-black/20 border border-white/5 rounded-2xl p-5 mb-4 space-y-4">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Student Account</p>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <IconIdCard className="w-4 h-4 text-cyan-400" /> Roll No
                  </span>
                  <span className="text-sm font-mono font-bold text-white tracking-wider">{creds.rollNumber}</span>
                </div>
                <div className="border-t border-white/5" />
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <IconMail className="w-4 h-4 text-blue-400" /> Login
                  </span>
                  <span className="text-sm font-mono font-bold text-cyan-400">{creds.email}</span>
                </div>
                <div className="border-t border-white/5" />
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <IconKey className="w-4 h-4 text-emerald-400" /> Password
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 tracking-widest">
                    {creds.password}
                  </span>
                </div>
              </div>

              <div className="bg-black/20 border border-white/5 rounded-2xl p-5 mb-6 space-y-4">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Parent Portal</p>
                {creds.parent.isExisting ? (
                  <p className="text-xs text-zinc-400">Linked to existing parent account <span className="font-bold text-white">{creds.parent.email}</span>.</p>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                        <IconMail className="w-4 h-4 text-indigo-400" /> Login
                      </span>
                      <span className="text-sm font-mono font-bold text-cyan-400">{creds.parent.email}</span>
                    </div>
                    <div className="border-t border-white/5" />
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                        <IconKey className="w-4 h-4 text-purple-400" /> Password
                      </span>
                      <span className="text-sm font-mono font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20 tracking-widest">
                        {creds.parent.password}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <p className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 font-medium">
            <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
            Save these credentials now - passwords cannot be recovered later.
          </p>

          <button
            onClick={() => dialogRef.current?.close()}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            Done
          </button>
        </div>
      </dialog>

      {/* Trigger Buttons */}
      {!isFormOpen && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div>
            <h2 className="text-base font-black text-white tracking-wide">Student Enrollment</h2>
            <p className="text-[11px] text-zinc-400 mt-1">Add new students manually or via CSV import.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCsvModal(true)}
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/30 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import CSV
            </button>
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              <IconUsers className="w-4 h-4" /> Enroll New Student
            </button>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 top-16 pb-24 md:pb-4 md:top-0 z-[99999] flex items-start md:items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[calc(100dvh-11rem)] md:max-h-[90vh] bg-[#0c0e1a]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
              <h2 className="text-base font-black text-white tracking-wide">Bulk Import via CSV</h2>
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
              <form
                action={async (fd) => {
                  setIsImporting(true);
                  const res = await bulkImportStudents(fd);
                  setIsImporting(false);
                  if (res?.error) {
                    alert(res.error);
                  } else {
                    alert(`Successfully imported ${res.count} students.\n\nErrors: ${res.errors?.length || 0}`);
                    setShowCsvModal(false);
                  }
                }}
                className="space-y-5"
              >
                <div className="bg-black/20 border border-white/5 rounded-2xl p-5 text-xs text-zinc-400 space-y-3">
                  <p className="font-bold text-white">Required CSV Format:</p>
                  <code className="text-[10px] text-cyan-400 block break-all bg-white/5 p-2 rounded-lg border border-white/5">
                    name, rollNumber, fatherName, classId, cnic, fatherCnic, whatsappNumber, telephone, address, gender
                  </code>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Passwords will default to the student's <strong className="text-white">rollNumber</strong>.</li>
                    <li>First row must be exactly the headers shown above.</li>
                    <li><strong className="text-white">classId</strong> must be the exact UUID of the class (get this from Export Data).</li>
                  </ul>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Upload CSV File</label>
                  <input name="file" type="file" accept=".csv" required className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30 cursor-pointer shadow-inner" />
                </div>
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setShowCsvModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isImporting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50">
                    {isImporting ? 'Importing...' : 'Upload & Import'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 top-16 pb-24 md:pb-4 md:top-0 z-[99999] flex items-start md:items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[calc(100dvh-6rem-5rem)] md:max-h-[90vh] bg-[#0c0e1a]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 md:px-8 md:py-5 border-b border-white/5 bg-[#0c0e1a]/90 rounded-t-3xl">
              <div>
                <h2 className="text-base font-black text-white tracking-wide">Enroll New Student</h2>
                <p className="text-[11px] text-zinc-400 mt-1">Roll number, login email & password are auto-generated</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 min-h-0 p-6 md:p-8 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
              {classes.length === 0 ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                  <p className="text-sm font-medium text-amber-400">Please <a href="/admin/classes" className="underline font-bold">create at least one class</a> before enrolling students.</p>
                </div>
              ) : (
                <form ref={formRef} action={action} className="space-y-6">
                  {/* Basic Details */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Student & Class</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input name="name" placeholder="Student Full Name *" className={inputCls} required />
                      <input name="fatherName" placeholder="Father's Name *" className={inputCls} required />
                      <select name="classId" className={inputCls} required>
                        <option value="" className="bg-[#0c0e1a]">Select Class *</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id} className="bg-[#0c0e1a]">{c.name} ({c.academicYr})</option>
                        ))}
                      </select>
                      <input name="manualRollNumber" placeholder="Manual Roll No (Optional)" className={inputCls} title="Leave blank for auto-generation" />
                    </div>
                  </div>

                  {/* Identification */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Identification</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input name="cnic" placeholder="B-Form / CNIC Number (Optional)" className={inputCls} />
                      <input name="fatherCnic" placeholder="Father's CNIC (Optional)" className={inputCls} />
                    </div>
                  </div>

                  {/* Contact & Personal */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Contact & Personal</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input name="whatsappNumber" placeholder="Student WhatsApp" className={inputCls} />
                      <input name="telephone" placeholder="Telephone" className={inputCls} />
                      <select name="gender" className={inputCls}>
                        <option value="" className="bg-[#0c0e1a]">Select Gender</option>
                        <option value="Male" className="bg-[#0c0e1a]">Male</option>
                        <option value="Female" className="bg-[#0c0e1a]">Female</option>
                        <option value="Other" className="bg-[#0c0e1a]">Other</option>
                      </select>
                      <input name="photo" type="file" accept="image/*" className={`${inputCls} file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30 cursor-pointer p-2`} />
                    </div>
                    <div>
                      <input name="address" placeholder="Home Address (Optional)" className={inputCls} />
                    </div>
                  </div>

                  {/* Admission % + Fee Package */}
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-5 space-y-4">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      <IconAlertTriangle className="w-3.5 h-3.5" />
                      Fee Package Assignment
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input
                          name="admissionPercentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={admissionPct}
                          onChange={(e) => setAdmissionPct(e.target.value)}
                          placeholder="Admission Percentage (e.g. 87.50)"
                          className={inputCls}
                        />
                        {suggestedPkg && (
                          <p className="text-[11px] text-cyan-400 mt-2 flex items-center gap-1.5 font-medium bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
                            Auto-assigned: <span className="font-bold">{suggestedPkg.name}</span> - ₨{suggestedPkg.monthlyFee.toLocaleString()}/month
                          </p>
                        )}
                        {admissionPct && !suggestedPkg && (
                          <p className="text-[11px] text-amber-400 mt-2 font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">No package matches this percentage</p>
                        )}
                      </div>
                      <div>
                        <select
                          name="feePackageId"
                          value={manualPkgId}
                          onChange={(e) => setManualPkgId(e.target.value)}
                          className={inputCls}
                        >
                          <option value="" className="bg-[#0c0e1a]">Select Package (override)</option>
                          {feePackages.map((p) => (
                            <option key={p.id} value={p.id} className="bg-[#0c0e1a]">
                              {p.name} - ₨{p.monthlyFee.toLocaleString()}/mo ({p.minPercentage}–{p.maxPercentage}%)
                            </option>
                          ))}
                          <option value="CUSTOM" className="bg-[#0c0e1a]">Custom (Override)</option>
                        </select>
                        {manualPkgId === 'CUSTOM' && (
                          <input
                            name="feeMonthlyOverride"
                            type="number"
                            placeholder="₨ Custom Monthly Fee Amount *"
                            className={`mt-4 ${inputCls}`}
                            required
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Guardian Link */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Parent / Guardian Link</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 relative">
                        <input
                          name="guardianName"
                          value={guardianNameInput}
                          onChange={(e) => setGuardianNameInput(e.target.value)}
                          placeholder="Guardian Name (Mother/Father/Guardian) *"
                          className={inputCls}
                          required
                        />
                        
                        {/* Warning message for duplicates */}
                        {matchingParents.length > 0 && (
                          <div className="absolute left-0 right-0 mt-1.5 z-20 bg-[#0c0e1a]/95 backdrop-blur-xl border border-amber-500/30 rounded-xl p-4 shadow-2xl space-y-3">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                              <IconAlertTriangle className="w-4 h-4" />
                              Guardian duplicate warning
                            </div>
                            <div className="text-[11px] text-zinc-400 leading-relaxed">
                              Existing parents match this name. To link them, use their exact phone number below:
                            </div>
                            <div className="space-y-1.5 divide-y divide-white/10">
                              {matchingParents.map((p) => (
                                <div key={p.id} className="pt-1.5 flex justify-between items-center text-[11px]">
                                  <span className="text-white font-semibold">{p.name}</span>
                                  <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded cursor-pointer hover:bg-cyan-500/20 transition-colors" title="Click to copy phone number" onClick={() => {
                                    const input = document.getElementsByName('guardianPhone')[0];
                                    if (input) {
                                      input.value = p.phone;
                                      setMatchingParents([]);
                                    }
                                  }}>{p.phone}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <input
                        name="guardianPhone"
                        placeholder="Guardian Phone Number *"
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>

                  {state?.error && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 flex items-center gap-2">
                      <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {state.error}
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      type="submit"
                      disabled={pending}
                      className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] w-full md:w-auto"
                    >
                      {pending ? 'Enrolling Student...' : 'Enroll Student & Generate Credentials'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

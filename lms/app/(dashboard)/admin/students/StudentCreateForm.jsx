'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createStudent, checkGuardianName, bulkImportStudents } from '@/app/actions/admin';
import { IconCheckCircle, IconAlertTriangle, IconIdCard, IconMail, IconKey, IconUsers } from '@/app/components/icons';

const inputCls = "w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

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
      <dialog ref={dialogRef} className="bg-transparent m-auto backdrop:bg-black/70 backdrop:backdrop-blur-sm p-4 w-full max-w-md">
        <div className="bg-[#0d0f1a] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-950 flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
              <IconCheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Enrollment Successful</h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">Save these credentials. Passwords are <span className="font-bold text-white">never</span> shown again.</p>
            </div>
          </div>

          {creds && (
            <>
              <div className="bg-[#16192b] border border-[#1e233d] rounded-xl p-4 mb-4 space-y-3">
                <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Student Account</p>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                    <IconIdCard className="w-3.5 h-3.5" /> Roll No
                  </span>
                  <span className="text-sm font-mono font-bold text-white tracking-wider">{creds.student.rollNumber}</span>
                </div>
                <div className="border-t border-[#1e233d]" />
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                    <IconMail className="w-3.5 h-3.5" /> Login
                  </span>
                  <span className="text-sm font-mono font-bold text-cyan-400">{creds.student.email}</span>
                </div>
                <div className="border-t border-[#1e233d]" />
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                    <IconKey className="w-3.5 h-3.5" /> Password
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-lg border border-emerald-500/20 tracking-widest">
                    {creds.student.password}
                  </span>
                </div>
              </div>

              <div className="bg-[#16192b] border border-[#1e233d] rounded-xl p-4 mb-4 space-y-3">
                <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Parent Portal</p>
                {creds.parent.isExisting ? (
                  <p className="text-xs text-zinc-400">Linked to existing parent account <span className="font-bold text-white">{creds.parent.email}</span>.</p>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                        <IconMail className="w-3.5 h-3.5" /> Login
                      </span>
                      <span className="text-sm font-mono font-bold text-cyan-400">{creds.parent.email}</span>
                    </div>
                    <div className="border-t border-[#1e233d]" />
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                        <IconKey className="w-3.5 h-3.5" /> Password
                      </span>
                      <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-lg border border-emerald-500/20 tracking-widest">
                        {creds.parent.password}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <p className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-500/20 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
            <IconAlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Save these credentials now - passwords cannot be recovered later.
          </p>

          <button
            onClick={() => dialogRef.current?.close()}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </dialog>

      {/* Trigger Buttons */}
      {!isFormOpen && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
          <div>
            <h2 className="text-sm font-bold text-white">Student Enrollment</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Add new students manually or via CSV import.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCsvModal(true)}
              className="inline-flex items-center gap-2 bg-[#16192b] hover:bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import CSV
            </button>
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-cyan-900/20"
            >
              <IconUsers className="w-4 h-4" /> Enroll New Student
            </button>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d0f1a] border border-[#1e233d] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e233d]">
              <h2 className="text-sm font-bold text-white">Bulk Import Students via CSV</h2>
              <button
                onClick={() => setShowCsvModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1e233d] text-zinc-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
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
                className="space-y-4"
              >
                <div className="bg-[#16192b] border border-[#2b3052] rounded-xl p-4 text-xs text-zinc-300">
                  <p className="font-bold text-white mb-2">Required CSV Format:</p>
                  <code className="text-[10px] text-cyan-400 block mb-2 break-all">
                    name, rollNumber, fatherName, classId, cnic, fatherCnic, whatsappNumber, telephone, address, gender
                  </code>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Passwords will default to the student's <strong className="text-white">rollNumber</strong>.</li>
                    <li>First row must be exactly the headers shown above.</li>
                    <li><strong className="text-white">classId</strong> must be the exact UUID of the class (get this from Export Data).</li>
                  </ul>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Upload CSV File</label>
                  <input name="file" type="file" accept=".csv" required className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-400 hover:file:bg-cyan-900 cursor-pointer" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowCsvModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#1e233d] text-zinc-400 text-sm hover:text-white hover:bg-[#1e233d] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isImporting}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
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
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#0d0f1a] border border-[#1e233d] rounded-2xl shadow-2xl relative my-auto animate-in fade-in slide-in-from-bottom-4 duration-200 mt-20 mb-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e233d] sticky top-0 bg-[#0d0f1a] z-10 rounded-t-2xl">
              <div>
                <h2 className="text-sm font-bold text-white">Enroll New Student</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">Roll number, login email & password are auto-generated</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1e233d] text-zinc-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6">
              {classes.length === 0 ? (
                <p className="text-sm text-amber-400">Please <a href="/admin/classes" className="underline">create at least one class</a> before enrolling students.</p>
              ) : (
                <form ref={formRef} action={action} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input name="name" placeholder="Student Full Name *" className={inputCls} required />
                    <input name="fatherName" placeholder="Father's Name *" className={inputCls} required />
                    <select name="classId" className={inputCls} required>
                      <option value="">Select Class *</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.academicYr})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input name="cnic" placeholder="B-Form / CNIC Number (Optional)" className={inputCls} />
                    <input name="fatherCnic" placeholder="Father's CNIC (Optional)" className={inputCls} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input name="whatsappNumber" placeholder="Student WhatsApp (Optional)" className={inputCls} />
                    <input name="telephone" placeholder="Telephone (Optional)" className={inputCls} />
                    <select name="gender" className={inputCls}>
                      <option value="">Select Gender (Optional)</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input name="photo" type="file" accept="image/*" className={`${inputCls} file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-400 hover:file:bg-cyan-900 cursor-pointer p-1.5`} />
                  </div>
                  
                  <div>
                    <input name="address" placeholder="Home Address (Optional)" className={inputCls} />
                  </div>

                  {/* Admission % + Fee Package */}
                  <div className="bg-[#0a0c14] border border-[#1e233d] rounded-xl p-4 space-y-3">
                    <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">📦 Fee Package Assignment</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <input
                          name="admissionPercentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={admissionPct}
                          onChange={(e) => setAdmissionPct(e.target.value)}
                          placeholder="📊 Admission Percentage (e.g. 87.50)"
                          className={inputCls}
                        />
                        {suggestedPkg && (
                          <p className="text-[10px] text-cyan-400 mt-1.5 flex items-center gap-1">
                            ✅ Auto-assigned: <span className="font-bold">{suggestedPkg.name}</span> - ₨{suggestedPkg.monthlyFee.toLocaleString()}/month
                          </p>
                        )}
                        {admissionPct && !suggestedPkg && (
                          <p className="text-[10px] text-amber-400 mt-1.5">⚠️ No package matches this percentage</p>
                        )}
                      </div>
                      <div>
                        <select
                          name="feePackageId"
                          value={manualPkgId}
                          onChange={(e) => setManualPkgId(e.target.value)}
                          className={inputCls}
                        >
                          <option value="">📦 Select Package (override)</option>
                          {feePackages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} - ₨{p.monthlyFee.toLocaleString()}/mo ({p.minPercentage}–{p.maxPercentage}%)
                            </option>
                          ))}
                          <option value="CUSTOM">⚙️ Custom (Override)</option>
                        </select>
                        {manualPkgId === 'CUSTOM' && (
                          <input
                            name="feeMonthlyOverride"
                            type="number"
                            placeholder="₨ Custom Monthly Fee Amount *"
                            className={`mt-3 ${inputCls}`}
                            required
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        <div className="absolute left-0 right-0 mt-1 z-10 bg-[#16192b] border border-amber-500/30 rounded-lg p-3 text-xs shadow-xl space-y-2">
                          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                            <IconAlertTriangle className="w-3.5 h-3.5" />
                            Guardian duplicate warning:
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            The following existing parents match this name. To link them, use the exact phone number below:
                          </div>
                          <div className="space-y-1 divide-y divide-[#1e233d]">
                            {matchingParents.map((p) => (
                              <div key={p.id} className="pt-1 flex justify-between items-center text-[10px]">
                                <span className="text-white font-medium">{p.name}</span>
                                <span className="font-mono text-cyan-400 select-all cursor-pointer" title="Click to copy phone number" onClick={() => {
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

                  {state?.error && (
                    <div className="px-3 py-2 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400">
                      {state.error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer w-full md:w-auto mt-4"
                  >
                    {pending ? 'Enrolling…' : 'Enroll Student & Generate Credentials'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

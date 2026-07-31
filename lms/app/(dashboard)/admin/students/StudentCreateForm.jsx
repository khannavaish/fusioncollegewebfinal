'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createStudent, checkGuardianName } from '@/app/actions/admin';
import { IconCheckCircle, IconAlertTriangle, IconIdCard, IconMail, IconKey, IconUsers } from '@/app/components/icons';

const inputCls = "w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

export default function StudentCreateForm({ classes, feePackages = [] }) {
  const [state, action, pending] = useActionState(createStudent, null);
  const [guardianNameInput, setGuardianNameInput] = useState('');
  const [matchingParents, setMatchingParents] = useState([]);
  const [admissionPct, setAdmissionPct] = useState('');
  const [suggestedPkg, setSuggestedPkg] = useState(null);
  const [manualPkgId, setManualPkgId] = useState('');
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
    const pct = parseFloat(admissionPct);
    if (!isNaN(pct) && feePackages.length > 0) {
      const matched = feePackages.find(
        (p) => pct >= p.minPercentage && pct <= p.maxPercentage
      );
      setSuggestedPkg(matched || null);
      if (matched && !manualPkgId) setManualPkgId(matched.id);
    } else {
      setSuggestedPkg(null);
    }
  }, [admissionPct, feePackages]);

  const creds = state?.credentials;

  return (
    <>
      {/* Credential Modal */}
      <dialog
        ref={dialogRef}
        className="bg-[#0d0f1a] border border-emerald-500/30 rounded-2xl p-0 shadow-2xl shadow-emerald-900/20 w-full max-w-md backdrop:bg-black/70"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center">
              <IconCheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Student Enrolled!</h2>
              <p className="text-[11px] text-zinc-400">Share these login credentials with the student</p>
            </div>
          </div>

          <div className="bg-[#0a0c14] border border-[#1e233d] rounded-xl p-5 space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">Student Name</span>
              <span className="text-sm font-bold text-white">{creds?.name}</span>
            </div>
            <div className="border-t border-[#1e233d]" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                <IconIdCard className="w-3.5 h-3.5" /> Roll Number
              </span>
              <span className="text-sm font-mono font-bold text-cyan-400">{creds?.rollNumber}</span>
            </div>
            <div className="border-t border-[#1e233d]" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                <IconMail className="w-3.5 h-3.5" /> Login Email
              </span>
              <span className="text-xs font-mono text-zinc-300">{creds?.email}</span>
            </div>
            <div className="border-t border-[#1e233d]" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                <IconKey className="w-3.5 h-3.5" /> Password
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-lg border border-emerald-500/20 tracking-widest">
                {creds?.password}
              </span>
            </div>
          </div>

          {creds?.parent && (
            <>
              <div className="border-t border-[#1e233d] my-4" />
              <div className="flex items-center gap-2 mb-3">
                <IconUsers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white">Guardian / Parent Profile</h3>
              </div>
              <div className="bg-[#0a0c14] border border-[#1e233d] rounded-xl p-5 space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">Guardian Name</span>
                  <span className="text-sm font-bold text-white">{creds.parent.name}</span>
                </div>
                <div className="border-t border-[#1e233d]" />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">Phone</span>
                  <span className="text-xs text-zinc-300">{creds.parent.phone}</span>
                </div>
                {creds.parent.isExisting ? (
                  <div className="text-[10px] text-indigo-400 bg-indigo-950/20 border border-indigo-500/20 rounded-lg px-3 py-2 mt-2">
                    Linked to existing parent account matching this phone number.
                  </div>
                ) : (
                  <>
                    <div className="border-t border-[#1e233d]" />
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                        <IconMail className="w-3.5 h-3.5" /> Login Email
                      </span>
                      <span className="text-xs font-mono text-zinc-300">{creds.parent.email}</span>
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

      {/* Form */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div>
            <h2 className="text-sm font-bold text-white">Enroll New Student</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Roll number, login email & password are auto-generated</p>
          </div>
        </div>

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

            {/* Admission % + Fee Package */}
            {feePackages.length > 0 && (
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
                    </select>
                  </div>
                </div>
                <div>
                  <input
                    name="feeMonthlyOverride"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="💰 Custom Monthly Fee Override (leave blank to use package rate)"
                    className={inputCls}
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">Only fill this to override the package fee for this specific student</p>
                </div>
              </div>
            )}

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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {pending ? 'Enrolling…' : 'Enroll Student & Generate Credentials'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { updateSessionName, graduateStudents, promoteStudents } from '@/app/actions/session';

const cardCls = "bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6 relative overflow-hidden";
const inputCls = "w-full bg-[#16192b] border border-[#2b3052] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all";

export default function SessionClient({ initialSessionName, classes }) {
  const [sessionName, setSessionName] = useState(initialSessionName);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  // Graduation State
  const [selectedGraduateClasses, setSelectedGraduateClasses] = useState([]);
  
  // Promotion State
  const [promotionMappings, setPromotionMappings] = useState([{ fromClassId: '', toClassId: '' }]);

  function showMessage(type, text) {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  }

  const handleUpdateSession = async (e) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.append('sessionName', sessionName);
      const res = await updateSessionName(formData);
      if (res.error) showMessage('error', res.error);
      else showMessage('success', 'Global session updated successfully!');
    });
  };

  const handleGraduate = async () => {
    if (selectedGraduateClasses.length === 0) {
      showMessage('error', 'Please select at least one class to graduate.');
      return;
    }
    if (!confirm('Are you sure you want to graduate these students? They will be marked as ALUMNI and lose write-access.')) return;

    startTransition(async () => {
      const formData = new FormData();
      selectedGraduateClasses.forEach(id => formData.append('classIds', id));
      const res = await graduateStudents(formData);
      
      if (res.error) showMessage('error', res.error);
      else {
        showMessage('success', `${res.count} students have successfully graduated.`);
        setSelectedGraduateClasses([]);
      }
    });
  };

  const handlePromote = async () => {
    const validMappings = promotionMappings.filter(m => m.fromClassId && m.toClassId);
    if (validMappings.length === 0) {
      showMessage('error', 'Please add at least one complete promotion mapping.');
      return;
    }
    if (!confirm('Are you sure? This will instantly move all students from the selected 1st year classes into their 2nd year classes.')) return;

    startTransition(async () => {
      const res = await promoteStudents(validMappings);
      if (res.error) showMessage('error', res.error);
      else {
        showMessage('success', `${res.count} students were successfully promoted.`);
        setPromotionMappings([{ fromClassId: '', toClassId: '' }]);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Toast Message */}
      {statusMsg && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          statusMsg.type === 'error' 
            ? 'bg-red-950/90 border-red-500/50 text-red-200' 
            : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
        }`}>
          {statusMsg.type === 'error' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          )}
          <p className="text-sm font-semibold">{statusMsg.text}</p>
        </div>
      )}

      {/* 1. Global Session Name */}
      <div className={cardCls}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Current Active Session
        </h2>
        <p className="text-sm text-zinc-400 mb-6">This text is displayed globally in the header and main website.</p>
        
        <form onSubmit={handleUpdateSession} className="flex flex-col sm:flex-row gap-3">
          <input 
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className={`${inputCls} max-w-md`}
            placeholder="e.g. Session 2026-2028"
            required
          />
          <button 
            type="submit" 
            disabled={isPending}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? 'Saving...' : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Save Global Session
              </>
            )}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 2. Graduate 2nd Year Students */}
        <div className={cardCls}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
            Step 1: Graduate Final Year
          </h2>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">Select 2nd Year classes to mark all their students as ALUMNI (Read-Only access).</p>
          
          <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {classes.map(c => (
              <label key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-[#2b3052] bg-[#16192b]/50 hover:bg-[#1e233d] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    checked={selectedGraduateClasses.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedGraduateClasses([...selectedGraduateClasses, c.id]);
                      else setSelectedGraduateClasses(selectedGraduateClasses.filter(id => id !== c.id));
                    }}
                    className="w-4 h-4 rounded border-[#2b3052] text-purple-600 focus:ring-purple-500/50 bg-[#0a0c14]"
                  />
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{c.name}</span>
                </div>
                <span className="text-xs font-mono px-2 py-1 bg-[#0a0c14] rounded-lg text-zinc-500 border border-[#2b3052]">
                  {c.studentCount} students
                </span>
              </label>
            ))}
          </div>

          <button 
            onClick={handleGraduate}
            disabled={isPending || selectedGraduateClasses.length === 0}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? 'Graduating...' : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Graduate Selected Classes
              </>
            )}
          </button>
        </div>

        {/* 3. Promote 1st Year Students */}
        <div className={cardCls}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            Step 2: Promote 1st Year
          </h2>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">Map 1st year classes to their 2nd year counterparts to instantly transfer the batch.</p>
          
          <div className="space-y-4 mb-6">
            {promotionMappings.map((mapping, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl border border-[#2b3052] bg-[#16192b]/30">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">From (1st Year)</label>
                  <select 
                    value={mapping.fromClassId}
                    onChange={(e) => {
                      const newMappings = [...promotionMappings];
                      newMappings[idx].fromClassId = e.target.value;
                      setPromotionMappings(newMappings);
                    }}
                    className={inputCls}
                  >
                    <option value="">Select Origin Class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="mt-4 sm:mt-6 text-zinc-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">To (2nd Year)</label>
                  <select 
                    value={mapping.toClassId}
                    onChange={(e) => {
                      const newMappings = [...promotionMappings];
                      newMappings[idx].toClassId = e.target.value;
                      setPromotionMappings(newMappings);
                    }}
                    className={inputCls}
                  >
                    <option value="">Select Destination...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                {promotionMappings.length > 1 && (
                  <button 
                    onClick={() => setPromotionMappings(promotionMappings.filter((_, i) => i !== idx))}
                    className="mt-4 sm:mt-6 p-3 rounded-xl bg-red-950/30 text-red-400 hover:bg-red-900/50 transition-colors"
                    title="Remove Mapping"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => setPromotionMappings([...promotionMappings, { fromClassId: '', toClassId: '' }])}
              className="px-4 py-3 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Mapping
            </button>
            <button 
              onClick={handlePromote}
              disabled={isPending || !promotionMappings[0].fromClassId}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? 'Promoting...' : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Execute Promotion
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

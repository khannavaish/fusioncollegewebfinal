'use client';

import { useState } from 'react';
import { updateBankConfig } from '@/app/actions/fees';
import { IconDocumentText, IconCheckCircle, IconXCircle, IconLoader } from '@/app/components/icons';

const inputCls = "w-full bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

export default function BankSettingsForm({ initialConfig, bankLogs = [] }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    const result = await updateBankConfig(fd);
    setLoading(false);
    if (result?.success) {
      setMsg('✅ Bank details updated successfully!');
      e.target.reset(); // clear password field
    } else {
      setMsg('❌ ' + (result?.error || 'Failed to update'));
    }
    setTimeout(() => setMsg(''), 4000);
  }

  return (
    <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <IconDocumentText className="w-5 h-5 text-cyan-400" /> College Bank Account Details
        </h3>
        {bankLogs.length > 0 && (
          <button 
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs font-medium text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
          >
            {showLogs ? 'Hide Logs' : 'View Change Logs'}
          </button>
        )}
      </div>
      <p className="text-zinc-400 text-sm mb-6">These details will be printed on all generated fee challans for students to deposit their fees.</p>
      
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2 ${msg.startsWith('✅') ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300' : 'bg-red-950/40 border-red-700/40 text-red-300'}`}>
          {msg.startsWith('✅') ? <IconCheckCircle className="w-4 h-4" /> : <IconXCircle className="w-4 h-4" />}
          {msg.replace(/^[✅❌]\s*/, '')}
        </div>
      )}

      {showLogs ? (
        <div className="mb-6 border border-[#1e233d] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-[#1e233d]/50 text-xs uppercase font-semibold text-zinc-300">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Old Account No.</th>
                <th className="px-4 py-3">New Account No.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e233d]">
              {bankLogs.map(log => (
                <tr key={log.id} className="hover:bg-[#1e233d]/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(log.changedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{log.adminName}</td>
                  <td className="px-4 py-3 text-red-300 font-mono">{log.oldAccountNumber}</td>
                  <td className="px-4 py-3 text-emerald-300 font-mono">{log.newAccountNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Account Title</label>
          <input name="accountTitle" defaultValue={initialConfig?.accountTitle} placeholder="e.g. Fusion College" className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Account Number (IBAN / A/C)</label>
          <input name="accountNumber" defaultValue={initialConfig?.accountNumber} placeholder="e.g. PK00..." className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Bank Name</label>
          <input name="bankName" defaultValue={initialConfig?.bankName} placeholder="e.g. Bank Alfalah" className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Branch Code</label>
          <input name="branchCode" defaultValue={initialConfig?.branchCode} placeholder="e.g. 0000" className={inputCls} required />
        </div>
        <div className="md:col-span-2 pt-2 border-t border-white/5 mt-2">
          <label className="block text-xs font-bold text-red-400 mb-1 uppercase tracking-wider">System Password Required</label>
          <input type="password" name="systemPassword" placeholder="••••••••" className={inputCls + " border-red-900/50 focus:border-red-500"} required />
          <p className="text-[10px] text-zinc-500 mt-1">Required to authorize changes to bank details. Changes will be logged.</p>
        </div>
        <div className="md:col-span-2 mt-2 flex items-center justify-between">
          <button type="submit" disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconCheckCircle className="w-4 h-4" />}
            Save Bank Details & Log Action
          </button>
        </div>
      </form>
    </div>
  );
}

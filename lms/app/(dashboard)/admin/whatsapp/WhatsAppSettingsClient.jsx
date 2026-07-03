'use client';

import { useState, useTransition } from 'react';
import { saveWhatsAppConfig, sendTestWhatsApp, sendEndOfDaySummary } from '@/app/actions/whatsapp';
import { IconCheckCircle, IconAlertTriangle } from '@/app/components/icons';

export default function WhatsAppSettingsClient({ config }) {
  const [senderNumber, setSenderNumber] = useState(config?.senderNumber || '');
  const [apiToken, setApiToken]         = useState(config?.apiToken || '');
  const [instanceId, setInstanceId]     = useState(config?.instanceId || '');
  const [isEnabled, setIsEnabled]       = useState(config?.isEnabled || false);
  const [testNumber, setTestNumber]     = useState('');
  const [eodDate, setEodDate]           = useState(new Date().toISOString().split('T')[0]);

  const [saveMsg, setSaveMsg]   = useState(null);
  const [testMsg, setTestMsg]   = useState(null);
  const [eodMsg, setEodMsg]     = useState(null);
  const [isSaving, startSave]   = useTransition();
  const [isTesting, startTest]  = useTransition();
  const [isEod, startEod]       = useTransition();

  const handleSave = (e) => {
    e.preventDefault();
    setSaveMsg(null);
    startSave(async () => {
      const fd = new FormData();
      fd.append('senderNumber', senderNumber);
      fd.append('apiToken', apiToken);
      fd.append('instanceId', instanceId);
      fd.append('isEnabled', isEnabled.toString());
      const res = await saveWhatsAppConfig(fd);
      setSaveMsg(res?.error ? { type: 'error', text: res.error } : { type: 'success', text: 'Settings saved successfully.' });
    });
  };

  const handleTest = (e) => {
    e.preventDefault();
    setTestMsg(null);
    startTest(async () => {
      const fd = new FormData();
      fd.append('testNumber', testNumber);
      const res = await sendTestWhatsApp(fd);
      setTestMsg(res?.error ? { type: 'error', text: res.error } : { type: 'success', text: 'Test message sent! Check your WhatsApp.' });
    });
  };

  const handleEod = (e) => {
    e.preventDefault();
    setEodMsg(null);
    if (!confirm('Send end-of-day attendance summary to ALL parents? This will send WhatsApp messages.')) return;
    startEod(async () => {
      const fd = new FormData();
      fd.append('date', eodDate);
      const res = await sendEndOfDaySummary(fd);
      if (res?.error) setEodMsg({ type: 'error', text: res.error });
      else setEodMsg({ type: 'success', text: `Sent to parents of ${res.sent} students. ${res.skipped} skipped (no parent phone).` });
    });
  };

  const AlertMsg = ({ msg }) => msg ? (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border border-red-500/30 text-red-400'}`}>
      {msg.type === 'success' ? <IconCheckCircle className="w-4 h-4 flex-shrink-0" /> : <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />}
      {msg.text}
    </div>
  ) : null;

  return (
    <div className="space-y-8">
      {/* Section 1: API Configuration */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#16192b]/40 border-b border-[#1e233d]">
          <h2 className="text-sm font-bold text-white">UltraMsg API Configuration</h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Sign up at <a href="https://app.ultramsg.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">app.ultramsg.com</a> to get your Instance ID and API Token.
          </p>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {saveMsg && <AlertMsg msg={saveMsg} />}

          <div className="flex items-center gap-3 pb-5 border-b border-[#1e233d]">
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Enable WhatsApp Notifications</div>
              <div className="text-xs text-zinc-500 mt-0.5">When enabled, messages will be sent to parents automatically.</div>
            </div>
            <button type="button" onClick={() => setIsEnabled(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${isEnabled ? 'bg-emerald-600' : 'bg-zinc-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Your Sender Number</label>
              <input type="text" value={senderNumber} onChange={e => setSenderNumber(e.target.value)}
                placeholder="e.g. 03001234567"
                className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-600" />
              <p className="text-[10px] text-zinc-600 mt-1">The WhatsApp number you are sending FROM (for reference only)</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">UltraMsg Instance ID</label>
              <input type="text" value={instanceId} onChange={e => setInstanceId(e.target.value)}
                placeholder="e.g. instance12345"
                className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-600" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">UltraMsg API Token</label>
              <input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)}
                placeholder="Your UltraMsg API token"
                className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-600" />
            </div>
          </div>

          <button type="submit" disabled={isSaving}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer">
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>

      {/* Section 2: Test Message */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#16192b]/40 border-b border-[#1e233d]">
          <h2 className="text-sm font-bold text-white">Send Test Message</h2>
          <p className="text-[11px] text-zinc-500 mt-1">Verify your configuration is working correctly.</p>
        </div>
        <form onSubmit={handleTest} className="p-6 space-y-4">
          {testMsg && <AlertMsg msg={testMsg} />}
          <div className="flex gap-3">
            <input type="text" value={testNumber} onChange={e => setTestNumber(e.target.value)}
              placeholder="e.g. 03001234567"
              className="flex-1 bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-600" />
            <button type="submit" disabled={isTesting}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer whitespace-nowrap">
              {isTesting ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </form>
      </div>

      {/* Section 3: End of Day Report */}
      <div className="bg-[#0d0f1a] border border-amber-500/20 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-amber-950/10 border-b border-amber-500/20">
          <h2 className="text-sm font-bold text-white">Send End-of-Day Attendance Report</h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Sends every parent a full summary of their child's attendance and lecture topics for the selected date.
            This includes how many classes the student attended and what was taught.
          </p>
        </div>
        <form onSubmit={handleEod} className="p-6 space-y-4">
          {eodMsg && <AlertMsg msg={eodMsg} />}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Report Date</label>
              <input type="date" value={eodDate} onChange={e => setEodDate(e.target.value)}
                className="bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" />
            </div>
            <button type="submit" disabled={isEod}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer">
              {isEod ? 'Sending Reports...' : 'Send End-of-Day Reports'}
            </button>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
            <strong>Message includes:</strong> Student name, roll number, classes attended today, subjects covered, and topics taught per subject.
          </div>
        </form>
      </div>

      {/* Section 4: How it works */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
        <h2 className="text-sm font-bold text-white mb-4">How WhatsApp Notifications Work</h2>
        <div className="space-y-3 text-xs text-zinc-400">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">1</div>
            <div><strong className="text-white">Arrival Message (Automatic):</strong> When a teacher marks a student as Present for the first time today, the parent immediately receives: <em>"Your child [Name] has arrived at Fusion College today."</em></div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">2</div>
            <div><strong className="text-white">End-of-Day Report (Manual):</strong> At the end of school, click <em>"Send End-of-Day Reports"</em> above. Each parent receives a full breakdown of attendance in every class and what topics each teacher taught.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

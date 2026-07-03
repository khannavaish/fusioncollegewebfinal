'use client';

import { useState, useTransition } from 'react';
import { saveWhatsAppConfig, sendTestWhatsApp, sendEndOfDaySummary } from '@/app/actions/whatsapp';
import { IconCheckCircle, IconAlertTriangle } from '@/app/components/icons';

export default function WhatsAppSettingsClient({ config, classes = [] }) {
  const [provider, setProvider]         = useState(config?.provider || 'ULTRAMSG');
  const [gatewayUrl, setGatewayUrl]     = useState(config?.gatewayUrl || 'http://localhost:3001');
  const [senderNumber, setSenderNumber] = useState(config?.senderNumber || '');
  const [apiToken, setApiToken]         = useState(config?.apiToken || '');
  const [instanceId, setInstanceId]     = useState(config?.instanceId || '');
  const [isEnabled, setIsEnabled]       = useState(config?.isEnabled || false);
  const [testNumber, setTestNumber]     = useState('');
  const [eodDate, setEodDate]           = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('ALL');

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
      fd.append('provider', provider);
      fd.append('gatewayUrl', gatewayUrl);
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
    const label = selectedClass === 'ALL' ? 'ALL parents' : 'parents of the selected class';
    if (!confirm(`Send end-of-day attendance summary to ${label}? This will send WhatsApp messages.`)) return;
    startEod(async () => {
      const fd = new FormData();
      fd.append('date', eodDate);
      fd.append('classId', selectedClass);
      const res = await sendEndOfDaySummary(fd);
      if (res?.error) setEodMsg({ type: 'error', text: res.error });
      else setEodMsg({ type: 'success', text: `Sent to parents of ${res.sent} students. ${res.skipped} skipped.` });
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
      {/* Configuration Form */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#16192b]/40 border-b border-[#1e233d]">
          <h2 className="text-sm font-bold text-white">WhatsApp Provider Configuration</h2>
          <p className="text-[11px] text-zinc-500 mt-1">Configure your WhatsApp sending client credentials below.</p>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {saveMsg && <AlertMsg msg={saveMsg} />}

          {/* Toggle Enable */}
          <div className="flex items-center justify-between pb-5 border-b border-[#1e233d]">
            <div>
              <div className="text-sm font-bold text-white">Enable WhatsApp Notifications</div>
              <div className="text-xs text-zinc-500 mt-0.5">Automate parent arrival and daily summary alerts.</div>
            </div>
            <button type="button" onClick={() => setIsEnabled(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${isEnabled ? 'bg-emerald-600' : 'bg-zinc-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Service Provider</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setProvider('ULTRAMSG')}
                className={`py-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  provider === 'ULTRAMSG' ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-400 font-bold' : 'border-[#1e233d] text-zinc-500 bg-transparent'
                }`}>
                UltraMsg (Paid API Cloud)
              </button>
              <button type="button" onClick={() => setProvider('CUSTOM')}
                className={`py-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  provider === 'CUSTOM' ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-400 font-bold' : 'border-[#1e233d] text-zinc-500 bg-transparent'
                }`}>
                Free Self-Hosted Gateway (Scan QR)
              </button>
            </div>
          </div>

          {provider === 'CUSTOM' ? (
            // Custom Self-Hosted API Panel
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 space-y-2">
                <p className="font-bold text-white">✨ Free &amp; Unlimited WhatsApp Sending</p>
                <p>
                  We have generated a custom microservice script for you in this codebase under:
                  <code className="text-white bg-black/40 px-1 py-0.5 rounded ml-1 font-mono">scratch/whatsapp-gateway.js</code>
                </p>
                <p className="font-semibold text-white mt-1">To run it on your local server/machine:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open a terminal in the project directory.</li>
                  <li>Install dependencies: <code className="text-cyan-300">npm install express whatsapp-web.js qrcode-terminal</code></li>
                  <li>Start the gateway service: <code className="text-cyan-300">node scratch/whatsapp-gateway.js</code></li>
                  <li>Scan the terminal's QR code with your phone's WhatsApp Linked Devices to log in.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Self-Hosted Gateway URL</label>
                <input type="text" value={gatewayUrl} onChange={e => setGatewayUrl(e.target.value)}
                  placeholder="e.g. http://localhost:3001"
                  className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
                <p className="text-[10px] text-zinc-500 mt-1">Your self-hosted API gateway endpoint address.</p>
              </div>
            </div>
          ) : (
            // UltraMsg API Panel
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Sender Number</label>
                <input type="text" value={senderNumber} onChange={e => setSenderNumber(e.target.value)}
                  placeholder="e.g. 03001234567"
                  className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">UltraMsg Instance ID</label>
                <input type="text" value={instanceId} onChange={e => setInstanceId(e.target.value)}
                  placeholder="e.g. instance12345"
                  className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">UltraMsg API Token</label>
                <input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)}
                  placeholder="Your UltraMsg API token"
                  className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
          )}

          <button type="submit" disabled={isSaving}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer">
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>

      {/* Test Message */}
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

      {/* End of Day Report */}
      <div className="bg-[#0d0f1a] border border-amber-500/20 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-amber-950/10 border-b border-amber-500/20">
          <h2 className="text-sm font-bold text-white">Send End-of-Day Attendance Report</h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Sends every parent a full summary of their child's attendance and lecture topics for the selected date.
          </p>
        </div>
        <form onSubmit={handleEod} className="p-6 space-y-4">
          {eodMsg && <AlertMsg msg={eodMsg} />}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Target Class</label>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 min-w-[200px] cursor-pointer">
                <option value="ALL">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Report Date</label>
              <input type="date" value={eodDate} onChange={e => setEodDate(e.target.value)}
                className="bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer" />
            </div>
            <button type="submit" disabled={isEod}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer">
              {isEod ? 'Sending Reports...' : 'Send End-of-Day Reports'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

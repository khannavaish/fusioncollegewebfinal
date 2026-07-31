'use client';

import { useState, useTransition } from 'react';
import { saveWhatsAppConfig, sendTestWhatsApp, sendEndOfDaySummary, logoutWhatsAppGateway, sendBroadcastMessage } from '@/app/actions/whatsapp';
import { IconCheckCircle, IconAlertTriangle, IconSparkles } from '@/app/components/icons';

export default function WhatsAppSettingsClient({ config, classes = [] }) {
  // Always use CUSTOM provider now
  const provider = 'CUSTOM';
  const [gatewayUrl, setGatewayUrl]     = useState(config?.gatewayUrl || 'http://localhost:3001');
  const [isEnabled, setIsEnabled]       = useState(config?.isEnabled || false);
  const [testNumber, setTestNumber]     = useState('');
  const [eodDate, setEodDate]           = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('ALL');

  const [saveMsg, setSaveMsg]   = useState(null);
  const [testMsg, setTestMsg]   = useState(null);
  const [eodMsg, setEodMsg]     = useState(null);
  const [logoutMsg, setLogoutMsg] = useState(null);
  const [isSaving, startSave]   = useTransition();
  const [isTesting, startTest]  = useTransition();
  const [isEod, startEod]       = useTransition();
  const [isLoggingOut, startLogout] = useTransition();
  const [isBroadcasting, startBroadcast] = useTransition();

  const [broadcastMsg, setBroadcastMsg] = useState(null);
  const [broadcastClass, setBroadcastClass] = useState('ALL');
  const [broadcastText, setBroadcastText] = useState('');

  const TEMPLATES = [
    { label: '🏫 Institute Off', text: '*FUSION COLLEGE NAROWAL* 🏫\n\nAssalamu Alaikum,\n\nPlease be informed that the college will remain *CLOSED* tomorrow due to an administrative decision.\n\nالسلام علیکم\nکالج انتظامیہ کی طرف سے اطلاع دی جاتی ہے کہ کالج کل *بند* رہے گا۔\n\nJazakAllah Khair,\nFusion College Narowal Administration' },
    { label: '🌧️ Rain Holiday', text: '*FUSION COLLEGE NAROWAL* 🏫\n\nAssalamu Alaikum,\n\nDue to heavy rainfall and adverse weather conditions, the college will remain *CLOSED* tomorrow. Students are advised to stay safe.\n\nالسلام علیکم\nشدید بارش اور موسمی حالات کے پیش نظر کالج کل *بند* رہے گا۔ تمام طلبہ گھروں میں محفوظ رہیں۔\n\nJazakAllah Khair,\nFusion College Narowal Administration' },
    { label: '🎉 Vacations', text: '*FUSION COLLEGE NAROWAL* 🏫\n\nAssalamu Alaikum,\n\nPlease be informed that college *VACATIONS* will commence from tomorrow. College will reopen as per the announced schedule.\n\nالسلام علیکم\nآپ کو اطلاع دی جاتی ہے کہ کالج کی *تعطیلات* کا آغاز کل سے ہوگا۔ اعلان کردہ شیڈول کے مطابق کالج دوبارہ کھلے گا۔\n\nJazakAllah Khair,\nFusion College Narowal Administration' },
  ];

  const handleBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    const targetLabel = broadcastClass === 'ALL' ? 'ALL parents' : 'selected class parents';
    if (!confirm(`Send this broadcast to ${targetLabel}? This will send WhatsApp messages.`)) return;
    setBroadcastMsg(null);
    startBroadcast(async () => {
      const fd = new FormData();
      fd.append('classId', broadcastClass);
      fd.append('message', broadcastText.trim());
      const res = await sendBroadcastMessage(fd);
      if (res?.error) setBroadcastMsg({ type: 'error', text: res.error });
      else setBroadcastMsg({ type: 'success', text: `Sent to ${res.sent} parents. ${res.skipped} skipped.` });
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaveMsg(null);
    startSave(async () => {
      const fd = new FormData();
      fd.append('provider', provider);
      fd.append('gatewayUrl', gatewayUrl);
      fd.append('isEnabled', isEnabled.toString());
      // We still append empty values to clear out any old UltraMsg keys in DB if needed by action, though optional
      fd.append('senderNumber', '');
      fd.append('apiToken', '');
      fd.append('instanceId', '');
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

  const handleLogout = (e) => {
    e.preventDefault();
    setLogoutMsg(null);
    if (!confirm('Logout from WhatsApp gateway? This will disconnect your WhatsApp account. You will need to scan the QR code again to reconnect.')) return;
    startLogout(async () => {
      const res = await logoutWhatsAppGateway();
      if (res?.error) setLogoutMsg({ type: 'error', text: res.error });
      else setLogoutMsg({ type: 'success', text: res.message });
    });
  };

  const AlertMsg = ({ msg }) => msg ? (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'}`}>
      {msg.type === 'success' ? <IconCheckCircle className="w-4 h-4 flex-shrink-0" /> : <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />}
      {msg.text}
    </div>
  ) : null;

  return (
    <div className="space-y-8">

      {/* 1. End of Day Report */}
      <div className="bg-white dark:bg-[#0d0f1a] border border-amber-200 dark:border-amber-500/20 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="px-6 py-4 bg-amber-50 dark:bg-amber-950/10 border-b border-amber-200 dark:border-amber-500/20">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Send End-of-Day Attendance Report</h2>
          <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
            Sends every parent a full summary of their child's attendance and lecture topics for the selected date.
          </p>
        </div>
        <form onSubmit={handleEod} className="p-6 space-y-4">
          {eodMsg && <AlertMsg msg={eodMsg} />}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-2">Target Class</label>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="bg-white dark:bg-[#0a0c14] border border-gray-300 dark:border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 min-w-[200px] cursor-pointer">
                <option value="ALL">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-2">Report Date</label>
              <input type="date" value={eodDate} onChange={e => setEodDate(e.target.value)}
                className="bg-white dark:bg-[#0a0c14] border border-gray-300 dark:border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer" />
            </div>
            <button type="submit" disabled={isEod}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer">
              {isEod ? 'Sending Reports...' : 'Send End-of-Day Reports'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Quick Broadcast */}
      <div className="bg-white dark:bg-[#0d0f1a] border border-indigo-200 dark:border-indigo-500/20 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-950/10 border-b border-indigo-200 dark:border-indigo-500/20">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Quick Broadcast Message</h2>
          <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">Send a custom notice to all parents — use templates or write your own.</p>
        </div>
        <form onSubmit={handleBroadcast} className="p-6 space-y-4">
          {broadcastMsg && <AlertMsg msg={broadcastMsg} />}

          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(t => (
              <button key={t.label} type="button"
                onClick={() => setBroadcastText(t.text)}
                className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-500/30 hover:border-indigo-500 dark:hover:border-indigo-400 text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            value={broadcastText}
            onChange={e => setBroadcastText(e.target.value)}
            rows={6}
            placeholder="Type your message here, or click a template above to prefill..."
            className="w-full bg-white dark:bg-[#0a0c14] border border-gray-300 dark:border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder-gray-400 dark:placeholder-zinc-600 resize-y"
          />

          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-2">Target Class</label>
              <select value={broadcastClass} onChange={e => setBroadcastClass(e.target.value)}
                className="bg-white dark:bg-[#0a0c14] border border-gray-300 dark:border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 min-w-[200px] cursor-pointer">
                <option value="ALL">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={isBroadcasting || !broadcastText.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer">
              {isBroadcasting ? 'Sending Broadcast...' : 'Send Broadcast'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Configuration Form (Provider Custom only) */}
      <div className="bg-white dark:bg-[#0d0f1a] border border-gray-200 dark:border-[#1e233d] rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#16192b]/40 border-b border-gray-200 dark:border-[#1e233d]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">WhatsApp Provider Configuration</h2>
          <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">Configure your WhatsApp sending client credentials below.</p>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {saveMsg && <AlertMsg msg={saveMsg} />}

          {/* Toggle Enable */}
          <div className="flex items-center justify-between pb-5 border-b border-gray-200 dark:border-[#1e233d]">
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">Enable WhatsApp Notifications</div>
              <div className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Automate parent arrival and daily summary alerts.</div>
            </div>
            <button type="button" onClick={() => setIsEnabled(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${isEnabled ? 'bg-emerald-600' : 'bg-zinc-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <IconSparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                Free &amp; Unlimited WhatsApp Sending
              </p>
              <p>
                We have generated a custom microservice script for you in this codebase under:
                <code className="text-gray-900 dark:text-white bg-gray-200 dark:bg-black/40 px-1 py-0.5 rounded ml-1 font-mono">scratch/whatsapp-gateway.js</code>
              </p>
              <p className="font-semibold text-gray-900 dark:text-white mt-1">To run it on your local server/machine:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open a terminal in the project directory.</li>
                <li>Install dependencies: <code className="text-cyan-700 dark:text-cyan-300">npm install express whatsapp-web.js qrcode-terminal</code></li>
                <li>Start the gateway service: <code className="text-cyan-700 dark:text-cyan-300">node scratch/whatsapp-gateway.js</code></li>
                <li>Scan the terminal's QR code with your phone's WhatsApp Linked Devices to log in.</li>
              </ol>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-2">Self-Hosted Gateway URL</label>
              <input type="text" value={gatewayUrl} onChange={e => setGatewayUrl(e.target.value)}
                placeholder="e.g. http://localhost:3001"
                className="w-full bg-white dark:bg-[#0a0c14] border border-gray-300 dark:border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500" />
              <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1">Your self-hosted API gateway endpoint address.</p>
            </div>

            <div className="pt-2">
              {logoutMsg && <AlertMsg msg={logoutMsg} />}
              <button type="button" onClick={handleLogout} disabled={isLoggingOut}
                className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer">
                {isLoggingOut ? 'Logging Out...' : 'Logout from WhatsApp Gateway'}
              </button>
              <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-2">Disconnect your WhatsApp account from the gateway. You will need to scan the QR code again to reconnect.</p>
            </div>
          </div>

          <button type="submit" disabled={isSaving}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer mt-4">
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>

      {/* 4. Test Message */}
      <div className="bg-white dark:bg-[#0d0f1a] border border-gray-200 dark:border-[#1e233d] rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#16192b]/40 border-b border-gray-200 dark:border-[#1e233d]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Send Test Message</h2>
          <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">Verify your configuration is working correctly.</p>
        </div>
        <form onSubmit={handleTest} className="p-6 space-y-4">
          {testMsg && <AlertMsg msg={testMsg} />}
          <div className="flex gap-3">
            <input type="text" value={testNumber} onChange={e => setTestNumber(e.target.value)}
              placeholder="e.g. 03001234567"
              className="flex-1 bg-white dark:bg-[#0a0c14] border border-gray-300 dark:border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 placeholder-gray-400 dark:placeholder-zinc-600" />
            <button type="submit" disabled={isTesting}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer whitespace-nowrap">
              {isTesting ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

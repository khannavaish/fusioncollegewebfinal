'use client';

import { useState, useEffect } from 'react';

export default function WebsiteSettingsCard() {
  const [tagLine, setTagLine] = useState('');
  const [isBlinking, setIsBlinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/website-config')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setTagLine(data.heroTagLine || '');
          setIsBlinking(data.isBlinking || false);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/website-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroTagLine: tagLine, isBlinking })
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch {
      setMessage('An error occurred.');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-5 text-zinc-400">Loading website settings...</div>;

  return (
    <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
      <h2 className="text-lg font-bold text-white mb-4">Live Website Settings</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Hero Admissions Tag</label>
          <input
            type="text"
            value={tagLine}
            onChange={(e) => setTagLine(e.target.value)}
            className="w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            placeholder="e.g. Admissions Open · Session 2026"
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isBlinking"
            checked={isBlinking}
            onChange={(e) => setIsBlinking(e.target.checked)}
            className="w-4 h-4 bg-[#0d0f1a] border-[#1e233d] rounded text-cyan-500 focus:ring-cyan-500"
          />
          <label htmlFor="isBlinking" className="text-sm text-zinc-300 font-medium">
            Enable Blinking Animation
          </label>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Live Site'}
          </button>
          {message && <span className={`text-sm ${message.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>{message}</span>}
        </div>
      </form>
    </div>
  );
}

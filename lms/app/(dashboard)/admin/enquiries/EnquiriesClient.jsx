'use client';

import { useState, useRef, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageShell } from '@/app/components/Brand';
import { IconMail, IconCheckCircle, IconTrash, IconDownload, IconClock } from '@/app/components/icons';
import { markEnquiryStatus, deleteEnquiry } from '@/app/actions/enquiries';
import { toPng } from 'html-to-image';

export default function EnquiriesClient({ initialEnquiries }) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, READ

  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPNG = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: '#070514', // Match the dark theme base
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      const link = document.createElement('a');
      link.download = `Enquiries_Report_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    startTransition(async () => {
      const res = await markEnquiryStatus(id, newStatus);
      if (res.success) {
        setEnquiries(enquiries.map(eq => eq.id === id ? { ...eq, status: newStatus } : eq));
      } else {
        alert(res.error);
      }
    });
  };

  const handleDelete = (id) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return;
    startTransition(async () => {
      const res = await deleteEnquiry(id);
      if (res.success) {
        setEnquiries(enquiries.filter(eq => eq.id !== id));
      } else {
        alert(res.error);
      }
    });
  };

  const filteredEnquiries = enquiries.filter(eq => {
    if (filter === 'ALL') return true;
    return eq.status === filter;
  });

  return (
    <PageShell
      title="Contact Enquiries"
      description="Manage and respond to website contact forms and admission enquiries."
      icon={<IconMail />}
      rightContent={
        <button
          onClick={handleExportPNG}
          disabled={exporting || filteredEnquiries.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#1e233d] text-white hover:bg-[#2a3152] transition-colors disabled:opacity-50"
        >
          <IconDownload className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export Report'}
        </button>
      }
    >
      <div className="space-y-6">
        
        {/* Filters */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/5 w-max">
          {['ALL', 'UNREAD', 'READ'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Export Container */}
        <div ref={exportRef} className="rounded-[2rem] border border-white/5 bg-black/20 backdrop-blur-3xl p-6 lg:p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Enquiries Database</h2>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">{filteredEnquiries.length} records found</p>
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {filteredEnquiries.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-zinc-500">
                  No enquiries found.
                </motion.div>
              ) : (
                filteredEnquiries.map((eq) => (
                  <motion.div
                    key={eq.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${
                      eq.status === 'UNREAD' 
                        ? 'bg-cyan-500/5 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)]' 
                        : 'bg-[#0c0e1a]/80 border-white/5'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                      
                      {/* Left: Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-white">{eq.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                            eq.status === 'UNREAD' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-zinc-400'
                          }`}>
                            {eq.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-400">
                          <div className="flex items-center gap-1.5"><IconClock className="w-3.5 h-3.5 text-zinc-500" /> {new Date(eq.createdAt).toLocaleString()}</div>
                          <div className="flex items-center gap-1.5"><span className="text-zinc-500">Phone:</span> <span className="text-white/80">{eq.phone}</span></div>
                          {eq.email && <div className="flex items-center gap-1.5"><span className="text-zinc-500">Email:</span> <span className="text-white/80">{eq.email}</span></div>}
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <p className="text-sm text-zinc-300 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                            "{eq.message}"
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex md:flex-col items-center justify-end gap-2 shrink-0">
                        {eq.status === 'UNREAD' ? (
                          <button
                            onClick={() => handleStatusChange(eq.id, 'READ')}
                            disabled={isPending}
                            className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:scale-105 transition-all"
                            title="Mark as Read"
                          >
                            <IconCheckCircle className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(eq.id, 'UNREAD')}
                            disabled={isPending}
                            className="p-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white transition-all"
                            title="Mark as Unread"
                          >
                            <IconMail className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(eq.id)}
                          disabled={isPending}
                          className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:scale-105 transition-all"
                          title="Delete Enquiry"
                        >
                          <IconTrash className="w-5 h-5" />
                        </button>
                      </div>

                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </PageShell>
  );
}

'use client';

import ClientPortal from '@/app/components/ClientPortal';
import { useState, useRef, useEffect } from 'react';
import { updateUser, deleteUser } from '@/app/actions/users';
import { CheckCircle as IconCheckCircle, AlertTriangle as IconAlertTriangle, Key as IconKey, X as IconX } from 'lucide-react';

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner";

export default function UserEditDialog({ user, onClose }) {
  const dialogRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(user.status);
  
  const onDialogRef = (node) => {
    if (node && !node.open) {
      node.showModal();
    }
    dialogRef.current = node;
  };

  const closeDialog = () => {
    dialogRef.current?.close();
    onClose();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const res = await updateUser(user.id, {
      status,
      password: password || undefined
    });
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      closeDialog();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you absolutely sure you want to delete this user? This action cannot be undone and will delete all associated data.')) return;
    
    setLoading(true);
    setError(null);
    
    const res = await deleteUser(user.id);
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      closeDialog();
    }
  };

  const getDisplayName = () => {
    return user.student?.name || user.teacher?.name || user.admin?.name || user.parent?.name || user.email;
  };

  return (
    <ClientPortal>
      <dialog ref={onDialogRef} onClose={onClose} className="bg-transparent m-auto backdrop:bg-black/60 backdrop:backdrop-blur-md p-4 w-full max-w-md max-h-[100dvh] overflow-y-auto scroll-smooth pt-20 pb-28 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="bg-[#0c0e1a]/90 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">Edit User</h2>
              <p className="text-[11px] text-zinc-400 mt-1">{getDisplayName()}</p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 ml-1">Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputCls}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 ml-1 flex items-center gap-1.5">
                <IconKey className="w-3.5 h-3.5" /> Reset Password
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                minLength={6}
              />
              <p className="text-[10px] text-amber-500/80 ml-1 mt-1">If changed, user will be forced to update it on next login.</p>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 flex items-center gap-2">
                <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-white/5 mt-6">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 disabled:opacity-50 font-bold rounded-xl transition-colors text-sm w-full"
              >
                Delete User
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white disabled:opacity-50 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] text-sm w-full"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </ClientPortal>
  );
}

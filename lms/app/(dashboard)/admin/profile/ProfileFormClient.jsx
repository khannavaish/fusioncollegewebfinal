'use client';

import { useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { updateAdminProfile } from '@/app/actions/admin';
import { Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50 flex items-center gap-2"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  );
}

export default function ProfileFormClient({ admin, dbUser }) {
  const [previewUrl, setPreviewUrl] = useState(dbUser.avatarUrl || null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const inputCls = 'w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors';

  return (
    <form action={updateAdminProfile} className="space-y-8 max-w-3xl">
      {/* Avatar Section */}
      <div className="flex items-center gap-6 bg-[#0d0f1a] border border-[#1e233d] p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-purple-500" />
        
        <div 
          className="relative w-24 h-24 rounded-full border-2 border-cyan-500/30 overflow-hidden cursor-pointer group bg-[#16192b] flex-shrink-0 flex items-center justify-center"
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <Image src={previewUrl} alt="Profile" fill className="object-cover" />
          ) : (
            <span className="text-3xl font-black text-cyan-400/50">{admin?.name?.charAt(0) || 'A'}</span>
          )}
          
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white mb-1" />
            <span className="text-[10px] text-white font-bold tracking-wider">CHANGE</span>
          </div>
        </div>
        
        <input 
          type="file" 
          name="avatar" 
          accept="image/*" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
        />

        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{admin?.name || 'Administrator'}</h2>
          <div className="text-sm text-zinc-400 mb-2">{dbUser.email}</div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            System Administrator
          </span>
        </div>
      </div>

      {/* Form Details */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] p-8 rounded-2xl space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Account Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-zinc-400 block mb-2 font-medium uppercase tracking-wider">Full Name</label>
            <input name="name" defaultValue={admin?.name || ''} placeholder="Administrator Name" className={inputCls} required />
          </div>
          
          <div>
            <label className="text-xs text-zinc-400 block mb-2 font-medium uppercase tracking-wider">Email Address</label>
            <input name="email" type="email" defaultValue={dbUser.email || ''} placeholder="admin@fusion.edu" className={inputCls} required />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-2 font-medium uppercase tracking-wider">New Password <span className="text-zinc-600 normal-case tracking-normal">(leave blank to keep current)</span></label>
          <input name="password" type="password" placeholder="••••••••" className={inputCls} minLength={6} />
        </div>

        <div className="pt-4 flex justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}

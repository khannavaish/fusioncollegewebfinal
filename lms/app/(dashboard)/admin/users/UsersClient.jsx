'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconFilter, IconEdit, IconCheckCircle, IconX } from '@/app/components/icons';
import UserEditDialog from './UserEditDialog';

const TABS = ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'];

export default function UsersClient({ initialUsers, classes }) {
  const [activeTab, setActiveTab] = useState('STUDENT');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);

  // Filter users based on tab, search, and class
  const filteredUsers = initialUsers.filter(u => {
    if (u.role !== activeTab) return false;

    // Class filter (only applies to students)
    if (activeTab === 'STUDENT' && classFilter) {
      if (u.student?.classId !== classFilter) return false;
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (u.student?.name || u.teacher?.name || u.admin?.name || u.parent?.name || '').toLowerCase();
      const email = u.email.toLowerCase();
      const rollNumber = (u.student?.rollNumber || '').toLowerCase();
      
      if (!name.includes(q) && !email.includes(q) && !rollNumber.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const getDisplayName = (user) => {
    return user.student?.name || user.teacher?.name || user.admin?.name || user.parent?.name || 'Unknown';
  };

  const getStatusBadge = (status) => {
    return status === 'ACTIVE' ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
        <IconCheckCircle className="w-3 h-3" /> Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase tracking-widest">
        <IconX className="w-3 h-3" /> Inactive
      </span>
    );
  };

  return (
    <>
      <div className="bg-[#0c0e1a]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
        {/* Header & Tabs */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          
          {/* Tabs */}
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 overflow-x-auto max-w-full hide-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setClassFilter('');
                }}
                className={`relative px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'text-white' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="usersTabBubble"
                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{tab}S</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {activeTab === 'STUDENT' && (
              <div className="relative group">
                <IconFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full sm:w-48 pl-10 pr-8 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.grade} {c.section && `- ${c.section}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="relative group flex-1 sm:min-w-[250px]">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="text"
                placeholder="Search name, email, or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((u) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={u.id}
                className="bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-5 transition-colors group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-white text-base truncate pr-4">{getDisplayName(u)}</h3>
                    {getStatusBadge(u.status)}
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <p className="text-xs text-zinc-400 font-mono truncate">{u.email}</p>
                    
                    {u.role === 'STUDENT' && u.student?.rollNumber && (
                      <p className="text-xs text-cyan-400 font-mono font-bold bg-cyan-500/10 inline-block px-2 py-1 rounded">
                        {u.student.rollNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-white/5">
                  <button
                    onClick={() => setEditingUser(u)}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-cyan-400 transition-colors px-3 py-1.5 bg-white/5 hover:bg-cyan-500/10 rounded-lg"
                  >
                    <IconEdit className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </motion.div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="inline-flex w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-4">
                  <IconSearch className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-black text-white tracking-wide">No users found</h3>
                <p className="text-sm text-zinc-500 mt-2">Try adjusting your filters or search query.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {editingUser && (
        <UserEditDialog 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
        />
      )}
    </>
  );
}

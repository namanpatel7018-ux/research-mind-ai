import React from 'react';
import { User, ShieldCheck, Sliders, Lock, Key, Trash2, Loader2, Save } from 'lucide-react';
import { AuthUser } from '../../types/auth';

interface AccountTabProps {
  user: AuthUser | null;
  fullName: string;
  setFullName: (val: string) => void;
  currentPass: string;
  setCurrentPass: (val: string) => void;
  newPass: string;
  setNewPass: (val: string) => void;
  busyProfile: boolean;
  busyPass: boolean;
  deleteConfirmOpen: boolean;
  setDeleteConfirmOpen: (val: boolean) => void;
  busyDelete: boolean;
  handleUpdateProfile: (e: React.FormEvent) => void;
  handleChangePassword: (e: React.FormEvent) => void;
  handleDeleteAccount: () => void;
}

export function AccountTab({
  user,
  fullName,
  setFullName,
  currentPass,
  setCurrentPass,
  newPass,
  setNewPass,
  busyProfile,
  busyPass,
  deleteConfirmOpen,
  setDeleteConfirmOpen,
  busyDelete,
  handleUpdateProfile,
  handleChangePassword,
  handleDeleteAccount,
}: AccountTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Account Profile &amp; Security Credentials
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Manage your verified profile credentials, security passwords, and session authorization tokens.
        </p>
      </div>

      {/* Profile Card Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/25 border border-indigo-400/30 text-indigo-600 dark:text-indigo-300 font-bold text-lg overflow-hidden shrink-0 shadow-sm">
            {user?.picture ? (
              <img src={user.picture} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span>{(user?.full_name || user?.email || 'R')[0].toUpperCase()}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {user?.full_name || 'Researcher'}
              </h3>
              <span className="rounded bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-mono text-indigo-700 dark:text-indigo-400 uppercase font-semibold">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              {user?.email || 'authenticated user'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
          <ShieldCheck className="h-4 w-4" />
          <span>Verified JWT Session</span>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* 1. Name Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Profile Information
            </h3>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Authenticated Email
            </label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full rounded-xl border border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-space-950/60 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={busyProfile || !fullName.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-40 cursor-pointer"
          >
            {busyProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Profile Changes</span>
          </button>
        </form>

        {/* 2. Password Change Form */}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Change Password
            </h3>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Enter existing password"
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              New Password (min. 8 characters)
            </label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Enter new secure password"
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={busyPass || !currentPass || newPass.length < 8}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-40 cursor-pointer"
          >
            {busyPass ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
            <span>Update Security Password</span>
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Danger Zone</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Permanently delete your account, saved answer bookmarks, and all indexed research papers.
          </p>
        </div>

        {deleteConfirmOpen ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="rounded-xl border border-slate-300 dark:border-white/10 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={busyDelete}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              {busyDelete ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Confirm Delete</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Permanently Delete Account</span>
          </button>
        )}
      </div>
    </div>
  );
}

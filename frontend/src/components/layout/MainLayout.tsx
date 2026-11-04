import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

export function MainLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const toast            = useToast();

  const handleLogout = async () => {
    await logout();
    toast.info('You have been signed out.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#07090E] dark:text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-600 dark:selection:text-indigo-200 transition-colors duration-200">
      {/* ── Top Navigation Bar with Hover Dropdowns ────────────────────────── */}
      <TopNavbar isLoggedIn={Boolean(user)} onLogout={handleLogout} />

      {/* ── Main Sub-Page Content (Flush to top navbar, 100% Full Width) ───── */}
      <main className="flex-1 w-full min-w-0 overflow-y-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}

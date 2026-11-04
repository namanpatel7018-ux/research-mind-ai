import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Home, Atom, Sparkles, MessageSquare, FileText, Search,
  LayoutGrid, BookOpen, FileCheck, Library, Presentation,
  Settings, UserCircle, LogOut, ChevronDown, Menu, X,
  ShieldCheck, Cpu, Layers, ArrowRight, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface TopNavbarProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: any;
  badge?: string | null;
  description: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon: any;
  matchPrefixes: string[];
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'research',
    title: 'Research Engines',
    icon: Atom,
    matchPrefixes: ['/dashboard/chat', '/dashboard/ai-summary', '/dashboard/literature-review', '/dashboard/comparison'],
    items: [
      {
        label: 'AI Research Chat',
        to: '/dashboard/chat',
        icon: MessageSquare,
        badge: 'RAG',
        description: 'Deep conversational research with grounded citations',
      },
      {
        label: 'AI Summary Engine',
        to: '/dashboard/ai-summary',
        icon: FileText,
        badge: 'Fast',
        description: 'Multi-document synthesis & executive takeaways',
      },
      {
        label: 'Literature Review',
        to: '/dashboard/literature-review',
        icon: Search,
        badge: 'Matrix',
        description: 'Systematic literature matrices & citation graphs',
      },
      {
        label: 'Compare Papers',
        to: '/dashboard/comparison',
        icon: LayoutGrid,
        badge: 'Diff',
        description: 'Side-by-side benchmark & methodology comparison',
      },
    ],
  },
  {
    id: 'study',
    title: 'Study & Export',
    icon: Layers,
    matchPrefixes: ['/dashboard/quiz', '/dashboard/generate-pdf', '/dashboard/convert-ppt'],
    items: [
      {
        label: 'Convert to PPT',
        to: '/dashboard/convert-ppt',
        icon: Presentation,
        badge: 'PPTX',
        description: 'Auto-generate structured PowerPoint presentation decks',
      },
      {
        label: 'Generate PDF',
        to: '/dashboard/generate-pdf',
        icon: FileCheck,
        badge: 'PDF',
        description: 'Export publication-ready academic summaries',
      },
      {
        label: 'Quiz Generator',
        to: '/dashboard/quiz',
        icon: BookOpen,
        badge: 'Smart',
        description: 'Adaptive assessment quizzes & test flashcards',
      },
    ],
  },
  {
    id: 'workspace',
    title: 'Workspace',
    icon: Library,
    matchPrefixes: ['/dashboard/library', '/dashboard/settings', '/dashboard/profile'],
    items: [
      {
        label: 'Document Library',
        to: '/dashboard/library',
        icon: Library,
        badge: 'Storage',
        description: 'Uploaded PDFs, vector indices & embeddings',
      },
      {
        label: 'Settings',
        to: '/dashboard/settings',
        icon: Settings,
        badge: null,
        description: 'Model parameters, API keys & preferences',
      },
      {
        label: 'Profile',
        to: '/dashboard/profile',
        icon: UserCircle,
        badge: null,
        description: 'Account credentials, subscription & usage stats',
      },
    ],
  },
];

export function TopNavbar({ isLoggedIn, onLogout }: TopNavbarProps) {
  const { user } = useAuth();
  const { theme, resolvedTheme, systemTheme, setTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>('research');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'Researcher';
  const userInitial = displayName.charAt(0).toUpperCase();
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.picture]);

  // Close menus on route change
  useEffect(() => {
    setActiveMenu(null);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleMouseEnter = (id: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveMenu(id);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 180);
  };

  const isGroupActive = (group: NavGroup) => {
    return group.matchPrefixes.some(prefix => location.pathname.startsWith(prefix));
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 shrink-0 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#080B12]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shadow-sm dark:shadow-lg transition-colors">
      <div className="flex items-center gap-6">
        
        {/* ── Brand Logo ──────────────────────────────────────────────────────── */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 group focus:outline-none"
          aria-label="Research Mind AI Home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-[#070D1E] border border-indigo-500/30 shadow-sm shadow-indigo-500/20 overflow-hidden group-hover:border-indigo-400/50 transition">
            <img
              src="/logo-icon.png"
              alt="Research Mind AI Logo"
              className="h-7 w-7 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] group-hover:scale-105 transition-transform"
            />
          </div>
          <span className="font-display text-sm font-semibold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-slate-200 transition">
            Research Mind AI
          </span>
        </Link>

        {/* ── Desktop Hover Navigation Bar ──────────────────────────────────── */}
        <nav className="hidden lg:flex items-center gap-1">
          {/* Direct Dashboard Link */}
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Home className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Dashboard</span>
              </>
            )}
          </NavLink>

          {/* Hoverable Navigation Groups */}
          {navGroups.map((group) => {
            const active = isGroupActive(group);
            const isOpen = activeMenu === group.id;

            return (
              <div
                key={group.id}
                className="relative group"
                onMouseEnter={() => handleMouseEnter(group.id)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Category Trigger Button */}
                <button
                  type="button"
                  onClick={() => setActiveMenu(isOpen ? null : group.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    active || isOpen
                      ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <group.icon className={`h-3.5 w-3.5 ${active || isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-slate-200'}`} />
                  <span>{group.title}</span>
                  <ChevronDown
                    className={`h-3 w-3 text-slate-400 dark:text-slate-500 transition-transform duration-200 group-hover:rotate-180 group-hover:text-slate-700 dark:group-hover:text-slate-300 ${
                      isOpen ? 'rotate-180 text-slate-700 dark:text-slate-300' : ''
                    }`}
                  />
                </button>

                {/* Minimalist Glass Hover Dropdown Menu */}
                <div
                  className={`absolute left-0 top-full pt-1.5 z-50 transition-all duration-150 ease-out origin-top-left ${
                    isOpen
                      ? 'opacity-100 translate-y-0 pointer-events-auto visible'
                      : 'opacity-0 -translate-y-1 pointer-events-none invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-hover:visible'
                  }`}
                >
                  <div className="w-72 sm:w-80 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0C101A]/95 p-1.5 shadow-xl dark:shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/5 space-y-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.label}
                        to={item.to}
                        onClick={() => setActiveMenu(null)}
                        className={({ isActive }) =>
                          `group/item flex items-center gap-2.5 rounded-lg p-2 transition ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-600/15 text-indigo-900 dark:text-white'
                              : 'hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              isActive
                                ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-400/30 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-300'
                            }`}>
                              <item.icon className="h-3.5 w-3.5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-medium truncate ${isActive ? 'text-indigo-950 dark:text-white font-semibold' : 'text-slate-800 dark:text-slate-200 group-hover/item:text-slate-950 dark:group-hover/item:text-white'}`}>
                                  {item.label}
                                </span>
                                {item.badge && (
                                  <span className="rounded bg-slate-200/80 dark:bg-white/[0.06] px-1 py-0.2 text-[8px] font-mono text-slate-600 dark:text-slate-400 uppercase">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                                {item.description}
                              </p>
                            </div>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* ── Right Action Area: Theme Toggle & User Profile Dropdown ─────────── */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Quick Dark / Light Mode Segmented Toggle */}
        <div className="flex items-center rounded-lg border border-slate-300 dark:border-white/[0.1] bg-slate-100/90 dark:bg-white/[0.04] p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition cursor-pointer ${
              resolvedTheme === 'light'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Switch to Light Crisp theme"
            aria-label="Light mode"
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition cursor-pointer ${
              resolvedTheme === 'dark'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Switch to Dark Space theme"
            aria-label="Dark mode"
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* User Profile Hover Dropdown */}
        <div
          className="relative group"
          onMouseEnter={() => handleMouseEnter('profile_dropdown')}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'profile_dropdown' ? null : 'profile_dropdown')}
            className={`flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100/70 dark:bg-white/[0.02] hover:bg-slate-200/80 dark:hover:bg-white/[0.06] group-hover:bg-slate-200/80 dark:group-hover:bg-white/[0.06] p-1 pr-2.5 transition cursor-pointer ${
              activeMenu === 'profile_dropdown' ? 'border-indigo-500/40 bg-slate-200/70 dark:bg-white/[0.06]' : ''
            }`}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500/25 to-violet-500/25 border border-indigo-400/30 text-indigo-600 dark:text-indigo-300 font-semibold text-[11px] shrink-0 overflow-hidden">
              {user?.picture && !avatarError ? (
                <img
                  src={user.picture}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="h-full w-full rounded-md object-cover"
                />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
              {displayName}
            </span>
            <ChevronDown className={`h-3 w-3 text-slate-400 dark:text-slate-500 transition-transform duration-200 group-hover:rotate-180 group-hover:text-slate-700 dark:group-hover:text-slate-300 ${
              activeMenu === 'profile_dropdown' ? 'rotate-180 text-slate-700 dark:text-slate-300' : ''
            }`} />
          </button>

          {/* Minimalist Profile Hover Dropdown Menu */}
          <div
            className={`absolute right-0 top-full pt-1.5 z-50 transition-all duration-150 ease-out origin-top-right ${
              activeMenu === 'profile_dropdown'
                ? 'opacity-100 translate-y-0 pointer-events-auto visible'
                : 'opacity-0 -translate-y-1 pointer-events-none invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-hover:visible'
            }`}
          >
            <div className="w-64 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0C101A]/95 p-2 shadow-xl dark:shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/5 space-y-2">
              {/* User info card */}
              <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] p-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500/25 to-violet-500/25 border border-indigo-400/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold shrink-0 overflow-hidden">
                  {user?.picture && !avatarError ? (
                    <img
                      src={user.picture}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarError(true)}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                    {displayName}
                  </p>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {user?.email || 'authenticated'}
                  </p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-0.5">
                <Link
                  to="/dashboard/profile"
                  onClick={() => setActiveMenu(null)}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition"
                >
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                    <span>My Profile</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                </Link>

                <Link
                  to="/dashboard/settings"
                  onClick={() => setActiveMenu(null)}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                    <span>Settings</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                </Link>

                <Link
                  to="/dashboard/library"
                  onClick={() => setActiveMenu(null)}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition"
                >
                  <div className="flex items-center gap-2">
                    <Library className="h-3.5 w-3.5 text-slate-400" />
                    <span>Document Library</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                </Link>
              </div>

              {/* Sign Out */}
              <div className="border-t border-slate-200 dark:border-white/[0.06] pt-1.5">
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onLogout();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </div>
                  <span className="text-[9px] font-mono text-rose-500/60 dark:text-rose-400/60">Exit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Mobile Navigation Drawer ────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-50 bg-white/95 dark:bg-[#07090E]/95 backdrop-blur-2xl p-4 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-3">
            <NavLink
              to="/dashboard"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`
              }
            >
              <Home className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Dashboard</span>
            </NavLink>

            {navGroups.map((group) => {
              const isExpanded = mobileExpandedGroup === group.id;

              return (
                <div key={group.id} className="rounded-lg border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMobileExpandedGroup(isExpanded ? null : group.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <group.icon className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{group.title}</span>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="p-1 space-y-0.5 bg-black/20 border-t border-white/[0.04]">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.label}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition ${
                              isActive
                                ? 'bg-indigo-600/15 text-white font-medium'
                                : 'text-slate-400 hover:text-slate-200'
                            }`
                          }
                        >
                          <div className="flex items-center gap-2">
                            <item.icon className="h-3.5 w-3.5 text-slate-500" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="rounded bg-white/[0.06] px-1 py-0.2 text-[8px] font-mono text-slate-400">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 py-2 text-xs font-medium text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

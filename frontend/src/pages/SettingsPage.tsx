import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  ShieldCheck,
  Check,
  Loader2,
  Save,
  User,
  AlertCircle,
  RotateCcw,
  Palette,
  Zap,
  FileText,
  Brain,
} from 'lucide-react';
import {
  getUserSettings,
  updateUserSettings,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../lib/api';
import { UserSettings } from '../types/settings';
import { useAuth } from '../context/AuthContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { useToast } from '../components/ui/Toast';
import {
  AppearanceTab,
  ReasoningTab,
  PresentationTab,
  AutomationTab,
  AccountTab,
} from '../components/settings';

type ActiveTab = 'appearance' | 'reasoning' | 'presentation' | 'automation' | 'account';

export function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, systemTheme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('appearance');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Server & local preferences
  const [defaultMode, setDefaultMode] = useState<'strict' | 'deepthink' | 'balanced'>('strict');
  const [responseStyle, setResponseStyle] = useState<'structured' | 'academic' | 'concise'>('structured');
  const [citationDisplay, setCitationDisplay] = useState<'detailed' | 'subtle' | 'minimal'>('detailed');
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  // Extended AI model & editor preferences
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('rm_model') || 'gemini-2.0-flash';
  });
  const [temperature, setTemperature] = useState<number>(() => {
    const v = localStorage.getItem('rm_temp');
    return v !== null ? parseFloat(v) : 0.2;
  });
  const [maxTokens, setMaxTokens] = useState<number>(() => {
    const v = localStorage.getItem('rm_max_tokens');
    return v !== null ? parseInt(v, 10) : 4096;
  });
  const [streamResponse, setStreamResponse] = useState<boolean>(() => {
    return localStorage.getItem('rm_stream') !== 'false';
  });
  const [latexRender, setLatexRender] = useState<boolean>(() => {
    return localStorage.getItem('rm_latex') !== 'false';
  });
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('rm_accent') || 'indigo';
  });

  // Profile and Security State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyPass, setBusyPass] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user?.full_name]);

  useEffect(() => {
    let isMounted = true;
    getUserSettings()
      .then((s) => {
        if (!isMounted || !s) return;
        const localSavedTheme = localStorage.getItem('theme');
        if (!localSavedTheme && s.theme && (s.theme === 'dark' || s.theme === 'light' || s.theme === 'system')) {
          setTheme(s.theme as Theme);
        }
        if (s.default_mode) setDefaultMode(s.default_mode as any);
        if (s.response_style) setResponseStyle(s.response_style as any);
        if (s.citation_display) setCitationDisplay(s.citation_display as any);
        if (s.notifications !== undefined) setNotifications(Boolean(s.notifications));
        if (s.auto_save !== undefined) setAutoSave(Boolean(s.auto_save));
      })
      .catch((err) => {
        console.warn('Could not load remote settings; using cached local preferences.', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [setTheme]);

  const handleSaveSettings = async (updates: Partial<UserSettings> = {}, silent = false) => {
    setSaving(true);
    setErrorMsg('');
    try {
      const payload: Partial<UserSettings> = {
        theme,
        default_mode: defaultMode,
        response_style: responseStyle,
        citation_display: citationDisplay,
        notifications,
        auto_save: autoSave,
        ...updates,
      };

      await updateUserSettings(payload);
      localStorage.setItem('rm_model', selectedModel);
      localStorage.setItem('rm_temp', temperature.toString());
      localStorage.setItem('rm_max_tokens', maxTokens.toString());
      localStorage.setItem('rm_stream', streamResponse.toString());
      localStorage.setItem('rm_latex', latexRender.toString());
      localStorage.setItem('rm_accent', accentColor);

      if (!silent) {
        setSaveSuccess(true);
        toast.success('Workspace preferences synchronized successfully');
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err: any) {
      console.error('Settings save error:', err);
      setErrorMsg(err?.response?.data?.detail || 'Failed to persist settings to server.');
      toast.error('Could not save preferences to server.');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    handleSaveSettings({ theme: newTheme }, true);
    toast.info(`Theme switched to ${newTheme} mode`);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.warning('Full name must be at least 2 characters long.');
      return;
    }
    setBusyProfile(true);
    try {
      await updateProfile(fullName.trim());
      await refreshUser();
      toast.success('Researcher profile updated successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update profile name.');
    } finally {
      setBusyProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass) {
      toast.warning('Please enter your existing password.');
      return;
    }
    if (newPass.length < 8) {
      toast.warning('New password must be at least 8 characters long.');
      return;
    }
    setBusyPass(true);
    try {
      await changePassword(currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      toast.success('Password changed successfully. Your session remains secure.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Incorrect current password or invalid new password.');
    } finally {
      setBusyPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    setBusyDelete(true);
    try {
      await deleteAccount();
      toast.info('Your account has been deleted. Logging out…');
      await logout();
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete account.');
      setBusyDelete(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleResetDefaults = () => {
    setDefaultMode('strict');
    setResponseStyle('structured');
    setCitationDisplay('detailed');
    setNotifications(true);
    setAutoSave(true);
    setSelectedModel('gemini-2.0-flash');
    setTemperature(0.2);
    setMaxTokens(4096);
    setStreamResponse(true);
    setLatexRender(true);
    setAccentColor('indigo');

    localStorage.setItem('rm_model', 'gemini-2.0-flash');
    localStorage.setItem('rm_temp', '0.2');
    localStorage.setItem('rm_max_tokens', '4096');
    localStorage.setItem('rm_stream', 'true');
    localStorage.setItem('rm_latex', 'true');
    localStorage.setItem('rm_accent', 'indigo');

    toast.info('Settings restored to recommended academic defaults.');
    handleSaveSettings(
      {
        default_mode: 'strict',
        response_style: 'structured',
        citation_display: 'detailed',
        notifications: true,
        auto_save: true,
      },
      true,
    );
  };

  const handleExportSettings = () => {
    const config = {
      exported_at: new Date().toISOString(),
      user: user?.email,
      theme,
      accentColor,
      defaultMode,
      responseStyle,
      citationDisplay,
      notifications,
      autoSave,
      selectedModel,
      temperature,
      maxTokens,
      streamResponse,
      latexRender,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `researchmind-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Configuration exported as JSON');
  };

  const handleClearCache = () => {
    const themeBackup = localStorage.getItem('theme');
    const authBackup = localStorage.getItem('researchmind_token');
    localStorage.clear();
    if (themeBackup) localStorage.setItem('theme', themeBackup);
    if (authBackup) localStorage.setItem('researchmind_token', authBackup);
    toast.success('Local cache purged. Theme & session preserved.');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-3.5 sm:p-5 gap-4">
      {/* ── 1. Top Header Banner ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 px-5 sm:px-6 py-4 shadow-md dark:shadow-2xl backdrop-blur-2xl shrink-0 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                System &amp; Workspace Configuration
              </h1>
              <span className="rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="h-3 w-3" />
                Isolated User Config
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Customize interface contrast, reasoning hyperparameters, citation density, and account credentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shadow-sm"
            title="Restore recommended defaults"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 2. Category Navigation Tabs + Content View ─────────────────────── */}
      <div className="flex flex-1 flex-col md:flex-row gap-4 overflow-hidden min-h-0">
        {/* Navigation Tabs (Sidebar on desktop, horizontal on mobile) */}
        <div className="w-full md:w-56 lg:w-64 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition cursor-pointer whitespace-nowrap text-left ${
              activeTab === 'appearance'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Palette className="h-4 w-4" />
            <div className="flex-1 truncate">
              <div>Appearance &amp; Theme</div>
              <div
                className={`text-[10px] truncate ${
                  activeTab === 'appearance' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Dark, light &amp; styling
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reasoning')}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition cursor-pointer whitespace-nowrap text-left ${
              activeTab === 'reasoning'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Brain className="h-4 w-4" />
            <div className="flex-1 truncate">
              <div>AI &amp; Reasoning Mode</div>
              <div
                className={`text-[10px] truncate ${
                  activeTab === 'reasoning' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Strict RAG vs DeepThink
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presentation')}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition cursor-pointer whitespace-nowrap text-left ${
              activeTab === 'presentation'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <FileText className="h-4 w-4" />
            <div className="flex-1 truncate">
              <div>Response &amp; Citations</div>
              <div
                className={`text-[10px] truncate ${
                  activeTab === 'presentation' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Formulas, pills &amp; syntax
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('automation')}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition cursor-pointer whitespace-nowrap text-left ${
              activeTab === 'automation'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Zap className="h-4 w-4" />
            <div className="flex-1 truncate">
              <div>Automation &amp; Storage</div>
              <div
                className={`text-[10px] truncate ${
                  activeTab === 'automation' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Auto-save, alerts, cache
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition cursor-pointer whitespace-nowrap text-left ${
              activeTab === 'account'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <User className="h-4 w-4" />
            <div className="flex-1 truncate">
              <div>Account &amp; Security</div>
              <div
                className={`text-[10px] truncate ${
                  activeTab === 'account' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Profile, password, session
              </div>
            </div>
          </button>
        </div>

        {/* Content Pane */}
        <div className="glass-panel flex-1 flex flex-col rounded-2xl p-5 sm:p-7 overflow-y-auto shadow-md dark:shadow-2xl min-h-0 space-y-6">
          {activeTab === 'appearance' && (
            <AppearanceTab
              theme={theme}
              systemTheme={systemTheme}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
              handleThemeChange={handleThemeChange}
              toast={toast}
            />
          )}

          {activeTab === 'reasoning' && (
            <ReasoningTab
              defaultMode={defaultMode}
              setDefaultMode={setDefaultMode}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              temperature={temperature}
              setTemperature={setTemperature}
              maxTokens={maxTokens}
              setMaxTokens={setMaxTokens}
              handleSaveSettings={handleSaveSettings}
              toast={toast}
            />
          )}

          {activeTab === 'presentation' && (
            <PresentationTab
              responseStyle={responseStyle}
              setResponseStyle={setResponseStyle}
              citationDisplay={citationDisplay}
              setCitationDisplay={setCitationDisplay}
              latexRender={latexRender}
              setLatexRender={setLatexRender}
              streamResponse={streamResponse}
              setStreamResponse={setStreamResponse}
              handleSaveSettings={handleSaveSettings}
              toast={toast}
            />
          )}

          {activeTab === 'automation' && (
            <AutomationTab
              autoSave={autoSave}
              setAutoSave={setAutoSave}
              notifications={notifications}
              setNotifications={setNotifications}
              handleSaveSettings={handleSaveSettings}
              handleExportSettings={handleExportSettings}
              handleClearCache={handleClearCache}
              toast={toast}
            />
          )}

          {activeTab === 'account' && (
            <AccountTab
              user={user}
              fullName={fullName}
              setFullName={setFullName}
              currentPass={currentPass}
              setCurrentPass={setCurrentPass}
              newPass={newPass}
              setNewPass={setNewPass}
              busyProfile={busyProfile}
              busyPass={busyPass}
              deleteConfirmOpen={deleteConfirmOpen}
              setDeleteConfirmOpen={setDeleteConfirmOpen}
              busyDelete={busyDelete}
              handleUpdateProfile={handleUpdateProfile}
              handleChangePassword={handleChangePassword}
              handleDeleteAccount={handleDeleteAccount}
            />
          )}
        </div>
      </div>
    </div>
  );
}
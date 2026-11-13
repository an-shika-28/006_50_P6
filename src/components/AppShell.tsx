import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShieldCheck, TrainFront, X } from 'lucide-react';
import { api, getStoredToken, setStoredToken } from '../services/api';
import type { StaffUser } from '../types/metropulse';

interface AuthContextValue {
  user: StaffUser | null;
  loading: boolean;
  openLoginModal: (hintRole?: 'handler' | 'admin') => void;
  logout: () => void;
  loginWithCredentials: (username: string, passcode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [hintRole, setHintRole] = useState<'handler' | 'admin'>('handler');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => {
        if (res.authenticated && res.user) setUser(res.user);
        else setStoredToken(null);
      })
      .catch(() => setStoredToken(null))
      .finally(() => setLoading(false));
  }, []);

  const loginWithCredentials = async (username: string, passcode: string) => {
    const res = await api.login(username, passcode);
    setStoredToken(res.token);
    setUser(res.user);
    setModalOpen(false);
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const openLoginModal = (role: 'handler' | 'admin' = 'handler') => {
    setHintRole(role);
    setModalOpen(true);
  };

  return (
    <AuthContext.Provider value={{ user, loading, openLoginModal, logout, loginWithCredentials }}>
      {children}
      {modalOpen && (
        <StaffLoginModal
          defaultRole={hintRole}
          onClose={() => setModalOpen(false)}
          onSubmit={loginWithCredentials}
        />
      )}
    </AuthContext.Provider>
  );
}

function StaffLoginModal({
  defaultRole,
  onClose,
  onSubmit,
}: {
  defaultRole: 'handler' | 'admin';
  onClose: () => void;
  onSubmit: (u: string, p: string) => Promise<void>;
}) {
  const [username, setUsername] = useState(
    defaultRole === 'admin' ? 'admin@metropulse.edu' : 'handler@metropulse.edu'
  );
  const [passcode, setPasscode] = useState(
    defaultRole === 'admin' ? 'metro-admin-2026' : 'metro-ops-2026'
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectPreset = (role: 'handler' | 'admin') => {
    if (role === 'admin') {
      setUsername('admin@metropulse.edu');
      setPasscode('metro-admin-2026');
    } else {
      setUsername('handler@metropulse.edu');
      setPasscode('metro-ops-2026');
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(username, passcode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#231A12]/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-login-title"
    >
      <div className="w-full max-w-md bg-[#F8F4EC] border border-[#5B4632] rounded-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#3D2E20] text-[#F4D9A0] border-b border-[#5B4632]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#F4D9A0]" aria-hidden="true" />
            <h2 id="staff-login-title" className="font-display font-bold text-base tracking-tight">
              Staff & Operations Login
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close staff login dialog"
            className="p-1.5 text-[#F4D9A0]/80 hover:text-white rounded-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-[#6E6255] leading-relaxed">
            Sign in with a MetroPulse operational role to access the Handler Console, update report statuses, or manage Corridor Routing tables.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectPreset('handler')}
              className={`px-3 py-2 text-xs font-semibold border rounded-sm text-left transition-colors ${
                username.startsWith('handler')
                  ? 'bg-[#5B4632] text-[#F4D9A0] border-[#5B4632]'
                  : 'bg-[#EFE8DA] text-[#2D261F] border-[#D9CDBB] hover:border-[#5B4632]'
              }`}
            >
              Demo Handler Role
            </button>
            <button
              type="button"
              onClick={() => selectPreset('admin')}
              className={`px-3 py-2 text-xs font-semibold border rounded-sm text-left transition-colors ${
                username.startsWith('admin')
                  ? 'bg-[#5B4632] text-[#F4D9A0] border-[#5B4632]'
                  : 'bg-[#EFE8DA] text-[#2D261F] border-[#D9CDBB] hover:border-[#5B4632]'
              }`}
            >
              Demo Routing Admin
            </button>
          </div>

          <div>
            <label htmlFor="staff-username" className="block text-xs font-semibold text-[#2D261F] mb-1">
              Staff Identifier
            </label>
            <input
              id="staff-username"
              type="email"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D9CDBB] rounded-sm text-sm font-mono text-[#2D261F] focus:border-[#C8792C]"
            />
          </div>

          <div>
            <label htmlFor="staff-passcode" className="block text-xs font-semibold text-[#2D261F] mb-1">
              Passcode
            </label>
            <input
              id="staff-passcode"
              type="password"
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D9CDBB] rounded-sm text-sm font-mono text-[#2D261F] focus:border-[#C8792C]"
            />
          </div>

          {error && (
            <div role="alert" className="p-3 bg-[#C83D3D]/10 border border-[#C83D3D] text-xs text-[#9F2929] rounded-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5B4632] hover:bg-[#EFE8DA] rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold bg-[#C8792C] text-white hover:bg-[#B26821] disabled:opacity-60 rounded-sm transition-colors"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, openLoginModal, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  const handleCorridorsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/#corridors');
      setTimeout(() => {
        document.getElementById('corridors')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('corridors')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-[13px] xl:text-sm font-medium pb-1 border-b-2 transition-colors ${
      isActive
        ? 'text-[#F4D9A0] border-[#C8792C]'
        : 'text-[#F4D9A0]/80 border-transparent hover:text-[#F4D9A0] hover:border-[#F4D9A0]/40'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F4EC] text-[#2D261F]">
      {/* Strict 3-Zone Transit Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#3D2E20] border-b border-[#5B4632] text-[#F4D9A0]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 xl:gap-8">
          {/* Zone 1: Brand Wordmark Only */}
          <Link
            to="/"
            className="font-display text-lg font-extrabold tracking-[0.14em] text-[#F4D9A0] whitespace-nowrap shrink-0"
          >
            METROPULSE
          </Link>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-4 xl:gap-6">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/report" className={navLinkClass}>
              Report Incident
            </NavLink>
            <NavLink to="/track" className={navLinkClass}>
              Track Report
            </NavLink>
            <a
              href="/#corridors"
              onClick={handleCorridorsClick}
              className="whitespace-nowrap shrink-0 text-[13px] xl:text-sm font-medium pb-1 border-b-2 border-transparent text-[#F4D9A0]/80 hover:text-[#F4D9A0] hover:border-[#F4D9A0]/40 transition-colors"
            >
              Corridors
            </a>
            <NavLink to="/handler" className={navLinkClass}>
              Operations
            </NavLink>
            <NavLink to="/routing" className={navLinkClass}>
              Routing
            </NavLink>
            <NavLink to="/analytics" className={navLinkClass}>
              Analytics
            </NavLink>
            <NavLink to="/validation" className={navLinkClass}>
              Automata Lab
            </NavLink>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-xs font-medium text-[#F4D9A0]/90 whitespace-nowrap">
                  {user.role === 'admin' ? 'Routing Admin' : 'Handler'}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#5B4632] text-[#F4D9A0] hover:bg-[#6E563F] border border-[#F4D9A0]/25 rounded-sm whitespace-nowrap shrink-0 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openLoginModal('handler')}
                className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold bg-[#C8792C] text-white hover:bg-[#B26821] rounded-sm whitespace-nowrap shrink-0 transition-colors"
              >
                Staff Login
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              className="lg:hidden p-2 text-[#F4D9A0] hover:bg-[#5B4632] rounded-sm"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <nav
            aria-label="Mobile Navigation"
            className="lg:hidden bg-[#2D2217] border-t border-[#5B4632] px-4 py-4 space-y-2"
          >
            {[
              { to: '/', label: 'Home' },
              { to: '/report', label: 'Report Incident' },
              { to: '/track', label: 'Track Report' },
              { to: '/handler', label: 'Operations (Handler)' },
              { to: '/routing', label: 'Routing Management' },
              { to: '/analytics', label: 'Analytics' },
              { to: '/validation', label: 'Automata Lab & Tests' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="block px-3 py-2.5 text-sm font-medium text-[#F4D9A0] hover:bg-[#5B4632]/60 rounded-sm"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#5B4632]">
              {user ? (
                <button
                  type="button"
                  onClick={logout}
                  className="w-full px-3 py-2 text-left text-sm font-semibold text-[#F4D9A0] bg-[#5B4632] rounded-sm"
                >
                  Sign Out ({user.role})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openLoginModal('handler')}
                  className="w-full px-3 py-2.5 text-center text-sm font-semibold bg-[#C8792C] text-white rounded-sm"
                >
                  Staff Login
                </button>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Architectural Mocha Brown Footer */}
      <footer className="bg-[#2D2217] text-[#F4D9A0]/85 border-t border-[#5B4632]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#F4D9A0]">
              <TrainFront className="w-5 h-5 text-[#C8792C]" aria-hidden="true" />
              <span className="font-display font-extrabold tracking-[0.14em] text-base">METROPULSE</span>
            </div>
            <p className="text-xs text-[#F4D9A0]/70 leading-relaxed max-w-sm">
              Centralized Metro Station Anomaly Reporting, Automata Validation, Corridor Routing, and Operations Management Platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="font-semibold text-[#F4D9A0]">Passenger Services</div>
              <ul className="space-y-1.5 text-[#F4D9A0]/75">
                <li><Link to="/report" className="hover:text-[#F4D9A0]">Report an Incident</Link></li>
                <li><Link to="/track" className="hover:text-[#F4D9A0]">Track Report Status</Link></li>
                <li><Link to="/validation" className="hover:text-[#F4D9A0]">DFA &amp; Regex Lab</Link></li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-[#F4D9A0]">Operations Control</div>
              <ul className="space-y-1.5 text-[#F4D9A0]/75">
                <li><Link to="/handler" className="hover:text-[#F4D9A0]">Handler Console</Link></li>
                <li><Link to="/routing" className="hover:text-[#F4D9A0]">Routing Management</Link></li>
                <li><Link to="/analytics" className="hover:text-[#F4D9A0]">Operations Analytics</Link></li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-[#231A12] border border-[#5B4632] rounded-sm text-xs space-y-2">
            <div className="font-semibold text-[#F4D9A0]">Academic Prototype Notice</div>
            <p className="text-[#F4D9A0]/75 leading-relaxed">
              MetroPulse is an academic prototype for metro anomaly reporting and operations management. It is not connected to real metro emergency dispatch systems.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

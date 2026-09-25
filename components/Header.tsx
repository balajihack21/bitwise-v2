import React, { useEffect, useState } from 'react';
import { ViewState, User, UserProgress } from '../types';

interface HeaderProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  user: User | null;
  progress: UserProgress;
  onLogout: () => void;
  onLoginClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  setView,
  user,
  progress,
  onLogout,
  onLoginClick
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  const enterStudentFullscreen = async () => {
    setFullscreenError(null);
    if (document.fullscreenElement) return;
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        setFullscreenError('Fullscreen is not supported by this browser.');
      }
    } catch {
      setFullscreenError('Fullscreen could not be enabled. Allow fullscreen in your browser and try again.');
    }
  };

  // Filter Nav items based on role
  const navItems = [
    { label: 'Home', view: ViewState.HOME, icon: 'fa-house' },
    { label: 'Courses & Problems', view: ViewState.COURSES, icon: 'fa-book-open' },
    { label: 'Playground', view: ViewState.PLAYGROUND, icon: 'fa-code' },
    { label: 'My Progress', view: ViewState.PROGRESS, icon: 'fa-chart-pie' },
    { label: 'Practice Problems', view: ViewState.PRACTICE, icon: 'fa-dumbbell' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin Dashboard', view: ViewState.ADMIN, icon: 'fa-gear' });
  } else if (user?.role === 'instructor') {
    navItems.push({ label: 'Instructor Dashboard', view: ViewState.INSTRUCTOR, icon: 'fa-chalkboard-user' });
  }

  const completedCount = progress.completedLessonIds.length;

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 border-b border-slate-200/90 shadow-2xs">
        <div className="container mx-auto px-3 sm:px-4 min-h-16 py-2 flex items-center justify-between gap-2">
          {/* Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none group" 
            onClick={() => setView(ViewState.HOME)}
            id="brand-logo-btn"
          >
            <div className="w-9 h-9 bg-slate-900 group-hover:bg-bitwise-700 rounded-xl flex items-center justify-center text-white font-mono font-bold text-sm shadow-sm transition-colors">
              <span>{`</>`}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-slate-950 tracking-tight block leading-tight">
                  Bitwise
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">.hub</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono font-semibold uppercase tracking-wider block">
                Engineering Sandbox
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5">
            {navItems.map((item) => {
              const isProtected = item.view !== ViewState.HOME;
              const isLocked = isProtected && !user;
              const isActive = currentView === item.view;

              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (isLocked) {
                      onLoginClick();
                    } else {
                      setView(item.view);
                    }
                  }}
                  className={`text-xs font-semibold transition-all px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'text-bitwise-700 bg-bitwise-50/90 font-bold border border-bitwise-200/60'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70'
                  }`}
                  title={isLocked ? `Login required to access ${item.label}` : item.label}
                >
                  <i className={`fa-solid ${item.icon} text-xs ${isActive ? 'text-bitwise-600' : 'text-slate-400'}`}></i>
                  <span>{item.label}</span>
                  {isLocked && <i className="fa-solid fa-lock text-[10px] text-amber-500/80 ml-0.5"></i>}
                </button>
              );
            })}

            {/* XP & Streak Widget (Only available for logged-in students/admins) */}
            {user && (
              <div 
                onClick={() => setView(ViewState.PROGRESS)}
                className="flex items-center gap-2 px-2.5 py-1 bg-slate-100/90 hover:bg-slate-200/70 rounded-lg cursor-pointer transition-colors border border-slate-200/80 text-xs font-mono"
                title="View your learning progress & statistics"
              >
                <div className="flex items-center gap-1 text-bitwise-700 font-semibold">
                  <i className="fa-solid fa-bolt text-[10px]"></i>
                  <span>{progress.xp || 0} XP</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1 text-amber-700 font-semibold">
                  <i className="fa-solid fa-fire text-[10px]"></i>
                  <span>{progress.streakDays || 1}d</span>
                </div>
              </div>
            )}

            {user?.role === 'student' && (
              <button
                type="button"
                onClick={enterStudentFullscreen}
                disabled={isFullscreen}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5"
                title={isFullscreen ? 'Fullscreen is active' : 'Enter fullscreen to hide browser controls'}
                aria-label={isFullscreen ? 'Fullscreen is active' : 'Enter fullscreen'}
              >
                <i className={`fa-solid ${isFullscreen ? 'fa-lock' : 'fa-expand'}`}></i>
                <span>{isFullscreen ? 'Fullscreen active' : 'Enter full screen'}</span>
              </button>
            )}
            
            <div className="pl-3 border-l border-slate-200 flex items-center gap-2.5">
              {user ? (
                <div className="flex items-center gap-2.5">
                  {/* User Profile Badge */}
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                      user.role === 'admin' 
                        ? 'bg-amber-600 text-white' 
                        : user.role === 'instructor'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-white'
                    }`}>
                      {user.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900 leading-tight max-w-[100px] truncate">
                        {user.username}
                      </div>
                      <div className="text-[9px] font-mono uppercase font-semibold text-slate-500 flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-amber-500' 
                            : user.role === 'instructor'
                            ? 'bg-blue-500'
                            : 'bg-emerald-500'
                        }`}></span>
                        {user.role}
                      </div>
                    </div>
                  </div>

                  {/* PROPER, HIGH-VISIBILITY LOGOUT BUTTON */}
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                    title={`Log out from @${user.username}`}
                    id="header-logout-button"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket text-[11px]"></i>
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onLoginClick}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Log In
                  </button>
                </div>
              )}
              {/* No Pro or Upgrade buttons */}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-slate-700 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white shadow-xl animate-in slide-in-from-top-2">
            <div className="flex flex-col p-4 space-y-2">
              {/* Mobile User & Stats Summary */}
              {user && (
                <div className="p-3 bg-slate-50 rounded-xl mb-2 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white ${
                        user.role === 'admin' 
                          ? 'bg-amber-600' 
                          : user.role === 'instructor'
                          ? 'bg-blue-600'
                          : 'bg-slate-900'
                      }`}>
                        {user.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{user.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase">{user.role} Account</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-bitwise-700 font-semibold">{progress.xp} XP</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-amber-700 font-semibold">{progress.streakDays}d</span>
                    </div>
                  </div>
                  {user.role === 'student' && (
                    <button
                      type="button"
                      onClick={enterStudentFullscreen}
                      disabled={isFullscreen}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <i className={`fa-solid ${isFullscreen ? 'fa-lock' : 'fa-expand'}`}></i>
                      {isFullscreen ? 'Fullscreen active' : 'Enter fullscreen'}
                    </button>
                  )}
                </div>
              )}

              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setView(item.view);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-left text-sm font-semibold p-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
                    currentView === item.view 
                      ? 'text-bitwise-700 bg-bitwise-50 font-bold' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} w-5 text-slate-400`}></i>
                  {item.label}
                </button>
              ))}

              <div className="pt-3 border-t border-slate-200 space-y-2">
                {user ? (
                  /* Mobile Proper Logout Button */
                  <button 
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-xs transition-colors cursor-pointer"
                    id="mobile-logout-button"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    <span>Log Out ({user.username})</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { onLoginClick(); setMobileMenuOpen(false); }}
                    className="w-full text-center px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold mb-2 cursor-pointer"
                  >
                    Log In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {fullscreenError && user?.role === 'student' && (
        <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 shadow-lg">
          {fullscreenError}
        </div>
      )}

      {user?.role === 'student' && !isFullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fullscreen-required-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bitwise-50 text-bitwise-700 text-xl">
              <i className="fa-solid fa-expand"></i>
            </div>
            <h2 id="fullscreen-required-title" className="text-lg font-bold text-slate-900">
              Fullscreen is required
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Enter fullscreen to continue using the student dashboard. If you exit fullscreen, this screen will appear until you enter it again.
            </p>
            {fullscreenError && (
              <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {fullscreenError}
              </p>
            )}
            <button
              type="button"
              onClick={enterStudentFullscreen}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-bitwise-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-bitwise-700"
            >
              <i className="fa-solid fa-expand"></i>
              Enter fullscreen to continue
            </button>
            <p className="mt-3 text-[11px] text-slate-400">
              Your browser may always allow you to exit fullscreen.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PROPER LOGOUT CONFIRMATION                              */}
      {/* ============================================================== */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg mb-4">
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              Sign out of Bitwise Hub?
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Are you sure you want to log out as <span className="font-semibold text-slate-900">{user?.username}</span>? Your progress, solved problems, and submissions are securely stored in the cloud.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                id="modal-confirm-logout-btn"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-[11px]"></i>
                <span>Yes, Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;

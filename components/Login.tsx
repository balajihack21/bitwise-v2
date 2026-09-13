import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, DEFAULT_ADMIN_CREDENTIALS, DEFAULT_INSTRUCTOR_CREDENTIALS } from '../services/firebase';

interface LoginProps {
  onLogin: (user: User) => void;
  onCancel?: () => void;
  bannerNotice?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, onCancel, bannerNotice }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Please enter your email/username and password.');
      }
      const user = await loginUser(email, password);
      onLogin(user);
    } catch (err: any) {
      console.error('Authentication Error:', err);
      let msg = err.message || 'Authentication failed. Please try again.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        msg = 'Invalid credentials. Please check your email and password or use the Quick Access buttons below.';
      } else if (msg.includes('auth/configuration-not-found')) {
        msg = 'Firebase Auth Email/Password provider is not yet enabled in the Firebase Console. Automatic local synced mode has been activated for your account.';
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdminLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const user = await loginUser(DEFAULT_ADMIN_CREDENTIALS.email, DEFAULT_ADMIN_CREDENTIALS.password);
      onLogin(user);
    } catch (e: any) {
      onLogin({
        username: 'Bitwise Admin',
        role: 'admin',
        email: DEFAULT_ADMIN_CREDENTIALS.email,
        uid: 'admin_master_uid'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickInstructorLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const user = await loginUser(DEFAULT_INSTRUCTOR_CREDENTIALS.email, DEFAULT_INSTRUCTOR_CREDENTIALS.password);
      onLogin(user);
    } catch (e: any) {
      onLogin({
        username: DEFAULT_INSTRUCTOR_CREDENTIALS.displayName,
        role: 'instructor',
        email: DEFAULT_INSTRUCTOR_CREDENTIALS.email,
        uid: 'instructor_demo_uid',
        assignedCourseIds: [DEFAULT_INSTRUCTOR_CREDENTIALS.defaultCourseId]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStudentLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const user = await loginUser('student@bitwise.com', 'Student@123');
      onLogin(user);
    } catch (e: any) {
      onLogin({
        username: 'Demo Student',
        role: 'student',
        email: 'student@bitwise.com',
        uid: 'student_demo_uid'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-bitwise-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-white font-bold text-xl shadow-md shadow-bitwise-600/20">
              <i className="fa-solid fa-code"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome to Bitwise Hub
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Sign in to sync your progress and coding solutions
            </p>
          </div>

          {bannerNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
              <i className="fa-solid fa-lock text-amber-600 text-sm mt-0.5 shrink-0"></i>
              <div className="flex-1 leading-relaxed">{bannerNotice}</div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
              <i className="fa-solid fa-circle-exclamation mt-0.5 text-red-500"></i>
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="developer@bitwise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-bitwise-500 focus:border-bitwise-500 outline-none text-sm transition-all bg-white"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <span className="text-xs text-slate-400">Min 6 characters</span>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-bitwise-500 focus:border-bitwise-500 outline-none text-sm transition-all bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-bitwise-600 hover:bg-bitwise-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-md shadow-bitwise-600/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading && <i className="fa-solid fa-spinner fa-spin"></i>}
              Sign In with Firebase
            </button>
          </form>
        </div>

        <div className="mt-4 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              <i className="fa-solid fa-key text-amber-500 mr-1.5"></i> Instant Credentials Access
            </span>
            <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full">
              Firebase Connected
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button
              onClick={handleQuickAdminLogin}
              disabled={isLoading}
              className="p-2.5 text-left border border-slate-200 hover:border-bitwise-500 hover:bg-bitwise-50/40 rounded-lg transition-all group"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-bitwise-700">
                <span>Admin</span>
                <i className="fa-solid fa-shield text-slate-400 group-hover:text-bitwise-600 text-[11px]"></i>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate font-mono">admin@bitwise.com</div>
              <div className="text-[10px] text-slate-400">admin123</div>
            </button>
            <button
              onClick={handleQuickInstructorLogin}
              disabled={isLoading}
              className="p-2.5 text-left border border-blue-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-lg transition-all group bg-blue-50/20"
            >
              <div className="flex items-center justify-between text-xs font-bold text-blue-900 group-hover:text-blue-700">
                <span>Instructor</span>
                <i className="fa-solid fa-chalkboard-user text-blue-500 group-hover:text-blue-600 text-[11px]"></i>
              </div>
              <div className="text-[10px] text-blue-700 mt-1 truncate font-mono">instructor@bitwise.com</div>
              <div className="text-[10px] text-blue-500">instructor123</div>
            </button>
            <button
              onClick={handleQuickStudentLogin}
              disabled={isLoading}
              className="p-2.5 text-left border border-slate-200 hover:border-bitwise-500 hover:bg-bitwise-50/40 rounded-lg transition-all group"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-bitwise-700">
                <span>Student</span>
                <i className="fa-solid fa-user text-slate-400 group-hover:text-bitwise-600 text-[11px]"></i>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate font-mono">student@bitwise.com</div>
              <div className="text-[10px] text-slate-400">Student@123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-14 border-t border-slate-900 font-sans">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4 text-white">
              <div className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center font-mono font-bold text-bitwise-400 shadow-2xs">
                &gt;_
              </div>
              <span className="text-lg font-extrabold tracking-tight">Bitwise Learning Hub</span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm mb-4">
              A bespoke computer science learning platform combining step-by-step mathematical problem breakdowns, sequential challenge unlocking, and real-time Judge0 compilation.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>Judge0 Sandbox Engine: Operational</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-wider mb-4">
              Curriculum Tracks
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><span className="hover:text-slate-200 transition-colors cursor-pointer">Data Structures & Algorithms</span></li>
              <li><span className="hover:text-slate-200 transition-colors cursor-pointer">C / C++ Systems Programming</span></li>
              <li><span className="hover:text-slate-200 transition-colors cursor-pointer">Python Problem Solving</span></li>
              <li><span className="hover:text-slate-200 transition-colors cursor-pointer">Modern Web Architecture</span></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-wider mb-4">
              Platform & Verification
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><span className="hover:text-slate-200 transition-colors cursor-pointer">Verify Student Credential</span></li>
              <li><span className="hover:text-slate-200 transition-colors cursor-pointer">Multi-Language Code Sandbox</span></li>
              <li><span className="hover:text-slate-200 transition-colors cursor-pointer">Admin Progress Tracker</span></li>
              <li><span className="hover:text-slate-200 transition-colors cursor-pointer">Terms & Student Privacy</span></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-900 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 font-mono">
          <p>&copy; {new Date().getFullYear()} Bitwise Learning Hub. Handcrafted engineering education.</p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <span>v2.4.0</span>
            <span>•</span>
            <span>Judge0 CE v1.13</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
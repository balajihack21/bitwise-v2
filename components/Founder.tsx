import React from 'react';

const Founder: React.FC = () => {
  return (
    <div className="py-16 bg-white border-b border-slate-200/80">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-8 md:p-12 shadow-2xs">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            
            {/* Instructor Portrait & Badges */}
            <div className="w-full lg:w-5/12 flex flex-col items-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden border border-slate-300/80 shadow-card bg-slate-900">
                <img 
                  src="https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                  alt="Balaji Arumugam" 
                  className="w-full h-full object-cover grayscale-[25%] hover:grayscale-0 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex flex-col justify-end p-5">
                  <span className="text-white font-bold text-lg leading-tight">Balaji Arumugam</span>
                  <span className="text-slate-300 text-xs font-mono">Founder & Lead Instructor</span>
                </div>
              </div>

              {/* Verified Experience Pill */}
              <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-mono shadow-2xs">
                <i className="fa-solid fa-code text-bitwise-600"></i>
                <span className="font-bold text-slate-800">4+ Years Active Mentorship</span>
              </div>
            </div>

            {/* Instructor Editorial Bio */}
            <div className="w-full lg:w-7/12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider mb-4 shadow-2xs">
                <i className="fa-solid fa-laptop-code text-bitwise-600"></i>
                Software Engineer
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mb-4">
                Hands-on Engineering Grounded in Mathematics.
              </h2>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                Former engineer at <strong className="text-slate-900">HCL</strong> and <strong className="text-slate-900">Freshworks</strong>, Balaji established Bitwise Learning Hub to replace passive tutorial marathons with authentic, test-driven coding sandboxes.
              </p>

              {/* Previous Companies */}
              <div className="mb-6">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Engineering Background
                </span>
                <div className="flex flex-wrap gap-2">
                  {['HCL Technologies', 'Freshworks'].map((company) => (
                    <div 
                      key={company} 
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs font-semibold flex items-center gap-2 shadow-2xs"
                    >
                      <i className="fa-solid fa-building text-slate-400 text-[11px]"></i>
                      <span>Ex-{company}</span>
                    </div>
                  ))}
                  <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs font-semibold flex items-center gap-2 shadow-2xs">
                    <i className="fa-solid fa-graduation-cap text-slate-400 text-[11px]"></i>
                    <span>100+ 1-on-1 Code Reviews</span>
                  </div>
                </div>
              </div>

              {/* Roles & Expertise */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-5">
                {[
                  { icon: 'fa-chalkboard-user', label: 'Tech Trainer', desc: 'DSA, C/C++ & Systems Mentorship' },
                  { icon: 'fa-layer-group', label: 'Full Stack Developer', desc: 'Modern reactive web & cloud backends' },
                  { icon: 'fa-laptop-code', label: 'Software Engineer', desc: 'High-performance algorithms & logic' },
                  { icon: 'fa-network-wired', label: 'Architect', desc: 'System design & scalable architecture' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-slate-100 text-bitwise-700 flex items-center justify-center text-[11px] shrink-0">
                        <i className={`fa-solid ${item.icon}`}></i>
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1.5 leading-snug">{item.desc}</div>
                  </div>
                ))}
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Founder;
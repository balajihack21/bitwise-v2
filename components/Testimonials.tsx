import React, { useState, useEffect, useRef } from 'react';

interface FeedbackItem {
  id: string;
  name: string;
  role: string;
  category: 'dsa' | 'c_cpp' | 'web';
  message: string;
  highlight: string;
  verifiedCourse: string;
  time: string;
}

const FEEDBACK_LIST: FeedbackItem[] = [
  {
    id: 'f1',
    name: 'Kathir',
    role: 'Student',
    category: 'dsa',
    highlight: 'Compared algorithmic concepts to math — problem breakdown step-by-step',
    message: 'Hi Balaji, The DSA trial session was fantastic! I really appreciated how you explained the concepts, especially the way you compared them to math—it was truly impressive. I also loved your technique of walking us through the problem step by step before diving into the code.',
    verifiedCourse: 'DSA Intensive Track',
    time: '11:42 AM'
  },
  {
    id: 'f2',
    name: 'Ajithkumar',
    role: 'Technical Trainer & Student',
    category: 'c_cpp',
    highlight: 'Explains C language structures, pointers, and memory layout in depth',
    message: 'Let me tell about Mr.Balaji, from what I have seen, Balaji is a very good coach, i.e. he explains each and every topic in depth. For example C language structures, pointers, C++ and Javascript etc. I am a coach of CSC company but discussed my many doubts with Balaji. Thx to Balaji.',
    verifiedCourse: 'C / C++ Systems Masterclass',
    time: '04:15 PM'
  },
  {
    id: 'f3',
    name: 'Arun G',
    role: 'Student',
    category: 'dsa',
    highlight: 'Demo sessions made me highly interested in learning DSA and math modeling',
    message: 'First of all, I would like to say thank you very much to Bitwise. The DSA demo sessions were very impressive, and I became highly interested in learning DSA. Your explanation of mathematical concepts is excellent.',
    verifiedCourse: 'DSA Foundations',
    time: '07:30 PM'
  },
  {
    id: 'f4',
    name: 'Parkavi',
    role: 'B1 Student',
    category: 'c_cpp',
    highlight: 'Noticeable difference in coding efficiency and running test suites',
    message: 'Your explanations are easy to understand, and I am now clear on the topics you taught me. I notice a difference in my coding; you taught me to write code more efficiently. I have also learned to compile and run code properly!',
    verifiedCourse: 'Problem Solving in C',
    time: '02:08 PM'
  },
  {
    id: 'f5',
    name: 'Dinesh K.',
    role: 'Web Dev Batch',
    category: 'web',
    highlight: 'Foundational history of the internet and web architecture',
    message: "Today's session was fantastic. I learned a lot, especially about the evolution of the internet and frontend-backend communication, which was mind-blowing and something I wasn't aware of before. Looking forward to more classes.",
    verifiedCourse: 'Modern Full-Stack Engineering',
    time: '09:12 PM'
  },
  {
    id: 'f6',
    name: 'Praveen R.',
    role: 'Engineering Student',
    category: 'web',
    highlight: 'Clear mental model of client-server systems and browser rendering',
    message: 'It was a very clear session. I learned how protocols connect and had a clear view about client vs backend execution. The hands-on practice makes it stick.',
    verifiedCourse: 'Web Architecture Batch',
    time: '06:45 PM'
  }
];

const Testimonials: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'dsa' | 'c_cpp' | 'web'>('all');

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(error => {
        console.warn("Autoplay notice:", error);
      });
    }
  }, []);

  const filtered = activeCategory === 'all' 
    ? FEEDBACK_LIST 
    : FEEDBACK_LIST.filter(item => item.category === activeCategory);

  return (
    <div className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-mono font-semibold uppercase tracking-wider mb-3 shadow-2xs">
            <i className="fa-solid fa-comments text-bitwise-600"></i>
            Student Experience
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mb-3">
            Real Reviews from Live Mentorship.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Direct feedback from students, working engineers, and technical trainers who have experienced the Bitwise hands-on curriculum.
          </p>
        </div>

        {/* Video: Live Session Inside Look */}
        <div className="mb-16">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-elevated overflow-hidden max-w-4xl mx-auto">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span className="text-slate-200 font-semibold font-sans">Live Classroom Recording</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 hidden sm:inline-block">DSA Tree Traversal & Memory Layouts</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                1080p HD
              </span>
            </div>

            <div className="relative aspect-video w-full bg-slate-950">
              <video 
                ref={videoRef}
                autoPlay 
                muted 
                loop 
                playsInline
                controls
                className="w-full h-full object-cover"
                poster="https://images.unsplash.com/photo-1544531586-fde5298cdd40?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80"
              >
                <source src="classroom_session.mp4" type="video/mp4" />
                <source src="https://assets.mixkit.co/videos/preview/mixkit-group-of-students-working-on-a-coding-project-43690-large.mp4" type="video/mp4" />
                Your browser does not support HTML5 video.
              </video>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: 'all', label: 'All Reviews' },
            { id: 'dsa', label: 'Data Structures & Algorithms' },
            { id: 'c_cpp', label: 'C / C++ Systems' },
            { id: 'web', label: 'Web Architecture' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feedback Grid (Refined, authentic editorial design) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div 
              key={item.id} 
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-card transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-xs flex items-center justify-center border border-slate-200">
                      {item.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-950 leading-tight">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{item.role}</div>
                    </div>
                  </div>
                  
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold shrink-0">
                    <i className="fa-brands fa-whatsapp mr-1 text-emerald-600"></i> Verified
                  </span>
                </div>

                {/* Key Takeaway Pill */}
                <div className="text-[11px] font-semibold text-bitwise-800 bg-bitwise-50/70 p-2 rounded-lg mb-3 border border-bitwise-100 leading-snug">
                  "{item.highlight}"
                </div>

                {/* Message Body */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.message}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{item.verifiedCourse}</span>
                <span>{item.time}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Testimonials;
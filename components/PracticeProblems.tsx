import React, { useMemo, useState } from 'react';
import { Course, Lesson, StudentProfile, User, UserProgress } from '../types';
import ProblemWorkspace from './ProblemWorkspace';
import { fetchAllSubmissionsFromFirestore, fetchStudentProfiles } from '../services/firebase';

interface PracticeProblemsProps {
  courses: Course[];
  user: User;
  progress: UserProgress;
  onProgressUpdate: (progress: UserProgress) => void;
}

const PracticeProblems: React.FC<PracticeProblemsProps> = ({ courses, user, progress, onProgressUpdate }) => {
  const assignedCourses = courses.filter(course => user.role !== 'student' || user.assignedCourseIds?.includes(course.id));
  const [courseId, setCourseId] = useState(assignedCourses[0]?.id || '');
  const [topic, setTopic] = useState('ALL');
  const [completionStatus, setCompletionStatus] = useState<'ALL' | 'SOLVED' | 'UNSOLVED'>('ALL');
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const course = assignedCourses.find(item => item.id === courseId) || assignedCourses[0];
  const practiceProblems = course?.practiceProblems || [];
  const topics = useMemo(() => Array.from(new Set(practiceProblems.map(problem => problem.topic))).sort(), [practiceProblems]);
  const solvedProblemIds = useMemo(
    () => new Set(
      progress.submissions
        .filter(submission => submission.status === 'ACCEPTED' && submission.isPractice)
        .map(submission => submission.problemId)
    ),
    [progress.submissions]
  );
  const visibleProblems = practiceProblems.filter(problem => {
    const matchesTopic = topic === 'ALL' || problem.topic === topic;
    const solved = solvedProblemIds.has(problem.id);
    const matchesStatus = completionStatus === 'ALL'
      || (completionStatus === 'SOLVED' && solved)
      || (completionStatus === 'UNSOLVED' && !solved);
    return matchesTopic && matchesStatus;
  });

  React.useEffect(() => {
    let cancelled = false;
    setLeaderboardLoading(true);
    Promise.all([fetchAllSubmissionsFromFirestore(500), fetchStudentProfiles()])
      .then(([submissions, profiles]) => {
        if (!cancelled) {
          setAllSubmissions(submissions);
          setStudentProfiles(profiles);
        }
      })
      .catch(error => {
        console.warn('Failed to load practice leaderboard:', error);
      })
      .finally(() => {
        if (!cancelled) setLeaderboardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const leaderboard = useMemo(() => {
    if (!course) return [];
    const problemMap = new Map(practiceProblems.map(problem => [
      problem.id,
      { points: problem.problem?.points || 0, title: problem.title }
    ]));
    const submissions = [
      ...allSubmissions.filter(submission => submission.isPractice && submission.courseId === course.id),
      ...progress.submissions.filter(submission => submission.isPractice && submission.courseId === course.id)
    ];
    const acceptedByUser = new Map<string, Map<string, { points: number; title: string }>>();

    const profileByIdentity = new Map<string, StudentProfile>();
    studentProfiles.forEach(profile => {
      [profile.uid, profile.displayName, profile.regNo].filter(Boolean).forEach(identity => {
        profileByIdentity.set(String(identity).trim().toLowerCase(), profile);
      });
    });
    if (user.role === 'student') {
      const currentProfile: StudentProfile = {
        uid: user.uid || user.username,
        displayName: user.username,
        dept: user.dept,
        section: user.section,
        regNo: user.regNo,
        role: 'student'
      };
      [currentProfile.uid, currentProfile.displayName, currentProfile.regNo].filter(Boolean).forEach(identity => {
        profileByIdentity.set(String(identity).trim().toLowerCase(), currentProfile);
      });
    }

    submissions.forEach(submission => {
      if (submission.status !== 'ACCEPTED' || !problemMap.has(submission.problemId)) return;
      const profile = profileByIdentity.get(String(submission.userId || submission.username || '').trim().toLowerCase())
        || (submission.userId === user.uid && user.role === 'student'
          ? { uid: user.uid || user.username, displayName: user.username, dept: user.dept, section: user.section, regNo: user.regNo, role: 'student' as const }
          : undefined);
      if (!profile) return;
      const userProblems = acceptedByUser.get(profile.uid) || new Map();
      if (!userProblems.has(submission.problemId)) {
        userProblems.set(submission.problemId, problemMap.get(submission.problemId)!);
      }
      acceptedByUser.set(profile.uid, userProblems);
    });

    return Array.from(acceptedByUser.entries())
      .map(([uid, solvedProblems]) => {
        const profile = studentProfiles.find(item => item.uid === uid)
          || (uid === user.uid && user.role === 'student'
            ? {
                uid,
                displayName: user.username,
                dept: user.dept,
                section: user.section,
                regNo: user.regNo,
                role: 'student' as const
              }
            : undefined);
        return {
        uid,
        profile,
        username: profile?.displayName || user.username,
        solved: solvedProblems.size,
        points: Array.from(solvedProblems.values()).reduce((total, problem) => total + problem.points, 0)
        };
      })
      .sort((first, second) => second.points - first.points || second.solved - first.solved || first.username.localeCompare(second.username))
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [allSubmissions, course, practiceProblems, progress.submissions, studentProfiles, user.dept, user.regNo, user.role, user.section, user.uid, user.username]);

  if (selected && course) {
    return (
      <div className="container mx-auto px-4 py-6 h-[86vh]">
        <button onClick={() => setSelected(null)} className="mb-3 text-xs font-bold text-slate-600 hover:text-bitwise-700">
          <i className="fa-solid fa-arrow-left mr-2"></i>Back to Practice Problems
        </button>
        <ProblemWorkspace
          lesson={selected}
          course={course}
          user={user}
          progress={progress}
          onProgressUpdate={onProgressUpdate}
          onNavigateToLesson={() => {}}
          onClose={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
          <i className="fa-solid fa-dumbbell"></i> Practice Problems
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Strengthen your topic skills</h1>
        <p className="text-sm text-slate-500 mt-1">Solve additional problems from your assigned courses. Practice submissions do not affect grades or internal marks.</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={course?.id || ''} onChange={event => { setCourseId(event.target.value); setTopic('ALL'); }} className="border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold">
          {assignedCourses.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <select value={topic} onChange={event => setTopic(event.target.value)} className="border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold">
          <option value="ALL">All topics</option>
          {topics.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <select
          value={completionStatus}
          onChange={event => setCompletionStatus(event.target.value as 'ALL' | 'SOLVED' | 'UNSOLVED')}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
        >
          <option value="ALL">All problems</option>
          <option value="SOLVED">Solved</option>
          <option value="UNSOLVED">Unsolved</option>
        </select>
      </div>
      <section className="mb-6 bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-trophy text-amber-500"></i> Practice Leaderboard
            </h2>
            <p className="text-xs text-slate-500 mt-1">Ranked by unique accepted practice problems and their points.</p>
          </div>
          {leaderboardLoading && <i className="fa-solid fa-spinner fa-spin text-amber-600"></i>}
        </div>
        {leaderboard.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {leaderboard.slice(0, 10).map(entry => (
              <div key={entry.uid} className={`px-5 py-3 flex items-center justify-between ${entry.uid === user.uid ? 'bg-sky-50/70' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                    entry.rank === 1 ? 'bg-amber-400 text-white' : entry.rank === 2 ? 'bg-slate-300 text-slate-700' : entry.rank === 3 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>{entry.rank}</span>
                  <div>
                    <span className="text-sm font-bold text-slate-800">{entry.username}{entry.uid === user.uid ? ' (You)' : ''}</span>
                    <span className="block text-[10px] text-slate-500">
                      {entry.profile?.dept || 'Department'} · {entry.profile?.section || 'Section'} · Reg: {entry.profile?.regNo || 'Not available'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-amber-700">{entry.points} pts</span>
                  <span className="block text-[10px] text-slate-500">{entry.solved} solved</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-6 text-center text-xs text-slate-500">
            {leaderboardLoading ? 'Loading practice rankings...' : 'Be the first to solve a practice problem!'}
          </div>
        )}
      </section>
      {visibleProblems.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-sm text-slate-500">
          No practice problems are available for this course and topic yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visibleProblems.map(problem => {
            const solved = progress.submissions.some(submission => submission.problemId === problem.id && submission.status === 'ACCEPTED' && submission.isPractice);
            return (
              <button key={problem.id} onClick={() => setSelected(problem)} className="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-sky-400 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-sky-700">{problem.topic}</span>
                    <h2 className="font-bold text-slate-900 mt-1">{problem.title}</h2>
                  </div>
                  {solved && <span className="text-emerald-600 text-xs font-bold"><i className="fa-solid fa-circle-check mr-1"></i>Solved</span>}
                </div>
                <div className="mt-4 text-xs text-slate-500">{problem.duration} · {problem.problem?.difficulty || 'Easy'} · Practice only</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PracticeProblems;

import React, { useState, useEffect, useMemo } from 'react';
import { Course, User, UserProgress, Lesson, InstructorAccount } from '../types';
import { getCourseProgress } from '../services/progressService';
import { fetchInstructorsList } from '../services/firebase';

interface ProgressDashboardProps {
  user: User | null;
  courses: Course[];
  progress: UserProgress;
  onSelectCourse: (course: Course, lesson?: Lesson) => void;
  onResetProgress?: () => void;
  onNavigateToCertificates: () => void;
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  user,
  courses,
  progress,
  onSelectCourse,
  onNavigateToCertificates
}) => {
  const [instructorMap, setInstructorMap] = useState<Record<string, string>>({});
  const [selectedCourseForUnits, setSelectedCourseForUnits] = useState<Course | null>(null);

  const visibleCourses = useMemo(() => {
    if (!user || user.role === 'student' && (!user.assignedCourseIds || user.assignedCourseIds.length === 0)) {
      return courses;
    }
    if (user.role === 'student' || user.role === 'instructor') {
      const assignedIds = new Set(user.assignedCourseIds || []);
      return assignedIds.size > 0 ? courses.filter(course => assignedIds.has(course.id)) : courses;
    }
    return courses;
  }, [courses, user]);

  useEffect(() => {
    let cancelled = false;
    fetchInstructorsList().then(list => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      list.forEach((inst: InstructorAccount) => {
        map[inst.uid] = inst.name || inst.email || inst.uid;
        if (inst.email) map[inst.email.toLowerCase().trim()] = inst.name || inst.email;
      });
      setInstructorMap(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const resolveInstructorName = (assignment: { instructorId?: string; instructorEmail?: string; courseId?: string }) => {
    const candidates = [
      assignment.instructorId,
      assignment.instructorEmail,
      assignment.instructorId?.trim().toLowerCase(),
      assignment.instructorEmail?.trim().toLowerCase(),
      (assignment.courseId ? courses.find(c => c.id === assignment.courseId)?.assignedInstructors?.[0]?.uid : undefined),
      (assignment.courseId ? courses.find(c => c.id === assignment.courseId)?.assignedInstructors?.[0]?.email : undefined),
      (assignment.courseId ? courses.find(c => c.id === assignment.courseId)?.assignedInstructors?.map(i => i.uid).join(',') : undefined)
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      const lowerCandidate = candidate.toLowerCase();
      const directMatch = instructorMap[candidate] || instructorMap[lowerCandidate];
      if (directMatch) return directMatch;
    }

    const courseInstructor = courses.find(c => c.id === assignment.courseId)?.assignedInstructors || [];
    const courseMatch = courseInstructor.find(inst =>
      inst.uid === assignment.instructorId || inst.email?.toLowerCase() === assignment.instructorEmail?.toLowerCase()
    );

    if (courseMatch?.name) return courseMatch.name;
    if (assignment.instructorEmail) return assignment.instructorEmail.split('@')[0];
    if (assignment.instructorId) return assignment.instructorId;
    return 'Unknown Instructor';
  };

  const studentInstructorNames = useMemo(() => {
    const resolved = new Set<string>();
    const courseIds = new Set(user?.assignedCourseIds || []);

    if (user?.courseInstructorAssignments?.length) {
      user.courseInstructorAssignments.forEach((assignment) => {
        const name = resolveInstructorName(assignment);
        if (name) resolved.add(name);
      });
    }

    courses.forEach(course => {
      if (courseIds.size > 0 && !courseIds.has(course.id)) return;
      (course.assignedInstructors || []).forEach(inst => {
        const name = inst.name || inst.email || 'Unknown Instructor';
        if (name) resolved.add(name);
      });
    });

    return Array.from(resolved);
  }, [courses, user]);
  // Aggregate stats
  let totalProblems = 0;
  let totalSolvedProblems = 0;
  let totalLessons = 0;
  let totalCompletedLessons = 0;

  visibleCourses.forEach(c => {
    const cp = getCourseProgress(c, progress);
    totalProblems += cp.totalProblems;
    totalSolvedProblems += cp.problemsSolved;
    totalLessons += cp.total;
    totalCompletedLessons += cp.completed;
  });

  const overallPercentage = totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;
  const acceptedSubmissionsCount = progress.submissions.filter(s => s.status === 'ACCEPTED').length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Learning & Problem Solving Progress</h1>
            <span className="px-3 py-1 bg-bitwise-50 text-bitwise-700 text-xs font-bold rounded-full border border-bitwise-200">
              {user ? user.username : 'Guest Learner'}
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            Track your coding challenges, Judge0 sandbox test case passes, and course completion milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToCertificates}
            className="px-4 py-2 text-xs font-bold text-bitwise-700 bg-bitwise-50 hover:bg-bitwise-100 rounded-xl transition-colors border border-bitwise-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <i className="fa-solid fa-award text-bitwise-600"></i> View Certificates
          </button>
        </div>
      </div>

      <div className="mb-6 bg-violet-50 border border-violet-200 rounded-2xl p-4 text-sm text-violet-900">
        <div className="flex items-center gap-2 font-bold mb-1">
          <i className="fa-solid fa-user-tie text-violet-700"></i>
          Assigned Instructor
        </div>
        <div className="flex flex-wrap gap-2">
          {studentInstructorNames.length > 0
            ? studentInstructorNames.map((name, index) => (
                <span key={`${name}-${index}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-violet-200 text-violet-700 font-semibold text-xs">
                  <i className="fa-solid fa-chalkboard-user text-[10px]"></i>
                  {name}
                </span>
              ))
            : <span className="text-violet-700/80">No instructor assigned yet.</span>}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Problems Solved */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Challenges Solved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-code"></i>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {totalSolvedProblems} <span className="text-sm font-normal text-slate-400">/ {totalProblems}</span>
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {totalProblems > 0 ? `${Math.round((totalSolvedProblems / totalProblems) * 100)}% completed` : '0%'}
          </p>
        </div>

        {/* Total XP Points */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Experience</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-bolt"></i>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {progress.xp || 0} <span className="text-sm font-normal text-slate-400">XP</span>
          </div>
          <p className="text-xs text-purple-600 font-semibold mt-1">
            Judge0 verified rewards
          </p>
        </div>

        {/* Daily Streak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Daily Streak</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-fire"></i>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {progress.streakDays || 1} <span className="text-sm font-normal text-slate-400">Days</span>
          </div>
          <p className="text-xs text-amber-600 font-semibold mt-1">
            Keep the momentum going!
          </p>
        </div>

        {/* Total Submissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Accepted Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-check-double"></i>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {acceptedSubmissionsCount} <span className="text-sm font-normal text-slate-400">/ {progress.submissions.length}</span>
          </div>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            Sandbox test accuracy
          </p>
        </div>

        {/* Proctoring Integrity & Tab Switches */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 lg:col-span-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0 border border-amber-200">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Proctoring & Focus Integrity Monitor
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (progress.tabSwitchCount || 0) === 0 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {(progress.tabSwitchCount || 0) === 0 ? 'Clean Record (100%)' : 'Violations Tracked'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time anti-cheat metrics recorded during pop-out coding challenges.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div className="text-center sm:text-right">
                <div className="text-slate-400 text-[11px] font-semibold">Tab Switches</div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {progress.tabSwitchCount || 0}
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-slate-400 text-[11px] font-semibold">Focus Losses</div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {progress.focusLossCount || 0}
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-slate-400 text-[11px] font-semibold">Exit Attempts</div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {progress.testExitAttempts || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Progress Cards */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-graduation-cap text-bitwise-600"></i> Course Progression Tracks
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleCourses.map(course => {
            const cp = getCourseProgress(course, progress);
            return (
              <div 
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-bitwise-600 bg-bitwise-50 px-2 py-0.5 rounded">
                        {course.level}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{course.title}</h3>
                    </div>
                    {cp.isComplete && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1 shrink-0">
                        <i className="fa-solid fa-award"></i> Completed
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 text-xs line-clamp-2 mb-4">
                    {course.description}
                  </p>

                  {/* Assigned Instructors */}
                  {user?.courseInstructorAssignments && user.courseInstructorAssignments.filter(a => a.courseId === course.id).length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instructor</span>
                      <div className="flex flex-wrap gap-1.5">
                        {user.courseInstructorAssignments
                          .filter(a => a.courseId === course.id)
                          .map((assignment) => {
                            const name = instructorMap[assignment.instructorId] || assignment.instructorId || 'Unknown';
                            return (
                              <span key={assignment.instructorId} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-full border border-violet-200">
                                <i className="fa-solid fa-user-tie text-[8px]"></i>
                                {name}
                              </span>
                            );
                          })
                        }
                      </div>
                    </div>
                  )}

                  {/* Progress Meter */}
                  <div className="space-y-1.5 mb-5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Progress: {cp.completed} / {cp.total} Lessons</span>
                      <span className="text-bitwise-600 font-bold">{cp.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-bitwise-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${cp.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Challenges: {cp.problemsSolved} / {cp.totalProblems} Solved</span>
                      <span>{cp.total - cp.completed} remaining</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onSelectCourse(course)}
                    className="px-4 py-2 bg-bitwise-600 hover:bg-bitwise-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {cp.percentage > 0 && !cp.isComplete ? 'Continue Learning' : 'Explore Challenges'} <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                    type="button"
                    onClick={() => setSelectedCourseForUnits(course)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1"
                  >
                    <i className="fa-solid fa-list-check"></i>
                    View Units
                  </button>
                  {cp.isComplete && (
                    <button
                      onClick={onNavigateToCertificates}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                    >
                      <i className="fa-solid fa-certificate"></i> View Certificate
                    </button>
                  )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {selectedCourseForUnits && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedCourseForUnits.title} units`}
          onClick={() => setSelectedCourseForUnits(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[82vh] overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-bitwise-600">Unit checklist</div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedCourseForUnits.title}</h2>
                <p className="text-xs text-slate-500 mt-1">Review lesson completion and creative challenge submissions.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourseForUnits(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white flex items-center justify-center"
                aria-label="Close unit checklist"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto max-h-[65vh]">
              {selectedCourseForUnits.modules.map(module => {
                const completedLessons = module.lessons.filter(lesson => progress.completedLessonIds.includes(lesson.id)).length;
                return (
                  <div key={module.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-sm font-bold text-slate-800">{module.title}</span>
                    <span className="shrink-0 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                      {completedLessons}/{module.lessons.length} completed
                    </span>
                  </div>
                  <div className="space-y-2">
                    {module.lessons.map(lesson => {
                      const completed = progress.completedLessonIds.includes(lesson.id);
                      const creative = progress.creativeSubmissions?.find(submission => submission.lessonId === lesson.id);
                      return (
                        <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                          <span className={`min-w-0 truncate ${completed ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                            {lesson.title}
                          </span>
                          <span className={`shrink-0 px-2 py-1 rounded font-bold ${
                            completed ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400 border border-slate-200'
                          }`}>
                            {creative ? `${creative.challengeType} submitted` : completed ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedCourseForUnits(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Algorithm, pseudo-code, and flowchart submissions */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-diagram-project text-cyan-600"></i> Creative Challenge Submissions
        </h2>
        {(!progress.creativeSubmissions || progress.creativeSubmissions.length === 0) ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            No algorithm, pseudo-code, or flowchart submissions recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {progress.creativeSubmissions.map(submission => (
              <div key={submission.id} className="bg-white rounded-2xl border border-cyan-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-cyan-50/60 border-b border-cyan-100 flex items-start justify-between gap-3">
                  <div>
                  <h3 className="text-sm font-bold text-slate-900">{submission.lessonTitle}</h3>
                  <p className="text-[10px] text-slate-500 uppercase mt-1">
                    {submission.challengeType} · {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  {submission.status} · {submission.points} pts
                  </span>
                </div>
                {submission.answerText ? (
                  <pre className="m-3 p-3 rounded-lg bg-slate-950 text-emerald-300 text-xs whitespace-pre-wrap font-mono overflow-x-auto">
                  {submission.answerText}
                  </pre>
                ) : (
                  <div className="p-3 space-y-1.5">
                  {(submission.flowNodes || []).map((node, index) => (
                    <div key={node.id || `${submission.id}-${index}`} className="flex items-start gap-2 text-xs">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">{index + 1}</span>
                      <span className="font-bold text-slate-600">{node.type}</span>
                      <span className="text-slate-800">{node.text || '(empty step)'}</span>
                    </div>
                  ))}
                  </div>
                )}
                {(submission.instructorScore !== undefined || submission.instructorFeedback) && (
                  <div className="mx-3 mb-3 rounded-lg bg-violet-50 border border-violet-200 p-3 text-xs text-violet-900">
                  <div className="font-bold">Instructor review: {submission.instructorScore ?? 'Pending'} points</div>
                  {submission.instructorFeedback && <div className="mt-1">{submission.instructorFeedback}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Submissions Log */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-bitwise-600"></i> Recent Judge0 Submissions Activity
        </h2>

        {progress.submissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            <i className="fa-solid fa-code text-3xl mb-3 opacity-30"></i>
            <p className="text-sm">No submissions recorded yet. Start solving problems in the courses to see real-time Judge0 sandbox results!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Status</th>
                    <th className="p-4">Problem</th>
                    <th className="p-4">Language</th>
                    <th className="p-4">Test Cases</th>
                    <th className="p-4">Time</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {progress.submissions.slice(0, 10).map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 w-fit ${
                          sub.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <i className={`fa-solid ${sub.status === 'ACCEPTED' ? 'fa-check' : 'fa-xmark'}`}></i>
                          {sub.status === 'ACCEPTED' ? 'Accepted' : 'Failed'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">{sub.problemTitle || sub.problemId}</td>
                      <td className="p-4 font-mono uppercase text-slate-600">{sub.language}</td>
                      <td className="p-4 text-slate-700">
                        {sub.passedTests} / {sub.totalTests} passed
                      </td>
                      <td className="p-4 font-mono text-slate-500">{sub.executionTime || '0.04s'}</td>
                      <td className="p-4 text-slate-400">{sub.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressDashboard;

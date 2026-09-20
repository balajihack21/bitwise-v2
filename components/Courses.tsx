import React, { useState, useEffect, useMemo } from 'react';
import { Course, Lesson, SupportedLanguage, User, UserProgress } from '../types';
import ProblemWorkspace from './ProblemWorkspace';
import CreativeChallengeWorkspace from './CreativeChallengeWorkspace';
import { translateContent } from '../services/geminiService';
import { 
  isLessonUnlocked, 
  getCourseProgress, 
  recordCompletion, 
  getNextLesson,
  isInstructorForCourse,
  completeAllCourseLessons,
  resetCourseProgress,
  getEffectiveModuleDeadline
} from '../services/progressService';

interface CoursesProps {
  courses: Course[];
  isPro: boolean;
  user: User | null;
  progress: UserProgress;
  onProgressUpdate: (updated: UserProgress) => void;
  onUpgrade: () => void;
  onSelectCourse?: (courseId: string) => void;
  onOpenPlayground?: (code: string, language: string) => void;
  initialCourseId?: string;
  initialLessonId?: string;
}

const Courses: React.FC<CoursesProps> = ({
  courses,
  isPro,
  user,
  progress,
  onProgressUpdate,
  onUpgrade,
  onSelectCourse,
  onOpenPlayground,
  initialCourseId,
  initialLessonId
}) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(() => {
    if (initialCourseId) {
      return courses.find(c => c.id === initialCourseId) || null;
    }
    return null;
  });

  // Check if current logged-in user is an Instructor assigned to this course
  const isInstructorAssigned = useMemo(() => {
    return isInstructorForCourse(user, selectedCourse);
  }, [user, selectedCourse]);

  const findFirstAvailableLessonForCourse = (course: Course): Lesson | null => {
    const isAssignedInstructor = isInstructorForCourse(user, course);

    for (const module of course.modules) {
      if (isModuleExpiredForStudent(course, module.id) && !isAssignedInstructor) {
        continue;
      }

      for (const lesson of module.lessons) {
        if (isAssignedInstructor || isLessonUnlocked(lesson.id, course, progress, user)) {
          return lesson;
        }
      }
    }

    if (course.modules.length > 0 && course.modules[0].lessons.length > 0) {
      return course.modules[0].lessons[0];
    }
    return null;
  };

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(() => {
    if (initialCourseId) {
      const foundCourse = courses.find(c => c.id === initialCourseId);
      if (foundCourse) {
        if (initialLessonId) {
          for (const m of foundCourse.modules) {
            const foundL = m.lessons.find(l => l.id === initialLessonId);
            if (foundL) return foundL;
          }
        }
        return findFirstAvailableLessonForCourse(foundCourse);
      }
    }
    return null;
  });

  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const getCourseCodingTests = (course: Course) => {
    const schedule = course.codingTestSchedule || user?.scheduledCodingTests?.[course.id] || {};
    const legacy = [
      { key: 'codingTest1Date', label: 'Coding Test 1', date: schedule.codingTest1Date, problemId: schedule.codingTest1ProblemId },
      { key: 'codingTest2Date', label: 'Coding Test 2', date: schedule.codingTest2Date, problemId: schedule.codingTest2ProblemId }
    ].filter(item => !!item.date);

    const arrayTests = (schedule.tests || []).filter(test => !!test.date && test.enabled !== false).map(test => {
      const selectedProblemIds = Array.isArray(test.problemIds) && test.problemIds.length > 0
        ? test.problemIds
        : test.problemId ? [test.problemId] : [];

      return {
        key: `codingtest_${test.id}`,
        label: test.title || 'Coding Test',
        date: test.date,
        problemId: selectedProblemIds[0]
      };
    });

    return [...legacy, ...arrayTests].filter((item, index, arr) => arr.findIndex(other => other.key === item.key) === index);
  };

  const getCourseCodingTestProblemIds = (course: Course, key: string): string[] => {
    const schedule = course.codingTestSchedule || user?.scheduledCodingTests?.[course.id] || {};
    const legacyProblemId = key === 'codingTest1Date'
      ? schedule.codingTest1ProblemId
      : key === 'codingTest2Date'
        ? schedule.codingTest2ProblemId
        : undefined;

    if (legacyProblemId) {
      return [legacyProblemId];
    }

    const test = (schedule.tests || []).find(item => `codingtest_${item.id}` === key);
    if (test) {
      const selectedProblemIds = Array.isArray(test.problemIds) && test.problemIds.length > 0
        ? test.problemIds
        : test.problemId ? [test.problemId] : [];
      return selectedProblemIds.filter(Boolean);
    }

    return [];
  };

  const getCourseCodingTestLesson = (course: Course, key: string): Lesson | null => {
    const problemLessons = course.modules
      .flatMap(module => module.lessons)
      .filter(lesson => lesson.type === 'problem');

    const problemIds = getCourseCodingTestProblemIds(course, key);
    if (problemIds.length > 0) {
      const completedProblemIds = new Set(progress.completedLessonIds || []);
      const nextUnfinished = problemIds
        .map(problemId => problemLessons.find(lesson => lesson.id === problemId))
        .find(lesson => lesson && !completedProblemIds.has(lesson.id));

      return nextUnfinished || problemLessons.find(lesson => problemIds.includes(lesson.id)) || problemLessons[0] || null;
    }

    const fallbackIndex = key === 'codingTest1Date' ? 0 : key === 'codingTest2Date' ? 1 : 0;
    return problemLessons[fallbackIndex] || problemLessons[0] || null;
  };

  const getActiveCodingTestForLesson = (course: Course, lessonId?: string) => {
    const schedule = course.codingTestSchedule || user?.scheduledCodingTests?.[course.id] || {};
    const entries = [
      { key: 'codingTest1Date', label: 'Coding Test 1', date: schedule.codingTest1Date, problemIds: getCourseCodingTestProblemIds(course, 'codingTest1Date') },
      { key: 'codingTest2Date', label: 'Coding Test 2', date: schedule.codingTest2Date, problemIds: getCourseCodingTestProblemIds(course, 'codingTest2Date') },
      ...((schedule.tests || []).filter((test: any) => test.enabled !== false).map((test: any) => {
        const problemIds = Array.isArray(test.problemIds) && test.problemIds.length > 0
          ? test.problemIds
          : test.problemId ? [test.problemId] : [];
        return { key: `codingtest_${test.id}`, label: test.title || 'Coding Test', date: test.date, problemIds: problemIds.filter(Boolean) };
      }))
    ].filter(item => !!item.date && item.problemIds.length > 0);

    const activeOpenTest = entries.find(item => new Date(item.date) <= new Date());
    if (!activeOpenTest) return null;

    if (!lessonId) return activeOpenTest;

    const matchesSelectedLesson = activeOpenTest.problemIds.includes(lessonId);
    if (matchesSelectedLesson) {
      return activeOpenTest;
    }

    const fallback = entries.find(item => {
      const allProblemIds = item.problemIds || [];
      return allProblemIds.some(id => id === lessonId) || item.key === activeOpenTest.key;
    });
    return fallback || activeOpenTest;
  };

  const isModuleExtended = (course: Course, moduleId: string) => {
    const override = user?.moduleDeadlineOverrides?.[course.id]?.[moduleId];
    const originalEndDate = course.modules.find(m => m.id === moduleId)?.endDate;
    if (!override) return false;
    if (!originalEndDate) return true;
    return new Date(override) > new Date(originalEndDate);
  };

  const getExtendedModule = (course: Course) => {
    return course.modules.find(module => isModuleExtended(course, module.id));
  };

  const isModuleExpiredForStudent = (course: Course, moduleId: string) => {
    const effectiveDeadline = getEffectiveModuleDeadline(user, course, moduleId);
    const hasStudentOverride = !!user?.moduleDeadlineOverrides?.[course.id]?.[moduleId];
    return !!effectiveDeadline && new Date(effectiveDeadline) < new Date() && !hasStudentOverride;
  };

  // Instructor test mode for bypassing deadlines and locks
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    if (initialCourseId) {
      const foundCourse = courses.find(c => c.id === initialCourseId);
      if (foundCourse) {
        setSelectedCourse(foundCourse);
        if (initialLessonId) {
          for (const m of foundCourse.modules) {
            const l = m.lessons.find(less => less.id === initialLessonId);
            if (l) {
              setSelectedLesson(l);
              return;
            }
          }
        }
        setSelectedLesson(findFirstAvailableLessonForCourse(foundCourse));
      }
    }
  }, [initialCourseId, initialLessonId, courses]);

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    const isInstructor = isInstructorForCourse(user, course);

    let targetLesson: Lesson | null = null;
    const extendedModule = course.modules.find(m => isModuleExtended(course, m.id));

    if (extendedModule) {
      const firstPendingLesson = extendedModule.lessons.find(l => !progress.completedLessonIds.includes(l.id));
      if (firstPendingLesson) {
        targetLesson = firstPendingLesson;
      }
    }

    if (!targetLesson) {
      for (const m of course.modules) {
        if (!isInstructor && isModuleExpiredForStudent(course, m.id)) {
          continue;
        }

        for (const l of m.lessons) {
          if (isLessonUnlocked(l.id, course, progress, user) && !progress.completedLessonIds.includes(l.id)) {
            targetLesson = l;
            break;
          }
        }

        if (targetLesson) break;
      }
    }

    if (!targetLesson) {
      targetLesson = findFirstAvailableLessonForCourse(course);
    }
    setSelectedLesson(targetLesson);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    if (!selectedCourse) return;

    const currentModule = selectedCourse.modules.find(module => module.lessons.some(l => l.id === lesson.id));
    const effectiveDeadline = currentModule ? getEffectiveModuleDeadline(user, selectedCourse, currentModule.id) : undefined;
    const isDeadlinePassed = effectiveDeadline && new Date(effectiveDeadline) < new Date();

    if (isDeadlinePassed && !progress.completedLessonIds.includes(lesson.id)) {
      setLockedNotice(`🔒 "${lesson.title}" is locked because the module deadline has passed and no further progression is allowed.`);
      setTimeout(() => setLockedNotice(null), 4000);
      return;
    }

    // Check unlock status (instructors bypass on assigned course)
    const unlocked = isInstructorAssigned || isLessonUnlocked(lesson.id, selectedCourse, progress, user);
    if (!unlocked) {
      setLockedNotice(`🔒 "${lesson.title}" is locked. Complete the previous challenge to unlock this step.`);
      setTimeout(() => setLockedNotice(null), 4000);
      return;
    }

    setLockedNotice(null);
    setSelectedLesson(lesson);
  };

  const handleBack = () => {
    setSelectedCourse(null);
    setSelectedLesson(null);
    setLanguage('en');
    setLockedNotice(null);
  };

  // Instructor quick actions for testing course completion
  const handleTestCompleteAll = () => {
    if (!selectedCourse || !user) return;
    const updated = completeAllCourseLessons(user, selectedCourse);
    onProgressUpdate(updated);
  };

  const handleTestResetCourse = () => {
    if (!selectedCourse || !user) return;
    const updated = resetCourseProgress(user, selectedCourse);
    onProgressUpdate(updated);
  };

  // Mark article as completed and unlock next
  const handleCompleteArticle = (lessonId: string) => {
    if (!selectedCourse) return;
    const { updatedProgress, newlyUnlockedLesson } = recordCompletion(
      user || 'guest',
      lessonId,
      selectedCourse,
      25
    );
    onProgressUpdate(updatedProgress);
    if (newlyUnlockedLesson) {
      setSelectedLesson(newlyUnlockedLesson);
    }
  };

  // Translation Logic
  useEffect(() => {
    const translate = async () => {
      if (!selectedLesson?.content) return;
      
      if (language === 'en') {
        setTranslatedContent(selectedLesson.content);
        return;
      }

      setIsTranslating(true);
      const translated = await translateContent(selectedLesson.content, getLanguageName(language));
      setTranslatedContent(translated);
      setIsTranslating(false);
    };

    translate();
  }, [language, selectedLesson]);

  const getLanguageName = (code: SupportedLanguage) => {
    switch (code) {
      case 'ta': return 'Tamil';
      case 'te': return 'Telugu';
      case 'hi': return 'Hindi';
      case 'fr': return 'French';
      case 'es': return 'Spanish';
      default: return 'English';
    }
  };

  if (selectedCourse) {
    const isProLocked = selectedLesson?.isPro && !isPro;
    const courseStats = getCourseProgress(selectedCourse, progress);

    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Navigation & Progress Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="flex items-center text-slate-600 hover:text-bitwise-600 font-semibold text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i> Courses
            </button>
            <span className="text-slate-300">|</span>
            <h1 className="font-bold text-slate-900 text-base md:text-lg truncate max-w-md">
              {selectedCourse.title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Course Progress Widget */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">Track Progress:</span>
              <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-bitwise-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${courseStats.percentage}%` }}
                ></div>
              </div>
              <span className="font-bold text-slate-800 font-mono">{courseStats.percentage}%</span>
              <span className="text-slate-400">({courseStats.completed}/{courseStats.total})</span>
            </div>

            {selectedLesson?.type !== 'problem' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500"><i className="fa-solid fa-language mr-1"></i> Read in:</span>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                  className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-bitwise-500"
                >
                  <option value="en">English</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="hi">Hindi</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Locked Notice Alert Banner */}
        {lockedNotice && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold rounded-xl flex items-center justify-between animate-fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-lock text-amber-600 text-sm"></i>
              <span>{lockedNotice}</span>
            </div>
            <button 
              onClick={() => setLockedNotice(null)}
              className="text-amber-600 hover:text-amber-800"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}
        
        {(() => {
          const tests = getCourseCodingTests(selectedCourse);
          if (tests.length === 0) return null;

          return (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {tests.map(test => {
                const isOpen = !!test.date && new Date(test.date) <= new Date();
                const testLesson = getCourseCodingTestLesson(selectedCourse, test.key as 'codingTest1Date' | 'codingTest2Date');
                const testProblemIds = getCourseCodingTestProblemIds(selectedCourse, test.key as 'codingTest1Date' | 'codingTest2Date');

                return (
                  <div key={test.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Scheduled</div>
                      <div className="text-sm font-bold text-slate-900">{test.label}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(test.date!).toLocaleDateString()} · {isOpen ? `Available now (${testProblemIds.length} problem${testProblemIds.length === 1 ? '' : 's'})` : 'Upcoming'}
                      </div>
                    </div>
                    {isOpen && testLesson ? (
                      <button
                        type="button"
                        onClick={() => setSelectedLesson(testLesson)}
                        className="rounded-xl bg-bitwise-600 text-white px-3 py-2 text-xs font-bold hover:bg-bitwise-700 transition-colors"
                      >
                        Open {testProblemIds.length > 1 ? 'Next Problem' : test.label}
                      </button>
                    ) : (
                      <span className="rounded-full bg-slate-200 text-slate-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                        Locked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Main Grid: Sidebar + Lesson/Problem Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[84vh] min-h-[600px]">
          {/* Sidebar: Modules & Sequential Lessons */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-bitwise-600 bg-bitwise-50 px-2 py-0.5 rounded">
                  {selectedCourse.level}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {courseStats.problemsSolved}/{courseStats.totalProblems} Solved
                </span>
              </div>
              <h2 className="font-bold text-slate-900 text-sm">{selectedCourse.title}</h2>
              {(() => {
                const extendedModule = getExtendedModule(selectedCourse);
                const isCurrentModuleExtended = !!extendedModule && !!selectedLesson && extendedModule.lessons.some(l => l.id === selectedLesson.id);
                if (!isCurrentModuleExtended) return null;
                return (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    <i className="fa-solid fa-rotate-right"></i>
                    Resume from here
                  </div>
                );
              })()}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {selectedCourse.modules.filter((module) => {
                const effectiveDeadline = getEffectiveModuleDeadline(user, selectedCourse, module.id);
                const hasStudentOverride = !!user?.moduleDeadlineOverrides?.[selectedCourse.id]?.[module.id];
                const isDeadlinePassed = !!effectiveDeadline && new Date(effectiveDeadline) < new Date();

                if (isDeadlinePassed && !hasStudentOverride) {
                  return true;
                }

                return true;
              }).map((module) => (
                <div key={module.id} className="py-2">
                  <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between gap-2">
                    <span>{module.title}</span>
                    {(() => {
                      const effectiveDeadline = getEffectiveModuleDeadline(user, selectedCourse, module.id);
                      const hasStudentOverride = !!user?.moduleDeadlineOverrides?.[selectedCourse.id]?.[module.id];
                      const isDeadlinePassed = !!effectiveDeadline && new Date(effectiveDeadline) < new Date() && !hasStudentOverride;

                      if (isModuleExtended(selectedCourse, module.id)) {
                        return (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-bold uppercase tracking-wide">
                            {selectedLesson && module.lessons.some(l => l.id === selectedLesson.id) ? 'Resume' : 'Extended'}
                          </span>
                        );
                      }

                      if (isDeadlinePassed) {
                        return (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-bold uppercase tracking-wide">
                            Review Only
                          </span>
                        );
                      }

                      return null;
                    })()}
                  </div>
                  <div className="space-y-0.5">
                    {module.lessons.filter((lesson) => {
                        const effectiveDeadline = getEffectiveModuleDeadline(user, selectedCourse, module.id);
                        const isDeadlinePassed = effectiveDeadline && new Date(effectiveDeadline) < new Date();
                        if (isDeadlinePassed) return true; // keep all lessons visible in a passed module, but lock incomplete ones
                        return true;
                    }).map((lesson) => {
                      const isCompleted = progress.completedLessonIds.includes(lesson.id);
                      const isUnlocked = isLessonUnlocked(lesson.id, selectedCourse, progress, user);
                      const isSelected = selectedLesson?.id === lesson.id;
                      const effectiveDeadline = getEffectiveModuleDeadline(user, selectedCourse, module.id);
                      const hasStudentOverride = !!user?.moduleDeadlineOverrides?.[selectedCourse.id]?.[module.id];
                      const isPastDeadline = !!effectiveDeadline && new Date(effectiveDeadline) < new Date() && !hasStudentOverride;
                      const isDisabled = isPastDeadline && !isCompleted;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => !isDisabled && handleSelectLesson(lesson)}
                          disabled={isDisabled}
                          className={`w-full text-left px-4 py-3 text-xs flex items-center justify-between transition-colors relative ${
                            isSelected
                              ? 'bg-bitwise-50 text-bitwise-700 font-bold border-l-4 border-bitwise-600'
                              : isDisabled
                              ? 'text-slate-400 bg-slate-50/50 cursor-not-allowed border-l-4 border-transparent opacity-75'
                              : isUnlocked
                              ? 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'
                              : 'text-slate-400 bg-slate-50/50 cursor-not-allowed border-l-4 border-transparent opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {/* Icon status */}
                            {isCompleted ? (
                              <i className="fa-solid fa-circle-check text-emerald-500 text-sm shrink-0"></i>
                            ) : !isUnlocked ? (
                              <i className="fa-solid fa-lock text-slate-400 text-xs shrink-0"></i>
                            ) : lesson.type === 'problem' ? (
                              <i className="fa-solid fa-code text-purple-600 text-xs shrink-0"></i>
                            ) : lesson.type === 'pseudocode' ? (
                              <i className="fa-solid fa-terminal text-cyan-600 text-xs shrink-0"></i>
                            ) : lesson.type === 'algorithm' ? (
                              <i className="fa-solid fa-list-ol text-cyan-600 text-xs shrink-0"></i>
                            ) : lesson.type === 'flowchart' ? (
                              <i className="fa-solid fa-diagram-project text-cyan-600 text-xs shrink-0"></i>
                            ) : (
                              <i className="fa-solid fa-file-lines text-bitwise-500 text-xs shrink-0"></i>
                            )}
                            <span className="truncate">{lesson.title}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {lesson.type === 'problem' && (
                              <span className={`px-1.5 py-0.5 font-mono text-[9px] font-bold rounded ${
                                lesson.isPractice ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'
                              }`}>
                                {lesson.isPractice ? 'Practice' : 'Challenge'}
                              </span>
                            )}
                            {(lesson.type === 'algorithm' || lesson.type === 'pseudocode' || lesson.type === 'flowchart') && (
                              <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 font-mono text-[9px] font-bold rounded">
                                {lesson.type === 'flowchart' ? 'Flowchart' : lesson.type === 'algorithm' ? 'Algorithm' : 'Pseudo-code'}
                              </span>
                            )}
                            {lesson.isPro && !isPro && (
                              <i className="fa-solid fa-crown text-amber-500 text-[10px]"></i>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {(() => {
                      const effectiveDeadline = getEffectiveModuleDeadline(user, selectedCourse, module.id);
                      const hasStudentOverride = !!user?.moduleDeadlineOverrides?.[selectedCourse.id]?.[module.id];
                      const isDeadlinePassed = !!effectiveDeadline && new Date(effectiveDeadline) < new Date() && !hasStudentOverride;
                      if (!effectiveDeadline) return null;
                      const isExtended = isModuleExtended(selectedCourse, module.id);
                      return (
                        <div className="px-4 py-2 text-[10px] font-semibold flex items-center justify-between gap-2">
                          <span className={`flex items-center gap-1 ${isDeadlinePassed ? 'text-rose-600' : 'text-amber-600'}`}>
                            <i className="fa-regular fa-calendar-times"></i>
                            Deadline: {new Date(effectiveDeadline).toLocaleDateString()}
                          </span>
                          {isExtended && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[8px] font-bold uppercase tracking-wide">
                              Extended
                            </span>
                          )}
                          {!isExtended && isDeadlinePassed && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[8px] font-bold uppercase tracking-wide">
                              Expired
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm relative">
            {isProLocked ? (
              <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center text-white">
                <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mb-6">
                  <i className="fa-solid fa-crown text-3xl"></i>
                </div>
                <h2 className="text-2xl font-bold mb-2">Pro Content Locked</h2>
                <p className="text-slate-300 max-w-md mb-8 text-sm">
                  This challenge is part of our Pro curriculum. Upgrade to unlock all advanced problem sets and certificates.
                </p>
                <button 
                  onClick={onUpgrade}
                  className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Unlock Pro Access
                </button>
              </div>
            ) : null}

            {selectedLesson ? (
              selectedLesson.type === 'problem' ? (
                <ProblemWorkspace
                  lesson={selectedLesson}
                  course={selectedCourse}
                  user={user}
                  progress={progress}
                  onProgressUpdate={onProgressUpdate}
                  onNavigateToLesson={(nextL) => setSelectedLesson(nextL)}
                  onClose={() => setSelectedLesson(null)}
                  onOpenPlayground={onOpenPlayground}
                  onActivateWorkspace={() => { /* handled by parent via view state if needed */ }}
                />
              ) : selectedLesson.type === 'algorithm' || selectedLesson.type === 'pseudocode' || selectedLesson.type === 'flowchart' ? (
                <CreativeChallengeWorkspace
                  lesson={selectedLesson}
                  course={selectedCourse}
                  user={user}
                  progress={progress}
                  onProgressUpdate={onProgressUpdate}
                  onClose={() => setSelectedLesson(null)}
                />
              ) : (
                /* Article / Conceptual Lesson Layout */
                <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-between">
                  <div className="max-w-3xl mx-auto w-full">
                    <div className="mb-6 pb-6 border-b border-slate-100 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold text-bitwise-600 bg-bitwise-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {selectedLesson.type}
                          </span>
                          {progress.completedLessonIds.includes(selectedLesson.id) && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                              <i className="fa-solid fa-check"></i> Completed
                            </span>
                          )}
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                          {selectedLesson.title}
                        </h1>
                        <div className="flex items-center text-slate-500 text-xs">
                          <i className="fa-regular fa-clock mr-1.5"></i> {selectedLesson.duration}
                        </div>
                      </div>
                    </div>

                    {isTranslating ? (
                      <div className="py-20 text-center">
                        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-bitwise-600 mb-4"></i>
                        <p className="text-slate-500 text-sm">Translating to {getLanguageName(language)}...</p>
                      </div>
                    ) : (
                      <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed mb-8">
                        <div dangerouslySetInnerHTML={{ __html: translatedContent || '' }} />
                      </div>
                    )}

                    {selectedLesson.codeSnippet && (
                      <div className="mt-6 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-lg">
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                          <span className="text-xs font-mono text-slate-400">
                            Example Code ({selectedLesson.language || 'javascript'})
                          </span>
                          {onOpenPlayground && (
                            <button 
                              onClick={() => onOpenPlayground(selectedLesson.codeSnippet!, selectedLesson.language || 'javascript')}
                              className="text-xs bg-bitwise-600 hover:bg-bitwise-500 text-white px-3 py-1 rounded transition-colors"
                            >
                              Open in Playground <i className="fa-solid fa-external-link-alt ml-1"></i>
                            </button>
                          )}
                        </div>
                        <div className="p-4 overflow-x-auto">
                          <pre className="text-sm font-mono text-emerald-400">
                            {selectedLesson.codeSnippet}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Article Complete / Next Action */}
                  <div className="max-w-3xl mx-auto w-full pt-8 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {progress.completedLessonIds.includes(selectedLesson.id) ? (
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-check"></i> Lesson Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            const mod = selectedCourse.modules.find(m => m.lessons.some(l => l.id === selectedLesson.id));
                            const effectiveDeadline = mod ? getEffectiveModuleDeadline(user, selectedCourse, mod.id) : undefined;
                            const passed = effectiveDeadline && new Date(effectiveDeadline) < new Date();
                            if (passed) return; // block completion on passed module too
                            handleCompleteArticle(selectedLesson.id);
                          }}
                          className="px-5 py-2.5 bg-bitwise-600 hover:bg-bitwise-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 hover:scale-105"
                        >
                          <i className="fa-solid fa-check"></i> Mark Complete & Unlock Next
                        </button>
                      )}
                    </div>

                    {(() => {
                      const nextL = getNextLesson(selectedCourse, selectedLesson.id, user);
                      if (!nextL) return null;
                      const currentMod = selectedCourse.modules.find(m => m.lessons.some(l => l.id === selectedLesson.id));
                      const nextMod = selectedCourse.modules.find(m => m.lessons.some(l => l.id === nextL.id));
                      const currentDeadline = currentMod ? getEffectiveModuleDeadline(user, selectedCourse, currentMod.id) : undefined;
                      const passed = currentDeadline && new Date(currentDeadline) < new Date();
                      const samePassedModule = passed && currentMod?.id === nextMod?.id;
                      if (samePassedModule) return null;
                      return (
                        <button
                          onClick={() => {
                            if (!progress.completedLessonIds.includes(selectedLesson.id)) {
                              handleCompleteArticle(selectedLesson.id);
                            } else {
                              setSelectedLesson(nextL);
                            }
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
                        >
                          Next Lesson <i className="fa-solid fa-arrow-right"></i>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                <i className="fa-solid fa-code text-4xl mb-4 opacity-40"></i>
                <p className="text-sm">Select a lesson or coding challenge from the sidebar to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Course Grid View
  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
          Interactive Tech Courses & Problem Solving
        </h2>
        <p className="text-slate-600 text-sm md:text-base">
          Learn data structures, algorithms, and system design with free Judge0 sandbox test case validation and progressive challenge unlocking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => {
          const stats = getCourseProgress(course, progress);
          return (
            <div 
              key={course.id} 
              onClick={() => handleCourseClick(course)}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden cursor-pointer flex flex-col h-full"
            >
              <div className="h-48 overflow-hidden relative bg-slate-100">
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                  {course.level}
                </div>
                {/* Live Badge */}
                {course.isLive && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 animate-pulse">
                    <i className="fa-solid fa-circle text-[8px]"></i> LIVE
                  </div>
                )}
                {/* Pro Badge */}
                {course.isPro && !course.isLive && (
                  <div className="absolute top-4 left-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                    <i className="fa-solid fa-crown"></i> PRO
                  </div>
                )}
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {course.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] uppercase font-bold tracking-wider text-bitwise-600 bg-bitwise-50 px-2 py-0.5 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-bitwise-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-4">
                    {course.description}
                  </p>

                  {/* Course Progress Indicator */}
                  {stats.total > 0 && (
                    <div className="space-y-1 mb-4">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                        <span>{stats.problemsSolved}/{stats.totalProblems} Challenges Solved</span>
                        <span className="text-bitwise-600 font-bold">{stats.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-bitwise-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${stats.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4">
                  <span><i className="fa-solid fa-layer-group mr-1"></i> {course.modules.length} Modules</span>
                  <span className="group-hover:translate-x-1 transition-transform text-bitwise-600 font-bold flex items-center gap-1">
                    Start Learning <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Courses;

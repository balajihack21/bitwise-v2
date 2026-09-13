import React, { useState, useEffect, useMemo } from 'react';
import { Course, Lesson, SupportedLanguage, User, UserProgress } from '../types';
import ProblemWorkspace from './ProblemWorkspace';
import { translateContent } from '../services/geminiService';
import { 
  isLessonUnlocked, 
  getCourseProgress, 
  recordCompletion, 
  getNextLesson,
  isInstructorForCourse,
  completeAllCourseLessons,
  resetCourseProgress
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
        if (foundCourse.modules.length > 0 && foundCourse.modules[0].lessons.length > 0) {
          return foundCourse.modules[0].lessons[0];
        }
      }
    }
    return null;
  });

  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

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
            if (l) setSelectedLesson(l);
          }
        }
      }
    }
  }, [initialCourseId, initialLessonId, courses]);

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    // Find first unlocked, uncompleted lesson
    const isInstructor = isInstructorForCourse(user, course);
    let targetLesson: Lesson | null = null;
    for (const m of course.modules) {
      const isDeadlinePassed = m.endDate && new Date(m.endDate) < new Date();
      if (!isInstructor && isDeadlinePassed) continue;
      for (const l of m.lessons) {
        if (isLessonUnlocked(l.id, course, progress, user) && !progress.completedLessonIds.includes(l.id)) {
          targetLesson = l;
          break;
        }
      }
      if (targetLesson) break;
    }
    // Fall back to first lesson if all completed or none found
    if (!targetLesson && course.modules.length > 0 && course.modules[0].lessons.length > 0) {
      targetLesson = course.modules[0].lessons[0];
    }
    setSelectedLesson(targetLesson);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    if (!selectedCourse) return;

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
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {selectedCourse.modules.filter((module) => {
                const isDeadlinePassed = module.endDate && new Date(module.endDate) < new Date();
                if (!isDeadlinePassed) return true;
                // Only show module if at least one lesson is completed
                return module.lessons.some((l) => progress.completedLessonIds.includes(l.id));
              }).map((module) => (
                <div key={module.id} className="py-2">
                  <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {module.title}
                  </div>
                  <div className="space-y-0.5">
                    {module.lessons.filter((lesson) => {
                        const isDeadlinePassed = module.endDate && new Date(module.endDate) < new Date();
                        if (!isDeadlinePassed) return true;
                        // For passed modules, only show completed lessons
                        return progress.completedLessonIds.includes(lesson.id);
                    }).map((lesson) => {
                      const isCompleted = progress.completedLessonIds.includes(lesson.id);
                      const isUnlocked = isLessonUnlocked(lesson.id, selectedCourse, progress, user);
                      const isSelected = selectedLesson?.id === lesson.id;
                      const isPastDeadline = module.endDate && new Date(module.endDate) < new Date();
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
                            ) : (
                              <i className="fa-solid fa-file-lines text-bitwise-500 text-xs shrink-0"></i>
                            )}
                            <span className="truncate">{lesson.title}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {lesson.type === 'problem' && (
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 font-mono text-[9px] font-bold rounded">
                                Challenge
                              </span>
                            )}
                            {lesson.isPro && !isPro && (
                              <i className="fa-solid fa-crown text-amber-500 text-[10px]"></i>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {module.endDate && (
                      <div className="px-4 py-2 text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                        <i className="fa-regular fa-calendar-times"></i>
                        Deadline: {new Date(module.endDate).toLocaleDateString()}
                      </div>
                    )}
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
                /* Interactive Judge0 Problem Workspace */
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
                            const passed = mod && mod.endDate && new Date(mod.endDate) < new Date();
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
                      const nextL = getNextLesson(selectedCourse, selectedLesson.id);
                      if (!nextL) return null;
                      const currentMod = selectedCourse.modules.find(m => m.lessons.some(l => l.id === selectedLesson.id));
                      const nextMod = selectedCourse.modules.find(m => m.lessons.some(l => l.id === nextL.id));
                      const passed = currentMod && currentMod.endDate && new Date(currentMod.endDate) < new Date();
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

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import Courses from './components/Courses';
import ProgressDashboard from './components/ProgressDashboard';
import StudentIssueReports from './components/StudentIssueReports';
import CodeEditor from './components/CodeEditor';
import PracticeProblems from './components/PracticeProblems';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import Testimonials from './components/Testimonials';
import Founder from './components/Founder';
import { ViewState, User, Course, UserProgress, Lesson } from './types';
import { MOCK_COURSES } from './constants';
import { 
  getUserProgress, 
  saveUserProgress, 
  resetUserProgress, 
  syncProgressWithFirestore,
  clearPendingProgressSync,
  getPendingProgressSyncOptions,
  getPendingSubmissionSyncs,
  markSubmissionsSynced
} from './services/progressService';
import { 
  auth, 
  onAuthStateChanged, 
  logoutFirebase, 
  loadCoursesFromFirestore,
  saveCoursesToFirestore,
  getInstructorAssignedCourses,
  fetchInstructorsList,
  loadUserModuleDeadlineOverrides,
  loadUserScheduledCodingTests,
  saveUserProgressToFirestore,
  recordSubmissionsInFirestore
} from './services/firebase';

const mergeDefaultPracticeProblems = (courses: Course[]): Course[] => {
  const defaultProblems = MOCK_COURSES.find(course => course.id === 'python-programming')?.practiceProblems;
  if (!defaultProblems?.length) return courses;

  return courses.map(course => (
    course.id === 'python-programming' && !course.practiceProblems?.length
      ? { ...course, practiceProblems: defaultProblems }
      : course
  ));
};

const getProgressSyncErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const code = typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? `${error.code}: `
      : '';
    return `Sync failed: ${code}${error.message}`;
  }
  return 'Sync failed. Check your connection, Firebase Authentication, Firestore rules, and Firestore usage/quota details, then retry.';
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [authBanner, setAuthBanner] = useState<string | null>(null);
  const [progressSyncError, setProgressSyncError] = useState(false);
  const [isRetryingProgressSync, setIsRetryingProgressSync] = useState(false);
  const [progressSyncMessage, setProgressSyncMessage] = useState<string | null>(null);
  const [progressRecoveryAvailable, setProgressRecoveryAvailable] = useState(false);
  const [pendingTargetView, setPendingTargetView] = useState<ViewState | null>(null);
  const [playgroundCode, setPlaygroundCode] = useState<string>(
    '// Welcome to Bitwise Judge0 Code Playground\n// Write code, pass custom stdin, and run in the isolated sandbox!\n\nfunction main() {\n    console.log("Hello from Bitwise Judge0 Sandbox!");\n}\n\nmain();'
  );
  const [playgroundLanguage, setPlaygroundLanguage] = useState<string>('javascript');
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('bitwise_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Active navigation params for Courses view
  const [activeCourseId, setActiveCourseId] = useState<string | undefined>(undefined);
  const [activeLessonId, setActiveLessonId] = useState<string | undefined>(undefined);

  // Apply browser-level inspection safeguards to student sessions only.
  useEffect(() => {
    if (user?.role !== 'student') return;

    const blockInspection = (event: Event) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const blocked =
        event.key === 'F12' ||
        (modifier && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (modifier && key === 'u');

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', blockInspection);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', blockInspection);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [user?.role]);

  // Initialize course data from localStorage or fallback with version check
  const [courses, setCourses] = useState<Course[]>(() => {
    const CURRENT_SCHEMA_VER = 'v4_full_dsa_testcases_suite';
    const savedVer = localStorage.getItem('bitwise_courses_ver');
    if (savedVer === CURRENT_SCHEMA_VER) {
      const savedCourses = localStorage.getItem('bitwise_courses');
      if (savedCourses) {
        try {
          return JSON.parse(savedCourses);
        } catch (e) {
          console.error('Failed to parse cached courses', e);
        }
      }
    }
    // Update local storage to fresh mock courses
    localStorage.setItem('bitwise_courses', JSON.stringify(MOCK_COURSES));
    localStorage.setItem('bitwise_courses_ver', CURRENT_SCHEMA_VER);
    return MOCK_COURSES;
  });

  // User progress state
  const [progress, setProgress] = useState<UserProgress>(() => {
    return getUserProgress(user?.username || 'guest');
  });

  // Helper to trigger login when accessing protected perks
  const requireAuthForView = (targetView: ViewState, reason?: string) => {
    if (user) {
      if (targetView === ViewState.COURSES) {
        setActiveCourseId(undefined);
        setActiveLessonId(undefined);
      }
      setCurrentView(targetView);
    } else {
      const notice = reason || (
        targetView === ViewState.COURSES
          ? '🔒 Member Perks Locked: Please log in or create an account to access interactive courses, Judge0 sandbox test execution, and earn XP.'
          : targetView === ViewState.PLAYGROUND
          ? '🔒 Member Perks Locked: Please log in to run code in the Judge0 sandbox playground.'
          : targetView === ViewState.PROGRESS
          ? '🔒 Member Perks Locked: Please log in to view your learning progress and problem submissions.'
          : targetView === ViewState.ADMIN
          ? '🔒 Admin Access: Please sign in with administrator credentials.'
          : '🔒 Login Required: Please sign in or create an account to access this feature.'
      );
      setAuthBanner(notice);
      setPendingTargetView(targetView);
      setCurrentView(ViewState.AUTH);
    }
  };

  // Listen for Firebase Auth changes and real-time events
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const cleanEmail = fbUser.email?.toLowerCase().trim() || '';
        const isAdmin = cleanEmail.includes('admin') || fbUser.displayName?.toLowerCase().includes('admin');
        
        let role: 'admin' | 'instructor' | 'student' = 'student';
        let assignedCourses: string[] | undefined = undefined;

        if (isAdmin) {
          role = 'admin';
        } else {
          // Check cached user in localStorage first
          let cachedRole: string | undefined = undefined;
          let cachedAssigned: string[] | undefined = undefined;
          try {
            const rawUser = localStorage.getItem('bitwise_active_user');
            if (rawUser) {
              const parsed = JSON.parse(rawUser);
              if (parsed.email?.toLowerCase().trim() === cleanEmail || parsed.uid === fbUser.uid) {
                cachedRole = parsed.role;
                cachedAssigned = parsed.assignedCourseIds;
              }
            }
          } catch (e) {}

          const isInstructorIdentity =
            cleanEmail === 'instructor@bitwise.com' ||
            cleanEmail === 'mailztobalaji@gmail.com' ||
            cleanEmail.includes('instructor') ||
            cleanEmail.includes('balaji');

          if (isInstructorIdentity) {
            role = 'instructor';
            assignedCourses = cachedAssigned || getInstructorAssignedCourses(cleanEmail, fbUser.uid);
          } else {
            // Check instructors directory
            try {
              const instList = await fetchInstructorsList();
              const foundInst = instList.find(i => i.email.toLowerCase().trim() === cleanEmail);
              if (foundInst) {
                role = 'instructor';
                assignedCourses = foundInst.assignedCourseIds || getInstructorAssignedCourses(cleanEmail, fbUser.uid);
              }
            } catch (e) {}
          }
        }

        const courseInstructorAssignments = (assignedCourses || []).flatMap((courseId) => {
          const course = courses.find(c => c.id === courseId);
          return (course?.assignedInstructors || []).map((inst) => ({
            courseId,
            instructorId: inst.uid,
            instructorEmail: inst.email,
            instructorName: inst.name,
            assignedAt: new Date().toISOString()
          }));
        });

        const loadedOverrides = await loadUserModuleDeadlineOverrides(fbUser.uid);
        const loadedScheduledTests = await loadUserScheduledCodingTests(fbUser.uid);
        const activeUser: User = {
          username: fbUser.displayName || cleanEmail.split('@')[0] || (role === 'admin' ? 'Admin' : (role === 'instructor' ? 'Instructor' : 'Student')),
          role,
          email: fbUser.email || undefined,
          uid: fbUser.uid,
          assignedCourseIds: assignedCourses,
          courseInstructorAssignments,
          moduleDeadlineOverrides: loadedOverrides,
          scheduledCodingTests: loadedScheduledTests
        };
        setUser(activeUser);
        localStorage.setItem('bitwise_active_user', JSON.stringify(activeUser));
        try {
          const syncedProgress = await syncProgressWithFirestore(activeUser);
          setProgress(syncedProgress);
        } catch (error) {
          console.error('Failed to synchronize progress after authentication:', error);
          setProgress(getUserProgress(activeUser.username));
        }
      }
    });

    // Try loading custom courses from Firestore catalog
    loadCoursesFromFirestore().then((cloudCourses) => {
      if (cloudCourses && cloudCourses.length > 0) {
        const mergedCourses = mergeDefaultPracticeProblems(cloudCourses);
        setCourses(mergedCourses);
        localStorage.setItem('bitwise_courses', JSON.stringify(mergedCourses));
      }
    }).catch(() => {});

    const handleGlobalProgressUpdated = () => {
      const activeUser = user || JSON.parse(localStorage.getItem('bitwise_active_user') || 'null');
      if (activeUser) {
        setProgress(getUserProgress(activeUser.username));
      }
    };
    window.addEventListener('bitwise_progress_updated', handleGlobalProgressUpdated);

    const handleProgressSyncError = () => setProgressSyncError(true);
    const handleProgressSyncSaved = () => {
      setProgressSyncError(false);
      setProgressSyncMessage('Progress synced to your account.');
    };
    const handleProgressRecoveryAvailable = () => setProgressRecoveryAvailable(true);
    window.addEventListener('bitwise_progress_sync_error', handleProgressSyncError);
    window.addEventListener('bitwise_progress_sync_saved', handleProgressSyncSaved);
    window.addEventListener('bitwise_progress_recovery_available', handleProgressRecoveryAvailable);

    // Sync courses whenever updated across components or browser tabs
    const handleCoursesUpdated = (e: any) => {
      const updatedList = e.detail?.courses || (() => {
        try {
          const raw = localStorage.getItem('bitwise_courses');
          return raw ? JSON.parse(raw) : null;
        } catch (err) {
          return null;
        }
      })();
      if (updatedList && updatedList.length > 0) {
        setCourses(updatedList);
      }
    };
    window.addEventListener('bitwise_courses_updated', handleCoursesUpdated);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bitwise_courses' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCourses(parsed);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('bitwise_progress_updated', handleGlobalProgressUpdated);
      window.removeEventListener('bitwise_progress_sync_error', handleProgressSyncError);
      window.removeEventListener('bitwise_progress_sync_saved', handleProgressSyncSaved);
      window.removeEventListener('bitwise_progress_recovery_available', handleProgressRecoveryAvailable);
      window.removeEventListener('bitwise_courses_updated', handleCoursesUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  // Sync progress when user changes
  useEffect(() => {
    if (user) {
      syncProgressWithFirestore(user)
        .then(p => setProgress(p))
        .catch(error => {
          console.error('Failed to synchronize progress for the active user:', error);
          setProgress(getUserProgress(user.username));
        });
    } else {
      const p = getUserProgress('guest');
      setProgress(p);
    }
  }, [user]);

  // Save courses when modified
  const handleUpdateCourses = (newCourses: Course[]) => {
    setCourses(newCourses);
    localStorage.setItem('bitwise_courses', JSON.stringify(newCourses));
    saveCoursesToFirestore(newCourses).catch(() => {});
  };

  const handleRefreshCourses = async () => {
    try {
      const cloudCourses = await loadCoursesFromFirestore();
      if (cloudCourses && cloudCourses.length > 0) {
        const mergedCourses = mergeDefaultPracticeProblems(cloudCourses);
        setCourses(mergedCourses);
        localStorage.setItem('bitwise_courses', JSON.stringify(mergedCourses));
      } else {
        const raw = localStorage.getItem('bitwise_courses');
        if (raw) setCourses(JSON.parse(raw));
      }
    } catch (e) {
      const raw = localStorage.getItem('bitwise_courses');
      if (raw) setCourses(JSON.parse(raw));
    }
  };

  const handleProgressUpdate = (
    updated: UserProgress,
    options: { replaceCompletedLessonIds?: boolean } = {}
  ) => {
    setProgress(updated);
    saveUserProgress(user || user?.username || 'guest', updated, options);
  };

  const handleManualProgressSync = async () => {
    if (!user?.uid || isRetryingProgressSync) return;
    setIsRetryingProgressSync(true);
    setProgressSyncMessage('Syncing progress...');
    const latestLocalProgress = getUserProgress(user.username);
    setProgress(latestLocalProgress);

    try {
      await saveUserProgressToFirestore(
        user.uid,
        latestLocalProgress,
        getPendingProgressSyncOptions(user.username)
      );
      const pendingSubmissions = getPendingSubmissionSyncs(
        user.username,
        latestLocalProgress.submissions || []
      );
      await recordSubmissionsInFirestore(user.uid, user.username, pendingSubmissions);
      markSubmissionsSynced(user.username, pendingSubmissions);
      const progressAfterSync = getUserProgress(user.username);
      const hasNewerLocalChanges = progressAfterSync.updatedAt !== latestLocalProgress.updatedAt;
      if (!hasNewerLocalChanges) clearPendingProgressSync(user.username);
      setProgressSyncError(false);
      setProgressSyncMessage(hasNewerLocalChanges
        ? 'Sync complete. Newer local changes are still waiting to sync.'
        : 'Progress synced to your account.');
    } catch (error) {
      console.error('Manual progress synchronization failed:', error);
      setProgressSyncError(true);
      setProgressSyncMessage(getProgressSyncErrorMessage(error));
    } finally {
      setIsRetryingProgressSync(false);
    }
  };

  const handleResetProgress = () => {
    const clean = resetUserProgress(user?.username || 'guest');
    setProgress(clean);
  };

  const handleOpenPlayground = (code: string, language: string) => {
    if (!user) {
      requireAuthForView(ViewState.PLAYGROUND, '🔒 Login Required: Please sign in to open the code playground.');
      return;
    }
    setPlaygroundCode(code);
    setPlaygroundLanguage(language);
    setCurrentView(ViewState.PLAYGROUND);
  };

  const handleUpgrade = () => {
    // Pro features removed
  };

  const isPro = false; // Pro features removed

  // Track whether ProblemWorkspace (course problem editor) is active
  const [isProblemWorkspaceActive, setIsProblemWorkspaceActive] = useState(false);

  const handleLogin = async (loggedInUser: User) => {
    const hydratedUser: User = {
      ...loggedInUser,
      moduleDeadlineOverrides: loggedInUser.moduleDeadlineOverrides && Object.keys(loggedInUser.moduleDeadlineOverrides).length > 0
        ? loggedInUser.moduleDeadlineOverrides
        : await loadUserModuleDeadlineOverrides(loggedInUser.uid)
    };
    setUser(hydratedUser);
    setAuthBanner(null);
    localStorage.setItem('bitwise_active_user', JSON.stringify(hydratedUser));
    syncProgressWithFirestore(hydratedUser)
      .then(p => setProgress(p))
      .catch(error => {
        console.error('Failed to synchronize progress after login:', error);
        setProgress(getUserProgress(hydratedUser.username));
      });

    if (pendingTargetView) {
      const target = pendingTargetView;
      setPendingTargetView(null);
      setCurrentView(target);
    } else if (loggedInUser.role === 'admin') {
      setCurrentView(ViewState.ADMIN);
    } else if (loggedInUser.role === 'instructor') {
      setCurrentView(ViewState.INSTRUCTOR);
    } else {
      setCurrentView(ViewState.COURSES);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutFirebase();
    } catch (e) {}
    localStorage.removeItem('bitwise_active_user');
    setUser(null);
    setProgress(getUserProgress('guest'));
    setCurrentView(ViewState.HOME);
  };

  const handleSelectCourseFromAnywhere = (course: Course, lesson?: Lesson) => {
    if (!user) {
      requireAuthForView(ViewState.COURSES, `🔒 Member Perk Locked: Please log in to access "${course.title}".`);
      return;
    }
    setActiveCourseId(course.id);
    setActiveLessonId(lesson?.id);
    setCurrentView(ViewState.COURSES);
  };

  const renderContent = () => {
    // Strict Access Control Guard for Protected Views
    if (!user && (currentView === ViewState.COURSES || currentView === ViewState.PRACTICE || currentView === ViewState.PLAYGROUND || currentView === ViewState.PROGRESS || currentView === ViewState.ISSUES || currentView === ViewState.ADMIN || currentView === ViewState.INSTRUCTOR)) {
      return (
        <Login 
          onLogin={handleLogin} 
          onCancel={() => {
            setAuthBanner(null);
            setCurrentView(ViewState.HOME);
          }} 
          bannerNotice={authBanner || '🔒 Member Perks Locked: Please log in or create an account to access interactive coding sandboxes, lessons, certificates, and progress tracking.'}
        />
      );
    }

    switch (currentView) {
      case ViewState.HOME:
        return (
          <>
            <Hero onStartLearning={() => {
              if (!user) {
                requireAuthForView(ViewState.COURSES, '🔒 Please sign in or create an account to start learning!');
              } else {
                setActiveCourseId(undefined);
                setActiveLessonId(undefined);
                setCurrentView(ViewState.COURSES);
              }
            }} />
            <Founder />
            <Testimonials />
          </>
        );

      case ViewState.AUTH:
        return (
          <Login 
            onLogin={handleLogin} 
            onCancel={() => {
              setAuthBanner(null);
              setCurrentView(ViewState.HOME);
            }} 
            bannerNotice={authBanner}
          />
        );

      case ViewState.COURSES:
        return (
          <Courses 
            courses={courses}
            isPro={isPro}
            user={user}
            progress={progress}
            onProgressUpdate={handleProgressUpdate}
            onUpgrade={handleUpgrade}
            onOpenPlayground={handleOpenPlayground}
            initialCourseId={activeCourseId}
            initialLessonId={activeLessonId}
          />
        );

      case ViewState.PROGRESS:
        return (
          <ProgressDashboard
            user={user}
            courses={courses}
            progress={progress}
            onSelectCourse={handleSelectCourseFromAnywhere}
            onSyncNow={handleManualProgressSync}
            isSyncing={isRetryingProgressSync}
            onNavigateToCertificates={() => setCurrentView(ViewState.HOME)}
          />
        );

      case ViewState.ISSUES:
        return user?.role === 'student'
          ? <StudentIssueReports user={user} />
          : <div className="container mx-auto max-w-3xl px-4 py-12 text-center text-slate-600">Issue reporting is available to student accounts.</div>;

      case ViewState.PRACTICE:
        return user ? (
          <PracticeProblems
            courses={courses}
            user={user}
            progress={progress}
            onProgressUpdate={handleProgressUpdate}
          />
        ) : null;

      case ViewState.PLAYGROUND:
        return (
          <div className="container mx-auto px-4 py-6 h-[86vh]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-terminal text-bitwise-600"></i> Code Playground & Sandbox
                </h1>
                <p className="text-slate-500 text-xs">
                  Execute code with free Judge0 sandbox, custom standard input, and runtime metrics.
                </p>
              </div>
            </div>
            <CodeEditor initialCode={playgroundCode} initialLanguage={playgroundLanguage} />
          </div>
        );

      case ViewState.ADMIN:
        if (user?.role !== 'admin') {
          return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-2xl mb-4">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Administrator Access Required</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-md">
                You must be logged in with an administrator account to access student management and course catalogs.
              </p>
              <button 
                onClick={() => {
                  setAuthBanner('🔒 Please log in with administrator credentials.');
                  setCurrentView(ViewState.AUTH);
                }}
                className="mt-5 px-5 py-2.5 bg-bitwise-600 hover:bg-bitwise-700 text-white text-xs font-bold rounded-xl"
              >
                Log In as Admin
              </button>
            </div>
          );
        }
        return (
          <AdminDashboard 
            courses={courses} 
            onUpdateCourses={handleUpdateCourses}
            onRefreshCourses={handleRefreshCourses}
            onLogout={handleLogout}
            currentUser={user}
          />
        );

      case ViewState.INSTRUCTOR:
        if (user?.role !== 'instructor' && user?.role !== 'admin') {
          return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-4">
                <i className="fa-solid fa-chalkboard-user"></i>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Instructor Access Required</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-md">
                You must be logged in with an Instructor account to view student performance and submissions for your assigned courses.
              </p>
              <button 
                onClick={() => {
                  setAuthBanner('🔒 Please log in with instructor credentials.');
                  setCurrentView(ViewState.AUTH);
                }}
                className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
              >
                Log In as Instructor
              </button>
            </div>
          );
        }
        return (
          <AdminDashboard 
            courses={courses} 
            onUpdateCourses={handleUpdateCourses}
            onRefreshCourses={handleRefreshCourses}
            onLogout={handleLogout}
            currentUser={user}
          />
        );

      default:
        return <div className="p-20 text-center text-slate-500">Page Not Found</div>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header
        currentView={currentView}
        setView={(v) => requireAuthForView(v)}
        user={user}
        progress={progress}
        onSyncNow={handleManualProgressSync}
        isSyncing={isRetryingProgressSync}
        onLogout={handleLogout}
        onLoginClick={() => {
          setAuthBanner(null);
          setCurrentView(ViewState.AUTH);
        }}
      />
      
      <main className="flex-grow">
        {(progressSyncError || progressRecoveryAvailable || progressSyncMessage) && (
          <div className={`mx-auto mt-4 flex max-w-7xl items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            progressSyncError || progressRecoveryAvailable
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-emerald-300 bg-emerald-50 text-emerald-900'
          }`}>
            <i className={`fa-solid shrink-0 ${
              progressSyncError || progressRecoveryAvailable
                ? 'fa-triangle-exclamation'
                : 'fa-circle-check'
            }`}></i>
            <p className="flex-1">
              {progressSyncError && (
                progressSyncMessage
                  ? `Your progress is still saved on this device. ${progressSyncMessage}`
                  : 'Your progress is saved on this device, but could not be synced to your account. Keep this page open and retry when your connection is available.'
              )}
              {progressRecoveryAvailable && 'A local progress backup was found with completed lessons missing from the cloud. It has been preserved in this browser as bitwise_progress_recovery_<username>; contact your instructor before clearing browser data.'}
              {!progressSyncError && !progressRecoveryAvailable && progressSyncMessage}
            </p>
            {progressSyncError && user?.uid && (
              <button
                type="button"
                disabled={isRetryingProgressSync}
                onClick={async () => {
                  setIsRetryingProgressSync(true);
                  setProgressSyncMessage('Retrying sync...');
                  const latestLocalProgress = getUserProgress(user.username);
                  setProgress(latestLocalProgress);
                  try {
                    await saveUserProgressToFirestore(
                      user.uid,
                      latestLocalProgress,
                      getPendingProgressSyncOptions(user.username)
                    );
                    const pendingSubmissions = getPendingSubmissionSyncs(
                      user.username,
                      latestLocalProgress.submissions || []
                    );
                    await recordSubmissionsInFirestore(user.uid, user.username, pendingSubmissions);
                    markSubmissionsSynced(user.username, pendingSubmissions);
                    const progressAfterSync = getUserProgress(user.username);
                    const hasNewerLocalChanges = progressAfterSync.updatedAt !== latestLocalProgress.updatedAt;
                    if (!hasNewerLocalChanges) clearPendingProgressSync(user.username);
                    setProgressSyncError(false);
                    setProgressSyncMessage(hasNewerLocalChanges
                      ? 'Sync complete. Newer local changes are still waiting to sync.'
                      : 'Progress synced to your account.');
                  } catch (error) {
                    console.error('Retrying progress synchronization failed:', error);
                    setProgressSyncError(true);
                    setProgressSyncMessage(getProgressSyncErrorMessage(error));
                  } finally {
                    setIsRetryingProgressSync(false);
                  }
                }}
                className="shrink-0 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isRetryingProgressSync ? 'Syncing...' : 'Retry'}
              </button>
            )}
          </div>
        )}
        {renderContent()}
      </main>

      {currentView !== ViewState.PLAYGROUND && currentView !== ViewState.PRACTICE && currentView !== ViewState.AUTH && currentView !== ViewState.ADMIN && currentView !== ViewState.COURSES && <Footer />}
    </div>
  );
};

export default App;

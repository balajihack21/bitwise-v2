import { UserProgress, SubmissionRecord, Course, Lesson, User } from '../types';
import { 
  saveUserProgressToFirestore, 
  loadUserProgressFromFirestore,
  recordSubmissionInFirestore 
} from './firebase';

const PROGRESS_STORAGE_PREFIX = 'bitwise_progress_';

export const getInitialProgress = (): UserProgress => {
  return {
    completedLessonIds: [],
    unlockedLessonIds: [], // default unlocked dynamically
    submissions: [],
    xp: 0,
    streakDays: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    tabSwitchCount: 0,
    focusLossCount: 0,
    testExitAttempts: 0,
  };
};

export const loadUserProgress = (userOrName: string | User = 'guest'): UserProgress => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  try {
    const raw = localStorage.getItem(`${PROGRESS_STORAGE_PREFIX}${username.toLowerCase()}`);
    if (raw) {
      const parsed: UserProgress = JSON.parse(raw);
      // Check streak
      const today = new Date().toISOString().split('T')[0];
      if (parsed.lastActiveDate !== today) {
        const lastDate = new Date(parsed.lastActiveDate);
        const currentDate = new Date(today);
        const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          parsed.streakDays = (parsed.streakDays || 1) + 1;
        } else if (diffDays > 1) {
          parsed.streakDays = 1;
        }
        parsed.lastActiveDate = today;
        saveUserProgress(username, parsed);
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading user progress:', e);
  }
  return getInitialProgress();
};

export const getUserProgress = loadUserProgress;

/**
 * Async fetch user progress from Firestore with localStorage fallback
 */
export const syncProgressWithFirestore = async (user: User | null): Promise<UserProgress> => {
  if (!user) return getInitialProgress();
  const userId = user.uid || user.username;
  
  try {
    if (user.uid) {
      const cloudProg = await loadUserProgressFromFirestore(user.uid);
      if (cloudProg) {
        localStorage.setItem(`${PROGRESS_STORAGE_PREFIX}${user.username.toLowerCase()}`, JSON.stringify(cloudProg));
        return cloudProg;
      }
    }
  } catch (e) {
    console.warn('Could not sync with Firestore, using local cache:', e);
  }

  const localProg = loadUserProgress(user.username);
  if (user.uid) {
    saveUserProgressToFirestore(user.uid, localProg).catch(() => {});
  }
  return localProg;
};

export function saveUserProgress(progressOrUser: string | User | UserProgress, progress?: UserProgress): void {
  try {
    let u = 'guest';
    let uid: string | undefined;
    let p: UserProgress;

    if (typeof progressOrUser === 'string') {
      u = progressOrUser;
      p = progress || getInitialProgress();
    } else if (progressOrUser && 'username' in progressOrUser && !('completedLessonIds' in progressOrUser)) {
      u = progressOrUser.username;
      uid = progressOrUser.uid;
      p = progress || getInitialProgress();
    } else {
      p = progressOrUser as UserProgress;
    }

    localStorage.setItem(`${PROGRESS_STORAGE_PREFIX}${u.toLowerCase()}`, JSON.stringify(p));

    // Async sync to Firestore if UID available
    if (uid) {
      saveUserProgressToFirestore(uid, p).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving user progress:', e);
  }
}

export const resetUserProgress = (username: string = 'guest'): UserProgress => {
  const initial = getInitialProgress();
  try {
    localStorage.removeItem(`${PROGRESS_STORAGE_PREFIX}${username.toLowerCase()}`);
  } catch (e) {
    console.error('Error resetting user progress:', e);
  }
  return initial;
};

/**
 * Helper to check if a user is an instructor assigned to a course
 */
export const isInstructorForCourse = (user?: User | null, course?: Course | null): boolean => {
  if (!user || user.role !== 'instructor' || !course) return false;
  const uEmail = user.email?.toLowerCase().trim();
  const cEmail = course.assignedInstructorEmail?.toLowerCase().trim();
  if (uEmail && cEmail && uEmail === cEmail) return true;
  if (user.uid && course.assignedInstructorId && user.uid === course.assignedInstructorId) return true;
  if (user.assignedCourseIds?.includes(course.id)) return true;
  return false;
};

/**
 * Checks if a specific lesson or problem is unlocked.
 * Sequential rule:
 * 1. An assigned instructor testing their course has ALL lessons unlocked.
 * 2. The very first lesson of the first module of a course is ALWAYS unlocked.
 * 3. Any subsequent lesson is unlocked if the immediate PREVIOUS lesson in the module/course is completed.
 * 4. Or if explicitly in unlockedLessonIds.
 */
export const getEffectiveModuleDeadline = (
  user: User | null | undefined,
  course: Course,
  moduleId: string
): string | undefined => {
  const targetModule = course.modules?.find(m => m.id === moduleId);
  const override = user?.moduleDeadlineOverrides?.[course.id]?.[moduleId];
  return override || targetModule?.endDate;
};

export const isLessonUnlocked = (
  lessonId: string,
  course: Course,
  progress: UserProgress,
  user?: User | null
): boolean => {
  // Allow only Instructor to access any lesson in their assigned course without locks
  if (isInstructorForCourse(user, course)) {
    return true;
  }

  if (!progress) return true;
  if (progress.completedLessonIds?.includes(lessonId) || progress.unlockedLessonIds?.includes(lessonId)) {
    return true;
  }

  // Find lesson index
  const allLessons: Lesson[] = [];
  course.modules?.forEach(m => {
    m.lessons?.forEach(l => allLessons.push(l));
  });
  const lessonIndex = allLessons.findIndex(l => l.id === lessonId);
  if (lessonIndex === -1) return true;
  if (lessonIndex === 0) return true;

  const prevLesson = allLessons[lessonIndex - 1];
  const prevModule = course.modules?.find(m => m.lessons?.some(l => l.id === prevLesson.id));
  const currentModule = course.modules?.find(m => m.lessons?.some(l => l.id === lessonId));
  const previousModuleDeadline = prevModule ? getEffectiveModuleDeadline(user, course, prevModule.id) : undefined;
  const currentModuleDeadline = currentModule ? getEffectiveModuleDeadline(user, course, currentModule.id) : undefined;

  // If previous module deadline crossed, unlock first lesson of next module
  if (prevModule && previousModuleDeadline && new Date(previousModuleDeadline) < new Date()) {
    if (currentModule && currentModule.id !== prevModule.id) {
      // First lesson of next active module after passed module should be unlocked
      const isFirstInModule = currentModule.lessons[0]?.id === lessonId;
      if (isFirstInModule) return true;
    }
  }

  // Normal sequential unlock: previous lesson completed
  return progress.completedLessonIds?.includes(prevLesson.id) || false;
};

/**
 * Gets the next lesson after the given lessonId in a course
 */
export const getNextLesson = (course: Course, currentLessonId: string, user?: User | null): Lesson | null => {
  const isInstructor = isInstructorForCourse(user, course);
  const allLessons: Lesson[] = [];
  course.modules?.forEach(m => {
    m.lessons?.forEach(l => allLessons.push(l));
  });

  const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
  if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
    const nextL = allLessons[currentIndex + 1];
    // Instructors bypass deadline blocks on assigned course
    if (isInstructor) {
      return nextL;
    }
    // If current module is deadline-passed, do not allow moving to next lesson in that module
    const currentModule = course.modules?.find(m => m.lessons?.some(l => l.id === currentLessonId));
    const currentModuleDeadline = currentModule ? getEffectiveModuleDeadline(user, course, currentModule.id) : undefined;
    if (currentModule && currentModuleDeadline && new Date(currentModuleDeadline) < new Date()) {
      const nextModule = course.modules?.find(m => m.lessons?.some(l => l.id === nextL.id));
      if (nextModule && nextModule.id === currentModule.id) {
        return null; // Block next lesson within same passed module
      }
    }
    return nextL;
  }
  return null;
};

/**
 * Test Helper: Instantly complete all lessons and problems in a course for instructor testing
 */
export const completeAllCourseLessons = (
  userOrName: string | User = 'guest',
  course: Course
): UserProgress => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  const currentProgress = loadUserProgress(username);
  
  const allLessonIds: string[] = [];
  let totalXpToAdd = 0;
  course.modules?.forEach(m => {
    m.lessons?.forEach(l => {
      allLessonIds.push(l.id);
      if (!currentProgress.completedLessonIds?.includes(l.id)) {
        totalXpToAdd += (l.problem?.points || 25);
      }
    });
  });

  const mergedCompleted = Array.from(new Set([...(currentProgress.completedLessonIds || []), ...allLessonIds]));
  const updatedProgress: UserProgress = {
    ...currentProgress,
    completedLessonIds: mergedCompleted,
    unlockedLessonIds: Array.from(new Set([...(currentProgress.unlockedLessonIds || []), ...allLessonIds])),
    xp: (currentProgress.xp || 0) + totalXpToAdd,
    lastActiveDate: new Date().toISOString().split('T')[0]
  };

  saveUserProgress(userOrName, updatedProgress);
  return updatedProgress;
};

/**
 * Test Helper: Reset progress for a specific course
 */
export const resetCourseProgress = (
  userOrName: string | User = 'guest',
  course: Course
): UserProgress => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  const currentProgress = loadUserProgress(username);

  const courseLessonIds = new Set<string>();
  course.modules?.forEach(m => {
    m.lessons?.forEach(l => courseLessonIds.add(l.id));
  });

  const updatedProgress: UserProgress = {
    ...currentProgress,
    completedLessonIds: (currentProgress.completedLessonIds || []).filter(id => !courseLessonIds.has(id)),
    unlockedLessonIds: (currentProgress.unlockedLessonIds || []).filter(id => !courseLessonIds.has(id)),
    submissions: (currentProgress.submissions || []).filter(s => s.courseId !== course.id)
  };

  saveUserProgress(userOrName, updatedProgress);
  return updatedProgress;
};

/**
 * Records a successful lesson / problem completion
 */
export const recordCompletion = (
  userOrName: string | User = 'guest',
  lessonId: string,
  course: Course,
  earnedXp: number = 50
): { updatedProgress: UserProgress; newlyUnlockedLesson: Lesson | null } => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  const uid = typeof userOrName === 'object' ? userOrName?.uid : undefined;
  
  const currentProgress = loadUserProgress(username);
  
  const isAlreadyCompleted = currentProgress.completedLessonIds?.includes(lessonId);
  const nextLesson = getNextLesson(course, lessonId);

  const completed = isAlreadyCompleted
    ? (currentProgress.completedLessonIds || [])
    : [...(currentProgress.completedLessonIds || []), lessonId];

  const unlocked = [...(currentProgress.unlockedLessonIds || [])];
  if (nextLesson && !unlocked.includes(nextLesson.id)) {
    unlocked.push(nextLesson.id);
  }

  const updatedProgress: UserProgress = {
    ...currentProgress,
    completedLessonIds: completed,
    unlockedLessonIds: unlocked,
    xp: isAlreadyCompleted ? currentProgress.xp : (currentProgress.xp || 0) + earnedXp,
    lastActiveDate: new Date().toISOString().split('T')[0]
  };

  saveUserProgress(username, updatedProgress);
  if (uid) {
    saveUserProgressToFirestore(uid, updatedProgress).catch(() => {});
  }

  return {
    updatedProgress,
    newlyUnlockedLesson: nextLesson
  };
};

/**
 * Adds a submission record to user's history and persists to Firestore
 */
export const addSubmission = (
  userOrName: string | User = 'guest',
  submission: SubmissionRecord
): UserProgress => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  const uid = typeof userOrName === 'object' ? userOrName?.uid : undefined;

  const currentProgress = loadUserProgress(username);
  const updatedSubmissions = [submission, ...(currentProgress.submissions || [])].slice(0, 50); // Keep latest 50

  const updatedProgress: UserProgress = {
    ...currentProgress,
    submissions: updatedSubmissions
  };

  saveUserProgress(username, updatedProgress);
  
  if (uid) {
    saveUserProgressToFirestore(uid, updatedProgress).catch(() => {});
    recordSubmissionInFirestore(uid, username, submission).catch(() => {});
  } else {
    recordSubmissionInFirestore('guest', username, submission).catch(() => {});
  }

  return updatedProgress;
};

/**
 * Calculate course progress percentage and stats
 */
export const getCourseProgress = (course: Course, progress: UserProgress) => {
  const allLessons: Lesson[] = [];
  course.modules?.forEach(m => {
    m.lessons?.forEach(l => allLessons.push(l));
  });

  const total = allLessons.length;
  if (total === 0) return { total: 0, completed: 0, percentage: 0, problemsSolved: 0, totalProblems: 0, isComplete: false };

  const completedLessonIds = progress?.completedLessonIds || [];
  const completedCount = allLessons.filter(l => completedLessonIds.includes(l.id)).length;
  const problems = allLessons.filter(l => l.type === 'problem');
  const problemsSolved = problems.filter(l => completedLessonIds.includes(l.id)).length;

  return {
    total,
    completed: completedCount,
    percentage: Math.round((completedCount / total) * 100),
    problemsSolved,
    totalProblems: problems.length,
    isComplete: completedCount === total && total > 0
  };
};

/**
 * Record proctoring infraction (tab switch, window blur, or test exit attempt)
 */
export const recordProctoringInfraction = (
  userOrName: string | User = 'guest',
  type: 'tab_switch' | 'focus_loss' | 'exit_attempt'
): UserProgress => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  const uid = typeof userOrName === 'object' ? userOrName?.uid : undefined;

  const currentProgress = loadUserProgress(username);
  const updatedProgress: UserProgress = {
    ...currentProgress,
    tabSwitchCount: type === 'tab_switch' ? (currentProgress.tabSwitchCount || 0) + 1 : (currentProgress.tabSwitchCount || 0),
    focusLossCount: type === 'focus_loss' || type === 'tab_switch' ? (currentProgress.focusLossCount || 0) + 1 : (currentProgress.focusLossCount || 0),
    testExitAttempts: type === 'exit_attempt' ? (currentProgress.testExitAttempts || 0) + 1 : (currentProgress.testExitAttempts || 0),
  };

  saveUserProgress(username, updatedProgress);
  if (uid) {
    saveUserProgressToFirestore(uid, updatedProgress).catch(() => {});
  }
  return updatedProgress;
};

/**
 * Reset a user's progress for a specific course
 */
export const resetUserCourseProgress = (
  userOrName: string | User = 'guest',
  courseId: string,
  course: Course
): UserProgress => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  const uid = typeof userOrName === 'object' ? userOrName?.uid : undefined;

  const currentProgress = loadUserProgress(username);
  
  // Extract all lesson IDs belonging to this course
  const courseLessonIds: string[] = [];
  course.modules?.forEach(m => {
    m.lessons?.forEach(l => courseLessonIds.push(l.id));
  });

  const remainingCompleted = (currentProgress.completedLessonIds || []).filter(
    id => !courseLessonIds.includes(id)
  );

  const remainingUnlocked = (currentProgress.unlockedLessonIds || []).filter(
    id => !courseLessonIds.includes(id)
  );

  const remainingSubmissions = (currentProgress.submissions || []).filter(
    s => s.courseId !== courseId && !courseLessonIds.includes(s.problemId)
  );

  const updatedProgress: UserProgress = {
    ...currentProgress,
    completedLessonIds: remainingCompleted,
    unlockedLessonIds: remainingUnlocked,
    submissions: remainingSubmissions,
    lastActiveDate: new Date().toISOString().split('T')[0]
  };

  saveUserProgress(username, updatedProgress);
  if (uid) {
    saveUserProgressToFirestore(uid, updatedProgress).catch(() => {});
  }

  // Notify any active views/listeners
  try {
    window.dispatchEvent(new CustomEvent('bitwise_progress_updated', {
      detail: { username, uid, courseId }
    }));
  } catch (e) {}

  return updatedProgress;
};


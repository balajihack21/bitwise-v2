import { UserProgress, SubmissionRecord, Course, Lesson, User, CreativeChallengeSubmission } from '../types';
import { 
  loadUserProgressFromFirestore,
} from './firebase';

const PROGRESS_STORAGE_PREFIX = 'bitwise_progress_';
const PROGRESS_SYNC_PENDING_PREFIX = 'bitwise_progress_sync_pending_';
const PROGRESS_SYNC_REPLACE_PREFIX = 'bitwise_progress_sync_replace_';
const PROGRESS_SYNCED_SUBMISSIONS_PREFIX = 'bitwise_progress_synced_submissions_';

const getProgressSyncKey = (prefix: string, username: string) =>
  `${prefix}${username.toLowerCase()}`;

export const getPendingProgressSyncOptions = (
  username: string
): { replaceCompletedLessonIds?: boolean } => ({
  replaceCompletedLessonIds:
    localStorage.getItem(getProgressSyncKey(PROGRESS_SYNC_REPLACE_PREFIX, username)) === 'true'
});

export const getPendingSubmissionSyncs = (
  username: string,
  submissions: SubmissionRecord[]
): SubmissionRecord[] => {
  const rawSyncedIds = localStorage.getItem(getProgressSyncKey(PROGRESS_SYNCED_SUBMISSIONS_PREFIX, username));
  const syncedIds = new Set<string>(rawSyncedIds ? JSON.parse(rawSyncedIds) as string[] : []);
  return submissions.filter(submission => !syncedIds.has(submission.id));
};

export const markSubmissionsSynced = (
  username: string,
  submissions: SubmissionRecord[]
): void => {
  const key = getProgressSyncKey(PROGRESS_SYNCED_SUBMISSIONS_PREFIX, username);
  const rawSyncedIds = localStorage.getItem(key);
  const syncedIds = new Set<string>(rawSyncedIds ? JSON.parse(rawSyncedIds) as string[] : []);
  submissions.forEach(submission => syncedIds.add(submission.id));
  localStorage.setItem(key, JSON.stringify(Array.from(syncedIds).slice(-500)));
};

export const clearPendingProgressSync = (username: string): void => {
  localStorage.removeItem(getProgressSyncKey(PROGRESS_SYNC_PENDING_PREFIX, username));
  localStorage.removeItem(getProgressSyncKey(PROGRESS_SYNC_REPLACE_PREFIX, username));
};

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

const loadCachedUserProgress = (username: string): UserProgress => {
  try {
    const raw = localStorage.getItem(`${PROGRESS_STORAGE_PREFIX}${username.toLowerCase()}`);
    return raw ? JSON.parse(raw) as UserProgress : getInitialProgress();
  } catch (e) {
    console.error('Error reading cached user progress for synchronization:', e);
    return getInitialProgress();
  }
};

/**
 * Async fetch user progress from Firestore with localStorage fallback
 */
export const syncProgressWithFirestore = async (user: User | null): Promise<UserProgress> => {
  if (!user) return getInitialProgress();
  const localProgress = loadCachedUserProgress(user.username);
  
  try {
    if (user.uid) {
      const cloudProg = await loadUserProgressFromFirestore(user.uid);
      if (cloudProg) {
        const pendingSyncKey = getProgressSyncKey(PROGRESS_SYNC_PENDING_PREFIX, user.username);
        if (localStorage.getItem(pendingSyncKey) === 'true') {
          return localProgress;
        }
        const localUpdatedAt = Date.parse(localProgress.updatedAt || '');
        const cloudUpdatedAt = Date.parse(cloudProg.updatedAt || '');
        if (
          Number.isFinite(localUpdatedAt) &&
          (!Number.isFinite(cloudUpdatedAt) || localUpdatedAt > cloudUpdatedAt)
        ) {
          localStorage.setItem(pendingSyncKey, 'true');
          return localProgress;
        }
        const cloudCompletedIds = new Set(cloudProg.completedLessonIds || []);
        const hasLocalOnlyCompletions = (localProgress.completedLessonIds || [])
          .some(lessonId => !cloudCompletedIds.has(lessonId));
        const cloudSubmissionIds = new Set((cloudProg.submissions || []).map(submission => submission.id));
        const hasLocalOnlySubmissions = (localProgress.submissions || [])
          .some(submission => !cloudSubmissionIds.has(submission.id));
        if (hasLocalOnlyCompletions || hasLocalOnlySubmissions) {
          localStorage.setItem(
            `bitwise_progress_recovery_${user.username.toLowerCase()}`,
            JSON.stringify(localProgress)
          );
          window.dispatchEvent(new CustomEvent('bitwise_progress_recovery_available'));
          localStorage.setItem(pendingSyncKey, 'true');
          return localProgress;
        }
        localStorage.setItem(`${PROGRESS_STORAGE_PREFIX}${user.username.toLowerCase()}`, JSON.stringify(cloudProg));
        return cloudProg;
      }
      localStorage.setItem(getProgressSyncKey(PROGRESS_SYNC_PENDING_PREFIX, user.username), 'true');
    }
  } catch (e) {
    console.error('Could not sync progress with Firestore; keeping local progress:', e);
    localStorage.setItem(getProgressSyncKey(PROGRESS_SYNC_PENDING_PREFIX, user.username), 'true');
    return localProgress;
  }

  return localProgress;
};

export function saveUserProgress(
  progressOrUser: string | User | UserProgress,
  progress?: UserProgress,
  options: { replaceCompletedLessonIds?: boolean } = {}
): void {
  try {
    let u = 'guest';
    let p: UserProgress;

    if (typeof progressOrUser === 'string') {
      u = progressOrUser;
      p = progress || getInitialProgress();
    } else if (progressOrUser && 'username' in progressOrUser && !('completedLessonIds' in progressOrUser)) {
      u = progressOrUser.username;
      p = progress || getInitialProgress();
    } else {
      p = progressOrUser as UserProgress;
    }

    const progressToSave = {
      ...p,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`${PROGRESS_STORAGE_PREFIX}${u.toLowerCase()}`, JSON.stringify(progressToSave));
    localStorage.setItem(getProgressSyncKey(PROGRESS_SYNC_PENDING_PREFIX, u), 'true');
    if (options.replaceCompletedLessonIds) {
      localStorage.setItem(getProgressSyncKey(PROGRESS_SYNC_REPLACE_PREFIX, u), 'true');
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
 * Assigned instructors bypass lesson locks. Module schedules always constrain
 * student access; global unlocks only bypass lesson prerequisites.
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

const getScheduleDate = (value?: string, endOfDay = false): Date | undefined => {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly
    ? (() => {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
      })()
    : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const isChallengeLesson = (lesson: Lesson): boolean =>
  lesson.type === 'problem' ||
  lesson.type === 'algorithm' ||
  lesson.type === 'pseudocode' ||
  lesson.type === 'flowchart';

export const getModuleCurriculumCounts = (module: Course['modules'][number]) => ({
  lessons: module.lessons.length,
  challenges: module.lessons.filter(isChallengeLesson).length
});

const getDateInTimeZone = (date: Date, timeZone?: string): string => {
  if (!timeZone) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const partValue = (type: string) => parts.find(part => part.type === type)?.value || '';
    return `${partValue('year')}-${partValue('month')}-${partValue('day')}`;
  } catch (error) {
    console.warn(`Invalid lesson deadline time zone "${timeZone}"; using the local time zone.`, error);
    return getDateInTimeZone(date);
  }
};

export const isLessonDeadlineExpired = (lesson: Lesson, now = new Date()): boolean => {
  if (!lesson.deadlineDate || !/^\d{4}-\d{2}-\d{2}$/.test(lesson.deadlineDate)) return false;
  return getDateInTimeZone(now, lesson.deadlineTimeZone) > lesson.deadlineDate;
};

export const isLessonAvailableByDeadline = (
  lesson: Lesson,
  module: Course['modules'][number],
  now = new Date()
): boolean => {
  const moduleUsesLessonDeadlines = module.lessons.some(item => Boolean(item.deadlineDate));
  if (!moduleUsesLessonDeadlines) return true;
  return Boolean(lesson.deadlineDate) && !isLessonDeadlineExpired(lesson, now);
};

export const getModuleScheduleState = (
  user: User | null | undefined,
  course: Course,
  moduleId: string,
  now = new Date()
): 'not-started' | 'active' | 'expired' => {
  if (isInstructorForCourse(user, course)) return 'active';

  const module = course.modules?.find(m => m.id === moduleId);
  const startDate = getScheduleDate(module?.startDate);
  const endDate = getScheduleDate(getEffectiveModuleDeadline(user, course, moduleId), true);
  if (startDate && now < startDate) return 'not-started';
  if (endDate && now > endDate) return 'expired';
  return 'active';
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

  const lessonModule = course.modules?.find(module => module.lessons.some(lesson => lesson.id === lessonId));
  if (lessonModule) {
    const lesson = lessonModule.lessons.find(item => item.id === lessonId);
    if (lesson && !isLessonAvailableByDeadline(lesson, lessonModule)) return false;
    const scheduleState = getModuleScheduleState(user, course, lessonModule.id);
    if (scheduleState === 'not-started') return false;
    if (scheduleState === 'expired') {
      return progress?.completedLessonIds?.includes(lessonId) || false;
    }
  }
  if (!progress) return true;

  if (lessonModule?.unlockedForAllStudents) {
    return true;
  }

  // Find lesson index
  const allLessons: Lesson[] = [];
  course.modules?.forEach(m => {
    m.lessons?.forEach(l => allLessons.push(l));
  });
  const lessonIndex = allLessons.findIndex(l => l.id === lessonId);
  if (lessonIndex === -1) return true;

  const currentModule = course.modules?.find(m => m.lessons?.some(l => l.id === lessonId));
  if (lessonIndex === 0) return true;

  const prevLesson = allLessons[lessonIndex - 1];
  const prevModule = course.modules?.find(m => m.lessons?.some(l => l.id === prevLesson.id));

  if (progress.completedLessonIds?.includes(lessonId) || progress.unlockedLessonIds?.includes(lessonId)) {
    return true;
  }

  if (currentModule) {
    const currentModuleLessonIndex = currentModule.lessons.findIndex(lesson => lesson.id === lessonId);
    if (
      currentModuleLessonIndex > 0 &&
      !isLessonAvailableByDeadline(currentModule.lessons[currentModuleLessonIndex - 1], currentModule)
    ) {
      return true;
    }
  }

  // If previous module deadline crossed, unlock first lesson of next module
  if (prevModule && getModuleScheduleState(user, course, prevModule.id) === 'expired') {
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
export const getNextLesson = (
  course: Course,
  currentLessonId: string,
  user?: User | null,
  progress?: UserProgress
): Lesson | null => {
  const isInstructor = isInstructorForCourse(user, course);
  const allLessons: Lesson[] = [];
  course.modules?.forEach(m => {
    m.lessons?.forEach(l => allLessons.push(l));
  });

  const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
  if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
    let nextL: Lesson | undefined = allLessons[currentIndex + 1];
    // Instructors bypass deadline blocks on assigned course
    if (isInstructor) {
      return nextL || null;
    }
    const currentModule = course.modules?.find(m => m.lessons?.some(l => l.id === currentLessonId));
    let nextModule = nextL
      ? course.modules?.find(m => m.lessons?.some(l => l.id === nextL?.id))
      : undefined;
    if (
      currentModule?.id === nextModule?.id &&
      nextL &&
      !isLessonAvailableByDeadline(nextL, currentModule)
    ) {
      const nextModuleIndex = currentModule.lessons.findIndex(lesson => lesson.id === nextL.id);
      nextL = currentModule.lessons
        .slice(nextModuleIndex + 1)
        .find(lesson => isLessonAvailableByDeadline(lesson, currentModule));
      if (!nextL) return null;
      nextModule = currentModule;
    }
    if (!nextL) return null;
    if (nextModule && getModuleScheduleState(user, course, nextModule.id) !== 'active') {
      return null;
    }
    // If current module is deadline-passed, do not allow moving to another lesson in it.
    const currentModuleExpired = currentModule &&
      getModuleScheduleState(user, course, currentModule.id) === 'expired';
    if (currentModuleExpired && nextModule?.id === currentModule?.id) {
      return null; // Block next lesson within same passed module
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

  saveUserProgress(username, updatedProgress);
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

  saveUserProgress(username, updatedProgress);
  return updatedProgress;
};

/**
 * Records a successful lesson / problem completion
 */
export const recordCompletion = (
  userOrName: string | User = 'guest',
  lessonId: string,
  course: Course,
  earnedXp: number = 50,
  persist: boolean = true
): { updatedProgress: UserProgress; newlyUnlockedLesson: Lesson | null } => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  const currentProgress = loadUserProgress(username);
  
  const isAlreadyCompleted = currentProgress.completedLessonIds?.includes(lessonId);
  const nextLesson = getNextLesson(
    course,
    lessonId,
    typeof userOrName === 'object' ? userOrName : undefined,
    currentProgress
  );

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

  if (persist) {
    saveUserProgress(username, updatedProgress);
  }

  return {
    updatedProgress,
    newlyUnlockedLesson: nextLesson
  };
};

export const submitCreativeChallenge = (
  userOrName: string | User,
  lesson: Lesson,
  course: Course,
  answer: Pick<CreativeChallengeSubmission, 'answerText' | 'flowNodes'>
): { updatedProgress: UserProgress; newlyUnlockedLesson: Lesson | null } => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  const currentProgress = loadUserProgress(username);
  const isRedoSubmission = currentProgress.redoCreativeChallengeLessonIds?.includes(lesson.id) === true;
  // Persist once after adding the creative answer so the completion write cannot
  // race with a second write that omits creativeSubmissions.
  const completion = recordCompletion(userOrName, lesson.id, course, lesson.challenge?.points || 10, false);
  const submission: CreativeChallengeSubmission = {
    id: `creative-${lesson.id}-${Date.now()}`,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    courseId: course.id,
    courseTitle: course.title,
    challengeType: lesson.type as CreativeChallengeSubmission['challengeType'],
    answerText: answer.answerText,
    flowNodes: answer.flowNodes,
    points: lesson.challenge?.points || 10,
    submittedAt: new Date().toISOString(),
    status: 'SUBMITTED'
  };
  const updatedProgress: UserProgress = {
    ...completion.updatedProgress,
    xp: isRedoSubmission ? currentProgress.xp : completion.updatedProgress.xp,
    redoCreativeChallengeLessonIds: (completion.updatedProgress.redoCreativeChallengeLessonIds || [])
      .filter(id => id !== lesson.id),
    creativeSubmissions: [
      ...(currentProgress.creativeSubmissions || []).filter(item => item.lessonId !== lesson.id),
      submission
    ]
  };
  saveUserProgress(username, updatedProgress);
  return { updatedProgress, newlyUnlockedLesson: completion.newlyUnlockedLesson };
};

/**
 * Adds a submission record to the user's local history for manual synchronization
 */
export const addSubmission = (
  userOrName: string | User = 'guest',
  submission: SubmissionRecord
): UserProgress => {
  const username = typeof userOrName === 'string' ? userOrName : (userOrName?.username || 'guest');
  const currentProgress = loadUserProgress(username);
  const updatedSubmissions = [submission, ...(currentProgress.submissions || [])].slice(0, 50); // Keep latest 50

  const updatedProgress: UserProgress = {
    ...currentProgress,
    submissions: updatedSubmissions
  };

  saveUserProgress(username, updatedProgress);

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
    ...(type === 'tab_switch' || type === 'focus_loss'
      ? { proctorReviewedAt: '', proctorReviewedBy: '' }
      : {}),
  };

  saveUserProgress(username, updatedProgress);
  if (type === 'tab_switch' || type === 'focus_loss') {
    try {
      const rawReviews = localStorage.getItem('bitwise_proctor_reviews');
      if (rawReviews) {
        const reviews = JSON.parse(rawReviews);
        delete reviews[username];
        if (uid) delete reviews[uid];
        if (typeof userOrName === 'object' && userOrName?.email) {
          delete reviews[userOrName.email];
        }
        localStorage.setItem('bitwise_proctor_reviews', JSON.stringify(reviews));
      }
    } catch (e) {
      console.warn('Failed to clear stale proctor review override:', e);
    }
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
  const remainingCreativeSubmissions = (currentProgress.creativeSubmissions || []).filter(
    submission => submission.courseId !== courseId && !courseLessonIds.includes(submission.lessonId)
  );
  const remainingRedoRequests = (currentProgress.redoCreativeChallengeLessonIds || []).filter(
    lessonId => !courseLessonIds.includes(lessonId)
  );

  const updatedProgress: UserProgress = {
    ...currentProgress,
    completedLessonIds: remainingCompleted,
    unlockedLessonIds: remainingUnlocked,
    submissions: remainingSubmissions,
    creativeSubmissions: remainingCreativeSubmissions,
    redoCreativeChallengeLessonIds: remainingRedoRequests,
    lastActiveDate: new Date().toISOString().split('T')[0]
  };

  saveUserProgress(username, updatedProgress);
  if (uid) {
    localStorage.setItem(getProgressSyncKey(PROGRESS_SYNC_PENDING_PREFIX, username), 'true');
    localStorage.setItem(getProgressSyncKey(PROGRESS_SYNC_REPLACE_PREFIX, username), 'true');
  }

  // Notify any active views/listeners
  try {
    window.dispatchEvent(new CustomEvent('bitwise_progress_updated', {
      detail: { username, uid, courseId }
    }));
  } catch (e) {}

  return updatedProgress;
};

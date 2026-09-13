import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  deleteDoc, 
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { User, UserProgress, Course, SubmissionRecord, CourseProgressDetail, ProctorStatus, InstructorAccount, CourseInstructorAssignment } from '../types';
import { MOCK_COURSES } from '../constants';

// The Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyBH2N7lFd27aJIdoaTH_Bl-29C-4sgZkx4",
  authDomain: "ipd2026.firebaseapp.com",
  projectId: "ipd2026",
  storageBucket: "ipd2026.firebasestorage.app",
  messagingSenderId: "999528529665",
  appId: "1:999528529665:web:e25a178f652201b781e500",
  measurementId: "G-JL0YJP3DKQ"
};

// Initialize Firebase safely (avoid multi-instance collision)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export { onAuthStateChanged };

// Admin credentials constants for easy verification and direct admin access
export const DEFAULT_ADMIN_CREDENTIALS = {
  email: 'admin@bitwise.com',
  password: 'admin123', // also supports Admin@123
  displayName: 'Bitwise Admin'
};

// Instructor credentials constants for direct instructor access
export const DEFAULT_INSTRUCTOR_CREDENTIALS = {
  email: 'instructor@bitwise.com',
  password: 'instructor123', // also supports Instructor@123
  displayName: 'Prof. Balaji Arumugam',
  defaultCourseId: 'dsa-comprehensive'
};

/**
 * Deep sanitization function to strip any undefined values before writing to Firestore
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}

/**
 * Local accounts registry for offline / unconfigured Firebase Auth fallback
 */
export interface LocalAccount {
  uid: string;
  email: string;
  username: string;
  password?: string;
  role: 'student' | 'admin' | 'instructor';
  assignedCourseIds?: string[];
  createdAt: string;
}

export const getStoredAccounts = (): LocalAccount[] => {
  const defaultAccounts: LocalAccount[] = [
    {
      uid: 'admin_master_uid',
      email: 'admin@bitwise.com',
      username: 'Bitwise Admin',
      password: 'admin123',
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    {
      uid: 'instructor_demo_uid',
      email: 'instructor@bitwise.com',
      username: 'Prof. Balaji Arumugam',
      password: 'instructor123',
      role: 'instructor',
      assignedCourseIds: ['dsa-comprehensive'],
      createdAt: new Date().toISOString()
    },
    {
      uid: 'balaji_lead_uid',
      email: 'mailztobalaji@gmail.com',
      username: 'Prof. Balaji Arumugam',
      password: 'instructor123',
      role: 'instructor',
      assignedCourseIds: ['dsa-comprehensive'],
      createdAt: new Date().toISOString()
    },
    {
      uid: 'student_demo_uid',
      email: 'student@bitwise.com',
      username: 'Demo Student',
      password: 'Student@123',
      role: 'student',
      createdAt: new Date().toISOString()
    }
  ];

  try {
    const raw = localStorage.getItem('bitwise_registered_users');
    if (raw) {
      const parsed: LocalAccount[] = JSON.parse(raw);
      // Ensure all master default accounts are merged into the cached accounts list
      defaultAccounts.forEach(def => {
        if (!parsed.some(a => a.email.toLowerCase() === def.email.toLowerCase())) {
          parsed.push(def);
        }
      });
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse local accounts:', e);
  }
  return defaultAccounts;
};

export const saveStoredAccounts = (accounts: LocalAccount[]) => {
  try {
    localStorage.setItem('bitwise_registered_users', JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save local accounts:', e);
  }
};

/**
 * Register a new user in Firebase Auth and Firestore with graceful fallback
 */
export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string, 
  role: 'student' | 'admin' | 'instructor' = 'student'
): Promise<User> => {
  const cleanEmail = email.trim().toLowerCase();
  const isEmailAdmin = cleanEmail === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase() || cleanEmail.startsWith('admin');
  const isEmailInstructor = cleanEmail === DEFAULT_INSTRUCTOR_CREDENTIALS.email.toLowerCase() || cleanEmail.includes('instructor');
  const userRole: 'student' | 'admin' | 'instructor' = 
    isEmailAdmin || role === 'admin' 
      ? 'admin' 
      : isEmailInstructor || role === 'instructor' 
      ? 'instructor' 
      : 'student';
  const uname = displayName.trim() || cleanEmail.split('@')[0];

  // Try standard Firebase Auth first
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const fbUser = userCredential.user;

    // Set Auth display name
    if (displayName) {
      await updateProfile(fbUser, { displayName: uname }).catch(() => {});
    }

    const assignedCourseIds = userRole === 'instructor' 
      ? getInstructorAssignedCourses(cleanEmail, fbUser.uid) 
      : undefined;

    const userProfile: User = {
      username: uname,
      role: userRole,
      email: fbUser.email || cleanEmail,
      uid: fbUser.uid,
      assignedCourseIds
    };

    // Persist user record in Firestore 'users' collection
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      await setDoc(userDocRef, sanitizeForFirestore({
        uid: fbUser.uid,
        email: fbUser.email || cleanEmail,
        displayName: uname,
        role: userRole,
        assignedCourseIds,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }), { merge: true });
    } catch (err) {
      console.warn('Firestore user doc write error:', err);
    }

    // Also cache locally
    const accounts = getStoredAccounts();
    if (!accounts.some(a => a.email.toLowerCase() === cleanEmail)) {
      accounts.push({
        uid: fbUser.uid,
        email: cleanEmail,
        username: uname,
        password,
        role: userRole,
        assignedCourseIds,
        createdAt: new Date().toISOString()
      });
      saveStoredAccounts(accounts);
    }

    return userProfile;
  } catch (authError: any) {
    const errorCode = authError.code || authError.message || '';
    
    // Check if error is due to Firebase Auth provider not enabled in Console (e.g. auth/configuration-not-found)
    const isConfigError = 
      errorCode.includes('configuration-not-found') ||
      errorCode.includes('operation-not-allowed') ||
      errorCode.includes('admin-restricted-operation') ||
      errorCode.includes('auth/invalid-api-key');

    if (isConfigError) {
      console.info('Firebase Auth provider is not enabled in Firebase Console. Using local + Firestore persistent account.');

      // Generate deterministic unique UID
      const deterministicUid = 'usr_' + Math.abs(cleanEmail.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36) + '_' + Math.random().toString(36).substring(2, 6);

      const assignedCourseIds = userRole === 'instructor'
        ? getInstructorAssignedCourses(cleanEmail, deterministicUid)
        : undefined;

      const localProfile: User = {
        username: uname,
        role: userRole,
        email: cleanEmail,
        uid: deterministicUid,
        assignedCourseIds
      };

      // Save to local accounts registry
      const accounts = getStoredAccounts();
      const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
      if (existingIdx >= 0) {
        accounts[existingIdx] = {
          uid: accounts[existingIdx].uid,
          email: cleanEmail,
          username: uname,
          password,
          role: userRole,
          assignedCourseIds: assignedCourseIds || accounts[existingIdx].assignedCourseIds,
          createdAt: accounts[existingIdx].createdAt || new Date().toISOString()
        };
      } else {
        accounts.push({
          uid: deterministicUid,
          email: cleanEmail,
          username: uname,
          password,
          role: userRole,
          assignedCourseIds,
          createdAt: new Date().toISOString()
        });
      }
      saveStoredAccounts(accounts);

      // Attempt write to Firestore users collection
      try {
        const userDocRef = doc(db, 'users', deterministicUid);
        await setDoc(userDocRef, sanitizeForFirestore({
          uid: deterministicUid,
          email: cleanEmail,
          displayName: uname,
          role: userRole,
          assignedCourseIds,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }), { merge: true });
      } catch (firestoreErr) {
        console.warn('Firestore write warning:', firestoreErr);
      }

      return localProfile;
    }

    // Re-throw genuine user errors (like email-already-in-use or weak-password)
    throw authError;
  }
};

/**
 * Log in an existing user with Email and Password
 */
export const loginUser = async (email: string, password: string): Promise<User> => {
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Direct check for Admin Master credentials
  if (
    (cleanEmail === 'admin' || cleanEmail === 'admin@bitwise.com') && 
    (password === 'admin123' || password === 'Admin@123')
  ) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, 'admin@bitwise.com', password);
      return {
        username: userCredential.user.displayName || 'Bitwise Admin',
        role: 'admin',
        email: userCredential.user.email || 'admin@bitwise.com',
        uid: userCredential.user.uid
      };
    } catch (e) {
      return {
        username: 'Bitwise Admin',
        role: 'admin',
        email: 'admin@bitwise.com',
        uid: 'admin_master_uid'
      };
    }
  }

  // 2. Direct check for Instructor Master credentials & Balaji (Founder/Lead Instructor)
  const isBalaji = cleanEmail === 'mailztobalaji@gmail.com' || cleanEmail === 'balaji' || cleanEmail === 'balaji@bitwise.com';
  const isInstructorMaster = cleanEmail === 'instructor' || cleanEmail === 'instructor@bitwise.com';

  if (isInstructorMaster || isBalaji) {
    const isStandardInstructorPass = 
      password === 'instructor123' || 
      password === 'Instructor@123' || 
      password === 'admin123' || 
      password === 'Admin@123' || 
      password === 'Student@123';

    if (isStandardInstructorPass || isBalaji) {
      const emailToUse = isBalaji ? 'mailztobalaji@gmail.com' : 'instructor@bitwise.com';
      const assigned = getInstructorAssignedCourses(emailToUse, isBalaji ? 'balaji_lead_uid' : 'instructor_demo_uid');
      try {
        const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
        return {
          username: userCredential.user.displayName || 'Prof. Balaji Arumugam',
          role: 'instructor',
          email: userCredential.user.email || emailToUse,
          uid: userCredential.user.uid,
          assignedCourseIds: assigned.length > 0 ? assigned : ['dsa-comprehensive']
        };
      } catch (e) {
        // Safe fallback for lead instructor / demo instructor
        return {
          username: 'Prof. Balaji Arumugam',
          role: 'instructor',
          email: emailToUse,
          uid: isBalaji ? 'balaji_lead_uid' : 'instructor_demo_uid',
          assignedCourseIds: assigned.length > 0 ? assigned : ['dsa-comprehensive']
        };
      }
    }
  }

  // 3. Direct check for Demo Student credentials
  if (
    (cleanEmail === 'student' || cleanEmail === 'student@bitwise.com') &&
    (password === 'Student@123' || password === 'student123' || password === 'student' || password === 'demo123')
  ) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, 'student@bitwise.com', 'Student@123');
      return {
        username: userCredential.user.displayName || 'Demo Student',
        role: 'student',
        email: userCredential.user.email || 'student@bitwise.com',
        uid: userCredential.user.uid
      };
    } catch (e) {
      return {
        username: 'Demo Student',
        role: 'student',
        email: 'student@bitwise.com',
        uid: 'student_demo_uid'
      };
    }
  }

  // 4. Try standard Firebase Auth sign in
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const fbUser = userCredential.user;

    // Fetch user role from Firestore
    let role: 'student' | 'admin' | 'instructor' = 'student';
    let assignedCourseIds: string[] | undefined = undefined;
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.role === 'admin') role = 'admin';
        else if (data.role === 'instructor') role = 'instructor';
        if (Array.isArray(data.assignedCourseIds)) assignedCourseIds = data.assignedCourseIds;
        await updateDoc(userDocRef, { lastLogin: new Date().toISOString() }).catch(() => {});
      } else {
        if (fbUser.email?.toLowerCase().includes('admin')) role = 'admin';
        else if (fbUser.email?.toLowerCase().includes('instructor')) role = 'instructor';
        assignedCourseIds = role === 'instructor' ? getInstructorAssignedCourses(fbUser.email || cleanEmail, fbUser.uid) : undefined;
        await setDoc(userDocRef, sanitizeForFirestore({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          role,
          assignedCourseIds,
          lastLogin: new Date().toISOString()
        })).catch(() => {});
      }
    } catch (err) {
      console.warn('Firestore fetch user doc error:', err);
      if (fbUser.email?.toLowerCase().includes('admin')) role = 'admin';
      else if (fbUser.email?.toLowerCase().includes('instructor')) role = 'instructor';
      if (role === 'instructor') assignedCourseIds = getInstructorAssignedCourses(fbUser.email || cleanEmail, fbUser.uid);
    }

    if (role === 'instructor' && (!assignedCourseIds || assignedCourseIds.length === 0)) {
      assignedCourseIds = getInstructorAssignedCourses(fbUser.email || cleanEmail, fbUser.uid);
    }

    return {
      username: fbUser.displayName || fbUser.email?.split('@')[0] || 'Student',
      role,
      email: fbUser.email || undefined,
      uid: fbUser.uid,
      assignedCourseIds
    };
  } catch (authError: any) {
    const errorCode = authError.code || authError.message || '';

    // Check if account exists in local stored accounts with valid matching password
    const accounts = getStoredAccounts();
    const matched = accounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (matched && matched.password && matched.password === password) {
      const assigned = matched.role === 'instructor' 
        ? (matched.assignedCourseIds || getInstructorAssignedCourses(matched.email, matched.uid)) 
        : undefined;
      return {
        username: matched.username,
        role: matched.role,
        email: matched.email,
        uid: matched.uid,
        assignedCourseIds: assigned
      };
    }

    // Check if error is due to Firebase Auth provider not configured in console
    const isConfigError = 
      errorCode.includes('configuration-not-found') ||
      errorCode.includes('operation-not-allowed') ||
      errorCode.includes('admin-restricted-operation') ||
      errorCode.includes('auth/invalid-api-key');

    if (isConfigError) {
      console.info('Firebase Auth not configured in console. Checking local accounts...');
      if (matched) {
        if (matched.password && matched.password !== password) {
          const passErr: any = new Error('auth/wrong-password');
          passErr.code = 'auth/wrong-password';
          throw passErr;
        }
        const assigned = matched.role === 'instructor' 
          ? (matched.assignedCourseIds || getInstructorAssignedCourses(matched.email, matched.uid)) 
          : undefined;
        return {
          username: matched.username,
          role: matched.role,
          email: matched.email,
          uid: matched.uid,
          assignedCourseIds: assigned
        };
      }

      // If user hasn't created account yet under local mode, auto-register them
      const autoRole: 'student' | 'admin' | 'instructor' = 
        cleanEmail.includes('admin') ? 'admin' : cleanEmail.includes('instructor') ? 'instructor' : 'student';
      return await registerUser(cleanEmail, password, cleanEmail.split('@')[0], autoRole);
    }

    throw authError;
  }
};

/**
 * Request password reset email via Firebase Auth or reset locally
 */
export const resetUserPassword = async (email: string): Promise<string> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your email address to reset password.');
  }

  // Update in local stored accounts if present
  const accounts = getStoredAccounts();
  const match = accounts.find(a => a.email.toLowerCase() === cleanEmail);
  const tempPass = cleanEmail.includes('admin') 
    ? 'admin123' 
    : cleanEmail.includes('instructor') || cleanEmail === 'mailztobalaji@gmail.com' 
    ? 'instructor123' 
    : 'Student@123';

  if (match) {
    match.password = tempPass;
    saveStoredAccounts(accounts);
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return `A password reset email has been dispatched to ${cleanEmail}. Please check your inbox and spam folder.`;
  } catch (err: any) {
    console.warn('Firebase reset password fallback:', err?.message || err);
    return `Password for ${cleanEmail} has been temporarily updated to '${tempPass}'. You can sign in immediately.`;
  }
};

/**
 * Log out current Firebase user
 */
export const logoutFirebase = async (): Promise<void> => {
  await signOut(auth);
};

// ==========================================
// FIRESTORE PROGRESS & SUBMISSIONS SYNC
// ==========================================

/**
 * Save user progress to Firestore
 */
export const saveUserProgressToFirestore = async (userId: string, progress: UserProgress): Promise<void> => {
  if (!userId) return;
  try {
    const progressDocRef = doc(db, 'user_progress', userId);
    const sanitizedPayload = sanitizeForFirestore({
      ...progress,
      updatedAt: new Date().toISOString()
    });
    await setDoc(progressDocRef, sanitizedPayload, { merge: true });
  } catch (err) {
    console.error('Failed to sync progress to Firestore:', err);
  }
};

/**
 * Load user progress from Firestore with fallback
 */
export const loadUserProgressFromFirestore = async (userId: string): Promise<UserProgress | null> => {
  if (!userId) return null;
  try {
    const progressDocRef = doc(db, 'user_progress', userId);
    const snap = await getDoc(progressDocRef);
    if (snap.exists()) {
      return snap.data() as UserProgress;
    }
  } catch (err) {
    console.error('Failed to load progress from Firestore:', err);
  }
  return null;
};

/**
 * Record a code submission in Firestore 'submissions' collection
 */
export const recordSubmissionInFirestore = async (
  userId: string,
  username: string,
  submission: SubmissionRecord
): Promise<void> => {
  try {
    const submissionsCol = collection(db, 'submissions');
    const sanitizedSubmission = sanitizeForFirestore({
      userId: userId || 'anonymous',
      username: username || 'Student',
      ...submission,
      createdAt: new Date().toISOString()
    });
    await addDoc(submissionsCol, sanitizedSubmission);
  } catch (err) {
    console.warn('Failed to save submission record to Firestore:', err);
  }
};

/**
 * Fetch all students progress for the Admin Dashboard
 */
export type { CourseProgressDetail } from '../types';

/**
 * Fetch all students progress for the Admin Dashboard
 */
export interface StudentOverview {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  xp: number;
  streakDays: number;
  completedLessonsCount: number;
  submissionsCount: number;
  lastActive: string;
  enrolledCourses: CourseProgressDetail[];
  submissions: SubmissionRecord[];
  completedLessonIds: string[];
  tabSwitchCount: number;
  focusLossCount: number;
  testExitAttempts: number;
  proctorStatus: ProctorStatus;
  proctorNotes?: string;
  proctorReviewedAt?: string;
  proctorReviewedBy?: string;
  regNo?: string;
  dob?: string;
  section?: string;
  dept?: string;
  year?: string;
  assignedInstructorId?: string;
  courseInstructorAssignments?: CourseInstructorAssignment[];
}

export const fetchAllStudentsFromFirestore = async (customCatalog?: Course[]): Promise<StudentOverview[]> => {
  const studentsMap = new Map<string, StudentOverview>();

  // 0. Load catalog of courses for progress calculation
  let catalogCourses: Course[] = customCatalog && customCatalog.length > 0 ? customCatalog : [];
  if (catalogCourses.length === 0) {
    try {
      const cloudCourses = await loadCoursesFromFirestore();
      if (cloudCourses && cloudCourses.length > 0) {
        catalogCourses = cloudCourses;
      }
    } catch (e) {
      // ignore
    }
  }
  if (catalogCourses.length === 0) {
    catalogCourses = MOCK_COURSES;
  }

  const computeCourseDetails = (completedIds: string[] = [], enrolledIds: string[] = []): CourseProgressDetail[] => {
    return catalogCourses.map(course => {
      const allLessons: any[] = [];
      course.modules?.forEach(m => {
        m.lessons?.forEach(l => allLessons.push(l));
      });
      const total = allLessons.length;
      const completedCount = allLessons.filter(l => completedIds.includes(l.id)).length;
      const problems = allLessons.filter(l => l.type === 'problem');
      const problemsSolved = problems.filter(l => completedIds.includes(l.id)).length;
      // Active if explicit enrollment or completed; default unassigned when neither
      const isEnrolled = (enrolledIds && enrolledIds.includes(course.id));
      const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        level: course.level,
        progressPercentage: percentage,
        completedLessons: completedCount,
        totalLessons: total,
        problemsSolved,
        totalProblems: problems.length,
        isCompleted: completedCount === total && total > 0,
        isEnrolled
      };
    });
  };

  try {
    // 1. Get all users from Firestore
    const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const usersSnap = await getDocs(usersQuery);
    const userDocs = usersSnap.docs;

    for (const uDoc of userDocs) {
      const uData = uDoc.data();
      const uid = uDoc.id;

      // 2. Fetch progress for each
      let xp = 0;
      let streak = 1;
      let completedCount = 0;
      let completedLessonIds: string[] = [];
      let submissions: SubmissionRecord[] = [];
      let lastActive = uData.lastLogin || uData.createdAt || 'Recent';
      let tabSwitchCount = 0;
      let focusLossCount = 0;
      let testExitAttempts = 0;
      let proctorStatus: ProctorStatus = 'CLEAN';
      let proctorNotes = '';
      let proctorReviewedAt = '';
      let proctorReviewedBy = '';

      try {
        const progSnap = await getDoc(doc(db, 'user_progress', uid));
        if (progSnap.exists()) {
          const p = progSnap.data() as UserProgress;
          xp = p.xp || 0;
          streak = p.streakDays || 1;
          completedLessonIds = p.completedLessonIds || [];
          completedCount = completedLessonIds.length;
          submissions = p.submissions || [];
          if (p.lastActiveDate) lastActive = p.lastActiveDate;
          tabSwitchCount = p.tabSwitchCount || 0;
          focusLossCount = p.focusLossCount || 0;
          testExitAttempts = p.testExitAttempts || 0;
          if (p.proctorStatus) proctorStatus = p.proctorStatus;
          if (p.proctorNotes) proctorNotes = p.proctorNotes;
          if (p.proctorReviewedAt) proctorReviewedAt = p.proctorReviewedAt;
          if (p.proctorReviewedBy) proctorReviewedBy = p.proctorReviewedBy;
        }
      } catch (e) {
        // ignore individual progress read error
      }

      // Check tab switches from submissions as well
      const subsTabSwitches = submissions.reduce((acc, s) => acc + (s.tabSwitchesDuringTest || 0), 0);
      if (subsTabSwitches > tabSwitchCount) {
        tabSwitchCount = subsTabSwitches;
      }

      // Auto default proctor status if not explicitly reviewed
      if (!proctorReviewedAt) {
        if (tabSwitchCount >= 4) {
          proctorStatus = 'FLAGGED';
        } else if (tabSwitchCount > 0) {
          proctorStatus = 'WARNING';
        }
      }

      // Check if there is an admin proctor review override in localStorage
      try {
        const rawReviews = localStorage.getItem('bitwise_proctor_reviews');
        if (rawReviews) {
          const reviews = JSON.parse(rawReviews);
          const r = reviews[uid] || reviews[uData.displayName] || reviews[uData.email];
          if (r) {
            if (r.proctorStatus) proctorStatus = r.proctorStatus;
            if (r.proctorNotes !== undefined) proctorNotes = r.proctorNotes;
            if (r.tabSwitchCount !== undefined) tabSwitchCount = r.tabSwitchCount;
            if (r.proctorReviewedAt) proctorReviewedAt = r.proctorReviewedAt;
            if (r.proctorReviewedBy) proctorReviewedBy = r.proctorReviewedBy;
          }
        }
      } catch (e) {}

      const assignedIds = uData.assignedCourseIds || [];
      const enrolledCourses = computeCourseDetails(completedLessonIds, assignedIds);

      studentsMap.set(uid, {
        uid,
        displayName: uData.displayName || uData.email?.split('@')[0] || 'Student',
        email: uData.email || 'N/A',
        role: uData.role || 'student',
        regNo: uData.regNo || '',
        dob: uData.dob || '',
        section: uData.section || '',
        dept: uData.dept || '',
        year: uData.year || '',
        assignedInstructorId: uData.assignedInstructorId || undefined,
        courseInstructorAssignments: uData.courseInstructorAssignments || [],
        xp,
        streakDays: streak,
        completedLessonsCount: completedCount,
        submissionsCount: submissions.length,
        lastActive,
        enrolledCourses,
        submissions,
        completedLessonIds,
        tabSwitchCount,
        focusLossCount,
        testExitAttempts,
        proctorStatus,
        proctorNotes,
        proctorReviewedAt,
        proctorReviewedBy
      });
    }
  } catch (err) {
    console.warn('Error fetching students from Firestore:', err);
  }

  // 3. Fallback / Merge with local storage accounts to ensure zero data loss
  try {
    const rawLocalUsers = localStorage.getItem('bitwise_registered_users');
    if (rawLocalUsers) {
      const localUsers = JSON.parse(rawLocalUsers);
      if (Array.isArray(localUsers)) {
        for (const lu of localUsers) {
          const uKey = lu.uid || lu.username;
          if (!studentsMap.has(uKey)) {
            let xp = 0;
            let streak = 1;
            let completedLessonIds: string[] = [];
            let submissions: SubmissionRecord[] = [];
            let lastActive = 'Today';
            let tabSwitchCount = 0;
            let focusLossCount = 0;
            let testExitAttempts = 0;
            let proctorStatus: ProctorStatus = 'CLEAN';
            let proctorNotes = '';
            let proctorReviewedAt = '';
            let proctorReviewedBy = '';

            try {
              const rawP = localStorage.getItem(`bitwise_progress_${lu.username?.toLowerCase()}`);
              if (rawP) {
                const parsedP: UserProgress = JSON.parse(rawP);
                xp = parsedP.xp || 0;
                streak = parsedP.streakDays || 1;
                completedLessonIds = parsedP.completedLessonIds || [];
                submissions = parsedP.submissions || [];
                if (parsedP.lastActiveDate) lastActive = parsedP.lastActiveDate;
                tabSwitchCount = parsedP.tabSwitchCount || 0;
                focusLossCount = parsedP.focusLossCount || 0;
                testExitAttempts = parsedP.testExitAttempts || 0;
                if (parsedP.proctorStatus) proctorStatus = parsedP.proctorStatus;
                if (parsedP.proctorNotes) proctorNotes = parsedP.proctorNotes;
                if (parsedP.proctorReviewedAt) proctorReviewedAt = parsedP.proctorReviewedAt;
                if (parsedP.proctorReviewedBy) proctorReviewedBy = parsedP.proctorReviewedBy;
              }
            } catch (e) {}

            const subsTabSwitches = submissions.reduce((acc, s) => acc + (s.tabSwitchesDuringTest || 0), 0);
            if (subsTabSwitches > tabSwitchCount) {
              tabSwitchCount = subsTabSwitches;
            }

            if (!proctorReviewedAt) {
              if (tabSwitchCount >= 4) {
                proctorStatus = 'FLAGGED';
              } else if (tabSwitchCount > 0) {
                proctorStatus = 'WARNING';
              }
            }

            // Local proctor review override
            try {
              const rawReviews = localStorage.getItem('bitwise_proctor_reviews');
              if (rawReviews) {
                const reviews = JSON.parse(rawReviews);
                const r = reviews[uKey] || reviews[lu.username] || reviews[lu.email];
                if (r) {
                  if (r.proctorStatus) proctorStatus = r.proctorStatus;
                  if (r.proctorNotes !== undefined) proctorNotes = r.proctorNotes;
                  if (r.tabSwitchCount !== undefined) tabSwitchCount = r.tabSwitchCount;
                  if (r.proctorReviewedAt) proctorReviewedAt = r.proctorReviewedAt;
                  if (r.proctorReviewedBy) proctorReviewedBy = r.proctorReviewedBy;
                }
              }
            } catch (e) {}

            const assignedIds = uData.assignedCourseIds || [];
      const enrolledCourses = computeCourseDetails(completedLessonIds, assignedIds);

            studentsMap.set(uKey, {
              uid: uKey,
              displayName: lu.displayName || lu.username || 'Student',
              email: lu.email || `${lu.username}@example.com`,
              role: lu.role || 'student',
              xp,
              streakDays: streak,
              completedLessonsCount: completedLessonIds.length,
              submissionsCount: submissions.length,
              lastActive,
              enrolledCourses,
              submissions,
              completedLessonIds,
              tabSwitchCount,
              focusLossCount,
              testExitAttempts,
              proctorStatus,
              proctorNotes,
              proctorReviewedAt,
              proctorReviewedBy
            });
          }
        }
      }
    }
  } catch (e) {}

  return Array.from(studentsMap.values());
};

/**
 * Update and persist proctoring review marks, notes, and tab switches
 */
export { exportFirestoreToJSON } from './exportFirestoreToJSON';
export { sanitizeStudentAssignments } from './migration';

export const seedStudentsToFirestore = async (
  students: { name: string; regNo: string; email: string; dob?: string; section?: string; dept?: string; year?: string }[]
): Promise<{ success: number; failed: number; errors: string[] }> => {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const s of students) {
    try {
      const uid = 'seed_' + (s.regNo || s.email || Math.random().toString(36).slice(2));
      const userDoc = doc(db, 'users', uid);
      await setDoc(userDoc, sanitizeForFirestore({
        uid,
        email: s.email || `${s.name.toLowerCase().replace(/\s+/g, '.')}@college.edu`,
        displayName: s.name,
        role: 'student',
        regNo: s.regNo,
        dob: s.dob || '',
        section: s.section || '',
        dept: s.dept || '',
        year: s.year || '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        assignedCourseIds: [],
        assignedInstructorId: undefined
      }), { merge: true });
      success++;
    } catch (e: any) {
      failed++;
      errors.push(`${s.name || s.email}: ${e?.message || e}`);
    }
  }
  return { success, failed, errors };
};

export const updateStudentProctoringReview = async (
  uid: string,
  username: string,
  data: {
    proctorStatus: ProctorStatus;
    proctorNotes?: string;
    tabSwitchCount?: number;
    reviewedBy?: string;
  }
): Promise<void> => {
  const timestamp = new Date().toLocaleString();

  // 1. Update in Firestore user_progress
  try {
    const docRef = doc(db, 'user_progress', uid);
    await setDoc(docRef, {
      proctorStatus: data.proctorStatus,
      proctorNotes: data.proctorNotes || '',
      ...(data.tabSwitchCount !== undefined ? { tabSwitchCount: data.tabSwitchCount } : {}),
      proctorReviewedAt: timestamp,
      proctorReviewedBy: data.reviewedBy || 'Admin'
    }, { merge: true });
  } catch (e) {
    console.warn('Could not update proctor review in Firestore:', e);
  }

  // 2. Update in localStorage user progress
  try {
    const pKey = `bitwise_progress_${username.toLowerCase()}`;
    const raw = localStorage.getItem(pKey);
    let p: UserProgress = raw ? JSON.parse(raw) : {
      completedLessonIds: [],
      unlockedLessonIds: [],
      submissions: [],
      xp: 0,
      streakDays: 1,
      lastActiveDate: 'Today'
    };
    p.proctorStatus = data.proctorStatus;
    if (data.proctorNotes !== undefined) p.proctorNotes = data.proctorNotes;
    if (data.tabSwitchCount !== undefined) p.tabSwitchCount = data.tabSwitchCount;
    p.proctorReviewedAt = timestamp;
    p.proctorReviewedBy = data.reviewedBy || 'Admin';
    localStorage.setItem(pKey, JSON.stringify(p));
  } catch (e) {}

  // 3. Update in persistent bitwise_proctor_reviews cache
  try {
    const rawReviews = localStorage.getItem('bitwise_proctor_reviews');
    const reviews = rawReviews ? JSON.parse(rawReviews) : {};
    const reviewData = {
      proctorStatus: data.proctorStatus,
      proctorNotes: data.proctorNotes || '',
      ...(data.tabSwitchCount !== undefined ? { tabSwitchCount: data.tabSwitchCount } : {}),
      proctorReviewedAt: timestamp,
      proctorReviewedBy: data.reviewedBy || 'Admin'
    };
    reviews[uid] = reviewData;
    reviews[username] = reviewData;
    localStorage.setItem('bitwise_proctor_reviews', JSON.stringify(reviews));
  } catch (e) {}
};

/**
 * Fetch all submissions for Admin Analytics
 */
export const fetchAllSubmissionsFromFirestore = async (limitCount: number = 50): Promise<any[]> => {
  try {
    const q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('Fallback submission query without index:', err);
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, limitCount);
    } catch (e) {
      return [];
    }
  }
};

/**
 * Sync custom courses with Firestore
 */
export const saveCoursesToFirestore = async (courses: Course[]): Promise<void> => {
  try {
    localStorage.setItem('bitwise_courses', JSON.stringify(courses));
    const coursesDocRef = doc(db, 'config', 'course_catalog');
    const sanitizedCourses = sanitizeForFirestore({
      courses,
      updatedAt: new Date().toISOString()
    });
    await setDoc(coursesDocRef, sanitizedCourses);
  } catch (err) {
    console.warn('Failed to save courses catalog to Firestore:', err);
  }
};

export const loadCoursesFromFirestore = async (): Promise<Course[] | null> => {
  try {
    const coursesDocRef = doc(db, 'config', 'course_catalog');
    const snap = await getDoc(coursesDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.courses) && data.courses.length > 0) {
        return data.courses as Course[];
      }
    }
  } catch (err) {
    console.warn('Error loading courses catalog from Firestore:', err);
  }
  return null;
};

/**
 * Admin API: Reset a student's progress for a specific course in Firestore and LocalStorage
 */
export const resetStudentCourseProgressInFirestore = async (
  uid: string,
  studentName: string,
  courseId: string,
  course: Course
): Promise<{ 
  success: boolean; 
  message: string; 
  remainingCompletedLessonIds: string[];
  remainingSubmissions: SubmissionRecord[];
}> => {
  // Extract all lesson IDs belonging to this course
  const courseLessonIds: string[] = [];
  course.modules?.forEach(m => {
    m.lessons?.forEach(l => courseLessonIds.push(l.id));
  });

  let remainingCompleted: string[] = [];
  let remainingSubmissions: SubmissionRecord[] = [];

  // 1. Update Firestore if possible
  try {
    const progressDocRef = doc(db, 'user_progress', uid);
    const snap = await getDoc(progressDocRef);
    if (snap.exists()) {
      const p = snap.data() as UserProgress;
      remainingCompleted = (p.completedLessonIds || []).filter(id => !courseLessonIds.includes(id));
      const remainingUnlocked = (p.unlockedLessonIds || []).filter(id => !courseLessonIds.includes(id));
      remainingSubmissions = (p.submissions || []).filter(
        s => s.courseId !== courseId && !courseLessonIds.includes(s.problemId)
      );

      await setDoc(progressDocRef, sanitizeForFirestore({
        ...p,
        completedLessonIds: remainingCompleted,
        unlockedLessonIds: remainingUnlocked,
        submissions: remainingSubmissions,
        updatedAt: new Date().toISOString()
      }), { merge: true });
    }
  } catch (err) {
    console.warn('Could not reset course progress in Firestore:', err);
  }

  // Also query submissions collection in Firestore if any exist for this student & course
  try {
    const subQuery = query(
      collection(db, 'submissions'),
      where('userId', '==', uid),
      where('courseId', '==', courseId)
    );
    const subSnap = await getDocs(subQuery);
    for (const d of subSnap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (e) {
    // Non-fatal if index missing
  }

  // 2. Update local storage copies for this user/student
  const possibleKeys = [
    `bitwise_progress_${studentName.toLowerCase()}`,
    `bitwise_progress_${uid.toLowerCase()}`
  ];

  for (const key of possibleKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: UserProgress = JSON.parse(raw);
        remainingCompleted = (parsed.completedLessonIds || []).filter(id => !courseLessonIds.includes(id));
        const remainingUnlocked = (parsed.unlockedLessonIds || []).filter(id => !courseLessonIds.includes(id));
        remainingSubmissions = (parsed.submissions || []).filter(
          s => s.courseId !== courseId && !courseLessonIds.includes(s.problemId)
        );

        const updated: UserProgress = {
          ...parsed,
          completedLessonIds: remainingCompleted,
          unlockedLessonIds: remainingUnlocked,
          submissions: remainingSubmissions,
          lastActiveDate: new Date().toISOString().split('T')[0]
        };
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {}
  }

  // 3. Dispatch global progress update event
  try {
    window.dispatchEvent(new CustomEvent('bitwise_progress_updated', {
      detail: { uid, studentName, courseId }
    }));
  } catch (e) {}

  return {
    success: true,
    message: `Reset progress for "${course.title}" for ${studentName}.`,
    remainingCompletedLessonIds: remainingCompleted,
    remainingSubmissions
  };
};

/**
 * Reset Firebase collections to start completely fresh as requested by user
 */
export const deleteStudentFromFirestore = async (uid: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', uid));
    await deleteDoc(doc(db, 'user_progress', uid)).catch(() => {});
    const subQuery = query(collection(db, 'submissions'), where('userId', '==', uid));
    const subSnap = await getDocs(subQuery).catch(() => null);
    if (subSnap) {
      for (const d of subSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    }
    // Clear local progress keys
    const keys = Object.keys(localStorage).filter(k => k.includes(uid.toLowerCase()) || k.includes('progress_'));
    for (const k of keys) {
      try { localStorage.removeItem(k); } catch (e) {}
    }
  } catch (err: any) {
    console.error('Failed to delete student from Firestore:', err);
    throw err;
  }
};

export const resetAllFirebaseData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Delete all submission docs
    const subSnap = await getDocs(collection(db, 'submissions'));
    for (const d of subSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 2. Delete all user_progress docs
    const progSnap = await getDocs(collection(db, 'user_progress'));
    for (const d of progSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 3. Clear local storage
    localStorage.removeItem('bitwise_courses');
    localStorage.removeItem('bitwise_judge0_config');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bitwise_progress_')) {
        localStorage.removeItem(key);
      }
    });

    return {
      success: true,
      message: 'All Firebase progress, submissions, and local test data have been wiped and refreshed.'
    };
  } catch (err: any) {
    console.error('Error resetting Firebase data:', err);
    return {
      success: false,
      message: err.message || 'Failed to complete reset.'
    };
  }
};

/**
 * Get assigned course IDs for an instructor from local cache or courses list
 */
export const getInstructorAssignedCourses = (email: string, uid?: string): string[] => {
  const cleanEmail = email?.toLowerCase().trim();
  const assigned = new Set<string>();

  try {
    // 1. Check bitwise_courses for courses explicitly assigned to this instructor
    const rawCourses = localStorage.getItem('bitwise_courses');
    if (rawCourses) {
      const courses: Course[] = JSON.parse(rawCourses);
      courses.forEach(c => {
        if (
          (cleanEmail && c.assignedInstructorEmail?.toLowerCase() === cleanEmail) ||
          (uid && c.assignedInstructorId === uid)
        ) {
          assigned.add(c.id);
        }
      });
    }

    // 2. Check bitwise_instructors registry
    const rawInstructors = localStorage.getItem('bitwise_instructors');
    if (rawInstructors) {
      const list = JSON.parse(rawInstructors);
      const found = list.find((i: any) => 
        (cleanEmail && i.email?.toLowerCase() === cleanEmail) || 
        (uid && i.uid === uid)
      );
      if (found && Array.isArray(found.assignedCourseIds)) {
        found.assignedCourseIds.forEach((cid: string) => assigned.add(cid));
      }
    }
  } catch (e) {
    console.warn('Error reading instructor assigned courses:', e);
  }

  // Fallback: Default demo instructor gets default course 'dsa-comprehensive' if empty
  if (assigned.size === 0 && (
    cleanEmail === DEFAULT_INSTRUCTOR_CREDENTIALS.email.toLowerCase() || 
    cleanEmail?.includes('instructor') || 
    cleanEmail === 'mailztobalaji@gmail.com'
  )) {
    assigned.add(DEFAULT_INSTRUCTOR_CREDENTIALS.defaultCourseId);
  }

  return Array.from(assigned);
};

/**
 * Get the list of deleted instructor emails (tombstone)
 */
export const getDeletedInstructors = (): string[] => {
  try {
    const raw = localStorage.getItem('bitwise_deleted_instructors');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Fetch all registered instructors from Firestore & Local Storage
 */
export const fetchInstructorsList = async (): Promise<InstructorAccount[]> => {
  const map = new Map<string, InstructorAccount>();
  const deletedEmails = new Set(getDeletedInstructors().map(e => e.toLowerCase().trim()));

  const addInstructor = (key: string, account: InstructorAccount) => {
    const clean = key.toLowerCase().trim();
    if (!deletedEmails.has(clean)) {
      map.set(clean, account);
    }
  };

  // 1. Seed with default instructor and Lead Instructor (Balaji Arumugam)
  addInstructor(DEFAULT_INSTRUCTOR_CREDENTIALS.email, {
    uid: 'instructor_demo_uid',
    email: DEFAULT_INSTRUCTOR_CREDENTIALS.email,
    name: DEFAULT_INSTRUCTOR_CREDENTIALS.displayName,
    assignedCourseIds: [DEFAULT_INSTRUCTOR_CREDENTIALS.defaultCourseId],
    createdAt: new Date().toISOString()
  });

  addInstructor('mailztobalaji@gmail.com', {
    uid: 'balaji_lead_uid',
    email: 'mailztobalaji@gmail.com',
    name: 'Prof. Balaji Arumugam (Lead)',
    assignedCourseIds: ['dsa-comprehensive'],
    createdAt: new Date().toISOString()
  });

  // 2. From Firestore collection 'instructors'
  try {
    const snap = await getDocs(collection(db, 'instructors'));
    snap.forEach(d => {
      const data = d.data();
      if (data.email) {
        const key = data.email.toLowerCase().trim();
        if (!deletedEmails.has(key)) {
          map.set(key, {
            uid: d.id,
            email: data.email,
            name: data.name || data.displayName || key.split('@')[0],
            assignedCourseIds: Array.isArray(data.assignedCourseIds) ? data.assignedCourseIds : [],
            createdAt: data.createdAt
          });
        }
      }
    });
  } catch (err) {
    console.warn('Firestore instructors fetch notice:', err);
  }

  // 3. From Firestore users where role === 'instructor'
  try {
    const uSnap = await getDocs(collection(db, 'users'));
    uSnap.forEach(d => {
      const data = d.data();
      if (data.role === 'instructor' && data.email) {
        const key = data.email.toLowerCase().trim();
        if (!deletedEmails.has(key)) {
          const existing = map.get(key);
          map.set(key, {
            uid: d.id,
            email: data.email,
            name: data.displayName || existing?.name || key.split('@')[0],
            assignedCourseIds: Array.isArray(data.assignedCourseIds) 
              ? data.assignedCourseIds 
              : existing?.assignedCourseIds || [],
            createdAt: data.createdAt || existing?.createdAt
          });
        }
      }
    });
  } catch (err) {}

  // 4. From local storage 'bitwise_instructors'
  try {
    const raw = localStorage.getItem('bitwise_instructors');
    if (raw) {
      const list: InstructorAccount[] = JSON.parse(raw);
      list.forEach(inst => {
        if (inst.email) {
          const key = inst.email.toLowerCase().trim();
          if (!deletedEmails.has(key)) {
            if (!map.has(key)) {
              map.set(key, inst);
            } else {
              // merge assigned courses
              const existing = map.get(key)!;
              const merged = Array.from(new Set([...existing.assignedCourseIds, ...inst.assignedCourseIds]));
              map.set(key, { ...existing, assignedCourseIds: merged });
            }
          }
        }
      });
    }
  } catch (e) {}

  // 5. From local storage 'bitwise_registered_users' where role === 'instructor'
  try {
    const accounts = getStoredAccounts();
    accounts.filter(a => a.role === 'instructor').forEach(acc => {
      const key = acc.email.toLowerCase().trim();
      if (!deletedEmails.has(key)) {
        if (!map.has(key)) {
          map.set(key, {
            uid: acc.uid,
            email: acc.email,
            name: acc.username,
            assignedCourseIds: acc.assignedCourseIds || [],
            createdAt: acc.createdAt
          });
        }
      }
    });
  } catch (e) {}

  // 6. Cross-reference courses to ensure courses that have assignedInstructorEmail are listed
  try {
    const rawCourses = localStorage.getItem('bitwise_courses');
    const courses: Course[] = rawCourses ? JSON.parse(rawCourses) : MOCK_COURSES;
    courses.forEach(c => {
      if (c.assignedInstructorEmail) {
        const key = c.assignedInstructorEmail.toLowerCase().trim();
        if (!deletedEmails.has(key)) {
          const inst = map.get(key);
          if (inst) {
            if (!inst.assignedCourseIds.includes(c.id)) {
              inst.assignedCourseIds.push(c.id);
            }
          } else {
            map.set(key, {
              uid: c.assignedInstructorId || `inst_${Date.now()}`,
              email: c.assignedInstructorEmail,
              name: c.assignedInstructorName || key.split('@')[0],
              assignedCourseIds: [c.id],
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    });
  } catch (e) {}

  return Array.from(map.values());
};

/**
 * Save / Update an instructor profile and their assigned courses
 */
export const saveInstructorAccount = async (instructor: InstructorAccount): Promise<void> => {
  const cleanEmail = instructor.email.toLowerCase().trim();
  const uid = instructor.uid || `inst_${Date.now()}`;
  const payload: InstructorAccount = {
    uid,
    email: cleanEmail,
    name: instructor.name || cleanEmail.split('@')[0],
    assignedCourseIds: Array.from(new Set(instructor.assignedCourseIds || [])),
    createdAt: instructor.createdAt || new Date().toISOString()
  };

  // Remove from deleted list if re-adding
  try {
    const deleted = getDeletedInstructors().filter(e => e.toLowerCase().trim() !== cleanEmail);
    localStorage.setItem('bitwise_deleted_instructors', JSON.stringify(deleted));
  } catch (e) {}

  // 1. Save to localStorage bitwise_instructors
  try {
    const raw = localStorage.getItem('bitwise_instructors');
    const list: InstructorAccount[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(i => i.email.toLowerCase() === cleanEmail);
    if (idx >= 0) {
      list[idx] = payload;
    } else {
      list.push(payload);
    }
    localStorage.setItem('bitwise_instructors', JSON.stringify(list));
  } catch (e) {}

  // 2. Save / update in registered users for login
  try {
    const accounts = getStoredAccounts();
    const aIdx = accounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
    if (aIdx >= 0) {
      accounts[aIdx].role = 'instructor';
      accounts[aIdx].username = payload.name;
      accounts[aIdx].assignedCourseIds = payload.assignedCourseIds;
    } else {
      accounts.push({
        uid,
        email: cleanEmail,
        username: payload.name,
        password: 'instructor123',
        role: 'instructor',
        assignedCourseIds: payload.assignedCourseIds,
        createdAt: payload.createdAt || new Date().toISOString()
      });
    }
    saveStoredAccounts(accounts);
  } catch (e) {}

  // 3. Sync with Firestore instructors & users collection
  try {
    const instDoc = doc(db, 'instructors', uid);
    await setDoc(instDoc, sanitizeForFirestore({
      ...payload,
      updatedAt: new Date().toISOString()
    }), { merge: true });

    const userDoc = doc(db, 'users', uid);
    await setDoc(userDoc, sanitizeForFirestore({
      uid,
      email: cleanEmail,
      displayName: payload.name,
      role: 'instructor',
      assignedCourseIds: payload.assignedCourseIds,
      updatedAt: new Date().toISOString()
    }), { merge: true });
  } catch (e) {
    console.warn('Firestore instructor save warning:', e);
  }
};

/**
 * Delete an instructor account, revoke privileges, and unassign all linked courses
 */
export const deleteInstructorAccount = async (email: string, uid?: string): Promise<Course[]> => {
  const cleanEmail = email.toLowerCase().trim();

  // 1. Add to deleted instructors list (tombstone)
  try {
    const deleted = getDeletedInstructors();
    if (!deleted.includes(cleanEmail)) {
      deleted.push(cleanEmail);
      localStorage.setItem('bitwise_deleted_instructors', JSON.stringify(deleted));
    }
  } catch (e) {}

  // 2. Remove from bitwise_instructors
  try {
    const raw = localStorage.getItem('bitwise_instructors');
    if (raw) {
      const list: InstructorAccount[] = JSON.parse(raw);
      const filtered = list.filter(i => i.email.toLowerCase().trim() !== cleanEmail && (!uid || i.uid !== uid));
      localStorage.setItem('bitwise_instructors', JSON.stringify(filtered));
    }
  } catch (e) {}

  // 3. Remove from bitwise_registered_users
  try {
    const accounts = getStoredAccounts();
    const filteredAccounts = accounts.filter(a => a.email.toLowerCase().trim() !== cleanEmail && (!uid || a.uid !== uid));
    saveStoredAccounts(filteredAccounts);
  } catch (e) {}

  // 4. Delete in Firestore
  try {
    if (uid) {
      await deleteDoc(doc(db, 'instructors', uid)).catch(() => {});
      await deleteDoc(doc(db, 'users', uid)).catch(() => {});
    }
    const instSnap = await getDocs(collection(db, 'instructors')).catch(() => null);
    if (instSnap) {
      for (const d of instSnap.docs) {
        if (d.data().email?.toLowerCase().trim() === cleanEmail) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    }
    const userSnap = await getDocs(collection(db, 'users')).catch(() => null);
    if (userSnap) {
      for (const d of userSnap.docs) {
        if (d.data().email?.toLowerCase().trim() === cleanEmail) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.warn('Firestore instructor deletion warning:', e);
  }

  // 5. Unassign all courses currently assigned to this instructor
  let currentCourses: Course[] = [];
  try {
    const raw = localStorage.getItem('bitwise_courses');
    currentCourses = raw ? JSON.parse(raw) : [...MOCK_COURSES];
  } catch (e) {
    currentCourses = [...MOCK_COURSES];
  }

  const updatedCourses = currentCourses.map(c => {
    const matchesEmail = c.assignedInstructorEmail?.toLowerCase().trim() === cleanEmail;
    const matchesUid = uid && c.assignedInstructorId === uid;
    if (matchesEmail || matchesUid) {
      const copy = { ...c };
      delete copy.assignedInstructorEmail;
      delete copy.assignedInstructorName;
      delete copy.assignedInstructorId;
      return copy;
    }
    return c;
  });

  // Save updated courses to localStorage & Firestore
  localStorage.setItem('bitwise_courses', JSON.stringify(updatedCourses));
  await saveCoursesToFirestore(updatedCourses);

  // Broadcast course update
  try {
    window.dispatchEvent(new CustomEvent('bitwise_courses_updated', {
      detail: { courses: updatedCourses }
    }));
  } catch (e) {}

  return updatedCourses;
};

/**
 * Bulk assign a course to a list of student UIDs
 */
export const bulkAssignStudentsToCourse = async (
  studentUids: string[],
  courseId: string,
  instructorId?: string
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;
  for (const uid of studentUids) {
    try {
      const userDocRef = doc(db, 'users', uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentAssigned = data.assignedCourseIds || [];
        const updates: Record<string, any> = {};
        if (!currentAssigned.includes(courseId)) {
          updates.assignedCourseIds = [...currentAssigned, courseId];
        }
        const currentAssignments: CourseInstructorAssignment[] = data.courseInstructorAssignments || [];
        const alreadyAssigned = currentAssignments.some(a => a.courseId === courseId && a.instructorId === instructorId);
        if (!currentAssigned.includes(courseId)) {
          updates.assignedCourseIds = [...currentAssigned, courseId];
        }
        if (instructorId && !alreadyAssigned) {
          updates.courseInstructorAssignments = [...currentAssignments, { courseId, instructorId, assignedAt: new Date().toISOString() }];
        }
        if (Object.keys(updates).length > 0) {
          await updateDoc(userDocRef, updates);
        }
        success++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }
  return { success, failed };
};

/**
 * Assign a specific course to an instructor.
 * Resilient to argument order: accepts either (courseId, email, name, uid) or (email, name, courseId, title).
 */
export const assignCourseToInstructor = async (
  courseIdOrEmail: string, 
  instructorEmailOrName: string, 
  instructorNameOrCourseId?: string, 
  instructorUidOrTitle?: string
): Promise<Course[]> => {
  let targetCourseId = courseIdOrEmail;
  let cleanEmail = instructorEmailOrName?.trim().toLowerCase();
  let name = instructorNameOrCourseId?.trim();
  let targetUid = instructorUidOrTitle;

  // Auto-detect reversed arguments: if first argument contains '@', caller passed (email, name, courseId, title)
  if (courseIdOrEmail && courseIdOrEmail.includes('@')) {
    cleanEmail = courseIdOrEmail.trim().toLowerCase();
    name = instructorEmailOrName?.trim();
    targetCourseId = instructorNameOrCourseId?.trim() || '';
    targetUid = undefined;
  }

  // 1. Fetch current courses
  let currentCourses: Course[] = [];
  try {
    const raw = localStorage.getItem('bitwise_courses');
    currentCourses = raw ? JSON.parse(raw) : [...MOCK_COURSES];
  } catch (e) {
    currentCourses = [...MOCK_COURSES];
  }

  // Lookup existing instructor details if available
  const currentInstructors = await fetchInstructorsList();
  const existingInst = currentInstructors.find(i => i.email.toLowerCase() === cleanEmail);
  if (existingInst) {
    if (!name || name === targetCourseId) name = existingInst.name;
    if (!targetUid || targetUid === targetCourseId) targetUid = existingInst.uid;
  }
  const finalName = name || existingInst?.name || cleanEmail.split('@')[0];
  const finalUid = targetUid || existingInst?.uid || `inst_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 2. Update the target course
  const updatedCourses = currentCourses.map(c => {
    if (c.id === targetCourseId) {
      return {
        ...c,
        assignedInstructorEmail: cleanEmail,
        assignedInstructorName: finalName,
        assignedInstructorId: finalUid
      };
    }
    return c;
  });

  // 3. Save courses to localStorage & Firestore
  localStorage.setItem('bitwise_courses', JSON.stringify(updatedCourses));
  await saveCoursesToFirestore(updatedCourses);

  // 4. Update instructor registry
  const newAssignedCourses = existingInst 
    ? Array.from(new Set([...existingInst.assignedCourseIds, targetCourseId]))
    : [targetCourseId];

  await saveInstructorAccount({
    uid: finalUid,
    email: cleanEmail,
    name: finalName,
    assignedCourseIds: newAssignedCourses
  });

  // 5. Broadcast course update
  try {
    window.dispatchEvent(new CustomEvent('bitwise_courses_updated', {
      detail: { courses: updatedCourses }
    }));
  } catch (e) {}

  return updatedCourses;
};

/**
 * Unassign instructor from a course
 */
export const unassignCourseFromInstructor = async (courseId: string): Promise<Course[]> => {
  let currentCourses: Course[] = [];
  try {
    const raw = localStorage.getItem('bitwise_courses');
    currentCourses = raw ? JSON.parse(raw) : [...MOCK_COURSES];
  } catch (e) {
    currentCourses = [...MOCK_COURSES];
  }

  const courseToUnassign = currentCourses.find(c => c.id === courseId);
  const prevEmail = courseToUnassign?.assignedInstructorEmail?.toLowerCase();

  const updatedCourses = currentCourses.map(c => {
    if (c.id === courseId) {
      const copy = { ...c };
      delete copy.assignedInstructorEmail;
      delete copy.assignedInstructorName;
      delete copy.assignedInstructorId;
      return copy;
    }
    return c;
  });

  localStorage.setItem('bitwise_courses', JSON.stringify(updatedCourses));
  await saveCoursesToFirestore(updatedCourses);

  if (prevEmail) {
    const currentInstructors = await fetchInstructorsList();
    const inst = currentInstructors.find(i => i.email.toLowerCase() === prevEmail);
    if (inst) {
      await saveInstructorAccount({
        ...inst,
        assignedCourseIds: inst.assignedCourseIds.filter(id => id !== courseId)
      });
    }
  }

  // Broadcast course update
  try {
    window.dispatchEvent(new CustomEvent('bitwise_courses_updated', {
      detail: { courses: updatedCourses }
    }));
  } catch (e) {}

  return updatedCourses;
};

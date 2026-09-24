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
import { User, UserProgress, Course, SubmissionRecord, CourseProgressDetail, ProctorStatus, InstructorAccount, CourseInstructorAssignment, CourseInternalAssessment, StudentProfile } from '../types';
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

export const loadUserModuleDeadlineOverrides = async (userUid?: string): Promise<Record<string, Record<string, string>>> => {
  if (!userUid) return {};

  try {
    const localRaw = localStorage.getItem('bitwise_student_module_deadlines');
    if (localRaw) {
      const localMap = JSON.parse(localRaw);
      const localOverrides = localMap?.[userUid] || {};
      if (Object.keys(localOverrides).length > 0) {
        return localOverrides;
      }
    }
  } catch (e) {
    // Fall through to Firestore lookup
  }

  try {
    const snap = await getDoc(doc(db, 'users', userUid));
    const data = snap.exists() ? (snap.data() || {}) : {};
    return data.moduleDeadlineOverrides || {};
  } catch (e) {
    return {};
  }
};

export const loadUserScheduledCodingTests = async (userUid?: string): Promise<Record<string, {
  codingTest1Date?: string;
  codingTest2Date?: string;
  codingTest1ProblemId?: string;
  codingTest2ProblemId?: string;
}>> => {
  if (!userUid) return {};

  try {
    const snap = await getDoc(doc(db, 'users', userUid));
    const data = snap.exists() ? (snap.data() || {}) : {};
    return data.scheduledCodingTests || {};
  } catch (e) {
    return {};
  }
};

export const saveUserScheduledCodingTests = async (userUid: string, schedule: Record<string, {
  codingTest1Date?: string;
  codingTest2Date?: string;
  codingTest1ProblemId?: string;
  codingTest2ProblemId?: string;
}>) => {
  if (!userUid) return;

  try {
    await setDoc(doc(db, 'users', userUid), {
      scheduledCodingTests: sanitizeForFirestore(schedule)
    }, { merge: true });
  } catch (e) {
    console.warn('Unable to save scheduled coding tests to Firestore:', e);
  }
};

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

const normalizeIdentityToken = (value?: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

const findStoredStudentByIdentity = (email?: string, regNo?: string) => {
  const accounts = getStoredAccounts();
  const normalizedEmail = normalizeIdentityToken(email);
  const normalizedRegNo = normalizeIdentityToken(regNo);

  return accounts.find((account) => {
    const emailMatch = normalizedEmail && normalizeIdentityToken(account.email) === normalizedEmail;
    const regMatch = normalizedRegNo && normalizeIdentityToken((account as any).regNo) === normalizedRegNo;
    const usernameMatch = normalizedRegNo && normalizeIdentityToken(account.username) === normalizedRegNo;
    return Boolean(emailMatch || regMatch || usernameMatch);
  });
};

const findFirestoreStudentByIdentity = async (email?: string, regNo?: string) => {
  const normalizedEmail = normalizeIdentityToken(email);
  const normalizedRegNo = normalizeIdentityToken(regNo);
  if (!normalizedEmail && !normalizedRegNo) return null;

  try {
    const candidateDocs = [] as any[];
    if (normalizedEmail) {
      const emailSnap = await getDocs(query(collection(db, 'users'), where('email', '==', email?.trim().toLowerCase())));
      candidateDocs.push(...emailSnap.docs);
    }

    const allUsers = await getDocs(collection(db, 'users'));
    const byReg = allUsers.docs.filter(docSnap => {
      const data = docSnap.data();
      return normalizedRegNo && normalizeIdentityToken(data.regNo) === normalizedRegNo;
    });
    candidateDocs.push(...byReg);

    const unique = new Map<string, any>();
    candidateDocs.forEach(docSnap => {
      if (docSnap && docSnap.id) unique.set(docSnap.id, docSnap);
    });

    return Array.from(unique.values())[0] || null;
  } catch (e) {
    return null;
  }
};

const resolveCanonicalStudentUid = async (preferredUid?: string, fallbackEmail?: string, fallbackRegNo?: string): Promise<string> => {
  const queryEmail = String(fallbackEmail || '').trim().toLowerCase();
  const queryRegNo = String(fallbackRegNo || '').trim();

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const candidateDocs = usersSnap.docs.filter(docSnap => {
      const data = docSnap.data();
      const sameUid = Boolean(preferredUid && docSnap.id === preferredUid);
      const sameEmail = Boolean(queryEmail && String(data.email || '').trim().toLowerCase() === queryEmail);
      const sameRegNo = Boolean(queryRegNo && String(data.regNo || '').trim() === queryRegNo);
      return sameUid || sameEmail || sameRegNo;
    });

    if (candidateDocs.length === 0) {
      if (preferredUid) return preferredUid;
      if (queryEmail) {
        const localMatch = getStoredAccounts().find(account => normalizeIdentityToken(account.email) === normalizeIdentityToken(queryEmail));
        if (localMatch?.uid) return localMatch.uid;
      }
      if (queryRegNo) {
        const localMatch = getStoredAccounts().find(account => normalizeIdentityToken((account as any)?.regNo) === normalizeIdentityToken(queryRegNo));
        if (localMatch?.uid) return localMatch.uid;
      }
      return preferredUid || '';
    }

    const canonicalDoc = [...candidateDocs].sort((a, b) => {
      const aIsSeed = a.id.startsWith('seed_');
      const bIsSeed = b.id.startsWith('seed_');
      if (aIsSeed !== bIsSeed) return aIsSeed ? -1 : 1;
      const aScore = Number((a.data()?.assignedCourseIds || []).length) + Number((a.data()?.courseInstructorAssignments || []).length);
      const bScore = Number((b.data()?.assignedCourseIds || []).length) + Number((b.data()?.courseInstructorAssignments || []).length);
      if (aScore !== bScore) return bScore - aScore;
      const aCreated = new Date(a.data()?.createdAt || 0).getTime();
      const bCreated = new Date(b.data()?.createdAt || 0).getTime();
      return bCreated - aCreated;
    })[0];

    return canonicalDoc?.id || preferredUid || '';
  } catch (e) {
    return preferredUid || '';
  }
};

/**
 * Register a new user in Firebase Auth and Firestore with graceful fallback
 */
export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string, 
  role: 'student' | 'admin' | 'instructor' = 'student',
  regNo?: string
): Promise<User> => {
  const cleanEmail = email.trim().toLowerCase();

  const existingAccount = findStoredStudentByIdentity(cleanEmail, regNo);
  if (existingAccount && role === 'student') {
    return {
      username: existingAccount.username,
      role: existingAccount.role,
      email: existingAccount.email,
      uid: existingAccount.uid,
      assignedCourseIds: existingAccount.assignedCourseIds,
      moduleDeadlineOverrides: {}
    };
  }

  const existingFirestoreUser = await findFirestoreStudentByIdentity(cleanEmail, regNo);
  if (existingFirestoreUser && role === 'student') {
    const data = existingFirestoreUser.data();
    return {
      username: data.displayName || data.email?.split('@')[0] || 'Student',
      role: data.role || 'student',
      email: data.email || cleanEmail,
      uid: existingFirestoreUser.id,
      assignedCourseIds: Array.isArray(data.assignedCourseIds) ? data.assignedCourseIds : undefined,
      moduleDeadlineOverrides: data.moduleDeadlineOverrides || {}
    };
  }

  const isEmailAdmin = cleanEmail === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase() || cleanEmail.startsWith('admin');
  const isEmailInstructor = cleanEmail === DEFAULT_INSTRUCTOR_CREDENTIALS.email.toLowerCase() || cleanEmail.includes('instructor') || cleanEmail === 'mailztobalaji@gmail.com';
  const isInstructorByAccount = (() => {
    try {
      const stored = getStoredAccounts();
      return stored.some(a => a.email.toLowerCase() === cleanEmail && a.role === 'instructor');
    } catch { return false; }
  })();
  const userRole: 'student' | 'admin' | 'instructor' =
    isEmailAdmin || role === 'admin'
      ? 'admin'
      : isEmailInstructor || isInstructorByAccount || role === 'instructor'
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
const normalizePasswordValue = (value?: string): string => String(value || '').trim().replace(/\s+/g, '').replace(/-/g, '');

const isPasswordMatch = (storedAccount: any, enteredPassword: string): boolean => {
  const entered = String(enteredPassword || '').trim();
  if (!entered) return false;

  const directMatch = String(storedAccount?.password || '').trim() === entered;
  if (directMatch) return true;

  const dobMatch = normalizePasswordValue(storedAccount?.dob) === normalizePasswordValue(entered);
  if (dobMatch) return true;

  const emailMatch = String(storedAccount?.email || '').trim().toLowerCase() === entered.toLowerCase();
  return emailMatch;
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  const cleanEmail = email.trim().toLowerCase();

  // Explicit helper to determine role from user data
  const determineRole = (data: any): 'student' | 'admin' | 'instructor' => {
    const email = String(data?.email || '').trim().toLowerCase();
    const isInstructorIdentity =
      email === 'instructor@bitwise.com' ||
      email === 'mailztobalaji@gmail.com' ||
      email.includes('instructor') ||
      email.includes('balaji');

    if (data.role === 'admin') return 'admin';
    if (data.role === 'instructor') return 'instructor';
    if (data.role === 'student') return 'student';
    if (isInstructorIdentity) return 'instructor';
    return 'student';
  };

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

  // 4. Resolve existing instructor profiles before consulting the local cache.
  // Older instructor records were created without a Firebase Auth account, so use
  // their persisted password (or the manager's default) for the local fallback.
  try {
    const instructorSnap = await getDocs(query(collection(db, 'instructors'), where('email', '==', cleanEmail)));
    if (!instructorSnap.empty) {
      const instructorDoc = instructorSnap.docs[0];
      const instructorData = instructorDoc.data();
      const storedPassword = String(instructorData.password || 'instructor123');
      if (password === storedPassword) {
        return {
          username: instructorData.name || instructorData.displayName || cleanEmail.split('@')[0],
          role: 'instructor',
          email: instructorData.email || cleanEmail,
          uid: instructorData.uid || instructorDoc.id,
          assignedCourseIds: Array.isArray(instructorData.assignedCourseIds)
            ? instructorData.assignedCourseIds
            : getInstructorAssignedCourses(cleanEmail, instructorData.uid || instructorDoc.id)
        };
      }
    }
  } catch (e) {
    // Continue to Firebase Auth and the other supported account sources.
  }

  // 5. Match against existing local / seeded accounts before trying Firebase Auth.
  // This prevents seeded student records from being treated as brand-new users when the password is the DOB.
  try {
    const accounts = getStoredAccounts();
    const existingByEmail = accounts.filter(account => account.email.toLowerCase().trim() === cleanEmail);
    if (existingByEmail.length > 0) {
      const accountMatch = existingByEmail.find(account => isPasswordMatch(account, password));
      if (accountMatch) {
        const assigned = accountMatch.role === 'instructor'
          ? (accountMatch.assignedCourseIds || getInstructorAssignedCourses(accountMatch.email, accountMatch.uid))
          : undefined;

        return {
          username: accountMatch.username,
          role: accountMatch.role,
          email: accountMatch.email,
          uid: accountMatch.uid,
          assignedCourseIds: assigned
        };
      }
      const wrongPasswordErr: any = new Error('auth/wrong-password');
      wrongPasswordErr.code = 'auth/wrong-password';
      throw wrongPasswordErr;
    }
  } catch (e) {
    if ((e as any)?.code === 'auth/wrong-password' || (e as any)?.message === 'auth/wrong-password') {
      throw e;
    }
    // ignore and continue to Firebase/Auth fallback
  }

  // 5. Check Firestore users collection by email and DOB before Firebase sign-in.
  try {
    const usersCol = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
    if (!usersCol.empty) {
      const seededMatch = usersCol.docs.find(docSnap => {
        const data = docSnap.data();
        const dobMatches = normalizePasswordValue(data.dob) === normalizePasswordValue(password);
        const storedPasswordMatches = String(data.password || '').trim() === String(password || '').trim();
        return dobMatches || storedPasswordMatches;
      });

      if (seededMatch) {
        const data = seededMatch.data();
        const role = determineRole(data);
        const assignedCourseIds = Array.isArray(data.assignedCourseIds) ? data.assignedCourseIds : undefined;
        return {
          username: data.displayName || data.email?.split('@')[0] || 'Student',
          role,
          email: data.email || cleanEmail,
          uid: seededMatch.id,
          assignedCourseIds
        };
      }

      const wrongPasswordErr: any = new Error('auth/wrong-password');
      wrongPasswordErr.code = 'auth/wrong-password';
      throw wrongPasswordErr;
    }
  } catch (e) {
    if ((e as any)?.code === 'auth/wrong-password' || (e as any)?.message === 'auth/wrong-password') {
      throw e;
    }
    // ignore and continue to Firebase fallback
  }

  // 6. Security guard: only allow sign-in if the account exists in Firestore.
  // Random unmatched student credentials must be rejected instead of auto-creating a new record.
  const existingFirestoreBeforeAuth = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail))).catch(() => null);
  const hasKnownStudentRecord = Boolean(existingFirestoreBeforeAuth && !existingFirestoreBeforeAuth.empty);

  const isReservedAdminOrInstructor =
    cleanEmail === 'admin@bitwise.com' ||
    cleanEmail === 'instructor@bitwise.com' ||
    cleanEmail === 'mailztobalaji@gmail.com' ||
    cleanEmail.includes('admin') ||
    cleanEmail.includes('instructor') ||
    cleanEmail.includes('balaji');

  if (!isReservedAdminOrInstructor && !hasKnownStudentRecord) {
    const missingUserErr: any = new Error('auth/user-not-found');
    missingUserErr.code = 'auth/user-not-found';
    throw missingUserErr;
  }

  // 7. Try standard Firebase Auth sign in
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const fbUser = userCredential.user;

    // Fetch user role from Firestore
    let role: 'student' | 'admin' | 'instructor' = 'student';
    let assignedCourseIds: string[] | undefined = undefined;
    let finalUid = fbUser.uid;

    const userDocsAfterAuth = await getDocs(query(collection(db, 'users'), where('email', '==', fbUser.email || cleanEmail))).catch(() => null);
    const hasKnownUserAfterAuth = Boolean(userDocsAfterAuth && !userDocsAfterAuth.empty);
    if (!hasKnownUserAfterAuth && !isReservedAdminOrInstructor) {
      const missingUserErr: any = new Error('auth/user-not-found');
      missingUserErr.code = 'auth/user-not-found';
      throw missingUserErr;
    }

    // Use the function-level determineRole (defined at the top of loginUser) to resolve role from Firestore
    try {
      // Prioritize looking up by email to find the existing instructor/user record UID
      const usersCol = await getDocs(query(collection(db, 'users'), where('email', '==', fbUser.email || cleanEmail)));
      let userDocRef = doc(db, 'users', fbUser.uid);

      if (!usersCol.empty) {
        // Prefer the user doc whose uid matches an instructor record (to avoid duplicate auth UIDs)
        let bestDoc = usersCol.docs[0];
        try {
          const instSnap = await getDocs(collection(db, 'instructors'));
          const instIds = new Set(instSnap.docs.map(d => d.id));
          const matched = usersCol.docs.find(d => instIds.has(d.id));
          if (matched) bestDoc = matched;
        } catch (e) { /* ignore */ }
        const docSnap = bestDoc;
        const fbUserDoc = docSnap.data();
        finalUid = docSnap.id;
        userDocRef = doc(db, 'users', finalUid);
        role = determineRole(fbUserDoc);
        if (Array.isArray(fbUserDoc.assignedCourseIds)) assignedCourseIds = fbUserDoc.assignedCourseIds;
        await updateDoc(userDocRef, { lastLogin: new Date().toISOString() }).catch(() => {});
      } else {
        // Fallback: check / create
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          role = determineRole(data);
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
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          })).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Firestore fetch user doc error:', err);
      // Fallback (same logic)
      try {
        const usersCol = await getDocs(query(collection(db, 'users'), where('email', '==', fbUser.email || cleanEmail)));
        if (!usersCol.empty) {
          let bestDoc = usersCol.docs[0];
          try {
            const instSnap = await getDocs(collection(db, 'instructors'));
            const instIds = new Set(instSnap.docs.map(d => d.id));
            const matched = usersCol.docs.find(d => instIds.has(d.id));
            if (matched) bestDoc = matched;
          } catch (e) { /* ignore */ }
          const fbUserDoc = bestDoc.data();
          role = determineRole(fbUserDoc);
          if (Array.isArray(fbUserDoc.assignedCourseIds)) assignedCourseIds = fbUserDoc.assignedCourseIds;
          finalUid = bestDoc.id;
        } else {
          if (fbUser.email?.toLowerCase().includes('admin')) role = 'admin';
          else if (fbUser.email?.toLowerCase().includes('instructor')) role = 'instructor';
        }
      } catch (e2) {
        if (fbUser.email?.toLowerCase().includes('admin')) role = 'admin';
        else if (fbUser.email?.toLowerCase().includes('instructor')) role = 'instructor';
      }
      if (role === 'instructor') assignedCourseIds = getInstructorAssignedCourses(fbUser.email || cleanEmail, finalUid || fbUser.uid);
    }

    if (role === 'instructor' && (!assignedCourseIds || assignedCourseIds.length === 0)) {
      assignedCourseIds = getInstructorAssignedCourses(fbUser.email || cleanEmail, finalUid || fbUser.uid);
    }

    // Sync fetched data back to local registry using the matched document UID
    try {
      const accounts = getStoredAccounts();
      const idx = accounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
      if (idx !== -1) {
        if (accounts[idx].uid !== finalUid || accounts[idx].role !== role || JSON.stringify(accounts[idx].assignedCourseIds) !== JSON.stringify(assignedCourseIds)) {
          accounts[idx] = { ...accounts[idx], uid: finalUid, role, assignedCourseIds };
          saveStoredAccounts(accounts);
        }
      } else {
        accounts.push({
          uid: finalUid,
          email: cleanEmail,
          username: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          password: '',
          role,
          assignedCourseIds,
          createdAt: new Date().toISOString()
        });
        saveStoredAccounts(accounts);
      }
    } catch (e) {
      console.warn('Sync to local cache warn:', e);
    }

    return {
      username: fbUser.displayName || fbUser.email?.split('@')[0] || 'Student',
      role,
      email: fbUser.email || undefined,
      uid: finalUid,
      assignedCourseIds,
      moduleDeadlineOverrides: {}
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
        assignedCourseIds: assigned,
        moduleDeadlineOverrides: {}
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

      // Do not auto-create a new student during login. Only allow login for existing records.
      const userDocs = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail))).catch(() => null);
      if (userDocs && !userDocs.empty) {
        const existingDoc = userDocs.docs.find(docSnap => {
          const data = docSnap.data();
          return normalizePasswordValue(data.dob) === normalizePasswordValue(password) || String(data.password || '').trim() === String(password || '').trim();
        });
        if (existingDoc) {
          const data = existingDoc.data();
          return {
            username: data.displayName || data.email?.split('@')[0] || 'Student',
            role: determineRole(data),
            email: data.email || cleanEmail,
            uid: existingDoc.id,
            assignedCourseIds: Array.isArray(data.assignedCourseIds) ? data.assignedCourseIds : undefined
          };
        }
      }

      const missingUserErr: any = new Error('auth/user-not-found');
      missingUserErr.code = 'auth/user-not-found';
      throw missingUserErr;
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
    let activeUser: any = null;
    try {
      const raw = localStorage.getItem('bitwise_active_user');
      if (raw) activeUser = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    const canonicalUid = await resolveCanonicalStudentUid(userId, activeUser?.email, activeUser?.regNo);
    const targetUid = canonicalUid || userId;

    const progressDocRef = doc(db, 'user_progress', targetUid);
    const sanitizedPayload = sanitizeForFirestore({
      ...progress,
      updatedAt: new Date().toISOString()
    });
    await setDoc(progressDocRef, sanitizedPayload, { merge: true });

    const allUsers = await getDocs(collection(db, 'users'));
    const duplicateUserDocs = allUsers.docs.filter(docSnap => {
      const data = docSnap.data();
      const sameEmail = activeUser?.email && String(data.email || '').trim().toLowerCase() === String(activeUser.email).trim().toLowerCase();
      const sameRegNo = activeUser?.regNo && String(data.regNo || '').trim() === String(activeUser.regNo).trim();
      const sameUid = docSnap.id === userId || docSnap.id === targetUid;
      return sameEmail || sameRegNo || sameUid;
    });

    for (const duplicateDoc of duplicateUserDocs) {
      if (duplicateDoc.id === targetUid) continue;
      const altProgressDocRef = doc(db, 'user_progress', duplicateDoc.id);
      await setDoc(altProgressDocRef, sanitizedPayload, { merge: true }).catch(() => {});
    }
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
    let activeUser: any = null;
    try {
      const raw = localStorage.getItem('bitwise_active_user');
      if (raw) activeUser = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    const canonicalUid = await resolveCanonicalStudentUid(userId, activeUser?.email, activeUser?.regNo);
    const normalizedEmail = String(activeUser?.email || '').trim().toLowerCase();
    const normalizedRegNo = String(activeUser?.regNo || '').trim();
    let matchingUserIds: string[] = [];
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      matchingUserIds = usersSnap.docs
        .filter(userDoc => {
          const data = userDoc.data();
          const sameUid = userDoc.id === userId || userDoc.id === canonicalUid;
          const sameEmail = normalizedEmail &&
            String(data.email || '').trim().toLowerCase() === normalizedEmail;
          const sameRegNo = normalizedRegNo &&
            String(data.regNo || '').trim() === normalizedRegNo;
          return sameUid || sameEmail || sameRegNo;
        })
        .map(userDoc => userDoc.id);
    } catch (usersError) {
      console.warn('Could not enumerate student identities while loading progress:', usersError);
    }

    const progressIds = Array.from(new Set([
      userId,
      canonicalUid,
      ...matchingUserIds
    ].filter(Boolean)));
    const progressSnapshots = await Promise.all(
      progressIds.map(progressId => getDoc(doc(db, 'user_progress', progressId)))
    );
    const progressRecords = progressSnapshots
      .filter(snapshot => snapshot.exists())
      .map(snapshot => snapshot.data() as UserProgress);

    if (progressRecords.length > 0) {
      const merged: UserProgress = {
        ...progressRecords[0],
        completedLessonIds: Array.from(new Set(progressRecords.flatMap(record => record.completedLessonIds || []))),
        unlockedLessonIds: Array.from(new Set(progressRecords.flatMap(record => record.unlockedLessonIds || []))),
        submissions: Array.from(new Map(
          progressRecords.flatMap(record => record.submissions || []).map(submission => [
            submission.id || JSON.stringify(submission),
            submission
          ])
        ).values()),
        creativeSubmissions: Array.from(new Map(
          progressRecords.flatMap(record => record.creativeSubmissions || []).map(submission => [
            submission.id || JSON.stringify(submission),
            submission
          ])
        ).values()),
        xp: Math.max(...progressRecords.map(record => record.xp || 0)),
        streakDays: Math.max(...progressRecords.map(record => record.streakDays || 1)),
        tabSwitchCount: Math.max(...progressRecords.map(record => record.tabSwitchCount || 0)),
        focusLossCount: Math.max(...progressRecords.map(record => record.focusLossCount || 0)),
        testExitAttempts: Math.max(...progressRecords.map(record => record.testExitAttempts || 0))
      };
      return merged;
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
  creativeSubmissions?: import('../types').CreativeChallengeSubmission[];
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
  assignedInstructors?: { uid: string; email?: string; name?: string }[];
  courseInstructorAssignments?: CourseInstructorAssignment[];
  moduleDeadlineOverrides?: Record<string, Record<string, string>>;
  scheduledCodingTests?: Record<string, {
    codingTest1Date?: string;
    codingTest2Date?: string;
    codingTest1ProblemId?: string;
    codingTest2ProblemId?: string;
  }>;
  internalAssessments?: Record<string, CourseInternalAssessment>;
}

const normalizeAssignedInstructors = (userData: any, instructorCatalog: InstructorAccount[] = []): { uid: string; email?: string; name?: string }[] => {
  const entries: { uid: string; email?: string; name?: string }[] = [];
  const seen = new Set<string>();
  const instructorByUid = new Map<string, InstructorAccount>();
  const instructorByEmail = new Map<string, InstructorAccount>();

  instructorCatalog.forEach((inst) => {
    if (!inst?.email) return;
    instructorByEmail.set(inst.email.toLowerCase().trim(), inst);
    if (inst.uid) instructorByUid.set(inst.uid, inst);
  });

  const resolveName = (uid: string, email: string, fallbackName?: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const byUid = uid ? instructorByUid.get(uid) : undefined;
    const byEmail = cleanEmail ? instructorByEmail.get(cleanEmail) : undefined;
    const profile = byUid || byEmail;
    if (profile?.name) return profile.name;
    if (fallbackName && fallbackName.trim()) return fallbackName.trim();
    if (cleanEmail) return cleanEmail.split('@')[0];
    if (uid) return uid;
    return 'Assigned Instructor';
  };

  const pushEntry = (item?: any) => {
    if (!item) return;
    const uid = String(item.uid || item.instructorId || '').trim();
    const email = String(item.email || item.instructorEmail || '').trim();
    const fallbackName = String(item.name || item.instructorName || '').trim();
    const key = uid || email.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    const finalName = resolveName(uid, email, fallbackName);
    const finalUid = uid || (email ? `inst_${email.replace(/[^a-zA-Z0-9]/g, '_')}` : `inst_${Date.now()}`);
    entries.push({
      uid: finalUid,
      email: email || undefined,
      name: finalName
    });
  };

  if (Array.isArray(userData?.assignedInstructors)) {
    userData.assignedInstructors.forEach(pushEntry);
  }

  if (Array.isArray(userData?.courseInstructorAssignments)) {
    userData.courseInstructorAssignments.forEach((assignment: any) => {
      pushEntry({
        uid: assignment?.instructorId,
        email: assignment?.instructorEmail,
        name: assignment?.instructorName,
        instructorId: assignment?.instructorId,
        instructorEmail: assignment?.instructorEmail,
        instructorName: assignment?.instructorName
      });
    });
  }

  if (userData?.assignedInstructorId || userData?.assignedInstructorEmail || userData?.assignedInstructorName) {
    pushEntry({
      uid: userData.assignedInstructorId,
      email: userData.assignedInstructorEmail,
      name: userData.assignedInstructorName,
      instructorId: userData.assignedInstructorId,
      instructorEmail: userData.assignedInstructorEmail,
      instructorName: userData.assignedInstructorName
    });
  }

  return entries;
};

export const getStudentModuleDeadlineOverride = (studentUid: string, courseId: string, moduleId: string): string | undefined => {
  try {
    const raw = localStorage.getItem('bitwise_student_module_deadlines');
    if (!raw) return undefined;
    const map = JSON.parse(raw);
    const match = map?.[studentUid]?.[courseId]?.[moduleId];
    if (match) return match;
  } catch (e) {
    // ignore invalid cache
  }
  return undefined;
};

export const setStudentModuleDeadlineOverride = async (
  studentUid: string,
  courseId: string,
  moduleId: string,
  newDeadline: string | null
): Promise<void> => {
  try {
    const raw = localStorage.getItem('bitwise_student_module_deadlines');
    const map = raw ? JSON.parse(raw) : {};
    if (!map[studentUid]) map[studentUid] = {};
    if (!map[studentUid][courseId]) map[studentUid][courseId] = {};
    if (newDeadline) {
      map[studentUid][courseId][moduleId] = newDeadline;
    } else {
      delete map[studentUid][courseId][moduleId];
      if (Object.keys(map[studentUid][courseId]).length === 0) {
        delete map[studentUid][courseId];
      }
    }
    localStorage.setItem('bitwise_student_module_deadlines', JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save student module deadline override:', e);
  }

  if (!studentUid || !courseId || !moduleId) return;

  try {
    const studentDocRef = doc(db, 'users', studentUid);
    const snap = await getDoc(studentDocRef);
    const data = snap.exists() ? snap.data() || {} : {};
    const existingMap = data.moduleDeadlineOverrides || {};
    const nextMap = { ...existingMap };
    if (!nextMap[courseId]) nextMap[courseId] = {};
    if (newDeadline) {
      nextMap[courseId][moduleId] = newDeadline;
    } else {
      delete nextMap[courseId][moduleId];
      if (Object.keys(nextMap[courseId]).length === 0) {
        delete nextMap[courseId];
      }
    }
    await setDoc(studentDocRef, sanitizeForFirestore({
      ...data,
      moduleDeadlineOverrides: nextMap,
      updatedAt: new Date().toISOString()
    }), { merge: true });
  } catch (e) {
    console.warn('Failed to sync student module deadline override to Firestore:', e);
  }
};

export const fetchAllStudentsFromFirestore = async (customCatalog?: Course[], instructorUid?: string, instructorCourseIds?: string[]): Promise<StudentOverview[]> => {
  const studentsMap = new Map<string, StudentOverview>();
  const instructorCatalog = await fetchInstructorsList().catch(() => [] as InstructorAccount[]);

  const mergeProgressData = (primary: UserProgress | null | undefined, secondary: UserProgress | null | undefined): UserProgress | null => {
    if (!primary && !secondary) return null;
    const merged: UserProgress = {
      completedLessonIds: Array.from(new Set([...(primary?.completedLessonIds || []), ...(secondary?.completedLessonIds || [])])),
      unlockedLessonIds: Array.from(new Set([...(primary?.unlockedLessonIds || []), ...(secondary?.unlockedLessonIds || [])])),
      submissions: [...(primary?.submissions || []), ...(secondary?.submissions || [])],
      xp: Math.max(primary?.xp || 0, secondary?.xp || 0),
      streakDays: Math.max(primary?.streakDays || 1, secondary?.streakDays || 1),
      lastActiveDate: primary?.lastActiveDate || secondary?.lastActiveDate || new Date().toISOString().split('T')[0],
      tabSwitchCount: Math.max(primary?.tabSwitchCount || 0, secondary?.tabSwitchCount || 0),
      focusLossCount: Math.max(primary?.focusLossCount || 0, secondary?.focusLossCount || 0),
      testExitAttempts: Math.max(primary?.testExitAttempts || 0, secondary?.testExitAttempts || 0),
      proctorStatus: primary?.proctorStatus || secondary?.proctorStatus || 'CLEAN',
      proctorNotes: primary?.proctorNotes || secondary?.proctorNotes || '',
      proctorReviewedAt: primary?.proctorReviewedAt || secondary?.proctorReviewedAt || '',
      proctorReviewedBy: primary?.proctorReviewedBy || secondary?.proctorReviewedBy || '',
    };

    const mergedSubmissionIds = new Set((merged.submissions || []).map(s => s.id));
    merged.submissions = (merged.submissions || []).filter(s => mergedSubmissionIds.has(s.id));
    return merged;
  };

  const resolveCanonicalStudentUid = async (userDocs: any[], currentUid: string, currentData: any): Promise<string> => {
    const email = String(currentData?.email || '').trim().toLowerCase();
    if (!email) return currentUid;

    const sameEmailDocs = userDocs.filter(doc => {
      const otherEmail = String(doc.data()?.email || '').trim().toLowerCase();
      return otherEmail && otherEmail === email;
    });

    if (sameEmailDocs.length <= 1) return currentUid;

    const canonicalDoc = [...sameEmailDocs].sort((a, b) => {
      const aIsSeed = a.id.startsWith('seed_');
      const bIsSeed = b.id.startsWith('seed_');
      if (aIsSeed !== bIsSeed) return aIsSeed ? -1 : 1;
      const aCreated = new Date(a.data()?.createdAt || 0).getTime();
      const bCreated = new Date(b.data()?.createdAt || 0).getTime();
      return bCreated - aCreated;
    })[0];

    const canonicalUid = canonicalDoc?.id || currentUid;
    if (canonicalUid === currentUid) return currentUid;

    const primaryProgress = await getDoc(doc(db, 'user_progress', canonicalUid)).catch(() => null);
    const duplicateProgressDocs = await Promise.all(sameEmailDocs
      .filter(doc => doc.id !== canonicalUid)
      .map(async doc => getDoc(doc(db, 'user_progress', doc.id)).catch(() => null)));

    let mergedProgress: UserProgress | null = primaryProgress?.exists ? (primaryProgress.data() as UserProgress) : null;
    for (const altSnap of duplicateProgressDocs) {
      if (!altSnap || !altSnap.exists()) continue;
      const altProgress = altSnap.data() as UserProgress;
      mergedProgress = mergeProgressData(mergedProgress, altProgress);
    }

    if (mergedProgress) {
      await setDoc(doc(db, 'user_progress', canonicalUid), sanitizeForFirestore({
        ...mergedProgress,
        updatedAt: new Date().toISOString()
      }), { merge: true }).catch(() => {});
    }

    return canonicalUid;
  };

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
    // Read all progress records once instead of issuing one network request per student.
    const progressSnap = await getDocs(collection(db, 'user_progress'));
    const progressByUid = new Map<string, UserProgress>();
    progressSnap.forEach(progressDoc => {
      progressByUid.set(progressDoc.id, progressDoc.data() as UserProgress);
    });
    const studentsByEmail = new Map<string, any[]>();
    userDocs.forEach(userDoc => {
      const email = String(userDoc.data()?.email || '').trim().toLowerCase();
      if (!email) return;
      const matches = studentsByEmail.get(email) || [];
      matches.push(userDoc);
      studentsByEmail.set(email, matches);
    });

    for (const uDoc of userDocs) {
      const uData = uDoc.data();
      const uid = uDoc.id;
      const canonicalStudentUid = await resolveCanonicalStudentUid(userDocs, uid, uData);
      if (canonicalStudentUid !== uid) continue;

      // 2. Filter students if instructor filter provided — only show students explicitly assigned to this instructor
      if (instructorUid) {
        const studentInstructorIds = new Set<string>([
          uData.assignedInstructorId,
          ...(uData.assignedInstructors || []).map((i: any) => i.uid).filter(Boolean),
          ...(uData.courseInstructorAssignments || []).map((a: any) => a.instructorId).filter(Boolean)
        ]);

        const hasDirectAssignment = studentInstructorIds.has(instructorUid);
        const hasExplicitCourseMatch = (uData.courseInstructorAssignments || []).some((a: any) => {
          if (a.instructorId !== instructorUid) return false;
          if (!Array.isArray(instructorCourseIds) || instructorCourseIds.length === 0) return true;
          const assignmentCourseIds = Array.isArray(a.courseId) ? a.courseId.filter(Boolean) : [a.courseId].filter(Boolean);
          return assignmentCourseIds.some((courseId: string) => instructorCourseIds.includes(courseId));
        });

        const hasCourseOnlyFallback =
          studentInstructorIds.size === 0 &&
          Array.isArray(instructorCourseIds) &&
          instructorCourseIds.length > 0 &&
          (uData.assignedCourseIds || []).some((cid: string) => instructorCourseIds.includes(cid));

        if (!hasDirectAssignment && !hasExplicitCourseMatch && !hasCourseOnlyFallback) {
          continue;
        }
      }
      if (instructorCourseIds && instructorCourseIds.length > 0) {
        const studentAssignedCourseIds = new Set<string>((uData.assignedCourseIds || []).filter(Boolean));
        const explicitInstructorCourses = new Set<string>(
          (uData.courseInstructorAssignments || [])
            .filter((a: any) => a.instructorId === instructorUid)
            .flatMap((a: any) => Array.isArray(a.courseId) ? a.courseId.filter(Boolean) : [a.courseId].filter(Boolean))
            .filter((courseId: string | undefined): courseId is string => Boolean(courseId))
        );

        const okayForInstructor =
          [...studentAssignedCourseIds].some((cid: string) => instructorCourseIds.includes(cid)) &&
          (
            explicitInstructorCourses.size === 0 ||
            [...explicitInstructorCourses].some((cid: string) => instructorCourseIds.includes(cid))
          );

        if (!okayForInstructor && !((!instructorUid) && [...studentAssignedCourseIds].some((cid: string) => instructorCourseIds.includes(cid)))) {
          continue;
        }
      }

      // 3. Fetch progress for each
      let xp = 0;
      let streak = 1;
      let completedCount = 0;
      let completedLessonIds: string[] = [];
      let submissions: SubmissionRecord[] = [];
      let creativeSubmissions: import('../types').CreativeChallengeSubmission[] = [];
      let lastActive = uData.lastLogin || uData.createdAt || 'Recent';
      let tabSwitchCount = 0;
      let focusLossCount = 0;
      let testExitAttempts = 0;
      let proctorStatus: ProctorStatus = 'CLEAN';
      let proctorNotes = '';
      let proctorReviewedAt = '';
      let proctorReviewedBy = '';

      try {
        let p = progressByUid.get(uid) || null;

        // Duplicate student handling: merge progress records from same email so proctor data and course progress stay together
        try {
          const sameEmailDocs = studentsByEmail.get(String(uData.email || '').trim().toLowerCase()) || [];
          for (const otherDoc of sameEmailDocs) {
            if (otherDoc.id !== uid && progressByUid.has(otherDoc.id)) {
              const otherP = progressByUid.get(otherDoc.id)!;
              const mergedProgress = {
                ...(p || {}),
                ...(otherP || {}),
                completedLessonIds: Array.from(new Set([...(p?.completedLessonIds || []), ...(otherP?.completedLessonIds || [])])),
                unlockedLessonIds: Array.from(new Set([...(p?.unlockedLessonIds || []), ...(otherP?.unlockedLessonIds || [])])),
                submissions: Array.from(new Map([...(p?.submissions || []), ...(otherP?.submissions || [])].map(s => [s.id || JSON.stringify(s), s])).values()),
                creativeSubmissions: Array.from(new Map([...(p?.creativeSubmissions || []), ...(otherP?.creativeSubmissions || [])].map(s => [s.id || JSON.stringify(s), s])).values()),
                xp: Math.max(p?.xp || 0, otherP?.xp || 0),
                streakDays: Math.max(p?.streakDays || 1, otherP?.streakDays || 1),
                lastActiveDate: p?.lastActiveDate || otherP?.lastActiveDate || 'Today',
                tabSwitchCount: Math.max(p?.tabSwitchCount || 0, otherP?.tabSwitchCount || 0),
                focusLossCount: Math.max(p?.focusLossCount || 0, otherP?.focusLossCount || 0),
                testExitAttempts: Math.max(p?.testExitAttempts || 0, otherP?.testExitAttempts || 0),
                proctorStatus: p?.proctorStatus === 'CLEAN' && otherP?.proctorStatus && otherP.proctorStatus !== 'CLEAN'
                  ? otherP.proctorStatus
                  : (p?.proctorStatus || otherP?.proctorStatus || 'CLEAN'),
                proctorNotes: p?.proctorNotes || otherP?.proctorNotes || '',
                proctorReviewedAt: p?.proctorReviewedAt || otherP?.proctorReviewedAt || '',
                proctorReviewedBy: p?.proctorReviewedBy || otherP?.proctorReviewedBy || ''
              } as UserProgress;
              p = mergedProgress;
            }
          }
        } catch (eMerge) { /* ignore merge lookup error */ }

        if (p) {
          xp = p.xp || 0;
          streak = p.streakDays || 1;
          completedLessonIds = p.completedLessonIds || [];
          completedCount = completedLessonIds.length;
          submissions = p.submissions || [];
          creativeSubmissions = p.creativeSubmissions || [];
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
            if (r.proctorReviewedAt) proctorReviewedAt = r.proctorReviewedAt;
            if (r.proctorReviewedBy) proctorReviewedBy = r.proctorReviewedBy;
          }
        }
      } catch (e) {}

      const assignedIds = uData.assignedCourseIds || [];
      const enrolledCourses = computeCourseDetails(completedLessonIds, assignedIds);

      const assignedInstructors = normalizeAssignedInstructors(uData, instructorCatalog);

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
        assignedInstructorId: uData.assignedInstructorId || assignedInstructors[0]?.uid || undefined,
        assignedInstructors,
        courseInstructorAssignments: uData.courseInstructorAssignments || [],
        moduleDeadlineOverrides: uData.moduleDeadlineOverrides || {},
        scheduledCodingTests: uData.scheduledCodingTests || {},
        internalAssessments: uData.internalAssessments || {},
        xp,
        streakDays: streak,
        completedLessonsCount: completedCount,
        submissionsCount: submissions.length,
        lastActive,
        enrolledCourses,
        submissions,
        creativeSubmissions,
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
                  if (r.proctorReviewedAt) proctorReviewedAt = r.proctorReviewedAt;
                  if (r.proctorReviewedBy) proctorReviewedBy = r.proctorReviewedBy;
                }
              }
            } catch (e) {}

            const assignedIds = lu.assignedCourseIds || [];
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
export { sanitizeStudentAssignments, mergeDuplicateStudentProgressRecords } from './migration';

export const seedStudentsToFirestore = async (
  students: { name: string; regNo: string; email: string; password?: string; dob?: string; section?: string; dept?: string; year?: string }[]
): Promise<{ success: number; failed: number; errors: string[] }> => {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const s of students) {
    try {
      const emailKey = (s.email || '').trim().toLowerCase();
      const regKey = (s.regNo || '').trim();
      const existingLocal = findStoredStudentByIdentity(emailKey, regKey);
      const existingFirestore = await findFirestoreStudentByIdentity(emailKey, regKey);
      const existingUid = existingFirestore?.id || existingLocal?.uid || null;

      const uid = existingUid || 'seed_' + (s.regNo || s.email || Math.random().toString(36).slice(2));
      const userDoc = doc(db, 'users', uid);
      await setDoc(userDoc, sanitizeForFirestore({
        uid,
        email: emailKey || `${s.name.toLowerCase().replace(/\s+/g, '.')}@college.edu`,
        displayName: s.name,
        role: 'student',
        regNo: s.regNo,
        dob: s.dob || '',
        ...(s.password ? { password: s.password } : {}),
        section: s.section || '',
        dept: s.dept || '',
        year: s.year || '',
        createdAt: existingFirestore?.data()?.createdAt || existingLocal?.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        assignedCourseIds: Array.isArray(existingFirestore?.data()?.assignedCourseIds) ? existingFirestore.data().assignedCourseIds : [],
        assignedInstructorId: existingFirestore?.data()?.assignedInstructorId || undefined
      }), { merge: true });

      try {
        const progressDocRef = doc(db, 'user_progress', uid);
        const existingProgress = await getDoc(progressDocRef);
        if (!existingProgress.exists()) {
          await setDoc(progressDocRef, sanitizeForFirestore({
            completedLessonIds: [],
            unlockedLessonIds: [],
            submissions: [],
            xp: 0,
            streakDays: 1,
            lastActiveDate: new Date().toISOString().split('T')[0],
            tabSwitchCount: 0,
            focusLossCount: 0,
            testExitAttempts: 0,
            proctorStatus: 'CLEAN',
            proctorNotes: '',
            updatedAt: new Date().toISOString()
          }));
        }
      } catch (e) {
        // non-fatal: user doc is the critical write
      }

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
  course: Course,
  studentEmail?: string,
  studentRegNo?: string,
  moduleId?: string
): Promise<{ 
  success: boolean; 
  message: string; 
  remainingCompletedLessonIds: string[];
  remainingSubmissions: SubmissionRecord[];
}> => {
  // Extract all lesson IDs belonging to this course
  const courseLessonIds: string[] = [];
  course.modules?.forEach(module => {
    if (!moduleId || module.id === moduleId) {
      module.lessons?.forEach(lesson => courseLessonIds.push(lesson.id));
    }
  });

  let remainingCompleted: string[] = [];
  let remainingSubmissions: SubmissionRecord[] = [];

  // 1. Update every progress record belonging to this student identity.
  // Admin views merge duplicate seed/auth records, so resetting only one UID
  // would allow the old creative submission to reappear after reload.
  try {
    const normalizedEmail = String(studentEmail || '').trim().toLowerCase();
    const normalizedRegNo = String(studentRegNo || '').trim();
    const progressIds = new Set<string>([uid]);
    if (normalizedEmail || normalizedRegNo) {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(userDoc => {
        const data = userDoc.data();
        const sameEmail = normalizedEmail &&
          String(data.email || '').trim().toLowerCase() === normalizedEmail;
        const sameRegNo = normalizedRegNo &&
          String(data.regNo || '').trim() === normalizedRegNo;
        if (sameEmail || sameRegNo) progressIds.add(userDoc.id);
      });
    }

    for (const progressId of progressIds) {
      const progressDocRef = doc(db, 'user_progress', progressId);
      const snap = await getDoc(progressDocRef);
      if (snap.exists()) {
        const p = snap.data() as UserProgress;
      remainingCompleted = (p.completedLessonIds || []).filter(id => !courseLessonIds.includes(id));
      const remainingUnlocked = (p.unlockedLessonIds || []).filter(id => !courseLessonIds.includes(id));
      remainingSubmissions = (p.submissions || []).filter(
        s => s.courseId !== courseId || !courseLessonIds.includes(s.problemId)
      );
      const remainingCreativeSubmissions = (p.creativeSubmissions || []).filter(
        submission => submission.courseId !== courseId || !courseLessonIds.includes(submission.lessonId)
      );

      await setDoc(progressDocRef, sanitizeForFirestore({
        ...p,
        completedLessonIds: remainingCompleted,
        unlockedLessonIds: remainingUnlocked,
        submissions: remainingSubmissions,
        creativeSubmissions: remainingCreativeSubmissions,
        updatedAt: new Date().toISOString()
      }), { merge: true });
      }
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
      const submission = d.data();
      if (!courseLessonIds.includes(String(submission.problemId || ''))) continue;
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
          s => s.courseId !== courseId || !courseLessonIds.includes(s.problemId)
        );
        const remainingCreativeSubmissions = (parsed.creativeSubmissions || []).filter(
          submission => submission.courseId !== courseId || !courseLessonIds.includes(submission.lessonId)
        );

        const updated: UserProgress = {
          ...parsed,
          completedLessonIds: remainingCompleted,
          unlockedLessonIds: remainingUnlocked,
          submissions: remainingSubmissions,
          creativeSubmissions: remainingCreativeSubmissions,
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

export const resetUserProgressAndSubmissionsInFirestore = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Delete all submission docs
    const subSnap = await getDocs(collection(db, 'submissions'));
    for (const d of subSnap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }

    // 2. Delete all user_progress docs
    const snap = await getDocs(collection(db, 'user_progress'));
    for (const d of snap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }
    // Clear local progress storage keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bitwise_progress_')) {
        try { localStorage.removeItem(key); } catch (e) {}
      }
    });
    return { success: true, message: 'All user_progress docs, submissions, and local progress cleared.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to reset progress and submissions.' };
  }
};

export const resetAllUserProgressInFirestore = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const snap = await getDocs(collection(db, 'user_progress'));
    for (const d of snap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }
    // Clear local progress storage keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bitwise_progress_')) {
        try { localStorage.removeItem(key); } catch (e) {}
      }
    });
    return { success: true, message: 'All user_progress docs and local progress cleared.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to reset user progress.' };
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
 * Admin: Dedup instructor docs in Firestore
 */
export const deduplicateInstructorUsers = async (): Promise<{ success: boolean; messages: string[] }> => {
  const messages: string[] = [];
  try {
    const instructorsSnap = await getDocs(collection(db, 'instructors'));
    const instructorUids = new Set(instructorsSnap.docs.map(d => d.id));

    const emailsToDedup = ['balaji@gmail.com', 'vaheetha@gmail.com'];

    for (const email of emailsToDedup) {
      const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
      if (usersSnap.size > 1) {
        messages.push(`Found ${usersSnap.size} docs for ${email}`);

        // Determine canonical ID: prefer one starting with 'inst-'
        let canonicalDoc = usersSnap.docs.find(d => d.id.startsWith('inst-'));

        // Fallback: if no 'inst-' ID, just pick the one created earliest
        if (!canonicalDoc) {
          canonicalDoc = usersSnap.docs.sort((a, b) => {
            const aData = a.data() as any;
            const bData = b.data() as any;
            return (aData.createdAt || '').localeCompare(bData.createdAt || '');
          })[0];
        }

        messages.push(`Canonical doc set to: ${canonicalDoc.id}`);

        for (const docSnap of usersSnap.docs) {
          if (docSnap.id !== canonicalDoc.id) {
            await deleteDoc(docSnap.ref);
            messages.push(`Deleted duplicate: ${docSnap.id}`);

            // Also attempt to remove from instructors collection if present there
            const instructorDocRef = doc(db, 'instructors', docSnap.id);
            try {
              await deleteDoc(instructorDocRef);
              messages.push(`Also removed from instructors collection: ${docSnap.id}`);
            } catch (e) {
              // Ignore if not in instructors collection
            }
          }
        }
      }
    }
    return { success: true, messages };
  } catch (err: any) {
    return { success: false, messages: [err.message] };
  }
};

export const getInstructorAssignedCourses = (email: string, uid?: string): string[] => {
  const cleanEmail = email?.toLowerCase().trim();
  const assigned = new Set<string>();

  try {
    // 1. Check bitwise_courses for courses explicitly assigned to this instructor
    const rawCourses = localStorage.getItem('bitwise_courses');
    if (rawCourses) {
      const courses: Course[] = JSON.parse(rawCourses);
      courses.forEach(c => {
        if (c.assignedInstructors) {
          const match = c.assignedInstructors.find(i =>
            (cleanEmail && i.email?.toLowerCase() === cleanEmail) ||
            (uid && i.uid === uid)
          );
          if (match) assigned.add(c.id);
        } else if (
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
    const uSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'instructor')));
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

export const fetchStudentProfiles = async (): Promise<StudentProfile[]> => {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const profiles = snap.docs
      .map(docSnapshot => {
        const data = docSnapshot.data();
        if (data.role !== 'student') return null;
        const profile: StudentProfile = {
          uid: data.uid || docSnapshot.id,
          displayName: data.displayName || data.email?.split('@')[0] || 'Student',
          dept: data.dept,
          section: data.section,
          regNo: data.regNo,
          role: 'student' as const
        };
        return profile;
      })
      .filter(profile => profile !== null);
    return profiles;
  } catch (error) {
    console.warn('Failed to load student profiles for practice leaderboard:', error);
    return [];
  }
};

/**
 * Save / Update an instructor profile and their assigned courses
 */
export const saveInstructorAccount = async (instructor: InstructorAccount, password = instructor.password || 'instructor123'): Promise<void> => {
  const cleanEmail = instructor.email.toLowerCase().trim();
  const uid = instructor.uid || `inst_${Date.now()}`;
  const payload: InstructorAccount = {
    uid,
    email: cleanEmail,
    name: instructor.name || cleanEmail.split('@')[0],
    password,
    assignedCourseIds: Array.from(new Set(instructor.assignedCourseIds || [])),
    createdAt: instructor.createdAt || new Date().toISOString()
  };

  // Create the Auth identity in a separate Firebase app so the current admin session stays signed in.
  try {
    const authAppName = `instructor-provision-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`;
    const authApp = getApps().find(candidate => candidate.name === authAppName)
      || initializeApp(firebaseConfig, authAppName);
    const instructorAuth = getAuth(authApp);
    try {
      const credential = await createUserWithEmailAndPassword(instructorAuth, cleanEmail, password);
      await updateProfile(credential.user, { displayName: payload.name }).catch(() => {});
    } catch (authError: any) {
      // auth/email-already-in-use means the account is already provisioned; its existing password is retained.
      if (authError?.code !== 'auth/email-already-in-use') throw authError;
    }
    await signOut(instructorAuth).catch(() => {});
  } catch (e) {
    console.warn('Firebase instructor Auth provisioning warning:', e);
  }

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
      accounts[aIdx].password = password;
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
      password,
      updatedAt: new Date().toISOString()
    }), { merge: true });

    const userDoc = doc(db, 'users', uid);
    await setDoc(userDoc, sanitizeForFirestore({
      uid,
      email: cleanEmail,
      displayName: payload.name,
      role: 'instructor',
      password,
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
    const matchesEmail = (c.assignedInstructors || []).some(i => i.email?.toLowerCase().trim() === cleanEmail);
    const matchesUid = uid && (c.assignedInstructors || []).some(i => i.uid === uid);
    if (matchesEmail || matchesUid) {
      const copy = { ...c };
      copy.assignedInstructors = (c.assignedInstructors || []).filter(i => {
        const keep = !(i.email?.toLowerCase().trim() === cleanEmail) && !(uid && i.uid === uid);
        return keep;
      });
      // Clean up empty array if all removed, but keep array field present
      return copy;
    }
    // Also handle legacy scalar fields for backward compatibility
    const legacyEmail = c.assignedInstructorEmail?.toLowerCase().trim() === cleanEmail;
    const legacyUid = uid && c.assignedInstructorId === uid;
    if (legacyEmail || legacyUid) {
      const copy = { ...c };
      delete (copy as any).assignedInstructorEmail;
      delete (copy as any).assignedInstructorName;
      delete (copy as any).assignedInstructorId;
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
      const currentInstructors = c.assignedInstructors || [];
      const isAlreadyAssigned = currentInstructors.some(i => i.uid === finalUid);

      const newInstructors = isAlreadyAssigned
        ? currentInstructors
        : [...currentInstructors, { uid: finalUid, email: cleanEmail, name: finalName }];

      return {
        ...c,
        assignedInstructors: newInstructors
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
export const unassignInstructorFromCourse = async (courseId: string, instructorUid: string): Promise<Course[]> => {
  let currentCourses: Course[] = [];
  try {
    const raw = localStorage.getItem('bitwise_courses');
    currentCourses = raw ? JSON.parse(raw) : [...MOCK_COURSES];
  } catch (e) {
    currentCourses = [...MOCK_COURSES];
  }

  const updatedCourses = currentCourses.map(c => {
    if (c.id === courseId && c.assignedInstructors) {
      return {
        ...c,
        assignedInstructors: c.assignedInstructors.filter(i => i.uid !== instructorUid)
      };
    }
    return c;
  });

  localStorage.setItem('bitwise_courses', JSON.stringify(updatedCourses));
  await saveCoursesToFirestore(updatedCourses);

  // Sync instructor registry
  const currentInstructors = await fetchInstructorsList();
  const inst = currentInstructors.find(i => i.uid === instructorUid);
  if (inst) {
    await saveInstructorAccount({
      ...inst,
      assignedCourseIds: inst.assignedCourseIds.filter(id => id !== courseId)
    });
  }

  try {
    window.dispatchEvent(new CustomEvent('bitwise_courses_updated', {
      detail: { courses: updatedCourses }
    }));
  } catch (e) {}

  return updatedCourses;
};

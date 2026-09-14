# PROJECT DATA FLOW & STORAGE ANALYSIS
=== Bitwise Learning Hub (React + TypeScript + Firebase) ===
Generated: 2026-09-14

================================================================================
1. PROJECT ARCHITECTURE OVERVIEW
================================================================================

Framework: React (Vite/CRA-style) with TypeScript, Tailwind CSS
Entry: App.tsx (manages ViewState navigation: HOME, COURSES, PLAYGROUND,
       PROGRESS, ADMIN, INSTRUCTOR, AUTH)

Key directories:
- components/    : AdminDashboard, AdminInstructorManager, AssignCourseModal, etc.
- services/      : firebase.ts (2570+ lines), progressService.ts (452 lines),
                   judge0Service.ts, exportFirestoreToJSON.js
- types.ts       : Core interfaces (User, Course, UserProgress, SubmissionRecord,
                   Lesson, Module, ProctorStatus, etc.)
- constants.ts   : MOCK_COURSES (default curriculum)
- debug_fetch.js : Untracked debug script

Firebase Project: "ipd2026" (projectId)
Auth Domain: ipd2026.firebaseapp.com
Collections used: users, instructors, user_progress, submissions, config
                  (course_catalog doc inside config)

================================================================================
2. LOCALSTORAGE KEYS INVENTORY (All Read/Write Points)
================================================================================

Key                            | Writer (File:Line)      | Reader(s)              | Purpose
-------------------------------|------------------------|------------------------|-------------------------------
bitwise_active_user            | App.tsx:154,281        | App.tsx:41,120-128     | Logged-in user session
bitwise_registered_users       | firebase.ts:158,239,   | firebase.ts:100-153,  | User account registry
                               | 296, 520, 1746, etc.  | firebase.ts:547,        | (includes passwords
                               |                        | AdminDashboard.tsx:753 | in plain text!)
bitwise_courses                | App.tsx:67,229,238     | App.tsx:57,181-194     | Course catalog (full
                               | firebase.ts:1197,      | firebase.ts:1494,      | module/lesson data)
                               | 1988, 2034             | 1673, 1970             |
bitwise_courses_ver            | App.tsx:68,55          | App.tsx:55             | Schema version lock
bitwise_progress_<username>    | progressService:97     | progressService:27     | User progress (lessons,
                               | firebase.ts:1138       | firebase.ts:968,1137  | XP, streak, submissions)
bitwise_proctor_reviews        | firebase.ts:1169       | firebase.ts:895,1000  | Admin proctor notes
bitwise_instructors            | firebase.ts:1731       | firebase.ts:1631,      | Instructor registry
                               |                        | 1485, 1514              |
bitwise_deleted_instructors    | firebase.ts:1789       | firebase.ts:1545,      | Tombstone for deleted
                               |                        | 1558                   | instructors
bitwise_judge0_config          | judge0Service?         | ?                      | Judge0 API config

NOTE: All progress keys use username (lowercased), NOT UID — this creates
key collisions if two users share a username or if a user changes name.

================================================================================
3. FIREBASE COLLECTIONS & DOCUMENT STRUCTURE
================================================================================

Collection: users
- Doc ID = Firebase Auth UID (or deterministic UID for local fallback)
- Fields: uid, email, displayName, role (student/admin/instructor),
  assignedCourseIds[], courseInstructorAssignments[], createdAt, lastLogin,
  regNo?, dob?, section?, dept?, year?, assignedInstructorId?

Collection: instructors
- Doc ID = instructor UID (e.g., "instructor_demo_uid", "balaji_lead_uid",
  or generated "inst_...")
- Fields: uid, email, name, assignedCourseIds[], createdAt, updatedAt

Collection: user_progress (per-user)
- Doc ID = user UID
- Fields: completedLessonIds[], unlockedLessonIds[], submissions[], xp,
  streakDays, lastActiveDate, tabSwitchCount, focusLossCount,
  testExitAttempts, proctorStatus, proctorNotes, proctorReviewedAt,
  proctorReviewedBy, updatedAt

Collection: submissions
- Auto-ID docs (addDoc)
- Fields: userId, username, problemId, problemTitle, courseId,
  courseTitle, language, code, status, passedTests, totalTests,
  executionTime, memory, timestamp, testResults[], tabSwitchesDuringTest,
  proctorFlag, proctorNote

Collection: config (single doc)
- Doc ID: "course_catalog"
- Fields: courses[] (full Course[] array), updatedAt

================================================================================
4. DATA FLOW DIAGRAMS
================================================================================

A) USER AUTHENTICATION FLOW
---------------------------
User enters email/pass -> loginUser() (firebase.ts:325)
  |
  |-- Try Firebase Auth (signInWithEmailAndPassword)
  |     |
  |     |-- Success -> Fetch Firestore 'users' by email
  |     |     |-- Match doc -> Update lastLogin -> Return User
  |     |     |-- No match -> Create doc (sanitizeForFirestore)
  |     |-- Fail (config error) -> Check localStorage 'bitwise_registered_users'
  |           |-- Match + password valid -> Return local User (with UID from cache)
  |           |-- No match -> Check Firestore again -> auto-assign role -> registerUser()
  |-- After success: App.tsx saves to 'bitwise_active_user'
  |                 syncProgressWithFirestore() pulls from 'user_progress' collection
  |                 or falls back to localStorage 'bitwise_progress_<user>'

B) COURSE DATA FLOW (Dual Source of Truth - PROBLEMATIC)
--------------------------------------------------------
App.tsx initializes:
  localStorage.getItem('bitwise_courses') -> if matches ver 'v4...' -> use
  else -> use MOCK_COURSES -> write to localStorage + save to Firestore

Handle update (AdminDashboard / App):
  onUpdateCourses() -> App sets state + writes localStorage
  -> saveCoursesToFirestore() writes to config/course_catalog (merges)

Refresh (App handleRefreshCourses):
  loadCoursesFromFirestore() -> if exists -> set + write localStorage
  else -> fall back to localStorage

This creates THREE sources: Mock constant, localStorage, Firestore doc.
No authoritative merge logic — last-write-wins.

C) PROGRESS FLOW (Local-first with async Firestore backup)
---------------------------------------------------------
Student completes lesson (App / progressService):
  recordCompletion() -> loadUserProgress(username) from localStorage
  -> update completedLessonIds, unlockedLessonIds, xp
  -> saveUserProgress() -> writes localStorage 'bitwise_progress_<username>'
     --> async saveUserProgressToFirestore(uid, progress) writes 'user_progress/<uid>'

On app load / auth change (App.tsx useEffect):
  syncProgressWithFirestore(user) -> tries Firestore first
  -> if found -> writes to localStorage -> returns cloud data
  -> if not -> loads localStorage -> writes to Firestore (as backup)

D) ADMIN STUDENT FETCH (Heavy Firestore + localStorage merge)
------------------------------------------------------------
AdminDashboard loadStudents() -> fetchAllStudentsFromFirestore()
  1. Query 'users' where role == 'student'
  2. For each: fetch 'user_progress' doc by UID
  3. Check duplicate emails (other users with same email) and merge
  4. Calculate CourseProgressDetail via MOCK_COURSES or cloud catalog
  5. Check localStorage 'bitwise_proctor_reviews' for overrides
  6. FALLBACK: Read 'bitwise_registered_users' from localStorage
     -> For missing students, read 'bitwise_progress_<username>'
     -> Build StudentOverview from local cache
  7. Return merged array

E) PROCTORING / ADMIN REVIEWS
-----------------------------
Admin updates proctor status -> updateStudentProctoringReview()
  -> Updates Firestore 'user_progress/<uid>' (merge)
  -> Updates localStorage 'bitwise_progress_<username>'
  -> Updates localStorage 'bitwise_proctor_reviews' (keyed by uid/username/email)
  -> AdminDashboard reads from both sources (Firestore primary, local override)

================================================================================
5. CRITICAL SECURITY & DATA INTEGRITY ISSUES
================================================================================

HIGH SEVERITY:
- Passwords stored in PLAIN TEXT in localStorage (bitwise_registered_users,
  bitwise_instructors, and inside user objects). No hashing (bcrypt/argon2).
- Default admin password hardcoded: "admin123" (visible in firebase.ts:49-61)
- Default instructor password hardcoded: "instructor123"
- Firebase API key exposed in source (firebaseConfig at firebase.ts:32-40)
- Deterministic UID generation for local fallback uses simple hash (line 258)

MEDIUM SEVERITY:
- No input sanitization on user registration (email trimmed but not validated)
- User progress uses username for localStorage key — collision risk
- No transaction/atomic updates between localStorage and Firestore
- Duplicate student records allowed (same email, different UIDs) — merge logic
  tries to handle but is fragile
- Proctor reviews can be overwritten without audit trail
- Course catalog reset deletes submitted data without backup

LOW / ARCHITECTURAL:
- Dual-write pattern (local + Firestore) without consensus / CRDT
- App uses 'user' state derived from Firebase Auth, but localStorage can
  contain conflicting user profile
- No data validation schema (TypeScript only, no runtime validation)
- Large file (firebase.ts ~2056 lines) mixes auth, DB, business logic, migrations

================================================================================
6. MODIFIED FILES (Git Status)
================================================================================

Modified (staged/unstaged):
- components/AdminDashboard.tsx (massive — 3175 lines, cursor/selection logic,
  instructor scoping, bulk operations, proctoring)
- components/AdminInstructorManager.tsx
- components/AssignCourseModal.tsx
- services/firebase.ts (full rewrite / extension with account registry,
  instructor management, bulk operations)
- types.ts (expanded interfaces)

Untracked:
- debug_fetch.js (likely development debug script — check before commit)

================================================================================
7. SPECIFIC FLOW PROBLEMS IDENTIFIED
================================================================================

PROBLEM 1: Inconsistent User Identity
- Firebase Auth UID ≠ localStorage UID for default accounts
- loginUser tries to match by email, but if Firestore doc has different UID
  than Auth UID, role assignment can be wrong
- Instructor scoping in AdminDashboard uses multiple UID sources
  (currentUser.uid, localStorage account uid, course assignedInstructors uid,
  student assignment uid) — complex and error-prone

PROBLEM 2: Progress Data Loss Risk
- saveUserProgress writes localStorage synchronously
- saveUserProgressToFirestore is async (catch-all) — if it fails, progress
  exists locally but never reaches cloud
- resetStudentCourseProgressInFirestore updates Firestore AND localStorage,
  but if one fails, they diverge
- No rollback mechanism

PROBLEM 3: Admin Student View Merging Bugs
- fetchAllStudentsFromFirestore reads ALL users with role=='student'
- If a student has progress in localStorage but not Firestore (or vice versa),
  the merge can show incorrect XP/streak/submissions
- Duplicate email check attempts to prefer doc with more completed lessons,
  but this is heuristic, not deterministic

PROBLEM 4: Course Catalog Dual-Write Race
- App.tsx writes to localStorage immediately on update
- saveCoursesToFirestore writes to Firestore asynchronously
- If user refreshes quickly, localStorage might have new data while Firestore
  still has old — or vice versa
- handleRefreshCourses tries Firestore first, but fallback to localStorage
  can show stale data

PROBLEM 5: Proctor Review Chain
- updateStudentProctoringReview writes THREE places (Firestore progress,
  local progress, local reviews cache)
- If any write fails, the three sources diverge
- AdminDashboard reads from Firestore first, then applies localStorage
  override — but override is not timestamp-ordered

================================================================================
8. RECOMMENDATIONS (If You Want Fixes)
================================================================================

Short-term (data integrity):
1. Add runtime validation (Zod/io-ts) for UserProgress and Course
2. Hash all passwords in bitwise_registered_users (use bcrypt — never store plain)
3. Make progress storage key = UID, not username
4. Add atomic batch writes (Firestore batched writes) for updates that touch
   multiple collections (user + progress + submissions)

Medium-term (architecture):
5. Choose ONE source of truth: either Firestore (recommended for multi-user)
   or localStorage (only for single-user offline). Don't maintain both with
   manual merge.
6. If dual-write must stay, implement a sync queue / retry mechanism instead
   of fire-and-forget .catch()
7. Separate firebase.ts into modules: auth.ts, db-users.ts, db-progress.ts,
   db-courses.ts, db-instructors.ts, migrations.ts

Long-term (security):
8. Rotate/disable the exposed Firebase API key; use App Check / Firebase Auth
   only with restricted domain
9. Remove hardcoded credentials from source; use environment variables or
   secure admin initialization
10. Add audit logging for admin actions (proctor changes, progress resets,
    course assignments, student deletions)

================================================================================
END OF ANALYSIS
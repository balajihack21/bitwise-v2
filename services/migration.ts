import { getDocs, collection, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const mergeProgressObjects = (base: any, incoming: any): any => {
  if (!base) return incoming || {};
  if (!incoming) return base;

  const statusPriority: Record<string, number> = { CLEAN: 0, WARNING: 1, FLAGGED: 2, EXCUSED: 3 };
  const baseStatus = base.proctorStatus || 'CLEAN';
  const incomingStatus = incoming.proctorStatus || 'CLEAN';
  const proctorStatus = statusPriority[baseStatus] >= statusPriority[incomingStatus] ? baseStatus : incomingStatus;

  const combined = {
    ...base,
    ...incoming,
    completedLessonIds: Array.from(new Set([...(base.completedLessonIds || []), ...(incoming.completedLessonIds || [])])),
    unlockedLessonIds: Array.from(new Set([...(base.unlockedLessonIds || []), ...(incoming.unlockedLessonIds || [])])),
    submissions: [...(base.submissions || []), ...(incoming.submissions || [])].reduce((acc: any[], item: any) => {
      const key = item?.id || JSON.stringify(item);
      if (!acc.some((x: any) => (x?.id || JSON.stringify(x)) === key)) acc.push(item);
      return acc;
    }, []),
    xp: Math.max(base.xp || 0, incoming.xp || 0),
    streakDays: Math.max(base.streakDays || 1, incoming.streakDays || 1),
    lastActiveDate: base.lastActiveDate || incoming.lastActiveDate || new Date().toISOString().split('T')[0],
    tabSwitchCount: Math.max(base.tabSwitchCount || 0, incoming.tabSwitchCount || 0),
    focusLossCount: Math.max(base.focusLossCount || 0, incoming.focusLossCount || 0),
    testExitAttempts: Math.max(base.testExitAttempts || 0, incoming.testExitAttempts || 0),
    proctorStatus,
    proctorNotes: base.proctorNotes || incoming.proctorNotes || '',
    proctorReviewedAt: base.proctorReviewedAt || incoming.proctorReviewedAt || '',
    proctorReviewedBy: base.proctorReviewedBy || incoming.proctorReviewedBy || '',
    updatedAt: new Date().toISOString()
  };

  return combined;
};

/**
 * Merges duplicate student progress records by matching email across users.
 * The canonical doc is preferred by:
 * 1) seed_... UID if present
 * 2) higher progress volume
 * 3) latest createdAt
 */
export const mergeDuplicateStudentProgressRecords = async (): Promise<{ merged: number; skipped: number; errors: string[] }> => {
  const errors: string[] = [];
  let merged = 0;
  let skipped = 0;

  const getLocalStudentMap = (): Map<string, any> => {
    const map = new Map<string, any>();
    try {
      const raw = localStorage.getItem('bitwise_registered_users');
      if (!raw) return map;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return map;
      for (const item of list) {
        const email = String(item?.email || '').trim().toLowerCase();
        if (!email) continue;
        map.set(email, item);
      }
    } catch (e) {
      // ignore localStorage issues
    }
    return map;
  };

  try {
    const userSnap = await getDocs(collection(db, 'users'));
    const usersByEmail = new Map<string, any[]>();
    const localStudentMap = getLocalStudentMap();

    for (const docSnap of userSnap.docs) {
      const data = docSnap.data();
      if (data.role !== 'student') continue;
      const email = String(data.email || '').trim().toLowerCase();
      if (!email) continue;
      if (!usersByEmail.has(email)) usersByEmail.set(email, []);
      usersByEmail.get(email)!.push({ id: docSnap.id, data });
    }

    const progressSnap = await getDocs(collection(db, 'user_progress'));
    const progressById = new Map(progressSnap.docs.map(doc => [doc.id, doc.data()]));

    // First pass: merge actual duplicate student records already present in Firestore
    for (const [email, group] of usersByEmail.entries()) {
      if (group.length < 2) {
        skipped++;
        continue;
      }

      const canonical = [...group].sort((a, b) => {
        const aIsSeed = a.id.startsWith('seed_');
        const bIsSeed = b.id.startsWith('seed_');
        if (aIsSeed !== bIsSeed) return aIsSeed ? -1 : 1;
        const aScore = Number((a.data?.assignedCourseIds || []).length) + Number((a.data?.courseInstructorAssignments || []).length);
        const bScore = Number((b.data?.assignedCourseIds || []).length) + Number((b.data?.courseInstructorAssignments || []).length);
        if (aScore !== bScore) return bScore - aScore;
        return new Date(b.data?.createdAt || 0).getTime() - new Date(a.data?.createdAt || 0).getTime();
      })[0];

      const canonicalId = canonical.id;
      let canonicalProgress: any = progressById.get(canonicalId) || {};

      for (const entry of group) {
        if (entry.id === canonicalId) continue;
        const duplicateProgress = progressById.get(entry.id) || {};
        canonicalProgress = mergeProgressObjects(canonicalProgress, duplicateProgress);
        await setDoc(doc(db, 'user_progress', canonicalId), canonicalProgress, { merge: true });
        await setDoc(doc(db, 'user_progress', entry.id), canonicalProgress, { merge: true });
        merged++;
      }
    }

    // Second pass: catch orphan generated progress docs for students whose canonical seeded record exists locally or in Firestore
    const allUserIds = new Set<string>(userSnap.docs.map(doc => doc.id));
    const progressIds = new Set<string>(progressSnap.docs.map(doc => doc.id));
    const localEmailMap = localStudentMap;

    for (const [progressId, progressData] of progressById.entries()) {
      if (allUserIds.has(progressId)) continue;
      if (!progressId.startsWith('usr_')) continue;

      const localUser = Array.from(localEmailMap.entries()).find(([email, user]) => {
        const uid = user?.uid || '';
        return uid === progressId;
      });

      const email = localUser?.[0];
      if (!email) continue;

      const matchingStudent = userSnap.docs.find(doc => {
        const data = doc.data();
        return data.role === 'student' && String(data.email || '').trim().toLowerCase() === email;
      });
      if (!matchingStudent) continue;

      const canonicalId = matchingStudent.id;
      const canonicalProgress = mergeProgressObjects(progressById.get(canonicalId) || {}, progressData);
      await setDoc(doc(db, 'user_progress', canonicalId), canonicalProgress, { merge: true });
      await setDoc(doc(db, 'user_progress', progressId), canonicalProgress, { merge: true });
      merged++;
      progressIds.delete(progressId);
    }

    return { merged, skipped, errors };
  } catch (e) {
    errors.push(`Migration failed: ${String(e)}`);
    return { merged, skipped, errors };
  }
};

/**
 * Normalizes the users collection to ensure required assignment fields exist.
 * This does NOT delete user documents, nor does it override existing valid assignments
 * (it only fills in missing values).
 */
export const sanitizeStudentAssignments = async (): Promise<{ updated: number; skipped: number; errors: number }> => {
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const snap = await getDocs(collection(db, 'users'));
    for (const d of snap.docs) {
      const data = d.data();

      // We only want to normalize student documents.
      if (data.role !== 'student') {
        skipped++;
        continue;
      }

      // Check if fields are missing
      const needsUpdate = !('assignedCourseIds' in data) || !('assignedInstructorId' in data) || !('courseInstructorAssignments' in data);

      if (needsUpdate) {
        try {
          await updateDoc(d.ref, {
            assignedCourseIds: Array.isArray(data.assignedCourseIds) ? data.assignedCourseIds : [],
            assignedInstructorId: 'assignedInstructorId' in data ? data.assignedInstructorId : null,
            courseInstructorAssignments: Array.isArray(data.courseInstructorAssignments) ? data.courseInstructorAssignments : []
          });
          updated++;
        } catch (e) {
          console.error(`Failed to update ${d.id}`, e);
          errors++;
        }
      } else {
        skipped++;
      }
    }
  } catch (e) {
    console.error('Migration failed', e);
    throw e;
  }

  return { updated, skipped, errors };
};

import { getDocs, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

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

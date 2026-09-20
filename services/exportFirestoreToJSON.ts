import { getDoc, getDocs, collection, doc } from '@firebase/firestore';
import { db } from './firebase';

export const exportFirestoreToJSON = async () => {
  const collectionsToFetch = ['users', 'courses', 'user_progress', 'submissions', 'instructors', 'proctor_logs'];
  const result: Record<string, any[]> = {};
  for (const colName of collectionsToFetch) {
    try {
      const snap = await getDocs(collection(db, colName));
      result[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      result[colName] = [{ error: String(e) }];
    }
  }

  // The full syllabus is stored as config/course_catalog; the courses collection
  // may only contain partial per-course schedule documents.
  try {
    const catalogSnap = await getDoc(doc(db, 'config', 'course_catalog'));
    if (catalogSnap.exists()) {
      const catalog = catalogSnap.data();
      result.course_catalog = [{ id: catalogSnap.id, ...catalog }];
      if (Array.isArray(catalog.courses) && catalog.courses.length > 0) {
        result.courses = catalog.courses.map((course: any) => ({
          ...course,
          id: course.id || course.courseId
        }));
      }
    } else {
      result.course_catalog = [];
    }
  } catch (e) {
    result.course_catalog = [{ error: String(e) }];
  }
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'firestore_export.json'; a.click();
  URL.revokeObjectURL(url);
  return result;
};

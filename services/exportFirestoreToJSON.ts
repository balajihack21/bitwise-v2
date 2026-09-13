import { getDocs, collection } from '@firebase/firestore';
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
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'firestore_export.json'; a.click();
  URL.revokeObjectURL(url);
  return result;
};

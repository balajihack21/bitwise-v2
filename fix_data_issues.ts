// Fix script: Run this in a browser console / admin panel with Firebase access
// Fixes 1: Populates course catalog if empty
// Fixes 2: Normalizes student courseInstructorAssignments to use instructor uid

import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from './services/firebase';
import { MOCK_COURSES } from './constants';

export async function fixDataIssues() {
  // 1. Ensure course catalog exists
  try {
    const catalogRef = doc(db, 'config', 'course_catalog');
    const snap = await getDoc(catalogRef);
    if (!snap.exists() || !snap.data().courses || snap.data().courses.length === 0) {
      await setDoc(catalogRef, { courses: MOCK_COURSES, updatedAt: new Date().toISOString() }, { merge: true });
      console.log('Course catalog restored from MOCK_COURSES');
    }
  } catch (e) { console.error('Catalog fix failed:', e); }

  // 2. Normalize student assignments (email -> uid mapping)
  const instructorUidMap = {
    'vaheetha@gmail.com': 'usr_3dmh1oh_1h4s',
    'instructor@bitwise.com': 'instructor_demo_uid',
    'mailztobalaji@gmail.com': 'balaji_lead_uid'
  };

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const d of usersSnap.docs) {
      const data = d.data();
      if (data.role === 'student' && Array.isArray(data.courseInstructorAssignments)) {
        let changed = false;
        const updatedAssignments = data.courseInstructorAssignments.map((a: any) => {
          if (a.instructorId && !a.instructorId.includes('@') && a.instructorId.length < 30) return a; // already uid-like
          const mapped = instructorUidMap[a.instructorId || a.instructorEmail];
          if (mapped) {
            changed = true;
            return { ...a, instructorId: mapped };
          }
          return a;
        });
        if (changed) {
          await setDoc(doc(db, 'users', d.id), { courseInstructorAssignments: updatedAssignments }, { merge: true });
          console.log('Normalized assignments for', d.id);
        }
      }
    }
  } catch (e) { console.error('Assignment normalization failed:', e); }
}

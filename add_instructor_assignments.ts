import { doc, setDoc } from 'firebase/firestore';
import { db } from './services/firebase';

async function addSecondInstructor() {
  const studentIds = ['seed_312824104020', 'seed_312824104021', 'seed_312824104022'];
  for (const uid of studentIds) {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, {
      courseInstructorAssignments: [
        { courseId: 'python-programming', instructorId: 'usr_3dmh1oh_1h4s', assignedAt: '2026-09-13T08:35:05.093Z' },
        { courseId: 'python-programming', instructorId: 'instructor_demo_uid', assignedAt: '2026-09-13T09:00:00.000Z' }
      ]
    }, { merge: true });
    console.log('Updated', uid, 'with 2 instructors');
  }
}
addSecondInstructor();

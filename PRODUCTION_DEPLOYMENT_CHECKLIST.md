# Production Deployment Checklist for Live Data Safety

This checklist is meant for the Bitwise Learning Hub app when working on real data in a live environment.

## 1. Before any update

- Export the live Firestore data first.
- Use the built-in export utility from [services/exportFirestoreToJSON.ts](services/exportFirestoreToJSON.ts).
- Save the export to a dated backup file before changing records.
- Keep a copy of the browser localStorage values if you suspect stale cache issues.

## 2. Safe rules for live data

- Firestore is the source of truth.
- localStorage is only a temporary fallback and should not control critical identity or progress logic.
- Do not delete student records, progress docs, or instructor assignments without a backup.
- Do not run bulk resets on production unless the change is explicitly intended.

## 3. Recommended update workflow

1. Test the change locally with a small dataset.
2. Copy the real data structure to a testing/staging environment if available.
3. Run the migration/update only on the target collection and only for the affected user(s).
4. Validate the student identity, assigned instructor, progress, and marks after the update.
5. Refresh the browser once after deployment to clear stale frontend state.

## 4. Verify after update

Check these items after every important live change:

- Student login still works for the same email/UID.
- Assigned instructor remains correct.
- Student sees only their assigned course/progress.
- Progress and submissions still belong to the correct student.
- Coding test schedule and internal marks still match Firestore values.
- No duplicate student docs are created.

## 5. When to clear localStorage

Clear localStorage only when:

- a release changes the app data model
- stale browser cache is causing wrong values
- you intentionally want to simulate a fresh user session during testing

Do not ask all students to clear storage during routine updates unless you have a migration issue.

## 6. Do not do this on production casually

Avoid these actions without backup and validation:

- deleting all students
- deleting all user_progress records
- deleting all submissions
- resetting instructor mapping
- wiping course assignments

## 7. Minimal safe deployment process

- Backup Firestore export
- Test in staging or local copy
- Update only affected users/records
- Re-check identity and assignment logic
- Refresh browser once
- Monitor the first few real student sessions

## 8. Good production mindset

The app should behave correctly even if a browser has old localStorage data, because Firebase should be the final source of truth. If a stale local value still overrides the real Firestore state, treat that as a bug to fix before going live.

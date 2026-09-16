import React, { useState, useEffect } from 'react';
import { Course, InstructorAccount } from '../types';
import { fetchInstructorsList, assignCourseToInstructor, unassignInstructorFromCourse } from '../services/firebase';

interface AssignCourseModalProps {
  isOpen: boolean;
  course: Course | null;
  onClose: () => void;
  onUpdatedCourses?: (courses: Course[]) => void;
  onAssign?: (courseId: string, instructorEmail: string, instructorName?: string) => void;
}

export const AssignCourseModal: React.FC<AssignCourseModalProps> = ({
  isOpen,
  course,
  onClose,
  onUpdatedCourses,
  onAssign
}) => {
  const [instructors, setInstructors] = useState<InstructorAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && course) {
      setIsLoading(true);
      fetchInstructorsList().then(list => {
        setInstructors(list);
        setSelectedEmail(course.assignedInstructorEmail || course.assignedInstructors?.[0]?.email || '');
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [isOpen, course]);

  if (!isOpen || !course) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (!selectedEmail) {
        // Remove all assigned instructors
        const current = course.assignedInstructors || [];
        let updatedCourses: Course[] = [];
        for (const inst of current) {
          updatedCourses = await unassignInstructorFromCourse(course.id, inst.uid);
        }
        if (onUpdatedCourses) onUpdatedCourses(updatedCourses);
        if (onAssign) onAssign(course.id, '', '');
        onClose();
      } else {
        const inst = instructors.find(i => i.email.toLowerCase() === selectedEmail.toLowerCase());
        const instName = inst ? inst.name : selectedEmail.split('@')[0];
        let updated = course.assignedInstructors ? [...(course.assignedInstructors as any)] : [];
        for (const current of updated) {
          updated = await unassignInstructorFromCourse(course.id, current.uid);
        }
        updated = await assignCourseToInstructor(course.id, selectedEmail, instName, inst?.uid);
        if (onUpdatedCourses) onUpdatedCourses(updated);
        onClose();
      }
    } catch (err: any) {
      setFeedback(err.message || 'Failed to update assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">
              <i className="fa-solid fa-chalkboard-user"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm">Assign / Reassign Course Instructor</h3>
              <p className="text-[10px] text-slate-300 truncate max-w-xs">{course.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {feedback && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200">
              {feedback}
            </div>
          )}

          {/* Current multi-instructor badges */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Current Instructor Assignment
            </label>
            <div className="flex flex-wrap gap-2">
              {(course.assignedInstructors || []).length === 0 ? (
                <span className="text-xs text-slate-400 italic">No instructors assigned yet</span>
              ) : (
                (course.assignedInstructors || []).map((inst) => (
                  <span key={inst.uid} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bitwise-50 text-bitwise-700 text-xs font-bold rounded-full border border-bitwise-200">
                    <i className="fa-solid fa-user-tie text-[10px]"></i>
                    {inst.name || inst.email}
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Assign Instructor (by email)
            </label>
            {isLoading ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading instructors...</div>
            ) : (
              <select
                value={selectedEmail}
                onChange={e => setSelectedEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Unassigned (No Instructor) --</option>
                {instructors.map(inst => (
                  <option key={inst.email} value={inst.email}>
                    {inst.name} ({inst.email})
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Reassigning replaces the current instructor for this course. The assigned instructor will have access to track student progress and view live submissions.
            </p>
          </div>

          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 text-[11px] text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <i className="fa-solid fa-circle-info text-blue-600"></i>
              Manage Assignments
            </div>
            <p>Select an instructor from the dropdown to assign or reassign this course.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
              <span>Save Assignment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

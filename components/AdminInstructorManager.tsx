import React, { useState, useEffect } from 'react';
import { Course, InstructorAccount } from '../types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  fetchInstructorsList,
  saveInstructorAccount,
  deleteInstructorAccount,
  assignCourseToInstructor,
  unassignInstructorFromCourse,
  fetchAllStudentsFromFirestore,
  bulkAssignStudentsToCourse
} from '../services/firebase';

interface AdminInstructorManagerProps {
  courses: Course[];
  onUpdateCourses: (courses: Course[]) => void;
}

export const AdminInstructorManager: React.FC<AdminInstructorManagerProps> = ({
  courses,
  onUpdateCourses
}) => {
  const [instructors, setInstructors] = useState<InstructorAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  // Quick Assignment state
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedInstructorEmail, setSelectedInstructorEmail] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // New Instructor modal / form state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('instructor123');
  const [newSelectedCourses, setNewSelectedCourses] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  // Student assignment filter / selection state
  const [assignFilterYear, setAssignFilterYear] = useState<string>('');
  const [assignFilterDept, setAssignFilterDept] = useState<string>('');
  const [assignFilterSection, setAssignFilterSection] = useState<string>('');
  const [studentAssignmentMode, setStudentAssignmentMode] = useState<'none' | 'all-matched' | 'selected'>('none');
  const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
  const [studentList, setStudentList] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);

  const loadInstructors = async () => {
    setIsLoading(true);
    try {
      const list = await fetchInstructorsList();
      setInstructors(list);
    } catch (e: any) {
      console.error('Failed to load instructors:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInstructors();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      showToast('Please select a course to assign.', 'error');
      return;
    }
    if (!selectedInstructorEmail) {
      showToast('Please select an instructor.', 'error');
      return;
    }

    const instructor = instructors.find(i => i.email.toLowerCase() === selectedInstructorEmail.toLowerCase());
    const course = courses.find(c => c.id === selectedCourseId);
    if (!instructor || !course) return;

    setIsAssigning(true);
    try {
      const updated = await assignCourseToInstructor(
        course.id,
        instructor.email,
        instructor.name,
        instructor.uid
      );
      onUpdateCourses(updated);
      await loadInstructors();
      setSelectedCourseId('');
      setSelectedInstructorEmail('');
      showToast(`Assigned "${course.title}" to ${instructor.name} (${instructor.email}) successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to assign course.', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (courseId: string, courseTitle: string, instructorName: string, instructorUid: string) => {
    if (!window.confirm(`Are you sure you want to unassign "${courseTitle}" from instructor ${instructorName}?`)) {
      return;
    }

    try {
      const updated = await unassignInstructorFromCourse(courseId, instructorUid);
      onUpdateCourses(updated);
      await loadInstructors();
      showToast(`Unassigned "${courseTitle}" successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to unassign course.', 'error');
    }
  };

  const handleDeleteInstructor = async (instructor: InstructorAccount) => {
    const assignedCoursesList = courses.filter(c => 
      instructor.assignedCourseIds?.includes(c.id) || 
      c.assignedInstructorEmail?.toLowerCase() === instructor.email.toLowerCase()
    );
    const assignedCount = assignedCoursesList.length;

    const confirmMsg = assignedCount > 0
      ? `Are you sure you want to delete instructor "${instructor.name}" (${instructor.email})?\n\nThis will revoke their instructor account and unassign all (${assignedCount}) course(s) currently linked to them.`
      : `Are you sure you want to delete instructor "${instructor.name}" (${instructor.email})?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingEmail(instructor.email);
    try {
      const updatedCourses = await deleteInstructorAccount(instructor.email, instructor.uid);
      onUpdateCourses(updatedCourses);
      await loadInstructors();
      showToast(`Instructor "${instructor.name}" (${instructor.email}) deleted successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete instructor.', 'error');
    } finally {
      setDeletingEmail(null);
    }
  };

  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast('Please fill in instructor name and email.', 'error');
      return;
    }

    const emailClean = newEmail.trim().toLowerCase();
    const existing = instructors.find(i => i.email.toLowerCase() === emailClean);
    if (existing) {
      showToast(`An instructor with email ${emailClean} already exists.`, 'error');
      return;
    }

    setIsCreating(true);
    try {
      const newInst: InstructorAccount = {
        uid: `inst-${Date.now()}`,
        name: newName.trim(),
        email: emailClean,
        assignedCourseIds: newSelectedCourses,
        createdAt: new Date().toISOString()
      };

      await saveInstructorAccount(newInst);

      // If courses were pre-selected, update them
      if (newSelectedCourses.length > 0) {
        let currentCourses = [...courses];
        for (const cid of newSelectedCourses) {
          const c = currentCourses.find(item => item.id === cid);
          if (c) {
            currentCourses = await assignCourseToInstructor(
              c.id,
              newInst.email,
              newInst.name,
              newInst.uid
            );
          }
        }
        onUpdateCourses(currentCourses);
      }

      await loadInstructors();
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('instructor123');
      setNewSelectedCourses([]);
      showToast(`Instructor account created for ${newInst.name}! They can now log in.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create instructor.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border shadow-sm animate-in fade-in ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-rose-600'}`}></i>
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Top Banner & Quick Assignment Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Assign Form Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base shadow-2xs">
                <i className="fa-solid fa-chalkboard-user"></i>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Assign Course to Instructor</h2>
                <p className="text-xs text-slate-500">
                  Select a curriculum track and assign an instructor to grant them student progress tracking access.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-user-plus text-[11px]"></i>
              <span>Add New Instructor</span>
            </button>
          </div>

          <form onSubmit={handleQuickAssign} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Select Course
              </label>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Choose Course Track --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.assignedInstructorName ? `(Currently: ${c.assignedInstructorName})` : '(Unassigned)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Select Instructor
              </label>
              <select
                value={selectedInstructorEmail}
                onChange={e => setSelectedInstructorEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Choose Instructor --</option>
                {instructors.map(inst => (
                  <option key={inst.email} value={inst.email}>
                    {inst.name} ({inst.email}) - {inst.assignedCourseIds?.length || 0} assigned
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isAssigning || !selectedCourseId || !selectedInstructorEmail}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isAssigning ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-link"></i>
                )}
                <span>Assign</span>
              </button>
            </div>
          </form>
        </div>

        {/* Info & Access Control Summary Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl p-6 border border-blue-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider mb-2">
              <i className="fa-solid fa-shield-halved text-blue-600"></i>
              Instructor RBAC Policy
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Strict Role-Based Scoping</h3>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex items-start gap-1.5">
                <i className="fa-solid fa-check text-emerald-600 mt-0.5 text-[10px]"></i>
                <span><strong>Progress Monitoring:</strong> Full visibility into student completion, XP, streaks, and test cases.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <i className="fa-solid fa-check text-emerald-600 mt-0.5 text-[10px]"></i>
                <span><strong>Exam Proctoring:</strong> Audit tab switches, blur losses, and record review notes.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <i className="fa-solid fa-ban text-rose-500 mt-0.5 text-[10px]"></i>
                <span><strong>Curriculum Protected:</strong> Read-only access to lessons & challenges. Only Admins can modify content.</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-200/70 text-[11px] text-blue-800 font-mono flex items-center justify-between">
            <span>Active Instructors: <strong>{instructors.length}</strong></span>
            <span>Platform Courses: <strong>{courses.length}</strong></span>
          </div>
        </div>
      </div>


      {/* Student Batch Assignment Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-4 bg-slate-50/60 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-graduation-cap text-blue-600"></i>
            Batch Student Assignment
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter students by year, department, and section to assign them to specific instructors and courses.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input placeholder="Year" value={assignFilterYear} onChange={e => setAssignFilterYear(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
            <input placeholder="Department" value={assignFilterDept} onChange={e => setAssignFilterDept(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
            <input placeholder="Section" value={assignFilterSection} onChange={e => setAssignFilterSection(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
            <button
              onClick={async () => {
                setIsLoadingStudents(true);
                const allStudents = await fetchAllStudentsFromFirestore();
                const filtered = allStudents.filter(u =>
                  (assignFilterYear ? u.year?.includes(assignFilterYear) : true) &&
                  (assignFilterDept ? u.dept?.includes(assignFilterDept) : true) &&
                  (assignFilterSection ? u.section?.includes(assignFilterSection) : true)
                );
                setStudentList(filtered);
                setIsLoadingStudents(false);
              }}
              className="bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Search
            </button>
          </div>

          {/* Student List */}
          {isLoadingStudents ? <div>Loading...</div> : studentList.length > 0 && (
            <div className="space-y-2 mt-4">
              {studentList.map(s => (
                <div key={s.uid} className="flex items-center gap-2 p-2 border rounded-lg">
                  <input type="checkbox" onChange={e => {
                    const next = new Set(selectedStudentUids);
                    if (e.target.checked) next.add(s.uid!);
                    else next.delete(s.uid!);
                    setSelectedStudentUids(next);
                  }} />
                  <span className="text-xs">{s.username} - {s.regNo}</span>
                </div>
              ))}

              {/* Batch Assignment Form */}
              <div className="border-t pt-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="border px-2 py-2 rounded text-xs bg-slate-50"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <select
                    value={selectedInstructorEmail}
                    onChange={e => setSelectedInstructorEmail(e.target.value)}
                    className="border px-2 py-2 rounded text-xs bg-slate-50"
                  >
                    <option value="">Select Instructor</option>
                    {instructors.map(i => (
                      <option key={i.email} value={i.email}>{i.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      if (selectedStudentUids.size === 0) {
                        showToast('Select at least one student.', 'error');
                        return;
                      }
                      if (!selectedCourseId) {
                        showToast('Select a course.', 'error');
                        return;
                      }
                      if (!selectedInstructorEmail) {
                        showToast('Select an instructor.', 'error');
                        return;
                      }
                      const inst = instructors.find(i => i.email.toLowerCase() === selectedInstructorEmail.toLowerCase());
                      const res = await bulkAssignStudentsToCourse(
                        Array.from(selectedStudentUids),
                        selectedCourseId,
                        inst?.uid
                      );
                      showToast(`Assigned ${res.success} students, failed ${res.failed}`);
                    }}
                    className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold cursor-pointer hover:bg-blue-700"
                  >
                    Assign Selected
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructors Directory & Assigned Courses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-users-gear text-blue-600"></i>
              Instructor Accounts & Assigned Courses ({instructors.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage instructors and see exactly which courses are assigned to each instructor.
            </p>
          </div>

          <button
            onClick={loadInstructors}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <i className="fa-solid fa-arrows-rotate text-[11px]"></i>
            <span>Refresh Directory</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-blue-600"></i>
            <p className="text-xs">Loading instructor accounts and course mappings...</p>
          </div>
        ) : instructors.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <i className="fa-solid fa-chalkboard-user text-3xl mb-2 text-slate-300"></i>
            <p className="text-sm font-bold text-slate-700">No Instructor Accounts Found</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add New Instructor" to create an instructor login.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-3.5">Instructor</th>
                  <th className="p-3.5">Email & Credentials</th>
                  <th className="p-3.5">Assigned Courses</th>
                  <th className="p-3.5">Assign Another Course</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {instructors.map(inst => {
                  // Find all courses where this instructor is assigned
                  const assignedCoursesList = courses.filter(c => 
                    inst.assignedCourseIds?.includes(c.id) || 
                    c.assignedInstructorEmail?.toLowerCase() === inst.email.toLowerCase()
                  );

                  // Courses not yet assigned to this instructor
                  const unassignedToThisInst = courses.filter(c => 
                    !assignedCoursesList.some(ac => ac.id === c.id)
                  );

                  return (
                    <tr key={inst.email} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 align-top font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                            {inst.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{inst.name}</div>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full inline-block mt-0.5">
                              Instructor Role
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 align-top">
                        <div className="font-mono text-xs font-semibold text-slate-800">{inst.email}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Default Pass: <span className="font-mono text-slate-600">instructor123</span>
                        </div>
                      </td>

                      <td className="p-3.5 align-top">
                        {assignedCoursesList.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                            No courses assigned yet
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {assignedCoursesList.map(c => (
                              <div
                                key={c.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 shadow-2xs"
                              >
                                <i className="fa-solid fa-book-bookmark text-blue-600 text-[10px]"></i>
                                <span className="max-w-[220px] truncate" title={c.title}>
                                  {c.title}
                                </span>
                                <button
                                  onClick={() => handleUnassign(c.id, c.title, inst.name, inst.uid)}
                                  className="w-4 h-4 rounded hover:bg-blue-200 text-blue-600 hover:text-red-700 flex items-center justify-center text-[10px] cursor-pointer transition-colors ml-1"
                                  title={`Unassign ${c.title}`}
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 align-top">
                        {unassignedToThisInst.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              defaultValue=""
                              onChange={async (e) => {
                                const cid = e.target.value;
                                if (!cid) return;
                                const courseObj = courses.find(c => c.id === cid);
                                if (!courseObj) return;
                                try {
                                  const updated = await assignCourseToInstructor(
                                    courseObj.id,
                                    inst.email,
                                    inst.name,
                                    inst.uid
                                  );
                                  onUpdateCourses(updated);
                                  await loadInstructors();
                                  showToast(`Assigned "${courseObj.title}" to ${inst.name}.`);
                                } catch (err: any) {
                                  showToast(err.message || 'Failed to assign course.', 'error');
                                }
                                e.target.value = '';
                              }}
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none hover:border-blue-400 focus:bg-white cursor-pointer"
                            >
                              <option value="">+ Assign Course...</option>
                              {unassignedToThisInst.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">All courses assigned</span>
                        )}
                      </td>

                      <td className="p-3.5 align-top text-right">
                        <button
                          onClick={() => handleDeleteInstructor(inst)}
                          disabled={deletingEmail === inst.email}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          title={`Delete instructor ${inst.name} (${inst.email})`}
                        >
                          {deletingEmail === inst.email ? (
                            <i className="fa-solid fa-spinner fa-spin text-[10px]"></i>
                          ) : (
                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                          )}
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: CREATE / INVITE INSTRUCTOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-user-plus"></i>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Create New Instructor Account</h3>
                  <p className="text-[11px] text-slate-300">Grant instructor access to view student progress for assigned courses.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <form onSubmit={handleCreateInstructor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Balaji Arumugam"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address (Login Username)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. instructor@bitwise.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Temporary Password
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Instructor can sign in immediately using this password.</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Pre-Assign Course Tracks
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {courses.map(c => {
                    const isChecked = newSelectedCourses.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSelectedCourses([...newSelectedCourses, c.id]);
                            } else {
                              setNewSelectedCourses(newSelectedCourses.filter(id => id !== c.id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{c.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                  <span>Save Instructor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ...existing code...
import React, { useState, useEffect, useMemo } from 'react';
import { Course, Lesson, Module, ProctorStatus, User } from '../types';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { sanitizeForFirestore } from '../services/firebase';
import {
  fetchAllStudentsFromFirestore,
  fetchAllSubmissionsFromFirestore,
  saveCoursesToFirestore,
  resetAllFirebaseData,
  resetAllUserProgressInFirestore,
  resetUserProgressAndSubmissionsInFirestore,
  resetStudentCourseProgressInFirestore,
  StudentOverview,
  updateStudentProctoringReview,
  setStudentModuleDeadlineOverride,
  DEFAULT_ADMIN_CREDENTIALS,
  seedStudentsToFirestore,
  deleteStudentFromFirestore,
  exportFirestoreToJSON,
  sanitizeStudentAssignments,
  deduplicateInstructorUsers,
  mergeDuplicateStudentProgressRecords
} from '../services/firebase';
import { parseSeedFile, SeedStudentRow } from '../services/seedParser';
import { MOCK_COURSES } from '../constants';
import { exportStudentsToExcel, exportStudentsToCsv } from '../services/excelExportService';
import { AdminProblemEditorModal } from './AdminProblemEditorModal';
import { AdminInstructorManager } from './AdminInstructorManager';
import { AssignCourseModal } from './AssignCourseModal';
import { fetchInstructorsList } from '../services/firebase';
import { InstructorAccount } from '../types';

interface AdminDashboardProps {
  courses: Course[];
  onUpdateCourses: (courses: Course[]) => void;
  onRefreshCourses?: () => void;
  onLogout?: () => void;
  currentUser?: User | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  courses,
  onUpdateCourses,
  onRefreshCourses,
  onLogout,
  currentUser
}) => {
  const isInstructor = currentUser?.role === 'instructor';
  const [activeTab, setActiveTab] = useState<'courses' | 'instructors' | 'students' | 'submissions' | 'firebase'>('courses');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isEditingNew, setIsEditingNew] = useState<boolean>(false);
  const [assignModalCourse, setAssignModalCourse] = useState<Course | null>(null);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');
  const [selectedInstructorFilter, setSelectedInstructorFilter] = useState<string>('ALL');
  const [bulkSelectMode, setBulkSelectMode] = useState<'none' | 'all-matched'>('none');
  const [bulkSelectedUids, setBulkSelectedUids] = useState<Set<string>>(new Set());

  // Instructor Course Scoping:
  const currentInstructorEmail = currentUser?.email?.toLowerCase().trim();
  const assignedCourseIds = useMemo(() => {
    if (!isInstructor) return courses.map(c => c.id);
    const fromUser = currentUser?.assignedCourseIds || [];
    const fromCourses = courses
      .filter(c =>
        (currentInstructorEmail && c.assignedInstructors?.some(i => i.email.toLowerCase().trim() === currentInstructorEmail)) ||
        (currentUser?.uid && c.assignedInstructors?.some(i => i.uid === currentUser.uid))
      )
      .map(c => c.id);
    const merged = Array.from(new Set([...fromUser, ...fromCourses]));
    // Fallback for default instructor if no course explicitly tagged yet
    if (merged.length === 0 && (currentInstructorEmail?.includes('instructor') || currentUser?.username?.toLowerCase().includes('balaji') || currentUser?.username?.toLowerCase().includes('instructor'))) {
      return ['dsa-comprehensive'];
    }
    return merged;
  }, [isInstructor, currentUser, courses, currentInstructorEmail]);

  const visibleCourses = useMemo(() => {
    if (!isInstructor) return courses;
    return courses.filter(c => assignedCourseIds.includes(c.id));
  }, [isInstructor, courses, assignedCourseIds]);

  // Problem & Test Case Editor Modal State
  const [problemModalState, setProblemModalState] = useState<{
    isOpen: boolean;
    lesson: Lesson | null;
    moduleIndex: number;
    lessonIndex: number;
    courseTitle: string;
    moduleTitle: string;
  }>({
    isOpen: false,
    lesson: null,
    moduleIndex: -1,
    lessonIndex: -1,
    courseTitle: '',
    moduleTitle: ''
  });

  // Firestore students & submissions state
  const [students, setStudents] = useState<StudentOverview[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(false);
  const [resetStatus, setResetStatus] = useState<{ message: string; success: boolean } | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Instructors state
  const [instructors, setInstructors] = useState<InstructorAccount[]>([]);

  // Student progress details & Code Inspector Modal
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentOverview | null>(null);
  const [inspectedSubmission, setInspectedSubmission] = useState<any | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Search & Filters
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [submissionFilter, setSubmissionFilter] = useState<string>('ALL');
  const [proctorFilter, setProctorFilter] = useState<'ALL' | 'FLAGGED' | 'WARNING' | 'EXCUSED' | 'SWITCHES' | 'CLEAN'>('ALL');

  // Proctoring Modal Edit State
  const [proctorStatusEdit, setProctorStatusEdit] = useState<ProctorStatus>('CLEAN');
  const [proctorNotesEdit, setProctorNotesEdit] = useState<string>('');
  const [tabSwitchCountEdit, setTabSwitchCountEdit] = useState<number>(0);
  const [isSavingProctorReview, setIsSavingProctorReview] = useState<boolean>(false);
  const [proctorSaveSuccess, setProctorSaveSuccess] = useState<string | null>(null);

  // Student Course Progress Reset State
  const [resetConfirmState, setResetConfirmState] = useState<{
    isOpen: boolean;
    student: StudentOverview | null;
    courseId: string;
    courseTitle: string;
    completedCount: number;
  }>({
    isOpen: false,
    student: null,
    courseId: '',
    courseTitle: '',
    completedCount: 0
  });
  const [isResettingCourse, setIsResettingCourse] = useState<boolean>(false);
  const [courseResetNotification, setCourseResetNotification] = useState<string | null>(null);

  // Student Seed Upload State
  const [seedPreviewRows, setSeedPreviewRows] = useState<SeedStudentRow[]>([]);
  const [seedErrors, setSeedErrors] = useState<string[]>([]);
  const [isSeedingActive, setIsSeedingActive] = useState<boolean>(false);
  const [seedResult, setSeedResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [showSeedPanel, setShowSeedPanel] = useState<boolean>(false);

  const initiateResetCourseProgress = (
    student: StudentOverview,
    courseId: string,
    courseTitle: string,
    completedCount: number = 0
  ) => {
    setResetConfirmState({
      isOpen: true,
      student,
      courseId,
      courseTitle,
      completedCount
    });
  };

  const handleConfirmResetCourseProgress = async () => {
    if (!resetConfirmState.student || !resetConfirmState.courseId) return;

    const { student, courseId, courseTitle } = resetConfirmState;
    setIsResettingCourse(true);

    try {
      const targetCourse = courses.find(c => c.id === courseId) || MOCK_COURSES.find(c => c.id === courseId);
      if (!targetCourse) {
        throw new Error('Course not found');
      }

      // Collect all lesson IDs for this course
      const courseLessonIds: string[] = [];
      targetCourse.modules?.forEach(m => {
        m.lessons?.forEach(l => courseLessonIds.push(l.id));
      });

      // Execute Firebase & LocalStorage reset
      await resetStudentCourseProgressInFirestore(
        student.uid,
        student.displayName,
        courseId,
        targetCourse
      );

      // Optimistically update students state
      const updateStudentData = (s: StudentOverview): StudentOverview => {
        const remainingCompleted = (s.completedLessonIds || []).filter(id => !courseLessonIds.includes(id));
        const remainingSubs = (s.submissions || []).filter(
          sub => sub.courseId !== courseId && !courseLessonIds.includes(sub.problemId)
        );

        // Update enrolledCourses list
        const updatedEnrolledCourses = (s.enrolledCourses || []).map(cp => {
          if (cp.courseId === courseId) {
            return {
              ...cp,
              completedLessons: 0,
              problemsSolved: 0,
              progressPercentage: 0,
              isCompleted: false
            };
          }
          return cp;
        });

        return {
          ...s,
          completedLessonIds: remainingCompleted,
          completedLessonsCount: remainingCompleted.length,
          submissions: remainingSubs,
          submissionsCount: remainingSubs.length,
          enrolledCourses: updatedEnrolledCourses
        };
      };

      setStudents(prev => prev.map(s => s.uid === student.uid ? updateStudentData(s) : s));

      if (selectedStudentForDetails && selectedStudentForDetails.uid === student.uid) {
        setSelectedStudentForDetails(prev => prev ? updateStudentData(prev) : null);
      }

      setCourseResetNotification(`✓ Progress for "${courseTitle}" for student ${student.displayName} has been reset to 0%.`);
      setTimeout(() => {
        setCourseResetNotification(null);
      }, 4500);

      setResetConfirmState({
        isOpen: false,
        student: null,
        courseId: '',
        courseTitle: '',
        completedCount: 0
      });
    } catch (err: any) {
      console.error('Failed to reset course progress:', err);
      alert(`Error resetting course progress: ${err.message || 'Unknown error'}`);
    } finally {
      setIsResettingCourse(false);
    }
  };

  // Load students & submissions when switching tabs
  useEffect(() => {
    console.log('DEBUG LOAD: activeTab=', activeTab, 'isInstructor=', isInstructor, 'currentUser.uid=', currentUser?.uid, 'assignedCourseIds=', assignedCourseIds);
    if (activeTab === 'students') {
      loadStudents();
    } else if (activeTab === 'submissions') {
      loadSubmissions();
    } else if (activeTab === 'instructors' && !isInstructor) {
      fetchInstructorsList().then(setInstructors).catch(() => setInstructors([]));
    }
  }, [activeTab]);

  const openStudentDetails = (student: StudentOverview) => {
    setSelectedStudentForDetails(student);
    setExpandedCourseId(student.enrolledCourses?.[0]?.courseId || null);
    setProctorStatusEdit(student.proctorStatus || 'CLEAN');
    setProctorNotesEdit(student.proctorNotes || '');
    setTabSwitchCountEdit(student.tabSwitchCount || 0);
    setProctorSaveSuccess(null);
  };

  const handleQuickProctorStatus = async (
    student: StudentOverview,
    newStatus: ProctorStatus,
    overrideSwitchCount?: number
  ) => {
    const updatedSwitchCount = overrideSwitchCount !== undefined ? overrideSwitchCount : (student.tabSwitchCount || 0);
    const timestamp = new Date().toLocaleTimeString();

    // Optimistically update local state
    setStudents(prev => prev.map(s => {
      if (s.uid === student.uid) {
        return {
          ...s,
          proctorStatus: newStatus,
          tabSwitchCount: updatedSwitchCount,
          proctorReviewedAt: timestamp,
          proctorReviewedBy: 'Admin'
        };
      }
      return s;
    }));

    if (selectedStudentForDetails && selectedStudentForDetails.uid === student.uid) {
      setSelectedStudentForDetails({
        ...selectedStudentForDetails,
        proctorStatus: newStatus,
        tabSwitchCount: updatedSwitchCount,
        proctorReviewedAt: timestamp,
        proctorReviewedBy: 'Admin'
      });
      setProctorStatusEdit(newStatus);
      if (overrideSwitchCount !== undefined) {
        setTabSwitchCountEdit(overrideSwitchCount);
      }
    }

    try {
      await updateStudentProctoringReview(student.uid, student.displayName, {
        proctorStatus: newStatus,
        tabSwitchCount: updatedSwitchCount,
        proctorNotes: student.proctorNotes,
        reviewedBy: 'Admin'
      });
    } catch (e) {
      console.warn('Could not update proctor status:', e);
    }
  };

  const handleDeleteStudent = async (student: StudentOverview) => {
    if (!confirm(`Are you sure you want to delete ${student.displayName}? This cannot be undone.`)) return;

    try {
      await deleteStudentFromFirestore(student.uid);
      setStudents(prev => prev.filter(s => s.uid !== student.uid));
      if (selectedStudentForDetails?.uid === student.uid) {
        setSelectedStudentForDetails(null);
      }
    } catch (e) {
      console.error('Failed to delete student:', e);
      alert('Failed to delete student. Please try again.');
    }
  };

  const handleModuleDeadlineOverride = async (student: StudentOverview, courseId: string, moduleId: string, dateValue: string) => {
    const nextOverrides = { ...(student.moduleDeadlineOverrides || {}) };
    const nextCourseMap = { ...(nextOverrides[courseId] || {}) };

    if (dateValue) {
      nextCourseMap[moduleId] = dateValue;
      nextOverrides[courseId] = nextCourseMap;
    } else {
      delete nextCourseMap[moduleId];
      if (Object.keys(nextCourseMap).length === 0) {
        delete nextOverrides[courseId];
      } else {
        nextOverrides[courseId] = nextCourseMap;
      }
    }

    setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, moduleDeadlineOverrides: nextOverrides } : s));
    if (selectedStudentForDetails && selectedStudentForDetails.uid === student.uid) {
      setSelectedStudentForDetails({ ...selectedStudentForDetails, moduleDeadlineOverrides: nextOverrides });
    }

    await setStudentModuleDeadlineOverride(student.uid, courseId, moduleId, dateValue || null);
  };

  const handleSaveModalProctorReview = async () => {
    if (!selectedStudentForDetails) return;
    setIsSavingProctorReview(true);
    setProctorSaveSuccess(null);

    const timestamp = new Date().toLocaleString();
    try {
      await updateStudentProctoringReview(
        selectedStudentForDetails.uid,
        selectedStudentForDetails.displayName,
        {
          proctorStatus: proctorStatusEdit,
          proctorNotes: proctorNotesEdit,
          tabSwitchCount: tabSwitchCountEdit,
          reviewedBy: 'Admin'
        }
      );

      const updatedStudent: StudentOverview = {
        ...selectedStudentForDetails,
        proctorStatus: proctorStatusEdit,
        proctorNotes: proctorNotesEdit,
        tabSwitchCount: tabSwitchCountEdit,
        proctorReviewedAt: timestamp,
        proctorReviewedBy: 'Admin'
      };

      setSelectedStudentForDetails(updatedStudent);
      setStudents(prev => prev.map(s => s.uid === updatedStudent.uid ? updatedStudent : s));
      setProctorSaveSuccess('Proctoring status & review successfully saved!');
      setTimeout(() => setProctorSaveSuccess(null), 3000);
    } catch (e: any) {
      console.error('Failed to save proctor review:', e);
    } finally {
      setIsSavingProctorReview(false);
    }
  };

  // Seed File Upload Handlers
  const handleSeedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSeedResult(null);
    setSeedErrors([]);
    setSeedPreviewRows([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { rows, errors } = parseSeedFile(text);
      setSeedPreviewRows(rows);
      setSeedErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleConfirmSeed = async () => {
    if (seedPreviewRows.length === 0) return;
    setIsSeedingActive(true);
    setSeedResult(null);
    try {
      const result = await seedStudentsToFirestore(seedPreviewRows);
      setSeedResult(result);
      if (result.success > 0) {
        // Refresh student list after seeding
        await loadStudents();
      }
    } catch (e: any) {
      setSeedResult({ success: 0, failed: seedPreviewRows.length, errors: [e?.message || 'Unexpected error'] });
    } finally {
      setIsSeedingActive(false);
    }
  };

  const handleClearSeed = () => {
    setSeedPreviewRows([]);
    setSeedErrors([]);
    setSeedResult(null);
    // Clear the file input
    const fileInput = document.getElementById('seed-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const loadStudents = async () => {
    setIsLoadingStudents(true);
    try {
      // Ensure any newly added students have a progress doc initialized in Firestore
      // so their progress appears immediately (fix for missing progress on new students)
      try {
        const newStudentsQuery = query(collection(db, 'users'), where('role', '==', 'student'), where('createdAt', '>=', new Date(Date.now() - 86400000 * 7).toISOString()));
        const newSnap = await getDocs(newStudentsQuery);
        for (const docSnap of newSnap.docs) {
          const uid = docSnap.id;
          const progRef = doc(db, 'user_progress', uid);
          const progSnap = await getDoc(progRef);
          if (!progSnap.exists()) {
            await setDoc(progRef, sanitizeForFirestore({
              completedLessonIds: [],
              unlockedLessonIds: [],
              submissions: [],
              xp: 0,
              streakDays: 1,
              lastActiveDate: new Date().toISOString().split('T')[0],
              tabSwitchCount: 0,
              focusLossCount: 0,
              testExitAttempts: 0,
              proctorStatus: 'CLEAN',
              proctorNotes: '',
              updatedAt: new Date().toISOString()
            }), { merge: true });
          }
        }
      } catch (e) { /* non-fatal initialization */ }

      const data = await fetchAllStudentsFromFirestore(
        courses,
        isInstructor ? currentUser?.uid : undefined,
        isInstructor ? assignedCourseIds : undefined
      );
      // If no Firestore records yet, provide mock preview
      if (data.length === 0) {
        setStudents([
          {
            uid: 'demo_alex',
            displayName: 'Alex Johnson',
            email: 'alex.j@example.com',
            role: 'student',
            xp: 250,
            streakDays: 4,
            completedLessonsCount: 4,
            submissionsCount: 6,
            lastActive: new Date().toISOString().split('T')[0],
            tabSwitchCount: 0,
            focusLossCount: 0,
            testExitAttempts: 0,
            proctorStatus: 'CLEAN',
            proctorNotes: '',
            completedLessonIds: ['dsa-arr-1', 'dsa-arr-prob-1', 'dsa-str-1', 'dsa-str-prob-1'],
            enrolledCourses: courses.map((c, i) => ({
              courseId: c.id,
              courseTitle: c.title,
              level: c.level,
              progressPercentage: i === 0 ? 50 : 20,
              completedLessons: i === 0 ? 4 : 1,
              totalLessons: 8,
              problemsSolved: i === 0 ? 2 : 1,
              totalProblems: 4,
              isCompleted: false,
              isEnrolled: true
            })),
            submissions: [
              {
                id: 'sub-demo-1',
                problemId: 'dsa-arr-prob-1',
                problemTitle: 'Challenge 1: Two Sum Target',
                courseId: 'dsa-comprehensive',
                courseTitle: 'Comprehensive DSA & Problem Solving',
                language: 'java',
                code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("0 1");
    }
}`,
                status: 'ACCEPTED',
                passedTests: 2,
                totalTests: 2,
                executionTime: '0.04s',
                tabSwitchesDuringTest: 0,
                timestamp: 'Today, 10:30 AM'
              }
            ]
          },
          {
            uid: 'demo_sarah',
            displayName: 'Sarah Connor',
            email: 'sarah.c@example.com',
            role: 'student',
            xp: 400,
            streakDays: 7,
            completedLessonsCount: 6,
            submissionsCount: 9,
            lastActive: new Date().toISOString().split('T')[0],
            tabSwitchCount: 3,
            focusLossCount: 2,
            testExitAttempts: 1,
            proctorStatus: 'WARNING',
            proctorNotes: '3 tab switches during binary search; student cautioned.',
            completedLessonIds: ['dsa-arr-1', 'dsa-arr-prob-1', 'dsa-str-1', 'dsa-str-prob-1', 'fs-react-1'],
            enrolledCourses: courses.map((c, i) => ({
              courseId: c.id,
              courseTitle: c.title,
              level: c.level,
              progressPercentage: i === 0 ? 75 : 40,
              completedLessons: i === 0 ? 6 : 2,
              totalLessons: 8,
              problemsSolved: i === 0 ? 3 : 1,
              totalProblems: 4,
              isCompleted: false,
              isEnrolled: true
            })),
            submissions: [
              {
                id: 'sub-demo-2',
                problemId: 'dsa-str-prob-1',
                problemTitle: 'Valid Palindrome Checker',
                courseId: 'dsa-comprehensive',
                courseTitle: 'Comprehensive DSA & Problem Solving',
                language: 'python',
                code: `def is_palindrome(s):
    return s == s[::-1]`,
                status: 'ACCEPTED',
                passedTests: 3,
                totalTests: 3,
                executionTime: '0.02s',
                tabSwitchesDuringTest: 3,
                timestamp: 'Yesterday, 3:15 PM'
              }
            ]
          }
        ]);
      } else {
        setStudents(data);
      }
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const loadSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const data = await fetchAllSubmissionsFromFirestore(50);
      setSubmissions(data);
    } catch (e) {
      console.error('Failed to load submissions:', e);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Course Management
  const handleCreateCourse = () => {
    const newCourse: Course = {
      id: `course-${generateId()}`,
      title: 'New Specialized Course',
      description: 'Comprehensive curriculum designed for modern tech interview and skills mastery.',
      level: 'Beginner',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
      tags: ['Programming', 'Judge0'],
      isLive: false,
      isPro: false,
      modules: [
        {
          id: `mod-${generateId()}`,
          title: 'Module 1: Foundations',
          lessons: [
            {
              id: `les-${generateId()}`,
              title: 'Getting Started Lesson',
              duration: '10 min',
              type: 'article',
              content: '<h3>Introduction</h3><p>Welcome to this course module.</p>'
            }
          ]
        }
      ]
    };
    setEditingCourse(newCourse);
    setIsEditingNew(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(JSON.parse(JSON.stringify(course)));
    setIsEditingNew(false);
  };

  const handleSaveCourse = () => {
    if (!editingCourse) return;

    const exists = courses.find(c => c.id === editingCourse.id);
    let updatedCourses: Course[];
    if (exists) {
      updatedCourses = courses.map(c => (c.id === editingCourse.id ? editingCourse : c));
    } else {
      updatedCourses = [editingCourse, ...courses];
    }

    onUpdateCourses(updatedCourses);
    saveCoursesToFirestore(updatedCourses).catch(() => {});
    setEditingCourse(null);
  };

  const handleDeleteCourse = (id: string) => {
    if (window.confirm('Are you sure you want to delete this course from catalog?')) {
      const updated = courses.filter(c => c.id !== id);
      onUpdateCourses(updated);
      saveCoursesToFirestore(updated).catch(() => {});
    }
  };

  const handleAssignInstructorToCourse = async (
    courseId: string,
    instructorEmail: string,
    instructorName?: string,
    instructorUid?: string
  ) => {
    const course = courses.find(c => c.id === courseId);
    const existing = course?.assignedInstructors || [];
    const newInst = { uid: instructorUid || `inst_${Date.now()}`, email: instructorEmail, name: instructorName || (instructorEmail ? instructorEmail.split('@')[0] : '') };
    if (existing.some(i => i.email.toLowerCase() === instructorEmail.toLowerCase())) return;
    const updatedCourses = courses.map(c => {
      if (c.id === courseId) {
        return { ...c, assignedInstructors: [...existing, newInst] };
      }
      return c;
    });
    onUpdateCourses(updatedCourses);
    await saveCoursesToFirestore(updatedCourses).catch(() => {});
    setAssignModalCourse(null);
  };

  const handleResetFirebaseData = async () => {
    const confirmed = window.confirm(
      '⚠️ Reset Firebase & Start Fresh?\n\nThis will wipe all existing submissions, progress documents, and refresh the catalog to default courses as requested. Are you sure?'
    );
    if (!confirmed) return;

    setIsResetting(true);
    setResetStatus(null);
    try {
      const res = await resetAllFirebaseData();
      onUpdateCourses(MOCK_COURSES);
      await saveCoursesToFirestore(MOCK_COURSES);
      setResetStatus({
        success: res.success,
        message: 'Successfully reset Firebase database. You are starting fresh with clean collections!'
      });
      loadStudents();
      loadSubmissions();
    } catch (err: any) {
      setResetStatus({
        success: false,
        message: err.message || 'Failed to reset Firebase collections.'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const [isDeduping, setIsDeduping] = useState(false);
  const [dedupStatus, setDedupStatus] = useState<{success:boolean;message:string}|null>(null);
  const [isMergingStudentProgress, setIsMergingStudentProgress] = useState(false);

  const handleDeduplicateInstructors = async () => {
    const confirmed = window.confirm(
      '⚠️ Deduplicate Instructor Users?\n\nThis will compare users collection docs against the instructors collection for balaji@gmail.com / vaheetha@gmail.com and delete unexpected duplicates. Proceed?'
    );
    if (!confirmed) return;
    setIsDeduping(true);
    setDedupStatus(null);
    try {
      const res = await deduplicateInstructorUsers();
      setDedupStatus({ success: res.success, message: (res.messages || []).join('; ') || 'Done' });
    } catch (err: any) {
      setDedupStatus({ success: false, message: err.message || 'Failed' });
    } finally {
      setIsDeduping(false);
    }
  };

  const handleMergeDuplicateStudentProgress = async () => {
    const confirmed = window.confirm(
      '⚠️ Merge duplicate student progress records by email?\n\nThis will keep the canonical seeded student UID and merge all generated duplicate progress data into it. Proceed?'
    );
    if (!confirmed) return;

    setIsMergingStudentProgress(true);
    setDedupStatus(null);
    try {
      const res = await mergeDuplicateStudentProgressRecords();
      setDedupStatus({
        success: res.errors.length === 0,
        message: res.errors.length === 0
          ? `Merged ${res.merged} duplicate student progress records.`
          : `Merged with warnings: ${res.errors.join('; ')}`
      });
      await loadStudents();
    } catch (err: any) {
      setDedupStatus({ success: false, message: err.message || 'Failed to merge student progress.' });
    } finally {
      setIsMergingStudentProgress(false);
    }
  };

  // Show dedup status near reset area if set
  const DedupStatusBanner = () => {
    if (!dedupStatus) return null;
    return (
      <div className={`text-xs font-bold px-3 py-2 rounded-lg mb-3 ${dedupStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
        Dedup: {dedupStatus.message}
      </div>
    );
  };

  // Lock student progress edits (admin protection)
  const [isProgressLocked, setIsProgressLocked] = useState<boolean>(false);

  const toggleProgressLock = () => {
    setIsProgressLocked(prev => !prev);
  };

  // Filtered lists
  const filteredStudents = useMemo(() => students.filter(s => {
    const matchesSearch = s.displayName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.regNo || '').toLowerCase().includes(studentSearch.toLowerCase());
    if (!matchesSearch) return false;

    // Instructor or Admin selected course filter
    if (selectedCourseFilter !== 'ALL') {
      const hasCourse = s.enrolledCourses?.some(c => c.courseId === selectedCourseFilter);
      if (!hasCourse) return false;
    }

    // Instructor Filter (Admin Only)
    if (!isInstructor && selectedInstructorFilter !== 'ALL') {
      const hasCourseWithInstructor = s.enrolledCourses?.some(cp => {
          const course = courses.find(c => c.id === cp.courseId);
          return (course?.assignedInstructors || []).some(i => i.uid === selectedInstructorFilter || i.email === selectedInstructorFilter);
      });
      if (!hasCourseWithInstructor) return false;
    }

    // Instructor scoping: only show students explicitly assigned to this instructor
    if (isInstructor) {
      const currentInstId = currentUser?.uid || currentInstructorEmail || '';
      const explicitStudentInstructorIds = new Set<string>([
        s.assignedInstructorId,
        ...(s.assignedInstructors || []).map((i: any) => i.uid).filter(Boolean),
        ...(s.courseInstructorAssignments || []).map((a: any) => a.instructorId).filter(Boolean)
      ]);

      const hasExplicitAssignment = explicitStudentInstructorIds.has(currentInstId) ||
        (s.courseInstructorAssignments || []).some((a: any) => a.instructorId === currentInstId && (!assignedCourseIds.length || assignedCourseIds.includes(a.courseId))) ||
        (s.assignedInstructors || []).some((i: any) => i.uid === currentInstId && (!assignedCourseIds.length || s.enrolledCourses?.some((cp: any) => assignedCourseIds.includes(cp.courseId))));

      const hasCourseOnlyFallback =
        explicitStudentInstructorIds.size === 0 &&
        s.enrolledCourses?.some((cp: any) => assignedCourseIds.includes(cp.courseId));

      if (!hasExplicitAssignment && !hasCourseOnlyFallback) {
        return false;
      }
    }

    if (proctorFilter === 'ALL') return true;
    if (proctorFilter === 'SWITCHES') return (s.tabSwitchCount || 0) > 0;
    if (proctorFilter === 'FLAGGED') return s.proctorStatus === 'FLAGGED';
    if (proctorFilter === 'WARNING') return s.proctorStatus === 'WARNING';
    if (proctorFilter === 'EXCUSED') return s.proctorStatus === 'EXCUSED';
    if (proctorFilter === 'CLEAN') return s.proctorStatus === 'CLEAN' && (s.tabSwitchCount || 0) === 0;
    return true;
  }), [students, studentSearch, selectedCourseFilter, selectedInstructorFilter, proctorFilter, isInstructor, courses]);

  const filteredSubmissions = useMemo(() => submissions.filter(sub => {
    // If instructor, only show submissions for assigned courses
    if (isInstructor && sub.courseId && !assignedCourseIds.includes(sub.courseId)) {
      return false;
    }
    if (submissionFilter === 'ALL') return true;
    return sub.status === submissionFilter;
  }), [submissions, isInstructor, assignedCourseIds, submissionFilter]);

  // Derived state to check if all currently filtered students are selected
  const allFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every(s => bulkSelectedUids.has(s.uid));
  }, [filteredStudents, bulkSelectedUids]);

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${isInstructor ? 'bg-blue-600' : 'bg-slate-900'} text-white flex items-center justify-center text-xl shadow-md`}>
              <i className={`fa-solid ${isInstructor ? 'fa-chalkboard-user' : 'fa-gauge-high'}`}></i>
            </div>
            <div>
              {!isInstructor && (
                <button
                  onClick={toggleProgressLock}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isProgressLocked
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <i className={`fa-solid ${isProgressLocked ? 'fa-lock' : 'fa-lock-open'}`}></i>
                  {isProgressLocked ? 'Progress LOCKED' : 'Progress UNLOCKED'}
                </button>
              )}

              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-2xl font-bold text-slate-900">
                  {isInstructor ? 'Instructor Teaching Portal' : 'Admin Control Center'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isInstructor
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {isInstructor ? 'Instructor: Read-Only Curriculum' : 'Firebase Connected'}
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-0.5">
                {isInstructor
                  ? 'Monitor student progress, track problem submissions, review proctoring integrity, and inspect lesson specifications for your assigned courses.'
                  : 'Manage curriculum, assign courses to instructors, review student progress, and monitor live submissions.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                const data = await exportFirestoreToJSON();
                console.log('Downloaded Firestore Data:', data);
                alert('Downloading Firestore JSON...');
              }}
              className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-950 cursor-pointer"
            >
              Export DB
            </button>
            <button
              onClick={async () => {
                if (!window.confirm('Migrate: normalize missing assignedCourseIds / assignedInstructorId for students? This will NOT delete any user or progress data.')) return;
                try {
                  const res = await sanitizeStudentAssignments();
                  alert(`Migration done. Updated: ${res.updated}, Skipped: ${res.skipped}, Errors: ${res.errors}`);
                } catch (e: any) {
                  alert('Migration failed: ' + (e?.message || e));
                }
              }}
              className="px-3 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 cursor-pointer"
            >
              Migrate Assignment Fields
            </button>
            {/* Credentials Pill */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 flex items-center gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {isInstructor ? 'Instructor Account' : 'Admin Account'}
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {isInstructor ? (currentUser?.email || 'instructor@bitwise.com') : DEFAULT_ADMIN_CREDENTIALS.email}
                </span>
              </div>
              {!isInstructor && (
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pass</span>
                  <span className="font-mono text-slate-700">admin123</span>
                </div>
              )}
            </div>

            {/* Direct Logout */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to log out of the ${isInstructor ? 'Instructor Portal' : 'Admin Control Center'}?`)) {
                    onLogout();
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                title={`Log out of ${isInstructor ? 'Instructor' : 'Administrator'} account`}
                id="admin-direct-logout-btn"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 bg-white rounded-xl p-1.5 shadow-sm">
          <button
            onClick={() => { setActiveTab('courses'); setEditingCourse(null); }}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'courses'
                ? isInstructor ? 'bg-blue-600 text-white shadow-sm' : 'bg-bitwise-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-book"></i> {isInstructor ? `My Assigned Courses (${visibleCourses.length})` : `Course Management (${courses.length})`}
          </button>

          {!isInstructor && (
            <button
              onClick={() => { setActiveTab('instructors'); setEditingCourse(null); }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'instructors'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-chalkboard-user"></i> Instructors & Assignments
            </button>
          )}

          <button
            onClick={() => { setActiveTab('students'); setEditingCourse(null); }}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'students'
                ? isInstructor ? 'bg-blue-600 text-white shadow-sm' : 'bg-bitwise-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-users"></i> Student Progress Tracker
          </button>
          <button
            onClick={() => { setActiveTab('submissions'); setEditingCourse(null); }}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'submissions'
                ? isInstructor ? 'bg-blue-600 text-white shadow-sm' : 'bg-bitwise-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-terminal"></i> Live Submissions Log
          </button>

          {!isInstructor && (
            <button
              onClick={() => { setActiveTab('firebase'); setEditingCourse(null); }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'firebase'
                  ? 'bg-bitwise-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-database"></i> Database & Reset
            </button>
          )}
        </div>

        {/* TAB 1: COURSE MANAGEMENT */}
        {activeTab === 'courses' && (
          <div>
            {editingCourse ? (
              /* COURSE EDITOR FORM */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {isInstructor ? `Curriculum Inspection: ${editingCourse.title}` : (isEditingNew ? 'Create New Course' : `Edit Course: ${editingCourse.title}`)}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isInstructor
                        ? 'Read-only view of course syllabus, modules, and coding problem specifications.'
                        : 'Configure curriculum, modules, and coding challenges.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isInstructor ? (
                      <button
                        onClick={() => setEditingCourse(null)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-arrow-left"></i> Back to My Courses
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingCourse(null)}
                          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCourse}
                          className="px-5 py-2 bg-bitwise-600 hover:bg-bitwise-700 text-white text-sm font-bold rounded-lg shadow-sm cursor-pointer"
                        >
                          Save & Publish
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isInstructor && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
                    <i className="fa-solid fa-shield-halved text-blue-600 mt-0.5 text-base shrink-0"></i>
                    <div>
                      <div className="font-bold text-sm">Instructor Read-Only Inspection Mode</div>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">
                        As an instructor, you can inspect lesson descriptions, problem test cases, and starter templates for your assigned course. Adding, editing, or deleting course lessons and modules is restricted to administrators.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Course Title
                      </label>
                      <input
                        type="text"
                        readOnly={isInstructor}
                        value={editingCourse.title}
                        onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                        className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-bitwise-500 outline-none ${isInstructor ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        readOnly={isInstructor}
                        value={editingCourse.description}
                        onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                        className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-bitwise-500 outline-none ${isInstructor ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Assigned Instructor
                      </label>
                      {isInstructor ? (
                        <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 flex items-center gap-2 flex-wrap">
                          <i className="fa-solid fa-chalkboard-user text-blue-600"></i>
                          <span>
                            {(editingCourse.assignedInstructors?.length ? editingCourse.assignedInstructors.map(i => i.name || i.email).join(', ') : 'Assigned Instructors')}
                            {editingCourse.assignedInstructors?.[0] ? ` (${editingCourse.assignedInstructors.map(i => i.email).join(', ')})` : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 items-center">
                          {(editingCourse.assignedInstructors || []).map((inst, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-bold">
                              {inst.name || inst.email.split('@')[0]}
                              <button type="button" onClick={() => setEditingCourse({ ...editingCourse, assignedInstructors: (editingCourse.assignedInstructors || []).filter((_, i) => i !== idx) })} className="text-blue-600 hover:text-red-600 ml-0.5" title="Remove"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                            </span>
                          ))}
                          <input
                            type="text"
                            placeholder="instructor@bitwise.com"
                            value=""
                            onChange={e => {
                              const val = e.target.value.trim();
                              if (!val) return;
                              if (val.includes('@')) {
                                const existing = (editingCourse.assignedInstructors || []);
                                if (existing.some(i => i.email.toLowerCase() === val.toLowerCase())) return;
                                const newUid = `inst_${Date.now()}_${Math.floor(Math.random()*10000)}`;
                                setEditingCourse({
                                  ...editingCourse,
                                  assignedInstructors: [...existing, { uid: newUid, email: val, name: val.split('@')[0] }]
                                });
                                e.target.value = '';
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val && val.includes('@')) { const existing = (editingCourse.assignedInstructors || []); if (!existing.some(i => i.email.toLowerCase() === val.toLowerCase())) { setEditingCourse({ ...editingCourse, assignedInstructors: [...existing, { uid: `inst_${Date.now()}`, email: val, name: val.split('@')[0] }] }); } (e.target as HTMLInputElement).value = ''; } }
                            }}
                            className="flex-1 min-w-[140px] p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-bitwise-500 outline-none"
                          />
                          <span className="text-xs text-slate-500 whitespace-nowrap">Add Email</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Difficulty Level
                      </label>
                      <select
                        disabled={isInstructor}
                        value={editingCourse.level}
                        onChange={e => setEditingCourse({ ...editingCourse, level: e.target.value as any })}
                        className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-bitwise-500 outline-none ${isInstructor ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Thumbnail Image URL
                      </label>
                      <input
                        type="text"
                        readOnly={isInstructor}
                        value={editingCourse.thumbnail}
                        onChange={e => setEditingCourse({ ...editingCourse, thumbnail: e.target.value })}
                        className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-bitwise-500 outline-none ${isInstructor ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div className="flex gap-4 pt-2">
                      <label className={`flex items-center gap-2 text-xs font-bold text-slate-700 ${isInstructor ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          disabled={isInstructor}
                          checked={editingCourse.isLive || false}
                          onChange={e => setEditingCourse({ ...editingCourse, isLive: e.target.checked })}
                          className="w-4 h-4 rounded text-bitwise-600"
                        />
                        Live Class
                      </label>
                      <label className={`flex items-center gap-2 text-xs font-bold text-slate-700 ${isInstructor ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          disabled={isInstructor}
                          checked={editingCourse.isPro || false}
                          onChange={e => setEditingCourse({ ...editingCourse, isPro: e.target.checked })}
                          className="w-4 h-4 rounded text-bitwise-600"
                        />
                        PRO Tier
                      </label>
                    </div>
                  </div>
                </div>

                {/* Modules & Lessons */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Curriculum Modules ({editingCourse.modules.length})
                    </h3>
                    {!isInstructor && (
                      <button
                        onClick={() => {
                          const newMod: Module = {
                            id: `mod-${generateId()}`,
                            title: `Module ${editingCourse.modules.length + 1}: New Topic`,
                            lessons: []
                          };
                          setEditingCourse({
                            ...editingCourse,
                            modules: [...editingCourse.modules, newMod]
                          });
                        }}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus"></i> Add Module
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {editingCourse.modules.map((mod, mIdx) => (
                      <div key={mod.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                          <input
                            value={mod.title}
                            readOnly={isInstructor}
                            onChange={e => {
                              const updated = [...editingCourse.modules];
                              updated[mIdx].title = e.target.value;
                              setEditingCourse({ ...editingCourse, modules: updated });
                            }}
                            className={`font-bold text-sm bg-transparent border-b border-transparent ${isInstructor ? 'cursor-default' : 'hover:border-slate-300 focus:border-bitwise-500'} outline-none flex-1 mr-4 text-slate-900`}
                          />
                          {!isInstructor && (
                            <button
                              onClick={() => {
                                const updated = editingCourse.modules.filter((_, i) => i !== mIdx);
                                setEditingCourse({ ...editingCourse, modules: updated });
                              }}
                              className="text-red-500 text-xs hover:underline cursor-pointer"
                            >
                              Delete Module
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2 text-xs mb-2 mt-1">
                          <span className="text-slate-400">Start:</span>
                          <input
                            type="date"
                            disabled={isInstructor}
                            value={mod.startDate || ''}
                            onChange={e => { const updated = [...editingCourse.modules]; updated[mIdx].startDate = e.target.value; setEditingCourse({ ...editingCourse, modules: updated }); }}
                            className={`text-xs border border-slate-300 rounded px-1 py-0.5 ${isInstructor ? 'bg-slate-100 text-slate-500' : ''}`}
                          />
                          <span className="text-slate-400">End:</span>
                          <input
                            type="date"
                            disabled={isInstructor}
                            value={mod.endDate || ''}
                            onChange={e => { const updated = [...editingCourse.modules]; updated[mIdx].endDate = e.target.value; setEditingCourse({ ...editingCourse, modules: updated }); }}
                            className={`text-xs border border-slate-300 rounded px-1 py-0.5 ${isInstructor ? 'bg-slate-100 text-slate-500' : ''}`}
                          />
                        </div>

                        {/* Lessons in this module */}
                        <div className="space-y-2 pl-2">
                          {mod.lessons.map((lesson, lIdx) => {
                            const isProblem = lesson.type === 'problem';
                            const tcCount = lesson.problem?.testCases?.length || 0;
                            const sampleCount = lesson.problem?.testCases?.filter(t => !t.isHidden).length || 0;
                            const hiddenCount = lesson.problem?.testCases?.filter(t => t.isHidden).length || 0;

                            return (
                              <div key={lesson.id} className={`p-3 rounded-xl border space-y-2.5 transition-all ${
                                isProblem ? 'bg-amber-50/20 border-amber-200' : 'bg-white border-slate-200'
                              }`}>
                                <div className="flex items-center justify-between gap-3">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                    isProblem ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {lesson.type}
                                  </span>
                                  <input
                                    value={lesson.title}
                                    readOnly={isInstructor}
                                    onChange={e => {
                                      const updated = [...editingCourse.modules];
                                      updated[mIdx].lessons[lIdx].title = e.target.value;
                                      setEditingCourse({ ...editingCourse, modules: updated });
                                    }}
                                    className={`text-xs font-bold text-slate-800 flex-1 outline-none border-b border-transparent ${isInstructor ? 'cursor-default' : 'focus:border-bitwise-500'}`}
                                    placeholder="Lesson title"
                                  />
                                  <input
                                    value={lesson.duration}
                                    readOnly={isInstructor}
                                    onChange={e => {
                                      const updated = [...editingCourse.modules];
                                      updated[mIdx].lessons[lIdx].duration = e.target.value;
                                      setEditingCourse({ ...editingCourse, modules: updated });
                                    }}
                                    className={`text-[11px] text-slate-500 w-16 text-right outline-none ${isInstructor ? 'cursor-default' : ''}`}
                                    placeholder="15 min"
                                  />
                                  {!isInstructor && (
                                    <button
                                      onClick={() => {
                                        const updated = [...editingCourse.modules];
                                        updated[mIdx].lessons = mod.lessons.filter((_, i) => i !== lIdx);
                                        setEditingCourse({ ...editingCourse, modules: updated });
                                      }}
                                      className="text-slate-400 hover:text-red-500 text-xs cursor-pointer"
                                      title="Delete Lesson"
                                    >
                                      <i className="fa-solid fa-trash"></i>
                                    </button>
                                  )}
                                </div>

                                <textarea
                                  value={lesson.content || ''}
                                  readOnly={isInstructor}
                                  onChange={e => {
                                    const updated = [...editingCourse.modules];
                                    updated[mIdx].lessons[lIdx].content = e.target.value;
                                    setEditingCourse({ ...editingCourse, modules: updated });
                                  }}
                                  className={`w-full text-xs p-2 border border-slate-200 rounded font-mono h-14 ${isInstructor ? 'bg-slate-50 text-slate-700 cursor-default' : 'bg-white'}`}
                                  placeholder="Lesson HTML or challenge description..."
                                />

                                {/* Dedicated Problem & Test Case Manager Button for Problem Lessons */}
                                {isProblem && (
                                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-amber-100 bg-white/70 p-2 rounded-lg">
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="font-bold text-slate-700 flex items-center gap-1">
                                        <i className="fa-solid fa-flask text-amber-500"></i> {tcCount} Test Cases
                                      </span>
                                      <span className="text-slate-400">|</span>
                                      <span className="text-emerald-700 font-semibold">{sampleCount} Sample</span>
                                      <span className="text-amber-700 font-semibold">{hiddenCount} Hidden</span>
                                      <span className="text-slate-400">|</span>
                                      <span className="text-slate-500">{lesson.problem?.difficulty || 'Easy'} • {lesson.problem?.points || 50} XP</span>
                                    </div>

                                    <button
                                      onClick={() => {
                                        setProblemModalState({
                                          isOpen: true,
                                          lesson,
                                          moduleIndex: mIdx,
                                          lessonIndex: lIdx,
                                          courseTitle: editingCourse.title,
                                          moduleTitle: mod.title
                                        });
                                      }}
                                      className={`px-3 py-1 ${isInstructor ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'} text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer`}
                                    >
                                      <i className={`fa-solid ${isInstructor ? 'fa-eye' : 'fa-sliders'}`}></i>
                                      <span>{isInstructor ? 'Inspect Test Cases & Runner' : 'Open Test Case Studio & Runner'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {!isInstructor && (
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => {
                                  const newLesson: Lesson = {
                                    id: `les-${generateId()}`,
                                    title: 'New Conceptual Guide',
                                    duration: '15 min',
                                    type: 'article',
                                    content: '<h3>Overview</h3><p>Explanation goes here.</p>'
                                  };
                                  const updated = [...editingCourse.modules];
                                  updated[mIdx].lessons.push(newLesson);
                                  setEditingCourse({ ...editingCourse, modules: updated });
                                }}
                                className="text-[11px] text-bitwise-600 font-bold hover:underline cursor-pointer"
                              >
                                + Add Reading Lesson
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => {
                                  const newProblem: Lesson = {
                                    id: `prob-${generateId()}`,
                                    title: 'Challenge: New Coding Problem',
                                    duration: '25 min',
                                    type: 'problem',
                                    content: '<h3>Problem Description</h3><p>Given an input, print output.</p>',
                                    problem: {
                                      difficulty: 'Easy',
                                      points: 50,
                                      testCases: [
                                        {
                                          id: `tc-1`,
                                          input: '5',
                                          expectedOutput: '10',
                                          explanation: 'Sample Case'
                                        }
                                      ],
                                      starterTemplates: {
                                        javascript: `const fs = require('fs');
function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  console.log(input * 2);
}
solve();`,
                                        python: `import sys
def solve():
    n = int(sys.stdin.read().strip())
    print(n * 2)
solve()`
                                      }
                                    }
                                  };
                                  const updated = [...editingCourse.modules];
                                  updated[mIdx].lessons.push(newProblem);
                                  setEditingCourse({ ...editingCourse, modules: updated });
                                }}
                                className="text-[11px] text-amber-600 font-bold hover:underline cursor-pointer"
                              >
                                + Add Coding Challenge (Judge0)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* COURSE LIST TABLE */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      {isInstructor ? 'My Assigned Teaching Tracks' : 'Available Courses & Tracks'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isInstructor
                        ? 'Inspect problem statements, unit tests, and syllabus specifications for courses assigned to you.'
                        : 'Edit existing curricula, assign instructors, or publish new interactive problem sets.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onRefreshCourses && (
                      <button
                        onClick={onRefreshCourses}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="Reload courses from database"
                      >
                        <i className="fa-solid fa-arrows-rotate text-[11px]"></i>
                        <span>Refresh</span>
                      </button>
                    )}
                    {!isInstructor && (
                      <button
                        onClick={handleCreateCourse}
                        className="bg-bitwise-600 hover:bg-bitwise-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus"></i> Create Course
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Course Title</th>
                        <th className="p-4">Level</th>
                        <th className="p-4">Mode</th>
                        <th className="p-4">Assigned Instructor</th>
                        <th className="p-4">Modules / Lessons</th>
                        <th className="p-4">Tags</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {visibleCourses.map(course => {
                        const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
                        const codingChallenges = course.modules.reduce(
                          (acc, m) => acc + m.lessons.filter(l => l.type === 'problem').length,
                          0
                        );

                        return (
                          <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-900">
                              <div className="flex items-center gap-3">
                                <img
                                  src={course.thumbnail}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                                />
                                <div>
                                  <div className="font-bold text-slate-900">{course.title}</div>
                                  <div className="text-xs text-slate-400 font-normal line-clamp-1 max-w-sm">
                                    {course.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                course.level === 'Beginner' ? 'bg-green-100 text-green-700' :
                                course.level === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {course.level}
                              </span>
                            </td>
                            <td className="p-4">
                              {course.isLive ? (
                                <span className="text-red-600 font-bold text-xs border border-red-200 bg-red-50 px-2 py-0.5 rounded">
                                  LIVE
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">Self-Paced</span>
                              )}
                            </td>
                            <td className="p-4">
                              {(course.assignedInstructors?.length ? course.assignedInstructors.map(i => i.name || i.email.split('@')[0]).join(', ') : '') ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {course.assignedInstructors?.map((inst, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold">
                                      <i className="fa-solid fa-chalkboard-user text-blue-600 text-[10px]"></i>
                                      <span className="max-w-[120px] truncate" title={inst.email}>{inst.name || inst.email.split('@')[0]}</span>
                                    </span>
                                  ))}
                                  {!isInstructor && (
                                    <button
                                      onClick={() => setAssignModalCourse(course)}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                      title="Add another instructor"
                                    >
                                      <i className="fa-solid fa-plus text-[10px]"></i>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  {!isInstructor ? (
                                    <button
                                      onClick={() => setAssignModalCourse(course)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-dashed border-slate-300 hover:border-blue-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                      <i className="fa-solid fa-user-plus text-[10px]"></i>
                                      <span>Assign</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Unassigned</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-xs text-slate-600">
                              <div><strong>{course.modules.length}</strong> modules, <strong>{totalLessons}</strong> lessons</div>
                              {codingChallenges > 0 && (
                                <div className="text-amber-600 font-medium">⚡ {codingChallenges} Coding Challenges</div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {course.tags.slice(0, 3).map((tag, i) => (
                                  <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              {isInstructor ? (
                                <button
                                  onClick={() => handleEditCourse(course)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Inspect curriculum specifications & test cases (Read-Only)"
                                >
                                  <i className="fa-solid fa-eye text-[11px]"></i>
                                  <span>Inspect Lessons</span>
                                </button>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditCourse(course)}
                                    className="p-1.5 text-slate-400 hover:text-bitwise-600 hover:bg-bitwise-50 rounded cursor-pointer"
                                    title="Edit Course"
                                  >
                                    <i className="fa-solid fa-pen-to-square"></i>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCourse(course.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                    title="Delete Course"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {visibleCourses.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-12 text-center">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
                              <i className="fa-solid fa-chalkboard-user"></i>
                            </div>
                            <h3 className="text-base font-bold text-slate-800 mb-1">No Courses Assigned Yet</h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                              Your administrator has not yet assigned any course tracks to your instructor account. Once assigned, you will see the course curriculum and student progress here.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Tab Content */}
        <div className="tabs-content">
          {/* TAB: INSTRUCTORS & ASSIGNMENTS (ADMIN ONLY) */}
          {activeTab === 'instructors' && !isInstructor && (
            <AdminInstructorManager
              courses={courses}
              onUpdateCourses={onUpdateCourses}
            />
          )}

          {/* TAB 2: DETAILED STUDENT PROGRESS TRACKER */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              {/* Instructor Scoping Notice & Quick Filter Banner */}
              {isInstructor && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                      <i className="fa-solid fa-chalkboard-user"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Tracking Student Progress for Your Assigned Course(s)
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Curriculum tracks: <strong className="text-blue-900 font-semibold">{visibleCourses.map(c => c.title).join(', ') || 'Assigned Tracks'}</strong>
                      </p>
                    </div>
                  </div>

                  {visibleCourses.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Course:</span>
                      <select
                        value={selectedCourseFilter}
                        onChange={e => setSelectedCourseFilter(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="ALL">All Assigned Courses</option>
                        {visibleCourses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              {/* Seed Students Upload Panel (Admin Only) */}
              {!isInstructor && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setShowSeedPanel(!showSeedPanel)}
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        <i className="fa-solid fa-file-import"></i>
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-sm text-slate-900">Seed Students from CSV / Excel</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Bulk-import student records (name, reg_no, email, dob, section, dept) into Firestore
                        </p>
                      </div>
                    </div>
                    <i className={`fa-solid fa-chevron-${showSeedPanel ? 'up' : 'down'} text-slate-400`}></i>
                  </button>

                  {showSeedPanel && (
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                      {/* File Input */}
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm">
                          <i className="fa-solid fa-upload"></i> Choose CSV / TSV File
                          <input
                            id="seed-file-input"
                            type="file"
                            accept=".csv,.tsv,.txt,.xls"
                            onChange={handleSeedFileUpload}
                            className="hidden"
                          />
                        </label>
                        {seedPreviewRows.length > 0 && (
                          <button
                            onClick={handleClearSeed}
                            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-bold rounded-lg text-slate-600 cursor-pointer transition-colors"
                          >
                            <i className="fa-solid fa-xmark mr-1"></i> Clear
                          </button>
                        )}
                        <span className="text-[11px] text-slate-400">
                          Expected headers: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">name, reg_no, email, dob, section, dept, year</code>
                        </span>
                      </div>

                      {/* Parse Errors */}
                      {seedErrors.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                            {seedErrors.length} warning{seedErrors.length > 1 ? 's' : ''} found:
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto">
                            {seedErrors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Preview Table */}
                      {seedPreviewRows.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">
                              <i className="fa-solid fa-table-list text-indigo-500 mr-1.5"></i>
                              Preview: {seedPreviewRows.length} student record{seedPreviewRows.length > 1 ? 's' : ''} parsed
                            </span>
                          </div>
                          <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                                <tr>
                                  <th className="p-2.5">#</th>
                                  <th className="p-2.5">Name</th>
                                  <th className="p-2.5">Reg No</th>
                                  <th className="p-2.5">Email</th>
                                  <th className="p-2.5">DOB</th>
                                  <th className="p-2.5">Section</th>
                                  <th className="p-2.5">Dept</th>
                                  <th className="p-2.5">Year</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {seedPreviewRows.slice(0, 10).map((row, i) => (
                                  <tr key={i} className="hover:bg-slate-50/60">
                                    <td className="p-2.5 text-slate-400 font-mono">{i + 1}</td>
                                    <td className="p-2.5 font-semibold text-slate-800">{row.name || <span className="text-red-400 italic">missing</span>}</td>
                                    <td className="p-2.5 font-mono text-slate-700">{row.regNo || <span className="text-red-400 italic">missing</span>}</td>
                                    <td className="p-2.5 text-slate-600">{row.email || <span className="text-red-400 italic">missing</span>}</td>
                                    <td className="p-2.5 text-slate-500">{row.dob || '—'}</td>
                                    <td className="p-2.5 text-slate-500">{row.section || '—'}</td>
                                    <td className="p-2.5 text-slate-500">{row.dept || '—'}</td>
                                    <td className="p-2.5 text-slate-500">{row.year || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {seedPreviewRows.length > 10 && (
                              <div className="text-center py-2 text-[11px] text-slate-400 bg-slate-50 border-t border-slate-200">
                                +{seedPreviewRows.length - 10} more rows not shown in preview
                              </div>
                            )}
                          </div>

                          {/* Seed Action Button */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleConfirmSeed}
                              disabled={isSeedingActive || seedPreviewRows.length === 0}
                              className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                                isSeedingActive
                                  ? 'bg-indigo-400 text-white cursor-wait'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {isSeedingActive ? (
                                <><i className="fa-solid fa-circle-notch fa-spin"></i> Seeding {seedPreviewRows.length} students...</>
                              ) : (
                                <><i className="fa-solid fa-database"></i> Seed {seedPreviewRows.length} Students to Firestore</>
                              )}
                            </button>
                            <span className="text-[11px] text-slate-400">
                              Default password: student's DOB (or reg_no if DOB not provided)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Seed Result */}
                      {seedResult && (
                        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-start gap-2 ${
                          seedResult.failed === 0
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border border-amber-200 text-amber-800'
                        }`}>
                          <i className={`fa-solid ${seedResult.failed === 0 ? 'fa-circle-check text-emerald-500' : 'fa-triangle-exclamation text-amber-500'} mt-0.5`}></i>
                          <div>
                            <div>
                              {seedResult.success} student{seedResult.success !== 1 ? 's' : ''} seeded successfully
                              {seedResult.failed > 0 && <span className="text-red-600 ml-1">• {seedResult.failed} failed</span>}
                            </div>
                            {seedResult.errors.length > 0 && (
                              <ul className="mt-1.5 font-normal text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                                {seedResult.errors.map((err, i) => <li key={i} className="text-red-600">• {err}</li>)}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Metrics Header */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Total Students</span>
                    <i className="fa-solid fa-users text-bitwise-600"></i>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{students.length}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Enrolled across platform</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Active Solvers</span>
                    <i className="fa-solid fa-code text-emerald-600"></i>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {students.filter(s => s.completedLessonsCount > 0 || s.submissionsCount > 0).length}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Solving challenges</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Total XP Earned</span>
                    <i className="fa-solid fa-bolt text-amber-500"></i>
                  </div>
                  <div className="text-2xl font-black text-amber-600">
                    ⚡ {students.reduce((acc, s) => acc + (s.xp || 0), 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Platform gamification</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Submissions</span>
                    <i className="fa-solid fa-circle-check text-purple-600"></i>
                  </div>
                  <div className="text-2xl font-black text-purple-700">
                    {students.reduce((acc, s) => acc + (s.submissionsCount || 0), 0) || submissions.length}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Judge0 runs evaluated</div>
                </div>

                {/* Card 5: Proctoring & Tab Switches Alert */}
                <div
                  onClick={() => setProctorFilter(proctorFilter === 'SWITCHES' ? 'ALL' : 'SWITCHES')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                    proctorFilter === 'SWITCHES'
                      ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-amber-300'
                  }`}
                  title="Click to toggle filter for students with tab switch alerts"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Proctor Alerts</span>
                    <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                  </div>
                  <div className="text-2xl font-black text-amber-600">
                    {students.filter(s => (s.tabSwitchCount || 0) > 0 || s.proctorStatus === 'FLAGGED' || s.proctorStatus === 'WARNING').length}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Students with switch alerts</div>
                </div>
              </div>

              {/* Students Table with Course Enrollment & Progress */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">Student Course Progress & Performance</h2>
                      <span className="px-2 py-0.5 bg-bitwise-100 text-bitwise-800 text-xs font-bold rounded-full">
                        {students.length} Registered Students
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track which courses each student is enrolled in, proctoring tab switches & infractions, and export reports to Excel.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                      <input
                        type="text"
                        placeholder="Search by student name or email..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-bitwise-500 w-52"
                      />
                    </div>

                    {!isInstructor && (
                      <select
                        value={selectedInstructorFilter}
                        onChange={e => setSelectedInstructorFilter(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white outline-none focus:border-bitwise-500 cursor-pointer"
                      >
                        <option value="ALL">All Instructors</option>
                        {instructors.map(inst => (
                          <option key={inst.email} value={inst.uid}>{inst.name}</option>
                        ))}
                      </select>
                    )}

                    {/* Proctor Filter Dropdown */}
                    <select
                      value={proctorFilter}
                      onChange={e => setProctorFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white outline-none focus:border-bitwise-500 cursor-pointer"
                    >
                      <option value="ALL">All Proctor Statuses</option>
                      <option value="SWITCHES">Tab Switches &gt; 0</option>
                      <option value="FLAGGED">🚩 Flagged</option>
                      <option value="WARNING">⚠️ Warnings</option>
                      <option value="EXCUSED">🛡️ Excused</option>
                      <option value="CLEAN">✓ Clean (0 switches)</option>
                    </select>

                    {/* Export to Excel (.xls) Button */}
                    <button
                      onClick={() => {
                        exportStudentsToExcel(students, courses);
                        setExportSuccessMessage('Exported comprehensive Student Progress Report to Excel (.xls)!');
                        setTimeout(() => setExportSuccessMessage(null), 4000);
                      }}
                      title="Export full multi-sheet student progress report to Excel"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <i className="fa-solid fa-file-excel"></i> Export Excel (.xls)
                    </button>

                    {/* Export CSV Button */}
                    <button
                      onClick={() => {
                        exportStudentsToCsv(students, courses);
                        setExportSuccessMessage('Exported student progress summary to CSV!');
                        setTimeout(() => setExportSuccessMessage(null), 4000);
                      }}
                      title="Export student summary table to CSV"
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <i className="fa-solid fa-file-csv text-slate-500"></i> Export CSV
                    </button>

                    <button
                      onClick={loadStudents}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-lg text-slate-600 flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className={`fa-solid fa-rotate ${isLoadingStudents ? 'fa-spin' : ''}`}></i> Refresh
                    </button>
                  </div>
                </div>

                {courseResetNotification && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
                      {courseResetNotification}
                    </div>
                    <button onClick={() => setCourseResetNotification(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                )}

                {exportSuccessMessage && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
                      {exportSuccessMessage}
                    </div>
                    <button onClick={() => setExportSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                )}

                {isLoadingStudents ? (
                  <div className="py-12 text-center text-slate-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                    <p className="text-xs">Fetching registered student progress from Firestore...</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 mb-4 text-xs font-semibold text-slate-500">
                      <span>Visible Students: <b className="text-slate-800">{filteredStudents.length}</b></span>
                      <span>•</span>
                      <span>All Students: <b className="text-slate-800">{students.length}</b></span>
                      <span>•</span>
                      <span>Assigned Students: <b className="text-slate-800">{students.filter(s => (s.assignedInstructors && s.assignedInstructors.length > 0) || (s.courseInstructorAssignments && s.courseInstructorAssignments.length > 0)).length}</b></span>
                      {isInstructor && (
                        <>
                          <span>•</span>
                          <span>My Students: <b className="text-blue-700">{filteredStudents.length}</b></span>
                        </>
                      )}
                    </div>
                    {filteredStudents.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <i className="fa-solid fa-user-slash text-2xl mb-2"></i>
                        <p className="text-xs">No student records found matching search or proctoring filters.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                            <tr>
                              <th className="p-3.5">Student Details</th>
                              <th className="p-3.5">Assigned Instructor</th>
                              <th className="p-3.5">Reg No / Section</th>
                              <th className="p-3.5">Enrolled Courses & Progress</th>
                              <th className="p-3.5">Completed Lessons</th>
                              <th className="p-3.5">XP & Streak</th>
                              <th className="p-3.5">Submissions</th>
                              <th className="p-3.5">Proctoring & Tab Switches</th>
                              <th className="p-3.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map(student => (
                              <tr key={student.uid} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3.5 align-top">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-bitwise-100 text-bitwise-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                                      {student.displayName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 flex items-center gap-2">
                                        {student.displayName}
                                        <span className={`px-1.5 py-0.2 text-[10px] rounded font-semibold ${
                                          student.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                          {student.role}
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-500 font-mono">{student.email}</div>
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        Instructor: <span className="font-semibold text-slate-700">
                                          {(student.assignedInstructors && student.assignedInstructors.length > 0)
                                            ? student.assignedInstructors.map((inst: any) => inst.name || inst.email || 'Assigned Instructor').join(', ')
                                            : 'Unassigned'}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">Active: {student.lastActive}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="p-3.5 align-top">
                                  <div className="space-y-1">
                                    {(student.assignedInstructors && student.assignedInstructors.length > 0)
                                      ? student.assignedInstructors.map((inst: any, idx: number) => (
                                          <div key={`${student.uid}-inst-${idx}`} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold">
                                            <i className="fa-solid fa-user-tie text-[9px]"></i>
                                            {inst.name || inst.email || 'Assigned Instructor'}
                                          </div>
                                        ))
                                      : (
                                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                                        )}
                                  </div>
                                </td>

                                {/* Reg No / Section / Dept */}
                                <td className="p-3.5 align-top">
                                  <div className="space-y-1">
                                    {student.regNo && (
                                      <div className="font-mono text-xs font-bold text-slate-800">{student.regNo}</div>
                                    )}
                                    {student.section && (
                                      <div className="text-[11px] text-slate-600">Sec: <span className="font-semibold">{student.section}</span></div>
                                    )}
                                    {student.dept && (
                                      <div className="text-[11px] text-slate-500">{student.dept}</div>
                                    )}
                                    {student.year && (
                                      <div className="text-[11px] text-slate-500">Year: <span className="font-semibold">{student.year}</span></div>
                                    )}
                                    {!student.regNo && !student.section && !student.dept && !student.year && (
                                      <span className="text-[11px] text-slate-300 italic">—</span>
                                    )}
                                  </div>
                                </td>

                                {/* Enrolled Courses & Detailed Progress */}
                                <td className="p-3.5 align-top max-w-xs">
                                  <div className="space-y-2">
                                    {student.enrolledCourses && student.enrolledCourses.length > 0 ? (
                                      student.enrolledCourses.slice(0, 3).map((cp) => (
                                        <div key={cp.courseId} className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-xs">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-slate-800 truncate max-w-[155px]" title={cp.courseTitle}>
                                              {cp.courseTitle}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                cp.progressPercentage === 100 ? 'bg-green-100 text-green-700' :
                                                cp.progressPercentage > 0 ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-200 text-slate-600'
                                              }`}>
                                                {cp.progressPercentage}%
                                              </span>
                                              {(cp.completedLessons > 0 || cp.problemsSolved > 0) && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    initiateResetCourseProgress(student, cp.courseId, cp.courseTitle, cp.completedLessons);
                                                  }}
                                                  title={`Reset ${cp.courseTitle} progress for ${student.displayName} to 0%`}
                                                  className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                >
                                                  <i className="fa-solid fa-rotate-left text-[9px]"></i>
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          {/* Progress Bar */}
                                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all duration-500 ${
                                                cp.progressPercentage === 100 ? 'bg-green-500' : 'bg-bitwise-500'
                                              }`}
                                              style={{ width: `${cp.progressPercentage}%` }}
                                            />
                                          </div>
                                          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                            <span>{cp.completedLessons}/{cp.totalLessons} lessons</span>
                                            <span>{cp.problemsSolved} challenges solved</span>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-xs text-slate-400 italic">No courses enrolled</span>
                                    )}
                                    {student.enrolledCourses && student.enrolledCourses.length > 3 && (
                                      <div className="text-[10px] text-bitwise-600 font-semibold text-center">
                                        +{student.enrolledCourses.length - 3} more courses...
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="p-3.5 align-top">
                                  <div className="font-bold text-slate-800 text-sm">
                                    {student.completedLessonsCount}
                                  </div>
                                  <div className="text-xs text-slate-500">lessons completed</div>
                                </td>

                                <td className="p-3.5 align-top">
                                  <div className="font-bold text-amber-600 flex items-center gap-1">
                                    ⚡ {student.xp} XP
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    🔥 {student.streakDays} day streak
                                  </div>
                                </td>

                                <td className="p-3.5 align-top">
                                  <div className="font-bold text-purple-700">
                                    {student.submissionsCount} runs
                                  </div>
                                  <div className="text-[11px] text-slate-400">Judge0 tests</div>
                                </td>

                                {/* Proctoring & Tab Switches Column */}
                                <td className="p-3.5 align-top">
                                  <div className="space-y-1.5">
                                    {/* Status Badge */}
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                                        student.proctorStatus === 'FLAGGED'
                                          ? 'bg-red-100 text-red-800 border border-red-200' :
                                        student.proctorStatus === 'WARNING' || (student.tabSwitchCount || 0) > 0
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                        student.proctorStatus === 'EXCUSED'
                                          ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      }`}>
                                        {student.proctorStatus === 'FLAGGED' && <i className="fa-solid fa-flag text-red-600"></i>}
                                        {student.proctorStatus === 'WARNING' && <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>}
                                        {student.proctorStatus === 'EXCUSED' && <i className="fa-solid fa-shield-halved text-blue-600"></i>}
                                        {student.proctorStatus === 'CLEAN' && (!student.tabSwitchCount || student.tabSwitchCount === 0) && (
                                          <i className="fa-solid fa-check text-emerald-600"></i>
                                        )}
                                        {student.proctorStatus === 'CLEAN' && (student.tabSwitchCount || 0) > 0 && (
                                          <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                                        )}
                                        <span>
                                          {student.tabSwitchCount || 0} Tab {student.tabSwitchCount === 1 ? 'Switch' : 'Switches'}
                                        </span>
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                      <span>Status: <strong className="text-slate-700">{student.proctorStatus || 'CLEAN'}</strong></span>
                                      {student.focusLossCount ? <span>• {student.focusLossCount} blur</span> : null}
                                    </div>

                                    {student.proctorNotes && (
                                      <div className="text-[10px] text-slate-500 italic truncate max-w-[190px]" title={student.proctorNotes}>
                                        📝 {student.proctorNotes}
                                      </div>
                                    )}

                                    {/* Quick Action Marks for Admin */}
                                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                      <button
                                        onClick={() => handleQuickProctorStatus(student, 'CLEAN', 0)}
                                        title="Mark Clean & Reset Tab Switches to 0"
                                        className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded transition-colors cursor-pointer"
                                      >
                                        ✓ Clean
                                      </button>
                                      <button
                                        onClick={() => handleQuickProctorStatus(student, 'WARNING')}
                                        title="Mark Warning Status"
                                        className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded transition-colors cursor-pointer"
                                      >
                                        ⚠️ Warn
                                      </button>
                                      <button
                                        onClick={() => handleQuickProctorStatus(student, 'FLAGGED')}
                                        title="Mark Flagged for Review / Malpractice"
                                        className="px-1.5 py-0.5 text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded transition-colors cursor-pointer"
                                      >
                                        🚩 Flag
                                      </button>
                                      <button
                                        onClick={() => handleQuickProctorStatus(student, 'EXCUSED')}
                                        title="Mark Excused by Instructor"
                                        className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded transition-colors cursor-pointer"
                                      >
                                        🛡️ Excuse
                                      </button>
                                      <button
                                        onClick={() => openStudentDetails(student)}
                                        title="Detailed Review & Notes"
                                        className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                                      >
                                        <i className="fa-solid fa-pen-to-square"></i>
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                <td className="p-3.5 align-top text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      onClick={() => handleDeleteStudent(student)}
                                      title="Delete student record from database"
                                      className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg border border-red-200 transition-colors cursor-pointer"
                                    >
                                      <i className="fa-solid fa-trash-can mr-1"></i> Delete
                                    </button>
                                    <button
                                      onClick={() => openStudentDetails(student)}
                                      className="px-3 py-1.5 bg-bitwise-600 hover:bg-bitwise-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <i className="fa-solid fa-chart-line"></i> View Details
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'submissions' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Judge0 Live Execution Stream</h2>
                  <p className="text-xs text-slate-500">Every code evaluation and test run across all languages.</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={submissionFilter}
                    onChange={e => setSubmissionFilter(e.target.value)}
                    className="p-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACCEPTED">Accepted (AC)</option>
                    <option value="WRONG_ANSWER">Wrong Answer (WA)</option>
                    <option value="COMPILE_ERROR">Compile Error</option>
                    <option value="RUNTIME_ERROR">Runtime Error</option>
                  </select>
                  <button
                    onClick={loadSubmissions}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-lg text-slate-600 flex items-center gap-1.5"
                  >
                    <i className={`fa-solid fa-rotate ${isLoadingSubmissions ? 'fa-spin' : ''}`}></i> Refresh
                  </button>
                </div>
              </div>

              {isLoadingSubmissions ? (
                <div className="py-12 text-center text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                  <p className="text-xs">Loading submission logs from Firestore...</p>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <i className="fa-solid fa-code text-2xl mb-2"></i>
                  <p className="text-xs">No submissions recorded yet. Students solving problems will appear here live.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="p-3.5">User</th>
                        <th className="p-3.5">Problem</th>
                        <th className="p-3.5">Language</th>
                        <th className="p-3.5">Result</th>
                        <th className="p-3.5">Test Cases</th>
                        <th className="p-3.5">Tab Switches</th>
                        <th className="p-3.5">Time</th>
                        <th className="p-3.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSubmissions.map((sub, idx) => (
                        <tr key={sub.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            {sub.username || 'Student'}
                          </td>
                          <td className="p-3.5 text-slate-800">
                            {sub.problemTitle || sub.problemId}
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
                              {sub.language}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              sub.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                              sub.status === 'WRONG_ANSWER' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {sub.status === 'ACCEPTED' ? '✓ Accepted' : sub.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-xs text-slate-600">
                            {sub.passedTests} / {sub.totalTests} passed
                          </td>
                          <td className="p-3.5">
                            {(sub.tabSwitchesDuringTest || 0) > 0 ? (
                              <span className="px-2 py-0.5 rounded font-bold text-xs bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                                {sub.tabSwitchesDuringTest} switches
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                                <i className="fa-solid fa-check text-[10px]"></i> 0
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-xs font-mono text-slate-500">
                            {sub.executionTime || '0.04s'}
                          </td>
                          <td className="p-3.5 text-xs text-slate-400 font-mono">
                            {new Date(sub.timestamp || sub.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FIREBASE MANAGEMENT & RESET */}
          {activeTab === 'firebase' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Firebase Project & Database Maintenance</h2>
                <p className="text-xs text-slate-500">
                  Manage cloud persistence, reset test records, and ensure fresh deployment.
                </p>
              </div>

              {resetStatus && (
                <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  resetStatus.success
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <i className={`fa-solid ${resetStatus.success ? 'fa-check-circle text-green-600' : 'fa-triangle-exclamation text-red-600'}`}></i>
                  {resetStatus.message}
                </div>
              )}
              <DedupStatusBanner />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: Project Credentials Info */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                    <i className="fa-solid fa-server text-bitwise-600"></i> Active Firebase Setup
                  </div>
                  <div className="space-y-2 text-xs font-mono text-slate-600">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-400">Project ID:</span>
                      <span className="font-bold text-slate-800">ipd2026</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-400">Auth Domain:</span>
                      <span>ipd2026.firebaseapp.com</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-400">Database:</span>
                      <span className="text-green-700 font-bold">Cloud Firestore</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Storage Bucket:</span>
                      <span>ipd2026.firebasestorage.app</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Reset / Fresh Start Tool */}
                <div className="bg-red-50/50 rounded-xl p-5 border border-red-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-red-900 mb-2">
                      <i className="fa-solid fa-trash-can text-red-600"></i> Fresh Start & Data Reset
                    </div>
                    <p className="text-xs text-red-700 leading-relaxed">
                      As requested, this will clear previous test progress, delete submission histories, and restore fresh course catalogs.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-red-200/60 flex gap-3">
                    <button
                      onClick={handleDeduplicateInstructors}
                      disabled={isDeduping || isInstructor}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      title={isInstructor ? 'Admin only' : ''}
                    >
                      {isDeduping ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-user-check"></i>}
                      Deduplicate Instructor Docs
                    </button>
                    <button
                      onClick={handleMergeDuplicateStudentProgress}
                      disabled={isMergingStudentProgress || isInstructor}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      title={isInstructor ? 'Admin only' : ''}
                    >
                      {isMergingStudentProgress ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-users-gear"></i>}
                      Merge Student Progress
                    </button>
                    <button
                      onClick={handleResetFirebaseData}
                      disabled={isResetting}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isResetting ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-rotate-left"></i>
                      )}
                      Delete Existing Data & Start Fresh
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Clear user_progress, submissions, and local progress keys?')) return;
                        const res = await resetUserProgressAndSubmissionsInFirestore();
                        setResetStatus({ success: res.success, message: res.message });
                      }}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-eraser"></i>
                      Reset Progress + Submissions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODAL 1: DETAILED STUDENT PROGRESS DRILLDOWN                   */}
          {/* ============================================================== */}
          {selectedStudentForDetails && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-bitwise-600 text-white font-black text-xl flex items-center justify-center shadow-lg">
                      {selectedStudentForDetails.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white">{selectedStudentForDetails.displayName}</h2>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-white uppercase font-mono">
                          {selectedStudentForDetails.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">{selectedStudentForDetails.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedStudentForDetails.regNo && (
                          <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">Reg: <strong>{selectedStudentForDetails.regNo}</strong></span>
                        )}
                        {selectedStudentForDetails.section && (
                          <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">Sec: <strong>{selectedStudentForDetails.section}</strong></span>
                        )}
                        {selectedStudentForDetails.dept && (
                          <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">Dept: <strong>{selectedStudentForDetails.dept}</strong></span>
                        )}
                        {selectedStudentForDetails.year && (
                          <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">Year: <strong>{selectedStudentForDetails.year}</strong></span>
                        )}
                        {selectedStudentForDetails.dob && (
                          <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">DOB: <strong>{selectedStudentForDetails.dob}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-amber-400">⚡ {selectedStudentForDetails.xp} XP Earned</div>
                      <div className="text-[11px] text-slate-400">🔥 {selectedStudentForDetails.streakDays} Day Streak</div>
                    </div>
                    <button
                      onClick={() => exportStudentsToExcel([selectedStudentForDetails], courses)}
                      title="Export this student's progress report to Excel"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-file-excel"></i> Export (.xls)
                    </button>
                    <button
                      onClick={() => setSelectedStudentForDetails(null)}
                      className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
                  {/* PROCTORING & EXAM INTEGRITY CENTER */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                          <i className="fa-solid fa-shield-halved"></i>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Proctoring & Exam Integrity Center</h3>
                          <p className="text-xs text-slate-500">Live tab switch tracking, window blur logging, and instructor audit marks.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                          proctorStatusEdit === 'FLAGGED' ? 'bg-red-100 text-red-800 border border-red-300' :
                          proctorStatusEdit === 'WARNING' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          proctorStatusEdit === 'EXCUSED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {proctorStatusEdit === 'FLAGGED' && <><i className="fa-solid fa-flag text-red-600"></i> FLAGGED</>}
                          {proctorStatusEdit === 'WARNING' && <><i className="fa-solid fa-triangle-exclamation text-amber-600"></i> WARNING</>}
                          {proctorStatusEdit === 'EXCUSED' && <><i className="fa-solid fa-shield-halved text-blue-600"></i> EXCUSED</>}
                          {proctorStatusEdit === 'CLEAN' && <><i className="fa-solid fa-circle-check text-emerald-600"></i> VERIFIED CLEAN</>}
                        </span>
                      </div>
                    </div>

                    {/* Live Counters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                          <span>Tab Switches in Tests</span>
                          <i className="fa-solid fa-arrow-right-arrow-left text-slate-400"></i>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-2xl font-black text-slate-900">{tabSwitchCountEdit}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setTabSwitchCountEdit(Math.max(0, tabSwitchCountEdit - 1))}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center text-xs shadow-2xs cursor-pointer"
                              title="Decrement switch count"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => setTabSwitchCountEdit(tabSwitchCountEdit + 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center text-xs shadow-2xs cursor-pointer"
                              title="Increment switch count"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTabSwitchCountEdit(0);
                                setProctorStatusEdit('CLEAN');
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] cursor-pointer"
                              title="Reset switches to 0"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Recorded across all proctored problems</div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                          <span>Window Focus Losses</span>
                          <i className="fa-solid fa-eye-slash text-slate-400"></i>
                        </div>
                        <div className="text-2xl font-black text-slate-900 mt-2">
                          {selectedStudentForDetails.focusLossCount || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Window blur / clicking outside events</div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                          <span>Modal Exit Attempts</span>
                          <i className="fa-solid fa-arrow-right-from-bracket text-slate-400"></i>
                        </div>
                        <div className="text-2xl font-black text-slate-900 mt-2">
                          {selectedStudentForDetails.testExitAttempts || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Attempts to leave problem while locked</div>
                      </div>
                    </div>

                    {/* Admin Status Chooser */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Set Proctoring Status / Decision
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setProctorStatusEdit('CLEAN')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            proctorStatusEdit === 'CLEAN'
                              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                            <i className="fa-solid fa-circle-check text-emerald-600"></i> Clean / Verified
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">No infractions detected</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProctorStatusEdit('WARNING')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            proctorStatusEdit === 'WARNING'
                              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                            <i className="fa-solid fa-triangle-exclamation text-amber-600"></i> Warning
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">1-3 minor tab switches</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProctorStatusEdit('FLAGGED')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            proctorStatusEdit === 'FLAGGED'
                              ? 'bg-red-50 border-red-400 ring-2 ring-red-300'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs text-red-800">
                            <i className="fa-solid fa-flag text-red-600"></i> Flagged
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Repeated tab switches / cheats</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProctorStatusEdit('EXCUSED')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            proctorStatusEdit === 'EXCUSED'
                              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs text-blue-800">
                            <i className="fa-solid fa-shield-halved text-blue-600"></i> Excused
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Approved by instructor</div>
                        </button>
                      </div>
                    </div>

                    {/* Review Notes & Save Action */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Instructor Review Notes & Justification
                        </label>
                        {selectedStudentForDetails.proctorReviewedAt && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            Last reviewed: {selectedStudentForDetails.proctorReviewedAt} ({selectedStudentForDetails.proctorReviewedBy || 'Admin'})
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        value={proctorNotesEdit}
                        onChange={e => setProctorNotesEdit(e.target.value)}
                        placeholder="e.g., Student triggered 2 tab switches during coding challenge; verified and cleared after review..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-bitwise-500 transition-all font-sans"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          {proctorSaveSuccess && (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
                              <i className="fa-solid fa-circle-check"></i> {proctorSaveSuccess}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveModalProctorReview}
                          disabled={isSavingProctorReview}
                          className="px-4 py-2 bg-bitwise-600 hover:bg-bitwise-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {isSavingProctorReview ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fa-solid fa-floppy-disk"></i>
                          )}
                          Save Proctoring Review
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Course Enrollment & Progress Breakdown */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <i className="fa-solid fa-graduation-cap text-bitwise-600"></i>
                        Enrolled Courses & Progress Breakdown
                      </h3>
                      <span className="text-xs font-semibold text-slate-500">
                        {selectedStudentForDetails.enrolledCourses?.length || 0} Tracks Tracked
                      </span>
                    </div>

                    {courseResetNotification && (
                      <div className="mb-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-circle-check text-emerald-600"></i>
                          {courseResetNotification}
                        </div>
                        <button onClick={() => setCourseResetNotification(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(selectedStudentForDetails.enrolledCourses || []).map((cp) => {
                        const fullCourse = courses.find(c => c.id === cp.courseId);
                        const isExpanded = expandedCourseId === cp.courseId;

                        return (
                          <div
                            key={cp.courseId}
                            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-900 text-sm leading-snug">
                                  {cp.courseTitle}
                                </div>
                                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded mt-1">
                                  {cp.level}
                                </span>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                cp.progressPercentage === 100 ? 'bg-green-100 text-green-800' :
                                cp.progressPercentage > 0 ? 'bg-bitwise-100 text-bitwise-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {cp.progressPercentage}% Done
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    cp.progressPercentage === 100 ? 'bg-green-500' : 'bg-bitwise-600'
                                  }`}
                                  style={{ width: `${cp.progressPercentage}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-slate-500 font-medium">
                                <span>{cp.completedLessons} of {cp.totalLessons} lessons</span>
                                <span>{cp.problemsSolved} challenges solved</span>
                              </div>
                            </div>

                            {/* Course Actions: Syllabus & Reset Progress */}
                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                              {fullCourse && fullCourse.modules ? (
                                <button
                                  onClick={() => setExpandedCourseId(isExpanded ? null : cp.courseId)}
                                  className="text-xs text-bitwise-600 hover:text-bitwise-700 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`}></i>
                                  {isExpanded ? 'Hide Syllabus' : 'View Syllabus Checklist'}
                                </button>
                              ) : (
                                <div />
                              )}

                              <button
                                type="button"
                                onClick={() => initiateResetCourseProgress(
                                  selectedStudentForDetails,
                                  cp.courseId,
                                  cp.courseTitle,
                                  cp.completedLessons
                                )}
                                disabled={cp.completedLessons === 0 && cp.problemsSolved === 0}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  cp.completedLessons === 0 && cp.problemsSolved === 0
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shadow-2xs hover:shadow-xs'
                                }`}
                                title={
                                  cp.completedLessons === 0 && cp.problemsSolved === 0
                                    ? 'Course progress is already at 0%'
                                    : `Reset progress for ${cp.courseTitle} to 0%`
                                }
                              >
                                <i className="fa-solid fa-rotate-left text-[10px]"></i>
                                <span>Reset Course Progress</span>
                              </button>
                            </div>

                            {/* Expandable Syllabus Checklist */}
                            {isExpanded && fullCourse && fullCourse.modules && (
                              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                                {fullCourse.modules.map(mod => {
                                  const effectiveDeadline = selectedStudentForDetails.moduleDeadlineOverrides?.[cp.courseId]?.[mod.id] || mod.endDate;
                                  return (
                                    <div key={mod.id} className="bg-slate-50 p-2 rounded-lg text-xs">
                                      <div className="font-bold text-slate-700 mb-1 text-[11px] flex items-center justify-between gap-2">
                                        <span>{mod.title}</span>
                                        {(isInstructor || !isInstructor) && (
                                          <label className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600">
                                            <span>Extend</span>
                                            <input
                                              type="date"
                                              value={selectedStudentForDetails.moduleDeadlineOverrides?.[cp.courseId]?.[mod.id] || mod.endDate || ''}
                                              onChange={async (e) => {
                                                await handleModuleDeadlineOverride(selectedStudentForDetails, cp.courseId, mod.id, e.target.value);
                                              }}
                                              className="bg-transparent outline-none"
                                            />
                                          </label>
                                        )}
                                      </div>
                                      <div className="space-y-1 pl-2">
                                        {mod.lessons.map(les => {
                                          const isCompleted = selectedStudentForDetails.completedLessonIds?.includes(les.id);
                                          return (
                                            <div key={les.id} className="flex items-center justify-between text-[11px]">
                                              <span className={`truncate max-w-[200px] ${isCompleted ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                                                {les.title}
                                              </span>
                                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                isCompleted ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-500'
                                              }`}>
                                                {isCompleted ? '✓ Completed' : 'Pending'}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {effectiveDeadline && (
                                        <div className="mt-2 text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                          Effective deadline: {new Date(effectiveDeadline).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submissions History for this student */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-code text-bitwise-600"></i>
                      Student Code Submissions
                    </h3>

                    {selectedStudentForDetails.submissions && selectedStudentForDetails.submissions.length > 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase">
                            <tr>
                              <th className="p-3">Problem</th>
                              <th className="p-3">Language</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Passed</th>
                              <th className="p-3">Tab Switches</th>
                              <th className="p-3">Time</th>
                              <th className="p-3 text-right">Inspect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedStudentForDetails.submissions.map((sub, idx) => (
                              <tr key={sub.id || idx} className="hover:bg-slate-50">
                                <td className="p-3 font-semibold text-slate-800">
                                  {sub.problemTitle || sub.problemId}
                                </td>
                                <td className="p-3 font-mono uppercase text-slate-600">
                                  {sub.language}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    sub.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {sub.status === 'ACCEPTED' ? 'Accepted' : sub.status}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600">
                                  {sub.passedTests} / {sub.totalTests}
                                </td>
                                <td className="p-3">
                                  {(sub.tabSwitchesDuringTest || 0) > 0 ? (
                                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                      <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                                      {sub.tabSwitchesDuringTest} switches
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                                      <i className="fa-solid fa-check text-[10px]"></i> 0 switches
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-400 font-mono">
                                  {sub.timestamp}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => setInspectedSubmission(sub)}
                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-[11px] transition-colors cursor-pointer"
                                  >
                                    View Code
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400 text-xs">
                        <i className="fa-solid fa-code-branch text-2xl mb-1 text-slate-300"></i>
                        <p>No active problem submission records found yet for this student.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
                  <div className="text-xs text-slate-500 font-mono">
                    UID: <span className="font-bold text-slate-700">{selectedStudentForDetails.uid}</span>
                  </div>
                  <button
                    onClick={() => setSelectedStudentForDetails(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODAL: CONFIRM COURSE PROGRESS RESET                           */}
          {/* ============================================================== */}
          {resetConfirmState.isOpen && resetConfirmState.student && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl mb-4">
                  <i className="fa-solid fa-rotate-left"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Reset Course Progress?
                </h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Are you sure you want to reset <span className="font-bold text-slate-900">{resetConfirmState.student.displayName}</span>'s progress for <span className="font-bold text-bitwise-700">{resetConfirmState.courseTitle}</span>?
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-medium">
                    <i className="fa-solid fa-circle-xmark text-red-500 shrink-0"></i>
                    <span>Resets completed lessons ({resetConfirmState.completedCount}) in this course back to 0</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <i className="fa-solid fa-circle-xmark text-red-500 shrink-0"></i>
                    <span>Clears challenge submissions for this course</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <i className="fa-solid fa-circle-xmark text-red-500 shrink-0"></i>
                    <span>Sets course progress back to 0%</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setResetConfirmState({ isOpen: false, student: null, courseId: '', courseTitle: '', completedCount: 0 })}
                    disabled={isResettingCourse}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmResetCourseProgress}
                    disabled={isResettingCourse}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {isResettingCourse ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-rotate-left"></i>
                        Confirm Reset
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODAL 2: CODE INSPECTOR DRAWER/POPUP                           */}
          {/* ============================================================== */}
          {inspectedSubmission && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <i className="fa-solid fa-code"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        {inspectedSubmission.problemTitle || inspectedSubmission.problemId}
                      </h3>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                        <span className="uppercase font-bold text-bitwise-400">{inspectedSubmission.language}</span>
                        <span>•</span>
                        <span>{inspectedSubmission.timestamp}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">{inspectedSubmission.status}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setInspectedSubmission(null)}
                    className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center text-xs"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {/* Code Viewer Body */}
                <div className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs">
                  <pre className="text-slate-100 whitespace-pre leading-relaxed selection:bg-bitwise-600">
                    {inspectedSubmission.code || '// No code recorded in this submission'}
                  </pre>
                </div>

                {/* Footer */}
                <div className="p-3 bg-slate-800 border-t border-slate-700 flex justify-between items-center text-xs">
                  <span className="text-slate-400">
                    Tests: <strong className="text-white">{inspectedSubmission.passedTests}/{inspectedSubmission.totalTests} passed</strong>
                  </span>
                  <button
                    onClick={() => setInspectedSubmission(null)}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODAL 3: PROBLEM & TEST CASE STUDIO & SANDBOX RUNNER           */}
          {/* ============================================================== */}
          {problemModalState.isOpen && problemModalState.lesson && (
            <AdminProblemEditorModal
              isOpen={problemModalState.isOpen}
              lesson={problemModalState.lesson}
              moduleIndex={problemModalState.moduleIndex}
              lessonIndex={problemModalState.lessonIndex}
              courseTitle={problemModalState.courseTitle}
              moduleTitle={problemModalState.moduleTitle}
              readOnly={isInstructor}
              onSave={(updatedLesson, mIdx, lIdx) => {
                if (isInstructor) return;
                if (editingCourse && mIdx >= 0 && lIdx >= 0) {
                  const updatedModules = [...editingCourse.modules];
                  updatedModules[mIdx].lessons[lIdx] = updatedLesson;
                  setEditingCourse({
                    ...editingCourse,
                    modules: updatedModules
                  });
                }
                setProblemModalState({
                  isOpen: false,
                  lesson: null,
                  moduleIndex: -1,
                  lessonIndex: -1,
                  courseTitle: '',
                  moduleTitle: ''
                });
              }}
              onClose={() => {
                setProblemModalState({
                  isOpen: false,
                  lesson: null,
                  moduleIndex: -1,
                  lessonIndex: -1,
                  courseTitle: '',
                  moduleTitle: ''
                });
              }}
            />
          )}

          {/* ============================================================== */}
          {/* MODAL 4: ASSIGN COURSE TO INSTRUCTOR (ADMIN ONLY)              */}
          {/* ============================================================== */}
          {assignModalCourse && !isInstructor && (
            <AssignCourseModal
              isOpen={!!assignModalCourse}
              course={assignModalCourse}
              onClose={() => setAssignModalCourse(null)}
              onUpdatedCourses={onUpdateCourses}
              onAssign={handleAssignInstructorToCourse}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
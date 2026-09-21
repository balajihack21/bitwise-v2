import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Lesson, Course, TestCaseResult, User, UserProgress, SubmissionRecord, TestCase } from '../types';
import { runTestCases, JUDGE0_LANGUAGES } from '../services/judge0Service';
import { recordCompletion, addSubmission, getNextLesson, recordProctoringInfraction } from '../services/progressService';
import Judge0SettingsModal from './Judge0SettingsModal';

// Clean starter boilerplates (skeletons without solutions)
const getCleanStarterTemplate = (lang: string): string => {
  switch (lang) {
    case 'java':
      return `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Read input from STDIN and write your solution here
        
    }
}`;
    case 'python':
      return `# Starter code`;
    case 'cpp':
    case 'c++':
      return `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // TODO: Read input from STDIN and write your solution here
    return 0;
}`;
    default:
      return `const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  // TODO: Read input from STDIN and write your solution here
  
}

solve();`;
  }
};

interface ProblemWorkspaceProps {
  lesson: Lesson;
  course: Course;
  user: User | null;
  progress: UserProgress;
  onProgressUpdate: (updated: UserProgress) => void;
  onNavigateToLesson: (nextLesson: Lesson) => void;
  onClose?: () => void;
  onOpenPlayground?: (code: string, language: string) => void;
  onActivateWorkspace?: () => void;
}

const ProblemWorkspace: React.FC<ProblemWorkspaceProps> = ({
  lesson,
  course,
  user,
  progress,
  onProgressUpdate,
  onNavigateToLesson,
  onClose,
  onOpenPlayground,
  onActivateWorkspace
}) => {
  const problemMeta = lesson.problem;
  const username = user?.username || 'guest';

  // State
  const [language, setLanguage] = useState<string>(() => {
    return lesson.language || 'java';
  });

  const [code, setCode] = useState<string>(() => {
    const defaultLang = lesson.language || 'java';
    if (problemMeta?.starterTemplates && problemMeta.starterTemplates[defaultLang]) {
      return problemMeta.starterTemplates[defaultLang];
    }
    return getCleanStarterTemplate(defaultLang);
  });

  const [activeTab, setActiveTab] = useState<'problem' | 'submissions' | 'hints'>('problem');
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number>(0);
  const [customInput, setCustomInput] = useState<string>('');
  const [useCustomInput, setUseCustomInput] = useState<boolean>(false);

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'IDLE';
    message: string;
    executionTime?: string;
    passedTests?: number;
    totalTests?: number;
  }>({ status: 'IDLE', message: '' });

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [unlockedNextLesson, setUnlockedNextLesson] = useState<Lesson | null>(null);
  const [isSplitScreenMode, setIsSplitScreenMode] = useState<boolean>(false);

  // Proctored Exam / Focus Lock Tracking State
  const [sessionTabSwitches, setSessionTabSwitches] = useState<number>(0);
  const [showProctorAlert, setShowProctorAlert] = useState<boolean>(false);
  const [proctorAlertReason, setProctorAlertReason] = useState<string>('');
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);

  const isAlreadyCompleted = progress.completedLessonIds.includes(lesson.id);

  // Reset or update template on lesson change
  useEffect(() => {
    const defaultLang = lesson.language || language || 'java';
    setLanguage(defaultLang);
    if (problemMeta?.starterTemplates && problemMeta.starterTemplates[defaultLang]) {
      setCode(problemMeta.starterTemplates[defaultLang]);
    } else {
      setCode(getCleanStarterTemplate(defaultLang));
    }
    setTestResults([]);
    setSubmissionFeedback({ status: 'IDLE', message: '' });
    setSelectedTestCaseIndex(0);
    setUnlockedNextLesson(null);
    setSessionTabSwitches(0);
    setElapsedSeconds(0);
  }, [lesson.id]);

  // Timer effect for challenge duration
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const updateSplitScreenState = () => {
      const isLikelySplit = window.screen && window.screen.availWidth > 0 && window.innerWidth < window.screen.availWidth * 0.8;
      setIsSplitScreenMode(isLikelySplit);
    };

    updateSplitScreenState();
    window.addEventListener('resize', updateSplitScreenState);
    return () => window.removeEventListener('resize', updateSplitScreenState);
  }, []);

  useEffect(() => {
    const blockClipboardAndCapture = (event: Event, reason: string) => {
      event.preventDefault();
      handleSecurityViolation(reason);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isEditorTarget = activeTag === 'textarea' || activeTag === 'input';
      const modifier = event.ctrlKey || event.metaKey;
      const comboKey = event.key.toLowerCase();

      const blockedShortcut =
        (modifier && (comboKey === 'c' || comboKey === 'v' || comboKey === 'x' || comboKey === 's' || comboKey === 'p')) ||
        comboKey === 'printscreen' ||
        event.code === 'PrintScreen' ||
        (event.shiftKey && modifier && comboKey === 's') ||
        (event.altKey && comboKey === 'printscreen');

      if (blockedShortcut && isEditorTarget) {
        blockClipboardAndCapture(event, 'Clipboard or screenshot action blocked');
        return;
      }

      if ((event.key === 'PrintScreen' || event.code === 'PrintScreen') && isEditorTarget) {
        blockClipboardAndCapture(event, 'Screenshot attempt blocked');
      }
    };

    const onCopy = (event: ClipboardEvent) => blockClipboardAndCapture(event, 'Copy attempt blocked');
    const onCut = (event: ClipboardEvent) => blockClipboardAndCapture(event, 'Cut attempt blocked');
    const onPaste = (event: ClipboardEvent) => blockClipboardAndCapture(event, 'Paste attempt blocked');
    const onContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        event.preventDefault();
        handleSecurityViolation('Context menu blocked');
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [user]);

  // Proctoring & Anti-Cheat: Tab Switch & Focus Loss Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSecurityViolation('Tab switch or window minimization detected');
      }
    };

    const handleWindowBlur = () => {
      // Trigger when browser window loses focus
      handleSecurityViolation('Window focus lost / application switch detected');
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are currently in an active coding challenge session. Leaving now will record an infraction.';
      return e.returnValue;
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [user]);

  const handleSecurityViolation = (reason: string) => {
    setSessionTabSwitches(prev => {
      const nextCount = prev + 1;
      setProctorAlertReason(`${reason} (Infraction #${nextCount})`);
      setShowProctorAlert(true);
      return nextCount;
    });

    // Save infraction in progress service
    const updated = recordProctoringInfraction(user || 'guest', 'tab_switch');
    onProgressUpdate(updated);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (problemMeta?.starterTemplates && problemMeta.starterTemplates[newLang]) {
      setCode(problemMeta.starterTemplates[newLang]);
    } else {
      setCode(getCleanStarterTemplate(newLang));
    }
  };

  const handleResetCode = () => {
    if (window.confirm('Reset code to starter template?')) {
      if (problemMeta?.starterTemplates && problemMeta.starterTemplates[language]) {
        setCode(problemMeta.starterTemplates[language]);
      } else {
        setCode(getCleanStarterTemplate(language));
      }
    }
  };

  // Keyboard Tab Indentation Handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSplitScreenMode) {
      e.preventDefault();
      return;
    }

    const modifier = e.ctrlKey || e.metaKey;
    const comboKey = e.key.toLowerCase();
    const blockedShortcut =
      (modifier && (comboKey === 'c' || comboKey === 'v' || comboKey === 'x' || comboKey === 's' || comboKey === 'p')) ||
      e.key === 'PrintScreen' ||
      e.code === 'PrintScreen' ||
      (e.shiftKey && modifier && comboKey === 's') ||
      (e.altKey && comboKey === 'printscreen');

    if (blockedShortcut) {
      e.preventDefault();
      handleSecurityViolation('Clipboard or screenshot action blocked');
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      setCode(val.substring(0, start) + '  ' + val.substring(end));
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Run Sample Test Cases
  const handleRunSampleTests = async () => {
    if (isSplitScreenMode) return;
    if (!code.trim() || isRunning || isSubmitting) return;

    setIsRunning(true);
    setSubmissionFeedback({ status: 'IDLE', message: '' });

    try {
      let casesToRun: TestCase[] = [];

      if (useCustomInput) {
        casesToRun = [{
          id: 'custom-input',
          input: customInput,
          expectedOutput: '',
          explanation: 'Custom User Stdin'
        }];
      } else {
        // Run non-hidden sample test cases
        const samples = (problemMeta?.testCases || []).filter(tc => !tc.isHidden);
        casesToRun = samples.length > 0 ? samples : (problemMeta?.testCases || []).slice(0, 2);
        if (casesToRun.length === 0) {
          casesToRun = [{ id: 'sample-default', input: '', expectedOutput: '' }];
        }
      }

      const { results, allPassed, executionTime } = await runTestCases(
        code,
        language,
        casesToRun
      );

      setTestResults(results);
      if (useCustomInput) {
        setSubmissionFeedback({
          status: 'IDLE',
          message: 'Custom execution completed.',
          executionTime
        });
      } else {
        const passedCount = results.filter(r => r.passed).length;
        setSubmissionFeedback({
          status: allPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
          message: allPassed 
            ? `All ${results.length}/${results.length} sample test cases passed!` 
            : `${passedCount}/${results.length} sample test cases passed.`,
          executionTime,
          passedTests: passedCount,
          totalTests: results.length
        });
      }
    } catch (err: any) {
      setSubmissionFeedback({
        status: 'RUNTIME_ERROR',
        message: 'Execution error occurred: ' + (err.message || 'Check terminal output')
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Solution (validates ALL test cases including hidden ones)
  const handleSubmitSolution = async () => {
    if (isSplitScreenMode) return;
    if (!code.trim() || isRunning || isSubmitting) return;

    setIsSubmitting(true);
    setUseCustomInput(false);

    try {
      const allCases = problemMeta?.testCases || [
        { id: 'default-tc', input: '', expectedOutput: '' }
      ];

      const { results, allPassed, executionTime } = await runTestCases(
        code,
        language,
        allCases
      );

      setTestResults(results);
      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;

      const submissionStatus = allPassed
        ? 'ACCEPTED'
        : results.some(r => r.statusDescription?.includes('Compile'))
        ? 'COMPILE_ERROR'
        : results.some(r => r.statusDescription?.includes('Runtime'))
        ? 'RUNTIME_ERROR'
        : 'WRONG_ANSWER';

      // Record submission
      const newSubmission: SubmissionRecord = {
        id: 'sub-' + Math.random().toString(36).substring(2, 9),
        problemId: lesson.id,
        problemTitle: lesson.title,
        courseId: course.id,
        courseTitle: course.title,
        language,
        code,
        status: submissionStatus,
        passedTests: passedCount,
        totalTests: totalCount,
        executionTime,
        timestamp: new Date().toLocaleTimeString() + ', ' + new Date().toLocaleDateString(),
        testResults: results,
        tabSwitchesDuringTest: sessionTabSwitches,
        isPractice: lesson.isPractice
      };

      const updatedWithSub = addSubmission(user || username, newSubmission);

      if (allPassed && !lesson.isPractice) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        // Earn XP and unlock the NEXT problem
        const earnedXp = problemMeta?.points || 50;
        const { updatedProgress, newlyUnlockedLesson } = recordCompletion(
          user || username,
          lesson.id,
          course,
          earnedXp
        );

        setUnlockedNextLesson(newlyUnlockedLesson);
        onProgressUpdate(updatedProgress);

        setSubmissionFeedback({
          status: 'ACCEPTED',
          message: `Congratulations! All ${totalCount}/${totalCount} Test Cases Passed! (+${earnedXp} XP)`,
          executionTime,
          passedTests: passedCount,
          totalTests: totalCount
        });
      } else if (allPassed && lesson.isPractice) {
        onProgressUpdate(updatedWithSub);
        setSubmissionFeedback({
          status: 'ACCEPTED',
          message: `Practice complete! All ${totalCount}/${totalCount} test cases passed. Practice problems do not affect course progress or internal marks.`,
          executionTime,
          passedTests: passedCount,
          totalTests: totalCount
        });
      } else {
        onProgressUpdate(updatedWithSub);
        setSubmissionFeedback({
          status: submissionStatus,
          message: `${passedCount}/${totalCount} Test Cases Passed. Review failed test case output below.`,
          executionTime,
          passedTests: passedCount,
          totalTests: totalCount
        });
      }
    } catch (err: any) {
      setSubmissionFeedback({
        status: 'RUNTIME_ERROR',
        message: 'Submission error: ' + (err.message || 'Check terminal output')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmExit = () => {
    // Record exit attempt infraction in progress
    const updated = recordProctoringInfraction(user || 'guest', 'exit_attempt');
    onProgressUpdate(updated);
    setShowExitConfirmModal(false);
    if (onClose) {
      onClose();
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentTestCase = (problemMeta?.testCases || [])[selectedTestCaseIndex];
  const currentResult = testResults[selectedTestCaseIndex];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col w-full h-[100dvh] min-h-0 overflow-hidden text-slate-100 select-none-area animate-fade-in">
      {/* Top Proctored Exam Header Bar */}
      <header className="min-h-12 bg-slate-900 border-b border-slate-800 px-2 sm:px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg">
        <div className="flex items-center gap-2 min-w-0 max-w-[55%] sm:max-w-none">
          {/* Proctored Badge */}
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PROCTORED MODE</span>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Problem Title & Course */}
          <div className="hidden sm:block min-w-0 truncate">
            <span className="text-xs text-slate-400 font-medium">{course.title}: </span>
            <span className="text-xs font-bold text-white">{lesson.title}</span>
          </div>
        </div>

        {/* Center Live Timer & Proctoring Stats */}
        <div className="flex items-center gap-1.5 order-3 sm:order-none w-full sm:w-auto justify-center">
          {/* Active Timer */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-300">
            <i className="fa-regular fa-clock text-bitwise-400"></i>
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Tab Switch / Focus Loss Counter */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-colors ${
            sessionTabSwitches > 0 
              ? 'bg-red-950/80 text-red-400 border-red-800 animate-pulse' 
              : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}>
            <i className="fa-solid fa-eye-slash"></i>
            <span>{sessionTabSwitches}</span>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="px-2 py-1 text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
            title="Toggle Fullscreen Mode"
          >
            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            <span className="hidden md:inline">{isFullscreen ? 'Exit' : 'Full'}</span>
          </button>

          {/* Exit Challenge Button with Guard */}
          <button
            onClick={() => setShowExitConfirmModal(true)}
            className="px-2.5 py-1 text-[10px] font-bold text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900 border border-red-800/80 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            title="Exit proctored environment"
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Single-column workspace layout */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-950">
        {/* Problem Description & Submissions */}
        <div className="w-full flex flex-col border-b border-slate-800 bg-slate-950">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between gap-2 px-2 sm:px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs shrink-0">
            <div className="flex gap-1 min-w-0 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('problem')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'problem'
                    ? 'bg-bitwise-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <i className="fa-solid fa-file-code"></i><span className="hidden sm:inline">Description</span>
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'submissions'
                    ? 'bg-bitwise-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <i className="fa-solid fa-clock-rotate-left"></i><span className="hidden sm:inline">Submissions</span>
                {progress.submissions.filter(s => s.problemId === lesson.id).length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-[10px] rounded-full border border-slate-700">
                    {progress.submissions.filter(s => s.problemId === lesson.id).length}
                  </span>
                )}
              </button>
              {problemMeta?.hints && problemMeta.hints.length > 0 && (
                <button
                  onClick={() => setActiveTab('hints')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'hints'
                      ? 'bg-bitwise-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <i className="fa-regular fa-lightbulb text-amber-400"></i><span className="hidden sm:inline">Hints</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isAlreadyCompleted && (
                <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-circle-check"></i> Solved
                </span>
              )}
            </div>
          </div>

          {/* Tab Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-5 sm:space-y-6">
            {activeTab === 'problem' && (
              <div className="space-y-6">
                {/* Problem Title & Meta Badges */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
                      problemMeta?.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      problemMeta?.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {problemMeta?.difficulty || 'Easy'}
                    </span>

                    <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                      +{problemMeta?.points || 50} XP
                    </span>

                    {problemMeta?.acceptanceRate && (
                      <span className="text-xs text-slate-400">
                        Acceptance: <span className="font-semibold text-slate-200">{problemMeta.acceptanceRate}</span>
                      </span>
                    )}
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight break-words">{lesson.title}</h1>
                </div>

                {/* Description HTML */}
                <div 
                  className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: lesson.content || '' }}
                />

                {/* Examples */}
                {problemMeta?.examples && problemMeta.examples.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Examples</h3>
                    {problemMeta.examples.map((ex, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2">
                        <div className="font-bold text-slate-300">Example {idx + 1}:</div>
                        <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                          <span className="text-slate-500">Input: </span>
                          <span className="text-slate-200 whitespace-pre">{ex.input}</span>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                          <span className="text-slate-500">Output: </span>
                          <span className="text-emerald-400 font-bold whitespace-pre">{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <p className="text-slate-400 font-sans text-xs italic mt-1">{ex.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {problemMeta?.constraints && problemMeta.constraints.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Constraints</h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 font-mono bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      {problemMeta.constraints.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white">Your Submission History</h3>
                {progress.submissions.filter(s => s.problemId === lesson.id).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <i className="fa-solid fa-code-branch text-2xl mb-2 opacity-40"></i>
                    <p>No submissions recorded yet for this challenge. Write your solution and test against Judge0!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {progress.submissions
                      .filter(s => s.problemId === lesson.id)
                      .map((sub) => (
                        <div 
                          key={sub.id} 
                          className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                              sub.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              'bg-red-950 text-red-400 border border-red-800'
                            }`}>
                              {sub.status === 'ACCEPTED' ? 'Accepted' : 'Wrong Answer / Failed'}
                            </span>
                            <span className="text-slate-400">{sub.timestamp}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Language: <span className="text-slate-200 uppercase font-mono">{sub.language}</span></span>
                            <span>Passed: <span className="text-slate-200">{sub.passedTests}/{sub.totalTests}</span></span>
                            {sub.executionTime && <span>Time: <span className="text-slate-200">{sub.executionTime}</span></span>}
                          </div>
                          {sub.tabSwitchesDuringTest !== undefined && sub.tabSwitchesDuringTest > 0 && (
                            <div className="text-[10px] text-amber-400 flex items-center gap-1">
                              <i className="fa-solid fa-triangle-exclamation"></i>
                              <span>Tab switches during test: {sub.tabSwitchesDuringTest}</span>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setCode(sub.code);
                              setLanguage(sub.language);
                              setActiveTab('problem');
                            }}
                            className="text-[11px] text-bitwise-400 hover:text-bitwise-300 font-semibold pt-1 block"
                          >
                            Load this submission code →
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'hints' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <i className="fa-regular fa-lightbulb text-amber-400"></i> Problem Hints & Strategies
                </h3>
                {problemMeta?.hints?.map((hint, idx) => (
                  <div key={idx} className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 text-xs text-amber-200/90 leading-relaxed">
                    <span className="font-bold text-amber-400 block mb-1">Hint {idx + 1}:</span>
                    {hint}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress & Next Problem Footer banner */}
          {(isAlreadyCompleted || unlockedNextLesson) && (
            <div className="p-4 bg-emerald-950/40 border-t border-emerald-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-check"></i>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-300">Problem Mastered</p>
                  <p className="text-[11px] text-emerald-400/70">Next problem is unlocked in your track!</p>
                </div>
              </div>

              {getNextLesson(course, lesson.id) && (
                <button
                  onClick={() => onNavigateToLesson(getNextLesson(course, lesson.id)!)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all hover:scale-105"
                >
                  Next Challenge <i className="fa-solid fa-arrow-right"></i>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Code Editor & Judge0 Test Runner */}
        <div className="w-full flex flex-col bg-slate-900">
          {/* Editor Toolbar */}
          {isSplitScreenMode && (
            <div className="px-4 py-3 bg-red-950/80 border-b border-red-800 text-red-100 text-[12px] font-bold flex items-center justify-center gap-2 shrink-0 shadow-inner">
              <i className="fa-solid fa-triangle-exclamation text-red-300"></i>
              Fullscreen mode is required to continue this challenge. Split-screen editing is disabled.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 px-2 sm:px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-slate-900 text-slate-200 text-xs font-mono px-2 sm:px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-bitwise-500 max-w-[45vw]"
              >
                {JUDGE0_LANGUAGES.map(lang => (
                  <option key={lang.key} value={lang.key}>
                    {lang.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleResetCode}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                title="Reset starter template"
              >
                <i className="fa-solid fa-rotate-left mr-1"></i><span className="hidden sm:inline">Reset Starter</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              {/* Judge0 Sandbox Engine Settings */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 bg-slate-900 hover:bg-slate-700 text-bitwise-400 border border-slate-700 rounded-lg transition-colors"
                title="Judge0 Sandbox Settings"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="hidden sm:inline">Sandbox Engine</span>
                <i className="fa-solid fa-gear ml-1 text-slate-400"></i>
              </button>

              {onOpenPlayground && (
                <button
                  onClick={() => onOpenPlayground(code, language)}
                  className="text-xs text-slate-400 hover:text-white p-1.5 rounded"
                  title="Open in Code Playground"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                </button>
              )}
            </div>
          </div>

          {/* Code Editor TextArea */}
          <div className="flex-1 relative bg-slate-950 min-h-[220px] overflow-hidden flex flex-col">
            <textarea
              value={code}
              onChange={(e) => {
                if (!isSplitScreenMode) setCode(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onCopy={(e) => {
                e.preventDefault();
                handleSecurityViolation('Copy attempt blocked');
              }}
              onPaste={(e) => {
                e.preventDefault();
                handleSecurityViolation('Paste attempt blocked');
              }}
              onCut={(e) => {
                e.preventDefault();
                handleSecurityViolation('Cut attempt blocked');
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                handleSecurityViolation('Context menu blocked');
              }}
              onDragStart={(e) => e.preventDefault()}
              readOnly={isSplitScreenMode}
              spellCheck={false}
              className={`w-full h-full p-3 sm:p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 border-none select-text ${
                isSplitScreenMode ? 'bg-slate-900 text-slate-500 cursor-not-allowed' : 'bg-slate-950 text-slate-100'
              }`}
              placeholder={isSplitScreenMode ? '// Editing disabled while split-screen is active' : '// Write your code to solve the challenge...'}
            />
          </div>

          {/* Test Cases & Validation Panel */}
          <div className="h-64 max-h-[42vh] min-h-[220px] border-t border-slate-800 bg-slate-900 flex flex-col shrink-0 overflow-hidden">
            {/* Test Case Tab Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 sm:px-4 py-2 bg-slate-800/80 border-b border-slate-800 shrink-0">
              <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto scrollbar-hide text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
                  Sample Cases:
                </span>

                {(problemMeta?.testCases || []).map((tc, idx) => {
                  const res = testResults.find(r => r.testCaseId === tc.id);
                  return (
                    <button
                      key={tc.id}
                      onClick={() => {
                        setSelectedTestCaseIndex(idx);
                        setUseCustomInput(false);
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        !useCustomInput && selectedTestCaseIndex === idx
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>Case {idx + 1}</span>
                      {tc.isHidden && <span className="text-[9px] text-slate-500 font-mono">[Hidden]</span>}
                      {res && (
                        <i className={`fa-solid ${res.passed ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-red-400'} text-[10px]`}></i>
                      )}
                    </button>
                  );
                })}

                <button
                  onClick={() => setUseCustomInput(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                    useCustomInput
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-terminal text-[10px]"></i> Custom STDIN
                </button>
              </div>

              {/* Run & Submit Actions */}
              {!isSplitScreenMode && (
                <div className="flex w-full sm:w-auto items-center justify-end gap-2">
                  <button
                    onClick={handleRunSampleTests}
                    disabled={isRunning || isSubmitting}
                    className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {isRunning ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> Running...</>
                    ) : (
                      <><i className="fa-solid fa-play text-xs text-emerald-400"></i> Run Tests</>
                    )}
                  </button>

                  <button
                    onClick={handleSubmitSolution}
                    disabled={isRunning || isSubmitting}
                    className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <><i className="fa-solid fa-circle-notch fa-spin"></i> Submitting...</>
                    ) : (
                      <><i className="fa-solid fa-cloud-arrow-up"></i> Submit Solution</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Test Case Content Area */}
            <div className="flex-1 min-h-0 min-w-0 p-3 sm:p-4 overflow-y-auto overflow-x-hidden font-mono text-xs space-y-3 bg-slate-950/60">
              {/* Overall Submission Result Feedback Banner */}
              {submissionFeedback.message && (
                <div className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-sans ${
                  submissionFeedback.status === 'ACCEPTED' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' :
                  submissionFeedback.status === 'WRONG_ANSWER' ? 'bg-red-950/80 border border-red-800 text-red-300' :
                  submissionFeedback.status === 'COMPILE_ERROR' || submissionFeedback.status === 'RUNTIME_ERROR' ? 'bg-amber-950/80 border border-amber-800 text-amber-300' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <i className={`fa-solid ${
                      submissionFeedback.status === 'ACCEPTED' ? 'fa-circle-check text-emerald-400' :
                      submissionFeedback.status === 'WRONG_ANSWER' ? 'fa-circle-xmark text-red-400' :
                      'fa-triangle-exclamation text-amber-400'
                    } text-sm`}></i>
                    <span className="font-semibold">{submissionFeedback.message}</span>
                  </div>
                  {submissionFeedback.executionTime && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Time: {submissionFeedback.executionTime}
                    </span>
                  )}
                </div>
              )}

              {useCustomInput ? (
                <div className="space-y-2">
                  <label className="text-[11px] font-sans text-slate-400">Custom Standard Input (stdin):</label>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter custom standard input lines here..."
                    className="w-full h-20 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs resize-none focus:outline-none"
                  />
                </div>
              ) : currentTestCase ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Input block */}
                  <div>
                    <div className="text-[11px] text-slate-400 font-sans mb-1">Standard Input (STDIN):</div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 whitespace-pre max-h-24 overflow-y-auto">
                      {currentTestCase.input || '(empty)'}
                    </div>
                  </div>

                  {/* Expected Output block */}
                  <div>
                    <div className="text-[11px] text-slate-400 font-sans mb-1">Expected Output:</div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 whitespace-pre max-h-24 overflow-y-auto font-bold">
                      {currentTestCase.expectedOutput}
                    </div>
                  </div>

                  {/* Actual Output block (if executed) */}
                  {currentResult && (
                    <div className="md:col-span-2 pt-1 border-t border-slate-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-slate-400 font-sans">
                          Actual Execution Output:
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-sans font-bold ${
                          currentResult.passed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                        }`}>
                          {currentResult.passed ? 'Test Passed' : 'Test Failed'}
                        </span>
                      </div>
                      <div className={`p-2.5 bg-slate-900 border rounded-lg whitespace-pre max-h-24 overflow-y-auto ${
                        currentResult.passed ? 'border-emerald-800/60 text-slate-200' : 'border-red-800/60 text-red-300'
                      }`}>
                        {currentResult.actualOutput || currentResult.error || '(no output generated)'}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 italic text-center py-6 font-sans">
                  Click "Run Tests" to test sample test cases or "Submit Solution" to evaluate against all test cases.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Proctoring Security Violation Alert Modal */}
      {showProctorAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl animate-shake">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Proctoring Security Warning</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {proctorAlertReason}
            </p>
            <div className="bg-red-950/50 border border-red-800/60 rounded-xl p-3 mb-6 text-xs text-red-300 font-medium text-left">
              <p>⚠️ <strong>Important Notice:</strong> Navigating away from the coding challenge window or switching tabs is logged in your learning progress record.</p>
            </div>
            <button
              onClick={() => setShowProctorAlert(false)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-red-600/20"
            >
              I Understand & Resume Challenge
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Guard Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
              <i className="fa-solid fa-door-open"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Exit Coding Challenge?</h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to leave the coding challenge window? Your exit attempt and any tab infractions will be tracked in your student progress profile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
              >
                Stay in Challenge
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-red-600/20"
              >
                Yes, Exit Challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Judge0 Settings Modal */}
      <Judge0SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};

export default ProblemWorkspace;

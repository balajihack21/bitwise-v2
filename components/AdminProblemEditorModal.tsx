import React, { useState } from 'react';
import { Lesson, ProblemMetadata, TestCase, TestCaseResult } from '../types';
import { runTestCases, executeViaJudge0 } from '../services/judge0Service';

interface AdminProblemEditorModalProps {
  isOpen: boolean;
  lesson: Lesson | null;
  moduleIndex: number;
  lessonIndex: number;
  courseTitle: string;
  moduleTitle: string;
  onSave: (updatedLesson: Lesson, moduleIndex: number, lessonIndex: number) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export const AdminProblemEditorModal: React.FC<AdminProblemEditorModalProps> = ({
  isOpen,
  lesson,
  moduleIndex,
  lessonIndex,
  courseTitle,
  moduleTitle,
  onSave,
  onClose,
  readOnly = false
}) => {
  if (!isOpen || !lesson) return null;

  // Local working copy of lesson and problem metadata
  const [currentLesson, setCurrentLesson] = useState<Lesson>(() => {
    const cloned = JSON.parse(JSON.stringify(lesson));
    if (!cloned.problem) {
      cloned.problem = {
        difficulty: 'Easy',
        points: 50,
        acceptanceRate: '85.0%',
        testCases: [
          {
            id: `tc-${Date.now()}-1`,
            input: '1 2 3',
            expectedOutput: '6',
            explanation: 'Sample Case'
          }
        ],
        starterTemplates: {
          javascript: `const fs = require('fs');\nfunction solve() {\n  const input = fs.readFileSync(0, 'utf-8').trim();\n  // TODO: Implement solution\n}\nsolve();`,
          python: `import sys\ndef solve():\n    raw_input = sys.stdin.read().strip()\n    # TODO: Implement solution\n    pass\nif __name__ == '__main__':\n    solve()`,
          java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // TODO: Implement solution\n    }\n}`,
          cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    // TODO: Implement solution\n    return 0;\n}`
        }
      };
    }
    return cloned;
  });

  const [activeTab, setActiveTab] = useState<'testcases' | 'details' | 'templates'>('testcases');
  
  // Test execution state for admin verification
  const [testLanguage, setTestLanguage] = useState<'javascript' | 'python' | 'java' | 'cpp'>('javascript');
  const [testSourceCode, setTestSourceCode] = useState<string>(() => {
    return currentLesson.problem?.starterTemplates?.[testLanguage] || '';
  });
  const [isRunningAllTests, setIsRunningAllTests] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [singleRunningId, setSingleRunningId] = useState<string | null>(null);
  const [singleCaseResult, setSingleCaseResult] = useState<{ id: string; result: any } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const problem = currentLesson.problem as ProblemMetadata;
  const testCases = problem?.testCases || [];

  const handleUpdateProblem = (partial: Partial<ProblemMetadata>) => {
    setCurrentLesson(prev => ({
      ...prev,
      problem: {
        ...(prev.problem as ProblemMetadata),
        ...partial
      }
    }));
  };

  const handleAddTestCase = (isHidden: boolean = false) => {
    const newId = `tc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newTestCase: TestCase = {
      id: newId,
      input: isHidden ? '10 20\n30' : '2 7 11 15\n9',
      expectedOutput: isHidden ? '60' : '0 1',
      isHidden,
      explanation: isHidden ? 'Hidden edge case' : `Sample test case ${testCases.filter(t => !t.isHidden).length + 1}`
    };

    const updatedCases = [...testCases, newTestCase];
    handleUpdateProblem({ testCases: updatedCases });
    showNotice(isHidden ? 'Added new Hidden Test Case' : 'Added new Sample Test Case');
  };

  const handleUpdateTestCase = (index: number, partial: Partial<TestCase>) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], ...partial };
    handleUpdateProblem({ testCases: updated });
  };

  const handleDeleteTestCase = (index: number) => {
    if (testCases.length <= 1) {
      alert('A coding challenge must have at least one test case.');
      return;
    }
    const updated = testCases.filter((_, i) => i !== index);
    handleUpdateProblem({ testCases: updated });
    showNotice('Test case removed.');
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Run single test case
  const handleRunSingleTestCase = async (tc: TestCase) => {
    setSingleRunningId(tc.id);
    setSingleCaseResult(null);
    try {
      const codeToRun = testSourceCode || currentLesson.problem?.starterTemplates?.[testLanguage] || '';
      const execResult = await executeViaJudge0(codeToRun, testLanguage, tc.input, tc.expectedOutput);
      
      const actual = (execResult.stdout || execResult.stderr || execResult.compile_output || '').trim();
      const expected = (tc.expectedOutput || '').trim();
      const passed = execResult.status?.id === 3 || actual === expected;

      setSingleCaseResult({
        id: tc.id,
        result: {
          passed,
          actualOutput: actual,
          expectedOutput: expected,
          executionTime: execResult.time || '0.04s',
          status: execResult.status?.description || (passed ? 'Accepted' : 'Wrong Answer'),
          error: execResult.stderr || execResult.compile_output
        }
      });
    } catch (err: any) {
      setSingleCaseResult({
        id: tc.id,
        result: {
          passed: false,
          actualOutput: '',
          expectedOutput: tc.expectedOutput,
          executionTime: '0.00s',
          status: 'Execution Error',
          error: err.message || 'Failed to run test case'
        }
      });
    } finally {
      setSingleRunningId(null);
    }
  };

  // Run all test cases in Sandbox
  const handleRunAllTestCases = async () => {
    if (testCases.length === 0) return;
    setIsRunningAllTests(true);
    setTestResults(null);
    try {
      const codeToRun = testSourceCode || currentLesson.problem?.starterTemplates?.[testLanguage] || '';
      const execution = await runTestCases(codeToRun, testLanguage, testCases);
      setTestResults(execution.results);
      showNotice(`Executed ${execution.results.length} test cases: ${execution.allPassed ? 'ALL PASSED 🎉' : 'Some cases failed'}`);
    } catch (err: any) {
      showNotice(`Execution error: ${err.message}`);
    } finally {
      setIsRunningAllTests(false);
    }
  };

  const handleSaveModal = () => {
    onSave(currentLesson, moduleIndex, lessonIndex);
    onClose();
  };

  const sampleCount = testCases.filter(t => !t.isHidden).length;
  const hiddenCount = testCases.filter(t => t.isHidden).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg border border-amber-500/30">
              <i className="fa-solid fa-code"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Problem & Test Case Studio</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-bitwise-500 text-white uppercase tracking-wider">
                  Judge0 Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {courseTitle} <i className="fa-solid fa-chevron-right text-[10px] mx-1 text-slate-600"></i> {moduleTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly ? (
              <button
                onClick={handleSaveModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-check"></i> Save & Apply Changes
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold rounded-lg flex items-center gap-1.5">
                <i className="fa-solid fa-lock"></i> Instructor Read-Only Specs
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>
          </div>
        </div>

        {readOnly && (
          <div className="bg-blue-50 border-b border-blue-200 px-5 py-2.5 text-xs text-blue-900 font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-blue-600"></i>
            <span><strong>Instructor Inspection Mode:</strong> You are reviewing the test case suite and problem specifications for this lesson. Modifying test cases requires Administrator privileges.</span>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 font-semibold flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-emerald-600"></i>
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-emerald-500 hover:text-emerald-800">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-5 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('testcases')}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-lg transition-all flex items-center gap-2 border-t border-x ${
              activeTab === 'testcases'
                ? 'bg-white text-bitwise-600 border-slate-200 shadow-sm'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-flask"></i>
            <span>Test Cases Suite ({testCases.length})</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
              {sampleCount} sample / {hiddenCount} hidden
            </span>
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-lg transition-all flex items-center gap-2 border-t border-x ${
              activeTab === 'details'
                ? 'bg-white text-bitwise-600 border-slate-200 shadow-sm'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-file-lines"></i>
            <span>Problem Description & Metadata</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-lg transition-all flex items-center gap-2 border-t border-x ${
              activeTab === 'templates'
                ? 'bg-white text-bitwise-600 border-slate-200 shadow-sm'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-code"></i>
            <span>Starter Boilerplates & Templates</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/30">
          
          {/* TAB 1: TEST CASES & SANDBOX RUNNER */}
          {activeTab === 'testcases' && (
            <div className="space-y-6">
              
              {/* Header Action Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Configured Test Cases ({testCases.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sample cases are shown to students in the test runner. Hidden cases are evaluated upon submission.
                  </p>
                </div>

                {!readOnly && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleAddTestCase(false)}
                      className="px-3 py-1.5 bg-bitwise-600 hover:bg-bitwise-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-plus"></i> Add Sample Test Case
                    </button>
                    <button
                      onClick={() => handleAddTestCase(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-user-secret"></i> Add Hidden Test Case
                    </button>
                  </div>
                )}
              </div>

              {/* Sandbox Test Verification Suite */}
              <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Admin Sandbox Execution Tester
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
                      {(['javascript', 'python', 'java', 'cpp'] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => {
                            setTestLanguage(lang);
                            setTestSourceCode(problem?.starterTemplates?.[lang] || '');
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                            testLanguage === lang
                              ? 'bg-bitwise-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang === 'javascript' ? 'JS' : lang === 'cpp' ? 'C++' : lang.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleRunAllTestCases}
                      disabled={isRunningAllTests || testCases.length === 0}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {isRunningAllTests ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i> Testing All Cases...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-play"></i> Run All {testCases.length} Cases
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Code Snippet to Test Against Cases ({testLanguage}):
                    </label>
                    <textarea
                      value={testSourceCode}
                      onChange={e => setTestSourceCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs p-3 rounded-xl h-36 outline-none focus:border-bitwise-500 resize-y"
                      placeholder="// Enter complete solution or test script to verify test cases..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Sandbox Execution Results:
                    </label>
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 h-36 overflow-y-auto space-y-2">
                      {testResults ? (
                        testResults.map((tr, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between ${
                              tr.passed
                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                                : 'bg-red-950/40 border-red-800/60 text-red-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${tr.passed ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                              <span>Case #{idx + 1} {tr.isHidden ? '(Hidden)' : '(Sample)'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-400">{tr.time || '0.04s'}</span>
                              <span className="font-bold">{tr.passed ? 'PASSED' : 'FAILED'}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                          Click "Run All Cases" or test individual test cases below to see live sandbox evaluation.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Cases List */}
              <div className="space-y-4">
                {testCases.map((tc, idx) => {
                  const isSingleRunning = singleRunningId === tc.id;
                  const caseResult = singleCaseResult?.id === tc.id ? singleCaseResult.result : null;

                  return (
                    <div
                      key={tc.id || idx}
                      className={`bg-white rounded-2xl border transition-all p-5 shadow-sm space-y-4 ${
                        tc.isHidden ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            tc.isHidden
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {tc.isHidden ? '🔒 Hidden (Submission Only)' : '👁️ Sample (Public)'}
                          </span>
                          <span className="text-xs font-mono text-slate-400">ID: {tc.id}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRunSingleTestCase(tc)}
                            disabled={isSingleRunning}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {isSingleRunning ? (
                              <>
                                <i className="fa-solid fa-spinner fa-spin text-bitwise-600"></i> Testing...
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-play text-emerald-600"></i> Test Run
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteTestCase(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Test Case"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      </div>

                      {/* Single Case Evaluation Result Banner */}
                      {caseResult && (
                        <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          caseResult.passed
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}>
                          <div className="flex items-center gap-2 font-bold">
                            <i className={`fa-solid ${caseResult.passed ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-red-600'}`}></i>
                            <span>Status: {caseResult.status}</span>
                            <span className="text-[11px] font-normal text-slate-500">({caseResult.executionTime})</span>
                          </div>
                          <div className="font-mono text-[11px]">
                            Expected: <code className="bg-white/80 px-1 py-0.5 rounded border border-slate-200">{caseResult.expectedOutput}</code> | Actual: <code className="bg-white/80 px-1 py-0.5 rounded border border-slate-200">{caseResult.actualOutput || 'empty'}</code>
                          </div>
                        </div>
                      )}

                      {/* Input & Output Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                            <span>Standard Input (STDIN)</span>
                            <span className="text-[10px] text-slate-400 font-normal">Passed to program via input</span>
                          </label>
                          <textarea
                            value={tc.input || ''}
                            onChange={e => handleUpdateTestCase(idx, { input: e.target.value })}
                            className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 outline-none focus:border-bitwise-500 focus:bg-white"
                            placeholder="e.g. 2 7 11 15\n9"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                            <span>Expected Output (STDOUT)</span>
                            <span className="text-[10px] text-slate-400 font-normal">Expected exact output match</span>
                          </label>
                          <textarea
                            value={tc.expectedOutput || ''}
                            onChange={e => handleUpdateTestCase(idx, { expectedOutput: e.target.value })}
                            className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 outline-none focus:border-bitwise-500 focus:bg-white"
                            placeholder="e.g. 0 1"
                          />
                        </div>
                      </div>

                      {/* Explanation & Flags */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={tc.explanation || ''}
                            onChange={e => handleUpdateTestCase(idx, { explanation: e.target.value })}
                            placeholder="Explanation (e.g., Sample 1: nums[0] + nums[1] = 9)"
                            className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-bitwise-500"
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 shrink-0">
                          <input
                            type="checkbox"
                            checked={!!tc.isHidden}
                            onChange={e => handleUpdateTestCase(idx, { isHidden: e.target.checked })}
                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                          />
                          <span>Hide from student during practice (Evaluate on Submit)</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PROBLEM DETAILS & METADATA */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  General Challenge Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Challenge Title</label>
                    <input
                      type="text"
                      value={currentLesson.title}
                      onChange={e => setCurrentLesson({ ...currentLesson, title: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-bitwise-500"
                      placeholder="Challenge Name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Estimated Duration</label>
                    <input
                      type="text"
                      value={currentLesson.duration}
                      onChange={e => setCurrentLesson({ ...currentLesson, duration: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-bitwise-500"
                      placeholder="25 min"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Difficulty Level</label>
                    <select
                      value={problem.difficulty || 'Easy'}
                      onChange={e => handleUpdateProblem({ difficulty: e.target.value as any })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-bitwise-500 bg-white"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">XP Points Awarded</label>
                    <input
                      type="number"
                      value={problem.points || 50}
                      onChange={e => handleUpdateProblem({ points: parseInt(e.target.value, 10) || 50 })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-bitwise-500"
                      placeholder="50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Acceptance Rate</label>
                    <input
                      type="text"
                      value={problem.acceptanceRate || '85.0%'}
                      onChange={e => handleUpdateProblem({ acceptanceRate: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-bitwise-500"
                      placeholder="85.0%"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Problem HTML Story / Description
                  </label>
                  <textarea
                    value={currentLesson.content || ''}
                    onChange={e => setCurrentLesson({ ...currentLesson, content: e.target.value })}
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl h-36 outline-none focus:border-bitwise-500"
                    placeholder="<p>Problem description, background, and input/output specifications...</p>"
                  />
                </div>
              </div>

              {/* Constraints & Hints */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-900">Constraints ({problem.constraints?.length || 0})</h4>
                    <button
                      onClick={() => {
                        const updated = [...(problem.constraints || []), '1 <= n <= 10^5'];
                        handleUpdateProblem({ constraints: updated });
                      }}
                      className="text-[11px] text-bitwise-600 font-bold hover:underline"
                    >
                      + Add Constraint
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(problem.constraints || []).map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={c}
                          onChange={e => {
                            const updated = [...(problem.constraints || [])];
                            updated[i] = e.target.value;
                            handleUpdateProblem({ constraints: updated });
                          }}
                          className="flex-1 text-xs p-1.5 border border-slate-200 rounded font-mono"
                        />
                        <button
                          onClick={() => {
                            const updated = (problem.constraints || []).filter((_, idx) => idx !== i);
                            handleUpdateProblem({ constraints: updated });
                          }}
                          className="text-slate-400 hover:text-red-500 text-xs"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-900">Hints ({problem.hints?.length || 0})</h4>
                    <button
                      onClick={() => {
                        const updated = [...(problem.hints || []), 'Try using a Hash Map for O(n) lookup time.'];
                        handleUpdateProblem({ hints: updated });
                      }}
                      className="text-[11px] text-amber-600 font-bold hover:underline"
                    >
                      + Add Hint
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(problem.hints || []).map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={h}
                          onChange={e => {
                            const updated = [...(problem.hints || [])];
                            updated[i] = e.target.value;
                            handleUpdateProblem({ hints: updated });
                          }}
                          className="flex-1 text-xs p-1.5 border border-slate-200 rounded"
                        />
                        <button
                          onClick={() => {
                            const updated = (problem.hints || []).filter((_, idx) => idx !== i);
                            handleUpdateProblem({ hints: updated });
                          }}
                          className="text-slate-400 hover:text-red-500 text-xs"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STARTER BOILERPLATES */}
          {activeTab === 'templates' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Starter Code Boilerplates
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the skeleton code provided to students when they open this coding challenge in each language.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['javascript', 'python', 'java', 'cpp'] as const).map(lang => (
                  <div key={lang} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                      <span>{lang === 'javascript' ? 'JavaScript (Node.js)' : lang === 'cpp' ? 'C++ (GCC)' : lang.toUpperCase()}</span>
                      <span className="text-[10px] text-slate-400 font-mono">skeleton</span>
                    </label>
                    <textarea
                      value={problem.starterTemplates?.[lang] || ''}
                      onChange={e => {
                        const updated = {
                          ...(problem.starterTemplates || {}),
                          [lang]: e.target.value
                        };
                        handleUpdateProblem({ starterTemplates: updated });
                      }}
                      className="w-full text-xs font-mono p-3 bg-slate-900 text-emerald-300 rounded-xl h-44 outline-none focus:border-bitwise-500 resize-y"
                      placeholder={`// Boilerplate for ${lang}...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {testCases.length} Test cases configured ({sampleCount} sample / {hiddenCount} hidden)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveModal}
              className="px-5 py-2 bg-bitwise-600 hover:bg-bitwise-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-floppy-disk"></i> Apply & Save Challenge
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

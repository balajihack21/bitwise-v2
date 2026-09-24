import React, { useEffect, useRef, useState } from 'react';
import { Course, Lesson, User, UserProgress } from '../types';
import { recordProctoringInfraction, submitCreativeChallenge } from '../services/progressService';

interface CreativeChallengeWorkspaceProps {
  lesson: Lesson;
  course: Course;
  user: User | null;
  progress: UserProgress;
  onProgressUpdate: (updatedProgress: UserProgress) => void;
  onClose?: () => void;
}

type FlowNode = { id: string; type: string; text: string };

const flowNodeTypes = ['Start / End', 'Process', 'Input / Output', 'Decision'];

const CreativeChallengeWorkspace: React.FC<CreativeChallengeWorkspaceProps> = ({
  lesson,
  course,
  user,
  progress,
  onProgressUpdate,
  onClose
}) => {
  const isFlowchart = lesson.type === 'flowchart';
  const isAlgorithm = lesson.type === 'algorithm';
  const storageKey = `bitwise-creative-challenge:${user?.uid || user?.username || 'guest'}:${course.id}:${lesson.id}`;
  const [pseudoCode, setPseudoCode] = useState('');
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([
    { id: 'node-1', type: 'Start / End', text: 'Start' },
    { id: 'node-2', type: 'Input / Output', text: '' },
    { id: 'node-3', type: 'Decision', text: '' },
    { id: 'node-4', type: 'Start / End', text: 'End' }
  ]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(progress.completedLessonIds.includes(lesson.id));
  const [sessionTabSwitches, setSessionTabSwitches] = useState(0);
  const [proctorNotice, setProctorNotice] = useState<string | null>(null);
  const [isSplitScreenMode, setIsSplitScreenMode] = useState(false);
  const lastProctorEventAt = useRef(0);

  const recordSecurityViolation = (message: string) => {
    const now = Date.now();
    if (now - lastProctorEventAt.current < 750) return;
    lastProctorEventAt.current = now;

    setSessionTabSwitches(count => count + 1);
    setProctorNotice(message);
    const updatedProgress = recordProctoringInfraction(user || 'guest', 'tab_switch');
    onProgressUpdate(updatedProgress);
  };

  useEffect(() => {
    const updateSplitScreenState = () => {
      const isLikelySplit = window.screen.availWidth > 0 &&
        window.innerWidth < window.screen.availWidth * 0.8;
      setIsSplitScreenMode(isLikelySplit);
    };

    updateSplitScreenState();
    window.addEventListener('resize', updateSplitScreenState);
    return () => window.removeEventListener('resize', updateSplitScreenState);
  }, []);

  useEffect(() => {
    const recordInfraction = (message: string) => {
      recordSecurityViolation(message);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordInfraction('Tab switch or window minimization detected.');
      }
    };

    const handleWindowBlur = () => {
      recordInfraction('Window focus lost or another application was opened.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [user, onProgressUpdate]);

  useEffect(() => {
    const blockClipboardAndShortcuts = (event: Event, message: string) => {
      event.preventDefault();
      recordSecurityViolation(message);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditorTarget = target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT';
      if (!isEditorTarget) return;

      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const blocked = (modifier && ['c', 'v', 'x', 's', 'p'].includes(key)) ||
        event.key === 'PrintScreen' ||
        event.code === 'PrintScreen' ||
        (modifier && event.shiftKey && key === 's');

      if (blocked) {
        blockClipboardAndShortcuts(event, 'Clipboard or screenshot action blocked.');
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT') {
        blockClipboardAndShortcuts(event, 'Context menu blocked.');
      }
    };

    const handleCopy = (event: ClipboardEvent) => blockClipboardAndShortcuts(event, 'Copy attempt blocked.');
    const handleCut = (event: ClipboardEvent) => blockClipboardAndShortcuts(event, 'Cut attempt blocked.');
    const handlePaste = (event: ClipboardEvent) => blockClipboardAndShortcuts(event, 'Paste attempt blocked.');

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [user, onProgressUpdate]);

  useEffect(() => {
    if (!proctorNotice) return;
    const timeoutId = window.setTimeout(() => setProctorNotice(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [proctorNotice]);

  useEffect(() => {
    const defaultFlowNodes: FlowNode[] = [
      { id: 'node-1', type: 'Start / End', text: 'Start' },
      { id: 'node-2', type: 'Input / Output', text: '' },
      { id: 'node-3', type: 'Decision', text: '' },
      { id: 'node-4', type: 'Start / End', text: 'End' }
    ];

    // Reset all lesson-specific state before loading this lesson's draft.
    setPseudoCode('');
    setFlowNodes(defaultFlowNodes);
    setSavedAt(null);
    setSubmitted(
      progress.completedLessonIds.includes(lesson.id) ||
      progress.creativeSubmissions?.some(submission => submission.lessonId === lesson.id) === true
    );

    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setPseudoCode(parsed.pseudoCode || '');
      setFlowNodes(Array.isArray(parsed.flowNodes) ? parsed.flowNodes : defaultFlowNodes);
      setSavedAt(parsed.savedAt || null);
    } catch {
      // Ignore malformed local drafts and start with an empty challenge.
    }
  }, [storageKey, lesson.id, progress.completedLessonIds, progress.creativeSubmissions]);

  useEffect(() => {
    const draft = JSON.stringify({ pseudoCode, flowNodes, savedAt: new Date().toISOString() });
    localStorage.setItem(storageKey, draft);
    setSavedAt(new Date().toISOString());
  }, [pseudoCode, flowNodes, storageKey]);

  const updateNode = (id: string, changes: Partial<FlowNode>) => {
    setFlowNodes(nodes => nodes.map(node => node.id === id ? { ...node, ...changes } : node));
  };

  const handleSubmit = () => {
    const hasAnswer = isFlowchart
      ? flowNodes.some(node => node.text.trim())
      : pseudoCode.trim().length > 0;
    if (!hasAnswer) return;
    if (!window.confirm('Submit this challenge for review? You can no longer edit this draft after submitting.')) return;

    const { updatedProgress } = submitCreativeChallenge(user || 'guest', lesson, course, {
      answerText: isFlowchart ? undefined : pseudoCode,
      flowNodes: isFlowchart ? flowNodes : undefined
    });
    onProgressUpdate(updatedProgress);
    setSubmitted(true);
    localStorage.removeItem(storageKey);
  };

  const flowNodeStyle = (type: string) => {
    switch (type) {
      case 'Start / End':
        return {
          container: 'rounded-full border-2 border-emerald-400 bg-emerald-50 text-emerald-900',
          icon: 'fa-circle-play'
        };
      case 'Decision':
        return {
          container: '[clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)] border-2 border-amber-400 bg-amber-50 text-amber-900',
          icon: 'fa-code-branch'
        };
      case 'Input / Output':
        return {
          container: 'skew-x-[-10deg] border-2 border-blue-400 bg-blue-50 text-blue-900',
          icon: 'fa-right-left'
        };
      default:
        return {
          container: 'rounded-lg border-2 border-violet-400 bg-violet-50 text-violet-900',
          icon: 'fa-gears'
        };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-bold uppercase tracking-wider">
                  {isFlowchart ? 'Flowchart Challenge' : isAlgorithm ? 'Algorithm Writing Challenge' : 'Pseudo-code Challenge'}
                </span>
                {submitted && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">Submitted</span>}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">{lesson.title}</h1>
              <p className="text-xs text-slate-500 mt-1">{lesson.duration} · {lesson.challenge?.points || 10} points</p>
            </div>
            {onClose && <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" title="Close challenge"><i className="fa-solid fa-xmark"></i></button>}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <span className="flex items-center gap-1.5 font-semibold">
              <i className="fa-solid fa-shield-halved text-amber-600"></i>
              Proctoring active: tab switches and focus loss are monitored.
            </span>
            <span className="font-mono font-bold">Session switches: {sessionTabSwitches}</span>
          </div>
          {proctorNotice && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-rose-600"></i>
              {proctorNotice} This event has been recorded.
            </div>
          )}
          {isSplitScreenMode && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 flex items-center gap-2">
              <i className="fa-solid fa-display text-red-600"></i>
              Split-screen mode detected. Editing is disabled until the workspace returns to full width.
            </div>
          )}
          <div className="mt-5 prose prose-slate max-w-none text-sm" dangerouslySetInnerHTML={{ __html: lesson.content || lesson.challenge?.prompt || '' }} />
          {lesson.challenge?.prompt && <div className="mt-4 p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950">{lesson.challenge.prompt}</div>}
        </div>

        {isFlowchart ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900">Build your flowchart</h2>
                <p className="text-xs text-slate-500">Add nodes in execution order. Each arrow represents the next step.</p>
              </div>
              <button type="button" onClick={() => setFlowNodes(nodes => [...nodes, { id: `node-${Date.now()}`, type: 'Process', text: '' }])} disabled={submitted || isSplitScreenMode} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50"><i className="fa-solid fa-plus mr-1"></i>Add node</button>
            </div>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Flowchart preview</h3>
                  <p className="text-[11px] text-slate-500">Your steps are visualized in execution order.</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">{flowNodes.length} nodes</span>
              </div>
              <div className="flex flex-col items-center overflow-x-auto pb-2">
                {flowNodes.map((node, index) => {
                  const style = flowNodeStyle(node.type);
                  return (
                    <React.Fragment key={`preview-${node.id}`}>
                      <div className={`w-full max-w-sm min-h-[64px] px-6 py-3 flex items-center justify-center gap-2 text-center shadow-sm ${style.container}`}>
                        <i className={`fa-solid ${style.icon} shrink-0`}></i>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{node.type}</div>
                          <div className="text-sm font-semibold break-words">{node.text.trim() || 'Describe this step'}</div>
                        </div>
                      </div>
                      {index < flowNodes.length - 1 && (
                        <div className="h-9 flex flex-col items-center justify-center text-slate-400">
                          <div className="h-5 border-l-2 border-dashed border-slate-300"></div>
                          <i className="fa-solid fa-chevron-down text-xs"></i>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              {flowNodes.map((node, index) => (
                <React.Fragment key={node.id}>
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                    <select value={node.type} disabled={submitted || isSplitScreenMode} onChange={event => updateNode(node.id, { type: event.target.value })} className="w-32 border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white">
                      {flowNodeTypes.map(type => <option key={type}>{type}</option>)}
                    </select>
                    <input value={node.text} disabled={submitted || isSplitScreenMode} onChange={event => updateNode(node.id, { text: event.target.value })} placeholder="Describe this step" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white" />
                    <button type="button" disabled={submitted || isSplitScreenMode || flowNodes.length <= 2} onClick={() => setFlowNodes(nodes => nodes.filter(item => item.id !== node.id))} className="text-slate-400 hover:text-red-600 disabled:opacity-30" title="Remove node"><i className="fa-solid fa-trash"></i></button>
                  </div>
                  {index < flowNodes.length - 1 && <div className="text-center text-slate-400"><i className="fa-solid fa-arrow-down"></i></div>}
                </React.Fragment>
              ))}
            </div>
            {lesson.challenge?.requiredNodes && <p className="mt-4 text-[11px] text-slate-500"><strong>Required elements:</strong> {lesson.challenge.requiredNodes.join(', ')}</p>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div><h2 className="font-bold text-slate-900">{isAlgorithm ? 'Write your algorithm' : 'Write your pseudo-code'}</h2><p className="text-xs text-slate-500">{isAlgorithm ? 'Write numbered, unambiguous steps from input to output.' : 'Use clear steps, conditions, loops, and meaningful names.'}</p></div>
              {savedAt && !submitted && <span className="text-[10px] text-emerald-600"><i className="fa-solid fa-cloud-arrow-up mr-1"></i>Draft saved</span>}
            </div>
            <textarea value={pseudoCode} disabled={submitted || isSplitScreenMode} onChange={event => setPseudoCode(event.target.value)} placeholder={isAlgorithm ? '1. START\n2. READ input\n3. PROCESS the input\n4. DISPLAY output\n5. END' : 'BEGIN\n  READ input\n  IF ... THEN\n    DISPLAY ...\n  END IF\nEND'} className="w-full min-h-[300px] p-4 rounded-xl border border-slate-300 bg-slate-950 text-emerald-300 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60" />
            {lesson.challenge?.expectedElements && <p className="mt-3 text-[11px] text-slate-500"><strong>Expected elements:</strong> {lesson.challenge.expectedElements.join(', ')}</p>}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{submitted ? 'This challenge has been submitted for review.' : 'Your draft is saved automatically on this browser.'}</span>
          <button type="button" onClick={handleSubmit} disabled={submitted || isSplitScreenMode} className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold disabled:opacity-50"><i className="fa-solid fa-paper-plane mr-1.5"></i>{submitted ? 'Submitted' : 'Submit Challenge'}</button>
        </div>
      </div>
    </div>
  );
};

export default CreativeChallengeWorkspace;

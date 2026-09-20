import React, { useEffect, useState } from 'react';
import { Course, Lesson, User, UserProgress } from '../types';
import { submitCreativeChallenge } from '../services/progressService';

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setPseudoCode(parsed.pseudoCode || '');
      setFlowNodes(Array.isArray(parsed.flowNodes) ? parsed.flowNodes : flowNodes);
      setSavedAt(parsed.savedAt || null);
    } catch {
      // Ignore malformed local drafts and start with an empty challenge.
    }
  }, [storageKey]);

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
              <button type="button" onClick={() => setFlowNodes(nodes => [...nodes, { id: `node-${Date.now()}`, type: 'Process', text: '' }])} disabled={submitted} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50"><i className="fa-solid fa-plus mr-1"></i>Add node</button>
            </div>
            <div className="space-y-2">
              {flowNodes.map((node, index) => (
                <React.Fragment key={node.id}>
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                    <select value={node.type} disabled={submitted} onChange={event => updateNode(node.id, { type: event.target.value })} className="w-32 border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white">
                      {flowNodeTypes.map(type => <option key={type}>{type}</option>)}
                    </select>
                    <input value={node.text} disabled={submitted} onChange={event => updateNode(node.id, { text: event.target.value })} placeholder="Describe this step" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white" />
                    <button type="button" disabled={submitted || flowNodes.length <= 2} onClick={() => setFlowNodes(nodes => nodes.filter(item => item.id !== node.id))} className="text-slate-400 hover:text-red-600 disabled:opacity-30" title="Remove node"><i className="fa-solid fa-trash"></i></button>
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
            <textarea value={pseudoCode} disabled={submitted} onChange={event => setPseudoCode(event.target.value)} placeholder={isAlgorithm ? '1. START\n2. READ input\n3. PROCESS the input\n4. DISPLAY output\n5. END' : 'BEGIN\n  READ input\n  IF ... THEN\n    DISPLAY ...\n  END IF\nEND'} className="w-full min-h-[300px] p-4 rounded-xl border border-slate-300 bg-slate-950 text-emerald-300 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60" />
            {lesson.challenge?.expectedElements && <p className="mt-3 text-[11px] text-slate-500"><strong>Expected elements:</strong> {lesson.challenge.expectedElements.join(', ')}</p>}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{submitted ? 'This challenge has been submitted for review.' : 'Your draft is saved automatically on this browser.'}</span>
          <button type="button" onClick={handleSubmit} disabled={submitted} className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold disabled:opacity-50"><i className="fa-solid fa-paper-plane mr-1.5"></i>{submitted ? 'Submitted' : 'Submit Challenge'}</button>
        </div>
      </div>
    </div>
  );
};

export default CreativeChallengeWorkspace;

import React, { useState, useEffect } from 'react';
import { executeViaJudge0, JUDGE0_LANGUAGES } from '../services/judge0Service';

interface CodeEditorProps {
  initialCode?: string;
  initialLanguage?: string;
  embedded?: boolean;
}

const SAMPLE_PROGRAMS: Record<string, { label: string; language: string; stdin: string; code: string }> = {
  'java-twosum': {
    label: '☕ Java: Two Sum (Optimal HashMap)',
    language: 'java',
    stdin: '2 7 11 15\n9',
    code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list = new ArrayList<>();
        
        // Read array elements and target
        while (sc.hasNextInt()) {
            list.add(sc.nextInt());
        }
        
        if (list.size() < 2) {
            System.out.println("0 1");
            return;
        }
        
        int target = list.remove(list.size() - 1);
        int n = list.size();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = list.get(i);
        }
        
        // Two Sum O(N) solution with HashMap
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < n; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                System.out.println(map.get(complement) + " " + i);
                return;
            }
            map.put(nums[i], i);
        }
    }
}`
  },
  'java-standalone': {
    label: '☕ Java: Standalone Two Sum',
    language: 'java',
    stdin: '',
    code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        
        System.out.println("Finding indices for target = " + target + " in array " + Arrays.toString(nums));
        
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (map.containsKey(comp)) {
                int idx1 = map.get(comp);
                int idx2 = i;
                System.out.println("Output indices: " + idx1 + " " + idx2);
                System.out.println("Values: " + nums[idx1] + " + " + nums[idx2] + " = " + target);
                return;
            }
            map.put(nums[i], i);
        }
    }
}`
  },
  'py-twosum': {
    label: '🐍 Python: Two Sum',
    language: 'python',
    stdin: '2 7 11 15\n9',
    code: `import sys

def two_sum():
    lines = sys.stdin.read().strip().split('\\n')
    if len(lines) >= 2:
        nums = list(map(int, lines[0].split()))
        target = int(lines[1])
    else:
        tokens = list(map(int, lines[0].split()))
        nums = tokens[:-1]
        target = tokens[-1]
        
    seen = {}
    for i, num in enumerate(nums):
        comp = target - num
        if comp in seen:
            print(f"{seen[comp]} {i}")
            return
        seen[num] = i

two_sum()`
  },
  'cpp-twosum': {
    label: '⚡ C++: Two Sum',
    language: 'cpp',
    stdin: '2 7 11 15\n9',
    code: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    vector<int> nums;
    int val;
    while (cin >> val) {
        nums.push_back(val);
    }
    if (nums.size() < 2) return 0;
    
    int target = nums.back();
    nums.pop_back();
    
    unordered_map<int, int> map;
    for (int i = 0; i < nums.size(); i++) {
        int comp = target - nums[i];
        if (map.find(comp) != map.end()) {
            cout << map[comp] << " " << i << endl;
            return 0;
        }
        map[nums[i]] = i;
    }
    return 0;
}`
  },
  'js-twosum': {
    label: '🟨 JavaScript: Two Sum',
    language: 'javascript',
    stdin: '2 7 11 15\n9',
    code: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
const nums = input[0].split(/\\s+/).map(Number);
const target = Number(input[1]);

const map = new Map();
for (let i = 0; i < nums.length; i++) {
  const comp = target - nums[i];
  if (map.has(comp)) {
    console.log(map.get(comp) + ' ' + i);
    break;
  }
  map.set(nums[i], i);
}`
  }
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = '',
  initialLanguage = 'java',
  embedded = false
}) => {
  const [code, setCode] = useState(initialCode || SAMPLE_PROGRAMS['java-twosum'].code);
  const [language, setLanguage] = useState(initialLanguage || 'java');
  const [stdin, setStdin] = useState(SAMPLE_PROGRAMS['java-twosum'].stdin);
  const [showStdin, setShowStdin] = useState(true);
  const [output, setOutput] = useState('');
  const [stats, setStats] = useState<{ time?: string; memory?: string; status?: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (initialCode) setCode(initialCode);
    if (initialLanguage) setLanguage(initialLanguage);
  }, [initialCode, initialLanguage]);

  const handleSelectSample = (sampleKey: string) => {
    if (!sampleKey || !SAMPLE_PROGRAMS[sampleKey]) return;
    const sample = SAMPLE_PROGRAMS[sampleKey];
    setCode(sample.code);
    setLanguage(sample.language);
    setStdin(sample.stdin);
    setShowStdin(!!sample.stdin);
    setOutput('');
    setStats(null);
  };

  // Tab key indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const handleRun = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setOutput('Compiling and executing in Judge0 Sandbox...');
    setStats(null);

    try {
      const res = await executeViaJudge0(code, language, showStdin ? stdin : '');
      const finalOut = res.stdout || res.stderr || res.compile_output || (res.status.id === 3 ? 'Program executed successfully with no stdout.' : res.status.description);
      setOutput(finalOut);
      setStats({
        time: res.time || '0.04s',
        memory: res.memory ? `${(res.memory / 1024).toFixed(1)} MB` : '1.2 MB',
        status: res.status.description || 'Accepted'
      });
    } catch (error: any) {
      setOutput('Runtime Error: ' + (error.message || 'Could not execute code.'));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={`flex flex-col bg-slate-900 overflow-hidden shadow-2xl border border-slate-700 ${embedded ? 'h-full rounded-none' : 'h-full rounded-2xl'}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 gap-2 shrink-0">
        <div className="flex items-center gap-3">
          {!embedded && (
            <div className="flex gap-1.5 mr-1">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
          )}
          
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:border-bitwise-500 font-mono"
          >
            {JUDGE0_LANGUAGES.map(l => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>

          {/* Quick Load Sample Code */}
          <select
            onChange={(e) => handleSelectSample(e.target.value)}
            defaultValue=""
            className="bg-bitwise-900/60 hover:bg-bitwise-900 text-bitwise-200 text-xs px-3 py-1.5 rounded-lg border border-bitwise-700/60 focus:outline-none focus:border-bitwise-500 font-medium cursor-pointer"
          >
            <option value="" disabled>⚡ Load Runnable Sample...</option>
            {Object.entries(SAMPLE_PROGRAMS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowStdin(!showStdin)}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              showStdin ? 'bg-bitwise-600 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <i className="fa-solid fa-keyboard text-[10px]"></i>
            Stdin {showStdin ? 'On' : 'Off'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCode('')} 
            className="text-slate-400 hover:text-white px-2 py-1 text-xs transition-colors"
          >
            Clear
          </button>

          <button 
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isRunning ? (
              <><i className="fa-solid fa-circle-notch fa-spin"></i> Running...</>
            ) : (
              <><i className="fa-solid fa-play text-[10px]"></i> Run Code</>
            )}
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Editor Side */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950">
          <textarea 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full bg-slate-950 text-slate-100 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
            spellCheck={false}
            placeholder="// Write and execute your code with free Judge0 Sandbox..."
          />

          {showStdin && (
            <div className="h-28 border-t border-slate-800 bg-slate-900 p-2 flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Standard Input (stdin):
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Input lines passed to program</span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="2 7 11 15&#10;9"
                className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 resize-none focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Output Panel */}
        <div className="h-48 min-h-0 md:h-auto md:w-2/5 border-t md:border-t-0 md:border-l bg-slate-950 border-slate-800 flex flex-col overflow-hidden">
          <div className="bg-slate-900 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex justify-between items-center">
            <span>Sandbox Output</span>
            {stats && (
              <span className="text-[10px] font-mono text-emerald-400 lowercase font-bold">
                ✓ {stats.status} ({stats.time} | {stats.memory})
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 p-4 font-mono text-xs overflow-y-auto overflow-x-auto overscroll-contain">
            {output ? (
              <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">{output}</pre>
            ) : (
              <span className="text-slate-600 italic">Click 'Run Code' to execute in the Judge0 sandbox...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;

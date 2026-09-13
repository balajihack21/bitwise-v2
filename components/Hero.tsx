import React, { useState } from 'react';

interface HeroProps {
  onStartLearning: () => void;
}

type DemoLang = 'python' | 'cpp' | 'java';

const CODE_EXAMPLES: Record<DemoLang, { filename: string; code: string; output: string[] }> = {
  python: {
    filename: 'two_sum.py',
    code: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}
    for idx, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], idx]
        seen[num] = idx
    return []

# Executing Judge0 Test Suite...
print(two_sum([2, 7, 11, 15], 9))`,
    output: [
      '✓ Test 1: nums=[2,7,11,15], target=9 -> Output: [0, 1] (4ms)',
      '✓ Test 2: nums=[3,2,4], target=6       -> Output: [1, 2] (3ms)',
      '✓ Test 3: nums=[3,3], target=6         -> Output: [0, 1] (3ms)',
      'Status: ACCEPTED | Runtime: 10ms | Memory: 14.1 MB'
    ]
  },
  cpp: {
    filename: 'two_sum.cpp',
    code: `#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> lookup;
    for (int i = 0; i < nums.size(); ++i) {
        int complement = target - nums[i];
        if (lookup.count(complement)) {
            return {lookup[complement], i};
        }
        lookup[nums[i]] = i;
    }
    return {};
}`,
    output: [
      '✓ Test 1: nums=[2,7,11,15], target=9 -> Output: [0, 1] (2ms)',
      '✓ Test 2: nums=[3,2,4], target=6       -> Output: [1, 2] (1ms)',
      '✓ Test 3: nums=[3,3], target=6         -> Output: [0, 1] (2ms)',
      'Status: ACCEPTED | Runtime: 5ms | Memory: 9.8 MB'
    ]
  },
  java: {
    filename: 'Solution.java',
    code: `import java.util.HashMap;

public class Solution {
    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}`,
    output: [
      '✓ Test 1: nums=[2,7,11,15], target=9 -> Output: [0, 1] (5ms)',
      '✓ Test 2: nums=[3,2,4], target=6       -> Output: [1, 2] (4ms)',
      '✓ Test 3: nums=[3,3], target=6         -> Output: [0, 1] (4ms)',
      'Status: ACCEPTED | Runtime: 13ms | Memory: 18.6 MB'
    ]
  }
};

const Hero: React.FC<HeroProps> = ({ onStartLearning }) => {
  const [activeLang, setActiveLang] = useState<DemoLang>('python');

  return (
    <div className="relative overflow-hidden bg-slate-50 tech-grid-pattern pt-14 pb-20 border-b border-slate-200/80">
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        
        {/* Release Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-mono shadow-2xs">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-slate-900">Judge0 CE</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">Multi-Language Sandbox Online</span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.12] mb-6">
            Engineered for Deep Learning.<br />
            <span className="text-bitwise-700">Code, Test, & Master Algorithms.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Break through technical complexity with guided problem sets, step-by-step mathematical deconstructions, automated Judge0 test validation, and sequential progression.
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button 
              onClick={onStartLearning}
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-card hover:shadow-elevated transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Start Solving Challenges</span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </button>
            <button 
              onClick={onStartLearning}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              Explore Course Catalog
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* INTERACTIVE CODE & TEST RUNNER TERMINAL SHOWCASE               */}
        {/* ============================================================== */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-code-bg border border-code-border shadow-elevated overflow-hidden text-left font-mono">
          
          {/* Terminal Window Header */}
          <div className="bg-code-surface px-4 py-3 border-b border-code-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              </div>
              <span className="text-slate-400 text-xs ml-2 hidden sm:inline-block font-sans font-medium">
                {CODE_EXAMPLES[activeLang].filename} — Judge0 Engine v1.13
              </span>
            </div>

            {/* Language Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs">
              {(['python', 'cpp', 'java'] as DemoLang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-2.5 py-1 rounded text-[11px] uppercase font-bold transition-colors cursor-pointer ${
                    activeLang === lang 
                      ? 'bg-bitwise-600 text-white shadow-2xs' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'cpp' ? 'C++' : lang}
                </button>
              ))}
            </div>
          </div>

          {/* Code Pane with line numbers */}
          <div className="p-5 text-xs text-code-text overflow-x-auto bg-[#0a0d14] leading-relaxed">
            <pre className="font-mono">
              <code>
                {CODE_EXAMPLES[activeLang].code.split('\n').map((line, i) => (
                  <div key={i} className="table-row">
                    <span className="table-cell pr-5 select-none text-slate-600 text-right w-8 text-[11px]">
                      {i + 1}
                    </span>
                    <span className="table-cell">
                      {line.startsWith('#') ? (
                        <span className="text-slate-500 italic">{line}</span>
                      ) : line.includes('def ') || line.includes('public ') || line.includes('int ') || line.includes('vector<') ? (
                        <span className="text-sky-300 font-semibold">{line}</span>
                      ) : line.includes('return ') ? (
                        <span className="text-rose-300">{line}</span>
                      ) : line.includes('for ') || line.includes('if ') ? (
                        <span className="text-amber-300">{line}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          </div>

          {/* Live Test Suite Result Drawer */}
          <div className="border-t border-slate-800 bg-[#0d121f] p-4 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400 mb-2.5 text-[11px] border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
                <i className="fa-solid fa-circle-check"></i>
                Judge0 Sandbox Automated Test Suite
              </span>
              <span className="text-slate-500 font-sans text-[11px]">
                3 Test Cases Verified
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {CODE_EXAMPLES[activeLang].output.map((outLine, idx) => (
                <div 
                  key={idx} 
                  className={idx === 3 
                    ? "text-emerald-400 font-bold pt-1 text-xs border-t border-slate-800/60" 
                    : "text-slate-300 flex items-center gap-2"
                  }
                >
                  {outLine}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Pillars */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-sm mb-3">
              <i className="fa-solid fa-microchip"></i>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Judge0 Sandboxing</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Compile Python, C++, Java, and JS against multi-case STDIN/STDOUT test suites.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-sm mb-3">
              <i className="fa-solid fa-lock-open"></i>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Sequential Progression</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Unlock subsequent algorithms only after passing all strict test constraints.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-sm mb-3">
              <i className="fa-solid fa-robot"></i>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">AI Engineering Tutor</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Get contextual complexity breakdowns without having the complete answer spoiled.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-sm mb-3">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Verifiable Credentials</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Earn authenticated certificates with permanent verification IDs and QR codes.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Hero;
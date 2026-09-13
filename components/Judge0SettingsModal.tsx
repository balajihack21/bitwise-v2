import React, { useState } from 'react';
import { Judge0Config } from '../types';
import { getStoredJudge0Config, saveJudge0Config } from '../services/judge0Service';

interface Judge0SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: Judge0Config) => void;
}

const Judge0SettingsModal: React.FC<Judge0SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState<Judge0Config>(getStoredJudge0Config());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection to sandbox endpoint...');
    try {
      const baseUrl = config.apiUrl?.replace(/\/$/, '') || 'https://ce.judge0.com';
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (config.useRapidApi && config.apiKey) {
        headers['X-RapidAPI-Key'] = config.apiKey;
        headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
      }

      const res = await fetch(`${baseUrl}/languages`, { headers, method: 'GET' });
      if (res.ok) {
        const langs = await res.json();
        setTestStatus('success');
        setTestMessage(`Connected successfully! ${langs.length || '60+'} languages supported.`);
      } else {
        setTestStatus('failed');
        setTestMessage(`Server returned HTTP ${res.status}. Fallback AI sandbox is active.`);
      }
    } catch (e: any) {
      setTestStatus('failed');
      setTestMessage(`Direct network check error (${e.message}). Built-in sandbox & fallback runner will handle code execution seamlessly.`);
    }
  };

  const handleSave = () => {
    saveJudge0Config(config);
    if (onSave) onSave(config);
    onClose();
  };

  const handleResetDefault = () => {
    const def: Judge0Config = {
      apiUrl: 'https://ce.judge0.com',
      useRapidApi: false,
      mode: 'judge0-free'
    };
    setConfig(def);
    saveJudge0Config(def);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-fade-in">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-bitwise-500/20 text-bitwise-400 flex items-center justify-center font-mono font-bold text-sm">
              <i className="fa-solid fa-server"></i>
            </div>
            <div>
              <h3 className="font-bold text-base">Judge0 Sandbox Configuration</h3>
              <p className="text-xs text-slate-400">Free code execution & test validation engine</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 text-xs text-blue-900">
            <i className="fa-solid fa-circle-info text-blue-600 mt-0.5 text-sm"></i>
            <div>
              <span className="font-bold">Free Sandbox Mode is Active:</span> Code is executed in an isolated sandbox environment with multi-test validation and real-time execution statistics (Time, Memory, Stdout).
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Judge0 Sandbox API URL
            </label>
            <input 
              type="text"
              value={config.apiUrl}
              onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
              placeholder="https://ce.judge0.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-bitwise-500 focus:border-bitwise-500 outline-none text-slate-800"
            />
            <p className="text-[11px] text-slate-500 mt-1">Default: <code>https://ce.judge0.com</code> (Free Public CE Sandbox)</p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input 
                type="checkbox"
                checked={config.useRapidApi}
                onChange={(e) => setConfig({ ...config, useRapidApi: e.target.checked })}
                className="w-4 h-4 rounded text-bitwise-600 focus:ring-bitwise-500"
              />
              <span className="text-sm font-semibold text-slate-700">Use RapidAPI Judge0 Key (Optional)</span>
            </label>

            {config.useRapidApi && (
              <div className="pl-6 pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">RapidAPI Key</label>
                <input 
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="Enter your RapidAPI X-RapidAPI-Key"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-bitwise-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Test Status feedback */}
          {testStatus !== 'idle' && (
            <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
              testStatus === 'testing' ? 'bg-slate-100 text-slate-700' :
              testStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {testStatus === 'testing' && <i className="fa-solid fa-spinner fa-spin"></i>}
              {testStatus === 'success' && <i className="fa-solid fa-circle-check text-emerald-600"></i>}
              {testStatus === 'failed' && <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>}
              <span>{testMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Test Endpoint
            </button>
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Reset Default
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-white bg-bitwise-600 hover:bg-bitwise-700 rounded-lg shadow-sm transition-all"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Judge0SettingsModal;

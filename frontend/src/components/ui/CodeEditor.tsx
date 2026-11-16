'use client';

import React, { useState } from 'react';
import { Copy, RotateCcw, Check, Terminal, Code, Sparkles } from 'lucide-react';

interface CodeEditorProps {
  initialCode: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
  highlightLines?: number[];
  height?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode,
  language = 'python',
  onCodeChange,
  readOnly = false,
  highlightLines = [],
  height = '420px',
}) => {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [selectedLang, setSelectedLang] = useState(language);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (onCodeChange) onCodeChange(newCode);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCode(initialCode);
    if (onCodeChange) onCodeChange(initialCode);
  };

  // Split into lines for editor gutter
  const lines = code.split('\n');

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-navy-950 overflow-hidden shadow-2xl">
      {/* Editor top toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-navy-900/90 px-4 py-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80"></span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex items-center gap-1 font-mono text-slate-300">
            <Code className="h-3.5 w-3.5 text-indigo-400" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer hover:text-white"
            >
              <option value="python" className="bg-navy-900">solution.py (Python 3.12)</option>
              <option value="javascript" className="bg-navy-900">solution.js (Node.js)</option>
              <option value="cpp" className="bg-navy-900">solution.cpp (C++20)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {highlightLines.length > 0 && (
            <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300 border border-rose-500/20">
              Bug near line {highlightLines.join(', ')}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Copy code to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {!readOnly && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Reset code to original starter"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor area with line numbers */}
      <div className="relative flex font-mono text-xs" style={{ minHeight: height }}>
        {/* Line Numbers Gutter */}
        <div className="select-none bg-navy-900/40 px-3 py-3 text-right font-mono text-slate-600 border-r border-slate-800/80">
          {lines.map((_, i) => {
            const lineNum = i + 1;
            const isHighlighted = highlightLines.includes(lineNum);
            return (
              <div
                key={i}
                className={`leading-6 ${
                  isHighlighted ? 'font-bold text-rose-400 bg-rose-500/10 px-1 -mx-1 rounded' : ''
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Text Area */}
        <textarea
          value={code}
          onChange={handleTextChange}
          readOnly={readOnly}
          spellCheck={false}
          className="w-full flex-1 resize-none bg-navy-950 p-3 leading-6 text-slate-100 outline-none selection:bg-indigo-500/30 selection:text-indigo-200 font-mono"
          style={{ minHeight: height }}
        />
      </div>
    </div>
  );
};

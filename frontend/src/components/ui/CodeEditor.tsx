'use client';

import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, RotateCcw, Check, Code } from 'lucide-react';

interface CodeEditorProps {
  initialCode: string;
  language?: 'python' | 'javascript' | 'cpp';
  supportedLanguages?: Array<'python' | 'javascript' | 'cpp'>;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: 'python' | 'javascript' | 'cpp') => void;
  readOnly?: boolean;
  highlightLines?: number[];
  height?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode,
  language = 'python',
  supportedLanguages = ['python', 'javascript', 'cpp'],
  onCodeChange,
  onLanguageChange,
  readOnly = false,
  highlightLines = [],
  height = '420px',
}) => {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'python' | 'javascript' | 'cpp'>(language);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    setSelectedLang(language);
  }, [language]);

  const handleEditorChange = (value?: string) => {
    const nextCode = value ?? '';
    setCode(nextCode);
    onCodeChange?.(nextCode);
  };

  const handleLanguageChange = (nextLanguage: 'python' | 'javascript' | 'cpp') => {
    setSelectedLang(nextLanguage);
    onLanguageChange?.(nextLanguage);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleReset = () => {
    setCode(initialCode);
    onCodeChange?.(initialCode);
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-navy-950 overflow-hidden shadow-2xl">
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
              onChange={(event) => handleLanguageChange(event.target.value as 'python' | 'javascript' | 'cpp')}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer hover:text-white"
            >
              {supportedLanguages.includes('python') && (
                <option value="python" className="bg-navy-900">solution.py (Python 3.12)</option>
              )}
              {supportedLanguages.includes('javascript') && (
                <option value="javascript" className="bg-navy-900">solution.js (Node.js)</option>
              )}
              {supportedLanguages.includes('cpp') && (
                <option value="cpp" className="bg-navy-900">solution.cpp (C++20)</option>
              )}
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

      <div className="relative" style={{ minHeight: height }}>
        <Editor
          height={height}
          width="100%"
          language={selectedLang}
          theme="vs-dark"
          value={code}
          defaultValue={initialCode}
          onChange={handleEditorChange}
          loading={<div className="flex h-full min-h-[220px] items-center justify-center bg-navy-950 text-xs text-slate-400">Loading editor...</div>}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            automaticLayout: true,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            glyphMargin: false,
            folding: false,
            lineHeight: 22,
            suggestOnTriggerCharacters: true,
            roundedSelection: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
};

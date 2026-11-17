'use client';

import React, { useState } from 'react';
import {
  Send,
  Bot,
  User,
  Lightbulb,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
}

export default function AIMentorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<'socratic' | 'conceptual'>('socratic');

  const handleSend = async (textToSend?: string) => {
    const userText = (textToSend ?? input).trim();
    if (!userText.trim()) return;

    const history = messages.slice(-12).map((message) => ({
      role: message.sender,
      content: message.text,
    }));
    const timestamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setIsTyping(true);
    setErrorMessage('');

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error('Supabase authentication is not configured. Configure the browser Supabase URL and anon key.');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Sign in to ask the AI Mentor.');
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL
        || process.env.NEXT_PUBLIC_BACKEND_URL
        || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/platform/mentor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: userText,
          topic: 'debugging',
          mode,
          history,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.detail || `The AI Mentor request failed (${response.status}).`);
      }
      if (typeof result?.answer !== 'string' || !result.answer.trim()) {
        throw new Error('The AI Mentor returned an empty response. Please try again.');
      }

      setMessages((previous) => [...previous, {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: result.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        source: result.source,
      }]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reach the AI Mentor. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const promptChips = [
    'Why does left = mid cause an infinite loop in Binary Search?',
    'What is the difference between shallow copy and deep copy in Python?',
    'How does sliding window reduce time complexity from O(n²) to O(n)?',
    'Why should I avoid mutating a list while iterating over it?',
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">AI Debugging Mentor</h1>
              <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-300 border border-teal-500/30">
                Socratic Teaching
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              When available, guidance uses your persisted Learning DNA to support your debugging practice.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-navy-900 p-1 text-xs">
            <button
              onClick={() => setMode('socratic')}
              disabled={isTyping}
              className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                mode === 'socratic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Socratic Guided Mode
            </button>
            <button
              onClick={() => setMode('conceptual')}
              disabled={isTyping}
              className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                mode === 'conceptual' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Conceptual Explanations
            </button>
          </div>
        </div>

        {/* Chat Thread Container */}
        <div className="mt-6 flex flex-col h-[520px] rounded-2xl border border-slate-800 bg-navy-900/60 overflow-hidden backdrop-blur-md">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 && !isTyping && (
              <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                <Bot className="h-8 w-8 text-teal-400" />
                <p className="mt-3 text-sm font-semibold text-slate-200">Ask the Mentor a question</p>
                <p className="mt-1 max-w-md text-xs text-slate-400">
                  The Mentor will guide your reasoning instead of jumping straight to a solution.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  m.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.sender === 'assistant' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-xl rounded-2xl p-4 ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'border border-slate-800 bg-navy-950 text-slate-200'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  <span className="block mt-2 text-[10px] opacity-60 text-right">
                    {m.timestamp}{m.source ? ` · ${m.source}` : ''}
                  </span>
                </div>

                {m.sender === 'user' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-teal-400 font-mono">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping"></span>
                <span>AI Mentor is analyzing your question...</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div role="alert" className="mx-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2 border-t border-slate-800/80 bg-navy-950/40 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-500 flex items-center gap-1 font-semibold flex-shrink-0">
              <Lightbulb className="h-3 w-3 text-amber-400" /> Prompts:
            </span>
            {promptChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                disabled={isTyping}
                className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-300 hover:border-slate-700 hover:text-white flex-shrink-0 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-800 bg-navy-950 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask a question or explain your debugging reasoning..."
              value={input}
              maxLength={4000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              className="flex-1 rounded-xl border border-slate-700 bg-navy-900 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isTyping}
              aria-label="Send question to AI Mentor"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-500 disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

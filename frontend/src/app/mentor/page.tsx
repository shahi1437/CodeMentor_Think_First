'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  Bot,
  User,
  Lightbulb,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { backendRequest } from '@/lib/backend';

interface Source {
  id: string;
  title: string;
  source_url: string | null;
  license: string;
}

interface Conversation {
  id: string;
  topic: string;
  status: string;
  mode: 'socratic' | 'conceptual';
  updated_at: string;
}

interface SavedMessage {
  id: string;
  message_kind: 'user' | 'assistant';
  message: string;
  created_at: string;
  sources: Source[];
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  sources?: Source[];
}

export default function AIMentorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<'socratic' | 'conceptual'>('socratic');
  const nextMessageId = useRef(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [threadLoading, setThreadLoading] = useState(false);
  const [closed, setClosed] = useState(false);
  const busy = useRef(false);
  const pending = useRef<{ question: string; mode: string; requestId: string } | null>(null);

  const loadConversations = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const records = await backendRequest<Conversation[]>('/platform/mentor/conversations');
      if (!Array.isArray(records)) throw new Error('Saved conversations could not be loaded.');
      setConversations(records);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Saved conversations could not be loaded.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadConversations); }, [loadConversations]);

  const openConversation = async (id: string) => {
    if (busy.current) return;
    busy.current = true;
    setThreadLoading(true);
    setErrorMessage('');
    try {
      const thread = await backendRequest<Conversation & { messages: SavedMessage[] }>(
        `/platform/mentor/conversations/${encodeURIComponent(id)}`,
      );
      if (!Array.isArray(thread.messages)) throw new Error('This conversation could not be loaded.');
      setMessages(thread.messages.map((message) => ({
        id: message.id, sender: message.message_kind, text: message.message,
        timestamp: new Date(message.created_at).toLocaleString(), sources: message.sources,
      })));
      setConversationId(thread.id);
      setMode(thread.mode);
      setClosed(thread.status !== 'open');
      setInput('');
      pending.current = null;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'This conversation could not be loaded.');
    } finally {
      busy.current = false;
      setThreadLoading(false);
    }
  };

  const newConversation = () => {
    if (busy.current) return;
    setMessages([]);
    setConversationId(null);
    setClosed(false);
    setInput('');
    setErrorMessage('');
    pending.current = null;
  };

  const handleSend = async (textToSend?: string) => {
    const userText = (textToSend ?? input).trim();
    if (!userText || busy.current || closed) return;
    busy.current = true;
    if (pending.current?.question !== userText || pending.current.mode !== mode) {
      pending.current = { question: userText, mode, requestId: crypto.randomUUID() };
    }
    const timestamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const userMessage: Message = {
      id: `u-${nextMessageId.current++}`,
      sender: 'user',
      text: userText,
      timestamp,
    };

    setIsTyping(true);
    setErrorMessage('');

    try {
      const result = await backendRequest<{
        answer: string; conversation_id: string; source: string; sources: Source[];
      }>('/platform/mentor', {
        method: 'POST',
        body: JSON.stringify({
          question: userText,
          topic: 'debugging',
          mode,
          conversation_id: conversationId,
          request_id: pending.current.requestId,
        }),
      });
      if (typeof result?.answer !== 'string' || !result.answer.trim()) {
        throw new Error('The AI Mentor returned an empty response. Please try again.');
      }

      setMessages((previous) => [...previous, userMessage, {
        id: `a-${nextMessageId.current++}`,
        sender: 'assistant',
        text: result.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        source: result.source,
        sources: result.sources,
      }]);
      setConversationId(result.conversation_id);
      setInput('');
      pending.current = null;
      void loadConversations();
    } catch (error) {
      setInput(userText);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reach the AI Mentor. Please try again.');
    } finally {
      busy.current = false;
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

        <section aria-label="Saved conversations" className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={newConversation} disabled={isTyping || threadLoading} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white disabled:opacity-50">New conversation</button>
            <button onClick={() => void loadConversations()} disabled={historyLoading} className="text-xs text-indigo-300">Refresh history</button>
            {historyLoading && <span role="status" className="text-xs text-slate-400">Loading conversations…</span>}
          </div>
          {historyError && <p role="alert" className="text-xs text-rose-300">{historyError}</p>}
          {!historyLoading && !historyError && conversations.length === 0 && <p className="text-xs text-slate-400">Your saved conversations will appear here.</p>}
          {conversations.length > 0 && <label className="block text-xs text-slate-300">Saved conversation
            <select value={conversationId ?? ''} disabled={isTyping || threadLoading} onChange={(event) => { if (event.target.value) void openConversation(event.target.value); }} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2">
              <option value="">Choose a conversation</option>
              {conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.topic} · {new Date(conversation.updated_at).toLocaleString()}</option>)}
            </select>
          </label>}
          {threadLoading && <p role="status" className="text-xs text-slate-300">Loading messages…</p>}
          {closed && <p className="text-xs text-amber-300">This conversation is closed. Start a new conversation to continue.</p>}
        </section>

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
                  {!!m.sources?.length && <ul className="mt-3 space-y-1 border-t border-slate-700 pt-2">
                    {m.sources.map((source, index) => <li key={source.id}>
                      [{index + 1}] {source.source_url && /^https?:\/\//i.test(source.source_url)
                        ? <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline">{source.title}</a>
                        : source.title} · {source.license}
                    </li>)}
                  </ul>}
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
                disabled={isTyping || threadLoading || closed}
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
              aria-label="Question for the Mentor"
              disabled={isTyping || threadLoading || closed}
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
              disabled={!input.trim() || isTyping || threadLoading || closed}
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

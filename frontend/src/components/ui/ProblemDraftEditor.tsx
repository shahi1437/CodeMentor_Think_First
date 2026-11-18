'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { backendRequest } from '@/lib/backend';

const languages = ['python', 'javascript', 'cpp'] as const;
type Language = typeof languages[number];
type ProgramField = 'starter_code' | 'reference_solutions' | 'debugging_starter_code';
type Case = { name: string; input_text: string; expected_output: string; is_hidden: boolean };
type Draft = {
  title: string; description: string; category: string; difficulty: string; problem_mode: string;
  tags: string[]; supported_languages: Language[]; progressive_hints: string[];
  starter_code: Partial<Record<Language, string>>;
  reference_solutions: Partial<Record<Language, string>>;
  debugging_starter_code: Partial<Record<Language, string>>;
  test_cases: Case[];
};
type Problem = Draft & { id: string; revision: number; is_published: boolean; archived_at: string | null };
type State = 'published' | 'draft' | 'archived';

const emptyDraft: Draft = {
  title: '', description: '', category: 'general', difficulty: 'beginner', problem_mode: 'normal',
  tags: [], supported_languages: ['python'], progressive_hints: [], starter_code: {},
  reference_solutions: {}, debugging_starter_code: {}, test_cases: [],
};
const emptyCase: Case = { name: '', input_text: '', expected_output: '', is_hidden: false };
const field = 'mt-1 block w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-sm text-white';
const action = 'rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50';
const programs: { value: ProgramField; label: string }[] = [
  { value: 'starter_code', label: 'Normal starter' },
  { value: 'reference_solutions', label: 'Reference solution' },
  { value: 'debugging_starter_code', label: 'Debugging variant' },
];

function toDraft(problem: Problem): Draft {
  return {
    title: problem.title, description: problem.description ?? '', category: problem.category,
    difficulty: problem.difficulty, problem_mode: problem.problem_mode, tags: problem.tags,
    supported_languages: problem.supported_languages, starter_code: problem.starter_code,
    progressive_hints: problem.progressive_hints, reference_solutions: problem.reference_solutions,
    debugging_starter_code: problem.debugging_starter_code, test_cases: problem.test_cases,
  };
}

export function ProblemDraftEditor({ id }: { id?: string }) {
  const router = useRouter();
  const path = id ? '/admin/problems/' + id : '/admin/problems';
  const [problem, setProblem] = useState<Problem>();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [language, setLanguage] = useState<Language>('python');
  const [program, setProgram] = useState<ProgramField>('starter_code');
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const record = await backendRequest<Problem>(path);
      setProblem(record);
      setDraft(toDraft(record));
      setLanguage(record.supported_languages[0] ?? 'python');
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this problem.');
    } finally {
      setLoading(false);
    }
  }, [id, path]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
    setDirty(true);
    setNotice('');
  }

  function updateLanguages(next: Language[]) {
    if (!next.length) return;
    if (!next.includes(language)) setLanguage(next[0]);
    update('supported_languages', next);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy('Saving draft…');
    try {
      const programValues = (values: Draft[ProgramField]) => Object.fromEntries(
        Object.entries(values).filter(([key]) => draft.supported_languages.includes(key as Language)),
      );
      const payload = {
        ...draft, tags: draft.tags.map(tag => tag.trim()).filter(Boolean),
        progressive_hints: draft.progressive_hints.map(hint => hint.trim()).filter(Boolean),
        starter_code: programValues(draft.starter_code),
        reference_solutions: programValues(draft.reference_solutions),
        debugging_starter_code: programValues(draft.debugging_starter_code),
        ...(problem ? { revision: problem.revision } : {}),
      };
      const saved = await backendRequest<Problem>(path, {
        method: id ? 'PUT' : 'POST', body: JSON.stringify(payload),
      });
      setProblem(saved);
      setDraft(toDraft(saved));
      setDirty(false);
      setNotice('Draft saved.');
      if (!id) router.replace('/admin/problems/' + saved.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the draft.');
    } finally {
      setBusy('');
    }
  }

  async function changeState(state: State) {
    if (!problem) return;
    setError('');
    setBusy(state === 'published' ? 'Verifying with Judge0…' : 'Updating problem…');
    try {
      const record = await backendRequest<Problem>(path + '/state', {
        method: 'POST', body: JSON.stringify({ state, revision: problem.revision }),
      });
      setProblem(record);
      setDraft(toDraft(record));
      setNotice(state === 'published' ? 'Verified and published.' : state === 'draft' ? 'Unpublished.' : 'Archived.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this problem.');
    } finally {
      setBusy('');
    }
  }

  const locked = Boolean(problem?.is_published || problem?.archived_at || busy);
  const state = problem?.archived_at ? 'Archived' : problem?.is_published ? 'Published' : 'Draft';

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-slate-200">
        <Link href="/admin/problems" className="text-sm text-indigo-300 hover:underline">Back to problem bank</Link>
        <h1 className="text-3xl font-bold text-white">{id ? 'Edit problem' : 'New problem'}</h1>
        {loading && <div role="status" className="animate-pulse rounded-xl bg-slate-900 p-6">Loading problem…</div>}
        {error && <p role="alert" className="rounded-lg border border-rose-500/40 p-4 text-rose-200">{error}</p>}
        {notice && <p role="status" className="text-emerald-300">{notice}</p>}
        {!loading && id && !problem && <button type="button" className={action} onClick={load}>Retry</button>}
        {!loading && (!id || problem) && (
          <form onSubmit={save} className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">{state}</span>
              {!locked && <button type="submit" className={action + ' bg-indigo-600'}>Save draft</button>}
              {problem && !problem.archived_at && (
                <>
                  <button type="button" className={action} disabled={Boolean(busy) || dirty}
                    onClick={() => changeState(problem.is_published ? 'draft' : 'published')}>
                    {problem.is_published ? 'Unpublish to edit' : 'Verify and publish'}
                  </button>
                  <button type="button" className={action} disabled={Boolean(busy) || dirty}
                    onClick={() => changeState('archived')}>Archive</button>
                </>
              )}
              {busy && <span role="status" className="text-sm text-indigo-300">{busy}</span>}
              {dirty && problem && <span className="text-sm text-slate-400">Save changes to enable publishing.</span>}
            </div>

            <fieldset disabled={locked} className="grid gap-4 rounded-xl border border-slate-800 p-5 sm:grid-cols-2">
              <legend className="px-2 font-semibold">Problem details</legend>
              <label>Title<input className={field} required maxLength={120} value={draft.title} onChange={e => update('title', e.target.value)} /></label>
              <label>Category<input className={field} required maxLength={120} value={draft.category} onChange={e => update('category', e.target.value)} /></label>
              <label>Difficulty<select className={field} value={draft.difficulty} onChange={e => update('difficulty', e.target.value)}>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select></label>
              <label>Mode<select className={field} value={draft.problem_mode} onChange={e => update('problem_mode', e.target.value)}>
                <option value="normal">Normal</option><option value="debugging">Debugging</option><option value="both">Both</option>
              </select></label>
              <label className="sm:col-span-2">Statement<textarea className={field} rows={5} value={draft.description} onChange={e => update('description', e.target.value)} /></label>
              <label>Tags, separated by commas<input className={field} value={draft.tags.join(',')} onChange={e => update('tags', e.target.value.split(','))} /></label>
              <label>Progressive hints, one per line<textarea className={field} rows={4} value={draft.progressive_hints.join('\n')} onChange={e => update('progressive_hints', e.target.value.split('\n'))} /></label>
              <div className="flex flex-wrap gap-4 sm:col-span-2" aria-label="Supported languages">
                {languages.map(item => <label key={item} className="flex items-center gap-2">
                  <input type="checkbox" checked={draft.supported_languages.includes(item)}
                    onChange={e => updateLanguages(e.target.checked ? [...draft.supported_languages, item] : draft.supported_languages.filter(value => value !== item))} />
                  {item}
                </label>)}
              </div>
            </fieldset>

            <section className="space-y-3 rounded-xl border border-slate-800 p-5">
              <h2 className="font-semibold">Programs</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>Language<select className={field} value={language} onChange={e => setLanguage(e.target.value as Language)}>
                  {draft.supported_languages.map(value => <option key={value} value={value}>{value}</option>)}
                </select></label>
                <label>Program type<select className={field} value={program} onChange={e => setProgram(e.target.value as ProgramField)}>
                  {programs.map(value => <option key={value.value} value={value.value}>{value.label}</option>)}
                </select></label>
              </div>
              <CodeEditor key={language + program} language={language} supportedLanguages={[language]} height="240px"
                initialCode={draft[program][language] ?? ''} readOnly={locked}
                onCodeChange={value => update(program, { ...draft[program], [language]: value })} />
            </section>

            <fieldset disabled={locked} className="space-y-4 rounded-xl border border-slate-800 p-5">
              <legend className="px-2 font-semibold">Test cases</legend>
              {!draft.test_cases.length && <p className="text-sm text-slate-400">Add a public sample and a hidden grading case before publishing.</p>}
              {draft.test_cases.map((item, index) => {
                const editCase = (next: Partial<Case>) => update('test_cases', draft.test_cases.map((current, i) => i === index ? { ...current, ...next } : current));
                return <div key={index} className="grid gap-3 rounded-lg border border-slate-800 p-4 sm:grid-cols-2">
                  <label>Name<input className={field} required value={item.name} onChange={e => editCase({ name: e.target.value })} /></label>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={item.is_hidden} onChange={e => editCase({ is_hidden: e.target.checked })} />Hidden grading case</label>
                    <button type="button" className={action} onClick={() => update('test_cases', draft.test_cases.filter((_, i) => i !== index))}>Remove</button>
                  </div>
                  <label>Input<textarea className={field} rows={3} value={item.input_text} onChange={e => editCase({ input_text: e.target.value })} /></label>
                  <label>Expected output<textarea className={field} rows={3} value={item.expected_output} onChange={e => editCase({ expected_output: e.target.value })} /></label>
                </div>;
              })}
              <button type="button" className={action} disabled={draft.test_cases.length >= 100}
                onClick={() => update('test_cases', [...draft.test_cases, { ...emptyCase }])}>Add test case</button>
            </fieldset>
          </form>
        )}
      </main>
    </AppShell>
  );
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_ANALYZER_SOURCE_CHARACTERS,
  analyzerErrorKind,
  formatParseError,
  isAnalyzerResult,
  isConfigurationMessage,
  isNetworkErrorMessage,
} from '../src/lib/analyzer.ts';

const validResult = {
  language: 'python',
  analysis_type: 'python_ast',
  valid_syntax: true,
  parse_error: null,
  functions: [{ name: 'search', line: 1, arguments: ['nums', 'target'], recursive: false }],
  loops: 1,
  branches: 2,
  max_loop_depth: 1,
  time_complexity: 'O(n)',
  space_complexity: 'O(1)',
  findings: [{ label: 'Clean structure', severity: 'clean', description: 'No issue.' }],
  estimates_are_heuristic: true,
  complexity_basis: 'Estimated from Python AST structure.',
  limitations: ['Heuristic only.'],
};

describe('analyzer response contract', () => {
  it('accepts a structurally valid backend response', () => {
    assert.equal(isAnalyzerResult(validResult), true);
    assert.equal(isAnalyzerResult({ ...validResult, parse_error: { line: 3, offset: 5, message: 'bad' } }), true);
    assert.equal(isAnalyzerResult({ ...validResult, functions: [], findings: [] }), true);
  });

  it('rejects missing, malformed, or mislabeled fields', () => {
    assert.equal(isAnalyzerResult(null), false);
    assert.equal(isAnalyzerResult('python'), false);
    assert.equal(isAnalyzerResult({ ...validResult, language: 'javascript' }), false);
    assert.equal(isAnalyzerResult({ ...validResult, estimates_are_heuristic: false }), false);
    assert.equal(isAnalyzerResult({ ...validResult, loops: -1 }), false);
    assert.equal(isAnalyzerResult({ ...validResult, loops: 1.5 }), false);
    assert.equal(isAnalyzerResult({ ...validResult, limitations: ['ok', 3] }), false);
    assert.equal(isAnalyzerResult({ ...validResult, findings: [{ label: 'x' }] }), false);
    assert.equal(isAnalyzerResult({ ...validResult, parse_error: { line: '3', offset: 1, message: 'bad' } }), false);
    assert.equal(isAnalyzerResult({ ...validResult, complexity_basis: undefined }), false);
  });

  it('limits analyzer input to the backend maximum', () => {
    assert.equal(MAX_ANALYZER_SOURCE_CHARACTERS, 100000);
  });
});

describe('analyzer formatting and error classification', () => {
  it('formats syntax errors with available line and column information', () => {
    assert.equal(formatParseError(null), '');
    assert.equal(
      formatParseError({ line: 4, offset: 9, message: 'invalid syntax' }),
      'Line 4, column 9: invalid syntax',
    );
    assert.equal(formatParseError({ line: 7, offset: null, message: 'unexpected EOF' }), 'Line 7: unexpected EOF');
    assert.equal(formatParseError({ line: null, offset: null, message: 'unknown' }), 'Unknown line: unknown');
  });

  it('maps HTTP statuses to user-facing error kinds', () => {
    assert.equal(analyzerErrorKind(401), 'auth');
    assert.equal(analyzerErrorKind(403), 'auth');
    assert.equal(analyzerErrorKind(400), 'validation');
    assert.equal(analyzerErrorKind(422), 'validation');
    assert.equal(analyzerErrorKind(500), 'unavailable');
    assert.equal(analyzerErrorKind(503), 'unavailable');
    assert.equal(analyzerErrorKind(418), 'unexpected');
  });

  it('recognizes configuration and network failures without mislabeling other errors', () => {
    assert.equal(isConfigurationMessage('Backend is not configured. Set NEXT_PUBLIC_BACKEND_URL.'), true);
    assert.equal(isConfigurationMessage('Set NEXT_PUBLIC_API_URL to continue.'), true);
    assert.equal(isConfigurationMessage('Could not reach FastAPI backend.'), false);
    assert.equal(isNetworkErrorMessage('Could not reach FastAPI backend.'), true);
    assert.equal(isNetworkErrorMessage('Sign in to continue.'), false);
  });
});

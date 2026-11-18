export const MAX_ANALYZER_SOURCE_CHARACTERS = 100_000;

export interface AnalyzerParseError {
  line: number | null;
  offset: number | null;
  message: string;
}

export interface AnalyzerFunction {
  name: string;
  line: number;
  arguments: string[];
  recursive: boolean;
}

export interface AnalyzerFinding {
  label: string;
  severity: string;
  description: string;
}

export interface AnalyzerResult {
  language: 'python';
  analysis_type: 'python_ast';
  valid_syntax: boolean;
  parse_error: AnalyzerParseError | null;
  functions: AnalyzerFunction[];
  loops: number;
  branches: number;
  max_loop_depth: number;
  time_complexity: string;
  space_complexity: string;
  findings: AnalyzerFinding[];
  estimates_are_heuristic: true;
  complexity_basis: string;
  limitations: string[];
}

export type AnalyzerErrorKind =
  | 'auth'
  | 'validation'
  | 'configuration'
  | 'network'
  | 'unavailable'
  | 'unexpected';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  isInteger(value) && value >= 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

function isParseError(value: unknown): value is AnalyzerParseError {
  return isRecord(value)
    && (value.line === null || isInteger(value.line))
    && (value.offset === null || isInteger(value.offset))
    && typeof value.message === 'string';
}

function isFunction(value: unknown): value is AnalyzerFunction {
  return isRecord(value)
    && typeof value.name === 'string'
    && isNonNegativeInteger(value.line)
    && isStringArray(value.arguments)
    && typeof value.recursive === 'boolean';
}

function isFinding(value: unknown): value is AnalyzerFinding {
  return isRecord(value)
    && typeof value.label === 'string'
    && typeof value.severity === 'string'
    && typeof value.description === 'string';
}

export function isAnalyzerResult(value: unknown): value is AnalyzerResult {
  return isRecord(value)
    && value.language === 'python'
    && value.analysis_type === 'python_ast'
    && typeof value.valid_syntax === 'boolean'
    && (value.parse_error === null || isParseError(value.parse_error))
    && Array.isArray(value.functions) && value.functions.every(isFunction)
    && isNonNegativeInteger(value.loops)
    && isNonNegativeInteger(value.branches)
    && isNonNegativeInteger(value.max_loop_depth)
    && typeof value.time_complexity === 'string'
    && typeof value.space_complexity === 'string'
    && Array.isArray(value.findings) && value.findings.every(isFinding)
    && value.estimates_are_heuristic === true
    && typeof value.complexity_basis === 'string'
    && isStringArray(value.limitations);
}

export function formatParseError(error: AnalyzerParseError | null): string {
  if (!error) return '';
  const line = error.line === null ? 'Unknown line' : `Line ${error.line}`;
  const column = error.offset === null ? '' : `, column ${error.offset}`;
  return `${line}${column}: ${error.message}`;
}

export function analyzerErrorKind(status: number): AnalyzerErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'unavailable';
  return 'unexpected';
}

export function isConfigurationMessage(message: string): boolean {
  return /not configured|set next_public_/i.test(message);
}

export function isNetworkErrorMessage(message: string): boolean {
  return /could not reach fastapi/i.test(message);
}

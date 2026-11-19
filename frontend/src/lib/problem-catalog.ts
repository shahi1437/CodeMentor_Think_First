const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Easy',
  easy: 'Easy',
  intermediate: 'Medium',
  medium: 'Medium',
  advanced: 'Hard',
  hard: 'Hard',
};

export function problemDifficultyLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  return DIFFICULTY_LABELS[normalized] ?? value;
}

export function isExecutionAccepted(status: string): boolean {
  return status === 'accepted';
}

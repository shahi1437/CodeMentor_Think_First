import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isExecutionAccepted, problemDifficultyLabel } from '../src/lib/problem-catalog.ts';

describe('problem catalog display helpers', () => {
  it('maps database difficulties to student-facing labels', () => {
    assert.equal(problemDifficultyLabel('beginner'), 'Easy');
    assert.equal(problemDifficultyLabel('intermediate'), 'Medium');
    assert.equal(problemDifficultyLabel('advanced'), 'Hard');
    assert.equal(problemDifficultyLabel('Easy'), 'Easy');
    assert.equal(problemDifficultyLabel('custom'), 'custom');
  });

  it('treats only the backend accepted status as a successful execution', () => {
    assert.equal(isExecutionAccepted('accepted'), true);
    assert.equal(isExecutionAccepted('success'), false);
    assert.equal(isExecutionAccepted('wrong_answer'), false);
    assert.equal(isExecutionAccepted('configuration_error'), false);
  });
});

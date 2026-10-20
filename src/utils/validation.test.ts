import type { Question } from '../types';
import { isValidSessionConfig, validateQuestion } from './validation';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    operation: 'multiplication',
    firstOperand: 7,
    secondOperand: 8,
    displayText: '7 × 8',
    correctAnswer: 56,
    choices: [48, 54, 56, 64],
    difficulty: 2,
    source: 'regular',
    ...overrides,
  };
}

describe('validateQuestion', () => {
  it('accepts a valid question', () => {
    expect(validateQuestion(makeQuestion())).toEqual([]);
  });

  it('rejects duplicate choices', () => {
    expect(validateQuestion(makeQuestion({ choices: [56, 54, 54, 64] }))).toContain(
      'Choices must be unique',
    );
  });

  it('rejects choices that do not include the correct answer', () => {
    expect(validateQuestion(makeQuestion({ choices: [48, 54, 55, 64] }))).toContain(
      'Correct answer must appear exactly once in the choices',
    );
  });

  it('rejects the wrong number of choices', () => {
    expect(validateQuestion(makeQuestion({ choices: [56, 54, 64] }))).toContain(
      'There must be exactly 4 choices',
    );
  });

  it('rejects a wrong correct answer', () => {
    expect(
      validateQuestion(makeQuestion({ correctAnswer: 54, choices: [48, 54, 56, 64] })),
    ).toContain('Correct answer is wrong');
  });

  it('rejects division by zero', () => {
    const q = makeQuestion({
      operation: 'division',
      firstOperand: 8,
      secondOperand: 0,
      correctAnswer: 0,
      choices: [0, 1, 2, 3],
    });
    expect(validateQuestion(q)).toContain('Division by zero');
  });

  it('rejects division with a fractional answer', () => {
    const q = makeQuestion({
      operation: 'division',
      firstOperand: 7,
      secondOperand: 2,
      correctAnswer: 3.5,
      choices: [3.5, 3, 4, 5],
    });
    const errors = validateQuestion(q);
    expect(errors).toContain('Division answer is not a whole number');
    expect(errors).toContain('Correct answer must be a whole number');
  });

  it('rejects negative answers and choices unless allowed', () => {
    const q = makeQuestion({
      operation: 'subtraction',
      firstOperand: 3,
      secondOperand: 5,
      correctAnswer: -2,
      choices: [-2, -1, 0, 1],
    });
    expect(validateQuestion(q)).toContain('Negative answer not allowed');
    expect(validateQuestion(q, { allowNegative: true })).toEqual([]);
  });
});

describe('isValidSessionConfig', () => {
  const valid = {
    operations: ['addition', 'division'],
    difficulty: 3,
    sessionLength: 10,
    reviewMode: 'regular',
  };

  it('accepts a valid configuration', () => {
    expect(isValidSessionConfig(valid)).toBe(true);
    expect(isValidSessionConfig({ ...valid, sessionLength: 'continuous' })).toBe(true);
  });

  it.each([
    ['null', null],
    ['no operations', { ...valid, operations: [] }],
    ['unknown operation', { ...valid, operations: ['exponents'] }],
    ['duplicate operations', { ...valid, operations: ['addition', 'addition'] }],
    ['bad difficulty', { ...valid, difficulty: 5 }],
    ['bad length', { ...valid, sessionLength: 7 }],
    ['bad mode', { ...valid, reviewMode: 'quiz' }],
  ])('rejects %s', (_label, value) => {
    expect(isValidSessionConfig(value)).toBe(false);
  });
});

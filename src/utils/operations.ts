import {
  DIFFICULTY_LEVELS,
  MATH_OPERATIONS,
  type DifficultyLevel,
  type MathOperation,
} from '../types';

export interface OperationInfo {
  label: string;
  symbol: string;
  /** Words used when reading a question aloud, e.g. "7 times 8". */
  spoken: string;
}

export const OPERATION_INFO: Record<MathOperation, OperationInfo> = {
  addition: { label: 'Addition', symbol: '+', spoken: 'plus' },
  subtraction: { label: 'Subtraction', symbol: '−', spoken: 'minus' },
  multiplication: { label: 'Multiplication', symbol: '×', spoken: 'times' },
  division: { label: 'Division', symbol: '÷', spoken: 'divided by' },
};

export interface DifficultyInfo {
  name: string;
  description: string;
}

export const DIFFICULTY_INFO: Record<DifficultyLevel, DifficultyInfo> = {
  1: { name: 'Beginner', description: 'Numbers up to 10 and times tables up to 5' },
  2: { name: 'Easy', description: 'Numbers up to 50 and times tables up to 10' },
  3: { name: 'Intermediate', description: 'Numbers up to 100 and bigger times tables' },
  4: { name: 'Advanced', description: 'Numbers up to 1,000 and two-digit times' },
};

/** The correct answer for two operands. Division may return a fraction; callers validate. */
export function computeAnswer(operation: MathOperation, a: number, b: number): number {
  switch (operation) {
    case 'addition':
      return a + b;
    case 'subtraction':
      return a - b;
    case 'multiplication':
      return a * b;
    case 'division':
      return a / b;
  }
}

/** Display text such as "7 × 8". */
export function formatQuestion(operation: MathOperation, a: number, b: number): string {
  return `${a} ${OPERATION_INFO[operation].symbol} ${b}`;
}

/** Screen-reader friendly wording such as "What is 7 times 8?". */
export function speakQuestion(operation: MathOperation, a: number, b: number): string {
  return `What is ${a} ${OPERATION_INFO[operation].spoken} ${b}?`;
}

/** Screen-reader wording for a solved question, e.g. "7 times 8 equals 56". */
export function speakEquation(operation: MathOperation, a: number, b: number, answer: number) {
  return `${a} ${OPERATION_INFO[operation].spoken} ${b} equals ${answer}`;
}

/** "Question 3 of 10", or "Question 3" for continuous practice. */
export function questionCountLabel(questionNumber: number, totalQuestions: number | null) {
  return totalQuestions === null
    ? `Question ${questionNumber}`
    : `Question ${questionNumber} of ${totalQuestions}`;
}

/** Format numbers with thousands separators for display (1,250). */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function isMathOperation(value: unknown): value is MathOperation {
  return typeof value === 'string' && (MATH_OPERATIONS as readonly string[]).includes(value);
}

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return typeof value === 'number' && (DIFFICULTY_LEVELS as readonly number[]).includes(value);
}

/** "Addition and Multiplication", "Addition, Subtraction and Division". */
export function describeOperations(operations: readonly MathOperation[]): string {
  if (MATH_OPERATIONS.every((op) => operations.includes(op))) return 'All four (mixed)';
  const labels = operations.map((op) => OPERATION_INFO[op].label);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

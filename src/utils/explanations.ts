import type { Question } from '../types';
import { formatNumber as f } from './operations';

type Solved = Pick<Question, 'operation' | 'firstOperand' | 'secondOperand' | 'correctAnswer'>;

/**
 * A short, child-friendly explanation shown on the back of the card (spec 6.3,
 * "a brief explanation when appropriate"). Small facts get a picture-style hint;
 * bigger numbers get a "check it" using the inverse operation.
 */
export function explainQuestion({
  operation,
  firstOperand: a,
  secondOperand: b,
  correctAnswer: c,
}: Solved): string {
  switch (operation) {
    case 'addition':
      if (b === 0 || a === 0) return 'Adding 0 does not change a number.';
      if (a <= 20 && b <= 10) return `Start at ${a} and count on ${b} more to reach ${c}.`;
      return `Check it by subtracting: ${f(c)} − ${f(b)} = ${f(a)}.`;
    case 'subtraction':
      if (b === 0) return 'Taking away 0 leaves the number the same.';
      if (a === b) return 'Any number take away itself is 0.';
      return `Check it by adding: ${f(c)} + ${f(b)} = ${f(a)}.`;
    case 'multiplication':
      if (a === 0 || b === 0) return 'Any number times 0 is 0.';
      if (a === 1 || b === 1) return 'Any number times 1 stays the same.';
      if (a <= 10 && b <= 10) return `${a} groups of ${b} make ${c}.`;
      return `Check it by dividing: ${f(c)} ÷ ${f(b)} = ${f(a)}.`;
    case 'division':
      if (b === 1) return 'Any number divided by 1 stays the same.';
      return `Share ${f(a)} into ${b} equal groups and each group gets ${f(c)}. Check it: ${f(c)} × ${b} = ${f(a)}.`;
  }
}

import { explainQuestion } from './explanations';

const q = (
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division',
  a: number,
  b: number,
  c: number,
) => explainQuestion({ operation, firstOperand: a, secondOperand: b, correctAnswer: c });

describe('explainQuestion', () => {
  it('uses counting on for small additions and a subtraction check for big ones', () => {
    expect(q('addition', 6, 7, 13)).toBe('Start at 6 and count on 7 more to reach 13.');
    expect(q('addition', 345, 278, 623)).toBe('Check it by subtracting: 623 − 278 = 345.');
    expect(q('addition', 9, 0, 9)).toMatch(/adding 0/i);
  });

  it('checks subtraction with addition', () => {
    expect(q('subtraction', 52, 17, 35)).toBe('Check it by adding: 35 + 17 = 52.');
    expect(q('subtraction', 8, 8, 0)).toMatch(/itself is 0/);
  });

  it('describes small multiplication as groups and checks big ones by dividing', () => {
    expect(q('multiplication', 7, 8, 56)).toBe('7 groups of 8 make 56.');
    expect(q('multiplication', 34, 7, 238)).toBe('Check it by dividing: 238 ÷ 7 = 34.');
    expect(q('multiplication', 0, 9, 0)).toMatch(/times 0 is 0/);
    expect(q('multiplication', 1, 9, 9)).toMatch(/times 1/);
  });

  it('describes division as sharing and checks it with multiplication', () => {
    expect(q('division', 56, 7, 8)).toBe(
      'Share 56 into 7 equal groups and each group gets 8. Check it: 8 × 7 = 56.',
    );
    expect(q('division', 9, 1, 9)).toMatch(/divided by 1/);
  });

  it('formats large numbers with separators', () => {
    expect(q('addition', 999, 999, 1998)).toBe('Check it by subtracting: 1,998 − 999 = 999.');
  });
});

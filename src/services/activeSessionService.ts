import type { PracticeSessionState } from '../hooks/usePracticeSession';
import type { SessionConfig } from '../types';
import { isStoredSession, isValidAttempt, isValidSessionConfig } from '../utils/validation';
import { questionProblems } from './questionGenerator';

/**
 * The practice session in progress, kept so a page refresh resumes where the
 * student was (TODO task 74).
 *
 * Stored in sessionStorage, not localStorage: it survives a refresh but belongs
 * to one tab, so two open tabs cannot overwrite each other's session and an old
 * session never reappears in a new tab days later. Every answer is already
 * saved permanently (localStorage) as it happens; this only holds "where was I".
 */
export const ACTIVE_SESSION_KEY = 'mathPractice.activeSession';
const SNAPSHOT_VERSION = 1;

export interface CardSnapshot {
  questionId: string;
  selectedAnswer: number | null;
  flipped: boolean;
}

export interface ActiveSessionSnapshot {
  version: number;
  /** The router location key of the session page; a new visit has a new key. */
  routeKey: string;
  config: SessionConfig;
  state: PracticeSessionState;
  card: CardSnapshot;
}

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveActiveSession(snapshot: Omit<ActiveSessionSnapshot, 'version'>): void {
  try {
    storage()?.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({ version: SNAPSHOT_VERSION, ...snapshot }),
    );
  } catch {
    // Not being able to resume after a refresh is not worth interrupting practice.
  }
}

export function clearActiveSession(): void {
  try {
    storage()?.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // Ignore.
  }
}

/** Every rule a snapshot must pass before it is trusted (spec 17: invalid stored data). */
export function isValidSnapshot(value: unknown): value is ActiveSessionSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const snap = value as Partial<ActiveSessionSnapshot>;
  const state = snap.state;
  const card = snap.card;
  if (snap.version !== SNAPSHOT_VERSION || typeof snap.routeKey !== 'string') return false;
  if (!isValidSessionConfig(snap.config) || !state || !card) return false;
  if (state.status !== 'active' || !isStoredSession(state.session)) return false;
  if (!Array.isArray(state.attempts) || !state.attempts.every(isValidAttempt)) return false;
  if (state.attempts.length !== state.session.attempted) return false;
  if (state.currentQuestionIndex !== state.session.attempted) return false;
  const question = state.currentQuestion;
  if (!question || questionProblems(question).length > 0) return false;
  if (card.questionId !== question.id || typeof card.flipped !== 'boolean') return false;
  if (card.selectedAnswer !== null && !question.choices.includes(card.selectedAnswer)) return false;
  if (card.flipped && card.selectedAnswer === null) return false;
  return true;
}

/**
 * The saved session for this visit of the session page, if any. A snapshot from
 * a different visit (another routeKey) or with different settings is discarded,
 * as is anything invalid.
 */
export function loadActiveSession(
  routeKey: string,
  config: SessionConfig,
): ActiveSessionSnapshot | null {
  let raw: string | null;
  try {
    raw = storage()?.getItem(ACTIVE_SESSION_KEY) ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const snapshot: unknown = JSON.parse(raw);
    if (
      isValidSnapshot(snapshot) &&
      snapshot.routeKey === routeKey &&
      JSON.stringify(snapshot.config) === JSON.stringify(config)
    ) {
      return snapshot;
    }
  } catch {
    // Fall through: corrupted snapshot.
  }
  clearActiveSession();
  return null;
}

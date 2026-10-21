/**
 * True when a key press is aimed at something the user is typing into, so
 * app-wide shortcuts must leave it alone (TODO task 66).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

/** True while a modal dialog is open; shortcuts must not act behind it. */
export function isModalOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null;
}

/** Index 0–3 for the number keys 1–4, or -1. Ignores presses with Ctrl, Alt or Cmd. */
export function answerShortcutIndex(event: KeyboardEvent): number {
  if (event.altKey || event.ctrlKey || event.metaKey) return -1;
  return ['1', '2', '3', '4'].indexOf(event.key);
}

let counter = 0;

/**
 * A unique id such as "q_3f2a…". Uses crypto.randomUUID when available
 * (it needs a secure context: https or localhost) and falls back otherwise.
 */
export function createId(prefix = 'id'): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}_${cryptoApi.randomUUID()}`;
  }
  counter += 1;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${counter.toString(36)}${random}`;
}

/**
 * An in-memory Storage for tests. It can simulate a storage quota (writes fail with a
 * QuotaExceededError once the total size would pass `quota` characters) and a broken
 * storage that throws on every call.
 */
export class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  quota: number;
  broken = false;
  writes = 0;

  constructor(initial: Record<string, unknown> = {}, quota = Infinity) {
    this.quota = quota;
    for (const [key, value] of Object.entries(initial)) {
      this.data.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  }

  get length() {
    return this.data.size;
  }

  private check() {
    if (this.broken) throw new DOMException('Storage is disabled', 'SecurityError');
  }

  clear() {
    this.check();
    this.data.clear();
  }

  getItem(key: string) {
    this.check();
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.check();
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.check();
    const used = [...this.data.entries()]
      .filter(([k]) => k !== key)
      .reduce((sum, [k, v]) => sum + k.length + v.length, 0);
    if (used + key.length + value.length > this.quota) {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    }
    this.writes += 1;
    this.data.set(key, String(value));
  }

  /** Parsed JSON stored under a key (test helper). */
  json(key: string): unknown {
    const raw = this.data.get(key);
    return raw === undefined ? undefined : JSON.parse(raw);
  }
}

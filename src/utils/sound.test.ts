/** The sound effect uses the Web Audio API, which jsdom lacks, so a small fake stands in. */

interface FakeNode {
  frequency?: { value: number };
  type?: string;
  connect: (n: FakeNode) => FakeNode;
  start?: (t: number) => void;
  stop?: (t: number) => void;
}

function installFakeAudio({ state = 'running', throwOnCreate = false } = {}) {
  const oscillators: FakeNode[] = [];
  const resume = vi.fn(() => Promise.resolve());
  class FakeAudioContext {
    state = state;
    currentTime = 0;
    destination = { connect: (n: FakeNode) => n };
    resume = resume;
    constructor() {
      if (throwOnCreate) throw new Error('not allowed');
    }
    createOscillator() {
      const node: FakeNode = {
        type: '',
        frequency: { value: 0 },
        connect: (n) => n,
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(node);
      return node;
    }
    createGain() {
      return {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: (n: FakeNode) => n,
      };
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  return { oscillators, resume };
}

async function freshSound() {
  vi.resetModules(); // the module caches its AudioContext
  return import('./sound');
}

afterEach(() => vi.unstubAllGlobals());

describe('playResultSound', () => {
  it('plays a rising three-note chime for a right answer', async () => {
    const { oscillators } = installFakeAudio();
    (await freshSound()).playResultSound(true);
    expect(oscillators.map((o) => Math.round(o.frequency!.value))).toEqual([523, 659, 784]);
    expect(oscillators.every((o) => o.type === 'sine')).toBe(true);
  });

  it('plays a soft falling two-note tone for a wrong answer', async () => {
    const { oscillators } = installFakeAudio();
    (await freshSound()).playResultSound(false);
    expect(oscillators.map((o) => Math.round(o.frequency!.value))).toEqual([392, 330]);
  });

  it('resumes audio the browser has suspended (autoplay rules)', async () => {
    const { resume } = installFakeAudio({ state: 'suspended' });
    (await freshSound()).playResultSound(true);
    expect(resume).toHaveBeenCalled();
  });

  it('does nothing, and never throws, when audio is unavailable or blocked', async () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => {
      void freshSound().then((m) => m.playResultSound(true));
    }).not.toThrow();
    installFakeAudio({ throwOnCreate: true });
    const { playResultSound } = await freshSound();
    expect(() => playResultSound(false)).not.toThrow();
  });
});

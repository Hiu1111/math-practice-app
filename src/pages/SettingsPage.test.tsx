import { screen, within } from '@testing-library/react';
import { createAppStore } from '../app/appStore';
import { STORAGE_KEYS } from '../services/storageService';
import { answerButton, answerQuestion, startSession } from '../test/practiceHelpers';
import { renderApp } from '../test/renderApp';
import { DEFAULT_SETTINGS, type AppSettings } from '../types';
import * as sound from '../utils/sound';

const savedSettings = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? 'null') as AppSettings | null;

const toggle = (name: RegExp) => screen.getByRole('switch', { name });

describe('settings page', () => {
  it('shows every setting from spec 6.7 with the current values', () => {
    renderApp('/settings');
    expect(toggle(/sound effects/i)).toHaveAttribute('aria-checked', 'false');
    expect(toggle(/card animation/i)).toHaveAttribute('aria-checked', 'true');
    expect(toggle(/show explanations/i)).toHaveAttribute('aria-checked', 'true');
    expect(toggle(/encouraging messages/i)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('group', { name: /default math/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /default level/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /default number of questions/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /master a mistake/i })).toHaveValue('3');
    expect(screen.getByRole('button', { name: /clear all application data/i })).toBeInTheDocument();
  });

  it('saves toggles automatically and keeps them after a "browser restart"', async () => {
    const { user, unmount } = renderApp('/settings');
    await user.click(toggle(/sound effects/i));
    await user.click(toggle(/card animation/i));
    expect(toggle(/sound effects/i)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Saved!')).toBeInTheDocument();
    expect(savedSettings()).toMatchObject({ soundEffects: true, cardAnimation: false });

    unmount();
    renderApp('/settings');
    expect(toggle(/sound effects/i)).toHaveAttribute('aria-checked', 'true');
    expect(toggle(/card animation/i)).toHaveAttribute('aria-checked', 'false');
  });

  it('switches work with the keyboard', async () => {
    const { user } = renderApp('/settings');
    toggle(/show explanations/i).focus();
    await user.keyboard(' ');
    expect(toggle(/show explanations/i)).toHaveAttribute('aria-checked', 'false');
    await user.keyboard('{Enter}');
    expect(toggle(/show explanations/i)).toHaveAttribute('aria-checked', 'true');
  });

  it('saves the default operations, level, length and mastery threshold', async () => {
    const { user } = renderApp('/settings');
    const ops = screen.getByRole('group', { name: /default math/i });
    await user.click(within(ops).getByRole('button', { name: /division/i }));
    await user.click(screen.getByRole('radio', { name: /advanced/i }));
    await user.click(screen.getByRole('radio', { name: /^20 questions/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /master a mistake/i }), '5');
    expect(savedSettings()).toMatchObject({
      defaultOperations: ['addition', 'division'],
      defaultDifficulty: 4,
      defaultSessionLength: 20,
      masteryThreshold: 5,
    });
  });

  it('does not allow the default operations to be empty', async () => {
    const { user } = renderApp('/settings');
    const ops = screen.getByRole('group', { name: /default math/i });
    await user.click(within(ops).getByRole('button', { name: /addition/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/keep at least one/i);
    expect(within(ops).getByRole('button', { name: /addition/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // "Clear all" (shown once everything is selected) is refused too.
    await user.click(within(ops).getByRole('button', { name: /mix them all/i }));
    await user.click(within(ops).getByRole('button', { name: /clear all/i }));
    for (const name of [/addition/i, /subtraction/i, /multiplication/i, /division/i]) {
      expect(within(ops).getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    }
    expect(savedSettings()?.defaultOperations).toHaveLength(4);
  });
});

describe('settings take effect', () => {
  it('the setup page starts from the saved defaults (task 49)', () => {
    createAppStore().updateSettings({
      defaultOperations: ['subtraction', 'multiplication'],
      defaultDifficulty: 3,
      defaultSessionLength: 'continuous',
    });
    renderApp('/practice/setup');
    const ops = screen.getByRole('group', { name: /pick your math/i });
    expect(within(ops).getByRole('button', { name: /subtraction/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(ops).getByRole('button', { name: /multiplication/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(ops).getByRole('button', { name: /addition/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('radio', { name: /intermediate/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /keep going/i })).toBeChecked();
  });

  it('changing choices for one session does not change the saved defaults', async () => {
    const { user } = renderApp('/practice/setup');
    await user.click(screen.getByRole('radio', { name: /advanced/i }));
    await user.click(screen.getByRole('button', { name: /start session/i }));
    expect(createAppStore().getState().settings.defaultDifficulty).toBe(
      DEFAULT_SETTINGS.defaultDifficulty,
    );
  });

  it('turning off card animation gives a static card', async () => {
    createAppStore().updateSettings({ cardAnimation: false });
    await startSession();
    expect(screen.getByTestId('question-card')).toHaveClass('flip-card--static');
  });

  it('turning off explanations hides them on the back of the card', async () => {
    createAppStore().updateSettings({ showExplanations: false });
    const { user } = await startSession();
    await user.click(answerButton(1));
    await user.click(screen.getByRole('button', { name: /flip card/i }));
    expect(document.querySelector('.explanation')).toBeNull();
  });

  it('turning off encouraging messages hides them', async () => {
    createAppStore().updateSettings({ feedbackMessages: false });
    const { user } = await startSession();
    await answerQuestion(user, true);
    expect(document.querySelector('.feedback')).toBeEmptyDOMElement();
  });

  it('plays a sound after each answer only when sound effects are on', async () => {
    const play = vi.spyOn(sound, 'playResultSound').mockImplementation(() => {});
    const first = await startSession();
    await answerQuestion(first.user, true);
    expect(play).not.toHaveBeenCalled();
    first.unmount();

    createAppStore().updateSettings({ soundEffects: true });
    const second = await startSession();
    await answerQuestion(second.user, false);
    expect(play).toHaveBeenCalledWith(false);
    play.mockRestore();
  });
});

describe('privacy information (task 86)', () => {
  it('tells families that progress stays in this browser and nothing personal is collected', () => {
    renderApp('/settings');
    expect(
      screen.getByText(/stored only in this browser\. clearing your browser data also erases it/i),
    ).toBeInTheDocument();
    const privacy = screen.getByRole('list', { name: 'Privacy' });
    expect(privacy).toHaveTextContent(/no name, email or other personal details/i);
    expect(privacy).toHaveTextContent(/never sent over the internet/i);
    expect(privacy).toHaveTextContent(/no ads and no tracking/i);
  });

  it('reminds students on every page that clearing browser data erases progress', () => {
    renderApp('/');
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      /saved only in this browser\. clearing your browser data will erase it/i,
    );
  });
});

describe('clear all application data', () => {
  it('requires a strongly worded confirmation', async () => {
    const { user } = renderApp('/settings');
    await user.click(screen.getByRole('button', { name: /clear all application data/i }));
    const dialog = screen.getByRole('dialog', { name: /erase everything/i });
    expect(dialog).toHaveTextContent(/permanently deletes all practice history/i);
    expect(dialog).toHaveTextContent(/cannot be undone/i);
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });

  it('erases settings, history and statistics, restores defaults and returns home', async () => {
    const seeded = await startSession();
    for (let i = 0; i < 5; i++) await answerQuestion(seeded.user, i > 0);
    seeded.unmount();
    createAppStore().updateSettings({ soundEffects: true, defaultDifficulty: 4 });

    const { user } = renderApp('/settings');
    await user.click(screen.getByRole('button', { name: /clear all application data/i }));
    await user.click(screen.getByRole('button', { name: /yes, erase everything/i }));

    expect(
      screen.getByRole('heading', { level: 1, name: /let's practice math/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/all app data has been erased/i);
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    const state = createAppStore().getState();
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.statistics.attempted).toBe(0);
  });
});

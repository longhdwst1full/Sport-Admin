import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPILOT_TURN_TIMEOUT_MS, withCopilotDeadline } from './copilot-request';

afterEach(() => vi.useRealTimers());
describe('Copilot whole-turn deadline', () => {
  it('rejects and aborts even when the network never settles', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = withCopilotDeadline((value) => { signal = value; return new Promise(() => undefined); });
    const assertion = expect(pending).rejects.toThrow('Trợ lý phản hồi quá lâu');
    await vi.advanceTimersByTimeAsync(COPILOT_TURN_TIMEOUT_MS);
    await assertion;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('clears the deadline timer after success', async () => {
    vi.useFakeTimers();
    expect(await withCopilotDeadline(() => Promise.resolve('done'))).toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves errors and clears its timer', async () => {
    vi.useFakeTimers();
    await expect(withCopilotDeadline(() => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
    expect(vi.getTimerCount()).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { createConcurrencyLimiter } from './concurrency';

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createConcurrencyLimiter', () => {
  it('runs at most `limit` tasks at once and starts queued ones in order', async () => {
    const limiter = createConcurrencyLimiter(2);
    const gates = [deferred(), deferred(), deferred()];
    const started: number[] = [];
    const results = gates.map((gate, index) =>
      limiter.run(async () => {
        started.push(index);
        await gate.promise;
        return index;
      }),
    );
    await tick();
    expect(started).toEqual([0, 1]);
    expect(limiter.queued).toBe(1);

    gates[1].resolve();
    await tick();
    expect(started).toEqual([0, 1, 2]);
    gates[0].resolve();
    gates[2].resolve();
    await expect(Promise.all(results)).resolves.toEqual([0, 1, 2]);
    expect(limiter.active).toBe(0);
  });

  it('frees the slot when a task fails', async () => {
    const limiter = createConcurrencyLimiter(1);
    await expect(limiter.run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(limiter.run(async () => 'ok')).resolves.toBe('ok');
  });

  it('drops a queued task whose signal aborts and never runs it', async () => {
    const limiter = createConcurrencyLimiter(1);
    const gate = deferred();
    const first = limiter.run(() => gate.promise);
    const controller = new AbortController();
    let ran = false;
    const second = limiter.run(async () => {
      ran = true;
    }, controller.signal);
    controller.abort();
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });
    gate.resolve();
    await first;
    expect(ran).toBe(false);
    expect(limiter.queued).toBe(0);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const limiter = createConcurrencyLimiter(1);
    const controller = new AbortController();
    controller.abort();
    await expect(limiter.run(async () => 1, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

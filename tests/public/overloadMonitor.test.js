import { createOverloadMonitor } from '../../src/public/js/overload-monitor.js';

describe('createOverloadMonitor', () => {
  test('starts and counts down an overload window', () => {
    const monitor = createOverloadMonitor({ graceSeconds: 3 });
    const first = monitor.trigger('test reason');
    expect(first.started).toBe(true);
    expect(first.remainingSeconds).toBe(3);
    const afterFirstStep = monitor.step();
    expect(afterFirstStep.remainingSeconds).toBe(2);
    expect(afterFirstStep.expired).toBe(false);
    monitor.step();
    const final = monitor.step();
    expect(final.remainingSeconds).toBe(0);
    expect(final.expired).toBe(true);
  });

  test('resolve clears active state and resets timer', () => {
    const monitor = createOverloadMonitor({ graceSeconds: 5 });
    monitor.trigger('anything');
    monitor.step();
    const cleared = monitor.resolve();
    expect(cleared).toBe(true);
    const state = monitor.getState();
    expect(state.active).toBe(false);
    expect(state.remainingSeconds).toBe(5);
    expect(state.reason).toBe('');
  });

  test('invalid grace seconds throw an error', () => {
    expect(() => createOverloadMonitor({ graceSeconds: 0 })).toThrow();
    expect(() => createOverloadMonitor({ graceSeconds: -10 })).toThrow();
    expect(() => createOverloadMonitor({ graceSeconds: Number.NaN })).toThrow();
  });
});

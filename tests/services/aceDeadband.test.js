// tests/services/aceDeadband.test.js
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createAceDeadbandTracker } from '../../src/public/js/ace-deadband.js';

describe('ACE deadband tracker', () => {
  let trackerFactory;

  // If you need some setup, you can do it here. In your original test,
  // createAceDeadbandTracker is already ready to use, so we just alias it.
  before(() => {
    trackerFactory = createAceDeadbandTracker;
  });

  it('keeps minor imbalances within tolerance over short windows', () => {
    const tracker = trackerFactory();
    let triggered = false;

    for (let i = 0; i < 60; i += 1) {
      const result = tracker.step(4);
      if (result.triggered) triggered = true;
    }

    assert.equal(triggered, false);
  });

  it('flags sustained small band violations after 90 seconds', () => {
    const tracker = trackerFactory();
    let triggeredAt = null;

    for (let i = 0; i < 95; i += 1) {
      const result = tracker.step(4);
      if (result.triggered && triggeredAt === null) {
        triggeredAt = i + 1;
      }
    }

    assert.equal(triggeredAt, 90);
  });

  it('flags large band violations quickly', () => {
    const tracker = trackerFactory();
    let triggeredAt = null;

    for (let i = 0; i < 35; i += 1) {
      const result = tracker.step(15);
      if (result.triggered && triggeredAt === null) {
        triggeredAt = i + 1;
      }
    }

    assert.equal(triggeredAt, 30);
  });
});

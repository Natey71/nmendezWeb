import assert from 'assert/strict';
import { createSupplyDemandToleranceTracker } from '../../src/public/js/supply-demand-tolerance.js';

describe('Supply/demand tolerance tracker', () => {
  it('keeps small mismatches within tolerance', () => {
    const tracker = createSupplyDemandToleranceTracker({
      bands: [
        { name: 'overs', direction: 'oversupply', thresholdPct: 0.1, duration: 30 }
      ]
    });

    let triggered = false;
    for (let i = 0; i < 120; i += 1) {
      const result = tracker.step({ demand: 100, supply: 105 });
      if (result.triggered) triggered = true;
    }

    assert.equal(triggered, false);
  });

  it('flags oversupply bands after the configured duration', () => {
    const tracker = createSupplyDemandToleranceTracker({
      bands: [
        { name: 'overs', direction: 'oversupply', thresholdPct: 0.1, duration: 5 }
      ]
    });

    let triggeredAt = null;
    for (let i = 0; i < 10; i += 1) {
      const result = tracker.step({ demand: 100, supply: 120 });
      if (result.triggered) {
        triggeredAt = i + 1;
        break;
      }
    }

    assert.equal(triggeredAt, 5);
  });

  it('rerolls tolerance percentages after returning to a safe state', () => {
    const rngValues = [0, 1];
    let idx = 0;
    const tracker = createSupplyDemandToleranceTracker({
      random: () => {
        const value = rngValues[idx % rngValues.length];
        idx += 1;
        return value;
      },
      bands: [
        { name: 'overs', direction: 'oversupply', minPct: 0.13, maxPct: 0.18, duration: 3 }
      ]
    });

    tracker.step({ demand: 100, supply: 115 });
    tracker.step({ demand: 100, supply: 115 });
    tracker.step({ demand: 100, supply: 100 });

    let triggered = false;
    for (let i = 0; i < 4; i += 1) {
      const result = tracker.step({ demand: 100, supply: 115 });
      if (result.triggered) triggered = true;
    }

    assert.equal(triggered, false);
  });

  it('tracks deficit bands independently', () => {
    const tracker = createSupplyDemandToleranceTracker({
      bands: [
        { name: 'deficit', direction: 'undersupply', thresholdPct: 0.08, duration: 4 }
      ]
    });

    let triggeredAt = null;
    for (let i = 0; i < 6; i += 1) {
      const result = tracker.step({ demand: 100, supply: 85 });
      if (result.triggered && triggeredAt === null) triggeredAt = i + 1;
    }

    assert.equal(triggeredAt, 4);
  });

  it('respects guard functions on oversupply bands', () => {
    const tracker = createSupplyDemandToleranceTracker({
      bands: [
        {
          name: 'overs',
          direction: 'oversupply',
          thresholdPct: 0.05,
          duration: 3,
          guard: ({ context }) => Boolean(context?.batteriesFull)
        }
      ]
    });

    for (let i = 0; i < 5; i += 1) {
      const result = tracker.step({ demand: 100, supply: 120, context: { batteriesFull: false } });
      assert.equal(result.triggered, false);
    }

    let triggered = false;
    for (let i = 0; i < 3; i += 1) {
      const result = tracker.step({ demand: 100, supply: 120, context: { batteriesFull: true } });
      if (result.triggered) triggered = true;
    }

    assert.equal(triggered, true);
  });
});

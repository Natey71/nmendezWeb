// tests/services/powerGridScoring.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scorePowerGridRun } from '../../src/services/powerGridScoring.js';

describe('scorePowerGridRun', () => {
  const baseFrame = {
    tick: 1,
    demand: 50,
    supply: 50,
    price: 300,
    freq: 60,
    tickHours: 1 / 3600,
    fuelMultipliers: { coal: 1, gas: 1 },
    generators: [
      {
        id: 'coal-1',
        fuel: 'coal',
        cap: 60,
        actual: 50,
        on: true,
        enabled: true,
        variable: false,
        fault: false,
        isBattery: false,
        opex: 55,
        co2: 900,
      },
    ],
  };

  it('computes a leaderboard entry from telemetry frames', () => {
    const run = {
      version: 1,
      difficulty: 'normal',
      frames: [
        baseFrame,
        { ...baseFrame, tick: 2 },
      ],
    };

    const result = scorePowerGridRun({ name: '  Alice  ', run });

    assert.deepEqual(result, {
      name: 'Alice',
      score: 24886,
      profit: -102,
      uptime: 100,
      emissions: 0,
    });
  });

  it('rejects telemetry where reported supply and generator output diverge', () => {
    const tampered = {
      version: 1,
      difficulty: 'normal',
      frames: [
        {
          ...baseFrame,
          supply: 120, // does not match generators
        },
      ],
    };

    assert.throws(
      () => scorePowerGridRun({ name: 'Bob', run: tampered }),
      /Supply telemetry does not match generator outputs\./,
    );
  });

  it('rejects submissions with no telemetry frames', () => {
    const emptyRun = {
      version: 1,
      difficulty: 'normal',
      frames: [],
    };

    assert.throws(
      () => scorePowerGridRun({ name: 'Carol', run: emptyRun }),
      /Telemetry frames are required\./,
    );
  });
});

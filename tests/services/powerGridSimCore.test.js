// tests/services/powerGridSimCore.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { finalizeSupplyDemandBalance } from '../../src/public/js/power-grid-sim-core.js';

describe('power-grid sim core', () => {
  it('reduces renewables during storms and flags the resulting deficit in the same tick', () => {
    const windStart = 30;
    const solarStart = 25;

    const generators = [
      { fuel: 'wind', actual: windStart },
      { fuel: 'solar', actual: solarStart },
      { fuel: 'gas', actual: 20 },
    ];

    const events = [{ type: 'storm' }];

    const batteryDispatchCalls = [];
    const batteryDispatch = (delta) => {
      batteryDispatchCalls.push(delta);
      return 0; // no actual battery help in this scenario
    };

    const result = finalizeSupplyDemandBalance({
      demand: 70,
      generators,
      events,
      reserveMW: 12,
      batteryDispatch,
    });

    const expectedWind = Math.round(windStart * 0.55);
    const expectedSolar = Math.round(solarStart * 0.7);

    assert.equal(generators[0].actual, expectedWind);
    assert.equal(generators[1].actual, expectedSolar);

    const expectedPreDispatchSupply = expectedWind + expectedSolar + 20;
    assert.equal(result.preDispatchSupply, expectedPreDispatchSupply);

    assert.equal(batteryDispatchCalls.length, 1);
    assert.deepEqual(
      batteryDispatchCalls[0],
      [expectedPreDispatchSupply - result.demand],
    );

    assert.equal(result.demand, 70);
    assert.ok(result.deficit > 0);
    assert.equal(result.oversupplyBeyondReserve, 0);

    const unsafe = result.deficit > 0 || result.oversupplyBeyondReserve > 0;
    assert.equal(unsafe, true);
  });
});

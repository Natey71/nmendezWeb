// tests/services/reserveRequirement.test.js
import assert from 'assert/strict';
import { computeReserveRequirement } from '../../src/public/js/reserve-requirement.js';

describe('computeReserveRequirement', () => {
  const generators = [
    { on: true, enabled: true, fault: false, cap: 30 },
    { on: true, enabled: true, fault: false, cap: 25 },
    { on: true, enabled: true, fault: false, cap: 20 },
  ];

  it('covers the largest contingency when headroom permits', () => {
    const reserve = computeReserveRequirement({
      adjustedDemand: 50,
      generators,
    });
    assert.equal(reserve, 23);
  });

  it('honors forecast ramps when future demand rises sharply', () => {
    const reserve = computeReserveRequirement({
      adjustedDemand: 40,
      generators,
      forecastDemandFn: (offset) => (offset === 60 ? 70 : 40),
    });
    assert.equal(reserve, 30);
  });

  it('caps reserve to available headroom when supply is tight', () => {
    const tightGenerators = [
      { on: true, enabled: true, fault: false, cap: 25 },
      { on: true, enabled: true, fault: false, cap: 20 },
    ];

    const reserve = computeReserveRequirement({
      adjustedDemand: 40,
      generators: tightGenerators,
      forecastDemandFn: () => 80,
    });

    assert.equal(reserve, 5);
  });
});

const path = require('path');
const fs = require('fs');

describe('computeReserveRequirement', () => {
  let computeReserveRequirement;

  beforeAll(() => {
    const modulePath = path.join(__dirname, '../../src/public/js/reserve-requirement.js');
    let code = fs.readFileSync(modulePath, 'utf8');
    code = code.replace(/export\s+function\s+/g, 'function ');
    code += '\nmodule.exports = { computeReserveRequirement };';
    const moduleObj = { exports: {} };
    const wrapper = new Function('module', 'exports', code);
    wrapper(moduleObj, moduleObj.exports);
    ({ computeReserveRequirement } = moduleObj.exports);
  });

  const generators = [
    { on: true, enabled: true, fault: false, cap: 30 },
    { on: true, enabled: true, fault: false, cap: 25 },
    { on: true, enabled: true, fault: false, cap: 20 }
  ];

  it('covers the largest contingency when headroom permits', () => {
    const reserve = computeReserveRequirement({
      adjustedDemand: 50,
      generators
    });
    expect(reserve).toBe(23);
  });

  it('honors forecast ramps when future demand rises sharply', () => {
    const reserve = computeReserveRequirement({
      adjustedDemand: 40,
      generators,
      forecastDemandFn: (offset) => (offset === 60 ? 70 : 40)
    });
    expect(reserve).toBe(30);
  });

  it('caps reserve to available headroom when supply is tight', () => {
    const tightGenerators = [
      { on: true, enabled: true, fault: false, cap: 25 },
      { on: true, enabled: true, fault: false, cap: 20 }
    ];
    const reserve = computeReserveRequirement({
      adjustedDemand: 40,
      generators: tightGenerators,
      forecastDemandFn: () => 80
    });
    expect(reserve).toBe(5);
  });
});

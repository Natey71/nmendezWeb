const path = require('path');
const fs = require('fs');

const modulePath = path.join(
  __dirname,
  '../../src/public/js/power-grid-sim-core.js'
);

function loadModuleExports() {
  let code = fs.readFileSync(modulePath, 'utf8');
  code = code.replace(/export\s+function\s+/g, 'function ');
  code +=
    '\nmodule.exports = { applyEventAdjustments, finalizeSupplyDemandBalance };';

  const moduleExports = {};
  const moduleObj = { exports: moduleExports };
  const wrapper = new Function('module', 'exports', code);
  wrapper(moduleObj, moduleExports);
  return moduleObj.exports;
}

describe('power-grid sim core', () => {
  it('reduces renewables during storms and flags the resulting deficit in the same tick', async () => {
    const { finalizeSupplyDemandBalance } = loadModuleExports();

    const windStart = 30;
    const solarStart = 25;
    const generators = [
      { fuel: 'wind', actual: windStart },
      { fuel: 'solar', actual: solarStart },
      { fuel: 'gas', actual: 20 }
    ];
    const events = [{ type: 'storm' }];
    const batteryDispatch = jest.fn().mockReturnValue(0);

    const result = finalizeSupplyDemandBalance({
      demand: 70,
      generators,
      events,
      reserveMW: 12,
      batteryDispatch
    });

    const expectedWind = Math.round(windStart * 0.55);
    const expectedSolar = Math.round(solarStart * 0.7);
    expect(generators[0].actual).toBe(expectedWind);
    expect(generators[1].actual).toBe(expectedSolar);

    const expectedPreDispatchSupply = expectedWind + expectedSolar + 20;
    expect(result.preDispatchSupply).toBe(expectedPreDispatchSupply);
    expect(batteryDispatch).toHaveBeenCalledTimes(1);
    expect(batteryDispatch).toHaveBeenCalledWith(
      expectedPreDispatchSupply - result.demand
    );

    expect(result.demand).toBe(70);
    expect(result.deficit).toBeGreaterThan(0);
    expect(result.oversupplyBeyondReserve).toBe(0);

    const unsafe = result.deficit > 0 || result.oversupplyBeyondReserve > 0;
    expect(unsafe).toBe(true);
  });
});

const fs = require('fs');
const path = require('path');

let scorePowerGridRun;

beforeAll(() => {
  const modulePath = path.join(__dirname, '../../src/services/powerGridScoring.js');
  let code = fs.readFileSync(modulePath, 'utf8');
  code = code.replace(/export\s+function\s+scorePowerGridRun/g, 'function scorePowerGridRun');
  code += '\nmodule.exports = { scorePowerGridRun };';
  const moduleObj = { exports: {} };
  const wrapper = new Function('module', 'exports', 'require', code);
  wrapper(moduleObj, moduleObj.exports, require);
  ({ scorePowerGridRun } = moduleObj.exports);
});

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

  test('computes a leaderboard entry from telemetry frames', () => {
    const run = {
      version: 1,
      difficulty: 'normal',
      frames: [
        baseFrame,
        { ...baseFrame, tick: 2 },
      ],
    };

    const result = scorePowerGridRun({ name: '  Alice  ', run });

    expect(result).toEqual({
      name: 'Alice',
      score: 24886,
      profit: -102,
      uptime: 100,
      emissions: 0,
    });
  });

  test('rejects telemetry where reported supply and generator output diverge', () => {
    const tampered = {
      version: 1,
      difficulty: 'normal',
      frames: [
        {
          ...baseFrame,
          supply: 120,
        },
      ],
    };

    expect(() => scorePowerGridRun({ name: 'Bob', run: tampered })).toThrow('Supply telemetry does not match generator outputs.');
  });

  test('rejects submissions with no telemetry frames', () => {
    const emptyRun = {
      version: 1,
      difficulty: 'normal',
      frames: [],
    };

    expect(() => scorePowerGridRun({ name: 'Carol', run: emptyRun })).toThrow('Telemetry frames are required.');
  });
});

const path = require('path');
const fs = require('fs');

describe('ACE deadband tracker', () => {
  let createAceDeadbandTracker;

  beforeAll(() => {
    const modulePath = path.join(__dirname, '../../src/public/js/ace-deadband.js');
    let code = fs.readFileSync(modulePath, 'utf8');
    code = code.replace(/export\s+function\s+/g, 'function ');
    code += '\nmodule.exports = { createAceDeadbandTracker };';
    const moduleObj = { exports: {} };
    const wrapper = new Function('module', 'exports', code);
    wrapper(moduleObj, moduleObj.exports);
    ({ createAceDeadbandTracker } = moduleObj.exports);
  });

  it('keeps minor imbalances within tolerance over short windows', () => {
    const tracker = createAceDeadbandTracker();
    let triggered = false;
    for (let i = 0; i < 60; i += 1) {
      const result = tracker.step(4);
      if (result.triggered) triggered = true;
    }
    expect(triggered).toBe(false);
  });

  it('flags sustained small band violations after 90 seconds', () => {
    const tracker = createAceDeadbandTracker();
    let triggeredAt = null;
    for (let i = 0; i < 95; i += 1) {
      const result = tracker.step(4);
      if (result.triggered && triggeredAt === null) {
        triggeredAt = i + 1;
      }
    }
    expect(triggeredAt).toBe(90);
  });

  it('flags large band violations quickly', () => {
    const tracker = createAceDeadbandTracker();
    let triggeredAt = null;
    for (let i = 0; i < 35; i += 1) {
      const result = tracker.step(15);
      if (result.triggered && triggeredAt === null) {
        triggeredAt = i + 1;
      }
    }
    expect(triggeredAt).toBe(30);
  });
});

import assert from 'assert/strict';
import { computeBatterySaturation, isBatteryFleetFull, clampEnergy } from '../../src/public/js/battery-state.js';

describe('battery-state helpers', () => {
  it('clamps individual battery energy safely', () => {
    assert.equal(clampEnergy(-5, 10), 0);
    assert.equal(clampEnergy(5, 10), 5);
    assert.equal(clampEnergy(15, 10), 10);
    assert.equal(clampEnergy(5, -10), 0);
  });

  it('computes aggregate saturation metrics', () => {
    const snapshot = computeBatterySaturation([
      { isBattery: true, energy: 25, energyMax: 50 },
      { isBattery: true, energy: 60, energyMax: 75 }
    ]);
    assert.equal(snapshot.hasBatteries, true);
    assert.equal(snapshot.batteryCount, 2);
    assert.equal(snapshot.capacity, 125);
    assert.equal(snapshot.stored, 85);
    assert.equal(snapshot.headroom, 40);
    assert.equal(Number(snapshot.ratio.toFixed(4)), 0.68);
  });

  it('determines when the fleet is effectively full', () => {
    const snapshot = computeBatterySaturation([
      { isBattery: true, energy: 95, energyMax: 100 }
    ]);
    assert.equal(isBatteryFleetFull(snapshot, { threshold: 0.9 }), true);
    assert.equal(isBatteryFleetFull(snapshot, { threshold: 0.99 }), false);
    assert.equal(isBatteryFleetFull([], { threshold: 0.9 }), false);
  });
});

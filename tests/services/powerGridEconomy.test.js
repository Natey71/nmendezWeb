import {
  CUSTOMER_MARKUP_RATE,
  createFuelSpendTracker,
  recordFuelSpend,
  resetFuelSpendTracker,
  computeCustomerPayment
} from '../../src/public/js/power-grid-economy.js';

describe('power grid economy helpers', () => {
  test('records gas and coal spends separately', () => {
    const tracker = createFuelSpendTracker();
    recordFuelSpend(tracker, 'gas', 100);
    recordFuelSpend(tracker, 'coal', 50);
    recordFuelSpend(tracker, 'solar', 999); // ignored
    expect(tracker).toEqual({ gas: 100, coal: 50 });
    resetFuelSpendTracker(tracker);
    expect(tracker).toEqual({ gas: 0, coal: 0 });
  });

  test('computes customer payment only when active customers exist', () => {
    const tracker = createFuelSpendTracker();
    recordFuelSpend(tracker, 'gas', 200);
    recordFuelSpend(tracker, 'coal', 100);
    const expected = (200 + 100) * (1 + CUSTOMER_MARKUP_RATE);
    expect(computeCustomerPayment({ tracker, activeCustomers: 3 })).toBe(expected);
    expect(computeCustomerPayment({ tracker, activeCustomers: 0 })).toBe(0);
  });

  test('allows overriding markup for future balancing needs', () => {
    const tracker = { gas: 10, coal: 10 };
    const payment = computeCustomerPayment({ tracker, activeCustomers: 1, markup: 0.5 });
    expect(payment).toBeCloseTo(20 * 1.5);
  });
});

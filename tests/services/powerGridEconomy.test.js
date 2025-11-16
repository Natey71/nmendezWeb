import {
  CUSTOMER_MARKUP_RATE,
  createFuelSpendTracker,
  recordFuelSpend,
  resetFuelSpendTracker,
  computeCustomerPayment,
  computeReputationIncomeMultiplier,
  computeCustomerLoadPenalty
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
    const result = computeCustomerPayment({ tracker, activeCustomers: 3 });
    expect(result.amount).toBe(expected);
    expect(result.markup).toBeCloseTo(CUSTOMER_MARKUP_RATE);
    expect(computeCustomerPayment({ tracker, activeCustomers: 0 })).toEqual({ amount: 0, markup: 0, customerCount: 0 });
  });

  test('allows overriding markup for future balancing needs', () => {
    const tracker = { gas: 10, coal: 10 };
    const billing = computeCustomerPayment({ tracker, activeCustomers: 1, markup: 0.5 });
    expect(billing.amount).toBeCloseTo(20 * 1.5);
    expect(billing.markup).toBeCloseTo(0.5);
  });

  test('applies class-specific pricing tiers with peak adjustments', () => {
    const tracker = createFuelSpendTracker();
    recordFuelSpend(tracker, 'gas', 100);
    const customers = [
      { klass: 'residential-block', connected: true },
      { klass: 'retail', connected: true },
      { klass: 'datacenter', connected: true },
      { klass: 'crypto', connected: true },
      { klass: 'retail', connected: false }
    ];
    const peakResult = computeCustomerPayment({ tracker, customers, hourIndex: 18 });
    const expectedPeakMarkup = (0.04 + 0.11 + 0.16 + 0.35) / 4;
    expect(peakResult.markup).toBeCloseTo(expectedPeakMarkup);
    expect(peakResult.amount).toBeCloseTo(100 * (1 + expectedPeakMarkup));

    const offPeakResult = computeCustomerPayment({ tracker, customers, hourIndex: 10 });
    const expectedOffPeakMarkup = (0.04 + 0.08 + 0.11 + 0.25) / 4;
    expect(offPeakResult.markup).toBeCloseTo(expectedOffPeakMarkup);
  });

  test('reputation multipliers reward higher reputation while never going negative', () => {
    expect(computeReputationIncomeMultiplier(-10)).toBeCloseTo(0.8);
    expect(computeReputationIncomeMultiplier(50)).toBeCloseTo(1.3);
    expect(computeReputationIncomeMultiplier(110)).toBeCloseTo(1.9);
  });

  test('customer load penalties scale with contract size and remain bounded', () => {
    expect(computeCustomerLoadPenalty(2)).toBeCloseTo(0.5);
    expect(computeCustomerLoadPenalty(30)).toBeCloseTo(3);
    expect(computeCustomerLoadPenalty(500)).toBeCloseTo(12);
  });
});

const DEFAULT_TRACKER = Object.freeze({ gas: 0, coal: 0 });
export const CUSTOMER_MARKUP_RATE = 0.2;

function toSafeNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
}

export function createFuelSpendTracker() {
        return { gas: 0, coal: 0 };
}

export function recordFuelSpend(tracker, fuelType, amount) {
        const target = tracker || createFuelSpendTracker();
        const normalized = Math.max(0, toSafeNumber(amount));
        if (normalized <= 0) return target;
        if (fuelType === 'gas') {
                target.gas += normalized;
        } else if (fuelType === 'coal') {
                target.coal += normalized;
        }
        return target;
}

export function resetFuelSpendTracker(tracker) {
        if (!tracker) return createFuelSpendTracker();
        tracker.gas = 0;
        tracker.coal = 0;
        return tracker;
}

export function computeCustomerPayment({ tracker = DEFAULT_TRACKER, activeCustomers = 0, markup = CUSTOMER_MARKUP_RATE } = {}) {
        const gasCost = Math.max(0, toSafeNumber(tracker?.gas));
        const coalCost = Math.max(0, toSafeNumber(tracker?.coal));
        const costBasis = gasCost + coalCost;
        const customerCount = Math.max(0, toSafeNumber(activeCustomers));
        if (costBasis <= 0 || customerCount <= 0) {
                return 0;
        }
        const safeMarkup = Math.max(0, toSafeNumber(markup));
        return costBasis * (1 + safeMarkup);
}

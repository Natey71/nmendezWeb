const DEFAULT_TRACKER = Object.freeze({ gas: 0, coal: 0 });
export const CUSTOMER_MARKUP_RATE = 0.2;

export const CUSTOMER_CLASS_MARKUPS = Object.freeze({
        residential: Object.freeze({ offPeak: 0.04, peak: 0.04 }),
        retail: Object.freeze({ offPeak: 0.08, peak: 0.11 }),
        datacenter: Object.freeze({ offPeak: 0.11, peak: 0.16 }),
        crypto: Object.freeze({ offPeak: 0.25, peak: 0.35 }),
});

const CUSTOMER_CLASS_BY_KLASS = Object.freeze({
        'residential-block': 'residential',
        residential: 'residential',
        town: 'residential',
        retail: 'retail',
        office: 'retail',
        factory: 'retail',
        datacenter: 'datacenter',
        'data-center': 'datacenter',
        crypto: 'crypto',
});

const PEAK_HOURS = Object.freeze({ start: 17, end: 22 });

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

export function computeCustomerPayment({
        tracker = DEFAULT_TRACKER,
        customers = [],
        activeCustomers = 0,
        hourIndex = 0,
        markup = CUSTOMER_MARKUP_RATE,
} = {}) {
        const gasCost = Math.max(0, toSafeNumber(tracker?.gas));
        const coalCost = Math.max(0, toSafeNumber(tracker?.coal));
        const costBasis = gasCost + coalCost;
        if (costBasis <= 0) {
                return { amount: 0, markup: 0, customerCount: 0 };
        }

        const connectedCustomers = Array.isArray(customers)
                ? customers.filter((customer) => customer && customer.connected !== false)
                : [];

        const fallbackCustomerCount = Math.max(0, toSafeNumber(activeCustomers));
        const customerCount = connectedCustomers.length || fallbackCustomerCount;
        if (customerCount <= 0) {
                return { amount: 0, markup: 0, customerCount: 0 };
        }

        const fallbackMarkup = Math.max(0, toSafeNumber(markup));
        const peak = isPeakHour(hourIndex);
        const appliedMarkup = connectedCustomers.length
                ? averageMarkupForCustomers({ customers: connectedCustomers, peak, fallbackMarkup })
                : fallbackMarkup;

        const amount = costBasis * (1 + appliedMarkup);
        return { amount, markup: appliedMarkup, customerCount };
}

export function isPeakHour(hourIndex) {
        const hour = Number.isFinite(hourIndex) ? hourIndex : 0;
        const normalized = ((hour % 24) + 24) % 24;
        const start = PEAK_HOURS.start;
        const end = PEAK_HOURS.end;
        return normalized >= start && normalized < end;
}

function averageMarkupForCustomers({ customers, peak, fallbackMarkup }) {
        if (!customers || customers.length === 0) {
                return fallbackMarkup;
        }
        const total = customers.reduce(
                (sum, customer) => sum + markupForCustomer(customer, { peak, fallback: fallbackMarkup }),
                0
        );
        return total / customers.length;
}

function markupForCustomer(customer, { peak, fallback = CUSTOMER_MARKUP_RATE } = {}) {
        const klassKey = typeof customer?.klass === 'string' ? customer.klass.toLowerCase() : '';
        const normalizedClass = CUSTOMER_CLASS_BY_KLASS[klassKey];
        if (!normalizedClass) {
                return fallback;
        }
        const config = CUSTOMER_CLASS_MARKUPS[normalizedClass];
        if (!config) {
                return fallback;
        }
        const rate = peak ? config.peak : config.offPeak;
        return Math.max(0, toSafeNumber(rate));
}

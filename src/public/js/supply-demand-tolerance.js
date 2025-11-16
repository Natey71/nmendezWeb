export function createSupplyDemandToleranceTracker({
  baseTolerancePct = 0,
  bands = [],
  random = Math.random
} = {}) {
  if (!Array.isArray(bands) || bands.length === 0) {
    throw new Error('createSupplyDemandToleranceTracker requires at least one band');
  }

  const states = bands.map((band) => ({
    config: {
      direction: band.direction || 'any',
      minPct: band.minPct,
      maxPct: band.maxPct,
      thresholdPct: band.thresholdPct,
      name: band.name,
      duration: band.duration,
      guard: typeof band.guard === 'function' ? band.guard : null
    },
    timer: 0,
    currentThreshold: 0
  }));

  function rollThreshold(state) {
    const { thresholdPct, minPct, maxPct } = state.config;
    if (typeof thresholdPct === 'number') return thresholdPct;

    const hasMin = typeof minPct === 'number';
    const hasMax = typeof maxPct === 'number';

    if (!hasMin && !hasMax) return 0;

    const low = hasMin ? minPct : maxPct;
    const high = hasMax ? maxPct : minPct;

    if (low === undefined && high === undefined) return 0;

    const lo = Math.min(low ?? 0, high ?? 0);
    const hi = Math.max(low ?? 0, high ?? 0);

    if (lo === hi) return lo;

    return lo + random() * (hi - lo);
  }

  function resetBand(state) {
    state.timer = 0;
    state.currentThreshold = rollThreshold(state);
  }

  function reset() {
    states.forEach((state) => resetBand(state));
  }

  function magnitudeForDirection(direction, mismatchRatio) {
    if (direction === 'oversupply') return Math.max(0, mismatchRatio);
    if (direction === 'undersupply') return Math.max(0, -mismatchRatio);
    return Math.abs(mismatchRatio);
  }

  function step({ demand = 0, supply = 0, context = {} } = {}) {
    const safeDemand = demand > 0 ? demand : 1;
    const mismatchRatio = (supply - demand) / safeDemand;

    let triggeredState = null;

    states.forEach((state) => {
      const { direction = 'any', duration, name, guard } = state.config;
      const magnitude = magnitudeForDirection(direction, mismatchRatio);
      const threshold = Math.max(baseTolerancePct, state.currentThreshold || 0);
      const outsideBand = magnitude >= threshold;

      if (typeof guard === 'function') {
        const guardPayload = {
          demand,
          supply,
          mismatchRatio,
          magnitude,
          direction: mismatchRatio >= 0 ? 'oversupply' : 'undersupply',
          bandDirection: direction,
          context
        };
        const allowed = guard(guardPayload);
        if (!allowed) {
          if (state.timer !== 0 || !Number.isFinite(state.currentThreshold)) {
            resetBand(state);
          }
          return;
        }
      }

      if (outsideBand) {
        state.timer += 1;
        if (!triggeredState && state.timer >= duration) {
          triggeredState = {
            name,
            duration,
            direction,
            thresholdPct: threshold,
            secondsOutside: state.timer,
            magnitudePct: magnitude
          };
        }
      } else if (state.timer !== 0 || !Number.isFinite(state.currentThreshold)) {
        resetBand(state);
      }
    });

    return {
      triggered: Boolean(triggeredState),
      activeLevel: triggeredState,
      secondsOutside: triggeredState?.secondsOutside || 0,
      mismatchRatio,
      direction: mismatchRatio >= 0 ? 'oversupply' : 'deficit',
      magnitudePct: Math.abs(mismatchRatio)
    };
  }

  reset();

  return { step, reset };
}

export default { createSupplyDemandToleranceTracker };

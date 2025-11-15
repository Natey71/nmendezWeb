function sumOnlineCapacity(generators = []) {
  return generators.reduce((total, gen) => {
    if (!gen) return total;
    if (gen.isBattery) {
      if (gen.enabled === false) return total;
      const usable = Math.max(0, Number(gen.cap) || 0);
      return total + usable;
    }

    const isOnline = gen.on && gen.enabled !== false && !gen.fault;
    if (!isOnline) return total;

    if (gen.variable) {
      return total + Math.max(0, Number(gen.actual) || 0);
    }

    return total + Math.max(0, Number(gen.cap) || 0);
  }, 0);
}

function largestContingency(generators = []) {
  return generators.reduce((largest, gen) => {
    if (!gen || gen.isBattery) return largest;
    const isOnline = gen.on && gen.enabled !== false && !gen.fault;
    if (!isOnline) return largest;

    const capacity = gen.variable
      ? Math.max(0, Number(gen.actual) || 0)
      : Math.max(0, Number(gen.cap) || 0);

    return Math.max(largest, capacity);
  }, 0);
}

function forecastRamp({ adjustedDemand = 0, forecastDemandFn, rampOffsets = [30, 60, 90] }) {
  if (typeof forecastDemandFn !== 'function') return 0;

  return rampOffsets.reduce((maxRamp, offset) => {
    const futureDemand = forecastDemandFn(offset);
    if (!Number.isFinite(futureDemand)) return maxRamp;
    const ramp = Math.max(0, futureDemand - adjustedDemand);
    return Math.max(maxRamp, ramp);
  }, 0);
}

export function computeReserveRequirement({
  adjustedDemand = 0,
  generators = [],
  forecastDemandFn,
  baseReserveRatio = 0.12,
  contingencyFactor = 0.75,
  rampOffsets,
  headroomFloor = 0
} = {}) {
  const sanitizedDemand = Math.max(0, Number(adjustedDemand) || 0);
  const onlineCapacity = sumOnlineCapacity(generators);
  const contingency = largestContingency(generators) * contingencyFactor;
  const ramp = forecastRamp({ adjustedDemand: sanitizedDemand, forecastDemandFn, rampOffsets });

  const baseRequirement = sanitizedDemand * baseReserveRatio;
  const theoretical = Math.max(baseRequirement, contingency, ramp, headroomFloor);

  const availableHeadroom = Math.max(0, onlineCapacity - sanitizedDemand);
  const reserve = Math.min(Math.round(theoretical), Math.round(availableHeadroom));

  return Math.max(0, reserve);
}

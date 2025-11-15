export function applyEventAdjustments({ demand, generators = [], events = [] }) {
  let adjustedDemand = demand;
  for (const ev of events) {
    if (!ev || !ev.type) continue;
    if (ev.type === 'storm') {
      for (const gen of generators) {
        if (!gen) continue;
        if (gen.fuel === 'wind') {
          gen.actual = Math.round((gen.actual || 0) * 0.55);
        }
        if (gen.fuel === 'solar') {
          gen.actual = Math.round((gen.actual || 0) * 0.7);
        }
      }
    } else if (ev.type === 'heat') {
      adjustedDemand *= 1.08;
    }
  }
  return Math.round(adjustedDemand);
}

export function finalizeSupplyDemandBalance({
  demand,
  generators = [],
  events = [],
  reservePct = 0,
  reserveMW,
  batteryDispatch
}) {
  const adjustedDemand = applyEventAdjustments({ demand, generators, events });
  const preDispatchSupply = generators.reduce(
    (sum, gen) => sum + Math.max(0, gen?.actual || 0),
    0
  );
  const imbalanceBeforeStorage = preDispatchSupply - adjustedDemand;

  let batteryDelta = 0;
  if (typeof batteryDispatch === 'function') {
    batteryDelta = batteryDispatch(imbalanceBeforeStorage) || 0;
  }

  const supply = preDispatchSupply + batteryDelta;
  const rawBalance = supply - adjustedDemand;
  const oversupply = Math.max(0, rawBalance);
  const reserveTarget = Number.isFinite(reserveMW)
    ? Math.max(0, Math.round(reserveMW))
    : Math.max(0, Math.round(adjustedDemand * reservePct));
  const oversupplyBeyondReserve = Math.max(0, oversupply - reserveTarget);
  const deficit = adjustedDemand - supply;

  return {
    demand: adjustedDemand,
    supply,
    batteryDelta,
    rawBalance,
    oversupply,
    reserveMW: reserveTarget,
    oversupplyBeyondReserve,
    deficit,
    imbalanceBeforeStorage,
    preDispatchSupply
  };
}

export function clampEnergy(value = 0, max = 0) {
  const safeMax = Number.isFinite(max) ? Math.max(0, max) : 0;
  const safeValue = Number.isFinite(value) ? value : 0;
  if (safeMax === 0) return 0;
  if (safeValue < 0) return 0;
  if (safeValue > safeMax) return safeMax;
  return safeValue;
}

export function computeBatterySaturation(generators = []) {
  const batteries = Array.isArray(generators)
    ? generators.filter((gen) => gen && gen.isBattery)
    : [];

  let capacity = 0;
  let stored = 0;

  for (const battery of batteries) {
    const max = Number.isFinite(battery?.energyMax) ? Math.max(0, battery.energyMax) : 0;
    const energy = clampEnergy(battery?.energy, max);
    capacity += max;
    stored += energy;
  }

  const ratio = capacity > 0 ? stored / capacity : 0;
  const headroom = Math.max(0, capacity - stored);

  return {
    batteryCount: batteries.length,
    capacity,
    stored,
    headroom,
    ratio,
    hasBatteries: batteries.length > 0 && capacity > 0
  };
}

export function isBatteryFleetFull(input, { threshold = 0.98 } = {}) {
  const snapshot = Array.isArray(input) || !input
    ? computeBatterySaturation(input)
    : input;
  const normalizedThreshold = Math.min(1, Math.max(0, Number.isFinite(threshold) ? threshold : 0.98));
  if (!snapshot?.hasBatteries) return false;
  return snapshot.ratio >= normalizedThreshold;
}

export default { computeBatterySaturation, isBatteryFleetFull };

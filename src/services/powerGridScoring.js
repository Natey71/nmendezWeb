const DIFFICULTY_CONFIG = {
  easy: { payoutMul: 1 },
  normal: { payoutMul: 1 },
  hard: { payoutMul: 0.9 },
};

const TELEMETRY_VERSION_MIN = 1;
const MAX_FRAMES = 3600;
const MAX_GENERATORS_PER_FRAME = 128;
const SUPPLY_TOLERANCE = 1;
const CAPACITY_TOLERANCE = 0.5;
const EPSILON = 1e-3;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const readNonNegative = (value, label, index) => {
  const num = toFiniteNumber(value);
  if (num === null || num < 0) {
    throw badRequest(`Invalid ${label} at frame ${index}.`);
  }
  return num;
};

const readFinite = (value, label, index) => {
  const num = toFiniteNumber(value);
  if (num === null) {
    throw badRequest(`Invalid ${label} at frame ${index}.`);
  }
  return num;
};

const fuelMultiplierFor = (fuelMultipliers, fuel) => {
  const num = toFiniteNumber(fuelMultipliers?.[fuel]);
  if (num === null || num <= 0) return 1;
  return clamp(num, 0.1, 10);
};

export function scorePowerGridRun(submission = {}) {
  const safeName = String(submission?.name ?? '').trim().slice(0, 32) || 'Anonymous';
  const runPayload = submission?.run && typeof submission.run === 'object' ? submission.run : submission;

  if (!runPayload || typeof runPayload !== 'object') {
    throw badRequest('Run data is required.');
  }

  const version = toFiniteNumber(runPayload.version ?? runPayload.telemetryVersion ?? 0);
  if (version === null || version < TELEMETRY_VERSION_MIN) {
    throw badRequest('Unsupported telemetry version.');
  }

  const difficultyKey = runPayload.difficulty;
  if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_CONFIG, difficultyKey)) {
    throw badRequest('Invalid difficulty level.');
  }

  const frames = Array.isArray(runPayload.frames)
    ? runPayload.frames
    : Array.isArray(runPayload.telemetry)
      ? runPayload.telemetry
      : null;

  if (!frames || frames.length === 0) {
    throw badRequest('Telemetry frames are required.');
  }

  if (frames.length > MAX_FRAMES) {
    throw badRequest('Telemetry submission is too large.');
  }

  const payoutMul = DIFFICULTY_CONFIG[difficultyKey].payoutMul;

  let totalRevenue = 0;
  let totalOpex = 0;
  let totalEmissions = 0;
  let uptimeTicks = 0;

  frames.forEach((frame, frameIndex) => {
    if (!frame || typeof frame !== 'object') {
      throw badRequest(`Invalid telemetry frame at index ${frameIndex}.`);
    }

    const tickHours = readNonNegative(frame.tickHours, 'tick duration', frameIndex);
    if (tickHours <= 0 || tickHours > 1) {
      throw badRequest(`Invalid tick duration at frame ${frameIndex}.`);
    }

    const demand = readNonNegative(frame.demand, 'demand', frameIndex);
    const supplyReported = readFinite(frame.supply, 'supply', frameIndex);
    const price = readNonNegative(frame.price, 'price', frameIndex);
    readFinite(frame.freq, 'frequency', frameIndex);

    const generators = Array.isArray(frame.generators) ? frame.generators : null;
    if (!generators || generators.length === 0) {
      throw badRequest('Generator telemetry is missing.');
    }

    if (generators.length > MAX_GENERATORS_PER_FRAME) {
      throw badRequest('Telemetry includes too many generators.');
    }

    const multipliers = frame.fuelMultipliers && typeof frame.fuelMultipliers === 'object'
      ? frame.fuelMultipliers
      : {};

    let computedSupply = 0;
    let frameOpex = 0;
    let frameEmissions = 0;
    let installedCap = 0;

    generators.forEach((gen) => {
      if (!gen || typeof gen !== 'object') {
        throw badRequest(`Invalid generator telemetry at frame ${frameIndex}.`);
      }

      const cap = readNonNegative(gen.cap, 'generator capacity', frameIndex);
      const actual = readFinite(gen.actual, 'generator output', frameIndex);
      const opex = readNonNegative(gen.opex, 'generator operating cost', frameIndex);
      const co2 = Math.max(0, toFiniteNumber(gen.co2) ?? 0);
      const isBattery = !!gen.isBattery;
      const on = !!gen.on;
      const enabled = gen.enabled !== false;
      const variable = !!gen.variable;
      const fault = !!gen.fault;
      const fuel = typeof gen.fuel === 'string' ? gen.fuel : '';

      if (!isBattery) {
        installedCap += cap;
      }

      if (!isBattery && actual < -EPSILON) {
        throw badRequest('Generator output is inconsistent with telemetry.');
      }

      if (!isBattery && actual > cap + CAPACITY_TOLERANCE) {
        throw badRequest('Generator output exceeds capacity.');
      }

      if (isBattery && Math.abs(actual) > cap + CAPACITY_TOLERANCE) {
        throw badRequest('Battery output exceeds capacity.');
      }

      if (!isBattery && actual > EPSILON) {
        if (!on || (!enabled && !variable) || fault) {
          throw badRequest('Generator state does not allow positive output.');
        }
      }

      if (variable && !on && actual > EPSILON) {
        throw badRequest('Variable generator reported output while offline.');
      }

      if (fault && Math.abs(actual) > EPSILON) {
        throw badRequest('Faulted generator reported output.');
      }

      if (isBattery) {
        if (Math.abs(actual) > EPSILON) {
          frameOpex += opex * 0.5;
        }
        computedSupply += actual;
      } else {
        if (on && (enabled || variable) && !fault && (actual > EPSILON || variable)) {
          frameOpex += opex * fuelMultiplierFor(multipliers, fuel);
        }
        computedSupply += Math.max(0, actual);
        if (actual > EPSILON) {
          frameEmissions += (co2 / 1000) * actual * tickHours;
        }
      }
    });

    const targetCap = Math.max(80, 1.4 * Math.max(demand, 80));
    if (installedCap > targetCap) {
      frameOpex += (installedCap - targetCap) * 0.6;
    }

    if (Math.abs(supplyReported - computedSupply) > SUPPLY_TOLERANCE) {
      throw badRequest('Supply telemetry does not match generator outputs.');
    } 

    totalOpex += frameOpex;
    totalEmissions += frameEmissions;

    const delivered = Math.max(0, Math.min(demand, computedSupply));
    const revenue = delivered * price * tickHours * payoutMul;
    if (!Number.isFinite(revenue)) {
      throw badRequest('Invalid revenue calculation.');
    }
    totalRevenue += revenue;

    if (delivered >= demand - 0.1) {
      uptimeTicks += 1;
    }
  });

  const profitFloat = totalRevenue - totalOpex;
  const uptimeRatio = uptimeTicks / frames.length;
  const score = Math.round(profitFloat + uptimeRatio * 25000 - totalEmissions * 500);

  return {
    name: safeName,
    score,
    profit: Math.round(profitFloat),
    uptime: Math.round(clamp(uptimeRatio * 100, 0, 100)),
    emissions: Math.max(0, Math.round(totalEmissions)),
  };
}

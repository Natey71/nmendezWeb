export function createAceDeadbandTracker({
  baseTolerance = 2,
  levels = [
    { name: 'large', threshold: 12, duration: 30 },
    { name: 'medium', threshold: 7, duration: 45 },
    { name: 'small', threshold: 3, duration: 90 }
  ]
} = {}) {
  const timers = new Map(levels.map((level) => [level.name, 0]));

  const normalizedLevels = levels
    .map((level) => ({ ...level }))
    .sort((a, b) => b.threshold - a.threshold);

  function reset() {
    normalizedLevels.forEach((level) => timers.set(level.name, 0));
  }

  function step(mismatchMw = 0) {
    const magnitude = Math.abs(mismatchMw);
    if (!Number.isFinite(magnitude)) {
      reset();
      return { triggered: false, activeLevel: null, secondsOutside: 0 };
    }

    if (magnitude <= baseTolerance) {
      reset();
      return { triggered: false, activeLevel: null, secondsOutside: 0 };
    }

    let activeLevel = null;
    let secondsOutside = 0;

    normalizedLevels.forEach((level) => {
      const isOutside = magnitude >= level.threshold;
      const current = timers.get(level.name) || 0;
      const next = isOutside ? current + 1 : 0;
      timers.set(level.name, next);

      if (!activeLevel && isOutside && next >= level.duration) {
        activeLevel = level;
        secondsOutside = next;
      }
    });

    return {
      triggered: Boolean(activeLevel),
      activeLevel,
      secondsOutside
    };
  }

  return { step, reset };
}

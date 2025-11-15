const DEFAULT_DAY_SECONDS = 720;

function padClock(value = 0) {
  return String(Math.floor(Math.max(0, value))).padStart(2, '0');
}

export function normalizeGameSeconds(seconds = 0, daySeconds = DEFAULT_DAY_SECONDS) {
  if (!Number.isFinite(daySeconds) || daySeconds <= 0) {
    throw new RangeError('daySeconds must be a positive number.');
  }
  const base = Number.isFinite(seconds) ? seconds : 0;
  return ((base % daySeconds) + daySeconds) % daySeconds;
}

export function formatGameClockLabel(seconds = 0, daySeconds = DEFAULT_DAY_SECONDS) {
  const normalized = normalizeGameSeconds(seconds, daySeconds);
  const hourFloat = (normalized / daySeconds) * 24;
  const hours = Math.floor(hourFloat);
  const minutes = Math.floor((hourFloat - hours) * 60);
  return `${padClock(hours)}:${padClock(minutes)}`;
}

export function buildForecastTimeline({
  startSeconds = 0,
  horizonSeconds = 60,
  stepSeconds = 5,
  daySeconds = DEFAULT_DAY_SECONDS,
} = {}) {
  if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
    throw new RangeError('stepSeconds must be a positive number.');
  }
  const safeHorizon = Number.isFinite(horizonSeconds) ? Math.max(0, horizonSeconds) : 0;
  const safeStart = Number.isFinite(startSeconds) ? startSeconds : 0;
  const steps = Math.max(1, Math.floor(safeHorizon / stepSeconds));
  const timeline = [];
  for (let i = 0; i <= steps; i += 1) {
    const offsetSeconds = Math.min(i * stepSeconds, safeHorizon);
    const absoluteSeconds = safeStart + offsetSeconds;
    timeline.push({
      offsetSeconds,
      absoluteSeconds,
      normalizedSeconds: normalizeGameSeconds(absoluteSeconds, daySeconds),
    });
  }
  if (!timeline.length) {
    timeline.push({
      offsetSeconds: 0,
      absoluteSeconds: safeStart,
      normalizedSeconds: normalizeGameSeconds(safeStart, daySeconds),
    });
  }
  return timeline;
}

const MIN_LEVEL = 1;
const MAX_LEVEL = 10;
const MIN_DURATION_SECONDS = 30;
const MAX_DURATION_SECONDS = 480;

export function clampOutageLevel(level){
  const num = Number(level);
  if(!Number.isFinite(num)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(num)));
}

export function computeGasOutageDuration(level){
  const lvl = clampOutageLevel(level);
  if(MAX_LEVEL === MIN_LEVEL) return MIN_DURATION_SECONDS;
  const span = MAX_DURATION_SECONDS - MIN_DURATION_SECONDS;
  const ratio = (lvl - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL);
  return Math.round(MIN_DURATION_SECONDS + span * ratio);
}

export function describeGasOutageLevel(level){
  const lvl = clampOutageLevel(level);
  if(lvl <= 3) return 'Minor';
  if(lvl <= 6) return 'Moderate';
  if(lvl <= 8) return 'Severe';
  return 'Critical';
}

export function formatOutageDuration(seconds){
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if(minutes > 0){
    if(secs === 0) return `${minutes}m`;
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export default {
  clampOutageLevel,
  computeGasOutageDuration,
  describeGasOutageLevel,
  formatOutageDuration
};

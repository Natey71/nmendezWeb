export function createOverloadMonitor({ graceSeconds = 45 } = {}) {
  const safeGrace = Number(graceSeconds);
  if (!Number.isFinite(safeGrace) || safeGrace <= 0) {
    throw new Error('createOverloadMonitor requires a positive graceSeconds value');
  }

  let active = false;
  let remainingSeconds = safeGrace;
  let reason = '';

  const snapshot = () => ({
    active,
    remainingSeconds,
    reason,
    graceSeconds: safeGrace
  });

  function trigger(newReason = '') {
    const started = !active;
    if (started) {
      active = true;
      remainingSeconds = safeGrace;
    }
    reason = typeof newReason === 'string' ? newReason : '';
    return { ...snapshot(), started };
  }

  function resolve() {
    if (!active) return false;
    active = false;
    remainingSeconds = safeGrace;
    reason = '';
    return true;
  }

  function step({ seconds = 1 } = {}) {
    if (!active) {
      return { ...snapshot(), expired: false };
    }

    const delta = Number(seconds);
    const deltaSeconds = Number.isFinite(delta) && delta > 0 ? delta : 0;
    console.log('OverloadMonitor step:', { deltaSeconds, remainingSeconds });
    if (deltaSeconds === 0) {
      return { ...snapshot(), expired: remainingSeconds === 0 };
    }

    remainingSeconds = Math.max(0, remainingSeconds - deltaSeconds);
    return { ...snapshot(), expired: remainingSeconds === 0 };
  }

  function getState() {
    return snapshot();
  }

  return { trigger, resolve, step, getState };
}

export default { createOverloadMonitor };

import { appendLeaderboardEntry, getLeaderboard } from '../services/powerGridLeaderboard.js';
import { scorePowerGridRun } from '../services/powerGridScoring.js';

export const getGamesList = (req, res) => {
  res.render('games/index', {
    title: 'Games Library',
  });
};

export const getPowerGridTycoonPage = (req, res) => {
  res.render('games/power-grid-tycoon', {
    title: 'Power Grid Tycoon',
  });
};

export const getPowerGridTycoonLeaderboardPage = async (req, res, next) => {
  try {
    const entries = await getLeaderboard();
    res.render('games/power-grid-tycoon-leaderboard', {
      title: 'Power Grid Tycoon Leaderboard',
      entries,
    });
  } catch (error) {
    next(error);
  }
};

export const getPowerGridTycoonLeaderboardData = async (req, res, next) => {
  try {
    const limit = Number.isFinite(Number(req.query.limit)) ? Number(req.query.limit) : undefined;
    const entries = await getLeaderboard(limit);
    res.json({ entries });
  } catch (error) {
    next(error);
  }
};

export const postPowerGridTycoonLeaderboardEntry = async (req, res, next) => {
  const submissionName = String(req.body?.name ?? '').trim().slice(0, 64) || 'Anonymous';
  const runPayload = req.body?.run && typeof req.body.run === 'object' ? req.body.run : null;
  const telemetryVersion = runPayload?.version ?? runPayload?.telemetryVersion;
  const frameCount = Array.isArray(runPayload?.frames)
    ? runPayload.frames.length
    : Array.isArray(runPayload?.telemetry)
      ? runPayload.telemetry.length
      : undefined;

  try {
    const computedEntry = scorePowerGridRun(req.body ?? {});
    const entry = await appendLeaderboardEntry(computedEntry);
    const entries = await getLeaderboard(10);
    res.status(201).json({ entry, entries });
  } catch (error) {
    if (error?.status === 400) {
      console.warn('[leaderboard] Rejected leaderboard submission', {
        playerName: submissionName,
        reason: error.message,
        difficulty: runPayload?.difficulty,
        telemetryVersion,
        frameCount,
      });
      return res.status(400).json({ error: error.message });
    }

    console.error('[leaderboard] Failed to save leaderboard entry', {
      playerName: submissionName,
      message: error?.message,
      status: error?.status ?? 500,
      telemetryVersion,
      difficulty: runPayload?.difficulty,
      frameCount,
      stack: error?.stack,
    });
    next(error);
  }
};

export const getTetrisPage = (req, res) => {
  res.render('games/tetris', {
    title: 'Tetris',
  });
};

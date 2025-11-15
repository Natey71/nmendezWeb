import { appendLeaderboardEntry, getLeaderboard } from '../services/powerGridLeaderboard.js';

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
  try {
    const { score } = req.body ?? {};
    if (!Number.isFinite(Number(score))) {
      return res.status(400).json({ error: 'Score is required.' });
    }
    const entry = await appendLeaderboardEntry(req.body);
    const entries = await getLeaderboard(10);
    res.status(201).json({ entry, entries });
  } catch (error) {
    next(error);
  }
};

export const getTetrisPage = (req, res) => {
  res.render('games/tetris', {
    title: 'Tetris',
  });
};

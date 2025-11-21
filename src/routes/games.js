import express from 'express';
import {
  getGamesList,
  getPowerGridTycoonPage,
  getPowerGridTycoonLeaderboardData,
  getPowerGridTycoonLeaderboardPage,
  getTetrisPage,
  postPowerGridTycoonLeaderboardEntry,
  postPowerGridTycoonLoadState,
  postPowerGridTycoonSaveState,
} from '../controllers/games.js';

const router = express.Router();

router.get('/', getGamesList);
router.get('/power-grid-tycoon', getPowerGridTycoonPage);
router.get('/power-grid-tycoon/leaderboard', getPowerGridTycoonLeaderboardPage);
router.get('/power-grid-tycoon/leaderboard/data', getPowerGridTycoonLeaderboardData);
router.post('/power-grid-tycoon/leaderboard', postPowerGridTycoonLeaderboardEntry);
router.post('/power-grid-tycoon/save-state', postPowerGridTycoonSaveState);
router.post('/power-grid-tycoon/load-state', postPowerGridTycoonLoadState);
router.get('/tetris', getTetrisPage);

export default router;

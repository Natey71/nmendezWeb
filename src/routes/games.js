import express from 'express';
import {
  getGamesList,
  getPowerGridTycoon2DPage,
  getPowerGridTycoonPage,
  getPowerGridTycoonLeaderboardData,
  getPowerGridTycoonLeaderboardPage,
  getTetrisPage,
  postPowerGridTycoonLeaderboardEntry,
} from '../controllers/games.js';

const router = express.Router();

router.get('/', getGamesList);
router.get('/power-grid-tycoon', getPowerGridTycoonPage);
router.get('/power-grid-tycoon/2d', getPowerGridTycoon2DPage);
router.get('/power-grid-tycoon/leaderboard', getPowerGridTycoonLeaderboardPage);
router.get('/power-grid-tycoon/leaderboard/data', getPowerGridTycoonLeaderboardData);
router.post('/power-grid-tycoon/leaderboard', postPowerGridTycoonLeaderboardEntry);
router.get('/tetris', getTetrisPage);

export default router;

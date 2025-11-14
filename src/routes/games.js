import express from 'express';
import {
  getGamesList,
  getPowerGridTycoonPage,
  getTetrisPage,
} from '../controllers/games.js';

const router = express.Router();

router.get('/', getGamesList);
router.get('/power-grid-tycoon', getPowerGridTycoonPage);
router.get('/tetris', getTetrisPage);

export default router;

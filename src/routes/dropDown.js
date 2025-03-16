// dropDown.js
import express from 'express';
const router = express.Router();

router.get('/dropDown', (req, res) => {
  res.render('dropDown', { response: null });
});
export default router;

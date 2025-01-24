// dropDown.js
const express = require('express');
const router = express.Router();
const dropDown = require('../controllers/dropDownController');

router.get('/dropDown', (req, res) => {
  res.render('dropDown', { response: null });
});
module.exports = router;

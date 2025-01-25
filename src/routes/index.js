// homeRoutes.js
const express = require('express');
const rtr = express.Router();
const homeController = require('../controllers/index');

rtr.get('/', homeController.getHomePage);

module.exports = rtr;

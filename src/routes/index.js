// homeRoutes.js
import express from 'express';
const rtr = express.Router();
import getHomePage from '../controllers/index.js';

rtr.get('/', getHomePage);

export default rtr;

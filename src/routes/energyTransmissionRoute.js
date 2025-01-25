
// routes/openaiRoute.js
const express = require('express');
const router = express.Router();
const energyTransmissionController = require('../controllers/energyTransmissionController');

// Render the form for user input
router.get('/energyTransmission', (req, res) => {
  res.render('energyTransmission', { response: null, title: 'Energy'});
});



// Handle form submission and OpenAI API call
router.post('/api/ConsumptionCoverageTransmission', async (req, res) => {
  try {
    const response = await energyTransmissionController.getData();
    res.send(response);
  } catch (error) {
    res.status(500).send('Error generating response');
  }
});

module.exports = router;
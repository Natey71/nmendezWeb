
// routes/openaiRoute.js
import express from 'express';
const router = express.Router();
import { getData } from '../controllers/energyTransmissionController.js';

// Render the form for user input
router.get('/energyTransmission', (req, res) => {
  res.render('energyTransmission', { response: null, title: 'Energy'});
});



// Handle form submission and OpenAI API call
router.post('/api/ConsumptionCoverageTransmission', async (req, res) => {
  try {
    const response = await getData();
    res.send(response);
  } catch (error) {
    res.status(500).send('Error generating response');
  }
});

export default router;
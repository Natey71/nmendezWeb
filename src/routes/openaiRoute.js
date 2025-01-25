// routes/openaiRoute.js
const express = require('express');
const router = express.Router();
const openaiController = require('../controllers/openaiController');

// Render the form for user input
router.get('/openai', (req, res) => {
  res.render('openai', { response: null });
});

// Handle form submission and OpenAI API call
router.post('/api/prompt', async (req, res) => {
  const prompt = req.body.prompt;
  try {
    const response = await openaiController.runPrompt(prompt);
    res.send(response);
  } catch (error) {
    res.status(500).send('Error generating response');
  }
});

module.exports = router;
